export type DistributionKind = 'normal' | 'uniform' | 'skewed' | 'bimodal';
export type JointDistributionKind = 'normal' | 'rightSkewed';

export interface SamplePoint {
  x: number;
  y: number;
}

export interface RepeatedSample {
  index: number;
  values: number[];
  mean: number;
}

const SKEWED_SHAPE = 0.65;
const SKEWED_MEAN = Math.exp((SKEWED_SHAPE * SKEWED_SHAPE) / 2);
const SKEWED_SD = Math.sqrt((Math.exp(SKEWED_SHAPE * SKEWED_SHAPE) - 1) * Math.exp(SKEWED_SHAPE * SKEWED_SHAPE));

export function createRng(seed: number): () => number {
  let t = seed >>> 0;

  return function rng(): number {
    t += 0x6d2b79f5;
    let result = Math.imul(t ^ (t >>> 15), 1 | t);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function standardNormal(rng: () => number): number {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function normalPdf(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

export function univariatePdf(kind: DistributionKind, x: number): number {
  switch (kind) {
    case 'uniform':
      return x >= -2 && x <= 2 ? 0.25 : 0;
    case 'skewed': {
      const shift = -1.6;
      const lambda = 1.15;
      return x >= shift ? lambda * Math.exp(-lambda * (x - shift)) : 0;
    }
    case 'bimodal':
      return 0.52 * normalPdf(x, -1.25, 0.55) + 0.48 * normalPdf(x, 1.35, 0.65);
    case 'normal':
    default:
      return normalPdf(x, 0, 1);
  }
}

export function sampleUnivariate(kind: DistributionKind, rng: () => number): number {
  switch (kind) {
    case 'uniform':
      return -2 + 4 * rng();
    case 'skewed': {
      const shift = -1.6;
      const lambda = 1.15;
      return shift - Math.log(Math.max(1 - rng(), Number.EPSILON)) / lambda;
    }
    case 'bimodal':
      return rng() < 0.52 ? -1.25 + 0.55 * standardNormal(rng) : 1.35 + 0.65 * standardNormal(rng);
    case 'normal':
    default:
      return standardNormal(rng);
  }
}

export function sampleUnivariateSeries(kind: DistributionKind, n: number, seed: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => sampleUnivariate(kind, rng));
}

export function sampleMean(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function sampleRepeatedUnivariateSeries(
  kind: DistributionKind,
  sampleSize: number,
  sampleCount: number,
  seed: number,
): RepeatedSample[] {
  return Array.from({ length: sampleCount }, (_, index) => {
    const values = sampleUnivariateSeries(kind, sampleSize, seed + index);
    return {
      index: index + 1,
      values,
      mean: sampleMean(values),
    };
  });
}

export function bivariateNormalPdf(x: number, y: number, rho: number): number {
  const safeRho = Math.max(-0.98, Math.min(0.98, rho));
  const oneMinusRho2 = Math.max(1 - safeRho * safeRho, 0.0001);
  const exponent = -(x * x - 2 * safeRho * x * y + y * y) / (2 * oneMinusRho2);
  return Math.exp(exponent) / (2 * Math.PI * Math.sqrt(oneMinusRho2));
}

function skewedXFromLatent(z: number): number {
  return (Math.exp(SKEWED_SHAPE * z) - SKEWED_MEAN) / SKEWED_SD;
}

export function transformLatentToJointPoint(kind: JointDistributionKind, point: SamplePoint): SamplePoint {
  switch (kind) {
    case 'rightSkewed':
      return {
        x: skewedXFromLatent(point.x),
        y: point.y,
      };
    case 'normal':
    default:
      return point;
  }
}

function latentFromSkewedX(x: number): number | null {
  const raw = x * SKEWED_SD + SKEWED_MEAN;
  if (raw <= 0) return null;
  return Math.log(raw) / SKEWED_SHAPE;
}

function skewedJacobian(x: number): number {
  const raw = x * SKEWED_SD + SKEWED_MEAN;
  if (raw <= 0) return 0;
  return SKEWED_SD / (SKEWED_SHAPE * raw);
}

export function bivariateJointPdf(kind: JointDistributionKind, x: number, y: number, rho: number): number {
  switch (kind) {
    case 'rightSkewed': {
      const latentX = latentFromSkewedX(x);
      if (latentX === null) return 0;
      return bivariateNormalPdf(latentX, y, rho) * skewedJacobian(x);
    }
    case 'normal':
    default:
      return bivariateNormalPdf(x, y, rho);
  }
}

export function sampleBivariateSeries(kind: JointDistributionKind, n: number, seed: number, rho: number): SamplePoint[] {
  const rng = createRng(seed);
  const safeRho = Math.max(-0.98, Math.min(0.98, rho));
  const conditionalScale = Math.sqrt(Math.max(1 - safeRho * safeRho, 0));

  return Array.from({ length: n }, () => {
    const z1 = standardNormal(rng);
    const z2 = standardNormal(rng);
    return transformLatentToJointPoint(kind, {
      x: z1,
      y: safeRho * z1 + conditionalScale * z2,
    });
  });
}

export function sampleBivariateNormalSeries(n: number, seed: number, rho: number): SamplePoint[] {
  return sampleBivariateSeries('normal', n, seed, rho);
}

export function distributionLabel(kind: DistributionKind): string {
  switch (kind) {
    case 'uniform':
      return '一様分布';
    case 'skewed':
      return '右に歪んだ分布';
    case 'bimodal':
      return '二峰分布';
    case 'normal':
    default:
      return '正規分布';
  }
}

export function jointDistributionLabel(kind: JointDistributionKind): string {
  switch (kind) {
    case 'rightSkewed':
      return '右に歪んだ同時分布';
    case 'normal':
    default:
      return '2変量正規分布';
  }
}
