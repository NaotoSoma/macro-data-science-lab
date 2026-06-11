import { createRng, normalPdf, standardNormal } from './random';

export type TrueDistributionType = 'normal' | 'uniform' | 'rightSkewed' | 'leftSkewed' | 'bimodal';
export type GuessDistributionType = 'singlePeak' | 'flat' | 'skewed' | 'twoPeaks';
export type GamePhase = 'observing' | 'guessing' | 'locked' | 'revealed';
export type Difficulty = 'easy' | 'standard' | 'hard';

export interface DensityPoint {
  x: number;
  y: number;
}

export interface TrueDistributionSpec {
  type: TrueDistributionType;
  parameters: Record<string, number>;
}

export interface GuessDistributionSpec {
  type: GuessDistributionType;
  parameters: Record<string, number>;
}

export interface DensityDomain {
  min: number;
  max: number;
}

export interface DistributionSummary {
  center: number;
  spread: number;
}

export const DEFAULT_DENSITY_DOMAIN: DensityDomain = { min: -4, max: 4 };

function pick<T>(values: T[], rng: () => number): T {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}

function between(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function generateTrueDistribution(seed: number, difficulty: Difficulty): TrueDistributionSpec {
  const rng = createRng(seed + 0x9e3779b9);
  const choices: TrueDistributionType[] =
    difficulty === 'easy'
      ? ['normal', 'uniform', 'bimodal']
      : difficulty === 'hard'
        ? ['normal', 'rightSkewed', 'leftSkewed', 'bimodal']
        : ['normal', 'uniform', 'rightSkewed', 'leftSkewed', 'bimodal'];
  const type = pick(choices, rng);

  switch (type) {
    case 'uniform': {
      const center = between(rng, -0.45, 0.45);
      const halfWidth = between(rng, 1.45, 2.25);
      return { type, parameters: { center, halfWidth } };
    }
    case 'rightSkewed': {
      const shift = between(rng, -2.35, -1.45);
      const rate = between(rng, 0.9, 1.35);
      return { type, parameters: { shift, rate } };
    }
    case 'leftSkewed': {
      const upper = between(rng, 1.45, 2.35);
      const rate = between(rng, 0.9, 1.35);
      return { type, parameters: { upper, rate } };
    }
    case 'bimodal': {
      const center = between(rng, -0.25, 0.25);
      const separation = between(rng, 1.65, 2.65);
      const leftSd = between(rng, 0.38, 0.68);
      const rightSd = between(rng, 0.38, 0.72);
      const weight = between(rng, 0.42, 0.58);
      return { type, parameters: { center, separation, leftSd, rightSd, weight } };
    }
    case 'normal':
    default: {
      const mean = between(rng, -0.55, 0.55);
      const sd = between(rng, 0.7, 1.15);
      return { type: 'normal', parameters: { mean, sd } };
    }
  }
}

export function trueDistributionPdf(spec: TrueDistributionSpec, x: number): number {
  const { parameters } = spec;

  switch (spec.type) {
    case 'uniform': {
      const center = parameters.center ?? 0;
      const halfWidth = Math.max(0.1, parameters.halfWidth ?? 2);
      return x >= center - halfWidth && x <= center + halfWidth ? 1 / (2 * halfWidth) : 0;
    }
    case 'rightSkewed': {
      const shift = parameters.shift ?? -1.7;
      const rate = Math.max(0.1, parameters.rate ?? 1.1);
      return x >= shift ? rate * Math.exp(-rate * (x - shift)) : 0;
    }
    case 'leftSkewed': {
      const upper = parameters.upper ?? 1.7;
      const rate = Math.max(0.1, parameters.rate ?? 1.1);
      return x <= upper ? rate * Math.exp(-rate * (upper - x)) : 0;
    }
    case 'bimodal': {
      const center = parameters.center ?? 0;
      const separation = Math.max(0.2, parameters.separation ?? 2);
      const leftSd = Math.max(0.1, parameters.leftSd ?? 0.55);
      const rightSd = Math.max(0.1, parameters.rightSd ?? 0.55);
      const weight = Math.min(0.9, Math.max(0.1, parameters.weight ?? 0.5));
      return (
        weight * normalPdf(x, center - separation / 2, leftSd) +
        (1 - weight) * normalPdf(x, center + separation / 2, rightSd)
      );
    }
    case 'normal':
    default:
      return normalPdf(x, parameters.mean ?? 0, Math.max(0.1, parameters.sd ?? 1));
  }
}

export function sampleFromTrueDistribution(spec: TrueDistributionSpec, n: number, seed: number): number[] {
  const rng = createRng(seed + 0x85ebca6b);
  const { parameters } = spec;

  return Array.from({ length: n }, () => {
    switch (spec.type) {
      case 'uniform': {
        const center = parameters.center ?? 0;
        const halfWidth = Math.max(0.1, parameters.halfWidth ?? 2);
        return center - halfWidth + 2 * halfWidth * rng();
      }
      case 'rightSkewed': {
        const shift = parameters.shift ?? -1.7;
        const rate = Math.max(0.1, parameters.rate ?? 1.1);
        return shift - Math.log(Math.max(1 - rng(), Number.EPSILON)) / rate;
      }
      case 'leftSkewed': {
        const upper = parameters.upper ?? 1.7;
        const rate = Math.max(0.1, parameters.rate ?? 1.1);
        return upper + Math.log(Math.max(1 - rng(), Number.EPSILON)) / rate;
      }
      case 'bimodal': {
        const center = parameters.center ?? 0;
        const separation = Math.max(0.2, parameters.separation ?? 2);
        const leftSd = Math.max(0.1, parameters.leftSd ?? 0.55);
        const rightSd = Math.max(0.1, parameters.rightSd ?? 0.55);
        const weight = Math.min(0.9, Math.max(0.1, parameters.weight ?? 0.5));
        return rng() < weight
          ? center - separation / 2 + leftSd * standardNormal(rng)
          : center + separation / 2 + rightSd * standardNormal(rng);
      }
      case 'normal':
      default:
        return (parameters.mean ?? 0) + Math.max(0.1, parameters.sd ?? 1) * standardNormal(rng);
    }
  });
}

export function defaultGuessDistribution(type: GuessDistributionType): GuessDistributionSpec {
  switch (type) {
    case 'flat':
      return { type, parameters: { center: 0, width: 4 } };
    case 'skewed':
      return { type, parameters: { center: 0, spread: 1.2, direction: 1, skewness: 1 } };
    case 'twoPeaks':
      return { type, parameters: { center: 0, separation: 2, balance: 0.5, spread: 0.55 } };
    case 'singlePeak':
    default:
      return { type: 'singlePeak', parameters: { center: 0, spread: 1 } };
  }
}

export function guessDistributionPdf(spec: GuessDistributionSpec, x: number): number {
  const { parameters } = spec;

  switch (spec.type) {
    case 'flat': {
      const center = parameters.center ?? 0;
      const width = Math.max(0.2, parameters.width ?? 4);
      return x >= center - width / 2 && x <= center + width / 2 ? 1 / width : 0;
    }
    case 'skewed': {
      const center = parameters.center ?? 0;
      const spread = Math.max(0.2, parameters.spread ?? 1.2);
      const direction = (parameters.direction ?? 1) >= 0 ? 1 : -1;
      const skewness = Math.max(0.35, parameters.skewness ?? 1);
      const rate = 1 / Math.max(0.2, spread * skewness);

      if (direction > 0) {
        const shift = center - spread * 0.8;
        return x >= shift ? rate * Math.exp(-rate * (x - shift)) : 0;
      }

      const upper = center + spread * 0.8;
      return x <= upper ? rate * Math.exp(-rate * (upper - x)) : 0;
    }
    case 'twoPeaks': {
      const center = parameters.center ?? 0;
      const separation = Math.max(0.3, parameters.separation ?? 2);
      const balance = Math.min(0.9, Math.max(0.1, parameters.balance ?? 0.5));
      const spread = Math.max(0.18, parameters.spread ?? 0.55);
      return (
        balance * normalPdf(x, center - separation / 2, spread) +
        (1 - balance) * normalPdf(x, center + separation / 2, spread)
      );
    }
    case 'singlePeak':
    default:
      return normalPdf(x, parameters.center ?? 0, Math.max(0.1, parameters.spread ?? 1));
  }
}

export function summarizeTrueDistribution(spec: TrueDistributionSpec): DistributionSummary {
  const { parameters } = spec;

  switch (spec.type) {
    case 'uniform': {
      const halfWidth = Math.max(0.1, parameters.halfWidth ?? 2);
      return {
        center: parameters.center ?? 0,
        spread: halfWidth / Math.sqrt(3),
      };
    }
    case 'rightSkewed': {
      const shift = parameters.shift ?? -1.7;
      const rate = Math.max(0.1, parameters.rate ?? 1.1);
      return {
        center: shift + 1 / rate,
        spread: 1 / rate,
      };
    }
    case 'leftSkewed': {
      const upper = parameters.upper ?? 1.7;
      const rate = Math.max(0.1, parameters.rate ?? 1.1);
      return {
        center: upper - 1 / rate,
        spread: 1 / rate,
      };
    }
    case 'bimodal': {
      const center = parameters.center ?? 0;
      const separation = Math.max(0.2, parameters.separation ?? 2);
      const leftSd = Math.max(0.1, parameters.leftSd ?? 0.55);
      const rightSd = Math.max(0.1, parameters.rightSd ?? 0.55);
      const weight = Math.min(0.9, Math.max(0.1, parameters.weight ?? 0.5));
      const leftMean = center - separation / 2;
      const rightMean = center + separation / 2;
      const mean = weight * leftMean + (1 - weight) * rightMean;
      const variance =
        weight * (leftSd * leftSd + (leftMean - mean) ** 2) +
        (1 - weight) * (rightSd * rightSd + (rightMean - mean) ** 2);
      return {
        center: mean,
        spread: Math.sqrt(Math.max(variance, 0)),
      };
    }
    case 'normal':
    default:
      return {
        center: parameters.mean ?? 0,
        spread: Math.max(0.1, parameters.sd ?? 1),
      };
  }
}

export function summarizeGuessDistribution(spec: GuessDistributionSpec): DistributionSummary {
  const { parameters } = spec;

  switch (spec.type) {
    case 'flat': {
      const width = Math.max(0.2, parameters.width ?? 4);
      return {
        center: parameters.center ?? 0,
        spread: width / Math.sqrt(12),
      };
    }
    case 'skewed': {
      const center = parameters.center ?? 0;
      const spread = Math.max(0.2, parameters.spread ?? 1.2);
      const direction = (parameters.direction ?? 1) >= 0 ? 1 : -1;
      const skewness = Math.max(0.35, parameters.skewness ?? 1);
      return {
        center: center + direction * spread * (skewness - 0.8),
        spread: spread * skewness,
      };
    }
    case 'twoPeaks': {
      const center = parameters.center ?? 0;
      const separation = Math.max(0.3, parameters.separation ?? 2);
      const balance = Math.min(0.9, Math.max(0.1, parameters.balance ?? 0.5));
      const spread = Math.max(0.18, parameters.spread ?? 0.55);
      const leftMean = center - separation / 2;
      const rightMean = center + separation / 2;
      const mean = balance * leftMean + (1 - balance) * rightMean;
      const variance =
        balance * (spread * spread + (leftMean - mean) ** 2) +
        (1 - balance) * (spread * spread + (rightMean - mean) ** 2);
      return {
        center: mean,
        spread: Math.sqrt(Math.max(variance, 0)),
      };
    }
    case 'singlePeak':
    default:
      return {
        center: parameters.center ?? 0,
        spread: Math.max(0.1, parameters.spread ?? 1),
      };
  }
}

export function buildDensityGrid(
  pdf: (x: number) => number,
  domain: DensityDomain = DEFAULT_DENSITY_DOMAIN,
  count = 180,
): DensityPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const x = domain.min + ((domain.max - domain.min) * index) / Math.max(1, count - 1);
    return { x, y: Math.max(0, pdf(x)) };
  });
}

export function trueDistributionLabel(type: TrueDistributionType): string {
  switch (type) {
    case 'uniform':
      return '平らな分布';
    case 'rightSkewed':
      return '右に長い尾';
    case 'leftSkewed':
      return '左に長い尾';
    case 'bimodal':
      return '山が2つ';
    case 'normal':
    default:
      return '山が1つで左右対称';
  }
}

export function guessDistributionLabel(type: GuessDistributionType): string {
  switch (type) {
    case 'flat':
      return '平ら';
    case 'skewed':
      return '片側に長い尾';
    case 'twoPeaks':
      return '山が2つ';
    case 'singlePeak':
    default:
      return '山が1つ';
  }
}
