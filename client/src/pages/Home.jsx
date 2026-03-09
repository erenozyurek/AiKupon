import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouponStore } from '../stores/couponStore';
import api from '../lib/api';

const FEATURED_LEAGUES = [
  { id: 'tur.1', name: 'Süper Lig' },
  { id: 'eng.1', name: 'Premier League' },
  { id: 'esp.1', name: 'La Liga' },
  { id: 'fra.1', name: 'Ligue 1' },
  { id: 'uefa.champions', name: 'Champions League' },
  { id: 'uefa.europa', name: 'Europa League' },
  { id: 'fifa.worldq.uefa', name: 'Dünya Kupası Elemeleri' },
  { id: 'fifa.world', name: 'FIFA Dünya Kupası 2026' },
];

function Home() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Tüm liglerden 3 günlük maçları çek (paralel)
        const results = await Promise.allSettled(
          FEATURED_LEAGUES.map((l) =>
            api.get('/fixtures/upcoming', { params: { leagueId: l.id, days: 3 } })
          )
        );

        if (cancelled) return;

        const allMatches = [];
        for (const r of results) {
          if (r.status === 'fulfilled') {
            allMatches.push(...(r.value.data.data || []));
          }
        }

        // Tarihe göre sırala, sadece SCHEDULED olanları al
        const upcoming = allMatches
          .filter((m) => m.status === 'SCHEDULED')
          .sort((a, b) => new Date(a.fullDate || a.date) - new Date(b.fullDate || b.date));

        setMatches(upcoming);
      } catch {
        // sessiz hata
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMatches = matches.filter((m) => m.date === todayStr);
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const importantMatches = matches.filter((m) => m.importance);

  return (
    <div>
      {/* Hoşgeldin kartı */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Günün Maçları
        </h1>
        <p className="text-sm text-text-secondary">
          Maçları inceleyin, kuponunuza ekleyin ve analiz edin.
        </p>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Bugünkü Maçlar" value={loading ? '...' : String(todayMatches.length)} icon="today" />
        <StatCard label="Canlı Maçlar" value={loading ? '...' : String(liveMatches.length)} icon="live" accent />
        <StatCard label="Yaklaşan Maçlar" value={loading ? '...' : String(matches.length)} icon="upcoming" />
        <StatCard label="Önemli Maçlar" value={loading ? '...' : String(importantMatches.length)} icon="important" />
      </div>

      {/* Önemli maçlar */}
      {importantMatches.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Öne Çıkan Maçlar</h2>
          </div>
          <div className="divide-y divide-border">
            {importantMatches.slice(0, 5).map((m) => (
              <MatchRow key={m.id} match={m} onNavigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Yaklaşan maçlar */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Yaklaşan Maçlar</h2>
          <button
            onClick={() => navigate('/fixtures?leagueId=tur.1&leagueName=S%C3%BCper%20Lig')}
            className="text-[10px] text-accent font-medium hover:underline"
          >
            Tümünü Gör →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="ml-2 text-xs text-text-secondary">Maçlar yükleniyor...</span>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-secondary">Yaklaşan maç bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {matches.slice(0, 10).map((m) => (
              <MatchRow key={m.id} match={m} onNavigate={navigate} />
            ))}
          </div>
        )}
      </div>

      {/* Lig kısayolları */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {FEATURED_LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => navigate(`/fixtures?leagueId=${l.id}&leagueName=${encodeURIComponent(l.name)}`)}
            className="bg-bg-card border border-border rounded-xl p-3 hover:border-accent hover:bg-accent/5 transition-colors text-center"
          >
            <p className="text-[11px] text-text-primary font-medium truncate">{l.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const STAT_ICONS = {
  today: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  live: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="6" />
    </svg>
  ),
  upcoming: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  important: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
};

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-border-light transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-error/10 text-error' : 'bg-accent/10 text-accent'}`}>
        {STAT_ICONS[icon]}
      </div>
      <div>
        <p className="text-xl font-bold text-text-primary">{value}</p>
        <p className="text-[11px] text-text-muted">{label}</p>
      </div>
    </div>
  );
}

function MatchRow({ match, onNavigate }) {
  const { toggleMatch, isSelected, isFull } = useCouponStore();
  const selected = isSelected(match.id);

  const handleAdd = (e) => {
    e.stopPropagation();
    toggleMatch({
      fixtureId: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: match.league.name,
      matchDate: match.fullDate || match.date,
      homeLogo: match.homeTeam.logo,
      awayLogo: match.awayTeam.logo,
      leagueId: match.sourceLeague || match.league.id,
      odds: 1.00,
    });
  };

  return (
    <div
      className="px-4 py-3 hover:bg-bg-hover/30 transition-colors cursor-pointer"
      onClick={() => onNavigate(`/fixtures?leagueId=${match.sourceLeague || match.league.id}&leagueName=${encodeURIComponent(match.league.name)}`)}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Saat + Lig */}
        <div className="w-20 flex-shrink-0">
          <p className="text-xs font-medium text-accent">{match.time}</p>
          <p className="text-[10px] text-text-muted truncate">{match.date}</p>
        </div>

        {/* Takımlar */}
        <div className="flex-1 min-w-0 flex items-center gap-2 justify-center">
          {match.homeTeam.logo && (
            <img src={match.homeTeam.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          )}
          <p className="text-xs text-text-primary font-medium truncate">
            {match.homeTeam.shortName || match.homeTeam.name}
          </p>
          <span className="text-[10px] text-text-muted">vs</span>
          <p className="text-xs text-text-primary font-medium truncate">
            {match.awayTeam.shortName || match.awayTeam.name}
          </p>
          {match.awayTeam.logo && (
            <img src={match.awayTeam.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          )}
        </div>

        {/* Önem + Lig + Ekle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`w-[70px] text-center text-[9px] font-bold px-1.5 py-0.5 rounded ${
            match.importance
              ? match.importance === 'DERBİ' ? 'bg-error/10 text-error'
                : match.importance === 'ZİRVE MAÇI' ? 'bg-warning/10 text-warning'
                : match.importance === 'KÜME DÜŞME' ? 'bg-orange-500/10 text-orange-400'
                : 'bg-accent/10 text-accent'
              : ''
          }`}>
            {match.importance || ''}
          </span>
          {match.league.logo && (
            <img src={match.league.logo} alt="" className="w-4 h-4 object-contain" />
          )}
          <button
            onClick={handleAdd}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
              selected
                ? 'bg-success text-white'
                : isFull()
                ? 'bg-bg-base text-text-muted opacity-50 cursor-not-allowed'
                : 'bg-accent/10 text-accent hover:bg-accent hover:text-white'
            }`}
            title={selected ? 'Kupondan çıkar' : 'Kupona ekle'}
          >
            {selected ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
