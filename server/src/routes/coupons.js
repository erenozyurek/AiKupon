const express = require('express');
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const CouponMatch = require('../models/CouponMatch');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Tüm routelar JWT korumalı
router.use(authMiddleware);

const MAX_MATCHES_PER_COUPON = 8;

// POST /api/coupons — Yeni boş kupon oluştur
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Kupon adı zorunludur' });
    }

    const coupon = await Coupon.create({
      user_id: new mongoose.Types.ObjectId(req.user.id),
      name: name.trim(),
      status: 'draft',
      created_at: new Date(),
    });

    res.status(201).json({ message: 'Kupon oluşturuldu', data: coupon });
  } catch (error) {
    next(error);
  }
});

// GET /api/coupons — Kullanıcının tüm kuponları (sayfalama)
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const filter = { user_id: userId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Coupon.countDocuments(filter),
    ]);

    // Her kupon için maç sayısını ekle
    const couponIds = coupons.map((c) => c._id);
    const matchCounts = await CouponMatch.aggregate([
      { $match: { coupon_id: { $in: couponIds } } },
      { $group: { _id: '$coupon_id', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(matchCounts.map((m) => [m._id.toString(), m.count]));

    const data = coupons.map((c) => ({
      ...c.toJSON(),
      matchCount: countMap[c._id.toString()] || 0,
    }));

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/coupons/:id — Kupon detayı maçlarıyla
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Geçersiz kupon ID' });
    }

    const coupon = await Coupon.findOne({
      _id: id,
      user_id: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }

    const matches = await CouponMatch.find({ coupon_id: coupon._id });

    res.json({
      data: {
        ...coupon.toJSON(),
        matches,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/coupons/:id/matches — Kupona maç ekle
router.post('/:id/matches', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fixture_id, home_team, away_team, league, match_date, selected_bet, odds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Geçersiz kupon ID' });
    }

    // Kupon sahibi kontrolü
    const coupon = await Coupon.findOne({
      _id: id,
      user_id: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }

    if (coupon.status !== 'draft') {
      return res.status(400).json({ message: 'Sadece taslak kuponlara maç eklenebilir' });
    }

    // Max 8 maç kontrolü
    const existingMatchCount = await CouponMatch.countDocuments({ coupon_id: coupon._id });
    if (existingMatchCount >= MAX_MATCHES_PER_COUPON) {
      return res.status(400).json({ message: `Bir kupona en fazla ${MAX_MATCHES_PER_COUPON} maç eklenebilir` });
    }

    // Zorunlu alan kontrolü
    if (!fixture_id || !home_team || !away_team || !league || !match_date || !selected_bet || odds == null) {
      return res.status(400).json({
        message: 'fixture_id, home_team, away_team, league, match_date, selected_bet ve odds zorunludur',
      });
    }

    const match = await CouponMatch.create({
      coupon_id: coupon._id,
      fixture_id: String(fixture_id),
      home_team,
      away_team,
      league,
      match_date: new Date(match_date),
      selected_bet,
      odds: Number(odds),
    });

    // total_odds güncelle
    const allMatches = await CouponMatch.find({ coupon_id: coupon._id });
    coupon.total_odds = parseFloat((allMatches.reduce((acc, m) => acc * m.odds, 1)).toFixed(2));
    await coupon.save();

    res.status(201).json({ message: 'Maç eklendi', data: match });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/coupons/:id/matches/:matchId — Kupondan maç çıkar
router.delete('/:id/matches/:matchId', async (req, res, next) => {
  try {
    const { id, matchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ message: 'Geçersiz ID' });
    }

    // Kupon sahibi kontrolü
    const coupon = await Coupon.findOne({
      _id: id,
      user_id: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }

    if (coupon.status !== 'draft') {
      return res.status(400).json({ message: 'Sadece taslak kuponlardan maç çıkarılabilir' });
    }

    const match = await CouponMatch.findOneAndDelete({
      _id: matchId,
      coupon_id: coupon._id,
    });

    if (!match) {
      return res.status(404).json({ message: 'Maç bulunamadı' });
    }

    // total_odds güncelle
    const remaining = await CouponMatch.find({ coupon_id: coupon._id });
    coupon.total_odds = remaining.length > 0
      ? Math.round(remaining.reduce((acc, m) => acc * m.odds, 1) * 100) / 100
      : null;
    await coupon.save();

    res.json({ message: 'Maç kupondan çıkarıldı' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/coupons/:id — Kuponu sil
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Geçersiz kupon ID' });
    }

    const coupon = await Coupon.findOneAndDelete({
      _id: id,
      user_id: new mongoose.Types.ObjectId(req.user.id),
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Kupon bulunamadı' });
    }

    // İlişkili maçları da sil
    await CouponMatch.deleteMany({ coupon_id: coupon._id });

    res.json({ message: 'Kupon silindi' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
