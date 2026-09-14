import { intensityLevel, levelOpacity } from '../lib/muscleGroups'

const FILL = '139, 92, 246' // violet-500 en rgb, para poder variar la opacidad

function Region({ shape, group, count, maxCount, children }) {
  const level = intensityLevel(count, maxCount)
  const opacity = levelOpacity(level)
  const Tag = shape
  return (
    <Tag
      {...children}
      fill={`rgba(${FILL}, ${opacity})`}
      stroke="#64748b"
      strokeWidth="1.5"
    >
      <title>
        {group}: {count} {count === 1 ? 'serie' : 'series'}
      </title>
    </Tag>
  )
}

function BodyFront({ volumes, maxCount }) {
  return (
    <svg viewBox="0 0 120 300" className="w-full max-w-[140px]">
      <circle cx="60" cy="24" r="15" fill="#334155" />
      <rect x="53" y="36" width="14" height="14" rx="5" fill="#334155" />
      <Region shape="ellipse" group="Hombros" count={volumes.Hombros ?? 0} maxCount={maxCount}>
        {{ cx: 34, cy: 54, rx: 15, ry: 11 }}
      </Region>
      <Region shape="ellipse" group="Hombros" count={volumes.Hombros ?? 0} maxCount={maxCount}>
        {{ cx: 86, cy: 54, rx: 15, ry: 11 }}
      </Region>
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0} maxCount={maxCount}>
        {{ x: 11, y: 58, width: 16, height: 88, rx: 8 }}
      </Region>
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0} maxCount={maxCount}>
        {{ x: 93, y: 58, width: 16, height: 88, rx: 8 }}
      </Region>
      <Region shape="rect" group="Pecho" count={volumes.Pecho ?? 0} maxCount={maxCount}>
        {{ x: 34, y: 46, width: 52, height: 44, rx: 10 }}
      </Region>
      <Region shape="rect" group="Abdomen" count={volumes.Abdomen ?? 0} maxCount={maxCount}>
        {{ x: 40, y: 93, width: 40, height: 40, rx: 8 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0} maxCount={maxCount}>
        {{ x: 37, y: 137, width: 20, height: 118, rx: 9 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0} maxCount={maxCount}>
        {{ x: 63, y: 137, width: 20, height: 118, rx: 9 }}
      </Region>
    </svg>
  )
}

function BodyBack({ volumes, maxCount }) {
  return (
    <svg viewBox="0 0 120 300" className="w-full max-w-[140px]">
      <circle cx="60" cy="24" r="15" fill="#334155" />
      <rect x="53" y="36" width="14" height="14" rx="5" fill="#334155" />
      <Region shape="ellipse" group="Espalda" count={volumes.Espalda ?? 0} maxCount={maxCount}>
        {{ cx: 34, cy: 54, rx: 15, ry: 11 }}
      </Region>
      <Region shape="ellipse" group="Espalda" count={volumes.Espalda ?? 0} maxCount={maxCount}>
        {{ cx: 86, cy: 54, rx: 15, ry: 11 }}
      </Region>
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0} maxCount={maxCount}>
        {{ x: 11, y: 58, width: 16, height: 88, rx: 8 }}
      </Region>
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0} maxCount={maxCount}>
        {{ x: 93, y: 58, width: 16, height: 88, rx: 8 }}
      </Region>
      <Region shape="rect" group="Espalda" count={volumes.Espalda ?? 0} maxCount={maxCount}>
        {{ x: 32, y: 46, width: 56, height: 71, rx: 10 }}
      </Region>
      <Region shape="rect" group="Gluteos" count={volumes.Gluteos ?? 0} maxCount={maxCount}>
        {{ x: 36, y: 119, width: 48, height: 27, rx: 9 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0} maxCount={maxCount}>
        {{ x: 37, y: 148, width: 20, height: 107, rx: 9 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0} maxCount={maxCount}>
        {{ x: 63, y: 148, width: 20, height: 107, rx: 9 }}
      </Region>
    </svg>
  )
}

const LEGEND = [
  { label: 'Sin trabajar', level: 0 },
  { label: 'Poco', level: 1 },
  { label: 'Medio', level: 2 },
  { label: 'Bastante', level: 3 },
  { label: 'El más trabajado', level: 4 },
]

const GROUP_LABELS = [
  { group: 'Pecho', label: 'Pecho' },
  { group: 'Espalda', label: 'Espalda' },
  { group: 'Hombros', label: 'Hombro' },
  { group: 'Brazos', label: 'Brazo' },
  { group: 'Abdomen', label: 'Abdomen' },
  { group: 'Gluteos', label: 'Glúteo' },
  { group: 'Piernas', label: 'Piernas' },
]

export default function MuscleMap({ volumes }) {
  const maxCount = Math.max(0, ...Object.values(volumes))

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
      <p className="mb-4 text-sm font-medium text-white">Grupos musculares trabajados</p>
      <div className="flex justify-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <BodyFront volumes={volumes} maxCount={maxCount} />
          <span className="text-xs text-white">Frontal</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BodyBack volumes={volumes} maxCount={maxCount} />
          <span className="text-xs text-white">Trasera</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GROUP_LABELS.map(({ group, label }) => (
          <div
            key={group}
            className="flex flex-col items-center rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-1.5"
          >
            <span className="text-xs text-white">{label}</span>
            <span className="text-sm font-semibold text-violet-300">{volumes[group] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-slate-600"
              style={{ backgroundColor: `rgba(${FILL}, ${levelOpacity(l.level)})` }}
            />
            <span className="text-xs text-white">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
