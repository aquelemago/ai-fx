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

const PALCO = `<main class="palco">
      <div class="moldura" id="moldura" data-formato="9:16">
        <canvas id="player" width="720" height="1280" aria-label="Prévia do vídeo"></canvas>
        <p id="vazio" class="vazio">Escolha uma foto e gere os quadros.<br>O vídeo aparece aqui.</p>
      </div>

      <div class="controles">
        <button id="tocar" class="icone" aria-label="Pausar" disabled>
          <svg><use href="#i-pausar"/></svg>
        </button>
        <label class="controle">Ritmo <output for="fps"></output>
          <input type="range" id="fps" min="1" max="30" value="8"></label>
        <label class="controle">Transição <output for="transicao"></output>
          <input type="range" id="transicao" min="0" max="1" step="0.05" value="0.6"></label>
        <div class="segmentos formato" role="radiogroup" aria-label="Formato do vídeo">
          <label><input type="radio" name="formato" value="9:16" checked><span>9:16</span></label>
          <label><input type="radio" name="formato" value="1:1"><span>1:1</span></label>
        </div>
        <div class="saida">
          <button id="exportar" class="botao-linha" disabled>Gravar vídeo</button>
          <a id="baixar" class="botao-linha" hidden><svg><use href="#i-baixar"/></svg>Baixar</a>
        </div>
      </div>
    </main>`;

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
export const PalcoLegado = () => <Marcacao html={PALCO} />;
export const TiraLegada = () => <Marcacao html={TIRA} />;

/** Liga os painéis antigos ao estúdio depois que a marcação deles está na tela. */
export function useLegado() {
  const estudio = useEstudio();
  useEffect(() => ligarLegado(estudio), [estudio]);
}
