export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: { estabelecimentoId: string };
  ProductDetail: {
    nome: string;
    preco: number;
    imagem: string;
  };
};
