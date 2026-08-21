import { describe, expect, it } from 'vitest';
import { hermanosCompletosDe, hermanosDe, hijosDe, parentescoCercano, tieneAncestroComun } from './genealogia';
import type { Animal } from './types';

function animal(id: string, overrides: Partial<Animal> = {}): Animal {
  return { id, fincaId: 'f1', codigo: id, especie: 'bovino', sexo: 'hembra', estado: 'vivo', createdAt: '', updatedAt: '', ...overrides } as Animal;
}

describe('hijosDe / hermanosDe / hermanosCompletosDe', () => {
  const padre = animal('padre', { sexo: 'macho' });
  const madre = animal('madre');
  const madre2 = animal('madre2');
  const hijo1 = animal('hijo1', { padreId: 'padre', madreId: 'madre' });
  const hijo2 = animal('hijo2', { padreId: 'padre', madreId: 'madre' }); // hermano completo de hijo1
  const hijo3 = animal('hijo3', { padreId: 'padre', madreId: 'madre2' }); // medio hermano (comparten padre)
  const ajeno = animal('ajeno');
  const todos = [padre, madre, madre2, hijo1, hijo2, hijo3, ajeno];

  it('hijosDe encuentra a todos los hijos del padre', () => {
    const hijos = hijosDe(padre, todos).map(a => a.id).sort();
    expect(hijos).toEqual(['hijo1', 'hijo2', 'hijo3']);
  });

  it('hermanosDe incluye hermanos completos y medios hermanos', () => {
    const hermanos = hermanosDe(hijo1, todos).map(a => a.id).sort();
    expect(hermanos).toEqual(['hijo2', 'hijo3']);
  });

  it('hermanosCompletosDe excluye a los medios hermanos', () => {
    const hermanos = hermanosCompletosDe(hijo1, todos).map(a => a.id);
    expect(hermanos).toEqual(['hijo2']);
  });

  it('un animal sin padres en común no es hermano de nadie', () => {
    expect(hermanosDe(ajeno, todos)).toEqual([]);
  });
});

describe('tieneAncestroComun / parentescoCercano', () => {
  it('detecta ancestro común entre medios hermanos', () => {
    const padre = animal('p2', { sexo: 'macho' });
    const h1 = animal('h1', { padreId: 'p2' });
    const h2 = animal('h2', { padreId: 'p2' });
    const todos = [padre, h1, h2];
    expect(tieneAncestroComun(h1, h2, todos)).toBe(true);
    expect(parentescoCercano(h1, h2, todos)).toBe(true);
  });

  it('animales no emparentados dan false en ambos chequeos', () => {
    const a = animal('a1');
    const b = animal('b1');
    expect(tieneAncestroComun(a, b, [a, b])).toBe(false);
    expect(parentescoCercano(a, b, [a, b])).toBe(false);
  });

  it('tieneAncestroComun NO detecta la relación directa padre-hija — por eso existe parentescoCercano', () => {
    const padre = animal('padreDirecto', { sexo: 'macho' }); // sin ancestros propios registrados
    const hija = animal('hijaDirecta', { padreId: 'padreDirecto' });
    const todos = [padre, hija];

    // Limitación conocida y documentada de tieneAncestroComun sola:
    expect(tieneAncestroComun(padre, hija, todos)).toBe(false);
    // parentescoCercano sí la detecta, porque además chequea la relación directa:
    expect(parentescoCercano(padre, hija, todos)).toBe(true);
  });
});
