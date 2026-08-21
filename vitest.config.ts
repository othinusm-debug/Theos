import { defineConfig } from 'vitest/config';

// Config mínima a propósito: los tests son de lógica pura de src/lib, no de
// componentes React, así que no hace falta jsdom ni el plugin de React acá.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
