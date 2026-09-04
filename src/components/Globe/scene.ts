import * as THREE from 'three'
import { getTheme, resolveTheme, subscribeToTheme, watchSystemAppearance } from '../../lib/theme'
import { prefersReducedMotion } from '../../lib/transition'

/*
 * The globe.
 *
 * A dotted earth — one point per patch of land, sampled evenly over the
 * sphere and kept where a mask says there is ground — with a soft body behind
 * the dots so the far side is hidden, a faint rim of atmosphere, and arcs.
 *
 * The arcs are the point. Every few seconds one leaves a capital somewhere in
 * the world, rides a great circle lifted off the surface, and lands in
 * Damascus. Where it lands, the node glows — slowly, the way the matched
 * points in the hero glow — and the arc holds for a moment before it lets go
 * of where it came from and flows the rest of the way in. Syria is where the
 * lines go; it is lit all the time, a little, because of that.
 *
 * It can be turned. Drag it and it follows with some weight and coasts to a
 * stop; leave it and it rocks gently, never far enough to lose Syria over the
 * horizon, and drifts back to where it was.
 *
 * Colours are the CSS values verbatim, so colour management is off — the
 * shaders below write sRGB straight out and nothing converts on the way.
 */
THREE.ColorManagement.enabled = false

/** Damascus. */
const SYRIA: [number, number] = [33.51, 36.29]

/**
 * Where the arcs come from: capitals, spread so that every side of the globe
 * has some. Latitude, longitude.
 */
const ORIGINS: [number, number][] = [
  [38.9, -77.0], [45.4, -75.7], [19.4, -99.1], [4.7, -74.1], [-15.8, -47.9], [-34.6, -58.4],
  [-33.4, -70.7], [51.5, -0.1], [53.3, -6.3], [38.7, -9.1], [40.4, -3.7], [48.9, 2.3],
  [52.4, 4.9], [52.5, 13.4], [41.9, 12.5], [59.3, 18.1], [59.9, 10.8], [52.2, 21.0],
  [50.5, 30.5], [37.98, 23.7], [39.9, 32.9], [55.8, 37.6], [51.2, 71.4], [35.7, 51.4],
  [33.3, 44.4], [31.9, 35.9], [33.9, 35.5], [30.0, 31.2], [24.7, 46.7], [25.3, 51.5],
  [24.5, 54.4], [29.4, 48.0], [34.0, -6.8], [36.8, 3.1], [9.1, 7.5], [9.0, 38.7],
  [-1.3, 36.8], [-25.7, 28.2], [33.7, 73.0], [28.6, 77.2], [23.8, 90.4], [13.8, 100.5],
  [3.1, 101.7], [1.3, 103.8], [-6.2, 106.8], [21.0, 105.8], [39.9, 116.4], [37.6, 127.0],
  [35.7, 139.7], [-35.3, 149.1], [-41.3, 174.8],
]

/* The life of an arc, in seconds. */
const TRAVEL = 1.9 /* leaving to landing */
const HOLD = 1.3 /* held whole after landing */
const RELEASE = 1.7 /* the tail flowing in after that */
const ARC_LIFE = TRAVEL + HOLD + RELEASE
const SEGMENTS = 56
const MAX_ARCS = 10

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const ease = (cur: number, target: number, dt: number, speed: number): number =>
  cur + (target - cur) * (1 - Math.exp(-dt * speed))
const rand = (a: number, b: number): number => a + Math.random() * (b - a)

/** A point on the unit sphere, from degrees. Longitude 0 faces the camera at rest. */
function toSphere(lat: number, lon: number, target = new THREE.Vector3()): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180
  const theta = (lon * Math.PI) / 180
  return target.set(Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta))
}

/** The dot shader, shared by the land and the nodes; only the sizes and colours differ. */
const DOT_VERTEX = /* glsl */ `
  attribute float aGlow;
  uniform float uPR, uSize, uGlowSize;
  varying float vAlpha, vGlow, vCore;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    /* the limb fades: a dot seen edge-on is barely there */
    vec3 n = normalize(normalMatrix * position);
    float facing = dot(n, normalize(-mv.xyz));
    vAlpha = smoothstep(-0.05, 0.4, facing);
    float core = uSize + aGlow * 1.2;
    float total = core + aGlow * uGlowSize;
    gl_PointSize = total * uPR;
    vCore = 0.5 * core / total;
    vGlow = aGlow;
  }`
