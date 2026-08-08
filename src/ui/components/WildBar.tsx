import { CLUBS, SUITS, rankChar, type Suit } from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

const SUIT_GLYPH: Record<Suit, string> = { S: '\u2660', H: '\u2665', D: '\u2666', C: '\u2663' }

/** Hybrid armed: declare what the first selected card pretends to be. */
export function WildBar(): JSX.Element | null {
  const armedClub = useGame((s) => s.armedClub)
  const wildDecl = useGame((s) => s.wildDecl)
  const setWild = useGame((s) => s.setWild)
  const selected = useGame((s) => s.selected)
  if (!armedClub || !CLUBS[armedClub].wildcard || selected.length === 0) return null

  return (
    <div className="wildbar" aria-label={t('wild.title')}>
      <div className="wild-row">
        {Array.from({ length: 13 }, (_, i) => i + 2).map((rank) => (
          <button
            key={rank}
            type="button"
            className={`wild-chip num ${wildDecl?.rank === rank ? 'sel' : ''}`}
            onClick={() => setWild(rank, wildDecl?.suit ?? 'S')}
          >
            {rank === 10 ? '10' : rankChar(rank)}
          </button>
        ))}
      </div>
      <div className="wild-row">
        {SUITS.map((suit) => (
          <button
            key={suit}
            type="button"
            className={`wild-chip suit-${suit} ${wildDecl?.suit === suit ? 'sel' : ''}`}
            onClick={() => setWild(wildDecl?.rank ?? 2, suit)}
          >
            {SUIT_GLYPH[suit]}
          </button>
        ))}
      </div>
    </div>
  )
}
