import { describe, expect, test } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarEstudioFalso, renderizarCom } from '../../teste/estudio-falso.jsx';
import { Montagem } from './Montagem.jsx';

const pronto = { pronto: true, projeto: { id: 'p1' }, foto: { canvas: null, pontos: [] } };

describe('Montagem', () => {
  test('Gerar só habilita com modelo pronto, projeto e foto', () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem />);
    const gerar = screen.getByRole('button', { name: 'Gerar 24 quadros' });
    expect(gerar.disabled).toBe(true);
    act(() => estudio.mudar(pronto));
    expect(gerar.disabled).toBe(false);
  });

  test('o botão vira Parar durante a geração e avisa quando está parando', async () => {
    const estudio = criarEstudioFalso({ ...pronto, gerando: true });
    renderizarCom(estudio, <Montagem />);
    await userEvent.click(screen.getByRole('button', { name: 'Parar' }));
    expect(estudio.parar).toHaveBeenCalled();
    act(() => estudio.mudar({ parando: true }));
    expect(screen.getByRole('button', { name: 'Parando…' })).toBeTruthy();
  });

  test('quantidade de quadros muda o botão e a estimativa', async () => {
    const estudio = criarEstudioFalso({ segPorQuadro: 10 });
    renderizarCom(estudio, <Montagem />);
    expect(screen.getByText('Cerca de 4 min 00 s no seu processador.')).toBeTruthy();
    await userEvent.click(screen.getByText('12'));
    expect(estudio.definirQuadros).toHaveBeenCalledWith(12);
  });

  test('descrição, roteiro e cenas vão para o estúdio', async () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem />);
    fireEvent.change(screen.getByLabelText('Você, em inglês'), { target: { value: 'a woman' } });
    expect(estudio.definirDescricao).toHaveBeenCalledWith('a woman');
    await userEvent.click(screen.getByText('Personalizado'));
    expect(estudio.escolherRoteiro).toHaveBeenCalledWith('Personalizado');
    fireEvent.change(screen.getByLabelText('Cenas, uma por linha'), { target: { value: 'x' } });
    expect(estudio.editarCenas).toHaveBeenCalledWith('x');
  });

  test('"Editar cenas" abre quando o estúdio manda', () => {
    const estudio = criarEstudioFalso();
    const { container } = renderizarCom(estudio, <Montagem />);
    const cenas = container.querySelector('#prompts').closest('details');
    expect(cenas.open).toBe(false);
    act(() => estudio.mudar({ cenasAbertas: true }));
    expect(cenas.open).toBe(true);
  });

  test('ajustes mostram o valor e a semente aceita o campo vazio enquanto digita', () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem />);
    expect(screen.getByRole('slider', { name: 'Naturalidade do rosto' }).value).toBe('0.45');
    fireEvent.change(screen.getByRole('slider', { name: 'Força da IA' }), { target: { value: '0.9' } });
    expect(estudio.definirAjuste).toHaveBeenCalledWith('forca', 0.9);
    const semente = screen.getByRole('spinbutton');
    fireEvent.change(semente, { target: { value: '' } });
    expect(semente.value).toBe('');
    expect(estudio.definirAjuste).toHaveBeenCalledWith('semente', 0);
  });

  test('estado do servidor e mensagens', () => {
    const estudio = criarEstudioFalso({
      servidor: { texto: 'servidor desligado', tom: 'erro', detalhe: 'Rode npm start' },
      infoFoto: 'Procurando o rosto…', infoGeracao: 'Faltam cerca de 8 s.',
    });
    renderizarCom(estudio, <Montagem />);
    const status = screen.getByText('servidor desligado');
    expect(status.className).toBe('estado erro');
    expect(status.title).toBe('Rode npm start');
    expect(screen.getByText('Procurando o rosto…')).toBeTruthy();
    expect(screen.getByText('Faltam cerca de 8 s.').getAttribute('role')).toBe('status');
  });
});
