import strings from './locales/en.json'

type StringKey = keyof typeof strings

/**
 * Tiny keyed-string lookup (GDD §18): no user-facing string literals in
 * components; en.json is the source, scaffolded for more locales in M5+.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let out: string = strings[key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v))
    }
  }
  return out
}

export type { StringKey }
