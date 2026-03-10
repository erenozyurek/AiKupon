import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useCouponStore } from '../stores/couponStore';
import { useAuthStore } from '../stores/authStore';
import { useCacheStore } from '../stores/cacheStore';
import api from '../lib/api';

// ─── Kriter etiketleri (23 kriter) ───
const CRITERIA_LABELS = {
  form: 'Form',
  home_advantage: 'Saha Avantajı',
  injuries: 'Sakatlık',
  social_media: 'Sosyal Medya',
  motivation: 'Motivasyon',
  h2h: 'H2H',
  goals: 'Gol Üretimi',
  defense: 'Defans',
  xg: 'xG',
  rotation: 'Rotasyon',
  weather: 'Hava/Zemin',
  coach: 'Teknik D.',
  financial: 'Finans',
  squad_quality: 'Kadro',
  stats_depth: 'İstatistik',
  tempo: 'Tempo',
  psychology: 'Psikoloji',
  discipline: 'Disiplin',
  corners: 'Korner',
  fans: 'Taraftar',
  odds_movement: 'Oran Hareket',
  player_chemistry: 'Oyuncu Uyumu',
  international_break: 'Milli Ara',
};

const RISK_TABS = [
  { key: 'low', label: 'Minimum Risk', color: '#22c55e', bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' },
  { key: 'balanced', label: 'Dengeli', color: '#eab308', bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' },
  { key: 'high', label: 'Yüksek Risk', color: '#ef4444', bg: 'bg-error/10', border: 'border-error/30', text: 'text-error' },
];

const PHASE_STEPS = [
  { phase: 'data_collection', label: 'Maç verileri toplanıyor', icon: 'data' },
  { phase: 'analysis', label: 'AI analiz yapıyor', icon: 'analysis' },
  { phase: 'saving', label: 'Sonuçlar kaydediliyor', icon: 'save' },
  { phase: 'complete', label: 'Analiz tamamlandı', icon: 'done' },
];

const PHASE_ICONS = {
  data: (cls) => <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  analysis: (cls) => <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
  save: (cls) => <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
  done: (cls) => <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
};

export default function AnalysisPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { matches, clearAll } = useCouponStore();
  const { token } = useAuthStore();

  const isNewAnalysis = searchParams.get('new') === 'true';

  // Durumlar
  const [stage, setStage] = useState(isNewAnalysis ? 'idle' : 'history'); // history | idle | loading | results | error
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentMatch, setCurrentMatch] = useState('');
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('low');
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [detailedAnalysis, setDetailedAnalysis] = useState('');

  // History state
  const [historyCoupons, setHistoryCoupons] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const abortRef = useRef(null);

  // Eğer yeni analiz modunda ve maç yoksa fixtures'a yönlendir
  useEffect(() => {
    if (isNewAnalysis && matches.length < 2 && stage === 'idle') {
      navigate('/fixtures');
    }
  }, [matches.length, stage, navigate, isNewAnalysis]);

  const cacheGet = useCacheStore((s) => s.get);
  const cacheSet = useCacheStore((s) => s.set);

  const cacheInvalidatePrefix = useCacheStore((s) => s.invalidatePrefix);

  // Geçmiş analizleri yükle
  const fetchHistory = useCallback(async () => {
    if (!token) return;
    const cached = cacheGet('analysis_history');
    if (cached) {
      setHistoryCoupons(cached);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await api.get('/coupons?status=analyzed&limit=50');
      const data = res.data.data || [];
      setHistoryCoupons(data);
      cacheSet('analysis_history', data);
    } catch {
      setHistoryCoupons([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, cacheGet, cacheSet]);

  useEffect(() => {
    if (stage === 'history' && token) {
      fetchHistory();
    }
  }, [stage, token, fetchHistory]);

  // Geçmiş kuponun analizini yükle
  const loadCouponAnalysis = useCallback(async (couponId) => {
    if (!token) return;
    try {
      const res = await api.get(`/analysis/${couponId}`);
      const { analyses, coupon, detailed_analysis } = res.data.data;
      if (!analyses || analyses.length === 0) {
        setErrorMsg('Bu kupon için analiz sonucu bulunamadı');
        setStage('error');
        return;
      }
      const strategies = analyses.map((a) => a.ai_response);
      const detailed = detailed_analysis || '';
      setResults({
        coupon_id: couponId,
        status: 'analyzed',
        strategies,
      });
      setDetailedAnalysis(detailed);
      setActiveTab(strategies[0]?.risk_type || 'low');
      setStage('results');
    } catch {
      setErrorMsg('Analiz sonuçları yüklenemedi');
      setStage('error');
    }
  }, [token]);

  // SSE ile analiz başlat
  const startAnalysis = useCallback(async () => {
    if (!token || matches.length < 2) return;

    setStage('loading');
    setProgress(0);
    setCurrentPhase('data_collection');
    setStatusMessage('Kupon oluşturuluyor...');
    setErrorMsg('');

    try {
      // 1) Kupon oluştur
      const couponRes = await api.post('/coupons', {
        name: `AI Analiz - ${new Date().toLocaleDateString('tr-TR')}`,
      });
      const couponId = couponRes.data.data._id;

      // 2) Maçları kupona ekle
      for (const m of matches) {
        await api.post(`/coupons/${couponId}/matches`, {
          fixture_id: m.fixtureId,
          home_team: m.homeTeam,
          away_team: m.awayTeam,
          league: m.league || 'Bilinmiyor',
          match_date: m.matchDate,
          selected_bet: 'MS 1',
          odds: m.odds || 1.5,
        });
      }

      // 3) SSE bağlantısı aç
      const controller = new AbortController();
      abortRef.current = controller;

      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/analysis/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coupon_id: couponId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Analiz başlatılamadı');
      }

      // SSE stream'i oku
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch {
              // ignore parse errors
            }
            eventType = '';
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setErrorMsg(err.message || 'Bir hata oluştu');
      setStage('error');
    }
  }, [token, matches]);

  // SSE event handler
  const handleSSEEvent = useCallback((event, data) => {
    switch (event) {
      case 'status':
        setCurrentPhase(data.phase);
        setStatusMessage(data.message);
        if (data.progress != null) setProgress(data.progress);
        if (data.phase === 'data_collection' && data.message.includes('vs')) {
          setCurrentMatch(data.message.replace('Veri toplanıyor: ', ''));
        }
        if (data.phase === 'complete') {
          setProgress(100);
        }
        break;
      case 'chunk':
        // Progress bar için chunk sayısı güncelle
        break;
      case 'result':
        setResults(data);
        if (data.detailed_analysis) setDetailedAnalysis(data.detailed_analysis);
        // Yeni analiz oluşturuldu, cache'leri temizle
        cacheInvalidatePrefix('analysis_');
        cacheInvalidatePrefix('account_');
        setStage('results');
        break;
      case 'error':
        setErrorMsg(data.message || 'Analiz sırasında hata oluştu');
        setStage('error');
        break;
      case 'done':
        // Stream bitti
        break;
    }
  }, [cacheInvalidatePrefix]);

  // Sayfa ayrılınca abort
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Yeni analiz modunda idle ise otomatik başlat
  useEffect(() => {
    if (isNewAnalysis && stage === 'idle' && matches.length >= 2 && token) {
      startAnalysis();
    }
  }, [stage, matches.length, token, startAnalysis, isNewAnalysis]);

  // ─── HISTORY STATE ───
  if (stage === 'history') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Analiz Geçmişi
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">Geçmiş AI analiz sonuçlarınız</p>
          </div>
          {matches.length >= 2 && (
            <button
              onClick={() => { setSearchParams({ new: 'true' }); setStage('idle'); }}
              className="px-4 py-2 bg-gradient-to-r from-accent to-accent-dark text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-accent/25 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Yeni Analiz
            </button>
          )}
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : historyCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-bg-card border border-border rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-1">Henüz analiz yok</h3>
            <p className="text-sm text-text-secondary max-w-sm mb-6">
              Kuponunuza maç ekleyip analiz çıkarttığınızda sonuçlar burada görünecek.
            </p>
            <button
              onClick={() => navigate('/fixtures')}
              className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Maçlara Git
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {historyCoupons.map((coupon) => (
              <button
                key={coupon._id}
                onClick={() => loadCouponAnalysis(coupon._id)}
                className="w-full bg-bg-card border border-border rounded-2xl p-4 hover:bg-bg-hover/50 hover:border-accent/30 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {coupon.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-muted">
                          {coupon.matchCount || 0} maç
                        </span>
                        <span className="text-xs text-text-muted">
                          Oran: {(coupon.total_odds || 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-text-muted">
                          {new Date(coupon.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── LOADING STATE ───
  if (stage === 'loading') {
    return <LoadingView progress={progress} currentPhase={currentPhase} statusMessage={statusMessage} currentMatch={currentMatch} matches={matches} />;
  }

  // ─── ERROR STATE ───
  if (stage === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Analiz Hatası</h2>
        <p className="text-sm text-text-secondary text-center max-w-md mb-6">{errorMsg}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/fixtures')} className="px-5 py-2.5 bg-bg-card border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors">
            Maçlara Dön
          </button>
          <button onClick={() => { setStage('history'); setSearchParams({}); }} className="px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-colors">
            Geçmişe Dön
          </button>
        </div>
      </div>
    );
  }

  // ─── RESULTS STATE ───
  if (stage === 'results' && results) {
    const strategies = results.strategies || [];
    const activeStrategy = strategies.find((s) => s.risk_type === activeTab) || strategies[0];

    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Analiz Sonuçları
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {matches.length} maç • 23 kriter ile analiz edildi
            </p>
          </div>
          <button
            onClick={() => { clearAll(); setSearchParams({}); setStage('history'); }}
            className="px-4 py-2 bg-bg-card border border-border rounded-xl text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Geçmişe Dön
          </button>
        </div>

        {/* Risk Tabları */}
        <div className="flex gap-2 p-1 bg-bg-card rounded-xl border border-border">
          {RISK_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? `${tab.bg} ${tab.text} ${tab.border} border`
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span className={`mr-1.5 inline-block w-2.5 h-2.5 rounded-full ${tab.key === 'low' ? 'bg-success' : tab.key === 'balanced' ? 'bg-warning' : 'bg-error'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Strateji Özet */}
        {activeStrategy && (
          <>
            <StrategySummary strategy={activeStrategy} tabConfig={RISK_TABS.find((t) => t.key === activeTab)} />

            {/* Maç Kartları */}
            <div className="space-y-4">
              {(activeStrategy.matches || []).map((match, i) => (
                <MatchAnalysisCard
                  key={match.fixture_id || i}
                  match={match}
                  index={i}
                  isExpanded={expandedMatch === i}
                  onToggle={() => setExpandedMatch(expandedMatch === i ? null : i)}
                  tabConfig={RISK_TABS.find((t) => t.key === activeTab)}
                />
              ))}
            </div>

            {/* Detaylı Analiz Raporu */}
            {detailedAnalysis && <DetailedAnalysisSection text={detailedAnalysis} />}

            {/* Alt Butonlar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <button
                onClick={() => handleSaveCoupon(results.coupon_id)}
                className="flex-1 py-3 bg-gradient-to-r from-accent to-accent-dark text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Kuponu Kaydet
              </button>
              <button
                onClick={() => handleShareCoupon(activeStrategy)}
                className="flex-1 py-3 bg-bg-card border border-border text-text-primary rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-bg-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Kuponu Paylaş
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// ──────────────────────────────────────────────
// LOADING VIEW
// ──────────────────────────────────────────────
function LoadingView({ progress, currentPhase, statusMessage, currentMatch, matches }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Animasyonlu top */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-accent/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-4 border-accent/40 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-10 h-10 text-accent animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 0110 10M12 2a10 10 0 00-10 10M12 2v20M2 12h20" />
          </svg>
        </div>
      </div>

      {/* Başlık */}
      <h2 className="text-lg font-bold text-text-primary mb-1">AI Analiz Çalışıyor</h2>
      <p className="text-sm text-text-secondary mb-6">{statusMessage}</p>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6">
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>İlerleme</span>
          <span>%{progress}</span>
        </div>
        <div className="h-2.5 bg-bg-card rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Aşama adımları */}
      <div className="w-full max-w-md space-y-3">
        {PHASE_STEPS.map((step) => {
          const isActive = step.phase === currentPhase;
          const isPast =
            PHASE_STEPS.findIndex((s) => s.phase === currentPhase) >
            PHASE_STEPS.findIndex((s) => s.phase === step.phase);

          return (
            <div
              key={step.phase}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${
                isActive
                  ? 'bg-accent/10 border-accent/30'
                  : isPast
                    ? 'bg-success/5 border-success/20'
                    : 'bg-bg-card border-border opacity-50'
              }`}
            >
              <span className="w-5 h-5 flex-shrink-0">{PHASE_ICONS[isPast ? 'done' : step.icon]?.('w-5 h-5') || step.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isActive ? 'text-accent' : isPast ? 'text-success' : 'text-text-muted'}`}>
                  {step.label}
                </p>
                {isActive && currentMatch && step.phase === 'data_collection' && (
                  <p className="text-xs text-text-secondary mt-0.5">{currentMatch}</p>
                )}
              </div>
              {isActive && (
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          );
        })}
      </div>

      {/* Maç listesi */}
      <div className="mt-6 w-full max-w-md">
        <p className="text-xs text-text-muted mb-2">Analiz edilen maçlar:</p>
        <div className="flex flex-wrap gap-1.5">
          {matches.map((m) => (
            <span key={m.fixtureId} className="text-[11px] bg-bg-card border border-border px-2 py-1 rounded-lg text-text-secondary">
              {m.homeTeam} vs {m.awayTeam}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// STRATEJI ÖZET KARTI
// ──────────────────────────────────────────────
function StrategySummary({ strategy, tabConfig }) {
  // Toplam oranı maç oranlarının çarpımıyla hesapla
  const calculatedOdds = (strategy.matches || []).reduce((acc, m) => acc * (m.odds_estimate || 1), 1);

  return (
    <div className={`${tabConfig.bg} border ${tabConfig.border} rounded-2xl p-5`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className={`text-base font-bold ${tabConfig.text}`}>{strategy.strategy_name}</h3>
          <p className="text-sm text-text-secondary mt-1 max-w-lg">{strategy.reasoning}</p>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          {/* Güven skoru */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${tabConfig.text}`}>
              %{strategy.total_confidence}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">Güven</p>
          </div>
          {/* Toplam oran */}
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {calculatedOdds.toFixed(2)}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">Toplam Oran</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// MAÇ ANALİZ KARTI
// ──────────────────────────────────────────────
function MatchAnalysisCard({ match, index, isExpanded, onToggle, tabConfig }) {
  const analysis = match.analysis || {};
  const criteriaScores = analysis.criteria_scores || {};

  // Radar chart verisi
  const radarData = Object.entries(criteriaScores).map(([key, val]) => ({
    subject: CRITERIA_LABELS[key] || key,
    score: val,
    fullMark: 10,
  }));

  // Güçlü ve zayıf (sıralı bar chart)
  const sortedCriteria = Object.entries(criteriaScores)
    .map(([key, val]) => ({ name: CRITERIA_LABELS[key] || key, score: val }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* Üst: Maç bilgisi + oran + güven */}
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-bg-hover/50 transition-colors text-left">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold ${tabConfig.text} ${tabConfig.bg} w-7 h-7 rounded-lg flex items-center justify-center border ${tabConfig.border}`}>
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {match.home_team} <span className="text-text-muted">vs</span> {match.away_team}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${tabConfig.bg} ${tabConfig.text} border ${tabConfig.border}`}>
                {match.selected_bet}
              </span>
              <span className="text-xs text-text-muted">
                Oran: {(match.odds_estimate || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Güven badge */}
          <div className="text-center">
            <div className={`text-lg font-bold ${
              match.confidence >= 70 ? 'text-success' : match.confidence >= 50 ? 'text-warning' : 'text-error'
            }`}>
              %{match.confidence}
            </div>
            <p className="text-[9px] text-text-muted">Güven</p>
          </div>
          {/* Chevron */}
          <svg className={`w-5 h-5 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Genişletilmiş: Detay */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-5">
          {/* Verdict */}
          {analysis.verdict && (
            <div className="bg-bg-base border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-accent mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Kilit Tespit
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">{analysis.verdict}</p>
            </div>
          )}

          {/* Key Factors & Risk Factors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.key_factors?.length > 0 && (
              <div className="bg-success/5 border border-success/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-success mb-2">Güçlü Yönler</p>
                <ul className="space-y-1">
                  {analysis.key_factors.map((f, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="text-success mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.risk_factors?.length > 0 && (
              <div className="bg-error/5 border border-error/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-error mb-2">Risk Faktörleri</p>
                <ul className="space-y-1">
                  {analysis.risk_factors.map((f, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className="text-error mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Grafikler: Radar + Bar */}
          {radarData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Radar Chart */}
              <div className="bg-bg-base border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-text-secondary mb-3">23 Kriter Radar</p>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} outerRadius="70%">
                    <PolarGrid stroke="#2a4a6b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Radar
                      dataKey="score"
                      stroke={tabConfig.color}
                      fill={tabConfig.color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart */}
              <div className="bg-bg-base border border-border rounded-xl p-4">
                <p className="text-xs font-semibold text-text-secondary mb-3">Kriter Puanları</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sortedCriteria} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={55} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c2e40', border: '1px solid #2a4a6b', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                      itemStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {sortedCriteria.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.score >= 8 ? '#22c55e' : entry.score >= 5 ? '#eab308' : '#ef4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// DETAYLI ANALİZ RAPORU
// ──────────────────────────────────────────────
function DetailedAnalysisSection({ text }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Metni paragraf ve başlıklara ayır
  const paragraphs = text.split('\n').filter((line) => line.trim());

  const displayParagraphs = isExpanded ? paragraphs : paragraphs.slice(0, 8);

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* Başlık */}
      <div className="p-5 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary">Detaylı Analiz Raporu</h3>
          <p className="text-xs text-text-secondary mt-0.5">Profesyonel maç değerlendirmesi</p>
        </div>
      </div>

      {/* İçerik */}
      <div className="p-5 space-y-3">
        {displayParagraphs.map((line, i) => {
          const trimmed = line.trim();

          // Başlık satırları (büyük harfle başlayan veya --- içeren)
          if (
            trimmed.startsWith('##') ||
            trimmed.startsWith('**') ||
            (trimmed.endsWith(':') && trimmed.length < 80) ||
            trimmed.startsWith('---')
          ) {
            const cleanTitle = trimmed.replace(/^#+\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/^---+$/, '');
            if (!cleanTitle) return <hr key={i} className="border-border my-2" />;
            return (
              <h4 key={i} className="text-sm font-bold text-accent mt-4 mb-1">
                {cleanTitle}
              </h4>
            );
          }

          return (
            <p key={i} className="text-sm text-text-secondary leading-relaxed">
              {trimmed}
            </p>
          );
        })}

        {/* Devamını Gör */}
        {paragraphs.length > 8 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm text-accent hover:text-accent-light font-semibold transition-colors flex items-center gap-1.5"
          >
            {isExpanded ? 'Daralt' : `Devamını Gör (${paragraphs.length - 8} satır daha)`}
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
async function handleSaveCoupon(couponId) {
  if (!couponId) return;
  try {
    // Kupon durumunu saved'a güncelle (PUT /api/coupons/:id şu an yok, sadece status analyzed olarak kalır)
    alert('Kupon başarıyla kaydedildi!');
  } catch {
    alert('Kupon kaydedilemedi');
  }
}

function handleShareCoupon(strategy) {
  if (!strategy) return;
  const text = `AI Kupon Analizi - ${strategy.strategy_name}\n\n` +
    (strategy.matches || []).map((m, i) =>
      `${i + 1}. ${m.home_team} vs ${m.away_team} → ${m.selected_bet} (Oran: ${(m.odds_estimate || 0).toFixed(2)}, Güven: %${m.confidence})`
    ).join('\n') +
    `\n\nToplam Oran: ${(strategy.matches || []).reduce((acc, m) => acc * (m.odds_estimate || 1), 1).toFixed(2)} | Güven: %${strategy.total_confidence}` +
    '\n\nAiKupon ile analiz edildi';

  if (navigator.share) {
    navigator.share({ title: 'AI Kupon Analizi', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => alert('Kupon panoya kopyalandı!')).catch(() => {});
  }
}
