// THEOS — Base de datos local (IndexedDB vía Dexie)
// 100% offline-first.
//
// VERSIONES:
//   v1 — esquema inicial
//   v2 — módulo financiero y nómina
//   v3 — galería de fotos múltiples por animal (FotoAnimal)
//
// REGLA PARA FUTURAS VERSIONES (no romper esto de nuevo):
// Cada cambio de esquema es SIEMPRE un `this.version(N+1).stores({...})` nuevo,
// con SOLO las tablas nuevas o modificadas en ese paso. Nunca edites en el sitio
// el `.stores()` de una versión ya publicada: Dexie solo ejecuta, en cada
// dispositivo, las versiones mayores a la que ese dispositivo ya tiene guardada.
// Si agregás una tabla dentro de `version(1)` después de que la app ya se usó
// en el campo, cualquier dispositivo que ya esté en v1 se queda sin esa tabla
// para siempre — exactamente el bug que este archivo tenía hasta ahora (las
// tablas financieras vivían dentro de version(1) en vez de un version(2) real,
// así que un dispositivo que ya tuviera la app instalada antes del módulo
// financiero nunca iba a recibir esas tablas).

import Dexie, { type EntityTable } from 'dexie';
import type {
  Animal,
  Empleado,
  EventoSalud,
  Finca,
  FotoAnimal,
  Monta,
  MovimientoFinanciero,
  MovimientoPotrero,
  Muerte,
  Parto,
  Pesaje,
  Potrero,
  Propiedad,
  Raza,
  ReciboPago,
  RegistroLeche,
  Usuario,
  Venta,
} from './types';

class TheosDB extends Dexie {
  fincas!:                 EntityTable<Finca,                 'id'>;
  usuarios!:               EntityTable<Usuario,               'id'>;
  propiedades!:            EntityTable<Propiedad,             'id'>;
  razas!:                  EntityTable<Raza,                  'id'>;
  potreros!:               EntityTable<Potrero,               'id'>;
  movimientosPotrero!:     EntityTable<MovimientoPotrero,     'id'>;
  animales!:               EntityTable<Animal,                'id'>;
  fotosAnimal!:            EntityTable<FotoAnimal,            'id'>;
  registrosLeche!:         EntityTable<RegistroLeche,         'id'>;
  montas!:                 EntityTable<Monta,                 'id'>;
  partos!:                 EntityTable<Parto,                 'id'>;
  eventosSalud!:           EntityTable<EventoSalud,           'id'>;
  pesajes!:                EntityTable<Pesaje,                'id'>;
  ventas!:                 EntityTable<Venta,                 'id'>;
  muertes!:                EntityTable<Muerte,                'id'>;
  movimientosFinancieros!: EntityTable<MovimientoFinanciero,  'id'>;
  empleados!:              EntityTable<Empleado,              'id'>;
  recibosPago!:            EntityTable<ReciboPago,            'id'>;

  constructor() {
    super('theos');

    // v1 — esquema inicial (animales y todo lo operativo alrededor de ellos)
    this.version(1).stores({
      fincas:             'id, nombre',
      usuarios:           'id, fincaId, nombre',
      propiedades:        'id, animalId, usuarioId',
      razas:              'id, especie',
      potreros:           'id, fincaId',
      movimientosPotrero: 'id, animalId, fecha',
      animales: [
        'id', 'fincaId', 'codigo', 'especie', 'sexo',
        'padreId', 'madreId', 'estado', 'deletedAt',
        'potreroActualId', 'updatedAt',
        '[fincaId+estado]', '[fincaId+especie]', '[fincaId+deletedAt]',
      ].join(', '),
      registrosLeche: 'id, animalId, fecha, [animalId+fecha]',
      montas:         'id, hembraId, machoId, fecha, resultado',
      partos:         'id, madreId, montaId, fecha',
      eventosSalud:   'id, animalId, tipo, fecha, proximaFecha, loteId',
      pesajes:        'id, animalId, fecha, [animalId+fecha]',
      ventas:         'id, animalId, fecha, estado',
      muertes:        'id, animalId, fecha',
    });

    // v2 — módulo financiero y nómina (antes vivía, por error, dentro de v1)
    this.version(2).stores({
      movimientosFinancieros: 'id, fincaId, tipo, categoria, fecha, animalId',
      empleados:              'id, fincaId, activo',
      recibosPago:            'id, empleadoId, fincaId, periodoDesde',
    });

    // v3 — galería de fotos múltiples
    this.version(3).stores({
      fotosAnimal: 'id, animalId, tipo, createdAt, [animalId+tipo]',
    });
  }
}

export const db = new TheosDB();

export function nuevoId(): string {
  return crypto.randomUUID();
}

export function ahora(): string {
  return new Date().toISOString();
}
