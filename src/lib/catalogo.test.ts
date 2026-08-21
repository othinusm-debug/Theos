import { describe, expect, it } from 'vitest';
import { categoriaAnimal, esViejo, fechaEsperadaParto, nombreEspecie } from './catalogo';

describe('nombreEspecie', () => {
  it('devuelve el nombre corto sin la aclaración entre paréntesis', () => {
    expect(nombreEspecie('bovino')).toBe('Bovino');
  });
});

describe('fechaEsperadaParto', () => {
  it('suma los días de gestación de la especie', () => {
    const inicio = new Date('2024-01-01T12:00:00');
    const esperada = fechaEsperadaParto('2024-01-01', 'bovino');
    const diasDiferencia = Math.round((esperada.getTime() - inicio.getTime()) / 86400000);
    expect(diasDiferencia).toBe(283); // gestación bovina
  });

  it('usa un período de gestación distinto para porcinos', () => {
    const inicio = new Date('2024-01-01T12:00:00');
    const esperada = fechaEsperadaParto('2024-01-01', 'porcino');
    const diasDiferencia = Math.round((esperada.getTime() - inicio.getTime()) / 86400000);
    expect(diasDiferencia).toBe(114);
  });
});

describe('categoriaAnimal', () => {
  it('devuelve el genérico cuando no hay edad', () => {
    expect(categoriaAnimal('bovino', 'macho', null)).toBe('Macho');
    expect(categoriaAnimal('bovino', 'hembra', null)).toBe('Hembra');
  });

  it('clasifica un bovino según su edad en meses', () => {
    expect(categoriaAnimal('bovino', 'macho', 0)).toBe('Becerro');
    expect(categoriaAnimal('bovino', 'macho', 12)).toBe('Becerro'); // límite inclusive
    expect(categoriaAnimal('bovino', 'macho', 13)).toBe('Maute');
    expect(categoriaAnimal('bovino', 'macho', 100)).toBe('Toro');
    expect(categoriaAnimal('bovino', 'hembra', 0)).toBe('Becerra');
    expect(categoriaAnimal('bovino', 'hembra', 100)).toBe('Vaca');
  });
});

describe('esViejo', () => {
  it('compara contra el umbral de la especie', () => {
    expect(esViejo('bovino', 10)).toBe(true);
    expect(esViejo('bovino', 9)).toBe(false);
  });
});
