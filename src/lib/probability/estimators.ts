export type EstimatorId = 'first' | 'ends' | 'mean' | 'rootSumSquares';

export type EstimatorOptions = Record<string, never>;

export interface EstimatorDefinition {
  id: EstimatorId;
  labelJa: string;
  shortLabelJa: string;
  formulaJa: string;
  usesAllData: boolean;
  unbiased: boolean;
  consistent: boolean;
  explanationJa: string;
  compute: (sample: number[], options?: EstimatorOptions) => number;
}

export function sampleAverage(sample: number[]): number {
  if (sample.length === 0) return Number.NaN;
  return sample.reduce((sum, value) => sum + value, 0) / sample.length;
}

export const ESTIMATOR_DEFINITIONS: EstimatorDefinition[] = [
  {
    id: 'first',
    labelJa: '最初の1個だけ',
    shortLabelJa: 'X_1',
    formulaJa: 'X_1',
    usesAllData: false,
    unbiased: true,
    consistent: false,
    explanationJa:
      '標本を取り直して平均するとE[X]の近くに来ますが、Nを大きくしても使う情報は1個のままです。',
    compute: (sample) => sample[0] ?? Number.NaN,
  },
  {
    id: 'ends',
    labelJa: '最初と最後の平均',
    shortLabelJa: '(X_1+X_N)/2',
    formulaJa: '(X_1 + X_N) / 2',
    usesAllData: false,
    unbiased: true,
    consistent: false,
    explanationJa:
      '標本を取り直して平均するとE[X]の近くに来ますが、Nが増えても両端の2個しか使いません。',
    compute: (sample) => {
      if (sample.length < 2) return Number.NaN;
      return (sample[0] + sample[sample.length - 1]) / 2;
    },
  },
  {
    id: 'mean',
    labelJa: '標本平均',
    shortLabelJa: '平均',
    formulaJa: '(X_1 + ... + X_N) / N',
    usesAllData: true,
    unbiased: true,
    consistent: true,
    explanationJa:
      '標本を取り直した中心もE[X]に近く、Nを大きくすると1回ごとの推定値もE[X]の近くに安定します。',
    compute: (sample) => sampleAverage(sample),
  },
  {
    id: 'rootSumSquares',
    labelJa: '二乗和ルート推定量',
    shortLabelJa: '√二乗和/N',
    formulaJa: '√(X_1^2 + ... + X_N^2) / N',
    usesAllData: true,
    unbiased: false,
    consistent: true,
    explanationJa:
      'すべてのデータを使いますが、有限Nでは正の値になりやすく、標本を取り直した中心はE[X]からずれます。一方、このページのE[X]=0の母集団では、Nを大きくすると0へ近づきます。',
    compute: (sample) => {
      if (sample.length === 0) return Number.NaN;
      const squaredSum = sample.reduce((sum, value) => sum + value * value, 0);
      return Math.sqrt(squaredSum) / sample.length;
    },
  },
];

export const ESTIMATOR_IDS: EstimatorId[] = ESTIMATOR_DEFINITIONS.map((definition) => definition.id);

export function computeEstimator(id: EstimatorId, sample: number[], options: EstimatorOptions = {}): number {
  const definition = ESTIMATOR_DEFINITIONS.find((item) => item.id === id);
  if (!definition) return Number.NaN;
  return definition.compute(sample, options);
}

export function estimatorDefinitionById(id: EstimatorId): EstimatorDefinition {
  const definition = ESTIMATOR_DEFINITIONS.find((item) => item.id === id);
  if (!definition) {
    throw new Error(`Unknown estimator: ${id}`);
  }
  return definition;
}
