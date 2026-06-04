import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  bivariateJointPdf,
  jointDistributionLabel,
  sampleBivariateSeries,
  transformLatentToJointPoint,
  type JointDistributionKind,
  type SamplePoint,
} from '../../lib/probability/random';
import { formatNumber, mapDomain } from '../../lib/visualization/scales';

type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'done';
type PlaybackSpeed = 'slow' | 'normal' | 'fast';
type ViewMode = 'surface' | 'contour';

const DOMAIN_MIN = -3.2;
const DOMAIN_MAX = 3.2;
const SVG_SIZE = 420;
const SVG_PADDING = 40;

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(query.matches);

    updatePreference();
    query.addEventListener('change', updatePreference);
    return () => query.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

function canUseWebGl(): boolean {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  return context !== null;
}

function speedToMs(speed: PlaybackSpeed): number {
  switch (speed) {
    case 'slow':
      return 900;
    case 'fast':
      return 130;
    case 'normal':
    default:
      return 440;
  }
}

function pointToSvg(point: SamplePoint): { x: number; y: number } {
  return {
    x: mapDomain(point.x, DOMAIN_MIN, DOMAIN_MAX, SVG_PADDING, SVG_SIZE - SVG_PADDING),
    y: mapDomain(point.y, DOMAIN_MIN, DOMAIN_MAX, SVG_SIZE - SVG_PADDING, SVG_PADDING),
  };
}

function clipPoint(point: SamplePoint): boolean {
  return point.x >= DOMAIN_MIN && point.x <= DOMAIN_MAX && point.y >= DOMAIN_MIN && point.y <= DOMAIN_MAX;
}

function buildContourPath(kind: JointDistributionKind, rho: number, radius: number): string {
  const points = Array.from({ length: 121 }, (_, index) => {
    const t = (Math.PI * 2 * index) / 120;
    const angle = Math.PI / 4;
    const rx = radius * Math.sqrt(Math.max(1 + rho, 0.1));
    const ry = radius * Math.sqrt(Math.max(1 - rho, 0.1));
    const latentPoint = {
      x: rx * Math.cos(t) * Math.cos(angle) - ry * Math.sin(t) * Math.sin(angle),
      y: rx * Math.cos(t) * Math.sin(angle) + ry * Math.sin(t) * Math.cos(angle),
    };
    return pointToSvg(transformLatentToJointPoint(kind, latentPoint));
  });

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function ContourView({ distribution, rho, showDistribution, realizedPoints, currentPoint, realizedCount, grainDurationMs, prefersReducedMotion }: {
  distribution: JointDistributionKind;
  rho: number;
  showDistribution: boolean;
  realizedPoints: SamplePoint[];
  currentPoint: SamplePoint | null;
  realizedCount: number;
  grainDurationMs: number;
  prefersReducedMotion: boolean;
}) {
  const center = SVG_SIZE / 2;
  const levels = [0.55, 0.85, 1.15, 1.5, 1.9, 2.35];
  const currentSvgPoint = currentPoint ? pointToSvg(currentPoint) : null;

  return (
    <svg className="contour-svg" viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} role="img" aria-label="同時分布の等高線と実現点">
      <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} rx="18" className="contour-bg" />
      <line x1={SVG_PADDING} y1={center} x2={SVG_SIZE - SVG_PADDING} y2={center} className="axis-line" />
      <line x1={center} y1={SVG_SIZE - SVG_PADDING} x2={center} y2={SVG_PADDING} className="axis-line" />
      <text x={SVG_SIZE - SVG_PADDING + 10} y={center + 4} className="axis-label">
        X
      </text>
      <text x={center + 8} y={SVG_PADDING - 12} className="axis-label">
        Y
      </text>

      {showDistribution
        ? levels.map((level) => (
            <path
              key={level}
              d={`${buildContourPath(distribution, rho, level)} Z`}
              className="contour-line"
            />
          ))
        : null}

      {realizedPoints.filter(clipPoint).map((point, index) => {
        const svgPoint = pointToSvg(point);
        return <circle key={`${index}-${point.x}-${point.y}`} cx={svgPoint.x} cy={svgPoint.y} r="3.4" className="sample-dot sample-dot--joint" />;
      })}

      {currentSvgPoint ? (
        <g key={`joint-grain-${realizedCount}`}>
          <line x1={currentSvgPoint.x} y1="20" x2={currentSvgPoint.x} y2={currentSvgPoint.y} className="drop-guide" />
          <circle
            cx={currentSvgPoint.x}
            cy={prefersReducedMotion ? currentSvgPoint.y : 20}
            r="6.2"
            className="sand-grain sand-grain--joint"
          >
            {prefersReducedMotion ? null : (
              <animate attributeName="cy" from="20" to={currentSvgPoint.y} dur={`${grainDurationMs}ms`} fill="freeze" />
            )}
          </circle>
        </g>
      ) : null}
    </svg>
  );
}

