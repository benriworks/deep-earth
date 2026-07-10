/**
 * マントル(マグマ)対流の簡易物理シミュレーション。
 *
 * 2D 極座標の環状領域で、無限プラントル数(ストークス流)のブシネスク対流を解く。
 * マントルは慣性が無視できるため、渦度 ω は温度場から診断的に決まる:
 *
 *   ∇²ω = Ra · (1/r) ∂T/∂θ     (浮力による渦度生成)
 *   ∇²ψ = −ω                    (流れ関数)
 *   u_r = (1/r) ∂ψ/∂θ,  u_θ = −∂ψ/∂r
 *   ∂T/∂t + u·∇T = ∇²T          (温度の移流拡散)
 *
 * 数値解法は無条件安定な構成(Stable Fluids 系):
 * - ポアソン2連: SOR(前ステップから warm start、少数 sweep で準静的に追随)
 * - 移流: セミラグランジュ(後退トレース + バイリニア補間)
 * - 拡散: 陰的 Jacobi
 * 表示専用であり、火山連動(lib/convection.ts の解析場)とは意図的に別系統
 * (連動は決定論テストが要るため。docs 参照)。
 */

export interface MagmaSimParams {
  nTheta: number;
  nR: number;
  /** レイリー数相当(大きいほど活発。1.5e5 でプルーム約5本) */
  ra: number;
  /** 無次元時間刻み(拡散時間スケール) */
  dt: number;
  sorRelaxation: number;
  sorSweeps: number;
  diffusionSweeps: number;
  seed: number;
}

export const DEFAULT_MAGMA_PARAMS: MagmaSimParams = {
  nTheta: 192,
  nR: 48,
  ra: 1.5e5,
  dt: 2e-4,
  sorRelaxation: 1.7,
  sorSweeps: 4,
  diffusionSweeps: 16,
  seed: 42,
};

/** 環状領域(深さ D=1 に正規化。実マントルの半径比 3480/6336 を再現) */
export const MAGMA_INNER_RADIUS = 1.219; // CMB 相当
export const MAGMA_OUTER_RADIUS = 2.219; // 地殻直下相当

const DT_MAX = 5e-4;
const T_MIN = -0.05;
const T_MAX = 1.05;
const NAN_CHECK_INTERVAL = 100;

