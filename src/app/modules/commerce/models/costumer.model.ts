export interface Cliente {
  cliente_id: number;
  codigo: number;
  nome: string;
  nome_empresa: string;
  tipo_doc?: string;
  numero_doc?: string;
  ie?: string;
  email: string;
  celular: string;
  telefone_comercial?: string;
  cep?: string;
  endereco?: string;
  num_endereco?: string;
  bairro?: string;
  complemento?: string;
  data_criacao?: string;
  ativo?: number;
  cidade: Cidade;
  categoria: CategoriaCliente;
  status: StatusCliente;
}

export interface Cidade {
  cidade_id: number;
  nome: string;
}

export interface CategoriaCliente {
  categoria_id: number;
  nome: string;
}

export interface StatusCliente {
  status_id: number;
  nome: string;
}
