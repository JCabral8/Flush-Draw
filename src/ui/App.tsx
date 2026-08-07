import { CourseView } from './canvas/CourseView'
import { ActionBar } from './components/ActionBar'
import { DoneOverlay } from './components/DoneOverlay'
import { EventLine } from './components/EventLine'
import { Hand } from './components/Hand'
import { Hud } from './components/Hud'
import { StatusRow } from './components/StatusRow'
import { t } from './i18n'
import { useGame } from './store'

export function App(): JSX.Element {
  const sim = useGame((s) => s.sim)
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
        <Hand />
        <ActionBar />
      </div>
      <DoneOverlay />
    </div>
  )
}
