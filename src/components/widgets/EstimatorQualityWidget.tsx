import { useMemo, useState, type ChangeEvent } from 'react';
import {
  ESTIMATOR_DEFINITIONS,
  estimatorDefinitionById,
  type EstimatorId,
} from '../../lib/probability/estimators';
import {
  generateEstimatorSample,
  populationExpectedValue,
  populationLabelJa,
  simulateEstimatorResampling,
  simulateEstimatorTrajectories,
  summarizeEstimatorMetrics,
  type EstimatorMetric,
  type EstimatorPopulationType,
  type EstimatorResamplingResult,
  type EstimatorTrajectoryPoint,
  type EstimatorViewMode,
  type EstimatorValues,
} from '../../lib/probability/estimatorSimulation';
import { clamp, formatNumber, mapDomain } from '../../lib/visualization/scales';

const SAMPLE_SIZES = [2, 5, 10, 30, 100, 300, 1000];
const MAX_SAMPLE_SIZES = [30, 100, 300, 1000];
const RESAMPLE_COUNTS = [100, 500, 1000];
const ALL_ESTIMATORS: EstimatorId[] = ['first', 'ends', 'mean', 'rootSumSquares'];
const ESTIMATOR_COLORS: Record<EstimatorId, string> = {
  first: '#2563eb',
  ends: '#0f766e',
  mean: '#f97316',
  rootSumSquares: '#be123c',
};
const ESTIMATOR_DASH: Record<EstimatorId, string | undefined> = {
  first: undefined,
  ends: '5 4',
  mean: undefined,
  rootSumSquares: '8 5',
};

function finiteExtent(values: number[], fallback: [number, number], paddingRatio = 0.14): [number, number] {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return fallback;
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (min === max) return [min - 1, max + 1];
  const padding = (max - min) * paddingRatio;
  return [min - padding, max + padding];
}

function estimateValue(values: EstimatorValues, estimatorId: EstimatorId): number {
  return values[estimatorId];
}

function visibleMetrics(metrics: EstimatorMetric[], visibleEstimators: EstimatorId[]): EstimatorMetric[] {
  return metrics.filter((metric) => visibleEstimators.includes(metric.estimatorId));
}

