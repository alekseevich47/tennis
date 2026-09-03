import { writeFileSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

/** Разделение vendor-зависимостей для долгого кэша hashed assets. */
function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('recharts') || /[/\\]d3-/.test(id)) return 'vendor-charts'
  if (id.includes('gsap')) return 'vendor-motion'
  if (id.includes('react-dom') || /[/\\]react[/\\]/.test(id) || id.includes('scheduler')) {
    return 'vendor-react'
  }
  if (id.includes('react-router')) return 'vendor-router'
  if (id.includes('pocketbase')) return 'vendor-pb'
  if (id.includes('date-fns') || id.includes('@daypicker')) return 'vendor-date'
  return 'vendor-misc'
}

export default defineConfig({
  base: '/tt-api/',
  plugins: [react(), versionJsonPlugin(APP_BUILD)],
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
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks
      }
    }
  }
})
