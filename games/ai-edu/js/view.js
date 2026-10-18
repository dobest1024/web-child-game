// 3D 魔方渲染：拖动旋转视角、点选小块、转层动画、高亮提示
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { Cube } from './cube.js';

const PALETTE = { Y: 0xffd500, W: 0xffffff, G: 0x00b050, B: 0x1e6bff, O: 0xff7a00, R: 0xe8283c };
const AXES = ['x', 'y', 'z'];
const DEFAULT_THETA = 0.6;
const DEFAULT_PHI = 0.95;
const GLOW = new THREE.Color(0xffffff);
const WRONG = new THREE.Color(0xff2a2a);

function roundedRect(size, r) {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
  return s;
}

export class CubeView {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc8d0dc, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(4, 8, 6);
    const fill = new THREE.DirectionalLight(0xffffff, 1.1);
    fill.position.set(-3, -8, 4);
    this.scene.add(sun, fill);

    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.scene.add(this.root);
    this.root.add(this.pivot);
    this._build();

    this.mirror = new Cube();
    this._sync();

    this.theta = DEFAULT_THETA;
    this.phi = DEFAULT_PHI;
    this.dist = 10;
    this.queue = [];
    this.anim = null;
    this.highlightFace = null;
    this.marks = new Set();
    this.effects = new Map();
    this.tween = null;
    this.onPick = null;
    this.active = true;
    this.raycaster = new THREE.Raycaster();

