/**
 * TopoJSON の最小デコーダ(land オブジェクト専用)。
 * world-atlas の land-110m.topo.json(量子化+デルタ符号化)を
 * MultiPolygon の経緯度座標に展開する。実行時依存を増やさないための自前実装で、
 * TopoJSON 仕様のうち quantized topology + MultiPolygon のみをサポートする。
 */

interface TopoTransform {
  scale: [number, number];
  translate: [number, number];
}

interface TopoGeometry {
  type: string;
  arcs?: number[][][] | number[][];
  geometries?: TopoGeometry[];
}

export interface TopoTopology {
  type: 'Topology';
  transform?: TopoTransform;
  arcs: number[][][];
  objects: Record<string, TopoGeometry>;
}

/** [lon, lat] の列 */
export type Ring = [number, number][];
/** MultiPolygon: polygons[polygon][ring][point] */
export type MultiPolygon = Ring[][];

/** 量子化された arc をデルタ復号して経緯度列にする */
function decodeArc(arc: number[][], transform: TopoTransform): Ring {
  const [sx, sy] = transform.scale;
  const [tx, ty] = transform.translate;
  let x = 0;
  let y = 0;
  const points: Ring = [];
  for (const [dx, dy] of arc) {
    x += dx;
    y += dy;
    points.push([x * sx + tx, y * sy + ty]);
  }
  return points;
}

/**
 * arc インデックス列からリングを組み立てる。
 * 負のインデックス i は arc[~i] の逆順を意味する。
 * 連結時は次の arc の先頭点が前の arc の末尾点と重複するため 1 点飛ばす。
 */
function stitchRing(arcIndexes: number[], decodedArcs: Ring[]): Ring {
  const ring: Ring = [];
  for (const index of arcIndexes) {
    const arc = index >= 0 ? decodedArcs[index] : [...decodedArcs[~index]].reverse();
    const start = ring.length > 0 ? 1 : 0;
    for (let i = start; i < arc.length; i++) {
      ring.push(arc[i]);
    }
  }
  return ring;
}

/**
 * topology.objects[objectName](MultiPolygon)を経緯度の MultiPolygon に展開する。
 */
export function decodeMultiPolygon(
  topology: TopoTopology,
  objectName = 'land',
): MultiPolygon {
  const object = topology.objects[objectName];
  if (!object) throw new Error(`TopoJSON object not found: ${objectName}`);
  if (!topology.transform) throw new Error('only quantized topology is supported');

  const decodedArcs = topology.arcs.map((arc) => decodeArc(arc, topology.transform!));

  // GeometryCollection(world-atlas land はこの形)も平坦化して集める
  const collectPolygons = (geometry: TopoGeometry): number[][][] => {
    if (geometry.type === 'Polygon') return [geometry.arcs as number[][]];
    if (geometry.type === 'MultiPolygon') return geometry.arcs as number[][][];
    if (geometry.type === 'GeometryCollection') {
      return (geometry.geometries ?? []).flatMap(collectPolygons);
    }
    throw new Error(`unsupported geometry type: ${geometry.type}`);
  };

  return collectPolygons(object).map((polygon) =>
    polygon.map((ring) => stitchRing(ring, decodedArcs)),
  );
}
