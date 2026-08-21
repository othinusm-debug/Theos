// THEOS — Capa de acceso a datos: CRUD + hooks reactivos (useLiveQuery)
// Todo es local, 100% offline.

import { useLiveQuery } from 'dexie-react-hooks';
import { ahora, db, nuevoId } from './db';
import { transicionEstadoValida } from './estados';
import { parentescoCercano } from './genealogia';
import type {
  Animal,
  CategoriaFinanciera,
  Empleado,
  EventoSalud,
  Finca,
  FotoAnimal,
  GananciaWeight,
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
  ResultadoMonta,
  TipoFoto,
  TipoMovimientoFinanciero,
  Usuario,
  Venta,
} from './types';

function validarNumero(valor: unknown, etiqueta: string, minimo = 0, maximo = 1_000_000_000): void {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < minimo || valor > maximo) {
    throw new Error(`${etiqueta} debe ser un número válido entre ${minimo} y ${maximo}.`);
  }
}

function validarFecha(fecha: unknown, etiqueta: string, permitirFuturo = false): void {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new Error(`${etiqueta} debe ser una fecha válida.`);
  }
  const valor = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(valor.getTime())) throw new Error(`${etiqueta} no es válida.`);
  if (!permitirFuturo && valor.getTime() > Date.now() + 86_400_000) {
    throw new Error(`${etiqueta} no puede estar en el futuro.`);
  }
}

function validarDatosAnimal(datos: Partial<Animal>): void {
  if (datos.fechaNacimiento) {
    validarFecha(datos.fechaNacimiento, 'La fecha de nacimiento');
    if (new Date(`${datos.fechaNacimiento}T12:00:00`).getTime() > Date.now()) {
      throw new Error('La fecha de nacimiento no puede estar en el futuro.');
    }
  }
}

// ─── Estadísticas / diagnóstico ─────────────────────────────────────────────
// Punto único para contar registros de cada colección — antes `datos.tsx`
// llamaba a `db.<tabla>.count()` directo, por fuera de esta capa.

export interface EstadisticasDB {
  fincas: number; usuarios: number; propiedades: number; razas: number;
  potreros: number; movimientosPotrero: number; animales: number; fotosAnimal: number;
  registrosLeche: number; montas: number; partos: number; eventosSalud: number;
  pesajes: number; ventas: number; muertes: number; movimientosFinancieros: number;
  empleados: number; recibosPago: number;
}

export async function obtenerEstadisticasDB(): Promise<EstadisticasDB> {
  const [
    fincas, usuarios, propiedades, razas, potreros, movimientosPotrero,
    animales, fotosAnimal, registrosLeche, montas, partos, eventosSalud,
    pesajes, ventas, muertes, movimientosFinancieros, empleados, recibosPago,
  ] = await Promise.all([
    db.fincas.count(), db.usuarios.count(), db.propiedades.count(), db.razas.count(),
    db.potreros.count(), db.movimientosPotrero.count(), db.animales.count(), db.fotosAnimal.count(),
    db.registrosLeche.count(), db.montas.count(), db.partos.count(), db.eventosSalud.count(),
    db.pesajes.count(), db.ventas.count(), db.muertes.count(), db.movimientosFinancieros.count(),
    db.empleados.count(), db.recibosPago.count(),
  ]);
  return {
    fincas, usuarios, propiedades, razas, potreros, movimientosPotrero,
    animales, fotosAnimal, registrosLeche, montas, partos, eventosSalud,
    pesajes, ventas, muertes, movimientosFinancieros, empleados, recibosPago,
  };
}

// ─── Fincas ──────────────────────────────────────────────────────────────────

export function useFincas() {
  return useLiveQuery(() => db.fincas.toArray(), [], []);
}
export function useFinca(id: string | undefined) {
  return useLiveQuery(() => (id ? db.fincas.get(id) : undefined), [id]);
}
export async function crearFinca(datos: Omit<Finca, 'id' | 'createdAt' | 'updatedAt'>): Promise<Finca> {
  if (datos.hectareasTotales !== undefined) validarNumero(datos.hectareasTotales, 'Las hectáreas totales', 0.01, 10_000_000);
  const finca: Finca = { ...datos, id: nuevoId(), createdAt: ahora(), updatedAt: ahora() };
  await db.fincas.add(finca);
  return finca;
}
export async function actualizarFinca(id: string, cambios: Partial<Finca>): Promise<void> {
  if (cambios.hectareasTotales !== undefined) validarNumero(cambios.hectareasTotales, 'Las hectáreas totales', 0.01, 10_000_000);
  await db.fincas.update(id, { ...cambios, updatedAt: ahora() });
}
export async function eliminarFinca(id: string): Promise<void> {
  await db.transaction('rw', [
    db.fincas, db.animales, db.potreros, db.usuarios, db.propiedades,
    db.registrosLeche, db.eventosSalud, db.pesajes, db.montas,
    db.partos, db.ventas, db.muertes, db.movimientosPotrero,
    db.movimientosFinancieros, db.empleados, db.recibosPago, db.fotosAnimal,
  ], async () => {
    const animalesDeFinca = await db.animales.where('fincaId').equals(id).toArray();
    const animalIds = animalesDeFinca.map(a => a.id);
    if (animalIds.length > 0) {
      await db.propiedades.where('animalId').anyOf(animalIds).delete();
      await db.registrosLeche.where('animalId').anyOf(animalIds).delete();
      await db.eventosSalud.where('animalId').anyOf(animalIds).delete();
      await db.pesajes.where('animalId').anyOf(animalIds).delete();
      await db.montas.where('hembraId').anyOf(animalIds).delete();
      await db.montas.where('machoId').anyOf(animalIds).delete();
      await db.partos.where('madreId').anyOf(animalIds).delete();
      await db.ventas.where('animalId').anyOf(animalIds).delete();
      await db.muertes.where('animalId').anyOf(animalIds).delete();
      await db.movimientosPotrero.where('animalId').anyOf(animalIds).delete();
      await db.fotosAnimal.where('animalId').anyOf(animalIds).delete();
    }
    const empleadosDeFinca = await db.empleados.where('fincaId').equals(id).toArray();
    const empleadoIds = empleadosDeFinca.map(e => e.id);
    if (empleadoIds.length > 0) {
      await db.recibosPago.where('empleadoId').anyOf(empleadoIds).delete();
    }
    await db.animales.where('fincaId').equals(id).delete();
    await db.potreros.where('fincaId').equals(id).delete();
    await db.usuarios.where('fincaId').equals(id).delete();
    await db.movimientosFinancieros.where('fincaId').equals(id).delete();
    await db.empleados.where('fincaId').equals(id).delete();
    await db.fincas.delete(id);
  });
}
/** Cuenta animales, potreros, empleados y movimientos financieros que se
 *  borrarían con eliminarFinca — para mostrarle al usuario el alcance real
 *  antes de confirmar, no solo la advertencia genérica. */
