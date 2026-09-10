export function mondayOf(date) {
  const d = new Date(date)
  const diff = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Fecha en formato YYYY-MM-DD usando el huso horario LOCAL del dispositivo.
// No usar `date.toISOString()` para esto: convierte a UTC y puede devolver
// el día anterior (o siguiente) según la hora y la zona horaria del usuario.
export function toDateKey(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayKey() {
  return toDateKey(new Date())
}
