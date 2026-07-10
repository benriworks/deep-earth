'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  applyTerrainNoise,
  drawLandMask,
  LAND_TEXTURE_COLORS,
  ROUGHNESS_COLORS,
} from '@/lib/landTexture';
import { decodeMultiPolygon, type MultiPolygon, type TopoTopology } from '@/lib/topojsonLite';

const MAP_WIDTH = 2048;
const MAP_HEIGHT = 1024;
const ROUGH_WIDTH = 1024;
const ROUGH_HEIGHT = 512;

export interface LandTextures {
  map: THREE.CanvasTexture;
  /** 海=なめらか(光沢)/陸=マット の粗さマップ */
  roughnessMap: THREE.CanvasTexture;
}

function makeCanvas(width: number, height: number): CanvasRenderingContext2D | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

function toTexture(
  ctx: CanvasRenderingContext2D,
  colorSpace: THREE.ColorSpace,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.flipY = false; // 描画式(lat+90)/180 と対。二重反転しないこと
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = colorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Natural Earth 由来の陸ポリゴンから、色むら入りカラーマップと
 * 海光沢用 roughnessMap を生成する。読み込み完了まで null(従来の単色表示)。
 */
export function useLandTexture(): LandTextures | null {
  const [textures, setTextures] = useState<LandTextures | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: LandTextures | null = null;

    fetch('/geo/land-110m.topo.json')
      .then((res) => res.json())
      .then((topo: TopoTopology) => {
        if (cancelled) return;
        const land: MultiPolygon = decodeMultiPolygon(topo, 'land');

        const mapCtx = makeCanvas(MAP_WIDTH, MAP_HEIGHT);
        const roughCtx = makeCanvas(ROUGH_WIDTH, ROUGH_HEIGHT);
        if (!mapCtx || !roughCtx) return;

        drawLandMask(mapCtx, land, {
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          oceanColor: LAND_TEXTURE_COLORS.ocean,
          landColor: LAND_TEXTURE_COLORS.land,
        });
        applyTerrainNoise(mapCtx, MAP_WIDTH, MAP_HEIGHT);

        drawLandMask(roughCtx, land, {
          width: ROUGH_WIDTH,
          height: ROUGH_HEIGHT,
          oceanColor: ROUGHNESS_COLORS.ocean,
          landColor: ROUGHNESS_COLORS.land,
        });

        created = {
          map: toTexture(mapCtx, THREE.SRGBColorSpace),
          roughnessMap: toTexture(roughCtx, THREE.NoColorSpace),
        };
        setTextures(created);
      })
      .catch((error) => {
        console.warn('land texture load failed; falling back to flat color', error);
      });

    return () => {
      cancelled = true;
      created?.map.dispose();
      created?.roughnessMap.dispose();
    };
  }, []);

  return textures;
}
