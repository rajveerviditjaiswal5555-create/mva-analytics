import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  onSelect: () => void
  stats: { years: number; students: number; regions: number }
  orbitBodies: Array<{ name: string; sub: string; moons: string[] }>
}

type Body = {
  pivot: THREE.Object3D
  mesh: THREE.Mesh
  label: THREE.Sprite
  moons: THREE.Object3D[]
  name: string
  sub: string
  basePhase: number
  speed: number
  baseColor: THREE.Color
}

function textSprite(text: string, sub = '', color = '#ffffff', width = 320) {
  const c = document.createElement('canvas')
  c.width = Math.max(width, text.length * 24 + 48)
  c.height = sub ? 110 : 96
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,.9)'
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  ctx.font = '700 42px Inter, Arial, sans-serif'
  ctx.fillText(text, c.width / 2, sub ? 48 : 60)
  if (sub) {
    ctx.fillStyle = '#b8b8c4'
    ctx.font = '500 25px Inter, Arial, sans-serif'
    ctx.fillText(sub, c.width / 2, 86)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(3.4, 1.15, 1)
  return sprite
}

function radialTexture(inner: string, mid: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 128)
  g.addColorStop(0, inner)
  g.addColorStop(0.28, mid)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

// OpenRouter-inspired deep-space palette.
const SPACE_COLORS = [0xa78bfa, 0x22d3ee, 0xf0abfc, 0x34d399, 0xfbbf24, 0x60a5fa, 0xfb7185, 0x818cf8]
const ORBITS = [
  { color: 0xa78bfa, radius: 5.8, size: 0.95, speed: 0.30, phase: 0.2 },
  { color: 0x22d3ee, radius: 8.2, size: 0.86, speed: -0.24, phase: 1.1 },
  { color: 0xf0abfc, radius: 10.6, size: 0.78, speed: 0.19, phase: 2.3 },
  { color: 0x34d399, radius: 13.0, size: 0.70, speed: -0.15, phase: 3.4 },
  { color: 0xfbbf24, radius: 15.4, size: 0.64, speed: 0.12, phase: 4.6 },
  { color: 0x60a5fa, radius: 18.0, size: 0.58, speed: -0.09, phase: 5.6 },
]

