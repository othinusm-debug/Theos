import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fecha de HOY en formato "YYYY-MM-DD", en el huso horario LOCAL del
 * dispositivo — no en UTC.
 *
 * `new Date().toISOString().slice(0, 10)` (el patrón que se usaba antes en
 * varios formularios) convierte a UTC primero: en husos horarios negativos
 * (Venezuela/Colombia, UTC-4/-5), de noche eso puede devolver el día
 * siguiente al real. Este helper corrige el desfase antes de recortar.
 */
export function hoyISO(): string {
  const d = new Date();
  const sinDesfaseUTC = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return sinDesfaseUTC.toISOString().slice(0, 10);
}
