import { cardFromId, rankChar } from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' } as const
const RANK_KEY: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
}

export function Hand(): JSX.Element {
  const sim = useGame((s) => s.sim)
  const selected = useGame((s) => s.selected)
  const aceDecls = useGame((s) => s.aceDecls)
  const toggleCard = useGame((s) => s.toggleCard)
  const toggleAce = useGame((s) => s.toggleAce)
  const animating = useGame((s) => s.animating)
  const putting = sim.phase === 'putt' || sim.hole?.ball?.lie === 'fringe'

  return (
    <div className="hand" role="group" aria-label={t('app.title')}>
      {sim.hand.map((id) => {
        const card = cardFromId(id)
        const isSel = selected.includes(id)
        const isAce = card.rank === 14
        const rankTxt = RANK_KEY[card.rank] ?? String(card.rank)
        const label = t('card.label', {
          rank: rankTxt === 'T' ? '10' : rankTxt,
          suit: t(`suit.${card.suit}`),
        })
        return (
          <button
            key={id}
            type="button"
            className={`card suit-${card.suit} ${isSel ? 'sel' : ''}`}
            aria-label={label}
            aria-pressed={isSel}
            disabled={animating}
            onClick={() => toggleCard(id)}
          >
            <span className="card-rank num">{rankTxt === 'T' ? '10' : rankTxt}</span>
            <span className="card-suit">{SUIT_GLYPH[card.suit]}</span>
            {putting && isAce && isSel && (
              <span
                className="ace-toggle num"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleAce(id)
                }}
              >
                {(aceDecls[id] ?? 1) === 1 ? t('ace.putt.one') : t('ace.putt.fourteen')}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
