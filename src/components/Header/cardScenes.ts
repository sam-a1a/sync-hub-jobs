import * as THREE from 'three'
import { getTheme, resolveTheme, subscribeToTheme, watchSystemAppearance } from '../../lib/theme'
import { prefersReducedMotion } from '../../lib/transition'

/*
 * The three cards in the SYNC AI panel, each drawn as the thing it says.
 *
 *   - Read: a page of text, as rows of dots, and a light that passes down it.
 *     Every line the light has crossed stays lit — read — until the page is
 *     done, and then it is a fresh page.
 *   - Screen: a ring of places the role asks for, and a scatter of points
 *     that find their way into them one by one, each lighting as it fits.
 *     When they are all in, a line closes round the ring. Then they let go.
 *   - Track: three lines with four stops on each, and a pulse that moves
 *     stop to stop along them, lighting each as it arrives and holding at
 *     the last — the answer — before the line resets.
 *
 * The three share one renderer setup, one dot, one palette by card, and one
 * clock that only runs while the panel is open. Everything is in scene units
 * — y from -1 at the card's bottom to 1 at its top, x from -aspect to aspect
 * — and the action stays in the upper two-thirds, above the card's title.
 *
 * Colours are the CSS values verbatim; see `HeroField/field.ts`.
 */
THREE.ColorManagement.enabled = false

export type CardKind = 'read' | 'screen' | 'track'

export interface CardSceneHandle {
  setRunning(on: boolean): void
  dispose(): void
}

const ACCENT: Record<CardKind, { light: string; dark: string }> = {
  read: { light: '#2ba69c', dark: '#51c2ba' },
  screen: { light: '#d9603f', dark: '#e76f51' },
  track: { light: '#e98a4a', dark: '#f4a261' },
}

/** The card's inner margin — the copy's 16px — in scene units, at the card's 176px height. */
const MARGIN = 0.182

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3)
const rand = (a: number, b: number): number => a + Math.random() * (b - a)

/* The dot: a core the size it says, and a halo that only exists when it glows. */
const DOT_VERTEX = /* glsl */ `
  attribute float aGlow, aAlpha;
  uniform float uPR, uSize, uGlowSize;
  varying float vGlow, vCore, vAlpha;
  void main(){
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float core = uSize + aGlow * 1.4;
    float total = core + aGlow * uGlowSize;
    gl_PointSize = total * uPR;
    vCore = 0.5 * core / total;
    vGlow = aGlow;
    vAlpha = aAlpha;
  }`
