import {
  cardFromId,
  CLUBS,
  PUTTERS,
  previewPutt,
  previewSwingAction,
  putterMaxCards,
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
  const { sim, selected, aceDecls, armedClub, wildDecl } = useGame.getState()
  if (armedClub === 'punchIron') {
    return {
      label: t('club.punchIron.name'),
      detail: t('punch.hint'),
      warn: null,
      legal: selected.length === 2,
    }
  }
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
        putterMaxCards(sim.config.putter, sim.config.puttMaxCards),
        sim.config.gimmeFt,
        PUTTERS[sim.config.putter],
      )
      return {
        label: t('action.putt'),
        detail: t('action.puttExact', { n: outcome.rolled }),
        warn: null,
        legal: true,
      }
    }
    const armedSpec = armedClub ? CLUBS[armedClub] : undefined
    const wild =
      armedSpec?.wildcard && wildDecl && selected[0]
        ? { id: selected[0], rank: wildDecl.rank, suit: wildDecl.suit }
        : undefined
    const p = previewSwingAction(sim, selected, armedClub ?? undefined, wild)
    const hand = { rank: p.rank, junk: p.junk }
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
  const retake = useGame((s) => s.retake)
  void sim
  void selected
  const armedClub = useGame((s) => s.armedClub)
  const preview = computePreview()
  const putting = sim.phase === 'putt' || sim.hole?.ball?.lie === 'fringe'
  const buttonLabel =
    armedClub === 'punchIron'
      ? t('action.discard')
      : putting
        ? t('action.putt')
        : t('action.swing')

  return (
    <div className="actionbar">
      <div className="preview" aria-live="polite">
        {preview.label && <span className="preview-hand">{preview.label}</span>}
        {preview.detail && <span className="preview-dist num">{preview.detail}</span>}
        {(preview.warn ?? error) && <span className="preview-warn">{preview.warn ?? error}</span>}
      </div>
      {sim.mulligan && !animating && (
        <button type="button" className="go go-quiet retake" onClick={retake}>
          {t('action.retake')}
        </button>
      )}
      <button
        type="button"
        className="go"
        disabled={!preview.legal || animating}
        onClick={play}
      >
        {buttonLabel}
      </button>
    </div>
  )
}
