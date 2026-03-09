import { Link, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import { useCouponStore } from '../../stores/couponStore';
import { useAuthStore } from '../../stores/authStore';

function formatMatchDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) +
    ' • ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function CouponPanel() {
  const navigate = useNavigate();
  const { couponPanelOpen, setCouponPanelOpen } = useUIStore();
  const { matches, removeMatch, clearAll } = useCouponStore();
  const { user } = useAuthStore();

  const canAnalyze = matches.length >= 2;

  const panelContent = (
    <div className="flex flex-col h-full">
      {/* ──── Başlık ──── */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-primary">
        <div className="flex items-center gap-2.5">
          {/* Kupon ikonu */}
          <div className="w-7 h-7 bg-accent/15 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
              Kuponum
              {matches.length > 0 && (
                <span className="text-[10px] bg-accent text-white w-5 h-5 rounded-full font-bold inline-flex items-center justify-center">
                  {matches.length}
                </span>
              )}
            </h2>
            <p className="text-[10px] text-text-muted">
              {matches.length === 0
                ? 'Maç eklenmedi'
                : `${matches.length}/8 maç seçili`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {matches.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
              title="Tümünü temizle"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setCouponPanelOpen(false)}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ──── Maç Listesi / Boş Durum ──── */}
      <div className="flex-1 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
            <div className="w-16 h-16 bg-bg-base border-2 border-dashed border-border rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary font-medium mb-1">Kuponunuz boş</p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Maç seçmek için maç kartlarındaki
              <span className="inline-flex items-center justify-center w-4 h-4 bg-accent/15 text-accent rounded mx-1 align-middle">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              butonuna tıklayın
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {matches.map((match, i) => (
              <CouponMatchCard
                key={match.fixtureId}
                match={match}
                index={i + 1}
                onRemove={() => removeMatch(match.fixtureId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ──── Alt Bölüm ──── */}
      <div className="border-t border-border bg-bg-elevated">
        {/* Maç sayısı bilgisi */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-0.5">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full border border-bg-elevated ${
                    i < matches.length ? 'bg-accent' : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-text-muted">
              {matches.length}/8 maç
            </span>
          </div>
          {matches.length > 0 && matches.length < 2 && (
            <span className="text-[10px] text-warning font-medium">
              Min 2 maç gerekli
            </span>
          )}
        </div>

        {/* Auth durumuna göre buton */}
        {user ? (
          <div className="px-3 pb-3">
            <button
              disabled={!canAnalyze}
              onClick={() => canAnalyze && navigate('/analysis?new=true')}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                canAnalyze
                  ? 'bg-gradient-to-r from-accent to-accent-dark text-white shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-bg-hover text-text-muted cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {canAnalyze
                ? `Analiz Çıkart (${matches.length} maç)`
                : 'Analiz Çıkart'}
            </button>
          </div>
        ) : (
          <div className="px-3 pb-3">
            {/* Giriş yapılmamış uyarısı */}
            <div className="bg-warning/5 border border-warning/20 rounded-xl px-3 py-2.5 mb-2">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-[11px] text-warning/90 leading-relaxed">
                  AI analiz çıkartmak için giriş yapmanız gerekiyor.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Giriş Yap
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ──── Overlay (hem desktop hem mobile) ──── */}
      {couponPanelOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setCouponPanelOpen(false)}
        />
      )}

      {/* ──── Drawer (sağdan — hem desktop hem mobile) ──── */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-bg-card border-l border-border transform transition-transform duration-200 ease-out ${
          couponPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {panelContent}
      </aside>

      {/* ──── Mobile Bottom Tab Bar ──── */}
      <MobileBottomBar />
    </>
  );
}

/* ──── Kupon Maç Kartı ──── */
function CouponMatchCard({ match, index, onRemove }) {
  return (
    <div className="bg-bg-base border border-border rounded-lg overflow-hidden group hover:border-border-light transition-colors">
      {/* Üst: Numara + Kaldır */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-accent bg-accent/10 w-4 h-4 rounded flex items-center justify-center">
            {index}
          </span>
          <span className="text-[10px] text-text-muted truncate max-w-[120px]">
            {match.league}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="p-0.5 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors"
          title="Kupondan çıkar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Alt: Takımlar + Tarih */}
      <div className="px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          {match.homeLogo && (
            <img src={match.homeLogo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
          )}
          <span className="text-xs text-text-primary font-medium truncate">{match.homeTeam}</span>
          <span className="text-[10px] text-text-muted flex-shrink-0">vs</span>
          <span className="text-xs text-text-primary font-medium truncate">{match.awayTeam}</span>
          {match.awayLogo && (
            <img src={match.awayLogo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatMatchDate(match.matchDate)}
        </p>
      </div>
    </div>
  );
}

/* ──── Mobil Alt Tab Bar ──── */
function MobileBottomBar() {
  const { toggleCouponPanel } = useUIStore();
  const matchCount = useCouponStore((s) => s.matches.length);

  if (matchCount === 0) return null;

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 bg-primary border-t border-border safe-area-bottom">
      <button
        onClick={toggleCouponPanel}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent rounded-full text-[9px] font-bold flex items-center justify-center text-white">
              {matchCount}
            </span>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-text-primary">Kuponum</p>
            <p className="text-[10px] text-text-muted">{matchCount} maç seçili</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-accent">Görüntüle</span>
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
