// Redimensiona y recomprime una foto en el propio navegador antes de subirla,
// para no comernos el 1 GB de almacenamiento de Supabase con fotos de cámara
// (varios MB cada una) cuando con unos cientos de KB se ve igual de bien.
export async function compressImage(file, { maxDimension = 1600, quality = 0.8 } = {}) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) return file // si el navegador no puede recomprimirla, subimos la original

  const newName = file.name.replace(/\.[^./]+$/, '') + '.jpg'
  return new File([blob], newName, { type: 'image/jpeg' })
}
