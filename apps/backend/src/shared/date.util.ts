/**
 * true si la fecha indicada cae después de hoy (hora local del servidor).
 * Acepta "YYYY-MM-DD" o una fecha ISO completa; se compara solo el día.
 */
export function isFutureDate(dateStr: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return dateStr.slice(0, 10) > today;
}
