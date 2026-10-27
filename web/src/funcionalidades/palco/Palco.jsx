// Palco: a prévia do vídeo na moldura de papel e a barra de reprodução
// (tocar, ritmo, transição, formato, gravar e baixar).
import { useEffect, useRef } from 'react';
import { Botao, Deslizante, Icone, Segmentos } from '../../design-system/index.js';
import { FORMATOS } from '../../nucleo/dominio/formatos.js';
import { usePalco } from './usePalco.js';
import { usePrevia } from './usePrevia.js';
import estilos from './Palco.module.css';

const OPCOES_DE_FORMATO = Object.keys(FORMATOS).map((valor) => ({ valor }));

export function Palco() {
  const p = usePalco();
  const previa = usePrevia();
  const baixar = useRef(null);
  useEffect(() => {
    if (p.video) baixar.current.focus();
  }, [p.video]);

  return (
    <main className={estilos.palco}>
      <div className={estilos.moldura} id="moldura" data-formato={p.formato}>
        <canvas ref={previa} id="player" width="720" height="1280" aria-label="Prévia do vídeo" className={estilos.previa} />
        <p id="vazio" className={estilos.vazio} hidden={!p.vazio}>
          Escolha uma foto e gere os quadros.<br />O vídeo aparece aqui.
        </p>
      </div>
      <div className={estilos.controles}>
        <Botao variante="icone" id="tocar" aria-label={p.tocando ? 'Pausar' : 'Tocar'} disabled={!p.podeTocar} onClick={p.tocar}>
          <Icone nome={p.tocando ? 'pausar' : 'tocar'} />
        </Botao>
        <Deslizante
          id="fps" rotulo="Ritmo" min={1} max={30} className={estilos.controle}
          valor={p.ritmo.fps} formatar={(v) => `${v} q/s`} aoMudar={(fps) => p.definirRitmo({ fps })}
        />
        <Deslizante
          id="transicao" rotulo="Transição" min={0} max={1} passo={0.05} className={estilos.controle}
          valor={p.ritmo.transicao} formatar={(v) => `${Math.round(v * 100)}%`} aoMudar={(transicao) => p.definirRitmo({ transicao })}
        />
        <Segmentos
          nome="formato" rotuloAcessivel="Formato do vídeo" className={estilos.formato}
          opcoes={OPCOES_DE_FORMATO} valor={p.formato} aoMudar={p.definirFormato}
        />
        <div className={estilos.saida}>
          <Botao id="exportar" disabled={!p.podeGravar} onClick={p.gravar}>{p.rotuloDeGravar}</Botao>
          <Botao como="a" id="baixar" ref={baixar} hidden={!p.video} href={p.video?.url} download={p.video?.nome}>
            <Icone nome="baixar" />Baixar
          </Botao>
        </div>
      </div>
    </main>
  );
}
