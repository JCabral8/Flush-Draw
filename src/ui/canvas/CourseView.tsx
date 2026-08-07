import { useEffect, useRef } from 'react'
import { useGame } from '../store'
import { PixiCourse, sceneFrom } from './PixiCourse'

export function CourseView(): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const courseRef = useRef<PixiCourse | null>(null)
  const lastSeqRef = useRef(0)
  const sim = useGame((s) => s.sim)
  const prevSim = useGame((s) => s.prevSim)
  const animSeq = useGame((s) => s.animSeq)

  // Mount Pixi once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const course = new PixiCourse()
    courseRef.current = course
    let disposed = false
    void course.init(host).then(() => {
      if (disposed) {
        course.destroy()
        return
      }
      const scene = sceneFrom(useGame.getState().sim)
      if (scene) course.render(scene)
    })
    return () => {
      disposed = true
      courseRef.current = null
      if (course.ready) course.destroy()
    }
  }, [])

  // React to strokes (animate) and to non-stroke state changes (redraw).
  useEffect(() => {
    const course = courseRef.current
    if (!course?.ready) return
    if (animSeq > 0 && animSeq !== lastSeqRef.current && prevSim && sim.lastStroke) {
      lastSeqRef.current = animSeq
      course.animate(prevSim, sim.lastStroke, () => {
        const scene = sceneFrom(useGame.getState().sim)
        if (scene) course.render(scene)
        useGame.getState().animationDone()
      })
    } else {
      const scene = sceneFrom(sim)
      if (scene) course.render(scene)
    }
  }, [sim, prevSim, animSeq])

  return <div className="course" ref={hostRef} aria-hidden="true" />
}
