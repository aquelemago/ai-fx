// Barra de projeto no topo da coluna de montagem: escolher, criar, renomear e excluir.
import { useEffect, useState } from 'react';
import { Botao, CampoDeTexto, Grupo, Nota, Recolhivel, Selecao } from '../../design-system/index.js';
import { useProjetos } from './useProjetos.js';
import estilos from './Projetos.module.css';

export function Projetos() {
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
    <Grupo titulo="Projeto" para="projeto">
      <div className={estilos.linha}>
        <Selecao id="projeto" disabled={!p.habilitado} value={p.id ?? ''} onChange={(e) => p.abrir(e.target.value)} opcoes={p.opcoes} />
        <Botao id="novoProjeto" className={estilos.novo} disabled={!p.habilitado} onClick={p.novo}>Novo</Botao>
      </div>
      <Recolhivel resumo="Renomear ou excluir" className={estilos.recolhivel}>
        <CampoDeTexto
          id="nomeProjeto" maxLength={80} aria-label="Nome do projeto" spellCheck={false} className={estilos.nome}
          disabled={!p.habilitado} value={nome} onChange={(e) => setNome(e.target.value)} aoConfirmar={confirmarNome}
        />
        <Botao id="excluirProjeto" tom="perigo" className={estilos.excluir} disabled={!p.habilitado} onClick={excluir}>
          Excluir projeto
        </Botao>
        <Nota id="pastaProjeto">{p.pasta}</Nota>
      </Recolhivel>
    </Grupo>
  );
}
