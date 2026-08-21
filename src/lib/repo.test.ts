// Tests de integración: usan Dexie contra un IndexedDB en memoria
// (fake-indexeddb, registrado en src/test-setup.ts) en vez de mockear nada.
// Por eso prueban las cadenas completas — crear animal → monta → parto →
// genealogía, animal → venta → finanzas — como pide el punto 62 del plan
// maestro, no solo funciones aisladas.

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  actualizarAnimal, actualizarResultadoMonta, cambiarEstadoAnimal, crearAnimal,
  crearEmpleado, crearFinca, eliminarAnimalDefinitivamente, eliminarFinca,
  ErrorConsanguinidad, moverAnimal, registrarEventoSalud, registrarLeche, registrarMonta,
  registrarMuerte, registrarParto, registrarPesaje, registrarVenta,
} from './repo';
import type { Animal } from './types';

const FINCA_ID = 'finca-test';

async function limpiarTodo() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map(t => t.clear()));
  });
}
beforeEach(limpiarTodo);

let contador = 0;
function animalFixture(overrides: Partial<Animal> = {}): Omit<Animal, 'id' | 'createdAt' | 'updatedAt'> {
  contador += 1;
  return {
    fincaId: FINCA_ID,
    codigo: `A${contador}`,
    especie: 'bovino',
    sexo: 'hembra',
    estado: 'vivo',
    ...overrides,
  } as any;
}

describe('crearAnimal / actualizarAnimal — validación central', () => {
  it('rechaza un código duplicado en la misma finca (sin distinguir mayúsculas)', async () => {
    await crearAnimal(animalFixture({ codigo: 'V001' }));
    await expect(crearAnimal(animalFixture({ codigo: 'v001' }))).rejects.toThrow(/código/i);
  });

  it('permite el mismo código en fincas distintas', async () => {
    await crearAnimal(animalFixture({ codigo: 'V001', fincaId: 'finca-a' }));
    await expect(crearAnimal(animalFixture({ codigo: 'V001', fincaId: 'finca-b' }))).resolves.toBeTruthy();
  });

  it('rechaza asignar como padre a un animal que en realidad es hembra', async () => {
    const hembra = await crearAnimal(animalFixture({ sexo: 'hembra' }));
    await expect(crearAnimal(animalFixture({ padreId: hembra.id }))).rejects.toThrow(/hembra/i);
  });

  it('rechaza asignar un padre que no existe', async () => {
    await expect(crearAnimal(animalFixture({ padreId: 'no-existe' }))).rejects.toThrow(/padre/i);
  });

  it('actualizarAnimal rechaza cambiar el estado directamente', async () => {
    const a = await crearAnimal(animalFixture());
    await expect(actualizarAnimal(a.id, { estado: 'vendido' } as any)).rejects.toThrow();
    const sinCambios = await db.animales.get(a.id);
    expect(sinCambios?.estado).toBe('vivo');
  });

  it('actualizarAnimal sí permite cambiar el código si sigue siendo único', async () => {
    const a = await crearAnimal(animalFixture({ codigo: 'ORIGINAL' }));
    await actualizarAnimal(a.id, { codigo: 'NUEVO' });
    expect((await db.animales.get(a.id))?.codigo).toBe('NUEVO');
  });
});

