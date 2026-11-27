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
  swarm: THREE.Points
  moons: THREE.Object3D[]
  name: string
  sub: string
  basePhase: number
  speed: number
  accent: THREE.Color
}

function textSprite(text: string, sub = '', color = '#ffffff', width = 320) {
  const c = document.createElement('canvas')
  c.width = Math.max(width, text.length * 24 + 48)
  c.height = sub ? 110 : 96
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,.95)'
  ctx.shadowBlur = 14
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

function radialTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 128)
  g.addColorStop(0, 'rgba(180,190,220,.28)')
  g.addColorStop(0.3, 'rgba(110,100,180,.12)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

function dotTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function planetTexture(hex: number, seed: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const color = new THREE.Color(hex)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  const light = `rgb(${Math.min(255, r + 62)},${Math.min(255, g + 62)},${Math.min(255, b + 62)})`
  const mid = `rgb(${r},${g},${b})`
  const dark = `rgb(${Math.floor(r * 0.3)},${Math.floor(g * 0.3)},${Math.floor(b * 0.3)})`
  const grad = ctx.createRadialGradient(44, 40, 3, 64, 64, 94)
  grad.addColorStop(0, light)
  grad.addColorStop(0.55, mid)
  grad.addColorStop(1, dark)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)

  let s = seed * 97 + 13
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  for (let i = 0; i < 24; i++) {
    ctx.globalAlpha = 0.04 + rand() * 0.07
    ctx.fillStyle = i % 2 ? '#ffffff' : '#000000'
    ctx.fillRect(0, rand() * 128, 128, 1 + rand() * 6)
  }
  for (let i = 0; i < 80; i++) {
    ctx.globalAlpha = 0.05 + rand() * 0.12
    ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000'
    ctx.beginPath()
    ctx.arc(rand() * 128, rand() * 128, 1 + rand() * 5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const ACCENTS = [0xa78bfa, 0x22d3ee, 0xf0abfc, 0x34d399, 0xfbbf24, 0x60a5fa, 0xfb7185, 0x818cf8]
const ORBITS = [
  { radius: 7.5, speed: 0.30, phase: 0.2 },
  { radius: 10.0, speed: -0.24, phase: 1.1 },
  { radius: 12.5, speed: 0.19, phase: 2.3 },
  { radius: 15.0, speed: -0.15, phase: 3.4 },
  { radius: 17.5, speed: 0.12, phase: 4.6 },
  { radius: 20.0, speed: -0.09, phase: 5.6 },
  { radius: 22.5, speed: 0.07, phase: 0.9 },
  { radius: 25.0, speed: -0.06, phase: 2.8 },
]

/** OpenRouter-style orbital system: metallic MVA core, thin rings, dotted provider swarms. */
export default function OrbitScene3D({ onSelect, stats, orbitBodies }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220)
    const POV = (38 * Math.PI) / 180
    let zoom = 68
    let dist = 68
    camera.position.set(0, Math.sin(POV) * dist, Math.cos(POV) * dist)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab'
    host.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.2))
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(5, 11, 10)
    scene.add(key)
    const rimA = new THREE.DirectionalLight(0xa78bfa, 1.3)
    rimA.position.set(-9, 4, -6)
    scene.add(rimA)
    const rimB = new THREE.DirectionalLight(0x22d3ee, 0.9)
    rimB.position.set(9, -4, -8)
    scene.add(rimB)

    const system = new THREE.Group()
    system.rotation.x = 0
    scene.add(system)
    const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = []
    const dotTex = dotTexture()
    disposables.push(dotTex)

    // Metallic core — chrome orbit ring, dark disc, official MVA crest.
    const shellGeo = new THREE.SphereGeometry(1.95, 48, 48)
    const shellMat = new THREE.MeshPhysicalMaterial({ color: 0x141418, metalness: 0.9, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 })
    const shell = new THREE.Mesh(shellGeo, shellMat)
    system.add(shell)
    disposables.push(shellGeo, shellMat)

    const torusGeo = new THREE.TorusGeometry(2.12, 0.3, 20, 72)
    const torusMat = new THREE.MeshPhysicalMaterial({ color: 0x1c1c22, metalness: 1, roughness: 0.14, clearcoat: 1 })
    const torus = new THREE.Mesh(torusGeo, torusMat)
    torus.position.z = 0.25
    system.add(torus)
    disposables.push(torusGeo, torusMat)

    const discGeo = new THREE.CircleGeometry(1.68, 64)
    const discMat = new THREE.MeshBasicMaterial({ color: 0x050506 })
    const disc = new THREE.Mesh(discGeo, discMat)
    disc.position.z = 0.52
    system.add(disc)
    disposables.push(discGeo, discMat)

    // Official MVA crest from mvaburhanpur.com, stored locally in public/.
    const logoTex = new THREE.TextureLoader().load('/mva-logo.png')
    logoTex.colorSpace = THREE.SRGBColorSpace
    const logoMat = new THREE.SpriteMaterial({ map: logoTex, transparent: true, depthTest: false })
    const logo = new THREE.Sprite(logoMat)
    logo.scale.set(2.35, 2.8, 1)
    logo.position.set(0, 0.38, 0.62)
    system.add(logo)
    disposables.push(logoTex, logoMat)

    const glowTex = radialTexture()
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(13, 13, 1)
    glow.position.z = -1
    system.add(glow)
    disposables.push(glowTex, glowMat)

    // Faint starfield.
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(420 * 3)
    for (let i = 0; i < 420; i++) {
      const r = 36 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.cos(phi) * 0.6
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xa8a8b8, size: 0.12, map: dotTex, alphaTest: 0.02, transparent: true, opacity: 0.55, sizeAttenuation: true })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)
    disposables.push(starGeo, starMat)

    // Thin grey orbit guides, like OpenRouter's elliptical paths.
    ORBITS.forEach(spec => {
      const points: THREE.Vector3[] = []
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a) * spec.radius, 0, Math.sin(a) * spec.radius))
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(points)
      const ringMat = new THREE.LineBasicMaterial({ color: 0x4a4a54, transparent: true, opacity: 0.42 })
      system.add(new THREE.LineLoop(ringGeo, ringMat))
      disposables.push(ringGeo, ringMat)
    })

    const bodies: Body[] = []
    const pickables: THREE.Mesh[] = []
    const perRing = Math.max(1, Math.ceil(orbitBodies.length / ORBITS.length))

    orbitBodies.forEach((data, i) => {
      const spec = ORBITS[i % ORBITS.length]
      const accent = new THREE.Color(ACCENTS[i % ACCENTS.length])
      const basePhase = spec.phase + (Math.floor(i / ORBITS.length) / perRing) * Math.PI * 2
      const pivot = new THREE.Object3D()
      pivot.rotation.y = basePhase
      system.add(pivot)

      // Small dark provider badge.
      const badgeGeo = new THREE.SphereGeometry(0.39, 28, 28)
      const surfaceTex = planetTexture(ACCENTS[i % ACCENTS.length], i + 1)
      const badgeMat = new THREE.MeshStandardMaterial({
        map: surfaceTex, color: 0xffffff, roughness: 0.74, metalness: 0.06,
        emissive: accent.clone().multiplyScalar(0.06),
      })
      const badge = new THREE.Mesh(badgeGeo, badgeMat)
      badge.position.set(spec.radius, 0, 0)
      badge.userData.bodyIndex = bodies.length
      pivot.add(badge)
      disposables.push(badgeGeo, badgeMat, surfaceTex)

      // Atmospheric halo gives the planet depth against the dark canvas.
      const atmMat = new THREE.SpriteMaterial({ map: dotTex, color: accent, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
      const atm = new THREE.Sprite(atmMat)
      atm.scale.set(1.5, 1.5, 1)
      atm.position.z = -0.12
      badge.add(atm)
      disposables.push(atmMat)

      // Invisible hover proxy.
      const pickGeo = new THREE.SphereGeometry(0.8, 12, 12)
      const pickMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      const pick = new THREE.Mesh(pickGeo, pickMat)
      pick.userData.bodyIndex = bodies.length
      badge.add(pick)
      pickables.push(pick)
      disposables.push(pickGeo, pickMat)

      // Dotted constellation swarm around the node — the OpenRouter signature detail.
      const count = 34 + (i % 3) * 10
      const swarmPos = new Float32Array(count * 3)
      for (let j = 0; j < count; j++) {
        const a = Math.random() * Math.PI * 2
        const r = 0.45 + Math.random() * 1.25
        swarmPos[j * 3] = Math.cos(a) * r
        swarmPos[j * 3 + 1] = (Math.random() - 0.5) * 0.5
        swarmPos[j * 3 + 2] = Math.sin(a) * r
      }
      const swarmGeo = new THREE.BufferGeometry()
      swarmGeo.setAttribute('position', new THREE.BufferAttribute(swarmPos, 3))
      const swarmMat = new THREE.PointsMaterial({ color: 0xd4d4dc, size: 0.07, map: dotTex, alphaTest: 0.02, transparent: true, opacity: 0.62, sizeAttenuation: true })
      const swarm = new THREE.Points(swarmGeo, swarmMat)
      badge.add(swarm)
      disposables.push(swarmGeo, swarmMat)

      const fullSub = `${data.sub}${data.moons.length ? ` · ${data.moons.join(', ')}` : ''}`
      const label = textSprite(data.name, fullSub, '#ffffff')
      label.scale.set(3.8, 1.28, 1)
      label.position.set(0, 1.5, 0)
      label.visible = false
      badge.add(label)
      disposables.push(label.material.map!, label.material)

      // Moons as tiny satellites.
      const moons: THREE.Object3D[] = []
      for (let j = 0; j < Math.min(data.moons.length, 2); j++) {
        const moonPivot = new THREE.Object3D()
        moonPivot.rotation.y = j * 2.1
        badge.add(moonPivot)
        const orbitRadius = 0.9 + j * 0.3
        const pathPoints: THREE.Vector3[] = []
        for (let k = 0; k <= 48; k++) {
          const a = (k / 48) * Math.PI * 2
          pathPoints.push(new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius))
        }
        const pathGeo = new THREE.BufferGeometry().setFromPoints(pathPoints)
        const pathMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.3 })
        badge.add(new THREE.LineLoop(pathGeo, pathMat))
        disposables.push(pathGeo, pathMat)

        const mGeo = new THREE.SphereGeometry(0.14 + j * 0.03, 14, 14)
        const mMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const moon = new THREE.Mesh(mGeo, mMat)
        moon.position.set(orbitRadius, 0, 0)
        moonPivot.add(moon)
        moons.push(moonPivot)
        disposables.push(mGeo, mMat)

        // Fine tether from the planet to its moon, like OpenRouter's connected nodes.
        const tetherGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0), new THREE.Vector3(orbitRadius, 0, 0),
        ])
        const tetherMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.55 })
        moonPivot.add(new THREE.Line(tetherGeo, tetherMat))
        disposables.push(tetherGeo, tetherMat)
      }

      bodies.push({
        pivot, mesh: badge, label, swarm, moons, name: data.name, sub: fullSub,
        basePhase, speed: spec.speed, accent,
      })
    })

    // Interaction.
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2(10, 10)
    let hovered: Body | null = null
    let dragging = false
    let lastX = 0
    let targetTilt = 0

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
        targetTilt = pointer.y * 0.06
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
      zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.014, 48, 92)
    }
    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const resize = () => {
      const w = host.clientWidth || 640
      const h = host.clientHeight || 640
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
        body.swarm.rotation.y = t * 0.22
        body.moons.forEach((moonPivot, j) => {
          moonPivot.rotation.y = t * (j % 2 ? -2.2 : 2.6) + j * 2.1
        })
        body.mesh.scale.setScalar(hovered === body ? 1.28 : 1)
      })
      system.rotation.x += (targetTilt - system.rotation.x) * 0.05
      dist += (zoom - dist) * 0.08
      camera.position.set(0, Math.sin(POV) * dist, Math.cos(POV) * dist)
      camera.lookAt(0, 0, 0)
      shell.rotation.y = t * 0.08
      torus.rotation.z = t * 0.04
      glow.material.opacity = 0.72 + Math.sin(t * 0.8) * 0.08
      stars.rotation.y = t * 0.004

      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(pickables, false)[0]
      const next = hit ? bodies[hit.object.userData.bodyIndex as number] : null
      if (next !== hovered) {
        if (hovered) hovered.label.visible = false
        hovered = next
        if (hovered) hovered.label.visible = true
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
      <div className="orbit3d-legend">planet = state / country · moon = district / city · dots = student sources</div>
    </div>
  )
}
