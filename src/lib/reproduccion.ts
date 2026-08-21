// THEOS — Indicadores reproductivos (punto 21 del plan maestro)
//
// "No crear formularios adicionales para introducir estos indicadores: deben
// derivarse de los datos existentes." Todo acá es lectura pura sobre montas
// y partos ya cargados — nada nuevo que el usuario tenga que llenar.

import type { Animal, Monta, Parto } from './types';

export interface IndicadoresReproductivos {
  numeroPartos: number;
  /** Promedio de días entre partos consecutivos, o null si hay menos de 2 partos. */
  intervaloPromedioPartosDias: number | null;
  /** Edad de la hembra en su primer parto, en meses, o null si falta el dato. */
  edadPrimerPartoMeses: number | null;
  montasTotales: number;
  montasConfirmadas: number;
  montasVacias: number;
  montasAbortos: number;
  /** % de montas con diagnóstico confirmado que resultaron en gestación. Null si no hay ninguna con diagnóstico todavía. */
  tasaExitoReproductivo: number | null;
}

function diasEntre(fechaA: string, fechaB: string): number {
  const a = new Date(`${fechaA}T12:00:00`).getTime();
  const b = new Date(`${fechaB}T12:00:00`).getTime();
  return (b - a) / 86400000;
}

export function calcularIndicadoresReproductivos(
  hembra: Pick<Animal, 'fechaNacimiento'>,
  partos: Parto[],
  montas: Monta[],
): IndicadoresReproductivos {
  const partosOrdenados = [...partos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const numeroPartos = partosOrdenados.length;

  let intervaloPromedioPartosDias: number | null = null;
  if (partosOrdenados.length >= 2) {
    const intervalos: number[] = [];
    for (let i = 1; i < partosOrdenados.length; i++) {
      intervalos.push(diasEntre(partosOrdenados[i - 1].fecha, partosOrdenados[i].fecha));
    }
    intervaloPromedioPartosDias = Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length);
  }

  let edadPrimerPartoMeses: number | null = null;
  if (partosOrdenados.length > 0 && hembra.fechaNacimiento) {
    edadPrimerPartoMeses = Math.round(diasEntre(hembra.fechaNacimiento, partosOrdenados[0].fecha) / 30.44);
  }

  const montasTotales = montas.length;
  const montasConfirmadas = montas.filter(m => m.resultado === 'gestacion').length;
  const montasVacias = montas.filter(m => m.resultado === 'vacia').length;
  const montasAbortos = montas.filter(m => m.resultado === 'aborto').length;
  const conDiagnostico = montasConfirmadas + montasVacias + montasAbortos;
  const tasaExitoReproductivo = conDiagnostico > 0 ? Math.round((montasConfirmadas / conDiagnostico) * 100) : null;

  return {
    numeroPartos, intervaloPromedioPartosDias, edadPrimerPartoMeses,
    montasTotales, montasConfirmadas, montasVacias, montasAbortos, tasaExitoReproductivo,
  };
}
