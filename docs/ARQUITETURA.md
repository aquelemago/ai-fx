# Arquitetura

O sistema tem duas metades que conversam por HTTP:

- **Servidor (Node):** roda o modelo de IA no processador e gera cada quadro.
- **Página (navegador):** acha o rosto, alinha, cola o rosto original, mostra a prévia e grava o vídeo.

Cada metade é dividida em camadas. Uma camada só conhece as que estão abaixo dela.

```
                    PÁGINA                                     SERVIDOR
  ┌────────────────────────────────────────┐     ┌──────────────────────────────────┐
  │ main.js         (monta e liga tudo)    │     │ server.js     (monta e liga tudo)│
  ├────────────────────────────────────────┤     ├──────────────────────────────────┤
  │ ui/        montagem, palco, tira,      │     │ http/      app, rotas, validacao │
  │            status        (só DOM)      │     │            (só HTTP)             │
  ├────────────────────────────────────────┤     ├──────────────────────────────────┤
  │ geracao/   sessao   (orquestra)        │     │ servicos/  servico-geracao, fila,│
  │ video/     player, renderizador,       │     │            armazenamento         │
  │            gravador                    │ ──► │            (regras da aplicação) │
  │ rosto/     detector, recorte,          │ API ├──────────────────────────────────┤
  │            composicao, mascara         │     │ ia/        modelos (registro)    │
  │ api/       cliente  (único fetch)      │     │            sd-turbo/, agendador, │
  ├────────────────────────────────────────┤     │            ruido, imagem, onnx,  │
  │ dominio/   roteiros, plano, formatos,  │     │            clip-tokenizer        │
  │            quadros   (regras puras)    │     ├──────────────────────────────────┤
  │ util/      dom, tempo, preferencias    │     │ util/      cache-lru             │
  └────────────────────────────────────────┘     │ config.js  (única leitura do env)│
                                                 └──────────────────────────────────┘
```

## Princípios

1. **Uma responsabilidade por módulo.** Se for difícil dizer o que um arquivo faz em uma
   frase, ele precisa ser dividido.
2. **Dependências injetadas.** `server.js` e `public/js/main.js` são os únicos que criam as
   peças e as ligam. O resto recebe o que precisa no construtor. É isso que permite testar o
   serviço e a API com um gerador falso (`test/apoio/gerador-falso.js`).
3. **Regras puras separadas de efeitos.** `dominio/`, `rosto/geometria.js`,
   `ia/agendador-euler.js` e `ia/ruido.js` não tocam DOM, rede nem disco, por isso rodam nos
   testes do Node.
4. **Eventos em vez de chamadas cruzadas.** A `SessaoDeGeracao` e a `ColecaoDeQuadros` emitem
   eventos. A tira, o player e os botões escutam sem se conhecer.
5. **Configuração num lugar só.** Só `src/config.js` lê `process.env`.

## Fluxo de um quadro

1. `ui/montagem` → `main.js`: o usuário clica em Gerar.
2. `geracao/sessao` monta os parâmetros (`dominio/plano`) e chama `api/cliente.gerarQuadro`.
3. `http/rotas` valida (`http/validacao`) e chama `servicos/servico-geracao.gerarQuadro`.
4. O serviço põe o pedido na `fila` e chama `gerador.gerar` (`ia/sd-turbo/gerador`), que usa:
   - `texto` (prompt → embedding)
   - `agendador-euler` (passos)
   - `ruido` (ruído com semente)
   - a UNet
   - `vae` (latentes → PNG)
5. O serviço grava `saidas/<id>/ia_NNNN.png` e responde com o PNG.
6. Na página, `rosto/composicao` alinha os olhos e cola o rosto original. A sessão emite
   `quadro`, a `ColecaoDeQuadros` guarda e a tira e o player se atualizam.

## Como estender

### Novo modelo de IA (ex.: SDXL-Turbo, LCM)

1. Crie `src/ia/<modelo>/gerador.js` com uma classe que cumpra o contrato descrito em
   `src/ia/modelos.js`: `static nome`, `lado`, `carregar`, `definirBase`, `temBase` e `gerar`.
   Reaproveite `onnx.js`, `imagem.js`, `ruido.js` e o agendador.
2. Registre a classe no `Map` de `src/ia/modelos.js`.
3. Rode com `MODELO=<nome> npm start`.
4. Copie `test/integracao/modelo.test.js` com uma imagem de referência do modelo novo.

A API e a página não mudam. Se o modelo gerar quadros maiores que 512, a página já usa o
tamanho que vier, mas o recorte da foto (`#base` em `index.html`) deve acompanhar o `lado` do
modelo.

### Novo roteiro

Adicione uma entrada em `public/js/dominio/roteiros.js`, com `nomes` e `cenas` do mesmo
tamanho. O teste `roteiros: todo roteiro tem um nome por cena` confere isso.

### Novo formato de vídeo (ex.: 4:5)

1. Adicione o formato em `public/js/dominio/formatos.js`.
2. Crie um botão com o mesmo `value` no grupo `.formato` de `index.html`.
3. Se a moldura precisar de outra proporção, adicione uma regra
   `.moldura[data-formato="4:5"]` em `style.css`.

### Novo ajuste de geração

1. Crie o campo em "Ajustes finos" (`index.html`).
2. Leia o valor em `PainelDeMontagem.lerPedido` (`ui/montagem.js`).
3. Se o ajuste vai para o servidor, valide-o em `src/http/validacao.js` e use-o no gerador.

### Nova rota da API

Coloque a regra em `servicos/`, exponha em `http/rotas.js` e acrescente o método em
`public/js/api/cliente.js`. Erros com `codigo` viram status HTTP pela tabela em `rotas.js`.

## Testes

```bash
npm test               # 38 testes de unidade, menos de 1 segundo
npm run test:modelo    # gera um quadro real e compara com a referência (~1 min)
```

O teste de modelo não exige pixels idênticos. Somas em várias threads mudam a ordem do ponto
flutuante, então duas execuções do mesmo código dão cerca de 80 dB de PSNR. O teste exige
mais de 60 dB.
