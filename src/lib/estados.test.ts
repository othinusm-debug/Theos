import { describe, expect, it } from 'vitest';
import { transicionEstadoValida } from './estados';

describe('transicionEstadoValida', () => {
  it('permite quedarse en el mismo estado', () => {
    expect(transicionEstadoValida('vivo', 'vivo')).toBe(true);
  });

  it('permite las transiciones normales desde vivo', () => {
    expect(transicionEstadoValida('vivo', 'vendido')).toBe(true);
    expect(transicionEstadoValida('vivo', 'muerto')).toBe(true);
    expect(transicionEstadoValida('vivo', 'prestado')).toBe(true);
  });

  it('permite que un animal prestado vuelva, se venda o muera', () => {
    expect(transicionEstadoValida('prestado', 'vivo')).toBe(true);
    expect(transicionEstadoValida('prestado', 'vendido')).toBe(true);
    expect(transicionEstadoValida('prestado', 'muerto')).toBe(true);
  });

  it('vendido y muerto son terminales — no se sale editando el estado', () => {
    expect(transicionEstadoValida('vendido', 'vivo')).toBe(false);
    expect(transicionEstadoValida('vendido', 'prestado')).toBe(false);
    expect(transicionEstadoValida('muerto', 'vivo')).toBe(false);
    expect(transicionEstadoValida('muerto', 'vendido')).toBe(false);
  });

  it('vendido y muerto no admiten ni quedarse en el mismo estado — evita vender o matar dos veces al mismo animal', () => {
    expect(transicionEstadoValida('vendido', 'vendido')).toBe(false);
    expect(transicionEstadoValida('muerto', 'muerto')).toBe(false);
  });
});
