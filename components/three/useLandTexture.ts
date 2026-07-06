'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { drawLandMask } from '@/lib/landTexture';
import { decodeMultiPolygon, type TopoTopology } from '@/lib/topojsonLite';

const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

/**
 * Natural Earth 由来の陸ポリゴン(public/geo/land-110m.topo.json)から
 * 陸海テクスチャを生成する。座標整合は lib/landTexture.ts の描画式が担い、
 * ここでは flipY=false との組で「片方だけ反転」の規約を守る(二重反転バグ防止)。
 * 読み込み完了まで null(その間は従来の単色表示)。
 */
export function useLandTexture(): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: THREE.CanvasTexture | null = null;

    fetch('/geo/land-110m.topo.json')
      .then((res) => res.json())
      .then((topo: TopoTopology) => {
        if (cancelled) return;
        const land = decodeMultiPolygon(topo, 'land');
        const canvas = document.createElement('canvas');
        canvas.width = TEXTURE_WIDTH;
        canvas.height = TEXTURE_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        drawLandMask(ctx, land, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT });

        created = new THREE.CanvasTexture(canvas);
        created.flipY = false;
        created.wrapS = THREE.RepeatWrapping;
        created.wrapT = THREE.ClampToEdgeWrapping;
        created.colorSpace = THREE.SRGBColorSpace;
        created.anisotropy = 4;
        created.needsUpdate = true;
        setTexture(created);
      })
      .catch((error) => {
        console.warn('land texture load failed; falling back to flat color', error);
      });

    return () => {
      cancelled = true;
      created?.dispose();
    };
  }, []);

  return texture;
}
