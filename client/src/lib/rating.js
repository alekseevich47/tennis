// @ts-check

/** @param {any} player */
export function getRatingPoints(player) {
  return player?.rating_points || 0;
}

/** @param {any} player */
export function isRatingVisible(player) {
  return (
    player?.is_visible !== false &&
    player?.is_banned !== true &&
    player?.bot_blocked !== true
  );
}

/**
 * Ранги видимых игроков с учётом ничьих (одинаковые очки → одно место).
 * @param {any[] | null | undefined} players
 * @returns {Map<string, number>}
 */
export function buildPlayerRanks(players) {
  const visiblePlayers = (players || []).filter(isRatingVisible);
  if (!visiblePlayers.length) return new Map();

  const ranks = new Map();
  let previousPoints = null;
  let previousRank = 0;

  [...visiblePlayers]
    .sort((a, b) => getRatingPoints(b) - getRatingPoints(a))
    .forEach((player, index) => {
      const points = getRatingPoints(player);
      const rank = points === previousPoints ? previousRank : index + 1;

      ranks.set(player.id, rank);
      previousPoints = points;
      previousRank = rank;
    });

  return ranks;
}

/**
 * @param {any[] | null | undefined} players
 * @param {string | undefined} userId
 * @returns {number | null}
 */
export function getPlayerRatingRank(players, userId) {
  if (!players || !userId) return null;

  const player = players.find((item) => item.id === userId);
  if (!player || !isRatingVisible(player)) return null;

  return buildPlayerRanks(players).get(userId) ?? null;
}
