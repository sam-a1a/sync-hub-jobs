import * as THREE from 'three'
import { getTheme, resolveTheme, subscribeToTheme, watchSystemAppearance } from '../../lib/theme'
import { TONE_ACCENTS, getTone, subscribeToTone } from '../../lib/tone'
import { prefersReducedMotion } from '../../lib/transition'

/*
 * The field behind the hero.
 *
 * Two layers in one canvas, drawn in one pass:
 *
 *   - the wash: a full-bleed shader that rises from the floor of the hero as
 *     slow horizontal bands, coloured by the word the headline is on, with the
 *     previous word's colour lingering underneath so a change is a tide and
 *     not a cut;
 *   - the points: a few hundred to a couple of thousand of them, in three
 *     sizes, flowing very slowly across the whole width, each drifting a little
 *     on its own. Every second or so a few neighbours find each other: they
 *     glow, hairlines draw between them, hold, and let go. That is the product,
 *     drawn — people and roles finding one another — and it is why this is not
 *     just a gradient.
 *
 * Everything is in *scene units*: y runs from -1 at the bottom of the box to 1
 * at the top, and x from -aspect to aspect, so a distance means the same thing
 * whatever the viewport. The camera is orthographic and never moves; depth is
 * faked, by size and by how far each layer travels on scroll.
 *
 * Three things keep it out of the headline's way. The text sits in a
 * *clearing* — a rounded box measured off the h1 and the button, inside which
 * the points go almost silent and the wash calms down — and the clearing
 * follows the text as it drifts. The colours are the accents in `lib/tone`, at
 * hairline strength rather than pill strength. And the wash is strongest where
 * there is nothing to read: the floor of the section, and the gap below it.
 *
 * On scroll the hero itself drifts up and fades (`.hero-drift`); this stays
 * put and moves *down* a little, more for the small far points than the large
 * near ones, so the eye reads depth rather than a plane tipping over. Then it
 * fades, later than the text, so it is the last thing to leave.
 *
 * Colours are the CSS values verbatim, so colour management is off: three
 * would otherwise convert every hex to linear on the way in, and nothing in
 * these shaders converts back on the way out.
 */
THREE.ColorManagement.enabled = false

/* ---------------------------------------------------------------- tuning */

/** How fast the whole field flows sideways, in scene units per second. */
const CURRENT = 0.018

/** How long a match lasts, in seconds, from the first glow to the last. */
const MATCH_LIFE = 5.0

