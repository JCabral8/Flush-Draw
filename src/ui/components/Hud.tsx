import { toParString } from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' } as const

export function Hud(): JSX.Element | null {
  const sim = useGame((s) => s.sim)
  const hole = sim.hole
  if (!hole) return null
  const spec = sim.holes[hole.index]!
  const doneStrokes = sim.scores.reduce((a, b) => a + b, 0)
  const donePar = sim.holes.slice(0, sim.scores.length).reduce((a, h) => a + h.par, 0)
  const toPar = doneStrokes - donePar
  const windPct = Math.round(sim.config.windStrength * 100)

  return (
    <header className="hud">
      <div className="hud-hole">
        <span className="hud-n">{t('hud.hole', { n: hole.index + 1 })}</span>
        <span className="hud-name">{spec.name}</span>
        <span className="hud-par">
          {t('hud.par', { par: spec.par })} · {hole.effLength} yd · {t(`hud.pin.${hole.pin}`)}
        </span>
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
          {toParString(toPar)}
          <span className="hud-stroke">{t('hud.stroke', { n: hole.strokes + 1 })}</span>
        </div>
      </div>
    </header>
  )
}
