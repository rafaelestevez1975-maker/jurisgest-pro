import { supabase } from './supabase';
import type {
  AppState, Cliente, Processo, Prazo, Publicacao, Peticao,
  Advogado, Feriado, ConfigEscritorio, CredencialTribunal, Movimentacao, Documento, AlertaArquivamento,
  Notificacao,
} from '../types';
import { INITIAL_STATE } from '../data';

// ─── mappers ────────────────────────────────────────────────────────────────

function toCliente(r: Record<string, unknown>): Cliente {
  return {
    id: r.id as string,
    nome: r.nome as string,
    tipo: r.tipo as 'PF' | 'PJ',
    cpfCnpj: r.cpf_cnpj as string,
    rg: r.rg as string | undefined,
    email: r.email as string,
    telefone: r.telefone as string | undefined,
    celular: r.celular as string,
    cep: r.cep as string | undefined,
    logradouro: r.logradouro as string | undefined,
    numero: r.numero as string | undefined,
    complemento: r.complemento as string | undefined,
    bairro: r.bairro as string | undefined,
    cidade: r.cidade as string | undefined,
    uf: r.uf as string | undefined,
    observacoes: r.observacoes as string | undefined,
    arquivado: (r.arquivado as boolean) ?? false,
    criadoEm: r.criado_em as string,
  };
}

function fromCliente(c: Cliente) {
  return {
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    cpf_cnpj: c.cpfCnpj,
    rg: c.rg,
    email: c.email,
    telefone: c.telefone,
    celular: c.celular,
    cep: c.cep,
    logradouro: c.logradouro,
    numero: c.numero,
    complemento: c.complemento,
    bairro: c.bairro,
    cidade: c.cidade,
    uf: c.uf,
    observacoes: c.observacoes,
    arquivado: c.arquivado ?? false,
    criado_em: c.criadoEm,
  };
}

function toMovimentacao(r: Record<string, unknown>): Movimentacao {
  return {
    id: r.id as string,
    data: r.data as string,
    tipo: r.tipo as string,
    descricao: r.descricao as string,
    valor: (r.valor as number | null) ?? undefined,
  };
}

function mapPolo(v: unknown): Processo['polo'] {
  const s = (v as string) ?? '';
  if (s === 'ativo' || s === 'autor') return 'autor';
  if (s === 'passivo' || s === 'réu' || s === 'reu') return 'réu';
  return 'outro';
}

function toProcesso(r: Record<string, unknown>, movs: Movimentacao[] = []): Processo {
  return {
    id: r.id as string,
    numero: r.numero as string,
    clienteId: (r.cliente_id as string) ?? '',
    vara: r.vara as string,
    tribunal: r.tribunal as string,
    comarca: r.comarca as string,
    uf: (r.uf as string) ?? '',
    area: r.area as Processo['area'],
    fase: r.fase as Processo['fase'],
    parteContraria: r.parte_contraria as string,
    advogadoResponsavel: r.advogado_responsavel as string,
    advogadoAdverso: (r.advogado_adverso as string) ?? undefined,
    advogadoAdversoTelefone: (r.advogado_adverso_telefone as string) ?? undefined,
    advogadoAdversoEmail: (r.advogado_adverso_email as string) ?? undefined,
    valorCausa: r.valor_causa as number | undefined,
    dataDistribuicao: (r.data_distribuicao as string) ?? '',
    status: r.status as Processo['status'],
    natureza: ((r.natureza as string) as Processo['natureza']) ?? 'judicial',
    polo: mapPolo(r.polo),
    objeto: (r.objeto as string) ?? '',
    arquivado: (r.arquivado as boolean) ?? false,
    movimentacoes: movs,
    observacoes: r.observacoes as string | undefined,
    origem: (r.origem as Processo['origem']) ?? 'manual',
    processoOrigemId: (r.processo_origem_id as string) ?? undefined,
    sugestaoOrigemId: (r.sugestao_origem_id as string) ?? undefined,
    imagemPath: (r.imagem_path as string) ?? undefined,
    imagemNome: (r.imagem_nome as string) ?? undefined,
    alertaArquivamento: (r.alerta_arquivamento as AlertaArquivamento) ?? undefined,
    alertaNovo: (r.alerta_novo as boolean) ?? false,
    alertaBloqueio: (r.alerta_bloqueio as boolean) ?? false,
    criadoEm: r.criado_em as string,
  };
}

