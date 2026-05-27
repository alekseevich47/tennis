// @ts-check
// Тонкий aggregator-модуль для обратной совместимости (импорты вида
// `import pb, { isModerator } from './services/pocketbase'`).
// Новый код должен импортировать напрямую из `./pb`, `./auth`, `./posts` и т.д.

import pb from './pb';

export { pb };
export default pb;

export {
  initMaxAuth,
  getCurrentUser,
  isModerator,
  updateUserProfile
} from './auth';

export {
  listPosts,
  listCommentsForPost,
  createPost,
  updatePost,
  hardDeletePost,
  createComment,
  updateComment,
  hardDeleteComment,
  purgeAbandonedComments
} from './posts';

export {
  listTrainings,
  createTraining,
  updateTraining,
  deleteTraining,
  softDeleteTraining,
  restoreTraining,
  closeTraining,
  reopenTraining,
  bookTraining,
  bookUserToTraining,
  removeUsersFromTraining,
  cancelTrainingBooking,
  markAttendance,
  unmarkAttendance
} from './trainings';

export { listUsers } from './users';

export {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listPlayers,
  createPlayer,
  updatePlayer,
  listChampionships,
  createChampionship,
  listMatches,
  createMatch,
  updateMatchResult,
  listGallery,
  addGalleryImage,
  deleteGalleryImage
} from './catalog';

export { getUserAvatarData } from '../lib/avatar';
