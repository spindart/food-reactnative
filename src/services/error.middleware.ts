import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log detalhado do erro
  console.error('[ERROR]', err);

  // Resposta padronizada
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    details: err.details || undefined,
  });
}