function fromProcesso(p: Processo) {
  return {
    id: p.id,
    numero: p.numero,
    cliente_id: p.clienteId || null,
    vara: p.vara,
    tribunal: p.tribunal,
    comarca: p.comarca,
    uf: p.uf ?? '',
    area: p.area,
    fase: p.fase,
    parte_contraria: p.parteContraria,
    advogado_responsavel: p.advogadoResponsavel,
    advogado_adverso: p.advogadoAdverso ?? null,
    advogado_adverso_telefone: p.advogadoAdversoTelefone ?? null,
    advogado_adverso_email: p.advogadoAdversoEmail ?? null,
    valor_causa: p.valorCausa ?? null,
    data_distribuicao: p.dataDistribuicao || null,
    status: p.status,
    natureza: p.natureza ?? 'judicial',
    polo: p.polo ?? 'outro',
    objeto: p.objeto ?? '',
    arquivado: p.arquivado ?? false,
    observacoes: p.observacoes ?? null,
    origem: p.origem ?? 'manual',
    processo_origem_id: p.processoOrigemId ?? null,
    sugestao_origem_id: p.sugestaoOrigemId ?? null,
    imagem_path: p.imagemPath ?? null,
    imagem_nome: p.imagemNome ?? null,
    criado_em: p.criadoEm,
  };
}

function toPrazo(r: Record<string, unknown>): Prazo {
  return {
    id: r.id as string,
    processoId: (r.processo_id as string) ?? '',
    tipo: r.tipo as Prazo['tipo'],
    descricao: r.descricao as string,
    dataHora: r.data_hora as string,
    diasUteis: r.dias_uteis as boolean,
    responsavel: r.responsavel as string,
    status: r.status as Prazo['status'],
    urgente: (r.urgente as boolean) ?? false,
    alertaDias: r.alerta_dias as number,
    criadoEm: r.criado_em as string,
    vistoEm: r.visto_em as string | undefined,
    vistoPor: r.visto_por as string | undefined,
    agendadoPor: (r.agendado_por as string) || undefined,
    cumpridoDeclaradoEm: r.cumprido_declarado_em as string | undefined,
    cumpridoDeclaradoPor: r.cumprido_declarado_por as string | undefined,
    aprovadoEm: r.aprovado_em as string | undefined,
    aprovadoPor: r.aprovado_por as string | undefined,
  };
}

function fromPrazo(p: Prazo) {
  return {
    id: p.id,
    processo_id: p.processoId || null,
    tipo: p.tipo,
    descricao: p.descricao,
    data_hora: p.dataHora,
    dias_uteis: p.diasUteis,
    responsavel: p.responsavel,
    status: p.status,
    urgente: p.urgente ?? false,
    alerta_dias: p.alertaDias,
    visto_em: p.vistoEm ?? null,
    visto_por: p.vistoPor ?? null,
    agendado_por: p.agendadoPor ?? '',
    cumprido_declarado_em: p.cumpridoDeclaradoEm ?? null,
    cumprido_declarado_por: p.cumpridoDeclaradoPor ?? null,
    aprovado_em: p.aprovadoEm ?? null,
    aprovado_por: p.aprovadoPor ?? null,
    criado_em: p.criadoEm,
  };
}

function toPublicacao(r: Record<string, unknown>): Publicacao {
  return {
    id: r.id as string,
    data: r.data as string,
    tribunal: r.tribunal as string,
    numeroProcesso: r.numero_processo as string,
    processoId: r.processo_id as string | undefined,
    conteudo: r.conteudo as string,
    status: r.status as Publicacao['status'],
    tipo: (r.tipo as string) ?? '',
    link: (r.link as string) ?? '',
    orgao: (r.orgao as string) ?? '',
    partes: Array.isArray(r.partes) ? (r.partes as Publicacao['partes']) : [],
    criadoEm: r.criado_em as string,
  };
}

