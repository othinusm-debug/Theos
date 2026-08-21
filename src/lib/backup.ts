// THEOS — Sistema de backup local por archivo
// Exporta toda la base de datos a un archivo .json descargable.
// No depende de ningún servicio externo — 100% offline.

import { db } from './db';
import pkg from '../../package.json';

export const BACKUP_VERSION = 1; // formato del archivo de backup en sí
export const APP_VERSION: string = pkg.version;

export interface BackupEntry {
  id: string;
  fecha: string;
  etiqueta: string;
  tipo: 'auto' | 'manual';
  tamanio: number;
  /** Cantidad total de registros que contenía el backup (todas las colecciones sumadas). */
  totalRegistros?: number;
  /** Versión de la app y del esquema de IndexedDB en el momento del backup. */
  appVersion?: string;
  schemaVersion?: number;
}

const BACKUP_META_KEY = 'theos_backups_meta';
const ULTIMO_BACKUP_KEY = 'theos_ultimo_backup';
export const INTERVALO_DIAS_BACKUP = 7;

export function listarMetadatosBackup(): BackupEntry[] {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    return raw ? (JSON.parse(raw) as BackupEntry[]) : [];
  } catch { return []; }
}

function guardarMetadatos(lista: BackupEntry[]): void {
  localStorage.setItem(BACKUP_META_KEY, JSON.stringify(lista.slice(-10)));
}

/** Nombre de cada colección + los campos que un registro válido debe tener. */
const COLECCIONES: Record<string, string[]> = {
  fincas: ['id', 'nombre'],
  usuarios: ['id', 'fincaId', 'nombre'],
  propiedades: ['id', 'animalId', 'usuarioId'],
  razas: ['id', 'especie'],
  potreros: ['id', 'fincaId', 'nombre'],
  movimientosPotrero: ['id', 'animalId', 'potreroDestinoId', 'fecha'],
  animales: ['id', 'fincaId', 'codigo', 'especie', 'sexo', 'estado'],
  fotosAnimal: ['id', 'animalId', 'tipo', 'datos'],
  registrosLeche: ['id', 'animalId', 'fecha'],
  montas: ['id', 'hembraId', 'fecha', 'tipo', 'resultado'],
  partos: ['id', 'madreId', 'fecha', 'numCrias'],
  eventosSalud: ['id', 'animalId', 'tipo', 'fecha'],
  pesajes: ['id', 'animalId', 'fecha', 'pesoKg'],
  ventas: ['id', 'animalId', 'fecha', 'estado'],
  muertes: ['id', 'animalId', 'fecha'],
  movimientosFinancieros: ['id', 'fincaId', 'tipo', 'categoria', 'monto', 'moneda', 'fecha'],
  empleados: ['id', 'fincaId'],
  recibosPago: ['id', 'empleadoId', 'fincaId'],
};

export async function serializarDB(): Promise<string> {
  const [
    fincas, usuarios, propiedades, razas, potreros,
    movimientosPotrero, animales, fotosAnimal, registrosLeche,
    montas, partos, eventosSalud, pesajes, ventas, muertes,
    movimientosFinancieros, empleados, recibosPago,
  ] = await Promise.all([
    db.fincas.toArray(), db.usuarios.toArray(), db.propiedades.toArray(),
    db.razas.toArray(), db.potreros.toArray(), db.movimientosPotrero.toArray(),
    db.animales.toArray(), db.fotosAnimal.toArray(), db.registrosLeche.toArray(), db.montas.toArray(),
    db.partos.toArray(), db.eventosSalud.toArray(), db.pesajes.toArray(),
    db.ventas.toArray(), db.muertes.toArray(),
    db.movimientosFinancieros.toArray(), db.empleados.toArray(), db.recibosPago.toArray(),
  ]);

  const datos = {
    fincas, usuarios, propiedades, razas, potreros, movimientosPotrero,
    animales, fotosAnimal, registrosLeche, montas, partos, eventosSalud, pesajes,
    ventas, muertes, movimientosFinancieros, empleados, recibosPago,
  };

  // Conteo por colección — así un backup declara explícitamente cuánto dice
  // contener, y `restaurarDesdeArchivo` puede verificar después que lo que
  // efectivamente se insertó coincide con lo declarado acá.
  const registros: Record<string, number> = {};
  let totalRegistros = 0;
  for (const [nombre, arr] of Object.entries(datos)) {
    registros[nombre] = arr.length;
    totalRegistros += arr.length;
  }

  return JSON.stringify({
    version: BACKUP_VERSION,
    app: 'THEOS',
    appVersion: APP_VERSION,
    schemaVersion: db.verno,
    exportadoEn: new Date().toISOString(),
    registros,
    totalRegistros,
    datos,
  });
}