const DOT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor, uGlowColor, uHaloColor; uniform float uHalo;
  varying float vGlow, vCore, vAlpha;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(vCore, vCore * 0.5, d);
    float halo = smoothstep(0.5, 0.04, d); halo = halo * halo * vGlow;
    vec3 col = mix(uColor, uGlowColor, vGlow);
    gl_FragColor = vec4(mix(col, uHaloColor, halo * (1.0 - core)), core * vAlpha + halo * uHalo);
  }`

interface Palette {
  accent: THREE.Color
  glow: THREE.Color
  halo: THREE.Color
  dark: boolean
}

interface Dots {
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
  glow: THREE.BufferAttribute
  alpha: THREE.BufferAttribute
  uniforms: {
    uPR: { value: number }
    uSize: { value: number }
    uGlowSize: { value: number }
    uColor: { value: THREE.Color }
    uGlowColor: { value: THREE.Color }
    uHaloColor: { value: THREE.Color }
    uHalo: { value: number }
  }
}

function makeDots(positions: Float32Array, size: number, glowSize: number, pr: number, baseAlpha: number): Dots {
  const count = positions.length / 3
  const glow = new THREE.BufferAttribute(new Float32Array(count), 1)
  const alpha = new THREE.BufferAttribute(new Float32Array(count).fill(baseAlpha), 1)
  glow.setUsage(THREE.DynamicDrawUsage)
  alpha.setUsage(THREE.DynamicDrawUsage)
  const position = new THREE.BufferAttribute(positions, 3)
  position.setUsage(THREE.DynamicDrawUsage)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', position)
  geometry.setAttribute('aGlow', glow)
  geometry.setAttribute('aAlpha', alpha)
  const uniforms = {
    uPR: { value: pr },
    uSize: { value: size },
    uGlowSize: { value: glowSize },
    uColor: { value: new THREE.Color() },
    uGlowColor: { value: new THREE.Color() },
    uHaloColor: { value: new THREE.Color() },
    uHalo: { value: 0.6 },
  }
  const points = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: DOT_VERTEX,
      fragmentShader: DOT_FRAGMENT,
    }),
  )
  return { points, glow, alpha, uniforms }
}

function paintDots(dots: Dots, palette: Palette): void {
  dots.uniforms.uColor.value.copy(palette.accent)
  dots.uniforms.uGlowColor.value.copy(palette.glow)
  dots.uniforms.uHaloColor.value.copy(palette.halo)
  dots.uniforms.uHalo.value = palette.dark ? 0.7 : 0.45
  dots.points.material.blending = palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending
  dots.points.material.needsUpdate = true
}

interface Piece {
  update(t: number): void
  paint(palette: Palette): void
  objects: THREE.Object3D[]
}

/* ------------------------------------------------------------------ read */

function buildRead(a: number, pr: number): Piece {
  /* six lines, the last one well clear of the title underneath */
  const ROWS = [0.82, 0.66, 0.5, 0.34, 0.18, 0.02]
  const STEP = 0.06
  const x0 = -a + MARGIN
  const positions: number[] = []
  const rowOf: number[] = []
  ROWS.forEach((y, r) => {
    const width = (a - MARGIN - x0) * (r === ROWS.length - 1 ? 0.55 : rand(0.86, 1))
    let x = x0
    while (x < x0 + width) {
      const word = 2 + Math.floor(Math.random() * 6)
      for (let k = 0; k < word && x < x0 + width; k++) {
        positions.push(x, y, 0)
        rowOf.push(r)
        x += STEP
      }
      x += STEP * 1.6
    }
  })
  const dots = makeDots(Float32Array.from(positions), 1.7, 8, pr, 0.3)

  /* the light: a soft band the width of the page */
  const beamU = { uColor: { value: new THREE.Color() }, uStrength: { value: 0 } }
  const beam = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * a + 0.4, 0.2),
    new THREE.ShaderMaterial({
      uniforms: beamU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uStrength; varying vec2 vUv;
        void main(){ float k = 1.0 - abs(vUv.y - 0.5) * 2.0; gl_FragColor = vec4(uColor, k * k * uStrength); }`,
    }),
  )

  const T = 5.6
  let palette: Palette | null = null
  return {
    objects: [beam, dots.points],
    paint(next) {
      palette = next
      paintDots(dots, next)
      beamU.uColor.value.copy(next.accent)
      beam.material.blending = next.dark ? THREE.AdditiveBlending : THREE.NormalBlending
      beam.material.needsUpdate = true
    },
    update(t) {
      const p = t % T
      const sweep = smooth(0, 2.7, p)
      /* from above the first line to just under the last: never over the title */
      const beamY = 0.96 - sweep * 0.98
      const on = smooth(0, 0.3, p) * (1 - smooth(2.7, 3.2, p))
      beam.position.y = beamY
      beamU.uStrength.value = on * (palette?.dark ? 0.32 : 0.22)
      /*
       * Once the page is read it stays read for a while, then fades back to
       * unread over a full second, and only then does the light come round
       * again. The read state comes from where the light is, not from the
       * clock, so nothing switches off — it only ever fades.
       */
      const reset = smooth(3.8, 4.9, p)
      const G = dots.glow.array
      const A = dots.alpha.array
      for (let i = 0; i < rowOf.length; i++) {
        const y = ROWS[rowOf[i]]
        const near = on * Math.exp(-Math.pow((y - beamY) / 0.09, 2))
        const read = beamY < y - 0.03 ? 1 : 0
        G[i] = Math.max(near, read * 0.22 * (1 - reset))
        A[i] = 0.3 + 0.55 * read * (1 - reset)
      }
      dots.glow.needsUpdate = true
      dots.alpha.needsUpdate = true
    },
  }
}

/* ---------------------------------------------------------------- screen */

