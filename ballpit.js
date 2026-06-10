// Ballpit — vanilla JS port with subsurface scattering
// Original by Kevin Levron: https://x.com/soju22/status/1858925191671271801

import {
  Vector3, MeshPhysicalMaterial, InstancedMesh, Clock,
  AmbientLight, SphereGeometry, ShaderChunk, Scene,
  Color, Object3D, SRGBColorSpace, MathUtils,
  PMREMGenerator, Vector2, WebGLRenderer, PerspectiveCamera,
  PointLight, ACESFilmicToneMapping, Plane, Raycaster
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// ── ThreeCanvas (class x in original) ──
class ThreeCanvas {
  #e; canvas; camera; cameraMinAspect; cameraMaxAspect; cameraFov; maxPixelRatio; minPixelRatio;
  scene; renderer; #t;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.#i;
  onBeforeRender = () => {};
  onAfterRender = () => {};
  onAfterResize = () => {};
  #s = false; #n = false; isDisposed = false; #o; #r; #a;
  #c = new Clock();
  #h = { elapsed: 0, delta: 0 };
  #l;
  constructor(e) {
    this.#e = { ...e };
    this.#m(); this.#d(); this.#p(); this.resize(); this.#g();
  }
  #m() { this.camera = new PerspectiveCamera(); this.cameraFov = this.camera.fov; }
  #d() { this.scene = new Scene(); }
  #p() {
    if (this.#e.canvas) { this.canvas = this.#e.canvas; }
    else if (this.#e.id) { this.canvas = document.getElementById(this.#e.id); }
    else { console.error('ThreeCanvas: Missing canvas or id'); }
    this.canvas.style.display = 'block';
    const opts = { canvas: this.canvas, powerPreference: 'high-performance', ...(this.#e.rendererOptions ?? {}) };
    this.renderer = new WebGLRenderer(opts);
    this.renderer.outputColorSpace = SRGBColorSpace;
  }
  #g() {
    if (!(this.#e.size instanceof Object)) {
      window.addEventListener('resize', this.#f.bind(this));
      if (this.#e.size === 'parent' && this.canvas.parentNode) {
        this.#r = new ResizeObserver(this.#f.bind(this));
        this.#r.observe(this.canvas.parentNode);
      }
    }
    this.#o = new IntersectionObserver(this.#u.bind(this), { root: null, rootMargin: '0px', threshold: 0 });
    this.#o.observe(this.canvas);
    document.addEventListener('visibilitychange', this.#v.bind(this));
  }
  #y() {
    window.removeEventListener('resize', this.#f.bind(this));
    this.#r?.disconnect(); this.#o?.disconnect();
    document.removeEventListener('visibilitychange', this.#v.bind(this));
  }
  #u(e) { this.#s = e[0].isIntersecting; this.#s ? this.#w() : this.#z(); }
  #v() { if (this.#s) { document.hidden ? this.#z() : this.#w(); } }
  #f() { if (this.#a) clearTimeout(this.#a); this.#a = setTimeout(this.resize.bind(this), 100); }
  resize() {
    let w, h;
    if (this.#e.size instanceof Object) { w = this.#e.size.width; h = this.#e.size.height; }
    else if (this.#e.size === 'parent' && this.canvas.parentNode) { w = this.canvas.parentNode.offsetWidth; h = this.canvas.parentNode.offsetHeight; }
    else { w = window.innerWidth; h = window.innerHeight; }
    this.size.width = w; this.size.height = h; this.size.ratio = w / h;
    this.#x(); this.#b(); this.onAfterResize(this.size);
  }
  #x() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.#A(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.#A(this.cameraMaxAspect);
      } else { this.camera.fov = this.cameraFov; }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }
  #A(e) {
    const t = Math.tan(MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / e);
    this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(t));
  }
  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const e = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(e / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    }
  }
  #b() {
    this.renderer.setSize(this.size.width, this.size.height);
    this.#t?.setSize(this.size.width, this.size.height);
    let p = window.devicePixelRatio;
    if (this.maxPixelRatio && p > this.maxPixelRatio) p = this.maxPixelRatio;
    else if (this.minPixelRatio && p < this.minPixelRatio) p = this.minPixelRatio;
    this.renderer.setPixelRatio(p); this.size.pixelRatio = p;
  }
  get postprocessing() { return this.#t; }
  set postprocessing(e) { this.#t = e; this.render = e.render.bind(e); }
  #w() {
    if (this.#n) return;
    const animate = () => {
      this.#l = requestAnimationFrame(animate);
      this.#h.delta = this.#c.getDelta();
      this.#h.elapsed += this.#h.delta;
      this.onBeforeRender(this.#h);
      this.render();
      this.onAfterRender(this.#h);
    };
    this.#n = true; this.#c.start(); animate();
  }
  #z() { if (this.#n) { cancelAnimationFrame(this.#l); this.#n = false; this.#c.stop(); } }
  #i() { this.renderer.render(this.scene, this.camera); }
  clear() {
    this.scene.traverse(e => {
      if (e.isMesh && typeof e.material === 'object' && e.material !== null) {
        Object.keys(e.material).forEach(k => {
          const v = e.material[k];
          if (v !== null && typeof v === 'object' && typeof v.dispose === 'function') v.dispose();
        });
        e.material.dispose(); e.geometry.dispose();
      }
    });
    this.scene.clear();
  }
  dispose() {
    this.#y(); this.#z(); this.clear();
    this.#t?.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss();
    this.isDisposed = true;
  }
}

// ── Interaction system ──
const interactionMap = new Map();
const mouseScreen = new Vector2();
let interactionGlobalSetup = false;

function rectContains(rect) {
  const { x, y } = mouseScreen;
  const { left, top, width, height } = rect;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}
function updateNormPos(entry, rect) {
  const { position, nPosition } = entry;
  position.x = mouseScreen.x - rect.left;
  position.y = mouseScreen.y - rect.top;
  nPosition.x = (position.x / rect.width) * 2 - 1;
  nPosition.y = -(position.y / rect.height) * 2 + 1;
}

function onPMove(e) { mouseScreen.x = e.clientX; mouseScreen.y = e.clientY; processAll(); }
function processAll() {
  for (const [elem, t] of interactionMap) {
    const rect = elem.getBoundingClientRect();
    if (rectContains(rect)) {
      updateNormPos(t, rect);
      if (!t.hover) { t.hover = true; t.onEnter(t); }
      t.onMove(t);
    } else if (t.hover && !t.touching) { t.hover = false; t.onLeave(t); }
  }
}
function onClick(e) {
  mouseScreen.x = e.clientX; mouseScreen.y = e.clientY;
  for (const [elem, t] of interactionMap) {
    const rect = elem.getBoundingClientRect();
    updateNormPos(t, rect);
    if (rectContains(rect)) t.onClick(t);
  }
}
function onPLeave() {
  for (const t of interactionMap.values()) { if (t.hover) { t.hover = false; t.onLeave(t); } }
}
function onTStart(e) {
  if (e.touches.length > 0) {
    mouseScreen.x = e.touches[0].clientX; mouseScreen.y = e.touches[0].clientY;
    let inside = false;
    for (const [elem, t] of interactionMap) {
      const rect = elem.getBoundingClientRect();
      if (rectContains(rect)) {
        inside = true; t.touching = true; updateNormPos(t, rect);
        if (!t.hover) { t.hover = true; t.onEnter(t); }
        t.onMove(t);
      }
    }
    if (inside) e.preventDefault();
  }
}
function onTMove(e) {
  if (e.touches.length > 0) {
    mouseScreen.x = e.touches[0].clientX; mouseScreen.y = e.touches[0].clientY;
    let inside = false;
    for (const [elem, t] of interactionMap) {
      const rect = elem.getBoundingClientRect();
      if (rectContains(rect)) {
        inside = true; updateNormPos(t, rect);
        if (!t.hover) { t.hover = true; t.touching = true; t.onEnter(t); }
        t.onMove(t);
      } else if (t.hover && t.touching) { t.onMove(t); }
    }
    if (inside) e.preventDefault();
  }
}
function onTEnd() {
  for (const [, t] of interactionMap) { if (t.touching) { t.touching = false; if (t.hover) { t.hover = false; t.onLeave(t); } } }
}

function createInteraction(entry) {
  const t = {
    position: new Vector2(), nPosition: new Vector2(),
    hover: false, touching: false,
    onEnter() {}, onMove() {}, onClick() {}, onLeave() {}, ...entry
  };
  interactionMap.set(entry.domElement, t);
  if (!interactionGlobalSetup) {
    document.body.addEventListener('pointermove', onPMove);
    document.body.addEventListener('pointerleave', onPLeave);
    document.body.addEventListener('click', onClick);
    document.body.addEventListener('touchstart', onTStart, { passive: false });
    document.body.addEventListener('touchmove', onTMove, { passive: false });
    document.body.addEventListener('touchend', onTEnd, { passive: false });
    document.body.addEventListener('touchcancel', onTEnd, { passive: false });
    interactionGlobalSetup = true;
  }
  t.dispose = () => {
    interactionMap.delete(entry.domElement);
    if (interactionMap.size === 0) {
      document.body.removeEventListener('pointermove', onPMove);
      document.body.removeEventListener('pointerleave', onPLeave);
      document.body.removeEventListener('click', onClick);
      document.body.removeEventListener('touchstart', onTStart);
      document.body.removeEventListener('touchmove', onTMove);
      document.body.removeEventListener('touchend', onTEnd);
      document.body.removeEventListener('touchcancel', onTEnd);
      interactionGlobalSetup = false;
    }
  };
  return t;
}

// ── Physics engine (class W in original) ──
const { randFloat, randFloatSpread } = MathUtils;
const _F = new Vector3(); // sphere 0 cached position
const _I = new Vector3(); // current sphere position
const _O = new Vector3(); // other sphere position
const _V = new Vector3(); // temp
const _B = new Vector3(); // current velocity
const _N = new Vector3(); // other velocity
const _D = new Vector3(); // diff
const _J = new Vector3(); // overlap dir
const _H = new Vector3(); // overlap push
const _T = new Vector3(); // overlap push other

class Physics {
  constructor(config) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.center = new Vector3();
    this.#init();
    this.setSizes();
  }
  #init() {
    const { config, positionData } = this;
    this.center.toArray(positionData, 0);
    for (let i = 1; i < config.count; i++) {
      const b = 3 * i;
      positionData[b] = randFloatSpread(2 * config.maxX);
      positionData[b + 1] = randFloatSpread(2 * config.maxY);
      positionData[b + 2] = randFloatSpread(2 * config.maxZ);
    }
  }
  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) sizeData[i] = randFloat(config.minSize, config.maxSize);
  }
  update(time) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let start = 0;
    // Control sphere 0: follow cursor
    if (config.controlSphere0) {
      start = 1;
      _F.fromArray(positionData, 0);
      _F.lerp(center, 0.1).toArray(positionData, 0);
      _V.set(0, 0, 0).toArray(velocityData, 0);
    }
    // Gravity + friction
    for (let i = start; i < config.count; i++) {
      const b = 3 * i;
      _I.fromArray(positionData, b);
      _B.fromArray(velocityData, b);
      _B.y -= time.delta * config.gravity * sizeData[i];
      _B.multiplyScalar(config.friction);
      _B.clampLength(0, config.maxVelocity);
      _I.add(_B);
      _I.toArray(positionData, b);
      _B.toArray(velocityData, b);
    }
    // Collisions
    for (let i = start; i < config.count; i++) {
      const b = 3 * i;
      _I.fromArray(positionData, b);
      _B.fromArray(velocityData, b);
      const radius = sizeData[i];
      // Ball-ball
      for (let j = i + 1; j < config.count; j++) {
        const ob = 3 * j;
        _O.fromArray(positionData, ob);
        _N.fromArray(velocityData, ob);
        const otherRadius = sizeData[j];
        _D.copy(_O).sub(_I);
        const dist = _D.length();
        const sumR = radius + otherRadius;
        if (dist < sumR) {
          const overlap = sumR - dist;
          _J.copy(_D).normalize().multiplyScalar(0.5 * overlap);
          _H.copy(_J).multiplyScalar(Math.max(_B.length(), 1));
          _T.copy(_J).multiplyScalar(Math.max(_N.length(), 1));
          _I.sub(_J); _B.sub(_H);
          _I.toArray(positionData, b); _B.toArray(velocityData, b);
          _O.add(_J); _N.add(_T);
          _O.toArray(positionData, ob); _N.toArray(velocityData, ob);
        }
      }
      // Sphere 0 collision
      if (config.controlSphere0) {
        _F.fromArray(positionData, 0);
        _D.copy(_F).sub(_I);
        const dist = _D.length();
        const sumR0 = radius + sizeData[0];
        if (dist < sumR0) {
          const diff = sumR0 - dist;
          _J.copy(_D.normalize()).multiplyScalar(diff);
          _H.copy(_J).multiplyScalar(Math.max(_B.length(), 2));
          _I.sub(_J); _B.sub(_H);
          _I.toArray(positionData, b); _B.toArray(velocityData, b);
        }
      }
      // Walls
      if (Math.abs(_I.x) + radius > config.maxX) {
        _I.x = Math.sign(_I.x) * (config.maxX - radius);
        _B.x = -_B.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(_I.y) + radius > config.maxY) {
          _I.y = Math.sign(_I.y) * (config.maxY - radius);
          _B.y = -_B.y * config.wallBounce;
        }
      } else if (_I.y - radius < -config.maxY) {
        _I.y = -config.maxY + radius;
        _B.y = -_B.y * config.wallBounce;
      }
      const maxB = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(_I.z) + radius > maxB) {
        _I.z = Math.sign(_I.z) * (config.maxZ - radius);
        _B.z = -_B.z * config.wallBounce;
      }
      _I.toArray(positionData, b);
      _B.toArray(velocityData, b);
    }
  }
}