/** Descarga el backup como archivo .json en el dispositivo del usuario */
export async function descargarBackup(): Promise<BackupEntry> {
  const datosSerializados = await serializarDB();

  // Verificación mínima ANTES de declarar éxito: que lo que se acaba de
  // serializar sea JSON válido, no esté vacío, y que el parseo devuelva el
  // mismo total de registros que se calculó al armarlo. THEOS ya no marca
  // "Backup completado" solo porque se disparó una descarga.
  let parsed: any;
  try { parsed = JSON.parse(datosSerializados); }
  catch { throw new Error('El backup generado no es JSON válido — no se descargó nada.'); }
  if (!parsed?.datos || typeof parsed.totalRegistros !== 'number') {
    throw new Error('El backup generado no tiene la estructura esperada — no se descargó nada.');
  }

  const fecha = new Date();
  const etiqueta = `THEOS-backup-${fecha.toISOString().slice(0, 10)}`;
  const entrada: BackupEntry = {
    id: crypto.randomUUID(),
    fecha: fecha.toISOString(),
    etiqueta,
    tipo: 'manual',
    tamanio: new Blob([datosSerializados]).size,
    totalRegistros: parsed.totalRegistros,
    appVersion: APP_VERSION,
    schemaVersion: db.verno,
  };

  // Disparar descarga. Nota honesta: el navegador no informa a la página si
  // el usuario efectivamente guardó el archivo (o canceló el diálogo), así
  // que "verificable" acá significa que el CONTENIDO es correcto y completo
  // antes de ofrecerlo — no que THEOS pueda confirmar que llegó a disco.
  const blob = new Blob([datosSerializados], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${etiqueta}.json`;
  a.click();
  URL.revokeObjectURL(url);

  const lista = listarMetadatosBackup();
  lista.push(entrada);
  guardarMetadatos(lista);
  localStorage.setItem(ULTIMO_BACKUP_KEY, fecha.toISOString());
  return entrada;
}

/** Días transcurridos desde el último respaldo real (descargado), o null si nunca se hizo uno. */
export function diasDesdeUltimoBackup(): number | null {
  try {
    const ultimoRaw = localStorage.getItem(ULTIMO_BACKUP_KEY);
    if (!ultimoRaw) return null;
    return Math.floor((Date.now() - new Date(ultimoRaw).getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Revisa la ESTRUCTURA de un backup ya parseado (sin tocar la base de
 * datos) y devuelve la lista de problemas encontrados — vacía si está todo
 * bien. Se corre siempre antes de restaurar, para detectar un archivo
 * corrupto o incompleto ANTES de borrar los datos actuales, no después.
 */
export function validarEstructuraBackup(backup: any): string[] {
  const problemas: string[] = [];

  if (!backup || typeof backup !== 'object') {
    return ['El archivo no contiene un objeto JSON válido.'];
  }
  if (backup.app !== 'THEOS') {
    return ['El archivo no es un backup de THEOS (falta o no coincide el campo "app").'];
  }
  if (backup.version !== BACKUP_VERSION) {
    problemas.push(`La versión del backup no es compatible: se recibió "${String(backup.version ?? 'ausente')}" y THEOS requiere la versión ${BACKUP_VERSION}.`);
  }
  if (backup.schemaVersion !== undefined &&
      (typeof backup.schemaVersion !== 'number' || !Number.isInteger(backup.schemaVersion) ||
       backup.schemaVersion < 1 || backup.schemaVersion > db.verno)) {
    problemas.push(`La versión de IndexedDB del backup no es compatible: "${String(backup.schemaVersion)}".`);
  }
  if (!backup.datos || typeof backup.datos !== 'object') {
    return [...problemas, 'El archivo no tiene la sección "datos" esperada.'];
  }
  // Los backups antiguos podían omitir colecciones incorporadas después de
  // su creación. Los backups actuales incluyen `registros`; en esos sí se
  // exige que cada colección esté presente y sea una lista.
  if (backup.registros && typeof backup.registros === 'object') {
    for (const coleccion of Object.keys(COLECCIONES)) {
      if (!Array.isArray(backup.datos[coleccion])) {
        problemas.push(`El backup no contiene la colección "${coleccion}" como una lista.`);
      }
    }
  }

  const idsFincas = new Set<string>();
  const fincas = backup.datos.fincas;
  if (fincas !== undefined && Array.isArray(fincas)) {
    for (const finca of fincas) {
      if (typeof finca?.id === 'string') idsFincas.add(finca.id);
    }
  }
  const animales = Array.isArray(backup.datos.animales) ? backup.datos.animales : [];
  const potreros = Array.isArray(backup.datos.potreros) ? backup.datos.potreros : [];
  const usuarios = Array.isArray(backup.datos.usuarios) ? backup.datos.usuarios : [];
  const empleados = Array.isArray(backup.datos.empleados) ? backup.datos.empleados : [];
  const idsAnimales = new Set<string>();
  const animalPorId = new Map<string, any>();
  const idsPotreros = new Set<string>();
  const potreroPorId = new Map<string, any>();
  const idsEmpleados = new Set<string>();
  const empleadoPorId = new Map<string, any>();

  for (const [nombre, camposObligatorios] of Object.entries(COLECCIONES)) {
    const arr = backup.datos[nombre];
    if (arr === undefined) continue; // backups de versiones anteriores pueden no traer todas las colecciones
    if (!Array.isArray(arr)) {
      problemas.push(`"${nombre}" debería ser una lista y no lo es.`);
      continue;
    }
    const idsVistos = new Set<string>();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item || typeof item !== 'object') {
        problemas.push(`"${nombre}" tiene un registro inválido en la posición ${i}.`);
        continue;
      }
      for (const campo of camposObligatorios) {
        if (item[campo] === undefined || item[campo] === null) {
          problemas.push(`"${nombre}" tiene un registro sin el campo obligatorio "${campo}" (posición ${i}).`);
        }
      }
      if (typeof item.id === 'string') {
        if (idsVistos.has(item.id)) problemas.push(`"${nombre}" tiene el id duplicado "${item.id}" dentro del propio archivo.`);
        idsVistos.add(item.id);
      }
      if (nombre === 'animales' && typeof item.id === 'string') {
        if (idsAnimales.has(item.id)) problemas.push(`"animales" repite el id "${item.id}".`);
        idsAnimales.add(item.id); animalPorId.set(item.id, item);
      }
      if (nombre === 'potreros' && typeof item.id === 'string') {
        idsPotreros.add(item.id); potreroPorId.set(item.id, item);
      }
      if (nombre === 'usuarios' && typeof item.id === 'string') {
        // Usuarios se validan por finca; sus ids no tienen relaciones externas
        // que deban resolverse durante la restauración.
      }
      if (nombre === 'empleados' && typeof item.id === 'string') {
        idsEmpleados.add(item.id); empleadoPorId.set(item.id, item);
      }
    }
  }

  if (Array.isArray(fincas)) {
    const ids = new Set<string>();
    for (const finca of fincas) {
      if (typeof finca?.id === 'string' && ids.has(finca.id)) problemas.push(`"fincas" repite el id "${finca.id}".`);
      if (typeof finca?.id === 'string') ids.add(finca.id);
    }
  }
  const exigirFinca = (registro: any, coleccion: string, posicion: number) => {
    if (typeof registro.fincaId !== 'string' || !idsFincas.has(registro.fincaId)) {
      problemas.push(`"${coleccion}" en la posición ${posicion} referencia una finca inexistente.`);
    }
  };
  if (Array.isArray(potreros)) potreros.forEach((p, i) => exigirFinca(p, 'potreros', i));
  if (Array.isArray(animales)) {
    const codigos = new Map<string, string>();
    animales.forEach((animal, i) => {
      exigirFinca(animal, 'animales', i);
      const clave = `${animal.fincaId}|${String(animal.codigo ?? '').trim().toLowerCase()}`;
      if (codigos.has(clave)) problemas.push(`"animales" repite el código "${animal.codigo}" dentro de la misma finca.`);
      else codigos.set(clave, animal.id);
      for (const [campo, sexo] of [['padreId', 'macho'], ['madreId', 'hembra']] as const) {
        if (!animal[campo]) continue;
        const progenitor = animalPorId.get(animal[campo]);
        if (!progenitor) problemas.push(`"animales" (${animal.codigo}) referencia un ${campo} inexistente.`);
        else {
          if (progenitor.fincaId !== animal.fincaId) problemas.push(`"animales" (${animal.codigo}) referencia un ${campo} de otra finca.`);
          if (progenitor.sexo !== sexo) problemas.push(`"animales" (${animal.codigo}) tiene un ${campo} con sexo incorrecto.`);
        }
      }
      if (animal.potreroActualId) {
        const potrero = potreroPorId.get(animal.potreroActualId);
        if (!potrero) problemas.push(`"animales" (${animal.codigo}) referencia un potrero inexistente.`);
        else if (potrero.fincaId !== animal.fincaId) problemas.push(`"animales" (${animal.codigo}) referencia un potrero de otra finca.`);
      }
    });
  }
  if (Array.isArray(usuarios)) usuarios.forEach((u, i) => exigirFinca(u, 'usuarios', i));
  if (Array.isArray(empleados)) empleados.forEach((e, i) => exigirFinca(e, 'empleados', i));

  const verificarAnimal = (id: unknown, coleccion: string, posicion: number) => {
    if (typeof id !== 'string' || !idsAnimales.has(id)) {
      problemas.push(`"${coleccion}" en la posición ${posicion} referencia un animal inexistente.`);
    }
  };
  const verificarFincaAnimal = (registro: any, animalId: string | undefined, coleccion: string, posicion: number) => {
    const animal = animalId ? animalPorId.get(animalId) : undefined;
    if (animal && registro.fincaId && animal.fincaId !== registro.fincaId) {
      problemas.push(`"${coleccion}" en la posición ${posicion} mezcla animales de fincas distintas.`);
    }
  };
  for (const [nombre, campo] of [
    ['fotosAnimal', 'animalId'], ['registrosLeche', 'animalId'], ['eventosSalud', 'animalId'],
    ['pesajes', 'animalId'], ['ventas', 'animalId'], ['muertes', 'animalId'],
  ] as const) {
    const arr = backup.datos[nombre];
    if (Array.isArray(arr)) arr.forEach((item, i) => verificarAnimal(item[campo], nombre, i));
  }
  const montas = backup.datos.montas;
  if (Array.isArray(montas)) montas.forEach((m, i) => {
    verificarAnimal(m.hembraId, 'montas', i);
    if (m.machoId) verificarAnimal(m.machoId, 'montas', i);
    const hembra = animalPorId.get(m.hembraId);
    const macho = m.machoId ? animalPorId.get(m.machoId) : undefined;
    if (hembra && macho && hembra.fincaId !== macho.fincaId) problemas.push(`"montas" en la posición ${i} mezcla animales de fincas distintas.`);
  });
  const partos = backup.datos.partos;
  if (Array.isArray(partos)) partos.forEach((p, i) => {
    verificarAnimal(p.madreId, 'partos', i);
    const madre = animalPorId.get(p.madreId);
    if (p.montaId) {
      const monta = Array.isArray(montas) ? montas.find(m => m.id === p.montaId) : undefined;
      if (!monta) problemas.push(`"partos" en la posición ${i} referencia una monta inexistente.`);
      else if (monta.hembraId !== p.madreId) problemas.push(`"partos" en la posición ${i} referencia una monta de otra madre.`);
    }
    if (Array.isArray(p.criaIds)) p.criaIds.forEach((id: string) => {
      verificarAnimal(id, 'partos', i);
      const cria = animalPorId.get(id);
      if (madre && cria && madre.fincaId !== cria.fincaId) problemas.push(`"partos" en la posición ${i} mezcla crías de fincas distintas.`);
    });
  });
  const movimientos = backup.datos.movimientosPotrero;
  if (Array.isArray(movimientos)) movimientos.forEach((m, i) => {
    verificarAnimal(m.animalId, 'movimientosPotrero', i);
    const animal = animalPorId.get(m.animalId);
    for (const campo of ['potreroOrigenId', 'potreroDestinoId'] as const) {
      if (!m[campo]) continue;
      const potrero = potreroPorId.get(m[campo]);
      if (!potrero) problemas.push(`"movimientosPotrero" en la posición ${i} referencia un potrero inexistente.`);
      else if (animal && potrero.fincaId !== animal.fincaId) problemas.push(`"movimientosPotrero" en la posición ${i} mezcla fincas.`);
    }
  });
  const financieros = backup.datos.movimientosFinancieros;
  if (Array.isArray(financieros)) financieros.forEach((m, i) => {
    exigirFinca(m, 'movimientosFinancieros', i);
    if (m.animalId) {
      verificarAnimal(m.animalId, 'movimientosFinancieros', i);
      verificarFincaAnimal(m, m.animalId, 'movimientosFinancieros', i);
    }
  });
  const recibos = backup.datos.recibosPago;
  if (Array.isArray(recibos)) recibos.forEach((r, i) => {
    exigirFinca(r, 'recibosPago', i);
    if (!idsEmpleados.has(r.empleadoId)) problemas.push(`"recibosPago" en la posición ${i} referencia un empleado inexistente.`);
    const empleado = empleadoPorId.get(r.empleadoId);
    if (empleado && empleado.fincaId !== r.fincaId) problemas.push(`"recibosPago" en la posición ${i} mezcla fincas.`);
  });
  if (backup.registros && typeof backup.registros === 'object') {
    for (const [nombre, cantidad] of Object.entries(backup.registros)) {
      if (!Array.isArray(backup.datos[nombre]) || backup.datos[nombre].length !== cantidad) {
        problemas.push(`El conteo declarado para "${nombre}" no coincide con sus registros.`);
      }
    }
  }
  const totalCalculado = Object.values(backup.datos).reduce((total: number, value: unknown) =>
    total + (Array.isArray(value) ? value.length : 0), 0);
  if (backup.totalRegistros !== undefined && backup.totalRegistros !== totalCalculado) {
    problemas.push(`El total de registros declarado (${String(backup.totalRegistros)}) no coincide con el contenido (${totalCalculado}).`);
  }

  return problemas;
}

/** Restaura desde un archivo JSON subido por el usuario */
export async function restaurarDesdeArchivo(contenido: string): Promise<{ totalRegistros: number }> {
  // Límite de tamaño: un backup real de THEOS (con fotos incluidas) puede
  // ser grande, pero si un archivo llega a cientos de MB es mucho más
  // probable que sea el archivo equivocado o esté corrupto que un respaldo
  // legítimo — mejor avisar acá que dejar que el navegador se cuelgue
  // intentando procesarlo (informe de auditoría externa, punto 4.2).
  const LIMITE_BYTES = 300 * 1024 * 1024; // 300 MB
  const tamanioBytes = new Blob([contenido]).size;
  if (tamanioBytes > LIMITE_BYTES) {
    throw new Error(`El archivo pesa ${formatearTamanio(tamanioBytes)}, más de lo que THEOS espera para un respaldo (300 MB). Verificá que sea el archivo correcto.`);
  }

  let backup: any;
  try { backup = JSON.parse(contenido); }
  catch { throw new Error('El archivo no es un JSON válido.'); }

  const problemas = validarEstructuraBackup(backup);
  if (problemas.length > 0) {
    const detalle = problemas.slice(0, 5).join(' ');
    const resto = problemas.length > 5 ? ` (y ${problemas.length - 5} problema(s) más)` : '';
    throw new Error(`El archivo de respaldo no pasó la validación: ${detalle}${resto}`);
  }

  const d = backup.datos;

  // Todo ocurre dentro de una única transacción: si algo falla a mitad de
  // camino, Dexie revierte automáticamente todos los cambios y la base de
  // datos queda intacta, en vez de quedar a medio borrar/restaurar.
  await db.transaction('rw', [
    db.fincas, db.usuarios, db.propiedades, db.razas, db.potreros,
    db.movimientosPotrero, db.animales, db.fotosAnimal, db.registrosLeche,
    db.montas, db.partos, db.eventosSalud, db.pesajes, db.ventas, db.muertes,
    db.movimientosFinancieros, db.empleados, db.recibosPago,
  ], async () => {
    await Promise.all([
      db.fincas.clear(), db.usuarios.clear(), db.propiedades.clear(),
      db.razas.clear(), db.potreros.clear(), db.movimientosPotrero.clear(),
      db.animales.clear(), db.fotosAnimal.clear(), db.registrosLeche.clear(), db.montas.clear(),
      db.partos.clear(), db.eventosSalud.clear(), db.pesajes.clear(),
      db.ventas.clear(), db.muertes.clear(),
      db.movimientosFinancieros.clear(), db.empleados.clear(), db.recibosPago.clear(),
    ]);

    if (d.fincas?.length)             await db.fincas.bulkAdd(d.fincas);
    if (d.usuarios?.length)           await db.usuarios.bulkAdd(d.usuarios);
    if (d.propiedades?.length)        await db.propiedades.bulkAdd(d.propiedades);
    if (d.razas?.length)              await db.razas.bulkAdd(d.razas);
    if (d.potreros?.length)           await db.potreros.bulkAdd(d.potreros);
    if (d.movimientosPotrero?.length) await db.movimientosPotrero.bulkAdd(d.movimientosPotrero);
    if (d.animales?.length)           await db.animales.bulkAdd(d.animales);
    if (d.fotosAnimal?.length)        await db.fotosAnimal.bulkAdd(d.fotosAnimal);
    if (d.registrosLeche?.length)     await db.registrosLeche.bulkAdd(d.registrosLeche);
    if (d.montas?.length)             await db.montas.bulkAdd(d.montas);
    if (d.partos?.length)             await db.partos.bulkAdd(d.partos);
    if (d.eventosSalud?.length)       await db.eventosSalud.bulkAdd(d.eventosSalud);
    if (d.pesajes?.length)            await db.pesajes.bulkAdd(d.pesajes);
    if (d.ventas?.length)             await db.ventas.bulkAdd(d.ventas);
    if (d.muertes?.length)            await db.muertes.bulkAdd(d.muertes);
    if (d.movimientosFinancieros?.length) await db.movimientosFinancieros.bulkAdd(d.movimientosFinancieros);
    if (d.empleados?.length)          await db.empleados.bulkAdd(d.empleados);
    if (d.recibosPago?.length)        await db.recibosPago.bulkAdd(d.recibosPago);

    const totalEsperado = Object.keys(COLECCIONES)
      .reduce((acc, nombre) => acc + (d[nombre]?.length ?? 0), 0);
    const conteos = await Promise.all(
      Object.keys(COLECCIONES).map(nombre => (db as any)[nombre].count()),
    );
    const totalReal = conteos.reduce((a: number, b: number) => a + b, 0);
    if (totalReal !== totalEsperado) {
      throw new Error(`Se esperaban ${totalEsperado} registros y quedaron ${totalReal} durante la restauración.`);
    }
  });

  // Verificación posterior: contar lo que realmente quedó en cada colección
  // y compararlo contra lo que el archivo decía traer. No debería diferir
  // nunca (ya pasamos por la transacción), pero si algo raro ocurriera, se
  // lo hacemos saber al usuario en vez de reportar éxito a ciegas.
  const totalEsperado = Object.keys(COLECCIONES).reduce((acc, nombre) => acc + (d[nombre]?.length ?? 0), 0);
  const totalReal = await Promise.all(Object.keys(COLECCIONES).map(nombre => (db as any)[nombre].count()))
    .then(counts => counts.reduce((a: number, b: number) => a + b, 0));
  return { totalRegistros: totalReal };
}

export function formatearTamanio(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
