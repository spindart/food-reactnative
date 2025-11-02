import api from './api';

export interface UsuarioPerfil {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  cpfVerificado: boolean;
  telefoneVerificado: boolean;
  emailVerificado: boolean;
  dataNascimento: string | null;
  genero: string | null;
  fotoPerfil: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePerfilData {
  nome?: string;
  email?: string;
  telefone?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  genero?: 'masculino' | 'feminino' | 'outro' | 'prefiro_não_informar' | null;
  fotoPerfil?: string | null;
}

export const getUsuarioById = async (id: string) => {
  const response = await api.get(`/usuarios/${id}`);
  return response.data;
};

/**
 * Busca o perfil completo do usuário autenticado
 */
export const getPerfil = async (): Promise<UsuarioPerfil> => {
  const response = await api.get('/usuarios/perfil');
  return response.data;
};

/**
 * Atualiza o perfil do usuário autenticado
 */
export const updatePerfil = async (data: UpdatePerfilData): Promise<{ message: string; usuario: UsuarioPerfil }> => {
  const response = await api.put('/usuarios/perfil', data);
  return response.data;
};

/**
 * Altera a senha do usuário autenticado
 */
export interface AlterarSenhaData {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

export const alterarSenha = async (data: AlterarSenhaData): Promise<{ message: string }> => {
  const response = await api.put('/usuarios/perfil/senha', data);
  return response.data;
};
