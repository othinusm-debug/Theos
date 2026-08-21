// THEOS — Modelo de datos central
// 100% offline: todo se guarda en IndexedDB vía Dexie.

export type Especie =
  | 'bovino'
  | 'bufalino'
  | 'equino'
  | 'asnal'
  | 'mular'
  | 'porcino'
  | 'ovino'
  | 'caprino';

export type Sexo = 'macho' | 'hembra';
export type EstadoAnimal = 'vivo' | 'vendido' | 'muerto' | 'prestado';
export type EstadoReproductivoMacho = 'entero' | 'castrado' | 'reproductor' | 'retirado';
export type EstadoReproductivoHembra = 'vacia' | 'gestante' | 'lactante' | 'seca' | 'en_celo';

export interface Finca {
  id: string;
  nombre: string;
  ubicacion?: string;
  hectareasTotales?: number;
  esquemaNumeracion: EsquemaNumeracion;
  createdAt: string;
  updatedAt: string;
}

export type TipoEsquemaNumeracion =
  | 'basado_en_madre'
  | 'consecutivo'
  | 'por_anio'
  | 'prefijo_especie'
  | 'manual';

export interface EsquemaNumeracion {
  tipo: TipoEsquemaNumeracion;
  siguienteConsecutivo?: number;
}

export type RolUsuario = 'administrador' | 'propietario' | 'empleado' | 'veterinario';

export interface Usuario {
  id: string;
  fincaId: string;
  nombre: string;
  rol: RolUsuario;
  telefono?: string;
  createdAt: string;
}

export type TipoPropiedad = 'legal' | 'economica';

export interface Propiedad {
  id: string;
  animalId: string;
  usuarioId: string;
  tipo: TipoPropiedad;
  porcentaje: number;
  createdAt: string;
}

export interface Raza {
  id: string;
  especie: Especie;
  nombre: string;
  subrazas: string[];
}

export interface Potrero {
  id: string;
  fincaId: string;
  nombre: string;
  hectareas?: number;
  /** Cabezas máximas que el usuario considera razonable para este potrero —
   *  la carga la define quien conoce el campo, THEOS no la calcula ni asume
   *  factores agronómicos (unidades animales, etc.) sin datos suficientes. */
  capacidad?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MovimientoPotrero {
  id: string;
  animalId: string;
  potreroOrigenId?: string;
  potreroDestinoId: string;
  fecha: string;
  observaciones?: string;
}

// ── Fotos (galería múltiple por animal) ─────────────────────────────────────

export type TipoFoto = 'animal' | 'hierro_foto' | 'hierro_dibujo';

export interface FotoAnimal {
  id: string;
  animalId: string;
  tipo: TipoFoto;
  /** Base64 data URI — p.ej. "data:image/jpeg;base64,..." */
  datos: string;
  descripcion?: string;
  createdAt: string;
}

// ── Animal ───────────────────────────────────────────────────────────────────

export interface Animal {
  id: string;
  fincaId: string;
  codigo: string;
  nombre?: string;
  apodo?: string;
  especie: Especie;
  raza?: string;
  subraza?: string;
  sexo: Sexo;
  fechaNacimiento?: string;
  fechaNacimientoEstimada: boolean;
  color?: string;
  hierro?: string;
  /** URL/base64 de la foto principal (se mantiene para compatibilidad y PDF) */
  fotoUrl?: string;
  padreId?: string;
  madreId?: string;
  estado: EstadoAnimal;
  fechaEstado?: string;
  motivoEstado?: string;
  estadoReproductivoMacho?: EstadoReproductivoMacho;
  estadoReproductivoHembra?: EstadoReproductivoHembra;
  pesoNacimientoKg?: number;
  potreroActualId?: string;
  observaciones?: string;
  deletedAt?: string;
  deletedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistroLeche {
  id: string;
  animalId: string;
  fecha: string;
  litrosManana?: number;
  litrosTarde?: number;
  observaciones?: string;
  createdAt: string;
}

export type TipoMonta = 'natural' | 'inseminacion';
export type ResultadoMonta = 'pendiente' | 'gestacion' | 'vacia' | 'aborto';

export interface Monta {
  id: string;
  hembraId: string;
  machoId?: string;
  machoExterno?: string;
  fecha: string;
  tipo: TipoMonta;
  resultado: ResultadoMonta;
  observaciones?: string;
  createdAt: string;
}

export interface Parto {
  id: string;
  madreId: string;
  montaId?: string;
  fecha: string;
  numCrias: number;
  criaIds: string[];
  observaciones?: string;
  createdAt: string;
}

export type TipoEventoSalud =
  | 'vacuna'
  | 'desparasitacion'
  | 'vitamina'
  | 'examen'
  | 'enfermedad'
  | 'cirugia'
  | 'tratamiento'
  | 'alergia';

export interface EventoSalud {
  id: string;
  animalId: string;
  tipo: TipoEventoSalud;
  fecha: string;
  producto?: string;
  diagnostico?: string;
  veterinario?: string;
  costo?: number;
  proximaFecha?: string;
  observaciones?: string;
  loteId?: string;
  createdAt: string;
}

export interface Pesaje {
  id: string;
  animalId: string;
  fecha: string;
  pesoKg: number;
  observaciones?: string;
  createdAt: string;
}

export type EstadoVenta = 'activa' | 'completada' | 'cancelada';

export interface Venta {
  id: string;
  animalId: string;
  fecha: string;
  comprador?: string;
  precio?: number;
  moneda?: string;
  estado: EstadoVenta;
  observaciones?: string;
  createdAt: string;
}

export interface Muerte {
  id: string;
  animalId: string;
  fecha: string;
  causa?: string;
  observaciones?: string;
  createdAt: string;
}

// ── Finanzas ────────────────────────────────────────────────────────────────

export type TipoMovimientoFinanciero = 'ingreso' | 'egreso';
export type CategoriaIngreso = 'venta_animal' | 'venta_leche' | 'subsidio' | 'otro_ingreso';
export type CategoriaEgreso = 'salud' | 'alimentacion' | 'insumos' | 'nomina' | 'infraestructura' | 'otro_egreso';
export type CategoriaFinanciera = CategoriaIngreso | CategoriaEgreso;

export interface MovimientoFinanciero {
  id: string;
  fincaId: string;
  tipo: TipoMovimientoFinanciero;
  categoria: CategoriaFinanciera;
  monto: number;
  moneda: string;
  fecha: string;
  descripcion?: string;
  animalId?: string;
  createdAt: string;
}

export interface Empleado {
  id: string;
  fincaId: string;
  nombre: string;
  cargo?: string;
  salarioBase: number;
  moneda: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReciboPago {
  id: string;
  empleadoId: string;
  fincaId: string;
  periodoDesde: string;
  periodoHasta: string;
  salarioBase: number;
  bonificaciones: number;
  deducciones: number;
  totalNeto: number;
  moneda: string;
  observaciones?: string;
  createdAt: string;
}

// ── Tipos calculados ─────────────────────────────────────────────────────────

export interface GananciaWeight {
  gdpKgDia: number;
  diasEntrePesajes: number;
  pesoInicial: number;
  pesoFinal: number;
  fechaInicial: string;
  fechaFinal: string;
}

export interface EntradaCalendario {
  monta: Monta;
  hembra: Animal;
  fechaEsperadaParto: string;
  diasRestantes: number;
  diasGestacion: number;
}
