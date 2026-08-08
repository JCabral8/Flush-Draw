import { useEffect, useRef, useState } from 'react'
import { cardLabel } from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

/**
 * The distance readout — the counter tick is the dopamine (GDD §17).
 * Ticks down in sync with the ball flight, snapping only on unit changes.
 */
export function StatusRow(): JSX.Element | null {
  const sim = useGame((s) => s.sim)
  const animMs = useGame((s) => s.animMs)
  const hole = sim.hole
  const putting = sim.phase === 'putt'
  const target = putting ? (hole?.green?.distFt ?? 0) : (hole?.ball?.remaining ?? 0)
  const unit = putting ? 'ft' : 'yds'

  const [shown, setShown] = useState(target)
  const prevRef = useRef({ target, unit })
  const rafRef = useRef(0)

  useEffect(() => {
    const prev = prevRef.current
    prevRef.current = { target, unit }
    cancelAnimationFrame(rafRef.current)
    if (prev.unit !== unit || prev.target === target) {
      setShown(target)
      return
    }
    const from = prev.target
    const t0 = performance.now()
    const dur = Math.max(300, animMs - 120)
    const step = (): void => {
      const p = Math.min(1, (performance.now() - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(from + (target - from) * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, unit, animMs])

  if (!hole) return null
  const slope = putting
    ? hole.green?.downhill
      ? t('green.downhill')
      : hole.pin === 'front'
        ? t('green.uphill')
        : t('green.flat')
    : null
  const lie = !putting && hole.ball ? t(`lie.${hole.ball.lie}`) : null

  return (
    <div className="status">
      <div className="status-dist">
        <span className="status-n num">{shown}</span>
        <span className="status-unit">
          {unit === 'ft' ? t('dist.ft', { n: '' }).trim() : t('dist.yds', { n: '' }).trim()}{' '}
          {putting ? t('dist.toCup') : t('dist.out')}
        </span>
      </div>
      <div className="status-lie">
        {lie && <span className="chip">{lie}</span>}
        {slope && <span className="chip">{slope}</span>}
        <span className="chip chip-dim">{t('deck.count', { n: sim.deck.length })}</span>
        {sim.caddies.includes('statistician') && sim.deck.length > 0 && (
          <span className="chip">
            {t('deck.next')} {cardLabel(sim.deck[sim.deck.length - 1]!)}
          </span>
        )}
      </div>
    </div>
  )
}
