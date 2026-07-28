import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useApp } from '../context';
import { db } from '../lib/db';
import type { Notificacao } from '../types';

// Sino de notificações internas do usuário logado (ex.: alguém cumpriu uma tarefa
// que ele delegou). Busca por nome do destinatário; atualiza ao abrir e a cada 60s.
export function NotificacoesBell() {
  const { usuario } = useApp();
  const nome = usuario.nome;
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [open, setOpen] = useState(false);

  const carregar = useCallback(() => {
    if (!nome || nome === '—') return;
    db.listarNotificacoes(nome).then(setItens).catch(() => { /* silencioso */ });
  }, [nome]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [carregar]);

  if (!nome || nome === '—') return null;

  const naoLidas = itens.filter(n => !n.lida).length;

  const marcarLida = (n: Notificacao) => {
    if (n.lida) return;
    db.marcarNotificacaoLida(n.id).then(() => {}).catch(() => {});
    setItens(arr => arr.map(x => (x.id === n.id ? { ...x, lida: true } : x)));
  };
  const marcarTodas = () => {
    db.marcarNotificacoesLidas(nome).then(() => {}).catch(() => {});
    setItens(arr => arr.map(x => ({ ...x, lida: true })));
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) carregar(); }}>
      <PopoverTrigger asChild>
        <button className="relative text-white/90 hover:text-white transition-colors p-1" title="Notificações" aria-label="Notificações">
          <Bell size={18} />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold text-[#1e3a5f]">Notificações</span>
          {naoLidas > 0 && <button className="text-[11px] text-blue-600 hover:underline" onClick={marcarTodas}>Marcar todas como lidas</button>}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y">
          {itens.length === 0 && <p className="text-xs text-gray-400 px-3 py-6 text-center">Nenhuma notificação.</p>}
          {itens.map(n => (
            <div key={n.id} onClick={() => marcarLida(n)} className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${!n.lida ? 'bg-blue-50/60' : ''}`}>
              <div className="flex items-start gap-2">
                {!n.lida
                  ? <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  : <span className="mt-1.5 w-2 h-2 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{n.titulo || 'Notificação'}</p>
                  <p className="text-xs text-gray-600 break-words">{n.mensagem}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(n.criadoEm).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
