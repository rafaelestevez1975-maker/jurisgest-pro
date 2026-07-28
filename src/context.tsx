import React, { createContext, useContext, useReducer, useEffect, useState, useMemo } from 'react';
import type { AppState, Cliente, Processo, Prazo, Publicacao, Peticao, Advogado, Feriado, ConfigEscritorio, CredencialTribunal, PapelUsuario, AreaDireito } from './types';
import { INITIAL_STATE } from './data';
import { loadState, db } from './lib/db';
import { supabase } from './lib/supabase';
import { toast } from 'sonner';

// UID fixo do dono do sistema (sempre admin, espelha is_jurisgest_user/jg_papel no banco).
const OWNER_UID = '5a4b91a1-8cb1-45fe-b4dc-b0da4dd0fe48';

export interface UsuarioAtual {
  email: string;
  uid: string;
  nome: string;
  papel: PapelUsuario;
  isAdmin: boolean;
  podeEditar: boolean;                    // admin ou advogado (visualizador = false)
  areas: AreaDireito[];
  areasVisiveis: AreaDireito[] | null;    // null = vê todas as áreas (admin ou sem recorte)
  emArea: (area?: string) => boolean;     // true se a área é visível ao usuário
  // true se pode ver ESTE processo: pela área OU por ser responsável/ter agendado
  // uma tarefa PENDENTE nele (acesso vale até o cumprimento/cancelamento da tarefa).
  podeVerProcesso: (proc?: { id?: string; area?: string }) => boolean;
}

// Avisa o usuário se uma gravação no Supabase falhar (evita perda silenciosa).
function reportErro(p: unknown, label: string) {
  Promise.resolve(p as Promise<{ error?: unknown }>)
    .then(res => {
      if (res && (res as { error?: unknown }).error) {
        console.error('[sync]', label, (res as { error?: unknown }).error);
        toast.error(`Não foi possível salvar (${label}). A alteração ficou no dispositivo; verifique a conexão.`);
      }
    })
    .catch(err => {
      console.error('[sync]', label, err);
      toast.error(`Falha de conexão ao salvar (${label}).`);
    });
}

