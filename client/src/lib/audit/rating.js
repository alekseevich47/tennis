import { writeAudit } from './core';

const DOMAIN = 'РЕЙТИНГ';

export const auditRating = {
  /**
   * @param {{ id: string, full_name?: string, rating_points?: number, wins?: number }} record
   */
  playerCreate(record) {
    writeAudit(DOMAIN, 'Игрок добавлен вручную', {
      targetUserId: record.id,
      fullName: record.full_name,
      ratingPoints: record.rating_points,
      wins: record.wins
    });
  }
};
