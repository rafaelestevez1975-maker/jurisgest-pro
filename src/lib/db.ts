import { supabase } from './supabase';
import type {
  AppState, Cliente, Processo, Prazo, Publicacao, Peticao,
  Advogado, Feriado, ConfigEscritorio, CredencialTribunal, Movimentacao,
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
    criado_em: c.criadoEm,
  };
}

function toMovimentacao(r: Record<string, unknown>): Movimentacao {
  return {
    id: r.id as string,
    data: r.data as string,
    tipo: r.tipo as string,
    descricao: r.descricao as string,
  };
}

function toProcesso(r: Record<string, unknown>, movs: Movimentacao[] = []): Processo {
  return {
    id: r.id as string,
    numero: r.numero as string,
    clienteId: (r.cliente_id as string) ?? '',
    vara: r.vara as string,
    tribunal: r.tribunal as string,
    comarca: r.comarca as string,
    area: r.area as Processo['area'],
    fase: r.fase as Processo['fase'],
    parteContraria: r.parte_contraria as string,
    advogadoResponsavel: r.advogado_responsavel as string,
    valorCausa: r.valor_causa as number | undefined,
    dataDistribuicao: (r.data_distribuicao as string) ?? '',
    status: r.status as Processo['status'],
    movimentacoes: movs,
    observacoes: r.observacoes as string | undefined,
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
    area: p.area,
    fase: p.fase,
    parte_contraria: p.parteContraria,
    advogado_responsavel: p.advogadoResponsavel,
    valor_causa: p.valorCausa ?? null,
    data_distribuicao: p.dataDistribuicao || null,
    status: p.status,
    observacoes: p.observacoes ?? null,
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
    alertaDias: r.alerta_dias as number,
    criadoEm: r.criado_em as string,
    vistoEm: r.visto_em as string | undefined,
    vistoPor: r.visto_por as string | undefined,
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
    alerta_dias: p.alertaDias,
    visto_em: p.vistoEm ?? null,
    visto_por: p.vistoPor ?? null,
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
    criadoEm: r.criado_em as string,
  };
}

function fromPeticao(p: Peticao) {
  return {
    id: p.id,
    nome: p.nome,
    processo_id: p.processoId || null,
    tipo: p.tipo,
    data_protocolo: p.dataProtocolo ?? null,
    numero_protocolo: p.numeroProtocolo ?? null,
    status: p.status,
    observacoes: p.observacoes ?? null,
    criado_em: p.criadoEm,
  };
}

// ─── load all ───────────────────────────────────────────────────────────────

export async function loadState(): Promise<AppState> {
  const [
    { data: escritorioRows },
    { data: advRows },
    { data: cliRows },
    { data: procRows },
    { data: movRows },
    { data: prazoRows },
    { data: pubRows },
    { data: petRows },
    { data: ferRows },
    { data: credRows },
  ] = await Promise.all([
    supabase.from('escritorio').select('*').limit(1),
    supabase.from('advogados').select('*').order('nome'),
    supabase.from('clientes').select('*').order('nome'),
    supabase.from('processos').select('*').order('criado_em'),
    supabase.from('movimentacoes').select('*').order('data'),
    supabase.from('prazos').select('*').order('data_hora'),
    supabase.from('publicacoes').select('*').order('data', { ascending: false }),
    supabase.from('peticoes').select('*').order('criado_em'),
    supabase.from('feriados_municipais').select('*').order('data'),
    supabase.from('credenciais_tribunais').select('*'),
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
    await supabase.from('processos').upsert(fromProcesso(p));
    // sync movimentacoes: delete all then re-insert
    await supabase.from('movimentacoes').delete().eq('processo_id', p.id);
    if (p.movimentacoes.length > 0) {
      await supabase.from('movimentacoes').insert(
        p.movimentacoes.map(m => ({ ...m, processo_id: p.id }))
      );
    }
  },
  deleteProcesso: (id: string) => supabase.from('processos').delete().eq('id', id),

  // prazos
  upsertPrazo: (p: Prazo) => supabase.from('prazos').upsert(fromPrazo(p)),
  deletePrazo: (id: string) => supabase.from('prazos').delete().eq('id', id),

  // publicacoes
  upsertPublicacao: (p: Publicacao) => supabase.from('publicacoes').upsert(fromPublicacao(p)),
  deletePublicacao: (id: string) => supabase.from('publicacoes').delete().eq('id', id),

  // peticoes
  upsertPeticao: (p: Peticao) => supabase.from('peticoes').upsert(fromPeticao(p)),
  deletePeticao: (id: string) => supabase.from('peticoes').delete().eq('id', id),

  // advogados
  upsertAdvogado: (a: Advogado) => supabase.from('advogados').upsert(a),
  deleteAdvogado: (id: string) => supabase.from('advogados').delete().eq('id', id),

  // feriados
  upsertFeriado: (f: Feriado) => supabase.from('feriados_municipais').upsert(f),
  deleteFeriado: (id: string) => supabase.from('feriados_municipais').delete().eq('id', id),

  // escritorio (upsert singleton)
  upsertEscritorio: (e: ConfigEscritorio, apiKey: string) =>
    supabase.from('escritorio').upsert({
      nome: e.nome, oab: e.oab, endereco: e.endereco,
      telefone: e.telefone, email: e.email, anthropic_api_key: apiKey,
    }),

  // credenciais
  upsertCredencial: (c: CredencialTribunal) =>
    supabase.from('credenciais_tribunais').upsert(c, { onConflict: 'tribunal' }),
};
