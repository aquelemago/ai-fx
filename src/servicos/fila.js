// Fila serial: executa uma tarefa por vez, na ordem de chegada.
// A IA já usa o processador inteiro em cada geração, então rodar em paralelo só atrasaria tudo.
export class FilaSerial {
  constructor() {
    this.cauda = Promise.resolve();
    this.pendentes = 0;
  }

  executar(tarefa) {
    this.pendentes++;
    const p = this.cauda.then(tarefa).finally(() => this.pendentes--);
    this.cauda = p.catch(() => {});
    return p;
  }
}
