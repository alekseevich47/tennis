// Агрегации статистики админ-панели. Файл без .pb.js — require() внутри хендлеров.
// Дни и границы периода — GMT+7.

var GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymd(y, m, d) {
  return y + '-' + pad2(m) + '-' + pad2(d);
}

function parseYmd(value) {
  if (!value || !DATE_RE.test(String(value))) return null;
  var parts = String(value).split('-');
  return { y: Number(parts[0]), m: Number(parts[1]), d: Number(parts[2]) };
}

function addDaysYmd(value, days) {
  var p = parseYmd(value);
  if (!p) return null;
  var dt = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Начало календарного дня YYYY-MM-DD в GMT+7 → Date (UTC). */
function gmt7DayStart(value) {
  var p = parseYmd(value);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.m - 1, p.d, 0, 0, 0) - GMT7_OFFSET_MS);
}

function toGmt7Ymd(isoOrPb) {
  if (!isoOrPb) return '';
  var d = new Date(String(isoOrPb).replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  var local = new Date(d.getTime() + GMT7_OFFSET_MS);
  return ymd(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate());
}

function parsePbDate(str) {
  if (!str) return null;
  var d = new Date(String(str).replace(' ', 'T'));
  if (isNaN(d.getTime())) return null;
  return d;
}

function hasTimeRangeEnded(dateStr, durationMin) {
  var start = parsePbDate(dateStr);
  if (!start) return false;
  var end = new Date(start.getTime() + (durationMin || 0) * 60 * 1000);
  return end.getTime() <= Date.now();
}

/**
 * @returns {{ start: string, end: string, startUtc: Date, endExclusiveUtc: Date } | { error: string }}
 */
function parsePeriod(start, end) {
  if (!parseYmd(start) || !parseYmd(end)) {
    return { error: 'start and end required (YYYY-MM-DD)' };
  }
  if (String(start) > String(end)) {
    return { error: 'start must be <= end' };
  }
  var startUtc = gmt7DayStart(start);
  var endExclusiveYmd = addDaysYmd(end, 1);
  var endExclusiveUtc = gmt7DayStart(endExclusiveYmd);
  if (!startUtc || !endExclusiveUtc) {
    return { error: 'invalid date range' };
  }
  return {
    start: String(start),
    end: String(end),
    startUtc: startUtc,
    endExclusiveUtc: endExclusiveUtc
  };
}

function pbTimestamp(date) {
  return date.toISOString().replace('T', ' ');
}

function eachDayInclusive(startYmd, endYmd, fn) {
  var cur = startYmd;
  while (cur && cur <= endYmd) {
    fn(cur);
    cur = addDaysYmd(cur, 1);
  }
}

function relationIds(entries) {
  var ids = [];
  if (!entries) return ids;
  var i;
  for (i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!entry) continue;
    if (typeof entry === 'string') {
      ids.push(entry);
    } else if (entry.id) {
      ids.push(String(entry.id));
    } else {
      ids.push(String(entry));
    }
  }
  return ids;
}

function emptyBookingCounters() {
  return {
    booked: 0,
    cancelledTotal: 0,
    cancelledSelf: 0,
    cancelledModerator: 0,
    cancelledSystem: 0,
    attended: 0,
    missed: 0
  };
}

function ensureBookingUser(map, userId, fullName) {
  if (!map[userId]) {
    map[userId] = {
      userId: userId,
      fullName: fullName || '',
      group: emptyBookingCounters(),
      tournament: emptyBookingCounters(),
      total: emptyBookingCounters()
    };
  } else if (fullName && !map[userId].fullName) {
    map[userId].fullName = fullName;
  }
  return map[userId];
}

function bumpCounter(row, trainingType, field, delta) {
  var d = delta == null ? 1 : delta;
  var bucket = trainingType === 'tournament' ? 'tournament' : 'group';
  row[bucket][field] += d;
  row.total[field] += d;
}

function resolveTrainingType(cache, trainingId) {
  if (!trainingId) return 'group';
  if (cache[trainingId]) return cache[trainingId];
  try {
    var training = $app.findRecordById('trainings', trainingId);
    var t = training.getString('type') === 'tournament' ? 'tournament' : 'group';
    cache[trainingId] = t;
    return t;
  } catch (_) {
    cache[trainingId] = 'group';
    return 'group';
  }
}

