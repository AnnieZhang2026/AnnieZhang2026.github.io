// Ballpit — vanilla JS port (original by Kevin Levron)
// Converted from React to vanilla for direct use

import {
  Vector3, MeshStandardMaterial, InstancedMesh, Clock,
  AmbientLight, SphereGeometry, Scene,
  Color, Object3D, SRGBColorSpace, MathUtils,
  Vector2, WebGLRenderer, PerspectiveCamera,
  PointLight, ACESFilmicToneMapping, Plane, Raycaster
} from 'three';

// ── ThreeCanvas ──
class ThreeCanvas {
  #e;
  canvas;
  camera;
  cameraMinAspect;
  cameraMaxAspect;
  cameraFov;
  maxPixelRatio;
  minPixelRatio;
  scene;
  renderer;
  #t;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.#i;
  onBeforeRender = () => {};
  onAfterRender = () => {};
  onAfterResize = () => {};
  #s = false;
  #n = false;
  isDisposed = false;
  #o;
  #r;
  #a;
  #c = new Clock();
  #h = { elapsed: 0, delta: 0 };
  #l;
  constructor(e) {
    this.#e = { ...e };
    this.#m();
    this.#d();
    this.#p();
    this.resize();
    this.#g();
  }
  #m() { this.camera = new PerspectiveCamera(); this.cameraFov = this.camera.fov; }
  #d() { this.scene = new Scene(); }
  #p() {
    if (this.#e.canvas) {
      this.canvas = this.#e.canvas;
    } else if (this.#e.id) {
      this.canvas = document.getElementById(this.#e.id);
    } else {
      console.error('ThreeCanvas: Missing canvas or id parameter');
    }
    this.canvas.style.display = 'block';
    const e = { canvas: this.canvas, powerPreference: 'high-performance', ...(this.#e.rendererOptions ?? {}) };
    this.renderer = new WebGLRenderer(e);
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
    this.#r?.disconnect();
    this.#o?.disconnect();
    document.removeEventListener('visibilitychange', this.#v.bind(this));
  }
  #u(e) { this.#s = e[0].isIntersecting; this.#s ? this.#w() : this.#z(); }
  #v() { if (this.#s) { document.hidden ? this.#z() : this.#w(); } }
  #f() { if (this.#a) clearTimeout(this.#a); this.#a = setTimeout(this.resize.bind(this), 100); }
  resize() {
    let e, t;
    if (this.#e.size instanceof Object) { e = this.#e.size.width; t = this.#e.size.height; }
    else if (this.#e.size === 'parent' && this.canvas.parentNode) { e = this.canvas.parentNode.offsetWidth; t = this.canvas.parentNode.offsetHeight; }
    else { e = window.innerWidth; t = window.innerHeight; }
    this.size.width = e; this.size.height = t; this.size.ratio = e / t;
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
    let e = window.devicePixelRatio;
    if (this.maxPixelRatio && e > this.maxPixelRatio) e = this.maxPixelRatio;
    else if (this.minPixelRatio && e < this.minPixelRatio) e = this.minPixelRatio;
    this.renderer.setPixelRatio(e);
    this.size.pixelRatio = e;
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
  #z() {
    if (this.#n) { cancelAnimationFrame(this.#l); this.#n = false; this.#c.stop(); }
  }
  #i() { this.renderer.render(this.scene, this.camera); }
  clear() {
    this.scene.traverse(e => {
      if (e.isMesh && typeof e.material === 'object' && e.material !== null) {
        Object.keys(e.material).forEach(t => {
          const i = e.material[t];
          if (i !== null && typeof i === 'object' && typeof i.dispose === 'function') i.dispose();
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

// ── Interaction ──
const interactionMap = new Map();
const mousePos = new Vector2();
let interactionSetup = false;

function D(rect) {
  const { x, y } = mousePos;
  const { left, top, width, height } = rect;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}
function P(entry) {
  const { position, nPosition } = entry;
  const rect = entry._rect;
  position.x = mousePos.x - rect.left;
  position.y = mousePos.y - rect.top;
  nPosition.x = (position.x / rect.width) * 2 - 1;
  nPosition.y = -(position.y / rect.height) * 2 + 1;
}

function onPointerMove(e) { mousePos.x = e.clientX; mousePos.y = e.clientY; processInteractions(); }
function processInteractions() {
  for (const [elem, t] of interactionMap) {
    const rect = elem.getBoundingClientRect();
    t._rect = rect;
    if (D(rect)) { P(t); if (!t.hover) { t.hover = true; t.onEnter(t); } t.onMove(t); }
    else if (t.hover && !t.touching) { t.hover = false; t.onLeave(t); }
  }
}
function onPointerClick(e) {
  mousePos.x = e.clientX; mousePos.y = e.clientY;
  for (const [elem, t] of interactionMap) {
    const rect = elem.getBoundingClientRect(); t._rect = rect; P(t);
    if (D(rect)) t.onClick(t);
  }
}
function onPointerLeaveGlobal() {
  for (const t of interactionMap.values()) { if (t.hover) { t.hover = false; t.onLeave(t); } }
}
function onTouchStart(e) {
  if (e.touches.length > 0) {
    mousePos.x = e.touches[0].clientX; mousePos.y = e.touches[0].clientY;
    let insideAny = false;
    for (const [elem, t] of interactionMap) {
      const rect = elem.getBoundingClientRect(); t._rect = rect;
      if (D(rect)) { insideAny = true; t.touching = true; P(t); if (!t.hover) { t.hover = true; t.onEnter(t); } t.onMove(t); }
    }
    if (insideAny) e.preventDefault();
  }
}
function onTouchMove(e) {
  if (e.touches.length > 0) {
    mousePos.x = e.touches[0].clientX; mousePos.y = e.touches[0].clientY;
    let insideAny = false;
    for (const [elem, t] of interactionMap) {
      const rect = elem.getBoundingClientRect(); t._rect = rect;
      if (D(rect)) { insideAny = true; if (!t.hover) { t.hover = true; t.touching = true; t.onEnter(t); } t.onMove(t); }
      else if (t.hover && t.touching) { t.onMove(t); }
    }
    if (insideAny) e.preventDefault();
  }
}
function onTouchEnd() {
  for (const [, t] of interactionMap) { if (t.touching) { t.touching = false; if (t.hover) { t.hover = false; t.onLeave(t); } } }
}

function createInteraction(e) {
  const entry = {
    position: new Vector2(), nPosition: new Vector2(),
    hover: false, touching: false, _rect: null,
    onEnter() {}, onMove() {}, onClick() {}, onLeave() {}, ...e
  };
  interactionMap.set(e.domElement, entry);
  if (!interactionSetup) {
    document.body.addEventListener('pointermove', onPointerMove);
    document.body.addEventListener('pointerleave', onPointerLeaveGlobal);
    document.body.addEventListener('click', onPointerClick);
    document.body.addEventListener('touchstart', onTouchStart, { passive: false });
    document.body.addEventListener('touchmove', onTouchMove, { passive: false });
    document.body.addEventListener('touchend', onTouchEnd, { passive: false });
    document.body.addEventListener('touchcancel', onTouchEnd, { passive: false });
    interactionSetup = true;
  }
  entry.dispose = () => {
    interactionMap.delete(e.domElement);
    if (interactionMap.size === 0) {
      document.body.removeEventListener('pointermove', onPointerMove);
      document.body.removeEventListener('pointerleave', onPointerLeaveGlobal);
      document.body.removeEventListener('click', onPointerClick);
      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);
      interactionSetup = false;
    }
  };
  return entry;
}

// ── Physics ──
const { randFloat, randFloatSpread } = MathUtils;
const _vA = new Vector3(), _vB = new Vector3(), _vC = new Vector3();
const _vD = new Vector3(), _vE = new Vector3(), _vN = new Vector3();
const _vJ = new Vector3(), _vH = new Vector3(), _vT = new Vector3();

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
      const base = 3 * i;
      positionData[base] = randFloatSpread(2 * config.maxX);
      positionData[base + 1] = randFloatSpread(2 * config.maxY);
      positionData[base + 2] = randFloatSpread(2 * config.maxZ);
    }
  }
  setSizes() {
    const { config, sizeData } = this;
    sizeData[0] = config.size0;
    for (let i = 1; i < config.count; i++) sizeData[i] = randFloat(config.minSize, config.maxSize);
  }
  update(dt) {
    const { config, center, positionData, sizeData, velocityData } = this;
    let startIdx = 0;
    if (config.controlSphere0) {
      startIdx = 1;
      _vA.fromArray(positionData, 0);
      _vA.lerp(center, 0.1).toArray(positionData, 0);
      _vD.set(0, 0, 0).toArray(velocityData, 0);
    }
    for (let idx = startIdx; idx < config.count; idx++) {
      const base = 3 * idx;
      _vA.fromArray(positionData, base);
      _vE.fromArray(velocityData, base);
      _vE.y -= dt * config.gravity * sizeData[idx];
      _vE.multiplyScalar(config.friction);
      _vE.clampLength(0, config.maxVelocity);
      _vA.add(_vE);
      _vA.toArray(positionData, base);
      _vE.toArray(velocityData, base);
    }
    for (let idx = startIdx; idx < config.count; idx++) {
      const base = 3 * idx;
      _vA.fromArray(positionData, base);
      _vE.fromArray(velocityData, base);
      const radius = sizeData[idx];
      for (let jdx = idx + 1; jdx < config.count; jdx++) {
        const otherBase = 3 * jdx;
        _vC.fromArray(positionData, otherBase);
        _vN.fromArray(velocityData, otherBase);
        const otherRadius = sizeData[jdx];
        _vJ.copy(_vC).sub(_vA);
        const dist = _vJ.length();
        const sumRadius = radius + otherRadius;
        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          _vH.copy(_vJ).normalize().multiplyScalar(0.5 * overlap);
          _vT.copy(_vH).multiplyScalar(Math.max(_vE.length(), 1));
          _vA.sub(_vH);
          _vE.sub(_vH);
          _vC.add(_vH);
          _vN.add(_vT);
          _vC.toArray(positionData, otherBase);
          _vN.toArray(velocityData, otherBase);
        }
      }
      if (config.controlSphere0) {
        _vJ.fromArray(positionData, 0).sub(_vA);
        const dist0 = _vJ.length();
        const sumRadius0 = radius + sizeData[0];
        if (dist0 < sumRadius0) {
          const diff0 = sumRadius0 - dist0;
          _vH.copy(_vJ.normalize()).multiplyScalar(diff0);
          _vA.sub(_vH);
          _vE.sub(_vH);
        }
      }
      if (Math.abs(_vA.x) + radius > config.maxX) {
        _vA.x = Math.sign(_vA.x) * (config.maxX - radius);
        _vE.x = -_vE.x * config.wallBounce;
      }
      if (config.gravity === 0) {
        if (Math.abs(_vA.y) + radius > config.maxY) {
          _vA.y = Math.sign(_vA.y) * (config.maxY - radius);
          _vE.y = -_vE.y * config.wallBounce;
        }
      } else if (_vA.y - radius < -config.maxY) {
        _vA.y = -config.maxY + radius;
        _vE.y = -_vE.y * config.wallBounce;
      }
      const maxBoundary = Math.max(config.maxZ, config.maxSize);
      if (Math.abs(_vA.z) + radius > maxBoundary) {
        _vA.z = Math.sign(_vA.z) * (config.maxZ - radius);
        _vE.z = -_vE.z * config.wallBounce;
      }
      _vA.toArray(positionData, base);
      _vE.toArray(velocityData, base);
    }
  }
}

// ── Default config ──
const defaultConfig = {
  count: 200,
  colors: [0, 0, 0],
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: { metalness: 0.1, roughness: 0.5 },
  minSize: 0.5, maxSize: 1, size0: 1,
  gravity: 0.5, friction: 0.9975, wallBounce: 0.95, maxVelocity: 0.15,
  maxX: 5, maxY: 5, maxZ: 2,
  controlSphere0: false, followCursor: true
};

const dummyObj = new Object3D();

// ── BallpitMesh ──
class BallpitMesh extends InstancedMesh {
  constructor(renderer, config = {}) {
    const cfg = { ...defaultConfig, ...config };
    const geom = new SphereGeometry();
    const mat = new MeshStandardMaterial(cfg.materialParams);
    super(geom, mat, cfg.count);
    this.config = cfg;
    this.physics = new Physics(cfg);
    this.#setupLights();
    this.setColors(cfg.colors);
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
        let cols, inst;
        function set(c) { cols = c; inst = c.map(col => new Color(col)); }
        set(colors);
        return {
          setColors: set,
          getColorAt(ratio, out = new Color()) {
            const scaled = Math.max(0, Math.min(1, ratio)) * (cols.length - 1);
            const idx = Math.floor(scaled);
            const start = inst[idx];
            if (idx >= cols.length - 1) return start.clone();
            const alpha = scaled - idx;
            const end = inst[idx + 1];
            out.r = start.r + alpha * (end.r - start.r);
            out.g = start.g + alpha * (end.g - start.g);
            out.b = start.b + alpha * (end.b - start.b);
            return out;
          }
        };
      })();
      for (let idx = 0; idx < this.count; idx++) {
        this.setColorAt(idx, manager.getColorAt(idx / this.count));
        if (idx === 0) this.light.color.copy(manager.getColorAt(idx / this.count));
      }
      this.instanceColor.needsUpdate = true;
    }
  }
  update(dt) {
    this.physics.update(dt);
    for (let idx = 0; idx < this.count; idx++) {
      dummyObj.position.fromArray(this.physics.positionData, 3 * idx);
      if (idx === 0 && this.config.followCursor === false) {
        dummyObj.scale.setScalar(0);
      } else {
        dummyObj.scale.setScalar(this.physics.sizeData[idx]);
      }
      dummyObj.updateMatrix();
      this.setMatrixAt(idx, dummyObj.matrix);
      if (idx === 0) this.light.position.copy(dummyObj.position);
    }
    this.instanceMatrix.needsUpdate = true;
  }
}

// ── createBallpit (vanilla) ──
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
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const intersectPoint = new Vector3();
  let paused = false;

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  canvas.style.webkitUserSelect = 'none';

  const interaction = createInteraction({
    domElement: canvas,
    onMove() {
      raycaster.setFromCamera(interaction.nPosition, three.camera);
      three.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersectPoint);
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

  three.onBeforeRender = (time) => { if (!paused) spheres.update(time.delta); };
  three.onAfterResize = (size) => {
    spheres.config.maxX = size.wWidth / 2;
    spheres.config.maxY = size.wHeight / 2;
  };

  return {
    three,
    get spheres() { return spheres; },
    setCount(count) { initialize({ ...spheres.config, count }); },
    togglePause() { paused = !paused; },
    dispose() { interaction.dispose(); three.dispose(); }
  };
}
