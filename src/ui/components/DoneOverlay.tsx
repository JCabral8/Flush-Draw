import { toParString } from '../../sim/index'
import { t } from '../i18n'
import { matchStatus, useGame } from '../store'
import { loadDaily } from '../storage'

function scoreLabel(diff: number): string {
  if (diff <= -3) return t('score.albatross')
  if (diff === -2) return t('score.eagle')
  if (diff === -1) return t('score.birdie')
  if (diff === 0) return t('score.par')
  if (diff === 1) return t('score.bogey')
  if (diff === 2) return t('score.doubleBogey')
  if (diff === 3) return t('score.tripleBogey')
  return t('score.cap')
}

function Scorecard(): JSX.Element {
  const sim = useGame((s) => s.sim)
  const rows: number[][] = []
  for (let i = 0; i < sim.scores.length; i += 9) rows.push(sim.scores.slice(i, i + 9))
  return (
    <div className="scorecard-wrap">
      {rows.map((row, r) => (
        <table className="scorecard num" key={r}>
          <tbody>
            <tr>
              {row.map((_, i) => (
                <td key={i} className="sc-par">
                  {r * 9 + i + 1}
                </td>
              ))}
            </tr>
            <tr>
              {row.map((s, i) => {
                const d = s - sim.holes[r * 9 + i]!.par
                return (
                  <td key={i} className={d < 0 ? 'good' : d > 0 ? 'bad' : ''}>
                    {s}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      ))}
    </div>
  )
}

export function DoneOverlay(): JSX.Element | null {
  const done = useGame((s) => s.done)
  const animating = useGame((s) => s.animating)
  const nextHole = useGame((s) => s.nextHole)
  const toTitle = useGame((s) => s.toTitle)
  const mode = useGame((s) => s.mode)
  const ghost = useGame((s) => s.ghost)
  const sim = useGame((s) => s.sim)
  const shareDaily = useGame((s) => s.shareDaily)
  if (!done || animating) return null

  if (done.runEnd) {
    let heading =
      done.runEnd === 'complete'
        ? t('run.complete')
        : done.runEnd === 'missedCut'
          ? t('run.missedCut')
          : t('run.deckDead')
    if (mode === 'match' && ghost) {
      const { up } = matchStatus(sim.scores, ghost)
      heading = up > 0 ? t('match.win') : up < 0 ? t('match.loss') : t('match.halved')
    }
    return (
      <div className="overlay">
        <div className="overlay-card">
          <div className={`overlay-score ${done.runEnd === 'complete' ? 'good' : 'bad'}`}>
            {heading}
          </div>
          <Scorecard />
          {done.totals && (
            <div className="overlay-total num">
              {done.totals.strokes} · {toParString(done.totals.toPar)}
            </div>
          )}
          {done.totals?.unlocked && (
            <div className="overlay-unlock">{t('run.unlocked', { n: done.totals.unlocked })}</div>
          )}
          {mode === 'daily' && (
            <>
              <div className="overlay-sub">{t('daily.streak', { n: loadDaily()?.streak ?? 0 })}</div>
              <button type="button" className="go go-quiet" onClick={shareDaily}>
                {t('daily.share')}
              </button>
            </>
          )}
          <button type="button" className="go" onClick={toTitle}>
            {t('run.clubhouse')}
          </button>
        </div>
      </div>
    )
  }

  const diff = done.score - done.par
  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className={`overlay-score ${diff < 0 ? 'good' : diff > 0 ? 'bad' : ''}`}>
          {scoreLabel(diff)}
        </div>
        <div className="overlay-sub">
          {done.name} — {t('done.strokes', { n: done.score })}
        </div>
        <button type="button" className="go" onClick={nextHole}>
          {t('done.nextHole')}
        </button>
      </div>
    </div>
  )
}
