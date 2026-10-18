import * as THREE from "three";
import { mergeGeometries } from "/vendor/BufferGeometryUtils.js";
import { CARDS } from "../shared/cards.js";

const COLORS = {
  blue: 0x5a92bd,
  red: 0xc06c58,
  stone: 0xddd4ac,
  dark: 0x6e8270,
  gold: 0xe9c879,
};
const mats = new Map();
function material(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`;
  if (!mats.has(key))
    mats.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options }),
    );
  return mats.get(key);
}
function mesh(geometry, color, parent, position = [0, 0, 0], options) {
  const obj = new THREE.Mesh(geometry, material(color, options));
  obj.position.set(...position);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}
const box = (p, x, y, z, w, h, d, color) =>
  mesh(new THREE.BoxGeometry(w, h, d), color, p, [x, y, z]);
const ball = (p, x, y, z, r, color, detail = 1) =>
  mesh(new THREE.IcosahedronGeometry(r, detail), color, p, [x, y, z]);
const cylinder = (p, x, y, z, top, bottom, h, color, sides = 8) =>
  mesh(new THREE.CylinderGeometry(top, bottom, h, sides), color, p, [x, y, z]);
function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isSprite) {
      o.material.map?.dispose();
      o.material.dispose();
    }
  });
  group.removeFromParent();
}
function healthBar() {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 46;
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    }),
  );
  sprite.scale.set(1.8, 0.52, 1);
  sprite.renderOrder = 10;
  sprite.userData.canvas = canvas;
  return sprite;
}
function updateHealth(sprite, hp, max, team, label = false) {
  if (sprite.userData.hp === hp) return;
  sprite.userData.hp = hp;
  const ctx = sprite.userData.canvas.getContext("2d");
  ctx.clearRect(0, 0, 160, 46);
  ctx.fillStyle = "#173329dd";
  ctx.beginPath();
  ctx.roundRect(7, 24, 146, 13, 6);
  ctx.fill();
  ctx.fillStyle = team === 0 ? "#95c3e4" : "#e9aa8e";
  ctx.beginPath();
  ctx.roundRect(10, 27, Math.max(0, (140 * hp) / max), 7, 3);
  ctx.fill();
  if (label) {
    ctx.font = "600 21px system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff3d2";
    ctx.strokeStyle = "#233a2e";
    ctx.lineWidth = 4;
    ctx.strokeText(Math.ceil(hp), 80, 20);
    ctx.fillText(Math.ceil(hp), 80, 20);
  }
  sprite.material.map.needsUpdate = true;
}
export class ArenaScene {
  constructor(element, onDeploy) {
    this.element = element;
    this.onDeploy = onDeploy;
    this.team = 0;
    this.state = null;
    this.selected = null;
    this.objects = new Map();
    this.towerObjects = new Map();
    this.particles = [];
    this.seenEvents = new Set();
    this.ripples = [];
    this.flags = [];
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x4a7153);
    this.camera = new THREE.OrthographicCamera(-10, 10, 11, -11, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    element.prepend(this.renderer.domElement);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "三维战场，选卡后点击己方半场部署",
    );
    this.scene.add(new THREE.HemisphereLight(0xe5f3db, 0x66805b, 1.8));
    const sun = new THREE.DirectionalLight(0xffedc7, 2.4);
    sun.position.set(-10, 25, 13);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -16,
      right: 16,
      top: 18,
      bottom: -18,
      far: 65,
    });
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.buildArena();
    this.mergeScenery();
    this.marker = mesh(
      new THREE.RingGeometry(0.8, 0.87, 48),
      0xe9d494,
      this.scene,
      [0, 0.9, 0],
      { transparent: true, opacity: 0.8, depthWrite: false },
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    this.markerFill = mesh(
      new THREE.CircleGeometry(0.8, 48),
      0xe9d494,
      this.scene,
      [0, 0.88, 0],
      { transparent: true, opacity: 0.16, depthWrite: false },
    );
    this.markerFill.rotation.x = -Math.PI / 2;
    this.markerFill.visible = false;
    this.zone = mesh(
      new THREE.PlaneGeometry(13.2, 9.2),
      0x80bde2,
      this.scene,
      [0, 0.8, 6],
      { transparent: true, opacity: 0.075, depthWrite: false },
    );
    this.zone.rotation.x = -Math.PI / 2;
    this.zone.visible = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.75);
    element.addEventListener("pointermove", (e) => this.point(e));
    element.addEventListener("pointerleave", () => {
      this.marker.visible = this.markerFill.visible = false;
    });
    element.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const hit = this.point(e);
      if (hit && this.selected) {
        e.preventDefault();
        this.onDeploy(hit.x, hit.z);
      }
    });
    new ResizeObserver(() => this.resize()).observe(element);
    this.resize();
    this.setTeam(0);
    this.last = performance.now();
    this.renderer.setAnimationLoop((now) => this.render(now));
  }
  buildArena() {
    const w = this.world;
    box(w, 0, -0.3, 0, 18.6, 1.4, 25, 0x50694b);
    box(w, 0, 0.28, 0, 17.5, 0.7, 24, 0x78895b);
    box(w, 0, 0.6, 0, 14.5, 0.3, 22.5, 0x8ba56e);
    for (let x = -6; x <= 6; x += 2)
      for (let z = -10; z <= 10; z += 2) {
        if (Math.abs(z) < 1) continue;
        const c = ((x + z) / 2) % 2 ? 0x8da875 : 0x96ae7a;
        box(w, x, 0.77, z, 1.985, 0.045, 1.985, c);
      }
    for (const x of [-3.8, 3.8])
      for (let z = -9.7; z <= 10; z += 1.3)
        if (Math.abs(z) > 1.3) box(w, x, 0.81, z, 1.35, 0.025, 1.2, 0xb1b18a);
    box(w, 0, 0.79, 0, 18, 0.06, 2.4, 0x3b9396);
    box(w, 0, 0.83, 0, 17.6, 0.025, 1.8, 0x58aca5);
    for (const z of [-1.3, 1.3]) box(w, 0, 0.68, z, 14.5, 0.3, 0.25, 0xb0b590);
    for (let i = 0; i < 17; i++) {
      const r = box(
        w,
        -8 + i,
        0.85,
        ((i % 3) - 1) * 0.5,
        0.35 + (i % 4) * 0.15,
        0.018,
        0.04,
        0xafe3cd,
      );
      r.userData.baseX = r.position.x;
      this.ripples.push(r);
    }
    for (const x of [-3.8, 3.8]) {
      box(w, x, 0.75, 0, 2.1, 0.25, 3.4, 0x8c7a52);
      for (let z = -1.5; z <= 1.5; z += 0.3)
        box(w, x, 0.93, z, 1.85, 0.13, 0.25, 0xc8ae78);
      for (const side of [-1, 1]) {
        box(w, x + side, 1.18, 0, 0.14, 0.14, 3.5, 0xbcb28c);
        for (const z of [-1.6, 1.6]) {
          box(w, x + side, 1.12, z, 0.3, 0.85, 0.3, COLORS.stone);
          ball(w, x + side, 1.6, z, 0.21, 0xe2d3a8);
        }
      }
    }
    for (const x of [-7.5, 7.5])
      for (let z = -10.5; z <= 11; z += 1.25)
        box(w, x, 0.85, z, 0.42, 0.42, 1.15, 0xb1b297);
    for (const z of [-11.4, 11.4])
      for (let x = -7; x <= 7; x += 1.25)
        box(w, x, 0.85, z, 1.15, 0.42, 0.42, 0xb1b297);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const x = side * (8.5 + (i % 2) * 0.65),
          z = -10 + i * 2.8;
        this.tree(x, z, 0.8 + (i % 3) * 0.2);
        if (i % 2 === 0) {
          const rock = ball(w, x + side * 0.7, 0.6, z + 1.3, 0.65, 0x909c7f);
          rock.scale.set(1.3, 0.8, 1);
        }
      }
      for (let i = 0; i < 9; i++) {
        const x = side * (6.3 + Math.sin(i) * 0.3),
          z = -9.6 + i * 2.35;
        if (Math.abs(z) < 2) continue;
        ball(w, x, 0.9, z, 0.22, 0x6a9559);
        ball(w, x + 0.23, 0.85, z + 0.1, 0.16, 0xbec286);
      }
      for (const z of [-5.5, 5.5]) {
        cylinder(w, side * 7, 1.5, z, 0.06, 0.07, 1.6, 0x5d6149);
        const flag = box(
          w,
          side * 7 + 0.35,
          2.12,
          z,
          0.65,
          0.65,
          0.04,
          z > 0 ? COLORS.blue : COLORS.red,
        );
        this.flags.push(flag);
        ball(w, side * 7, 2.4, z, 0.12, COLORS.gold);
      }
    }
    // Inlaid central arena crest.
    for (const z of [-4, 4]) {
      const medallion = cylinder(w, 0, 0.81, z, 0.85, 0.85, 0.025, 0xb0b38a, 6);
      medallion.rotation.y = Math.PI / 6;
      const diamond = box(w, 0, 0.84, z, 0.5, 0.025, 0.5, 0xd3cba0);
      diamond.rotation.y = Math.PI / 4;
    }
  }
  tree(x, z, scale) {
    const g = new THREE.Group();
    g.position.set(x, 0.7, z);
    g.scale.setScalar(scale);
    this.world.add(g);
    cylinder(g, 0, 0.6, 0, 0.12, 0.22, 1.2, 0x7a7151, 6);
    ball(g, 0, 1.7, 0, 0.85, 0x618753);
    ball(g, -0.35, 1.3, 0.2, 0.6, 0x75955d);
    ball(g, 0.25, 2.05, 0, 0.55, 0x87a365);
  }
  mergeScenery() {
    this.world.updateMatrixWorld(true);
    const groups = new Map(),
      originals = [];
    this.world.traverse((obj) => {
      if (!obj.isMesh || this.flags.includes(obj) || this.ripples.includes(obj))
        return;
      const geometry = obj.geometry.index
        ? obj.geometry.toNonIndexed()
        : obj.geometry.clone();
      geometry.applyMatrix4(obj.matrixWorld);
      if (!groups.has(obj.material)) groups.set(obj.material, []);
      groups.get(obj.material).push(geometry);
      originals.push(obj);
    });
    for (const obj of originals) {
      obj.geometry.dispose();
      obj.removeFromParent();
    }
    for (const [mat, geometries] of groups) {
      const combined = new THREE.Mesh(mergeGeometries(geometries), mat);
      combined.castShadow = combined.receiveShadow = true;
      this.world.add(combined);
      geometries.forEach((g) => g.dispose());
    }
  }
  tower(data) {
    const g = new THREE.Group();
    this.scene.add(g);
    g.position.set(data.x, 0.83, data.z);
    const color = data.team === 0 ? COLORS.blue : COLORS.red;
    const size = data.king ? 1.2 : 0.9;
    box(g, 0, 0.1, 0, size * 2.05, 0.3, size * 1.85, 0x8f977b);
    box(g, 0, 0.8, 0, size * 1.7, 1.35, size * 1.5, COLORS.stone);
    box(g, 0, 0.35, 0, size * 1.85, 0.23, size * 1.65, 0xc5bb97);
    box(g, 0, 1.5, 0, size * 1.95, 0.28, size * 1.75, 0xf0dfae);
    for (const x of [-0.7, 0.7])
      for (const z of [-0.62, 0.62])
        box(g, x * size, 1.79, z * size, 0.37, 0.45, 0.36, COLORS.stone);
    for (const face of [-1, 1]) {
      box(g, 0, 0.9, face * size * 0.76, 0.34, 0.55, 0.03, 0x5c6b60);
      box(g, face * size * 0.86, 1.07, 0, 0.025, 0.5, 0.43, color);
      const crest = ball(g, face * size * 0.89, 1.13, 0, 0.11, COLORS.gold);
      crest.scale.set(0.3, 1, 1);
    }
    if (data.king) {
      box(g, 0, 1.95, 0, 0.95, 0.75, 0.85, color);
      const roof = mesh(
        new THREE.ConeGeometry(0.95, 0.75, 4),
        color,
        g,
        [0, 2.7, 0],
      );
      roof.rotation.y = Math.PI / 4;
      cylinder(g, 0, 3.05, 0, 0.035, 0.04, 0.7, 0xe9d9aa);
      const flag = box(g, 0.27, 3.25, 0, 0.48, 0.3, 0.04, color);
      this.flags.push(flag);
      for (const x of [-0.24, 0, 0.24])
        box(g, x, 2.2, 0.46, 0.13, x === 0 ? 0.35 : 0.23, 0.04, COLORS.gold);
    } else {
      cylinder(g, 0, 1.9, 0, 0.24, 0.3, 0.4, 0x655e4e);
      const barrel = cylinder(
        g,
        0,
        2.12,
        data.team === 0 ? -0.3 : 0.3,
        0.14,
        0.18,
        0.85,
        0x5a6562,
      );
      barrel.rotation.x = Math.PI / 2;
    }
    const bar = healthBar();
    bar.position.y = data.king ? 3.9 : 2.7;
    g.add(bar);
    g.userData.bar = bar;
    this.towerObjects.set(data.id, g);
    return g;
  }
  unit(data) {
    const card = CARDS[data.card],
      g = new THREE.Group();
    this.scene.add(g);
    const tint = data.team === 0 ? COLORS.blue : COLORS.red;
    const body = new THREE.Group();
    g.add(body);
    g.userData.body = body;
    const size =
      data.card === "giant" ? 1.1 : data.card === "goblins" ? 0.48 : 0.65;
    body.scale.setScalar(size);
    if (card.flying) {
      const green = 0x7cba90;
      ball(body, 0, 0.5, 0, 0.45, green);
      ball(body, 0, 0.82, 0.45, 0.38, 0x9ac69c);
      ball(body, 0, 0.69, 0.75, 0.25, 0xc8d4a6);
      ball(body, -0.2, 0.93, 0.65, 0.055, 0x273f32);
      ball(body, 0.2, 0.93, 0.65, 0.055, 0x273f32);
      for (const side of [-1, 1]) {
        const wing = mesh(
          new THREE.ConeGeometry(0.65, 1.2, 3),
          0x65a58d,
          body,
          [side * 0.65, 0.7, -0.05],
        );
        wing.rotation.z = side * 1.2;
        wing.rotation.x = 0.5;
        (g.userData.wings ||= []).push(wing);
      }
      const tail = mesh(
        new THREE.ConeGeometry(0.2, 0.9, 5),
        green,
        body,
        [0, 0.4, -0.65],
      );
      tail.rotation.x = -Math.PI / 2;
      box(body, 0, 0.88, -0.14, 0.4, 0.15, 0.4, tint);
    } else {
      const skin =
        data.card === "goblins"
          ? 0xa7c77d
          : data.card === "bomber"
            ? 0xe2d7ae
            : 0xdfb98c;
      const shirt =
        data.card === "giant"
          ? 0xac8a5b
          : data.card === "archers"
            ? 0xa77e9e
            : data.card === "bomber"
              ? 0x737d88
              : tint;
      cylinder(body, 0, 0.65, 0, 0.28, 0.35, 0.7, shirt);
      ball(body, 0, 1.2, 0, 0.31, skin);
      for (const side of [-1, 1]) {
        const leg = box(body, side * 0.16, 0.16, 0, 0.19, 0.35, 0.22, 0x5c6152);
        (g.userData.legs ||= []).push(leg);
        const arm = box(body, side * 0.38, 0.65, 0.02, 0.18, 0.48, 0.2, skin);
        arm.rotation.z = side * 0.2;
        ball(body, side * 0.115, 1.25, 0.265, 0.035, 0x29372b);
      }
      box(body, 0, 0.65, 0.3, 0.37, 0.35, 0.045, tint);
      if (data.card === "knight") {
        mesh(
          new THREE.SphereGeometry(0.33, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
          0xbacbd0,
          body,
          [0, 1.2, 0],
        );
        box(body, 0, 1.5, -0.03, 0.09, 0.2, 0.3, tint);
        box(body, 0.45, 0.9, 0.28, 0.1, 0.9, 0.08, 0xe1e6df);
        box(body, 0.45, 0.6, 0.28, 0.35, 0.07, 0.1, COLORS.gold);
        const shield = cylinder(body, -0.44, 0.7, 0.18, 0.3, 0.3, 0.1, tint, 6);
        shield.rotation.x = Math.PI / 2;
      } else if (data.card === "archers") {
        ball(body, 0, 1.34, -0.12, 0.31, 0xbc8bac);
        const bow = mesh(
          new THREE.TorusGeometry(0.38, 0.035, 4, 10, Math.PI),
          0xe1c290,
          body,
          [0.43, 0.8, 0.22],
        );
        bow.rotation.z = -Math.PI / 2;
      } else if (data.card === "bomber") {
        ball(body, 0.42, 0.75, 0.3, 0.25, 0x353f46);
        box(body, 0.43, 1.03, 0.3, 0.04, 0.15, 0.04, 0xf8cf8b);
      } else if (data.card === "goblins") {
        for (const side of [-1, 1]) {
          const ear = mesh(new THREE.ConeGeometry(0.14, 0.4, 3), skin, body, [
            side * 0.37,
            1.23,
            0,
          ]);
          ear.rotation.z = side * -1.2;
        }
        box(body, 0.43, 0.8, 0.2, 0.08, 0.5, 0.07, 0xdde5da);
      } else {
        ball(body, 0, 1.37, -0.05, 0.3, 0xa57443);
        box(body, 0, 0.45, 0, 0.65, 0.13, 0.64, tint);
      }
    }
    const ring = mesh(
      new THREE.RingGeometry(size * 0.4, size * 0.51, 20),
      tint,
      g,
      [0, 0.03, 0],
      { transparent: true, opacity: 0.8 },
    );
    ring.rotation.x = -Math.PI / 2;
    const bar = healthBar();
    bar.scale.set(1, 0.3, 1);
    bar.position.y = card.flying ? 2.75 : size * 1.9;
    g.add(bar);
    g.userData.bar = bar;
    g.position.set(data.x, 0.86, data.z);
    this.objects.set(data.id, g);
    return g;
  }
  setTeam(team) {
    this.team = team;
    const sign = team === 0 ? 1 : -1;
    this.camera.position.set(0, 30, 22 * sign);
    this.camera.lookAt(0, 0, 0);
    this.zone.position.z = sign * 6;
    this.zone.material = material(team === 0 ? 0x80bde2 : 0xe6a18a, {
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
    });
  }
  reset() {
    for (const g of this.objects.values()) disposeGroup(g);
    for (const g of this.towerObjects.values()) disposeGroup(g);
    for (const p of this.particles) disposeGroup(p.mesh);
    this.objects.clear();
    this.towerObjects.clear();
    this.seenEvents.clear();
    this.particles = [];
    this.state = null;
    this.flags = this.flags.filter((f) => f.parent === this.world);
  }
  update(state) {
    this.state = state;
    const live = new Set(state.units.map((u) => u.id));
    for (const [id, group] of this.objects)
      if (!live.has(id)) {
        disposeGroup(group);
        this.objects.delete(id);
      }
    for (const t of state.towers) {
      const g = this.towerObjects.get(t.id) || this.tower(t);
      g.visible = t.hp > 0;
      updateHealth(g.userData.bar, t.hp, t.maxHp, t.team, true);
    }
    for (const u of state.units) {
      const g = this.objects.get(u.id) || this.unit(u);
      g.userData.target = u;
      updateHealth(g.userData.bar, u.hp, CARDS[u.card].hp, u.team);
    }
    for (const e of state.effects)
      if (!this.seenEvents.has(e.id)) {
        this.seenEvents.add(e.id);
        this.effect(e);
      }
    if (this.seenEvents.size > 600) {
      const recent = state.effects.map((e) => e.id);
      this.seenEvents = new Set(recent);
    }
  }
  select(card, active) {
    this.selected = active ? card : null;
    this.zone.visible = !!this.selected && !card.spell;
    this.element.style.cursor = this.selected ? "crosshair" : "default";
    this.marker.visible = this.markerFill.visible = false;
    if (card) {
      const r = card.radius || 0.8;
      this.marker.scale.setScalar(r / 0.8);
      this.markerFill.scale.setScalar(r / 0.8);
    }
  }
  point(e) {
    if (!this.selected) return null;
    const rect = this.element.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.ray.intersectPlane(
      this.plane,
      new THREE.Vector3(),
    );
    if (!hit) return null;
    const valid =
      Math.abs(hit.x) <= 6.6 &&
      Math.abs(hit.z) <= 10.5 &&
      (this.selected.spell ||
        (this.team === 0 ? hit.z >= 1.45 : hit.z <= -1.45));
    this.marker.visible = this.markerFill.visible = true;
    this.marker.position.set(hit.x, 0.92, hit.z);
    this.markerFill.position.set(hit.x, 0.9, hit.z);
    this.marker.material = material(valid ? 0xffe1a2 : 0xf48974, {
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this.markerFill.material = material(valid ? 0xffe1a2 : 0xf48974, {
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    return hit;
  }
  effect(event) {
    if (event.type === "shot") {
      const color =
        event.source === "dragon"
          ? 0xffbb69
          : event.source === "bomber"
            ? 0x303b36
            : 0xffe7b1;
      const projectile = ball(
        this.scene,
        event.x,
        2.1,
        event.z,
        event.source === "bomber" ? 0.17 : 0.09,
        color,
        0,
      );
      this.particles.push({
        mesh: projectile,
        type: "shot",
        life: 0,
        max: 0.23,
        event,
      });
    } else {
      const color =
        event.type === "fireball"
          ? 0xffb35e
          : event.type === "arrows"
            ? 0xe2e4cf
            : event.type === "collapse"
              ? 0xcac39e
              : event.team === 0
                ? 0x9bcee5
                : 0xf0bb9a;
      const count =
        event.type === "collapse" ? 20 : event.type === "fireball" ? 22 : 9;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2,
          radius = event.radius || 0.6;
        const obj = ball(
          this.scene,
          event.x,
          1.1,
          event.z,
          event.type === "fireball" ? 0.24 : 0.12,
          color,
          0,
        );
        this.particles.push({
          mesh: obj,
          type: event.type,
          life: 0,
          max: 0.6 + (i % 4) * 0.1,
          vx: Math.cos(angle) * radius * 2,
          vz: Math.sin(angle) * radius * 2,
          vy: 2 + (i % 4),
        });
      }
    }
  }
  resize() {
    const width = this.element.clientWidth,
      height = this.element.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    const aspect = width / height,
      halfH = Math.max(10.7, 8.9 / aspect);
    Object.assign(this.camera, {
      left: -halfH * aspect,
      right: halfH * aspect,
      top: halfH,
      bottom: -halfH,
    });
    this.camera.updateProjectionMatrix();
  }
  render(now) {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.ripples.forEach((r, i) => {
      r.position.x = r.userData.baseX + Math.sin(now * 0.0007 + i) * 0.3;
    });
    this.flags.forEach((f, i) => {
      f.rotation.y = Math.sin(now * 0.003 + i) * 0.16;
    });
    for (const g of this.objects.values()) {
      const u = g.userData.target;
      if (!u) continue;
      const move = Math.hypot(g.position.x - u.x, g.position.z - u.z) > 0.02;
      g.position.x = THREE.MathUtils.lerp(
        g.position.x,
        u.x,
        Math.min(1, dt * 16),
      );
      g.position.z = THREE.MathUtils.lerp(
        g.position.z,
        u.z,
        Math.min(1, dt * 16),
      );
      const body = g.userData.body;
      const flying = CARDS[u.card].flying;
      body.rotation.y = u.facing;
      body.position.y = flying
        ? 1.3 + Math.sin(now * 0.004 + u.id) * 0.13
        : move
          ? Math.abs(Math.sin(now * 0.012 + u.id)) * 0.05
          : 0;
      g.userData.legs?.forEach((leg, i) => {
        leg.rotation.x = move ? Math.sin(now * 0.012 + i * Math.PI) * 0.45 : 0;
      });
      g.userData.wings?.forEach((wing, i) => {
        wing.rotation.z = (i ? 1 : -1) * (1.2 + Math.sin(now * 0.012) * 0.4);
      });
    }
    this.particles = this.particles.filter((p) => {
      p.life += dt;
      if (p.life >= p.max) {
        disposeGroup(p.mesh);
        return false;
      }
      const t = p.life / p.max;
      if (p.type === "shot") {
        p.mesh.position.set(
          THREE.MathUtils.lerp(p.event.x, p.event.tx, t),
          1.4 + Math.sin(t * Math.PI) * 0.8,
          THREE.MathUtils.lerp(p.event.z, p.event.tz, t),
        );
      } else {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.position.y += (p.vy - p.life * 8) * dt;
        p.mesh.scale.setScalar(1 - t);
      }
      return true;
    });
    this.renderer.render(this.scene, this.camera);
  }
}