function fromPublicacao(p: Publicacao) {
  return {
    id: p.id,
    data: p.data,
    tribunal: p.tribunal,
    numero_processo: p.numeroProcesso,
    processo_id: p.processoId ?? null,
    conteudo: p.conteudo,
    status: p.status,
    tipo: p.tipo ?? '',
    link: p.link ?? '',
    orgao: p.orgao ?? '',
    partes: p.partes ?? [],
    criado_em: p.criadoEm,
  };
}

function toPeticao(r: Record<string, unknown>): Peticao {
  return {
    id: r.id as string,
    nome: r.nome as string,
    processoId: (r.processo_id as string) ?? '',
    tipo: r.tipo as Peticao['tipo'],
    dataProtocolo: r.data_protocolo as string | undefined,
    numeroProtocolo: r.numero_protocolo as string | undefined,
    status: r.status as Peticao['status'],
    observacoes: r.observacoes as string | undefined,
    conteudo: (r.conteudo as string) ?? '',
    arquivoPath: (r.arquivo_path as string) ?? '',
    arquivoNome: (r.arquivo_nome as string) ?? '',
    arquivado: (r.arquivado as boolean) ?? false,
    criadoEm: r.criado_em as string,
  };
}

function fromPeticao(p: Peticao) {
  return {
    id: p.id,
    nome: p.nome,
    processo_id: p.processoId || null,
    tipo: p.tipo,
    data_protocolo: p.dataProtocolo || null,
    numero_protocolo: p.numeroProtocolo ?? null,
    status: p.status,
    observacoes: p.observacoes ?? null,
    conteudo: p.conteudo ?? '',
    arquivo_path: p.arquivoPath ?? '',
    arquivo_nome: p.arquivoNome ?? '',
    arquivado: p.arquivado ?? false,
    criado_em: p.criadoEm,
  };
}

// ─── load all ───────────────────────────────────────────────────────────────

// Busca TODAS as linhas de uma tabela paginando de 1000 em 1000 (o PostgREST
// limita cada resposta a 1000). Sem isto, tabelas grandes (ex.: movimentacoes)
// vinham truncadas — andamentos sumiam do cadastro.
async function fetchAll(
  table: string,
  orderCol: string,
  ascending = true,
): Promise<Record<string, unknown>[]> {
  const PAGE = 1000;
  const todas: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table).select('*').order(orderCol, { ascending }).range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    todas.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }
  return todas;
}

export async function loadState(): Promise<AppState> {
  // TODAS as listas são paginadas (fetchAll) para suportar qualquer volume — sem o corte
  // de 1000 linhas do PostgREST. Só o escritório é singleton (limit 1).
  const [
    { data: escritorioRows },
    advRows,
    cliRows,
    procRows,
    prazoRows,
    petRows,
    ferRows,
    credRows,
    movRows,
    pubRows,
  ] = await Promise.all([
    supabase.from('escritorio').select('*').limit(1),
    fetchAll('advogados', 'nome'),
    fetchAll('clientes', 'nome'),
    fetchAll('processos', 'criado_em'),
    fetchAll('prazos', 'data_hora'),
    fetchAll('peticoes', 'criado_em'),
    fetchAll('feriados_municipais', 'data'),
    fetchAll('credenciais_tribunais', 'tribunal'),
    fetchAll('movimentacoes', 'data'),
    fetchAll('publicacoes', 'data', false),
  ]);

  const movByProc: Record<string, Movimentacao[]> = {};
  for (const m of (movRows ?? [])) {
    const pid = m.processo_id as string;
    if (!movByProc[pid]) movByProc[pid] = [];
    movByProc[pid].push(toMovimentacao(m as Record<string, unknown>));
  }

  const escritorioRow = escritorioRows?.[0] as Record<string, unknown> | undefined;
  const escritorio: ConfigEscritorio = escritorioRow
    ? {
        nome: escritorioRow.nome as string,
        oab: escritorioRow.oab as string,
        endereco: escritorioRow.endereco as string,
        telefone: escritorioRow.telefone as string,
        email: escritorioRow.email as string,
      }
    : INITIAL_STATE.escritorio;
  const anthropicApiKey = (escritorioRow?.anthropic_api_key as string) ?? '';

  return {
    escritorio,
    anthropicApiKey,
    advogados: (advRows ?? []).map(r => ({
      id: r.id as string,
      nome: r.nome as string,
      oab: r.oab as string,
      email: r.email as string,
      papel: (r.papel as Advogado['papel']) || 'advogado',
      areas: Array.isArray(r.areas) ? (r.areas as Advogado['areas']) : [],
      ativo: r.ativo === undefined ? true : !!r.ativo,
    })),
    clientes: (cliRows ?? []).map(r => toCliente(r as Record<string, unknown>)),
    processos: (procRows ?? []).map(r =>
      toProcesso(r as Record<string, unknown>, movByProc[r.id as string] ?? [])
    ),
    prazos: (prazoRows ?? []).map(r => toPrazo(r as Record<string, unknown>)),
    publicacoes: (pubRows ?? []).map(r => toPublicacao(r as Record<string, unknown>)),
    peticoes: (petRows ?? []).map(r => toPeticao(r as Record<string, unknown>)),
    feriadosMunicipais: (ferRows ?? []).map(r => ({
      id: r.id as string,
      data: r.data as string,
      descricao: r.descricao as string,
      ativo: r.ativo === undefined ? true : !!r.ativo,
    })),
    credenciais: (credRows ?? []).map(r => ({
      tribunal: r.tribunal as string,
      login: r.login as string,
      token: r.token as string,
    })),
  };
}