/** WebGL data universe: MVA logo sun, every state/country as a planet, districts/cities as moons. */
export default function OrbitScene3D({ onSelect, stats, orbitBodies }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
    camera.position.set(0, 10, 48)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab'
    host.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.15))
    const key = new THREE.DirectionalLight(0xffffff, 1.9)
    key.position.set(6, 12, 9)
    scene.add(key)
    scene.add(new THREE.PointLight(0xa78bfa, 95, 70, 2))

    const system = new THREE.Group()
    system.rotation.x = -0.14
    scene.add(system)

    const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = []

    // Sun — official MVA crest sprite over a lit violet sphere.
    const sunGeo = new THREE.SphereGeometry(1.75, 48, 48)
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0x7c5cff, emissive: 0x4c1d95, emissiveIntensity: 0.9, roughness: 0.34, metalness: 0.14,
    })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    system.add(sun)
    disposables.push(sunGeo, sunMat)

    // Official MVA crest from mvaburhanpur.com, stored locally in public/.
    const logoTex = new THREE.TextureLoader().load('/mva-logo.png')
    logoTex.colorSpace = THREE.SRGBColorSpace
    const logoMat = new THREE.SpriteMaterial({ map: logoTex, transparent: true, depthTest: false })
    const logo = new THREE.Sprite(logoMat)
    logo.scale.set(2.5, 3.0, 1)
    logo.position.set(0, 0.42, 1.8)
    system.add(logo)
    disposables.push(logoTex, logoMat)

    const glowTex = radialTexture('rgba(216,201,255,.95)', 'rgba(139,92,246,.38)')
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(11, 11, 1)
    system.add(glow)
    disposables.push(glowTex, glowMat)

    // Distant nebula wash for the OpenRouter-style space depth.
    const nebulaTex = radialTexture('rgba(34,211,238,.22)', 'rgba(124,92,255,.10)')
    const nebulaMat = new THREE.SpriteMaterial({ map: nebulaTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })
    const nebula = new THREE.Sprite(nebulaMat)
    nebula.scale.set(40, 40, 1)
    nebula.position.set(4, 2, -12)
    scene.add(nebula)
    disposables.push(nebulaTex, nebulaMat)

    // Starfield.
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      const r = 32 + Math.random() * 38
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.cos(phi) * 0.7
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.13, transparent: true, opacity: 0.75, sizeAttenuation: true })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)
    disposables.push(starGeo, starMat)

    // One guide ring per orbit; multiple planets share a ring in a stable formation.
    ORBITS.forEach(spec => {
      const points: THREE.Vector3[] = []
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a) * spec.radius, 0, Math.sin(a) * spec.radius))
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(points)
      const ringMat = new THREE.LineBasicMaterial({ color: spec.color, transparent: true, opacity: 0.22 })
      system.add(new THREE.LineLoop(ringGeo, ringMat))
      disposables.push(ringGeo, ringMat)
    })

    const bodies: Body[] = []
    const pickables: THREE.Mesh[] = []
    const perRing = Math.max(1, Math.ceil(orbitBodies.length / ORBITS.length))

    orbitBodies.forEach((data, i) => {
      const spec = ORBITS[i % ORBITS.length]
      const color = SPACE_COLORS[i % SPACE_COLORS.length]
      const basePhase = spec.phase + (Math.floor(i / ORBITS.length) / perRing) * Math.PI * 2
      const pivot = new THREE.Object3D()
      pivot.rotation.y = basePhase
      system.add(pivot)

      const geo = new THREE.SphereGeometry(spec.size, 32, 32)
      const mat = new THREE.MeshStandardMaterial({
        color, emissive: new THREE.Color(color).multiplyScalar(0.22), roughness: 0.45, metalness: 0.14,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(spec.radius, 0, 0)
      const bodyIndex = bodies.length
      mesh.userData.bodyIndex = bodyIndex
      pivot.add(mesh)
      disposables.push(geo, mat)

      // Invisible larger proxy keeps small planets easy to hover.
      const pickGeo = new THREE.SphereGeometry(spec.size * 3.2, 12, 12)
      const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      const pick = new THREE.Mesh(pickGeo, pickMat)
      pick.userData.bodyIndex = bodyIndex
      mesh.add(pick)
      pickables.push(pick)
      disposables.push(pickGeo, pickMat)

      const fullSub = `${data.sub}${data.moons.length ? ` · ${data.moons.join(', ')}` : ''}`
      const label = textSprite(data.name, fullSub, '#ffffff')
      label.scale.set(3.8, 1.28, 1)
      label.position.set(0, spec.size + 1.3, 0)
      label.visible = false
      mesh.add(label)
      disposables.push(label.material.map!, label.material)

      const moons: THREE.Object3D[] = []
      for (let j = 0; j < Math.min(data.moons.length, 2); j++) {
        const moonPivot = new THREE.Object3D()
        moonPivot.rotation.y = j * 2.1
        mesh.add(moonPivot)
        const mGeo = new THREE.SphereGeometry(spec.size * (0.3 + j * 0.05), 16, 16)
        const mMat = new THREE.MeshStandardMaterial({ color: 0xe9d5ff, emissive: color, emissiveIntensity: 0.3, roughness: 0.6 })
        const moon = new THREE.Mesh(mGeo, mMat)
        moon.position.set(spec.size + 0.6 + j * 0.45, 0.12 * (j % 2 ? 1 : -1), 0)
        moonPivot.add(moon)
        moons.push(moonPivot)
        disposables.push(mGeo, mMat)
      }

      bodies.push({ pivot, mesh, label, moons, name: data.name, sub: fullSub, basePhase, speed: spec.speed, baseColor: new THREE.Color(color) })
    })

    // Interaction: drag orbit, pointer parallax, raycast hover, click to open.
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2(10, 10)
    let hovered: Body | null = null
    let dragging = false
    let lastX = 0
    let targetTilt = -0.14
    let zoom = 48

    const setPointer = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
    }
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; renderer.domElement.style.cursor = 'grabbing' }
    const onMove = (e: PointerEvent) => {
      setPointer(e)
      if (dragging) {
        system.rotation.y += (e.clientX - lastX) * 0.006
        lastX = e.clientX
      } else {
        targetTilt = -0.14 + pointer.y * 0.12
      }
      const tip = tipRef.current
      if (tip) {
        tip.style.left = `${e.offsetX + 14}px`
        tip.style.top = `${e.offsetY - 14}px`
      }
    }
    const onUp = () => { dragging = false; renderer.domElement.style.cursor = 'grab' }
    const onClick = () => { if (hovered) selectRef.current() }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.012, 34, 60)
    }
    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const resize = () => {
      const w = host.clientWidth || 520
      const h = host.clientHeight || 520
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let t = 0
    let last = performance.now()
    const animate = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      if (!reduced) t += dt / 1000

      bodies.forEach(body => {
        body.pivot.rotation.y = body.basePhase + t * body.speed
        body.moons.forEach((moonPivot, j) => {
          moonPivot.rotation.y = t * (j % 2 ? -0.9 : 1.15) + j * 2.1
        })
      })
      system.rotation.x += (targetTilt - system.rotation.x) * 0.05
      camera.position.z += (zoom - camera.position.z) * 0.08
      camera.lookAt(0, 0, 0)
      sun.rotation.y = t * 0.12
      glow.material.opacity = 0.72 + Math.sin(t * 1.5) * 0.12
      nebula.material.opacity = 0.55 + Math.sin(t * 0.5) * 0.12
      stars.rotation.y = t * 0.006

      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(pickables, false)[0]
      const next = hit ? bodies[hit.object.userData.bodyIndex as number] : null
      if (next !== hovered) {
        if (hovered) {
          hovered.label.visible = false
          if (hovered.mesh.material instanceof THREE.MeshStandardMaterial) {
            hovered.mesh.material.emissive.copy(hovered.baseColor).multiplyScalar(0.22)
          }
        }
        hovered = next
        if (hovered) {
          hovered.label.visible = true
          if (hovered.mesh.material instanceof THREE.MeshStandardMaterial) {
            hovered.mesh.material.emissive.copy(hovered.baseColor).multiplyScalar(0.6)
          }
        }
        const tip = tipRef.current
        if (tip) {
          tip.innerHTML = hovered ? `<b>${hovered.name}</b><small>${hovered.sub}</small>` : ''
          tip.classList.toggle('show', !!hovered)
        }
      }

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('wheel', onWheel)
      disposables.forEach(d => d.dispose())
      renderer.dispose()
      canvas.remove()
    }
  }, [orbitBodies])

  return (
    <div className="orbit3d">
      <div className="orbit3d-host" ref={hostRef} aria-label="Interactive 3D student-origin universe" />
      <div className="orbit3d-tip" ref={tipRef} />
      <div className="orbit3d-caption">
        <span><b>{stats.years}</b> years</span>
        <span><b>{stats.students.toLocaleString('en-IN')}</b> records</span>
        <span><b>{stats.regions}</b> regions</span>
        <span className="orbit3d-hint">drag · hover · scroll</span>
      </div>
    </div>
  )
}
