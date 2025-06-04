"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    // Log detalhado do erro
    console.error('[ERROR]', err);
    // Resposta padronizada
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        details: err.details || undefined,
    });
}
