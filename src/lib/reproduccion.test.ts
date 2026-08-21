import { describe, expect, it } from 'vitest';
import { calcularIndicadoresReproductivos } from './reproduccion';
import type { Monta, Parto } from './types';

function parto(fecha: string): Parto {
  return { id: fecha, madreId: 'm', fecha, numCrias: 1, criaIds: [], createdAt: '' };
}
function monta(fecha: string, resultado: Monta['resultado']): Monta {
  return { id: fecha + resultado, hembraId: 'm', fecha, tipo: 'natural', resultado, createdAt: '' };
}

describe('calcularIndicadoresReproductivos', () => {
  it('da todo en 0/null sin partos ni montas', () => {
    const r = calcularIndicadoresReproductivos({ fechaNacimiento: '2020-01-01' }, [], []);
    expect(r.numeroPartos).toBe(0);
    expect(r.intervaloPromedioPartosDias).toBeNull();
    expect(r.edadPrimerPartoMeses).toBeNull();
    expect(r.tasaExitoReproductivo).toBeNull();
  });

  it('calcula la edad al primer parto', () => {
    const r = calcularIndicadoresReproductivos({ fechaNacimiento: '2020-01-01' }, [parto('2022-01-01')], []);
    expect(r.numeroPartos).toBe(1);
    expect(r.edadPrimerPartoMeses).toBe(24);
    expect(r.intervaloPromedioPartosDias).toBeNull(); // hace falta más de 1 parto
  });

  it('calcula el intervalo promedio entre partos consecutivos', () => {
    const r = calcularIndicadoresReproductivos(
      { fechaNacimiento: '2018-01-01' },
      [parto('2020-01-01'), parto('2021-01-01'), parto('2022-01-01')],
      [],
    );
    expect(r.numeroPartos).toBe(3);
    expect(r.intervaloPromedioPartosDias).toBeGreaterThan(360);
    expect(r.intervaloPromedioPartosDias).toBeLessThan(370);
  });

  it('ordena los partos internamente, sin importar el orden de entrada', () => {
    const r = calcularIndicadoresReproductivos(
      { fechaNacimiento: '2018-01-01' },
      [parto('2022-01-01'), parto('2020-01-01')],
      [],
    );
    expect(r.edadPrimerPartoMeses).toBeGreaterThan(20); // toma el más temprano (2020), no el primero del array
  });

  it('calcula la tasa de éxito reproductivo solo sobre montas con diagnóstico', () => {
    const r = calcularIndicadoresReproductivos(
      { fechaNacimiento: '2018-01-01' },
      [],
      [monta('2024-01-01', 'gestacion'), monta('2024-02-01', 'vacia'), monta('2024-03-01', 'pendiente')],
    );
    expect(r.montasTotales).toBe(3);
    expect(r.montasConfirmadas).toBe(1);
    expect(r.montasVacias).toBe(1);
    expect(r.tasaExitoReproductivo).toBe(50); // 1 de 2 con diagnóstico — la pendiente no cuenta
  });

  it('la tasa de éxito es null si ninguna monta tiene diagnóstico todavía', () => {
    const r = calcularIndicadoresReproductivos({ fechaNacimiento: '2018-01-01' }, [], [monta('2024-01-01', 'pendiente')]);
    expect(r.tasaExitoReproductivo).toBeNull();
  });
});
