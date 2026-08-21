// THEOS — Máquina de estados del animal (punto 9 del plan maestro)
//
// Define formalmente qué transiciones de Animal.estado son válidas. Es lógica
// pura (no toca la base de datos) para que sea trivial de testear y para que
// tanto repo.ts como cualquier pantalla futura consulten la MISMA regla en
// vez de reinventarla.
//
// 'vendido' y 'muerto' son terminales a propósito: un animal no "revive" ni
// "se des-vende" pisando el campo estado. Si fue un error de carga, hay que
// corregir/eliminar el registro de Venta o Muerte que lo causó — no forzar
// una transición de vuelta, porque eso dejaría el registro de venta/muerte
// huérfano (exactamente el tipo de inconsistencia que detecta diagnostico.ts).
//
// Ojo: 'vivo' y 'prestado' incluyen su propio estado en la lista (quedarse
// igual es un no-op válido, para cambiarEstadoAnimal). 'vendido' y 'muerto'
// NO se incluyen a sí mismos — si lo hicieran, "vendido -> vendido" pasaría
// como válido y registrarVenta/registrarMuerte dejarían vender o matar dos
// veces al mismo animal (duplicando el registro y el ingreso en Finanzas).

import type { EstadoAnimal } from './types';

export const TRANSICIONES_ESTADO_ANIMAL: Record<EstadoAnimal, EstadoAnimal[]> = {
  vivo:     ['vivo', 'vendido', 'muerto', 'prestado'],
  prestado: ['prestado', 'vivo', 'vendido', 'muerto'],
  vendido:  [],
  muerto:   [],
};

export function transicionEstadoValida(desde: EstadoAnimal, hasta: EstadoAnimal): boolean {
  return TRANSICIONES_ESTADO_ANIMAL[desde]?.includes(hasta) ?? false;
}
