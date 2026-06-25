import { createRng, standardNormal } from './random';
import { ESTIMATOR_IDS, computeEstimator, type EstimatorId } from './estimators';

export type EstimatorPopulationType = 'normal' | 'rightSkewed' | 'bimodal';
export type EstimatorViewMode = 'growingN' | 'resampling' | 'compare';

export interface EstimatorValues {
  first: number;
  ends: number;
  mean: number;
  rootSumSquares: number;
}

export interface EstimatorTrajectoryPoint {
  sampleSize: number;
  values: EstimatorValues;
}

export interface EstimatorResamplingResult {
  index: number;
  values: EstimatorValues;
}

export interface EstimatorMetric {
  estimatorId: EstimatorId;
  resamplingMean: number;
  bias: number;
  variance: number;
  mse: number;
}

export interface TrajectoryOptions {
  populationType: EstimatorPopulationType;
  maxSampleSize: number;
  seed: number;
}

export interface ResamplingOptions {
  populationType: EstimatorPopulationType;
  sampleSize: number;
  resampleCount: number;
  seed: number;
}

function samplePopulationValue(populationType: EstimatorPopulationType, rng: () => number): number {
  switch (populationType) {
    case 'rightSkewed':
      return -Math.log(Math.max(1 - rng(), Number.EPSILON)) - 1;
    case 'bimodal':
      return (rng() < 0.5 ? -1.35 : 1.35) + 0.45 * standardNormal(rng);
    case 'normal':
    default:
      return standardNormal(rng);
  }
}

export function generateEstimatorSample(
  populationType: EstimatorPopulationType,
  sampleSize: number,
  seed: number,
): number[] {
  const rng = createRng(seed);
  return Array.from({ length: sampleSize }, () => samplePopulationValue(populationType, rng));
}

export function populationExpectedValue(_populationType: EstimatorPopulationType): number {
  return 0;
}

export function populationLabelJa(populationType: EstimatorPopulationType): string {
  switch (populationType) {
    case 'rightSkewed':
      return '右に歪んだ分布';
    case 'bimodal':
      return '二山型分布';
    case 'normal':
    default:
      return '正規分布';
  }
}

function estimateAll(sample: number[]): EstimatorValues {
  return {
    first: computeEstimator('first', sample),
    ends: computeEstimator('ends', sample),
    mean: computeEstimator('mean', sample),
    rootSumSquares: computeEstimator('rootSumSquares', sample),
  };
}

function trajectorySampleSizes(maxSampleSize: number): number[] {
  const candidates = [2, 3, 4, 5, 7, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000];
  const sizes = candidates.filter((size) => size <= maxSampleSize);
  if (!sizes.includes(maxSampleSize)) sizes.push(maxSampleSize);
  return [...new Set(sizes)].sort((a, b) => a - b);
}

export function simulateEstimatorTrajectories(options: TrajectoryOptions): EstimatorTrajectoryPoint[] {
  const maxSampleSize = Math.max(2, Math.floor(options.maxSampleSize));
  const longSample = generateEstimatorSample(options.populationType, maxSampleSize, options.seed);

  return trajectorySampleSizes(maxSampleSize).map((sampleSize) => {
    const sample = longSample.slice(0, sampleSize);
    return {
      sampleSize,
      values: estimateAll(sample),
    };
  });
}

export function simulateEstimatorResampling(options: ResamplingOptions): EstimatorResamplingResult[] {
  return Array.from({ length: options.resampleCount }, (_, index) => {
    const sample = generateEstimatorSample(
      options.populationType,
      options.sampleSize,
      options.seed + 10007 + index * 97,
    );
    return {
      index: index + 1,
      values: estimateAll(sample),
    };
  });
}

export function summarizeEstimatorMetrics(
  results: EstimatorResamplingResult[],
  targetExpectation: number,
): EstimatorMetric[] {
  return ESTIMATOR_IDS.map((estimatorId) => {
    const values = results.map((result) => result.values[estimatorId]).filter(Number.isFinite);
    const resamplingMean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const bias = resamplingMean - targetExpectation;
    const variance =
      values.reduce((sum, value) => sum + (value - resamplingMean) ** 2, 0) / Math.max(values.length, 1);
    const mse = bias * bias + variance;

    return {
      estimatorId,
      resamplingMean,
      bias,
      variance,
      mse,
    };
  });
}
