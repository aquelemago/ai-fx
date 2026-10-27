// Miniatura da foto base recortada; ganha a moldura de papel quando está pronta para gerar.
import { useEffect, useRef } from 'react';
import estilos from './Montagem.module.css';

export function FotoBase({ canvas: foto, pronta }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    ctx.clearRect(0, 0, ref.current.width, ref.current.height);
    if (foto) ctx.drawImage(foto, 0, 0);
  }, [foto]);
  return (
    <canvas
      ref={ref} id="base" width="512" height="512" aria-label="Sua foto recortada"
      className={[estilos.base, pronta && estilos.pronta].filter(Boolean).join(' ')}
    />
  );
}