// ─── sync helpers ────────────────────────────────────────────────────────────

export const db = {
  // clientes
  upsertCliente: (c: Cliente) => supabase.from('clientes').upsert(fromCliente(c)),
  deleteCliente: (id: string) => supabase.from('clientes').delete().eq('id', id),

  // processos
  upsertProcesso: async (p: Processo) => {
    const { error } = await supabase.from('processos').upsert(fromProcesso(p));
    if (error) return { error };
    // Upsert (por id) das movimentações conhecidas — NÃO apaga as demais,
    // para não destruir os andamentos capturados pelo robô do DataJud.
    if (p.movimentacoes.length > 0) {
      const { error: eMov } = await supabase.from('movimentacoes').upsert(
        p.movimentacoes.map(m => ({ ...m, processo_id: p.id })),
        { onConflict: 'id' }
      );
      if (eMov) return { error: eMov };
    }
    return { error: null };
  },
  deleteProcesso: (id: string) => supabase.from('processos').delete().eq('id', id),

  // Alerta de arquivamento é coluna própria do servidor (setada por trigger); não passa pelo
  // upsertProcesso (que não a inclui, para não sobrescrever). Resolvida por este update direto.
  resolverAlertaArquivamento: (processoId: string, alerta: AlertaArquivamento | null) =>
    supabase.from('processos').update({ alerta_arquivamento: alerta }).eq('id', processoId),

  // Registro de auditoria: grava uma atividade do usuário (login, cadastro, edição, agendamento…).
  registrarAtividade: (row: { usuario_email?: string | null; usuario_nome?: string | null; acao: string; entidade?: string | null; entidade_id?: string | null; descricao: string; detalhes?: unknown }) =>
    supabase.from('jg_atividades').insert(row),
  // Lê o relatório de atividades (só admin, por RLS).
  listarAtividades: (limite = 800) =>
    supabase.from('jg_atividades').select('*').order('criado_em', { ascending: false }).limit(limite),

  // "Não é meu cliente": ignora o número (a captura para de trazer intimações dele) e arquiva as publicações existentes.
  // Insere só se ainda não estiver na lista (evita o UPDATE do upsert, que a tabela não permite por RLS).
  ignorarNumeroProcesso: async (numeroLimpo: string, motivo?: string, por?: string) => {
    const { data: existe } = await supabase.from('jg_numeros_ignorados').select('numero').eq('numero', numeroLimpo).maybeSingle();
    if (existe) return { data: existe, error: null };
    return supabase.from('jg_numeros_ignorados').insert({ numero: numeroLimpo, motivo: motivo || null, criado_por: por || null });
  },
  arquivarPublicacoesDoNumero: (numeroMascara: string) =>
    supabase.from('publicacoes').update({ status: 'arquivada' }).eq('numero_processo', numeroMascara),

  // Marca um processo recém-capturado como revisado (some do alerta "novos capturados").
  // Coluna própria do servidor (setada pela captura); fica fora do upsert, como o alerta de arquivamento.
  marcarProcessoRevisado: (processoId: string) =>
    supabase.from('processos').update({ alerta_novo: false }).eq('id', processoId),
  ignorarAlertaBloqueio: (processoId: string) =>
    supabase.from('processos').update({ alerta_bloqueio: false }).eq('id', processoId),

  // Sincroniza os andamentos de UM processo via DataJud — no SERVIDOR (o DataJud não tem
  // CORS, então o navegador não pode chamá-lo direto; a edge function faz a ponte).
  sincronizarProcessoDataJud: (body: { processoId?: string; numero?: string }) =>
    supabase.functions.invoke<{ ok?: boolean; erro?: string; tribunal?: string; encontrado_no_datajud?: boolean; novos_andamentos?: number }>('sincronizar-processo', { body }),

  // vínculo de origem (ex.: cumprimento de sentença muda o número)
  confirmarOrigem: (id: string, origemId: string) =>
    supabase.from('processos').update({ processo_origem_id: origemId, sugestao_origem_id: null }).eq('id', id),
  descartarSugestaoOrigem: (id: string) =>
    supabase.from('processos').update({ sugestao_origem_id: null }).eq('id', id),
  vincularOrigem: (id: string, origemId: string | null) =>
    supabase.from('processos').update({ processo_origem_id: origemId }).eq('id', id),

  // print/imagem do processo (Storage bucket 'processos', privado)
  uploadProcessoImagem: async (procId: string, base64: string, mime: string, nome: string) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const ext = (nome.split('.').pop() || (mime.split('/')[1] ?? 'png')).toLowerCase();
    const path = `${procId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('processos').upload(path, bytes, { contentType: mime, upsert: true });
    return { path: error ? '' : path, error };
  },
  signedUrlProcessoImagem: async (path: string) => {
    const { data } = await supabase.storage.from('processos').createSignedUrl(path, 3600);
    return data?.signedUrl ?? '';
  },

  // documentos anexados ao processo (defesas, contratos, provas…) — bucket 'processos', prefixo docs/
  listarDocumentos: async (processoId: string): Promise<Documento[]> => {
    const { data } = await supabase.from('documentos').select('*').eq('processo_id', processoId).order('criado_em');
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string, processoId: r.processo_id as string, nome: r.nome as string,
      tipo: r.tipo as string, arquivoPath: r.arquivo_path as string,
      arquivoNome: r.arquivo_nome as string, criadoEm: r.criado_em as string,
      arquivado: !!r.arquivado,
    }));
  },
  uploadDocumento: async (processoId: string, file: File, tipo = 'documento') => {
    const path = `docs/${processoId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error } = await supabase.storage.from('processos').upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) return { error };
    return supabase.from('documentos').insert({ processo_id: processoId, nome: file.name, tipo, arquivo_path: path, arquivo_nome: file.name });
  },
  signedUrlDocumento: async (path: string) => {
    const { data } = await supabase.storage.from('processos').createSignedUrl(path, 3600);
    return data?.signedUrl ?? '';
  },
  // Documentos nunca são deletados — apenas inativados (arquivado = true/false).
  setDocumentoArquivado: (id: string, arquivado: boolean) => supabase.from('documentos').update({ arquivado }).eq('id', id),

  // Documentos do CLIENTE (sem vínculo a processo): contratos sociais, planilhas, prints, etc. — qualquer formato.
  listarDocumentosCliente: async (clienteId: string): Promise<Documento[]> => {
    const { data } = await supabase.from('documentos').select('*').eq('cliente_id', clienteId).order('criado_em');
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string, processoId: (r.processo_id as string) ?? '', nome: r.nome as string,
      tipo: r.tipo as string, arquivoPath: r.arquivo_path as string,
      arquivoNome: r.arquivo_nome as string, criadoEm: r.criado_em as string,
      arquivado: !!r.arquivado,
    }));
  },
  uploadDocumentoCliente: async (clienteId: string, file: File, tipo = 'documento') => {
    const path = `docs/cliente/${clienteId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error } = await supabase.storage.from('processos').upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) return { error };
    return supabase.from('documentos').insert({ cliente_id: clienteId, nome: file.name, tipo, arquivo_path: path, arquivo_nome: file.name });
  },

  // prazos
  upsertPrazo: (p: Prazo) => supabase.from('prazos').upsert(fromPrazo(p)),
  deletePrazo: (id: string) => supabase.from('prazos').delete().eq('id', id),

  // notificações internas (ex.: Operação cumpre tarefa -> avisa quem delegou)
  criarNotificacao: (n: { paraNome?: string; paraEmail?: string; titulo?: string; mensagem?: string; prazoId?: string; processoId?: string }) =>
    supabase.from('jg_notificacoes').insert({
      para_nome: n.paraNome ?? null, para_email: n.paraEmail ?? null,
      titulo: n.titulo ?? null, mensagem: n.mensagem ?? null,
      prazo_id: n.prazoId || null, processo_id: n.processoId || null,
    }),
  listarNotificacoes: async (nome: string): Promise<Notificacao[]> => {
    const { data } = await supabase.from('jg_notificacoes').select('*')
      .eq('para_nome', nome).order('criado_em', { ascending: false }).limit(50);
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string, paraNome: (r.para_nome as string) ?? undefined, paraEmail: (r.para_email as string) ?? undefined,
      titulo: (r.titulo as string) ?? undefined, mensagem: (r.mensagem as string) ?? undefined,
      prazoId: (r.prazo_id as string) ?? undefined, processoId: (r.processo_id as string) ?? undefined,
      lida: !!r.lida, criadoEm: r.criado_em as string,
    }));
  },
  marcarNotificacaoLida: (id: string) => supabase.from('jg_notificacoes').update({ lida: true }).eq('id', id),
  marcarNotificacoesLidas: (nome: string) => supabase.from('jg_notificacoes').update({ lida: true }).eq('para_nome', nome).eq('lida', false),

  // publicacoes
  upsertPublicacao: (p: Publicacao) => supabase.from('publicacoes').upsert(fromPublicacao(p)),
  deletePublicacao: (id: string) => supabase.from('publicacoes').delete().eq('id', id),

  // peticoes
  upsertPeticao: (p: Peticao) => supabase.from('peticoes').upsert(fromPeticao(p)),
  deletePeticao: (id: string) => supabase.from('peticoes').delete().eq('id', id),

  // advogados
  upsertAdvogado: (a: Advogado) => supabase.from('advogados').upsert(a),
  deleteAdvogado: (id: string) => supabase.from('advogados').delete().eq('id', id),

  // usuários de login (cria/atualiza conta de acesso + senha via edge function protegida, só admin)
  gerenciarUsuario: (body: Record<string, unknown>) =>
    supabase.functions.invoke<{ ok?: boolean; error?: string; jaExistia?: boolean; advogado?: unknown }>('jg-usuarios', { body }),

  // feriados
  upsertFeriado: (f: Feriado) => supabase.from('feriados_municipais').upsert(f),
  deleteFeriado: (id: string) => supabase.from('feriados_municipais').delete().eq('id', id),

  // escritorio (singleton: atualiza a linha existente ou cria a primeira)
  upsertEscritorio: async (e: ConfigEscritorio, apiKey: string) => {
    const payload = {
      nome: e.nome, oab: e.oab, endereco: e.endereco,
      telefone: e.telefone, email: e.email, anthropic_api_key: apiKey,
    };
    const { data } = await supabase.from('escritorio').select('id').limit(1);
    if (data?.[0]?.id) return supabase.from('escritorio').update(payload).eq('id', data[0].id as string);
    return supabase.from('escritorio').insert(payload);
  },

  // credenciais
  upsertCredencial: (c: CredencialTribunal) =>
    supabase.from('credenciais_tribunais').upsert(c, { onConflict: 'tribunal' }),
};
