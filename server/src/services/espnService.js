/**
 * ESPN API Service
 * Ücretsiz, key gerektirmeyen API — tüm ligleri destekler
 * Base URL: https://site.api.espn.com/apis/site/v2/sports/soccer
 */
const axios = require('axios');
const { cacheManager, CACHE_TTL } = require('./cacheManager');

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ESPN_V2 = 'https://site.api.espn.com/apis/v2/sports/soccer';

const espnClient = axios.create({
  baseURL: ESPN_BASE,
  timeout: 15000,
});

const espnV2Client = axios.create({
  baseURL: ESPN_V2,
  timeout: 15000,
});

/**
 * Desteklenen ligler — ESPN slug → display bilgisi
 */
const ESPN_LEAGUES = {
  'tur.1': { name: 'Süper Lig', country: 'Turkey', flag: '🇹🇷', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/18.png' },
  'eng.1': { name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png' },
  'esp.1': { name: 'La Liga', country: 'Spain', flag: '🇪🇸', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png' },
  'ger.1': { name: 'Bundesliga', country: 'Germany', flag: '🇩🇪', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png' },
  'ita.1': { name: 'Serie A', country: 'Italy', flag: '🇮🇹', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/12.png' },
  'fra.1': { name: 'Ligue 1', country: 'France', flag: '🇫🇷', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/9.png' },
  'uefa.champions': { name: 'Champions League', country: 'UEFA', flag: '🏆', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png' },
  'uefa.europa': { name: 'Europa League', country: 'UEFA', flag: '🏆', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png' },
  'fifa.worldq.uefa': { name: 'Dünya Kupası Elemeleri (UEFA)', country: 'FIFA', flag: '🌍', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png' },
  'fifa.world': { name: 'FIFA Dünya Kupası 2026', country: 'FIFA', flag: '🏆', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png' },
};

/**
 * Önümüzdeki N günün maçlarını getir
 */
const getFixtures = async (leagueSlug, days = 10) => {
  const cKey = cacheManager.key('espn', 'fixtures', { league: leagueSlug, days });
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const today = new Date();
  const from = formatDateESPN(today);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + days);
  const to = formatDateESPN(toDate);

  const { data } = await espnClient.get(`/${leagueSlug}/scoreboard`, {
    params: { dates: `${from}-${to}` },
  });

  const events = data.events || [];
  cacheManager.set(cKey, events, CACHE_TTL.FIXTURES);
  return events;
};

/**
 * Puan durumunu getir
 */
const getStandings = async (leagueSlug) => {
  const cKey = cacheManager.key('espn', 'standings', leagueSlug);
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const { data } = await espnV2Client.get(`/${leagueSlug}/standings`);

  const entries = data?.children?.[0]?.standings?.entries || [];
  cacheManager.set(cKey, entries, CACHE_TTL.STANDINGS);
  return entries;
};

/**
 * Maç detayı — H2H, form, standings, keyEvents, odds
 */
const getEventSummary = async (leagueSlug, eventId) => {
  const cKey = cacheManager.key('espn', 'summary', { league: leagueSlug, event: eventId });
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const { data } = await espnClient.get(`/${leagueSlug}/summary`, {
    params: { event: eventId },
  });

  cacheManager.set(cKey, data, CACHE_TTL.EVENT_DETAIL);
  return data;
};

/**
 * Tarih → YYYYMMDD formatı (ESPN API)
 */
function formatDateESPN(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

module.exports = {
  getFixtures,
  getStandings,
  getEventSummary,
  ESPN_LEAGUES,
};