export interface ResumenBorradoFinca {
  animales: number; potreros: number; empleados: number; movimientosFinancieros: number;
}
export async function resumenBorradoFinca(id: string): Promise<ResumenBorradoFinca> {
  const [animales, potreros, empleados, movimientosFinancieros] = await Promise.all([
    db.animales.where('fincaId').equals(id).count(),
    db.potreros.where('fincaId').equals(id).count(),
    db.empleados.where('fincaId').equals(id).count(),
    db.movimientosFinancieros.where('fincaId').equals(id).count(),
  ]);
  return { animales, potreros, empleados, movimientosFinancieros };
}

// ─── Usuarios ────────────────────────────────────────────────────────────────

export function useUsuarios(fincaId: string | undefined) {
  return useLiveQuery(
    () => (fincaId ? db.usuarios.where('fincaId').equals(fincaId).toArray() : []),
    [fincaId], [],
  );
}
export async function crearUsuario(datos: Omit<Usuario, 'id' | 'createdAt'>): Promise<Usuario> {
  if (!(await db.fincas.get(datos.fincaId))) throw new Error('La finca seleccionada no existe.');
  const u: Usuario = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.usuarios.add(u); return u;
}
export async function actualizarUsuario(id: string, cambios: Partial<Pick<Usuario, 'nombre' | 'rol' | 'telefono'>>): Promise<void> {
  await db.usuarios.update(id, cambios);
}
export async function eliminarUsuario(id: string): Promise<void> {
  await db.transaction('rw', [db.usuarios, db.propiedades], async () => {
    await db.usuarios.delete(id);
    await db.propiedades.where('usuarioId').equals(id).delete();
  });
}
export function usePropiedadesDeAnimal(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.propiedades.where('animalId').equals(animalId).toArray() : []),
    [animalId], [],
  );
}
export async function establecerPropiedades(animalId: string, propiedades: Omit<Propiedad, 'id' | 'animalId' | 'createdAt'>[]): Promise<void> {
  const animal = await db.animales.get(animalId);
  if (!animal) throw new Error('El animal no existe.');
  const usuarios = await Promise.all(propiedades.map(p => db.usuarios.get(p.usuarioId)));
  if (usuarios.some(u => !u || u.fincaId !== animal.fincaId)) {
    throw new Error('Todos los propietarios deben pertenecer a la misma finca del animal.');
  }
  await db.transaction('rw', [db.propiedades], async () => {
    await db.propiedades.where('animalId').equals(animalId).delete();
    await db.propiedades.bulkAdd(propiedades.map(p => ({ ...p, id: nuevoId(), animalId, createdAt: ahora() })));
  });
}

// ─── Razas ───────────────────────────────────────────────────────────────────

export function useRazas() {
  return useLiveQuery(() => db.razas.toArray(), [], []);
}
export async function crearRaza(datos: Omit<Raza, 'id'>): Promise<Raza> {
  const r: Raza = { ...datos, id: nuevoId() };
  await db.razas.add(r); return r;
}

// ─── Potreros ────────────────────────────────────────────────────────────────

export function usePotreros(fincaId: string | undefined) {
  return useLiveQuery(
    () => (fincaId ? db.potreros.where('fincaId').equals(fincaId).toArray() : []),
    [fincaId], [] as Potrero[],
  );
}
export async function crearPotrero(datos: Omit<Potrero, 'id' | 'createdAt' | 'updatedAt'>): Promise<Potrero> {
  if (!(await db.fincas.get(datos.fincaId))) throw new Error('La finca seleccionada no existe.');
  if (datos.hectareas !== undefined) validarNumero(datos.hectareas, 'Las hectáreas', 0.01, 10_000_000);
  if (datos.capacidad !== undefined) validarNumero(datos.capacidad, 'La capacidad', 1, 1_000_000);
  const p: Potrero = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.potreros.add(p); return p;
}
export async function actualizarPotrero(id: string, cambios: Partial<Pick<Potrero, 'nombre' | 'hectareas' | 'capacidad'>>): Promise<void> {
  if (cambios.hectareas !== undefined) validarNumero(cambios.hectareas, 'Las hectáreas', 0.01, 10_000_000);
  if (cambios.capacidad !== undefined) validarNumero(cambios.capacidad, 'La capacidad', 1, 1_000_000);
  await db.potreros.update(id, { ...cambios, updatedAt: ahora() });
}
export async function eliminarPotrero(id: string): Promise<void> {
  await db.transaction('rw', [db.potreros, db.animales], async () => {
    await db.animales.where('potreroActualId').equals(id).modify({ potreroActualId: undefined, updatedAt: ahora() });
    await db.potreros.delete(id);
  });
}
export async function moverAnimal(animalId: string, potreroDestinoId: string, fecha: string, observaciones?: string): Promise<void> {
  const animal = await db.animales.get(animalId);
  if (!animal) throw new Error('El animal no existe.');
  const destino = await db.potreros.get(potreroDestinoId);
  if (!destino) throw new Error('El potrero de destino no existe.');
  validarFecha(fecha, 'La fecha del movimiento');
  if (destino.fincaId !== animal.fincaId) throw new Error(`${destino.nombre} pertenece a otra finca.`);
  if (animal.potreroActualId === potreroDestinoId) throw new Error(`${animal.codigo} ya está en ese potrero.`);

  await db.transaction('rw', [db.movimientosPotrero, db.animales], async () => {
    const mov: MovimientoPotrero = {
      id: nuevoId(), animalId,
      potreroOrigenId: animal.potreroActualId,
      potreroDestinoId, fecha, observaciones,
    };
    await db.movimientosPotrero.add(mov);
    await db.animales.update(animalId, { potreroActualId: potreroDestinoId, updatedAt: ahora() });
  });
}
export function useMovimientosDeAnimal(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.movimientosPotrero.where('animalId').equals(animalId).toArray() : []),
    [animalId], [] as MovimientoPotrero[],
  );
}

