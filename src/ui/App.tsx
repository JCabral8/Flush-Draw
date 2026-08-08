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
import { StatusRow } from './components/StatusRow'
import { TitleScreen } from './components/TitleScreen'
import { t } from './i18n'
import { useGame } from './store'

export function App(): JSX.Element {
  const screen = useGame((s) => s.screen)
  const sim = useGame((s) => s.sim)
  if (screen === 'title') {
    return (
      <div className="shell">
        <TitleScreen />
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
      <div className="brand num">{t('app.title')}</div>
      <Hud />
      <CourseView />
      <EventLine />
      {firstTee && <div className="tip">{t('onboard.tip')}</div>}
      <div className="bottom">
        <StatusRow />
        <ClubBar />
        <WildBar />
        <Hand />
        <ActionBar />
      </div>
      <DoneOverlay />
      <CeremonyOverlay />
    </div>
  )
}
