import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUIStore } from '../../stores/uiStore';
import api from '../../lib/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeLeagueId = searchParams.get('leagueId');

  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const [leagues, setLeagues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Ligleri yükle (tek endpoint)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/fixtures/leagues');
        if (!cancelled) setLeagues(data.data || []);
      } catch {
        // Fallback ligleri kullan
        if (!cancelled) setLeagues(FALLBACK_LEAGUES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLeagueClick = (league) => {
    navigate(`/fixtures?leagueId=${league.id}&leagueName=${encodeURIComponent(league.name)}`);
    setSidebarOpen(false);
  };

  // Ülkelere göre grupla
  const grouped = groupByCountry(leagues);

  // Arama filtresi
  const filteredGroups = searchQuery
    ? grouped
        .map((g) => ({
          ...g,
          leagues: g.leagues.filter(
            (l) =>
              l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              g.country.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((g) => g.leagues.length > 0)
    : grouped;

  const displayGroups = filteredGroups.length > 0 ? filteredGroups : groupByCountry(FALLBACK_LEAGUES);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Başlık */}
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Ligler</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Arama */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Lig ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-base border border-border rounded-md text-xs text-text-primary placeholder-text-muted pl-8 pr-3 py-1.5 focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Lig listesi */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          displayGroups.map((group) => (
            <div key={group.country} className="mb-2">
              {/* Ülke başlığı */}
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="text-sm">{group.flag}</span>
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  {group.country}
                </span>
              </div>
              {/* Ligler */}
              {group.leagues.map((league) => (
                <button
                  key={league.id}
                  onClick={() => handleLeagueClick(league)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                    String(activeLeagueId) === String(league.id)
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {league.logo && (
                    <img src={league.logo} alt="" className="w-4 h-4 object-contain flex-shrink-0" />
                  )}
                  <span className="truncate">{league.name}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center gap-1.5 text-text-muted">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px]">ESPN + football-data.org</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-bg-card border-r border-border flex-shrink-0 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-bg-card border-r border-border transform transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function groupByCountry(leagues) {
  const map = {};
  for (const l of leagues) {
    const country = l.country || 'Other';
    if (!map[country]) map[country] = { country, flag: l.flag || '', leagues: [] };
    map[country].leagues.push(l);
  }
  // Türkiye en üstte, Avrupa en altta
  const order = ['Turkey', 'England', 'Spain', 'Germany', 'Italy', 'France', 'UEFA', 'FIFA'];
  return Object.values(map).sort((a, b) => {
    const ai = order.indexOf(a.country);
    const bi = order.indexOf(b.country);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

const FALLBACK_LEAGUES = [
  { id: 'tur.1', name: 'Süper Lig', country: 'Turkey', flag: '🇹🇷', logo: '' },
  { id: 'eng.1', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: '' },
  { id: 'esp.1', name: 'La Liga', country: 'Spain', flag: '🇪🇸', logo: '' },
  { id: 'ger.1', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪', logo: '' },
  { id: 'ita.1', name: 'Serie A', country: 'Italy', flag: '🇮🇹', logo: '' },
  { id: 'fra.1', name: 'Ligue 1', country: 'France', flag: '🇫🇷', logo: '' },
  { id: 'uefa.champions', name: 'Champions League', country: 'UEFA', flag: '🏆', logo: '' },
  { id: 'uefa.europa', name: 'Europa League', country: 'UEFA', flag: '🏆', logo: '' },
  { id: 'fifa.worldq.uefa', name: 'Dünya Kupası Elemeleri (UEFA)', country: 'FIFA', flag: '🌍', logo: '' },
  { id: 'fifa.world', name: 'FIFA Dünya Kupası 2026', country: 'FIFA', flag: '🏆', logo: '' },
];