// ─── Animales ────────────────────────────────────────────────────────────────

export function useAnimales(fincaId: string | undefined) {
  return useLiveQuery(
    () => (fincaId ? db.animales.where('fincaId').equals(fincaId).filter(a => !a.deletedAt).toArray() : []),
    [fincaId], [] as Animal[],
  );
}
export function useAnimalesEliminados(fincaId: string | undefined) {
  return useLiveQuery(
    () => (fincaId ? db.animales.where('fincaId').equals(fincaId).filter(a => !!a.deletedAt).toArray() : []),
    [fincaId], [] as Animal[],
  );
}
export function useAnimal(id: string | undefined) {
  return useLiveQuery(() => (id ? db.animales.get(id) : undefined), [id]);
}

// ─── Validación central (punto único de verdad — ver auditoría Fase I) ──────
// Antes, la unicidad de código se validaba por separado y de forma idéntica
// en animal-nuevo.tsx y animal-editar.tsx. Centralizarla acá significa que
// CUALQUIER camino de escritura (formularios, futuras importaciones, etc.)
// queda protegido, no solo los dos formularios que la reimplementaban.

/** true si `codigo` está libre para usarse en `fincaId` (case-insensitive). */
export async function codigoAnimalDisponible(fincaId: string, codigo: string, excluirId?: string): Promise<boolean> {
  const normalizado = codigo.trim().toLowerCase();
  if (!normalizado) return false;
  const existentes = await db.animales.where('fincaId').equals(fincaId).toArray();
  return !existentes.some(a => a.id !== excluirId && a.codigo.trim().toLowerCase() === normalizado);
}

/** Verifica que padre/madre (si se indican) existan y tengan el sexo correcto. */
/** Verifica que padre/madre (si se indican) existan, tengan el sexo correcto
 *  y pertenezcan a la MISMA finca — un animal de otra finca no puede quedar
 *  vinculado como ancestro (informe de auditoría externa, punto 3.1). */
async function validarPadreMadre(fincaId: string, padreId: string | undefined, madreId: string | undefined, idPropio?: string): Promise<void> {
  if (padreId) {
    if (padreId === idPropio) throw new Error('Un animal no puede ser su propio padre.');
    const padre = await db.animales.get(padreId);
    if (!padre) throw new Error('El padre seleccionado no existe.');
    if (padre.sexo !== 'macho') throw new Error(`${padre.codigo} está registrado como hembra y no puede ser el padre.`);
    if (padre.fincaId !== fincaId) throw new Error(`${padre.codigo} pertenece a otra finca y no puede asignarse como padre.`);
  }
  if (madreId) {
    if (madreId === idPropio) throw new Error('Un animal no puede ser su propia madre.');
    const madre = await db.animales.get(madreId);
    if (!madre) throw new Error('La madre seleccionada no existe.');
    if (madre.sexo !== 'hembra') throw new Error(`${madre.codigo} está registrado como macho y no puede ser la madre.`);
    if (madre.fincaId !== fincaId) throw new Error(`${madre.codigo} pertenece a otra finca y no puede asignarse como madre.`);
  }
}

