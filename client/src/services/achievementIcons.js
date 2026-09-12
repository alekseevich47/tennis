// @ts-check
import icon1_1 from '../assets/ach/1_1.png';
import icon1_2 from '../assets/ach/1_2.png';
import icon1_3 from '../assets/ach/1_3.png';
import icon1_4 from '../assets/ach/1_4.png';
import icon1_5 from '../assets/ach/1_5.png';
import icon2_1 from '../assets/ach/2_1.png';
import icon2_2 from '../assets/ach/2_2.png';
import icon2_3 from '../assets/ach/2_3.png';
import icon2_4 from '../assets/ach/2_4.png';
import icon2_5 from '../assets/ach/2_5.png';
import icon3_1 from '../assets/ach/3_1.png';
import icon3_2 from '../assets/ach/3_2.png';
import icon3_3 from '../assets/ach/3_3.png';
import icon3_4 from '../assets/ach/3_4.png';
import icon3_5 from '../assets/ach/3_5.png';
import icon4_1 from '../assets/ach/4_1.png';
import icon4_2 from '../assets/ach/4_2.png';
import icon4_3 from '../assets/ach/4_3.png';
import icon4_4 from '../assets/ach/4_4.png';
import icon4_5 from '../assets/ach/4_5.png';
import icon5_1 from '../assets/ach/5_1.png';
import icon5_2 from '../assets/ach/5_2.png';
import icon5_3 from '../assets/ach/5_3.png';
import icon5_4 from '../assets/ach/5_4.png';
import icon5_5 from '../assets/ach/5_5.png';

/**
 * Локальные значки по achievement.sort_order × level.
 * 1 Постоянство → 3_*; 2 Серия → 4_*; 3 Пьедестал → 2_*; 4 Рейтинг → 5_*; 5 Чемпион → 1_*.
 * @type {Record<number, Record<number, string>>}
 */
const ICON_BY_SORT_AND_LEVEL = {
  1: { 1: icon3_1, 2: icon3_2, 3: icon3_3, 4: icon3_4, 5: icon3_5 },
  2: { 1: icon4_1, 2: icon4_2, 3: icon4_3, 4: icon4_4, 5: icon4_5 },
  3: { 1: icon2_1, 2: icon2_2, 3: icon2_3, 4: icon2_4, 5: icon2_5 },
  4: { 1: icon5_1, 2: icon5_2, 3: icon5_3, 4: icon5_4, 5: icon5_5 },
  5: { 1: icon1_1, 2: icon1_2, 3: icon1_3, 4: icon1_4, 5: icon1_5 }
};

/**
 * @param {number} sortOrder
 * @param {number} level
 * @returns {string}
 */
export function getAchievementLevelIconUrl(sortOrder, level) {
  const byLevel = ICON_BY_SORT_AND_LEVEL[sortOrder];
  if (!byLevel) return '';
  return byLevel[level] || '';
}
