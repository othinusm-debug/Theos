// THEOS — Relaciones de parentesco: ancestros, descendientes, hermanos y consanguinidad

import type { Animal } from './types';

export interface NodoGenealogico {
  animal: Animal;
  padre?: NodoGenealogico;
  madre?: NodoGenealogico;
}

export function construirAncestros(animal: Animal, todos: Animal[], profundidad = 3): NodoGenealogico {
  const porId = new Map(todos.map(a => [a.id, a]));
  function construir(a: Animal, nivel: number): NodoGenealogico {
    const nodo: NodoGenealogico = { animal: a };
    if (nivel >= profundidad) return nodo;
    if (a.padreId) { const p = porId.get(a.padreId); if (p) nodo.padre = construir(p, nivel + 1); }
    if (a.madreId) { const m = porId.get(a.madreId); if (m) nodo.madre = construir(m, nivel + 1); }
    return nodo;
  }
  return construir(animal, 0);
}

export function hijosDe(animal: Animal, todos: Animal[]): Animal[] {
  return todos
    .filter(a => a.padreId === animal.id || a.madreId === animal.id)
    .sort((a, b) => new Date(a.fechaNacimiento ?? a.createdAt).getTime() - new Date(b.fechaNacimiento ?? b.createdAt).getTime());
}

export function nietosDe(animal: Animal, todos: Animal[]): Animal[] {
  return hijosDe(animal, todos).flatMap(h => hijosDe(h, todos));
}

export function hermanosDe(animal: Animal, todos: Animal[]): Animal[] {
  return todos.filter(a =>
    a.id !== animal.id &&
    ((animal.padreId && a.padreId === animal.padreId) ||
     (animal.madreId && a.madreId === animal.madreId)),
  );
}

export function hermanosCompletosDe(animal: Animal, todos: Animal[]): Animal[] {
  return todos.filter(a =>
    a.id !== animal.id &&
    animal.padreId && animal.madreId &&
    a.padreId === animal.padreId &&
    a.madreId === animal.madreId,
  );
}

function idsAncestros(a: Animal, todos: Animal[], generaciones: number): string[] {
  const porId = new Map(todos.map(x => [x.id, x]));
  const resultado: string[] = [];
  function recorrer(actual: Animal, nivel: number) {
    if (nivel > generaciones) return;
    if (actual.padreId) { resultado.push(actual.padreId); const p = porId.get(actual.padreId); if (p) recorrer(p, nivel + 1); }
    if (actual.madreId) { resultado.push(actual.madreId); const m = porId.get(actual.madreId); if (m) recorrer(m, nivel + 1); }
  }
  recorrer(a, 1);
  return resultado;
}

export function tieneAncestroComun(a: Animal, b: Animal, todos: Animal[], generaciones = 3): boolean {
  const ancestrosA = new Set(idsAncestros(a, todos, generaciones));
  return idsAncestros(b, todos, generaciones).some(id => ancestrosA.has(id));
}

/**
 * Chequeo completo de consanguinidad para advertir antes de una monta: cubre
 * tanto la relación directa (uno es ancestro del otro — padre-hija, abuelo-nieta)
 * como la de ancestro compartido (hermanos, medios hermanos, primos). Ojo:
 * `tieneAncestroComun` sola NO detecta el caso padre-hija, porque el padre no
 * figura en su propia lista de ancestros — por eso este chequeo combina ambas cosas.
 */
export function parentescoCercano(a: Animal, b: Animal, todos: Animal[], generaciones = 3): boolean {
  const ancestrosA = idsAncestros(a, todos, generaciones);
  const ancestrosB = idsAncestros(b, todos, generaciones);
  if (ancestrosA.includes(b.id) || ancestrosB.includes(a.id)) return true;
  const setA = new Set(ancestrosA);
  return ancestrosB.some(id => setA.has(id));
}
