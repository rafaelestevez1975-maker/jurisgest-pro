import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppProvider, useApp } from './context';
import { supabase } from './lib/supabase';
import { diasRestantes } from './data';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Processos from './components/Processos';
import Prazos from './components/Prazos';
import Publicacoes from './components/Publicacoes';
import Peticoes from './components/Peticoes';
import Relatorios from './components/Relatorios';
import Monitoramento from './components/Monitoramento';
import Configuracoes from './components/Configuracoes';
import Ajuda from './components/Ajuda';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { LayoutDashboard, Users, Scale, Clock, Bell, FileText, BarChart2, Settings, Bot, LogOut, HelpCircle } from 'lucide-react';

type Page = 'dashboard' | 'clientes' | 'processos' | 'prazos' | 'publicacoes' | 'peticoes' | 'relatorios' | 'monitoramento' | 'configuracoes' | 'ajuda';

const navItems: { id: Page; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'processos', label: 'Processos', icon: Scale },
  { id: 'prazos', label: 'Agenda', icon: Clock },
  { id: 'publicacoes', label: 'Publicações', icon: Bell },
  { id: 'peticoes', label: 'Petições', icon: FileText },
  { id: 'monitoramento', label: 'Monitoramento', icon: Bot },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart2 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  { id: 'ajuda', label: 'Ajuda', icon: HelpCircle },
];

function AppContent() {
  const { state, loading } = useApp();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const naoLidas = state.publicacoes.filter(p => p.status === 'não_lida').length;
  const prazosUrgentes = state.prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) <= 3 && diasRestantes(p.dataHora) >= 0).length;

  const badges: Partial<Record<Page, number>> = {
    publicacoes: naoLidas || undefined,
    prazos: prazosUrgentes || undefined,
  } as Partial<Record<Page, number>>;

  const navigate = (p: Page) => { setPage(p); window.scrollTo({ top: 0 }); };

  const pageComponents: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />, clientes: <Clientes />, processos: <Processos />,
    prazos: <Prazos />, publicacoes: <Publicacoes />, peticoes: <Peticoes />,
    monitoramento: <Monitoramento />, relatorios: <Relatorios />, configuracoes: <Configuracoes />,
    ajuda: <Ajuda />,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barra superior: marca + ações */}
      <header className="bg-[#1e3a5f] text-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
              <Scale size={17} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm leading-tight truncate">{state.escritorio.nome || 'JurisGest Pro'}</p>
              {state.escritorio.oab && <p className="text-[11px] text-blue-200 leading-tight truncate">{state.escritorio.oab}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {prazosUrgentes > 0 && (
              <button onClick={() => navigate('prazos')} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-2.5 py-1 text-xs text-white transition-colors">
                <Clock size={12} /><span className="hidden sm:inline">{prazosUrgentes} urgente(s)</span><span className="sm:hidden">{prazosUrgentes}</span>
              </button>
            )}
            {naoLidas > 0 && (
              <button onClick={() => navigate('publicacoes')} className="relative text-blue-100 hover:text-white transition-colors">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{naoLidas}</span>
              </button>
            )}
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 text-xs text-blue-100 hover:text-white hover:bg-white/10 rounded px-2 py-1.5 transition-colors">
              <LogOut size={14} /><span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
        {/* Menu horizontal */}
        <nav className="flex items-stretch px-2 overflow-x-auto border-t border-white/10 no-scrollbar">
          {navItems.map(item => {
            const Icon = item.icon;
            const badge = badges[item.id];
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors
                  ${active ? 'border-white text-white font-semibold bg-white/5' : 'border-transparent text-blue-100 hover:text-white hover:bg-white/5'}`}>
                <Icon size={15} className={active ? 'text-white' : 'text-blue-300'} />
                <span>{item.label}</span>
                {badge ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 w-full max-w-[1500px] mx-auto p-4 lg:p-6 overflow-auto">
        {pageComponents[page]}
      </main>
    </div>
  );
}

function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [checando, setChecando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecando(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return <Login />;

  return (
    <AppProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthGate />
    </ErrorBoundary>
  );
}
