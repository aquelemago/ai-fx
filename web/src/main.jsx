// Ponto de entrada da página: cria as peças do núcleo e o estúdio, e desenha o App.
// É o único módulo que conhece todas as peças; para trocar uma, é aqui.
// tokens.css vem antes de tudo: ele declara a ordem das camadas (@layer), e a primeira
// declaração vale. Se um componente carregasse antes, a camada dele ficaria por baixo.
import './design-system/tokens.css';
import './design-system/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClienteApi } from './nucleo/api/cliente.js';
import { ColecaoDeQuadros } from './nucleo/dominio/quadros.js';
import { Estudio } from './nucleo/estudio/estudio.js';
import { SessaoDeGeracao } from './nucleo/geracao/sessao.js';
import { GerenteDeProjetos } from './nucleo/projetos/gerente.js';
import { DetectorDeRosto } from './nucleo/rosto/detector.js';
import { prepararFotoBase } from './nucleo/rosto/recorte.js';
import { lerImagem } from './nucleo/util/imagem.js';
import { abrirVideo } from './nucleo/video/extrator.js';
import { gravarCanvas } from './nucleo/video/gravador.js';
import { App } from './app/App.jsx';
import { ContextoDoEstudio } from './app/contexto.js';

const LADO_DA_FOTO = 512; // lado do modelo (src/ia/sd-turbo/gerador.js)

const cliente = new ClienteApi();
const detector = new DetectorDeRosto();
const estudio = new Estudio({
  cliente,
  detector,
  quadros: new ColecaoDeQuadros(),
  sessao: new SessaoDeGeracao({ cliente, detector }),
  gerente: new GerenteDeProjetos({ cliente }),
  prepararFoto: (arquivo) => prepararFotoBase(arquivo, detector, new OffscreenCanvas(LADO_DA_FOTO, LADO_DA_FOTO)),
  prepararVideo: (arquivo) => abrirVideo(arquivo, LADO_DA_FOTO),
  lerImagem,
  gravar: gravarCanvas,
});

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <ContextoDoEstudio value={estudio}>
      <App />
    </ContextoDoEstudio>
  </StrictMode>,
);

addEventListener('pagehide', () => estudio.gerente.salvarAgora());
estudio.iniciar();
