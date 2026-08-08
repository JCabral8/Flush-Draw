import { useState } from 'react'
import { COURSES, TIERS, type CourseId } from '../../sim/index'
import { t } from '../i18n'
import { lessonDone, loadCoursePref, saveCoursePref, useGame } from '../store'

export function TitleScreen(): JSX.Element {
  const hasSave = useGame((s) => s.hasSave)
  const unlockedTier = useGame((s) => s.unlockedTier)
  const openShop = useGame((s) => s.openShop)
  const continueRun = useGame((s) => s.continueRun)
  const [tier, setTier] = useState(Math.min(unlockedTier, 8))
  const [course, setCourse] = useState<CourseId>(loadCoursePref())
  const startLesson = useGame((s) => s.startLesson)
  const toggleSettings = useGame((s) => s.toggleSettings)

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

      <div className="title-courses" role="radiogroup" aria-label={t('title.course')}>
        {(Object.keys(COURSES) as CourseId[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={course === id}
            className={`course-pick ${course === id ? 'sel' : ''}`}
            onClick={() => {
              setCourse(id)
              saveCoursePref(id)
            }}
          >
            <span className="course-pick-name">{COURSES[id].name}</span>
            <span className="course-pick-tag">{COURSES[id].tagline}</span>
          </button>
        ))}
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
        {!lessonDone() && (
          <button type="button" className="go go-quiet" onClick={startLesson}>
            {t('title.lesson')}
          </button>
        )}
      </div>
      <button
        type="button"
        className="gear title-gear"
        aria-label={t('settings.open')}
        onClick={() => toggleSettings(true)}
      >
        ⚙
      </button>
    </div>
  )
}
