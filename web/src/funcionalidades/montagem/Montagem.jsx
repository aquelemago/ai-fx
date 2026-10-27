// Coluna de montagem: marca e estado do servidor, projeto, foto, descrição, roteiro,
// quantidade de quadros, o botão Gerar e os ajustes finos.
// `projetos` é a seção da barra de projetos, que é outra funcionalidade e entra pelo App.
import {
  AreaDeTexto, Botao, CampoDeTexto, EscolherArquivo, Grupo, Nota, Recolhivel, Segmentos, tipografia,
} from '../../design-system/index.js';
import { QUANTIDADES } from '../../nucleo/dominio/configuracao.js';
import { PERSONALIZADO, ROTEIROS } from '../../nucleo/dominio/roteiros.js';
import { Ajustes } from './Ajustes.jsx';
import { FotoBase } from './FotoBase.jsx';
import { useMontagem } from './useMontagem.js';
import estilos from './Montagem.module.css';

const OPCOES_DE_ROTEIRO = [...Object.keys(ROTEIROS), PERSONALIZADO].map((nome) => {
  const n = ROTEIROS[nome]?.cenas.length;
  return { valor: nome, detalhe: n ? `${n} cenas` : 'suas cenas' };
});
const OPCOES_DE_QUADROS = QUANTIDADES.map((n) => ({ valor: n }));

export function Montagem({ projetos }) {
  const m = useMontagem();
  const c = m.configuracao;
  return (
    <aside className={estilos.montagem}>
      <header className={estilos.marca}>
        <h1 className={tipografia.rotulo}>Time Lapse IA</h1>
        <p id="status" className={[estilos.estado, estilos[m.servidor.tom]].filter(Boolean).join(' ')} role="status" title={m.servidor.detalhe}>
          {m.servidor.texto}
        </p>
      </header>

      {projetos}

      <Grupo titulo="Foto">
        <div className={estilos.foto}>
          <FotoBase canvas={m.foto.canvas} pronta={m.foto.pronta} />
          <div>
            <div className={estilos.acoesFoto}>
              <EscolherArquivo id="arquivo" rotulo="Escolher foto" accept="image/*" aoEscolher={m.escolherFoto} />
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

      <Grupo titulo="Roteiro" conjunto>
        <Segmentos id="roteiros" disposicao="lista" nome="roteiro" opcoes={OPCOES_DE_ROTEIRO} valor={c.roteiro} aoMudar={m.escolherRoteiro} />
        <Recolhivel resumo="Editar cenas" className={estilos.recolhivel} aberto={m.cenasAbertas} aoAlternar={m.abrirCenas}>
          <AreaDeTexto
            id="prompts" rows={6} spellCheck={false} aria-label="Cenas, uma por linha" className={estilos.cenas}
            value={c.cenas} onChange={(e) => m.editarCenas(e.target.value)}
          />
          <Nota>{'Uma cena por linha, em inglês. {eu} vira a sua descrição.'}</Nota>
        </Recolhivel>
      </Grupo>

      <Grupo titulo="Quadros" conjunto>
        <Segmentos id="quantidades" nome="quadros" opcoes={OPCOES_DE_QUADROS} valor={c.quadros} aoMudar={m.definirQuadros} />
        <Nota id="estimativa">{m.estimativa}</Nota>
      </Grupo>

      <Botao variante="principal" id="gerar" emAndamento={m.gerar.emAndamento} disabled={!m.gerar.habilitado} onClick={m.gerar.aoClicar}>
        {m.gerar.rotulo}
      </Botao>
      <div className={estilos.progresso} aria-hidden="true">
        <div id="progresso" className={estilos.barra} style={{ width: `${m.progresso * 100}%` }} />
      </div>
      <Nota id="infoGeracao" role="status">{m.infoGeracao}</Nota>

      <Ajustes ajustes={c.ajustes} definirAjuste={m.definirAjuste} />
    </aside>
  );
}
