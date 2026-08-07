import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCw, RefreshCw, AlertTriangle, Zap, Thermometer, Radio, Disc, Camera } from 'lucide-react';
import type { LiveTelemetry } from '@/hooks/useMissionSocket';

export type SubsystemComponentId = 'battery' | 'solar' | 'antenna' | 'thermal' | 'reaction_wheel' | 'payload';

interface Spacecraft3DProps {
  telemetry: LiveTelemetry | null;
  activeFaults: string[];
  selectedComponent: SubsystemComponentId | null;
  onSelectComponent: (id: SubsystemComponentId) => void;
}

export function Spacecraft3D({
  telemetry,
  activeFaults,
  selectedComponent,
  onSelectComponent,
}: Spacecraft3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mainGroupRef = useRef<THREE.Group | null>(null);

  // Mesh references for dynamic material highlighting
  const meshesRef = useRef<Record<string, THREE.Mesh | THREE.Group>>({});

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0e1a);

    // Starfield background
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 800;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 150;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.3, transparent: true, opacity: 0.8 });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(6, 4, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    sunLight.position.set(10, 15, 10);
    scene.add(sunLight);

    const earthGlowLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    earthGlowLight.position.set(-10, -10, -5);
    scene.add(earthGlowLight);

    // 5. Main Spacecraft Group
    const spacecraftGroup = new THREE.Group();
    mainGroupRef.current = spacecraftGroup;
    scene.add(spacecraftGroup);

    // A. Main Satellite Body Bus (Octagonal prism look)
    const busGeo = new THREE.CylinderGeometry(1.2, 1.2, 2.2, 8);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x0f172a,
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    spacecraftGroup.add(busMesh);
    meshesRef.current['body'] = busMesh;

    // Foil gold wraps
    const foilGeo = new THREE.BoxGeometry(2.3, 1.8, 2.3);
    const foilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.3,
    });
    const foilMesh = new THREE.Mesh(foilGeo, foilMat);
    foilMesh.scale.set(0.95, 0.95, 0.95);
    spacecraftGroup.add(foilMesh);

    // B. Solar Panels (Left & Right Wings)
    const solarGroup = new THREE.Group();
    const panelGeo = new THREE.BoxGeometry(3.5, 0.08, 1.2);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.2,
    });

    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.set(-3.0, 0, 0);
    solarGroup.add(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.set(3.0, 0, 0);
    solarGroup.add(rightPanel);

    // Solar Panel Grid Lines
    const gridGeo = new THREE.BoxGeometry(3.4, 0.09, 1.1);
    const gridMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true });
    const leftGrid = new THREE.Mesh(gridGeo, gridMat);
    leftGrid.position.set(-3.0, 0, 0);
    solarGroup.add(leftGrid);
    const rightGrid = new THREE.Mesh(gridGeo, gridMat);
    rightGrid.position.set(3.0, 0, 0);
    solarGroup.add(rightGrid);

    // Attach boom connectors
    const boomGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4);
    const boomMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const boom = new THREE.Mesh(boomGeo, boomMat);
    boom.rotation.z = Math.PI / 2;
    solarGroup.add(boom);

    spacecraftGroup.add(solarGroup);
    meshesRef.current['solar'] = solarGroup;

    // C. Communication Antenna (Parabolic Dish)
    const antennaGroup = new THREE.Group();
    const dishGeo = new THREE.ConeGeometry(0.8, 0.35, 24, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = Math.PI;
    antennaGroup.add(dish);

    const hornGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const horn = new THREE.Mesh(hornGeo, hornMat);
    horn.position.set(0, -0.3, 0);
    antennaGroup.add(horn);

    antennaGroup.position.set(0, 1.4, 0);
    spacecraftGroup.add(antennaGroup);
    meshesRef.current['antenna'] = antennaGroup;

    // D. Camera / Imaging Payload (Bottom Lens Assembly)
    const cameraGroup = new THREE.Group();
    const lensBarrelGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 16);
    const lensBarrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const lensBarrel = new THREE.Mesh(lensBarrelGeo, lensBarrelMat);
    cameraGroup.add(lensBarrel);

    const glassGeo = new THREE.CircleGeometry(0.3, 16);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      metalness: 1.0,
      roughness: 0.0,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.rotation.x = Math.PI / 2;
    glass.position.set(0, -0.31, 0);
    cameraGroup.add(glass);

    cameraGroup.position.set(0, -1.3, 0);
    spacecraftGroup.add(cameraGroup);
    meshesRef.current['payload'] = cameraGroup;

    // E. Reaction Wheel Gyros (Internal Disks)
    const rwGroup = new THREE.Group();
    const rwRingGeo = new THREE.TorusGeometry(0.4, 0.08, 12, 24);
    const rwMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.8, emissive: 0x047857, emissiveIntensity: 0.3 });
    const rw1 = new THREE.Mesh(rwRingGeo, rwMat);
    rw1.rotation.x = Math.PI / 2;
    rwGroup.add(rw1);

    const rw2 = new THREE.Mesh(rwRingGeo, rwMat);
    rw2.rotation.y = Math.PI / 2;
    rwGroup.add(rw2);

    rwGroup.position.set(0, 0.4, 0);
    spacecraftGroup.add(rwGroup);
    meshesRef.current['reaction_wheel'] = rwGroup;

    // F. Thermal Radiators (Side Metallic Plates)
    const radiatorGroup = new THREE.Group();
    const radGeo = new THREE.BoxGeometry(0.05, 1.2, 1.2);
    const radMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1, emissive: 0x0284c7, emissiveIntensity: 0.2 });
    const radLeft = new THREE.Mesh(radGeo, radMat);
    radLeft.position.set(-1.15, 0, 0);
    radiatorGroup.add(radLeft);
    const radRight = new THREE.Mesh(radGeo, radMat);
    radRight.position.set(1.15, 0, 0);
    radiatorGroup.add(radRight);

    spacecraftGroup.add(radiatorGroup);
    meshesRef.current['thermal'] = radiatorGroup;

    // G. Battery Module Block
    const batGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
    const batMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.5, emissive: 0x15803d, emissiveIntensity: 0.3 });
    const batMesh = new THREE.Mesh(batGeo, batMat);
    batMesh.position.set(0, -0.5, 0.6);
    spacecraftGroup.add(batMesh);
    meshesRef.current['battery'] = batMesh;

    // 6. Raycasting Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(spacecraftGroup.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && obj.parent !== spacecraftGroup && obj.parent !== scene) {
          obj = obj.parent;
        }
        for (const [key, meshGroup] of Object.entries(meshesRef.current)) {
          if (meshGroup === obj) {
            setHoveredComponent(key);
            container.style.cursor = 'pointer';
            return;
          }
        }
      }
      setHoveredComponent(null);
      container.style.cursor = 'grab';
    };

    const handlePointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(spacecraftGroup.children, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && obj.parent !== spacecraftGroup && obj.parent !== scene) {
          obj = obj.parent;
        }
        for (const [key, meshGroup] of Object.entries(meshesRef.current)) {
          if (meshGroup === obj) {
            onSelectComponent(key as SubsystemComponentId);
            return;
          }
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousemove', handlePointerMove);
    domEl.addEventListener('click', handlePointerDown);

    // Orbit Drag Control Simulation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !mainGroupRef.current) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      mainGroupRef.current.rotation.y += deltaX * 0.008;
      mainGroupRef.current.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!cameraRef.current) return;
      e.preventDefault();
      cameraRef.current.position.z = Math.max(3.5, Math.min(18, cameraRef.current.position.z + e.deltaY * 0.005));
    };

    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // 7. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (autoRotate && mainGroupRef.current && !isDragging) {
        mainGroupRef.current.rotation.y += delta * 0.3;
      }

      // Rotate internal reaction wheel
      if (meshesRef.current['reaction_wheel']) {
        meshesRef.current['reaction_wheel'].rotation.z += delta * 2.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousemove', handlePointerMove);
      domEl.removeEventListener('click', handlePointerDown);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [autoRotate]);

  // Update material highlights based on selectedComponent, telemetry values, and activeFaults
  useEffect(() => {
    if (!meshesRef.current) return;

    const batteryLevel = telemetry?.battery ?? 100;
    const temp = telemetry?.temperature ?? 22;
    const solarGen = telemetry?.solarGeneration ?? 420;
    const signal = telemetry?.signalStrength ?? 90;

    // Helper to pulse or set emissive color on mesh children
    const applyHighlight = (key: string, baseColor: number, emissiveColor: number, isFault: boolean, isSelected: boolean) => {
      const obj = meshesRef.current[key];
      if (!obj) return;

      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).emissive) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (isFault) {
              mat.emissive.setHex(0xef4444); // Red warning pulse
              mat.emissiveIntensity = 0.8;
            } else if (isSelected) {
              mat.emissive.setHex(0x3b82f6); // Vibrant Blue Selection
              mat.emissiveIntensity = 0.7;
            } else {
              mat.emissive.setHex(emissiveColor);
              mat.emissiveIntensity = 0.2;
            }
          }
        }
      });
    };

    const hasFault = (type: string) => activeFaults.some(f => f.toUpperCase().includes(type));

    // Battery
    const batFault = hasFault('BATTERY');
    const batColor = batteryLevel < 25 ? 0xef4444 : batteryLevel < 60 ? 0xf59e0b : 0x10b981;
    applyHighlight('battery', batColor, batColor, batFault, selectedComponent === 'battery');

    // Solar
    const solarFault = hasFault('SOLAR');
    applyHighlight('solar', 0x1e3a8a, solarGen > 100 ? 0x1d4ed8 : 0x1e293b, solarFault, selectedComponent === 'solar');

    // Antenna
    const commFault = hasFault('COMMUNICATION');
    applyHighlight('antenna', 0xe2e8f0, signal > 50 ? 0x38bdf8 : 0x64748b, commFault, selectedComponent === 'antenna');

    // Thermal
    const thermalFault = hasFault('THERMAL') || temp > 60;
    const thermEmissive = temp > 50 ? 0xf97316 : temp < 10 ? 0x06b6d4 : 0x0284c7;
    applyHighlight('thermal', 0x38bdf8, thermEmissive, thermalFault, selectedComponent === 'thermal');

    // Reaction Wheel
    const rwFault = hasFault('REACTION_WHEEL');
    applyHighlight('reaction_wheel', 0x10b981, 0x047857, rwFault, selectedComponent === 'reaction_wheel');

    // Payload Camera
    const payloadFault = hasFault('PAYLOAD') || hasFault('CAMERA');
    applyHighlight('payload', 0x0f172a, 0x0284c7, payloadFault, selectedComponent === 'payload');

  }, [telemetry, activeFaults, selectedComponent]);

  const handleResetCamera = () => {
    if (cameraRef.current && mainGroupRef.current) {
      cameraRef.current.position.set(6, 4, 8);
      cameraRef.current.lookAt(0, 0, 0);
      mainGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  return (
    <Card className="relative w-full h-[460px] bg-slate-950 border-slate-800 overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header Overlay */}
      <div className="relative z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
          <Disc className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-semibold text-slate-200">ISRO-SAT-4B Interactive 3D Model</span>
          <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-400">WebGL Telemetry Reactive</Badge>
        </div>

        {/* Active Fault Indicator Counter */}
        {activeFaults.length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/50 text-red-400 px-3 py-1 rounded-lg animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold">{activeFaults.length} Active Fault(s) Highlighted</span>
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {hoveredComponent && (
        <div className="absolute top-16 left-4 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-md border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase">
          Component: <span className="font-bold text-white">{hoveredComponent.replace('_', ' ')}</span> (Click to inspect)
        </div>
      )}

      {/* Bottom Subsystem Quick Selector Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-800/80">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'battery', label: 'Battery', icon: Zap },
            { id: 'solar', label: 'Solar Wings', icon: SunIcon },
            { id: 'antenna', label: 'Antenna', icon: Radio },
            { id: 'thermal', label: 'Thermal', icon: Thermometer },
            { id: 'reaction_wheel', label: 'Reaction Wheel', icon: Disc },
            { id: 'payload', label: 'Camera Payload', icon: Camera },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedComponent === item.id;
            const hasFault = activeFaults.some(f => f.toLowerCase().includes(item.id));
            return (
              <Button
                key={item.id}
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => onSelectComponent(item.id as SubsystemComponentId)}
                className={`h-7 px-2.5 text-[11px] gap-1 transition-all ${
                  hasFault
                    ? 'border-red-500 text-red-400 bg-red-950/40 hover:bg-red-900/50'
                    : isSelected
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
                    : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-7 w-7 p-0 ${autoRotate ? 'text-cyan-400 bg-cyan-950/40' : 'text-slate-400'}`}
            title="Toggle Auto-Rotation"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetCamera}
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            title="Reset Camera View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}
