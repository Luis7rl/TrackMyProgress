// Diccionario de palabras clave (ejercicio -> grupo muscular). Se recorre en orden y gana la
// primera coincidencia, así que las entradas más específicas van primero.
const RULES = [
  { group: 'Hombros', keywords: ['press militar', 'press hombro', 'shoulder press', 'elevacion lateral', 'elevaciones laterales', 'lateral raise', 'press arnold', 'arnold press', 'pajaro', 'face pull'] },
  { group: 'Brazos', keywords: ['curl biceps', 'curl biceps', 'biceps curl', 'curl martillo', 'hammer curl', 'curl predicador', 'preacher curl', 'triceps', 'extension triceps', 'fondos', 'dips', 'jalon triceps', 'patada de triceps', 'kickback'] },
  { group: 'Pecho', keywords: ['press banca', 'bench press', 'press pecho', 'chest press', 'aperturas', 'fly', 'flye', 'press inclinado', 'incline press', 'pullover'] },
  { group: 'Espalda', keywords: ['dominadas', 'pull up', 'pullup', 'jalon', 'lat pulldown', 'remo', 'row', 'peso muerto', 'deadlift', 'hiperextension', 'back extension'] },
  { group: 'Gluteos', keywords: ['hip thrust', 'puente de gluteo', 'glute bridge', 'patada de gluteo', 'glute kickback'] },
  { group: 'Piernas', keywords: ['sentadilla', 'squat', 'prensa', 'leg press', 'zancada', 'lunge', 'extension cuadriceps', 'leg extension', 'curl femoral', 'leg curl', 'peso muerto rumano', 'gemelos', 'calf raise', 'abduccion', 'aduccion'] },
  { group: 'Abdomen', keywords: ['abdominales', 'crunch', 'plancha', 'plank', 'elevacion de piernas', 'leg raise', 'rueda abdominal', 'ab wheel'] },
]

export const MUSCLE_GROUPS = ['Pecho', 'Espalda', 'Hombros', 'Brazos', 'Abdomen', 'Piernas', 'Gluteos']

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
}

export function classifyExercise(exerciseName) {
  const normalized = normalize(exerciseName)
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return rule.group
    }
  }
  return null // sin clasificar
}

// 0 · 1-30 · 31-60 · 61-200 · 200+
export function intensityLevel(count) {
  if (count <= 0) return 0
  if (count <= 30) return 1
  if (count <= 60) return 2
  if (count <= 200) return 3
  return 4
}

const LEVEL_OPACITY = [0, 0.25, 0.5, 0.75, 1]

export function levelOpacity(level) {
  return LEVEL_OPACITY[level]
}
