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

var MAX_VIDEO_WIDTH = 1920;
var INPUT_WAIT_MS = 500;
var INPUT_WAIT_ATTEMPTS = 10;
var PROCESSED_SUFFIX = '.transcoded';

/**
 * @returns {string}
 */
function ffprobeBin() {
  var ffmpeg = ffmpegBin();
  if (ffmpeg.indexOf('ffmpeg') >= 0) return ffmpeg.replace(/ffmpeg$/, 'ffprobe');
  return 'ffprobe';
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function ffmpegErrorOutput(err) {
  var out = '';
  try {
    if (err && typeof err.output === 'function') out = String(err.output());
    else if (err && err.output) out = String(err.output);
  } catch (_) {}
  if (!out) return '';
  return out.length > 800 ? out.slice(out.length - 800) : out;
}

/**
 * @param {string} outputPath
 * @param {*} cmd
 * @returns {boolean}
 */
function execFfmpeg(cmd, outputPath) {
  try {
    cmd.combinedOutput();
    $os.readFile(outputPath);
    return true;
  } catch (err) {
    var msg = err && err.message ? err.message : String(err);
    var tail = ffmpegErrorOutput(err);
    if (tail) console.log('[video-transcode] ffmpeg output: ' + tail);
    console.log('[video-transcode] ffmpeg failed: ' + msg);
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
function isAlreadyProcessed(inputPath) {
  try {
    $os.readFile(inputPath + PROCESSED_SUFFIX);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * @param {string} inputPath
 */
function markProcessed(inputPath) {
  try {
    $os.writeFile(inputPath + PROCESSED_SUFFIX, []);
  } catch (err) {
    console.log('[video-transcode] mark processed: ' + err);
  }
}

/**
 * @param {string} line
 * @returns {boolean}
 */
function isProbeCodecToken(line) {
  return /^[a-z][a-z0-9_]*$/i.test(line);
}

/**
 * ffprobe default=nw=1 — порядок полей не гарантирован; JSON.parse в JSVM ломается.
 *
 * @param {string} raw
 * @returns {{ width: number, height: number, videoCodec: string } | null}
 */
function parseProbeDefaultOutput(raw) {
  var lines = String(raw || '')
    .trim()
    .split(/\r?\n/)
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);
  if (lines.length < 3) return null;

  var numbers = [];
  var codec = '';
  for (var i = 0; i < lines.length; i++) {
    var token = lines[i];
    if (/^\d+$/.test(token)) numbers.push(parseInt(token, 10));
    else if (!codec && isProbeCodecToken(token)) codec = token.toLowerCase();
  }
  if (numbers.length < 2 || !codec) return null;
  return { width: numbers[0], height: numbers[1], videoCodec: codec };
}

/**
 * @param {string} inputPath
 * @returns {{ width: number, height: number, videoCodec: string } | null}
 */
function probeVideo(inputPath) {
  var cmd = $os.cmd(
    ffprobeBin(),
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,codec_name',
    '-of',
    'default=nw=1:nk=1',
    inputPath
  );
  return parseProbeDefaultOutput(cmd.combinedOutput());
}

/**
 * @param {string} inputPath
 * @returns {{ width: number, height: number, videoCodec: string } | null}
 */
function waitAndProbeVideo(inputPath) {
  var lastErr = '';
  for (var i = 0; i < INPUT_WAIT_ATTEMPTS; i++) {
    try {
      var meta = probeVideo(inputPath);
      if (meta) return meta;
    } catch (err) {
      lastErr = err && err.message ? err.message : String(err);
    }
    if (i + 1 < INPUT_WAIT_ATTEMPTS) sleep(INPUT_WAIT_MS);
  }
  if (lastErr) console.log('[video-transcode] probe failed: ' + lastErr);
  else console.log('[video-transcode] probe failed: no metadata for ' + inputPath);
  return null;
}

/**
 * @param {string} codec
 * @returns {boolean}
 */
function isH264Family(codec) {
  return codec === 'h264' || codec === 'hevc' || codec === 'h265';
}

/**
 * @param {{ width: number, videoCodec: string }} meta
 * @returns {'remux' | 'scale' | 'transcode'}
 */
function chooseTranscodeMode(meta) {
  if (meta.width > MAX_VIDEO_WIDTH) return 'scale';
  if (isH264Family(meta.videoCodec)) return 'remux';
  return 'transcode';
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {boolean}
 */
function ffmpegRemux(inputPath, outputPath) {
  var cmd = $os.cmd(
    ffmpegBin(),
    '-y',
    '-i',
    inputPath,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    outputPath
  );
  return execFfmpeg(cmd, outputPath);
}

/**
 * Уже H.264/HEVC ≤1920px — только faststart, без re-encode (не раздуваем файл).
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {boolean}
 */
function ffmpegTranscodeNoScale(inputPath, outputPath) {
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
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath
  );
  return execFfmpeg(cmd, outputPath);
}

/**
 * Ширина >1920 — уменьшить без апскейла (bounding box 1920×1920).
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {boolean}
 */
function ffmpegTranscodeScaleDown(inputPath, outputPath) {
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
    'scale=1920:1920:force_original_aspect_ratio=decrease:force_divisible_by=2',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath
  );
  return execFfmpeg(cmd, outputPath);
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {'remux' | 'scale' | 'transcode'} mode
 * @returns {boolean}
 */
function runFfmpegByMode(inputPath, outputPath, mode) {
  if (mode === 'remux') return ffmpegRemux(inputPath, outputPath);
  if (mode === 'scale') return ffmpegTranscodeScaleDown(inputPath, outputPath);
  return ffmpegTranscodeNoScale(inputPath, outputPath);
}

/**
 * @param {string} inputPath
 * @returns {boolean}
 */
function transcodeFileInPlace(inputPath) {
  if (!inputPath) return false;
  if (isAlreadyProcessed(inputPath)) return true;

  var meta = waitAndProbeVideo(inputPath);
  if (!meta) {
    console.log('[video-transcode] input not ready: ' + inputPath);
    return false;
  }

  var mode = chooseTranscodeMode(meta);
  console.log(
    '[video-transcode] mode=' +
      mode +
      ' ' +
      meta.width +
      'x' +
      meta.height +
      ' ' +
      meta.videoCodec
  );

  var tempOut = $filepath.join(
    $os.tempDir(),
    'pb_video_' + $security.randomString(10) + PROCESSED_MARKER
  );

  if (!runFfmpegByMode(inputPath, tempOut, mode)) {
    return false;
  }

  try {
    try {
      $os.remove(inputPath);
    } catch (_) {}
    var bytes = $os.readFile(tempOut);
    $os.writeFile(inputPath, bytes);
    markProcessed(inputPath);
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
    return $filepath.join($app.dataDir(), 'storage', record.baseFilesPath(), filename);
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

var TRANSCODE_LOOKBACK_MINUTES = 1440;

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
  if (records.length > 0) {
    console.log('[video-transcode] cron ' + target.collection + ': scanned ' + records.length);
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
