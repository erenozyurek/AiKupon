/**
 * Unified Football Service
 * ESPN (birincil) + football-data.org (yedek) — tek arayüz
 * 
 * Tüm ligler ESPN API'den çekilir.
 * football-data.org opsiyonel yedek olarak kullanılabilir.
 */
const espnService = require('./espnService');
const footballDataService = require('./footballDataService');
const { transformESPNFixture, transformESPNStanding, transformESPNH2H } = require('../transformers/espnTransformer');
const { transformFDMatch, transformFDStanding, transformFDH2H } = require('../transformers/footballDataTransformer');
const { enrichWithStandings } = require('./dataEnricher');
const { cacheManager, CACHE_TTL } = require('./cacheManager');
const { ESPN_LEAGUES } = require('./espnService');
const { FD_LEAGUES } = require('./footballDataService');

/**
 * Tüm desteklenen ligleri döndür
 */
const getLeagues = () => {
  const cKey = cacheManager.key('unified', 'leagues', 'all');
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const leagues = Object.entries(ESPN_LEAGUES).map(([slug, info]) => ({
    id: slug,
    name: info.name,
    country: info.country,
    flag: info.flag,
    logo: info.logo,
  }));

  cacheManager.set(cKey, leagues, CACHE_TTL.LEAGUES);
  return leagues;
};

/**
 * Belirli ligin maçlarını getir (ESPN → fallback football-data.org)
 * @param {string} leagueId — ESPN slug (tur.1, eng.1, etc.)
 * @param {number} days — Kaç gün ilerisi
 */
const getUpcomingFixtures = async (leagueId, days = 10) => {
  // ESPN'den çek
  try {
    const events = await espnService.getFixtures(leagueId, days);
    const fixtures = events.map((e) => transformESPNFixture(e, leagueId));

    // Puan durumu ile zenginleştir (paralel)
    try {
      const standings = await getStandings(leagueId);
      return fixtures.map((f) => enrichWithStandings(f, standings));
    } catch {
      return fixtures;
    }
  } catch (espnErr) {
    console.error(`[UnifiedService] ESPN hata (${leagueId}):`, espnErr.message);

    // football-data.org yedek
    const fdCode = espnSlugToFDCode(leagueId);
    if (fdCode && footballDataService.isAvailable()) {
      try {
        const matches = await footballDataService.getMatches(fdCode, days);
        if (matches) {
          return matches.map((m) => transformFDMatch(m, fdCode));
        }
      } catch (fdErr) {
        console.error(`[UnifiedService] FD hata (${fdCode}):`, fdErr.message);
      }
    }

    // Fallback cache
    const fallbackKey = cacheManager.key('espn', 'fixtures', { league: leagueId, days });
    const fallback = cacheManager.getFallback(fallbackKey);
    if (fallback) {
      console.log(`[UnifiedService] Fallback cache kullanılıyor: ${leagueId}`);
      return fallback.map((e) => transformESPNFixture(e, leagueId));
    }

    throw new Error(`${leagueId} için maç verisi alınamadı`);
  }
};

/**
 * Puan durumunu getir
 */
const getStandings = async (leagueId) => {
  try {
    const entries = await espnService.getStandings(leagueId);
    return entries.map(transformESPNStanding);
  } catch (err) {
    console.error(`[UnifiedService] Standings hata (${leagueId}):`, err.message);

    // football-data.org yedek
    const fdCode = espnSlugToFDCode(leagueId);
    if (fdCode && footballDataService.isAvailable()) {
      try {
        const table = await footballDataService.getStandings(fdCode);
        if (table) return table.map(transformFDStanding);
      } catch {
        // ignore
      }
    }

    return [];
  }
};

/**
 * Maç detayı: H2H, form, standings, odds vb.
 * @param {string} leagueId — ESPN slug
 * @param {string} eventId — ESPN event ID
 */
const getMatchDetails = async (leagueId, eventId) => {
  try {
    const summary = await espnService.getEventSummary(leagueId, eventId);

    // H2H verisi
    const h2hGames = summary.headToHeadGames || [];
    const comp = summary.boxscore?.teams || [];
    const homeTeamId = comp[0]?.team?.id;
    const awayTeamId = comp[1]?.team?.id;
    const h2h = transformESPNH2H(h2hGames, homeTeamId, awayTeamId);

    // Standings
    const standings = await getStandings(leagueId).catch(() => []);

    // Ana event
    const event = summary.header?.competitions?.[0];
    const fixture = event ? transformESPNFixture(
      { ...event, id: eventId, date: event.date, competitions: [event] },
      leagueId
    ) : null;

    // Fixture'ı standings ile zenginleştir
    const enrichedFixture = fixture ? enrichWithStandings(fixture, standings) : null;

    return {
      fixture: enrichedFixture,
      h2h,
      standings,
      odds: summary.odds || null,
      keyEvents: summary.keyEvents || [],
    };
  } catch (err) {
    console.error(`[UnifiedService] Match details hata:`, err.message);
    throw err;
  }
};

/**
 * Analiz için maç verilerini topla (analysis.js tarafından kullanılır)
 * CouponMatch'teki bilgilerle maç verisini ESPN'den çeker
 * @param {string} fixtureId — "eventId" veya eski "fixtureId" formatı
 * @param {string} leagueSlug — ESPN league slug (opsiyonel)
 */
const getFixtureStats = async (fixtureId, leagueSlug) => {
  // ESPN event ID ise detay çek
  if (leagueSlug) {
    try {
      return await getMatchDetails(leagueSlug, fixtureId);
    } catch {
      // fallthrough
    }
  }

  // leagueSlug bilinmiyorsa tüm ligleri dene
  for (const slug of Object.keys(ESPN_LEAGUES)) {
    try {
      const result = await getMatchDetails(slug, fixtureId);
      if (result.fixture) return result;
    } catch {
      continue;
    }
  }

  return { fixture: null, h2h: null, standings: [], odds: null, keyEvents: [] };
};

/**
 * ESPN slug → football-data.org kodu eşlemesi
 */
function espnSlugToFDCode(slug) {
  const map = {
    'eng.1': 'PL',
    'esp.1': 'PD',
    'ger.1': 'BL1',
    'ita.1': 'SA',
    'fra.1': 'FL1',
    'uefa.champions': 'CL',
  };
  return map[slug] || null;
}

module.exports = {
  getLeagues,
  getUpcomingFixtures,
  getStandings,
  getMatchDetails,
  getFixtureStats,
};