const DOT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor, uGlowColor, uHaloColor; uniform float uAlpha, uHalo;
  varying float vAlpha, vGlow, vCore;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(vCore, vCore * 0.5, d);
    float halo = smoothstep(0.5, 0.04, d); halo = halo * halo * vGlow;
    vec3 col = mix(uColor, uGlowColor, vGlow);
    float a = core * mix(uAlpha, 1.0, vGlow);
    gl_FragColor = vec4(mix(col, uHaloColor, halo * (1.0 - core)), (a + halo * uHalo) * vAlpha);
  }`

interface Arc {
  origin: number
  slot: number
  birth: number
}

/**
 * Reads the land mask and returns the dots: unit vectors, one per patch of
 * ground. The mask is an equirectangular bitmap; the candidates are a
 * Fibonacci spiral, which is the cheapest way to cover a sphere evenly.
 */
async function landDots(count: number): Promise<Float32Array> {
  const image = new Image()
  image.src = '/images/globe/land.png'
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return new Float32Array(0)
  context.drawImage(image, 0, 0)
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)

  const golden = Math.PI * (3 - Math.sqrt(5))
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    const lat = Math.asin(y)
    const lon = Math.atan2(x, z)
    const u = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * width) % width
    const v = Math.min(height - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * height))
    if (data[(v * width + u) * 4] > 128) out.push(x, y, z)
  }
  return Float32Array.from(out)
}

/* ------------------------------------------------------------------ mount */

export function mountGlobe(host: HTMLElement): () => void {
  const reduced = prefersReducedMotion()
  let disposed = false

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20)

  /* Everything that is the earth turns together. */
  const earth = new THREE.Group()
  scene.add(earth)

  let dark = resolveTheme(getTheme()) === 'dark'
  let time = 0

  /* ------------------------------------------------------------- the body */
  const bodyU = {
    uTime: { value: 0 },
    uBase: { value: new THREE.Color() },
    uRim: { value: new THREE.Color() },
    uRimStrength: { value: 0.5 },
  }
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.995, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: bodyU,
      vertexShader: /* glsl */ `
        varying float vFacing, vAngle;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vFacing = dot(n, normalize(-mv.xyz));
          /* where on the disc this is, as seen: the light goes round by this */
          vAngle = atan(mv.y - centre.y, mv.x - centre.x);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uBase, uRim; uniform float uRimStrength, uTime;
        varying float vFacing, vAngle;
        void main(){
          float rim = pow(1.0 - clamp(vFacing, 0.0, 1.0), 2.6);
          float light = 0.7 + 0.3 * sin(vAngle - uTime * 0.35);
          gl_FragColor = vec4(mix(uBase, uRim, rim * light * uRimStrength), 1.0);
        }`,
    }),
  )
  earth.add(body)

  /*
   * The atmosphere: a square behind the globe with a soft ring painted on it,
   * brightest just outside the limb and gone a fifth of a radius further out.
   * The body is drawn in front and covers the inside of the ring, so what
   * shows is only the light past the edge. A shell around the sphere is the
   * usual way to do this and it draws its own outline; a flat halo does not.
   */
  const airU = { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uStrength: { value: 0.3 } }
  const air = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.8),
    new THREE.ShaderMaterial({
      uniforms: airU,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      /*
       * One light, going slowly round the limb — a revolution every eighteen
       * seconds or so — with a second, fainter one at three times the
       * frequency going the other way so the two never quite repeat, and a
       * breath under both. The body's rim reads the same first term, so the
       * light on the edge of the earth and the light in the air beside it
       * are the same light.
       */
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uStrength, uTime;
        varying vec2 vUv;
        void main(){
          vec2 c = vUv - 0.5; float r = length(c) * 2.8; float ang = atan(c.y, c.x);
          float band = exp(-pow(max(r - 0.995, 0.0) / 0.105, 1.5)) * smoothstep(1.3, 1.08, r);
          float light = 0.7 + 0.3 * sin(ang - uTime * 0.35) + 0.1 * sin(ang * 3.0 + uTime * 0.2);
          float breath = 0.92 + 0.08 * sin(uTime * 0.7);
          gl_FragColor = vec4(uColor, band * light * breath * uStrength);
        }`,
    }),
  )
  scene.add(air)

  /* ------------------------------------------------------------- the land */
  const landU = {
    uPR: { value: renderer.getPixelRatio() },
    uSize: { value: 1.6 },
    uGlowSize: { value: 0 },
    uColor: { value: new THREE.Color() },
    uGlowColor: { value: new THREE.Color() },
    uHaloColor: { value: new THREE.Color() },
    uAlpha: { value: 0.6 },
    uHalo: { value: 0 },
  }
  const landGeometry = new THREE.BufferGeometry()
  const land = new THREE.Points(
    landGeometry,
    new THREE.ShaderMaterial({
      uniforms: landU,
      transparent: true,
      depthWrite: false,
      vertexShader: DOT_VERTEX,
      fragmentShader: DOT_FRAGMENT,
    }),
  )
  land.visible = false
  earth.add(land)

  landDots(26000)
    .then((dots) => {
      if (disposed) return
      landGeometry.setAttribute('position', new THREE.BufferAttribute(dots, 3))
      landGeometry.setAttribute('aGlow', new THREE.BufferAttribute(new Float32Array(dots.length / 3), 1))
      land.visible = true
      if (reduced) frame(true)
      /* The world is there. The box fades up from here — see `Globe.tsx`. */
      host.dataset.ready = ''
    })
    .catch(() => {
      if (!disposed) host.dataset.ready = ''
    })

  /* ------------------------------------------------------------ the nodes */
  const nodeCount = ORIGINS.length + 1
  const nodePositions = new Float32Array(nodeCount * 3)
  const nodeGlow = new Float32Array(nodeCount)
  const nodeVectors: THREE.Vector3[] = []
  ORIGINS.forEach(([lat, lon], i) => {
    const v = toSphere(lat, lon).multiplyScalar(1.006)
    nodeVectors.push(v)
    nodePositions.set([v.x, v.y, v.z], i * 3)
  })
  const SYRIA_INDEX = ORIGINS.length
  const syria = toSphere(SYRIA[0], SYRIA[1]).multiplyScalar(1.006)
  nodeVectors.push(syria)
  nodePositions.set([syria.x, syria.y, syria.z], SYRIA_INDEX * 3)

  const nodeGlowAttr = new THREE.BufferAttribute(nodeGlow, 1)
  nodeGlowAttr.setUsage(THREE.DynamicDrawUsage)
  const nodeGeometry = new THREE.BufferGeometry()
  nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3))
  nodeGeometry.setAttribute('aGlow', nodeGlowAttr)
  const nodeU = {
    uPR: { value: renderer.getPixelRatio() },
    uSize: { value: 2.4 },
    uGlowSize: { value: 12 },
    uColor: { value: new THREE.Color() },
    uGlowColor: { value: new THREE.Color() },
    uHaloColor: { value: new THREE.Color() },
    uAlpha: { value: 0.9 },
    uHalo: { value: 0.7 },
  }
  const nodes = new THREE.Points(
    nodeGeometry,
    new THREE.ShaderMaterial({
      uniforms: nodeU,
      transparent: true,
      depthWrite: false,
      vertexShader: DOT_VERTEX,
      fragmentShader: DOT_FRAGMENT,
    }),
  )
  earth.add(nodes)

  /* ------------------------------------------------------------- the arcs */
  const V = MAX_ARCS * SEGMENTS * 2
  const arcPos = new THREE.BufferAttribute(new Float32Array(V * 3), 3)
  const arcT = new THREE.BufferAttribute(new Float32Array(V), 1)
  const arcBirth = new THREE.BufferAttribute(new Float32Array(V).fill(-1e6), 1)
  for (const attribute of [arcPos, arcT, arcBirth]) attribute.setUsage(THREE.DynamicDrawUsage)
  const arcGeometry = new THREE.BufferGeometry()
  arcGeometry.setAttribute('position', arcPos)
  arcGeometry.setAttribute('aT', arcT)
  arcGeometry.setAttribute('aBirth', arcBirth)
  const arcU = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color() },
    uHead: { value: new THREE.Color() },
    uAlpha: { value: 0.8 },
  }
  const arcs = new THREE.LineSegments(
    arcGeometry,
    new THREE.ShaderMaterial({
      uniforms: arcU,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aT, aBirth; uniform float uTime;
        varying float vT, vAge;
        void main(){
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vT = aT; vAge = uTime - aBirth;
        }`,
      /*
       * The head travels from origin to Syria on an ease, the whole arc holds,
       * then the tail follows the head in. A bright run just behind the head
       * is what makes it read as something travelling rather than a line
       * being drawn.
       */
      fragmentShader: /* glsl */ `
        uniform vec3 uColor, uHead; uniform float uAlpha;
        varying float vT, vAge;
        void main(){
          float head = smoothstep(0.0, ${TRAVEL.toFixed(2)}, vAge);
          float tail = smoothstep(${(TRAVEL + HOLD).toFixed(2)}, ${ARC_LIFE.toFixed(2)}, vAge);
          if (vT > head || vT < tail) discard;
          float lead = smoothstep(head - 0.28, head, vT) * (1.0 - step(1.0, head));
          float a = uAlpha * (0.38 + 0.62 * lead) * (1.0 - smoothstep(0.85, 1.0, tail));
          gl_FragColor = vec4(mix(uColor, uHead, lead * 0.7), a);
        }`,
    }),
  )
  earth.add(arcs)

  const free: number[] = Array.from({ length: MAX_ARCS }, (_, i) => i)
  const live: Arc[] = []
  let nextLaunch = 1.2

  const scratch = new THREE.Vector3()
  const toCamera = new THREE.Vector3()

  /** How squarely a node faces the viewer: 1 dead centre, 0 on the limb, negative behind. */
  const facing = (v: THREE.Vector3): number => {
    earth.localToWorld(scratch.copy(v))
    toCamera.copy(camera.position).sub(scratch).normalize()
    return scratch.normalize().dot(toCamera)
  }

  /**
   * Lays an arc into a free slot: the great circle between the two points,
   * lifted off the surface by an amount that grows with the distance, so a
   * neighbour's arc is a low hop and one from across the world climbs.
   */
  const launch = (now: number): void => {
    if (!free.length) return
    /* prefer somewhere the viewer can see leaving; anywhere, failing that */
    let origin = -1
    for (let tries = 0; tries < 12 && origin < 0; tries++) {
      const i = Math.floor(Math.random() * ORIGINS.length)
      if (live.some((a) => a.origin === i)) continue
      if (facing(nodeVectors[i]) > 0.12 || tries === 11) origin = i
    }
    if (origin < 0) return

    const slot = free.pop() as number
    const a = nodeVectors[origin].clone().normalize()
    const b = syria.clone().normalize()
    const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
    const lift = 0.06 + 0.24 * (omega / Math.PI)
    const sinOmega = Math.sin(omega)
    const P = arcPos.array
    const base = slot * SEGMENTS * 2
    const point = (t: number): THREE.Vector3 => {
      const wa = sinOmega < 1e-4 ? 1 - t : Math.sin((1 - t) * omega) / sinOmega
      const wb = sinOmega < 1e-4 ? t : Math.sin(t * omega) / sinOmega
      return new THREE.Vector3()
        .addScaledVector(a, wa)
        .addScaledVector(b, wb)
        .normalize()
        .multiplyScalar(1.004 + lift * Math.sin(Math.PI * t))
    }
    for (let s = 0; s < SEGMENTS; s++) {
      const t0 = s / SEGMENTS
      const t1 = (s + 1) / SEGMENTS
      const p0 = point(t0)
      const p1 = point(t1)
      const v = base + s * 2
      P[v * 3] = p0.x
      P[v * 3 + 1] = p0.y
      P[v * 3 + 2] = p0.z
      P[v * 3 + 3] = p1.x
      P[v * 3 + 4] = p1.y
      P[v * 3 + 5] = p1.z
      arcT.array[v] = t0
      arcT.array[v + 1] = t1
      arcBirth.array[v] = now
      arcBirth.array[v + 1] = now
    }
    arcPos.needsUpdate = true
    arcT.needsUpdate = true
    arcBirth.needsUpdate = true
    live.push({ origin, slot, birth: now })
  }

  /* --------------------------------------------------------- appearance */
  const applyTheme = (): void => {
    const teal = new THREE.Color(dark ? '#51c2ba' : '#0e867e')
    const white = new THREE.Color('#ffffff')
    if (dark) {
      bodyU.uBase.value.set('#0a1615')
      bodyU.uRim.value.set('#153a36')
      bodyU.uRimStrength.value = 0.9
      airU.uColor.value.copy(teal)
      airU.uStrength.value = 0.34
      air.material.blending = THREE.AdditiveBlending
      landU.uColor.value.set('#3f8a83')
      landU.uAlpha.value = 0.62
      nodeU.uColor.value.copy(teal)
      nodeU.uGlowColor.value.copy(teal).lerp(white, 0.6)
      nodeU.uHaloColor.value.copy(teal).lerp(white, 0.35)
      nodeU.uHalo.value = 0.7
      arcU.uColor.value.copy(teal)
      arcU.uHead.value.copy(teal).lerp(white, 0.7)
      arcU.uAlpha.value = 0.85
    } else {
      bodyU.uBase.value.set('#ffffff')
      bodyU.uRim.value.set('#d5ecea')
      bodyU.uRimStrength.value = 1.0
      airU.uColor.value.set('#a4ded9')
      airU.uStrength.value = 0.42
      air.material.blending = THREE.NormalBlending
      landU.uColor.value.set('#7fb3ad')
      landU.uAlpha.value = 0.7
      nodeU.uColor.value.copy(teal)
      nodeU.uGlowColor.value.set('#074742')
      nodeU.uHaloColor.value.copy(teal)
      nodeU.uHalo.value = 0.45
      arcU.uColor.value.copy(teal)
      arcU.uHead.value.set('#074742')
      arcU.uAlpha.value = 0.8
    }
    for (const material of [nodes.material, arcs.material]) {
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending
      material.needsUpdate = true
    }
    air.material.needsUpdate = true
  }
  applyTheme()

  const onTheme = (): void => {
    const next = resolveTheme(getTheme()) === 'dark'
    if (next === dark) return
    dark = next
    applyTheme()
    if (reduced) frame(true)
  }

  /* ------------------------------------------------------------- turning */
  /*
   * Three angles add up to where the globe is. The rest position puts
   * Damascus in front, a little above centre, with the pole leaning towards
   * the viewer. The rock is a slow swing either side of that. And the drag is
   * whatever the visitor has done to it, which eases home once let go.
   */
  const REST_YAW = -(SYRIA[1] * Math.PI) / 180
  const REST_PITCH = 0.32
  let dragYaw = 0
  let dragPitch = 0
  let velocityYaw = 0
  let velocityPitch = 0
  let dragging = false
  let lastX = 0
  let lastY = 0
  let lastMove = 0
  let idleFor = 0

  const onDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    lastMove = performance.now()
    velocityYaw = 0
    velocityPitch = 0
    host.setPointerCapture(event.pointerId)
  }
  const onMove = (event: PointerEvent): void => {
    if (!dragging) return
    const now = performance.now()
    const dt = Math.max(1, now - lastMove) / 1000
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    lastMove = now
    const k = 0.0055
    dragYaw += dx * k
    dragPitch = THREE.MathUtils.clamp(dragPitch + dy * k, -0.9, 0.9)
    velocityYaw = (dx * k) / dt
    velocityPitch = (dy * k) / dt
    idleFor = 0
  }
  const onUp = (event: PointerEvent): void => {
    if (!dragging) return
    dragging = false
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
    /* a fling that ended a while ago is a stop, not a throw */
    if (performance.now() - lastMove > 80) {
      velocityYaw = 0
      velocityPitch = 0
    }
  }

  /* ---------------------------------------------------------------- frame */
  const update = (dt: number): void => {
    arcU.uTime.value = time
    airU.uTime.value = time
    bodyU.uTime.value = time

    /* turning */
    if (!dragging) {
      dragYaw += velocityYaw * dt
      dragPitch = THREE.MathUtils.clamp(dragPitch + velocityPitch * dt, -0.9, 0.9)
      velocityYaw = ease(velocityYaw, 0, dt, 2.4)
      velocityPitch = ease(velocityPitch, 0, dt, 2.4)
      idleFor += dt
      /* home again, slowly, once the visitor has had their look */
      if (idleFor > 2.5) {
        dragYaw = ease(dragYaw, 0, dt, 0.35)
        dragPitch = ease(dragPitch, 0, dt, 0.35)
      }
    }
    const rock = reduced ? 0 : Math.sin(time * 0.11) * 0.42
    earth.rotation.set(REST_PITCH + dragPitch, REST_YAW + rock + dragYaw, 0)
    earth.updateMatrixWorld()

    /* arcs */
    if (!reduced && time > nextLaunch && live.length < MAX_ARCS - 2) {
      launch(time)
      nextLaunch = time + rand(0.7, 1.5)
    }
    if (reduced && live.length === 0) {
      for (let k = 0; k < 4; k++) launch(time - 0.6 - k * 0.9)
    }

    /* glow: origins light as they leave, Syria as each one lands */
    nodeGlow.fill(0)
    let landing = 0
    for (let i = live.length - 1; i >= 0; i--) {
      const arc = live[i]
      const age = time - arc.birth
      nodeGlow[arc.origin] = Math.max(
        nodeGlow[arc.origin],
        smooth(0, 0.7, age) * (1 - smooth(TRAVEL * 0.6, TRAVEL + 0.6, age)) * 0.8,
      )
      landing = Math.max(landing, smooth(TRAVEL - 0.3, TRAVEL + 0.9, age) * (1 - smooth(TRAVEL + 1.0, TRAVEL + 3.2, age)))
      if (age > ARC_LIFE + 0.2 && !reduced) {
        const base = arc.slot * SEGMENTS * 2
        for (let v = base; v < base + SEGMENTS * 2; v++) arcBirth.array[v] = -1e6
        arcBirth.needsUpdate = true
        free.push(arc.slot)
        live.splice(i, 1)
      }
    }
    /* Syria is never off: a slow breath underneath whatever lands */
    const breath = 0.26 + 0.08 * Math.sin(time * 1.1)
    nodeGlow[SYRIA_INDEX] = Math.max(breath, landing)
    nodeGlowAttr.needsUpdate = true
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
    update(dt)
    renderer.render(scene, camera)
  }
  const loop = (): void => {
    frame(false)
    raf = requestAnimationFrame(loop)
  }

  const fit = (): void => {
    const r = host.getBoundingClientRect()
    const width = Math.max(1, Math.round(r.width))
    const height = Math.max(1, Math.round(r.height))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    /*
     * How much of the box's height the sphere takes, and where it sits.
     *
     * In the footer's row it keeps right, so the sphere ends at the column's
     * edge and the light around it has the rest; in the phone's band it sits
     * in the middle and takes more of the height, because there is nothing
     * beside it. Height, not width, either way — the box is wider than it is
     * tall and the sphere is round.
     */
    const centred = host.dataset.align === 'centre'
    const fill = centred ? 0.84 : 0.76
    const across = centred ? 0 : -0.22
    const distance = 1 / (fill * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    camera.position.set(across, 0, distance)
    camera.lookAt(across, 0, 0)
    landU.uPR.value = renderer.getPixelRatio()
    nodeU.uPR.value = renderer.getPixelRatio()
    if (reduced) frame(true)
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
    { rootMargin: '40px' },
  )
  io.observe(host)
  const ro = new ResizeObserver(fit)
  ro.observe(host)

  const unsubscribeTheme = subscribeToTheme(onTheme)
  const unwatchSystem = watchSystemAppearance(onTheme)

  host.addEventListener('pointerdown', onDown)
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerup', onUp)
  host.addEventListener('pointercancel', onUp)

  fit()
  if (reduced) {
    time = 4
    frame(true)
  } else {
    raf = requestAnimationFrame(loop)
  }

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    io.disconnect()
    ro.disconnect()
    unsubscribeTheme()
    unwatchSystem()
    host.removeEventListener('pointerdown', onDown)
    host.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerup', onUp)
    host.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    for (const object of [body, air, land, nodes, arcs]) {
      object.geometry.dispose()
      object.material.dispose()
    }
    renderer.dispose()
    canvas.remove()
  }
}
