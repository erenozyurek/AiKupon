const express = require('express');
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const CouponMatch = require('../models/CouponMatch');
const AnalysisResult = require('../models/AnalysisResult');
const { getFixtureStats } = require('../services/unifiedFootballService');
const { buildAnalysisPrompt } = require('../services/promptBuilder');
const { streamAnalyzeWithClaude, analyzeWithClaude } = require('../services/claudeService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// POST /api/analysis/generate — SSE streaming ile analiz oluştur
router.post('/generate', async (req, res, next) => {
  const { coupon_id } = req.body;

  if (!coupon_id || !mongoose.Types.ObjectId.isValid(coupon_id)) {
    return res.status(400).json({ message: 'Geçerli bir coupon_id zorunludur' });
  }

  try {
    // 1. Kuponu doğrula
    const coupon = await Coupon.findOne({
      _id: coupon_id,
      user_id: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }

    // 2. Maçları çek
    const matches = await CouponMatch.find({ coupon_id: coupon._id });

    if (matches.length === 0) {
      return res.status(400).json({ message: 'Kuponda analiz edilecek maç bulunamadı' });
    }

    // 3. SSE headers ayarla
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Client bağlantı keserse temizle
    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    // 4. Her maç için api-football'dan veri topla
    sendEvent('status', { phase: 'data_collection', message: 'Maç verileri toplanıyor...' });

    const matchDataMap = {};
    for (let i = 0; i < matches.length; i++) {
      if (aborted) return;

      const match = matches[i];
      sendEvent('status', {
        phase: 'data_collection',
        message: `Veri toplanıyor: ${match.home_team} vs ${match.away_team}`,
        progress: Math.round(((i + 1) / matches.length) * 50),
      });

      try {
        const stats = await getFixtureStats(match.fixture_id);
        matchDataMap[match.fixture_id] = stats;
      } catch {
        matchDataMap[match.fixture_id] = null;
      }
    }

    if (aborted) return;

    // 5. Prompt oluştur
    sendEvent('status', { phase: 'analysis', message: 'AI analizi başlatılıyor...', progress: 55 });

    const prompt = buildAnalysisPrompt(matches, matchDataMap);

    // 6. Claude'a streaming gönder
    sendEvent('status', { phase: 'analysis', message: 'Claude analiz ediyor...', progress: 60 });

    let chunkCount = 0;

    await streamAnalyzeWithClaude(
      prompt,
      // onChunk — her metin parçası
      (textChunk) => {
        if (aborted) return;
        chunkCount++;
        sendEvent('chunk', { text: textChunk, index: chunkCount });

        // Her 20 chunk'ta progress güncelle
        if (chunkCount % 20 === 0) {
          const progress = Math.min(60 + Math.floor(chunkCount / 5), 95);
          sendEvent('status', { phase: 'analysis', message: 'Claude analiz ediyor...', progress });
        }
      },
      // onDone — analiz tamamlandığında
      async (error, parsed, rawText) => {
        if (aborted) return;

        if (error) {
          sendEvent('error', { message: `Analiz hatası: ${error.message}` });
          res.write('event: done\ndata: {}\n\n');
          res.end();
          return;
        }

        try {
          // 7. DB'ye kaydet (3 strateji ayrı ayrı)
          sendEvent('status', { phase: 'saving', message: 'Sonuçlar kaydediliyor...', progress: 96 });

          // Önceki analizleri sil (aynı kupon için)
          await AnalysisResult.deleteMany({ coupon_id: coupon._id });

          const savedResults = [];
          for (const strategy of parsed.strategies) {
            const result = await AnalysisResult.create({
              coupon_id: coupon._id,
              risk_type: strategy.risk_type,
              ai_response: strategy,
              created_at: new Date(),
            });
            savedResults.push(result);
          }

          // 8. Kupon durumunu güncelle
          coupon.status = 'analyzed';
          await coupon.save();

          // 9. Sonucu gönder
          sendEvent('result', {
            coupon_id: coupon._id,
            status: 'analyzed',
            strategies: parsed.strategies,
            detailed_analysis: parsed.detailed_analysis || '',
            analysis_ids: savedResults.map((r) => r._id),
          });

          sendEvent('status', { phase: 'complete', message: 'Analiz tamamlandı!', progress: 100 });
          res.write('event: done\ndata: {}\n\n');
          res.end();
        } catch (saveErr) {
          sendEvent('error', { message: `Kaydetme hatası: ${saveErr.message}` });
          res.write('event: done\ndata: {}\n\n');
          res.end();
        }
      }
    );
  } catch (error) {
    // SSE açılmadan hata olduysa
    if (!res.headersSent) {
      return next(error);
    }
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    sendEvent('error', { message: error.message });
    res.write('event: done\ndata: {}\n\n');
    res.end();
  }
});

// POST /api/analysis/generate-sync — Streaming olmadan analiz (alternatif)
router.post('/generate-sync', async (req, res, next) => {
  try {
    const { coupon_id } = req.body;

    if (!coupon_id || !mongoose.Types.ObjectId.isValid(coupon_id)) {
      return res.status(400).json({ message: 'Geçerli bir coupon_id zorunludur' });
    }

    const coupon = await Coupon.findOne({
      _id: coupon_id,
      user_id: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }

    const matches = await CouponMatch.find({ coupon_id: coupon._id });

    if (matches.length === 0) {
      return res.status(400).json({ message: 'Kuponda analiz edilecek maç bulunamadı' });
    }

    // Maç verilerini topla
    const matchDataMap = {};
    for (const match of matches) {
      try {
        matchDataMap[match.fixture_id] = await getFixtureStats(match.fixture_id);
      } catch {
        matchDataMap[match.fixture_id] = null;
      }
    }

    // Prompt oluştur ve Claude'a gönder
    const prompt = buildAnalysisPrompt(matches, matchDataMap);
    const parsed = await analyzeWithClaude(prompt);

    // DB'ye kaydet
    await AnalysisResult.deleteMany({ coupon_id: coupon._id });

    const savedResults = [];
    for (const strategy of parsed.strategies) {
      const result = await AnalysisResult.create({
        coupon_id: coupon._id,
        risk_type: strategy.risk_type,
        ai_response: strategy,
        created_at: new Date(),
      });
      savedResults.push(result);
    }

    coupon.status = 'analyzed';
    await coupon.save();

    res.json({
      message: 'Analiz tamamlandı',
      data: {
        coupon_id: coupon._id,
        status: 'analyzed',
        strategies: parsed.strategies,
        detailed_analysis: parsed.detailed_analysis || '',
        analysis_ids: savedResults.map((r) => r._id),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analysis/:couponId — Kuponun analiz sonuçlarını getir
router.get('/:couponId', async (req, res, next) => {
  try {
    const { couponId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ message: 'Geçersiz coupon ID' });
    }

    // Kupon sahiplik kontrolü
    const coupon = await Coupon.findOne({
      _id: couponId,
      user_id: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }

    const results = await AnalysisResult.find({ coupon_id: coupon._id }).sort({ risk_type: 1 });

    res.json({
      data: {
        coupon: coupon.toJSON(),
        analyses: results,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