function buildTrajectoryPath(
  points: EstimatorTrajectoryPoint[],
  estimatorId: EstimatorId,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): string {
  return points
    .map((point, index) => {
      const x = mapDomain(Math.log(point.sampleSize), Math.log(xMin), Math.log(xMax), 58, 690);
      const y = mapDomain(estimateValue(point.values, estimatorId), yMin, yMax, 236, 28);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function CurrentSamplePlot({
  sample,
  estimates,
  visibleEstimators,
  targetExpectation,
}: {
  sample: number[];
  estimates: EstimatorValues;
  visibleEstimators: EstimatorId[];
  targetExpectation: number;
}) {
  const sampleForDisplay = sample.slice(0, 650);
  const estimatorValues = visibleEstimators.map((id) => estimates[id]);
  const [xMin, xMax] = finiteExtent([...sample, ...estimatorValues, targetExpectation], [-4, 4]);
  const targetX = mapDomain(targetExpectation, xMin, xMax, 48, 692);

  return (
    <svg className="estimator-svg estimator-svg--sample" viewBox="0 0 740 170" role="img" aria-label="現在の標本点と推定値">
      <line x1="48" y1="118" x2="692" y2="118" className="axis-line" />
      <line x1={targetX} y1="28" x2={targetX} y2="130" className="estimator-target-line" />
      {sampleForDisplay.map((value, index) => {
        const x = clamp(mapDomain(value, xMin, xMax, 48, 692), 48, 692);
        const y = 118 - ((index * 17) % 40);
        return <circle key={`${value}-${index}`} cx={x} cy={y} r="2.4" className="sample-dot" />;
      })}
      {visibleEstimators.map((estimatorId) => {
        const x = clamp(mapDomain(estimates[estimatorId], xMin, xMax, 48, 692), 48, 692);
        return (
          <g key={estimatorId}>
            <line
              x1={x}
              y1="24"
              x2={x}
              y2="145"
              stroke={ESTIMATOR_COLORS[estimatorId]}
              strokeWidth="2.2"
              strokeDasharray={ESTIMATOR_DASH[estimatorId]}
            />
            <circle cx={x} cy="24" r="5.5" fill={ESTIMATOR_COLORS[estimatorId]} />
          </g>
        );
      })}
      <text x="48" y="154" className="axis-label">
        現在の標本点 {sampleForDisplay.length < sample.length ? `（${sampleForDisplay.length}個だけ表示）` : ''}
      </text>
    </svg>
  );
}

function TrajectoryPlot({
  points,
  visibleEstimators,
  targetExpectation,
}: {
  points: EstimatorTrajectoryPoint[];
  visibleEstimators: EstimatorId[];
  targetExpectation: number;
}) {
  const yValues = points.flatMap((point) => visibleEstimators.map((id) => point.values[id]));
  const [yMin, yMax] = finiteExtent([...yValues, targetExpectation], [-2, 2]);
  const xMin = Math.max(2, points[0]?.sampleSize ?? 2);
  const xMax = Math.max(xMin + 1, points[points.length - 1]?.sampleSize ?? 100);
  const targetY = mapDomain(targetExpectation, yMin, yMax, 236, 28);
  const ticks = [2, 10, 30, 100, 300, 1000].filter((tick) => tick >= xMin && tick <= xMax);

  return (
    <svg className="estimator-svg" viewBox="0 0 740 270" role="img" aria-label="Nを大きくしたときの推定値の軌跡">
      <line x1="58" y1="236" x2="690" y2="236" className="axis-line" />
      <line x1="58" y1="28" x2="58" y2="236" className="axis-line" />
      <line x1="58" y1={targetY} x2="690" y2={targetY} className="estimator-target-line" />
      <text x="610" y={targetY - 7} className="axis-label">
        E[X]
      </text>
      {ticks.map((tick) => {
        const x = mapDomain(Math.log(tick), Math.log(xMin), Math.log(xMax), 58, 690);
        return (
          <g key={tick}>
            <line x1={x} y1="236" x2={x} y2="242" className="tick-line" />
            <text x={x - 10} y="258" className="axis-label">
              {tick}
            </text>
          </g>
        );
      })}
      {visibleEstimators.map((estimatorId) => (
        <path
          key={estimatorId}
          d={buildTrajectoryPath(points, estimatorId, xMin, xMax, yMin, yMax)}
          fill="none"
          stroke={ESTIMATOR_COLORS[estimatorId]}
          strokeWidth="2.8"
          strokeDasharray={ESTIMATOR_DASH[estimatorId]}
        />
      ))}
      {visibleEstimators.map((estimatorId) =>
        points.map((point) => {
          const x = mapDomain(Math.log(point.sampleSize), Math.log(xMin), Math.log(xMax), 58, 690);
          const y = mapDomain(point.values[estimatorId], yMin, yMax, 236, 28);
          return <circle key={`${estimatorId}-${point.sampleSize}`} cx={x} cy={y} r="3" fill={ESTIMATOR_COLORS[estimatorId]} />;
        }),
      )}
      <text x="330" y="266" className="axis-label">
        N
      </text>
    </svg>
  );
}

function ResamplingPlot({
  results,
  metrics,
  visibleEstimators,
  targetExpectation,
}: {
  results: EstimatorResamplingResult[];
  metrics: EstimatorMetric[];
  visibleEstimators: EstimatorId[];
  targetExpectation: number;
}) {
  const values = results.flatMap((result) => visibleEstimators.map((id) => result.values[id]));
  const meanValues = visibleMetrics(metrics, visibleEstimators).map((metric) => metric.resamplingMean);
  const [xMin, xMax] = finiteExtent([...values, ...meanValues, targetExpectation], [-3, 3]);
  const targetX = mapDomain(targetExpectation, xMin, xMax, 72, 694);
  const rowStep = 194 / Math.max(visibleEstimators.length, 1);

  return (
    <svg className="estimator-svg" viewBox="0 0 740 270" role="img" aria-label="標本を取り直したときの推定値分布">
      <line x1="72" y1="236" x2="694" y2="236" className="axis-line" />
      <line x1={targetX} y1="28" x2={targetX} y2="236" className="estimator-target-line" />
      <text x={targetX + 7} y="42" className="axis-label">
        E[X]
      </text>
      {visibleEstimators.map((estimatorId, rowIndex) => {
        const y = 54 + rowIndex * rowStep;
        const definition = estimatorDefinitionById(estimatorId);
        const metric = metrics.find((item) => item.estimatorId === estimatorId);
        const meanX = metric ? mapDomain(metric.resamplingMean, xMin, xMax, 72, 694) : 72;
        return (
          <g key={estimatorId}>
            <line x1="72" y1={y} x2="694" y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x="12" y={y + 4} className="axis-label">
              {definition.shortLabelJa}
            </text>
            {results.map((result) => {
              const x = clamp(mapDomain(result.values[estimatorId], xMin, xMax, 72, 694), 72, 694);
              const jitter = (((result.index * 37 + rowIndex * 19) % 100) / 100 - 0.5) * Math.min(rowStep * 0.62, 34);
              return (
                <circle
                  key={`${estimatorId}-${result.index}`}
                  cx={x}
                  cy={y + jitter}
                  r="2.1"
                  fill={ESTIMATOR_COLORS[estimatorId]}
                  opacity="0.34"
                />
              );
            })}
            <circle cx={meanX} cy={y} r="6" fill={ESTIMATOR_COLORS[estimatorId]} stroke="#fff" strokeWidth="2" />
          </g>
        );
      })}
      <text x="285" y="258" className="axis-label">
        推定値
      </text>
    </svg>
  );
}

function EstimatorLegend({ visibleEstimators }: { visibleEstimators: EstimatorId[] }) {
  return (
    <div className="estimator-legend" aria-label="推定量の凡例">
      {visibleEstimators.map((estimatorId) => {
        const definition = estimatorDefinitionById(estimatorId);
        return (
          <span key={estimatorId}>
            <i style={{ background: ESTIMATOR_COLORS[estimatorId] }} />
            {definition.labelJa}
          </span>
        );
      })}
    </div>
  );
}

export default function EstimatorQualityWidget() {
  const [populationType, setPopulationType] = useState<EstimatorPopulationType>('normal');
  const [sampleSize, setSampleSize] = useState(30);
  const [maxSampleSize, setMaxSampleSize] = useState(1000);
  const [resampleCount, setResampleCount] = useState(500);
  const [seed, setSeed] = useState(2026);
  const [viewMode, setViewMode] = useState<EstimatorViewMode>('compare');
  const [visibleEstimators, setVisibleEstimators] = useState<EstimatorId[]>(ALL_ESTIMATORS);
  const [showPropertyCards, setShowPropertyCards] = useState(true);

  const effectiveMaxSampleSize = Math.max(sampleSize, maxSampleSize);
  const targetExpectation = populationExpectedValue(populationType);
  const currentSample = useMemo(
    () => generateEstimatorSample(populationType, sampleSize, seed),
    [populationType, sampleSize, seed],
  );
  const currentEstimates = useMemo(() => {
    const values: EstimatorValues = {
      first: 0,
      ends: 0,
      mean: 0,
      rootSumSquares: 0,
    };
    for (const definition of ESTIMATOR_DEFINITIONS) {
      values[definition.id] = definition.compute(currentSample);
    }
    return values;
  }, [currentSample]);
  const trajectoryPoints = useMemo(
    () =>
      simulateEstimatorTrajectories({
        populationType,
        maxSampleSize: effectiveMaxSampleSize,
        seed,
      }),
    [effectiveMaxSampleSize, populationType, seed],
  );
  const resamplingResults = useMemo(
    () =>
      simulateEstimatorResampling({
        populationType,
        sampleSize,
        resampleCount,
        seed,
      }),
    [populationType, resampleCount, sampleSize, seed],
  );
  const metrics = useMemo(
    () => summarizeEstimatorMetrics(resamplingResults, targetExpectation),
    [resamplingResults, targetExpectation],
  );

  const handleSampleSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSampleSize = Number(event.target.value);
    setSampleSize(nextSampleSize);
    setMaxSampleSize((current) => Math.max(current, nextSampleSize));
  };

  const toggleEstimator = (estimatorId: EstimatorId) => {
    setVisibleEstimators((current) => {
      if (current.includes(estimatorId)) {
        if (current.length === 1) return current;
        return current.filter((id) => id !== estimatorId);
      }
      return ALL_ESTIMATORS.filter((id) => current.includes(id) || id === estimatorId);
    });
  };

  const canShowGrowingN = viewMode === 'growingN' || viewMode === 'compare';
  const canShowResampling = viewMode === 'resampling' || viewMode === 'compare';

  return (
    <section className="widget estimator-quality">
      <div className="widget__header">
        <div>
          <p className="eyebrow">Estimator Quality</p>
          <h2>よい平均の当て方はどれか</h2>
        </div>
        <p className="widget__message">
          目標は見えない期待値 E[X] です。不偏性は「標本を取り直したときの中心」、一致性は「Nを大きくしたときの動き」として比べます。
        </p>
      </div>

      <div className="control-grid">
        <label>
          母集団分布
          <select value={populationType} onChange={(event) => setPopulationType(event.target.value as EstimatorPopulationType)}>
            <option value="normal">正規分布</option>
            <option value="rightSkewed">右に歪んだ分布</option>
            <option value="bimodal">二山型分布</option>
          </select>
        </label>
        <label>
          サンプルサイズ N
          <select value={sampleSize} onChange={handleSampleSizeChange}>
            {SAMPLE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label>
          最大 N
          <select value={maxSampleSize} onChange={(event) => setMaxSampleSize(Number(event.target.value))}>
            {MAX_SAMPLE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label>
          標本を取り直す回数 B
          <select value={resampleCount} onChange={(event) => setResampleCount(Number(event.target.value))}>
            {RESAMPLE_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <label>
          seed（種）
          <input type="number" min="1" step="1" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
        </label>
        <fieldset className="segmented-control segmented-control--three">
          <legend>表示モード</legend>
          <button
            type="button"
            className={viewMode === 'growingN' ? 'is-selected' : ''}
            onClick={() => setViewMode('growingN')}
          >
            Nを大きくする
          </button>
          <button
            type="button"
            className={viewMode === 'resampling' ? 'is-selected' : ''}
            onClick={() => setViewMode('resampling')}
          >
            標本を取り直す
          </button>
          <button type="button" className={viewMode === 'compare' ? 'is-selected' : ''} onClick={() => setViewMode('compare')}>
            2つを並べる
          </button>
        </fieldset>
      </div>

      <div className="estimator-options">
        <div className="estimator-options__group" aria-label="表示する推定量">
          {ESTIMATOR_DEFINITIONS.map((definition) => (
            <label key={definition.id}>
              <input
                type="checkbox"
                checked={visibleEstimators.includes(definition.id)}
                onChange={() => toggleEstimator(definition.id)}
              />
              <span>
                <strong>{definition.labelJa}</strong>
                <small>{definition.formulaJa}</small>
              </span>
            </label>
          ))}
        </div>
        <label className="estimator-options__toggle">
          <input
            type="checkbox"
            checked={showPropertyCards}
            onChange={(event) => setShowPropertyCards(event.target.checked)}
          />
          性質カードを表示
        </label>
      </div>

      <div className="estimator-formula-grid" aria-label="4種類の推定量">
        {ESTIMATOR_DEFINITIONS.map((definition) => (
          <div className="estimator-formula-card" key={definition.id}>
            <span className="estimator-formula-card__name">
              <i style={{ background: ESTIMATOR_COLORS[definition.id] }} />
              {definition.labelJa}
            </span>
            <span className="estimator-formula-card__formula">{definition.formulaJa}</span>
          </div>
        ))}
      </div>

      <div className="viz-panel estimator-current-panel">
        <div className="viz-panel__title">
          <strong>現在の標本</strong>
          <span>
            背後の確率変数: X_1, ..., X_N / {populationLabelJa(populationType)} / E[X] ={' '}
            {formatNumber(targetExpectation, 1)}
          </span>
        </div>
        <CurrentSamplePlot
          sample={currentSample}
          estimates={currentEstimates}
          visibleEstimators={visibleEstimators}
          targetExpectation={targetExpectation}
        />
        <EstimatorLegend visibleEstimators={visibleEstimators} />
      </div>

      <div className={viewMode === 'compare' ? 'widget__body--two-columns estimator-compare-grid' : 'estimator-single-grid'}>
        {canShowGrowingN && (
          <div className="viz-panel">
            <div className="viz-panel__title">
              <strong>Nを大きくしたとき</strong>
              <span>1つの長い標本を先頭から増やして見る</span>
            </div>
            <TrajectoryPlot
              points={trajectoryPoints}
              visibleEstimators={visibleEstimators}
              targetExpectation={targetExpectation}
            />
          </div>
        )}
        {canShowResampling && (
          <div className="viz-panel">
            <div className="viz-panel__title">
              <strong>同じNで標本を取り直したとき</strong>
              <span>{resampleCount}回の推定値</span>
            </div>
            <ResamplingPlot
              results={resamplingResults}
              metrics={metrics}
              visibleEstimators={visibleEstimators}
              targetExpectation={targetExpectation}
            />
          </div>
        )}
      </div>

      <div className="table-panel table-panel--wide">
        <div className="table-panel__title">
          <strong>標本を取り直した結果の要約</strong>
          <span>中心がE[X]からずれるか、どれくらいブレるか</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>推定量</th>
                <th>取り直した平均</th>
                <th>bias（ずれ）</th>
                <th>variance（ブレ）</th>
                <th>MSE</th>
              </tr>
            </thead>
            <tbody>
              {visibleMetrics(metrics, visibleEstimators).map((metric) => {
                const definition = estimatorDefinitionById(metric.estimatorId);
                return (
                  <tr key={metric.estimatorId}>
                    <td>
                      <strong>{definition.labelJa}</strong>
                      <br />
                      <span className="table-muted">{definition.formulaJa}</span>
                    </td>
                    <td>{formatNumber(metric.resamplingMean, 3)}</td>
                    <td>{formatNumber(metric.bias, 3)}</td>
                    <td>{formatNumber(metric.variance, 3)}</td>
                    <td>{formatNumber(metric.mse, 3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPropertyCards && (
        <div className="estimator-property-grid">
          {ESTIMATOR_DEFINITIONS.map((definition) => (
            <article className="estimator-property-card" key={definition.id}>
              <div className="estimator-property-card__title">
                <i style={{ background: ESTIMATOR_COLORS[definition.id] }} />
                <strong>{definition.labelJa}</strong>
              </div>
              <p>{definition.explanationJa}</p>
              <div className="estimator-badges">
                <span className={definition.unbiased ? 'is-good' : 'is-weak'}>
                  不偏性 {definition.unbiased ? 'あり' : 'なし'}
                </span>
                <span className={definition.consistent ? 'is-good' : 'is-weak'}>
                  一致性 {definition.consistent ? 'あり' : 'なし'}
                </span>
                <span>{definition.usesAllData ? '全データを使う' : '一部だけ使う'}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
