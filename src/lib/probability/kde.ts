import { normalPdf } from './random';
import type { DensityDomain, DensityPoint } from './distributionGuessing';

export type KdeBandwidthMode = 'small' | 'standard' | 'large';

function sampleStandardDeviation(samples: number[]): number {
  if (samples.length < 2) return 1;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (samples.length - 1);
  return Math.sqrt(Math.max(variance, 0.01));
}

export function resolveBandwidth(samples: number[], bandwidthMode: KdeBandwidthMode): number {
  const sd = sampleStandardDeviation(samples);
  const base = 1.06 * sd * Math.pow(Math.max(samples.length, 1), -1 / 5);
  const multiplier = bandwidthMode === 'small' ? 0.55 : bandwidthMode === 'large' ? 1.75 : 1;
  return Math.max(0.08, base * multiplier);
}

export function estimateKde(
  samples: number[],
  domain: DensityDomain,
  bandwidthMode: KdeBandwidthMode,
  count = 180,
): DensityPoint[] {
  const bandwidth = resolveBandwidth(samples, bandwidthMode);

  return Array.from({ length: count }, (_, index) => {
    const x = domain.min + ((domain.max - domain.min) * index) / Math.max(1, count - 1);
    if (samples.length === 0) return { x, y: 0 };
    const y = samples.reduce((sum, value) => sum + normalPdf(x, value, bandwidth), 0) / samples.length;
    return { x, y };
  });
}