export async function crearAnimal(datos: Omit<Animal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Animal> {
  const codigo = datos.codigo.trim();
  if (!codigo) throw new Error('El código del animal es obligatorio.');
  validarDatosAnimal(datos);
  await validarPadreMadre(datos.fincaId, datos.padreId, datos.madreId);

  if (datos.potreroActualId) {
    const potrero = await db.potreros.get(datos.potreroActualId);
    if (!potrero) throw new Error('El potrero seleccionado no existe.');
    if (potrero.fincaId !== datos.fincaId) throw new Error(`${potrero.nombre} pertenece a otra finca.`);
  }

  const a: Animal = { ...datos, codigo, id: nuevoId(), createdAt: ahora(), updatedAt: ahora() };

  // El chequeo de código único y el alta van en LA MISMA transacción Dexie:
  // así, si dos llamadas a crearAnimal ocurren casi al mismo tiempo (doble
  // toque, dos pestañas abiertas), IndexedDB serializa ambas transacciones
  // en vez de dejar que las dos vean "código libre" antes de que ninguna
  // haya escrito todavía (informe de auditoría externa, punto 3.3).
  await db.transaction('rw', [db.animales, db.fincas], async () => {
    if (!(await codigoAnimalDisponible(datos.fincaId, codigo))) {
      throw new Error(`Ya existe un animal con el código "${codigo}" en esta finca.`);
    }
    await db.animales.add(a);

    // Avanza el correlativo de numeración automática de la finca, para que
    // la próxima vez que se use "Auto" no vuelva a proponer el mismo código.
    const finca = await db.fincas.get(a.fincaId);
    if (finca && finca.esquemaNumeracion.tipo !== 'manual') {
      const siguiente = (finca.esquemaNumeracion.siguienteConsecutivo ?? 1) + 1;
      await db.fincas.update(finca.id, {
        esquemaNumeracion: { ...finca.esquemaNumeracion, siguienteConsecutivo: siguiente },
        updatedAt: ahora(),
      });
    }
  });

  return a;
}
export async function actualizarAnimal(id: string, cambios: Partial<Animal>): Promise<void> {
  if (cambios.estado !== undefined) {
    throw new Error('El estado del animal no se cambia editándolo directamente — usá "Vender", "Registrar Muerte", o la acción de préstamo desde la ficha.');
  }
  const actual = await db.animales.get(id);
  if (!actual) throw new Error('El animal no existe.');
  if (cambios.fincaId !== undefined && cambios.fincaId !== actual.fincaId) {
    throw new Error('No se puede cambiar un animal de finca desde la edición.');
  }
  const fincaId = actual.fincaId;
  validarDatosAnimal({ ...actual, ...cambios });

  if (cambios.codigo !== undefined) {
    const codigo = cambios.codigo.trim();
    if (!codigo) throw new Error('El código del animal es obligatorio.');
    cambios = { ...cambios, codigo };
  }
  if (cambios.padreId !== undefined || cambios.madreId !== undefined) {
    await validarPadreMadre(
      fincaId,
      cambios.padreId !== undefined ? cambios.padreId || undefined : actual.padreId,
      cambios.madreId !== undefined ? cambios.madreId || undefined : actual.madreId,
      id,
    );
  }
  if (cambios.potreroActualId !== undefined && cambios.potreroActualId) {
    const potrero = await db.potreros.get(cambios.potreroActualId);
    if (!potrero) throw new Error('El potrero seleccionado no existe.');
    if (potrero.fincaId !== fincaId) throw new Error(`${potrero.nombre} pertenece a otra finca.`);
  }

  // Mismo motivo que en crearAnimal: chequeo de unicidad + escritura en una
  // sola transacción, para que dos ediciones simultáneas del código no se
  // pisen sin darse cuenta.
  await db.transaction('rw', [db.animales], async () => {
    if (cambios.codigo !== undefined) {
      if (!(await codigoAnimalDisponible(fincaId!, cambios.codigo, id))) {
        throw new Error(`Ya existe un animal con el código "${cambios.codigo}" en esta finca.`);
      }
    }
    await db.animales.update(id, { ...cambios, updatedAt: ahora() });
  });
}

/** Único punto de entrada para mover un animal entre 'vivo' y 'prestado'. */
export async function cambiarEstadoAnimal(animalId: string, nuevoEstado: 'vivo' | 'prestado'): Promise<void> {
  const animal = await db.animales.get(animalId);
  if (!animal) throw new Error('El animal no existe.');
  if (!transicionEstadoValida(animal.estado, nuevoEstado)) {
    throw new Error(`${animal.codigo} no puede pasar de "${animal.estado}" a "${nuevoEstado}".`);
  }
  await db.animales.update(animalId, { estado: nuevoEstado, updatedAt: ahora() });
}
export async function moverAnimalAPapelera(id: string, razon?: string): Promise<void> {
  await db.animales.update(id, { deletedAt: ahora(), deletedReason: razon, updatedAt: ahora() });
}
export async function restaurarAnimal(id: string): Promise<void> {
  await db.transaction('rw', [db.animales], async () => {
    const animal = await db.animales.get(id);
    if (!animal) throw new Error('El animal no existe.');
    if (!(await codigoAnimalDisponible(animal.fincaId, animal.codigo, id))) {
      throw new Error(`No se puede restaurar ${animal.codigo}: ya existe otro animal con ese código en esta finca.`);
    }
    await db.animales.update(id, { deletedAt: undefined, deletedReason: undefined, updatedAt: ahora() });
  });
}
export async function eliminarAnimalDefinitivamente(id: string): Promise<void> {
  await db.transaction('rw', [
    db.animales, db.propiedades, db.registrosLeche, db.eventosSalud,
    db.pesajes, db.montas, db.partos, db.ventas, db.muertes,
    db.movimientosPotrero, db.fotosAnimal, db.movimientosFinancieros,
  ], async () => {
    await db.animales.delete(id);
    await db.propiedades.where('animalId').equals(id).delete();
    await db.registrosLeche.where('animalId').equals(id).delete();
    await db.eventosSalud.where('animalId').equals(id).delete();
    await db.pesajes.where('animalId').equals(id).delete();
    await db.montas.where('hembraId').equals(id).delete();
    await db.montas.where('machoId').equals(id).delete();
    await db.partos.where('madreId').equals(id).delete();
    await db.ventas.where('animalId').equals(id).delete();
    await db.muertes.where('animalId').equals(id).delete();
    await db.movimientosPotrero.where('animalId').equals(id).delete();
    await db.fotosAnimal.where('animalId').equals(id).delete();
    await db.movimientosFinancieros.where('animalId').equals(id).delete();
  });
}
/** Cuenta cuántos registros de cada tipo se borrarían con
 *  eliminarAnimalDefinitivamente — para mostrarle al usuario qué va a perder
 *  ANTES de confirmar el borrado permanente, no solo un texto genérico. */
export interface ResumenBorradoAnimal {
  pesajes: number; eventosSalud: number; leche: number; montas: number;
  partos: number; ventas: number; muertes: number; movimientos: number; fotos: number;
}
export async function resumenBorradoAnimal(id: string): Promise<ResumenBorradoAnimal> {
  const [pesajes, eventosSalud, leche, montasHembra, montasMacho, partos, ventas, muertes, movimientos, fotos] = await Promise.all([
    db.pesajes.where('animalId').equals(id).count(),
    db.eventosSalud.where('animalId').equals(id).count(),
    db.registrosLeche.where('animalId').equals(id).count(),
    db.montas.where('hembraId').equals(id).count(),
    db.montas.where('machoId').equals(id).count(),
    db.partos.where('madreId').equals(id).count(),
    db.ventas.where('animalId').equals(id).count(),
    db.muertes.where('animalId').equals(id).count(),
    db.movimientosPotrero.where('animalId').equals(id).count(),
    db.fotosAnimal.where('animalId').equals(id).count(),
  ]);
  return { pesajes, eventosSalud, leche, montas: montasHembra + montasMacho, partos, ventas, muertes, movimientos, fotos };
}
export const eliminarAnimal = moverAnimalAPapelera;

// ─── Fotos ───────────────────────────────────────────────────────────────────

export function useFotosAnimal(animalId: string | undefined, tipo?: TipoFoto) {
  return useLiveQuery(
    () => {
      if (!animalId) return [];
      if (tipo) return db.fotosAnimal.where('[animalId+tipo]').equals([animalId, tipo]).toArray();
      return db.fotosAnimal.where('animalId').equals(animalId).toArray();
    },
    [animalId, tipo ?? ''], [],
  );
}
export async function agregarFoto(datos: Omit<FotoAnimal, 'id' | 'createdAt'>): Promise<FotoAnimal> {
  if (!(await db.animales.get(datos.animalId))) throw new Error('El animal no existe.');
  const f: FotoAnimal = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.fotosAnimal.add(f);
  // Actualizar fotoUrl del animal si es la primera foto de tipo 'animal'
  if (datos.tipo === 'animal') {
    const existentes = await db.fotosAnimal.where('[animalId+tipo]').equals([datos.animalId, 'animal']).count();
    if (existentes === 1) {
      await db.animales.update(datos.animalId, { fotoUrl: datos.datos, updatedAt: ahora() });
    }
  }
  return f;
}
export async function eliminarFoto(id: string): Promise<void> {
  const foto = await db.fotosAnimal.get(id);
  await db.fotosAnimal.delete(id);
  // Si era la foto principal, actualizar con la siguiente disponible
  if (foto?.tipo === 'animal') {
    const siguiente = await db.fotosAnimal.where('[animalId+tipo]').equals([foto.animalId, 'animal']).first();
    await db.animales.update(foto.animalId, { fotoUrl: siguiente?.datos, updatedAt: ahora() });
  }
}
export async function actualizarDescripcionFoto(id: string, descripcion: string): Promise<void> {
  await db.fotosAnimal.update(id, { descripcion });
}

// ─── Leche ───────────────────────────────────────────────────────────────────

export function useRegistrosLeche(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.registrosLeche.where('animalId').equals(animalId).toArray() : []),
    [animalId], [] as RegistroLeche[],
  );
}
export function useRegistrosLechesDeFinca(animalIds: string[]) {
  const key = animalIds.join(',');
  return useLiveQuery(
    () => (animalIds.length ? db.registrosLeche.where('animalId').anyOf(animalIds).toArray() : []),
    [key], [] as RegistroLeche[],
  );
}
export async function registrarLeche(datos: Omit<RegistroLeche, 'id' | 'createdAt'>): Promise<RegistroLeche> {
  const animal = await db.animales.get(datos.animalId);
  if (!animal) throw new Error('El animal no existe.');
  validarFecha(datos.fecha, 'La fecha de producción');
  if (datos.litrosManana !== undefined) validarNumero(datos.litrosManana, 'Los litros de la mañana', 0, 100_000);
  if (datos.litrosTarde !== undefined) validarNumero(datos.litrosTarde, 'Los litros de la tarde', 0, 100_000);
  if (animal.sexo !== 'hembra') throw new Error(`${animal.codigo} está registrado como macho; no puede tener producción de leche.`);
  if (animal.estado !== 'vivo') throw new Error(`${animal.codigo} figura como "${animal.estado}" y no puede registrar producción de leche.`);
  const r: RegistroLeche = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.registrosLeche.add(r); return r;
}
export async function eliminarRegistroLeche(id: string): Promise<void> {
  await db.registrosLeche.delete(id);
}

