// A cabine: barra de topo (marca, estado do servidor, abas de seção e projeto) e, embaixo,
// a coluna de montagem (com os painéis das abas e o rodapé do Gerar), o palco com a prévia
// e a tira de cópias. Palco e tira ficam fixos, visíveis em qualquer aba.
import { useState } from 'react';
import { Abas, SpriteDeIcones, tipografia } from '../design-system/index.js';
import { Montagem } from '../funcionalidades/montagem/index.js';
import { Palco } from '../funcionalidades/palco/index.js';
import { SeletorDeProjeto } from '../funcionalidades/projetos/index.js';
import { Tira } from '../funcionalidades/tira/index.js';
import { useEstado } from './contexto.js';
import estilos from './App.module.css';

const SECOES = [
  { valor: 'foto', rotulo: 'Foto' },
  { valor: 'cenas', rotulo: 'Cenas' },
  { valor: 'ajustes', rotulo: 'Ajustes' },
];

export function App() {
  const [aba, setAba] = useState('foto');
  return (
    <>
      <SpriteDeIcones />
      <div className={estilos.cabine}>
        <header className={estilos.barraTopo}>
          <div className={estilos.marca}>
            <h1 className={tipografia.rotulo}>Time Lapse IA</h1>
            <EstadoDoServidor />
          </div>
          <Abas opcoes={SECOES} valor={aba} aoMudar={setAba} rotuloAcessivel="Seções da montagem" />
          <SeletorDeProjeto />
        </header>
        <Montagem aba={aba} />
        <Palco />
        <Tira />
      </div>
    </>
  );
}

function EstadoDoServidor() {
  const { servidor } = useEstado();
  return (
    <p
      id="status" role="status" title={servidor.detalhe}
      className={[estilos.estado, estilos[servidor.tom]].filter(Boolean).join(' ')}
    >
      {servidor.texto}
    </p>
  );
}
