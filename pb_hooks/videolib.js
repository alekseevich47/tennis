// Серверное перекодирование загруженных видео через ffmpeg (после create/update).

var VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|avi)$/i;
var PROCESSED_MARKER = '.opt.mp4';

/**
 * @param {string} name
 */
function isVideoFilename(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.indexOf(PROCESSED_MARKER) >= 0) return false;
  return VIDEO_EXT_RE.test(name);
}

/**
 * @param {*} raw
 * @returns {string[]}
 */
function normalizeFileList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw) return [raw];
  return [];
}

/**
 * @param {string[]} before
 * @param {string[]} after
 * @returns {string[]}
 */
function diffNewFiles(before, after) {
  var seen = {};
  for (var i = 0; i < before.length; i++) seen[before[i]] = true;
  var out = [];
  for (var j = 0; j < after.length; j++) {
    if (!seen[after[j]]) out.push(after[j]);
  }
  return out;
}

/**
 * @returns {string}
 */
function ffmpegBin() {
  return ($os.getenv('FFMPEG_PATH') || 'ffmpeg').trim() || 'ffmpeg';
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {boolean}
 */
function runFfmpegTranscode(inputPath, outputPath) {
  try {
    var cmd = $os.cmd(
      ffmpegBin(),
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-vf',
      "scale='min(1920,iw)':-2",
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      outputPath
    );
    cmd.combinedOutput();
    $os.readFile(outputPath);
    return true;
  } catch (err) {
    console.log('[video-transcode] ffmpeg failed: ' + (err && err.message ? err.message : err));
    try {
      $os.remove(outputPath);
    } catch (_) {}
    return false;
  }
}

/**
 * @param {string} inputPath
 * @returns {boolean}
 */
function transcodeFileInPlace(inputPath) {
  if (!inputPath) return false;

  var tempOut = $filepath.join(
    $os.tempDir(),
    'pb_video_' + $security.randomString(10) + PROCESSED_MARKER
  );

  if (!runFfmpegTranscode(inputPath, tempOut)) {
    return false;
  }

  try {
    try {
      $os.remove(inputPath);
    } catch (_) {}
    var bytes = $os.readFile(tempOut);
    $os.writeFile(inputPath, bytes);
    return true;
  } catch (err) {
    console.log('[video-transcode] replace failed: ' + (err && err.message ? err.message : err));
    return false;
  } finally {
    try {
      $os.remove(tempOut);
    } catch (_) {}
  }
}

/**
 * @param {*} record
 * @param {string} filename
 * @returns {string | null}
 */
function recordFilePath(record, filename) {
  if (!record || !filename) return null;
  try {
    return $filepath.join(record.baseFilesPath(), filename);
  } catch (err) {
    console.log('[video-transcode] baseFilesPath: ' + err);
    return null;
  }
}

/**
 * @param {*} record
 * @param {string} fieldName
 * @param {string[]} [onlyFilenames]
 */
function processRecordField(record, fieldName, onlyFilenames) {
  if (!record || !fieldName) return;

  var allNames = normalizeFileList(record.get(fieldName));
  if (allNames.length === 0) return;

  /** @type {string[]} */
  var targets = onlyFilenames && onlyFilenames.length ? onlyFilenames : allNames;

  for (var i = 0; i < targets.length; i++) {
    var filename = targets[i];
    if (!isVideoFilename(filename)) continue;
    if (allNames.indexOf(filename) < 0) continue;

    var inputPath = recordFilePath(record, filename);
    if (!inputPath) continue;

    console.log('[video-transcode] ' + record.collection().name + '/' + record.id + ' → ' + filename);
    transcodeFileInPlace(inputPath);
  }
}

/**
 * @param {*} record
 * @param {string[]} fieldNames
 * @param {string[]} [onlyFilenames]
 */
function processRecordVideos(record, fieldNames, onlyFilenames) {
  if (!record || !fieldNames || !fieldNames.length) return;
  for (var i = 0; i < fieldNames.length; i++) {
    processRecordField(record, fieldNames[i], onlyFilenames);
  }
}

/**
 * @param {*} record
 * @param {*} original
 * @param {string[]} fieldNames
 */
function processRecordVideosOnUpdate(record, original, fieldNames) {
  if (!record || !fieldNames) return;
  for (var i = 0; i < fieldNames.length; i++) {
    var field = fieldNames[i];
    var before = normalizeFileList(original ? original.get(field) : []);
    var after = normalizeFileList(record.get(field));
    var added = diffNewFiles(before, after);
    if (added.length) {
      processRecordField(record, field, added);
    }
  }
}

var MEDIA_TARGETS = [
  { collection: 'posts', fields: ['media'] },
  { collection: 'comments', fields: ['media'] },
  { collection: 'tournament_posts', fields: ['media'] },
  { collection: 'tournament_comments', fields: ['media'] },
  { collection: 'products', fields: ['images'] },
  { collection: 'gallery', fields: ['video'] }
];

var TRANSCODE_LOOKBACK_MINUTES = 20;

/**
 * @param {string} collectionName
 * @returns {{ collection: string, fields: string[] } | null}
 */
function getMediaTarget(collectionName) {
  for (var i = 0; i < MEDIA_TARGETS.length; i++) {
    if (MEDIA_TARGETS[i].collection === collectionName) return MEDIA_TARGETS[i];
  }
  return null;
}

function recentCutoffIso() {
  return new Date(Date.now() - TRANSCODE_LOOKBACK_MINUTES * 60 * 1000).toISOString();
}

/**
 * @param {{ collection: string, fields: string[] }} target
 */
function scanCollectionForVideos(target) {
  var cutoff = recentCutoffIso();
  var filter =
    '(created >= "' +
    cutoff +
    '") || (updated >= "' +
    cutoff +
    '")';
  var records;
  try {
    records = $app.findRecordsByFilter(target.collection, filter, '-updated', 40, 0);
  } catch (err) {
    console.log('[video-transcode] cron list ' + target.collection + ': ' + err);
    return;
  }

  for (var i = 0; i < records.length; i++) {
    try {
      processRecordVideos(records[i], target.fields);
    } catch (err) {
      console.log('[video-transcode] cron ' + target.collection + '/' + records[i].id + ': ' + err);
    }
  }
}

function runTranscodeCronScan() {
  for (var t = 0; t < MEDIA_TARGETS.length; t++) {
    scanCollectionForVideos(MEDIA_TARGETS[t]);
  }
}

/**
 * @param {*} record
 * @returns {string}
 */
function recordAuthorId(record) {
  try {
    var id = record.getString('author');
    if (id) return String(id);
  } catch (_) {}
  return '';
}

/**
 * @param {*} auth
 * @param {*} record
 * @returns {boolean}
 */
function canAuthTranscode(auth, record) {
  if (!auth || !auth.id) return false;
  try {
    if (auth.getString && auth.getString('role') === 'moderator') return true;
  } catch (_) {}
  var authorId = recordAuthorId(record);
  if (authorId && authorId === String(auth.id)) return true;
  if (!authorId && record.collection().name === 'products') return true;
  return false;
}

/**
 * @param {string} collectionName
 * @param {string} recordId
 * @returns {{ ok?: boolean, error?: string }}
 */
function transcodeRecordNow(collectionName, recordId) {
  var target = getMediaTarget(collectionName);
  if (!target) return { error: 'invalid_collection' };

  var record;
  try {
    record = $app.findRecordById(collectionName, recordId);
  } catch (_) {
    return { error: 'not_found' };
  }

  processRecordVideos(record, target.fields);
  return { ok: true };
}

module.exports = {
  isVideoFilename: isVideoFilename,
  normalizeFileList: normalizeFileList,
  processRecordVideos: processRecordVideos,
  processRecordVideosOnUpdate: processRecordVideosOnUpdate,
  getMediaTarget: getMediaTarget,
  canAuthTranscode: canAuthTranscode,
  transcodeRecordNow: transcodeRecordNow,
  runTranscodeCronScan: runTranscodeCronScan
};
