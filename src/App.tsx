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
import { NotificacoesBell } from './components/NotificacoesBell';
import Ajuda from './components/Ajuda';
import AtualizacaoApp from './components/AtualizacaoApp';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { LayoutDashboard, Users, Scale, Clock, Bell, FileText, BarChart2, Settings, Bot, LogOut, HelpCircle, Eye, AlertTriangle, Download, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type Page = 'dashboard' | 'clientes' | 'processos' | 'prazos' | 'publicacoes' | 'peticoes' | 'relatorios' | 'monitoramento' | 'configuracoes' | 'ajuda';

const navItems: { id: Page; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'prazos', label: 'Agenda', icon: Clock },
  { id: 'publicacoes', label: 'Publicações', icon: Bell },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'processos', label: 'Processos', icon: Scale },
  { id: 'peticoes', label: 'Petições', icon: FileText },
  { id: 'monitoramento', label: 'Monitoramento', icon: Bot },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart2 },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
  { id: 'ajuda', label: 'Ajuda', icon: HelpCircle },
];

function AppContent() {
  const { state, loading, usuario, reload } = useApp();
  const [atualizando, setAtualizando] = useState(false);
  const atualizarSistema = async () => {
    if (atualizando) return;
    setAtualizando(true);
    try {
      await reload();
      // Verifica também se há versão nova do app publicada.
      try { const r = await navigator.serviceWorker?.getRegistration(); r?.update(); } catch { /* */ }
      toast.success('Sistema atualizado.');
    } catch {
      toast.error('Não foi possível atualizar agora. Verifique a conexão.');
    } finally {
      setAtualizando(false);
    }
  };
  const [page, setPage] = useState<Page>('prazos');

  // Configurações é exclusiva do admin; se um não-admin cair nela, volta para a Agenda.
  useEffect(() => {
    if (page === 'configuracoes' && !usuario.isAdmin) setPage('prazos');
  }, [page, usuario.isAdmin]);

  // Instalação como app (PWA): captura o evento do Chrome e mostra o botão "Instalar app".
  type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
  const [installEvt, setInstallEvt] = useState<PromptEvent | null>(null);
  useEffect(() => {
    const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as PromptEvent); };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const instalarApp = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* ignora */ }
    setInstallEvt(null);
  };

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

  // Escopo do perfil: publicações/prazos pela área do processo vinculado; além disso,
  // o advogado sempre vê as tarefas em que é responsável (ou que agendou), mesmo fora da área.
  const areaDoProc = (processoId?: string) => usuario.emArea(state.processos.find(x => x.id === processoId)?.area);
  const naoLidas = state.publicacoes.filter(p => p.status === 'não_lida' && (!p.processoId || areaDoProc(p.processoId))).length;
  const prazosUrgentes = state.prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) <= 3 && diasRestantes(p.dataHora) >= 0
    && ((!p.processoId || areaDoProc(p.processoId)) || p.responsavel === usuario.nome || p.agendadoPor === usuario.nome)).length;
  const alertasArquiv = state.processos.filter(p => p.alertaArquivamento?.ativo && !p.arquivado && usuario.emArea(p.area)).length;
  const novosCapturados = state.processos.filter(p => p.alertaNovo && !p.arquivado && usuario.emArea(p.area)).length;

  const badges: Partial<Record<Page, number>> = {
    publicacoes: naoLidas || undefined,
    prazos: prazosUrgentes || undefined,
  } as Partial<Record<Page, number>>;

  const navigate = (p: Page) => { setPage(p); window.scrollTo({ top: 0 }); };

  // Configurações só aparece para admin
  const visibleNav = navItems.filter(it => it.id !== 'configuracoes' || usuario.isAdmin);

  const pageComponents: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />, clientes: <Clientes />, processos: <Processos />,
    prazos: <Prazos />, publicacoes: <Publicacoes />, peticoes: <Peticoes />,
    monitoramento: <Monitoramento />, relatorios: <Relatorios />, configuracoes: <Configuracoes />,
    ajuda: <Ajuda />,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Menu lateral esquerdo */}
      <aside className="w-14 md:w-56 bg-[#1e3a5f] text-white flex flex-col flex-shrink-0 sticky top-0 h-screen z-30">
        <div className="flex items-center gap-2.5 px-2 md:px-4 h-14 border-b border-white/10 flex-shrink-0">
          <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0 mx-auto md:mx-0">
            <Scale size={18} className="text-white" />
          </div>
          <div className="min-w-0 hidden md:block">
            <p className="font-bold text-sm leading-tight truncate">{state.escritorio.nome || 'JurisGest Pro'}</p>
            {state.escritorio.oab && <p className="text-[11px] text-blue-200 leading-tight truncate">{state.escritorio.oab}</p>}
          </div>
        </div>
        {/* Navegação vertical */}
        <nav className="flex-1 overflow-y-auto py-2 no-scrollbar">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const badge = badges[item.id];
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)} title={item.label}
                className={`relative w-full flex items-center gap-3 px-2 md:px-4 py-2.5 text-sm border-l-[3px] transition-colors
                  ${active ? 'border-white text-white font-semibold bg-white/10' : 'border-transparent text-blue-100 hover:text-white hover:bg-white/5'}`}>
                <Icon size={18} className={`flex-shrink-0 mx-auto md:mx-0 ${active ? 'text-white' : 'text-blue-300'}`} />
                <span className="hidden md:inline flex-1 text-left">{item.label}</span>
                {badge ? <span className="hidden md:flex bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 items-center justify-center">{badge > 9 ? '9+' : badge}</span> : null}
                {badge ? <span className="md:hidden absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full" /> : null}
              </button>
            );
          })}
        </nav>
        {/* Usuário + Sair */}
        <div className="border-t border-white/10 p-2 md:p-3 flex-shrink-0">
          <div className="hidden md:block mb-2 leading-tight">
            <span className="text-xs text-white/90 truncate block max-w-[190px]">{usuario.nome}</span>
            {usuario.papel === 'visualizador' ? (
              <span className="text-[10px] bg-amber-400/20 text-amber-100 border border-amber-300/40 rounded px-1.5 py-0.5 inline-flex items-center gap-1 mt-0.5"><Eye size={10} /> Somente leitura</span>
            ) : usuario.papel === 'operacao' ? (
              <span className="text-[10px] bg-emerald-400/20 text-emerald-50 border border-emerald-300/40 rounded px-1.5 py-0.5 inline-block mt-0.5">Operação</span>
            ) : usuario.papel === 'advogado' ? (
              <span className="text-[10px] text-blue-200">Advogado{usuario.areas.length ? ` · ${usuario.areas.length} área${usuario.areas.length > 1 ? 's' : ''}` : ''}</span>
            ) : (
              <span className="text-[10px] text-blue-200">Administrador</span>
            )}
          </div>
          <button onClick={() => { try { sessionStorage.removeItem('jg_login_logged'); } catch { /* */ } supabase.auth.signOut(); }} title="Sair" className="w-full flex items-center justify-center md:justify-start gap-1.5 text-xs text-blue-100 hover:text-white hover:bg-white/10 rounded px-2 py-1.5 transition-colors">
            <LogOut size={14} /><span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </aside>

      {/* Coluna principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[#1e3a5f] text-white sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between px-4 h-14 gap-2">
            <p className="font-semibold text-sm truncate">{visibleNav.find(n => n.id === page)?.label || ''}</p>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={atualizarSistema} disabled={atualizando} title="Atualizar o sistema (recarrega os dados e busca novidades)" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-2.5 py-1 text-xs text-white transition-colors disabled:opacity-60">
              <RefreshCw size={13} className={atualizando ? 'animate-spin' : ''} /><span className="hidden sm:inline">{atualizando ? 'Atualizando…' : 'Atualizar'}</span>
            </button>
            {installEvt && (
              <button onClick={instalarApp} title="Instalar o JurisGest como aplicativo independente" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-2.5 py-1 text-xs text-white transition-colors">
                <Download size={12} /><span className="hidden sm:inline">Instalar app</span>
              </button>
            )}
            {prazosUrgentes > 0 && (
              <button onClick={() => navigate('prazos')} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-2.5 py-1 text-xs text-white transition-colors">
                <Clock size={12} /><span className="hidden sm:inline">{prazosUrgentes} urgente(s)</span><span className="sm:hidden">{prazosUrgentes}</span>
              </button>
            )}
            {alertasArquiv > 0 && (
              <button onClick={() => navigate('processos')} title="Processos com alerta de baixa/arquivamento" className="flex items-center gap-1.5 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 rounded-full px-2.5 py-1 text-xs text-amber-100 transition-colors">
                <AlertTriangle size={12} /><span className="hidden sm:inline">{alertasArquiv} alerta(s)</span><span className="sm:hidden">{alertasArquiv}</span>
              </button>
            )}
            {novosCapturados > 0 && (
              <button onClick={() => navigate('processos')} title="Processos novos capturados automaticamente — revisar" className="flex items-center gap-1.5 bg-blue-400/20 hover:bg-blue-400/30 border border-blue-300/40 rounded-full px-2.5 py-1 text-xs text-blue-50 transition-colors">
                <Sparkles size={12} /><span className="hidden sm:inline">{novosCapturados} novo(s)</span><span className="sm:hidden">{novosCapturados}</span>
              </button>
            )}
            {naoLidas > 0 && (
              <button onClick={() => navigate('publicacoes')} title="Publicações não lidas" className="relative text-blue-100 hover:text-white transition-colors">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{naoLidas}</span>
              </button>
            )}
            <NotificacoesBell />
            </div>
          </div>
        </header>
        <main className="flex-1 w-full p-4 lg:p-6 overflow-auto">
          {pageComponents[page]}
        </main>
      </div>
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
      <AtualizacaoApp />
    </ErrorBoundary>
  );
}