function userFullName(userId) {
  try {
    var u = $app.findRecordById('users', userId);
    return u.getString('full_name') || '';
  } catch (_) {
    return '';
  }
}

function readDetails(record) {
  try {
    var raw = record.get('details');
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) || {};
      } catch (_) {
        return {};
      }
    }
    return raw;
  } catch (_) {
    return {};
  }
}

function calcLevelFromValue(levels, value) {
  var sorted = levels.slice().sort(function (a, b) {
    return (b.level || 0) - (a.level || 0);
  });
  var i;
  for (i = 0; i < sorted.length; i++) {
    var levelRecord = sorted[i];
    var required = levelRecord.required_value || 0;
    if (value >= required) {
      return {
        achieved: true,
        level: levelRecord.level || 0,
        title: levelRecord.title || '',
        required_value: required
      };
    }
  }
  return { achieved: false, level: 0, title: '', required_value: 0 };
}

function userValueForAchievement(sortOrder, user) {
  switch (sortOrder) {
    case 1:
      return Number(user.getFloat('rating_points')) || 0;
    case 2:
      return Number(user.getFloat('wins')) || 0;
    case 3:
      return Number(user.getFloat('attendance_count')) || 0;
    default:
      return 0;
  }
}

// --- metrics ---

function getGrowth(period) {
  var filter =
    'created >= "' +
    pbTimestamp(period.startUtc) +
    '" && created < "' +
    pbTimestamp(period.endExclusiveUtc) +
    '"';
  var users = $app.findRecordsByFilter('users', filter, 'created', 0, 0);
  var byDay = {};
  eachDayInclusive(period.start, period.end, function (day) {
    byDay[day] = 0;
  });

  var i;
  for (i = 0; i < users.length; i++) {
    var day = toGmt7Ymd(users[i].get('created'));
    if (day && byDay[day] != null) {
      byDay[day] += 1;
    }
  }

  var points = [];
  var cumulative = 0;
  var total = 0;
  eachDayInclusive(period.start, period.end, function (day) {
    var count = byDay[day] || 0;
    cumulative += count;
    total += count;
    points.push({ date: day, count: count, cumulative: cumulative });
  });

  return { points: points, total: total };
}

function getReach(period) {
  var filter =
    'created >= "' +
    pbTimestamp(period.startUtc) +
    '" && created < "' +
    pbTimestamp(period.endExclusiveUtc) +
    '"';
  var views = $app.findRecordsByFilter('content_views', filter, '-created', 0, 0);
  var allUsers = $app.findRecordsByFilter('users', '', '', 0, 0);
  var totalUsers = allUsers.length;

  var activeSet = {};
  var viewsTotal = 0;
  var byType = {
    post: { viewsTotal: 0, activeSet: {} },
    tournament_post: { viewsTotal: 0, activeSet: {} }
  };
  var objectCounts = {};

  var i;
  for (i = 0; i < views.length; i++) {
    var view = views[i];
    var userId = view.getString('user') || '';
    var objectType = view.getString('object_type') || '';
    var objectId = view.getString('object_id') || '';
    viewsTotal += 1;
    if (userId) activeSet[userId] = true;

    if (objectType === 'post' || objectType === 'tournament_post') {
      byType[objectType].viewsTotal += 1;
      if (userId) byType[objectType].activeSet[userId] = true;
    }

    if (objectType && objectId) {
      var key = objectType + ':' + objectId;
      if (!objectCounts[key]) {
        objectCounts[key] = { object_type: objectType, object_id: objectId, views: 0 };
      }
      objectCounts[key].views += 1;
    }
  }

  var activeCount = Object.keys(activeSet).length;
  var topPosts = [];
  var keys = Object.keys(objectCounts);
  for (i = 0; i < keys.length; i++) {
    topPosts.push(objectCounts[keys[i]]);
  }
  topPosts.sort(function (a, b) {
    return b.views - a.views;
  });
  if (topPosts.length > 20) topPosts = topPosts.slice(0, 20);

  for (i = 0; i < topPosts.length; i++) {
    var item = topPosts[i];
    var collectionName =
      item.object_type === 'tournament_post' ? 'tournament_posts' : 'posts';
    try {
      var postRec = $app.findRecordById(collectionName, item.object_id);
      item.post_number = Number(postRec.getFloat('post_number')) || null;
    } catch (err) {
      item.post_number = null;
    }
  }

  return {
    viewsTotal: viewsTotal,
    activeCount: activeCount,
    passiveCount: Math.max(0, totalUsers - activeCount),
    totalUsers: totalUsers,
    byType: {
      post: {
        viewsTotal: byType.post.viewsTotal,
        activeCount: Object.keys(byType.post.activeSet).length
      },
      tournament_post: {
        viewsTotal: byType.tournament_post.viewsTotal,
        activeCount: Object.keys(byType.tournament_post.activeSet).length
      }
    },
    topPosts: topPosts
  };
}

