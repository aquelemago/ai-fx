// Erros que qualquer gerador pode lançar. O campo "codigo" é o que a API usa para escolher o status HTTP.
export class ErroBaseAusente extends Error {
  constructor() {
    super('foto base não encontrada, envie de novo');
    this.codigo = 'BASE_AUSENTE';
  }
}
