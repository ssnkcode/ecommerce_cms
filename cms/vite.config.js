import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cpSync, mkdirSync, existsSync } from 'node:fs'

const configDir = dirname(fileURLToPath(import.meta.url))
const root = join(configDir, '..')
const projectModules = join(configDir, 'node_modules')
const assetsDir = join(root, 'assets')

const pages = [
  ['Catálogo', 'catalog/catalog.html'],
  ['Panel CMS', 'cms/'],
]

function printAppUrls(server) {
  if (!server.resolvedUrls) return
  const { info } = server.config.logger
  const groups = [
    ['Local', server.resolvedUrls.local],
    ['Network', server.resolvedUrls.network],
  ]
  for (const [label, bases] of groups) {
    for (const base of bases || []) {
      for (const [name, path] of pages) {
        info(`  ➜  ${name.padEnd(11)} ${base}${path}`)
      }
    }
  }
}

function hookPrintUrls(server) {
  if (typeof server.printUrls !== 'function') return
  const original = server.printUrls.bind(server)
  server.printUrls = () => {
    original()
    printAppUrls(server)
  }
}

const friendlyUrlsPlugin = {
  name: 'print-app-urls',
  configureServer: hookPrintUrls,
  configurePreviewServer: hookPrintUrls,
}

const copyAssetsPlugin = {
  name: 'copy-assets-to-dist',
  closeBundle() {
    const outDir = join(root, 'dist')
    const target = join(outDir, 'assets')
    if (existsSync(assetsDir)) {
      mkdirSync(target, { recursive: true })
      cpSync(assetsDir, target, { recursive: true })
    }
  },
}

export default defineConfig({
  root,
  plugins: [react(), copyAssetsPlugin, friendlyUrlsPlugin],
  resolve: {
    alias: {
      react: join(projectModules, 'react'),
      'react-dom': join(projectModules, 'react-dom'),
      'react/jsx-runtime': join(projectModules, 'react', 'jsx-runtime.js'),
      'react/jsx-dev-runtime': join(projectModules, 'react', 'jsx-dev-runtime.js'),
    },
  },
  server: {
    host: true,
    port: 5178,
    strictPort: true,
    fs: {
      allow: [configDir, join(configDir, '..', 'catalog'), join(root, 'utils'), assetsDir],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: join(root, 'cms', 'index.html'),
        catalog: join(root, 'catalog', 'catalog.html'),
      },
    },
  },
})
