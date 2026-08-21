// Estos tests insertan datos corruptos DIRECTO en la tabla (bypaseando
// crearAnimal/repo.ts a propósito) para simular una base que ya tenía
// problemas de antes de que existiera la validación central — que es
// justamente el escenario que ejecutarDiagnostico() tiene que atrapar.

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { ejecutarDiagnostico } from './diagnostico';

const FINCA_ID = 'finca-test';

async function limpiarTodo() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });
}
beforeEach(limpiarTodo);

function animalCrudo(overrides: Record<string, unknown>) {
  return {
    id: 'a1', fincaId: FINCA_ID, codigo: 'A1', especie: 'bovino', sexo: 'hembra',
    estado: 'vivo', createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('ejecutarDiagnostico', () => {
  it('no reporta nada sobre una base limpia', async () => {
    await db.animales.add(animalCrudo({}) as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.problemas).toEqual([]);
  });

  it('detecta un padre que ya no existe', async () => {
    await db.animales.add(animalCrudo({ padreId: 'fantasma' }) as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.referenciasRotas).toBeGreaterThan(0);
  });

  it('detecta un potrero asignado que ya no existe', async () => {
    await db.animales.add(animalCrudo({ potreroActualId: 'potrero-fantasma' }) as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.referenciasRotas).toBeGreaterThan(0);
  });

  it('detecta un pesaje sin animal asociado', async () => {
    await db.pesajes.add({ id: 'p1', animalId: 'no-existe', fecha: '2024-01-01', pesoKg: 100 } as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.referenciasRotas).toBeGreaterThan(0);
  });

  it('detecta dos animales con el mismo código en la misma finca', async () => {
    await db.animales.bulkAdd([
      animalCrudo({ id: 'a1', codigo: 'DUP' }),
      animalCrudo({ id: 'a2', codigo: 'dup' }), // mismo código, sin distinguir mayúsculas
    ] as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.duplicados).toBeGreaterThan(0);
  });

  it('no marca como duplicado el mismo código en fincas distintas', async () => {
    await db.animales.bulkAdd([
      animalCrudo({ id: 'a1', codigo: 'DUP', fincaId: 'finca-a' }),
      animalCrudo({ id: 'a2', codigo: 'DUP', fincaId: 'finca-b' }),
    ] as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.duplicados).toBe(0);
  });

  it('detecta una fecha de muerte anterior al nacimiento', async () => {
    await db.animales.add(animalCrudo({
      fechaNacimiento: '2024-06-01', estado: 'muerto', fechaEstado: '2024-01-01',
    }) as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.cronologia).toBeGreaterThan(0);
  });

  it('detecta una cría nacida antes que su madre', async () => {
    await db.animales.bulkAdd([
      animalCrudo({ id: 'madre', codigo: 'MADRE', fechaNacimiento: '2020-01-01' }),
      animalCrudo({ id: 'cria', codigo: 'CRIA', madreId: 'madre', fechaNacimiento: '2010-01-01' }),
    ] as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.cronologia).toBeGreaterThan(0);
  });

  it('detecta una foto sin animal asociado', async () => {
    await db.fotosAnimal.add({ id: 'f1', animalId: 'no-existe', tipo: 'general', createdAt: '' } as any);
    const resultado = await ejecutarDiagnostico();
    expect(resultado.resumen.huerfanos).toBeGreaterThan(0);
  });
});
