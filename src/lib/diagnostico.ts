// THEOS — Centro de diagnóstico local (puntos 6 y 57 del plan maestro)
//
// Este módulo es DE SOLO LECTURA: recorre toda la base de datos y reporta
// problemas, pero nunca escribe nada. Es el complemento retroactivo de la
// validación central de repo.ts — esa previene que se guarden datos
// inconsistentes de acá en adelante; esto encuentra los que ya existan
// (de antes de la validación, o restaurados de un backup viejo).
//
// 100% offline: no depende de nada externo.

import { db } from './db';
import type { Animal } from './types';

export type CategoriaProblema = 'referencia_rota' | 'duplicado' | 'cronologia' | 'huerfano';
export type Severidad = 'error' | 'advertencia';

export interface ProblemaDiagnostico {
  categoria: CategoriaProblema;
  severidad: Severidad;
  mensaje: string;
  entidad: string;
  entidadId: string;
}

export interface ResultadoDiagnostico {
  ejecutadoEn: string;
  problemas: ProblemaDiagnostico[];
  resumen: { referenciasRotas: number; duplicados: number; cronologia: number; huerfanos: number };
}

export async function ejecutarDiagnostico(): Promise<ResultadoDiagnostico> {
  const [
    animales, potreros, pesajes, montas, partos, eventosSalud,
    registrosLeche, ventas, muertes, movimientosPotrero,
    movimientosFinancieros, fotosAnimal,
  ] = await Promise.all([
    db.animales.toArray(), db.potreros.toArray(), db.pesajes.toArray(),
    db.montas.toArray(), db.partos.toArray(), db.eventosSalud.toArray(),
    db.registrosLeche.toArray(), db.ventas.toArray(), db.muertes.toArray(),
    db.movimientosPotrero.toArray(), db.movimientosFinancieros.toArray(),
    db.fotosAnimal.toArray(),
  ]);

  const idsAnimales = new Set(animales.map(a => a.id));
  const idsPotreros = new Set(potreros.map(p => p.id));
  const idsMontas = new Set(montas.map(m => m.id));
  const animalPorId = new Map(animales.map(a => [a.id, a]));

  const problemas: ProblemaDiagnostico[] = [];
  const add = (categoria: CategoriaProblema, severidad: Severidad, mensaje: string, entidad: string, entidadId: string) =>
    problemas.push({ categoria, severidad, mensaje, entidad, entidadId });

  // ── A. Referencias rotas ────────────────────────────────────────────────
  for (const a of animales) {
    if (a.padreId && !idsAnimales.has(a.padreId)) add('referencia_rota', 'error', `${a.codigo}: el padre asignado ya no existe en la base de datos.`, 'animal', a.id);
    if (a.madreId && !idsAnimales.has(a.madreId)) add('referencia_rota', 'error', `${a.codigo}: la madre asignada ya no existe en la base de datos.`, 'animal', a.id);
    if (a.potreroActualId && !idsPotreros.has(a.potreroActualId)) add('referencia_rota', 'error', `${a.codigo}: está asignado a un potrero que ya no existe.`, 'animal', a.id);
    const padre = a.padreId ? animalPorId.get(a.padreId) : undefined;
    const madre = a.madreId ? animalPorId.get(a.madreId) : undefined;
    const potrero = a.potreroActualId ? potreros.find(p => p.id === a.potreroActualId) : undefined;
    if (padre && padre.fincaId !== a.fincaId) add('referencia_rota', 'error', `${a.codigo}: el padre pertenece a otra finca.`, 'animal', a.id);
    if (madre && madre.fincaId !== a.fincaId) add('referencia_rota', 'error', `${a.codigo}: la madre pertenece a otra finca.`, 'animal', a.id);
    if (potrero && potrero.fincaId !== a.fincaId) add('referencia_rota', 'error', `${a.codigo}: el potrero pertenece a otra finca.`, 'animal', a.id);
  }
  for (const p of pesajes) if (!idsAnimales.has(p.animalId)) add('referencia_rota', 'error', `Pesaje de ${p.pesoKg}kg (${p.fecha}) sin animal asociado.`, 'pesaje', p.id);
  for (const m of montas) {
    if (!idsAnimales.has(m.hembraId)) add('referencia_rota', 'error', `Monta del ${m.fecha}: la hembra ya no existe.`, 'monta', m.id);
    if (m.machoId && !idsAnimales.has(m.machoId)) add('referencia_rota', 'error', `Monta del ${m.fecha}: el macho ya no existe.`, 'monta', m.id);
    const hembra = animalPorId.get(m.hembraId);
    const macho = m.machoId ? animalPorId.get(m.machoId) : undefined;
    if (hembra && macho && hembra.fincaId !== macho.fincaId) add('referencia_rota', 'error', `Monta del ${m.fecha}: macho y hembra pertenecen a fincas distintas.`, 'monta', m.id);
  }
  for (const p of partos) {
    if (!idsAnimales.has(p.madreId)) add('referencia_rota', 'error', `Parto del ${p.fecha}: la madre ya no existe.`, 'parto', p.id);
    if (p.montaId && !idsMontas.has(p.montaId)) add('referencia_rota', 'advertencia', `Parto del ${p.fecha}: referencia una monta que ya no existe.`, 'parto', p.id);
    const madre = animalPorId.get(p.madreId);
    const monta = p.montaId ? montas.find(m => m.id === p.montaId) : undefined;
    if (madre && monta) {
      const hembraMonta = animalPorId.get(monta.hembraId);
      if (hembraMonta && hembraMonta.fincaId !== madre.fincaId) add('referencia_rota', 'error', `Parto del ${p.fecha}: la monta pertenece a otra finca.`, 'parto', p.id);
      if (hembraMonta && hembraMonta.id !== madre.id) add('referencia_rota', 'error', `Parto del ${p.fecha}: la monta no corresponde a la madre.`, 'parto', p.id);
    }
  }
  for (const e of eventosSalud) if (!idsAnimales.has(e.animalId)) add('referencia_rota', 'error', `Evento de salud "${e.tipo}" (${e.fecha}) sin animal asociado.`, 'eventoSalud', e.id);
  for (const r of registrosLeche) if (!idsAnimales.has(r.animalId)) add('referencia_rota', 'error', `Registro de leche del ${r.fecha} sin animal asociado.`, 'registroLeche', r.id);
  for (const v of ventas) if (!idsAnimales.has(v.animalId)) add('referencia_rota', 'error', `Venta del ${v.fecha} sin animal asociado.`, 'venta', v.id);
  for (const mu of muertes) if (!idsAnimales.has(mu.animalId)) add('referencia_rota', 'error', `Registro de muerte del ${mu.fecha} sin animal asociado.`, 'muerte', mu.id);
  for (const mp of movimientosPotrero) {
    if (!idsAnimales.has(mp.animalId)) add('referencia_rota', 'error', `Movimiento de potrero del ${mp.fecha} sin animal asociado.`, 'movimientoPotrero', mp.id);
    if (!idsPotreros.has(mp.potreroDestinoId)) add('referencia_rota', 'error', `Movimiento de potrero del ${mp.fecha}: el potrero de destino ya no existe.`, 'movimientoPotrero', mp.id);
    if (mp.potreroOrigenId && !idsPotreros.has(mp.potreroOrigenId)) add('referencia_rota', 'advertencia', `Movimiento de potrero del ${mp.fecha}: el potrero de origen ya no existe.`, 'movimientoPotrero', mp.id);
    const animal = animalPorId.get(mp.animalId);
    const destino = potreros.find(p => p.id === mp.potreroDestinoId);
    const origen = mp.potreroOrigenId ? potreros.find(p => p.id === mp.potreroOrigenId) : undefined;
    if (animal && destino && destino.fincaId !== animal.fincaId) add('referencia_rota', 'error', `Movimiento de potrero del ${mp.fecha}: destino de otra finca.`, 'movimientoPotrero', mp.id);
    if (animal && origen && origen.fincaId !== animal.fincaId) add('referencia_rota', 'error', `Movimiento de potrero del ${mp.fecha}: origen de otra finca.`, 'movimientoPotrero', mp.id);
  }
  for (const mf of movimientosFinancieros) if (mf.animalId && !idsAnimales.has(mf.animalId)) add('referencia_rota', 'advertencia', `Movimiento financiero del ${mf.fecha}: vinculado a un animal que ya no existe.`, 'movimientoFinanciero', mf.id);
  for (const f of fotosAnimal) if (!idsAnimales.has(f.animalId)) add('huerfano', 'advertencia', `Hay una foto que ya no está asociada a ningún animal.`, 'fotoAnimal', f.id);

  // ── B. Duplicados de código (dentro de cada finca) ──────────────────────
  const porFinca = new Map<string, Animal[]>();
  for (const a of animales) {
    const lista = porFinca.get(a.fincaId) ?? [];
    lista.push(a);
    porFinca.set(a.fincaId, lista);
  }
  for (const lista of porFinca.values()) {
    const vistos = new Map<string, Animal>();
    for (const a of lista) {
      const clave = a.codigo.trim().toLowerCase();
      const previo = vistos.get(clave);
      if (previo) add('duplicado', 'error', `${previo.codigo} y ${a.codigo} comparten el mismo código dentro de la finca.`, 'animal', a.id);
      else vistos.set(clave, a);
    }
  }

  // ── C. Cronología imposible (punto 8 del plan maestro) ──────────────────
  for (const a of animales) {
    if (a.estado === 'muerto' && a.fechaEstado && a.fechaNacimiento && a.fechaEstado < a.fechaNacimiento) {
      add('cronologia', 'error', `${a.codigo}: la fecha de muerte es anterior a la de nacimiento.`, 'animal', a.id);
    }
    if (a.madreId) {
      const madre = animalPorId.get(a.madreId);
      if (madre?.fechaNacimiento && a.fechaNacimiento && a.fechaNacimiento < madre.fechaNacimiento) {
        add('cronologia', 'error', `${a.codigo}: nació antes que su madre (${madre.codigo}).`, 'animal', a.id);
      }
    }
    if (a.padreId) {
      const padre = animalPorId.get(a.padreId);
      if (padre?.fechaNacimiento && a.fechaNacimiento && a.fechaNacimiento < padre.fechaNacimiento) {
        add('cronologia', 'error', `${a.codigo}: nació antes que su padre (${padre.codigo}).`, 'animal', a.id);
      }
    }
  }
  for (const p of partos) {
    if (!p.montaId) continue;
    const monta = montas.find(m => m.id === p.montaId);
    if (monta && p.fecha < monta.fecha) add('cronologia', 'error', `Parto del ${p.fecha} registrado antes que la monta que le dio origen (${monta.fecha}).`, 'parto', p.id);
  }
  for (const v of ventas) {
    const a = animalPorId.get(v.animalId);
    if (a && v.estado === 'completada' && a.estado !== 'vendido') {
      add('cronologia', 'advertencia', `${a.codigo} tiene una venta completada pero no figura como vendido.`, 'venta', v.id);
    }
  }
  for (const mu of muertes) {
    const a = animalPorId.get(mu.animalId);
    if (!a) continue;
    const posteriores = [
      ...montas.filter(m => (m.hembraId === a.id || m.machoId === a.id) && m.fecha > mu.fecha),
      ...partos.filter(p => p.madreId === a.id && p.fecha > mu.fecha),
    ];
    if (posteriores.length > 0) add('cronologia', 'error', `${a.codigo} tiene eventos reproductivos registrados después de su fecha de muerte (${mu.fecha}).`, 'animal', a.id);
  }
  for (const p of pesajes) {
    const a = animalPorId.get(p.animalId);
    if (a?.fechaNacimiento && p.fecha < a.fechaNacimiento) add('cronologia', 'advertencia', `Pesaje de ${a.codigo} fechado antes de su nacimiento.`, 'pesaje', p.id);
  }

  const resumen = {
    referenciasRotas: problemas.filter(p => p.categoria === 'referencia_rota').length,
    duplicados: problemas.filter(p => p.categoria === 'duplicado').length,
    cronologia: problemas.filter(p => p.categoria === 'cronologia').length,
    huerfanos: problemas.filter(p => p.categoria === 'huerfano').length,
  };

  return { ejecutadoEn: new Date().toISOString(), problemas, resumen };
}
