import * as THREE from 'three'
import { getTheme, resolveTheme, subscribeToTheme, watchSystemAppearance } from '../../lib/theme'
import { prefersReducedMotion } from '../../lib/transition'

THREE.ColorManagement.enabled = false

export type Phase = 'warp' | 'drift' | 'jump'

export interface SkyHandle {
  setPhase(phase: Phase): void
  dispose(): void
}

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

const ease = (cur: number, target: number, dt: number, speed: number): number =>
  cur + (target - cur) * (1 - Math.exp(-dt * speed))

const DEPTH = 90
const NEAR = 1.5

const STAR_PLACE = /* glsl */ `
uniform float uTravel, uStretch, uPR;
attribute float aSeed;
float depthOf(vec3 base){ return mod(base.z + uTravel, ${DEPTH.toFixed(1)}); }
vec3 place(vec3 base, float back){
  float d = depthOf(base) + back * uStretch * (0.6 + 0.4 * aSeed);
  return vec3(base.x, base.y, -${NEAR.toFixed(1)} - d);
}
float fadeOf(float z){ return smoothstep(-${NEAR.toFixed(1)}, -6.0, z) * smoothstep(-${DEPTH.toFixed(1)}, -50.0, z); }`

export function mountSky(host: HTMLElement): SkyHandle {
  const reduced = prefersReducedMotion()
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200)


  const washU = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uA: { value: new THREE.Color() },
    uB: { value: new THREE.Color() },
    uStrength: { value: 0.5 },
  }
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: washU,
      depthWrite: false,
      depthTest: false,
      transparent: true,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec2 uRes; uniform float uTime, uStrength; uniform vec3 uA, uB;
        varying vec2 vUv;
        ${NOISE}
        float fbm(vec3 p){ float f = 0.0, a = 0.55; for (int i = 0; i < 3; i++) { f += a * snoise(p); p = p * 2.0 + vec3(3.1, 1.7, 0.0); a *= 0.45; } return f; }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          float aspect = uRes.x / uRes.y;
          vec2 P = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
          float t = uTime * 0.04;
          vec2 s = vec2(P.x * 0.5 - t * 0.3, P.y * 0.8);
          vec2 q = vec2(fbm(vec3(s, t)), fbm(vec3(s + vec2(5.2, 1.3), t * 0.9 + 3.0)));
          float f = fbm(vec3(s + 0.8 * q, t * 0.6 + 1.0));
          float n = smoothstep(0.05, 0.95, clamp(f * 0.95 + 0.5, 0.0, 1.0));
          float r = length(P);
          float w = smoothstep(0.1, 0.95, r) * uStrength;
          vec3 c = mix(uB, uA, n);
          float a = w * (0.35 + 0.65 * n);
          float g = hash(gl_FragCoord.xy + fract(uTime) * 7.0) - 0.5;
          gl_FragColor = vec4(c + g * 0.02, a);
        }`,
    }),
  )
  scene.add(wash)

  const N = 2200
  const base = new Float32Array(N * 3)
  const seed = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(Math.random()) * 26 + 0.8
    const th = Math.random() * Math.PI * 2
    base[i * 3] = Math.cos(th) * r
    base[i * 3 + 1] = Math.sin(th) * r * 0.75
    base[i * 3 + 2] = Math.random() * DEPTH
    seed[i] = Math.random()
  }
  const starU = {
    uTravel: { value: 0 },
    uStretch: { value: 0 },
    uPR: { value: renderer.getPixelRatio() },
    uColor: { value: new THREE.Color() },
    uHead: { value: new THREE.Color() },
    uAlpha: { value: 0.9 },
  }
  const linePos = new Float32Array(N * 2 * 3)
  const lineSeed = new Float32Array(N * 2)
  const lineEnd = new Float32Array(N * 2)
  for (let i = 0; i < N; i++) {
    for (let e = 0; e < 2; e++) {
      linePos.set([base[i * 3], base[i * 3 + 1], base[i * 3 + 2]], (i * 2 + e) * 3)
      lineSeed[i * 2 + e] = seed[i]
      lineEnd[i * 2 + e] = e
    }
  }
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
  lineGeometry.setAttribute('aSeed', new THREE.BufferAttribute(lineSeed, 1))
  lineGeometry.setAttribute('aEnd', new THREE.BufferAttribute(lineEnd, 1))
  const streaks = new THREE.LineSegments(
    lineGeometry,
    new THREE.ShaderMaterial({
      uniforms: starU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `${STAR_PLACE}
        attribute float aEnd; varying float vEnd, vFade, vSeed;
        void main(){
          vec3 p = place(position, aEnd);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vEnd = aEnd; vFade = fadeOf(p.z); vSeed = aSeed;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor, uHead; uniform float uAlpha, uStretch;
        varying float vEnd, vFade, vSeed;
        void main(){
          float a = (1.0 - vEnd) * vFade * uAlpha * smoothstep(0.0, 0.6, uStretch) * (0.5 + 0.5 * vSeed);
          gl_FragColor = vec4(mix(uColor, uHead, (1.0 - vEnd) * 0.6), a);
        }`,
    }),
  )
  scene.add(streaks)
  const pointGeometry = new THREE.BufferGeometry()
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(base, 3))
  pointGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const points = new THREE.Points(
    pointGeometry,
    new THREE.ShaderMaterial({
      uniforms: starU,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      vertexShader: /* glsl */ `${STAR_PLACE}
        varying float vFade, vSeed;
        void main(){
          vec3 p = place(position, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.2 + 2.2 * aSeed) * uPR * clamp(14.0 / -mv.z, 0.35, 2.5);
          vFade = fadeOf(p.z); vSeed = aSeed;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor, uHead; uniform float uAlpha, uStretch;
        varying float vFade, vSeed;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float core = smoothstep(0.5, 0.2, d);
          float a = core * vFade * uAlpha * (0.6 + 0.4 * vSeed) * (1.0 - 0.5 * smoothstep(0.0, 2.0, uStretch));
          gl_FragColor = vec4(mix(uColor, uHead, vSeed * 0.7), a);
        }`,
    }),
  )
  scene.add(points)

  let dark = true
  let washBase = 0.42
  let starBase = 0.9
  const paint = (): void => {
    dark = resolveTheme(getTheme()) === 'dark'
    if (dark) {
      washU.uA.value.set('#0e867e')
      washU.uB.value.set('#12293a')
      washBase = 0.42
      starU.uColor.value.set('#a4ded9')
      starU.uHead.value.set('#ffffff')
      starBase = 0.9
    } else {
      washU.uA.value.set('#a4ded9')
      washU.uB.value.set('#dbe9f2')
      washBase = 0.55
      starU.uColor.value.set('#0e867e')
      starU.uHead.value.set('#074742')
      starBase = 0.75
    }
    for (const material of [streaks.material, points.material]) {
      material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending
      material.needsUpdate = true
    }
  }
  paint()

  const TARGETS: Record<Phase, { speed: number; stretch: number }> = {
    warp: { speed: 34, stretch: 6 },
    drift: { speed: 2.4, stretch: 0.3 },
    jump: { speed: 80, stretch: 10 },
  }
  let phase: Phase = 'drift'
  let speed = 2.4
  let stretch = 0
  let time = 0
  let travel = 0
  let last = performance.now()
  let raf = 0

  const frame = (): void => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    time += dt
    const target = reduced ? { speed: 1.2, stretch: 0 } : TARGETS[phase]
    speed = ease(speed, target.speed, dt, phase === 'jump' ? 4 : 1.6)
    stretch = ease(stretch, target.stretch, dt, phase === 'jump' ? 4 : 1.6)
    travel += speed * dt
    starU.uTravel.value = travel
    starU.uStretch.value = stretch
    starU.uAlpha.value = starBase
    washU.uStrength.value = washBase
    washU.uTime.value = time
    camera.position.x = Math.sin(time * 0.23) * 0.35
    camera.position.y = Math.cos(time * 0.19) * 0.25
    camera.lookAt(camera.position.x * 0.2, camera.position.y * 0.2, -10)
    renderer.render(scene, camera)
  }
  const loop = (): void => {
    if (!document.hidden) frame()
    raf = requestAnimationFrame(loop)
  }

  const fit = (): void => {
    const r = host.getBoundingClientRect()
    const width = Math.max(1, Math.round(r.width))
    const height = Math.max(1, Math.round(r.height))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    washU.uRes.value.set(width, height)
    starU.uPR.value = renderer.getPixelRatio()
  }
  const ro = new ResizeObserver(fit)
  ro.observe(host)
  fit()

  const unsubscribeTheme = subscribeToTheme(paint)
  const unwatchSystem = watchSystemAppearance(paint)
  raf = requestAnimationFrame(loop)

  return {
    setPhase(next) {
      phase = next
    },
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsubscribeTheme()
      unwatchSystem()
      for (const object of [wash, streaks, points]) {
        object.geometry.dispose()
        object.material.dispose()
      }
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
