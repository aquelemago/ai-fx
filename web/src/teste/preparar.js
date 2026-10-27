// Preparação dos testes de componente (Vitest + jsdom): desmonta o que cada teste montou.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);
