#!/usr/bin/env bash
# Baixa o SD-Turbo (ONNX fp32) do Hugging Face para models/sd-turbo
set -e
REPO=https://huggingface.co/julienkay/sd-turbo/resolve/main
DEST="$(dirname "$0")/../models/sd-turbo"
for f in tokenizer/vocab.json tokenizer/merges.txt tokenizer/tokenizer_config.json tokenizer/special_tokens_map.json \
         text_encoder/model.onnx unet/model.onnx unet/weights.pb vae_encoder/model.onnx vae_decoder/model.onnx; do
  mkdir -p "$DEST/$(dirname "$f")"
  echo ">> $f"
  curl -L -C - --fail -o "$DEST/$f" "$REPO/$f"
done

# TAESD: decodificador pequeno, ~15x mais rápido que o VAE completo no processador
TAESD="$DEST/../taesd"
for f in vae_decoder/model.onnx vae_decoder/config.json; do
  mkdir -p "$TAESD/$(dirname "$f")"
  curl -L -C - --fail -o "$TAESD/$f" "https://huggingface.co/julienkay/taesd/resolve/main/$f"
done

# Detector de rosto do MediaPipe (roda no navegador)
mkdir -p "$DEST/../mediapipe"
curl -L -C - --fail -o "$DEST/../mediapipe/face_landmarker.task" \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

echo "Modelos prontos em $(dirname "$DEST")"