    this._bindPointer();
    new ResizeObserver(() => this._resize()).observe(container);
    this._resize();
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _build() {
    const bodyGeo = new RoundedBoxGeometry(0.96, 0.96, 0.96, 3, 0.1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c1d26, roughness: 0.55 });
    const stickerGeo = new THREE.ShapeGeometry(roundedRect(0.8, 0.14));
    this.groups = [];
    for (const c of new Cube().cubies) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bodyGeo, bodyMat));
      g.userData = { id: c.id, mats: [] };
      for (const s of c.stickers) {
        const mat = new THREE.MeshStandardMaterial({ color: PALETTE[s.c], roughness: 0.35, emissive: 0x000000 });
        const mesh = new THREE.Mesh(stickerGeo, mat);
        const [x, y, z] = s.n;
        mesh.position.set(x * 0.485, y * 0.485, z * 0.485);
        if (x) mesh.rotation.y = (x * Math.PI) / 2;
        if (y) mesh.rotation.x = (-y * Math.PI) / 2;
        if (z < 0) mesh.rotation.y = Math.PI;
        g.add(mesh);
        g.userData.mats.push(mat);
      }
      this.groups[c.id] = g;
      this.root.add(g);
    }
  }

  _sync() {
    const m4 = new THREE.Matrix4();
    for (const c of this.mirror.cubies) {
      const g = this.groups[c.id];
      const m = c.m;
      m4.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
      g.position.set(...c.pos);
      g.quaternion.setFromRotationMatrix(m4);
    }
  }

  _resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const v = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(v / 2) * this.camera.aspect);
    this.dist = 2.9 / Math.sin(Math.min(v, hfov) / 2);
    this.camera.updateProjectionMatrix();
  }

  _bindPointer() {
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    let down = null;
    el.addEventListener('pointerdown', e => {
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!down) return;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
      if (down.moved) {
        this.tween = null;
        this.theta -= (e.clientX - down.lx) * 0.009;
        this.phi = THREE.MathUtils.clamp(this.phi - (e.clientY - down.ly) * 0.009, 0.3, 2.7);
      }
      down.lx = e.clientX;
      down.ly = e.clientY;
    });
    el.addEventListener('pointerup', e => {
      if (down && !down.moved) this._pick(e);
      down = null;
    });
    el.addEventListener('pointercancel', () => { down = null; });
  }

  _pick(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.groups, true)[0];
    let o = hit && hit.object;
    while (o && o.userData.id === undefined) o = o.parent;
    if (o) this.onPick?.(o.userData.id);
  }

  // ---- 对外接口 ----
  setActive(v) { this.active = v; }

  setState(cube) {
    const pending = this.queue.splice(0);
    if (this.anim) this._endAnim(false);
    this.mirror = cube.clone();
    this._sync();
    pending.forEach(p => p.resolve());
  }

  enqueue(move) {
    return new Promise(resolve => { this.queue.push({ move, resolve }); this._next(); });
  }

  highlight(face) { this.highlightFace = face; }
  mark(id) { this.marks.add(id); this.effects.set(id, { kind: 'pop', start: performance.now() }); }
  clearMarks() { this.marks.clear(); }
  flash(id) { this.effects.set(id, { kind: 'wrong', start: performance.now() }); }
  resetView() { this.lookAt(DEFAULT_THETA, DEFAULT_PHI); }
  // 平滑转到某个视角（比如完成白十字后看底部）
  lookAt(theta, phi) { this.tween = { theta, phi }; }

  // ---- 动画 ----
  _next() {
    if (this.anim || !this.queue.length) return;
    const { move, resolve } = this.queue.shift();
    const info = Cube.turnInfo(move);
    const { axis, q } = info;
    if (!q) { resolve(); this._next(); return; }
    const groups = this.mirror.cubies.filter(c => Cube.inTurn(c, info)).map(c => this.groups[c.id]);
    groups.forEach(g => this.pivot.attach(g));
    const base = q === 2 ? 440 : 280;
    this.anim = {
      move, resolve, groups, axis,
      angle: ((q === 3 ? -1 : q) * Math.PI) / 2,
      start: performance.now(),
      dur: this.queue.length ? base * 0.55 : base,
    };
  }

  _endAnim(apply) {
    const a = this.anim;
    this.anim = null;
    a.groups.forEach(g => this.root.attach(g));
    this.pivot.rotation.set(0, 0, 0);
    if (apply) this.mirror.move(a.move);
    this._sync();
    a.resolve();
    if (apply) this._next();
  }

  _layerIds(face) {
    const info = Cube.turnInfo(face);
    return new Set(this.mirror.cubies.filter(c => Cube.inTurn(c, info)).map(c => c.id));
  }

  _tick() {
    if (!this.active) return;
    const now = performance.now();
    if (this.anim) {
      const a = this.anim;
      const p = Math.min(1, (now - a.start) / a.dur);
      this.pivot.rotation.set(0, 0, 0);
      this.pivot.rotation[AXES[a.axis]] = a.angle * (1 - Math.pow(1 - p, 3));
      if (p >= 1) this._endAnim(true);
    }

    const t = now / 1000;
    const layer = this.highlightFace && !this.anim ? this._layerIds(this.highlightFace) : null;
    for (const g of this.groups) {
      const id = g.userData.id;
      let glow = this.marks.has(id) ? 0.4 : 0;
      let tint = GLOW;
      let scale = 1;
      if (layer?.has(id)) glow = Math.max(glow, 0.22 + 0.22 * Math.sin(t * 7));
      const fx = this.effects.get(id);
      if (fx) {
        const p = (now - fx.start) / 500;
        if (p >= 1) this.effects.delete(id);
        else if (fx.kind === 'pop') scale = 1 + 0.22 * Math.sin(Math.PI * p);
        else { tint = WRONG; glow = 0.7 * (1 - p); }
      }
      g.scale.setScalar(scale);
      for (const m of g.userData.mats) { m.emissive.copy(tint); m.emissiveIntensity = glow; }
    }

    if (this.tween) {
      this.theta += (this.tween.theta - this.theta) * 0.12;
      this.phi += (this.tween.phi - this.phi) * 0.12;
      if (Math.abs(this.tween.theta - this.theta) + Math.abs(this.tween.phi - this.phi) < 0.002) this.tween = null;
    }
    const sp = Math.sin(this.phi);
    this.camera.position.set(this.dist * sp * Math.sin(this.theta), this.dist * Math.cos(this.phi), this.dist * sp * Math.cos(this.theta));
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
