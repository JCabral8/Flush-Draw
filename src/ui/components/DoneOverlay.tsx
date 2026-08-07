import { toParString } from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

function scoreKey(diff: number): string {
  if (diff <= -3) return t('score.albatross')
  if (diff === -2) return t('score.eagle')
  if (diff === -1) return t('score.birdie')
  if (diff === 0) return t('score.par')
  if (diff === 1) return t('score.bogey')
  if (diff === 2) return t('score.doubleBogey')
  if (diff === 3) return t('score.tripleBogey')
  return t('score.cap')
}

export function DoneOverlay(): JSX.Element | null {
  const done = useGame((s) => s.done)
  const animating = useGame((s) => s.animating)
  const sim = useGame((s) => s.sim)
  const nextHole = useGame((s) => s.nextHole)
  const newRound = useGame((s) => s.newRound)
  if (!done || animating) return null
  const diff = done.score - done.par

  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className={`overlay-score ${diff < 0 ? 'good' : diff > 0 ? 'bad' : ''}`}>
          {scoreKey(diff)}
        </div>
        <div className="overlay-sub">
          {done.name} — {t('done.strokes', { n: done.score })}
        </div>
        {done.roundOver && done.totals ? (
          <>
            <table className="scorecard num">
              <tbody>
                <tr>
                  {sim.holes.map((h, i) => (
                    <td key={h.id} className="sc-par">
                      {i + 1}
                    </td>
                  ))}
                </tr>
                <tr>
                  {sim.scores.map((s, i) => {
                    const d = s - sim.holes[i]!.par
                    return (
                      <td key={i} className={d < 0 ? 'good' : d > 0 ? 'bad' : ''}>
                        {s}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
            <div className="overlay-total num">
              {done.totals.strokes} · {toParString(done.totals.toPar)}
            </div>
            <button type="button" className="go" onClick={newRound}>
              {t('done.again')}
            </button>
          </>
        ) : (
          <button type="button" className="go" onClick={nextHole}>
            {t('done.nextHole')}
          </button>
        )}
      </div>
    </div>
  )
}