// ─── Reproducción ────────────────────────────────────────────────────────────

export function useMontas(animalIds: string[]) {
  const key = animalIds.join(',');
  return useLiveQuery(
    () => (animalIds.length ? db.montas.where('hembraId').anyOf(animalIds).toArray() : []),
    [key], [] as Monta[],
  );
}
export function useMontasDeHembra(hembraId: string | undefined) {
  return useLiveQuery(
    () => (hembraId ? db.montas.where('hembraId').equals(hembraId).toArray() : []),
    [hembraId], [] as Monta[],
  );
}
export function useMontasGestacion(hembraIds: string[]) {
  const key = hembraIds.join(',');
  return useLiveQuery(
    () => (hembraIds.length
      ? db.montas.where('hembraId').anyOf(hembraIds).filter(m => m.resultado === 'gestacion').toArray()
      : []),
    [key], [] as Monta[],
  );
}
/** Verifica sexo, estado vital y coherencia de fechas antes de guardar una monta. */
function validarMonta(hembra: Animal, macho: Animal | undefined, fecha: string): void {
  validarFecha(fecha, 'La fecha de la monta');
  if (hembra.sexo !== 'hembra') throw new Error(`${hembra.codigo} está registrado como macho; no puede recibir una monta.`);
  if (hembra.estado !== 'vivo') throw new Error(`${hembra.codigo} figura como "${hembra.estado}" y no puede registrar una monta.`);
  if (hembra.fechaNacimiento && fecha < hembra.fechaNacimiento) {
    throw new Error(`La fecha de la monta no puede ser anterior al nacimiento de ${hembra.codigo}.`);
  }
  if (macho) {
    if (macho.id === hembra.id) throw new Error('Un animal no puede montarse a sí mismo.');
    if (macho.sexo !== 'macho') throw new Error(`${macho.codigo} está registrado como hembra; no puede ser el reproductor de esta monta.`);
    if (macho.estado !== 'vivo') throw new Error(`${macho.codigo} figura como "${macho.estado}" y no puede registrar una monta.`);
    if (macho.fincaId !== hembra.fincaId) throw new Error(`${macho.codigo} pertenece a otra finca; no puede registrarse como reproductor de ${hembra.codigo}.`);
  }
}
/** Se lanza cuando una monta es válida pero hembra y macho están emparentados
 *  dentro de las últimas generaciones registradas — a diferencia de los demás
 *  errores de validación, esto no es imposible, es arriesgado: la UI puede
 *  capturar este tipo de error específico y ofrecer confirmar igual. */
