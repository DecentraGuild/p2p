import { copyFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const distDir = join(rootDir, 'dist')
const indexHtml = join(distDir, 'index.html')
const notFoundHtml = join(distDir, '404.html')

if (existsSync(indexHtml)) {
  copyFileSync(indexHtml, notFoundHtml)
  console.log('✓ Copied index.html to 404.html for GitHub Pages SPA support')
} else {
  console.error('✗ index.html not found in dist directory. Run "npm run build" first.')
  process.exit(1)
}