function getBooking(period) {
  var filter =
    'category = "booking" && created >= "' +
    pbTimestamp(period.startUtc) +
    '" && created < "' +
    pbTimestamp(period.endExclusiveUtc) +
    '" && (' +
    'action = "booking.booking.create_self" || ' +
    'action = "booking.booking.create_moderator" || ' +
    'action = "booking.booking.cancel_self" || ' +
    'action = "booking.booking.cancel_moderator" || ' +
    'action = "booking.booking.cancel_system"' +
    ')';
  var events = $app.findRecordsByFilter('audit_events', filter, 'created', 0, 0);
  var typeCache = {};
  var byUser = {};

  var i;
  for (i = 0; i < events.length; i++) {
    var ev = events[i];
    var action = ev.getString('action') || '';
    var details = readDetails(ev);
    var trainingId = details.trainingId || ev.getString('object_id') || '';
    var trainingType = resolveTrainingType(typeCache, trainingId);
    var userId = '';

    if (
      action === 'booking.booking.create_self' ||
      action === 'booking.booking.cancel_self'
    ) {
      userId = ev.getString('subject_id') || '';
    } else {
      userId = ev.getString('target_id') || '';
    }
    if (!userId) continue;

    var row = ensureBookingUser(byUser, userId, userFullName(userId));

    if (action === 'booking.booking.create_self' || action === 'booking.booking.create_moderator') {
      bumpCounter(row, trainingType, 'booked', 1);
    } else if (action === 'booking.booking.cancel_self') {
      bumpCounter(row, trainingType, 'cancelledSelf', 1);
      bumpCounter(row, trainingType, 'cancelledTotal', 1);
    } else if (action === 'booking.booking.cancel_moderator') {
      bumpCounter(row, trainingType, 'cancelledModerator', 1);
      bumpCounter(row, trainingType, 'cancelledTotal', 1);
    } else if (action === 'booking.booking.cancel_system') {
      bumpCounter(row, trainingType, 'cancelledSystem', 1);
      bumpCounter(row, trainingType, 'cancelledTotal', 1);
    }
  }

  // B) явка по завершённым тренировкам периода
  var trainings = $app.findRecordsByFilter(
    'trainings',
    'is_cancelled != true && is_deleted != true',
    'date',
    0,
    0
  );
  for (i = 0; i < trainings.length; i++) {
    var training = trainings[i];
    var dateStr = training.getString('date') || '';
    var day = toGmt7Ymd(dateStr);
    if (!day || day < period.start || day > period.end) continue;
    if (!hasTimeRangeEnded(dateStr, training.getFloat('duration') || 0)) continue;

    var tType = training.getString('type') === 'tournament' ? 'tournament' : 'group';
    var booked = relationIds(training.get('booked_users'));
    var attended = relationIds(training.get('attended_users'));
    var attendedSet = {};
    var a;
    for (a = 0; a < attended.length; a++) {
      attendedSet[attended[a]] = true;
    }

    var b;
    for (b = 0; b < booked.length; b++) {
      var uid = booked[b];
      if (!uid) continue;
      var urow = ensureBookingUser(byUser, uid, userFullName(uid));
      if (attendedSet[uid]) {
        bumpCounter(urow, tType, 'attended', 1);
      } else {
        bumpCounter(urow, tType, 'missed', 1);
      }
    }
  }

  var users = [];
  var ids = Object.keys(byUser);
  for (i = 0; i < ids.length; i++) {
    users.push(byUser[ids[i]]);
  }
  users.sort(function (a, b) {
    return (a.fullName || '').localeCompare(b.fullName || '', 'ru');
  });

  return { users: users };
}

