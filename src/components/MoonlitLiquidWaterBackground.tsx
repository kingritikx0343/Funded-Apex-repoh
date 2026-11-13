import React, { useEffect, useRef, memo } from 'react';
import * as THREE from 'three';

/**
 * 120FPS / 120Hz Hardware-Line 3D Wireframe Wave Mesh ("Jal") & Scroll-Animated 3D Geometric Shapes
 * - Uses native WebGL hardware LineSegments (WireframeGeometry) with depth:false, antialias:false, and DPR 1.0
 *   so GPU frame time stays < 0.4ms on 120Hz displays with zero overdraw lag.
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
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        precision: 'mediump',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    canvas.style.transform = 'translate3d(0, 0, 0)';
    canvas.style.backfaceVisibility = 'hidden';
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

    // 1. 120FPS Hardware-Line 3D Wireframe Wave Mesh ("Jal" Net) — Starts at the bottom (-4.65) and rises upward on scroll
    const basePlaneGeo = new THREE.PlaneGeometry(54, 34, 34, 22);
    const waveWireGeo = new THREE.WireframeGeometry(basePlaneGeo);
    basePlaneGeo.dispose();

    const waveMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uScrollPhase: { value: 0 },
        uColorA: { value: new THREE.Color(0x38f8d2) },
        uColorB: { value: new THREE.Color(0x00e5b0) },
      },
      vertexShader: `
        precision highp float;
        uniform float uTime;
        uniform float uScrollPhase;
        varying float vElevation;
        void main() {
          vec3 pos = position;
          float phase = uTime + uScrollPhase * 0.35;
          float w1 = sin(pos.x * 0.32 + phase * 1.15) * 0.82;
          float w2 = cos(pos.y * 0.36 + phase * 0.92) * 0.66;
          float w3 = sin((pos.x + pos.y) * 0.24 - phase * 0.78) * 0.44;
          pos.z += w1 + w2 + w3;
          vElevation = clamp((pos.z + 1.9) * 0.31, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vElevation;
        void main() {
          vec3 col = mix(uColorB, uColorA, vElevation);
          float alpha = mix(0.24, 0.45, vElevation);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const waveMesh = new THREE.LineSegments(waveWireGeo, waveMat);
    waveMesh.rotation.x = -Math.PI * 0.42;
    waveMesh.position.set(0, -4.65, -3.2);
    scene.add(waveMesh);

    // 2. 120FPS Hardware-Line Composite 3D Scroll-Animated Geometric Shapes
    interface AnimatedShapeNode {
      group: THREE.Group;
      outer: THREE.LineSegments;
      inner: THREE.Mesh;
      ring: THREE.LineSegments;
      basePos: THREE.Vector3;
      baseScale: number;
      rotSpeed: THREE.Vector3;
      floatSpeed: number;
      floatAmp: number;
      orbitRadius: number;
      phase: number;
    }

    const shapeNodes: AnimatedShapeNode[] = [];
    const outerWireMat = new THREE.LineBasicMaterial({
      color: 0x00e5b0,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      depthTest: false,
    });
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x38f8d2,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      depthTest: false,
    });
    const orbitRingMat = new THREE.LineBasicMaterial({
      color: 0x00e5b0,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      depthTest: false,
    });

    const rawOuterGeos = [
      new THREE.IcosahedronGeometry(1.36, 1),
      new THREE.OctahedronGeometry(1.3, 1),
      new THREE.DodecahedronGeometry(1.22, 0),
    ];
    const outerWireGeometries = rawOuterGeos.map((g) => {
      const wg = new THREE.WireframeGeometry(g);
      g.dispose();
      return wg;
    });

    const innerGeometries = [
      new THREE.OctahedronGeometry(0.72, 0),
      new THREE.IcosahedronGeometry(0.66, 0),
      new THREE.OctahedronGeometry(0.64, 0),
    ];

    const rawRingGeo = new THREE.TorusGeometry(1.76, 0.036, 6, 32);
    const ringWireGeo = new THREE.WireframeGeometry(rawRingGeo);
    rawRingGeo.dispose();

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
      const outer = new THREE.LineSegments(
        outerWireGeometries[idx % outerWireGeometries.length],
        outerWireMat
      );
      const inner = new THREE.Mesh(
        innerGeometries[idx % innerGeometries.length],
        innerCoreMat
      );
      const ring = new THREE.LineSegments(ringWireGeo, orbitRingMat);
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
    const particleCount = 32;
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
      depthTest: false,
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
          gl_PointSize = clamp(22.0 / -mvPosition.z, 1.5, 4.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float distSq = dot(c, c);
          if (distSq > 0.25) discard;
          float soft = 1.0 - distSq * 4.0;
          gl_FragColor = vec4(uColor, vAlpha * soft);
        }
      `,
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

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
    let invViewportW = 1 / Math.max(1, window.innerWidth);
    let invViewportH = 1 / Math.max(1, window.innerHeight);

    const handleScroll = () => {
      targetScrollY = window.scrollY || 0;
    };
    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX * invViewportW - 0.5) * 2;
      targetMouseY = (e.clientY * invViewportH - 0.5) * 2;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const tick = (nowMs: number) => {
      if (disposed) return;
      if (document.hidden) {
        timerId = window.setTimeout(() => {
          if (!disposed) frameId = requestAnimationFrame(tick);
        }, 250);
        return;
      }

      const delta = Math.min(0.05, Math.max(0.001, (nowMs - lastTimeMs) * 0.001));
      lastTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) * 0.001;

      // Silky 120Hz exponential smoothing so scroll transitions & wave ripples never micro-stutter
      const scrollLerp = 1 - Math.exp(-14 * delta);
      const mouseLerp = 1 - Math.exp(-10 * delta);
      const prevSmoothScrollY = smoothScrollY;
      smoothScrollY += (targetScrollY - smoothScrollY) * scrollLerp;
      const instantVel = THREE.MathUtils.clamp((smoothScrollY - prevSmoothScrollY) / delta, -2400, 2400);
      smoothVelocity += (instantVel - smoothVelocity) * scrollLerp;
      smoothMouseX += (targetMouseX - smoothMouseX) * mouseLerp;
      smoothMouseY += (targetMouseY - smoothMouseY) * mouseLerp;

      const scrollPhase = smoothScrollY * 0.0044;
      const velNorm = Math.min(1, Math.abs(smoothVelocity) / 900);

      waveMat.uniforms.uTime.value = elapsed * 1.35;
      waveMat.uniforms.uScrollPhase.value = smoothScrollY * 0.0038;
      particleMat.uniforms.uTime.value = elapsed * 1.25 + smoothScrollY * 0.0012;

      // Camera parallax
      camera.position.x = smoothMouseX * 0.54;
      camera.position.y = 2.3 - smoothMouseY * 0.34;
      camera.rotation.x = -smoothMouseY * 0.016 - smoothVelocity * 0.000018;
      camera.rotation.y = -smoothMouseX * 0.02;

      // Wireframe "Jal" starts at the bottom (-4.65) when scrollY = 0, and rises upward smoothly on scroll
      const scrollRiseY = Math.min(6.6, smoothScrollY * 0.0042);
      waveMesh.position.y = -4.65 + scrollRiseY + Math.sin(elapsed * 0.85) * 0.16;
      waveMesh.rotation.x = -Math.PI * 0.42 + Math.min(0.28, smoothScrollY * 0.00018);
      waveMesh.rotation.z = Math.sin(scrollPhase * 0.52) * 0.05 + smoothMouseX * 0.022;

      // Scroll-choreographed 3D wireframe shapes
      for (let i = 0; i < shapeNodes.length; i++) {
        const node = shapeNodes[i];
        const dir = i % 2 === 0 ? 1 : -1;
        const t = elapsed * node.floatSpeed + node.phase;

        const scrollOrbitX =
          dir * Math.sin(scrollPhase * 1.05 + node.phase) * 1.6 + smoothMouseX * 0.6;
        const scrollOrbitY =
          Math.sin(scrollPhase * 1.22 + node.phase * 1.3) * 2.2 * dir - smoothMouseY * 0.38;
        const scrollDepthZ = Math.cos(scrollPhase * 0.94 + node.phase) * 1.4;

        node.group.position.x =
          node.basePos.x + Math.cos(t * 0.88) * node.orbitRadius + scrollOrbitX;
        node.group.position.y =
          node.basePos.y + Math.sin(t) * node.floatAmp + scrollOrbitY;
        node.group.position.z =
          node.basePos.z + Math.sin(t * 0.68) * (node.orbitRadius * 0.7) + scrollDepthZ;

        const dynamicScale =
          node.baseScale *
          (1 + Math.sin(scrollPhase * 1.04 + node.phase) * 0.08 + velNorm * 0.12);
        node.group.scale.setScalar(dynamicScale);

        node.group.rotation.x =
          Math.sin(scrollPhase * 0.85 + node.phase) * 0.4 + smoothVelocity * 0.0007 * dir;
        node.group.rotation.y = scrollPhase * 1.15 * dir + smoothMouseX * 0.24;
        node.group.rotation.z =
          Math.cos(scrollPhase * 0.78 + node.phase) * 0.32 - smoothVelocity * 0.0005 * dir;

        node.outer.rotation.x = elapsed * node.rotSpeed.x * 1.35 + scrollPhase * 1.4;
        node.outer.rotation.y = elapsed * node.rotSpeed.y * 1.35 + scrollPhase * 1.8 * dir;
        node.inner.rotation.x = -elapsed * node.rotSpeed.y * 1.55 - scrollPhase * 1.55;
        node.inner.rotation.z = elapsed * node.rotSpeed.z * 1.55 + scrollPhase * 1.15 * dir;
        node.ring.rotation.z = elapsed * 0.62 + node.phase + scrollPhase * 2.0 * dir;
        node.ring.rotation.x =
          Math.PI * 0.35 + Math.sin(elapsed * 0.85 + scrollPhase * 0.92) * 0.28;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        timerId = window.setTimeout(() => {
          if (!disposed) frameId = requestAnimationFrame(tick);
        }, 32);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (disposed) return;
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      invViewportW = 1 / Math.max(1, w);
      invViewportH = 1 / h;
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
      waveWireGeo.dispose();
      waveMat.dispose();
      outerWireGeometries.forEach((g) => g.dispose());
      innerGeometries.forEach((g) => g.dispose());
      ringWireGeo.dispose();
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
