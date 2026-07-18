export type TipoPessoa = 'PF' | 'PJ';
export type StatusProcesso = 'ativo' | 'arquivado' | 'ganho' | 'perdido' | 'acordo';
export type AreaDireito = 'cível' | 'trabalhista' | 'criminal' | 'previdenciário' | 'família' | 'tributário' | 'empresarial' | 'administrativo' | 'outro';
export type FaseProcessual = 'conhecimento' | 'recursal' | 'execução' | 'outro';
export type PoloProcesso = 'autor' | 'réu' | 'outro';
export type TipoPrazo = 'audiência' | 'prazo_fatal' | 'prazo_dilatório' | 'diligência' | 'reunião' | 'outro';
export type StatusPrazo = 'pendente' | 'cumprido' | 'cancelado';
export type StatusPublicacao = 'não_lida' | 'lida' | 'prazo_gerado' | 'arquivada';
export type TipoPeticao = 'inicial' | 'contestação' | 'recurso' | 'parecer' | 'embargos' | 'outro';
export type StatusPeticao = 'rascunho' | 'protocolado' | 'juntado';

export interface Cliente {
  id: string;
  nome: string;
  tipo: TipoPessoa;
  cpfCnpj: string;
  rg?: string;
  email: string;
  telefone?: string;
  celular: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  arquivado?: boolean;
  criadoEm: string;
}

export interface Movimentacao {
  id: string;
  data: string;
  tipo: string;
  descricao: string;
}

export interface Processo {
  id: string;
  numero: string;
  clienteId: string;
  vara: string;
  tribunal: string;
  comarca: string;
  area: AreaDireito;
  fase: FaseProcessual;
  parteContraria: string;
  advogadoResponsavel: string;
  valorCausa?: number;
  dataDistribuicao: string;
  status: StatusProcesso;
  polo: PoloProcesso;
  objeto: string;
  arquivado?: boolean;
  movimentacoes: Movimentacao[];
  observacoes?: string;
  criadoEm: string;
}

export interface Prazo {
  id: string;
  processoId: string;
  tipo: TipoPrazo;
  descricao: string;
  dataHora: string;
  diasUteis: boolean;
  responsavel: string;
  status: StatusPrazo;
  alertaDias: number;
  criadoEm: string;
  vistoEm?: string;
  vistoPor?: string;
}

export interface Publicacao {
  id: string;
  data: string;
  tribunal: string;
  numeroProcesso: string;
  processoId?: string;
  conteudo: string;
  status: StatusPublicacao;
  tipo?: string;
  link?: string;
  criadoEm: string;
}

export interface Peticao {
  id: string;
  nome: string;
  processoId: string;
  tipo: TipoPeticao;
  dataProtocolo?: string;
  numeroProtocolo?: string;
  status: StatusPeticao;
  observacoes?: string;
  criadoEm: string;
}

export interface Advogado {
  id: string;
  nome: string;
  oab: string;
  email: string;
}

export interface Feriado {
  id: string;
  data: string;
  descricao: string;
}

export interface ConfigEscritorio {
  nome: string;
  oab: string;
  endereco: string;
  telefone: string;
  email: string;
}

export interface CredencialTribunal {
  tribunal: string;
  login: string;
  token: string;
}

export interface AppState {
  clientes: Cliente[];
  processos: Processo[];
  prazos: Prazo[];
  publicacoes: Publicacao[];
  peticoes: Peticao[];
  advogados: Advogado[];
  feriadosMunicipais: Feriado[];
  escritorio: ConfigEscritorio;
  credenciais: CredencialTribunal[];
  anthropicApiKey: string;
}
