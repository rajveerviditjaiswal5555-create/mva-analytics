import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface Props {
  onSelect: () => void
  stats: { years: number; students: number; regions: number }
}

type Body = {
  pivot: THREE.Object3D
  mesh: THREE.Mesh
  label: THREE.Sprite
  moons: THREE.Object3D[]
  name: string
  sub: string
  baseColor: THREE.Color
}

function textSprite(text: string, sub = '', color = '#ffffff', width = 320) {
  const c = document.createElement('canvas')
  c.width = width
  c.height = sub ? 110 : 96
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,.85)'
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  ctx.font = '700 42px Inter, Arial, sans-serif'
  ctx.fillText(text, c.width / 2, sub ? 48 : 60)
  if (sub) {
    ctx.fillStyle = '#b8b8c4'
    ctx.font = '500 26px Inter, Arial, sans-serif'
    ctx.fillText(sub, c.width / 2, 86)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(3.4, 1.15, 1)
  return sprite
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128)
  g.addColorStop(0, 'rgba(196,181,253,.95)')
  g.addColorStop(0.25, 'rgba(139,92,246,.42)')
  g.addColorStop(1, 'rgba(124,92,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

/** Real WebGL 3D system: MVA sun, AI-company planets and their model moons. */
export default function OrbitScene3D({ onSelect, stats }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
    camera.position.set(0, 10, 40)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab'
    host.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 1.8)
    key.position.set(6, 12, 9)
    scene.add(key)
    const sunLight = new THREE.PointLight(0xa78bfa, 90, 70, 2)
    scene.add(sunLight)

    const system = new THREE.Group()
    system.rotation.x = -0.14
    scene.add(system)

    // Sun — glowing violet sphere with an always-facing MVA monogram.
    const sunGeo = new THREE.SphereGeometry(2.1, 48, 48)
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6, emissive: 0x5b21b6, emissiveIntensity: 0.85, roughness: 0.32, metalness: 0.12,
    })
    const sun = new THREE.Mesh(sunGeo, sunMat)
    system.add(sun)
    const monogram = textSprite('M', '', '#ffffff', 256)
    monogram.scale.set(3.8, 3.8, 1)
    monogram.position.set(0, 0.05, 2.1)
    system.add(monogram)

    const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(13, 13, 1)
    system.add(glow)

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
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.13, transparent: true, opacity: 0.75, sizeAttenuation: true }))
    scene.add(stars)

    const SPECS = [
      { name: 'Groq', sub: 'Qwen 3.8 27B · Llama 3.3', color: 0xfb923c, radius: 6.5, size: 1.15, speed: 0.34, phase: 0.3, moons: 2 },
      { name: 'OpenAI', sub: 'GPT-4o · o3', color: 0x34d399, radius: 9.5, size: 0.98, speed: -0.24, phase: 2.0, moons: 2 },
      { name: 'Anthropic', sub: 'Claude 3.7', color: 0xf0c75e, radius: 12.3, size: 0.82, speed: 0.18, phase: 3.6, moons: 1 },
      { name: 'Google', sub: 'Gemini 2.5', color: 0x60a5fa, radius: 15.0, size: 0.7, speed: -0.13, phase: 5.1, moons: 1 },
    ]

    const bodies: Body[] = []
    const pickables: THREE.Mesh[] = []
    const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [sunGeo, sunMat, starGeo, stars.material as THREE.Material, glowMat.map!, glowMat]

    SPECS.forEach(spec => {
      // A pivot at the origin guarantees a perfectly stable circular orbit.
      const pivot = new THREE.Object3D()
      pivot.rotation.y = spec.phase
      system.add(pivot)

      const geo = new THREE.SphereGeometry(spec.size, 36, 36)
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color, emissive: new THREE.Color(spec.color).multiplyScalar(0.18),
        roughness: 0.48, metalness: 0.12,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(spec.radius, 0, 0)
      mesh.userData.bodyIndex = bodies.length
      pivot.add(mesh)
      pickables.push(mesh)
      disposables.push(geo, mat)

      // Orbit guide in the same XZ plane as the pivot.
      const points: THREE.Vector3[] = []
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(a) * spec.radius, 0, Math.sin(a) * spec.radius))
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(points)
      const ringMat = new THREE.LineBasicMaterial({ color: spec.color, transparent: true, opacity: 0.22 })
      const ring = new THREE.LineLoop(ringGeo, ringMat)
      system.add(ring)
      disposables.push(ringGeo, ringMat)

      const label = textSprite(spec.name, spec.sub, '#ffffff')
      label.scale.set(3.6, 1.24, 1)
      label.position.set(0, spec.size + 1.35, 0)
      label.visible = false
      mesh.add(label)
      const labelMat = label.material as THREE.SpriteMaterial
      disposables.push(labelMat.map!, labelMat)

      // Moons orbit their own planet via independent pivots.
      const moons: THREE.Object3D[] = []
      for (let j = 0; j < spec.moons; j++) {
        const moonPivot = new THREE.Object3D()
        moonPivot.rotation.y = j * 2.1
        mesh.add(moonPivot)
        const mGeo = new THREE.SphereGeometry(spec.size * (0.3 + j * 0.05), 18, 18)
        const mMat = new THREE.MeshStandardMaterial({ color: 0xe9d5ff, emissive: spec.color, emissiveIntensity: 0.25, roughness: 0.6 })
        const moon = new THREE.Mesh(mGeo, mMat)
        moon.position.set(spec.size + 0.6 + j * 0.45, 0.12 * (j % 2 ? 1 : -1), 0)
        moonPivot.add(moon)
        moons.push(moonPivot)
        disposables.push(mGeo, mMat)
      }

      bodies.push({ pivot, mesh, label, moons, name: spec.name, sub: spec.sub, baseColor: new THREE.Color(spec.color) })
    })

    // Interaction: drag orbit, pointer parallax, raycast hover, click to open.
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2(10, 10)
    let hovered: Body | null = null
    let dragging = false
    let lastX = 0
    let targetTilt = -0.14
    let zoom = 40

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
      zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.012, 28, 50)
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

      bodies.forEach((body, i) => {
        body.pivot.rotation.y = SPECS[i].phase + t * SPECS[i].speed
        body.moons.forEach((moonPivot, j) => {
          moonPivot.rotation.y = t * (j % 2 ? -0.9 : 1.15) + j * 2.1
        })
      })
      system.rotation.x += (targetTilt - system.rotation.x) * 0.05
      camera.position.z += (zoom - camera.position.z) * 0.08
      camera.lookAt(0, 0, 0)
      sun.rotation.y = t * 0.12
      glow.material.opacity = 0.75 + Math.sin(t * 1.5) * 0.12
      stars.rotation.y = t * 0.006

      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(pickables, false)[0]
      const next = hit ? bodies[hit.object.userData.bodyIndex as number] : null
      if (next !== hovered) {
        if (hovered) {
          hovered.label.visible = false
          hovered.mesh.material instanceof THREE.MeshStandardMaterial && hovered.mesh.material.emissive.copy(hovered.baseColor).multiplyScalar(0.18)
        }
        hovered = next
        if (hovered) {
          hovered.label.visible = true
          if (hovered.mesh.material instanceof THREE.MeshStandardMaterial) hovered.mesh.material.emissive.copy(hovered.baseColor).multiplyScalar(0.55)
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
  }, [])

  return (
    <div className="orbit3d">
      <div className="orbit3d-host" ref={hostRef} aria-label="Interactive 3D AI model universe" />
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
