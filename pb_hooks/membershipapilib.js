// Общие хелперы membership API. Файл без .pb.js — require() ВНУТРИ хендлера.
// В PB JSVM top-level функции/var из .pb.js хендлерам недоступны (ReferenceError → opaque 400).

function errMessage(err) {
  try {
    if (err && err.message) return String(err.message);
  } catch (_) {}
  try {
    return String(err);
  } catch (_) {
    return 'Unknown error';
  }
}

function errStatus(err) {
  try {
    var s = err && err.status;
    if (s >= 400 && s < 600) return s;
  } catch (_) {}
  return 400;
}

function apiError(c, status, message) {
  console.log('[membership-api] ' + status + ' ' + message);
  return c.json(status, { status: status, message: message, data: {} });
}

module.exports = {
  errMessage: errMessage,
  errStatus: errStatus,
  apiError: apiError
};