// ── SubsurfaceMaterial (class Y in original) ──
// Injects RE_Direct_Scattering into MeshPhysicalMaterial for jade/candle translucency
class SubsurfaceMaterial extends MeshPhysicalMaterial {
  constructor(params) {
    super(params);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 }
    };
    this.defines.USE_UV = '';
    this.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.uniforms);

      // Step 1: Prepend uniform declarations
      shader.fragmentShader = `
        uniform float thicknessPower;
        uniform float thicknessScale;
        uniform float thicknessDistortion;
        uniform float thicknessAmbient;
        uniform float thicknessAttenuation;
      ` + shader.fragmentShader;

      // Step 2: Inject scattering function before main()
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `
        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          #ifdef USE_COLOR
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;
          #else
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;
          #endif
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }

        void main() {`
      );

      // Step 3: Modify lights_fragment_begin — add scattering call after each RE_Direct
      // Use regex for robustness against Three.js version whitespace differences
      const lightsChunk = ShaderChunk.lights_fragment_begin;
      const reDirectRegex = /RE_Direct\(\s*directLight\s*,\s*geometryPosition\s*,\s*geometryNormal\s*,\s*geometryViewDir\s*,\s*geometryClearcoatNormal\s*,\s*material\s*,\s*reflectedLight\s*\)\s*;/g;
      const modifiedChunk = lightsChunk.replace(reDirectRegex, (match) => {
        return match + '\n          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);';
      });
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', modifiedChunk);

      if (this.onBeforeCompile2) this.onBeforeCompile2(shader);
    };
  }
}

