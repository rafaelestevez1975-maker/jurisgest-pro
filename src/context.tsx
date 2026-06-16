import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, Cliente, Processo, Prazo, Publicacao, Peticao, Advogado, Feriado, ConfigEscritorio, CredencialTribunal } from './types';
import { INITIAL_STATE } from './data';

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

const STORAGE_KEY = 'jurisgest_data';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : init;
    } catch { return init; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
