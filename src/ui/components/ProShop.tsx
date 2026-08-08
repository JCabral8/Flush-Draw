import { useState } from 'react'
import { CLUBS, PUTTERS, TIERS, type ClubId, type PutterId } from '../../sim/index'
import { t } from '../i18n'
import { loadBagPrefs, saveBagPrefs, useGame, PRACTICE } from '../store'

/** The Pro Shop: pick 5 clubs and a putter. The bag is the build (GDD §7). */
export function ProShop(): JSX.Element {
  const pendingTier = useGame((s) => s.pendingTier)
  const startRun = useGame((s) => s.startRun)
  const toTitle = useGame((s) => s.toTitle)
  const prefs = loadBagPrefs()
  const [bag, setBag] = useState<ClubId[]>(prefs.bag)
  const [putter, setPutter] = useState<PutterId>(prefs.putter)

  const toggle = (id: ClubId): void => {
    if (CLUBS[id].kind === 'passive' && !bag.includes(id) && bag.length >= 5) return
    setBag((b) =>
      b.includes(id) ? b.filter((c) => c !== id) : b.length < 5 ? [...b, id] : b,
    )
  }

  const tierName = pendingTier === PRACTICE ? t('title.practice') : TIERS[pendingTier - 1]!.name

  return (
    <div className="shop">
      <div className="shop-head">
        <button type="button" className="shop-back" onClick={toTitle} aria-label={t('shop.back')}>
          ‹
        </button>
        <div>
          <div className="shop-title">{t('shop.title')}</div>
          <div className="shop-sub">
            {tierName} · {t('shop.count', { n: bag.length })}
          </div>
        </div>
      </div>

      <div className="shop-grid" role="group" aria-label={t('shop.clubs')}>
        {(Object.keys(CLUBS) as ClubId[]).map((id) => {
          const spec = CLUBS[id]
          const inBag = bag.includes(id)
          return (
            <button
              key={id}
              type="button"
              className={`shop-club ${inBag ? 'sel' : ''}`}
              aria-pressed={inBag}
              onClick={() => toggle(id)}
            >
              <span className="shop-club-name">{spec.name}</span>
              <span className="shop-club-fx">{spec.flavor}</span>
            </button>
          )
        })}
      </div>

      <div className="shop-putters" role="radiogroup" aria-label={t('shop.putter')}>
        {(Object.keys(PUTTERS) as PutterId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={putter === id}
            className={`shop-club putter ${putter === id ? 'sel' : ''}`}
            onClick={() => setPutter(id)}
          >
            <span className="shop-club-name">{PUTTERS[id].name}</span>
            <span className="shop-club-fx">{PUTTERS[id].flavor}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="go"
        disabled={bag.length !== 5}
        onClick={() => {
          saveBagPrefs({ bag, putter })
          startRun(pendingTier)
        }}
      >
        {t('shop.start')}
      </button>
    </div>
  )
}
