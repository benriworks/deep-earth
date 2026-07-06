import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pointInLand, projectToPixel } from '@/lib/landTexture';
import { decodeMultiPolygon, type TopoTopology } from '@/lib/topojsonLite';

const topo = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'geo', 'land-110m.topo.json'), 'utf-8'),
) as TopoTopology;
const land = decodeMultiPolygon(topo, 'land');

describe('decodeMultiPolygon(TopoJSON デコード)', () => {
  it('陸ポリゴンが妥当な数と座標範囲で展開される', () => {
    expect(land.length).toBeGreaterThan(50); // 110m 解像度の大陸+島
    for (const polygon of land.slice(0, 10)) {
      for (const ring of polygon) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
        for (const [lon, lat] of ring) {
          expect(lon).toBeGreaterThanOrEqual(-180.01);
          expect(lon).toBeLessThanOrEqual(180.01);
          expect(lat).toBeGreaterThanOrEqual(-90.01);
          expect(lat).toBeLessThanOrEqual(90.01);
        }
      }
    }
  });

  it('リングは閉じている(先頭点=末尾点)', () => {
    const ring = land[0][0];
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 6);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 6);
  });
});

describe('pointInLand(陸海判定 — 座標規約の実証)', () => {
  it('陸: 東京・エクアドル・オーストラリア中央・シベリア', () => {
    expect(pointInLand(land, 139.69, 35.68)).toBe(true); // 東京
    expect(pointInLand(land, -78.5, -1.5)).toBe(true); // エクアドル
    expect(pointInLand(land, 134.0, -24.0)).toBe(true); // 豪州内陸
    expect(pointInLand(land, 100.0, 62.0)).toBe(true); // シベリア
  });

  it('海: ギニア湾・太平洋中央・南大西洋・インド洋', () => {
    expect(pointInLand(land, 0, 0)).toBe(false); // ギニア湾
    expect(pointInLand(land, -150.0, 0)).toBe(false); // 太平洋中央
    expect(pointInLand(land, -20.0, -30.0)).toBe(false); // 南大西洋
    expect(pointInLand(land, 80.0, -10.0)).toBe(false); // インド洋
  });

  it('実在火山の位置が陸に落ちる(富士山・ベスビオ)', () => {
    expect(pointInLand(land, 138.73, 35.36)).toBe(true); // 富士山
    expect(pointInLand(land, 14.43, 40.82)).toBe(true); // ベスビオ
  });
});

describe('projectToPixel(UV 整合式)', () => {
  const W = 2048;
  const H = 1024;

  it('経度: lon=0 → x=W/4、lon=90 → x=W/2、lon=-90 → x=0(継ぎ目)', () => {
    expect(projectToPixel(0, 0, W, H)[0]).toBeCloseTo(W * 0.25, 6);
    expect(projectToPixel(90, 0, W, H)[0]).toBeCloseTo(W * 0.5, 6);
    expect(projectToPixel(-90, 0, W, H)[0]).toBeCloseTo(0, 6);
    expect(projectToPixel(180, 0, W, H)[0]).toBeCloseTo(W * 0.75, 6);
  });

  it('緯度: 北極(+90)が canvas 下端、南極(-90)が上端(flipY=false 前提)', () => {
    expect(projectToPixel(0, 90, W, H)[1]).toBeCloseTo(H, 6);
    expect(projectToPixel(0, -90, W, H)[1]).toBeCloseTo(0, 6);
    expect(projectToPixel(0, 0, W, H)[1]).toBeCloseTo(H / 2, 6);
  });

  it('±180 の継ぎ目で連続(lon=179.9 と -179.9 が近接ピクセル)', () => {
    const [xEast] = projectToPixel(179.9, 0, W, H);
    const [xWest] = projectToPixel(-179.9, 0, W, H);
    expect(Math.abs(xEast - xWest)).toBeLessThan(W * 0.002);
  });
});
