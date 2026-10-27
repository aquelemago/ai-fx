// Marcação dos painéis que ainda não viraram React, igual à do index.html antigo.
// Some junto com o painel quando ele for migrado.
import { useEffect } from 'react';
import { useEstudio } from '../app/contexto.js';
import { ligarLegado } from './main.js';

const PROJETOS = `<section class="grupo">
        <h2><label for="projeto">Projeto</label></h2>
        <div class="linha-projeto">
          <select id="projeto" disabled></select>
          <button id="novoProjeto" class="botao-linha" disabled>Novo</button>
        </div>
        <details class="cenas">
          <summary>Renomear ou excluir</summary>
          <input type="text" id="nomeProjeto" maxlength="80" aria-label="Nome do projeto" spellcheck="false">
          <button id="excluirProjeto" class="botao-linha perigo">Excluir projeto</button>
          <p id="pastaProjeto" class="nota"></p>
        </details>
      </section>`;

const TIRA = `<aside class="tira" aria-labelledby="titulo-tira">
      <header>
        <h2 id="titulo-tira">Tira</h2>
        <span id="contagem" class="nota"></span>
      </header>
      <div class="fenda" aria-hidden="true"></div>
      <ol id="tira"></ol>
    </aside>`;

// display: contents deixa os elementos de dentro participarem da grade da cabine
const Marcacao = ({ html }) => <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;

export const ProjetosLegado = () => <Marcacao html={PROJETOS} />;
export const TiraLegada = () => <Marcacao html={TIRA} />;

/** Liga os painéis antigos ao estúdio depois que a marcação deles está na tela. */
export function useLegado() {
  const estudio = useEstudio();
  useEffect(() => ligarLegado(estudio), [estudio]);
}
