import { CLUBS, type ClubId, type SimState } from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

function chargesLeft(sim: SimState, id: ClubId): number | null {
  const spec = CLUBS[id]
  if (spec.perHole !== undefined && !Number.isFinite(spec.charges)) {
    return Math.max(0, spec.perHole - (sim.clubUsedThisHole[id] ?? 0))
  }
  if (Number.isFinite(spec.charges)) return sim.clubCharges[id] ?? 0
  return null // passive
}

function usable(sim: SimState, id: ClubId): boolean {
  const spec = CLUBS[id]
  if (spec.kind === 'passive') return false
  const left = chargesLeft(sim, id)
  if (left !== null && left <= 0) return false
  if (spec.perHole !== undefined && (sim.clubUsedThisHole[id] ?? 0) >= spec.perHole) return false
  const onGreen = sim.phase === 'putt'
  if (onGreen && spec.kind === 'swing') return false
  if (onGreen && (id === 'sevenIron' || spec.texasWedge)) return false
  if (spec.texasWedge) {
    const ball = sim.hole?.ball
    if (!ball || ball.side !== 'short' || ball.remaining > 40) return false
    if (ball.lie !== 'fairway' && ball.lie !== 'rough') return false
  }
  if (spec.lies && sim.hole?.ball && !spec.lies.includes(sim.hole.ball.lie)) return false
  return true
}

export function ClubBar(): JSX.Element {
  const sim = useGame((s) => s.sim)
  const armedClub = useGame((s) => s.armedClub)
  const animating = useGame((s) => s.animating)
  const toggleClub = useGame((s) => s.toggleClub)

  return (
    <div className="clubbar" role="group" aria-label={t('clubs.label')}>
      {sim.config.bag.map((id) => {
        const spec = CLUBS[id]
        const left = chargesLeft(sim, id)
        const ok = usable(sim, id) && !animating
        const armed = armedClub === id
        return (
          <button
            key={id}
            type="button"
            className={`club ${armed ? 'armed' : ''}`}
            disabled={!ok && !armed}
            aria-pressed={armed}
            aria-label={`${spec.name}: ${spec.flavor}`}
            onClick={() => toggleClub(id)}
          >
            <span className="club-name">{spec.name}</span>
            {left !== null && (
              <span className="club-charges num" aria-hidden="true">
                {'●'.repeat(Math.min(left, 4))}
                {left === 0 ? '—' : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
