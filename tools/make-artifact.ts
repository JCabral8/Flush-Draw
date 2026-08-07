/**
 * Convert the single-file Vite build (dist/index.html) into a body fragment
 * suitable for publishing as a claude.ai Artifact (which supplies its own
 * document skeleton). Keeps inline <style> and <script type="module"> blocks
 * plus the #root mount point.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const html = readFileSync(join(dist, 'index.html'), 'utf8')

const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0])
const scripts = [...html.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map(
  (m) => m[0],
)
const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/.exec(html)
const bodyInner = (bodyMatch?.[1] ?? '<div id="root"></div>')
  .replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g, '')
  .trim()

const fragment = [...styles, bodyInner, ...scripts].join('\n')
writeFileSync(join(dist, 'artifact.html'), fragment)
console.log(`dist/artifact.html: ${(fragment.length / 1024 / 1024).toFixed(2)} MB`)
