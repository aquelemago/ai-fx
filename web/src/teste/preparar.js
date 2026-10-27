// Preparação dos testes de componente (Vitest + jsdom): desmonta o que cada teste montou e
// troca o canvas, que o jsdom não desenha, por um que aceita as chamadas e não faz nada.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, drawImage() {} });
