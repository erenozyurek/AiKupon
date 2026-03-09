/**
 * Football-Data.org API Service
 * Free tier: 10 requests/minute, ana Avrupa ligleri
 * Base URL: https://api.football-data.org/v4
 * 
 * Not: API key gerektirir — .env'de FOOTBALL_DATA_KEY olmalı
 * Key yoksa bu servis devre dışı kalır, ESPN yedek olarak çalışır
 */
const axios = require('axios');
const { cacheManager, CACHE_TTL } = require('./cacheManager');

const FD_BASE = 'https://api.football-data.org/v4';

/**
 * football-data.org lig kodları
 */
const FD_LEAGUES = {
  PL: { name: 'Premier League', country: 'England', espnSlug: 'eng.1' },
  PD: { name: 'La Liga', country: 'Spain', espnSlug: 'esp.1' },
  BL1: { name: 'Bundesliga', country: 'Germany', espnSlug: 'ger.1' },
  SA: { name: 'Serie A', country: 'Italy', espnSlug: 'ita.1' },
  FL1: { name: 'Ligue 1', country: 'France', espnSlug: 'fra.1' },
  CL: { name: 'Champions League', country: 'Europe', espnSlug: 'uefa.champions' },
};

// Rate limiter: 10 istek/dakika (free plan)
const requestQueue = [];
let processing = false;

function getClient() {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) return null;

  return axios.create({
    baseURL: FD_BASE,
    headers: { 'X-Auth-Token': key },
    timeout: 15000,
  });
}

async function rateLimitedRequest(client, url, params = {}) {
  return new Promise((resolve, reject) => {
    const task = { client, url, params, resolve, reject, retries: 0 };
    requestQueue.push(task);
    processQueue();
  });
}

async function processQueue() {
  if (processing || requestQueue.length === 0) return;
  processing = true;

  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    try {
      const { data } = await task.client.get(task.url, { params: task.params });
      task.resolve(data);
    } catch (err) {
      if (err.response?.status === 429 && task.retries < 3) {
        task.retries++;
        requestQueue.unshift(task);
        await new Promise((r) => setTimeout(r, 6000));
      } else {
        task.reject(err);
      }
    }
    // Her istek arası minimum 6 saniye (10/dk limit)
    if (requestQueue.length > 0) {
      await new Promise((r) => setTimeout(r, 6000));
    }
  }

  processing = false;
}

/**
 * API key var mı kontrol et
 */
const isAvailable = () => !!process.env.FOOTBALL_DATA_KEY;

/**
 * Belirli ligin maçlarını getir
 */
const getMatches = async (leagueCode, days = 10) => {
  const client = getClient();
  if (!client) return null;

  const cKey = cacheManager.key('fd', 'matches', { league: leagueCode, days });
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const today = new Date();
  const dateFrom = today.toISOString().split('T')[0];
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + days);
  const dateTo = toDate.toISOString().split('T')[0];

  const data = await rateLimitedRequest(client, `/competitions/${leagueCode}/matches`, {
    dateFrom,
    dateTo,
  });

  const matches = data?.matches || [];
  cacheManager.set(cKey, matches, CACHE_TTL.FIXTURES);
  return matches;
};

/**
 * Puan durumu
 */
const getStandings = async (leagueCode) => {
  const client = getClient();
  if (!client) return null;

  const cKey = cacheManager.key('fd', 'standings', leagueCode);
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const data = await rateLimitedRequest(client, `/competitions/${leagueCode}/standings`);

  const standings = data?.standings?.[0]?.table || [];
  cacheManager.set(cKey, standings, CACHE_TTL.STANDINGS);
  return standings;
};

/**
 * H2H karşılaşmaları
 */
const getH2H = async (matchId) => {
  const client = getClient();
  if (!client) return null;

  const cKey = cacheManager.key('fd', 'h2h', matchId);
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const data = await rateLimitedRequest(client, `/matches/${matchId}/head2head`);

  cacheManager.set(cKey, data, CACHE_TTL.H2H);
  return data;
};

/**
 * Takım son maçları (form)
 */
const getTeamMatches = async (teamId, limit = 5) => {
  const client = getClient();
  if (!client) return null;

  const cKey = cacheManager.key('fd', 'team_matches', { team: teamId, limit });
  const cached = cacheManager.get(cKey);
  if (cached) return cached;

  const data = await rateLimitedRequest(client, `/teams/${teamId}/matches`, {
    status: 'FINISHED',
    limit,
  });

  const matches = data?.matches || [];
  cacheManager.set(cKey, matches, CACHE_TTL.H2H);
  return matches;
};

module.exports = {
  isAvailable,
  getMatches,
  getStandings,
  getH2H,
  getTeamMatches,
  FD_LEAGUES,
};
