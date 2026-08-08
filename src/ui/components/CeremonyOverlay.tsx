import { CADDIES } from '../../sim/index'
import { t, type StringKey } from '../i18n'
import { useGame } from '../store'

export function CeremonyOverlay(): JSX.Element | null {
  const sim = useGame((s) => s.sim)
  const done = useGame((s) => s.done)
  const animating = useGame((s) => s.animating)
  const pickCaddie = useGame((s) => s.pickCaddie)
  if (sim.phase !== 'ceremony' || done || animating) return null
  const atStart = sim.caddies.length === 0

  return (
    <div className="overlay">
      <div className="overlay-card ceremony">
        <div className="ceremony-title">{t('ceremony.title')}</div>
        <div className="overlay-sub">{atStart ? t('ceremony.start') : t('ceremony.recruit')}</div>
        <div className="caddie-offers">
          {sim.offers.map((id) => {
            const c = CADDIES[id]
            return (
              <button
                key={id}
                type="button"
                className={`caddie rarity-${c.rarity}`}
                onClick={() => pickCaddie(id)}
              >
                <span className="caddie-name">{c.name}</span>
                <span className="caddie-rarity">{t(`rarity.${c.rarity}` as StringKey)}</span>
                <span className="caddie-effect">{c.effect}</span>
                <span className="caddie-flavor">{c.flavor}</span>
              </button>
            )
          })}
        </div>
        {!atStart && (
          <button type="button" className="go go-quiet" onClick={() => pickCaddie(null)}>
            {t('ceremony.walkOn')}
          </button>
        )}
        {sim.caddies.length > 0 && (
          <div className="caddie-owned">
            {t('ceremony.yours')} {sim.caddies.map((id) => CADDIES[id].name).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}
