import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

/**
 * 3D Aqua-Green Moving Wireframe Wave Mesh ("Jal") & Scroll-Animated 3D Geometric Shapes
 * - Layered transparently over the global 3D background artwork (`body::before`) without altering background colors.
 * - Initially (at scrollY = 0), the 3D wireframe wave mesh ("jal") sits low at the bottom of the viewport (y = -4.65).
 * - As the user scrolls down, the waving 3D wireframe mesh ("jal") smoothly rises upward across the screen,
 *   and returns to the bottom when scrolling back to the top.
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
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
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
      56,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      120
    );
    camera.position.set(0, 2.3, 14.8);
    camera.lookAt(0, 0, 0);

    // 1. 3D Wireframe Wave Mesh ("Jal" Net) — Starts at the bottom and rises upward on scroll
    const waveGeo = new THREE.PlaneGeometry(52, 34, 42, 28);
    const waveMat = new THREE.ShaderMaterial({
      transparent: true,
      wireframe: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(0x38f8d2) },
        uColorB: { value: new THREE.Color(0x00e5b0) },
      },
      vertexShader: `
        uniform float uTime;
        varying float vElevation;
        void main() {
          vec3 pos = position;
          float w1 = sin(pos.x * 0.34 + uTime * 1.35) * 0.78;
          float w2 = cos(pos.y * 0.38 + uTime * 1.08) * 0.64;
          float w3 = sin((pos.x + pos.y) * 0.25 - uTime * 0.92) * 0.42;
          pos.z += w1 + w2 + w3;
          vElevation = (pos.z + 1.8) * 0.32;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vElevation;
        void main() {
          vec3 col = mix(uColorB, uColorA, clamp(vElevation, 0.0, 1.0));
          float alpha = mix(0.24, 0.44, clamp(vElevation, 0.0, 1.0));
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = -Math.PI * 0.42;
    waveMesh.position.set(0, -4.65, -3.2);
    scene.add(waveMesh);

    // 2. Composite 3D Scroll-Animated Geometric Wireframe Shapes (Outer Wireframe Hull + Inner Core + Orbit Halo)
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
      opacity: 0.54,
      depthWrite: false,
    });
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x38f8d2,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5b0,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    const outerGeometries = [
      new THREE.IcosahedronGeometry(1.36, 1),
      new THREE.OctahedronGeometry(1.3, 1),
      new THREE.DodecahedronGeometry(1.22, 0),
    ];
    const innerGeometries = [
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.IcosahedronGeometry(0.66, 0),
      new THREE.OctahedronGeometry(0.64, 0),
    ];
    const ringGeo = new THREE.TorusGeometry(1.76, 0.036, 8, 42);

    const shapePlacements: {
      pos: [number, number, number];
      scale: number;
      speed: number;
      amp: number;
      orbit: number;
      phase: number;
    }[] = [
      { pos: [-8.7, 2.5, -0.3], scale: 1.16, speed: 0.88, amp: 0.72, orbit: 0.62, phase: 0.4 },
      { pos: [8.9, -1.8, -0.2], scale: 1.14, speed: 0.82, amp: 0.78, orbit: 0.66, phase: 2.35 },
      { pos: [7.5, 3.1, -1.4], scale: 0.92, speed: 0.94, amp: 0.64, orbit: 0.54, phase: 4.1 },
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
          0.32 + (idx % 3) * 0.09,
          0.38 + (idx % 2) * 0.1,
          0.26 + (idx % 4) * 0.07
        ),
        floatSpeed: cfg.speed,
        floatAmp: cfg.amp,
        orbitRadius: cfg.orbit,
        phase: cfg.phase,
      });
    });

    // 3. Lightweight GPU-Animated Floating Aqua Particles
    const particleCount = 44;
    const positions = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
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
          p.y += sin(uTime * 0.65 + aPhase) * 0.75;
          p.x += cos(uTime * 0.5 + aPhase) * 0.55;
          vAlpha = 0.28 + 0.36 * (0.5 + 0.5 * sin(uTime * 1.2 + aPhase));
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(25.0 / -mvPosition.z, 1.6, 4.8);
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

      smoothScrollY = THREE.MathUtils.damp(smoothScrollY, targetScrollY, 16, delta);
      const rawVelocity = THREE.MathUtils.clamp(targetScrollY - smoothScrollY, -2800, 2800);
      smoothVelocity = THREE.MathUtils.damp(smoothVelocity, rawVelocity, 14, delta);
      smoothMouseX = THREE.MathUtils.damp(smoothMouseX, targetMouseX, 10, delta);
      smoothMouseY = THREE.MathUtils.damp(smoothMouseY, targetMouseY, 10, delta);

      const scrollPhase = smoothScrollY * 0.0046;
      const velNorm = Math.min(1, Math.abs(smoothVelocity) / 650);

      waveMat.uniforms.uTime.value = elapsed * 1.65 + smoothScrollY * 0.0045;
      particleMat.uniforms.uTime.value = elapsed * 1.35 + smoothScrollY * 0.0024;

      // Camera parallax
      camera.position.x = smoothMouseX * 0.58;
      camera.position.y = 2.3 - smoothMouseY * 0.36;
      camera.rotation.x = -smoothMouseY * 0.018 - smoothVelocity * 0.00003;
      camera.rotation.y = -smoothMouseX * 0.022;

      // Wireframe "Jal" starts at the bottom (-4.65) when scrollY = 0, and smoothly rises upward as the user scrolls down!
      const scrollRiseY = Math.min(6.6, smoothScrollY * 0.0042);
      waveMesh.position.y = -4.65 + scrollRiseY + Math.sin(elapsed * 0.9) * 0.16;
      waveMesh.rotation.x = -Math.PI * 0.42 + Math.min(0.28, smoothScrollY * 0.00018);
      waveMesh.rotation.z = Math.sin(scrollPhase * 0.55) * 0.06 + smoothMouseX * 0.025;

      // Scroll-choreographed 3D wireframe shapes
      for (let i = 0; i < shapeNodes.length; i++) {
        const node = shapeNodes[i];
        const dir = i % 2 === 0 ? 1 : -1;
        const t = elapsed * node.floatSpeed + node.phase;

        const scrollOrbitX =
          dir * Math.sin(scrollPhase * 1.08 + node.phase) * 1.7 + smoothMouseX * 0.65;
        const scrollOrbitY =
          Math.sin(scrollPhase * 1.28 + node.phase * 1.3) * 2.4 * dir - smoothMouseY * 0.42;
        const scrollDepthZ = Math.cos(scrollPhase * 0.98 + node.phase) * 1.5;

        node.group.position.x =
          node.basePos.x + Math.cos(t * 0.88) * node.orbitRadius + scrollOrbitX;
        node.group.position.y =
          node.basePos.y + Math.sin(t) * node.floatAmp + scrollOrbitY;
        node.group.position.z =
          node.basePos.z + Math.sin(t * 0.68) * (node.orbitRadius * 0.7) + scrollDepthZ;

        const dynamicScale =
          node.baseScale *
          (1 + Math.sin(scrollPhase * 1.08 + node.phase) * 0.09 + velNorm * 0.15);
        node.group.scale.setScalar(dynamicScale);

        node.group.rotation.x =
          Math.sin(scrollPhase * 0.88 + node.phase) * 0.44 + smoothVelocity * 0.00115 * dir;
        node.group.rotation.y = scrollPhase * 1.2 * dir + smoothMouseX * 0.26;
        node.group.rotation.z =
          Math.cos(scrollPhase * 0.8 + node.phase) * 0.36 - smoothVelocity * 0.0008 * dir;

        node.outer.rotation.x = elapsed * node.rotSpeed.x * 1.4 + scrollPhase * 1.5;
        node.outer.rotation.y = elapsed * node.rotSpeed.y * 1.4 + scrollPhase * 1.9 * dir;
        node.inner.rotation.x = -elapsed * node.rotSpeed.y * 1.6 - scrollPhase * 1.65;
        node.inner.rotation.z = elapsed * node.rotSpeed.z * 1.65 + scrollPhase * 1.2 * dir;
        node.ring.rotation.z = elapsed * 0.65 + node.phase + scrollPhase * 2.15 * dir;
        node.ring.rotation.x =
          Math.PI * 0.35 + Math.sin(elapsed * 0.88 + scrollPhase * 0.98) * 0.3;
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
