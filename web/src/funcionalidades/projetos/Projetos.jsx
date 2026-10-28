// Projeto: o seletor compacto da barra de topo (escolher ou criar) e o gerenciamento
// (renomear, excluir e a pasta), que fica na aba Ajustes. As duas metades da antiga barra
// de projetos, separadas para caber no novo desenho da tela.
import { useEffect, useState } from 'react';
import { Botao, CampoDeTexto, Grupo, Nota, Selecao } from '../../design-system/index.js';
import { useProjetos } from './useProjetos.js';
import estilos from './Projetos.module.css';

/** Seletor de projeto da barra de topo: trocar de projeto ou criar um novo. */
export function SeletorDeProjeto() {
  const p = useProjetos();
  return (
    <div className={estilos.seletor}>
      <Selecao
        id="projeto" aria-label="Projeto atual" disabled={!p.habilitado}
        value={p.id ?? ''} onChange={(e) => p.abrir(e.target.value)} opcoes={p.opcoes}
      />
      <Botao id="novoProjeto" className={estilos.novo} disabled={!p.habilitado} onClick={p.novo}>Novo</Botao>
    </div>
  );
}

/** Renomear e excluir o projeto aberto, e a pasta onde ele fica. Na aba Ajustes. */
export function GerenciarProjeto() {
  const p = useProjetos();
  const [nome, setNome] = useState(p.nome);
  useEffect(() => setNome(p.nome), [p.id, p.nome]);

  // renomeia ao sair do campo ou apertar Enter; nome vazio ou igual volta ao atual
  const confirmarNome = (valor) => {
    const novo = valor.trim();
    if (!novo || novo === p.nome) return setNome(p.nome);
    p.renomear(novo).then((manifesto) => setNome(manifesto?.nome ?? p.nome));
  };
  const excluir = () => {
    const ok = confirm(`Excluir o projeto "${p.nome}"?\n\nA pasta do projeto, com a foto, os quadros e os vídeos, será apagada.`);
    if (ok) p.excluir();
  };

  return (
    <Grupo titulo="Projeto">
      <CampoDeTexto
        id="nomeProjeto" maxLength={80} aria-label="Nome do projeto" spellCheck={false} className={estilos.nome}
        disabled={!p.habilitado} value={nome} onChange={(e) => setNome(e.target.value)} aoConfirmar={confirmarNome}
      />
      <Botao id="excluirProjeto" tom="perigo" className={estilos.excluir} disabled={!p.habilitado} onClick={excluir}>
        Excluir projeto
      </Botao>
      <Nota id="pastaProjeto">{p.pasta}</Nota>
    </Grupo>
  );
}
