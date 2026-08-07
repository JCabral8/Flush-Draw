import { Application, Container, Graphics, Text } from 'pixi.js'
import { GREEN_WINDOW, FRINGE_WINDOW, lieAt } from '../../sim/holes'
import type { SimState, StrokeResult } from '../../sim/types'

/**
 * PixiJS renderer for the course strip ("dusk at a municipal course").
 * Flat vector only — everything is Graphics; zero raster assets (GDD §17).
 * Signal orange is reserved for the cup and nothing else in this canvas.
 */

const C = {
  fairway: 0x2e6b4d,
  tee: 0x2e6b4d,
  rough: 0x22513a,
  deepRough: 0x173829,
  bunker: 0xd6b06c,
  water: 0x2b5d7c,
  cartPath: 0x8a8580,
  green: 0x41905f,
  fringe: 0x357049,
  oob: 0x4a241c,
  groundA: 0x12332b,
  groundB: 0x0d2721,
  cream: 0xf4ead0,
  ink: 0x14110d,
  accent: 0xff6a00, // THE CUP. Nothing else.
} as const

interface SwingScene {
  kind: 'swing'
  effLength: number
  ballPos: number | null
  lieOf: (pos: number) => keyof typeof C | 'fairway'
}

interface PuttScene {
  kind: 'putt'
  distFt: number
  downhill: boolean
  uphill: boolean
}

export type Scene = SwingScene | PuttScene

export function sceneFrom(sim: SimState): Scene | null {
  const hole = sim.hole
  if (!hole) return null
  if (sim.phase === 'putt' && hole.green) {
    return {
      kind: 'putt',
      distFt: hole.green.distFt,
      downhill: hole.green.downhill,
      uphill: !hole.green.downhill && hole.pin === 'front',
    }
  }
  const spec = sim.holes[hole.index]!
  const ball = hole.ball
  const ballPos = ball ? (ball.side === 'short' ? hole.effLength - ball.remaining : hole.effLength + ball.remaining) : null
  return {
    kind: 'swing',
    effLength: hole.effLength,
    ballPos,
    lieOf: (pos: number) => {
      if (pos >= hole.effLength - GREEN_WINDOW && pos <= hole.effLength) return 'green'
      if (pos > hole.effLength && pos <= hole.effLength + FRINGE_WINDOW) return 'fringe'
      if (pos > hole.effLength + FRINGE_WINDOW) return 'oob'
      const lie = lieAt(spec, pos)
      return lie === 'tee' ? 'tee' : lie
    },
  }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: number
  r: number
}

type Anim =
  | {
      kind: 'arc'
      scene: SwingScene
      stroke: Extract<StrokeResult, { kind: 'swing' }>
      t0: number
      dur1: number
      dur2: number
      landed: boolean
    }
  | {
      kind: 'roll'
      scene: PuttScene
      stroke: Extract<StrokeResult, { kind: 'putt' }>
      t0: number
      dur: number
      sunk: boolean
    }

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

export class PixiCourse {
  private app = new Application()
  private ground = new Graphics()
  private ballG = new Graphics()
  private fxG = new Graphics()
  private labels = new Container()
  private particles: Particle[] = []
  private anim: Anim | null = null
  private onAnimDone: (() => void) | null = null
  private scene: Scene | null = null
  private cupPulse = 0
  ready = false

  private resizeObs: ResizeObserver | null = null

