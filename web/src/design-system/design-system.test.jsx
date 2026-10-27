import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AreaDeTexto, Botao, CampoDeTexto, Deslizante, EscolherArquivo, Grupo, Icone, Nota, Recolhivel, Segmentos,
  Selecao, SpriteDeIcones, NOMES_DE_ICONES,
} from './index.js';

describe('Botao', () => {
  test('é um button de tipo "button" na variante linha por padrão', () => {
    render(<Botao>Novo</Botao>);
    const b = screen.getByRole('button', { name: 'Novo' });
    expect(b.type).toBe('button');
    expect(b.className).toBe('linha');
  });

  test('junta variante, tom, andamento e classe de quem usa', () => {
    render(<Botao variante="principal" emAndamento className="extra">Parar</Botao>);
    expect(screen.getByRole('button').className).toBe('principal emAndamento extra');
    render(<Botao tom="perigo">Excluir</Botao>);
    expect(screen.getByRole('button', { name: 'Excluir' }).className).toBe('linha perigo');
  });

  test('discreto não tem borda e pede nome acessível', () => {
    render(<Botao variante="discreto" aria-label="Tirar o quadro 1 do vídeo"><Icone nome="riscar" /></Botao>);
    expect(screen.getByRole('button', { name: 'Tirar o quadro 1 do vídeo' }).className).toBe('discreto');
  });

  test('vira link com a mesma aparência', () => {
    render(<Botao como="a" href="blob:x" download="v.mp4">Baixar</Botao>);
    const a = screen.getByRole('link', { name: 'Baixar' });
    expect(a.getAttribute('download')).toBe('v.mp4');
    expect(a.hasAttribute('type')).toBe(false);
  });
});

describe('Icone', () => {
  test('o sprite tem um símbolo para cada nome e o ícone aponta para ele', () => {
    const { container } = render(<><SpriteDeIcones /><Icone nome="tocar" /></>);
    for (const nome of NOMES_DE_ICONES) expect(container.querySelector(`symbol#i-${nome}`)).not.toBeNull();
    expect(container.querySelector('use').getAttribute('href')).toBe('#i-tocar');
  });
});

describe('Deslizante', () => {
  test('mostra o valor formatado e devolve números', () => {
    const aoMudar = vi.fn();
    render(<Deslizante id="fps" rotulo="Ritmo" valor={8} min={1} max={30} formatar={(v) => `${v} q/s`} aoMudar={aoMudar} />);
    expect(screen.getByText('8 q/s').tagName).toBe('OUTPUT');
    fireEvent.change(screen.getByRole('slider', { name: 'Ritmo' }), { target: { value: '12' } });
    expect(aoMudar).toHaveBeenCalledWith(12);
  });
});

describe('Segmentos', () => {
  const opcoes = [{ valor: '12' }, { valor: '24' }];

  test('marca o valor atual, mesmo quando ele é número', () => {
    render(<Segmentos nome="quadros" opcoes={opcoes} valor={24} aoMudar={() => {}} />);
    expect(screen.getByLabelText('24').checked).toBe(true);
    expect(screen.getByLabelText('12').checked).toBe(false);
  });

  test('avisa a opção escolhida', async () => {
    const aoMudar = vi.fn();
    render(<Segmentos nome="quadros" opcoes={opcoes} valor="24" aoMudar={aoMudar} />);
    await userEvent.click(screen.getByText('12'));
    expect(aoMudar).toHaveBeenCalledWith('12');
  });

  test('lista mostra o detalhe e radiogroup ganha nome acessível', () => {
    render(<Segmentos nome="r" disposicao="lista" rotuloAcessivel="Roteiro" opcoes={[{ valor: 'A', detalhe: '5 cenas' }]} valor="A" aoMudar={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Roteiro' }).className).toBe('lista');
    expect(screen.getByText('5 cenas').tagName).toBe('SMALL');
  });
});

describe('Grupo, Nota e Recolhivel', () => {
  test('grupo comum é section com h2 ligado ao campo', () => {
    render(<Grupo titulo="Projeto" para="projeto"><input id="projeto" /></Grupo>);
    expect(screen.getByRole('heading', { name: 'Projeto' }).tagName).toBe('H2');
    expect(screen.getByLabelText('Projeto').id).toBe('projeto');
  });

  test('conjunto é fieldset com legend', () => {
    render(<Grupo titulo="Quadros" conjunto><Nota>texto</Nota></Grupo>);
    expect(screen.getByRole('group', { name: 'Quadros' }).tagName).toBe('FIELDSET');
    expect(screen.getByText('texto').className).toBe('nota');
    render(<Nota como="span">contagem</Nota>);
    expect(screen.getByText('contagem').tagName).toBe('SPAN');
  });

  test('recolhível controlado avisa quando abre', () => {
    const aoAlternar = vi.fn();
    const { container } = render(<Recolhivel resumo="Ajustes" aberto={false} aoAlternar={aoAlternar}>x</Recolhivel>);
    const details = container.querySelector('details');
    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(aoAlternar).toHaveBeenCalledWith(true);
  });
});

describe('Campos', () => {
  test('aoConfirmar só dispara no change nativo, não a cada tecla', async () => {
    const aoConfirmar = vi.fn();
    render(<CampoDeTexto aria-label="Nome" defaultValue="" aoConfirmar={aoConfirmar} />);
    const campo = screen.getByLabelText('Nome');
    await userEvent.type(campo, 'abc');
    expect(aoConfirmar).not.toHaveBeenCalled();
    fireEvent.change(campo);
    expect(aoConfirmar).toHaveBeenCalledWith('abc', campo);
  });

  test('seleção e área de texto usam a borda da cabine', () => {
    render(<><Selecao aria-label="P" opcoes={[{ valor: 'a', rotulo: 'A' }]} /><AreaDeTexto aria-label="T" /></>);
    expect(screen.getByLabelText('P').className).toBe('campo selecao');
    expect(screen.getByLabelText('T').className).toBe('campo area');
  });

  test('escolher arquivo entrega o arquivo e limpa o campo', () => {
    const aoEscolher = vi.fn();
    render(<EscolherArquivo id="arquivo" rotulo="Escolher foto" accept="image/*" aoEscolher={aoEscolher} />);
    const entrada = screen.getByLabelText('Escolher foto');
    const arquivo = new File(['x'], 'rosto.png', { type: 'image/png' });
    fireEvent.change(entrada, { target: { files: [arquivo] } });
    expect(aoEscolher).toHaveBeenCalledWith(arquivo);
    expect(entrada.closest('label').className).toBe('linha arquivo');
  });
});
