export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  HomeTabs: { screen?: 'Home' | 'Pedidos' | 'Carrinho' | 'Perfil' };
  ProductDetail: {
    nome: string;
    preco: number;
    imagem: string;
  };
  ProdutosDoEstabelecimento: { estabelecimento: { id: string; nome: string; descricao: string; endereco: string } };
  Enderecos: undefined;
  Perfil: undefined;
  MeusCartoes: undefined;
  DonoDashboard: undefined;
  CadastrarEstabelecimento: undefined;
  EditarEstabelecimento: undefined;
  CadastrarProduto: undefined;
  EditarProduto: undefined;
  PedidosDoEstabelecimento: undefined;
  EnderecoEntrega: undefined;
  FormaPagamento: undefined;
  RevisarPedido: undefined;
  PixPaymentConfirmation: undefined;
  ConfigurarMercadoPago: { estabelecimento: { id: number | string; nome: string } };
};
