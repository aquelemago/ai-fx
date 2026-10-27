// Indicador do estado do servidor/modelo no topo da coluna de montagem.
import { $ } from '../util/dom.js';

export function acompanharServidor(cliente, aoMudar) {
  const mostrar = (texto, classe = '', detalhe = '') => {
    $('status').textContent = texto;
    $('status').title = detalhe;
    $('status').className = 'estado ' + classe;
    aoMudar(classe === 'ok');
  };
  const verificar = async () => {
    try {
      const s = await cliente.status();
      if (s.pronto) return mostrar('modelo pronto', 'ok');
      if (s.erro) return mostrar('erro no modelo', 'erro', s.erro);
      mostrar('carregando o modelo…');
    } catch {
      mostrar('servidor desligado', 'erro', 'Rode npm start na pasta do projeto.');
    }
    setTimeout(verificar, 2000);
  };
  verificar();
}
