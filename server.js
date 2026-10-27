// Ponto de entrada: lê a configuração, monta as peças e liga o servidor.
// Cada peça recebe suas dependências prontas, então pode ser trocada ou testada isoladamente.
import { lerConfig } from './src/config.js';
import { criarGerador } from './src/ia/modelos.js';
import { ArmazenamentoDeQuadros } from './src/servicos/armazenamento.js';
import { ServicoDeGeracao } from './src/servicos/servico-geracao.js';
import { criarApp } from './src/http/app.js';

const config = lerConfig();

const servico = new ServicoDeGeracao({
  gerador: criarGerador(config.modelo, config),
  armazenamento: new ArmazenamentoDeQuadros(config.dirSaidas),
});

const app = criarApp({ servico, dirPublico: config.dirPublico, dirMediapipe: config.dirMediapipe });

app.listen(config.porta, () => console.log(`Servidor em http://localhost:${config.porta} (carregando modelo ${config.modelo}...)`));

servico.iniciar()
  .then(() => console.log(`Modelo pronto. Abra http://localhost:${config.porta}`))
  .catch((e) => console.error('Falha ao carregar o modelo (rodou npm run modelos?):', e.message));