export class ErrorConsanguinidad extends Error {}

export async function registrarMonta(
  datos: Omit<Monta, 'id' | 'createdAt'>,
  opciones?: { confirmarConsanguinidad?: boolean },
): Promise<Monta> {
  const hembra = await db.animales.get(datos.hembraId);
  if (!hembra) throw new Error('La hembra seleccionada no existe.');
  const macho = datos.machoId ? await db.animales.get(datos.machoId) : undefined;
  if (datos.machoId && !macho) throw new Error('El macho seleccionado no existe.');
  validarMonta(hembra, macho, datos.fecha);

  if (macho && !opciones?.confirmarConsanguinidad) {
    const todos = await db.animales.toArray();
    if (parentescoCercano(hembra, macho, todos)) {
      throw new ErrorConsanguinidad(
        `${hembra.codigo} y ${macho.codigo} están emparentados entre sí (según la genealogía registrada). ¿Registrar la monta de todas formas?`,
      );
    }
  }

  const m: Monta = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.transaction('rw', [db.montas], async () => {
    await db.montas.add(m);
  });
  return m;
}
export async function actualizarResultadoMonta(montaId: string, resultado: ResultadoMonta, observaciones?: string): Promise<void> {
  const monta = await db.montas.get(montaId);
  if (!monta) throw new Error('La monta no existe.');

  // Confirmar el resultado de una monta es, en la práctica, el evento que
  // define si la hembra está gestante — antes esta función existía pero
  // nada la llamaba, así que "Hembras gestantes" en el inicio y "Próximos
  // partos" quedaban siempre vacíos por más montas que hubiera cargadas.
  await db.transaction('rw', [db.montas, db.animales], async () => {
    await db.montas.update(montaId, { resultado, ...(observaciones !== undefined ? { observaciones } : {}) });
    if (resultado === 'gestacion') {
      await db.animales.update(monta.hembraId, { estadoReproductivoHembra: 'gestante', updatedAt: ahora() });
    } else if (resultado === 'vacia' || resultado === 'aborto') {
      const hembra = await db.animales.get(monta.hembraId);
      if (hembra?.estadoReproductivoHembra === 'gestante') {
        await db.animales.update(monta.hembraId, { estadoReproductivoHembra: 'vacia', updatedAt: ahora() });
      }
    }
  });
}
export function usePartosDeMadre(madreId: string | undefined) {
  return useLiveQuery(
    () => (madreId ? db.partos.where('madreId').equals(madreId).toArray() : []),
    [madreId], [] as Parto[],
  );
}
export function usePartosDeFinca(hembraIds: string[]) {
  const key = hembraIds.join(',');
  return useLiveQuery(
    () => (hembraIds.length ? db.partos.where('madreId').anyOf(hembraIds).toArray() : []),
    [key], [] as Parto[],
  );
}
export async function registrarParto(datos: Omit<Parto, 'id' | 'createdAt'>): Promise<Parto> {
  const madre = await db.animales.get(datos.madreId);
  if (!madre) throw new Error('La madre seleccionada no existe.');
  validarFecha(datos.fecha, 'La fecha del parto');
  validarNumero(datos.numCrias, 'El número de crías', 1, 20);
  if (madre.sexo !== 'hembra') throw new Error(`${madre.codigo} está registrado como macho; no puede tener partos.`);
  if (madre.estado === 'vendido') throw new Error(`${madre.codigo} figura como vendida; no se le puede registrar un parto.`);
  if (madre.fechaNacimiento && datos.fecha < madre.fechaNacimiento) {
    throw new Error(`La fecha del parto no puede ser anterior al nacimiento de ${madre.codigo}.`);
  }
  if (madre.estado === 'muerto' && madre.fechaEstado && datos.fecha > madre.fechaEstado) {
    throw new Error(`${madre.codigo} figura como muerta desde antes de esta fecha de parto.`);
  }
  if (datos.montaId) {
    const monta = await db.montas.get(datos.montaId);
    if (!monta) throw new Error('La monta seleccionada no existe.');
    if (monta.hembraId !== madre.id) throw new Error('La monta seleccionada pertenece a otra madre.');
    const macho = monta.machoId ? await db.animales.get(monta.machoId) : undefined;
    if (macho && macho.fincaId !== madre.fincaId) throw new Error('La monta contiene un reproductor de otra finca.');
    if (datos.fecha < monta.fecha) {
      throw new Error('El parto no puede ser anterior a la monta que le dio origen.');
    }
  }
  const criasUnicas = new Set(datos.criaIds);
  if (criasUnicas.size !== datos.criaIds.length) throw new Error('Una cría no puede aparecer dos veces en el mismo parto.');
  const crias = await Promise.all(datos.criaIds.map(id => db.animales.get(id)));
  if (crias.some(cria => !cria)) throw new Error('Una de las crías seleccionadas no existe.');
  if (crias.some(cria => cria!.fincaId !== madre.fincaId)) {
    throw new Error('Todas las crías deben pertenecer a la misma finca de la madre.');
  }

  const p: Parto = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.transaction('rw', [db.partos, db.animales], async () => {
    await db.partos.add(p);
    // El parto es un hecho biológico confirmado: la hembra pasa a lactante
    // automáticamente, sin que el usuario tenga que acordarse de editarlo
    // aparte (y sin que otra pantalla tenga que reinventar esta regla).
    await db.animales.update(madre.id, { estadoReproductivoHembra: 'lactante', updatedAt: ahora() });
  });
  return p;
}

// ─── Salud ───────────────────────────────────────────────────────────────────

