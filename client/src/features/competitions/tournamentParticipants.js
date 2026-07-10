/**
 * @param {{ userId: string, fullName?: string }} participant
 * @param {Map<string, { id: string, full_name?: string }>} playerMap
 */
export function getParticipantPlayer(participant, playerMap) {
  const player = playerMap.get(participant.userId);
  if (player) return player;

  return {
    id: participant.userId,
    full_name: participant.fullName || ''
  };
}

/**
 * @param {{ userId: string, fullName?: string }} participant
 * @param {Map<string, { full_name?: string }>} playerMap
 */
export function getParticipantDisplayName(participant, playerMap) {
  const player = playerMap.get(participant.userId);
  return player?.full_name || participant.fullName || 'Игрок';
}
