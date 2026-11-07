// The 3D car on the landing page. Built from simple shapes in code, so there is no model file to load.
// The page's scroll animation drives it through `state` ({ spin, explode, lines }, each 0..1):
//   spin    turns it from a front three-quarter view, through the side, to a rear three-quarter view
//   explode pulls the body, glass, wheels and lights apart
//   lines   fades the solid car into a black line drawing for the light section
import * as THREE from 'three';

const RED = 0xc8102e;
const INK = 0x111114;

function extrudeProfile(points, depth) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3, curveSegments: 12 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Side profile of the body, nose at +x. Units are roughly metres.
const BODY = [[-2.2, 0.32], [2.2, 0.32], [2.28, 0.62], [2.05, 0.9], [0.95, 0.98], [0.38, 1.52], [-1.15, 1.54], [-1.85, 1.02], [-2.22, 0.95], [-2.3, 0.6]];
const GLASS = [[0.86, 1.0], [0.36, 1.46], [-1.1, 1.48], [-1.7, 1.0]];

export function createCar(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5566, 1.2);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const car = new THREE.Group();
  scene.add(car);
  const parts = []; // { group, rest, out } so explode can move each one
  const solidMats = [];
  const lineMats = [];

  function part(geo, color, out, { metalness = 0.2, roughness = 0.45 } = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: true });
    const lineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0 });
    solidMats.push(mat); lineMats.push(lineMat);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, mat));
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), lineMat));
    car.add(group);
    parts.push({ group, rest: new THREE.Vector3(), out: new THREE.Vector3(...out) });
    return group;
  }

  part(extrudeProfile(BODY, 1.66), RED, [0, 0.55, 0], { metalness: 0.35, roughness: 0.35 });
  part(extrudeProfile(GLASS, 1.74), 0x1a1a1f, [0, 1.35, 0], { metalness: 0.6, roughness: 0.15 });

  const tire = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 36);
  tire.rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 24);
  hub.rotateX(Math.PI / 2);
  for (const [x, z] of [[1.4, 0.82], [1.4, -0.82], [-1.45, 0.82], [-1.45, -0.82]]) {
    const out = [0, -0.25, Math.sign(z) * 1.1];
    part(tire, INK, out, { roughness: 0.9 }).position.set(x, 0.42, z);
    part(hub, 0xd9d6d0, out, { metalness: 0.7, roughness: 0.3 }).position.set(x, 0.42, z);
  }

  const lamp = new THREE.BoxGeometry(0.08, 0.12, 0.42);
  for (const z of [0.55, -0.55]) {
    part(lamp, 0xf4f1ec, [0.7, 0, 0]).position.set(2.24, 0.72, z);
    part(lamp, RED, [-0.7, 0, 0]).position.set(-2.27, 0.78, z);
  }
  for (const p of parts) p.rest.copy(p.group.position);

  const state = { spin: 0, explode: 0, lines: 0 };
  let idle = 0;
  let raf = 0;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull back on narrow screens so the whole car stays in frame.
    camera.position.set(0, 2.6, w < 700 ? 17 : 12);
    camera.lookAt(0, 0.9, 0);
    camera.updateProjectionMatrix();
  }

  function render() {
    // Front three-quarter (-0.65) -> side (0) -> rear three-quarter (0.6), where the exploded parts read best.
    car.rotation.y = -0.65 + state.spin * 1.25 + Math.sin(idle) * 0.04;
    for (const p of parts) p.group.position.copy(p.rest).addScaledVector(p.out, state.explode);
    for (const m of solidMats) m.opacity = 1 - state.lines;
    for (const m of lineMats) m.opacity = state.lines;
    renderer.render(scene, camera);
  }

  function loop() {
    idle += 0.01;
    render();
    raf = requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  loop();

  return {
    state,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      renderer.dispose();
    },
  };
}