export function useEventosSalud(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.eventosSalud.where('animalId').equals(animalId).toArray() : []),
    [animalId], [] as EventoSalud[],
  );
}
export function useEventosSaludDeFinca(animalIds: string[]) {
  const key = animalIds.join(',');
  return useLiveQuery(
    () => (animalIds.length ? db.eventosSalud.where('animalId').anyOf(animalIds).toArray() : []),
    [key], [] as EventoSalud[],
  );
}
export function useProximosEventosSalud(animalIds: string[]) {
  const key = animalIds.join(',');
  return useLiveQuery(
    () => (animalIds.length
      ? db.eventosSalud.where('animalId').anyOf(animalIds).filter(e => !!e.proximaFecha).toArray()
      : []),
    [key], [] as EventoSalud[],
  );
}
export async function registrarEventoSalud(datos: Omit<EventoSalud, 'id' | 'createdAt'>): Promise<EventoSalud> {
  const animal = await db.animales.get(datos.animalId);
  if (!animal) throw new Error('El animal no existe.');
  validarFecha(datos.fecha, 'La fecha del evento de salud');
  if (datos.proximaFecha) validarFecha(datos.proximaFecha, 'La próxima fecha', true);
  if (datos.costo !== undefined) validarNumero(datos.costo, 'El costo');
  const e: EventoSalud = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.eventosSalud.add(e); return e;
}
export async function eliminarEventoSalud(id: string): Promise<void> {
  await db.eventosSalud.delete(id);
}
export async function aplicarPlanSanitario(animalIds: string[], datos: Omit<EventoSalud, 'id' | 'animalId' | 'createdAt' | 'loteId'>): Promise<void> {
  if (!animalIds.length) return;
  const animales = await Promise.all(animalIds.map(id => db.animales.get(id)));
  if (animales.some(animal => !animal)) throw new Error('El plan sanitario contiene un animal inexistente.');
  const loteId = nuevoId();
  await db.eventosSalud.bulkAdd(
    animalIds.map(animalId => ({ ...datos, id: nuevoId(), animalId, loteId, createdAt: ahora() })),
  );
}

// ─── Pesajes ─────────────────────────────────────────────────────────────────

export function usePesajes(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.pesajes.where('animalId').equals(animalId).toArray() : []),
    [animalId], [] as Pesaje[],
  );
}
export function usePesajesDeFinca(animalIds: string[]) {
  const key = animalIds.join(',');
  return useLiveQuery(
    () => (animalIds.length ? db.pesajes.where('animalId').anyOf(animalIds).toArray() : []),
    [key], [] as Pesaje[],
  );
}
export async function registrarPesaje(datos: Omit<Pesaje, 'id' | 'createdAt'>): Promise<Pesaje> {
  const animal = await db.animales.get(datos.animalId);
  if (!animal) throw new Error('El animal no existe.');
  validarFecha(datos.fecha, 'La fecha del pesaje');
  validarNumero(datos.pesoKg, 'El peso', 0.01, 10_000);
  if (animal.fechaNacimiento && datos.fecha < animal.fechaNacimiento) {
    throw new Error('La fecha del pesaje no puede ser anterior al nacimiento del animal.');
  }
  const p: Pesaje = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.pesajes.add(p); return p;
}
export async function eliminarPesaje(id: string): Promise<void> {
  await db.pesajes.delete(id);
}

// ─── Ventas y muertes ────────────────────────────────────────────────────────

export function useVentas(fincaAnimalIds: string[]) {
  const key = fincaAnimalIds.join(',');
  return useLiveQuery(
    () => (fincaAnimalIds.length ? db.ventas.where('animalId').anyOf(fincaAnimalIds).toArray() : []),
    [key], [],
  );
}
export function useVentasDeAnimal(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.ventas.where('animalId').equals(animalId).toArray() : []),
    [animalId], [],
  );
}
export function useMuertesDeAnimal(animalId: string | undefined) {
  return useLiveQuery(
    () => (animalId ? db.muertes.where('animalId').equals(animalId).toArray() : []),
    [animalId], [],
  );
}
export async function registrarVenta(datos: Omit<Venta, 'id' | 'createdAt'>): Promise<Venta> {
  const animal = await db.animales.get(datos.animalId);
  if (!animal) throw new Error('El animal no existe.');
  validarFecha(datos.fecha, 'La fecha de la venta');
  if (datos.precio !== undefined) validarNumero(datos.precio, 'El precio de venta', 0, 100_000_000);
  if (!transicionEstadoValida(animal.estado, 'vendido')) {
    throw new Error(`${animal.codigo} está "${animal.estado}" y no se puede vender.`);
  }

  const v: Venta = { ...datos, id: nuevoId(), createdAt: ahora() };
  // Transaccional: la venta, el cambio de estado del animal y (si hay precio)
  // el ingreso en Finanzas se escriben juntos — antes la venta no generaba
  // ningún movimiento financiero y había que cargar el ingreso a mano aparte.
  await db.transaction('rw', [db.ventas, db.animales, db.movimientosFinancieros], async () => {
    await db.ventas.add(v);
    await db.animales.update(datos.animalId, { estado: 'vendido', fechaEstado: datos.fecha, updatedAt: ahora() });
    if (datos.precio && datos.precio > 0) {
      const mf: MovimientoFinanciero = {
        id: nuevoId(),
        fincaId: animal.fincaId,
        tipo: 'ingreso',
        categoria: 'venta_animal',
        monto: datos.precio,
        moneda: datos.moneda || 'USD',
        fecha: datos.fecha,
        descripcion: `Venta de ${animal.codigo}${datos.comprador ? ` a ${datos.comprador}` : ''}`,
        animalId: datos.animalId,
        createdAt: ahora(),
      };
      await db.movimientosFinancieros.add(mf);
    }
  });
  return v;
}
export async function registrarMuerte(datos: Omit<Muerte, 'id' | 'createdAt'>): Promise<Muerte> {
  const animal = await db.animales.get(datos.animalId);
  if (!animal) throw new Error('El animal no existe.');
  validarFecha(datos.fecha, 'La fecha de la muerte');
  if (!transicionEstadoValida(animal.estado, 'muerto')) {
    throw new Error(`${animal.codigo} está "${animal.estado}" y no se puede registrar como muerto.`);
  }

  const m: Muerte = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.transaction('rw', [db.muertes, db.animales], async () => {
    await db.muertes.add(m);
    await db.animales.update(datos.animalId, { estado: 'muerto', fechaEstado: datos.fecha, motivoEstado: datos.causa, updatedAt: ahora() });
  });
  return m;
}

