// "Ajustes finos": os controles da geração que quase ninguém precisa mexer.
import { Fragment, useEffect, useState } from 'react';
import { CampoDeTexto, Deslizante, Nota, Recolhivel, tipografia } from '../../design-system/index.js';
import estilos from './Montagem.module.css';

const AJUSTES = [
  { id: 'forca', rotulo: 'Força da IA', min: 0.15, max: 1, passo: 0.01,
    nota: 'Abaixo de 0,75 o cenário quase não muda. Acima de 0,92 a pose muda.' },
  { id: 'passos', rotulo: 'Passos', min: 1, max: 4 },
  { id: 'suavidade', rotulo: 'Suavidade', min: 1, max: 24,
    nota: '1 deixa cada quadro diferente, com tremido de time lapse.' },
  { id: 'naturalidade', rotulo: 'Naturalidade do rosto', min: 0, max: 0.6, passo: 0.05,
    nota: '0 deixa o rosto fixo, como uma foto colada. Mais alto, o rosto muda como em outro dia, mas cada quadro leva quase o dobro do tempo.' },
  { id: 'continuidade', rotulo: 'Continuidade', min: 0, max: 0.6, passo: 0.05,
    nota: 'Quanto cada quadro parte do anterior. 0 parte sempre só da sua foto.' },
  { id: 'rosto', rotulo: 'Preservar rosto', min: 0, max: 1, passo: 0.05 },
  { id: 'harmonia', rotulo: 'Harmonizar cor do rosto', min: 0, max: 1, passo: 0.05 },
];

export function Ajustes({ ajustes, definirAjuste }) {
  return (
    <Recolhivel resumo="Ajustes finos" className={estilos.ajustes}>
      {AJUSTES.map(({ id, rotulo, min, max, passo, nota }) => (
        <Fragment key={id}>
          <Deslizante
            id={id} rotulo={rotulo} min={min} max={max} passo={passo} className={estilos.ajuste}
            valor={ajustes[id]} aoMudar={(v) => definirAjuste(id, v)}
          />
          {nota && <Nota className={estilos.notaDoAjuste}>{nota}</Nota>}
        </Fragment>
      ))}
      <Semente valor={ajustes.semente} aoMudar={(v) => definirAjuste('semente', v)} />
    </Recolhivel>
  );
}

// O campo guarda o texto digitado (pode ficar vazio enquanto a pessoa apaga); o projeto guarda o número.
function Semente({ valor, aoMudar }) {
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => {
    setTexto((atual) => (Number(atual) === valor ? atual : String(valor)));
  }, [valor]);
  return (
    <label className={`${tipografia.rotulo} ${estilos.ajuste} ${estilos.semente}`}>
      Semente <CampoDeTexto
        type="number" id="semente" value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          aoMudar(Number(e.target.value));
        }}
      />
    </label>
  );
}