function getTrainingsCount(period) {
  var filter =
    'is_cancelled != true && is_deleted != true && date >= "' +
    pbTimestamp(period.startUtc) +
    '" && date < "' +
    pbTimestamp(period.endExclusiveUtc) +
    '"';
  var trainings = $app.findRecordsByFilter('trainings', filter, 'date', 0, 0);

  var byDay = {};
  eachDayInclusive(period.start, period.end, function (day) {
    byDay[day] = { date: day, group: 0, tournament: 0, total: 0 };
  });

  var total = 0;
  var group = 0;
  var tournament = 0;
  var i;
  for (i = 0; i < trainings.length; i++) {
    var training = trainings[i];
    var dateStr = training.getString('date') || '';
    var day = toGmt7Ymd(dateStr);
    if (!day || day < period.start || day > period.end) continue;
    if (!hasTimeRangeEnded(dateStr, training.getFloat('duration') || 0)) continue;

    var isTournament = training.getString('type') === 'tournament';
    total += 1;
    if (isTournament) {
      tournament += 1;
      byDay[day].tournament += 1;
    } else {
      group += 1;
      byDay[day].group += 1;
    }
    byDay[day].total += 1;
  }

  var days = [];
  eachDayInclusive(period.start, period.end, function (day) {
    days.push(byDay[day]);
  });

  return { total: total, group: group, tournament: tournament, byDay: days };
}

function getAchievementsNow() {
  var achievements = $app.findRecordsByFilter('achievements', '', 'sort_order', 0, 0);
  var users = $app.findRecordsByFilter('users', '', '', 0, 0);
  var result = [];

  var ai;
  for (ai = 0; ai < achievements.length; ai++) {
    var achievement = achievements[ai];
    var achievementId = achievement.id;
    var sortOrder = Number(achievement.getFloat('sort_order')) || 0;
    var levelRecords = $app.findRecordsByFilter(
      'achievement_levels',
      'achievement = "' + achievementId + '"',
      'level',
      0,
      0
    );
    var levels = [];
    var li;
    for (li = 0; li < levelRecords.length; li++) {
      var lr = levelRecords[li];
      levels.push({
        level: Number(lr.getFloat('level')) || 0,
        title: lr.getString('title') || '',
        required_value: Number(lr.getFloat('required_value')) || 0
      });
    }

    var userLevels = [];
    var ui;
    for (ui = 0; ui < users.length; ui++) {
      var user = users[ui];
      var value = userValueForAchievement(sortOrder, user);
      var progress = calcLevelFromValue(levels, value);
      userLevels.push({
        id: user.id,
        fullName: user.getString('full_name') || '',
        level: progress.level || 0
      });
    }

    var levelOut = [];
    for (li = 0; li < levels.length; li++) {
      var levelDef = levels[li];
      var matched = [];
      for (ui = 0; ui < userLevels.length; ui++) {
        if (userLevels[ui].level >= levelDef.level) {
          matched.push({
            id: userLevels[ui].id,
            fullName: userLevels[ui].fullName
          });
        }
      }
      matched.sort(function (a, b) {
        return (a.fullName || '').localeCompare(b.fullName || '', 'ru');
      });
      levelOut.push({
        level: levelDef.level,
        title: levelDef.title,
        requiredValue: levelDef.required_value,
        count: matched.length,
        users: matched
      });
    }

    result.push({
      id: achievementId,
      name: achievement.getString('name') || '',
      sortOrder: sortOrder,
      levels: levelOut
    });
  }

  return { achievements: result };
}