// ─── GDP (Ganancia Diaria de Peso) ───────────────────────────────────────────

export function calcularGDP(pesajes: Pesaje[]): GananciaWeight[] {
  const ord = [...pesajes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (ord.length < 2) return [];
  const res: GananciaWeight[] = [];
  for (let i = 1; i < ord.length; i++) {
    const dias = (new Date(ord[i].fecha).getTime() - new Date(ord[i - 1].fecha).getTime()) / 86400000;
    if (dias <= 0) continue;
    res.unshift({
      gdpKgDia: parseFloat(((ord[i].pesoKg - ord[i - 1].pesoKg) / dias).toFixed(3)),
      diasEntrePesajes: Math.round(dias),
      pesoInicial: ord[i - 1].pesoKg,
      pesoFinal: ord[i].pesoKg,
      fechaInicial: ord[i - 1].fecha,
      fechaFinal: ord[i].fecha,
    });
  }
  return res;
}

// ─── Finanzas ────────────────────────────────────────────────────────────────

export function useMovimientosFinancieros(fincaId: string | undefined) {
  return useLiveQuery(
    () => (fincaId ? db.movimientosFinancieros.where('fincaId').equals(fincaId).toArray() : []),
    [fincaId], [] as MovimientoFinanciero[],
  );
}
export async function registrarMovimientoFinanciero(
  datos: Omit<MovimientoFinanciero, 'id' | 'createdAt'>,
): Promise<MovimientoFinanciero> {
  const finca = await db.fincas.get(datos.fincaId);
  if (!finca) throw new Error('La finca seleccionada no existe.');
  validarFecha(datos.fecha, 'La fecha del movimiento');
  validarNumero(datos.monto, 'El monto', 0.01, 100_000_000);
  if (datos.animalId) {
    const animal = await db.animales.get(datos.animalId);
    if (!animal) throw new Error('El animal asociado no existe.');
    if (animal.fincaId !== datos.fincaId) throw new Error('El animal asociado pertenece a otra finca.');
  }
  const m: MovimientoFinanciero = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.movimientosFinancieros.add(m); return m;
}
export async function eliminarMovimientoFinanciero(id: string): Promise<void> {
  await db.movimientosFinancieros.delete(id);
}

// ─── Nómina ──────────────────────────────────────────────────────────────────

export function useEmpleados(fincaId: string | undefined) {
  return useLiveQuery(
    () => (fincaId ? db.empleados.where('fincaId').equals(fincaId).toArray() : []),
    [fincaId], [] as Empleado[],
  );
}
export async function crearEmpleado(datos: Omit<Empleado, 'id' | 'createdAt' | 'updatedAt'>): Promise<Empleado> {
  if (!(await db.fincas.get(datos.fincaId))) throw new Error('La finca seleccionada no existe.');
  validarNumero(datos.salarioBase, 'El salario base');
  const e: Empleado = { ...datos, id: nuevoId(), createdAt: ahora(), updatedAt: ahora() };
  await db.empleados.add(e); return e;
}
export async function actualizarEmpleado(id: string, cambios: Partial<Empleado>): Promise<void> {
  await db.transaction('rw', [db.empleados, db.fincas], async () => {
    const actual = await db.empleados.get(id);
    if (!actual) throw new Error('El empleado no existe.');
    if (cambios.fincaId !== undefined && cambios.fincaId !== actual.fincaId) {
      throw new Error('No se puede cambiar un empleado de finca desde la edición.');
    }
    if (cambios.salarioBase !== undefined) validarNumero(cambios.salarioBase, 'El salario base');
    await db.empleados.update(id, { ...cambios, fincaId: actual.fincaId, updatedAt: ahora() });
  });
}
export async function eliminarEmpleado(id: string): Promise<void> {
  await db.transaction('rw', [db.empleados, db.recibosPago], async () => {
    const empleado = await db.empleados.get(id);
    if (!empleado) throw new Error('El empleado no existe.');
    const tieneRecibos = await db.recibosPago.where('empleadoId').equals(id).count();
    if (tieneRecibos > 0) {
      await db.empleados.update(id, { activo: false, updatedAt: ahora() });
      return;
    }
    await db.empleados.delete(id);
  });
}
export function useRecibosPago(fincaId: string | undefined) {
  return useLiveQuery(
    () => (fincaId ? db.recibosPago.where('fincaId').equals(fincaId).toArray() : []),
    [fincaId], [] as ReciboPago[],
  );
}
export function useRecibosPagoDeEmpleado(empleadoId: string | undefined) {
  return useLiveQuery(
    () => (empleadoId ? db.recibosPago.where('empleadoId').equals(empleadoId).toArray() : []),
    [empleadoId], [] as ReciboPago[],
  );
}
export async function crearReciboPago(datos: Omit<ReciboPago, 'id' | 'createdAt'>): Promise<ReciboPago> {
  const [empleado, finca] = await Promise.all([db.empleados.get(datos.empleadoId), db.fincas.get(datos.fincaId)]);
  if (!empleado || !finca) throw new Error('El empleado o la finca seleccionada no existe.');
  if (empleado.fincaId !== datos.fincaId) throw new Error('El empleado pertenece a otra finca.');
  validarFecha(datos.periodoDesde, 'El inicio del período');
  validarFecha(datos.periodoHasta, 'El fin del período');
  if (datos.periodoHasta < datos.periodoDesde) throw new Error('El fin del período no puede ser anterior al inicio.');
  validarNumero(datos.salarioBase, 'El salario base');
  validarNumero(datos.bonificaciones, 'Las bonificaciones');
  validarNumero(datos.deducciones, 'Las deducciones');
  const r: ReciboPago = { ...datos, id: nuevoId(), createdAt: ahora() };
  await db.recibosPago.add(r); return r;
}
export async function eliminarReciboPago(id: string): Promise<void> {
  await db.recibosPago.delete(id);
}
