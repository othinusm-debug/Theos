// THEOS — Cálculo de edad a partir de fecha de nacimiento

export interface Edad {
  anios: number;
  meses: number;
  totalMeses: number;
  totalDias: number;
  texto: string;
}

export function calcularEdad(fechaNacimientoISO: string | undefined, hoy: Date = new Date()): Edad | null {
  if (!fechaNacimientoISO) return null;
  const nacimiento = new Date(fechaNacimientoISO + 'T12:00:00');
  if (Number.isNaN(nacimiento.getTime())) return null;

  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();
  if (hoy.getDate() < nacimiento.getDate()) meses -= 1;
  if (meses < 0) { anios -= 1; meses += 12; }
  if (anios < 0) { anios = 0; meses = 0; }

  const totalMeses = anios * 12 + meses;
  const totalDias  = Math.max(0, Math.floor((hoy.getTime() - nacimiento.getTime()) / 86400000));

  let texto: string;
  if (anios === 0 && meses === 0) texto = `${totalDias} día${totalDias === 1 ? '' : 's'}`;
  else if (anios === 0) texto = `${meses} mes${meses === 1 ? '' : 'es'}`;
  else texto = `${anios} año${anios === 1 ? '' : 's'}${meses > 0 ? ` y ${meses} mes${meses === 1 ? '' : 'es'}` : ''}`;

  return { anios, meses, totalMeses, totalDias, texto };
}
