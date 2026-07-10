'use client';

import * as THREE from 'three';

/**
 * 海底火山の「変色水」— 噴気で海水が変色する実現象(福徳岡ノ場などで観測)の様式化。
 * 半透明ターコイズの円盤を山体の周囲に敷く。ソフトエッジは放射グラデーションの
 * alphaMap で表現(共有シングルトン)。
 */
let waterAlpha: THREE.CanvasTexture | null = null;
function getWaterAlpha(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (!waterAlpha) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    waterAlpha = new THREE.CanvasTexture(canvas);
    waterAlpha.needsUpdate = true;
  }
  return waterAlpha;
}

/** 親グループ(+Y=地表法線)内で地表に敷く変色水ディスク */
export function SubmarineWater({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]}>
      <circleGeometry args={[radius * 1.6, 48]} />
      <meshBasicMaterial
        color="#3ec6c6"
        transparent
        opacity={0.3}
        alphaMap={getWaterAlpha() ?? undefined}
        depthWrite={false}
      />
    </mesh>
  );
}
