import { describe, expect, test, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { criarEstudioFalso, renderizarCom } from '../../teste/estudio-falso.jsx';
import { GerenciarProjeto, SeletorDeProjeto } from './Projetos.jsx';

const p1 = { id: 'p1-aaaaaa', nome: 'Projeto 1' };
const p2 = { id: 'p2-bbbbbb', nome: 'Viagem' };
const aberto = { projetos: [p1, p2], projeto: { ...p1, quadros: [] } };

describe('SeletorDeProjeto', () => {
  test('mostra a lista e o projeto aberto', () => {
    renderizarCom(criarEstudioFalso(aberto), <SeletorDeProjeto />);
    const lista = screen.getByLabelText('Projeto atual');
    expect([...lista.options].map((o) => o.text)).toEqual(['Projeto 1', 'Viagem']);
    expect(lista.value).toBe('p1-aaaaaa');
  });

  test('fica travada enquanto não há projeto ou durante uma geração', () => {
    const estudio = criarEstudioFalso();
    renderizarCom(estudio, <SeletorDeProjeto />);
    expect(screen.getByLabelText('Projeto atual').disabled).toBe(true);
    act(() => estudio.mudar(aberto));
    expect(screen.getByRole('button', { name: 'Novo' }).disabled).toBe(false);
    act(() => estudio.mudar({ gerando: true }));
    expect(screen.getByRole('button', { name: 'Novo' }).disabled).toBe(true);
  });

  test('escolher outro projeto e criar um novo', async () => {
    const estudio = criarEstudioFalso(aberto);
    renderizarCom(estudio, <SeletorDeProjeto />);
    await userEvent.selectOptions(screen.getByLabelText('Projeto atual'), 'Viagem');
    expect(estudio.abrirProjeto).toHaveBeenCalledWith('p2-bbbbbb');
    await userEvent.click(screen.getByRole('button', { name: 'Novo' }));
    expect(estudio.novoProjeto).toHaveBeenCalled();
  });
});

describe('GerenciarProjeto', () => {
  test('mostra o nome do projeto e a pasta dele', () => {
    renderizarCom(criarEstudioFalso(aberto), <GerenciarProjeto />);
    expect(screen.getByLabelText('Nome do projeto').value).toBe('Projeto 1');
    expect(screen.getByText('Tudo deste projeto fica em projetos/p1-aaaaaa/')).toBeTruthy();
  });

  test('excluir fica travada durante uma geração', () => {
    const estudio = criarEstudioFalso(aberto);
    renderizarCom(estudio, <GerenciarProjeto />);
    act(() => estudio.mudar({ gerando: true }));
    expect(screen.getByRole('button', { name: 'Excluir projeto' }).disabled).toBe(true);
  });

  test('renomeia ao confirmar, sem espaços; nome vazio volta ao atual', async () => {
    const estudio = criarEstudioFalso(aberto);
    estudio.renomearProjeto.mockResolvedValue({ ...p1, nome: 'Férias' });
    renderizarCom(estudio, <GerenciarProjeto />);
    const campo = screen.getByLabelText('Nome do projeto');
    await userEvent.clear(campo);
    await userEvent.type(campo, '  Férias ');
    expect(estudio.renomearProjeto).not.toHaveBeenCalled();
    fireEvent(campo, new Event('change')); // o "change" nativo: sair do campo ou Enter
    expect(estudio.renomearProjeto).toHaveBeenCalledWith('Férias');
    await waitFor(() => expect(campo.value).toBe('Férias'));

    await userEvent.clear(campo);
    await userEvent.type(campo, '   ');
    fireEvent(campo, new Event('change'));
    expect(campo.value).toBe('Projeto 1');
    expect(estudio.renomearProjeto).toHaveBeenCalledTimes(1);
  });

  test('excluir pede confirmação', async () => {
    const estudio = criarEstudioFalso(aberto);
    renderizarCom(estudio, <GerenciarProjeto />);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir projeto' }));
    expect(estudio.excluirProjeto).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir projeto' }));
    expect(estudio.excluirProjeto).toHaveBeenCalled();
    expect(confirmar.mock.calls[0][0]).toMatch(/^Excluir o projeto "Projeto 1"\?/);
  });
});
