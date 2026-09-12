// Общие хелперы достижений для PB JSVM (require внутри хендлеров).

/**
 * @param {*} raw
 * @returns {Array<{ userId?: string, place?: number, fullName?: string, points?: number }>}
 */
function parseParticipants(raw) {
  var participants = [];
  try {
    if (typeof raw === 'string') {
      participants = JSON.parse(raw || '[]');
    } else if (Array.isArray(raw)) {
      participants = raw;
    } else if (raw) {
      participants = raw;
    }
  } catch (_) {
    participants = [];
  }
  return Array.isArray(participants) ? participants : [];
}

/**
 * @param {*} app
 * @returns {Array<*>}
 */
function listPublishedTournamentPosts(app) {
  return app.findRecordsByFilter(
    'tournament_posts',
    '(is_deleted = false || is_deleted = null) && is_scheduled != true',
    '',
    0,
    0
  );
}

/**
 * @param {Array<*>} posts
 * @param {string} userId
 * @param {{ excludePostId?: string, overridePostId?: string, overrideParticipants?: Array<*> } | null} [opts]
 * @returns {{ podiumCount: number, firstPlaceCount: number }}
 */
function countUserTournamentPlacesFromPosts(posts, userId, opts) {
  opts = opts || null;
  var podiumCount = 0;
  var firstPlaceCount = 0;
  var i;
  for (i = 0; i < posts.length; i++) {
    var post = posts[i];
    var postId = post.id;
    if (opts && opts.excludePostId && postId === opts.excludePostId) continue;

    var participants;
    if (opts && opts.overridePostId && postId === opts.overridePostId) {
      participants = opts.overrideParticipants || [];
    } else {
      participants = parseParticipants(post.get('participants'));
    }

    var j;
    var mine = null;
    for (j = 0; j < participants.length; j++) {
      if (participants[j] && participants[j].userId === userId) {
        mine = participants[j];
        break;
      }
    }
    if (!mine) continue;
    var place = Number(mine.place);
    if (!isFinite(place) || place < 1) continue;
    if (place === 1) firstPlaceCount += 1;
    if (place <= 3) podiumCount += 1;
  }
  return { podiumCount: podiumCount, firstPlaceCount: firstPlaceCount };
}

/**
 * @param {*} app
 * @returns {Object<string, { podiumCount: number, firstPlaceCount: number }>}
 */
function buildTournamentPlaceStatsMap(app) {
  var posts = listPublishedTournamentPosts(app);
  var byUser = {};
  var i;
  for (i = 0; i < posts.length; i++) {
    var participants = parseParticipants(posts[i].get('participants'));
    var j;
    for (j = 0; j < participants.length; j++) {
      var p = participants[j];
      if (!p || !p.userId) continue;
      var place = Number(p.place);
      if (!isFinite(place) || place < 1) continue;
      if (!byUser[p.userId]) {
        byUser[p.userId] = { podiumCount: 0, firstPlaceCount: 0 };
      }
      if (place === 1) byUser[p.userId].firstPlaceCount += 1;
      if (place <= 3) byUser[p.userId].podiumCount += 1;
    }
  }
  return byUser;
}

/**
 * @param {number} sortOrder
 * @param {*} user
 * @param {{ podiumCount?: number, firstPlaceCount?: number } | null} [tournamentStats]
 * @returns {number}
 */
function userValueForSortOrder(sortOrder, user, tournamentStats) {
  var stats = tournamentStats || { podiumCount: 0, firstPlaceCount: 0 };
  switch (sortOrder) {
    case 1:
      return Number(user.getFloat('attendance_count')) || 0;
    case 2:
      return 0;
    case 3:
      return Number(stats.podiumCount) || 0;
    case 4:
      return Number(user.getFloat('rating_points')) || 0;
    case 5:
      return Number(stats.firstPlaceCount) || 0;
    default:
      return 0;
  }
}

/**
 * Логирует грант уровней при пересечении порогов oldVal → newVal.
 * @param {*} app
 * @param {*} audit
 * @param {{
 *   sortOrder: number,
 *   oldVal: number,
 *   newVal: number,
 *   subject: *,
 *   target: { id: string, label: string },
 *   targetLabel?: string
 * }} opts
 */
