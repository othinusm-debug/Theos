// THEOS — Generación automática de códigos de arete según el esquema de la finca

import type { EsquemaNumeracion, Especie } from './types';

export function generarCodigo(
  esquema: EsquemaNumeracion,
  opciones: {
    especie?: Especie;
    codigoMadre?: string;
    anio?: number;
  } = {},
): string {
  const anioActual = opciones.anio ?? new Date().getFullYear() % 100;

  switch (esquema.tipo) {
    case 'consecutivo': {
      const n = esquema.siguienteConsecutivo ?? 1;
      return String(n).padStart(4, '0');
    }
    case 'por_anio': {
      const n = esquema.siguienteConsecutivo ?? 1;
      return `${String(anioActual).padStart(2, '0')}-${String(n).padStart(3, '0')}`;
    }
    case 'prefijo_especie': {
      const prefijos: Record<Especie, string> = {
        bovino: 'BOV', bufalino: 'BUF', equino: 'EQU',
        asnal: 'ASN', mular: 'MUL', porcino: 'POR',
        ovino: 'OVI', caprino: 'CAP',
      };
      const pref = opciones.especie ? (prefijos[opciones.especie] ?? 'ANI') : 'ANI';
      const n    = esquema.siguienteConsecutivo ?? 1;
      return `${pref}-${String(n).padStart(3, '0')}`;
    }
    case 'basado_en_madre': {
      if (!opciones.codigoMadre) return `${anioActual}${String(esquema.siguienteConsecutivo ?? 1).padStart(3, '0')}`;
      const sufijo = esquema.siguienteConsecutivo ?? 0;
      return `${sufijo}${opciones.codigoMadre}`;
    }
    case 'manual':
    default:
      return '';
  }
}
