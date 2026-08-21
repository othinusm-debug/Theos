import { describe, expect, it } from 'vitest';
import { generarCodigo } from './numeracion';

describe('generarCodigo', () => {
  it('consecutivo: rellena con ceros a 4 dígitos', () => {
    expect(generarCodigo({ tipo: 'consecutivo', siguienteConsecutivo: 5 })).toBe('0005');
  });

  it('consecutivo: empieza en 1 si no hay valor guardado', () => {
    expect(generarCodigo({ tipo: 'consecutivo' })).toBe('0001');
  });

  it('por_anio: combina año de 2 dígitos y consecutivo de 3', () => {
    expect(generarCodigo({ tipo: 'por_anio', siguienteConsecutivo: 3 }, { anio: 24 })).toBe('24-003');
  });

  it('prefijo_especie: usa el prefijo correcto por especie', () => {
    expect(generarCodigo({ tipo: 'prefijo_especie', siguienteConsecutivo: 7 }, { especie: 'bovino' })).toBe('BOV-007');
    expect(generarCodigo({ tipo: 'prefijo_especie', siguienteConsecutivo: 1 }, { especie: 'porcino' })).toBe('POR-001');
  });

  it('prefijo_especie: usa ANI si no se indica especie', () => {
    expect(generarCodigo({ tipo: 'prefijo_especie', siguienteConsecutivo: 1 })).toBe('ANI-001');
  });

  it('basado_en_madre: antepone el consecutivo al código de la madre', () => {
    expect(generarCodigo({ tipo: 'basado_en_madre', siguienteConsecutivo: 2 }, { codigoMadre: 'V123' })).toBe('2V123');
  });

  it('basado_en_madre: usa año+consecutivo si no hay madre', () => {
    expect(generarCodigo({ tipo: 'basado_en_madre', siguienteConsecutivo: 5 }, { anio: 24 })).toBe('24005');
  });

  it('manual: siempre devuelve vacío (el usuario lo escribe a mano)', () => {
    expect(generarCodigo({ tipo: 'manual' })).toBe('');
  });
});
