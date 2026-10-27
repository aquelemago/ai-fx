// Configuração única do servidor. Tudo que muda por ambiente passa por aqui,
// para que os outros módulos recebam valores prontos e não leiam process.env.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function lerConfig(env = process.env) {
  const dirModelos = path.join(raiz, 'models');
  return {
    raiz,
    porta: Number(env.PORT) || 3000,
    // só a própria máquina acessa; HOST=0.0.0.0 abre para a rede local
    host: env.HOST || '127.0.0.1',
    modelo: env.MODELO || 'sd-turbo',
    dirModelos,
    dirProjetos: env.PROJETOS ? path.resolve(env.PROJETOS) : path.join(raiz, 'projetos'),
    dirWeb: path.join(raiz, 'web'),
    // produção serve a página já montada (npm run build); desenvolvimento passa pelo Vite
    desenvolvimento: env.NODE_ENV !== 'production',
    dirMediapipe: [
      path.join(raiz, 'node_modules', '@mediapipe', 'tasks-vision'),
      path.join(dirModelos, 'mediapipe'),
    ],
    // núcleos físicos costumam render mais que as threads do hyper-threading
    threads: Number(env.THREADS) || Math.max(1, Math.floor(os.availableParallelism() / 2)),
    // TAESD decodifica em ~2s contra ~30s do VAE completo, com qualidade bem próxima
    vaeCompleto: env.VAE === 'completo',
  };
}
