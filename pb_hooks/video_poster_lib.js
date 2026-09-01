// Генерация poster (первый кадр) для загруженных видео — ffmpeg, кэш на диске.

var VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|avi)$/i;
var POSTER_SUFFIX = '.poster.jpg';

var MEDIA_TARGETS = [
  { collection: 'posts', fields: ['media'] },
  { collection: 'comments', fields: ['media'] },
  { collection: 'tournament_posts', fields: ['media'] },
  { collection: 'tournament_comments', fields: ['media'] },
  { collection: 'products', fields: ['images'] },
  { collection: 'gallery', fields: ['video'] }
];

/**
 * @param {string} name
 */
function isVideoFilename(name) {
  return typeof name === 'string' && VIDEO_EXT_RE.test(name);
}

/**
 * @param {string} videoFilename
 * @returns {string}
 */
function posterFilenameFor(videoFilename) {
  return String(videoFilename) + POSTER_SUFFIX;
}

/**
 * @returns {string}
 */
function ffmpegBin() {
  return ($os.getenv('FFMPEG_PATH') || 'ffmpeg').trim() || 'ffmpeg';
}

var FILE_MODE = parseInt('644', 8);

/**
 * @param {string} path
 * @param {string | number[]} data
 */
function writeFileMode(path, data) {
  $os.writeFile(path, data, FILE_MODE);
  try {
    $os.chmod(path, FILE_MODE);
  } catch (_) {}
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
 * @param {*} record
 * @param {string} filename
 * @returns {string | null}
 */
function recordVideoPath(record, filename) {
  if (!record || !filename) return null;
  try {
    return $filepath.join($app.dataDir(), 'storage', record.baseFilesPath(), filename);
  } catch (err) {
    console.log('[video-poster] baseFilesPath: ' + err);
    return null;
  }
}

/**
 * @param {*} record
 * @param {string} videoFilename
 * @returns {string | null}
 */
function recordPosterPath(record, videoFilename) {
  var videoPath = recordVideoPath(record, videoFilename);
  if (!videoPath) return null;
  return videoPath + POSTER_SUFFIX;
}

/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {string} [thumbSize]
 * @returns {boolean}
 */
function ffmpegExtractPoster(inputPath, outputPath, thumbSize) {
  try {
    var cmd = $os.cmd(
      ffmpegBin(),
      '-y',
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      thumbSize
        ? 'scale=' + thumbSize + ':force_original_aspect_ratio=decrease'
        : 'scale=800:800:force_original_aspect_ratio=decrease',
      '-q:v',
      '3',
      outputPath
    );
    cmd.combinedOutput();
    $os.readFile(outputPath);
    return true;
  } catch (err) {
    console.log('[video-poster] ffmpeg: ' + (err && err.message ? err.message : err));
    try {
      $os.remove(outputPath);
    } catch (_) {}
    return false;
  }
}

/**
 * @param {*} record
 * @param {string} videoFilename
 * @returns {boolean}
 */
function ensurePosterForVideo(record, videoFilename) {
  if (!isVideoFilename(videoFilename)) return false;

  var posterPath = recordPosterPath(record, videoFilename);
  var videoPath = recordVideoPath(record, videoFilename);
  if (!posterPath || !videoPath) return false;

  try {
    $os.readFile(posterPath);
    return true;
  } catch (_) {}

  try {
    $os.readFile(videoPath);
  } catch (_) {
    return false;
  }

  return ffmpegExtractPoster(videoPath, posterPath);
}

/**
 * @param {*} record
 * @param {string} fieldName
 * @param {string[]} [onlyFilenames]
 */
function processRecordField(record, fieldName, onlyFilenames) {
  if (!record || !fieldName) return;

  var allNames = normalizeFileList(record.get(fieldName));
  if (!allNames.length) return;

  var targets = onlyFilenames && onlyFilenames.length ? onlyFilenames : allNames;

  for (var i = 0; i < targets.length; i++) {
    var filename = targets[i];
    if (!isVideoFilename(filename)) continue;
    if (allNames.indexOf(filename) < 0) continue;

    console.log('[video-poster] ' + record.collection().name + '/' + record.id + ' → ' + filename);
    ensurePosterForVideo(record, filename);
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
    if (added.length) processRecordField(record, field, added);
  }
}

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

function parseThumbSize(thumbParam) {
  if (!thumbParam || typeof thumbParam !== 'string') return null;
  if (/^\d+x\d+$/.test(thumbParam)) return thumbParam;
  if (/^\d+x0$/.test(thumbParam)) return thumbParam;
  if (/^0x\d+$/.test(thumbParam)) return thumbParam;
  return null;
}

/**
 * @param {*} record
 * @param {string} videoFilename
 * @param {string | null} thumbSize
 * @returns {{ path: string, contentType: string } | { error: string, status: number }}
 */
function resolvePosterFile(record, videoFilename, thumbSize) {
  if (!record || !videoFilename || !isVideoFilename(videoFilename)) {
    return { error: 'invalid_file', status: 400 };
  }

  var target = getMediaTarget(record.collection().name);
  if (!target) return { error: 'invalid_collection', status: 404 };

  var names = [];
  for (var f = 0; f < target.fields.length; f++) {
    names = names.concat(normalizeFileList(record.get(target.fields[f])));
  }
  if (names.indexOf(videoFilename) < 0) {
    return { error: 'not_found', status: 404 };
  }

  if (!ensurePosterForVideo(record, videoFilename)) {
    return { error: 'poster_unavailable', status: 503 };
  }

  var posterPath = recordPosterPath(record, videoFilename);
  if (!posterPath) return { error: 'not_found', status: 404 };

  if (!thumbSize) {
    return { path: posterPath, contentType: 'image/jpeg' };
  }

  var scaledPath = posterPath + '.' + thumbSize.replace(/[^0-9x]/g, '') + '.jpg';
  try {
    $os.readFile(scaledPath);
    return { path: scaledPath, contentType: 'image/jpeg' };
  } catch (_) {}

  var videoPath = recordVideoPath(record, videoFilename);
  if (!videoPath) return { error: 'not_found', status: 404 };

  if (!ffmpegExtractPoster(videoPath, scaledPath, thumbSize)) {
    return { path: posterPath, contentType: 'image/jpeg' };
  }

  return { path: scaledPath, contentType: 'image/jpeg' };
}

module.exports = {
  MEDIA_TARGETS: MEDIA_TARGETS,
  isVideoFilename: isVideoFilename,
  posterFilenameFor: posterFilenameFor,
  parseThumbSize: parseThumbSize,
  processRecordVideos: processRecordVideos,
  processRecordVideosOnUpdate: processRecordVideosOnUpdate,
  getMediaTarget: getMediaTarget,
  resolvePosterFile: resolvePosterFile
};
