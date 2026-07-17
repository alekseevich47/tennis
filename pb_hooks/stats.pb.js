// Статистика админ-панели + запись просмотров контента.
// Агрегации — pb_hooks/statslib.js (require внутри хендлеров).
// Важно: helper-функции вне callback в .pb.js недоступны — только require(statslib).

routerAdd('POST', '/api/content-view', (c) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    var info = c.requestInfo();
    var auth = info.auth;
    if (!auth) {
      return c.json(401, { error: 'Unauthorized' });
    }

    var result = stats.createContentView(auth.id, info.body || {});
    if (result.error) {
      return c.json(result.status || 400, { error: result.error });
    }
    return c.json(200, result);
  } catch (err) {
    console.log('[stats] content-view: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

routerAdd('GET', '/api/stats/growth', (c) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    var gate = stats.requireModerator(c);
    if (gate.error) {
      return c.json(gate.errorStatus, { error: gate.error });
    }
    var period = stats.periodFromRequest(c);
    if (period.error) return c.json(400, { error: period.error });
    return c.json(200, stats.getGrowth(period));
  } catch (err) {
    console.log('[stats] growth: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

routerAdd('GET', '/api/stats/reach', (c) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    var gate = stats.requireModerator(c);
    if (gate.error) {
      return c.json(gate.errorStatus, { error: gate.error });
    }
    var period = stats.periodFromRequest(c);
    if (period.error) return c.json(400, { error: period.error });
    return c.json(200, stats.getReach(period));
  } catch (err) {
    console.log('[stats] reach: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

routerAdd('GET', '/api/stats/booking', (c) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    var gate = stats.requireModerator(c);
    if (gate.error) {
      return c.json(gate.errorStatus, { error: gate.error });
    }
    var period = stats.periodFromRequest(c);
    if (period.error) return c.json(400, { error: period.error });
    return c.json(200, stats.getBooking(period));
  } catch (err) {
    console.log('[stats] booking: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

routerAdd('GET', '/api/stats/trainings-count', (c) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    var gate = stats.requireModerator(c);
    if (gate.error) {
      return c.json(gate.errorStatus, { error: gate.error });
    }
    var period = stats.periodFromRequest(c);
    if (period.error) return c.json(400, { error: period.error });
    return c.json(200, stats.getTrainingsCount(period));
  } catch (err) {
    console.log('[stats] trainings-count: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

routerAdd('GET', '/api/stats/achievements', (c) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    var gate = stats.requireModerator(c);
    if (gate.error) {
      return c.json(gate.errorStatus, { error: gate.error });
    }
    return c.json(200, stats.getAchievementsNow());
  } catch (err) {
    console.log('[stats] achievements: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

routerAdd('GET', '/api/stats/achievements/grants', (c) => {
  try {
    var stats = require(__hooks + '/statslib.js');
    var gate = stats.requireModerator(c);
    if (gate.error) {
      return c.json(gate.errorStatus, { error: gate.error });
    }
    var period = stats.periodFromRequest(c);
    if (period.error) return c.json(400, { error: period.error });
    return c.json(200, stats.getAchievementGrants(period));
  } catch (err) {
    console.log('[stats] achievements/grants: ' + (err && err.stack ? err.stack : err));
    return c.json(500, { error: 'Internal error' });
  }
});

console.log('--- STATS ROUTES LOADED ---');
