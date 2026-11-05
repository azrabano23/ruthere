// Runs before every client test: DOM matchers, a matchMedia stub (jsdom has none), clean storage.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });
