export type TipoPessoa = 'PF' | 'PJ';
export type StatusProcesso = 'ativo' | 'suspenso' | 'arquivado' | 'ganho' | 'perdido' | 'acordo';
export type AreaDireito = 'cível' | 'trabalhista' | 'criminal' | 'previdenciário' | 'família' | 'tributário' | 'empresarial' | 'administrativo' | 'procon' | 'outro';
export type FaseProcessual = 'conhecimento' | 'recursal' | 'execução' | 'outro';
export type PoloProcesso = 'autor' | 'réu' | 'outro';
export type TipoPrazo = 'audiência' | 'prazo_fatal' | 'prazo_dilatório' | 'diligência' | 'reunião' | 'outro';
export type StatusPrazo = 'pendente' | 'cumprido' | 'cancelado';
export type StatusPublicacao = 'não_lida' | 'lida' | 'prazo_gerado' | 'arquivada';
export type TipoPeticao = 'inicial' | 'contestação' | 'recurso' | 'parecer' | 'embargos' | 'outro';
export type StatusPeticao = 'rascunho' | 'protocolado' | 'juntado';
// Perfil de acesso: admin (dono, faz tudo + configurações), advogado (edita, dentro das áreas),
// visualizador (somente leitura, dentro das áreas).
export type PapelUsuario = 'admin' | 'advogado' | 'operacao' | 'visualizador';

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
  valor?: number;   // valor associado ao andamento (ex.: valor do cumprimento de sentença, depósito, custas)
}

export interface ParteProcesso {
  nome: string;
  polo: string; // 'ativo' | 'passivo' | ''
}

export interface Documento {
  id: string;
  processoId: string;
  nome: string;
  tipo: string;        // 'defesa' | 'reclamação' | 'documento' | ...
  arquivoPath: string;
  arquivoNome: string;
  criadoEm: string;
  arquivado?: boolean;   // inativado (nunca é deletado de fato)
}

export type OrigemProcesso = 'manual' | 'auto_intimacao' | 'imagem';

// Alerta gerado quando um andamento/publicação indica baixa/arquivamento do processo.
// O usuário revisa e decide (concordar em inativar, com observação, ou ignorar).
export interface AlertaArquivamento {
  ativo: boolean;
  fonte?: string;        // 'andamento' | 'publicacao'
  trecho?: string;       // texto que disparou o alerta
  data?: string;         // data do andamento/publicação
  detectadoEm?: string;
  decisao?: string;      // 'arquivado' | 'ignorado' quando resolvido
  obs?: string;          // observação escrita pelo usuário ao decidir
  resolvidoEm?: string;
}

export interface Processo {
  id: string;
  numero: string;
  clienteId: string;
  vara: string;
  tribunal: string;
  comarca: string;
  uf?: string;                 // estado (UF) do processo
  area: AreaDireito;
  fase: FaseProcessual;
  parteContraria: string;
  advogadoResponsavel: string;
  advogadoAdverso?: string;           // advogado da parte adversa (facilita acordos)
  advogadoAdversoTelefone?: string;   // telefone de contato do advogado adverso
  advogadoAdversoEmail?: string;      // e-mail de contato do advogado adverso
  valorCausa?: number;
  dataDistribuicao: string;
  status: StatusProcesso;
  polo: PoloProcesso;
  objeto: string;
  arquivado?: boolean;
  movimentacoes: Movimentacao[];
  observacoes?: string;
  origem?: OrigemProcesso;
  processoOrigemId?: string;   // vínculo confirmado (ex.: cumprimento de sentença → processo de origem)
  sugestaoOrigemId?: string;   // sugestão de vínculo pendente de confirmação
  imagemPath?: string;         // print anexado (Storage bucket 'processos')
  imagemNome?: string;
  alertaArquivamento?: AlertaArquivamento;  // alerta de baixa/arquivamento pendente de decisão
  alertaNovo?: boolean;  // processo recém-capturado automaticamente, aguardando revisão do usuário
  alertaBloqueio?: boolean;  // há ordem/efetivação de bloqueio ou penhora online (SISBAJUD/BacenJud)
  criadoEm: string;
}

export interface Prazo {
  id: string;
  processoId: string;
  tipo: TipoPrazo;
  descricao: string;
  dataHora: string;
  diasUteis: boolean;
  responsavel: string;        // advogado que deve CUMPRIR o prazo
  status: StatusPrazo;
  urgente?: boolean;          // marcado como URGENTE no agendamento (destaque visual)
  alertaDias: number;
  criadoEm: string;
  vistoEm?: string;           // ciência: quando o responsável visualizou
  vistoPor?: string;
  agendadoPor?: string;       // quem delegou/agendou o prazo (dá o OK final)
  cumpridoDeclaradoEm?: string;   // responsável declarou que cumpriu (aguardando conferência)
  cumpridoDeclaradoPor?: string;
  aprovadoEm?: string;        // OK final de quem agendou — baixa o prazo
  aprovadoPor?: string;
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
  orgao?: string;
  partes?: ParteProcesso[];
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
  conteudo?: string;
  arquivoPath?: string;
  arquivoNome?: string;
  arquivado?: boolean;
  criadoEm: string;
}

export interface Advogado {
  id: string;
  nome: string;
  oab: string;
  email: string;           // deve casar com o e-mail de login (Supabase auth) para o perfil ser reconhecido
  papel?: PapelUsuario;    // perfil de acesso (default: advogado)
  areas?: AreaDireito[];   // áreas de atuação — escopam o que o usuário vê em todo o sistema
  ativo?: boolean;         // false = acesso inativado (nunca é deletado); bloqueia login
}

export interface Notificacao {
  id: string;
  paraNome?: string;
  paraEmail?: string;
  titulo?: string;
  mensagem?: string;
  prazoId?: string;
  processoId?: string;
  lida: boolean;
  criadoEm: string;
}

export interface Feriado {
  id: string;
  data: string;
  descricao: string;
  ativo?: boolean;   // false = inativado (nunca é deletado); não conta no cálculo
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
