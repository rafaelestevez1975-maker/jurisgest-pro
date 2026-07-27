import { useApp } from '../context';
import type { Processo } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Scale } from 'lucide-react';

// Diálogo reutilizável: mostra os dados e os andamentos de um processo.
// Aberto ao clicar no número do processo (na Agenda, nas Publicações, etc.).
export default function ProcessoAndamentosDialog({ processo, onClose }: { processo: Processo | null; onClose: () => void }) {
  const { state } = useApp();
  return (
    <Dialog open={!!processo} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
            <Scale size={16} className="text-blue-500" />
            <span className="font-mono text-sm">{processo?.numero}</span>
          </DialogTitle>
        </DialogHeader>
        {processo && (() => {
          const cli = state.clientes.find(c => c.id === processo.clienteId);
          const movs = [...processo.movimentacoes].sort((a, b) => b.data.localeCompare(a.data));
          return (
            <div className="space-y-3">
              <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 space-y-0.5">
                <p><b>{cli?.nome || '—'}</b> <span className="text-gray-400">vs</span> {processo.parteContraria || '—'}</p>
                <p className="text-gray-500">{processo.tribunal}{processo.vara ? ` · ${processo.vara}` : ''}{processo.comarca ? ` · ${processo.comarca}` : ''}</p>
                <p className="capitalize text-gray-500">{processo.area} · {processo.fase} · {processo.status}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1.5">Andamentos ({movs.length})</p>
                {movs.length === 0
                  ? <p className="text-xs text-gray-400 py-4 text-center">Nenhum andamento registrado. Use "Sincronizar DataJud" na aba Processos para buscar.</p>
                  : (
                    <div className="max-h-[50vh] overflow-y-auto space-y-0.5 pr-1">
                      {movs.map(m => (
                        <div key={m.id} className="flex gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0">
                          <span className="w-20 flex-shrink-0 text-gray-400">{m.data}</span>
                          <span className="text-gray-700 min-w-0 break-words whitespace-pre-wrap">{m.tipo && <span className="font-semibold text-[#2563eb]">{m.tipo}: </span>}{m.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
