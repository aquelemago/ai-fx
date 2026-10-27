// Erro de foto sem rosto utilizável. Fica separado do recorte para quem só trata o erro
// (o estúdio, os testes no Node) não precisar carregar o MediaPipe.
export class ErroDeRosto extends Error {}