function buildSurfaceGeometry(distribution: JointDistributionKind, rho: number): THREE.BufferGeometry {
  const grid = 54;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row < grid; row += 1) {
    const z = DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) * row) / (grid - 1);
    for (let col = 0; col < grid; col += 1) {
      const x = DOMAIN_MIN + ((DOMAIN_MAX - DOMAIN_MIN) * col) / (grid - 1);
      const density = bivariateJointPdf(distribution, x, z, rho);
      vertices.push(x, density * 15, z);
    }
  }

  for (let row = 0; row < grid - 1; row += 1) {
    for (let col = 0; col < grid - 1; col += 1) {
      const a = row * grid + col;
      const b = a + 1;
      const c = a + grid;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function SurfaceMesh({ distribution, rho }: { distribution: JointDistributionKind; rho: number }) {
  const geometry = useMemo(() => buildSurfaceGeometry(distribution, rho), [distribution, rho]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry} position={[0, 0, 0]}>
      <meshStandardMaterial color="#8ab6ff" roughness={0.72} metalness={0.04} transparent opacity={0.72} side={THREE.DoubleSide} />
    </mesh>
  );
}

function GridPlane() {
  return (
    <gridHelper args={[7, 14, '#94a3b8', '#cbd5e1']} position={[0, -0.01, 0]} />
  );
}

function SurfacePoint({ point, highlight = false }: {
  point: SamplePoint;
  highlight?: boolean;
}) {
  return (
    <mesh position={[point.x, 0.06, point.y]}>
      <sphereGeometry args={[highlight ? 0.075 : 0.045, 16, 16]} />
      <meshStandardMaterial color={highlight ? '#f97316' : '#1d4ed8'} roughness={0.5} />
    </mesh>
  );
}

function FallingGrain3D({ point, tickKey, durationMs }: {
  point: SamplePoint;
  tickKey: number;
  durationMs: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const startRef = useRef<number | null>(null);
  const targetY = 0.1;
  const durationSeconds = durationMs / 1000;

  useEffect(() => {
    startRef.current = null;
  }, [tickKey]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (startRef.current === null) startRef.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startRef.current;
    const t = Math.min(1, elapsed / durationSeconds);
    const y = targetY + (4.2 - targetY) * (1 - t);
    ref.current.position.set(point.x, y, point.y);
  });

  return (
    <mesh ref={ref} position={[point.x, 4.2, point.y]}>
      <sphereGeometry args={[0.09, 18, 18]} />
      <meshStandardMaterial color="#f97316" roughness={0.35} />
    </mesh>
  );
}

function SurfaceView({ distribution, rho, showDistribution, realizedPoints, currentPoint, realizedCount, grainDurationMs, prefersReducedMotion }: {
  distribution: JointDistributionKind;
  rho: number;
  showDistribution: boolean;
  realizedPoints: SamplePoint[];
  currentPoint: SamplePoint | null;
  realizedCount: number;
  grainDurationMs: number;
  prefersReducedMotion: boolean;
}) {
  return (
    <div className="surface-canvas-wrap" aria-label="同時分布の3次元曲面">
      <Canvas camera={{ position: [4.7, 3.2, 5.4], fov: 44 }} dpr={[1, 1.6]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 3]} intensity={1.4} />
        {showDistribution ? <SurfaceMesh distribution={distribution} rho={rho} /> : null}
        <GridPlane />
        {realizedPoints.filter(clipPoint).map((point, index) => (
          <SurfacePoint key={`${index}-${point.x}-${point.y}`} point={point} />
        ))}
        {currentPoint && clipPoint(currentPoint) && prefersReducedMotion ? (
          <SurfacePoint point={currentPoint} highlight />
        ) : null}
        {currentPoint && clipPoint(currentPoint) && !prefersReducedMotion ? (
          <FallingGrain3D
            key={realizedCount}
            point={currentPoint}
            tickKey={realizedCount}
            durationMs={grainDurationMs}
          />
        ) : null}
        <OrbitControls enablePan={false} minDistance={4} maxDistance={10} />
      </Canvas>
    </div>
  );
}

