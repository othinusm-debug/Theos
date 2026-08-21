// Polyfill de IndexedDB en memoria — Dexie (y por lo tanto repo.ts) necesita
// un IndexedDB real para funcionar, y Node no trae uno. fake-indexeddb/auto
// lo registra como global antes de que se importe cualquier test.
import 'fake-indexeddb/auto';
