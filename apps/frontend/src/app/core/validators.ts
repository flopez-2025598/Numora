import type { AbstractControl, ValidationErrors } from '@angular/forms';

/** Cadena "YYYY-MM-DD" con la fecha de hoy (hora local), para el atributo max de <input type="date">. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Validador reactivo: rechaza fechas posteriores a hoy. */
export function notFutureDate(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  return String(control.value).slice(0, 10) > todayISO() ? { futureDate: true } : null;
}
