import { intensityLevel, levelOpacity } from '../lib/muscleGroups'

const FILL = '139, 92, 246' // violet-500 en rgb, para poder variar la opacidad

function Region({ shape, group, count, children }) {
  const level = intensityLevel(count)
  const opacity = levelOpacity(level)
  const Tag = shape
  return (
    <Tag
      {...children}
      fill={`rgba(${FILL}, ${opacity})`}
      stroke="#475569"
      strokeWidth="1.5"
    >
      <title>
        {group}: {count} {count === 1 ? 'serie' : 'series'}
      </title>
    </Tag>
  )
}

function BodyFront({ volumes }) {
  return (
    <svg viewBox="0 0 120 300" className="w-full max-w-[140px]">
      <circle cx="60" cy="25" r="16" fill="#334155" />
      <Region shape="ellipse" group="Hombros" count={volumes.Hombros ?? 0}>
        {{ cx: 32, cy: 56, rx: 13, ry: 10 }}
      </Region>
      <Region shape="ellipse" group="Hombros" count={volumes.Hombros ?? 0}>
        {{ cx: 88, cy: 56, rx: 13, ry: 10 }}
      </Region>
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0}>
        {{ x: 10, y: 58, width: 17, height: 85, rx: 8 }}
      </Region>
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0}>
        {{ x: 93, y: 58, width: 17, height: 85, rx: 8 }}
      </Region>
      <Region shape="rect" group="Pecho" count={volumes.Pecho ?? 0}>
        {{ x: 35, y: 48, width: 50, height: 42, rx: 8 }}
      </Region>
      <Region shape="rect" group="Abdomen" count={volumes.Abdomen ?? 0}>
        {{ x: 39, y: 92, width: 42, height: 40, rx: 6 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0}>
        {{ x: 36, y: 136, width: 20, height: 115, rx: 8 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0}>
        {{ x: 64, y: 136, width: 20, height: 115, rx: 8 }}
      </Region>
    </svg>
  )
}

function BodyBack({ volumes }) {
  return (
    <svg viewBox="0 0 120 300" className="w-full max-w-[140px]">
      <circle cx="60" cy="25" r="16" fill="#334155" />
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0}>
        {{ x: 10, y: 58, width: 17, height: 85, rx: 8 }}
      </Region>
      <Region shape="rect" group="Brazos" count={volumes.Brazos ?? 0}>
        {{ x: 93, y: 58, width: 17, height: 85, rx: 8 }}
      </Region>
      <Region shape="rect" group="Espalda" count={volumes.Espalda ?? 0}>
        {{ x: 33, y: 48, width: 54, height: 68, rx: 8 }}
      </Region>
      <Region shape="rect" group="Gluteos" count={volumes.Gluteos ?? 0}>
        {{ x: 37, y: 118, width: 46, height: 26, rx: 8 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0}>
        {{ x: 36, y: 146, width: 20, height: 105, rx: 8 }}
      </Region>
      <Region shape="rect" group="Piernas" count={volumes.Piernas ?? 0}>
        {{ x: 64, y: 146, width: 20, height: 105, rx: 8 }}
      </Region>
    </svg>
  )
}

const LEGEND = [
  { label: '0', level: 0 },
  { label: '1-30', level: 1 },
  { label: '31-60', level: 2 },
  { label: '61-200', level: 3 },
  { label: '200+', level: 4 },
]

export default function MuscleMap({ volumes }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-4 text-sm font-medium text-slate-600">Grupos musculares trabajados</p>
      <div className="flex justify-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <BodyFront volumes={volumes} />
          <span className="text-xs text-slate-500">Frontal</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BodyBack volumes={volumes} />
          <span className="text-xs text-slate-500">Trasera</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm border border-slate-400"
              style={{ backgroundColor: `rgba(${FILL}, ${levelOpacity(l.level)})` }}
            />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
