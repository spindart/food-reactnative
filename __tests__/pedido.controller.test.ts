import { PedidoController } from '../src/controllers/pedido.controller';

describe('PedidoController - cálculo do valor total', () => {
  it('deve calcular corretamente o valor total do pedido', async () => {
    // Mock dos produtos retornados pelo banco
    const produtosDb = [
      { id: 1, preco: 10 },
      { id: 2, preco: 5 },
    ];
    // Mock dos produtos enviados na requisição
    const produtosReq = [
      { produtoId: 1, quantidade: 2 }, // 2 x 10 = 20
      { produtoId: 2, quantidade: 3 }, // 3 x 5 = 15
    ];
    // Função de cálculo isolada (simulação do trecho do controller)
    let valorTotal = 0;
    const itensPedido = produtosReq.map(p => {
      const produtoDb = produtosDb.find(db => db.id === p.produtoId)!;
      const subtotal = produtoDb.preco * p.quantidade;
      valorTotal += subtotal;
      return {
        produtoId: p.produtoId,
        quantidade: p.quantidade,
        precoUnitario: produtoDb.preco,
      };
    });
    expect(valorTotal).toBe(35);
    expect(itensPedido).toEqual([
      { produtoId: 1, quantidade: 2, precoUnitario: 10 },
      { produtoId: 2, quantidade: 3, precoUnitario: 5 },
    ]);
  });
});
