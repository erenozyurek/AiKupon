/**
 * Football-Data.org verilerini standart formata dönüştürür
 */

/**
 * football-data.org match → Standart maç objesi
 */
const transformFDMatch = (match, leagueCode) => {
  const dateObj = new Date(match.utcDate);

  let status = 'SCHEDULED';
  if (match.status === 'FINISHED') status = 'FINISHED';
  else if (match.status === 'IN_PLAY' || match.status === 'PAUSED') status = 'LIVE';

  const comp = match.competition || {};

  return {
    id: `fd-${match.id}`,
    source: 'football-data',
    sourceLeague: leagueCode,
    date: dateObj.toISOString().split('T')[0],
    time: dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
    fullDate: match.utcDate,
    status,
    statusDetail: match.status || '',
    league: {
      id: leagueCode,
      name: comp.name || '',
      country: match.area?.name || '',
      flag: match.area?.flag || '',
      logo: comp.emblem || '',
    },
    venue: null,
    city: null,
    homeTeam: {
      id: `fd-${match.homeTeam?.id || ''}`,
      name: match.homeTeam?.name || '',
      shortName: match.homeTeam?.tla || '',
      logo: match.homeTeam?.crest || '',
      form: [],
      record: '',
      position: null,
      goalsScored: null,
      goalsConceded: null,
    },
    awayTeam: {
      id: `fd-${match.awayTeam?.id || ''}`,
      name: match.awayTeam?.name || '',
      shortName: match.awayTeam?.tla || '',
      logo: match.awayTeam?.crest || '',
      form: [],
      record: '',
      position: null,
      goalsScored: null,
      goalsConceded: null,
    },
    score: {
      home: match.score?.fullTime?.home ?? null,
      away: match.score?.fullTime?.away ?? null,
    },
    importance: null,
  };
};

/**
 * football-data.org standing → Standart puan durumu
 */
const transformFDStanding = (entry) => ({
  position: entry.position,
  teamId: `fd-${entry.team?.id || ''}`,
  teamName: entry.team?.name || '',
  shortName: entry.team?.tla || '',
  logo: entry.team?.crest || '',
  points: entry.points || 0,
  played: entry.playedGames || 0,
  wins: entry.won || 0,
  draws: entry.draw || 0,
  losses: entry.lost || 0,
  goalsFor: entry.goalsFor || 0,
  goalsAgainst: entry.goalsAgainst || 0,
  goalDiff: entry.goalDifference || 0,
});

/**
 * football-data.org H2H → Standart H2H
 */
const transformFDH2H = (h2hData, homeTeamId, awayTeamId) => {
  if (!h2hData?.aggregates) {
    return { homeWins: 0, awayWins: 0, draws: 0, lastMatches: [] };
  }

  const agg = h2hData.aggregates;
  const lastMatches = (h2hData.matches || []).slice(0, 10).map((m) => ({
    date: m.utcDate,
    score: `${m.score?.fullTime?.home ?? '?'}-${m.score?.fullTime?.away ?? '?'}`,
    home: m.homeTeam?.name,
    away: m.awayTeam?.name,
  }));

  return {
    homeWins: agg.homeTeam?.wins || 0,
    awayWins: agg.awayTeam?.wins || 0,
    draws: agg.numberOfMatches - (agg.homeTeam?.wins || 0) - (agg.awayTeam?.wins || 0),
    lastMatches,
  };
};

module.exports = {
  transformFDMatch,
  transformFDStanding,
  transformFDH2H,
};
