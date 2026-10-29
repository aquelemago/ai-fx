// Um estúdio de verdade com peças de mentira, para testar as funcionalidades sem servidor.
// `mudar(parcial)` coloca a tela no estado desejado; as ações viram espiões do Vitest.
import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { ContextoDoEstudio } from '../app/contexto.js';
import { ColecaoDeQuadros } from '../nucleo/dominio/quadros.js';
import { Estudio } from '../nucleo/estudio/estudio.js';

const ACOES = [
  'abrirProjeto', 'novoProjeto', 'renomearProjeto', 'excluirProjeto', 'escolherFoto', 'escolherVideo', 'gerarRosto',
  'definirDescricao', 'escolherRoteiro', 'editarCenas', 'definirQuadros', 'definirAjuste',
  'definirFormato', 'definirRitmo', 'gerar', 'parar', 'alternarFora', 'irPara', 'tocar', 'gravarVideo',
];

export function criarEstudioFalso(estado = {}) {
  const estudio = new Estudio({
    cliente: {}, detector: { pronto: Promise.resolve() }, quadros: new ColecaoDeQuadros(),
    sessao: new EventTarget(), gerente: new EventTarget(),
  });
  for (const acao of ACOES) vi.spyOn(estudio, acao).mockImplementation(async () => undefined);
  estudio.mudar(estado);
  return estudio;
}

export function renderizarCom(estudio, elemento) {
  return render(<ContextoDoEstudio value={estudio}>{elemento}</ContextoDoEstudio>);
}
