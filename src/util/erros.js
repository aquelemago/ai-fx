// Erros de entrada inválida. O campo "codigo" é o que a API usa para escolher o status HTTP.
export class ErroDeValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.codigo = 'VALIDACAO';
  }
}
