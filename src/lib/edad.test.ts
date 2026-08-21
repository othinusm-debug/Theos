import { describe, expect, it } from 'vitest';
import { calcularEdad } from './edad';

describe('calcularEdad', () => {
  it('devuelve null sin fecha de nacimiento', () => {
    expect(calcularEdad(undefined)).toBeNull();
  });

  it('devuelve null con una fecha inválida', () => {
    expect(calcularEdad('no-es-una-fecha')).toBeNull();
  });

  it('calcula años exactos', () => {
    const edad = calcularEdad('2020-01-15', new Date('2024-01-15T12:00:00'));
    expect(edad).not.toBeNull();
    expect(edad!.anios).toBe(4);
    expect(edad!.meses).toBe(0);
    expect(edad!.texto).toBe('4 años');
  });

  it('resta un mes cuando el día de hoy es anterior al día de nacimiento', () => {
    const edad = calcularEdad('2020-01-15', new Date('2024-01-10T12:00:00'));
    expect(edad!.anios).toBe(3);
    expect(edad!.meses).toBe(11);
  });

  it('usa singular para 1 año y 1 mes', () => {
    const unAnio = calcularEdad('2023-01-15', new Date('2024-01-15T12:00:00'));
    expect(unAnio!.texto).toBe('1 año');

    const unMes = calcularEdad('2023-12-15', new Date('2024-01-15T12:00:00'));
    expect(unMes!.anios).toBe(0);
    expect(unMes!.meses).toBe(1);
    expect(unMes!.texto).toBe('1 mes');
  });

  it('muestra en días cuando tiene menos de un mes', () => {
    const edad = calcularEdad('2024-01-01', new Date('2024-01-11T12:00:00'));
    expect(edad!.anios).toBe(0);
    expect(edad!.meses).toBe(0);
    expect(edad!.totalDias).toBe(10);
    expect(edad!.texto).toBe('10 días');
  });

  it('nunca da edad negativa si la fecha de nacimiento es futura', () => {
    const edad = calcularEdad('2025-01-01', new Date('2024-01-01T12:00:00'));
    expect(edad!.anios).toBe(0);
    expect(edad!.meses).toBe(0);
    expect(edad!.totalDias).toBe(0);
  });
});
