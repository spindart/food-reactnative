export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  ProductDetail: {
    nome: string;
    preco: number;
    imagem: string;
  };
  ProdutosDoEstabelecimento: { estabelecimento: { id: string; nome: string; descricao: string; endereco: string } };
};
