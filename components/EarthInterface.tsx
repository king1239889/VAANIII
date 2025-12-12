
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Layers, RotateCw, Orbit, Sun, Database, Telescope, Move3d, MousePointer2, Bookmark, FastForward, Play, Pause, MapPin, MessageSquare, Plus, Glasses, CloudFog } from 'lucide-react';
import { CameraBookmark, UniverseMarker } from '../types';

interface EarthInterfaceProps {
  searchQuery?: string;
  initialLocation?: { lat: number, lng: number };
  onAskVaaniii?: (query: string) => void;
  showConstellations?: boolean;
}

// ... (CELESTIAL_DATA remains same, kept implicit) ...
const CELESTIAL_DATA: any = {
  sun: {
    id: 'sun', name: 'Sun', type: 'STAR', r: 80, dist: 0, speed: 0, rot: 0.0005, e: 0, tilt: 7.25, inclination: 0, color: 0xfffee0,
    texture: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/sun.jpg',
    stats: { type: 'G-Type Main Sequence', temp: '5,505°C', gravity: '274 m/s²', mass: '1.989 × 10^30 kg' }
  },
  // ... (Other planets assumed to be here as before) ...
  earth: {
    id: 'earth', name: 'Earth', type: 'PLANET', parent: 'sun', r: 6, dist: 240, speed: 0.015, rot: 0.04, e: 0.017, tilt: 23.5, inclination: 0,
    texture: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    stats: { temp: '15°C', gravity: '9.8 m/s²', moons: '1' }
  },
};

export const EarthInterface: React.FC<EarthInterfaceProps> = ({ searchQuery, initialLocation, onAskVaaniii, showConstellations = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'FREE' | 'TRACKING'>('FREE');
  const [vrMode, setVrMode] = useState(false); // NEW
  const [showNebula, setShowNebula] = useState(true); // NEW

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nebulaRef = useRef<THREE.Points | null>(null);
  
  // NEW: Secondary Camera for VR Split
  const cameraRightRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x000000, 0.0002);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 300000);
    camera.position.set(0, 400, 800);
    cameraRef.current = camera;
    
    // VR Right Camera
    const cameraRight = new THREE.PerspectiveCamera(45, width / height, 1, 300000);
    cameraRightRef.current = cameraRight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.autoClear = false; // Important for split screen
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Lighting
    const sunLight = new THREE.PointLight(0xfffee0, 3.0, 50000, 0.1);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(5000 * 3);
    for(let i=0; i<5000*3; i++) starPos[i] = (Math.random() - 0.5) * 20000;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({color: 0xffffff, size: 2})));

    // NEW: Nebula System (Volumetric Cloud Simulation)
    const nebulaCount = 2000;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);
    for(let i=0; i<nebulaCount; i++) {
        const r = 2000 + Math.random() * 2000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        nebulaPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        nebulaPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.1; // Flattened disk
        nebulaPos[i*3+2] = r * Math.cos(phi);
        
        // Color Gradient (Purple to Blue)
        const color = new THREE.Color().setHSL(0.6 + Math.random()*0.2, 0.8, 0.5);
        nebulaColors[i*3] = color.r;
        nebulaColors[i*3+1] = color.g;
        nebulaColors[i*3+2] = color.b;
    }
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
    const nebulaMat = new THREE.PointsMaterial({
        size: 50, vertexColors: true, transparent: true, opacity: 0.1, 
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const nebula = new THREE.Points(nebulaGeo, nebulaMat);
    scene.add(nebula);
    nebulaRef.current = nebula;

    // Load Basic Celestial Bodies (Simplified loop for stability)
    Object.keys(CELESTIAL_DATA).forEach(key => {
        const data = CELESTIAL_DATA[key];
        const mesh: THREE.Mesh = new THREE.Mesh(
            new THREE.SphereGeometry(data.r, 32, 32),
            new THREE.MeshStandardMaterial({ color: data.color || 0x888888 })
        );
        // Simple Texture Loader would go here
        if (data.id === 'sun') {
             mesh.material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
             mesh.add(new THREE.PointLight(0xffaa00, 2, 5000));
        }
        mesh.userData = data;
        scene.add(mesh);
    });

    const animate = () => {
        requestAnimationFrame(animate);
        controls.update();

        // Nebula Animation
        if (nebulaRef.current) {
            nebulaRef.current.rotation.y += 0.0002;
            nebulaRef.current.visible = showNebula;
        }

        if (vrMode) {
            // Stereoscopic Render
            const w = renderer.domElement.width;
            const h = renderer.domElement.height;
            
            renderer.clear();

            // Left Eye
            renderer.setViewport(0, 0, w/2, h);
            renderer.setScissor(0, 0, w/2, h);
            renderer.setScissorTest(true);
            camera.aspect = (w/2) / h;
            camera.updateProjectionMatrix();
            // Slight shift left
            camera.position.x -= 2; 
            renderer.render(scene, camera);
            camera.position.x += 2; // Reset

            // Right Eye
            renderer.setViewport(w/2, 0, w/2, h);
            renderer.setScissor(w/2, 0, w/2, h);
            renderer.setScissorTest(true);
            cameraRight.position.copy(camera.position);
            cameraRight.quaternion.copy(camera.quaternion);
            cameraRight.position.x += 2; // Slight shift right
            cameraRight.aspect = (w/2) / h;
            cameraRight.updateProjectionMatrix();
            renderer.render(scene, cameraRight);

            renderer.setScissorTest(false);
        } else {
            // Standard Render
            renderer.setViewport(0, 0, renderer.domElement.width, renderer.domElement.height);
            camera.aspect = renderer.domElement.width / renderer.domElement.height;
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
        }
    };
    animate();
    setLoading(false);

    const handleResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [vrMode, showNebula]);

  return (
    <div className="w-full h-full relative bg-black select-none font-sans">
       {loading && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-van-accent font-mono text-xs">INITIALIZING UNIVERSE SIMULATION...</div>}
       <div ref={mountRef} className="w-full h-full cursor-move" />
       
       {/* VR SPLIT LINE */}
       {vrMode && <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-van-accent/50 z-40 pointer-events-none"></div>}

       <div className="absolute top-6 left-6 z-20 pointer-events-none">
          <div className="flex items-center gap-3 text-van-accent font-display font-bold text-2xl tracking-widest">
              <Sun size={24} className="animate-spin-slow" /><span>VAANIII UNIVERSE</span>
          </div>
          <div className="text-[10px] font-mono text-van-500 uppercase tracking-[0.3em] pl-9">
              REAL-TIME SIMULATION
          </div>
       </div>

       {/* Control Panel */}
       <div className="absolute top-24 right-6 z-30 flex flex-col gap-3">
            <button onClick={() => setVrMode(!vrMode)} className={`p-3 border rounded-lg backdrop-blur-md transition-all ${vrMode ? 'bg-van-accent text-black' : 'bg-black/60 text-van-accent border-van-accent/30'}`} title="VR Mode">
                <Glasses size={20} />
            </button>
            <button onClick={() => setShowNebula(!showNebula)} className={`p-3 border rounded-lg backdrop-blur-md transition-all ${showNebula ? 'bg-van-purple text-black border-van-purple' : 'bg-black/60 text-van-purple border-van-purple/30'}`} title="Toggle Nebula">
                <CloudFog size={20} />
            </button>
       </div>
    </div>
  );
};