function getAchievementGrants(period) {
  var filter =
    'action = "profile.achievement.grant" && created >= "' +
    pbTimestamp(period.startUtc) +
    '" && created < "' +
    pbTimestamp(period.endExclusiveUtc) +
    '"';
  var events = $app.findRecordsByFilter('audit_events', filter, '-created', 0, 0);

  // achievementId -> { name, levels: { N: { title, usersMap } } }
  var byAchievement = {};

  var i;
  for (i = 0; i < events.length; i++) {
    var ev = events[i];
    var details = readDetails(ev);
    var achievementId = details.achievementId || '';
    if (!achievementId) continue;
    var levelNum = Number(details.level) || 0;
    var userId = ev.getString('target_id') || ev.getString('object_id') || '';
    if (!userId) continue;

    if (!byAchievement[achievementId]) {
      byAchievement[achievementId] = {
        id: achievementId,
        name: details.achievementName || '',
        levels: {}
      };
    }
    var ach = byAchievement[achievementId];
    if (!ach.name && details.achievementName) ach.name = details.achievementName;

    if (!ach.levels[levelNum]) {
      ach.levels[levelNum] = {
        level: levelNum,
        title: details.levelTitle || '',
        usersMap: {}
      };
    }
    var levelBucket = ach.levels[levelNum];
    if (!levelBucket.title && details.levelTitle) levelBucket.title = details.levelTitle;
    if (!levelBucket.usersMap[userId]) {
      levelBucket.usersMap[userId] = {
        id: userId,
        fullName: userFullName(userId) || ev.getString('target_label') || '',
        grantedAt: String(ev.get('created') || '')
      };
    }
  }

  // «N и выше»: для порога N объединяем гранты уровня >= N
  var achievements = [];
  var ids = Object.keys(byAchievement);
  for (i = 0; i < ids.length; i++) {
    var item = byAchievement[ids[i]];
    var levelNums = Object.keys(item.levels)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    var levelOut = [];
    var li;
    for (li = 0; li < levelNums.length; li++) {
      var threshold = levelNums[li];
      var usersMap = {};
      var lj;
      for (lj = 0; lj < levelNums.length; lj++) {
        if (levelNums[lj] < threshold) continue;
        var bucket = item.levels[levelNums[lj]];
        var uids = Object.keys(bucket.usersMap);
        var ui;
        for (ui = 0; ui < uids.length; ui++) {
          var uid = uids[ui];
          if (!usersMap[uid] || bucket.usersMap[uid].grantedAt > usersMap[uid].grantedAt) {
            usersMap[uid] = bucket.usersMap[uid];
          }
        }
      }
      var users = [];
      var ukeys = Object.keys(usersMap);
      for (lj = 0; lj < ukeys.length; lj++) {
        users.push(usersMap[ukeys[lj]]);
      }
      users.sort(function (a, b) {
        return (a.fullName || '').localeCompare(b.fullName || '', 'ru');
      });
      levelOut.push({
        level: threshold,
        title: item.levels[threshold].title || '',
        count: users.length,
        users: users
      });
    }

    achievements.push({
      id: item.id,
      name: item.name,
      levels: levelOut
    });
  }

  achievements.sort(function (a, b) {
    return (a.name || '').localeCompare(b.name || '', 'ru');
  });

  return { achievements: achievements };
}

/**
 * @returns {{ auth: any, info: any } | { errorStatus: number, error: string }}
 */
function requireModerator(c) {
  var info = c.requestInfo();
  var auth = info.auth;
  if (!auth) {
    return { errorStatus: 401, error: 'Unauthorized' };
  }
  if (auth.getString('role') !== 'moderator') {
    return { errorStatus: 403, error: 'Forbidden' };
  }
  return { auth: auth, info: info };
}

/**
 * @returns {{ start: string, end: string, startUtc: Date, endExclusiveUtc: Date } | { error: string }}
 */
function periodFromRequest(c) {
  var info = c.requestInfo();
  var query = info.query || {};
  return parsePeriod(query.start, query.end);
}

function createContentView(userId, payload) {
  payload = payload || {};
  var objectType = String(payload.object_type || payload.objectType || '');
  var objectId = String(payload.object_id || payload.objectId || '');
  var source = String(payload.source || '');

  if (objectType !== 'post' && objectType !== 'tournament_post') {
    return { error: 'object_type must be post or tournament_post', status: 400 };
  }
  if (!objectId) {
    return { error: 'object_id required', status: 400 };
  }
  if (source && source !== 'viewport' && source !== 'modal') {
    return { error: 'source must be viewport or modal', status: 400 };
  }

  var collection = $app.findCollectionByNameOrId('content_views');
  var record = new Record(collection);
  record.set('user', userId);
  record.set('object_type', objectType);
  record.set('object_id', objectId);
  if (source) record.set('source', source);
  $app.save(record);

  return {
    ok: true,
    id: record.id
  };
}

module.exports = {
  parsePeriod: parsePeriod,
  requireModerator: requireModerator,
  periodFromRequest: periodFromRequest,
  getGrowth: getGrowth,
  getReach: getReach,
  getBooking: getBooking,
  getTrainingsCount: getTrainingsCount,
  getAchievementsNow: getAchievementsNow,
  getAchievementGrants: getAchievementGrants,
  createContentView: createContentView
};
