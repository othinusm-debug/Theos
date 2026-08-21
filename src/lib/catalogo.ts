// THEOS — Catálogo de especies, razas venezolanas y nomenclatura de categorías.
// Terminología real de campo usada en Venezuela y Colombia.

import type { Especie } from './types';

export const ESPECIES: { value: Especie; label: string }[] = [
  { value: 'bovino',   label: 'Bovino (ganado vacuno)' },
  { value: 'bufalino', label: 'Bufalino (búfalo de agua)' },
  { value: 'equino',   label: 'Equino (caballar)' },
  { value: 'asnal',    label: 'Asnal (burros)' },
  { value: 'mular',    label: 'Mular (mulas)' },
  { value: 'porcino',  label: 'Porcino (cerdos)' },
  { value: 'ovino',    label: 'Ovino (ovejas)' },
  { value: 'caprino',  label: 'Caprino (cabras)' },
];

export const RAZAS_POR_ESPECIE: Record<Especie, string[]> = {
  bovino:   ['Brahman', 'Carora', 'Criollo Limonero', 'Gyr', 'Holstein', 'Jersey', 'Pardo Suizo', 'Guzerá', 'Nelore', 'Mestizo'],
  bufalino: ['Murrah', 'Mediterráneo', 'Jafarabadi', 'Carabao', 'Mestizo'],
  equino:   ['Criollo Venezolano', 'Cuarto de Milla', 'Pura Sangre', 'Paso Fino', 'Llanero', 'Mestizo'],
  asnal:    ['Criollo', 'Mestizo'],
  mular:    ['Mula de trabajo'],
  porcino:  ['Duroc', 'Yorkshire', 'Landrace', 'Hampshire', 'Criollo', 'Mestizo'],
  ovino:    ['West African', 'Barbados Barriga Negra', 'Criollo', 'Mestizo'],
  caprino:  ['Criollo', 'Nubian', 'Alpina', 'Saanen', 'Mestizo'],
};

// Períodos de gestación por especie (días promedio)
export const DIAS_GESTACION: Record<Especie, number> = {
  bovino:   283,
  bufalino: 310,
  equino:   340,
  asnal:    365,
  mular:    350,
  porcino:  114,
  ovino:    150,
  caprino:  150,
};

export function nombreEspecie(especie: Especie): string {
  return ESPECIES.find(e => e.value === especie)?.label.split(' (')[0] ?? especie;
}

export function fechaEsperadaParto(fechaMonta: string, especie: Especie): Date {
  const dias = DIAS_GESTACION[especie] ?? 283;
  const fecha = new Date(fechaMonta + 'T12:00:00');
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

interface Umbral { hastaMeses: number; categoria: string; }
type TablaCategorias = Record<'macho' | 'hembra', Umbral[]>;

const CATEGORIAS: Record<Especie, TablaCategorias> = {
  bovino: {
    macho:  [{ hastaMeses: 12, categoria: 'Becerro' }, { hastaMeses: 24, categoria: 'Maute' }, { hastaMeses: 36, categoria: 'Novillo' }, { hastaMeses: Infinity, categoria: 'Toro' }],
    hembra: [{ hastaMeses: 12, categoria: 'Becerra' }, { hastaMeses: 24, categoria: 'Mauta' }, { hastaMeses: 36, categoria: 'Novilla' }, { hastaMeses: Infinity, categoria: 'Vaca' }],
  },
  bufalino: {
    macho:  [{ hastaMeses: 12, categoria: 'Bucerro' }, { hastaMeses: 24, categoria: 'Maute' }, { hastaMeses: 36, categoria: 'Novillo bufalino' }, { hastaMeses: Infinity, categoria: 'Padrote' }],
    hembra: [{ hastaMeses: 12, categoria: 'Bucerra' }, { hastaMeses: 24, categoria: 'Mauta' }, { hastaMeses: 36, categoria: 'Novilla bufalina' }, { hastaMeses: Infinity, categoria: 'Búfala' }],
  },
  equino: {
    macho:  [{ hastaMeses: 12, categoria: 'Potro' }, { hastaMeses: 36, categoria: 'Potro joven' }, { hastaMeses: Infinity, categoria: 'Caballo' }],
    hembra: [{ hastaMeses: 12, categoria: 'Potranca' }, { hastaMeses: 36, categoria: 'Potranca adulta' }, { hastaMeses: Infinity, categoria: 'Yegua' }],
  },
  asnal: {
    macho:  [{ hastaMeses: 12, categoria: 'Burrito' }, { hastaMeses: Infinity, categoria: 'Burro' }],
    hembra: [{ hastaMeses: 12, categoria: 'Burrita' }, { hastaMeses: Infinity, categoria: 'Burra' }],
  },
  mular: {
    macho:  [{ hastaMeses: Infinity, categoria: 'Mulo' }],
    hembra: [{ hastaMeses: Infinity, categoria: 'Mula' }],
  },
  porcino: {
    macho:  [{ hastaMeses: 4, categoria: 'Lechón' }, { hastaMeses: 8, categoria: 'Cerdo de ceba' }, { hastaMeses: Infinity, categoria: 'Verraco' }],
    hembra: [{ hastaMeses: 4, categoria: 'Lechona' }, { hastaMeses: 8, categoria: 'Cerda joven' }, { hastaMeses: Infinity, categoria: 'Cerda madre' }],
  },
  ovino: {
    macho:  [{ hastaMeses: 6, categoria: 'Cordero' }, { hastaMeses: Infinity, categoria: 'Carnero' }],
    hembra: [{ hastaMeses: 6, categoria: 'Cordera' }, { hastaMeses: Infinity, categoria: 'Oveja' }],
  },
  caprino: {
    macho:  [{ hastaMeses: 6, categoria: 'Cabrito' }, { hastaMeses: Infinity, categoria: 'Cabrón' }],
    hembra: [{ hastaMeses: 6, categoria: 'Cabrita' }, { hastaMeses: Infinity, categoria: 'Cabra' }],
  },
};

const ANIOS_VEJEZ: Record<Especie, number> = {
  bovino: 10, bufalino: 12, equino: 18, asnal: 20,
  mular: 20, porcino: 5, ovino: 8, caprino: 10,
};

export function esViejo(especie: Especie, anios: number): boolean {
  return anios >= (ANIOS_VEJEZ[especie] ?? 12);
}

export function categoriaAnimal(especie: Especie, sexo: 'macho' | 'hembra', edadMeses: number | null): string {
  if (edadMeses === null) return sexo === 'macho' ? 'Macho' : 'Hembra';
  const tabla = CATEGORIAS[especie]?.[sexo];
  if (!tabla) return sexo === 'macho' ? 'Macho' : 'Hembra';
  const umbral = tabla.find(u => edadMeses <= u.hastaMeses);
  return umbral?.categoria ?? (sexo === 'macho' ? 'Macho adulto' : 'Hembra adulta');
}
