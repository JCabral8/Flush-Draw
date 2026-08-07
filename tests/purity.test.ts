import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * GDD §16 non-negotiables, enforced mechanically:
 * the sim is pure and headless — no ambient randomness, no wall clock,
 * no rendering or platform imports. These tests are the lint.
 */
const SIM_DIR = join(__dirname, '..', 'src', 'sim')

function simFiles(): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = []
  for (const entry of readdirSync(SIM_DIR, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      const path = join(entry.parentPath, entry.name)
      out.push({ path, text: readFileSync(path, 'utf8') })
    }
  }
  return out
}

describe('sim purity', () => {
  const files = simFiles()

  it('found the sim sources', () => {
    expect(files.length).toBeGreaterThanOrEqual(8)
  })

  it('no Math.random anywhere in sim/', () => {
    for (const f of files) {
      expect(f.text.includes('Math.random'), f.path).toBe(false)
    }
  })

  it('no Date.now / new Date in sim/', () => {
    for (const f of files) {
      expect(/Date\.now|new Date\(/.test(f.text), f.path).toBe(false)
    }
  })

  it('no rendering, platform, or I/O imports in sim/', () => {
    const banned = /from\s+['"](react|pixi\.js|@pixi|zustand|tone|node:|fs|path)['"]/
    for (const f of files) {
      expect(banned.test(f.text), f.path).toBe(false)
    }
  })

  it('sim imports are strictly relative (self-contained module)', () => {
    const importRe = /from\s+['"]([^'"]+)['"]/g
    for (const f of files) {
      for (const match of f.text.matchAll(importRe)) {
        expect(match[1]!.startsWith('.'), `${f.path} imports ${match[1]}`).toBe(true)
      }
    }
  })
})
