/**
 * Fixture Router — Yeni birleşik futbol API rotaları
 * ESPN + football-data.org verilerini sunar
 */
const express = require('express');
const unifiedService = require('../services/unifiedFootballService');

const router = express.Router();

/**
 * GET /api/fixtures/leagues
 * Desteklenen tüm ligleri döndür
 */
router.get('/leagues', (_req, res, next) => {
  try {
    const leagues = unifiedService.getLeagues();
    res.json({ count: leagues.length, data: leagues });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fixtures/upcoming?leagueId=tur.1&days=10
 * Belirli ligin yaklaşan maçlarını getir
 */
router.get('/upcoming', async (req, res, next) => {
  try {
    const { leagueId, days } = req.query;

    if (!leagueId) {
      return res.status(400).json({ message: 'leagueId parametresi zorunludur' });
    }

    // Eski numerik lig ID'lerini reddet
    const supportedLeagues = unifiedService.getLeagues().map(l => l.id);
    if (!supportedLeagues.includes(leagueId)) {
      return res.status(404).json({ message: `"${leagueId}" desteklenen bir lig değil. Sol menüden bir lig seçin.` });
    }

    const daysNum = Math.min(Math.max(parseInt(days) || 10, 1), 30);
    const fixtures = await unifiedService.getUpcomingFixtures(leagueId, daysNum);

    res.json({ count: fixtures.length, data: fixtures });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fixtures/standings?leagueId=tur.1
 * Puan durumu
 */
router.get('/standings', async (req, res, next) => {
  try {
    const { leagueId } = req.query;

    if (!leagueId) {
      return res.status(400).json({ message: 'leagueId parametresi zorunludur' });
    }

    const standings = await unifiedService.getStandings(leagueId);
    res.json({ count: standings.length, data: standings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/fixtures/:matchId/details?leagueId=tur.1
 * Maç detayı: H2H, form, standings, odds
 */
router.get('/:matchId/details', async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { leagueId } = req.query;

    if (!matchId) {
      return res.status(400).json({ message: 'matchId parametresi zorunludur' });
    }

    const details = await unifiedService.getMatchDetails(
      leagueId || 'tur.1',
      matchId
    );

    res.json({ data: details });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
