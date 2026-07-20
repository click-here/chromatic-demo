// Chromatic city: rendering only. State in, pixels out. No game rules here.
// relative imports so the page works from any static host mount point
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { EffectComposer } from './vendor/EffectComposer.js';
import { RenderPass } from './vendor/RenderPass.js';
import { UnrealBloomPass } from './vendor/UnrealBloomPass.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { Reflector } from './vendor/Reflector.js';
import { CATALOG, LOTS, plotName } from './city-game.js';

// The whole library is Blender-built synthwave now; the old placeholder
// models are no longer loaded.
const MODELS = [
  'synthwave/synthwave-tower', 'synthwave/synthwave-tower-b',
  'synthwave/synthwave-faceted',
  'synthwave/synthwave-house', 'synthwave/synthwave-shop',
  'synthwave/synthwave-workshop', 'synthwave/synthwave-grove',
  'synthwave/synthwave-fountain',
  'synthwave/synthwave-house-b', 'synthwave/synthwave-shop-b',
  'synthwave/synthwave-house-c', 'synthwave/synthwave-house-d',
  'synthwave/synthwave-shop-c', 'synthwave/synthwave-shop-d',
  'synthwave/decor-road', 'synthwave/decor-road-cross',
  'synthwave/decor-road-lamps', 'synthwave/decor-road-poles',
  'synthwave/decor-ground', 'synthwave/decor-plot',
  'synthwave/synthwave-capsule', 'synthwave/synthwave-ministry',
  'synthwave/decor-filler-a', 'synthwave/decor-filler-b',
  'synthwave/decor-filler-c',
  'synthwave/synthwave-subway', 'synthwave/synthwave-market',
  'synthwave/synthwave-charging', 'synthwave/synthwave-substation',
  'synthwave/synthwave-antenna', 'synthwave/synthwave-shrine',
  'synthwave/synthwave-billboard', 'synthwave/synthwave-billboard-b',
  'synthwave/synthwave-gate',
  'synthwave/synthwave-vending', 'synthwave/synthwave-mega',
  'synthwave/synthwave-mega-slab', 'synthwave/synthwave-mega-zigg',
  'synthwave/synthwave-mega-twins',
  'synthwave/decor-props-a', 'synthwave/decor-props-b',
  'synthwave/decor-props-c', 'synthwave/decor-car',
  'synthwave/decor-van', 'synthwave/decor-taxi', 'synthwave/decor-flyer',
  'synthwave/decor-train',
  'synthwave/synthwave-pagoda', 'synthwave/synthwave-cooling',
  'synthwave/synthwave-dome', 'synthwave/synthwave-twist',
  'synthwave/synthwave-station', 'synthwave/synthwave-halt',
  'synthwave/synthwave-mega-slab-b', 'synthwave/synthwave-mega-slab-c',
  'synthwave/synthwave-mega-slab-d',
  'synthwave/synthwave-mega-zigg-b', 'synthwave/synthwave-mega-twins-b',
  'synthwave/synthwave-shop-e', 'synthwave/synthwave-shop-f',
  'synthwave/synthwave-vending-b', 'synthwave/synthwave-hoarding',
  'synthwave/decor-filler-d', 'synthwave/decor-filler-e', 'synthwave/decor-filler-f',
  'synthwave/synthwave-mascot'];

// rooftop clutter in the synthwave GLBs is named RK_* (fan, steam, beacon);
// it installs at completion, so construction previews hide it
const isRoofKit = (name) => name.startsWith('RK_');

// Filler cells: a tower-heavy mix with a lit set piece every few cells,
// deterministic per cell; scenery pieces get a ground tile planted
// beneath them. NO vegetation (the art director 2026-07-18: no trees in the city) -
// the old green cells are fillers and set pieces now.
const FILL_ROTATION = [
  'synthwave/decor-filler-d', 'synthwave/decor-filler-a',
  'synthwave/synthwave-charging', 'synthwave/decor-filler-e',
  'synthwave/synthwave-shrine', 'synthwave/decor-filler-f',
  'synthwave/decor-filler-b', 'synthwave/synthwave-vending-b',
  'synthwave/decor-filler-d', 'synthwave/decor-filler-b',
  'synthwave/decor-filler-e', 'synthwave/decor-filler-c',
  'synthwave/synthwave-fountain', 'synthwave/decor-filler-f',
  'synthwave/decor-filler-a', 'synthwave/synthwave-market',
];
function fillCell(x, z) {
  const name = FILL_ROTATION[Math.abs(x * 7 + z * 13 + 5) % FILL_ROTATION.length];
  const rotQ = Math.abs(x * 3 + z) % 4;
  if (name.includes('decor-ground')) {
    return [[name, x, z, 0]];
  }
  return [['synthwave/decor-ground', x, z, 0], [name, x, z, rotQ]];
}

// district subway entrances [x, z, rotQ]: rotQ turns the authored mouth
// (-z north at rotQ 0) toward the adjacent avenue. South one sits across
// the avenue from the monorail station (interchange read); north and east
// give the far districts their own transit sense.
const DISTRICT_SUBWAYS = [
  [-1, 7, 3],   // south avenue, mouth east; beside the monorail station
  [-1, -8, 3],  // north avenue, mouth east
  [8, -1, 2],   // east arterial, mouth south
];

// fixed ambient decoration: [model, x, z, rotQuarter]
// Roads on x=0 and z=0; LOTS tiles (see city-game.js) are left empty here.
const DECOR = [
  ['synthwave/decor-road-cross', 0, 0, 0],
  ...[-4, -2, 2, 4].map(d => ['synthwave/decor-road', d, 0, 1]),
  ['synthwave/decor-road-poles', 3, 0, 1], ['synthwave/decor-road-poles', -3, 0, 1],
  ['synthwave/decor-road-lamps', 1, 0, 1], ['synthwave/decor-road-lamps', -1, 0, 1],
  ...[-4, -3, -1, 1, 4].map(d => ['synthwave/decor-road', 0, d, 0]),
  ['synthwave/decor-road-poles', 0, -2, 0], ['synthwave/decor-road-poles', 0, 2, 0],
  ['synthwave/decor-road', 0, 3, 0],
  ['synthwave/decor-filler-e', 4, -1, 0], ['synthwave/synthwave-antenna', 4, -2, 0], ['synthwave/decor-filler-b', 4, -3, 0],
  ['synthwave/decor-filler-d', -3, -1, 0], ['synthwave/synthwave-substation', -3, -2, 0], ['synthwave/decor-filler-a', -3, -3, 2],
  ['synthwave/synthwave-market', 2, -2, 0], ['synthwave/decor-filler-c', 2, -3, 0],
  ['synthwave/decor-filler-f', 3, 1, 0], ['synthwave/decor-filler-c', 3, 2, 0], ['synthwave/synthwave-billboard', 4, 1, 1],
  ['synthwave/decor-filler-a', 4, 2, 0], ['synthwave/synthwave-charging', -3, 1, 0], ['synthwave/decor-filler-b', -3, 2, 0],
  ['synthwave/synthwave-billboard-b', -3, 3, 2],
  ['synthwave/synthwave-vending-b', -2, 2, 0], ['synthwave/synthwave-shrine', -1, 3, 3], ['synthwave/synthwave-subway', 1, 3, 1],
  // road furniture + the frontier megabuilding (overhangs the corner ring)
  ['synthwave/synthwave-gate', 0, 3, 0],
  ['synthwave/synthwave-mega', 4, 4, 0],
  // avenues run on past the plate, through the downtown ring, and out to the
  // second band
  ...[-11, -10, -9, -8, -7, -6, -5, 5, 6, 7, 8, 9, 10, 11].map(d => ['synthwave/decor-road', d, 0, 1]),
  ...[-11, -10, -9, -8, -7, -6, -5, 5, 6, 7, 8, 9, 10, 11].map(d => ['synthwave/decor-road', 0, d, 0]),
  ['synthwave/decor-road-lamps', 6, 0, 1], ['synthwave/decor-road-lamps', -6, 0, 1],
  ['synthwave/decor-road-lamps', 0, 6, 0], ['synthwave/decor-road-lamps', 0, -6, 0],
  ['synthwave/decor-road-lamps', 9, 0, 1], ['synthwave/decor-road-lamps', -9, 0, 1],
  ['synthwave/decor-road-lamps', 0, 9, 0], ['synthwave/decor-road-lamps', 0, -9, 0],
  // district subway entrances (transit-sense pass): same GLB as (1,3),
  // mouths facing their avenues. Cells are registered in groundCovered
  // below - a district ground tile would seal the sunken shaft at grade
  ...DISTRICT_SUBWAYS.map(t => ['synthwave/synthwave-subway', t[0], t[1], t[2]]),
  // sidewalk prop strips hug the road edges (fractional coords are fine:
  // place() centers on whatever point it is given)
  ['synthwave/decor-props-a', -3, 0.41, 0], ['synthwave/decor-props-c', -1, -0.41, 0],
  ['synthwave/decor-props-b', 1, 0.41, 0], ['synthwave/decor-props-a', 2, -0.41, 0],
  ['synthwave/decor-props-c', 4, 0.41, 0], ['synthwave/decor-props-b', -4, -0.41, 0],
  ['synthwave/decor-props-c', 6, -0.41, 0], ['synthwave/decor-props-a', 7, 0.41, 0],
  ['synthwave/decor-props-a', 0.41, -3, 1], ['synthwave/decor-props-c', -0.41, -1, 1],
  ['synthwave/decor-props-b', 0.41, 2, 1], ['synthwave/decor-props-a', -0.41, 4, 1],
  ['synthwave/decor-props-c', 0.41, 6, 1],
  // parked curb rows by the plots (critique: perpetual traffic with no
  // origins reads as a screensaver; cars need somewhere to stop)
  ['synthwave/decor-props-c', -5, 0.41, 0], ['synthwave/decor-props-a', 5, -0.41, 0],
  ['synthwave/decor-props-c', 0.41, 1, 1], ['synthwave/decor-props-a', -0.41, -2, 1],
  // scenery pieces carry only partial ground of their own; plant ground
  // tiles beneath them so they don't sit on the bare base (the second row
  // is the ex-tree cells, filler blocks now)
  // (1,3) gets NO ground tile: the subway's pad covers its whole cell and
  // a planted slab would seal the sunken stair shaft at grade
  ...[[4, -3], [-3, -3], [3, 2], [4, -2], [-3, -2], [2, -2], [4, 1], [-3, 1],
      [-2, 2], [-1, 3], [4, 4], [-3, 3],
      [4, -1], [-3, -1], [2, -3], [3, 1], [4, 2], [-3, 2]]
    .map(t => ['synthwave/decor-ground', t[0], t[1], 0]),
  ...frameRing(),
  // tick-marked plot tiles under every buildable lot so open plots read as
  // surveyed land; player buildings render on top of these tiles
  ...LOTS.map(t => ['synthwave/decor-plot', t[0], t[1], 0]),
];
DECOR.push(...coverageFill(DECOR));

function frameRing() {
  const out = [];
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
    if (x === 0 || z === 0) continue;
    if (Math.abs(x) === 4 || Math.abs(z) === 4) {
      const used = [[4,-1],[4,-2],[4,-3],[4,1],[4,2],[4,4]].some(t => t[0]===x && t[1]===z);
      if (!used) out.push(...fillCell(x, z));
    }
  }
  return out;
}

// any 9x9 cell not otherwise covered gets scenery so the ground has no voids
function coverageFill(entries) {
  const covered = new Set(entries.map(e => e[1] + ',' + e[2]));
  const out = [];
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      if (!covered.has(x + ',' + z)) {
        out.push(...fillCell(x, z));
      }
    }
  }
  return out;
}

