import { CourseView } from './canvas/CourseView'
import { ProShop } from './components/ProShop'
import { WildBar } from './components/WildBar'
import { ActionBar } from './components/ActionBar'
import { CeremonyOverlay } from './components/CeremonyOverlay'
import { ClubBar } from './components/ClubBar'
import { DoneOverlay } from './components/DoneOverlay'
import { EventLine } from './components/EventLine'
import { Hand } from './components/Hand'
import { Hud } from './components/Hud'
import { SettingsOverlay } from './components/Settings'
import { StatusRow } from './components/StatusRow'
import { TitleScreen } from './components/TitleScreen'
import { LESSON_LINES } from './lesson'
import { t } from './i18n'
import { useGame } from './store'

export function App(): JSX.Element {
  const screen = useGame((s) => s.screen)
  const sim = useGame((s) => s.sim)
  const lesson = useGame((s) => s.lesson)
  const toggleSettings = useGame((s) => s.toggleSettings)
  if (screen === 'title') {
    return (
      <div className="shell">
        <TitleScreen />
        <SettingsOverlay />
      </div>
    )
  }
  if (screen === 'shop') {
    return (
      <div className="shell">
        <ProShop />
      </div>
    )
  }
  const firstTee = sim.hole?.index === 0 && sim.hole.strokes === 0 && sim.scores.length === 0

  return (
    <div className="shell">
      <div className="brand num">
        {t('app.title')}
        <button
          type="button"
          className="gear"
          aria-label={t('settings.open')}
          onClick={() => toggleSettings(true)}
        >
          ⚙
        </button>
      </div>
      <Hud />
      <CourseView />
      <EventLine />
      {lesson && <div className="tip lesson-line">{LESSON_LINES[lesson]}</div>}
      {firstTee && !lesson && <div className="tip">{t('onboard.tip')}</div>}
      <div className="bottom">
        <StatusRow />
        <ClubBar />
        <WildBar />
        <Hand />
        <ActionBar />
      </div>
      <DoneOverlay />
      <CeremonyOverlay />
      <SettingsOverlay />
    </div>
  )
}
