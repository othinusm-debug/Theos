// THEOS — Cálculos de producción de leche

import type { RegistroLeche } from './types';

export interface ResumenProduccion {
  totalRegistros: number;
  totalLitros: number;
  promedioDiario: number;
  promedioSemanal: number;
  promedioMensual: number;
  maxDiario: number;
}

export function litrosDia(r: RegistroLeche): number {
  return (r.litrosManana ?? 0) + (r.litrosTarde ?? 0);
}

export function resumirProduccion(registros: RegistroLeche[]): ResumenProduccion {
  if (registros.length === 0) {
    return { totalRegistros: 0, totalLitros: 0, promedioDiario: 0, promedioSemanal: 0, promedioMensual: 0, maxDiario: 0 };
  }
  const porDia = new Map<string, number>();
  for (const r of registros) {
    porDia.set(r.fecha, (porDia.get(r.fecha) ?? 0) + litrosDia(r));
  }
  const dias = Array.from(porDia.values());
  const totalLitros = dias.reduce((s, v) => s + v, 0);
  const promedioDiario = totalLitros / dias.length;
  return {
    totalRegistros: registros.length,
    totalLitros,
    promedioDiario,
    promedioSemanal: promedioDiario * 7,
    promedioMensual: promedioDiario * 30,
    maxDiario: Math.max(...dias),
  };
}
