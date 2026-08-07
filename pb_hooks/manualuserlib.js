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

/** Multipart/JSON body в goja часто не string — trim только после приведения. */
function asString(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.length > 0) return asString(value[0]);
  try {
    return String(value);
  } catch (_) {
    return '';
  }
}

/**
 * @param {*} app
 * @param {{
 *   full_name?: *,
 *   birth_date?: *,
 *   dominant_hand?: *,
 *   rating_points?: *,
 *   avatarFile?: *
 * }} input
 * @returns {*} созданный Record
 */
function createManualUser(app, input) {
  var fullName = asString(input && input.full_name).trim();
  if (!fullName) {
    throw new BadRequestError('Укажите Фамилию Имя');
  }

  var collection = app.findCollectionByNameOrId('users');
  var user = new Record(collection);

  user.set('email', randomManualEmail());
  user.setPassword($security.randomString(32));
  user.set('full_name', fullName);
  user.set('role', 'user');
  user.set('rating_points', Number(asString(input && input.rating_points)) || 0);
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

  var hand = asString(input && input.dominant_hand).trim();
  if (hand) user.set('dominant_hand', hand);

  var birth = asString(input && input.birth_date).trim();
  if (birth) user.set('birth_date', birth);

  if (input && input.avatarFile) {
    user.set('avatar', input.avatarFile);
  }

  app.save(user);
  return user;
}

module.exports = {
  createManualUser: createManualUser,
  asString: asString
};