export async function createScene(container, opts) {
  const reduced = !!(opts && opts.reducedMotion);
  const assetBase = (opts && opts.assetBase) || './assets/city/';
  const cinematic = !!(opts && opts.cinematic) && !reduced;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1322);
  scene.fog = new THREE.Fog(0x0d1322, 14, 42);

  // skybox: procedural night dome (gradient, purple light-pollution bloom,
  // seeded stars). The equator of the sphere IS the horizon (v=0.5 on the
  // equirect canvas), and it matches the fog color exactly so fogged
  // buildings dissolve into sky instead of silhouetting against it.
  {
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 512;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#04060d');      // zenith
    grad.addColorStop(0.33, '#0a0f1e');
    grad.addColorStop(0.44, '#1c1237');   // purple bloom above the skyline
    grad.addColorStop(0.5, '#0d1322');    // horizon = fog color
    grad.addColorStop(1, '#0d1322');      // below-horizon stays fog color
    g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
    const hz = g.createLinearGradient(0, 205, 0, 262);
    hz.addColorStop(0, 'rgba(255,60,190,0)');
    hz.addColorStop(0.72, 'rgba(255,60,190,0.11)');
    hz.addColorStop(1, 'rgba(255,60,190,0)');
    g.fillStyle = hz; g.fillRect(0, 205, 1024, 57);
    let s = 9;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 260; i++) {
      const x = rnd() * 1024;
      const y = Math.pow(rnd(), 1.5) * 205;   // denser toward the zenith
      const r = rnd() < 0.12 ? 1.5 : 0.85;
      const a = 0.22 + rnd() * 0.5;
      const tint = rnd();
      g.fillStyle = tint < 0.08 ? 'rgba(255,170,225,' + a + ')'
        : tint < 0.16 ? 'rgba(170,255,235,' + a + ')'
        : 'rgba(215,225,255,' + a + ')';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(88, 32, 24),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide,
        fog: false, depthWrite: false }));
    scene.add(dome);
  }

  const camera = new THREE.PerspectiveCamera(
    36, container.clientWidth / container.clientHeight, 0.1, 100);
  // no canvas MSAA: every frame leaves through the composer's render
  // targets (which have none), so it would only multisample the final
  // fullscreen blit while still paying the memory and the resolve
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  // cap 1.5: retina dpr 2 means 4x the fill of a 1080p frame, and bloom +
  // the wet reflector both scale with it; 1.5 is indistinguishable at night
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;   // Soft's 9-tap filter profiled as real fill cost; plain PCF is fine at night
  // the city barely moves: render the shadow map only when the built city
  // changes (updateCity flips needsUpdate) instead of every frame. Vehicle
  // shadows freeze, which is invisible at night. Profiled at ~7ms/frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.localClippingEnabled = true;   // construction shell/paint use clip planes
  container.appendChild(renderer.domElement);

  // bloom for the synthwave neon: threshold 1.0 keeps sun-lit surfaces out of
  // the pass, so only the HDR emissive panes/strips (2.0+) actually glow
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // half-res bloom input: bloom is blur by definition, the output is
  // indistinguishable and the ~10 internal passes shrink 4x
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth / 2, container.clientHeight / 2), 0.35, 0.3, 1.0);
  composer.addPass(bloomPass);
  // debug/profiling handle: lets headless QA toggle subsystems and read
  // renderer.info without reaching into module scope
  window.__city = { renderer, scene, camera, composer, bloomPass };

  // drag to orbit, wheel to zoom, right-drag to pan; the auto tour takes
  // the camera back once input has been quiet for a while
  const LOOK_AT = new THREE.Vector3(0.3, 2.2, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(LOOK_AT);
  controls.enableDamping = true;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2 - 0.08;  // stay above the ground plane
  controls.enabled = !cinematic;                 // the shot reel owns the camera
  const RESUME_AFTER_MS = 20000;
  let camMode = 'auto';                          // 'auto' | 'manual' | 'return'
  let lastInputMs = 0;
  controls.addEventListener('start', () => { camMode = 'manual'; lastInputMs = performance.now(); });
  controls.addEventListener('change', () => { lastInputMs = performance.now(); });
  controls.addEventListener('end', () => { lastInputMs = performance.now(); });

  // aerial pan is the primary read of the city, so the rig favors the
  // top-down view: lifted hemisphere + steeper warm key light the roofs
  const hemi = new THREE.HemisphereLight(0x8aa0d8, 0x1a2233, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc890, 1.2);
  sun.position.set(6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
  scene.add(sun);
  if (window.__city) window.__city.sun = sun; else window.__city = { sun };

  // the moon: a soft glowing disc hanging over the city (fog-exempt sprite)
  // plus its cool fill light from the same direction
  const mc = document.createElement('canvas'); mc.width = mc.height = 256;
  const mg = mc.getContext('2d');
  const mgrad = mg.createRadialGradient(128, 128, 30, 128, 128, 128);
  mgrad.addColorStop(0, 'rgba(235,240,255,1)');
  mgrad.addColorStop(0.35, 'rgba(210,220,250,0.95)');
  mgrad.addColorStop(0.55, 'rgba(160,175,230,0.28)');
  mgrad.addColorStop(1, 'rgba(140,160,220,0)');
  mg.fillStyle = mgrad; mg.fillRect(0, 0, 256, 256);
  const moonMat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(mc), fog: false, depthWrite: false,
    transparent: true, opacity: 0.95 });
  const moon = new THREE.Sprite(moonMat);
  // big and LOW: the demo camera pitches down, so a high moon never enters
  // the frame; a giant horizon moon is also the more synthwave call
  moon.position.set(-30, 6.5, -22);
  moon.scale.setScalar(8);
  scene.add(moon);
  const moonLight = new THREE.DirectionalLight(0xbfd0ff, 0.35);
  moonLight.position.set(-14, 20, -16);
  scene.add(moonLight);

  const lampA = new THREE.PointLight(0xffd479, 0.9, 5);
  lampA.position.set(0.5, 0.7, 0.5);
  scene.add(lampA);
  // street-light pools along both roads: from the air the streets read as
  // chains of warm light instead of black gaps. Kept in an array because the
  // lowest quality tier culls all but the crossroad pair (forward lighting
  // pays every point light on every lit fragment).
  const poolLights = [];
  for (const [lx, lz, lc] of [[2, 0, 0xffb0e0], [-2, 0, 0xffd479], [0, 2, 0xa8ffe8],
                              [0, -2, 0xffb0e0], [4, 0, 0xa8ffe8], [0, -4, 0xffd479]]) {
    const pl = new THREE.PointLight(lc, 0.85, 5, 1.7);
    pl.position.set(lx, 0.55, lz);
    poolLights.push(pl);
    scene.add(pl);
  }

  // extends well past the fog horizon so no void band shows at the edge
  const base = new THREE.Mesh(new THREE.CircleGeometry(80, 48),
    new THREE.MeshStandardMaterial({ color: 0x101828, roughness: 1 }));
  base.rotation.x = -Math.PI / 2; base.position.y = -0.02;
  base.receiveShadow = true;
  scene.add(base);

  // load the model library (animations kept for the synthwave set)
  const loader = new GLTFLoader();
  const lib = {};
  const libAnims = {};
  let modelsLoaded = 0;
  await Promise.all(MODELS.map(n => new Promise((res, rej) =>
    loader.load(assetBase + n + '.glb', g => {
      g.scene.traverse(o => { if (o.isMesh) {
        // translucent steam puffs would cast solid shadow blobs
        o.castShadow = !o.name.startsWith('RK_Puff');
        o.receiveShadow = true;
      } });
      lib[n] = g.scene; libAnims[n] = g.animations || [];
      modelsLoaded++;
      if (opts && opts.onProgress) opts.onProgress(modelsLoaded, MODELS.length);
      res();
    }, undefined, rej))));

  // Canonical materials: every GLB ships its own instances of the same
  // generator materials, and merged batches can only collapse per material
  // instance (profiled: ~1000 scene draw calls, mostly this). Dedupe by a
  // content signature. Accent pairs vary per building, so colors are in the
  // key; atlas-art materials share names but not textures, so maps key by
  // uuid EXCEPT the Body* grime/paint maps, which are seed-identical by
  // construction across GLBs.
  {
    const canon = new Map();
    const matKey = (m) => {
      const tex = m.map ? (/^Body/.test(m.name) ? 'bodytex' : 'map:' + m.map.uuid) : 'flat';
      return [m.name, m.type,
        m.color ? m.color.getHexString() : '',
        m.emissive ? m.emissive.getHexString() : '',
        m.emissiveIntensity ?? 0, m.roughness ?? 0, m.metalness ?? 0,
        m.opacity ?? 1, m.transparent ? 't' : 'o', m.side ?? 0, tex].join('|');
    };
    for (const n of MODELS) lib[n].traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      const k = matKey(o.material);
      if (!canon.has(k)) canon.set(k, o.material);
      o.material = canon.get(k);
    });
    // chrome moment (universe-survey S-tier): materials the generator names
    // Chrome* get a tiny equirect envmap PER MATERIAL, never
    // scene.environment (that would change every standard material and
    // break the locked look). The env is a night-gradient strip: dark
    // ground, purple horizon band, near-black sky - enough for chrome to
    // read as chrome under bloom.
    {
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 32;
      const g = cv.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 32);
      gr.addColorStop(0, '#05070e');
      gr.addColorStop(0.42, '#0d1226');
      gr.addColorStop(0.52, '#7a3fa8');
      gr.addColorStop(0.58, '#c04f9e');
      gr.addColorStop(0.66, '#1a1030');
      gr.addColorStop(1, '#0a0e18');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 32);
      const env = new THREE.CanvasTexture(cv);
      env.mapping = THREE.EquirectangularReflectionMapping;
      env.colorSpace = THREE.SRGBColorSpace;
      for (const m of canon.values()) {
        if (m.name && m.name.startsWith('Chrome')) {
          m.envMap = env;
          m.envMapIntensity = 1.25;
          m.needsUpdate = true;
        }
      }
    }
  }

  // drop UV attributes no material samples: old GLBs bake a UV layer on
  // every mesh, new ones only where textured, and the mismatched attribute
  // signatures were fragmenting merge buckets (profiled: 15 batches for
  // one material)
  const stripUnusedUV = (g, m) => {
    if (!m.map && g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    if (g.attributes.uv2) g.deleteAttribute('uv2');
    return g;
  };

  // vehicles are rigid (their motion is page-side): flatten each lib model
  // once so every clone costs a few draws instead of ~16 (profiled: the
  // fleet was ~320 draw calls)
  for (const n of ['synthwave/decor-car', 'synthwave/decor-van',
                   'synthwave/decor-taxi', 'synthwave/decor-flyer',
                   'synthwave/decor-train']) {
    if ((libAnims[n] || []).length) continue;   // animated GLB: leave it live
    const root = lib[n];
    root.updateMatrixWorld(true);
    const buckets = new Map();
    root.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      const g = stripUnusedUV(o.geometry.clone().applyMatrix4(o.matrixWorld), o.material);
      const key = o.material.uuid
        + '|' + Object.keys(g.attributes).sort().join(',')
        + '|' + (g.index ? 'i' : 'n');
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
      buckets.get(key).geos.push(g);
    });
    const flat = new THREE.Group();
    for (const { mat, geos } of buckets.values()) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      flat.add(mesh);
    }
    lib[n] = flat;
  }

  const R = Math.PI / 2;
  // Ground tiles must butt edge-to-edge, so they fill their full cell. Only a
  // model that clearly overflows (a wide scenery piece) gets scaled down, and
  // then only to fill the cell (not shrunk with a margin). The tolerance keeps
  // floating-point dust on a nominally 1x1 tile from tripping the shrink and
  // leaving gaps; a little tree-canopy overhang past the cell is fine.
  const FIT_TOL = 0.15;
  // every static clone lands here and is merged into batched meshes after
  // placement; only animated scenery and the player city stay live objects
  const staticRoots = [];
  function place(name, x, z, rotQ = 0, spanX = 1, spanZ = 1) {
    const m = lib[name].clone();
    m.userData.model = name;   // the growth reveal classifies by source model
    m.rotation.y = rotQ * R;
    m.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(m);
    const size = box.getSize(new THREE.Vector3());
    if (size.x > spanX + FIT_TOL || size.z > spanZ + FIT_TOL) {
      m.scale.setScalar(Math.min(spanX / size.x, spanZ / size.z));
      m.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(m);
    }
    const c = box.getCenter(new THREE.Vector3());
    // sunken models author real below-grade geometry (subway stair shaft);
    // bbox-grounding would hoist the shaft into the air, so they keep
    // their authored origin height
    const sunken = name.includes('synthwave-subway');
    m.position.set(x - c.x, sunken ? 0 : -box.min.y, z - c.z);
    scene.add(m);
    staticRoots.push(m);
    return m;
  }

  for (const [name, x, z, rotQ] of DECOR) place(name, x, z, rotQ);

  // downtown ring: hand-placed megas + fillers just outside the plate,
  // grid-aligned with the avenues kept clear so the streets read as running
  // on into a real city. Every piece is grounded on its own lit tiles and
  // glow is dimmed, which is what the old random frontier never was (it
  // read as floating window grids and was removed).
  // ring pieces sit clear of the elevated loop line (|x| or |z| = 5.2)
  const SKY = [ // [model, x, z, rotQ, scale]
    // east: the x road exits between tower walls
    ['synthwave/synthwave-mega-twins-b', 6.6, -2.0, 0, 1.25],
    ['synthwave/synthwave-mega-zigg',  6.55, 1.9, 1, 1.1],
    ['synthwave/decor-filler-b',       6.45, -3.7, 0, 2.2],
    ['synthwave/synthwave-mega-slab-b', 7.2,  4.6, 3, 1.2],
    // west: slab + mega close the horizon behind the moonward corner
    ['synthwave/synthwave-mega-slab', -6.6, -1.8, 1, 1.3],
    ['synthwave/synthwave-mega',      -6.8,  2.2, 2, 1.1],
    ['synthwave/decor-filler-c',      -6.05, 3.9, 0, 2.4],
    ['synthwave/synthwave-mega-zigg-b', -6.2, -4.8, 0, 1.0],
    // north: backdrop for the aerial and reveal shots
    ['synthwave/synthwave-mega-zigg',  2.2, -6.4, 2, 1.3],
    // twins nudged west 2026-07-19 to clear the new halt's entry steps
    ['synthwave/synthwave-mega-twins', -2.6, -6.85, 1, 1.15],
    ['synthwave/decor-filler-a',      -4.9, -6.35, 0, 2.3],
    ['synthwave/synthwave-mega-slab-c', 4.9, -6.6, 2, 1.05],
    // south: the gate road runs on toward more city; the two south-west
    // pieces sit wide of the reveal shot's climb path
    ['synthwave/synthwave-mega-twins-b', -2.6, 7.6, 2, 1.2],
    ['synthwave/synthwave-mega',        2.1,  6.9, 1, 0.95],
    ['synthwave/decor-filler-b',        4.4,  6.45, 0, 2.5],
    ['synthwave/decor-filler-a',       -5.3,  7.2, 0, 2.2],
    // signature silhouettes (approved 2026-07-17): one per ring corner, so
    // every camera angle catches a non-box form
    ['synthwave/synthwave-pagoda',  -6.6, -6.8, 2, 1.2],
    ['synthwave/synthwave-cooling',  7.0, -6.3, 2, 1.3],
    ['synthwave/synthwave-twist',    6.4,  6.4, 0, 1.2],
    ['synthwave/synthwave-dome',    -6.8,  6.4, 0, 1.35],
    // second band: the city thickens from the ring out to radius ~10
    ['synthwave/synthwave-mega',      -7.5, -8.8, 1, 1.25],
    ['synthwave/synthwave-mega-twins',-4.6, -9.1, 0, 1.2],
    ['synthwave/decor-filler-b',       3.4, -8.8, 0, 2.4],
    ['synthwave/synthwave-mega-zigg-b', 7.4, -8.4, 3, 1.2],
    ['synthwave/synthwave-mega-slab-b', 8.9, -4.4, 2, 1.15],
    ['synthwave/decor-filler-a',       8.6,  2.8, 0, 2.3],
    ['synthwave/synthwave-mega-zigg-b', 9.0,  6.6, 1, 1.25],
    ['synthwave/synthwave-mega-slab-c', 6.9,  8.3, 0, 1.2],
    ['synthwave/decor-filler-a',       2.9,  8.9, 0, 2.5],
    ['synthwave/synthwave-mega',      -4.2,  9.3, 2, 1.2],
    ['synthwave/decor-filler-c',      -7.6,  8.6, 0, 2.4],
    ['synthwave/synthwave-mega-twins-b', -8.8, -3.3, 1, 1.2],
    ['synthwave/decor-filler-b',      -8.7,  1.2, 0, 2.3],
    ['synthwave/synthwave-mega-slab-b', -9.0, 5.2, 1, 1.15],
    // universe-survey S-tier (2026-07-18): the capsule tower's modular
    // silhouette breaks the smooth-mass monotony of the NW band; the
    // MINISTRY pyramid is the skyline's seat-of-power icon (tournament
    // winner over the sentinel statue - solid-triangle silhouette,
    // neon rake lines converging at the apex beacon from the air)
    ['synthwave/synthwave-capsule',   -8.9, -6.9, 0, 1.25],
    ['synthwave/synthwave-ministry',   5.4, -9.6, 2, 1.5],
    // vista termini: a lit facade closes each long avenue view, pushed out
    // past the second band. EAST stays open (critique panel: the city needs
    // a way in or out) - its twins flank the arterial instead of blocking it
    ['synthwave/synthwave-mega-twins', 11.3,  2.5, 1, 1.45],
    ['synthwave/synthwave-mega-slab-d', 0.2, -11.2, 0, 1.45],
    ['synthwave/synthwave-mega-zigg',   0.1,  11.3, 2, 1.4],
    ['synthwave/synthwave-mega',      -11.2, -0.15, 1, 1.45],
  ];
  const skyDim = new Map();
  const skyMat = (mat) => {
    if (!skyDim.has(mat)) {
      const d = mat.clone();
      if (d.emissiveIntensity !== undefined) d.emissiveIntensity *= 0.6;
      skyDim.set(mat, d);
    }
    return skyDim.get(mat);
  };
  // one tile per cell outside the plate: SKY footprints, road arms, and the
  // district fill below all register here so nothing double-places
  const groundCovered = new Set();
  const placeGround = (gx, gz, name = 'synthwave/decor-ground') => {
    const key = gx + ',' + gz;
    if (groundCovered.has(key)) return;
    groundCovered.add(key);
    place(name, gx, gz, 0);
  };
  for (const d of [-11, -10, -9, -8, -7, -6, -5, 5, 6, 7, 8, 9, 10, 11]) {
    groundCovered.add(d + ',0');   // extended road arms own these cells
    groundCovered.add('0,' + d);
  }
  // district subway cells: the pad covers the full cell and a planted
  // slab would seal the sunken stair shaft at grade (same rule as (1,3))
  for (const [sx, sz] of DISTRICT_SUBWAYS) groundCovered.add(sx + ',' + sz);
  // scenery animates only where it defines the piece (cooling-tower steam);
  // everything else merges into the static batch below
  const sceneryMixers = [];
  // live (unmerged) scenery that must still join a growth-reveal band
  const growLiveScenery = [];
  // dome glass and cooling steam are already sub-threshold by design;
  // the 0.6x scenery dim turns them into black voids on the skyline
  // the ministry joins the no-dim set: its only glow is the four rake
  // lines + apex beacon, and the authority icon must punch from the air
  const SKY_NODIM = new Set(['synthwave/synthwave-dome', 'synthwave/synthwave-cooling',
    'synthwave/synthwave-ministry']);
  for (const [name, x, z, rotQ, sc] of SKY) {
    const m = lib[name].clone();
    if (!SKY_NODIM.has(name)) m.traverse(o => {
      if (o.isMesh) o.material = Array.isArray(o.material)
        ? o.material.map(skyMat) : skyMat(o.material);
    });
    m.scale.setScalar(sc);
    m.rotation.y = rotQ * R;
    m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m);
    const c = box.getCenter(new THREE.Vector3());
    m.position.set(x - c.x, -box.min.y, z - c.z);
    scene.add(m);
    if (name === 'synthwave/synthwave-cooling' && !reduced) {
      const mx = new THREE.AnimationMixer(m);
      for (const cl of libAnims[name]) mx.clipAction(cl).play();
      sceneryMixers.push(mx);
      growLiveScenery.push({ m, r: Math.hypot(x, z) });
    } else {
      staticRoots.push(m);
    }
    // lit ground tiles under the full footprint so nothing sits on bare void
    for (let gx = Math.round(x - (box.max.x - box.min.x) / 2 + 0.5);
         gx <= Math.round(x + (box.max.x - box.min.x) / 2 - 0.5); gx++) {
      for (let gz = Math.round(z - (box.max.z - box.min.z) / 2 + 0.5);
           gz <= Math.round(z + (box.max.z - box.min.z) / 2 - 0.5); gz++) {
        if (Math.abs(gx) <= 4 && Math.abs(gz) <= 4) continue; // plate owns these
        placeGround(gx, gz);
      }
    }
  }

  // transit stops dock the loop by ORIGIN, never through place() (which
  // would bbox-ground and fit-shrink them off the guideway): the authored
  // stub sits at asset z +0.33, so at TRANSIT_SC the origin lands
  // side * (track line + 0.33 * sc) and the stub top (asset y 0.95) sits
  // at 1.586, just under the beam bottom (1.6); platform top (asset 1.0)
  // lands at 1.67 for a plausible boarding height. side +1 = south
  // straight (rotQ 2 flips the stub), side -1 = north straight (rotQ 0).
  const TRANSIT_SC = 1.67;
  const dockTransit = (name, x, side, rotQ, gx0, gx1, gz0, gz1) => {
    const m = lib[name].clone();
    m.scale.setScalar(TRANSIT_SC);
    m.rotation.y = rotQ * R;
    m.position.set(x, 0, side * (5.2 + 0.33 * TRANSIT_SC));
    scene.add(m);
    staticRoots.push(m);
    for (let gx = gx0; gx <= gx1; gx++)
      for (let gz = gz0; gz <= gz1; gz++) placeGround(gx, gz);
  };
  // monorail station docks the south straight
  dockTransit('synthwave/synthwave-station', -2.5, 1, 2, -4, -1, 5, 6);

  // second, simpler halt docks the NORTH straight (transit-sense pass);
  // origin x -1.2 keeps the east pylon out of the north avenue road
  dockTransit('synthwave/synthwave-halt', -1.2, -1, 0, -2, -1, -7, -5);

  // district fill: every remaining cell out to +-12 gets a tile, so the
  // grid lattice runs unbroken from the plate through both scenery bands
  // and embeds the vista termini (at +-11.2) instead of leaving them on
  // tile islands. Plain ground only - no trees in the city (the art director
  // 2026-07-18); the scenery bands and fog carry the distance.
  for (let gx = -12; gx <= 12; gx++) {
    for (let gz = -12; gz <= 12; gz++) {
      if (Math.abs(gx) <= 4 && Math.abs(gz) <= 4) continue; // plate owns these
      placeGround(gx, gz);
    }
  }

  // static batch: bake every static clone's world transform into its
  // geometry and merge by material. The expanded city places 500+ clones
  // (thousands of meshes); this collapses them to one draw call per
  // material, which is what makes the radius-10 city affordable.
  //
  // GROWTH STORY (opts.growReveal, demo only): the demo builds FROM
  // NOTHING (the art director), so merged buckets split into reveal groups that
  // start hidden and rise as the story advances. Bands 0-3 are radial
  // building rings (plate decor / downtown ring / second band / vista
  // termini) latched by plan progress; band 4 = the surveyed PLOTS, 5 =
  // STREETS (roads, lamps, poles, prop strips), 6 = the loop-line
  // TRANSIT, each latched as an early story beat. Only bare ground
  // (decor-ground) is there from the first frame - the cleared site
  // under the moon. Off the growth path every band is -1 and this merge
  // is byte-for-byte the old one.
  const growBandGroups = [];
  const growBandOf = (r) => r < 5.1 ? 0 : r < 7.8 ? 1 : r < 10.2 ? 2 : 3;
  const GROW_PLOTS = 4, GROW_STREETS = 5, GROW_TRANSIT = 6;
  {
    const buckets = new Map();
    const keepLive = [];   // multi-material meshes survive unmerged
    const growBandGroupsPending = [];   // keepLive pieces awaiting their band
    for (const root of staticRoots) {
      root.updateMatrixWorld(true);
      root.traverse(o => {
        if (!o.isMesh) return;
        if (Array.isArray(o.material)) { keepLive.push(o); return; }
        const g = stripUnusedUV(o.geometry.clone().applyMatrix4(o.matrixWorld), o.material);
        let band = -1;
        if (opts && opts.growReveal) {
          // classify by SOURCE MODEL, whole pieces only: a per-mesh height
          // rule left building podiums/stalls/crates scattered over the
          // "bare" site as chopped-off fragments
          const model = root.userData.model || '';
          if (/decor-ground/.test(model)) band = -1;        // the bare site
          else if (/decor-plot/.test(model)) band = GROW_PLOTS;
          else if (/decor-road|decor-props/.test(model)) band = GROW_STREETS;
          else {
            g.computeBoundingBox();
            const bb = g.boundingBox;
            band = growBandOf(Math.hypot((bb.min.x + bb.max.x) / 2,
                                         (bb.min.z + bb.max.z) / 2));
          }
        }
        const key = o.material.uuid
          + '|' + Object.keys(g.attributes).sort().join(',')
          + '|' + (g.index ? 'i' : 'n')
          + '|' + (o.castShadow ? 's' : '')
          + '|b' + band;
        if (!buckets.has(key))
          buckets.set(key, { mat: o.material, cast: o.castShadow, band, geos: [] });
        buckets.get(key).geos.push(g);
      });
    }
    for (const o of keepLive) {
      scene.attach(o);
      // multi-material survivors join a reveal band too, or they float
      // over the bare site from frame one
      if (opts && opts.growReveal) {
        const p = new THREE.Vector3();
        o.getWorldPosition(p);
        growBandGroupsPending.push({ o, r: Math.hypot(p.x, p.z) });
      }
    }
    for (const root of staticRoots) scene.remove(root);
    staticRoots.length = 0;
    if (opts && opts.growReveal) {
      // groups start HIDDEN at y 0 (not sunk): the searchlight seating
      // raycast below needs true roof heights, and three.js raycasts hit
      // invisible meshes; the sink is applied when a group's rise starts.
      // 0-3 radial building bands, then plots / streets / transit.
      for (let i = 0; i < 7; i++) {
        const grp = new THREE.Group();
        grp.visible = false;
        scene.add(grp);
        growBandGroups.push(grp);
      }
    }
    for (const { mat, cast, band, geos } of buckets.values()) {
      const merged = new THREE.Mesh(mergeGeometries(geos), mat);
      merged.castShadow = cast;
      merged.receiveShadow = true;
      if (band >= 0) growBandGroups[band].add(merged);
      else scene.add(merged);
    }
    if (opts && opts.growReveal) {
      for (const { m, r } of growLiveScenery) growBandGroups[growBandOf(r)].add(m);
      for (const { o, r } of growBandGroupsPending) growBandGroups[growBandOf(r)].add(o);
    }
  }

  let seed = 23;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // traffic: a mix of cars, vans, and taxis glides the lanes (practicals
  // baked into the GLBs); they run the full extended avenues and the fog
  // swallows them at the ends. Authored facing -x; nose aims down travel.
  const aimY = (axis, dir) => axis === 'x' ? (dir > 0 ? Math.PI : 0)
                                           : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  const TRAFFIC_MIX = ['synthwave/decor-car', 'synthwave/decor-car',
                       'synthwave/decor-van', 'synthwave/decor-taxi'];
  const cars = [];
  for (let i = 0; i < 10; i++) {
    const c = lib[TRAFFIC_MIX[i % TRAFFIC_MIX.length]].clone();
    c.scale.setScalar(0.9);
    const axis = i % 2 ? 'z' : 'x';
    const off = i % 4 < 2 ? 0.12 : -0.12;
    const dir = off > 0 ? 1 : -1;
    c.rotation.y = aimY(axis, dir);
    cars.push({ m: c, axis, p: rand() * 20.8 - 10.4, v: 0.35 + rand() * 0.5, off });
    // growth story: traffic arrives with the streets
    if (growBandGroups.length) growBandGroups[GROW_STREETS].add(c);
    else scene.add(c);
  }

  // ---- elevated loop line: a rounded-square track ringing the plate ------
  // One piecewise arc-length path shared by the guideway geometry, the
  // train, and the cab-view cinematic shot, so all three stay in sync.
  // Straights at |x|,|z| = S between the plate and the downtown ring;
  // quarter-arc corners of radius R centered at (+-K, +-K).
  const TRK = { S: 5.2, R: 1.2, Y: 1.7, SPEED: 1.05 };
  const TRK_K = TRK.S - TRK.R;
  const TRK_ST = 2 * TRK_K;
  const TRK_AR = Math.PI / 2 * TRK.R;
  const TRK_L = 4 * (TRK_ST + TRK_AR);
  function trackPos(d) {
    d = ((d % TRK_L) + TRK_L) % TRK_L;
    const leg = Math.floor(d / (TRK_ST + TRK_AR));
    const u = d - leg * (TRK_ST + TRK_AR);
    let x, z, hx, hz;
    if (u < TRK_ST) {
      x = TRK.S; z = -TRK_K + u; hx = 0; hz = 1;
    } else {
      const a = (u - TRK_ST) / TRK.R;
      x = TRK_K + TRK.R * Math.cos(a);
      z = TRK_K + TRK.R * Math.sin(a);
      hx = -Math.sin(a); hz = Math.cos(a);
    }
    for (let i = 0; i < leg; i++) {   // rotate a quarter turn per leg
      const nx = -z, nhx = -hz;
      z = x; x = nx; hz = hx; hx = nhx;
    }
    return { x, z, hx, hz };
  }

  {
    // guideway: dark box beam + sub-threshold neon strip, merged into two
    // meshes; pylons rise from the ground except over the avenues
    const beamGeos = [], stripGeos = [], pylGeos = [];
    const seg = 0.26;
    for (let d = 0; d < TRK_L; d += seg) {
      const p = trackPos(d + seg / 2);
      const rotY = Math.atan2(p.hx, p.hz);
      beamGeos.push(new THREE.BoxGeometry(0.16, 0.1, seg + 0.03).applyMatrix4(
        new THREE.Matrix4().makeRotationY(rotY).setPosition(p.x, TRK.Y - 0.05, p.z)));
      stripGeos.push(new THREE.BoxGeometry(0.03, 0.012, seg + 0.03).applyMatrix4(
        new THREE.Matrix4().makeRotationY(rotY).setPosition(p.x, TRK.Y + 0.004, p.z)));
    }
    for (let d = 0.9; d < TRK_L; d += 1.9) {
      const p = trackPos(d);
      if (Math.abs(p.x) < 0.9 || Math.abs(p.z) < 0.9) continue; // span the roads
      pylGeos.push(new THREE.BoxGeometry(0.1, TRK.Y - 0.1, 0.1).applyMatrix4(
        new THREE.Matrix4().setPosition(p.x, (TRK.Y - 0.1) / 2, p.z)));
    }
    const beamMat = new THREE.MeshStandardMaterial({
      color: 0x151d29, roughness: 0.85, metalness: 0.2 });
    const stripMat = new THREE.MeshStandardMaterial({ color: 0x000000,
      emissive: new THREE.Color(1.0, 0.22, 0.75), emissiveIntensity: 0.98,
      roughness: 1 });
    // growth story: the whole loop line arrives as the "transit opens" beat
    const trkParent = growBandGroups.length
      ? growBandGroups[GROW_TRANSIT] : scene;
    trkParent.add(new THREE.Mesh(mergeGeometries(beamGeos), beamMat));
    trkParent.add(new THREE.Mesh(mergeGeometries(stripGeos), stripMat));
    trkParent.add(new THREE.Mesh(mergeGeometries(pylGeos), beamMat));
  }

  // three cars ride the loop forever; the cab shot samples train.d live
  const train = { d: 0, cars: [] };
  window.__city.train = train;          // choreography QA reads train.d
  window.__city.trackPos = trackPos;
  for (let i = 0; i < 3; i++) {
    const c = lib['synthwave/decor-train'].clone();
    train.cars.push(c);
    if (growBandGroups.length) growBandGroups[GROW_TRANSIT].add(c);
    else scene.add(c);
  }

  // air traffic: flyers on straight sky lanes criss-crossing the city at
  // varied altitudes, trail and thruster baked into the GLB, gentle bob
  const flyers = [];
  for (let i = 0; i < 7; i++) {
    const f = lib['synthwave/decor-flyer'].clone();
    f.scale.setScalar(0.85);
    const axis = i % 2 ? 'x' : 'z';
    const off = rand() * 7 - 3.5;
    const dir = i % 4 < 2 ? 1 : -1;
    f.rotation.y = aimY(axis, dir);
    flyers.push({ m: f, axis, off, dir, p: rand() * 20 - 10,
      v: 1.1 + rand() * 0.9, alt: 2.7 + rand() * 1.6, ph: rand() * Math.PI * 2 });
    scene.add(f);
  }

  // ---- atmosphere pass: wet avenues, rain, buzzing neon, jumbotron, holo --

  // Wet asphalt: four coplanar lane strips share ONE Reflector (one extra
  // scene render), sitting between the center dashes and the edge glow so
  // the road art stays crisp; a matte overlay knocks the mirror back to
  // damp asphalt. Half-res reflection = soft, which reads as wet not chrome.
  let wetMirror = null, wetShine = null;   // quality tiers swap between these
  {
    const laneGeos = [];
    for (const [sx, sy, ox, oy] of [
      [23, 0.35, 0, 0.24], [23, 0.35, 0, -0.24],
      [0.35, 23, 0.24, 0], [0.35, 23, -0.24, 0],
    ]) {
      const g = new THREE.PlaneGeometry(sx, sy);
      g.translate(ox, oy, 0);
      laneGeos.push(g);
    }
    const wetGeo = mergeGeometries(laneGeos);
    const wet = new Reflector(wetGeo, {
      // third-res: blurrier reflections read as damper asphalt, and the
      // reflector's fill cost drops with the square
      textureWidth: Math.max(426, Math.floor(innerWidth / 3)),
      textureHeight: Math.max(266, Math.floor(innerHeight / 3)),
      color: 0x676a78, clipBias: 0.002,
    });
    wet.rotation.x = -Math.PI / 2;
    wet.position.y = 0.0208;
    scene.add(wet);
    const damp = new THREE.Mesh(wetGeo.clone(), new THREE.MeshStandardMaterial({
      color: 0x05070f, roughness: 0.9, transparent: true, opacity: 0.45 }));
    damp.rotation.x = -Math.PI / 2;
    damp.position.y = 0.0214;
    scene.add(damp);
    wetMirror = wet;
    // low tiers swap the mirror for a static gloss plane: the practicals'
    // specular highlights still read as wet lanes, without the mirror's
    // whole second scene render per frame
    wetShine = new THREE.Mesh(wetGeo.clone(), new THREE.MeshStandardMaterial({
      color: 0x10141f, roughness: 0.22, metalness: 0.4 }));
    wetShine.rotation.x = -Math.PI / 2;
    wetShine.position.y = 0.0208;
    wetShine.visible = false;
    scene.add(wetShine);
    window.__city.wet = wet;
    window.__city.damp = damp;
  }

  // rain: recycled vertical streaks in a drum that follows the camera
  const DROPS = 550;
  let rain = null, rainDrops = null;
  if (!reduced) {
    rainDrops = [];
    for (let i = 0; i < DROPS; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * 9;
      rainDrops.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr,
        y: rand() * 7, v: 6 + rand() * 4 });
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position',
      new THREE.BufferAttribute(new Float32Array(DROPS * 6), 3));
    rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({
      color: 0x9fb2d8, transparent: true, opacity: 0.26 }));
    rain.frustumCulled = false;
    scene.add(rain);
    window.__city.rain = rain;
  }

  // buzzing neon: two street signs flicker like dying tubes. Their material
  // instances are shared by the static merge, so driving emissiveIntensity
  // here animates the merged meshes for free.
  const flicker = [];
  for (const [model, matName] of [['synthwave/synthwave-billboard-b', 'AdPanel'],
                                  ['synthwave/synthwave-shop-d', 'NeonB']]) {
    const src = lib[model];
    if (!src) continue;
    const seen = new Set();
    src.traverse(o => {
      if (!o.isMesh) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (m.name && m.name.startsWith(matName) && !seen.has(m.uuid)) {
          seen.add(m.uuid);
          flicker.push({ m, base: m.emissiveIntensity ?? 1 });
        }
      }
    });
  }

  // jumbotron at the plate's west edge: broadcast-screen atlas cells cycle
  // by UV window, which reads as live TV from any distance
  const jumbo = { tex: null, cell: 0, timer: 0 };
  {
    const tex = new THREE.TextureLoader().load(
      assetBase + 'synthwave/textures/broadcast-screen-atlas.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(0.23, 0.23);
    tex.offset.set(0.01, 0.76);
    jumbo.tex = tex;
    const dark = new THREE.MeshStandardMaterial({ color: 0x151d29, roughness: 0.85 });
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.86, 1.5), dark);
    frame.position.y = 1.05;
    g.add(frame);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.78),
      new THREE.MeshBasicMaterial({ map: tex }));
    screen.rotation.y = Math.PI / 2;
    screen.position.set(0.045, 1.05, 0);
    g.add(screen);
    for (const pz of [-0.55, 0.55]) {
      const pyl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.06), dark);
      pyl.position.set(0, 0.31, pz);
      g.add(pyl);
    }
    g.position.set(-4.62, 0, -1.0);
    // growth story: the media tower is plate furniture, band 0
    if (growBandGroups.length) growBandGroups[0].add(g);
    else scene.add(g);
  }

  // the mascot hologram: Chromatic's chameleon, now a REAL 3D asset
  // (synthwave-mascot.glb, 2026-07-20) instead of the old atlas-cell quad.
  // The GLB ships flat Holo* emissive materials; here every part swaps to
  // a fresnel hologram shader: additive + DoubleSide (the far side ghosts
  // through - the X-ray tell), facing faces sub-threshold, only the rim
  // over bloom (dome-shell lesson: a hot solid reads as a light slab).
  // On top: a wireframe scan overlay on the facet lattice, drifting scan
  // bands + a refresh sweep in world-y (anchored to the projector, so the
  // model bobs THROUGH them), shimmer with rare glitch dropouts, and a
  // projection cone rising off the frontier mega roof. the art director's light-blue
  // call (2026-07-20) lives in HOLO_TINT: still one knob to tune.
  let holoGrp = null, holoLight = null;
  const holoShared = { uTime: { value: 0 }, uGlow: { value: 1 },
    uBase: { value: 0 }, uSpan: { value: 1 } };
  const holoGlitch = { until: 0, next: 8 };
  if (!reduced) {
    // saturated base + restrained hot mix: almost all visible energy is
    // rim, so a near-white uHot dragged the whole mascot to white ice.
    // These two keep the additive sum reading BLUE over the purple sky.
    const HOLO_TINT = new THREE.Color(0.30, 0.62, 1.0);
    const HOLO_HOT = new THREE.Color(0.55, 0.84, 1.0);
    // Phase-1 hologram shader (2026-07-20 research: surface + volume + budget).
    // heat = per-part gain; side; bump = object-space normal-relief strength;
    // glint = eye specular flag; gain = overall multiplier (back-face pass
    // dims the far shell). Our own value-noise gradient perturbs the normal
    // (no textures/UVs) so scales light up in BOTH the lambert and the rim.
    const mkHolo = (heat, opts = {}) => {
      const side = opts.side !== undefined ? opts.side : THREE.FrontSide;
      const m = new THREE.ShaderMaterial({
        uniforms: { uTime: holoShared.uTime, uGlow: holoShared.uGlow,
          uBase: holoShared.uBase, uSpan: holoShared.uSpan,
          uHeat: { value: heat }, uBump: { value: opts.bump ?? 0.6 },
          uGlint: { value: opts.glint ? 1 : 0 }, uGain: { value: opts.gain ?? 1 },
          uColor: { value: HOLO_TINT }, uHot: { value: HOLO_HOT } },
        vertexShader: `
          varying vec3 vW, vOP, vON, vMx, vMy, vMz;
          varying float vP;
          void main() {
            vOP = position; vON = normal;
            mat3 M = mat3(modelMatrix); vMx = M[0]; vMy = M[1]; vMz = M[2];
            #ifdef USE_COLOR
              vP = color.r * 1.7;   // baked pattern, stored /1.7 in COLOR_0
            #else
              vP = 1.0;
            #endif
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: `
          uniform float uTime, uGlow, uBase, uSpan, uHeat, uBump, uGlint, uGain;
          uniform vec3 uColor, uHot;
          varying vec3 vW, vOP, vON, vMx, vMy, vMz;
          varying float vP;
          float hash13(vec3 p) {
            p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33);
            return fract((p.x + p.y) * p.z);
          }
          float vnoise(vec3 x) {
            vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hash13(i+vec3(0,0,0)),hash13(i+vec3(1,0,0)),f.x),
                           mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
                       mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),
                           mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y), f.z);
          }
          // two octaves; kept low-frequency so it reads as scale relief, not
          // per-pixel static (68.0 aliased into frost at hero distance)
          float skinH(vec3 p){ return vnoise(p*22.0)*0.65 + vnoise(p*46.0)*0.35; }
          void main() {
            // object-space micro-relief: perturb the normal by the tangent
            // component of the skin-height gradient (forward differences of
            // our value noise). Object space so scales ride the skin and do
            // not swim under the turntable; amplitude fades with distance.
            vec3 nO = normalize(vON);
            float e = 0.006, h0 = skinH(vOP);
            vec3 g = vec3(skinH(vOP+vec3(e,0,0))-h0, skinH(vOP+vec3(0,e,0))-h0,
                          skinH(vOP+vec3(0,0,e))-h0) / e;
            float dist = length(cameraPosition - vW);
            float fade = clamp((45.0 - dist) / 35.0, 0.2, 1.0);
            nO = normalize(nO - uBump * fade * (g - dot(g, nO) * nO));
            vec3 N = normalize(mat3(vMx, vMy, vMz) * nO);
            vec3 V = normalize(cameraPosition - vW);
            vec3 moon = normalize(vec3(-0.4, 0.8, 0.3));
            float lam = 0.34 + 0.58 * clamp(dot(N, moon), 0.0, 1.0);
            // fresnel: two-band rim + moon-lit asymmetry + thin-feature
            // attenuation (thin tubes stop going full-sausage) + edge falloff
            float fres = 1.0 - abs(dot(N, V));
            float litMask = 0.40 + 0.60 * clamp(dot(N, moon), 0.0, 1.0);
            float thin = length(fwidth(N));
            float rim = (pow(fres, 2.0) * 0.62 + pow(fres, 5.0) * 0.5)
                        * litMask / (1.0 + 7.0 * thin);
            rim *= 1.0 - smoothstep(0.985, 1.0, fres);   // no hard aliased lip
            // LINE-ART hologram (the art director: push further toward line-art): the
            // fill is only a whisper of interior volume; the bright rim
            // (silhouette edge) + the wire cage carry the whole figure, like
            // the original atlas line-art on black.
            float b = (0.07 * lam * pow(vP, 2.2) + 0.34 * rim * vP) * uHeat;
            float y = (vW.y - uBase) / uSpan;
            float bands = 0.94 + 0.06 * sin((y * 34.0 - uTime * 1.05) * 6.2831853);
            float sweep = 1.0 + 0.35 * smoothstep(0.05, 0.0,
              abs(y - fract(uTime * 0.09) * 1.12 + 0.06));
            // view-angle hue whisper: cyan facing -> violet at grazing
            vec3 rimCol = mix(uHot, vec3(0.62, 0.55, 1.0), smoothstep(0.4, 1.0, fres));
            vec3 col = mix(uColor, rimCol, min(1.0, rim * 0.4));
            col *= b * bands * sweep * uGlow * uGain;
            // bloom budget: cap body luminance under UnrealBloom threshold so
            // fine detail survives; only the eye glint may cross it (one wet
            // star, not a blob)
            float lum = dot(col, vec3(0.299, 0.587, 0.114));
            col *= mix(1.0, 0.92 / max(lum, 1e-4), smoothstep(0.92, 1.35, lum));
            if (uGlint > 0.5) {
              vec3 H = normalize(V + moon);
              col += uHot * (pow(max(dot(N, H), 0.0), 220.0) * 2.6 * uGlow);
            }
            gl_FragColor = vec4(col, 1.0);
          }`,
        blending: THREE.AdditiveBlending, transparent: true,
        depthWrite: false, depthTest: true, vertexColors: true, side });
      m.extensions.derivatives = true;   // fwidth (thin-feature attenuation)
      return m;
    };
    // per-part emphasis keyed on the GLB material names (the Holo* swap
    // contract). bump = surface relief; glint = eye specular; the pupil
    // heat drops hard (its old blob was a bloom over-run, now one glint).
    // The thin fin blades keep DoubleSide (a one-sided strip vanishes edge-on).
    const PART = {
      HoloBody:   { heat: 1.0,  bump: 0.18 },
      HoloEye:    { heat: 0.8,  bump: 0.15 },
      HoloCrest:  { heat: 1.2,  bump: 0.2,  side: THREE.DoubleSide },
      HoloPupil:  { heat: 0.5,  bump: 0.0,  glint: true },
      HoloTongue: { heat: 1.9,  bump: 0.0 },
      HoloBranch: { heat: 0.4,  bump: 0.15 },
    };
    // depth prepass: an opaque colour-write-off clone writes the mascot's
    // nearest depth FIRST, so the additive fills no longer sum 2-4
    // overlapping surfaces per pixel (the "washed out" flatten + sausage
    // limbs). Opaque => renders before the transparent fills automatically.
    const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const fillMeshes = [];
    // the GLB ships authored wire overlays as LINES primitives (contour
    // rings, flow lines, eye rings, mouth, crest sawtooth); GLTFLoader
    // hands them over as LineSegments. HDR line colors (>1) so the line
    // work blooms gently - the lines ARE the figure, like the art.
    // depthTest false: the contour lines show THROUGH the body (x-ray),
    // so structure reads even on the far side - the see-through hologram
    const wireHot = new THREE.LineBasicMaterial({
      color: HOLO_TINT.clone().multiplyScalar(1.45),
      transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, fog: false });
    const wireDim = new THREE.LineBasicMaterial({
      color: HOLO_TINT.clone().multiplyScalar(0.5),
      transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false, fog: false });
    const model = lib['synthwave/synthwave-mascot'].clone();
    const parts = [];
    model.traverse(o => { if (o.isMesh || o.isLineSegments) parts.push(o); });
    for (const o of parts) {
      const name = (o.material && o.material.name) || '';
      if (o.isLineSegments) {
        o.material = name === 'HoloWireDim' ? wireDim : wireHot;
        continue;
      }
      const p = PART[name] || { heat: 1.0, bump: 0.6 };
      o.material = mkHolo(p.heat, p);
      // meshes without COLOR_0 (pupils) read the neutral pattern value,
      // not three's [1,1,1] default (which would boost them 1.7x)
      o.material.defaultAttributeValues.color = [1 / 1.7, 1 / 1.7, 1 / 1.7];
      o.castShadow = false; o.receiveShadow = false;
      o.renderOrder = 2;
      fillMeshes.push({ o, p, name });
    }
    // depth prepass + back-face volume as CHILDREN of each fill mesh, so they
    // inherit the baked animation transforms with zero extra mixers. The
    // back pass (BackSide, depthFunc GREATER) draws the FAR shell behind the
    // near shell -> reads as a volume of light, the Blade Runner "Joi" cue
    // the depth prepass makes viable (v3 had to drop DoubleSide to avoid
    // white-slab overdraw; now the two shells are separated in depth).
    for (const { o, p, name } of fillMeshes) {
      const dpre = new THREE.Mesh(o.geometry, depthMat);
      dpre.renderOrder = 0; dpre.frustumCulled = false;
      o.add(dpre);
      if (name !== 'HoloCrest' && name !== 'HoloPupil' && name !== 'HoloTongue') {
        const back = new THREE.Mesh(o.geometry,
          mkHolo(p.heat, { ...p, side: THREE.BackSide, gain: 0.28 }));
        back.material.depthFunc = THREE.GreaterDepth;
        back.material.defaultAttributeValues.color = [1 / 1.7, 1 / 1.7, 1 / 1.7];
        back.renderOrder = 1; back.frustumCulled = false;
        o.add(back);
      }
    }
    // dust sparkles drifting around the figure (the art's particle field);
    // authored in model space so they turn with the turntable
    {
      const N = 60;
      const sPos = new Float32Array(N * 3), sPh = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.6);
        sPos[i * 3] = Math.cos(a) * r * 0.68;
        sPos[i * 3 + 1] = 0.40 + (Math.random() * 2 - 1) * 0.4;
        sPos[i * 3 + 2] = Math.sin(a) * r * 0.45;
        sPh[i] = Math.random() * Math.PI * 2;
      }
      const sGeo = new THREE.BufferGeometry();
      sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
      sGeo.setAttribute('ph', new THREE.BufferAttribute(sPh, 1));
      const sMat = new THREE.ShaderMaterial({
        uniforms: { uTime: holoShared.uTime, uGlow: holoShared.uGlow,
          uColor: { value: HOLO_TINT } },
        vertexShader: `
          attribute float ph; varying float vTw; uniform float uTime;
          void main() {
            vTw = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * 2.6 + ph), 3.0);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.0 + 3.0 * vTw) / max(0.001, -mv.z * 0.35);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying float vTw; uniform vec3 uColor; uniform float uGlow;
          void main() {
            vec2 d = gl_PointCoord - 0.5;
            float a = smoothstep(0.5, 0.05, length(d));
            gl_FragColor = vec4(uColor * (0.85 * vTw * a * uGlow), 1.0);
          }`,
        blending: THREE.AdditiveBlending, transparent: true,
        depthWrite: false });
      model.add(new THREE.Points(sGeo, sMat));
    }
    const HOLO_SC = 1.3;
    model.scale.setScalar(HOLO_SC);
    // climbing attitude (the art director): tip the whole composition (branch + body)
    // nose-up ~30deg so he reads as climbing upward. Applied to the model,
    // INSIDE the turntable group, so the Y spin sweeps the climb around
    // (always nose-up) rather than wobbling the tilt axis.
    model.rotation.z = THREE.MathUtils.degToRad(30);
    holoGrp = new THREE.Group();
    holoGrp.add(model);
    holoGrp.position.set(4, 3.8, 4);
    holoShared.uBase.value = 3.8;
    holoShared.uSpan.value = 0.62 * HOLO_SC;
    // baked personality loop: eyes darting on independent clocks, tail
    // sway, lateral breathing, tongue-flick. Each clip plays at its own
    // incommensurate timeScale (research D2 loop de-sync) so the combined
    // motion stops repeating every 10s and reads as never-quite-looping;
    // the eye clips also run a touch fast so the darts read as snaps.
    const clips = libAnims['synthwave/synthwave-mascot'];
    if (clips && clips.length) {
      const mx = new THREE.AnimationMixer(model);
      const RATE = { EyeL: 1.19, EyeR: 0.83, MascotTail: 0.71,
        MascotTongue: 0.61, MascotBody: 1.37 };
      for (const cl of clips) {
        const act = mx.clipAction(cl);
        act.timeScale = RATE[cl.name] ?? 1.0;
        act.play();
      }
      sceneryMixers.push(mx);
    }
    // projection cone: an emitter on the frontier mega roof throws the
    // hologram upward. Roof height by the searchlight raycast recipe
    // (merged static city = direct-child opaque meshes; band children in
    // growth mode). Opacity stays searchlight-low: 0.14-class cones read
    // as white wedges.
    const down = new THREE.Raycaster();
    down.set(new THREE.Vector3(4, 24, 4), new THREE.Vector3(0, -1, 0));
    const hit = down.intersectObjects(
      scene.children.filter(o => o.isMesh && !o.material.transparent)
        .concat(growBandGroups.flatMap(g =>
          g.children.filter(o => o.isMesh && !o.material.transparent))), false)
      .find(h => h.point.y > 0.4);
    const roofY = hit ? hit.point.y - 0.02 : 2.6;
    const coneH = Math.max(0.8, holoGrp.position.y + 0.15 - roofY);
    const beamCv = document.createElement('canvas');
    beamCv.width = 8; beamCv.height = 128;
    {
      const g = beamCv.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');   // v=1 = apex = emitter
      gr.addColorStop(0.5, 'rgba(255,255,255,0.28)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    }
    const rig = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, coneH, 14, 1, true),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(beamCv),
        color: 0x9fd0ff, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide, fog: false }));
    cone.rotation.x = Math.PI;   // flip: apex sits at the emitter
    cone.position.set(4, roofY + coneH / 2, 4);
    rig.add(cone);
    const puckCv = document.createElement('canvas');
    puckCv.width = puckCv.height = 64;
    {
      const g = puckCv.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }
    const puck = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(puckCv), color: 0xbfe0ff,
      transparent: true, opacity: 0.5, fog: false,
      depthWrite: false, blending: THREE.AdditiveBlending }));
    puck.scale.set(0.2, 0.2, 1);
    puck.position.set(4, roofY + 0.03, 4);
    rig.add(puck);
    // D1 coupling (research: "real" = its light exists in the city): a cyan
    // spill light low on the mascot so the frontier-mega roof and nearby
    // parapets under it pick up its glow. Parented to holoGrp so it hides on
    // the empty boot and rises with band 1; the render loop ties its
    // intensity to uGlow so it dies when the hologram glitches off. Short
    // range keeps it off the wider city (a self-contained glow reads as a
    // sticker; light that touches the scene reads as real).
    // on the rotation axis (local x=z=0) so the turntable does not swing it;
    // low, so the pool sits tight on the roof under the mascot
    holoLight = new THREE.PointLight(0x6fc8ff, 2.2, 7.5, 1.7);
    holoLight.position.set(0, -0.7, 0);
    holoGrp.add(holoLight);
    // growth story: the mascot projects off the frontier mega (band 1);
    // over an empty corner it would read as an unanchored sky decal. The
    // rig rides the same band so emitter and hologram rise together.
    if (growBandGroups.length) {
      growBandGroups[1].add(holoGrp); growBandGroups[1].add(rig);
    } else { scene.add(holoGrp); scene.add(rig); }
    window.__city.mascot = holoGrp;   // QA handle (headless anim sampling)
  }

  // ---- world edge: the city must not visibly end (critique panel gaps
  // 1 + 3). Horizon skyline cards past the fog wall, ONE avenue running
  // open into the fog with through-traffic, searchlight cones off the mega
  // roofs, and distant lightning. ------------------------------------------

  // soft radial glow, shared by searchlight heads and the lightning flash
  const glowTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  })();

  // Horizon cards: distant-district / distant-landmark atlas cells on
  // ADDITIVE quads ringing the city at radii well past the fog end (42).
  // Additive only works if the sky around each skyline is near-black, and
  // the atlas art's skies are NOT (mid-purple gradient + clouds), so the
  // raw cells read as glowing rectangles. crushSky() fixes that at load:
  // per cell, a per-row percentile estimate of the sky color (percentile,
  // not average, so dark building mass does not drag it down) is
  // subtracted out - the vertical gradient and the clouds go with it -
  // then the lit remainder is regained and the cell edges get baked alpha
  // fades so no quad edge can ever read. fog:false; haze comes from
  // tint + opacity.
  {
    const SKY_K = 0.85;     // fraction of the sky estimate removed; the
                            // remaining 15% is the soft city-glow halo
    const SKY_GAIN = 1.25;  // regain on the lit remainder
    const crushed = {};
    const crushSky = (n) => {
      if (crushed[n]) return crushed[n];
      const cv = document.createElement('canvas');
      cv.width = 1536; cv.height = 1024;
      const tx = new THREE.CanvasTexture(cv);
      tx.colorSpace = THREE.SRGBColorSpace;
      crushed[n] = tx;
      const img = new Image();
      img.onload = () => {
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, 1536, 1024);
        const CW = 512, CH = 341;
        const hist = new Uint32Array(256);
        for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) {
          const y0 = Math.round(cy * 1024 / 3);
          const d = g.getImageData(cx * CW, y0, CW, CH);
          const px = d.data;
          // per-row, per-channel 70th percentile = the sky level at that
          // height (sky pixels dominate every row they appear in)
          const sky = new Float32Array(CH * 3);
          for (let r = 0; r < CH; r++) for (let ch = 0; ch < 3; ch++) {
            hist.fill(0);
            for (let x = 0; x < CW; x++) hist[px[(r * CW + x) * 4 + ch]]++;
            let acc = 0, v = 0;
            while (acc < CW * 0.7 && v < 255) acc += hist[v++];
            sky[r * 3 + ch] = v;
          }
          // vertical smooth so the estimate cannot band
          const sm = new Float32Array(CH * 3);
          for (let r = 0; r < CH; r++) for (let ch = 0; ch < 3; ch++) {
            let s = 0, c = 0;
            for (let k = -4; k <= 4; k++) {
              const rr = r + k;
              if (rr >= 0 && rr < CH) { s += sky[rr * 3 + ch]; c++; }
            }
            sm[r * 3 + ch] = s / c;
          }
          const fade = (t, a) => t < a ? t / a : t > 1 - a ? (1 - t) / a : 1;
          for (let r = 0; r < CH; r++) {
            const fy = fade(r / CH, 0.09) * fade(1 - r / CH, 0.05);
            for (let x = 0; x < CW; x++) {
              const f = fy * fade(x / CW, 0.09);
              const i = (r * CW + x) * 4;
              for (let ch = 0; ch < 3; ch++) {
                px[i + ch] = Math.max(0, Math.min(255,
                  (px[i + ch] - SKY_K * sm[r * 3 + ch]) * SKY_GAIN * f));
              }
            }
          }
          g.putImageData(d, cx * CW, y0);
        }
        tx.needsUpdate = true;
      };
      img.src = assetBase + 'synthwave/textures/' + n;
      return tx;
    };
    const MOON_AZ = Math.atan2(-22, -30);   // keep the moon's sky clear
    const mkCards = (texName, tint, opacity, cards) => {
      const geos = [];
      for (const [ang, r, w, cell, lift] of cards) {
        if (Math.abs(Math.atan2(Math.sin(ang - MOON_AZ), Math.cos(ang - MOON_AZ))) < 0.2) continue;
        const h = w * (341 / 512);
        const g = new THREE.PlaneGeometry(w, h);
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i,
            (cell % 3 + 0.03 + uv.getX(i) * 0.94) / 3,
            (2 - Math.floor(cell / 3) + 0.03 + uv.getY(i) * 0.94) / 3);
        }
        geos.push(g.applyMatrix4(new THREE.Matrix4()
          .makeRotationY(Math.atan2(-Math.cos(ang), -Math.sin(ang)))
          .setPosition(Math.cos(ang) * r, h / 2 - 1.0 + (lift || 0), Math.sin(ang) * r)));
      }
      const mesh = new THREE.Mesh(mergeGeometries(geos),
        new THREE.MeshBasicMaterial({ map: crushSky(texName), color: tint,
          transparent: true, opacity, blending: THREE.AdditiveBlending,
          depthWrite: false, fog: false }));
      scene.add(mesh);
    };
    // near band: brighter, lower; far band: taller, dimmer (parallax pair).
    // Opacities assume crushed cards (only lit skyline remains); the old
    // 0.6/0.48/0.58 values were fighting the un-crushed sky.
    const near = [], far = [];
    for (let i = 0; i < 10; i++) {
      near.push([i / 10 * Math.PI * 2 + 0.31, 23, 12 + (i % 3) * 1.6, (i * 4 + 1) % 9]);
    }
    for (let i = 0; i < 6; i++) {
      far.push([i / 6 * Math.PI * 2 + 0.85, 31, 15.5 + (i % 2) * 2, (i * 2 + 3) % 9, 0.6]);
    }
    mkCards('distant-district-atlas.png', 0xaab4e0, 0.75, near);
    mkCards('distant-district-atlas.png', 0x8593c8, 0.6, far);
    // hero landmarks, one per open vista, used sparingly; the
    // east one terminates the open arterial's view deep in the fog
    mkCards('distant-landmark-atlas.png', 0x99a6d6, 0.7, [
      [0.06, 38, 19, 4, 1.2], [2.35, 38, 19, 0, 1.0], [4.75, 38, 19, 7, 1.1]]);
  }

  // Open arterial: past the last east road tile the avenue keeps going as a
  // canvas strip with its own alpha ramp (fog alone cannot fully swallow it
  // from every aerial angle) - road art matches the plate lanes: pink
  // edges, mint dashes, all sub-bloom.
  const arterialCars = [];
  {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#0b101d'; g.fillRect(0, 0, 512, 64);
    // asphalt grain matching the plate roads' baked texture (the strip
    // read dead-flat next to the tiled wheel-track asphalt); seeded so
    // screenshots stay deterministic
    let sd = 7;
    const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) {
      const v = Math.round(12 + rnd() * 20);
      g.fillStyle = `rgba(${v + 4},${v + 8},${v + 16},${(0.2 + rnd() * 0.3).toFixed(2)})`;
      g.fillRect(rnd() * 512, rnd() * 64, 1 + rnd() * 3, 1 + rnd() * 2);
    }
    for (const y of [20, 29, 35, 44]) {          // burnished wheel tracks
      g.fillStyle = 'rgba(150,165,190,0.09)';
      g.fillRect(0, y - 2, 512, 4);
    }
    for (const y of [24, 40]) {                  // oil line per direction
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(0, y - 1, 512, 2);
    }
    g.fillStyle = 'rgba(255,60,190,0.55)';
    g.fillRect(0, 3, 512, 2); g.fillRect(0, 59, 512, 2);
    g.fillStyle = 'rgba(140,255,225,0.5)';
    for (let x = 0; x < 512; x += 26) g.fillRect(x, 31, 12, 2);
    // alpha ramp: solid until 55%, gone by the far end
    g.globalCompositeOperation = 'destination-in';
    const ramp = g.createLinearGradient(0, 0, 512, 0);
    ramp.addColorStop(0, 'rgba(0,0,0,1)');
    ramp.addColorStop(0.55, 'rgba(0,0,0,1)');
    ramp.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ramp; g.fillRect(0, 0, 512, 64);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(23, 1.02),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true,
        depthWrite: false }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(11.5 + 11.5, 0.012, 0);
    scene.add(strip);

    // through-traffic: taillight pairs running out, headlight pairs coming
    // in; sprites, additive, faded in at the plate edge and out at the fog
    if (!reduced) {
      const pairTex = (color) => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 32;
        const gg = c.getContext('2d');
        for (const px of [18, 46]) {
          const gr = gg.createRadialGradient(px, 16, 1, px, 16, 13);
          gr.addColorStop(0, color);
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          gg.fillStyle = gr;
          gg.beginPath(); gg.arc(px, 16, 13, 0, Math.PI * 2); gg.fill();
        }
        return new THREE.CanvasTexture(c);
      };
      const tail = pairTex('rgba(255,80,110,1)');
      const head = pairTex('rgba(255,233,190,1)');
      for (let i = 0; i < 8; i++) {
        const out = i % 2 === 0;   // outbound = taillights on the +z lane
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: out ? tail : head, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending }));
        sp.scale.set(0.17, 0.085, 1);
        scene.add(sp);
        arterialCars.push({ sp, dir: out ? 1 : -1, lane: out ? 0.12 : -0.12,
          x: 11 + rand() * 18.5, v: 0.9 + rand() * 0.7 });
      }
    }
  }

  // Searchlights: additive gradient cones sweeping from three roofs. Roof
  // heights come from a downward raycast against the merged static city,
  // so the beams stay seated if placements change.
  const searchlights = [];
  if (!reduced) {
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 128;
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)');   // v=1 = apex = lamp end
    gr.addColorStop(0.55, 'rgba(255,255,255,0.30)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    const beamTex = new THREE.CanvasTexture(cv);
    const down = new THREE.Raycaster();
    for (const [x, z, tilt, speed, ph] of [
      [4, 4, 0.62, 0.21, 0],          // the frontier mega
      [-2.6, -6.85, 0.55, -0.16, 2.1], // north twins (aerial backdrop; keep in sync with the SKY entry)
      [6.4, 6.4, 0.7, 0.13, 4.2],     // the twist tower
    ]) {
      down.set(new THREE.Vector3(x, 24, z), new THREE.Vector3(0, -1, 0));
      // merged static city = direct-child meshes; sprites/lines would throw.
      // In growth mode the merged city lives inside the (hidden, unsunk)
      // band groups, so their meshes join the candidate list.
      const hit = down.intersectObjects(
        scene.children.filter(o => o.isMesh && !o.material.transparent)
          .concat(growBandGroups.flatMap(g =>
            g.children.filter(o => o.isMesh && !o.material.transparent))), false)
        .find(h => h.point.y > 0.4);
      const grp = new THREE.Group();
      grp.position.set(x, hit ? hit.point.y - 0.04 : 3.5, z);
      const arm = new THREE.Object3D();
      arm.rotation.x = tilt;
      grp.add(arm);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 10, 14, 1, true),
        new THREE.MeshBasicMaterial({ map: beamTex, color: 0xc4d2ff,
          transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending,
          depthWrite: false, side: THREE.DoubleSide, fog: false }));
      cone.rotation.x = Math.PI;   // flip: apex sits at the lamp
      cone.position.y = 5;
      arm.add(cone);
      const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex,
        color: 0xd8e4ff, transparent: true, opacity: 0.45, fog: false,
        depthWrite: false, blending: THREE.AdditiveBlending }));
      lamp.scale.set(0.26, 0.26, 1);
      grp.add(lamp);
      // growth story: a beam belongs to its tower's band, so it appears
      // (and rises) with the building it sits on
      const sb = (opts && opts.growReveal) ? growBandOf(Math.hypot(x, z)) : -1;
      if (sb >= 0) growBandGroups[sb].add(grp); else scene.add(grp);
      searchlights.push({ grp, arm, tilt, speed, ph });
    }
  }

  // ---- rooftop lounge (?lounge): sit inside a glass skybar on the
  // frame-ring roof at (4,3) while the camera pans the skyline. v2: the
  // interior is now a real Blender asset (synthwave-lounge.glb, authored
  // 1:1 with the v1 pavilion so the anchor and camera rig are unchanged);
  // v1's page-built geometry earned the upgrade and was replaced. The
  // page keeps the seat raycast, the mirrored canvas sign, the practical
  // light, and the rain-drum recenter. Only built in lounge mode, so the
  // approved look is untouched.
  let lounge = null;
  if (cinematic && opts.loungeOnly) {
    const rc = new THREE.Raycaster();
    rc.set(new THREE.Vector3(4, 24, 3), new THREE.Vector3(0, -1, 0));
    const hit = rc.intersectObjects(
      scene.children.filter(o => o.isMesh && !o.material.transparent), false)
      .find(h => h.point.y > 0.4);
    const roofY = hit ? hit.point.y : 1.2;
    // stilted deck: the pavilion rides above the host roof so near-roof
    // clutter (steam chains, holo ads on the neighboring fillers) stays
    // below the sightline instead of photobombing the pan
    const fy = roofY + 0.38;
    lounge = { x: 4, y: fy, z: 3 };
    const RD = 0.85, RH = 0.62;            // depth (x), height
    const gx = 4 - RD / 2;                 // west face: the glass wall
    const g = new THREE.Group();
    await new Promise((res, rej) =>
      loader.load(assetBase + 'synthwave/synthwave-lounge.glb', gl => {
        gl.scene.traverse(o => { if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
        } });
        gl.scene.position.set(4, fy, 3);
        g.add(gl.scene); res();
      }, undefined, rej));
    // the lounge's own neon, read MIRRORED from inside against the glass
    {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 64;
      const c2 = cv.getContext('2d');
      c2.translate(256, 0); c2.scale(-1, 1);              // mirrored: we are behind it
      c2.font = 'bold 40px monospace';
      c2.textAlign = 'center'; c2.textBaseline = 'middle';
      c2.shadowColor = 'rgba(255,100,200,0.9)'; c2.shadowBlur = 14;
      c2.fillStyle = '#ff64c8';
      c2.fillText('SKYBAR', 128, 34);
      const tx = new THREE.CanvasTexture(cv);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.085),
        new THREE.MeshBasicMaterial({ map: tx, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
      sign.rotation.y = Math.PI / 2;                       // faces the camera
      sign.position.set(gx + 0.035, fy + RH - 0.11, 3);
      g.add(sign);
    }
    const practical = new THREE.PointLight(0xffd479, 0.5, 2.0, 1.5);
    practical.position.set(4, fy + 0.45, 3);
    g.add(practical);
    scene.add(g);
    window.__city.lounge = lounge;
  }

  // Distant lightning: a directional blink (no shadow - the map is frozen)
  // plus a horizon glow BEHIND the skyline cards, so each strike
  // silhouettes the far city. window.__city.strike() lets QA and the shot
  // choreography fire one on cue.
  let bolt = null, boltGlow = null, boltAge = 9e9, boltNext = 8, boltPulses = [];
  if (!reduced) {
    bolt = new THREE.DirectionalLight(0xccd9ff, 0);
    scene.add(bolt);
    scene.add(bolt.target);
    boltGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex,
      color: 0xbfd0ff, transparent: true, opacity: 0, fog: false,
      depthWrite: false, blending: THREE.AdditiveBlending }));
    boltGlow.scale.set(30, 14, 1);
    scene.add(boltGlow);
    window.__city.strike = (az) => {
      const a = az ?? rand() * Math.PI * 2;
      bolt.position.set(Math.cos(a) * 30, 16, Math.sin(a) * 30);
      boltGlow.position.set(Math.cos(a) * 46, 4.5, Math.sin(a) * 46);
      boltPulses = [[0, 0.7 + rand() * 0.5], [0.09 + rand() * 0.06, 1],
                    [0.28 + rand() * 0.15, 0.45]];
      boltAge = 0;
    };
  }

  // payout sparks
  const sparkTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,220,140,1)');
    gr.addColorStop(1, 'rgba(255,220,140,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const sparks = [];
  const celebrations = [];   // active completion flourishes

  // player-built city: rebuilt from state on updateCity
  const built = new THREE.Group();
  scene.add(built);
  let builtIds = '';
  const bakedGeos = [];   // merged batches owned by us; disposed on rebuild
  const mixers = [];   // animation mixers for finished synthwave buildings
  // house/shop have visual variants; the building id picks one deterministically
  // so streets vary but a given building never changes model between frames
  const VARIANTS = {
    house: ['synthwave/synthwave-house', 'synthwave/synthwave-house-b',
            'synthwave/synthwave-house-c', 'synthwave/synthwave-house-d'],
    shop: ['synthwave/synthwave-shop', 'synthwave/synthwave-shop-b',
           'synthwave/synthwave-shop-c', 'synthwave/synthwave-shop-d',
           'synthwave/synthwave-shop-e', 'synthwave/synthwave-shop-f'],
    // window-interior propagation: halls sample the flat-neon tower and
    // the lit-room tower-b (the approved trial) per building id
    hall: ['synthwave/synthwave-tower', 'synthwave/synthwave-tower-b'],
  };
  const hashId = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };
  // `b` is a building or queue entry: { id, type }
  const modelFor = (b) => {
    const v = VARIANTS[b.type];
    if (v) return v[hashId(String(b.id)) % v.length];
    return (CATALOG.find(c => c.id === b.type) || {}).model || 'synthwave/synthwave-house';
  };
  const postMat = new THREE.MeshBasicMaterial({ color: 0xffd479 });
  const greyMat = new THREE.MeshStandardMaterial({ color: 0x8b8f99, roughness: 0.95 });

  // queue wireframe + ghost + plot highlight
  let queueGroup = null;
  let queueKey = null;
  let highlight = null;
  let queueTargetFrac = 0;   // where labor says the build is
  let queueShownFrac = 0;    // eased value actually rendered

  // Construction reveal, all in world-Y. The grey shell rises to full height by
  // 80% progress; the color/paint band climbs from 55% to 100% BELOW the shell,
  // so paint appears to rise up and replace the shell (bands never overlap). The
  // scaffold fades over the final 20%.
  function stageHeights(p, H) {
    const greyH = Math.min(1, p / 0.8) * H;
    const colorH = Math.max(0, (p - 0.55) / 0.45) * H;
    const cageOpacity = p < 0.8 ? 0.9 : Math.max(0, 0.9 * (1 - (p - 0.8) / 0.2));
    return { greyH, colorH, cageOpacity };
  }

  // A light scaffold cage around `tile`, footprint `f`, height `h`.
  function buildScaffold(tile, f, h) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xcaa96a, roughness: 0.8,
      transparent: true });
    const r = f / 2 + 0.05;
    const [cx, cz] = tile;
    for (const [px, pz] of [[-r, -r], [r, -r], [r, r], [-r, r]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, h + 0.15, 0.035), mat.clone());
      post.position.set(cx + px, (h + 0.15) / 2, cz + pz);
      post.castShadow = true;
      g.add(post);
    }
    for (const ry of [h * 0.5, h + 0.1]) {
      for (const [ax, len, ox, oz] of [['x', f + 0.1, 0, -r], ['x', f + 0.1, 0, r],
        ['z', f + 0.1, -r, 0], ['z', f + 0.1, r, 0]]) {
        const rail = new THREE.Mesh(ax === 'x'
          ? new THREE.BoxGeometry(len, 0.025, 0.025)
          : new THREE.BoxGeometry(0.025, 0.025, len), mat.clone());
        rail.position.set(cx + ox, ry, cz + oz);
        g.add(rail);
      }
    }
    return g;
  }

  // Scale a building model to fit a 1x1 lot (only if it overflows), center it on
  // the tile, and sit its base at y=0. Returns post-scale height + footprint.
  // Shared by finished buildings and the construction preview so they line up.
  function fitBuilding(model, tile) {
    model.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(model);
    let size = box.getSize(new THREE.Vector3());
    if (size.x > 1 || size.z > 1) {
      model.scale.setScalar(Math.min(0.92 / size.x, 0.92 / size.z));
      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
      size = box.getSize(new THREE.Vector3());
    }
    const c = box.getCenter(new THREE.Vector3());
    model.position.set(tile[0] - c.x, -box.min.y, tile[1] - c.z);
    return { height: size.y, footprint: Math.max(size.x, size.z) };
  }

  const api = {};

  // growth story: reveal the world as the story advances. Building bands
  // (0-3) latch by plan progress f; infrastructure (plots / streets /
  // transit) latches by named story beat. Every latch is a ratchet, like
  // everything else in this product; each group rises out of the ground
  // (instant for the skip path).
  const growLatch = (g, sink, dur, instant) => {
    if (g.userData.on) return;
    g.userData.on = true;
    g.visible = true;
    if (instant) { g.position.y = 0; return; }
    g.position.y = -sink;
    g.userData.sink = sink;
    g.userData.dur = dur;
    g.userData.riseT0 = performance.now();
  };
  api.setWorldStage = (f, instant) => {
    if (!growBandGroups.length) return;
    const TH = [0.1, 0.36, 0.6, 0.84];
    TH.forEach((th, i) => {
      if (f >= th) growLatch(growBandGroups[i], 3.2, 1800, instant);
    });
    // the skip path reveals everything, infrastructure included
    if (instant && f >= 1) {
      for (const k of ['plots', 'streets', 'transit']) api.setInfraStage(k, true);
    }
  };
  api.setInfraStage = (name, instant) => {
    const idx = { plots: GROW_PLOTS, streets: GROW_STREETS, transit: GROW_TRANSIT }[name];
    if (idx === undefined || !growBandGroups.length) return;
    growLatch(growBandGroups[idx], name === 'transit' ? 1.8 : 0.9, 1200, instant);
  };

  api.updateCity = (state) => {
    const ids = state.buildings.map(b => b.id).join(',');
    if (ids !== builtIds) {
      builtIds = ids;
      built.clear();
      mixers.length = 0;
      for (const b of state.buildings) {
        const model = modelFor(b);
        const m = lib[model].clone();
        m.traverse(o => { if (o.isMesh) {
          o.castShadow = !o.name.startsWith('RK_Puff');
          o.receiveShadow = true;
        } });
        fitBuilding(m, b.tile);
        built.add(m);
        m.userData.building = b;
        // finished synthwave buildings run their baked animations (fan spin,
        // steam, beacon pulse); reduced motion keeps them still
        const clips = libAnims[model];
        if (!reduced && clips && clips.length) {
          const mx = new THREE.AnimationMixer(m);
          clips.forEach(c => mx.clipAction(c).play());
          mixers.push(mx);
        }
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.035), postMat);
        post.position.set(b.tile[0] - 0.42, 0.15, b.tile[1] - 0.42);
        post.userData.building = b;
        built.add(post);
      }
      // bake the finished city: every static (non-RK_) mesh collapses into
      // one batch per material, and the originals move to layer 1: no
      // camera renders them (main, reflector, or shadow), but the hover
      // raycaster (layers.enableAll) still hits them for building lookup.
      // Profiled: the un-baked city was ~800 of the scene's ~1100 draw
      // calls, paid again by the reflector and the shadow pass.
      for (const g of bakedGeos) g.dispose();
      bakedGeos.length = 0;
      {
        const buckets = new Map();
        for (const child of built.children) {
          if (child.isMesh || !child.userData.building) continue;
          child.updateMatrixWorld(true);
          child.traverse(o => {
            if (!o.isMesh || o.name.startsWith('RK_') || Array.isArray(o.material)) return;
            const g = stripUnusedUV(o.geometry.clone().applyMatrix4(o.matrixWorld), o.material);
            const key = o.material.uuid
              + '|' + Object.keys(g.attributes).sort().join(',')
              + '|' + (g.index ? 'i' : 'n');
            if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
            buckets.get(key).geos.push(g);
            o.layers.set(1);
          });
        }
        for (const { mat, geos } of buckets.values()) {
          const g = mergeGeometries(geos);
          for (const gg of geos) gg.dispose();
          bakedGeos.push(g);
          const mesh = new THREE.Mesh(g, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          built.add(mesh);
        }
      }
      renderer.shadowMap.needsUpdate = true;
    }
    // queue markers: rebuild only when the queue itself changes
    const key = state.queue
      ? state.queue.id + '@' + state.queue.tile.join(',')
      : null;
    if (key !== queueKey) {
      queueKey = key;
      renderer.shadowMap.needsUpdate = true;
      if (queueGroup) {
        // Do NOT dispose GLB clone geometry: those buffers are shared with the
        // model library, so disposing would corrupt finished buildings. The
        // per-mesh cloned materials and the scaffold's own primitive geometries
        // ARE ours to free.
        queueGroup.traverse(o => { if (o.isMesh && o.material) o.material.dispose(); });
        const cage = queueGroup.userData && queueGroup.userData.cage;
        if (cage) cage.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
        scene.remove(queueGroup);
        queueGroup = null;
      }
      if (state.queue) {
        const model = modelFor(state.queue);

        // grey concrete shell: real model, materials replaced with grey
        const grey = lib[model].clone();
        grey.traverse(o => {
          if (isRoofKit(o.name)) o.visible = false;   // roof kit installs last
          if (o.isMesh) { o.castShadow = true; o.material = greyMat.clone(); }
        });
        const fit = fitBuilding(grey, state.queue.tile);
        const H = fit.height, F = fit.footprint;

        // full-color model: real materials, CLONED so clip planes do not leak
        // onto finished buildings that share the library material.
        const color = lib[model].clone();
        color.traverse(o => {
          if (isRoofKit(o.name)) o.visible = false;   // appears on completion
          if (o.isMesh) {
            o.castShadow = true; o.receiveShadow = true; o.material = o.material.clone();
          }
        });
        fitBuilding(color, state.queue.tile);

        // clip bands: grey occupies [colorH, greyH]; color occupies [0, colorH]
        const greyTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // keep y <= greyH
        const greyBot = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);  // keep y >= colorH
        const colorTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);// keep y <= colorH
        grey.traverse(o => { if (o.isMesh) o.material.clippingPlanes = [greyTop, greyBot]; });
        color.traverse(o => { if (o.isMesh) o.material.clippingPlanes = [colorTop]; });

        const cage = buildScaffold(state.queue.tile, F, H);

        queueGroup = new THREE.Group();
        queueGroup.add(grey, color, cage);
        // the active plot is always fenced: hoarding rides the queue group
        // so it appears with the build and leaves with it
        const hoard = lib['synthwave/synthwave-hoarding'].clone();
        hoard.position.set(state.queue.tile[0], 0, state.queue.tile[1]);
        queueGroup.add(hoard);
        queueGroup.userData = { greyTop, greyBot, colorTop, cage, H };
        scene.add(queueGroup);
        queueShownFrac = state.queue.laborDone / state.queue.laborNeeded;
      }
    }
    if (state.queue) {
      queueTargetFrac = state.queue.laborDone / state.queue.laborNeeded;
      lastQueueTile = state.queue.tile;   // the reveal-crest beat aims here
    }
  };

  api.setQueueProgress = (frac) => {
    if (!queueGroup) return;
    const u = queueGroup.userData;
    const s = stageHeights(Math.max(0, Math.min(1, frac)), u.H);
    u.greyTop.constant = s.greyH + 0.001;
    u.greyBot.constant = -s.colorH;
    u.colorTop.constant = s.colorH + 0.001;
    u.cage.visible = s.cageOpacity > 0.01;
    u.cage.traverse(o => { if (o.isMesh) o.material.opacity = s.cageOpacity; });
  };

  api.setHighlightedPlot = (tile) => {
    if (highlight) { scene.remove(highlight); highlight = null; }
    if (!tile) return;
    const [x, z] = tile;
    highlight = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x - 0.45, 0.06, z - 0.45),
        new THREE.Vector3(x + 0.45, 0.06, z - 0.45),
        new THREE.Vector3(x + 0.45, 0.06, z + 0.45),
        new THREE.Vector3(x - 0.45, 0.06, z + 0.45)]),
      new THREE.LineBasicMaterial({ color: 0xffd479 }));
    scene.add(highlight);
  };

  let candGroup = null;
  api.setCandidatePlots = (tiles, selected) => {
    if (candGroup) {
      candGroup.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      scene.remove(candGroup);
      candGroup = null;
    }
    if (!tiles || !tiles.length) return;
    candGroup = new THREE.Group();
    for (const t of tiles) {
      const sel = selected && t[0] === selected[0] && t[1] === selected[1];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.88),
        new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true,
          opacity: sel ? 0.4 : 0.12, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(t[0], 0.05, t[1]);
      candGroup.add(m);
    }
    scene.add(candGroup);
  };

  let liveliness = 0.3;
  let lightBoost = 1;       // shadowless tiers lift the hemi a touch
  let lastLive = [0.3, 0];  // so tier changes can re-run the light rig
  api.setLiveliness = (level01, workingCount) => {
    lastLive = [level01, workingCount];
    liveliness = Math.max(0, Math.min(1, level01));
    hemi.intensity = (0.7 + 0.3 * liveliness) * lightBoost;
    sun.intensity = 1.0 + 0.4 * liveliness;
    lampA.intensity = 0.3 + 0.8 * liveliness;
    cars.forEach((c, i) => c.m.visible = i < 2 + Math.round(8 * liveliness));
    flyers.forEach((f, i) => f.m.visible = i < 2 + Math.round(5 * liveliness));
  };
  api.setLiveliness(0.3, 0);

  function spawnSpark(x, y, z) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true }));
    sp.position.set(x, y, z);
    sp.scale.set(0.3, 0.3, 1);
    scene.add(sp);
    sparks.push({ sp, t: 0 });
  }
  api.spark = (tile) => spawnSpark(tile ? tile[0] : 0, 1.2, tile ? tile[1] : 0);

  api.celebrateComplete = (tile) => {
    const [x, z] = tile;
    spawnSpark(x, 1.2, z);
    if (reduced) return;   // reduced motion: a single spark, no bounce/ring/burst
    // gold spark burst around the base
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      spawnSpark(x + Math.cos(a) * 0.25, 0.9, z + Math.sin(a) * 0.25);
    }
    // expanding dust ring at the base
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.3, 28),
      new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.05, z);
    scene.add(ring);
    celebrations.push({ tile, t: 0, ring, baseY: null });
  };

  // district label projected to screen space
  const labelEl = document.createElement('div');
  labelEl.style.cssText = 'position:fixed;transform:translate(-50%,-100%);' +
    'pointer-events:none;font-size:10px;letter-spacing:2.5px;' +
    'text-transform:uppercase;color:rgba(230,237,243,.75);' +
    'text-shadow:0 1px 6px rgba(0,0,0,.9);display:none;z-index:6;';
  document.body.appendChild(labelEl);
  let labelText = null;
  api.setDistrictLabel = (name) => {
    labelText = name;
    labelEl.textContent = name || '';
  };

  const ray = new THREE.Raycaster();
  ray.layers.enableAll();   // baked-away building meshes live on layer 1
  const ptr = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const groundPt = new THREE.Vector3();
  let overDistrict = false;
  const tagEl = document.createElement('div');
  tagEl.style.cssText = 'position:fixed;transform:translate(-50%,-130%);' +
    'pointer-events:none;font-size:10.5px;padding:3px 9px;border-radius:6px;' +
    'background:rgba(11,15,24,.88);border:1px solid rgba(255,212,121,.4);' +
    'color:#ffd479;display:none;z-index:7;white-space:nowrap;';
  document.body.appendChild(tagEl);
  let clickCb = null;
  api.onBuildingClick = (cb) => { clickCb = cb; };

  function buildingAt(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    for (const h of ray.intersectObjects(built.children, true)) {
      let o = h.object;
      while (o && !o.userData.building) o = o.parent;
      if (o) return o.userData.building;
    }
    return null;
  }

  let downX = 0, downY = 0;
  renderer.domElement.addEventListener('pointerdown', (ev) => {
    downX = ev.clientX; downY = ev.clientY;
  });
  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (ev.buttons) {   // orbiting, not hovering
      tagEl.style.display = 'none';
      renderer.domElement.style.cursor = '';
      return;
    }
    const b = buildingAt(ev);
    // buildingAt already aimed the ray from this pointer position
    overDistrict = !!ray.ray.intersectPlane(groundPlane, groundPt)
      && Math.abs(groundPt.x) <= 2 && Math.abs(groundPt.z + 1) <= 2;
    if (b) {
      const item = CATALOG.find(c => c.id === b.type);
      tagEl.textContent = item.name + ' · ' + plotName(b.tile) + ' plot';
      tagEl.style.left = ev.clientX + 'px';
      tagEl.style.top = ev.clientY + 'px';
      tagEl.style.display = 'block';
      renderer.domElement.style.cursor = 'pointer';
    } else {
      tagEl.style.display = 'none';
      renderer.domElement.style.cursor = '';
    }
  });
  renderer.domElement.addEventListener('click', (ev) => {
    if (Math.hypot(ev.clientX - downX, ev.clientY - downY) > 5) return; // was a drag
    const b = buildingAt(ev);
    if (b && clickCb) clickCb(b);
  });
  renderer.domElement.addEventListener('pointerleave', () => { overDistrict = false; });

  let paused = false;
  api.setPaused = (p) => { paused = !!p; };

  // cinematic attract mode: an eased shot list with a dark dip between cuts.
  // Each shot maps u in [0,1] (plus shot-local seconds for drifts) to
  // [position, lookAt]. Tuned against the 9x9 demo city.
  // Choreography (critique pass 4): every shot carries a color-key `tint`
  // (CSS overlay, blend mode keeps blacks black), `enter` hooks stage a
  // beat while the cut is dark, and `beat` fires mid-shot (lightning in the
  // aerial, celebration on the reveal crest, the train timed through the
  // dolly). One macro close-up joined the reel: no beat ever landed ON
  // camera before, and every shot was the same wide drift.
  const easeU = (u) => u * u * (3 - 2 * u);
  const lerp3 = (a, b, u) =>
    [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const wrapD = (d) => ((d % TRK_L) + TRK_L) % TRK_L;
  let lastQueueTile = null;
  const SHOTS = [
    { dur: 18, tint: 'rgba(120,85,235,0.40)',
      at: (u, tl) => {   // high aerial drift over the whole city
        const a = 0.6 + tl * 0.05;
        return [[Math.cos(a) * 13, 5.2 + Math.sin(tl * 0.09) * 0.5, Math.sin(a) * 13],
                [0.3, 2.2, 0]];
      },
      // one distant strike, placed in the visible horizon sector
      beat: { t: 11, fire: () => window.__city.strike && window.__city.strike(4.3) } },
    { dur: 14, tint: 'rgba(255,90,175,0.36)',
      at: (u) => {       // street-level dolly east down the road lane
        const x = -4.4 + easeU(u) * 7.0;
        return [[x, 0.6, 0.25], [x + 3, 0.85, 0.15]];
      },
      // stage the train so it crosses the avenue dead mid-shot
      enter: (t0) => { train.d = wrapD(TRK_K + 0.52 - TRK.SPEED * (7 - t0)); } },
    { dur: 10, tint: 'rgba(255,170,110,0.38)', fov: 42, near: 0.05,
      at: (u) => {       // macro push up the south road at the subway mouth
        // (street-level detail shot; the road is the one guaranteed-clear
        // dolly path through the procedural fill)
        const e = easeU(u);
        return [lerp3([0.24, 0.44, 4.4], [0.18, 0.36, 3.0], e),
                lerp3([1.0, 0.42, 3.1], [0.85, 0.3, 2.95], e)];
      } },
    { dur: 14, tint: 'rgba(255,190,120,0.38)',
      at: (u) => {       // rise-up reveal from the south gate
        const e = easeU(u);
        return [lerp3([0.3, 0.65, 5.6], [-6.2, 6.4, 7.2], e),
                lerp3([0.0, 1.3, 2.4], [0.2, 2.3, -0.6], e)];
      },
      // the crest lands ON a completion flourish at the rising plot
      beat: { t: 11, fire: () => { if (lastQueueTile) api.celebrateComplete(lastQueueTile); } } },
    { dur: 12, tint: 'rgba(70,205,255,0.36)',
      at: (u) => {       // rooftop skim inside the ring, over the mega
        const a = -0.3 + easeU(u) * 1.6;
        return [[Math.cos(a) * 5.6, 3.5, Math.sin(a) * 5.6], [0, 1.6, 0]];
      } },
    { dur: 20, tint: 'rgba(135,255,220,0.32)',
      at: () => {        // riding the loop line just behind the train
        const p = trackPos(train.d - 2.8);
        const f = trackPos(train.d - 0.2);
        // the lit cars sweep along the neon guideway ahead of the camera
        return [[p.x, TRK.Y + 0.5, p.z],
                [f.x * 0.96, TRK.Y + 0.02, f.z * 0.96]];
      } },
    // the in-train passenger shot is gone for good (locked call: no camera
    // inside the train); the chase above is the train's shot
  ];
  const CUT_S = 0.6;              // dip length on each side of a cut
  let cineIdx = 0, cineT = 0, fadeEl = null, tintEl = null;
  let shownIdx = -1, beatFired = false;
  let viewMode = 'orbit';         // runtime views; see api.setView below
  if (cinematic) {
    cineIdx = ((opts.startShot || 0) % SHOTS.length + SHOTS.length) % SHOTS.length;
    cineT = Math.max(0, Math.min(opts.shotTime || 0, SHOTS[cineIdx].dur - 0.01));
    fadeEl = document.createElement('div');
    // sits over the stage, under the vignette (z5) and panels (z10)
    fadeEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
      'background:#0d1322;z-index:4;opacity:1;';
    document.body.appendChild(fadeEl);
    // per-shot color key: soft-light keeps blacks black AND does not crush
    // the blue channel the way overlay does on this blue-night scene (a
    // warm overlay key dimmed whole frames; cost one debug cycle)
    tintEl = document.createElement('div');
    tintEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
      'mix-blend-mode:soft-light;z-index:3;transition:background 0.6s;';
    document.body.appendChild(tintEl);
    if (SHOTS[cineIdx].enter) SHOTS[cineIdx].enter(cineT);
    window.__city.cine = () => ({ idx: cineIdx, t: cineT });   // QA handle
  }

  // ---- runtime views (designed-growth spec, 2026-07-18) ------------------
  // Street orbit is the free default; overlook/rooftop/ride/tour are the
  // unlockable vantages the page switches into without a reload. The boot
  // cinematic (?demo attract reel, ?ride, ?lounge) still owns the camera:
  // while `cinematic` is set, setView only records the choice.
  function ensureCineEls() {
    if (fadeEl) return;
    fadeEl = document.createElement('div');
    fadeEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
      'background:#0d1322;z-index:4;opacity:0;';
    document.body.appendChild(fadeEl);
    tintEl = document.createElement('div');
    tintEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
      'mix-blend-mode:soft-light;z-index:3;transition:background 0.6s;';
    document.body.appendChild(tintEl);
  }
  api.setView = (mode) => {
    viewMode = mode;
    controls.enabled = !cinematic && mode === 'orbit';
    if (mode === 'tour' || mode === 'ride') {
      ensureCineEls();
      shownIdx = -1; beatFired = false;
      if (mode === 'tour' && !cinematic) {
        cineIdx = 0; cineT = 0;
        if (SHOTS[0].enter) SHOTS[0].enter(0);
      }
    } else {
      if (fadeEl) fadeEl.style.opacity = '0';
      if (tintEl) tintEl.style.background = 'transparent';
      if (camera.fov !== 36 || camera.near !== 0.1) {
        camera.fov = 36; camera.near = 0.1;
        camera.updateProjectionMatrix();
      }
      if (mode === 'orbit') camMode = 'return'; // glide back onto the drift
    }
  };
  api.getView = () => viewMode;
  window.__city.view = { get: () => viewMode, set: api.setView };

  // ---- quality tiers: hold slow machines at a playable frame rate --------
  // The scene is fill-bound on weak GPUs, so the ladder cuts fill first
  // (render scale is quadratic savings across every pass), then the road
  // mirror (a whole second scene render), then bloom resolution, and at the
  // floor shadow taps plus four of the six street pools (those two share a
  // rung because both trigger shader recompiles). Every rung keeps the
  // night look and nothing stops moving; reducedMotion stays a separate
  // accessibility mode.
  const TIERS = [
    { dpr: 1.5,  mirror: true,  bloomDiv: 2, shadows: true,  pools: 6 },
    { dpr: 1.15, mirror: true,  bloomDiv: 2, shadows: true,  pools: 6 },
    { dpr: 1.15, mirror: false, bloomDiv: 2, shadows: true,  pools: 6 },
    { dpr: 1.0,  mirror: false, bloomDiv: 4, shadows: true,  pools: 6 },
    { dpr: 0.85, mirror: false, bloomDiv: 4, shadows: false, pools: 2 },
  ];
  const QKEY = 'chromatic-city-quality';
  const qOpt = String((opts && opts.quality) || 'auto');
  // ?quality=high|low|0..4 pins a tier and turns the governor off
  let qPinned = qOpt === 'auto' ? null
    : qOpt === 'high' ? 0
    : qOpt === 'low' ? TIERS.length - 1
    : Math.max(0, Math.min(TIERS.length - 1, parseInt(qOpt, 10) || 0));
  let qTier = 0;
  let qCeil = 0;                       // failed tiers raise this floor index
  let qAcc = 0, qN = 0, qSettle = 1.5; // rolling window + post-change grace

  function applyBloomSize() {
    // UnrealBloomPass.setSize halves internally, so feeding the full buffer
    // is the shipped half-res default and feeding half of it is quarter-res.
    // composer.setSize/setPixelRatio reset every pass to full buffer size,
    // so this must re-run after either.
    const p = renderer.getPixelRatio();
    const div = TIERS[qTier].bloomDiv;
    bloomPass.setSize(container.clientWidth * p * 2 / div,
                      container.clientHeight * p * 2 / div);
  }

  function setTier(i) {
    qTier = Math.max(0, Math.min(TIERS.length - 1, i));
    const t = TIERS[qTier];
    const p = Math.min(devicePixelRatio, t.dpr);
    if (renderer.getPixelRatio() !== p) {
      renderer.setPixelRatio(p);
      composer.setPixelRatio(p);
    }
    applyBloomSize();
    wetMirror.visible = t.mirror;
    wetShine.visible = !t.mirror;
    poolLights.forEach((pl, n) => { pl.visible = n < t.pools; });
    if (renderer.shadowMap.enabled !== t.shadows) {
      renderer.shadowMap.enabled = t.shadows;
      if (t.shadows) renderer.shadowMap.needsUpdate = true;
      // the flag sits in the program cache key, so every material must
      // recompile; one hitch, absorbed by the settle window
      scene.traverse(o => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          m.needsUpdate = true;
      });
    }
    lightBoost = t.shadows ? 1 : 1.12;  // keep shadowless frames from flattening
    api.setLiveliness(lastLive[0], lastLive[1]);
    qSettle = 1.0; qAcc = 0; qN = 0;
    if (qPinned === null) {
      try { localStorage.setItem(QKEY, String(qTier)); } catch (e) {}
    }
  }

  let qStart = qPinned;
  if (qStart === null) {
    // a settled tier from the last visit skips rediscovery (the governor
    // still steps back up if the machine turns out faster today)
    try {
      const saved = parseInt(localStorage.getItem(QKEY), 10);
      if (saved >= 0 && saved < TIERS.length) qStart = saved;
    } catch (e) {}
  }
  if (qStart === null) {
    // no real GPU (SwiftShader/llvmpipe): start at the floor instead of
    // letting the governor walk down to it painfully
    let gpu = '';
    try {
      const gl = renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    } catch (e) {}
    qStart = /swiftshader|llvmpipe|softpipe|software/i.test(gpu)
      ? TIERS.length - 1 : 0;
  }
  setTier(qStart);
  window.__city.quality = { tiers: TIERS, tier: () => qTier,
    set: (i) => { qPinned = i; setTier(i); } };

  // ---- VIBE SAMPLER (2026-07-18 universe-survey trial features) ----------
  // Every feature below is a candidate from docs/findings/
  // 2026-07-18-universe-survey.md, built to be SAMPLED and then kept or
  // deleted. Each one registers with vibeReg() and lives in its own block:
  // to remove a feature for good, delete its block (and its tick case, if
  // any). Runtime controls: the v key opens a checkbox panel, ?vibe=off /
  // ?vibe=all / ?vibe=name,name pins a set (and skips localStorage);
  // otherwise choices persist in localStorage. QA:
  // window.__city.vibe.state() / .set(name, on).
  const vibeFeatures = [];   // {name, label, setOn(on), on}
  const vibeTicks = [];      // per-frame updaters for enabled features
  const VIBE_KEY = 'chromatic-city-vibe';
  const vibeParam = (opts && opts.vibe) ? String(opts.vibe) : null;
  let vibeStored = {};
  try { vibeStored = JSON.parse(localStorage.getItem(VIBE_KEY) || '{}'); }
  catch (e) {}
  const vibeInitial = (name) => {
    if (vibeParam === 'off') return false;
    if (vibeParam === 'all') return true;
    if (vibeParam) return vibeParam.split(',').includes(name);
    return vibeStored[name] !== false;   // default on
  };
  function vibeReg(name, label, setOn) {
    const f = { name, label, setOn, on: vibeInitial(name) };
    setOn(f.on);
    vibeFeatures.push(f);
    return f;
  }
  const vibeSave = () => {
    if (vibeParam) return;   // pinned runs never write
    const s = {};
    for (const f of vibeFeatures) s[f.name] = f.on;
    try { localStorage.setItem(VIBE_KEY, JSON.stringify(s)); } catch (e) {}
  };

  // -- districts: per-zone ambient color fields (BR2049 lesson). Soft
  //    additive haze pools lying over three zones so the city reads zoned
  //    from the air even outside the reel's camera tints.
  {
    const poolTex = (stops) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const g = cv.getContext('2d');
      const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
      for (const [o, c] of stops) gr.addColorStop(o, c);
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(cv);
    };
    const grp = new THREE.Group();
    const zone = (x, z, r, rgba) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2),
        new THREE.MeshBasicMaterial({
          map: poolTex([[0, rgba], [1, 'rgba(0,0,0,0)']]),
          transparent: true, blending: THREE.AdditiveBlending,
          depthWrite: false, fog: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.055, z);
      grp.add(m);
    };
    zone(2.3, -2.3, 3.4, 'rgba(255,132,28,0.075)');   // market/food: amber
    zone(-2.5, 2.1, 3.2, 'rgba(255,72,190,0.06)');    // residential: pink
    zone(6.6, 0.2, 3.6, 'rgba(66,150,255,0.065)');    // corpo east: cyan-blue
    scene.add(grp);
    vibeReg('districts', 'District color fields', (on) => { grp.visible = on; });
  }

  // -- wires: overhead catenary tangle over streets + alley spans, with
  //    transformer cans at some anchors (the survey's cheapest
  //    high-recognition Asia-street cue; road poles alone read too tidy).
  {
    const grp = new THREE.Group();
    const wireMat = new THREE.LineBasicMaterial({ color: 0x0e1322 });
    const canMat = new THREE.MeshStandardMaterial({ color: 0x141a26, roughness: 0.9 });
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    const span = (a, b, sag, strands = 3) => {
      for (let s = 0; s < strands; s++) {
        const off = (s - (strands - 1) / 2) * 0.012;
        const pts = [];
        for (let i = 0; i <= 8; i++) {
          const u = i / 8;
          pts.push(new THREE.Vector3(
            a[0] + (b[0] - a[0]) * u + off,
            a[1] + (b[1] - a[1]) * u - Math.sin(Math.PI * u) * (sag + s * 0.008),
            a[2] + (b[2] - a[2]) * u + off * 0.6));
        }
        grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
      }
    };
    const can = (x, y, z) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.034, 6), canMat);
      c.position.set(x, y - 0.02, z);
      grp.add(c);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.004, 4, 4), dotMat);
      d.position.set(x + 0.012, y - 0.012, z);
      grp.add(d);
    };
    // across the avenues (clear of lamp heads, above vehicle height)
    for (const x of [-2.5, -1.5, 1.5, 2.5, 3.5]) span([x, 0.44, -0.56], [x + 0.18, 0.4, 0.56], 0.06);
    for (const z of [-2.5, -1.5, 1.5, 2.5]) span([-0.56, 0.42, z], [0.56, 0.46, z + 0.2], 0.055);
    // alley diagonals between plate blocks
    span([1.5, 0.5, -1.45], [2.5, 0.44, -2.4], 0.07);
    span([-1.5, 0.46, 1.55], [-2.45, 0.52, 2.4], 0.08);
    span([2.55, 0.48, 1.5], [3.4, 0.42, 2.45], 0.07);
    span([-2.4, 0.44, -1.55], [-3.35, 0.5, -2.5], 0.075);
    can(-2.5, 0.44, -0.56); can(1.5, 0.44, -0.56);
    can(-0.56, 0.42, 1.5); can(2.55, 0.48, 1.5);
    // growth story: wire spans hang between buildings; over the empty
    // plate they float, so the tangle arrives with the plate decor band
    if (growBandGroups.length) growBandGroups[0].add(grp);
    else scene.add(grp);
    vibeReg('wires', 'Overhead wire tangle', (on) => { grp.visible = on; });
  }

  // -- crowds: umbrella-figure silhouettes clustered at the market, subway
  //    mouth, vending row and shrine, plus a few slow walkers on the
  //    sidewalks. Deliberately unlit near-black sprites (Blade Runner
  //    umbrella crowds read as shape, never as characters).
  const vibeWalkers = [];
  {
    const figTex = (kind) => {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128;
      const g = cv.getContext('2d');
      g.fillStyle = '#0a0e19';
      if (kind !== 2) {                       // umbrella dome
        g.beginPath(); g.ellipse(32, 34, 26, 13, 0, Math.PI, 0); g.fill();
        g.fillRect(31, 34, 2, 14);
      }
      g.beginPath(); g.arc(32, 52, 7, 0, Math.PI * 2); g.fill();   // head
      g.beginPath();                                                // body
      g.moveTo(20, 128); g.lineTo(24, 64); g.lineTo(40, 64); g.lineTo(44, 128);
      g.closePath(); g.fill();
      return new THREE.CanvasTexture(cv);
    };
    const mats = [0, 1, 2].map(k => new THREE.SpriteMaterial({
      map: figTex(k), transparent: true, depthWrite: false }));
    const grp = new THREE.Group();
    const person = (x, z, s = 1) => {
      const sp = new THREE.Sprite(mats[(Math.abs(Math.round(x * 31 + z * 17)) % 3)]);
      sp.scale.set(0.027 * s, 0.055 * s, 1);
      sp.position.set(x, 0.028 * s, z);
      grp.add(sp);
      return sp;
    };
    const cluster = (x, z, n) => {
      for (let i = 0; i < n; i++) {
        person(x + Math.sin(i * 2.4) * 0.09, z + Math.cos(i * 1.7) * 0.08,
          0.92 + (i % 3) * 0.07);
      }
    };
    cluster(2.25, -2.3, 5);    // market stalls
    cluster(1.05, 2.62, 4);    // subway mouth
    cluster(-2.05, 2.05, 3);   // vending row
    cluster(-1.0, 2.72, 2);    // shrine approach
    cluster(0.5, -0.44, 3);    // crossing corner
    // district subway mouths (transit pass): figures derived from
    // DISTRICT_SUBWAYS so they follow if an entrance moves. Offset per
    // mouth rotation keeps the cluster on the pad beside the trench,
    // 0.12 clear of the pit (same gap as the (1,3) cluster above)
    const SUB_CROWD_OFF = { 0: [-0.38, -0.05], 1: [0.05, -0.38],
                            2: [-0.38, 0.05], 3: [0.05, -0.38] };
    for (const [sx, sz, rq] of DISTRICT_SUBWAYS) {
      cluster(sx + SUB_CROWD_OFF[rq][0], sz + SUB_CROWD_OFF[rq][1], 3);
    }
    if (!reduced) {
      for (let i = 0; i < 5; i++) {
        const sp = person(0, 0, 0.95 + (i % 2) * 0.06);
        vibeWalkers.push({ sp, ph: i * 1.31, lane: i % 2 });
      }
    }
    // growth story: crowds gather at set pieces (market, subway mouths);
    // they arrive with the plate decor band instead of queueing on air
    if (growBandGroups.length) growBandGroups[0].add(grp);
    else scene.add(grp);
    vibeReg('crowds', 'Crowd silhouettes', (on) => { grp.visible = on; });
    vibeTicks.push((t) => {
      for (const w of vibeWalkers) {
        const u = ((t * 0.045 + w.ph) % 2 + 2) % 2;       // 0..2 wrap
        const p = u < 1 ? u : 2 - u;                       // ping-pong
        const along = -3 + 6 * p;
        if (w.lane === 0) w.sp.position.set(along, w.sp.position.y, 0.41);
        else w.sp.position.set(-0.41, w.sp.position.y, along);
      }
    });
  }

  // -- retrosun: the genre's banded gradient sun as SIGN ART (night lock
  //    honored), stacked above the jumbotron as a second media board.
  {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#07060f'; g.fillRect(0, 0, 256, 256);
    const gr = g.createLinearGradient(0, 34, 0, 224);
    gr.addColorStop(0, '#ffd319'); gr.addColorStop(0.35, '#ff901f');
    gr.addColorStop(0.7, '#ff2975'); gr.addColorStop(1, '#8c1eff');
    g.fillStyle = gr;
    g.beginPath(); g.arc(128, 130, 95, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#07060f';                       // widening horizon slits
    for (let i = 0; i < 6; i++) g.fillRect(0, 130 + i * 16, 256, 3 + i * 1.6);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const grp = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62),
      new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd }));  // sub-bloom
    board.rotation.y = Math.PI / 2;
    board.position.set(-4.575, 1.92, -1.0);
    grp.add(board);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x151d29, roughness: 0.85 }));
    back.position.set(-4.62, 1.92, -1.0);
    grp.add(back);
    // growth story: stacked on the jumbotron, so it arrives with band 0
    if (growBandGroups.length) growBandGroups[0].add(grp);
    else scene.add(grp);
    vibeReg('retrosun', 'Retrosun sign board', (on) => { grp.visible = on; });
  }

  // -- mountains: dim wireframe vector-ridge rings behind the horizon
  //    cards (OutRun/Tron grammar; fills the sectors the cards skip).
  //    Skips the moon sector like the cards do.
  {
    const MOON_AZ = Math.atan2(-22, -30);
    const grp = new THREE.Group();
    // jagged TRIANGULAR ridgeline hugging the horizon: peak heights are a
    // deterministic hash sampled every few degrees with straight lines
    // between, so it reads as mountains, not cables (v1 used smooth sines
    // at 2x the height and the lines floated over the horizon cards as
    // wavy sky wires; cost one debug cycle)
    const ridge = (r, y0, amp, seed, color, opacity, drop) => {
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity, fog: false });
      const N = 240, STEP = 4;   // a peak every STEP samples
      const peak = (k) => {
        const h = Math.abs(Math.sin(k * 12.9898 + seed) * 43758.5453 % 1);
        return y0 + amp * (0.25 + 0.75 * h);
      };
      const lines = [[], []];    // main ridgeline + echo line below
      const flush = () => {
        for (const pts of lines) {
          if (pts.length > 1) {
            grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
          }
          pts.length = 0;
        }
      };
      for (let i = 0; i <= N; i++) {
        const a = i / N * Math.PI * 2;
        const dm = Math.atan2(Math.sin(a - MOON_AZ), Math.cos(a - MOON_AZ));
        if (Math.abs(dm) < 0.24) { flush(); continue; }
        const k = Math.floor(i / STEP), u = (i % STEP) / STEP;
        const h = peak(k) * (1 - u) + peak(k + 1) * u;
        lines[0].push(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r));
        lines[1].push(new THREE.Vector3(Math.cos(a) * r, h - drop, Math.sin(a) * r));
      }
      flush();
    };
    ridge(44, -0.5, 2.6, 1.7, 0x7a4bd0, 0.22, 0.55);
    ridge(41, -0.5, 1.7, 4.1, 0xb45de0, 0.16, 0.4);
    scene.add(grp);
    vibeReg('mountains', 'Vector mountain ridges', (on) => { grp.visible = on; });
  }

  // -- blimp: a slow ad blimp drifting an ellipse over the city (Blade
  //    Runner's constant aerial motion layer). Ad panels reuse the
  //    broadcast atlas; blinker stays tiny.
  let vibeBlimp = null;
  {
    const grp = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0x232d40, roughness: 0.55 }));
    hull.scale.set(0.4, 0.104, 0.104);
    grp.add(hull);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.01),
      hull.material);
    fin.position.set(-0.35, 0.04, 0);
    grp.add(fin);
    // sub-threshold pink belly strip so the hull silhouette reads at night
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.008),
      new THREE.MeshBasicMaterial({ color: 0xd42fa0 }));
    strip.position.set(0, -0.095, 0);
    grp.add(strip);
    const adTex = new THREE.TextureLoader().load(
      assetBase + 'synthwave/textures/broadcast-screen-atlas.png');
    adTex.colorSpace = THREE.SRGBColorSpace;
    adTex.repeat.set(0.23, 0.23);
    adTex.offset.set(0.51, 0.76);
    for (const s of [-1, 1]) {
      const ad = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.1),
        new THREE.MeshBasicMaterial({ map: adTex, side: THREE.FrontSide }));
      ad.rotation.y = s > 0 ? 0 : Math.PI;
      ad.position.set(0, -0.004, s * 0.062);
      grp.add(ad);
    }
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xff3040 }));
    blink.position.set(0.5, 0, 0);
    grp.add(blink);
    grp.position.set(5.5, 4.9, -3);
    scene.add(grp);
    vibeBlimp = { grp, blink };
    vibeReg('blimp', 'Ad blimp', (on) => { grp.visible = on; });
    vibeTicks.push((t) => {
      if (reduced) return;
      const a = t * 0.021 + 1.2;
      vibeBlimp.grp.position.set(Math.cos(a) * 8, 4.9 + Math.sin(t * 0.05) * 0.25,
        Math.sin(a) * 6.2);
      vibeBlimp.grp.rotation.y = -Math.atan2(
        Math.cos(a) * 6.2, -Math.sin(a) * 8) + Math.PI / 2;
      vibeBlimp.blink.visible = (t % 1.6) < 0.12;
    });
  }

  // sampler panel: v key toggles; checkboxes flip features live
  {
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:14px;top:14px;z-index:20;' +
      'display:none;background:rgba(10,14,25,0.92);border:1px solid #2a3550;' +
      'border-radius:8px;padding:10px 14px;font:12px ui-monospace,monospace;' +
      'color:#cdd6ee;letter-spacing:0.04em;';
    panel.innerHTML = '<div style="margin-bottom:6px;color:#8fa0c8">' +
      'vibe sampler (v to close)</div>';
    for (const f of vibeFeatures) {
      const row = document.createElement('label');
      row.style.cssText = 'display:block;margin:3px 0;cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = f.on;
      cb.style.marginRight = '7px';
      cb.addEventListener('change', () => {
        f.on = cb.checked; f.setOn(f.on); vibeSave();
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(f.label));
      panel.appendChild(row);
    }
    document.body.appendChild(panel);
    addEventListener('keydown', (ev) => {
      if (ev.key === 'v' && !ev.metaKey && !ev.ctrlKey) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    });
    window.__city.vibe = {
      state: () => Object.fromEntries(vibeFeatures.map(f => [f.name, f.on])),
      set: (name, on) => {
        const f = vibeFeatures.find(x => x.name === name);
        if (f) { f.on = !!on; f.setOn(f.on); vibeSave(); }
      },
    };
  }

  function vibeTick(t) {
    for (const fn of vibeTicks) fn(t);
  }
  // ---- end VIBE SAMPLER --------------------------------------------------

  const clock = new THREE.Clock();
  const autoPos = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    if (paused) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.getElapsedTime();

    // growth-story groups easing up out of the ground
    for (const g of growBandGroups) {
      if (g.userData.riseT0 === undefined) continue;
      const u = Math.min(1, (performance.now() - g.userData.riseT0) / g.userData.dur);
      g.position.y = -g.userData.sink * Math.pow(1 - u, 3);
      if (u >= 1) delete g.userData.riseT0;
    }

    // governor: judge real frame times over a rolling ~2s window; step down
    // while the machine cannot hold ~30fps, step back up (past 55fps) only
    // into tiers that never failed, so it cannot ping-pong
    if (qPinned === null) {
      if (qSettle > 0) qSettle -= dt;
      else {
        qAcc += dt; qN++;
        if (qAcc >= 2) {
          const avg = qAcc / qN;
          if (avg > 1 / 28 && qTier < TIERS.length - 1) {
            qCeil = qTier + 1;
            setTier(qTier + 1);
          } else if (avg < 1 / 55 && qTier > qCeil) {
            setTier(qTier - 1);
          }
          qAcc = 0; qN = 0;
        }
      }
    }

    if (cinematic && opts.loungeOnly) {
      // lounge mode: pinned interior camera, one unhurried pan, no cuts.
      // The swing is biased toward the moonward (north-west) extreme and
      // the gaze drifts up-city; both periods are incommensurate so the
      // pan never visibly loops.
      if (camera.fov !== 46 || camera.near !== 0.05) {
        camera.fov = 46; camera.near = 0.05;
        camera.updateProjectionMatrix();
      }
      const s = -0.15 + 0.5 * Math.sin(t * 0.21);
      const ty = 2.6 + 1.0 * Math.sin(t * 0.13 + 1.0);
      camera.position.set(lounge.x - 0.05, lounge.y + 0.34, lounge.z);
      camera.lookAt(lounge.x - 8 * Math.cos(s), ty, lounge.z + 8 * Math.sin(s));
      fadeEl.style.opacity = String(Math.max(0, 1 - t / 1.5));
      if (shownIdx !== -2) {
        shownIdx = -2;
        tintEl.style.background = 'rgba(150,100,235,0.30)';
      }
    } else if (cinematic || viewMode === 'tour' || viewMode === 'ride') {
      const rideNow = cinematic ? opts.rideOnly : viewMode === 'ride';
      if (rideNow) {
        // ride: follow the train from behind for the whole visit, no cuts
        cineIdx = SHOTS.length - 1;
        cineT = SHOTS[cineIdx].dur / 2;
      } else if (!(cinematic && opts.shotFreeze)) {
        cineT += dt;   // dev: shotf pins the loop for screenshots
      }
      if (cineT >= SHOTS[cineIdx].dur) {
        cineT -= SHOTS[cineIdx].dur;
        cineIdx = (cineIdx + 1) % SHOTS.length;
        // stage the next shot's beat while the cut is dark
        if (SHOTS[cineIdx].enter) SHOTS[cineIdx].enter(cineT);
      }
      if (shownIdx !== cineIdx) {
        shownIdx = cineIdx;
        beatFired = false;
        tintEl.style.background = SHOTS[cineIdx].tint || 'transparent';
      }
      const shot = SHOTS[cineIdx];
      if (shot.beat && !beatFired && cineT >= shot.beat.t) {
        beatFired = true;
        shot.beat.fire();
      }
      // interior shots want a wider lens and a closer near plane
      const fv = shot.fov || 36, nr = shot.near || 0.1;
      if (camera.fov !== fv || camera.near !== nr) {
        camera.fov = fv; camera.near = nr;
        camera.updateProjectionMatrix();
      }
      const [p, l] = shot.at(cineT / shot.dur, cineT);
      camera.position.set(p[0], p[1], p[2]);
      camera.lookAt(l[0], l[1], l[2]);
      const edge = Math.min(cineT, shot.dur - cineT);
      fadeEl.style.opacity = edge < CUT_S ? (1 - edge / CUT_S).toFixed(3) : '0';
    } else if (viewMode === 'overlook') {
      // the hillside seat: a fixed vantage with a slow breath, no controls
      // (sits above the second scenery band so no foreground roof blocks it)
      const bx = Math.sin(t * 0.05) * 0.35, by = Math.sin(t * 0.11) * 0.15;
      camera.position.set(-11.2 + bx, 5.0 + by, 10.6 - bx);
      camera.lookAt(0.3, 1.7, 0);
    } else if (viewMode === 'rooftop') {
      // rooftop drift: a slow skim orbit just above the ring
      const a = t * 0.045 + 2.2;
      camera.position.set(Math.cos(a) * 5.6, 3.5, Math.sin(a) * 5.6);
      camera.lookAt(0, 1.6, 0);
    } else {
      if (reduced) {
        autoPos.set(10, 6.5, 10);
      } else {
        const a = t * 0.04 + 0.6;
        autoPos.set(Math.cos(a) * 13, 5.2 + Math.sin(t * 0.09) * 0.6, Math.sin(a) * 13);
      }
      if (camMode === 'auto') {
        // aim slightly up-city so the horizon and the moon ride the top of frame
        camera.position.copy(autoPos);
        camera.lookAt(LOOK_AT);
      } else if (camMode === 'manual') {
        controls.update();
        if (performance.now() - lastInputMs > RESUME_AFTER_MS) camMode = 'return';
      } else {
        // glide back onto the tour path, then hand the camera to it
        const k = Math.min(1, dt * 1.6);
        camera.position.lerp(autoPos, k);
        controls.target.lerp(LOOK_AT, k);
        camera.lookAt(controls.target);
        if (camera.position.distanceTo(autoPos) < 0.05) camMode = 'auto';
      }
    }


    for (const c of cars) {
      if (!c.m.visible) continue;
      c.p += c.v * dt * (c.off > 0 ? 1 : -1);
      if (c.p > 10.4) c.p = -10.4; if (c.p < -10.4) c.p = 10.4;
      if (c.axis === 'x') c.m.position.set(c.p, 0.02, c.off);
      else c.m.position.set(c.off, 0.02, c.p);
    }

    for (const f of flyers) {
      if (!f.m.visible) continue;
      f.p += f.v * dt * f.dir;
      if (f.p > 10) f.p = -10; if (f.p < -10) f.p = 10;
      const y = f.alt + Math.sin(t * 1.3 + f.ph) * 0.06;
      if (f.axis === 'x') f.m.position.set(f.p, y, f.off);
      else f.m.position.set(f.off, y, f.p);
    }

    train.d += TRK.SPEED * dt;
    train.cars.forEach((c, i) => {
      const p = trackPos(train.d - i * 0.52);
      c.position.set(p.x, TRK.Y + 0.012, p.z);
      // car authored facing -x; aim the nose along the heading
      c.rotation.y = Math.atan2(p.hz, -p.hx);
    });

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.t += dt; s.sp.position.y += dt * 0.5;
      s.sp.material.opacity = Math.max(0, 1 - s.t / 1.7);
      if (s.t > 1.7) { scene.remove(s.sp); s.sp.material.dispose(); sparks.splice(i, 1); }
    }

    if (queueGroup) {
      queueShownFrac += (queueTargetFrac - queueShownFrac) * Math.min(1, dt * 3);
      api.setQueueProgress(queueShownFrac);
    }

    for (const mx of mixers) mx.update(dt);
    for (const mx of sceneryMixers) mx.update(dt);

    // atmosphere: rain drum follows the camera; drops recycle top to bottom
    if (rain) {
      // lounge mode: recenter the drum fully past the glass (drum radius 9;
      // 9.6 keeps every drop west of the pane) so no streaks fall inside
      if (lounge) rain.position.set(camera.position.x - 9.6, 0, camera.position.z);
      else rain.position.set(camera.position.x, 0, camera.position.z);
      const rp = rain.geometry.attributes.position.array;
      for (let i = 0; i < DROPS; i++) {
        const d = rainDrops[i];
        d.y -= d.v * dt;
        if (d.y < 0) d.y = 7;
        rp[i * 6] = d.x;     rp[i * 6 + 1] = d.y;        rp[i * 6 + 2] = d.z;
        rp[i * 6 + 3] = d.x; rp[i * 6 + 4] = d.y + 0.12; rp[i * 6 + 5] = d.z;
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    // dying-tube neon buzz (deterministic, per-sign phase)
    for (let i = 0; i < flicker.length; i++) {
      const f = flicker[i];
      const tt = t * (1 + i * 0.37) + i * 11;
      const dip = Math.sin(tt * 97) * Math.sin(tt * 31) > 0.96 ? 0.12 : 1;
      f.m.emissiveIntensity = f.base * dip * (0.93 + 0.07 * Math.sin(tt * 53));
    }
    // jumbotron channel-hops through the broadcast stills
    jumbo.timer += dt;
    if (jumbo.timer > 2.4) {
      jumbo.timer = 0;
      jumbo.cell = (jumbo.cell + 1) % 16;
      jumbo.tex.offset.set((jumbo.cell % 4) / 4 + 0.01,
                           (3 - Math.floor(jumbo.cell / 4)) / 4 + 0.01);
    }
    // the chameleon turns, bobs, and shimmers; the shader clock drives
    // scan bands + sweep, and rare glitch dropouts crush uGlow briefly
    if (holoGrp) {
      holoGrp.rotation.y = t * 0.45;
      holoGrp.position.y = 3.8 + 0.06 * Math.sin(t * 1.3);
      holoShared.uTime.value = t;
      let gl = 0.86 + 0.1 * Math.sin(t * 7.1) * Math.sin(t * 3.3);
      if (t < holoGlitch.until) gl *= 0.3;
      else if (t > holoGlitch.next) {
        holoGlitch.until = t + 0.07 + Math.random() * 0.07;
        holoGlitch.next = t + 6 + Math.random() * 9;
      }
      holoShared.uGlow.value = gl;
      // coupling: the spill light breathes with the hologram and dies on
      // the glitch dropouts, so its glow on the roof reads as the same light
      if (holoLight) holoLight.intensity = 2.2 * gl;
    }
    // world edge: through-traffic on the open arterial fades in at the
    // plate edge and out into the fog
    for (const c of arterialCars) {
      c.x += c.v * dt * c.dir;
      if (c.dir > 0 && c.x > 29.5) c.x = 11.0;
      if (c.dir < 0 && c.x < 11.0) c.x = 29.5;
      c.sp.position.set(c.x, 0.055, c.lane);
      c.sp.material.opacity = 0.9
        * Math.min(1, (c.x - 10.8) / 1.2)
        * Math.max(0, Math.min(1, (29.5 - c.x) / 4));
    }
    // searchlights sweep; the tilt breathes so the cones never read looped
    for (const s of searchlights) {
      s.grp.rotation.y = s.ph + t * s.speed;
      s.arm.rotation.x = s.tilt + Math.sin(t * 0.23 + s.ph) * 0.08;
    }
    // lightning: decaying pulse train on the blink light + horizon glow
    if (bolt) {
      boltNext -= dt;
      if (boltNext <= 0) {
        window.__city.strike();
        boltNext = 11 + rand() * 16;
      }
      boltAge += dt;
      if (boltAge < 1.2) {
        let env = 0;
        for (const [t0, amp] of boltPulses) {
          if (boltAge >= t0) env = Math.max(env, amp * Math.exp(-(boltAge - t0) * 22));
        }
        bolt.intensity = env * 1.5;
        boltGlow.material.opacity = Math.min(1, env) * 0.9;
      } else if (bolt.intensity > 0) {
        bolt.intensity = 0;
        boltGlow.material.opacity = 0;
      }
    }
    // frozen shadows refresh every 2s while a build is rising, so the
    // shell's shadow keeps pace without paying the pass per frame
    if (queueGroup && Math.floor(t / 2) !== Math.floor((t - dt) / 2)) {
      renderer.shadowMap.needsUpdate = true;
    }

    for (let i = celebrations.length - 1; i >= 0; i--) {
      const cel = celebrations[i];
      cel.t += dt;
      // dust ring: expand + fade over 0.8s
      const rt = Math.min(1, cel.t / 0.8);
      cel.ring.scale.setScalar(1 + rt * 4);
      cel.ring.material.opacity = (1 - rt) * 0.55;
      // settle-bounce: hop the finished building up, then back, over 0.45s.
      // Look the building up lazily so it works whether or not updateCity has
      // rebuilt `built` yet this frame. Skip the post marker (a Mesh).
      const model = built.children.find(o => !o.isMesh && o.userData.building
        && o.userData.building.tile[0] === cel.tile[0]
        && o.userData.building.tile[1] === cel.tile[1]);
      if (model) {
        if (cel.baseY === null) cel.baseY = model.position.y;
        const b = cel.t < 0.45 ? Math.sin(cel.t / 0.45 * Math.PI) * 0.12 : 0;
        model.position.y = cel.baseY + b;
      }
      if (cel.t > 1.0) {
        if (model && cel.baseY !== null) model.position.y = cel.baseY;
        scene.remove(cel.ring);
        cel.ring.geometry.dispose();
        cel.ring.material.dispose();
        celebrations.splice(i, 1);
      }
    }

    if (labelText && overDistrict) {
      const v = new THREE.Vector3(0, 3.2, -1).project(camera);
      if (v.z < 1) {
        labelEl.style.left = (v.x + 1) / 2 * innerWidth + 'px';
        labelEl.style.top = (1 - v.y) / 2 * innerHeight + 'px';
        labelEl.style.display = 'block';
      } else labelEl.style.display = 'none';
    } else labelEl.style.display = 'none';

    vibeTick(t);
    composer.render();
  }
  frame();

  addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
    applyBloomSize();   // composer.setSize just reset bloom to half-res
  });

  return api;
}
