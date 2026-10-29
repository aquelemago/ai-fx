// "Ajustes finos": os controles da geração que quase ninguém precisa mexer. Conteúdo direto
// da aba Ajustes, sem recolher. Com um vídeo como base, os de foto parada (`soFoto`) ficam
// desligados, mostrando o valor salvo, que volta a valer com uma foto.
import { Fragment, useEffect, useState } from 'react';
import { CampoDeTexto, Deslizante, Grupo, Nota, tipografia } from '../../design-system/index.js';
import estilos from './Montagem.module.css';

const AJUSTES = [
  { id: 'forca', rotulo: 'Força da IA', min: 0.15, max: 1, passo: 0.01,
    nota: 'Abaixo de 0,75 o cenário quase não muda. Acima de 0,92 a pose muda.' },
  { id: 'passos', rotulo: 'Passos', min: 1, max: 4 },
  { id: 'suavidade', rotulo: 'Suavidade', min: 1, max: 24, soFoto: true,
    nota: '1 deixa cada quadro diferente, com tremido de time lapse.' },
  { id: 'naturalidade', rotulo: 'Naturalidade do rosto', min: 0, max: 0.6, passo: 0.05, soFoto: true,
    nota: '0 deixa o rosto fixo, como uma foto colada. Mais alto, o rosto muda como em outro dia, mas cada quadro leva quase o dobro do tempo.' },
  { id: 'continuidade', rotulo: 'Continuidade', min: 0, max: 0.6, passo: 0.05, soFoto: true,
    nota: 'Quanto cada quadro parte do anterior. 0 parte sempre só da sua foto.' },
  { id: 'rosto', rotulo: 'Preservar rosto', min: 0, max: 1, passo: 0.05 },
  { id: 'harmonia', rotulo: 'Harmonizar cor do rosto', min: 0, max: 1, passo: 0.05 },
];

export function Ajustes({ ajustes, definirAjuste, podeAjustarFoto = true }) {
  return (
    <Grupo titulo="Ajustes finos">
      {AJUSTES.map(({ id, rotulo, min, max, passo, nota, soFoto }) => {
        const desligado = soFoto && !podeAjustarFoto;
        const texto = desligado ? 'Não se aplica ao vídeo.' : nota;
        return (
          <Fragment key={id}>
            <Deslizante
              id={id} rotulo={rotulo} min={min} max={max} passo={passo} className={estilos.ajuste}
              valor={ajustes[id]} aoMudar={(v) => definirAjuste(id, v)} disabled={desligado}
            />
            {texto && <Nota className={estilos.notaDoAjuste}>{texto}</Nota>}
          </Fragment>
        );
      })}
      <Semente valor={ajustes.semente} aoMudar={(v) => definirAjuste('semente', v)} />
    </Grupo>
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
