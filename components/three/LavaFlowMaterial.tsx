import * as THREE from 'three';

/**
 * 溶岩流マテリアルの時間変化。
 *
 * emissiveMap の UV オフセットを流下方向へスクロールさせて「流れ」を表現する。
 * テクスチャは material clone では共有されたままなので、火山インスタンスごとに
 * clone してから動かす(共有すると全火山の溶岩が同期して動いてしまう)。
 * シェーダ改変(uTime uniform)より表現力は劣るが、素の three API のみで
 * 動作が保証できる方式を採る。ノイズテクスチャ等の高度化は Phase D 以降。
 */

/** インスタンス専用の emissiveMap に差し替える(scene clone 時に1回呼ぶ) */
export function prepareLavaMaterial(material: THREE.MeshStandardMaterial): void {
  if (material.emissiveMap) {
    material.emissiveMap = material.emissiveMap.clone();
    material.emissiveMap.wrapS = THREE.RepeatWrapping;
    material.emissiveMap.wrapT = THREE.RepeatWrapping;
    material.emissiveMap.needsUpdate = true;
  }
}

/** 毎フレーム呼ぶ。強度に応じて流速と発光を上げる */
export function updateLavaMaterial(
  material: THREE.MeshStandardMaterial,
  intensity: number,
  delta: number,
  pulse: number,
): void {
  material.emissiveIntensity = 0.2 + intensity * 3.0 + pulse;
  if (material.emissiveMap) {
    // 流下方向(モデルの UV V 軸)へ。強度 0 でもごく僅かに動かして生きている感を出す
    material.emissiveMap.offset.y -= delta * (0.005 + intensity * 0.06);
  }
}
