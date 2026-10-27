// A cabine: coluna de montagem (com a barra de projetos), palco com a prévia e a tira de cópias.
import { SpriteDeIcones } from '../design-system/index.js';
import { Montagem } from '../funcionalidades/montagem/index.js';
import { Palco } from '../funcionalidades/palco/index.js';
import { Projetos } from '../funcionalidades/projetos/index.js';
import { Tira } from '../funcionalidades/tira/index.js';
import estilos from './App.module.css';

export function App() {
  return (
    <>
      <SpriteDeIcones />
      <div className={estilos.cabine}>
        <Montagem projetos={<Projetos />} />
        <Palco />
        <Tira />
      </div>
    </>
  );
}
