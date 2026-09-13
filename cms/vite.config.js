import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cpSync, mkdirSync, existsSync } from 'node:fs'

const configDir = dirname(fileURLToPath(import.meta.url))
const root = join(configDir, '..')
const projectModules = join(configDir, 'node_modules')
const assetsDir = join(root, 'assets')
const outDir = join(configDir, 'dist')
const publicDir = join(configDir, 'public')

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
    // assets/ completo (logo, hero, imagenes de productos, etc.)
    const target = join(outDir, 'assets')
    if (existsSync(assetsDir)) {
      mkdirSync(target, { recursive: true })
      cpSync(assetsDir, target, { recursive: true })
    }
    // Contenido estático del catálogo: data.json (ya existía), favicon.svg y
    // cualquier archivo de catalog/assets/ que el usuario agregue.
    const catalogOut = join(outDir, 'catalog')
    const catalogData = join(root, 'catalog', 'data.json')
    const catalogFavicon = join(root, 'catalog', 'favicon.svg')
    const catalogAssets = join(root, 'catalog', 'assets')
    mkdirSync(catalogOut, { recursive: true })
    if (existsSync(catalogData)) cpSync(catalogData, join(catalogOut, 'data.json'))
    if (existsSync(catalogFavicon)) cpSync(catalogFavicon, join(catalogOut, 'favicon.svg'))
    if (existsSync(catalogAssets)) cpSync(catalogAssets, join(catalogOut, 'assets'), { recursive: true })
    // public/ : TODO lo que el usuario deje en D:\upc\cms\public\ se despliega
    // tal cual en la web (imagenes, pdfs, archivos propios, etc.).
    const publicRoot = join(root, 'public')
    if (existsSync(publicRoot)) {
      mkdirSync(outDir, { recursive: true })
      cpSync(publicRoot, outDir, { recursive: true })
    }
  },
}

export default defineConfig({
  root,
  publicDir,
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
    outDir,
    rollupOptions: {
      input: {
        main: join(root, 'cms', 'index.html'),
        catalog: join(root, 'catalog', 'catalog.html'),
      },
    },
  },
})
