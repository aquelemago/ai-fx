// Coluna de montagem: os três painéis das abas (Foto, Cenas e Ajustes) e o rodapé fixo com o
// botão Gerar e o progresso, que aparece em qualquer aba.
// A barra de topo (marca, abas e projeto) é do App e entra por ali.
import {
  AreaDeTexto, Botao, CampoDeTexto, EscolherArquivo, Grupo, Nota, Segmentos,
} from '../../design-system/index.js';
import { QUANTIDADES } from '../../nucleo/dominio/configuracao.js';
import { PERSONALIZADO, ROTEIROS, SO_A_IMAGEM } from '../../nucleo/dominio/roteiros.js';
import { GerenciarProjeto } from '../projetos/index.js';
import { Ajustes } from './Ajustes.jsx';
import { FotoBase } from './FotoBase.jsx';
import { useMontagem } from './useMontagem.js';
import estilos from './Montagem.module.css';

const OPCOES_DE_ROTEIRO = [
  ...Object.keys(ROTEIROS).map((nome) => ({ valor: nome, detalhe: `${ROTEIROS[nome].cenas.length} cenas` })),
  { valor: PERSONALIZADO, detalhe: 'suas cenas' },
  { valor: SO_A_IMAGEM, detalhe: 'sem prompt' },
];
const OPCOES_DE_QUADROS = QUANTIDADES.map((n) => ({ valor: n }));

export function Montagem({ aba }) {
  return (
    <aside className={estilos.montagem}>
      <div className={estilos.paineis}>
        <Painel valor="foto" ativo={aba === 'foto'}><PainelFoto /></Painel>
        <Painel valor="cenas" ativo={aba === 'cenas'}><PainelCenas /></Painel>
        <Painel valor="ajustes" ativo={aba === 'ajustes'}><PainelAjustes /></Painel>
      </div>
      <Rodape />
    </aside>
  );
}

// Painel da aba: ligado à aba pelo id, escondido (mas montado) quando outra aba está ativa.
function Painel({ valor, ativo, children }) {
  return (
    <section
      id={`painel-${valor}`} role="tabpanel" aria-labelledby={`aba-${valor}`}
      hidden={!ativo} className={estilos.painel}
    >
      {children}
    </section>
  );
}

function PainelFoto() {
  const m = useMontagem();
  const c = m.configuracao;
  return (
    <>
      <Grupo titulo="Foto">
        <div className={estilos.foto}>
          <FotoBase canvas={m.foto.canvas} pronta={m.foto.pronta} />
          <div>
            <div className={estilos.acoesFoto}>
              <EscolherArquivo
                id="arquivo" rotulo="Escolher foto" accept="image/*" disabled={!m.podeEscolherBase} aoEscolher={m.escolherFoto}
              />
              <EscolherArquivo
                id="arquivoVideo" rotulo="Escolher vídeo" accept="video/*" disabled={!m.podeEscolherBase} aoEscolher={m.escolherVideo}
              />
              <Botao id="gerarRosto" disabled={!m.podeGerarRosto} onClick={m.gerarRosto}>Gerar rosto</Botao>
            </div>
            <Nota id="infoBase">{m.foto.info}</Nota>
          </div>
        </div>
      </Grupo>

      <Grupo titulo="Você, em inglês" para="eu">
        <CampoDeTexto id="eu" spellCheck={false} value={c.descricao} onChange={(e) => m.definirDescricao(e.target.value)} />
        <Nota>Evita que a IA troque seu cabelo ou roupa.</Nota>
      </Grupo>
    </>
  );
}

function PainelCenas() {
  const m = useMontagem();
  const c = m.configuracao;
  return (
    <>
      <Grupo titulo="Roteiro" conjunto>
        <Segmentos id="roteiros" disposicao="lista" nome="roteiro" opcoes={OPCOES_DE_ROTEIRO} valor={c.roteiro} aoMudar={m.escolherRoteiro} />
      </Grupo>

      <Grupo titulo="Cenas" para="prompts">
        <AreaDeTexto
          id="prompts" rows={6} spellCheck={false} aria-label="Cenas, uma por linha" className={estilos.cenas}
          value={c.cenas} onChange={(e) => m.editarCenas(e.target.value)} disabled={!m.podeEditarCenas}
        />
        <Nota>
          {m.podeEditarCenas
            ? 'Uma cena por linha, em inglês. {eu} vira a sua descrição.'
            : 'Sem prompt: a IA só relê a imagem. Use Força baixa para um filtro leve.'}
        </Nota>
      </Grupo>

      <Grupo titulo="Quadros" conjunto>
        <Segmentos
          id="quantidades" nome="quadros" opcoes={OPCOES_DE_QUADROS} valor={c.quadros} aoMudar={m.definirQuadros}
          disabled={!m.podeEscolherQuadros}
        />
        {!m.podeEscolherQuadros && <Nota>do vídeo: {m.quadrosDoVideo}</Nota>}
        <Nota id="estimativa">{m.estimativa}</Nota>
      </Grupo>
    </>
  );
}

function PainelAjustes() {
  const m = useMontagem();
  return (
    <>
      <Ajustes ajustes={m.configuracao.ajustes} definirAjuste={m.definirAjuste} podeAjustarFoto={m.podeAjustarFoto} />
      <GerenciarProjeto />
    </>
  );
}

// Rodapé fixo da coluna: o Gerar (a única placa cheia) e o progresso da geração.
function Rodape() {
  const m = useMontagem();
  return (
    <div className={estilos.rodape}>
      <Botao
        variante="principal" id="gerar" emAndamento={m.gerar.emAndamento}
        disabled={!m.gerar.habilitado} onClick={m.gerar.aoClicar}
      >
        {m.gerar.rotulo}
      </Botao>
      <div className={estilos.progresso} aria-hidden="true">
        <div id="progresso" className={estilos.barra} style={{ width: `${m.progresso * 100}%` }} />
      </div>
      <Nota id="infoGeracao" role="status">{m.infoGeracao}</Nota>
    </div>
  );
}
