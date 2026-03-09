import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useCouponStore } from '../stores/couponStore';
import { useCacheStore } from '../stores/cacheStore';

const DERBY_PAIRS = [
  ['Galatasaray', 'Fenerbahçe'], ['Fenerbahçe', 'Galatasaray'],
  ['Galatasaray', 'Beşiktaş'], ['Beşiktaş', 'Galatasaray'],
  ['Fenerbahçe', 'Beşiktaş'], ['Beşiktaş', 'Fenerbahçe'],
  ['Barcelona', 'Real Madrid'], ['Real Madrid', 'Barcelona'],
  ['Liverpool', 'Manchester United'], ['Manchester United', 'Liverpool'],
  ['AC Milan', 'Inter'], ['Inter', 'AC Milan'],
  ['Arsenal', 'Tottenham'], ['Tottenham', 'Arsenal'],
  ['Dortmund', 'Bayern München'], ['Bayern München', 'Dortmund'],
  ['PSG', 'Marseille'], ['Marseille', 'PSG'],
  ['Roma', 'Lazio'], ['Lazio', 'Roma'],
  ['Atletico Madrid', 'Real Madrid'], ['Real Madrid', 'Atletico Madrid'],
];

function getMatchTag(home, away) {
  const isDerby = DERBY_PAIRS.some(
    ([h, a]) => home.includes(h) && away.includes(a)
  );
  if (isDerby) return 'DERBİ';
  return null;
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Bugün';
  if (isSameDay(date, tomorrow)) return 'Yarın';

  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByDate(fixtures) {
  const groups = {};
  for (const fix of fixtures) {
    const dayKey = fix.date; // YYYY-MM-DD format
    if (!groups[dayKey]) groups[dayKey] = { label: formatDateLabel(fix.fullDate || fix.date), fixtures: [] };
    groups[dayKey].fixtures.push(fix);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export default function FixturesPage() {
  const [searchParams] = useSearchParams();
  const leagueId = searchParams.get('leagueId');
  const leagueName = searchParams.get('leagueName') || 'Lig';

  const cacheGet = useCacheStore((s) => s.get);
  const cacheSet = useCacheStore((s) => s.set);
  const [fixtures, setFixtures] = useState(() => (leagueId ? cacheGet(`fixtures_${leagueId}`) || [] : []));
  const [loading, setLoading] = useState(() => leagueId ? !cacheGet(`fixtures_${leagueId}`) : false);
  const [error, setError] = useState('');

  const fetchFixtures = useCallback(async (lid, force = false) => {
    if (!lid) return;
    if (!force) {
      const cached = cacheGet(`fixtures_${lid}`);
      if (cached) {
        setFixtures(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/fixtures/upcoming', {
        params: { leagueId: lid, days: 10 },
      });
      const result = data.data || [];
      setFixtures(result);
      cacheSet(`fixtures_${lid}`, result);
    } catch (err) {
      setError(err.response?.data?.message || 'Maçlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [cacheGet, cacheSet]);

  useEffect(() => {
    if (leagueId) fetchFixtures(leagueId);
  }, [leagueId, fetchFixtures]);

  const groups = groupByDate(fixtures);

  // Lig seçilmemişse
  if (!leagueId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-bg-card border border-border rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">Lig Seçin</h2>
        <p className="text-sm text-text-secondary max-w-xs">
          Sol menüden bir lig seçerek önümüzdeki 10 günün maçlarını görüntüleyin.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Başlık */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-text-primary">{leagueName}</h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Önümüzdeki 10 günün maç programı
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-text-secondary">Maçlar yükleniyor...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs text-error font-medium">{error}</p>
            <button
              onClick={() => fetchFixtures(leagueId)}
              className="text-xs text-accent hover:underline mt-1"
            >
              Tekrar dene
            </button>
          </div>
        </div>
      )}

      {/* Boş durum */}
      {!loading && !error && fixtures.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-text-secondary">Bu lig için yaklaşan maç bulunamadı.</p>
        </div>
      )}

      {/* Maç listeleri tarihe göre gruplu */}
      {!loading && groups.map((group, gi) => (
        <div key={gi} className="mb-6">
          {/* Tarih başlığı */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-accent bg-bg-base px-3 py-1 rounded-full border border-border">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Maç kartları */}
          <div className="space-y-2">
            {group.fixtures.map((fix) => (
              <MatchCard key={fix.id} fixture={fix} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ fixture }) {
  const { toggleMatch, isSelected, isFull } = useCouponStore();
  const selected = isSelected(fixture.id);
  const [shakeWarn, setShakeWarn] = useState(false);

  const tag = fixture.importance || getMatchTag(fixture.homeTeam.name, fixture.awayTeam.name);

  const handleToggle = () => {
    const result = toggleMatch({
      fixtureId: fixture.id,
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      league: fixture.league.name,
      matchDate: fixture.fullDate || fixture.date,
      homeLogo: fixture.homeTeam.logo,
      awayLogo: fixture.awayTeam.logo,
      leagueId: fixture.sourceLeague || fixture.league.id,
      odds: 1.00,
    });
    if (result === 'full') {
      setShakeWarn(true);
      setTimeout(() => setShakeWarn(false), 600);
    }
  };

  return (
    <div
      className={`bg-bg-card border rounded-xl overflow-hidden transition-all duration-200 ${
        selected
          ? 'border-success shadow-[0_0_0_1px] shadow-success/30'
          : 'border-border hover:border-border-light'
      } ${shakeWarn ? 'animate-shake' : ''}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Ev sahibi */}
          <div className="flex-1 flex items-center gap-2.5 justify-end min-w-0">
            <span className="text-sm text-text-primary font-medium truncate text-right">
              {fixture.homeTeam.name}
            </span>
            {fixture.homeTeam.logo ? (
              <img
                src={fixture.homeTeam.logo}
                alt={fixture.homeTeam.name}
                className="w-7 h-7 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 bg-bg-base rounded-full flex-shrink-0" />
            )}
          </div>

          {/* Tarih/Saat */}
          <div className="flex flex-col items-center px-3 flex-shrink-0">
            <span className="text-xs font-bold text-accent">
              {fixture.time || formatTime(fixture.fullDate || fixture.date)}
            </span>
            <span className="text-[9px] text-text-muted mt-0.5">VS</span>
          </div>

          {/* Deplasman */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            {fixture.awayTeam.logo ? (
              <img
                src={fixture.awayTeam.logo}
                alt={fixture.awayTeam.name}
                className="w-7 h-7 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 bg-bg-base rounded-full flex-shrink-0" />
            )}
            <span className="text-sm text-text-primary font-medium truncate">
              {fixture.awayTeam.name}
            </span>
          </div>

          {/* Kupona Ekle */}
          <button
            onClick={handleToggle}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
              selected
                ? 'bg-success text-white'
                : isFull()
                ? 'bg-bg-base text-text-muted cursor-not-allowed opacity-50'
                : 'bg-accent/10 text-accent hover:bg-accent hover:text-white'
            }`}
            title={selected ? 'Kupondan çıkar' : isFull() ? 'Kupon dolu (max 8)' : 'Kupona ekle'}
          >
            {selected ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>

        {/* Alt bilgi satırı */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {fixture.league.logo && (
              <img src={fixture.league.logo} alt="" className="w-3.5 h-3.5 object-contain" />
            )}
            <span className="text-[10px] text-text-muted">{fixture.league.name}</span>
            {fixture.league.round && (
              <span className="text-[10px] text-text-muted">• {fixture.league.round}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {tag && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                tag === 'DERBİ'
                  ? 'bg-error/10 text-error'
                  : 'bg-accent/10 text-accent'
              }`}>
                {tag}
              </span>
            )}
            {fixture.venue && (
              <span className="text-[10px] text-text-muted hidden sm:inline">📍 {fixture.venue}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