  async init(el: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: el,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    })
    el.appendChild(this.app.canvas)
    this.app.stage.addChild(this.ground, this.labels, this.fxG, this.ballG)
    this.app.ticker.add(() => this.tick())
    this.resizeObs = new ResizeObserver(() => {
      this.app.resize()
      if (!this.anim && this.scene) this.render(this.scene)
    })
    this.resizeObs.observe(el)
    this.ready = true
    this.app.resize()
  }

  destroy(): void {
    this.resizeObs?.disconnect()
    this.resizeObs = null
    this.app.destroy(true, { children: true })
    this.ready = false
  }

  private get w(): number {
    return this.app.screen.width
  }
  private get h(): number {
    return this.app.screen.height
  }

  // ---- static rendering -------------------------------------------------

  render(scene: Scene): void {
    if (!this.ready) return
    this.scene = scene
    this.ground.clear()
    this.ballG.clear()
    this.labels.removeChildren().forEach((c) => c.destroy())
    if (scene.kind === 'swing') this.renderSwing(scene)
    else this.renderPutt(scene)
  }

  private swingMap(scene: SwingScene): { xFor: (pos: number) => number; stripY: number } {
    const pad = 10
    const worldMax = scene.effLength + FRINGE_WINDOW + 14
    const xFor = (pos: number): number =>
      pad + (Math.max(0, Math.min(pos, worldMax)) / worldMax) * (this.w - 2 * pad)
    return { xFor, stripY: this.h * 0.66 }
  }

  private renderSwing(scene: SwingScene): void {
    const g = this.ground
    const { xFor, stripY } = this.swingMap(scene)
    const stripH = 15

    // Distant treeline silhouette on the horizon (flat, slightly ragged).
    const horizonY = stripY - 26
    for (let x = -8; x < this.w + 8; x += 17) {
      const bump = 5 + ((x * 7919) % 13)
      g.circle(x, horizonY + 2, bump).fill({ color: 0x0b201d, alpha: 0.9 })
    }

    // Ground mass below the horizon.
    g.rect(0, horizonY, this.w, this.h - horizonY).fill(C.groundA)
    g.rect(0, stripY + stripH + 8, this.w, this.h).fill(C.groundB)

    // Mow lines: quiet alternating bands so the foreground isn't dead space.
    for (let y = stripY + stripH + 22; y < this.h; y += 16) {
      g.rect(0, y, this.w, 8).fill({ color: 0xf4ead0, alpha: 0.018 })
    }

    // The hole strip, yard by segment.
    const worldEnd = scene.effLength + FRINGE_WINDOW + 14
    let cursor = 0
    while (cursor <= worldEnd) {
      const lie = scene.lieOf(cursor)
      let end = cursor
      while (end + 1 <= worldEnd && scene.lieOf(end + 1) === lie) end++
      const x0 = xFor(cursor)
      const x1 = xFor(Math.min(end + 1, worldEnd))
      const isGreen = lie === 'green'
      g.rect(x0, stripY - (isGreen ? 3 : 0), x1 - x0, stripH + (isGreen ? 6 : 0)).fill(
        C[lie] ?? C.fairway,
      )
      if (lie === 'water') {
        g.rect(x0, stripY, x1 - x0, 2).fill({ color: 0x9fc4d8, alpha: 0.5 })
      }
      cursor = end + 1
    }

    // Tee marker.
    g.rect(xFor(0) - 1, stripY - 6, 2, 6).fill(C.cream)

    // Distance ticks every 100 yds.
    for (let yd = 100; yd < scene.effLength - 20; yd += 100) {
      const x = xFor(yd)
      g.rect(x, stripY + stripH + 3, 1, 4).fill({ color: C.cream, alpha: 0.35 })
      const label = new Text({
        text: String(yd),
        style: { fontFamily: 'Arial', fontSize: 9, fill: C.cream },
      })
      label.alpha = 0.4
      label.position.set(x - label.width / 2, stripY + stripH + 8)
      this.labels.addChild(label)
    }

    // Flag + THE CUP (the only orange in the world).
    const cx = xFor(scene.effLength)
    g.rect(cx - 0.5, stripY - 34, 1.5, 34).fill(C.cream)
    g.poly([cx + 1, stripY - 34, cx + 13, stripY - 30, cx + 1, stripY - 25]).fill(C.cream)
    g.circle(cx, stripY + 2, 3).fill(C.accent)
    if (this.cupPulse > 0) {
      g.circle(cx, stripY + 2, 3 + (1 - this.cupPulse) * 14).stroke({
        width: 2,
        color: C.accent,
        alpha: this.cupPulse * 0.8,
      })
    }

    // Ball.
    if (scene.ballPos !== null) this.drawBall(xFor(scene.ballPos), stripY - 4)
  }

  private puttMap(scene: PuttScene): { cupX: number; ballXFor: (ft: number) => number; y: number } {
    const cupX = this.w - 56
    const span = Math.max(48, scene.distFt + 14)
    const scale = (cupX - 34) / span
    return { cupX, ballXFor: (ft: number) => cupX - ft * scale, y: this.h * 0.62 }
  }

  private renderPutt(scene: PuttScene): void {
    const g = this.ground
    const { cupX, ballXFor, y } = this.puttMap(scene)

    // The green, close up: fringe collar then putting surface.
    g.rect(0, y - 26, this.w, this.h - y + 26).fill(C.groundB)
    g.roundRect(6, y - 18, this.w - 12, 60, 12).fill(C.fringe)
    g.roundRect(12, y - 12, this.w - 24, 48, 10).fill(C.green)

    // Slope chevrons (cream, never orange): point the way the ball will run.
    const dir = scene.downhill ? 1 : scene.uphill ? -1 : 0
    if (dir !== 0) {
      for (let i = 0; i < 3; i++) {
        const x = this.w / 2 + (i - 1) * 26
        g.moveTo(x - 5 * dir, y + 26)
          .lineTo(x + 3 * dir, y + 30)
          .lineTo(x - 5 * dir, y + 34)
          .stroke({ width: 2, color: C.cream, alpha: 0.5 })
      }
    }

    // Foot ticks every 15 ft from the cup.
    for (let ft = 15; ft <= scene.distFt + 10; ft += 15) {
      const x = ballXFor(ft)
      if (x < 20) break
      g.rect(x, y + 14, 1, 4).fill({ color: C.cream, alpha: 0.35 })
      const label = new Text({
        text: String(ft),
        style: { fontFamily: 'Arial', fontSize: 9, fill: C.cream },
      })
      label.alpha = 0.4
      label.position.set(x - label.width / 2, y + 20)
      this.labels.addChild(label)
    }

    // THE CUP.
    g.circle(cupX, y + 6, 5.5).fill(C.ink)
    g.circle(cupX, y + 6, 6.5).stroke({ width: 2, color: C.accent })
    if (this.cupPulse > 0) {
      g.circle(cupX, y + 6, 7 + (1 - this.cupPulse) * 18).stroke({
        width: 2,
        color: C.accent,
        alpha: this.cupPulse * 0.8,
      })
    }

    // Ball.
    this.drawBall(ballXFor(scene.distFt), y + 2)
  }

  private drawBall(x: number, y: number, scale = 1): void {
    if (scale <= 0) return
    this.ballG.circle(x, y + 5 * (1 - scale), 4.2 * scale).fill(C.cream)
    this.ballG.circle(x, y + 5 * (1 - scale), 4.2 * scale).stroke({ width: 1, color: C.ink, alpha: 0.55 })
  }

  // ---- animation --------------------------------------------------------

  animate(before: SimState, stroke: StrokeResult, onDone: () => void): void {
    if (!this.ready) {
      onDone()
      return
    }
    const scene = sceneFrom(before)
    this.onAnimDone = onDone
    if (!scene) {
      this.finishAnim()
      return
    }
    this.render(scene)
    if (stroke.kind === 'swing' && scene.kind === 'swing') {
      this.anim = {
        kind: 'arc',
        scene,
        stroke,
        t0: performance.now(),
        dur1: Math.min(500 + stroke.struck * 1.4, 1800),
        dur2: stroke.finalPos !== stroke.landedPos ? 550 : stroke.outcome === 'holed' ? 350 : 250,
        landed: false,
      }
    } else if (stroke.kind === 'putt' && scene.kind === 'putt') {
      this.anim = {
        kind: 'roll',
        scene,
        stroke,
        t0: performance.now(),
        dur: 450 + stroke.rolledFt * 9,
        sunk: false,
      }
    } else {
      this.finishAnim()
    }
  }

  private finishAnim(): void {
    this.anim = null
    const cb = this.onAnimDone
    this.onAnimDone = null
    cb?.()
  }

  private spawnBurst(x: number, y: number, color: number, n: number, up: boolean): void {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * (i + 0.5)) / n
      const sp = 0.6 + (i % 3) * 0.5
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp * (i % 2 === 0 ? 1 : -1),
        vy: (up ? -1 : -0.4) * Math.sin(a) * sp * 1.6,
        life: 0,
        max: 320 + (i % 4) * 60,
        color,
        r: 1.2 + (i % 3) * 0.7,
      })
    }
  }

  private fxDirty = false

  private tick(): void {
    const dt = this.app.ticker.deltaMS
    // Particles always update.
    if (this.particles.length > 0) {
      this.fxG.clear()
      this.fxDirty = true
      this.particles = this.particles.filter((p) => (p.life += dt) < p.max)
      for (const p of this.particles) {
        p.x += p.vx * dt * 0.06
        p.y += p.vy * dt * 0.06
        p.vy += dt * 0.004
        this.fxG.circle(p.x, p.y, p.r).fill({ color: p.color, alpha: 1 - p.life / p.max })
      }
    } else if (this.fxDirty) {
      this.fxG.clear()
      this.fxDirty = false
    }
    if (this.cupPulse > 0) {
      this.cupPulse = Math.max(0, this.cupPulse - dt / 600)
      if (this.scene) this.renderStatic()
    }

    const anim = this.anim
    if (!anim) return
    const t = performance.now() - anim.t0

    if (anim.kind === 'arc') this.tickArc(anim, t)
    else this.tickRoll(anim, t)
  }

  private renderStatic(): void {
    // Re-render preserving ball hiding during animation.
    if (!this.scene) return
    const scene = this.scene
    const hideBall = this.anim !== null
    if (scene.kind === 'swing') {
      const shown: Scene = hideBall ? { ...scene, ballPos: null } : scene
      this.render(shown)
      this.scene = scene
    } else if (hideBall) {
      // Putt scene: render then clear the ball layer.
      this.render(scene)
      this.ballG.clear()
    } else {
      this.render(scene)
    }
  }

  private tickArc(anim: Extract<Anim, { kind: 'arc' }>, t: number): void {
    const { scene, stroke } = anim
    const { xFor, stripY } = this.swingMap(scene)
    const x0 = xFor(stroke.fromPos)
    const x1 = xFor(stroke.landedPos)
    this.ballG.clear()

    if (t <= anim.dur1) {
      const p = t / anim.dur1
      const x = x0 + (x1 - x0) * p
      const hMax = Math.max(22, Math.min(stroke.struck * 0.32, this.h * 0.5))
      const y = stripY - 4 - Math.sin(Math.PI * p) * hMax
      this.drawBall(x, y)
      return
    }

    if (!anim.landed) {
      anim.landed = true
      // Landing effect at the touchdown point.
      if (stroke.outcome === 'water') this.spawnBurst(x1, stripY + 4, 0x9fc4d8, 10, true)
      else if (stroke.outcome === 'holed') this.cupPulse = 1
      else if (stroke.outcome === 'oob') this.spawnBurst(x1, stripY - 2, C.oob, 8, true)
      else this.spawnBurst(x1, stripY + 2, stroke.outcome === 'green' ? 0x7fbf98 : C.bunker, 7, true)
    }

    const t2 = t - anim.dur1
    if (t2 <= anim.dur2) {
      if (stroke.outcome === 'holed') {
        this.drawBall(x1, stripY - 4, Math.max(0, 1 - t2 / 300))
      } else if (stroke.finalPos !== stroke.landedPos) {
        // Splash/OOB: hold empty, then fade the ball in at its final spot.
        if (t2 > 250) {
          const p = (t2 - 250) / (anim.dur2 - 250)
          this.drawBall(xFor(stroke.finalPos), stripY - 4, Math.min(1, p))
        }
      } else {
        this.drawBall(x1, stripY - 4)
      }
      return
    }
    this.finishAnim()
  }

  private tickRoll(anim: Extract<Anim, { kind: 'roll' }>, t: number): void {
    const { scene, stroke } = anim
    const { cupX, ballXFor, y } = this.puttMap(scene)
    const x0 = ballXFor(stroke.fromFt)
    const x1 = stroke.holed ? cupX : stroke.blewPast ? cupX + (cupX - ballXFor(stroke.endFt)) : ballXFor(stroke.endFt)
    this.ballG.clear()

    if (t <= anim.dur) {
      const p = easeOutCubic(t / anim.dur)
      this.drawBall(x0 + (x1 - x0) * p, y + 2)
      return
    }
    if (stroke.holed) {
      if (!anim.sunk) {
        anim.sunk = true
        this.cupPulse = 1
      }
      const ts = t - anim.dur
      if (ts < 300) {
        this.drawBall(cupX, y + 2, Math.max(0, 1 - ts / 300))
        return
      }
      if (ts < 500) return // a beat of quiet before the scorecard (GDD §17)
    }
    this.finishAnim()
  }
}
