import { describe, expect, it } from 'vitest';
import { litrosDia, resumirProduccion } from './produccion';
import type { RegistroLeche } from './types';

function registro(overrides: Partial<RegistroLeche>): RegistroLeche {
  return { id: 'r', animalId: 'a', fecha: '2024-01-01', createdAt: '', ...overrides } as RegistroLeche;
}

describe('litrosDia', () => {
  it('suma mañana y tarde', () => {
    expect(litrosDia(registro({ litrosManana: 5, litrosTarde: 3 }))).toBe(8);
  });
  it('trata los campos faltantes como 0', () => {
    expect(litrosDia(registro({ litrosManana: 5 }))).toBe(5);
    expect(litrosDia(registro({}))).toBe(0);
  });
});

describe('resumirProduccion', () => {
  it('da todo en 0 sin registros', () => {
    const r = resumirProduccion([]);
    expect(r).toEqual({ totalRegistros: 0, totalLitros: 0, promedioDiario: 0, promedioSemanal: 0, promedioMensual: 0, maxDiario: 0 });
  });

  it('agrupa por día y calcula los promedios', () => {
    const registros = [
      registro({ fecha: '2024-01-01', litrosManana: 5, litrosTarde: 3 }), // 8 ese día
      registro({ fecha: '2024-01-02', litrosManana: 4 }),                 // 4 ese día
    ];
    const r = resumirProduccion(registros);
    expect(r.totalRegistros).toBe(2);
    expect(r.totalLitros).toBe(12);
    expect(r.promedioDiario).toBe(6);
    expect(r.promedioSemanal).toBe(42);
    expect(r.promedioMensual).toBe(180);
    expect(r.maxDiario).toBe(8);
  });

  it('suma dos registros del mismo día (ej. AM y PM cargados aparte)', () => {
    const registros = [
      registro({ fecha: '2024-01-01', litrosManana: 5 }),
      registro({ fecha: '2024-01-01', litrosTarde: 3 }),
    ];
    const r = resumirProduccion(registros);
    expect(r.totalLitros).toBe(8);
    expect(r.promedioDiario).toBe(8); // un solo día en el mapa
  });
});
