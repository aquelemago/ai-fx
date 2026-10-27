// Envolve um handler assíncrono e responde erros no formato { erro }, com o status pelo código do erro.
const STATUS_POR_CODIGO = {
  VALIDACAO: 400,
  PROJETO_INEXISTENTE: 404,
  BASE_AUSENTE: 409,
  MODELO_INDISPONIVEL: 503,
};

export const tratar = (handler, log = console.error) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    const status = STATUS_POR_CODIGO[e.codigo] ?? 500;
    if (status === 500) log(e);
    res.status(status).json({ erro: status === 500 ? 'erro interno, veja o terminal do servidor' : e.message });
  }
};