type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_CLIENTE'; payload: Cliente }
  | { type: 'UPDATE_CLIENTE'; payload: Cliente }
  | { type: 'DELETE_CLIENTE'; payload: string }
  | { type: 'ADD_PROCESSO'; payload: Processo }
  | { type: 'UPDATE_PROCESSO'; payload: Processo }
  | { type: 'DELETE_PROCESSO'; payload: string }
  | { type: 'ADD_PRAZO'; payload: Prazo }
  | { type: 'UPDATE_PRAZO'; payload: Prazo }
  | { type: 'DELETE_PRAZO'; payload: string }
  | { type: 'ADD_PUBLICACAO'; payload: Publicacao }
  | { type: 'UPDATE_PUBLICACAO'; payload: Publicacao }
  | { type: 'DELETE_PUBLICACAO'; payload: string }
  | { type: 'ADD_PETICAO'; payload: Peticao }
  | { type: 'UPDATE_PETICAO'; payload: Peticao }
  | { type: 'DELETE_PETICAO'; payload: string }
  | { type: 'ADD_ADVOGADO'; payload: Advogado }
  | { type: 'UPDATE_ADVOGADO'; payload: Advogado }
  | { type: 'DELETE_ADVOGADO'; payload: string }
  | { type: 'ADD_FERIADO'; payload: Feriado }
  | { type: 'DELETE_FERIADO'; payload: string }
  | { type: 'UPDATE_ESCRITORIO'; payload: ConfigEscritorio }
  | { type: 'ADD_CREDENCIAL'; payload: CredencialTribunal }
  | { type: 'UPDATE_CREDENCIAL'; payload: CredencialTribunal }
  | { type: 'IMPORT_CLIENTES'; payload: Cliente[] }
  | { type: 'IMPORT_PROCESSOS'; payload: Processo[] }
  | { type: 'IMPORT_PETICOES'; payload: Peticao[] }
  | { type: 'IMPORT_PUBLICACOES'; payload: Publicacao[] }
  | { type: 'SET_ANTHROPIC_KEY'; payload: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE': return action.payload;
    case 'ADD_CLIENTE': return { ...state, clientes: [...state.clientes, action.payload] };
    case 'UPDATE_CLIENTE': return { ...state, clientes: state.clientes.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENTE': return { ...state, clientes: state.clientes.filter(c => c.id !== action.payload) };
    case 'ADD_PROCESSO': return { ...state, processos: [...state.processos, action.payload] };
    case 'UPDATE_PROCESSO': return { ...state, processos: state.processos.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROCESSO': return { ...state, processos: state.processos.filter(p => p.id !== action.payload) };
    case 'ADD_PRAZO': return { ...state, prazos: [...state.prazos, action.payload] };
    case 'UPDATE_PRAZO': return { ...state, prazos: state.prazos.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PRAZO': return { ...state, prazos: state.prazos.filter(p => p.id !== action.payload) };
    case 'ADD_PUBLICACAO': return { ...state, publicacoes: [...state.publicacoes, action.payload] };
    case 'UPDATE_PUBLICACAO': return { ...state, publicacoes: state.publicacoes.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PUBLICACAO': return { ...state, publicacoes: state.publicacoes.filter(p => p.id !== action.payload) };
    case 'ADD_PETICAO': return { ...state, peticoes: [...state.peticoes, action.payload] };
    case 'UPDATE_PETICAO': return { ...state, peticoes: state.peticoes.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PETICAO': return { ...state, peticoes: state.peticoes.filter(p => p.id !== action.payload) };
    case 'ADD_ADVOGADO': return { ...state, advogados: [...state.advogados, action.payload] };
    case 'UPDATE_ADVOGADO': return { ...state, advogados: state.advogados.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_ADVOGADO': return { ...state, advogados: state.advogados.filter(a => a.id !== action.payload) };
    case 'ADD_FERIADO': return { ...state, feriadosMunicipais: [...state.feriadosMunicipais, action.payload] };
    case 'DELETE_FERIADO': return { ...state, feriadosMunicipais: state.feriadosMunicipais.filter(f => f.id !== action.payload) };
    case 'UPDATE_ESCRITORIO': return { ...state, escritorio: action.payload };
    case 'ADD_CREDENCIAL': return { ...state, credenciais: [...state.credenciais, action.payload] };
    case 'UPDATE_CREDENCIAL': return { ...state, credenciais: state.credenciais.map(c => c.tribunal === action.payload.tribunal ? action.payload : c) };
    case 'IMPORT_CLIENTES': return { ...state, clientes: [...state.clientes, ...action.payload] };
    case 'IMPORT_PROCESSOS': return { ...state, processos: [...state.processos, ...action.payload] };
    case 'IMPORT_PETICOES': return { ...state, peticoes: [...state.peticoes, ...action.payload] };
    case 'IMPORT_PUBLICACOES': return { ...state, publicacoes: [...state.publicacoes, ...action.payload] };
    case 'SET_ANTHROPIC_KEY': return { ...state, anthropicApiKey: action.payload };
    default: return state;
  }
}

// Sync action → Supabase (fire-and-forget; optimistic UI via reducer)
function syncToSupabase(action: Action, nextState: AppState) {
  switch (action.type) {
    case 'ADD_CLIENTE':
    case 'UPDATE_CLIENTE':
      reportErro(db.upsertCliente(action.payload), 'cliente'); break;
    case 'DELETE_CLIENTE':
      reportErro(db.deleteCliente(action.payload), 'exclusão de cliente'); break;

    case 'ADD_PROCESSO':
    case 'UPDATE_PROCESSO':
      reportErro(db.upsertProcesso(action.payload), 'processo'); break;
    case 'DELETE_PROCESSO':
      reportErro(db.deleteProcesso(action.payload), 'exclusão de processo'); break;

    case 'ADD_PRAZO':
    case 'UPDATE_PRAZO':
      reportErro(db.upsertPrazo(action.payload), 'prazo'); break;
    case 'DELETE_PRAZO':
      reportErro(db.deletePrazo(action.payload), 'exclusão de prazo'); break;

    case 'ADD_PUBLICACAO':
    case 'UPDATE_PUBLICACAO':
      reportErro(db.upsertPublicacao(action.payload), 'publicação'); break;
    case 'DELETE_PUBLICACAO':
      reportErro(db.deletePublicacao(action.payload), 'exclusão de publicação'); break;

    case 'ADD_PETICAO':
    case 'UPDATE_PETICAO':
      reportErro(db.upsertPeticao(action.payload), 'petição'); break;
    case 'DELETE_PETICAO':
      reportErro(db.deletePeticao(action.payload), 'exclusão de petição'); break;

    case 'ADD_ADVOGADO':
    case 'UPDATE_ADVOGADO':
      reportErro(db.upsertAdvogado(action.payload), 'advogado'); break;
    case 'DELETE_ADVOGADO':
      reportErro(db.deleteAdvogado(action.payload), 'exclusão de advogado'); break;

    case 'ADD_FERIADO':
      reportErro(db.upsertFeriado(action.payload), 'feriado'); break;
    case 'DELETE_FERIADO':
      reportErro(db.deleteFeriado(action.payload), 'exclusão de feriado'); break;

    case 'UPDATE_ESCRITORIO':
      reportErro(db.upsertEscritorio(action.payload, nextState.anthropicApiKey), 'dados do escritório'); break;
    case 'SET_ANTHROPIC_KEY':
      reportErro(db.upsertEscritorio(nextState.escritorio, action.payload), 'chave de IA'); break;

    case 'ADD_CREDENCIAL':
    case 'UPDATE_CREDENCIAL':
      reportErro(db.upsertCredencial(action.payload), 'credencial de tribunal'); break;

    case 'IMPORT_CLIENTES':
      action.payload.forEach(c => reportErro(db.upsertCliente(c), 'importação de cliente')); break;
    case 'IMPORT_PROCESSOS':
      action.payload.forEach(p => reportErro(db.upsertProcesso(p), 'importação de processo')); break;
    case 'IMPORT_PETICOES':
      action.payload.forEach(p => reportErro(db.upsertPeticao(p), 'importação de petição')); break;
    case 'IMPORT_PUBLICACOES':
      action.payload.forEach(p => reportErro(db.upsertPublicacao(p), 'importação de publicação')); break;
  }
}

// --- Auditoria (log de atividades por usuário) ---
// Usuário atual em escopo de módulo (setado pelo provider) para o log fire-and-forget.
let usuarioLog: { email: string; nome: string } = { email: '', nome: '' };

function descreverAtividade(action: Action): { acao: string; entidade: string; entidade_id?: string; descricao: string } | null {
  const p = (action as { payload?: unknown }).payload as Record<string, unknown> | string | unknown[] | undefined;
  const o = (p && typeof p === 'object' && !Array.isArray(p)) ? p as Record<string, unknown> : undefined;
  const s = (v: unknown) => (v == null ? '' : String(v));
  switch (action.type) {
    case 'ADD_CLIENTE': return { acao: 'criar', entidade: 'cliente', entidade_id: s(o?.id), descricao: `Cadastrou cliente "${s(o?.nome)}"` };
    case 'UPDATE_CLIENTE': return { acao: 'editar', entidade: 'cliente', entidade_id: s(o?.id), descricao: `Editou cliente "${s(o?.nome)}"` };
    case 'DELETE_CLIENTE': return { acao: 'excluir', entidade: 'cliente', entidade_id: s(p), descricao: 'Excluiu um cliente' };
    case 'ADD_PROCESSO': return { acao: 'criar', entidade: 'processo', entidade_id: s(o?.id), descricao: `Cadastrou processo ${s(o?.numero)}` };
    case 'UPDATE_PROCESSO': return { acao: o?.arquivado ? 'arquivar' : 'editar', entidade: 'processo', entidade_id: s(o?.id), descricao: `${o?.arquivado ? 'Arquivou' : 'Atualizou'} processo ${s(o?.numero)}` };
    case 'DELETE_PROCESSO': return { acao: 'excluir', entidade: 'processo', entidade_id: s(p), descricao: 'Excluiu um processo' };
    case 'ADD_PRAZO': return { acao: 'agendar', entidade: 'prazo', entidade_id: s(o?.id), descricao: `Agendou: ${s(o?.descricao)}${o?.dataHora ? ' — ' + s(o.dataHora).split('T')[0] : ''}` };
    case 'UPDATE_PRAZO': return { acao: 'editar', entidade: 'prazo', entidade_id: s(o?.id), descricao: `Atualizou prazo: ${s(o?.descricao)}` };
    case 'DELETE_PRAZO': return { acao: 'excluir', entidade: 'prazo', entidade_id: s(p), descricao: 'Excluiu um prazo' };
    case 'ADD_PUBLICACAO': return { acao: 'criar', entidade: 'publicacao', entidade_id: s(o?.id), descricao: `Adicionou publicação (${s(o?.tribunal)})` };
    case 'UPDATE_PUBLICACAO': return { acao: 'editar', entidade: 'publicacao', entidade_id: s(o?.id), descricao: `Atualizou publicação ${s(o?.numeroProcesso)}` };
    case 'DELETE_PUBLICACAO': return { acao: 'excluir', entidade: 'publicacao', entidade_id: s(p), descricao: 'Excluiu uma publicação' };
    case 'ADD_PETICAO': return { acao: 'criar', entidade: 'peticao', entidade_id: s(o?.id), descricao: `Criou petição "${s(o?.nome)}"` };
    case 'UPDATE_PETICAO': return { acao: 'editar', entidade: 'peticao', entidade_id: s(o?.id), descricao: `Atualizou petição "${s(o?.nome)}"` };
    case 'DELETE_PETICAO': return { acao: 'excluir', entidade: 'peticao', entidade_id: s(p), descricao: 'Excluiu uma petição' };
    case 'ADD_ADVOGADO': return { acao: 'criar', entidade: 'usuario', entidade_id: s(o?.id), descricao: `Cadastrou usuário "${s(o?.nome)}"` };
    case 'UPDATE_ADVOGADO': return { acao: 'editar', entidade: 'usuario', entidade_id: s(o?.id), descricao: `Editou usuário "${s(o?.nome)}"` };
    case 'DELETE_ADVOGADO': return { acao: 'excluir', entidade: 'usuario', entidade_id: s(p), descricao: 'Removeu um usuário' };
    case 'UPDATE_ESCRITORIO': return { acao: 'editar', entidade: 'configuracao', descricao: 'Atualizou dados do escritório' };
    case 'SET_ANTHROPIC_KEY': return { acao: 'editar', entidade: 'configuracao', descricao: 'Atualizou a chave de IA' };
    case 'ADD_CREDENCIAL':
    case 'UPDATE_CREDENCIAL': return { acao: 'editar', entidade: 'configuracao', descricao: 'Atualizou credencial de tribunal' };
    case 'ADD_FERIADO': return { acao: 'criar', entidade: 'configuracao', descricao: 'Adicionou feriado municipal' };
    case 'DELETE_FERIADO': return { acao: 'excluir', entidade: 'configuracao', descricao: 'Removeu feriado municipal' };
    case 'IMPORT_CLIENTES': return { acao: 'importar', entidade: 'cliente', descricao: `Importou ${Array.isArray(p) ? p.length : 0} cliente(s)` };
    case 'IMPORT_PROCESSOS': return { acao: 'importar', entidade: 'processo', descricao: `Importou ${Array.isArray(p) ? p.length : 0} processo(s)` };
    case 'IMPORT_PETICOES': return { acao: 'importar', entidade: 'peticao', descricao: `Importou ${Array.isArray(p) ? p.length : 0} petição(ões)` };
    case 'IMPORT_PUBLICACOES': return { acao: 'importar', entidade: 'publicacao', descricao: `Importou ${Array.isArray(p) ? p.length : 0} publicação(ões)` };
    default: return null;
  }
}

// Log manual para ações que não passam pelo reducer (ex.: anexar documento, sincronizar).
export function logAcao(acao: string, entidade: string, descricao: string, entidadeId?: string) {
  db.registrarAtividade({
    usuario_email: usuarioLog.email || null, usuario_nome: usuarioLog.nome || null,
    acao, entidade, entidade_id: entidadeId || null, descricao,
  }).then(() => {}).catch(() => { /* auditoria nunca quebra o app */ });
}

export function logAtividade(action: Action) {
  const info = descreverAtividade(action);
  if (!info) return;
  db.registrarAtividade({
    usuario_email: usuarioLog.email || null,
    usuario_nome: usuarioLog.nome || null,
    acao: info.acao, entidade: info.entidade,
    entidade_id: info.entidade_id || null,
    descricao: info.descricao,
  }).then(() => {}).catch(() => { /* auditoria nunca quebra o app */ });
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loading: boolean;
  reload: () => Promise<void>;
  usuario: UsuarioAtual;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<{ email: string; uid: string } | null>(null);

  // Identidade do usuário logado (para resolver papel + áreas)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) setAuth({ email: (u.email || '').toLowerCase(), uid: u.id });
    }).catch(() => { /* sem sessão: mantém null */ });
  }, []);

  // Perfil de acesso derivado do usuário logado + cadastro de advogados
  const usuario: UsuarioAtual = useMemo(() => {
    const email = auth?.email || '';
    const uid = auth?.uid || '';
    const isOwner = uid === OWNER_UID;
    const adv = email ? state.advogados.find(a => (a.email || '').toLowerCase() === email) : undefined;
    // Enquanto a identidade não resolve, assume o perfil mais restritivo (sem botões de edição),
    // mas sem esconder dados (areasVisiveis = null) para não piscar listas vazias.
    const papel: PapelUsuario = isOwner ? 'admin' : (auth ? (adv?.papel || 'visualizador') : 'visualizador');
    const isAdmin = papel === 'admin';
    const podeEditar = papel === 'admin' || papel === 'advogado';
    const areas = (isAdmin ? [] : (adv?.areas || [])) as AreaDireito[];
    const areasVisiveis: AreaDireito[] | null = (isAdmin || !auth || areas.length === 0) ? null : areas;
    const emArea = (area?: string) => areasVisiveis === null || (!!area && areasVisiveis.includes(area as AreaDireito));
    const nome = adv?.nome || (isOwner ? 'Administrador' : (email || '—'));
    // Processos liberados por tarefa: enquanto o usuário for responsável (ou tiver agendado)
    // uma tarefa PENDENTE no processo, ele enxerga o processo mesmo fora da sua área.
    // Ao concluir/cancelar a tarefa, o processo sai da liberação (se a área não for dele).
    const liberadosPorTarefa = new Set<string>();
    if (areasVisiveis !== null) {
      for (const pz of state.prazos) {
        if (pz.status === 'pendente' && pz.processoId && (pz.responsavel === nome || pz.agendadoPor === nome)) {
          liberadosPorTarefa.add(pz.processoId);
        }
      }
    }
    const podeVerProcesso = (proc?: { id?: string; area?: string }) =>
      !proc ? true : (emArea(proc.area) || (!!proc.id && liberadosPorTarefa.has(proc.id)));
    return {
      email, uid, nome,
      papel, isAdmin, podeEditar, areas, areasVisiveis, emArea, podeVerProcesso,
    };
  }, [auth, state.advogados, state.prazos]);

  // Mantém o usuário atual disponível para o log de auditoria + registra o "login/acesso"
  // uma vez por sessão do navegador (quando a identidade resolve).
  useEffect(() => {
    usuarioLog = { email: usuario.email, nome: usuario.nome };
    if (usuario.email && !sessionStorage.getItem('jg_login_logged')) {
      sessionStorage.setItem('jg_login_logged', '1');
      db.registrarAtividade({ usuario_email: usuario.email, usuario_nome: usuario.nome, acao: 'login', entidade: 'sessao', descricao: 'Acessou o sistema' })
        .then(() => {}).catch(() => { /* ignora */ });
    }
  }, [usuario.email, usuario.nome]);

  // Load from Supabase on mount, fall back to localStorage (offline)
  useEffect(() => {
    loadState()
      .then(remote => {
        // O Supabase é a fonte da verdade. Bancos vazios iniciam vazios
        // (sem seed de dados fictícios com IDs não-UUID, que quebravam a gravação).
        baseDispatch({ type: 'SET_STATE', payload: remote });
      })
      .catch(() => {
        // Offline: usa o cache local se houver
        try {
          const saved = localStorage.getItem('jurisgest_data');
          if (saved) baseDispatch({ type: 'SET_STATE', payload: JSON.parse(saved) });
        } catch { /* mantém INITIAL_STATE */ }
      })
      .finally(() => setLoading(false));
  }, []);

  // Dispatch wrapper: update state optimistically, then sync to Supabase
  const dispatch: React.Dispatch<Action> = (action: Action) => {
    baseDispatch(action);
    // Compute next state for actions that need it (escritorio/apiKey updates)
    const nextState = reducer(state, action);
    syncToSupabase(action, nextState);
    logAtividade(action);   // auditoria (fire-and-forget)
    // Cache local (offline) enxuto: sem os andamentos (podem ser milhares e estouram a
    // cota de ~5MB do localStorage). São re-buscados do Supabase ao voltar online.
    try {
      const enxuto = { ...nextState, processos: nextState.processos.map(p => ({ ...p, movimentacoes: [] })) };
      localStorage.setItem('jurisgest_data', JSON.stringify(enxuto));
    } catch { /* ignore */ }
  };

  // Recarrega o estado do Supabase (usado após o robô rodar, por ex.)
  const reload = async () => {
    try {
      const remote = await loadState();
      baseDispatch({ type: 'SET_STATE', payload: remote });
    } catch { /* mantém estado atual */ }
  };

  return (
    <AppContext.Provider value={{ state, dispatch, loading, reload, usuario }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Gera um UUID v4 válido — as colunas `id` no Supabase são do tipo uuid,
// então IDs precisam ser UUIDs (crypto.randomUUID em contexto seguro/localhost).
export function genId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Fallback (navegadores antigos / contexto não seguro)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