/** mulberry32(シード付き決定論 RNG) */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MagmaSim {
  readonly params: MagmaSimParams;
  readonly nTheta: number;
  readonly nR: number;
  readonly dr: number;
  readonly dTheta: number;
  /** セル半径(j=0 が内側=CMB) */
  readonly radii: Float64Array;

  T: Float64Array;
  omega: Float64Array;
  psi: Float64Array;
  uR: Float64Array;
  uTheta: Float64Array;

  private tScratch: Float64Array;
  private stepCount = 0;

  constructor(params: Partial<MagmaSimParams> = {}) {
    this.params = { ...DEFAULT_MAGMA_PARAMS, ...params };
    this.params.dt = Math.min(this.params.dt, DT_MAX);
    this.params.sorRelaxation = Math.min(this.params.sorRelaxation, 1.8);
    this.nTheta = this.params.nTheta;
    this.nR = this.params.nR;
    this.dr = (MAGMA_OUTER_RADIUS - MAGMA_INNER_RADIUS) / (this.nR - 1);
    this.dTheta = (2 * Math.PI) / this.nTheta;
    this.radii = new Float64Array(this.nR);
    for (let j = 0; j < this.nR; j++) {
      this.radii[j] = MAGMA_INNER_RADIUS + j * this.dr;
    }
    const size = this.nTheta * this.nR;
    this.T = new Float64Array(size);
    this.omega = new Float64Array(size);
    this.psi = new Float64Array(size);
    this.uR = new Float64Array(size);
    this.uTheta = new Float64Array(size);
    this.tScratch = new Float64Array(size);
    this.reset();
  }

  private idx(i: number, j: number): number {
    return j * this.nTheta + i;
  }

  private wrapTheta(i: number): number {
    const n = this.nTheta;
    return ((i % n) + n) % n;
  }

  /** 初期条件: 線形伝導プロファイル + 乱数 + m=5 摂動(対称性を破り約5本のプルームへ) */
  reset(): void {
    const rng = makeRng(this.params.seed);
    for (let j = 0; j < this.nR; j++) {
      const s = j / (this.nR - 1); // 0=底(高温) → 1=上面(低温)
      for (let i = 0; i < this.nTheta; i++) {
        const theta = i * this.dTheta;
        this.T[this.idx(i, j)] =
          1 - s + 0.02 * (rng() - 0.5) + 0.05 * Math.cos(5 * theta) * Math.sin(Math.PI * s);
      }
    }
    this.omega.fill(0);
    this.psi.fill(0);
    this.uR.fill(0);
    this.uTheta.fill(0);
    this.applyTemperatureBC();
    this.stepCount = 0;
  }

  private applyTemperatureBC(): void {
    for (let i = 0; i < this.nTheta; i++) {
      this.T[this.idx(i, 0)] = 1; // CMB 加熱
      this.T[this.idx(i, this.nR - 1)] = 0; // 上面冷却
    }
  }

  /**
   * ∇²f = rhs を SOR で解く(境界 f=0、θ 周期、warm start は f の現値)。
   * 極座標ラプラシアン: f_rr + f_r/r + f_θθ/r²
   */
  private sorPoisson(f: Float64Array, rhs: Float64Array, sweeps: number): void {
    const { nTheta, nR, dr, dTheta } = this;
    const w = this.params.sorRelaxation;
    const invDr2 = 1 / (dr * dr);
    for (let sweep = 0; sweep < sweeps; sweep++) {
      for (let j = 1; j < nR - 1; j++) {
        const r = this.radii[j];
        const aPlus = invDr2 + 1 / (2 * r * dr);
        const aMinus = invDr2 - 1 / (2 * r * dr);
        const b = 1 / (r * r * dTheta * dTheta);
        const c = 2 * invDr2 + 2 * b;
        const rowUp = (j + 1) * nTheta;
        const rowDown = (j - 1) * nTheta;
        const row = j * nTheta;
        for (let i = 0; i < nTheta; i++) {
          const iL = i === 0 ? nTheta - 1 : i - 1;
          const iRt = i === nTheta - 1 ? 0 : i + 1;
          const gs =
            (aPlus * f[rowUp + i] +
              aMinus * f[rowDown + i] +
              b * (f[row + iL] + f[row + iRt]) -
              rhs[row + i]) /
            c;
          f[row + i] = (1 - w) * f[row + i] + w * gs;
        }
      }
    }
  }

  /** 浮力 → ω → ψ → 速度(準静的ストークス応答) */
  private updateFlow(): void {
    const { nTheta, nR, dTheta, dr } = this;
    // 浮力 RHS: Ra · (1/r) ∂T/∂θ
    for (let j = 1; j < nR - 1; j++) {
      const r = this.radii[j];
      const row = j * nTheta;
      for (let i = 0; i < nTheta; i++) {
        const iL = i === 0 ? nTheta - 1 : i - 1;
        const iRt = i === nTheta - 1 ? 0 : i + 1;
        const dTdTheta = (this.T[row + iRt] - this.T[row + iL]) / (2 * dTheta);
        this.tScratch[row + i] = (this.params.ra * dTdTheta) / r;
      }
    }
    this.sorPoisson(this.omega, this.tScratch, this.params.sorSweeps);
    // ∇²ψ = −ω
    for (let k = 0; k < this.omega.length; k++) this.tScratch[k] = -this.omega[k];
    this.sorPoisson(this.psi, this.tScratch, this.params.sorSweeps);

    // 速度: u_r=(1/r)∂ψ/∂θ、u_θ=−∂ψ/∂r(境界は片側差分)
    for (let j = 0; j < nR; j++) {
      const r = this.radii[j];
      const row = j * nTheta;
      for (let i = 0; i < nTheta; i++) {
        const iL = i === 0 ? nTheta - 1 : i - 1;
        const iRt = i === nTheta - 1 ? 0 : i + 1;
        this.uR[row + i] = (this.psi[row + iRt] - this.psi[row + iL]) / (2 * dTheta * r);
        if (j === 0) {
          this.uTheta[row + i] = -(this.psi[row + nTheta + i] - this.psi[row + i]) / dr;
        } else if (j === nR - 1) {
          this.uTheta[row + i] = -(this.psi[row + i] - this.psi[row - nTheta + i]) / dr;
        } else {
          this.uTheta[row + i] =
            -(this.psi[row + nTheta + i] - this.psi[row - nTheta + i]) / (2 * dr);
        }
      }
    }
  }

  /** T のバイリニア補間(θ 周期・r クランプ) */
  private sampleT(rPos: number, thetaPos: number): number {
    const { nR, dr, dTheta } = this;
    const rClamped = Math.min(Math.max(rPos, MAGMA_INNER_RADIUS), MAGMA_OUTER_RADIUS);
    const jf = (rClamped - MAGMA_INNER_RADIUS) / dr;
    const j0 = Math.min(Math.floor(jf), nR - 2);
    const fj = jf - j0;
    const itf = thetaPos / dTheta;
    const i0 = Math.floor(itf);
    const fi = itf - i0;
    const i0w = this.wrapTheta(i0);
    const i1w = this.wrapTheta(i0 + 1);
    const bottom = this.T[this.idx(i0w, j0)] * (1 - fi) + this.T[this.idx(i1w, j0)] * fi;
    const top =
      this.T[this.idx(i0w, j0 + 1)] * (1 - fi) + this.T[this.idx(i1w, j0 + 1)] * fi;
    return bottom * (1 - fj) + top * fj;
  }

  /** セミラグランジュ移流 + 陰的 Jacobi 拡散 + クランプ */
  private updateTemperature(): void {
    const { nTheta, nR, dr, dTheta } = this;
    const dt = this.params.dt;

    // 移流(後退トレース)
    for (let j = 1; j < nR - 1; j++) {
      const r = this.radii[j];
      const row = j * nTheta;
      for (let i = 0; i < nTheta; i++) {
        const rBack = r - this.uR[row + i] * dt;
        const thetaBack = i * dTheta - (this.uTheta[row + i] / r) * dt;
        this.tScratch[row + i] = this.sampleT(rBack, thetaBack);
      }
    }
    // 境界行は Dirichlet のまま scratch へ
    for (let i = 0; i < nTheta; i++) {
      this.tScratch[this.idx(i, 0)] = 1;
      this.tScratch[this.idx(i, nR - 1)] = 0;
    }

    // 陰的拡散: (I − dt∇²) T_new = T_adv を Jacobi で解く(warm start = T_adv)
    const invDr2 = 1 / (dr * dr);
    this.T.set(this.tScratch);
    for (let iter = 0; iter < this.params.diffusionSweeps; iter++) {
      for (let j = 1; j < nR - 1; j++) {
        const r = this.radii[j];
        const aPlus = invDr2 + 1 / (2 * r * dr);
        const aMinus = invDr2 - 1 / (2 * r * dr);
        const b = 1 / (r * r * dTheta * dTheta);
        const denom = 1 + dt * (2 * invDr2 + 2 * b);
        const rowUp = (j + 1) * nTheta;
        const rowDown = (j - 1) * nTheta;
        const row = j * nTheta;
        for (let i = 0; i < nTheta; i++) {
          const iL = i === 0 ? nTheta - 1 : i - 1;
          const iRt = i === nTheta - 1 ? 0 : i + 1;
          const neighbors =
            aPlus * this.T[rowUp + i] +
            aMinus * this.T[rowDown + i] +
            b * (this.T[row + iL] + this.T[row + iRt]);
          this.T[row + i] = (this.tScratch[row + i] + dt * neighbors) / denom;
        }
      }
    }

    // クランプ(ブシネスクの有界性を強制)
    for (let k = 0; k < this.T.length; k++) {
      if (this.T[k] > T_MAX) this.T[k] = T_MAX;
      else if (this.T[k] < T_MIN) this.T[k] = T_MIN;
    }
    this.applyTemperatureBC();
  }

  /** 1 サブステップ進める */
  step(): void {
    this.updateFlow();
    this.updateTemperature();
    this.stepCount++;
    if (this.stepCount % NAN_CHECK_INTERVAL === 0 && this.hasNaN()) {
      // 数値事故からの自己回復(公開教育物なので絶対に止めない)
      this.reset();
    }
  }

  stepMany(n: number): void {
    for (let k = 0; k < n; k++) this.step();
  }

  hasNaN(): boolean {
    for (let k = 0; k < this.T.length; k++) {
      if (!Number.isFinite(this.T[k])) return true;
    }
    return false;
  }

  maxVelocity(): number {
    let max = 0;
    for (let k = 0; k < this.uR.length; k++) {
      const speed = Math.hypot(this.uR[k], this.uTheta[k]);
      if (speed > max) max = speed;
    }
    return max;
  }

  /** 転送用: 温度場の Float32 コピー(行= r、列= θ) */
  getTemperatureFloat32(): Float32Array {
    return Float32Array.from(this.T);
  }

  /** 転送用: 低解像度の速度場(RG ペア: u_θ, u_r)。シェーダの流れ歪みに使う */
  getVelocityCoarse(outTheta: number, outR: number): Float32Array {
    const out = new Float32Array(outTheta * outR * 2);
    for (let oj = 0; oj < outR; oj++) {
      const j = Math.min(Math.round((oj / (outR - 1)) * (this.nR - 1)), this.nR - 1);
      for (let oi = 0; oi < outTheta; oi++) {
        const i = Math.min(Math.round((oi / outTheta) * this.nTheta), this.nTheta - 1);
        const src = this.idx(i, j);
        out[(oj * outTheta + oi) * 2] = this.uTheta[src];
        out[(oj * outTheta + oi) * 2 + 1] = this.uR[src];
      }
    }
    return out;
  }
}
