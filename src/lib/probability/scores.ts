import {
  type DensityPoint,
  type GuessDistributionSpec,
  type TrueDistributionSpec,
  guessDistributionLabel,
  guessDistributionPdf,
  trueDistributionLabel,
} from './distributionGuessing';

export type DataFitLabel = 'とても良い' | 'かなり良い' | '少し苦しい' | 'かなり苦しい';

export function calculateShapeScore(guessDensity: DensityPoint[], trueDensity: DensityPoint[]): number {
  const count = Math.min(guessDensity.length, trueDensity.length);
  if (count === 0) return 0;

  const averageDifference =
    guessDensity.slice(0, count).reduce((sum, point, index) => sum + Math.abs(point.y - trueDensity[index].y), 0) /
    count;

  return Math.round(Math.max(0, Math.min(100, 100 * (1 - averageDifference * 2.8))));
}

export function classifyDataFit(samples: number[], guessSpec: GuessDistributionSpec): DataFitLabel {
  if (samples.length === 0) return '少し苦しい';

  const averageLogLikelihood =
    samples.reduce((sum, value) => sum + Math.log(Math.max(guessDistributionPdf(guessSpec, value), 1e-6)), 0) /
    samples.length;

  if (averageLogLikelihood > -1.55) return 'とても良い';
  if (averageLogLikelihood > -2.15) return 'かなり良い';
  if (averageLogLikelihood > -3.05) return '少し苦しい';
  return 'かなり苦しい';
}

export function buildLearningComment(args: {
  trueDistribution: TrueDistributionSpec;
  guessDistribution: GuessDistributionSpec;
  n: number;
  showHistogram: boolean;
  showKde: boolean;
  shapeScore: number;
}): string {
  const trueType = args.trueDistribution.type;
  const guessType = args.guessDistribution.type;

  if (args.n <= 30) {
    return 'このNでは点の並びに偶然の揺れがかなり残ります。違う形に見えても自然なので、同じ分布でNを増やして形がどう見えてくるかを比べてください。';
  }

  if (trueType === 'bimodal' && guessType !== 'twoPeaks') {
    return '真の分布は山が2つあります。Nが小さいと片方の山が弱く見え、山が1つの分布にも見えやすくなります。';
  }

  if ((trueType === 'rightSkewed' || trueType === 'leftSkewed') && guessType !== 'skewed') {
    return '尾の方向にある点は、単なる外れ値ではなく、歪んだ分布から自然に出た点かもしれません。';
  }

  if (args.showHistogram && !args.showKde) {
    return 'ヒストグラムは点の集まりを見やすくしますが、bin（階級）数を変えると山の見え方も変わります。';
  }

  if (args.showKde) {
    return 'KDE（カーネル密度推定）は滑らかな形を見せますが、bandwidth（帯域幅）によって細部の見え方が変わります。';
  }

  if (args.shapeScore >= 80) {
    return `かなり近い形を選べています。ただし、有限個の点から${trueDistributionLabel(trueType)}を一意に当てたわけではなく、もっともらしい形を選んでいます。`;
  }

  return `予想は「${guessDistributionLabel(guessType)}」、真の分布は「${trueDistributionLabel(trueType)}」でした。外れたことより、どの点がその判断を難しくしたかを見るのが大事です。`;
}
