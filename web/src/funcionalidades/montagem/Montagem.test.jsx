import { describe, expect, test } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarEstudioFalso, renderizarCom } from '../../teste/estudio-falso.jsx';
import { Montagem } from './Montagem.jsx';

const pronto = { pronto: true, projeto: { id: 'p1' }, foto: { canvas: null, pontos: [] } };

describe('Montagem', () => {
  test('Gerar só habilita com modelo pronto, projeto e foto', () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem aba="foto" />);
    const gerar = screen.getByRole('button', { name: 'Gerar 24 quadros' });
    expect(gerar.disabled).toBe(true);
    act(() => estudio.mudar(pronto));
    expect(gerar.disabled).toBe(false);
  });

  test('o botão vira Parar durante a geração e avisa quando está parando', async () => {
    const estudio = criarEstudioFalso({ ...pronto, gerando: true });
    renderizarCom(estudio, <Montagem aba="foto" />);
    await userEvent.click(screen.getByRole('button', { name: 'Parar' }));
    expect(estudio.parar).toHaveBeenCalled();
    act(() => estudio.mudar({ parando: true }));
    expect(screen.getByRole('button', { name: 'Parando…' })).toBeTruthy();
  });

  test('quantidade de quadros muda a estimativa', () => {
    const estudio = criarEstudioFalso({ segPorQuadro: 10 });
    renderizarCom(estudio, <Montagem aba="cenas" />);
    expect(screen.getByText('Cerca de 4 min 00 s no seu processador.')).toBeTruthy();
  });

  test('descrição e foto vão para o estúdio na aba Foto', async () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem aba="foto" />);
    fireEvent.change(screen.getByLabelText('Você, em inglês'), { target: { value: 'a woman' } });
    expect(estudio.definirDescricao).toHaveBeenCalledWith('a woman');
  });

  test('roteiro e cenas vão para o estúdio na aba Cenas', async () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem aba="cenas" />);
    await userEvent.click(screen.getByText('Personalizado'));
    expect(estudio.escolherRoteiro).toHaveBeenCalledWith('Personalizado');
    fireEvent.change(screen.getByLabelText('Cenas, uma por linha'), { target: { value: 'x' } });
    expect(estudio.editarCenas).toHaveBeenCalledWith('x');
  });

  test('as cenas ficam sempre visíveis na aba Cenas (sem recolher)', () => {
    const estudio = criarEstudioFalso();
    const { container } = renderizarCom(estudio, <Montagem aba="cenas" />);
    expect(container.querySelector('#prompts').closest('details')).toBe(null);
  });

  test('ajustes mostram o valor e a semente aceita o campo vazio enquanto digita', () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem aba="ajustes" />);
    expect(screen.getByRole('slider', { name: 'Naturalidade do rosto' }).value).toBe('0.45');
    fireEvent.change(screen.getByRole('slider', { name: 'Força da IA' }), { target: { value: '0.9' } });
    expect(estudio.definirAjuste).toHaveBeenCalledWith('forca', 0.9);
    const semente = screen.getByRole('spinbutton');
    fireEvent.change(semente, { target: { value: '' } });
    expect(semente.value).toBe('');
    expect(estudio.definirAjuste).toHaveBeenCalledWith('semente', 0);
  });

  test('mensagens de foto e geração aparecem', () => {
    const estudio = criarEstudioFalso({ infoFoto: 'Procurando o rosto…', infoGeracao: 'Faltam cerca de 8 s.' });
    renderizarCom(estudio, <Montagem aba="foto" />);
    expect(screen.getByText('Procurando o rosto…')).toBeTruthy();
    expect(screen.getByText('Faltam cerca de 8 s.').getAttribute('role')).toBe('status');
  });

  test('com vídeo como base, o botão diz Gerar 80 quadros e fica habilitado', () => {
    const estudio = criarEstudioFalso({ ...pronto, foto: null, videoFonte: { canvas: null, total: 80 } });
    renderizarCom(estudio, <Montagem aba="foto" />);
    expect(screen.getByRole('button', { name: 'Gerar 80 quadros' }).disabled).toBe(false);
  });

  test('Escolher vídeo manda o arquivo ao estúdio', async () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem aba="foto" />);
    const arquivo = new File(['v'], 'eu.mp4', { type: 'video/mp4' });
    await userEvent.upload(screen.getByLabelText('Escolher vídeo'), arquivo);
    expect(estudio.escolherVideo).toHaveBeenCalledWith(arquivo);
  });

  test('com vídeo, Quadros fica desligado e mostra quantos vêm do vídeo', () => {
    const estudio = criarEstudioFalso({ ...pronto, segPorQuadro: 10, segPorQuadroVideo: 20, videoFonte: { canvas: null, total: 12 } });
    renderizarCom(estudio, <Montagem aba="cenas" />);
    const radios = () => screen.getAllByRole('radio').filter((r) => r.name === 'quadros');
    expect(radios().every((r) => r.disabled)).toBe(true);
    expect(screen.getByText('do vídeo: 12')).toBeTruthy();
    expect(screen.getByText('Cerca de 4 min 00 s no seu processador.')).toBeTruthy();
    act(() => estudio.mudar({ videoFonte: null }));
    expect(radios().some((r) => r.disabled)).toBe(false);
    expect(screen.queryByText(/do vídeo/)).toBe(null);
  });

  test('com vídeo, os ajustes de foto parada ficam desligados com a nota', () => {
    const estudio = criarEstudioFalso({ ...pronto, videoFonte: { canvas: null, total: 12 } });
    renderizarCom(estudio, <Montagem aba="ajustes" />);
    for (const nome of ['Suavidade', 'Naturalidade do rosto', 'Continuidade']) {
      expect(screen.getByRole('slider', { name: nome }).disabled).toBe(true);
    }
    expect(screen.getByRole('slider', { name: 'Naturalidade do rosto' }).value).toBe('0.45');
    expect(screen.getAllByText('Não se aplica ao vídeo.')).toHaveLength(3);
    expect(screen.getByRole('slider', { name: 'Força da IA' }).disabled).toBe(false);
  });

  test('enquanto gera, não dá para trocar a base', () => {
    const estudio = criarEstudioFalso({ ...pronto, gerando: true });
    const { container } = renderizarCom(estudio, <Montagem aba="foto" />);
    expect(container.querySelector('#arquivo').disabled).toBe(true);
    expect(container.querySelector('#arquivoVideo').disabled).toBe(true);
  });

  test('com "Só a imagem", a caixa de cenas fica desligada com a nota', async () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <Montagem aba="cenas" />);
    await userEvent.click(screen.getByText('Só a imagem'));
    expect(estudio.escolherRoteiro).toHaveBeenCalledWith('Só a imagem');
    act(() => estudio.mudar({ configuracao: { ...estudio.estado.configuracao, roteiro: 'Só a imagem' } }));
    expect(screen.getByLabelText('Cenas, uma por linha').disabled).toBe(true);
    expect(screen.getByText('Sem prompt: a IA só relê a imagem. Use Força baixa para um filtro leve.')).toBeTruthy();
  });
});
