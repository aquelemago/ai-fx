// A cabine: coluna de montagem, palco com a prévia e a tira de cópias.
import { SpriteDeIcones } from '../design-system/index.js';
import { Montagem } from '../funcionalidades/montagem/index.js';
import { Palco } from '../funcionalidades/palco/index.js';
import { Tira } from '../funcionalidades/tira/index.js';
import { ProjetosLegado, useLegado } from '../legado/marcacao.jsx';
import estilos from './App.module.css';

export function App() {
  useLegado();
  return (
    <>
      <SpriteDeIcones />
      <div className={estilos.cabine}>
        <Montagem projetos={<ProjetosLegado />} />
        <Palco />
        <Tira />
      </div>
    </>
  );
}
