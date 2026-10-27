# Time Lapse IA

Pega uma foto sua e gera vários quadros com IA (SD-Turbo) mudando luz, cenário,
estação ou estilo, com o rosto sempre travado na mesma posição. Depois faz o
crossfade entre eles e grava um vídeo, tudo local e rodando no processador.

## Como rodar

```bash
ONNXRUNTIME_NODE_INSTALL=skip npm install   # sem isso, o npm < 11 tenta baixar o CUDA e falha
npm run modelos   # baixa ~5 GB (SD-Turbo ONNX fp32, TAESD e detector de rosto)
npm start         # abre em http://localhost:3000
```

Variáveis opcionais: `PORT=3000`, `MODELO=sd-turbo` (modelos em `src/ia/modelos.js`), `SAIDAS=<pasta>` (onde gravar os quadros), `VAE=completo` (usa o decodificador original,
mais fiel porém ~30 s mais lento por quadro), `THREADS=4` (threads da IA; o padrão é o número de
núcleos físicos, que foi mais rápido que usar todas as threads).

## Como funciona

| Etapa | Onde roda | O quê |
|---|---|---|
| Recorte | navegador | MediaPipe acha o rosto e recorta um quadrado 512×512 |
| Geração | servidor Node | SD-Turbo img2img com `onnxruntime-node` no processador |
| Travar o rosto | navegador | alinha olhos de cada quadro aos da foto original |
| Preservar o rosto | navegador | cola o rosto original com borda suave e cor ajustada à luz do quadro |
| Vídeo | navegador | crossfade no canvas + `MediaRecorder` |

A IA fica no servidor porque o modelo em fp32 (3,3 GB só a UNet) não cabe no
limite de memória do WebAssembly do navegador, e o vídeo integrado não tem WebGPU
suficiente pra isso.

Transições suaves: as cenas viram "quadros-chave". Entre uma e outra, o texto é
interpolado (mistura dos embeddings) e o ruído também (slerp entre sementes),
então a imagem muda aos poucos em vez de pular.

## Controles

- **Gerar rosto**: a IA cria uma pessoa nova do zero (idade, cabelo e detalhes sorteados)
  e usa esse rosto como foto base. A descrição sorteada vai para o campo "Você", para as
  cenas manterem a mesma pessoa. Cada rosto leva ~14 s.

- **Descreva você**: algo como `a young man with short dark hair` ou `a woman with
  long curly hair and glasses`. Entra no lugar de `{eu}` nas cenas e evita que a IA
  troque seu cabelo, roupa ou gênero ao redor do rosto.

- **Força da IA**: quanto ela pode se afastar da foto. Abaixo de ~0,75 o cenário quase
  não muda; 0,8–0,9 muda bastante mantendo a pose (o rosto volta pelo "Preservar rosto").
  Acima de ~0,92 a pose muda e o rosto colado não encaixa mais.
- **Passos**: cada passo leva ~8 s num i5/i7 de notebook. 1 já fica bom; 2 dá mais detalhe.
- **Suavidade**: 1 = ruído novo a cada quadro (tremido, cara de time lapse real).
- **Preservar rosto**: 1 = seu rosto original intacto; 0 = só o que a IA gerou.
- **Harmonizar cor**: ajusta a cor do rosto colado pra combinar com a luz da cena.

## Saídas

Cada quadro fica em `saidas/<id-da-foto>/`:
`ia_XXXX.png` (saída crua da IA) e `final_XXXX.png` (alinhado, com o rosto).

Pra montar um MP4 de alta qualidade com ffmpeg a partir dos quadros finais:

```bash
ffmpeg -framerate 8 -i saidas/<id>/final_%04d.png -vf "minterpolate=fps=30:mi_mode=blend" -c:v libx264 -pix_fmt yuv420p -crf 16 timelapse.mp4
```

## Código e testes

A organização em módulos e o passo a passo para adicionar modelo, roteiro, formato ou ajuste
estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

```bash
npm test               # testes de unidade (menos de 1 s)
npm run test:modelo    # gera um quadro com o modelo real e compara com a referência (~1 min)
```
