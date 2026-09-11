import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MedicalWorldCanvasProps {
  scrollProgress: number; // 0 to 1
}

export const MedicalWorldCanvas: React.FC<MedicalWorldCanvasProps> = ({ scrollProgress }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollTargetRef = useRef(0);
  const scrollCurrentRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    scrollTargetRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060b18, 0.025);
    scene.background = new THREE.Color(0x060b18);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 15, 35);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x22d3ee, 2.5);
    dirLight1.position.set(20, 40, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 2.0);
    dirLight2.position.set(-20, 30, -20);
    scene.add(dirLight2);

    const pulseLight = new THREE.PointLight(0x10b981, 3, 30);
    pulseLight.position.set(0, 5, 0);
    scene.add(pulseLight);

    // --- 3D Flight Camera Curve ---
    const curvePoints = [
      new THREE.Vector3(0, 10, 35),      // Station 0 / Hero Intro
      new THREE.Vector3(-14, 8, 20),     // Station 1: Red-Flag Emergency Triage
      new THREE.Vector3(12, 12, 5),      // Station 2: Diagnostic OCR Center
      new THREE.Vector3(-10, 15, -12),   // Station 3: pgvector Specialist Match
      new THREE.Vector3(14, 18, -28),    // Station 4: HIS/EMR Clinical Workstation
      new THREE.Vector3(0, 22, -45),     // Station 5: Escrow & Finale CTA
    ];
    const cameraPath = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.5);

    const targetPoints = [
      new THREE.Vector3(0, 2, 0),        // Look at central hub
      new THREE.Vector3(-18, 4, 14),     // Look at Triage Station
      new THREE.Vector3(16, 6, -1),      // Look at Diagnostic Lab
      new THREE.Vector3(-14, 8, -18),    // Look at Doctor Network
      new THREE.Vector3(18, 12, -34),    // Look at EMR Hospital Hub
      new THREE.Vector3(0, 14, -52),     // Look at Finale Core
    ];
    const targetPath = new THREE.CatmullRomCurve3(targetPoints, false, 'catmullrom', 0.5);

    // --- Ground Grid / Cyber Matrix ---
    const gridHelper = new THREE.GridHelper(160, 80, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // --- Floating Particles (Bio-Medical Data Cloud) ---
    const particleCount = 750;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colCyan = new THREE.Color(0x06b6d4);
    const colEmerald = new THREE.Color(0x10b981);
    const colPurple = new THREE.Color(0x8b5cf6);

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 120;
      particlePos[i * 3 + 1] = Math.random() * 45 - 5;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 120 - 15;

      const randCol = Math.random();
      const col = randCol < 0.4 ? colCyan : randCol < 0.7 ? colEmerald : colPurple;
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- Station 1: Red-Flag Emergency Station (Cross + Beacon) ---
    const station1Group = new THREE.Group();
    station1Group.position.set(-18, 2, 14);

    const ringGeo = new THREE.TorusGeometry(3.5, 0.08, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    ringMesh1.rotation.x = Math.PI / 2;
    station1Group.add(ringMesh1);

    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.7,
      metalness: 0.5,
      roughness: 0.1,
    });
    const crossBarV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), crossMat);
    const crossBarH = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 0.8), crossMat);
    crossBarV.position.y = 2.5;
    crossBarH.position.y = 2.5;
    station1Group.add(crossBarV);
    station1Group.add(crossBarH);

    const coneGeo = new THREE.ConeGeometry(3.2, 5, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      wireframe: true,
    });
    const coneMesh1 = new THREE.Mesh(coneGeo, coneMat);
    coneMesh1.position.y = 2.5;
    station1Group.add(coneMesh1);
    scene.add(station1Group);

    // --- Station 2: Diagnostic Multimodal OCR Laboratory ---
    const station2Group = new THREE.Group();
    station2Group.position.set(16, 4, -1);

    const prismGeo = new THREE.OctahedronGeometry(2.4, 0);
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });
    const prismMesh = new THREE.Mesh(prismGeo, prismMat);
    prismMesh.position.y = 3;
    station2Group.add(prismMesh);

    const scanRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(4, 0.06, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    );
    scanRing1.position.y = 3;
    station2Group.add(scanRing1);

    const scanRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.05, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true })
    );
    scanRing2.position.y = 3;
    scanRing2.rotation.x = Math.PI / 4;
    station2Group.add(scanRing2);
    scene.add(station2Group);

    // --- Station 3: pgvector Specialist Neural Matching ---
    const station3Group = new THREE.Group();
    station3Group.position.set(-14, 6, -18);

    const nodeCenter = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2, 1),
      new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x6d28d9,
        emissiveIntensity: 1.0,
        wireframe: true,
      })
    );
    nodeCenter.position.y = 2.5;
    station3Group.add(nodeCenter);

    const satellites: THREE.Mesh[] = [];
    const satGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const satMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9 });
    for (let i = 0; i < 6; i++) {
      const sat = new THREE.Mesh(satGeo, satMat);
      station3Group.add(sat);
      satellites.push(sat);
    }
    scene.add(station3Group);

    // --- Station 4: Doctor Clinical Workstation & EMR Core ---
    const station4Group = new THREE.Group();
    station4Group.position.set(18, 9, -34);

    const towerGeo = new THREE.BoxGeometry(4, 10, 4);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.2,
    });
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.y = 5;
    station4Group.add(towerMesh);

    for (let lvl = 1; lvl <= 5; lvl++) {
      const lvlMesh = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.2, 4.2),
        new THREE.MeshBasicMaterial({ color: lvl % 2 === 0 ? 0x10b981 : 0x38bdf8 })
      );
      lvlMesh.position.y = lvl * 1.8;
      station4Group.add(lvlMesh);
    }

    const dnaGroup = new THREE.Group();
    dnaGroup.position.set(-3.5, 5, 0);
    const dnaBallGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const dnaBallMat1 = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const dnaBallMat2 = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let d = 0; d < 24; d++) {
      const angle = d * 0.45;
      const y = d * 0.4 - 4.5;
      const b1 = new THREE.Mesh(dnaBallGeo, dnaBallMat1);
      const b2 = new THREE.Mesh(dnaBallGeo, dnaBallMat2);
      b1.position.set(Math.cos(angle) * 1.2, y, Math.sin(angle) * 1.2);
      b2.position.set(Math.cos(angle + Math.PI) * 1.2, y, Math.sin(angle + Math.PI) * 1.2);
      dnaGroup.add(b1);
      dnaGroup.add(b2);
    }
    station4Group.add(dnaGroup);
    scene.add(station4Group);

    // --- Station 5: Escrow / Finale Gateway Core ---
    const station5Group = new THREE.Group();
    station5Group.position.set(0, 12, -52);

    const portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.25, 16, 100),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 1.2,
        metalness: 0.8,
        roughness: 0.1,
      })
    );
    portalRing.position.y = 6;
    station5Group.add(portalRing);

    const innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.8, 2),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.9,
      })
    );
    innerCore.position.y = 6;
    station5Group.add(innerCore);
    scene.add(station5Group);

    // --- Mouse Parallax Handling ---
    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = nx * 2.5;
      mouseRef.current.targetY = ny * 1.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- Window Resize ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      scrollCurrentRef.current += (scrollTargetRef.current - scrollCurrentRef.current) * 0.08;
      const t = Math.max(0, Math.min(1, scrollCurrentRef.current));

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const baseCamPos = cameraPath.getPointAt(t);
      const baseTargetPos = targetPath.getPointAt(t);

      camera.position.x = baseCamPos.x + mouseRef.current.x;
      camera.position.y = baseCamPos.y + mouseRef.current.y;
      camera.position.z = baseCamPos.z;

      camera.lookAt(baseTargetPos.x, baseTargetPos.y, baseTargetPos.z);

      coneMesh1.rotation.y = elapsed * 1.2;
      crossBarV.rotation.y = elapsed * 0.5;
      crossBarH.rotation.y = elapsed * 0.5;

      prismMesh.rotation.x = elapsed * 0.6;
      prismMesh.rotation.y = elapsed * 0.8;
      scanRing1.rotation.z = elapsed * 0.5;
      scanRing2.rotation.y = -elapsed * 0.7;

      nodeCenter.rotation.y = elapsed * 0.4;
      satellites.forEach((sat, idx) => {
        const theta = elapsed * 1.5 + (idx * Math.PI) / 3;
        const radius = 3.8;
        sat.position.set(
          Math.cos(theta) * radius,
          2.5 + Math.sin(theta * 2) * 0.8,
          Math.sin(theta) * radius
        );
      });

      dnaGroup.rotation.y = elapsed * 0.8;
      portalRing.rotation.z = elapsed * 0.4;
      innerCore.rotation.x = elapsed * 0.5;
      innerCore.rotation.y = elapsed * 0.7;

      pulseLight.intensity = 2.5 + Math.sin(elapsed * 3) * 1.5;
      pulseLight.position.x = baseTargetPos.x;
      pulseLight.position.y = baseTargetPos.y + 2;
      pulseLight.position.z = baseTargetPos.z;

      particles.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
      style={{ background: '#060b18' }}
    />
  );
};