describe('registrarMonta / registrarParto — validación de reproducción', () => {
  it('rechaza una monta si la hembra ya está vendida', async () => {
    const hembra = await crearAnimal(animalFixture());
    await registrarVenta({ animalId: hembra.id, fecha: '2024-01-01', estado: 'completada' });
    await expect(
      registrarMonta({ hembraId: hembra.id, fecha: '2024-02-01', tipo: 'natural', resultado: 'pendiente' }),
    ).rejects.toThrow();
  });

  it('rechaza una monta con fecha anterior al nacimiento de la hembra', async () => {
    const hembra = await crearAnimal(animalFixture({ fechaNacimiento: '2023-01-01' }));
    await expect(
      registrarMonta({ hembraId: hembra.id, fecha: '2022-01-01', tipo: 'natural', resultado: 'pendiente' }),
    ).rejects.toThrow(/anterior/i);
  });

  it('rechaza un macho que en realidad es hembra', async () => {
    const hembra = await crearAnimal(animalFixture());
    const otraHembra = await crearAnimal(animalFixture());
    await expect(
      registrarMonta({ hembraId: hembra.id, machoId: otraHembra.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' }),
    ).rejects.toThrow(/hembra/i);
  });

  it('rechaza un parto anterior a la monta que le dio origen', async () => {
    const hembra = await crearAnimal(animalFixture({ fechaNacimiento: '2020-01-01' }));
    const monta = await registrarMonta({ hembraId: hembra.id, fecha: '2024-06-01', tipo: 'natural', resultado: 'pendiente' });
    await expect(
      registrarParto({ madreId: hembra.id, montaId: monta.id, fecha: '2024-01-01', numCrias: 1, criaIds: [] }),
    ).rejects.toThrow(/monta/i);
  });

  it('cadena completa: monta -> confirmar preñez -> parto deja a la hembra en lactante', async () => {
    const hembra = await crearAnimal(animalFixture({ fechaNacimiento: '2020-01-01' }));
    const monta = await registrarMonta({ hembraId: hembra.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' });

    await actualizarResultadoMonta(monta.id, 'gestacion');
    expect((await db.animales.get(hembra.id))?.estadoReproductivoHembra).toBe('gestante');

    await registrarParto({ madreId: hembra.id, montaId: monta.id, fecha: '2024-10-01', numCrias: 1, criaIds: [] });
    expect((await db.animales.get(hembra.id))?.estadoReproductivoHembra).toBe('lactante');
  });

  it('confirmar una monta como vacía revierte a la hembra desde gestante', async () => {
    const hembra = await crearAnimal(animalFixture());
    const monta1 = await registrarMonta({ hembraId: hembra.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' });
    await actualizarResultadoMonta(monta1.id, 'gestacion');
    expect((await db.animales.get(hembra.id))?.estadoReproductivoHembra).toBe('gestante');

    const monta2 = await registrarMonta({ hembraId: hembra.id, fecha: '2024-03-01', tipo: 'natural', resultado: 'pendiente' });
    await actualizarResultadoMonta(monta2.id, 'vacia');
    expect((await db.animales.get(hembra.id))?.estadoReproductivoHembra).toBe('vacia');
  });
});

describe('consanguinidad en montas', () => {
  it('avisa con ErrorConsanguinidad si la hembra y el macho están emparentados', async () => {
    const padre = await crearAnimal(animalFixture({ sexo: 'macho' }));
    const hija = await crearAnimal(animalFixture({ sexo: 'hembra', padreId: padre.id }));
    await expect(
      registrarMonta({ hembraId: hija.id, machoId: padre.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' }),
    ).rejects.toThrow(ErrorConsanguinidad);
  });

  it('permite igual la monta emparentada si se confirma explícitamente', async () => {
    const padre = await crearAnimal(animalFixture({ sexo: 'macho' }));
    const hija = await crearAnimal(animalFixture({ sexo: 'hembra', padreId: padre.id }));
    await expect(
      registrarMonta(
        { hembraId: hija.id, machoId: padre.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' },
        { confirmarConsanguinidad: true },
      ),
    ).resolves.toBeTruthy();
  });

  it('no avisa entre animales sin parentesco', async () => {
    const macho = await crearAnimal(animalFixture({ sexo: 'macho' }));
    const hembra = await crearAnimal(animalFixture({ sexo: 'hembra' }));
    await expect(
      registrarMonta({ hembraId: hembra.id, machoId: macho.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' }),
    ).resolves.toBeTruthy();
  });
});

describe('venta / muerte — máquina de estados', () => {
  it('una venta con precio genera el ingreso correspondiente en Finanzas', async () => {
    const a = await crearAnimal(animalFixture());
    await registrarVenta({ animalId: a.id, fecha: '2024-01-01', estado: 'completada', precio: 500, moneda: 'USD', comprador: 'Juan' });

    expect((await db.animales.get(a.id))?.estado).toBe('vendido');
    const movimientos = await db.movimientosFinancieros.where('animalId').equals(a.id).toArray();
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].monto).toBe(500);
    expect(movimientos[0].categoria).toBe('venta_animal');
  });

  it('una venta sin precio no genera movimiento financiero', async () => {
    const a = await crearAnimal(animalFixture());
    await registrarVenta({ animalId: a.id, fecha: '2024-01-01', estado: 'completada' });
    const movimientos = await db.movimientosFinancieros.where('animalId').equals(a.id).toArray();
    expect(movimientos).toHaveLength(0);
  });

  it('no permite vender un animal ya vendido', async () => {
    const a = await crearAnimal(animalFixture());
    await registrarVenta({ animalId: a.id, fecha: '2024-01-01', estado: 'completada' });
    await expect(registrarVenta({ animalId: a.id, fecha: '2024-02-01', estado: 'completada' })).rejects.toThrow();
  });

  it('no permite registrar la muerte de un animal ya muerto', async () => {
    const a = await crearAnimal(animalFixture());
    await registrarMuerte({ animalId: a.id, fecha: '2024-01-01' });
    await expect(registrarMuerte({ animalId: a.id, fecha: '2024-02-01' })).rejects.toThrow();
  });

  it('cambiarEstadoAnimal mueve vivo -> prestado -> vivo', async () => {
    const a = await crearAnimal(animalFixture());
    await cambiarEstadoAnimal(a.id, 'prestado');
    expect((await db.animales.get(a.id))?.estado).toBe('prestado');
    await cambiarEstadoAnimal(a.id, 'vivo');
    expect((await db.animales.get(a.id))?.estado).toBe('vivo');
  });

  it('un animal vendido no puede volver a vivo por cambiarEstadoAnimal', async () => {
    const a = await crearAnimal(animalFixture());
    await registrarVenta({ animalId: a.id, fecha: '2024-01-01', estado: 'completada' });
    await expect(cambiarEstadoAnimal(a.id, 'vivo' as any)).rejects.toThrow();
  });
});

describe('moverAnimal', () => {
  it('registra el movimiento y actualiza el potrero actual del animal', async () => {
    await db.potreros.bulkAdd([
      { id: 'pot1', fincaId: FINCA_ID, nombre: 'Potrero 1' } as any,
      { id: 'pot2', fincaId: FINCA_ID, nombre: 'Potrero 2' } as any,
    ]);
    const a = await crearAnimal(animalFixture({ potreroActualId: 'pot1' }));
    await moverAnimal(a.id, 'pot2', '2024-01-01', 'rotación de potrero');

    expect((await db.animales.get(a.id))?.potreroActualId).toBe('pot2');
    const movimientos = await db.movimientosPotrero.where('animalId').equals(a.id).toArray();
    expect(movimientos).toHaveLength(1);
    expect(movimientos[0].potreroOrigenId).toBe('pot1');
    expect(movimientos[0].potreroDestinoId).toBe('pot2');
  });

  it('rechaza mover a un potrero que no existe', async () => {
    const a = await crearAnimal(animalFixture());
    await expect(moverAnimal(a.id, 'no-existe', '2024-01-01')).rejects.toThrow();
  });
});

describe('validaciones agregadas en la revisión posterior (existencia del animal / estado)', () => {
  it('registrarPesaje rechaza un animal inexistente', async () => {
    await expect(registrarPesaje({ animalId: 'no-existe', fecha: '2024-01-01', pesoKg: 100 })).rejects.toThrow();
  });

  it('registrarEventoSalud rechaza un animal inexistente', async () => {
    await expect(
      registrarEventoSalud({ animalId: 'no-existe', tipo: 'vacunacion', fecha: '2024-01-01' } as any),
    ).rejects.toThrow();
  });

  it('registrarLeche rechaza una hembra ya vendida', async () => {
    const hembra = await crearAnimal(animalFixture());
    await registrarVenta({ animalId: hembra.id, fecha: '2024-01-01', estado: 'completada' });
    await expect(
      registrarLeche({ animalId: hembra.id, fecha: '2024-02-01', litrosManana: 5 }),
    ).rejects.toThrow();
  });

  it('registrarParto rechaza una madre ya vendida', async () => {
    const madre = await crearAnimal(animalFixture());
    await registrarVenta({ animalId: madre.id, fecha: '2024-01-01', estado: 'completada' });
    await expect(
      registrarParto({ madreId: madre.id, fecha: '2024-02-01', numCrias: 1, criaIds: [] }),
    ).rejects.toThrow();
  });
});

describe('aislamiento entre fincas (informe de auditoría externa, punto 3.1)', () => {
  it('rechaza asignar un padre que pertenece a otra finca', async () => {
    const padreOtraFinca = await crearAnimal(animalFixture({ sexo: 'macho', fincaId: 'finca-b' }));
    await expect(
      crearAnimal(animalFixture({ fincaId: FINCA_ID, padreId: padreOtraFinca.id })),
    ).rejects.toThrow(/otra finca/i);
  });

  it('rechaza asignar una madre que pertenece a otra finca', async () => {
    const madreOtraFinca = await crearAnimal(animalFixture({ sexo: 'hembra', fincaId: 'finca-b' }));
    await expect(
      crearAnimal(animalFixture({ fincaId: FINCA_ID, madreId: madreOtraFinca.id })),
    ).rejects.toThrow(/otra finca/i);
  });

  it('rechaza asignar un potrero de otra finca al crear un animal', async () => {
    await db.potreros.add({ id: 'potC', fincaId: 'finca-b', nombre: 'Potrero C' } as any);
    await expect(crearAnimal(animalFixture({ potreroActualId: 'potC' }))).rejects.toThrow(/otra finca/i);
  });

  it('rechaza mover un animal a un potrero de otra finca', async () => {
    await db.potreros.add({ id: 'potB', fincaId: 'finca-b', nombre: 'Potrero B' } as any);
    const a = await crearAnimal(animalFixture());
    await expect(moverAnimal(a.id, 'potB', '2024-01-01')).rejects.toThrow(/otra finca/i);
  });

  it('rechaza una monta entre animales de fincas distintas', async () => {
    const hembra = await crearAnimal(animalFixture({ sexo: 'hembra', fincaId: FINCA_ID }));
    const machoOtraFinca = await crearAnimal(animalFixture({ sexo: 'macho', fincaId: 'finca-b' }));
    await expect(
      registrarMonta({ hembraId: hembra.id, machoId: machoOtraFinca.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' }),
    ).rejects.toThrow(/otra finca/i);
  });

  it('permite el flujo normal cuando todo pertenece a la misma finca', async () => {
    const padre = await crearAnimal(animalFixture({ sexo: 'macho' }));
    const madre = await crearAnimal(animalFixture({ sexo: 'hembra' }));
    await db.potreros.add({ id: 'potA', fincaId: FINCA_ID, nombre: 'Potrero A' } as any);
    const cria = await crearAnimal(animalFixture({ padreId: padre.id, madreId: madre.id, potreroActualId: 'potA' }));
    expect(cria.id).toBeTruthy();
    await expect(
      registrarMonta({ hembraId: madre.id, machoId: padre.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' }, { confirmarConsanguinidad: true }),
    ).resolves.toBeTruthy();
  });
});

describe('doble creación con el mismo código (transacción atómica)', () => {
  it('si dos crearAnimal casi simultáneos usan el mismo código, solo uno de los dos gana', async () => {
    const datos = () => animalFixture({ codigo: 'CARRERA' });
    const resultados = await Promise.allSettled([crearAnimal(datos()), crearAnimal(datos())]);
    const exitosos = resultados.filter(r => r.status === 'fulfilled');
    const fallidos = resultados.filter(r => r.status === 'rejected');
    expect(exitosos).toHaveLength(1);
    expect(fallidos).toHaveLength(1);
    const enBD = await db.animales.where('codigo').equals('CARRERA').toArray();
    expect(enBD).toHaveLength(1); // nunca quedan los dos guardados
  });
});

describe('eliminaciones en cascada (informe de auditoría externa, punto 3.2)', () => {
  it('eliminarAnimalDefinitivamente borra también las montas donde el animal fue el macho', async () => {
    const macho = await crearAnimal(animalFixture({ sexo: 'macho' }));
    const hembra = await crearAnimal(animalFixture({ sexo: 'hembra' }));
    const monta = await registrarMonta({ hembraId: hembra.id, machoId: macho.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' });

    await eliminarAnimalDefinitivamente(macho.id);

    expect(await db.montas.get(monta.id)).toBeUndefined();
  });

  it('eliminarFinca borra los recibos de pago de los empleados de esa finca (no deja huérfanos)', async () => {
    const finca = await crearFinca({ nombre: 'Finca a borrar', esquemaNumeracion: { tipo: 'manual' } });
    const empleado = await crearEmpleado({ fincaId: finca.id, nombre: 'Juan', salarioBase: 100, moneda: 'USD', activo: true });
    await db.recibosPago.add({
      id: 'rec1', empleadoId: empleado.id, fincaId: finca.id,
      periodoDesde: '2024-01-01', periodoHasta: '2024-01-31',
      salarioBase: 100, bonificaciones: 0, deducciones: 0, totalNeto: 100, moneda: 'USD',
    } as any);

    await eliminarFinca(finca.id);

    expect(await db.recibosPago.get('rec1')).toBeUndefined();
    expect(await db.empleados.get(empleado.id)).toBeUndefined();
  });

  it('eliminarFinca borra las montas donde algún animal de esa finca fue el macho', async () => {
    const finca = await crearFinca({ nombre: 'Finca a borrar 2', esquemaNumeracion: { tipo: 'manual' } });
    const macho = await crearAnimal(animalFixture({ sexo: 'macho', fincaId: finca.id }));
    const hembra = await crearAnimal(animalFixture({ sexo: 'hembra', fincaId: finca.id }));
    const monta = await registrarMonta({ hembraId: hembra.id, machoId: macho.id, fecha: '2024-01-01', tipo: 'natural', resultado: 'pendiente' });

    await eliminarFinca(finca.id);

    expect(await db.montas.get(monta.id)).toBeUndefined();
  });
});
