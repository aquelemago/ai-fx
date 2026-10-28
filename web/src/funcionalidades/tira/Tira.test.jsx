import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarEstudioFalso, renderizarCom } from '../../teste/estudio-falso.jsx';
import { Tira } from './Tira.jsx';

const quadro = (indice, cena, fora = false) => ({ canvas: {}, indice, cena, fora });

afterEach(() => vi.useRealTimers());

describe('Tira', () => {
  test('a cópia mais nova fica no topo, com número e cena', () => {
    const estudio = criarEstudioFalso({ quadros: [quadro(0, 'amanhecer'), quadro(1, 'manhã')], configuracao: { quadros: 12 } });
    const { container } = renderizarCom(estudio, <Tira />);
    const rodapes = [...container.querySelectorAll('#tira li span')].map((s) => s.textContent);
    expect(rodapes).toEqual(['02 · manhã', '01 · amanhecer']);
    expect(screen.getByText('2 de 12').id).toBe('contagem');
  });

  test('o contador vem dos quadros que existem sobre o total pedido', () => {
    // projeto com 1 quadro salvo, mas a configuração pede 12: mostra "1 de 12", não "1 de 1"
    const estudio = criarEstudioFalso({ quadros: [quadro(0, 'amanhecer')], configuracao: { quadros: 12 } });
    renderizarCom(estudio, <Tira />);
    expect(screen.getByText('1 de 12').id).toBe('contagem');
  });

  test('sem quadros, o contador fica vazio', () => {
    const estudio = criarEstudioFalso({ quadros: [], configuracao: { quadros: 24 } });
    renderizarCom(estudio, <Tira />);
    expect(screen.queryByText(/de 24/)).toBe(null);
  });

  test('clicar na cópia leva a prévia até ela; riscar e voltar vão para o estúdio', async () => {
    const q = quadro(0, 'amanhecer');
    const estudio = criarEstudioFalso({ quadros: [q] });
    const { container } = renderizarCom(estudio, <Tira />);
    await userEvent.click(container.querySelector('#tira canvas'));
    expect(estudio.irPara).toHaveBeenCalledWith(q);
    await userEvent.click(screen.getByRole('button', { name: 'Tirar o quadro 1 do vídeo' }));
    expect(estudio.alternarFora).toHaveBeenCalledWith(q);

    act(() => estudio.mudar({ quadros: [{ ...q, fora: true }] }));
    expect(screen.getByRole('button', { name: 'Voltar o quadro 1 para o vídeo' })).toBeTruthy();
    expect(container.querySelector('#tira li').className).toContain('fora');
  });

  test('marca a cópia que está na prévia', () => {
    const a = quadro(0, 'a'), b = quadro(1, 'b');
    const estudio = criarEstudioFalso({ quadros: [a, b], quadroAtual: a });
    const { container } = renderizarCom(estudio, <Tira />);
    const [topo, base] = container.querySelectorAll('#tira li');
    expect(topo.className).not.toContain('atual');
    expect(base.className).toContain('atual');
  });

  test('a vaga do próximo quadro conta os segundos que faltam', () => {
    vi.useFakeTimers();
    const estudio = criarEstudioFalso({ proximo: { indice: 2, cena: 'meio-dia', fim: performance.now() + 9500 } });
    const { container } = renderizarCom(estudio, <Tira />);
    const vaga = container.querySelector('#tira li');
    expect(vaga.className).toContain('proximo');
    expect(vaga.textContent).toBe('1003 · meio-dia');
    act(() => vi.advanceTimersByTime(3000));
    expect(vaga.querySelector('div').textContent).toBe('7');
    act(() => estudio.mudar({ proximo: null }));
    expect(container.querySelector('#tira li')).toBe(null);
  });
});
