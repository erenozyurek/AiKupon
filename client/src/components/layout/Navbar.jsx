import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCouponStore } from '../../stores/couponStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, toggleCouponPanel } = useUIStore();
  const matchCount = useCouponStore((s) => s.matches.length);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-primary border-b border-border h-14">
      <div className="flex items-center justify-between h-full px-4">
        {/* Sol: Hamburger + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Menüyü aç"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Ai</span>
            </div>
            <span className="text-lg font-bold text-text-primary hidden sm:block">
              Ai<span className="text-accent">Kupon</span>
            </span>
          </Link>
        </div>

        {/* Orta: Navigasyon linkleri (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" label="Ana Sayfa" />
          <NavLink to="/fixtures" label="Maçlar" />
          <button
            onClick={toggleCouponPanel}
            className="relative text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-md hover:bg-bg-hover transition-colors flex items-center gap-1.5"
          >
            Kuponlarım
            {matchCount > 0 && (
              <span className="w-4 h-4 bg-accent rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {matchCount}
              </span>
            )}
          </button>
          <NavLink to="/analysis" label="AI Analiz" />
        </div>

        {/* Sağ: Kupon butonu + Auth */}
        <div className="flex items-center gap-2">
          {/* Mobil kupon paneli butonu */}
          <button
            onClick={toggleCouponPanel}
            className="relative p-1.5 rounded-md text-accent hover:bg-bg-hover transition-colors md:hidden"
            aria-label="Kuponu aç"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {matchCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {matchCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-bg-hover transition-colors"
              >
                <div className="w-7 h-7 bg-accent/20 border border-accent/40 rounded-full flex items-center justify-center">
                  <span className="text-accent text-xs font-semibold">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm text-text-primary hidden sm:block">{user.username}</span>
              </Link>
              <button
                onClick={logout}
                className="text-xs text-text-secondary hover:text-error px-2 py-1 rounded transition-colors"
              >
                Çıkış
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-md transition-colors"
              >
                Giriş
              </Link>
              <Link
                to="/register"
                className="text-sm text-white bg-accent hover:bg-accent-dark px-3 py-1.5 rounded-md font-medium transition-colors"
              >
                Kayıt Ol
              </Link>
            </div>
          )}

          {/* Mobil menü düğmesi */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Navigasyon menüsü"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobil dropdown menü */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-primary border-t border-border px-4 py-2 space-y-1">
          <MobileNavLink to="/" label="Ana Sayfa" onClick={() => setMobileMenuOpen(false)} />
          <MobileNavLink to="/fixtures" label="Maçlar" onClick={() => setMobileMenuOpen(false)} />
          <button
            onClick={() => { setMobileMenuOpen(false); toggleCouponPanel(); }}
            className="block w-full text-left text-sm text-text-secondary hover:text-text-primary px-3 py-2 rounded-md hover:bg-bg-hover transition-colors"
          >
            Kuponlarım {matchCount > 0 && `(${matchCount})`}
          </button>
          <MobileNavLink to="/analysis" label="AI Analiz" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </nav>
  );
}

function NavLink({ to, label }) {
  return (
    <Link
      to={to}
      className="text-sm text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-md hover:bg-bg-hover transition-colors"
    >
      {label}
    </Link>
  );
}

function MobileNavLink({ to, label, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block text-sm text-text-secondary hover:text-text-primary px-3 py-2 rounded-md hover:bg-bg-hover transition-colors"
    >
      {label}
    </Link>
  );
}