/** Simplex noise, the usual Ashima version, for the drift and the wash. */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`

/*
 * Where each point is, shared by the points and the lines between them so a
 * line always ends exactly on the dot it belongs to. The flow wraps a little
 * beyond either edge; the drift is two low-frequency noises; the pointer
 * pushes gently outward; and `clear` is how far outside the text's clearing
 * the point is, 0 inside to 1 well clear.
 */
const PLACE = /* glsl */ `
uniform float uTime, uPR, uSpan, uAspect, uScroll, uPointerStrength, uClearSoft, uFade, uLift;
uniform vec2 uPointer; uniform vec4 uClear;
${NOISE}
vec2 place(vec3 base, float seed, float layer, out float push, out float clear){
  float x = mod(base.x * uSpan + uTime * ${CURRENT.toFixed(4)} + uSpan, 2.0 * uSpan) - uSpan;
  float y = base.y;
  float amp = 0.018 + 0.012 * layer;
  x += amp * snoise(vec3(base.x * 3.0, base.y * 3.0, uTime * 0.08 + seed));
  y += amp * snoise(vec3(base.y * 3.0 + 7.0, base.x * 3.0, uTime * 0.07 + seed * 1.3));
  y -= uScroll * (0.26 - 0.08 * layer);
  vec2 d = vec2(x, y) - uPointer; float dist = length(d);
  push = (1.0 - smoothstep(0.0, 0.62, dist)) * uPointerStrength;
  vec2 p = vec2(x, y) + (d / max(dist, 0.001)) * push * 0.085;
  vec2 q = abs(p - uClear.xy) - uClear.zw;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  clear = smoothstep(0.0, uClearSoft, sd);
  return p;
}
float edges(vec2 p){
  return smoothstep(-1.08, -0.82, p.y) * smoothstep(1.06, 0.92, p.y)
       * smoothstep(uAspect + 0.05, uAspect - 0.25, abs(p.x));
}`

const rand = (a: number, b: number): number => a + Math.random() * (b - a)
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** Exponential ease towards a target: frame-rate independent, never overshoots. */
const ease = (cur: number, target: number, dt: number, speed: number): number =>
  cur + (target - cur) * (1 - Math.exp(-dt * speed))

interface Match {
  seed: number
  nodes: number[]
  slots: number[]
  birth: number
}

/* ------------------------------------------------------------------ mount */

/**
 * Builds the field into `host` and returns the teardown.
 *
 * `host` is the absolutely positioned box; its parent is the hero wrapper,
 * which is what the text is measured against and what the scroll progress is
 * read from. Throws if WebGL is not available — the caller treats that as
 * "no field", which is the right outcome.
 */
export function mountField(host: HTMLElement): () => void {
  const wrapper = host.parentElement ?? host
  const reduced = prefersReducedMotion()

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  /* ---- what the frame reads */
  let dark = resolveTheme(getTheme()) === 'dark'
  let scroll = 0
  /* 1 while the header's menu is open: the field rises to sit behind the glass. */
  let lift = 0
  let time = 0
  let width = 1
  let height = 1
  const pointer = { x: 0, y: 0, active: false }

  /*
   * The accent, eased between words. The pill takes 600ms on `--ease-standard`
   * to change tint; this takes the same, so the two arrive together. A theme
   * change is quicker — that is a cut everywhere else on the page.
   */
  const tone = {
    cur: new THREE.Color(),
    from: new THREE.Color(),
    to: new THREE.Color(),
    prev: new THREE.Color(),
    t0: -1e9,
    dur: 600,
    target(): THREE.Color {
      const accent = TONE_ACCENTS[getTone()]
      return new THREE.Color(dark ? accent.dark : accent.light)
    },
    go(dur: number): void {
      this.prev.copy(this.to)
      this.from.copy(this.cur)
      this.to = this.target()
      this.t0 = performance.now()
      this.dur = dur
    },
    tick(now: number): void {
      const k = clamp01((now - this.t0) / this.dur)
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
      this.cur.copy(this.from).lerp(this.to, e)
    },
  }
  tone.cur.copy(tone.target())
  tone.from.copy(tone.cur)
  tone.to.copy(tone.cur)
  tone.prev.copy(tone.cur)

  /* ---- the clearing, measured off the text at rest */
  const clearing = { cx: 0, cy: 0, rx: 1, ry: 0.5, soft: 0.42 }
  const measureClearing = (): void => {
    const h1 = wrapper.querySelector('h1')
    const cta = wrapper.querySelector('[data-block="button"]')
    if (!h1 || !cta) return
    const box = host.getBoundingClientRect()
    const a = h1.getBoundingClientRect()
    const b = cta.getBoundingClientRect()
    /* The hero has already drifted by this much; measure it where it rests. */
    const drift = scroll * 0.18 * window.innerHeight
    const top = a.top + drift
    const bottom = b.bottom + drift
    const left = Math.min(a.left, b.left)
    const right = Math.max(a.right, b.right)
    const aspect = box.width / box.height
    const toX = (px: number) => ((px - box.left) / box.width) * 2 - 1
    const toY = (py: number) => -(((py - box.top) / box.height) * 2 - 1)
    clearing.cx = ((toX(left) + toX(right)) / 2) * aspect
    clearing.cy = (toY(top) + toY(bottom)) / 2
    clearing.rx = ((toX(right) - toX(left)) / 2) * aspect + 0.06
    clearing.ry = (toY(top) - toY(bottom)) / 2 + 0.02
  }

  /* ------------------------------------------------------------ the wash */
  const washU = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uDark: { value: 0 },
    uScroll: { value: 0 },
    uPaper: { value: new THREE.Color('#ffffff') },
    uTone: { value: new THREE.Color() },
    uTone2: { value: new THREE.Color() },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uPointerStrength: { value: 0 },
    uClear: { value: new THREE.Vector4(0, 0, 1, 0.5) },
    uClearSoft: { value: 0.4 },
    uLift: { value: 0 },
  }
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: washU,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec2 uRes, uPointer;
        uniform float uTime, uDark, uScroll, uPointerStrength, uClearSoft, uLift;
        uniform vec3 uPaper, uTone, uTone2; uniform vec4 uClear;
        varying vec2 vUv;
        ${NOISE}
        float fbm(vec3 p){
          float f = 0.0, a = 0.55;
          for (int i = 0; i < 3; i++) { f += a * snoise(p); p = p * 2.0 + vec3(3.1, 1.7, 0.0); a *= 0.45; }
          return f;
        }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 uv = vUv; float aspect = uRes.x / uRes.y;
          vec2 P = vec2((uv.x * 2.0 - 1.0) * aspect, uv.y * 2.0 - 1.0);
          float t = uTime * 0.05;
          /* stretched sideways and flowing sideways: bands, not blobs */
          vec2 s = vec2(P.x * 0.22 - t * 0.35, P.y * 0.55);
          vec2 q = vec2(fbm(vec3(s, t)), fbm(vec3(s + vec2(5.2, 1.3), t * 0.9 + 3.0)));
          float f = fbm(vec3(s + 0.8 * q + vec2(1.7, 9.2), t * 0.6 + 1.0));
          float n = smoothstep(0.05, 0.95, clamp(f * 0.95 + 0.5, 0.0, 1.0));
          float pd = distance(P, uPointer);
          n += 0.14 * exp(-pd * pd * 2.5) * uPointerStrength;
          /* rises from the floor, thins to nothing behind the bar, and dissolves before the box ends */
          float w = pow(smoothstep(1.0, -0.55, P.y + uScroll * 0.5), 1.15);
          w *= smoothstep(-1.02, -0.66, P.y);
          /* with the menu open, a second wash gathers at the ceiling, behind the glass */
          float ceiling = pow(smoothstep(-0.3, 1.0, P.y), 1.3) * 0.85 * uLift;
          w = max(w, ceiling);
          w *= 1.0 - smoothstep(0.45, 1.0, uScroll);
          /* calmer behind the text */
          vec2 d = abs(P - uClear.xy) - uClear.zw;
          float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
          w *= mix(0.42, 1.0, smoothstep(0.0, uClearSoft * 1.6, sd));
          vec3 c = mix(uTone2, uTone, n);
          float strength = w * (0.4 + 0.6 * n);
          vec3 col = mix(mix(uPaper, c, strength * 0.5), uPaper + c * strength * 0.36, uDark);
          /* grain, so a slow gradient never bands */
          float g = hash(gl_FragCoord.xy + fract(uTime) * 7.0) - 0.5;
          col += g * mix(0.012, 0.02, uDark);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  )
  scene.add(wash)

  /* ---------------------------------------------------------- the points */
  const box = host.getBoundingClientRect()
  /* Enough to feel like a field at any size, never so many a phone notices. */
  const N = Math.round(Math.min(1800, Math.max(450, (box.width * box.height) / 650)))
  const base = new Float32Array(N * 3)
  const seed = new Float32Array(N)
  const layer = new Float32Array(N)
  const glow = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    base[i * 3] = rand(-1, 1)
    base[i * 3 + 1] = rand(-1.12, 1.12)
    seed[i] = Math.random() * 100
    const r = Math.random()
    layer[i] = r < 0.5 ? 0 : r < 0.82 ? 1 : 2
  }

  const U = {
    uTime: { value: 0 },
    uPR: { value: renderer.getPixelRatio() },
    uSpan: { value: 2.5 },
    uAspect: { value: 2 },
    uScroll: { value: 0 },
    uPointerStrength: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uClear: { value: new THREE.Vector4(0, 0, 1, 0.5) },
    uClearSoft: { value: 0.42 },
    uFade: { value: 1 },
    uLift: { value: 0 },
    uColor: { value: new THREE.Color() },
    uGlowColor: { value: new THREE.Color() },
    uHaloColor: { value: new THREE.Color() },
    uAlpha: { value: 0.75 },
    uHalo: { value: 0.5 },
  }

  const pointGeometry = new THREE.BufferGeometry()
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(base, 3))
  pointGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  pointGeometry.setAttribute('aLayer', new THREE.BufferAttribute(layer, 1))
  const glowAttr = new THREE.BufferAttribute(glow, 1)
  glowAttr.setUsage(THREE.DynamicDrawUsage)
  pointGeometry.setAttribute('aGlow', glowAttr)

  const points = new THREE.Points(
    pointGeometry,
    new THREE.ShaderMaterial({
      uniforms: U,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      /*
       * A matched point is drawn larger than it looks: the sprite grows to make
       * room for a halo, and `vCore` tells the fragment where the dot itself
       * ends so the dot stays the size it was and only the light around it
       * comes up.
       */
      vertexShader: /* glsl */ `${PLACE}
        attribute float aSeed, aLayer, aGlow;
        varying float vAlpha, vGlow, vCore;
        void main(){
          float push, clear;
          vec2 p = place(position, aSeed, aLayer, push, clear);
          gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
          /* under the glass the dots grow, so the blur has something to soften */
          float core = (1.75 + 0.8 * aLayer + push * 1.0 + aGlow * 0.9) * (1.0 + uLift * 0.9);
          float total = core + aGlow * 7.0;
          gl_PointSize = total * uPR;
          vCore = 0.5 * core / total;
          vAlpha = edges(p) * mix(0.05, 1.0, clear)
                 * (0.5 + 0.5 * fract(aSeed * 0.37)) * mix(0.5, 1.0, aLayer * 0.5) * uFade * (1.0 + uLift * 0.5);
          vGlow = clamp(aGlow + push * 0.35, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor, uGlowColor, uHaloColor; uniform float uAlpha, uHalo;
        varying float vAlpha, vGlow, vCore;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(vCore, vCore * 0.5, d);
          float halo = smoothstep(0.5, 0.04, d); halo = halo * halo * vGlow;
          vec3 col = mix(uColor, uGlowColor, vGlow);
          float a = core * mix(uAlpha, 1.0, vGlow);
          gl_FragColor = vec4(mix(col, uHaloColor, halo * (1.0 - core)), (a + halo * uHalo) * vAlpha);
        }`,
    }),
  )
  scene.add(points)

  /* ---------------------------------------------------------- the matches */
  const MAX = 64
  const V = MAX * 2
  const L = {
    pos: new THREE.BufferAttribute(new Float32Array(V * 3), 3),
    seed: new THREE.BufferAttribute(new Float32Array(V), 1),
    layer: new THREE.BufferAttribute(new Float32Array(V), 1),
    t: new THREE.BufferAttribute(new Float32Array(V), 1),
    birth: new THREE.BufferAttribute(new Float32Array(V).fill(-1e6), 1),
    order: new THREE.BufferAttribute(new Float32Array(V), 1),
  }
  for (const attribute of Object.values(L)) attribute.setUsage(THREE.DynamicDrawUsage)
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', L.pos)
  lineGeometry.setAttribute('aSeed', L.seed)
  lineGeometry.setAttribute('aLayer', L.layer)
  lineGeometry.setAttribute('aT', L.t)
  lineGeometry.setAttribute('aBirth', L.birth)
  lineGeometry.setAttribute('aOrder', L.order)
  const LU = { ...U, uLinkColor: { value: new THREE.Color() }, uLinkAlpha: { value: 0.85 } }
  const links = new THREE.LineSegments(
    lineGeometry,
    new THREE.ShaderMaterial({
      uniforms: LU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `${PLACE}
        attribute float aSeed, aLayer, aT, aBirth, aOrder;
        varying float vT, vAlpha, vAge, vOrder;
        void main(){
          float push, clear;
          vec2 p = place(position, aSeed, aLayer, push, clear);
          gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
          vT = aT; vAge = uTime - aBirth; vOrder = aOrder;
          vAlpha = edges(p) * mix(0.05, 1.0, clear) * uFade;
        }`,
      /*
       * Each line draws itself from its start, one after another down the
       * tree, holds, and fades. `vAge` is the time since the match was made,
       * so a slot that has never been used — born at minus a million — is
       * simply never visible.
       */
      fragmentShader: /* glsl */ `
        uniform vec3 uLinkColor; uniform float uLinkAlpha;
        varying float vT, vAlpha, vAge, vOrder;
        void main(){
          float grow = smoothstep(0.0, 0.9, vAge - vOrder * 0.22);
          if (vT > grow) discard;
          float fadeOut = 1.0 - smoothstep(${(MATCH_LIFE - 1.8).toFixed(2)}, ${(MATCH_LIFE - 0.4).toFixed(2)}, vAge);
          float a = vAlpha * uLinkAlpha * fadeOut * (0.5 + 0.5 * (1.0 - vT));
          if (a < 0.003) discard;
          gl_FragColor = vec4(uLinkColor, a);
        }`,
    }),
  )
  scene.add(links)

  const free: number[] = Array.from({ length: MAX }, (_, i) => i)
  const matches: Match[] = []
  let nextSpawn = 0.8

  /** Where point `i` is right now, without the drift — close enough to choose neighbours by. */
  const at = (i: number): [number, number] => {
    const span = U.uSpan.value
    const x = ((((base[i * 3] * span + time * CURRENT + span) % (2 * span)) + 2 * span) % (2 * span)) - span
    const y = base[i * 3 + 1] - scroll * (0.26 - 0.08 * layer[i])
    return [x, y]
  }
  const clearAt = (x: number, y: number): number => {
    const c = U.uClear.value
    const dx = Math.abs(x - c.x) - c.z
    const dy = Math.abs(y - c.y) - c.w
    const sd = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0)
    return clamp01(sd / U.uClearSoft.value)
  }

  /*
   * A match: one point, and its nearest few on the same layer. Each newcomer
   * joins whichever already-joined point it is closest to, so the lines grow
   * as a small tree rather than fanning out from one centre — a cluster
   * finding itself, not a hub with spokes.
   */
  const spawn = (now: number): void => {
    const aspect = U.uAspect.value
    let i = -1
    for (let tries = 0; tries < 30 && i < 0; tries++) {
      const c = Math.floor(Math.random() * N)
      const [x, y] = at(c)
      if (Math.abs(x) < aspect * 0.92 && y > -0.82 && y < 0.95 && clearAt(x, y) > 0.7) i = c
    }
    if (i < 0) return

    const [sx, sy] = at(i)
    const candidates: [number, number][] = []
    for (let j = 0; j < N; j++) {
      if (j === i || layer[j] !== layer[i]) continue
      const [x, y] = at(j)
      const d = (x - sx) ** 2 + (y - sy) ** 2
      if (d < 0.075) candidates.push([d, j])
    }
    if (candidates.length < 2) return
    candidates.sort((a, b) => a[0] - b[0])
    const nodes = candidates.slice(0, 3 + Math.floor(Math.random() * 3)).map((e) => e[1])

    const slots: number[] = []
    const joined = [i]
    const P = L.pos.array
    for (let k = 0; k < nodes.length && free.length; k++) {
      const s = free.pop() as number
      slots.push(s)
      const v = s * 2
      const j = nodes[k]
      const [jx, jy] = at(j)
      let from = i
      let best = Infinity
      for (const m of joined) {
        const [mx, my] = at(m)
        const d = (mx - jx) ** 2 + (my - jy) ** 2
        if (d < best) {
          best = d
          from = m
        }
      }
      joined.push(j)
      P[v * 3] = base[from * 3]
      P[v * 3 + 1] = base[from * 3 + 1]
      P[v * 3 + 2] = 0
      P[v * 3 + 3] = base[j * 3]
      P[v * 3 + 4] = base[j * 3 + 1]
      P[v * 3 + 5] = 0
      L.seed.array[v] = seed[from]
      L.seed.array[v + 1] = seed[j]
      L.layer.array[v] = layer[from]
      L.layer.array[v + 1] = layer[j]
      L.t.array[v] = 0
      L.t.array[v + 1] = 1
      L.birth.array[v] = now
      L.birth.array[v + 1] = now
      L.order.array[v] = k
      L.order.array[v + 1] = k
    }
    for (const attribute of Object.values(L)) attribute.needsUpdate = true
    matches.push({ seed: i, nodes: nodes.slice(0, slots.length), slots, birth: now })
  }

  /*
   * The glow of a matched point over its life: up over a little more than a
   * second, held, and down over the last second and a half. Slow on purpose —
   * a light coming on, not a flash — and `smoothstep` at both ends so there is
   * no instant where the rate changes.
   */
  const envelope = (age: number, start: number): number =>
    smooth(start, start + 1.2, age) * (1 - smooth(MATCH_LIFE - 1.8, MATCH_LIFE - 0.2, age))

  /* ------------------------------------------------------------ appearance */
  const applyTheme = (): void => {
    for (const material of [points.material, links.material]) {
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending
      material.needsUpdate = true
    }
    U.uAlpha.value = dark ? 0.8 : 0.75
    U.uHalo.value = dark ? 0.7 : 0.45
    LU.uLinkAlpha.value = dark ? 0.9 : 0.85
    washU.uDark.value = dark ? 1 : 0
    washU.uPaper.value.set(dark ? '#000000' : '#ffffff')
  }
  applyTheme()

  const onTheme = (): void => {
    const next = resolveTheme(getTheme()) === 'dark'
    if (next === dark) return
    dark = next
    applyTheme()
    tone.go(320)
    if (reduced) frame(true)
  }

  /* ---------------------------------------------------------------- input */
  let px = 0
  let py = 0
  let washPx = 0
  let washPy = 0

  const onPointer = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return
    const r = host.getBoundingClientRect()
    const nx = ((event.clientX - r.left) / r.width) * 2 - 1
    const ny = -(((event.clientY - r.top) / r.height) * 2 - 1)
    pointer.x = nx * (r.width / r.height)
    pointer.y = ny
    pointer.active = nx > -1.05 && nx < 1.05 && ny > -1.1 && ny < 1.1
  }
  const onLeave = (): void => {
    pointer.active = false
  }

  const fit = (): void => {
    const r = host.getBoundingClientRect()
    width = Math.max(1, Math.round(r.width))
    height = Math.max(1, Math.round(r.height))
    renderer.setSize(width, height, false)
    const aspect = width / height
    U.uAspect.value = aspect
    U.uSpan.value = aspect + 0.3
    U.uPR.value = renderer.getPixelRatio()
    washU.uRes.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio())
    measureClearing()
    if (reduced) frame(true)
  }

  /* ---------------------------------------------------------------- frame */
  const update = (dt: number): void => {
    /* the hero's own travel over its own height, exactly as `useScrollProgress` reads it */
    const r = wrapper.getBoundingClientRect()
    scroll = clamp01(-r.top / Math.max(1, r.height))

    U.uTime.value = time
    washU.uTime.value = time
    U.uScroll.value = scroll
    washU.uScroll.value = scroll
    U.uFade.value = 1 - clamp01((scroll - 0.5) / 0.5)
    lift = ease(lift, document.documentElement.dataset.menu === 'open' ? 1 : 0, dt, 2.4)
    U.uLift.value = lift
    washU.uLift.value = lift

    const driftUnits = (scroll * 0.18 * window.innerHeight) / (height / 2)
    U.uClear.value.set(clearing.cx, clearing.cy + driftUnits, clearing.rx, clearing.ry)
    washU.uClear.value.copy(U.uClear.value)
    U.uClearSoft.value = clearing.soft
    washU.uClearSoft.value = clearing.soft

    /*
     * The pointer, followed at two speeds: the points at a walking pace, the
     * wash slower still, so a lens opens and closes rather than snaps. When
     * the pointer first arrives the lens is placed under it directly — easing
     * in from wherever it was last left would sweep across the field.
     */
    if (pointer.active) {
      if (U.uPointerStrength.value < 0.02) {
        px = pointer.x
        py = pointer.y
        washPx = pointer.x
        washPy = pointer.y
      }
      px = ease(px, pointer.x, dt, 3)
      py = ease(py, pointer.y, dt, 3)
      washPx = ease(washPx, pointer.x, dt, 1.2)
      washPy = ease(washPy, pointer.y, dt, 1.2)
    }
    U.uPointer.value.set(px, py)
    washU.uPointer.value.set(washPx, washPy)
    U.uPointerStrength.value = ease(U.uPointerStrength.value, pointer.active ? 1 : 0, dt, 2.2)
    washU.uPointerStrength.value = ease(washU.uPointerStrength.value, pointer.active ? 1 : 0, dt, 1.4)

    /* colour */
    const c = tone.cur
    U.uColor.value.copy(c)
    if (dark) {
      U.uGlowColor.value.copy(c).lerp(new THREE.Color('#ffffff'), 0.55)
      U.uHaloColor.value.copy(c).lerp(new THREE.Color('#ffffff'), 0.35)
    } else {
      U.uGlowColor.value.copy(c).lerp(new THREE.Color('#074742'), 0.45)
      U.uHaloColor.value.copy(c)
    }
    LU.uLinkColor.value.copy(U.uGlowColor.value)
    washU.uTone.value.copy(c)
    washU.uTone2.value.copy(tone.prev).lerp(c, 0.25)

    /* matches */
    if (!reduced && time > nextSpawn && matches.length < 8) {
      spawn(time)
      nextSpawn = time + rand(0.8, 1.6)
    }
    if (reduced && matches.length === 0) {
      for (let k = 0; k < 6; k++) spawn(time - 1.6 - k * 0.3)
    }
    for (let m = matches.length - 1; m >= 0; m--) {
      const match = matches[m]
      const age = time - match.birth
      glow[match.seed] = envelope(age, 0)
      match.nodes.forEach((j, k) => {
        glow[j] = envelope(age, k * 0.22 + 0.4) * 0.85
      })
      if (age > MATCH_LIFE && !reduced) {
        glow[match.seed] = 0
        for (const j of match.nodes) glow[j] = 0
        for (const s of match.slots) {
          L.birth.array[s * 2] = -1e6
          L.birth.array[s * 2 + 1] = -1e6
          free.push(s)
        }
        L.birth.needsUpdate = true
        matches.splice(m, 1)
      }
    }
    glowAttr.needsUpdate = true
  }

  let last = performance.now()
  let visible = true
  let lost = false
  let raf = 0

  const frame = (force: boolean): void => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (lost) return
    if (!force && (!visible || document.hidden)) return
    time += dt
    tone.tick(now)
    update(dt)
    renderer.render(scene, camera)
    /* There is a picture now. The box fades up from here — see `HeroField.tsx`. */
    if (host.dataset.ready === undefined) host.dataset.ready = ''
  }
  const loop = (): void => {
    frame(false)
    raf = requestAnimationFrame(loop)
  }

  /* --------------------------------------------------------------- wiring */
  const canvas = renderer.domElement
  const onLost = (event: Event): void => {
    event.preventDefault()
    lost = true
  }
  const onRestored = (): void => {
    lost = false
    applyTheme()
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
    },
    { rootMargin: '80px' },
  )
  io.observe(host)
  const ro = new ResizeObserver(fit)
  ro.observe(host)
  ro.observe(wrapper)
  document.fonts?.ready.then(measureClearing).catch(() => undefined)

  const unsubscribeTone = subscribeToTone(() => tone.go(600))
  const unsubscribeTheme = subscribeToTheme(onTheme)
  const unwatchSystem = watchSystemAppearance(onTheme)

  window.addEventListener('pointermove', onPointer, { passive: true })
  document.addEventListener('mouseleave', onLeave)

  fit()
  if (reduced) {
    /* One still, with a few matches already made, and nothing running. */
    time = 6
    frame(true)
  } else {
    raf = requestAnimationFrame(loop)
  }

  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
    ro.disconnect()
    unsubscribeTone()
    unsubscribeTheme()
    unwatchSystem()
    window.removeEventListener('pointermove', onPointer)
    document.removeEventListener('mouseleave', onLeave)
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    pointGeometry.dispose()
    lineGeometry.dispose()
    wash.geometry.dispose()
    points.material.dispose()
    links.material.dispose()
    wash.material.dispose()
    renderer.dispose()
    canvas.remove()
  }
}
