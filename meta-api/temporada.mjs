// Elige los textos según la fecha de Lima. Pasada la fecha, vuelven solos los normales.
export function textosDeTemporada(archivo, hoyLima) {
  const { navidad } = archivo
  // Fechas YYYY-MM-DD: se comparan como texto.
  if (navidad && hoyLima <= navidad.hasta) {
    return { temporada: 'navidad', variantes: navidad.variantes, pieReel: navidad.pieReel }
  }
  return { temporada: 'normal', variantes: archivo.variantes, pieReel: archivo.pieReel }
}
