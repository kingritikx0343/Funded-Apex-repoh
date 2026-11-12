import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import heroCandlestickImg from '../assets/images/hero_candlestick_3d_1793875616783.jpg';

/**
 * FUNDED APEX — Custom 3D Hero Architectural Sculpture
 * Right-side hero centerpiece featuring:
 * - Sculpted 3D metallic black & brushed-titanium 'A' architectural monument
 * - Angular beveled 3D dark-chrome cubes & hexagonal precision frames
 * - Smoked emerald glass geometric prisms & ascending institutional candlestick columns
 * - Controlled emerald (#00E676) rim lighting and realistic reflections
 */
export const HeroArchitectural3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software/i.test(String(rendererStr));

    const width = Math.max(320, container.clientWidth || 540);
    const height = Math.max(320, container.clientHeight || 480);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 11.5);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // Cinematic Studio Lighting — Brushed Titanium + Emerald Rim
    const ambient = new THREE.AmbientLight(0x0b150e, 0.85);
    scene.add(ambient);

    const emeraldRimRight = new THREE.DirectionalLight(0x00e676, 3.2);
    emeraldRimRight.position.set(8, 7, 6);
    scene.add(emeraldRimRight);

    const emeraldRimLeft = new THREE.DirectionalLight(0x00c853, 1.8);
    emeraldRimLeft.position.set(-8, -5, 5);
    scene.add(emeraldRimLeft);

    const topSpecularLight = new THREE.DirectionalLight(0xffffff, 1.45);
    topSpecularLight.position.set(0, 10, 8);
    scene.add(topSpecularLight);

    const coreEmeraldPoint = new THREE.PointLight(0x00e676, 2.4, 12);
    coreEmeraldPoint.position.set(0, 0.2, 1.5);
    scene.add(coreEmeraldPoint);

    // Luxury Materials
    const brushedTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x121915,
      metalness: 0.94,
      roughness: 0.18,
    });

    const darkChromeMat = new THREE.MeshStandardMaterial({
      color: 0x070a08,
      metalness: 0.96,
      roughness: 0.12,
    });

    const smokedEmeraldGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x00e676,
      emissive: 0x003819,
      emissiveIntensity: 0.35,
      metalness: 0.15,
      roughness: 0.12,
      transmission: 0.65,
      thickness: 1.2,
      transparent: true,
      opacity: 0.88,
    });

    const emeraldGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 0.75,
      metalness: 0.5,
      roughness: 0.2,
    });

    const emeraldWireMat = new THREE.LineBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.42,
    });

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Central Sculpted Architectural 'A' Monument
    const apexMonument = new THREE.Group();
    rootGroup.add(apexMonument);

    const pillarGeo = new THREE.BoxGeometry(0.68, 4.4, 0.72);
    const pillarEdges = new THREE.EdgesGeometry(pillarGeo);

    const leftPillar = new THREE.Mesh(pillarGeo, brushedTitaniumMat);
    leftPillar.position.set(-0.92, 0.1, 0);
    leftPillar.rotation.z = -0.38;
    leftPillar.add(new THREE.LineSegments(pillarEdges, emeraldWireMat));
    apexMonument.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, darkChromeMat);
    rightPillar.position.set(0.92, 0.1, 0);
    rightPillar.rotation.z = 0.38;
    rightPillar.add(new THREE.LineSegments(pillarEdges, emeraldWireMat));
    apexMonument.add(rightPillar);

    // Crossbar & Emerald Chevron Core
    const crossbarGeo = new THREE.BoxGeometry(2.15, 0.46, 0.86);
    const crossbar = new THREE.Mesh(crossbarGeo, smokedEmeraldGlassMat);
    crossbar.position.set(0, -0.55, 0.18);
    crossbar.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(crossbarGeo), emeraldWireMat)
    );
    apexMonument.add(crossbar);

    // Apex Crown Diamond at Top of 'A'
    const crownGeo = new THREE.OctahedronGeometry(0.52, 0);
    const crownMesh = new THREE.Mesh(crownGeo, emeraldGlowMat);
    crownMesh.position.set(0, 2.35, 0.15);
    apexMonument.add(crownMesh);

    // 2. Precision Architectural Hexagonal & Gyroscopic Rings
    const outerHexGeo = new THREE.TorusGeometry(3.35, 0.045, 16, 6);
    const outerHexRing = new THREE.Mesh(outerHexGeo, brushedTitaniumMat);
    outerHexRing.rotation.z = Math.PI / 6;
    rootGroup.add(outerHexRing);

    const innerEmeraldRingGeo = new THREE.TorusGeometry(2.65, 0.028, 16, 64);
    const innerEmeraldRing = new THREE.Mesh(innerEmeraldRingGeo, emeraldGlowMat);
    innerEmeraldRing.rotation.set(0.55, 0.35, 0);
    rootGroup.add(innerEmeraldRing);

    // 3. Ascending 3D Institutional Candlestick / Liquidity Bars
    const candlesGroup = new THREE.Group();
    candlesGroup.position.set(0, -0.3, -0.85);
    rootGroup.add(candlesGroup);

    const candleSpecs = [
      { x: -2.4, h: 1.2, y: -0.9, emerald: false },
      { x: -1.6, h: 1.75, y: -0.5, emerald: true },
      { x: 1.6, h: 2.15, y: 0.1, emerald: false },
      { x: 2.4, h: 2.75, y: 0.55, emerald: true },
    ];

    candleSpecs.forEach((c) => {
      const bodyGeo = new THREE.BoxGeometry(0.36, c.h, 0.36);
      const bodyMesh = new THREE.Mesh(
        bodyGeo,
        c.emerald ? smokedEmeraldGlassMat : darkChromeMat
      );
      bodyMesh.position.set(c.x, c.y, 0);
      bodyMesh.add(
        new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), emeraldWireMat)
      );

      const wickGeo = new THREE.CylinderGeometry(0.025, 0.025, c.h + 0.75, 8);
      const wickMesh = new THREE.Mesh(wickGeo, emeraldGlowMat);
      wickMesh.position.set(c.x, c.y, 0);

      candlesGroup.add(bodyMesh);
      candlesGroup.add(wickMesh);
    });

    // 4. Floating Beveled Cubes & Smoked Emerald Prisms
    const floatingCubes: { mesh: THREE.Object3D; baseY: number; phase: number }[] = [];
    const cubeGeo = new THREE.BoxGeometry(0.58, 0.58, 0.58);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeo);

    const cubeCoords = [
      { x: -2.85, y: 1.75, z: 0.9, glass: true },
      { x: 2.95, y: -1.65, z: 0.85, glass: false },
      { x: -2.1, y: -2.15, z: 0.6, glass: false },
      { x: 2.35, y: 2.05, z: 0.7, glass: true },
    ];

    cubeCoords.forEach((pos, idx) => {
      const cube = new THREE.Mesh(
        cubeGeo,
        pos.glass ? smokedEmeraldGlassMat : brushedTitaniumMat
      );
      cube.position.set(pos.x, pos.y, pos.z);
      cube.rotation.set(idx * 0.5, idx * 0.8, idx * 0.3);
      cube.add(new THREE.LineSegments(cubeEdges, emeraldWireMat));
      rootGroup.add(cube);
      floatingCubes.push({ mesh: cube, baseY: pos.y, phase: idx * 1.4 });
    });

    let pointerX = 0;
    let pointerY = 0;
    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const relY = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      pointerX = Math.max(-0.5, Math.min(0.5, relX));
      pointerY = Math.max(-0.5, Math.min(0.5, relY));
    };
    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(300, container.clientWidth || 540);
      const h = Math.max(300, container.clientHeight || 480);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    let disposed = false;
    const t0 = performance.now();

    const animate = (now: number) => {
      if (disposed) return;
      const t = (now - t0) * 0.001;

      apexMonument.position.y = Math.sin(t * 1.1) * 0.14;
      apexMonument.rotation.y = Math.sin(t * 0.55) * 0.22 + pointerX * 0.45;
      apexMonument.rotation.x = pointerY * -0.25;

      crownMesh.rotation.y = t * 1.2;
      outerHexRing.rotation.z = Math.PI / 6 + t * 0.12;
      outerHexRing.rotation.y = Math.cos(t * 0.4) * 0.22;

      innerEmeraldRing.rotation.z = -t * 0.25;
      innerEmeraldRing.rotation.x = 0.55 + Math.sin(t * 0.6) * 0.15;

      floatingCubes.forEach((fc, idx) => {
        fc.mesh.position.y = fc.baseY + Math.sin(t * 1.4 + fc.phase) * 0.18;
        fc.mesh.rotation.x += 0.006 * (idx % 2 === 0 ? 1 : -1);
        fc.mesh.rotation.y += 0.008;
      });

      renderer.render(scene, camera);

      const afterDraw = () => {
        if (disposed) return;
        if (isSoftwareGl) {
          setTimeout(() => {
            rafId = requestAnimationFrame(animate);
          }, 70);
        } else {
          rafId = requestAnimationFrame(animate);
        }
      };
      afterDraw();
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      pillarGeo.dispose();
      pillarEdges.dispose();
      crossbarGeo.dispose();
      crownGeo.dispose();
      outerHexGeo.dispose();
      innerEmeraldRingGeo.dispose();
      cubeGeo.dispose();
      cubeEdges.dispose();
      brushedTitaniumMat.dispose();
      darkChromeMat.dispose();
      smokedEmeraldGlassMat.dispose();
      emeraldGlowMat.dispose();
      emeraldWireMat.dispose();
      envTexture.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[440px] lg:h-[500px] rounded-2xl bg-[#030504] border border-[#00E676]/22 shadow-[0_30px_90px_rgba(0,0,0,0.98),0_0_40px_rgba(0,230,118,0.08)] overflow-hidden select-none">
      {/* Subtle Architectural Backdrop Image + Pure Black Vignette */}
      <img
        src={heroCandlestickImg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity pointer-events-none"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(0, 230, 118, 0.13) 0%, rgba(3, 5, 4, 0.86) 58%, #000000 100%)',
        }}
      />

      {/* Fine Technical Coordinate Grid Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-45 pointer-events-none" />

      {/* Top Institutional Telemetry Bar */}
      <div className="absolute top-3.5 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#060907]/90 border border-[#00E676]/25 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#FFFFFF]">
            APEX-3D // INSTITUTIONAL CORE
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#060907]/90 border border-white/10 font-mono text-[10px] text-[#A7B1AA]">
          <span>SPREAD:</span>
          <span className="text-[#00E676] font-bold">0.0 PIPS</span>
          <span className="text-white/20">|</span>
          <span>EXEC:</span>
          <span className="text-[#00E676] font-bold">&lt;15ms</span>
        </div>
      </div>

      {/* Three.js 3D Architectural Sculpture Canvas */}
      <div ref={mountRef} className="relative z-10 w-full h-full" />

      {/* Bottom Institutional Allocation Overlay Cards */}
      <div className="absolute bottom-3.5 left-4 right-4 z-20 grid grid-cols-3 gap-2.5 pointer-events-none">
        <div className="px-3 py-2.5 rounded-xl bg-[#090D0A]/92 border border-[#00E676]/20 backdrop-blur-md">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#77837B]">
            MAX ALLOCATION
          </div>
          <div className="text-sm sm:text-base font-display font-extrabold text-white font-mono mt-0.5">
            $200,000+
          </div>
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-[#090D0A]/92 border border-[#00E676]/20 backdrop-blur-md">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#77837B]">
            PROFIT SPLIT
          </div>
          <div className="text-sm sm:text-base font-display font-extrabold text-[#00E676] font-mono mt-0.5">
            UP TO 90%
          </div>
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-[#090D0A]/92 border border-[#00E676]/20 backdrop-blur-md">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#77837B]">
            PAYOUT SPEED
          </div>
          <div className="text-sm sm:text-base font-display font-extrabold text-white font-mono mt-0.5">
            24 HOURS
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroArchitectural3D;
