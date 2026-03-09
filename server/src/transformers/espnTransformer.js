/**
 * ESPN API verilerini standart formata dönüştürür
 */
const { ESPN_LEAGUES } = require('../services/espnService');

/**
 * ESPN event → Standart maç objesi
 */
const transformESPNFixture = (event, leagueSlug) => {
  const comp = event.competitions?.[0] || {};
  const home = comp.competitors?.find((c) => c.homeAway === 'home') || {};
  const away = comp.competitors?.find((c) => c.homeAway === 'away') || {};
  const leagueInfo = ESPN_LEAGUES[leagueSlug] || {};
  const statusType = comp.status?.type || {};

  let status = 'SCHEDULED';
  if (statusType.completed) status = 'FINISHED';
  else if (statusType.state === 'in') status = 'LIVE';

  const dateObj = new Date(event.date);

  return {
    id: event.id,
    source: 'espn',
    sourceLeague: leagueSlug,
    date: dateObj.toISOString().split('T')[0],
    time: dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
    fullDate: event.date,
    status,
    statusDetail: statusType.detail || '',
    league: {
      id: leagueSlug,
      name: leagueInfo.name || event.season?.slug || '',
      country: leagueInfo.country || '',
      flag: leagueInfo.flag || '',
      logo: leagueInfo.logo || '',
    },
    venue: comp.venue?.fullName || null,
    city: comp.venue?.address?.city || null,
    homeTeam: transformESPNCompetitor(home),
    awayTeam: transformESPNCompetitor(away),
    score: {
      home: status !== 'SCHEDULED' ? parseInt(home.score || '0', 10) : null,
      away: status !== 'SCHEDULED' ? parseInt(away.score || '0', 10) : null,
    },
    importance: null, // dataEnricher tarafından doldurulacak
  };
};

/**
 * ESPN competitor → Standart takım objesi
 */
const transformESPNCompetitor = (competitor) => {
  const team = competitor.team || {};
  const formStr = competitor.form || '';
  const records = competitor.records || [];
  const totalRecord = records.find((r) => r.type === 'total');

  return {
    id: team.id || competitor.id || '',
    name: team.displayName || team.name || '',
    shortName: team.abbreviation || '',
    logo: team.logo || '',
    form: formStr ? formStr.split('') : [],
    record: totalRecord?.summary || '',
    position: null, // standings'ten doldurulacak
    goalsScored: null,
    goalsConceded: null,
  };
};

/**
 * ESPN standings entry → Standart puan durumu objesi
 */
const transformESPNStanding = (entry) => {
  const team = entry.team || {};
  const statsMap = {};
  for (const s of entry.stats || []) {
    statsMap[s.name] = s.value;
  }

  return {
    position: parseInt(statsMap.rank || '0', 10),
    teamId: team.id || '',
    teamName: team.displayName || '',
    shortName: team.abbreviation || '',
    logo: team.logos?.[0]?.href || '',
    points: parseInt(statsMap.points || '0', 10),
    played: parseInt(statsMap.gamesPlayed || '0', 10),
    wins: parseInt(statsMap.wins || '0', 10),
    draws: parseInt(statsMap.ties || '0', 10),
    losses: parseInt(statsMap.losses || '0', 10),
    goalsFor: parseInt(statsMap.pointsFor || '0', 10),
    goalsAgainst: parseInt(statsMap.pointsAgainst || '0', 10),
    goalDiff: parseInt(statsMap.pointDifferential || '0', 10),
  };
};

/**
 * ESPN H2H verisi → Standart H2H objesi
 */
const transformESPNH2H = (h2hGames, homeTeamId, awayTeamId) => {
  if (!h2hGames || h2hGames.length === 0) {
    return { homeWins: 0, awayWins: 0, draws: 0, lastMatches: [] };
  }

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  const lastMatches = [];

  for (const teamH2h of h2hGames) {
    for (const evt of teamH2h.events || []) {
      const scoreParts = (evt.score || '').split('-').map((s) => parseInt(s.trim(), 10));
      if (scoreParts.length === 2) {
        const [s1, s2] = scoreParts;
        // evt.atVs ile ev/deplasman belirlenmesi
        const isAway = evt.atVs?.startsWith('@');
        const teamScore = isAway ? s2 : s1;
        const oppScore = isAway ? s1 : s2;

        if (teamH2h.team?.id === homeTeamId) {
          if (teamScore > oppScore) homeWins++;
          else if (teamScore < oppScore) awayWins++;
          else draws++;
        }

        lastMatches.push({
          date: evt.gameDate,
          score: evt.score,
          atVs: evt.atVs,
        });
      }
    }
  }

  // Duplicates kaldır
  const uniqueMatches = lastMatches.filter(
    (m, i, arr) => arr.findIndex((x) => x.date === m.date && x.score === m.score) === i
  );

  return { homeWins, awayWins, draws, lastMatches: uniqueMatches.slice(0, 10) };
};

module.exports = {
  transformESPNFixture,
  transformESPNCompetitor,
  transformESPNStanding,
  transformESPNH2H,
};
