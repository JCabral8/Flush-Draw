import {
  cardFromId,
  evaluateHand,
  previewPutt,
  previewSwingAction,
  SimError,
} from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

interface Preview {
  label: string
  detail: string
  warn: string | null
  legal: boolean
}

function computePreview(): Preview {
  const { sim, selected, aceDecls } = useGame.getState()
  if (selected.length === 0) {
    return { label: t('action.selectCards'), detail: '', warn: null, legal: false }
  }
  const putting = sim.phase === 'putt' || sim.hole?.ball?.lie === 'fringe'
  try {
    if (putting) {
      const green =
        sim.phase === 'putt'
          ? sim.hole!.green!
          : { distFt: sim.hole!.ball!.remaining * 3, downhill: true }
      const outcome = previewPutt(
        {
          type: 'putt',
          cards: selected,
          aceValues: Object.fromEntries(
            selected
              .filter((id) => cardFromId(id).rank === 14)
              .map((id) => [id, aceDecls[id] ?? 1]),
          ),
        },
        green,
        sim.hole!.pin,
        sim.config.puttMaxCards,
        sim.config.gimmeFt,
      )
      return {
        label: t('action.putt'),
        detail: t('action.puttExact', { n: outcome.rolled }),
        warn: null,
        legal: true,
      }
    }
    const p = previewSwingAction(sim, selected)
    const hand = evaluateHand(selected)
    return {
      label: t(`hand.${hand.rank}`),
      detail:
        p.min === p.max
          ? t('action.exact', { n: p.min })
          : t('action.range', { min: p.min, max: p.max }),
      warn: p.junk ? t('hand.junkWarning') : null,
      legal: true,
    }
  } catch (e) {
    if (e instanceof SimError) {
      return { label: '', detail: '', warn: e.message, legal: false }
    }
    throw e
  }
}

export function ActionBar(): JSX.Element {
  const sim = useGame((s) => s.sim)
  const selected = useGame((s) => s.selected)
  const animating = useGame((s) => s.animating)
  const error = useGame((s) => s.error)
  const play = useGame((s) => s.play)
  void sim
  void selected
  const preview = computePreview()
  const putting = sim.phase === 'putt' || sim.hole?.ball?.lie === 'fringe'

  return (
    <div className="actionbar">
      <div className="preview" aria-live="polite">
        {preview.label && <span className="preview-hand">{preview.label}</span>}
        {preview.detail && <span className="preview-dist num">{preview.detail}</span>}
        {(preview.warn ?? error) && <span className="preview-warn">{preview.warn ?? error}</span>}
      </div>
      <button
        type="button"
        className="go"
        disabled={!preview.legal || animating}
        onClick={play}
      >
        {putting ? t('action.putt') : t('action.swing')}
      </button>
    </div>
  )
}
