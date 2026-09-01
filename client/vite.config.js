import { writeFileSync, readFileSync, cpSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function mediaAssetsPlugin() {
  const ffmpegCoreDir = join('node_modules', '@ffmpeg', 'core', 'dist', 'esm')
  const ffmpegDestDir = join('public', 'ffmpeg')
  const demuxerWasm = join(
    'node_modules',
    'web-demuxer',
    'dist',
    'wasm-files',
    'web-demuxer-mini.wasm'
  )
  const demuxerDestDir = join('public', 'web-demuxer')

  const copyAssets = () => {
    mkdirSync(ffmpegDestDir, { recursive: true })
    cpSync(join(ffmpegCoreDir, 'ffmpeg-core.js'), join(ffmpegDestDir, 'ffmpeg-core.js'))
    cpSync(join(ffmpegCoreDir, 'ffmpeg-core.wasm'), join(ffmpegDestDir, 'ffmpeg-core.wasm'))

    mkdirSync(demuxerDestDir, { recursive: true })
    cpSync(demuxerWasm, join(demuxerDestDir, 'web-demuxer-mini.wasm'))
  }

  return {
    name: 'media-assets',
    buildStart: copyAssets,
    configureServer() {
      copyAssets()
    }
  }
}

function resolveAppBuild() {
  if (process.env.VITE_APP_VERSION) return process.env.VITE_APP_VERSION.trim()
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}

function resolveDisplayVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    return String(pkg.version || '').trim() || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const APP_BUILD = resolveAppBuild()
const APP_DISPLAY_VERSION = resolveDisplayVersion()
process.env.VITE_APP_VERSION = APP_BUILD
process.env.VITE_APP_DISPLAY_VERSION = APP_DISPLAY_VERSION

function versionJsonPlugin(build) {
  return {
    name: 'version-json',
    writeBundle(options) {
      const dir = options.dir || 'dist'
      writeFileSync(join(dir, 'version.json'), `${JSON.stringify({ version: build })}\n`)
    }
  }
}

export default defineConfig({
  base: '/tt-api/',
  plugins: [react(), mediaAssetsPlugin(), versionJsonPlugin(APP_BUILD)],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_BUILD),
    'import.meta.env.VITE_APP_DISPLAY_VERSION': JSON.stringify(APP_DISPLAY_VERSION)
  },
  server: {
    host: true,
    port: 3000
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
