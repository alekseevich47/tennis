// Ручное создание users модератором ($app.save — обходит manageRule/hidden password).

function randomManualEmail() {
  return (
    'manual_' +
    Date.now() +
    '_' +
    $security.randomString(8).toLowerCase() +
    '@local.tennis'
  );
}

/**
 * @param {*} app
 * @param {{
 *   full_name?: string,
 *   birth_date?: string,
 *   dominant_hand?: string,
 *   rating_points?: number|string,
 *   avatarFile?: *
 * }} input
 * @returns {*} созданный Record
 */
function createManualUser(app, input) {
  var fullName = (input.full_name || '').trim();
  if (!fullName) {
    throw new BadRequestError('Укажите Фамилию Имя');
  }

  var collection = app.findCollectionByNameOrId('users');
  var user = new Record(collection);

  user.set('email', randomManualEmail());
  user.setPassword($security.randomString(32));
  user.set('full_name', fullName);
  user.set('role', 'user');
  user.set('rating_points', Number(input.rating_points) || 0);
  user.set('is_visible', true);
  user.set('can_comment', true);
  user.set('onboarding_completed', true);
  user.set('name_set_in_onboarding', true);
  user.set('available_sessions', 0);
  user.set('used_sessions', 0);
  user.set('attendance_count', 0);
  user.set('is_banned', false);
  user.set('membership_type', 'regular');
  user.set('membership_frozen', false);
  user.set('bot_blocked', false);

  var hand = (input.dominant_hand || '').trim();
  if (hand) user.set('dominant_hand', hand);

  var birth = (input.birth_date || '').trim();
  if (birth) user.set('birth_date', birth);

  if (input.avatarFile) {
    user.set('avatar', input.avatarFile);
  }

  app.save(user);
  return user;
}

module.exports = {
  createManualUser: createManualUser
};