function maybeGrantAchievementLevels(app, audit, opts) {
  var oldVal = Number(opts.oldVal) || 0;
  var newVal = Number(opts.newVal) || 0;
  if (newVal <= oldVal) return;

  var achievements = app.findRecordsByFilter(
    'achievements',
    'sort_order = ' + opts.sortOrder,
    '',
    1,
    0
  );
  if (!achievements || !achievements.length) return;

  var achievement = achievements[0];
  var achievementId = achievement.id;
  var achievementName = achievement.getString('name') || '';
  var targetLabel = opts.targetLabel || (opts.target && opts.target.label) || 'Игрок';

  var levels = app.findRecordsByFilter(
    'achievement_levels',
    'achievement = "' + achievementId + '"',
    'required_value',
    0,
    0
  );
  var li;
  for (li = 0; li < levels.length; li++) {
    var levelRec = levels[li];
    var reqVal = Number(levelRec.getFloat('required_value')) || 0;
    var levelNum = Number(levelRec.getFloat('level')) || 0;
    if (oldVal < reqVal && newVal >= reqVal) {
      var levelTitle = levelRec.getString('title') || achievementName;
      audit.logEvent(app, {
        category: 'profile',
        action: 'profile.achievement.grant',
        actionKind: 'other',
        subject: opts.subject,
        target: opts.target,
        objectType: 'user',
        objectId: opts.target.id,
        objectLabel: targetLabel,
        details: {
          achievementId: achievementId,
          achievementName: achievementName,
          level: levelNum,
          levelTitle: levelTitle,
          requiredValue: reqVal,
          userValue: newVal
        },
        summaryRu: targetLabel + ' получил(а) достижение «' + levelTitle + '»',
        severity: 'info'
      });
    }
  }
}

/**
 * Гранты sort_order 3/5 после публикации или смены участников турнирного поста.
 * @param {*} app
 * @param {*} audit
 * @param {{
 *   subject: *,
 *   postId: string,
 *   oldParticipants?: Array<*>,
 *   newParticipants?: Array<*>,
 *   wasPublished: boolean,
 *   isPublished: boolean
 * }} opts
 */
function maybeGrantTournamentAchievements(app, audit, opts) {
  if (!opts.isPublished && !opts.wasPublished) return;

  var posts = listPublishedTournamentPosts(app);
  var oldParts = opts.oldParticipants || [];
  var newParts = opts.newParticipants || [];

  var userIds = {};
  var i;
  for (i = 0; i < oldParts.length; i++) {
    if (oldParts[i] && oldParts[i].userId) userIds[oldParts[i].userId] = true;
  }
  for (i = 0; i < newParts.length; i++) {
    if (newParts[i] && newParts[i].userId) userIds[newParts[i].userId] = true;
  }

  var ids = Object.keys(userIds);
  for (i = 0; i < ids.length; i++) {
    var userId = ids[i];
    var oldStats;
    if (!opts.wasPublished) {
      oldStats = countUserTournamentPlacesFromPosts(posts, userId, {
        excludePostId: opts.postId
      });
    } else {
      oldStats = countUserTournamentPlacesFromPosts(posts, userId, {
        overridePostId: opts.postId,
        overrideParticipants: oldParts
      });
    }

    var newStats;
    if (!opts.isPublished) {
      newStats = countUserTournamentPlacesFromPosts(posts, userId, {
        excludePostId: opts.postId
      });
    } else {
      newStats = countUserTournamentPlacesFromPosts(posts, userId, {
        overridePostId: opts.postId,
        overrideParticipants: newParts
      });
    }

    var targetLabel = 'Игрок';
    var j;
    for (j = 0; j < newParts.length; j++) {
      if (newParts[j] && newParts[j].userId === userId && newParts[j].fullName) {
        targetLabel = newParts[j].fullName;
        break;
      }
    }
    if (targetLabel === 'Игрок') {
      for (j = 0; j < oldParts.length; j++) {
        if (oldParts[j] && oldParts[j].userId === userId && oldParts[j].fullName) {
          targetLabel = oldParts[j].fullName;
          break;
        }
      }
    }
    try {
      var user = app.findRecordById('users', userId);
      targetLabel = user.getString('full_name') || targetLabel;
    } catch (_) {}

    var target = { id: userId, label: targetLabel };

    maybeGrantAchievementLevels(app, audit, {
      sortOrder: 3,
      oldVal: oldStats.podiumCount,
      newVal: newStats.podiumCount,
      subject: opts.subject,
      target: target,
      targetLabel: targetLabel
    });
    maybeGrantAchievementLevels(app, audit, {
      sortOrder: 5,
      oldVal: oldStats.firstPlaceCount,
      newVal: newStats.firstPlaceCount,
      subject: opts.subject,
      target: target,
      targetLabel: targetLabel
    });
  }
}

module.exports = {
  parseParticipants: parseParticipants,
  listPublishedTournamentPosts: listPublishedTournamentPosts,
  countUserTournamentPlacesFromPosts: countUserTournamentPlacesFromPosts,
  buildTournamentPlaceStatsMap: buildTournamentPlaceStatsMap,
  userValueForSortOrder: userValueForSortOrder,
  maybeGrantAchievementLevels: maybeGrantAchievementLevels,
  maybeGrantTournamentAchievements: maybeGrantTournamentAchievements
};