export default function JointDistributionWidget() {
  const [mode, setMode] = useState<ViewMode>('contour');
  const [distribution, setDistribution] = useState<JointDistributionKind>('normal');
  const [rho, setRho] = useState(0.65);
  const [sampleSize, setSampleSize] = useState(40);
  const [seed, setSeed] = useState(31415);
  const [speed, setSpeed] = useState<PlaybackSpeed>('normal');
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [realizedCount, setRealizedCount] = useState(0);
  const [showDistribution, setShowDistribution] = useState(true);
  const [isWebGlAvailable, setIsWebGlAvailable] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();
  const playbackMs = prefersReducedMotion ? Math.min(180, speedToMs(speed)) : speedToMs(speed);
  const grainDurationMs = prefersReducedMotion ? 0 : Math.max(90, Math.min(playbackMs - 20, playbackMs * 0.82));

  const samples = useMemo(() => sampleBivariateSeries(distribution, sampleSize, seed, rho), [distribution, sampleSize, seed, rho]);
  const realizedPoints = useMemo(() => samples.slice(0, realizedCount), [realizedCount, samples]);
  const currentPoint = status === 'playing' && realizedCount < samples.length ? samples[realizedCount] : null;

  useEffect(() => {
    setIsWebGlAvailable(canUseWebGl());
  }, []);

  useEffect(() => {
    if (!isWebGlAvailable && mode === 'surface') {
      setMode('contour');
    }
  }, [isWebGlAvailable, mode]);

  useEffect(() => {
    setRealizedCount(0);
    setStatus('idle');
  }, [distribution, rho, sampleSize, seed]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (realizedCount >= sampleSize) {
      setStatus('done');
      return;
    }

    const id = window.setTimeout(() => {
      setRealizedCount((count) => {
        const nextCount = Math.min(count + 1, sampleSize);
        if (nextCount >= sampleSize) {
          setStatus('done');
        }
        return nextCount;
      });
    }, playbackMs);

    return () => window.clearTimeout(id);
  }, [playbackMs, realizedCount, sampleSize, status]);

  function play() {
    if (realizedCount >= sampleSize) {
      setRealizedCount(0);
    }
    setStatus('playing');
  }

  function pause() {
    setStatus((current) => (current === 'playing' ? 'paused' : current));
  }

  function reset() {
    setStatus('idle');
    setRealizedCount(0);
  }

  function realizeAll() {
    setStatus('done');
    setRealizedCount(sampleSize);
  }

  return (
    <section className="widget" aria-labelledby="joint-widget-title">
      <div className="widget__header">
        <div>
          <p className="eyebrow">Widget 2</p>
          <h2 id="joint-widget-title">2変数の確率変数が同時にデータになる</h2>
        </div>
        <p className="widget__message">
          2つの列は別々に生まれるのではありません。<code>(X_i, Y_i)</code> が同時に実現して、1行の{' '}
          <code>(x_i, y_i)</code> になります。
        </p>
      </div>

      <div className="control-grid" aria-label="2変量の操作">
        <label>
          同時分布
          <select value={distribution} onChange={(event) => setDistribution(event.target.value as JointDistributionKind)}>
            <option value="normal">2変量正規分布</option>
            <option value="rightSkewed">右に歪んだ同時分布</option>
          </select>
        </label>
        <fieldset className="segmented-control">
          <legend>表示モード</legend>
          <button type="button" className={mode === 'contour' ? 'is-selected' : undefined} onClick={() => setMode('contour')}>
            等高線
          </button>
          <button
            type="button"
            className={mode === 'surface' ? 'is-selected' : undefined}
            onClick={() => setMode('surface')}
            disabled={!isWebGlAvailable}
          >
            3D立体
          </button>
        </fieldset>
        <label>
          相関 ρ: {formatNumber(rho, 2)}
          <input
            type="range"
            min="-0.9"
            max="0.9"
            step="0.05"
            value={rho}
            onChange={(event) => setRho(Number(event.target.value))}
          />
        </label>
        <label>
          サンプルサイズ N
          <select value={sampleSize} onChange={(event) => setSampleSize(Number(event.target.value))}>
            <option value={10}>10</option>
            <option value={40}>40</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
        </label>
        <label>
          seed（種）
          <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} />
        </label>
        <label>
          再生速度
          <select value={speed} onChange={(event) => setSpeed(event.target.value as PlaybackSpeed)}>
            <option value="slow">ゆっくり</option>
            <option value="normal">標準</option>
            <option value="fast">速い</option>
          </select>
        </label>
      </div>

      <div className="button-row" aria-label="2変量の再生操作">
        <button type="button" onClick={play} disabled={status === 'playing'}>
          再生
        </button>
        <button type="button" onClick={pause} disabled={status !== 'playing'}>
          停止
        </button>
        <button type="button" onClick={reset}>
          実現前に戻す
        </button>
        <button type="button" onClick={realizeAll}>
          一括実現
        </button>
        <button type="button" className="button-row__secondary" onClick={() => setShowDistribution((current) => !current)}>
          {showDistribution ? '確率分布を消す' : '確率分布を表示'}
        </button>
      </div>

      <div className="widget__body widget__body--two-columns">
        <div className="viz-panel">
          <div className="viz-panel__title">
            <strong>
              {jointDistributionLabel(distribution)}：{mode === 'surface' ? '3D立体表示' : '等高線表示'}
            </strong>
            <span>
              実現済み {realizedCount} / {sampleSize}
            </span>
          </div>
          {mode === 'surface' ? (
            <SurfaceView
              distribution={distribution}
              rho={rho}
              showDistribution={showDistribution}
              realizedPoints={realizedPoints}
              currentPoint={currentPoint}
              realizedCount={realizedCount}
              grainDurationMs={grainDurationMs}
              prefersReducedMotion={prefersReducedMotion}
            />
          ) : (
            <ContourView
              distribution={distribution}
              rho={rho}
              showDistribution={showDistribution}
              realizedPoints={realizedPoints}
              currentPoint={currentPoint}
              realizedCount={realizedCount}
              grainDurationMs={grainDurationMs}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}
          <div className="stat-strip">
            <span>{jointDistributionLabel(distribution)}</span>
            <span>ρ = {formatNumber(rho, 2)}</span>
            <span>{rho > 0.08 ? '右上がりの同時変動' : rho < -0.08 ? '右下がりの同時変動' : 'ほぼ無相関'}</span>
            {!showDistribution ? <span>確率分布を非表示</span> : null}
            {!isWebGlAvailable ? <span>3D非対応のため等高線表示</span> : null}
          </div>
        </div>

        <div className="table-panel" aria-label="2変量の確率変数と実現値の表">
          <div className="table-panel__title">ペアとして実現するN行の表</div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>i</th>
                  <th>実現前</th>
                  <th>データ</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((point, index) => {
                  const isRealized = index < realizedCount;
                  const isCurrent = index === realizedCount && status === 'playing';
                  return (
                    <tr key={index} className={isCurrent ? 'is-current' : isRealized ? 'is-realized' : undefined}>
                      <td>{index + 1}</td>
                      <td>
                        <code>(X_{index + 1}, Y_{index + 1})</code>
                      </td>
                      <td>
                        {isRealized ? (
                          <code>
                            (x_{index + 1}, y_{index + 1}) = ({formatNumber(point.x)}, {formatNumber(point.y)})
                          </code>
                        ) : (
                          '?'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
