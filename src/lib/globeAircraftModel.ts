import * as THREE from "three";

/**
 * Narrow-body composite: nose +Y, wings ±X, thin along globe normal Z.
 * Matches GlobeCanvas objectRotation yaw around local Z.
 */

const fuselageGeo = new THREE.CylinderGeometry(0.042, 0.054, 0.68, 14, 1, false);
const noseGeo = new THREE.ConeGeometry(0.044, 0.15, 12, 1);
const wingGeo = new THREE.BoxGeometry(1.02, 0.018, 0.11);
const wletGeo = new THREE.BoxGeometry(0.04, 0.012, 0.09);
const hstabGeo = new THREE.BoxGeometry(0.38, 0.014, 0.09);
const vstabGeo = new THREE.BoxGeometry(0.018, 0.1, 0.2);
const engineGeo = new THREE.CylinderGeometry(0.034, 0.028, 0.09, 10, 1);
const bellyGeo = new THREE.BoxGeometry(0.09, 0.22, 0.012);

const darkMat = new THREE.MeshStandardMaterial({
  color: 0x0b1224,
  metalness: 0.55,
  roughness: 0.38,
});
const matCache = new Map<string, THREE.MeshStandardMaterial>();

function bodyMaterial(hex: string): THREE.MeshStandardMaterial {
  let m = matCache.get(hex);
  if (!m) {
    const c = new THREE.Color(hex);
    m = new THREE.MeshStandardMaterial({
      color: c,
      metalness: 0.42,
      roughness: 0.44,
      emissive: c,
      emissiveIntensity: 0.11,
    });
    matCache.set(hex, m);
  }
  return m;
}

function mkMesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scl: [number, number, number] = [1, 1, 1],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scl);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function createAircraftModel(colorHex: string, scale: number): THREE.Group {
  const root = new THREE.Group();
  const body = bodyMaterial(colorHex);

  const fuselage = mkMesh(fuselageGeo, body, [0, 0, 0]);
  const nose = mkMesh(noseGeo, body, [0, 0.415, 0]);

  const wing = mkMesh(wingGeo, body, [0, -0.02, 0.01], [0.035, 0, 0]);

  const wletL = mkMesh(wletGeo, body, [0.51, -0.02, 0.02], [0, 0, -0.45]);
  const wletR = mkMesh(wletGeo, body, [-0.51, -0.02, 0.02], [0, 0, 0.45]);

  const hstab = mkMesh(hstabGeo, body, [0, -0.28, 0.01], [0, 0, 0]);

  const vstab = mkMesh(vstabGeo, body, [0, -0.26, 0.11], [0.06, 0, 0]);

  const belly = mkMesh(bellyGeo, darkMat, [0, -0.04, -0.055], [0.12, 0, 0]);

  const engL = mkMesh(engineGeo, darkMat, [0.34, -0.02, -0.06], [Math.PI / 2, 0, 0]);
  const engR = mkMesh(engineGeo, darkMat, [-0.34, -0.02, -0.06], [Math.PI / 2, 0, 0]);

  root.add(fuselage, nose, wing, wletL, wletR, hstab, vstab, belly, engL, engR);
  root.scale.setScalar(scale);
  return root;
}
