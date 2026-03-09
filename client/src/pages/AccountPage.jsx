import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCacheStore } from '../stores/cacheStore';
import api from '../lib/api';

const TABS = [
  { key: 'profile', label: 'Profil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { key: 'coupons', label: 'Kuponlarım', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'history', label: 'Analiz Geçmişi', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, token, setAuth, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  if (!token) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Başlık */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Hesabım</h1>
        <p className="text-sm text-text-secondary mt-0.5">Profil, kuponlar ve analiz geçmişi</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-bg-card rounded-xl border border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 flex-1 min-w-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab içeriği */}
      {activeTab === 'profile' && <ProfileTab user={user} token={token} setAuth={setAuth} logout={logout} />}
      {activeTab === 'coupons' && <CouponsTab />}
      {activeTab === 'history' && <HistoryTab />}
    </div>
  );
}

// ══════════════════════════════════════════════
// 1. PROFİL TAB
// ══════════════════════════════════════════════
function ProfileTab({ user, token, setAuth, logout }) {
  const fileRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [username, setUsername] = useState(user?.username || '');
  const [email] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ text: 'Avatar 2MB\'dan küçük olmalıdır', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });

    if (newPassword && newPassword !== confirmPassword) {
      setMsg({ text: 'Yeni şifreler eşleşmiyor', type: 'error' });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setMsg({ text: 'Yeni şifre en az 8 karakter olmalıdır', type: 'error' });
      return;
    }
    if (newPassword && !currentPassword) {
      setMsg({ text: 'Mevcut şifre zorunludur', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const payload = { username };
      if (avatarPreview !== user?.avatar_url) payload.avatar_url = avatarPreview;
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.put('/auth/profile', payload);
      setAuth(res.data.user, token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMsg({ text: 'Profil güncellendi', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.message || 'Güncelleme başarısız', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Avatar */}
      <div className="bg-bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Profil Fotoğrafı</h3>
        <div className="flex items-center gap-5">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-2xl overflow-hidden bg-bg-base border-2 border-dashed border-border hover:border-accent/50 cursor-pointer transition-colors group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-3xl font-bold text-accent/40 group-hover:text-accent/70 transition-colors">
                  {username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <div>
            <p className="text-sm text-text-secondary">Tıklayarak fotoğraf yükleyin</p>
            <p className="text-xs text-text-muted mt-0.5">JPG, PNG — Max 2MB</p>
            {avatarPreview && avatarPreview !== user?.avatar_url && (
              <button type="button" onClick={() => setAvatarPreview(user?.avatar_url || null)} className="text-xs text-error mt-1 hover:underline">
                Geri al
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kullanıcı bilgileri */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Hesap Bilgileri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-muted cursor-not-allowed"
            />
            <p className="text-[10px] text-text-muted mt-1">Email değiştirilemez</p>
          </div>
        </div>
      </div>

      {/* Şifre değiştirme */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Şifre Değiştir</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Mevcut Şifre</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Yeni Şifre</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 8 karakter"
                className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Yeni Şifre (Tekrar)</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifreyi tekrarlayın"
                className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mesaj + Kaydet */}
      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === 'success'
            ? 'bg-success/10 border-success/30 text-success'
            : 'bg-error/10 border-error/30 text-error'
        }`}>
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-accent to-accent-dark text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Kaydediliyor...
          </>
        ) : (
          'Değişiklikleri Kaydet'
        )}
      </button>
    </form>
  );
}

// ══════════════════════════════════════════════
// 2. KUPONLARIM TAB
// ══════════════════════════════════════════════
function CouponsTab() {
  const cacheGet = useCacheStore((s) => s.get);
  const cacheSet = useCacheStore((s) => s.set);
  const [coupons, setCoupons] = useState(() => cacheGet('account_coupons') || []);
  const [loading, setLoading] = useState(() => !cacheGet('account_coupons'));
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const cached = cacheGet('account_coupons');
    if (cached) { setCoupons(cached); setLoading(false); return; }
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get('/coupons?limit=50');
      const data = res.data.data || [];
      setCoupons(data);
      cacheSet('account_coupons', data);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (couponId) => {
    setSelectedCoupon(couponId);
    try {
      const res = await api.get(`/coupons/${couponId}`);
      setModalData(res.data.data);
    } catch {
      setModalData(null);
    }
  };

  const deleteCoupon = async (couponId) => {
    if (!confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
    setDeleting(couponId);
    try {
      await api.delete(`/coupons/${couponId}`);
      setCoupons((prev) => prev.filter((c) => c._id !== couponId));
      cacheSet('account_coupons', coupons.filter((c) => c._id !== couponId));
      if (selectedCoupon === couponId) {
        setSelectedCoupon(null);
        setModalData(null);
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  const statusLabel = (s) => {
    if (s === 'analyzed') return { text: 'Analiz Edildi', cls: 'bg-success/10 text-success border-success/30' };
    if (s === 'saved') return { text: 'Kaydedildi', cls: 'bg-accent/10 text-accent border-accent/30' };
    return { text: 'Taslak', cls: 'bg-bg-hover text-text-muted border-border' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-10 text-center">
        <div className="w-14 h-14 bg-bg-base border-2 border-dashed border-border rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-sm text-text-secondary font-medium">Henüz kupon oluşturmadınız</p>
        <p className="text-xs text-text-muted mt-1">Maçlar sayfasından kupon oluşturabilirsiniz</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {coupons.map((c) => {
          const st = statusLabel(c.status);
          return (
            <div
              key={c._id}
              className="bg-bg-card border border-border rounded-xl hover:border-border-light transition-colors"
            >
              <button onClick={() => openDetail(c._id)} className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-text-muted">
                        {new Date(c.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="text-text-muted">•</span>
                      <span className="text-[11px] text-text-muted">{c.matchCount || 0} maç</span>
                      {c.total_odds && (
                        <>
                          <span className="text-text-muted">•</span>
                          <span className="text-[11px] text-accent font-medium">x{c.total_odds.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-md border ${st.cls}`}>{st.text}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCoupon(c._id); }}
                    disabled={deleting === c._id}
                    className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                    title="Sil"
                  >
                    {deleting === c._id ? (
                      <div className="w-3.5 h-3.5 border-2 border-error border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Kupon Detay Modal */}
      {selectedCoupon && (
        <CouponDetailModal
          data={modalData}
          onClose={() => { setSelectedCoupon(null); setModalData(null); }}
        />
      )}
    </>
  );
}

// Kupon Detay Modal
function CouponDetailModal({ data, onClose }) {
  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-bg-card border border-border rounded-2xl p-10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-bg-card rounded-t-2xl z-10">
          <div>
            <h3 className="text-sm font-bold text-text-primary">{data.name}</h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {new Date(data.created_at).toLocaleDateString('tr-TR')} • {data.matches?.length || 0} maç
              {data.total_odds ? ` • x${data.total_odds.toFixed(2)}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Maçlar */}
        <div className="p-4 space-y-2">
          {(data.matches || []).map((m, i) => (
            <div key={m._id || i} className="bg-bg-base border border-border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-accent bg-accent/10 w-5 h-5 rounded flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-text-primary">{m.home_team} vs {m.away_team}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{m.league}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-accent">{m.selected_bet}</p>
                  <p className="text-[10px] text-text-muted">x{m.odds?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// 3. ANALİZ GEÇMİŞİ TAB
// ══════════════════════════════════════════════
function HistoryTab() {
  const cacheGet = useCacheStore((s) => s.get);
  const cacheSet = useCacheStore((s) => s.set);
  const [analyses, setAnalyses] = useState(() => cacheGet('account_history')?.analyses || []);
  const [loading, setLoading] = useState(() => !cacheGet('account_history'));
  const [stats, setStats] = useState(() => cacheGet('account_history')?.stats || { total: 0, avgConfidence: 0 });

  useEffect(() => {
    const cached = cacheGet('account_history');
    if (cached) { setAnalyses(cached.analyses); setStats(cached.stats); setLoading(false); return; }
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Önce kuponları çek, sonra analiz edilmiş olanların sonuçlarını al
      const couponsRes = await api.get('/coupons?limit=50');
      const allCoupons = couponsRes.data.data || [];
      const analyzedCoupons = allCoupons.filter((c) => c.status === 'analyzed' || c.status === 'saved');

      const analysisEntries = [];
      for (const coupon of analyzedCoupons) {
        try {
          const res = await api.get(`/analysis/${coupon._id}`);
          const data = res.data.data;
          analysisEntries.push({
            coupon,
            analyses: data.analyses || [],
          });
        } catch {
          // skip
        }
      }

      setAnalyses(analysisEntries);

      // İstatistikler
      let totalConfidence = 0;
      let confCount = 0;
      for (const entry of analysisEntries) {
        for (const a of entry.analyses) {
          if (a.ai_response?.total_confidence) {
            totalConfidence += a.ai_response.total_confidence;
            confCount++;
          }
        }
      }

      const newStats = {
        total: analysisEntries.length,
        avgConfidence: confCount > 0 ? Math.round(totalConfidence / confCount) : 0,
      };
      setStats(newStats);
      cacheSet('account_history', { analyses: analysisEntries, stats: newStats });
    } catch {
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* İstatistik özeti */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Toplam Analiz" value={stats.total} icon="📊" />
        <StatCard label="Ort. Güven Skoru" value={`%${stats.avgConfidence}`} icon="🎯" />
        <StatCard label="Analiz Edilen Kupon" value={analyses.length} icon="📋" />
      </div>

      {/* Analiz listesi */}
      {analyses.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-2xl p-10 text-center">
          <div className="w-14 h-14 bg-bg-base border-2 border-dashed border-border rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary font-medium">Henüz analiz yapılmadı</p>
          <p className="text-xs text-text-muted mt-1">Kupon oluşturduktan sonra AI analiz yapabilirsiniz</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((entry, idx) => (
            <AnalysisHistoryCard key={entry.coupon._id || idx} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

function AnalysisHistoryCard({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const { coupon, analyses } = entry;

  // Risk renkleri
  const riskColor = (type) => {
    if (type === 'low') return 'text-success bg-success/10 border-success/30';
    if (type === 'balanced') return 'text-warning bg-warning/10 border-warning/30';
    return 'text-error bg-error/10 border-error/30';
  };
  const riskLabel = (type) => {
    if (type === 'low') return 'Düşük Risk';
    if (type === 'balanced') return 'Dengeli';
    return 'Yüksek Risk';
  };

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-hover/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{coupon.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-text-muted">
                {new Date(coupon.created_at).toLocaleDateString('tr-TR')}
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-[11px] text-text-muted">{coupon.matchCount || 0} maç</span>
              <span className="text-text-muted">•</span>
              <span className="text-[11px] text-text-muted">{analyses.length} strateji</span>
            </div>
          </div>
        </div>
        <svg className={`w-5 h-5 text-text-muted transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {analyses.map((a) => {
            const strat = a.ai_response || {};
            return (
              <div key={a._id} className="bg-bg-base border border-border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-md border ${riskColor(a.risk_type)}`}>
                    {riskLabel(a.risk_type)}
                  </span>
                  <div className="flex items-center gap-3">
                    {strat.total_confidence != null && (
                      <span className="text-xs text-text-secondary">
                        Güven: <span className="font-semibold text-text-primary">%{strat.total_confidence}</span>
                      </span>
                    )}
                    {strat.estimated_odds != null && (
                      <span className="text-xs text-text-secondary">
                        Oran: <span className="font-semibold text-accent">x{strat.estimated_odds.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                </div>
                {strat.reasoning && (
                  <p className="text-xs text-text-secondary leading-relaxed">{strat.reasoning}</p>
                )}
                {/* Maç önerileri */}
                {strat.matches?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {strat.matches.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-text-secondary truncate mr-2">
                          {m.home_team} vs {m.away_team}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-accent font-medium">{m.selected_bet}</span>
                          <span className="text-text-muted">%{m.confidence}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
