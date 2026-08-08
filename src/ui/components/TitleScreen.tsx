import { useState } from 'react'
import { TIERS } from '../../sim/index'
import { t } from '../i18n'
import { useGame } from '../store'

export function TitleScreen(): JSX.Element {
  const hasSave = useGame((s) => s.hasSave)
  const unlockedTier = useGame((s) => s.unlockedTier)
  const openShop = useGame((s) => s.openShop)
  const continueRun = useGame((s) => s.continueRun)
  const [tier, setTier] = useState(Math.min(unlockedTier, 8))

  return (
    <div className="title">
      <div className="title-logo num">{t('app.title')}</div>
      <div className="title-tag">{t('title.tagline')}</div>

      <div className="title-tiers" role="radiogroup" aria-label={t('title.tourCard')}>
        {TIERS.map((spec) => {
          const locked = spec.tier > unlockedTier
          return (
            <button
              key={spec.tier}
              type="button"
              role="radio"
              aria-checked={tier === spec.tier}
              className={`tier ${tier === spec.tier ? 'sel' : ''}`}
              disabled={locked}
              aria-label={`${t('title.tourCard')} ${spec.tier}: ${spec.name}${locked ? ` (${t('title.locked')})` : ''}`}
              onClick={() => setTier(spec.tier)}
            >
              <span className="tier-n num">{spec.tier}</span>
              <span className="tier-name">{locked ? '🔒' : spec.name}</span>
            </button>
          )
        })}
      </div>

      <div className="title-actions">
        {hasSave && (
          <button type="button" className="go" onClick={continueRun}>
            {t('title.continue')}
          </button>
        )}
        <button type="button" className="go" onClick={() => openShop(tier)}>
          {t('title.newRun')}
        </button>
        <button type="button" className="go go-quiet" onClick={() => openShop(0)}>
          {t('title.practice')}
        </button>
      </div>
    </div>
  )
}
