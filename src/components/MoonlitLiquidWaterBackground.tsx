import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

/**
 * Restored 3D Aqua-Green Liquid Water & Scroll-Animated Floating 3D Geometric Shapes Background
 * - Layered transparently over the global 3D background artwork (`body::before`) without altering background colors.
 * - 100% GPU Vertex-Shader wave displacement & particle drift (zero CPU vertex buffer mutation).
 * - Multi-part 3D geometric wireframe + crystal core + orbital halo shapes that stay visible across the full
 *   page and animate smoothly with bounded orbital glide, depth parallax, and scroll-velocity tilt/spin.
 * - Uses uninterrupted native `requestAnimationFrame` on hardware GPUs (true 60/120fps) and WebGL2 `afterDraw`
 *   fence pacing on software WebGL renderers.
 */
export const MoonlitLiquidWaterBackground: React.FC = memo(() => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    container.innerHTML = '';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      120
    );
    camera.position.set(0, 2.4, 15);
    camera.lookAt(0, 0, 0);

    // 1. Lightweight GPU Vertex-Shader Liquid Wave Mesh
    const waveGeo = new THREE.PlaneGeometry(38, 24, 22, 16);
    const waveMat = new THREE.ShaderMaterial({
      transparent: true,
      wireframe: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0x00e5b0) },
        uColorB: { value: new THREE.Color(0x00b8d4) },
      },
      vertexShader: `
        uniform float uTime;
        varying float vElevation;
        void main() {
          vec3 pos = position;
          float w1 = sin(pos.x * 0.32 + uTime * 0.85) * 0.52;
          float w2 = cos(pos.y * 0.38 + uTime * 0.68) * 0.44;
          float w3 = sin((pos.x + pos.y) * 0.22 - uTime * 0.52) * 0.28;
          pos.z += w1 + w2 + w3;
          vElevation = (pos.z + 1.25) * 0.4;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vElevation;
        void main() {
          vec3 col = mix(uColorB, uColorA, clamp(vElevation, 0.0, 1.0));
          gl_FragColor = vec4(col, 0.14);
        }
      `,
    });

    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI * 0.44;
    waveMesh.position.set(0, -4.55, -3.5);
    scene.add(waveMesh);

    // 2. Composite 3D Scroll-Animated Geometric Shapes (Outer Wireframe Hull + Inner Core + Orbit Halo)
    interface AnimatedShapeNode {
      group: THREE.Group;
      outer: THREE.Mesh;
      inner: THREE.Mesh;
      ring: THREE.Mesh;
      basePos: THREE.Vector3;
      baseScale: number;
      rotSpeed: THREE.Vector3;
      floatSpeed: number;
      floatAmp: number;
      orbitRadius: number;
      phase: number;
    }

    const shapeNodes: AnimatedShapeNode[] = [];
    const outerWireMat = new THREE.MeshBasicMaterial({
      color: 0x00e5b0,
      wireframe: true,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    });
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x38f8d2,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5b0,
      wireframe: true,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });

    const outerGeometries = [
      new THREE.IcosahedronGeometry(1.35, 1),
      new THREE.OctahedronGeometry(1.3, 0),
    ];
    const innerGeometries = [
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.IcosahedronGeometry(0.66, 0),
    ];
    const ringGeo = new THREE.TorusGeometry(1.75, 0.035, 8, 40);

    const shapePlacements: {
      pos: [number, number, number];
      scale: number;
      speed: number;
      amp: number;
      orbit: number;
      phase: number;
    }[] = [
      { pos: [-8.9, 2.7, -0.4], scale: 1.15, speed: 0.72, amp: 0.68, orbit: 0.55, phase: 0.4 },
      { pos: [9.1, -2.0, -0.3], scale: 1.12, speed: 0.66, amp: 0.74, orbit: 0.6, phase: 2.35 },
    ];

    shapePlacements.forEach((cfg, idx) => {
      const group = new THREE.Group();
      const outer = new THREE.Mesh(
        outerGeometries[idx % outerGeometries.length],
        outerWireMat
      );
      const inner = new THREE.Mesh(
        innerGeometries[idx % innerGeometries.length],
        innerCoreMat
      );
      const ring = new THREE.Mesh(ringGeo, orbitRingMat);
      ring.rotation.x = Math.PI * 0.35;

      group.add(outer);
      group.add(inner);
      group.add(ring);
      group.scale.setScalar(cfg.scale);
      group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      scene.add(group);

      shapeNodes.push({
        group,
        outer,
        inner,
        ring,
        basePos: new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]),
        baseScale: cfg.scale,
        rotSpeed: new THREE.Vector3(
          0.26 + (idx % 3) * 0.08,
          0.32 + (idx % 2) * 0.09,
          0.22 + (idx % 4) * 0.06
        ),
        floatSpeed: cfg.speed,
        floatAmp: cfg.amp,
        orbitRadius: cfg.orbit,
        phase: cfg.phase,
      });
    });

    // 3. Lightweight GPU-Animated Floating Aqua Particles
    const particleCount = 42;
    const positions = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const particleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00e5b0) },
      },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.55 + aPhase) * 0.65;
          p.x += cos(uTime * 0.42 + aPhase) * 0.45;
          vAlpha = 0.25 + 0.35 * (0.5 + 0.5 * sin(uTime * 1.1 + aPhase));
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(24.0 / -mvPosition.z, 1.5, 4.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float dist = length(c);
          if (dist > 0.5) discard;
          float soft = smoothstep(0.5, 0.05, dist);
          gl_FragColor = vec4(uColor, vAlpha * soft);
        }
      `,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    canvas.style.transform = 'translate3d(0, 0, 0)';
    canvas.style.backfaceVisibility = 'hidden';

    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let frameId = 0;
    let timerId: number | ReturnType<typeof setTimeout> = 0;
    let disposed = false;

    // Frame-rate-independent Scroll & Mouse Parallax state
    let targetScrollY = typeof window !== 'undefined' ? window.scrollY || 0 : 0;
    let smoothScrollY = targetScrollY;
    let smoothVelocity = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;

    const handleScroll = () => {
      targetScrollY = window.scrollY || 0;
    };
    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      targetMouseY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Proper WebGL2 fence-sync pacing ONLY when running on software WebGL
    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        timerId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          timerId = window.setTimeout(cb, 80);
        }
      };
      timerId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      if (document.hidden) {
        timerId = window.setTimeout(() => {
          if (!disposed) frameId = requestAnimationFrame(tick);
        }, 250);
        return;
      }

      const nowMs = performance.now();
      const delta = Math.min(0.05, Math.max(0.001, (nowMs - lastTimeMs) * 0.001));
      lastTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) * 0.001;

      // Exponential damping keeps animations identically smooth across 60Hz, 120Hz, and software renderers
      smoothScrollY = THREE.MathUtils.damp(smoothScrollY, targetScrollY, 10, delta);
      const rawVelocity = THREE.MathUtils.clamp(targetScrollY - smoothScrollY, -2400, 2400);
      smoothVelocity = THREE.MathUtils.damp(smoothVelocity, rawVelocity, 9, delta);
      smoothMouseX = THREE.MathUtils.damp(smoothMouseX, targetMouseX, 7, delta);
      smoothMouseY = THREE.MathUtils.damp(smoothMouseY, targetMouseY, 7, delta);

      const scrollPhase = smoothScrollY * 0.0026;
      const velNorm = Math.min(1, Math.abs(smoothVelocity) / 850);

      waveMat.uniforms.uTime.value = elapsed * 1.45 + smoothScrollY * 0.0028;
      particleMat.uniforms.uTime.value = elapsed * 1.25 + smoothScrollY * 0.0014;

      // Subtle bounded camera parallax keeps shapes & liquid wave framed across full scroll depth
      camera.position.x = smoothMouseX * 0.55;
      camera.position.y = 2.4 - smoothMouseY * 0.36 + Math.sin(scrollPhase * 0.45) * 0.26;
      camera.rotation.x = -smoothMouseY * 0.018 - smoothVelocity * 0.00003;
      camera.rotation.y = -smoothMouseX * 0.022;

      // Liquid wave horizon reaction (bounded so it never drifts off screen)
      waveMesh.position.y = -4.55 + Math.sin(scrollPhase * 0.6) * 0.42;
      waveMesh.rotation.z = Math.sin(scrollPhase * 0.55) * 0.06 + smoothMouseX * 0.02;

      // Scroll-choreographed 3D shapes: bounded orbital sweep + dynamic tilt, spin & kinetic scale
      for (let i = 0; i < shapeNodes.length; i++) {
        const node = shapeNodes[i];
        const dir = i === 0 ? 1 : -1;
        const t = elapsed * node.floatSpeed + node.phase;

        const scrollOrbitX =
          dir * Math.sin(scrollPhase * 0.92 + node.phase) * 1.35 + smoothMouseX * 0.6;
        const scrollOrbitY =
          Math.sin(scrollPhase * 1.15 + node.phase * 1.3) * 2.05 * dir - smoothMouseY * 0.38;
        const scrollDepthZ = Math.cos(scrollPhase * 0.85 + node.phase) * 1.25;

        node.group.position.x =
          node.basePos.x + Math.cos(t * 0.78) * node.orbitRadius + scrollOrbitX;
        node.group.position.y =
          node.basePos.y + Math.sin(t) * node.floatAmp + scrollOrbitY;
        node.group.position.z =
          node.basePos.z + Math.sin(t * 0.58) * (node.orbitRadius * 0.65) + scrollDepthZ;

        const dynamicScale =
          node.baseScale *
          (1 + Math.sin(scrollPhase * 0.9 + node.phase) * 0.08 + velNorm * 0.12);
        node.group.scale.setScalar(dynamicScale);

        node.group.rotation.x =
          Math.sin(scrollPhase * 0.72 + node.phase) * 0.34 + smoothVelocity * 0.00085 * dir;
        node.group.rotation.y = scrollPhase * 0.85 * dir + smoothMouseX * 0.22;
        node.group.rotation.z =
          Math.cos(scrollPhase * 0.65 + node.phase) * 0.28 - smoothVelocity * 0.00055 * dir;

        node.outer.rotation.x = elapsed * node.rotSpeed.x * 1.25 + scrollPhase * 1.1;
        node.outer.rotation.y = elapsed * node.rotSpeed.y * 1.25 + scrollPhase * 1.45 * dir;
        node.inner.rotation.x = -elapsed * node.rotSpeed.y * 1.45 - scrollPhase * 1.25;
        node.inner.rotation.z = elapsed * node.rotSpeed.z * 1.5 + scrollPhase * 0.85 * dir;
        node.ring.rotation.z = elapsed * 0.52 + node.phase + scrollPhase * 1.65 * dir;
        node.ring.rotation.x =
          Math.PI * 0.35 + Math.sin(elapsed * 0.75 + scrollPhase * 0.8) * 0.24;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => {
          if (!disposed) frameId = requestAnimationFrame(tick);
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (disposed) return;
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      waveGeo.dispose();
      waveMat.dispose();
      outerGeometries.forEach((g) => g.dispose());
      innerGeometries.forEach((g) => g.dispose());
      ringGeo.dispose();
      outerWireMat.dispose();
      innerCoreMat.dispose();
      orbitRingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="moonlit-3d-shapes-layer"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{
        contain: 'strict',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
      }}
    >
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
});

MoonlitLiquidWaterBackground.displayName = 'MoonlitLiquidWaterBackground';
