import { useState } from 'react';
import { AppProvider, useApp } from './context';
import { diasRestantes } from './data';
import Dashboard from './components/Dashboard';
import Clientes from './components/Clientes';
import Processos from './components/Processos';
import Prazos from './components/Prazos';
import Publicacoes from './components/Publicacoes';
import Peticoes from './components/Peticoes';
import Relatorios from './components/Relatorios';
import Monitoramento from './components/Monitoramento';
import Configuracoes from './components/Configuracoes';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { LayoutDashboard, Users, Scale, Clock, Bell, FileText, BarChart2, Settings, Menu, X, ChevronRight, Bot } from 'lucide-react';

type Page = 'dashboard' | 'clientes' | 'processos' | 'prazos' | 'publicacoes' | 'peticoes' | 'relatorios' | 'monitoramento' | 'configuracoes';

const navItems: { id: Page; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'processos', label: 'Processos', icon: Scale },
  { id: 'prazos', label: 'Agenda de Prazos', icon: Clock },
  { id: 'publicacoes', label: 'Publicações', icon: Bell },
  { id: 'peticoes', label: 'Petições', icon: FileText },
  { id: 'monitoramento', label: 'Monitoramento', icon: Bot },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart2 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

function AppContent() {
  const { state, loading } = useApp();
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navigate = (p: Page) => { setPage(p); setSidebarOpen(false); };

  const pageComponents: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />, clientes: <Clientes />, processos: <Processos />,
    prazos: <Prazos />, publicacoes: <Publicacoes />, peticoes: <Peticoes />,
    monitoramento: <Monitoramento />, relatorios: <Relatorios />, configuracoes: <Configuracoes />,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#1e3a5f] text-white z-30 transition-transform duration-200 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm leading-tight">{state.escritorio.nome || 'JurisGest Pro'}</p>
              <p className="text-xs text-blue-200 mt-0.5">{state.escritorio.oab}</p>
            </div>
            <button className="lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const badge = badges[item.id];
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative
                  ${active ? 'bg-white/15 text-white font-semibold' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
                {active && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-white rounded-r" />}
                <Icon size={16} className={active ? 'text-white' : 'text-blue-300'} />
                <span className="flex-1 text-left">{item.label}</span>
                {badge ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
                ) : active ? <ChevronRight size={12} className="text-white/40" /> : null}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-blue-300 text-center">JurisGest Pro v1.0</p>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <p className="font-semibold text-[#1e3a5f] text-sm capitalize">{navItems.find(n => n.id === page)?.label || page}</p>
          </div>
          <div className="flex items-center gap-3">
            {prazosUrgentes > 0 && (
              <button onClick={() => navigate('prazos')} className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1 text-xs text-red-700 hover:bg-red-100 transition-colors">
                <Clock size={12} /><span>{prazosUrgentes} urgente(s)</span>
              </button>
            )}
            {naoLidas > 0 && (
              <button onClick={() => navigate('publicacoes')} className="relative text-gray-500 hover:text-[#2563eb] transition-colors">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{naoLidas}</span>
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {pageComponents[page]}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
        <Toaster position="top-right" richColors />
      </AppProvider>
    </ErrorBoundary>
  );
}
