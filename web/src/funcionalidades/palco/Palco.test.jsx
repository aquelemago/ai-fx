import { describe, expect, test } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarEstudioFalso, renderizarCom } from '../../teste/estudio-falso.jsx';
import { Palco } from './Palco.jsx';

describe('Palco', () => {
  test('liga a prévia no estúdio e desliga ao sair da tela', () => {
    const estudio = criarEstudioFalso();
    const { unmount } = renderizarCom(estudio, <Palco />);
    expect(estudio.previa.canvas.id).toBe('player');
    expect(estudio.previa.canvas.height).toBe(1280);
    unmount();
    expect(estudio.previa).toBe(null);
  });

  test('formato muda a moldura, o canvas e vai para o estúdio', async () => {
    const estudio = criarEstudioFalso();
    const { container } = renderizarCom(estudio, <Palco />);
    await userEvent.click(screen.getByText('1:1'));
    expect(estudio.definirFormato).toHaveBeenCalledWith('1:1');
    act(() => estudio.mudar({ configuracao: { ...estudio.estado.configuracao, formato: '1:1' } }));
    expect(container.querySelector('#moldura').dataset.formato).toBe('1:1');
    expect(estudio.previa.canvas.height).toBe(720);
  });

  test('tocar e gravar precisam de pelo menos dois quadros no vídeo', () => {
    const estudio = criarEstudioFalso({ quadrosAtivos: 1 });
    renderizarCom(estudio, <Palco />);
    expect(screen.getByRole('button', { name: 'Pausar' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Gravar vídeo' }).disabled).toBe(true);
    act(() => estudio.mudar({ quadrosAtivos: 2, tocando: false }));
    expect(screen.getByRole('button', { name: 'Tocar' }).disabled).toBe(false);
  });

  test('ritmo e transição mostram o valor formatado', () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Palco />);
    expect(screen.getByText('8 q/s')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: 'Ritmo' }), { target: { value: '12' } });
    expect(estudio.definirRitmo).toHaveBeenCalledWith({ fps: 12 });
  });

  test('gravação mostra o andamento e depois oferece o download', () => {
    const estudio = criarEstudioFalso({ quadrosAtivos: 3, gravando: true, gravacao: 0.42 });
    const { container } = renderizarCom(estudio, <Palco />);
    expect(screen.getByRole('button', { name: 'Gravando 42%' }).disabled).toBe(true);
    expect(container.querySelector('#baixar').hidden).toBe(true);
    act(() => estudio.mudar({ gravando: false, gravacao: null, jaGravou: true, video: { url: 'blob:v', nome: 'timelapse-9x16.mp4' } }));
    const baixar = screen.getByRole('link', { name: 'Baixar' });
    expect(baixar.getAttribute('download')).toBe('timelapse-9x16.mp4');
    expect(document.activeElement).toBe(baixar);
    expect(screen.getByRole('button', { name: 'Gravar de novo' })).toBeTruthy();
  });

  test('a moldura mostra o convite enquanto não há foto', () => {
    const estudio = criarEstudioFalso();
    const { container } = renderizarCom(estudio, <Palco />);
    expect(container.querySelector('#vazio').hidden).toBe(false);
    act(() => estudio.mudar({ foto: { canvas: {}, pontos: Array.from({ length: 478 }, () => ({ x: 1, y: 1 })) } }));
    expect(container.querySelector('#vazio').hidden).toBe(true);
  });

  test('com um vídeo como base, a moldura sai do convite e a prévia mostra o 1º quadro-fonte', () => {
    const estudio = criarEstudioFalso();
    const { container } = renderizarCom(estudio, <Palco />);
    const quadroFonte = { width: 512, height: 512 };
    act(() => estudio.mudar({ videoFonte: { canvas: quadroFonte, total: 12 } }));
    expect(container.querySelector('#vazio').hidden).toBe(true);
    expect(estudio.previa.player.fotoBase()).toBe(quadroFonte);
  });

  test('com um vídeo como base, o recorte 9:16 acompanha o rosto do 1º quadro-fonte', () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Palco />);
    const pontos = Array.from({ length: 478 }, () => ({ x: 100, y: 200 }));
    act(() => estudio.mudar({ videoFonte: { canvas: {}, pontos, total: 12 } }));
    expect(estudio.previa.player.renderizador.rostoX).toBe(100);
  });

  test('sem base mas com quadros salvos, a moldura mostra os quadros', () => {
    const estudio = criarEstudioFalso({ quadrosAtivos: 8 });
    const { container } = renderizarCom(estudio, <Palco />);
    expect(container.querySelector('#vazio').hidden).toBe(true);
  });
});
