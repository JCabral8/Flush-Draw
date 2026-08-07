import { useGame } from '../store'

const NOTABLE = /water|bounds|reshuffled|Flew the pin|past|IN THE HOLE|picking up/

/**
 * One quiet line of caddie narration: hole flavor on the tee, the last
 * notable event otherwise. (Sim narration verbatim for now — keyed
 * localization of sim events is M5 debt, logged in DECISIONS D18.)
 */
export function EventLine(): JSX.Element | null {
  const sim = useGame((s) => s.sim)
  const hole = sim.hole
  if (!hole) return null
  const spec = sim.holes[hole.index]!
  const notable = [...sim.lastEvents].reverse().find((e) => NOTABLE.test(e))
  const text = hole.strokes === 0 ? spec.flavor : (notable ?? '')
  return (
    <div className="eventline" aria-live="polite">
      {text}
    </div>
  )
}
