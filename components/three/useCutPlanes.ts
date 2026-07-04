'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { CutMode } from '@/stores/useLayerStore';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export interface CutPlanesResult {
  /** 各層マテリアルに渡すクリッピング平面(ワールド座標) */
  planes: THREE.Plane[];
  /** quarter は「両平面で切られる領域のみ」を除去するため intersection モード */
  clipIntersection: boolean;
  /** 除去された空間の中心方向(ラベル配置用の単位ベクトル) */
  openDirection: THREE.Vector3;
}

/**
 * カットモードから clippingPlanes を導出する。
 * - half: x > 0 の半球を除去(平面1枚)
 * - quarter: x > 0 かつ z > 0 の1/4楔を除去(平面2枚 + clipIntersection)
 * 全体を cutAngleDeg だけ Y 軸まわりに回転させる。
 */
export function useCutPlanes(cutMode: CutMode, cutAngleDeg: number): CutPlanesResult {
  return useMemo(() => {
    const angle = (cutAngleDeg * Math.PI) / 180;
    if (cutMode === 'none') {
      return {
        planes: [],
        clipIntersection: false,
        openDirection: new THREE.Vector3(0, 1, 0),
      };
    }
    if (cutMode === 'half') {
      const n = new THREE.Vector3(-1, 0, 0).applyAxisAngle(Y_AXIS, angle);
      return {
        planes: [new THREE.Plane(n, 0)],
        clipIntersection: false,
        openDirection: new THREE.Vector3(1, 0, 0).applyAxisAngle(Y_AXIS, angle),
      };
    }
    const n1 = new THREE.Vector3(-1, 0, 0).applyAxisAngle(Y_AXIS, angle);
    const n2 = new THREE.Vector3(0, 0, -1).applyAxisAngle(Y_AXIS, angle);
    return {
      planes: [new THREE.Plane(n1, 0), new THREE.Plane(n2, 0)],
      clipIntersection: true,
      openDirection: new THREE.Vector3(1, 0, 1).normalize().applyAxisAngle(Y_AXIS, angle),
    };
  }, [cutMode, cutAngleDeg]);
}