function buildScreen(a: number, pr: number): Piece {
  const N = 16
  const cx = 0
  const cy = 0.34
  const r = 0.44
  const slots = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const th = -Math.PI / 2 + (i / N) * Math.PI * 2
    slots.set([cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0], i * 3)
  }
  const slotDots = makeDots(slots.slice(), 1.5, 6, pr, 0.26)
  const movers = makeDots(new Float32Array(N * 3), 2.3, 11, pr, 0.9)
  const scatter = (): Float32Array => {
    const out = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) out.set([rand(-a + 0.25, a - 0.25), rand(-0.05, 0.9), 0], i * 3)
    return out
  }
  let from = scatter()
  let next = scatter()

  /* the ring that closes once every place is taken */
  const RING = 72
  const ringPos = new Float32Array(RING * 3)
  const ringT = new Float32Array(RING)
  for (let i = 0; i < RING; i++) {
    const th = -Math.PI / 2 + (i / (RING - 1)) * Math.PI * 2
    ringPos.set([cx + Math.cos(th) * r, cy + Math.sin(th) * r, 0], i * 3)
    ringT[i] = i / (RING - 1)
  }
  const ringGeometry = new THREE.BufferGeometry()
  ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPos, 3))
  ringGeometry.setAttribute('aT', new THREE.BufferAttribute(ringT, 1))
  const ringU = { uColor: { value: new THREE.Color() }, uHead: { value: 0 }, uAlpha: { value: 0 } }
  const ring = new THREE.Line(
    ringGeometry,
    new THREE.ShaderMaterial({
      uniforms: ringU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uHead, uAlpha; varying float vT;
        void main(){ if (vT > uHead) discard; gl_FragColor = vec4(uColor, uAlpha); }`,
    }),
  )

  const T = 6.6
  const P = movers.points.geometry.getAttribute('position') as THREE.BufferAttribute
  let cycle = -1
  return {
    objects: [ring, slotDots.points, movers.points],
    paint(next) {
      paintDots(slotDots, next)
      paintDots(movers, next)
      ringU.uColor.value.copy(next.accent)
      ring.material.blending = next.dark ? THREE.AdditiveBlending : THREE.NormalBlending
      ring.material.needsUpdate = true
    },
    update(t) {
      const c = Math.floor(t / T)
      if (c !== cycle) {
        /* a new page of applicants each time round */
        if (cycle >= 0) {
          from = next
          next = scatter()
        }
        cycle = c
      }
      const p = t - c * T
      const G = movers.glow.array
      const SG = slotDots.glow.array
      const A = P.array
      for (let i = 0; i < N; i++) {
        const arrive = 0.3 + i * 0.085
        const inK = easeOut((p - arrive) / 1.0)
        const leave = 5.0 + i * 0.05
        const outK = smooth(leave, leave + 0.85, p)
        let x: number
        let y: number
        if (p < leave) {
          x = from[i * 3] + (slots[i * 3] - from[i * 3]) * inK
          y = from[i * 3 + 1] + (slots[i * 3 + 1] - from[i * 3 + 1]) * inK
        } else {
          x = slots[i * 3] + (next[i * 3] - slots[i * 3]) * outK
          y = slots[i * 3 + 1] + (next[i * 3 + 1] - slots[i * 3 + 1]) * outK
        }
        A[i * 3] = x
        A[i * 3 + 1] = y
        const seated = smooth(arrive + 0.75, arrive + 1.0, p) * (1 - outK)
        const landing = smooth(arrive + 0.8, arrive + 1.05, p) * (1 - smooth(arrive + 1.2, arrive + 2.6, p))
        G[i] = Math.max(landing, seated * 0.35)
        SG[i] = seated * 0.25
      }
      P.needsUpdate = true
      movers.glow.needsUpdate = true
      slotDots.glow.needsUpdate = true
      ringU.uHead.value = smooth(2.0, 2.9, p)
      ringU.uAlpha.value = 0.55 * (1 - smooth(5.0, 5.5, p))
    },
  }
}

/* ----------------------------------------------------------------- track */

function buildTrack(a: number, pr: number): Piece {
  const Y = [0.74, 0.44, 0.14]
  const x0 = -a + MARGIN
  const x1 = a - MARGIN
  const STOPS = [0, 0.34, 0.67, 1].map((f) => x0 + (x1 - x0) * f)

  const linePos = new Float32Array(Y.length * 2 * 3)
  const lineX = new Float32Array(Y.length * 2)
  const lineTrack = new Float32Array(Y.length * 2)
  Y.forEach((y, k) => {
    linePos.set([x0, y, 0, x1, y, 0], k * 6)
    lineX.set([x0, x1], k * 2)
    lineTrack.set([k, k], k * 2)
  })
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
  lineGeometry.setAttribute('aX', new THREE.BufferAttribute(lineX, 1))
  lineGeometry.setAttribute('aTrack', new THREE.BufferAttribute(lineTrack, 1))
  const lineU = {
    uColor: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uHead: { value: new THREE.Vector3() },
    uActive: { value: new THREE.Vector3() },
  }
  const lines = new THREE.LineSegments(
    lineGeometry,
    new THREE.ShaderMaterial({
      uniforms: lineU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `
        attribute float aX, aTrack; uniform vec3 uHead, uActive;
        varying float vX, vHead, vActive;
        void main(){
          vX = aX;
          vHead = aTrack < 0.5 ? uHead.x : (aTrack < 1.5 ? uHead.y : uHead.z);
          vActive = aTrack < 0.5 ? uActive.x : (aTrack < 1.5 ? uActive.y : uActive.z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor, uGlow; varying float vX, vHead, vActive;
        void main(){
          float pulse = exp(-pow((vX - vHead) / 0.1, 2.0)) * vActive;
          float done = step(vX, vHead) * vActive;
          float a = 0.16 + 0.24 * done + 0.7 * pulse;
          gl_FragColor = vec4(mix(uColor, uGlow, pulse), a);
        }`,
    }),
  )

  const nodePos = new Float32Array(Y.length * STOPS.length * 3)
  Y.forEach((y, k) => STOPS.forEach((x, j) => nodePos.set([x, y, 0], (k * STOPS.length + j) * 3)))
  const nodes = makeDots(nodePos, 2.0, 9, pr, 0.55)

  const T = 6.2
  const HOP = 0.7
  const GAP = 1.25
  return {
    objects: [lines, nodes.points],
    paint(next) {
      paintDots(nodes, next)
      lineU.uColor.value.copy(next.accent)
      lineU.uGlow.value.copy(next.glow)
      lines.material.blending = next.dark ? THREE.AdditiveBlending : THREE.NormalBlending
      lines.material.needsUpdate = true
    },
    update(t) {
      const G = nodes.glow.array
      const head = [0, 0, 0]
      const active = [0, 0, 0]
      Y.forEach((_, k) => {
        const p = (t + k * 1.7) % T
        /* where the pulse is: stop by stop, with a pause at each */
        let x = STOPS[0]
        for (let j = 0; j < STOPS.length - 1; j++) {
          const s = 0.4 + j * GAP
          x = STOPS[j] + (STOPS[j + 1] - STOPS[j]) * smooth(s, s + HOP, p)
          if (p < s + HOP) break
        }
        head[k] = x
        active[k] = smooth(0.05, 0.35, p) * (1 - smooth(4.7, 5.2, p))
        STOPS.forEach((_, j) => {
          const reached = j === 0 ? 0.1 : 0.4 + (j - 1) * GAP + HOP
          const last = j === STOPS.length - 1
          const glow =
            smooth(reached, reached + 0.2, p) * (1 - smooth(reached + 0.3, reached + (last ? 2.4 : 1.1), p)) * (last ? 1 : 0.8)
          G[k * STOPS.length + j] = Math.max(glow, active[k] * step(reached, p) * 0.18)
        })
      })
      lineU.uHead.value.set(head[0], head[1], head[2])
      lineU.uActive.value.set(active[0], active[1], active[2])
      nodes.glow.needsUpdate = true
    },
  }
}

const step = (edge: number, v: number): number => (v >= edge ? 1 : 0)

/* ------------------------------------------------------------------ mount */

export function mountCardScene(host: HTMLElement, kind: CardKind): CardSceneHandle {
  const reduced = prefersReducedMotion()
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const rect = host.getBoundingClientRect()
  const aspect = rect.height > 0 ? rect.width / rect.height : 1.42
  const pr = renderer.getPixelRatio()

  const piece = kind === 'read' ? buildRead(aspect, pr) : kind === 'screen' ? buildScreen(aspect, pr) : buildTrack(aspect, pr)
  for (const object of piece.objects) scene.add(object)

  const palette: Palette = { accent: new THREE.Color(), glow: new THREE.Color(), halo: new THREE.Color(), dark: false }
  const paint = (): void => {
    palette.dark = resolveTheme(getTheme()) === 'dark'
    palette.accent.set(palette.dark ? ACCENT[kind].dark : ACCENT[kind].light)
    if (palette.dark) {
      palette.glow.copy(palette.accent).lerp(new THREE.Color('#ffffff'), 0.55)
      palette.halo.copy(palette.accent).lerp(new THREE.Color('#ffffff'), 0.35)
    } else {
      palette.glow.copy(palette.accent).lerp(new THREE.Color('#074742'), 0.4)
      palette.halo.copy(palette.accent)
    }
    piece.paint(palette)
  }
  paint()

  let time = 0
  let last = 0
  let raf = 0
  let running = false

  const frame = (): void => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    time += dt
    piece.update(time)
    renderer.render(scene, camera)
  }
  const loop = (): void => {
    frame()
    raf = requestAnimationFrame(loop)
  }

  const fit = (): void => {
    const r = host.getBoundingClientRect()
    const width = Math.max(1, Math.round(r.width))
    const height = Math.max(1, Math.round(r.height))
    renderer.setSize(width, height, false)
    const a = width / height
    camera.left = -a
    camera.right = a
    camera.updateProjectionMatrix()
    if (reduced) frame()
  }
  const ro = new ResizeObserver(fit)
  ro.observe(host)
  fit()

  const onTheme = (): void => {
    paint()
    if (reduced || !running) frame()
  }
  const unsubscribeTheme = subscribeToTheme(onTheme)
  const unwatchSystem = watchSystemAppearance(onTheme)

  if (reduced) {
    /* one still, part way through, and nothing running */
    time = 1.7
    frame()
  }

  return {
    setRunning(on) {
      if (reduced || on === running) return
      running = on
      if (on) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      } else {
        cancelAnimationFrame(raf)
      }
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsubscribeTheme()
      unwatchSystem()
      for (const object of piece.objects) {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose()
          ;(object.material as THREE.Material).dispose()
        }
      }
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
