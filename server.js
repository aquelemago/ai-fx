// Ponto de entrada: lê a configuração, monta as peças e liga o servidor.
// Cada peça recebe suas dependências prontas, então pode ser trocada ou testada isoladamente.
import http from 'node:http';
import { lerConfig } from './src/config.js';
import { criarGerador } from './src/ia/modelos.js';
import { RepositorioDeProjetos } from './src/projetos/repositorio.js';
import { ServicoDeGeracao } from './src/servicos/servico-geracao.js';
import { ServicoDeProjetos } from './src/servicos/servico-projetos.js';
import { criarApp } from './src/http/app.js';
import { criarPagina } from './src/http/pagina.js';

const config = lerConfig();

const repositorio = new RepositorioDeProjetos(config.dirProjetos);
const servico = new ServicoDeGeracao({ gerador: criarGerador(config.modelo, config), projetos: repositorio });
const projetos = new ServicoDeProjetos({ repositorio, geracao: servico });

const servidorHttp = http.createServer();
const pagina = await criarPagina({ dirWeb: config.dirWeb, desenvolvimento: config.desenvolvimento, servidorHttp });
const app = criarApp({
  servico,
  projetos,
  pagina,
  dirProjetos: config.dirProjetos,
  dirMediapipe: config.dirMediapipe,
});

const endereco = `http://localhost:${config.porta}`;
servidorHttp.on('request', app);
servidorHttp.listen(config.porta, config.host, () =>
  console.log(`Servidor em ${endereco} (carregando modelo ${config.modelo}...)\nProjetos em ${config.dirProjetos}`));

servico.iniciar()
  .then(() => console.log(`Modelo pronto. Abra ${endereco}`))
  .catch((e) => console.error('Falha ao carregar o modelo (rodou npm run modelos?):', e.message));
