import { describe, expect, it } from 'vitest';
import { restaurarDesdeArchivo, validarEstructuraBackup } from './backup';

describe('validarEstructuraBackup', () => {
  it('rechaza algo que no es un objeto', () => {
    expect(validarEstructuraBackup(null)).not.toEqual([]);
    expect(validarEstructuraBackup('texto')).not.toEqual([]);
  });

  it('rechaza un archivo que no diga app: THEOS', () => {
    const problemas = validarEstructuraBackup({ app: 'OTRA_APP' });
    expect(problemas.length).toBeGreaterThan(0);
  });

  it('rechaza un archivo sin la sección "datos"', () => {
    const problemas = validarEstructuraBackup({ app: 'THEOS' });
    expect(problemas.length).toBeGreaterThan(0);
  });

  it('acepta un backup vacío pero con la estructura correcta', () => {
    expect(validarEstructuraBackup({ app: 'THEOS', version: 1, datos: {} })).toEqual([]);
  });

  it('detecta que una colección no es una lista', () => {
    const problemas = validarEstructuraBackup({ app: 'THEOS', datos: { animales: 'no-es-un-array' } });
    expect(problemas.some(p => p.includes('animales'))).toBe(true);
  });

  it('detecta un registro de animal sin campos obligatorios', () => {
    const problemas = validarEstructuraBackup({ app: 'THEOS', datos: { animales: [{ id: '1' }] } });
    expect(problemas.length).toBeGreaterThan(0);
    expect(problemas.some(p => p.includes('fincaId') || p.includes('codigo'))).toBe(true);
  });

  it('acepta un animal con todos los campos obligatorios', () => {
    const problemas = validarEstructuraBackup({
      app: 'THEOS',
      version: 1,
      datos: {
        fincas: [{ id: 'f1', nombre: 'Finca de prueba' }],
        animales: [{ id: '1', fincaId: 'f1', codigo: 'V1', especie: 'bovino', sexo: 'hembra', estado: 'vivo' }],
      },
    });
    expect(problemas).toEqual([]);
  });

  it('detecta ids duplicados dentro de la misma colección del archivo', () => {
    const animalBase = { id: '1', fincaId: 'f1', codigo: 'V1', especie: 'bovino', sexo: 'hembra', estado: 'vivo' };
    const problemas = validarEstructuraBackup({
      app: 'THEOS',
      version: 1,
      datos: { animales: [animalBase, { ...animalBase, codigo: 'V2' }] },
    });
    expect(problemas.some(p => p.toLowerCase().includes('duplicado'))).toBe(true);
  });

  it('ignora colecciones que el archivo simplemente no trae (backups de versiones viejas)', () => {
    expect(validarEstructuraBackup({ app: 'THEOS', version: 1, datos: { fincas: [{ id: '1', nombre: 'Finca' }] } })).toEqual([]);
  });
});

describe('restaurarDesdeArchivo — límite de tamaño', () => {
  it('rechaza un archivo absurdamente grande antes de intentar parsearlo', async () => {
    // 301 MB de puro texto — no hace falta que sea JSON válido: el límite de
    // tamaño se revisa ANTES de intentar el parseo.
    const enorme = 'x'.repeat(301 * 1024 * 1024);
    await expect(restaurarDesdeArchivo(enorme)).rejects.toThrow(/MB/);
  });

  it('un backup normal (JSON chico) no se ve afectado por el límite', async () => {
    const chico = JSON.stringify({ app: 'THEOS', version: 1, datos: {} });
    await expect(restaurarDesdeArchivo(chico)).resolves.toEqual({ totalRegistros: 0 });
  });
});
