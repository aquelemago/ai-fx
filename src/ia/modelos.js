// Registro de modelos de IA. Para adicionar um modelo novo (ex.: SDXL-Turbo, LCM):
// crie uma classe em src/ia/<modelo>/gerador.js com o contrato abaixo e registre aqui.
// O servidor escolhe o modelo pela variável MODELO (padrão: sd-turbo).
//
// Contrato de um gerador:
//   static nome                    identificador usado em MODELO
//   lado                           lado do quadro gerado, em pixels
//   carregar(log)                  abre os arquivos do modelo
//   definirBase(id, buffer)        prepara a foto base (PNG/JPG) sob um id
//   temBase(id)                    se a foto já está preparada
//   gerar(parametros) → PNG        parâmetros em src/http/validacao.js
import { GeradorSdTurbo } from './sd-turbo/gerador.js';

const MODELOS = new Map([[GeradorSdTurbo.nome, GeradorSdTurbo]]);

export function criarGerador(nome, opcoes) {
  const Classe = MODELOS.get(nome);
  if (!Classe) throw new Error(`modelo "${nome}" não existe. Disponíveis: ${[...MODELOS.keys()].join(', ')}`);
  return new Classe(opcoes);
}

export const modelosDisponiveis = () => [...MODELOS.keys()];
