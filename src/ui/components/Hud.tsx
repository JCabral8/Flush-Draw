import { CADDIES, toParString } from '../../sim/index'
import { t } from '../i18n'
import { matchStatus, useGame } from '../store'

const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' } as const

function MatchChip(): JSX.Element {
  const sim = useGame((s) => s.sim)
  const ghost = useGame((s) => s.ghost)!
  const { up, thru } = matchStatus(sim.scores, ghost)
  const label = up === 0 ? t('match.allSquare') : up > 0 ? t('match.up', { n: up }) : t('match.down', { n: -up })
  return (
    <span className="match-chip">
      {label}
      {thru > 0 && <span className="hud-stroke"> {t('match.thru', { n: thru })}</span>}
    </span>
  )
}

export function Hud(): JSX.Element | null {
  const sim = useGame((s) => s.sim)
  const mode = useGame((s) => s.mode)
  const ghost = useGame((s) => s.ghost)
  const hole = sim.hole
  if (!hole) return null
  const spec = sim.holes[hole.index]!
  const doneStrokes = sim.scores.reduce((a, b) => a + b, 0)
  const donePar = sim.holes.slice(0, sim.scores.length).reduce((a, h) => a + h.par, 0)
  const toPar = doneStrokes - donePar
  const windPct = Math.round(sim.config.windStrength * 100)
  const nextCut = sim.config.cuts.find((c) => c.afterHole > sim.scores.length)

  return (
    <header className="hud">
      <div className="hud-hole">
        <span className="hud-n">{t('hud.hole', { n: hole.index + 1 })}</span>
        <span className="hud-name">{spec.name}</span>
        <span className="hud-par">
          {t('hud.par', { par: spec.par })} · {hole.effLength} yd · {t(`hud.pin.${hole.pin}`)}
          {nextCut && (
            <> · {t('hud.cut', { line: toParString(nextCut.maxToPar), n: nextCut.afterHole })}</>
          )}
        </span>
        {sim.caddies.length > 0 && (
          <span className="hud-caddies">
            {sim.caddies.map((id) => CADDIES[id].name).join(' · ')}
          </span>
        )}
      </div>
      <div className="hud-right">
        <div className="hud-wind" aria-label={`${t(`suit.${hole.wind.boost}`)} ${t('wind.boost', { pct: windPct })}, ${t(`suit.${hole.wind.drag}`)} ${t('wind.drag', { pct: windPct })}`}>
          <span className={`suit-${hole.wind.boost}`}>
            {SUIT_GLYPH[hole.wind.boost]}
            {t('wind.boost', { pct: windPct })}
          </span>
          <span className={`suit-${hole.wind.drag}`}>
            {SUIT_GLYPH[hole.wind.drag]}
            {t('wind.drag', { pct: windPct })}
          </span>
        </div>
        <div className="hud-score num">
          {mode === 'match' && ghost ? (
            <MatchChip />
          ) : (
            toParString(toPar)
          )}
          <span className="hud-stroke">
            {mode === 'daily' ? `${t('daily.badge')} · ` : ''}
            {t('hud.stroke', { n: hole.strokes + 1 })}
          </span>
        </div>
      </div>
    </header>
  )
}