// ── Default config ──
const defaultConfig = {
  count: 200,
  colors: [0, 0, 0],
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: { metalness: 0.5, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.15 },
  minSize: 0.5, maxSize: 1, size0: 1,
  gravity: 0.5, friction: 0.9975, wallBounce: 0.95, maxVelocity: 0.15,
  maxX: 5, maxY: 5, maxZ: 2,
  controlSphere0: false, followCursor: true
};

const dummyObj = new Object3D();

// ── BallpitMesh (class Z in original) ──
class BallpitMesh extends InstancedMesh {
  constructor(renderer, config = {}) {
    const cfg = { ...defaultConfig, ...config };
    const pmrem = new PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envMap = pmrem.fromScene(roomEnv, 0.04).texture;
    const geom = new SphereGeometry();
    const mat = new SubsurfaceMaterial({ envMap, ...cfg.materialParams });
    mat.envMapRotation.x = -Math.PI / 2;
    super(geom, mat, cfg.count);
    this.config = cfg;
    this.physics = new Physics(cfg);
    this.#setupLights();
    this.setColors(cfg.colors);
    // Dispose PMREMGenerator after use
    pmrem.dispose();
  }
  #setupLights() {
    this.ambientLight = new AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    this.add(this.ambientLight);
    this.light = new PointLight(this.config.colors[0], this.config.lightIntensity);
    this.add(this.light);
  }
  setColors(colors) {
    if (Array.isArray(colors) && colors.length > 1) {
      const manager = (() => {
        let cols, instances;
        function set(c) { cols = c; instances = c.map(col => new Color(col)); }
        set(colors);
        return {
          setColors: set,
          getColorAt(ratio, out = new Color()) {
            const scaled = Math.max(0, Math.min(1, ratio)) * (cols.length - 1);
            const idx = Math.floor(scaled);
            const start = instances[idx];
            if (idx >= cols.length - 1) return start.clone();
            const alpha = scaled - idx;
            const end = instances[idx + 1];
            out.r = start.r + alpha * (end.r - start.r);
            out.g = start.g + alpha * (end.g - start.g);
            out.b = start.b + alpha * (end.b - start.b);
            return out;
          }
        };
      })();
      for (let i = 0; i < this.count; i++) {
        this.setColorAt(i, manager.getColorAt(i / this.count));
        if (i === 0) this.light.color.copy(manager.getColorAt(i / this.count));
      }
      this.instanceColor.needsUpdate = true;
    }
  }
  update(time) {
    this.physics.update(time);
    for (let i = 0; i < this.count; i++) {
      dummyObj.position.fromArray(this.physics.positionData, 3 * i);
      if (i === 0 && this.config.followCursor === false) {
        dummyObj.scale.setScalar(0);
      } else {
        dummyObj.scale.setScalar(this.physics.sizeData[i]);
      }
      dummyObj.updateMatrix();
      this.setMatrixAt(i, dummyObj.matrix);
      if (i === 0) this.light.position.copy(dummyObj.position);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

// ── createBallpit (vanilla factory) ──
export function createBallpit(canvas, config = {}) {
  const three = new ThreeCanvas({
    canvas,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true }
  });
  let spheres;
  three.renderer.toneMapping = ACESFilmicToneMapping;
  three.camera.position.set(0, 0, 20);
  three.camera.lookAt(0, 0, 0);
  three.cameraMaxAspect = 1.5;
  three.resize();

  initialize(config);

  const raycaster = new Raycaster();
  const intersectPlane = new Plane(new Vector3(0, 0, 1), 0);
  const intersectPoint = new Vector3();
  let paused = false;

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  canvas.style.webkitUserSelect = 'none';

  const interaction = createInteraction({
    domElement: canvas,
    onMove() {
      raycaster.setFromCamera(interaction.nPosition, three.camera);
      three.camera.getWorldDirection(intersectPlane.normal);
      raycaster.ray.intersectPlane(intersectPlane, intersectPoint);
      spheres.physics.center.copy(intersectPoint);
      spheres.config.controlSphere0 = true;
    },
    onLeave() {
      spheres.config.controlSphere0 = false;
    }
  });

  function initialize(cfg) {
    if (spheres) { three.clear(); three.scene.remove(spheres); }
    spheres = new BallpitMesh(three.renderer, cfg);
    three.scene.add(spheres);
  }

  three.onBeforeRender = (time) => { if (!paused) spheres.update(time); };
  three.onAfterResize = (size) => {
    if (spheres) {
      spheres.config.maxX = size.wWidth / 2;
      spheres.config.maxY = size.wHeight / 2;
    }
  };

  return {
    three,
    get spheres() { return spheres; },
    setCount(count) { initialize({ ...spheres.config, count }); },
    togglePause() { paused = !paused; },
    dispose() { interaction.dispose(); three.dispose(); }
  };
}
