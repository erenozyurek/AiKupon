/**
 * Data Enricher — Maç verilerini puan durumu ve diğer verilerle zenginleştirir
 * - calculateImportance: ZİRVE MAÇI, DERBİ, KÜME DÜŞME, KRİTİK MAÇ
 * - enrichWithStandings: Takım pozisyon, gol, form bilgisi ekler
 */

const TURKISH_DERBIES = [
  ['Galatasaray', 'Fenerbahçe'],
  ['Galatasaray', 'Beşiktaş'],
  ['Fenerbahçe', 'Beşiktaş'],
  ['Trabzonspor', 'Fenerbahçe'],
  ['Trabzonspor', 'Galatasaray'],
];

const WORLD_DERBIES = [
  ['Barcelona', 'Real Madrid'],
  ['Liverpool', 'Manchester United'],
  ['AC Milan', 'Inter'],
  ['Arsenal', 'Tottenham'],
  ['Dortmund', 'Bayern'],
  ['PSG', 'Marseille'],
  ['Roma', 'Lazio'],
  ['Atletico Madrid', 'Real Madrid'],
  ['Manchester City', 'Manchester United'],
  ['Chelsea', 'Arsenal'],
  ['Juventus', 'Inter'],
  ['Juventus', 'AC Milan'],
  ['Real Sociedad', 'Athletic'],
  ['Sevilla', 'Real Betis'],
  ['Schalke', 'Dortmund'],
  ['Lyon', 'Saint-Etienne'],
];

const ALL_DERBIES = [...TURKISH_DERBIES, ...WORLD_DERBIES];

/**
 * İki takım arasında derbi var mı kontrol et
 */
function isDerby(homeName, awayName) {
  return ALL_DERBIES.some(
    ([a, b]) =>
      (homeName.includes(a) && awayName.includes(b)) ||
      (homeName.includes(b) && awayName.includes(a))
  );
}

/**
 * Maçın önem seviyesini hesapla
 * @param {object} match - Standart maç objesi
 * @param {Array} standings - Puan durumu dizisi (transformESPNStanding formatında)
 * @returns {string|null} - Önem etiketi
 */
function calculateImportance(match, standings) {
  if (!match) return null;

  const homeName = match.homeTeam?.name || '';
  const awayName = match.awayTeam?.name || '';

  // 1. Derbi kontrolü
  if (isDerby(homeName, awayName)) {
    return 'DERBİ';
  }

  if (!standings || standings.length === 0) {
    return null;
  }

  const homePos = match.homeTeam?.position;
  const awayPos = match.awayTeam?.position;
  const totalTeams = standings.length;

  if (homePos && awayPos) {
    // 2. Zirve maçı: Her iki takım da ilk 4'te
    if (homePos <= 4 && awayPos <= 4) {
      return 'ZİRVE MAÇI';
    }

    // 3. Küme düşme: Her iki takım da son 4'te
    if (homePos > totalTeams - 4 && awayPos > totalTeams - 4) {
      return 'KÜME DÜŞME';
    }

    // 4. Kritik maç: Biri zirve biri dip, veya art arda sıralama
    if (Math.abs(homePos - awayPos) <= 2 && (homePos <= 6 || awayPos <= 6)) {
      return 'KRİTİK MAÇ';
    }
  }

  return null;
}

/**
 * Maç verilerini puan durumu ile zenginleştir
 * @param {object} match - Standart maç objesi
 * @param {Array} standings - Puan durumu dizisi
 * @returns {object} - Zenginleştirilmiş maç objesi
 */
function enrichWithStandings(match, standings) {
  if (!standings || standings.length === 0) return match;

  const enrichTeam = (team) => {
    const entry = standings.find(
      (s) => String(s.teamId) === String(team.id) || s.teamName?.includes(team.name?.split(' ')[0])
    );
    if (!entry) return team;
    return {
      ...team,
      position: entry.position,
      goalsScored: entry.goalsFor,
      goalsConceded: entry.goalsAgainst,
      record: `${entry.wins}-${entry.draws}-${entry.losses}`,
    };
  };

  const enriched = {
    ...match,
    homeTeam: enrichTeam(match.homeTeam),
    awayTeam: enrichTeam(match.awayTeam),
  };

  enriched.importance = calculateImportance(enriched, standings);

  return enriched;
}

/**
 * Form dizisini okunabilir metin formatına çevir
 * @param {Array} form - ['W','D','L','W','W']
 * @returns {string} - "3G 1B 1M" formatı
 */
function formatFormSummary(form) {
  if (!form || form.length === 0) return '';
  const w = form.filter((f) => f === 'W').length;
  const d = form.filter((f) => f === 'D').length;
  const l = form.filter((f) => f === 'L').length;
  return `${w}G ${d}B ${l}M`;
}

module.exports = {
  calculateImportance,
  enrichWithStandings,
  formatFormSummary,
  isDerby,
};
