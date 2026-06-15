import { useState } from 'react';
import { useApp, genId } from '../context';
import type { Prazo, TipoPrazo, StatusPrazo } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, CheckCircle, XCircle, CalendarDays, List, AlertTriangle, Clock } from 'lucide-react';
import { diasRestantes } from '../data';
import { toast } from 'sonner';

const TIPOS: TipoPrazo[] = ['audiência','prazo_fatal','prazo_dilatório','diligência','reunião','outro'];
const STATUS_PRAZO: StatusPrazo[] = ['pendente','cumprido','cancelado'];

const tipoColor: Record<TipoPrazo, string> = {
  'audiência': 'bg-purple-100 text-purple-700',
  'prazo_fatal': 'bg-red-100 text-red-700',
  'prazo_dilatório': 'bg-orange-100 text-orange-700',
  'diligência': 'bg-blue-100 text-blue-700',
  'reunião': 'bg-green-100 text-green-700',
  'outro': 'bg-gray-100 text-gray-600',
};

function urgencyStyle(dias: number, status: StatusPrazo) {
  if (status !== 'pendente') return 'border-l-gray-300';
  if (dias < 0) return 'border-l-gray-400';
  if (dias <= 3) return 'border-l-red-500';
  if (dias <= 7) return 'border-l-yellow-500';
  return 'border-l-green-500';
}

function urgencyBadge(dias: number, status: StatusPrazo) {
  if (status === 'cumprido') return <Badge className="bg-green-100 text-green-700 text-[10px]"><CheckCircle size={9} className="mr-0.5" />Cumprido</Badge>;
  if (status === 'cancelado') return <Badge className="bg-gray-100 text-gray-500 text-[10px]"><XCircle size={9} className="mr-0.5" />Cancelado</Badge>;
  if (dias < 0) return <Badge className="bg-gray-100 text-gray-500 text-[10px]">Vencido</Badge>;
  if (dias === 0) return <Badge className="bg-red-600 text-white text-[10px]">Hoje!</Badge>;
  if (dias <= 3) return <Badge className="bg-red-500 text-white text-[10px]">{dias}d</Badge>;
  if (dias <= 7) return <Badge className="bg-yellow-500 text-white text-[10px]">{dias}d</Badge>;
  return <Badge className="bg-green-600 text-white text-[10px]">{dias}d</Badge>;
}

const emptyPrazo = (): Omit<Prazo, 'id' | 'criadoEm'> => ({
  processoId: '', tipo: 'prazo_fatal', descricao: '', dataHora: '', diasUteis: true,
  responsavel: '', status: 'pendente', alertaDias: 3,
});

function PrazoForm({ initial, onSave, onCancel }: {
  initial: Omit<Prazo, 'id' | 'criadoEm'>;
  onSave: (d: Omit<Prazo, 'id' | 'criadoEm'>) => void;
  onCancel: () => void;
}) {
  const { state } = useApp();
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Processo *</Label>
          <Select value={form.processoId} onValueChange={v => set('processoId', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {state.processos.map(p => {
                const cli = state.clientes.find(c => c.id === p.clienteId);
                return <SelectItem key={p.id} value={p.id}><span className="font-mono text-xs">{p.numero.slice(0,15)}...</span> · {cli?.nome.split(' ')[0]}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={form.tipo} onValueChange={v => set('tipo', v as TipoPrazo)}>
            <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v as StatusPrazo)}>
            <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_PRAZO.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Descrição *</Label>
          <Input className="mt-1 h-8 text-sm" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Apresentar contestação" />
        </div>
        <div>
          <Label className="text-xs">Data e Hora *</Label>
          <Input className="mt-1 h-8 text-sm" type="datetime-local" value={form.dataHora} onChange={e => set('dataHora', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Advogado Responsável</Label>
          <Select value={form.responsavel} onValueChange={v => set('responsavel', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Alertar (dias antes)</Label>
          <Input className="mt-1 h-8 text-sm" type="number" min={0} value={form.alertaDias} onChange={e => set('alertaDias', Number(e.target.value))} />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <Switch checked={form.diasUteis} onCheckedChange={v => set('diasUteis', v)} />
          <Label className="text-xs cursor-pointer">Contar em dias úteis</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700" onClick={() => {
          if (!form.processoId || !form.descricao || !form.dataHora) { toast.error('Preencha processo, descrição e data.'); return; }
          onSave(form);
        }}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

function CalendarioMes({ prazos, onSelect }: { prazos: Prazo[]; processos?: any[]; onSelect: (p: Prazo) => void }) {
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const primeiroDia = mes.getDay();
  const hoje = new Date();

  const prazosDoMes = prazos.reduce<Record<number, Prazo[]>>((acc, p) => {
    const d = new Date(p.dataHora);
    if (d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth()) {
      const dia = d.getDate();
      acc[dia] = acc[dia] || [];
      acc[dia].push(p);
    }
    return acc;
  }, {});

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const semana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</Button>
        <span className="font-semibold text-sm text-[#1e3a5f]">{meses[mes.getMonth()]} {mes.getFullYear()}</span>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>›</Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {semana.map(s => <div key={s} className="text-center text-[10px] font-semibold text-gray-400 py-1">{s}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const dia = i + 1;
          const prsDia = prazosDoMes[dia] || [];
          const isHoje = hoje.getFullYear() === mes.getFullYear() && hoje.getMonth() === mes.getMonth() && hoje.getDate() === dia;
          return (
            <div key={dia} className={`min-h-[52px] border rounded p-0.5 ${isHoje ? 'bg-blue-50 border-blue-300' : 'border-gray-100 hover:bg-gray-50'}`}>
              <p className={`text-[11px] font-medium text-right pr-1 ${isHoje ? 'text-blue-600' : 'text-gray-600'}`}>{dia}</p>
              {prsDia.slice(0, 2).map(p => {
                return (
                  <div key={p.id} onClick={() => onSelect(p)} className={`text-[9px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer hover:opacity-80 ${tipoColor[p.tipo]}`}>
                    {p.descricao.slice(0, 12)}...
                  </div>
                );
              })}
              {prsDia.length > 2 && <div className="text-[9px] text-gray-400 px-1">+{prsDia.length - 2}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Prazos() {
  const { state, dispatch } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('pendente');
  const [filterResp, setFilterResp] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPrazo, setEditPrazo] = useState<Prazo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [selectedPrazo, setSelectedPrazo] = useState<Prazo | null>(null);

  const filtered = state.prazos.filter(p => {
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchResp = filterResp === 'todos' || p.responsavel === filterResp;
    return matchStatus && matchResp;
  }).sort((a, b) => diasRestantes(a.dataHora) - diasRestantes(b.dataHora));

  const respUnicos = [...new Set(state.prazos.map(p => p.responsavel).filter(Boolean))];

  const handleSave = (data: Omit<Prazo, 'id' | 'criadoEm'>) => {
    if (editPrazo) {
      dispatch({ type: 'UPDATE_PRAZO', payload: { ...editPrazo, ...data } });
      toast.success('Prazo atualizado!');
    } else {
      dispatch({ type: 'ADD_PRAZO', payload: { ...data, id: genId(), criadoEm: new Date().toISOString() } });
      toast.success('Prazo cadastrado!');
    }
    setDialogOpen(false);
    setEditPrazo(null);
  };

  const marcarCumprido = (id: string) => {
    const p = state.prazos.find(p => p.id === id);
    if (p) { dispatch({ type: 'UPDATE_PRAZO', payload: { ...p, status: 'cumprido' } }); toast.success('Prazo marcado como cumprido!'); }
  };

  const pendentes7 = state.prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) <= 7 && diasRestantes(p.dataHora) >= 0).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Agenda de Prazos</h1>
          <p className="text-sm text-gray-500">{pendentes7 > 0 && <span className="text-yellow-600 font-medium"><AlertTriangle size={12} className="inline mr-1" />{pendentes7} prazo(s) nos próximos 7 dias · </span>}{state.prazos.length} total</p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded overflow-hidden">
            <Button variant={viewMode === 'lista' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs rounded-none" onClick={() => setViewMode('lista')}><List size={13} className="mr-1" />Lista</Button>
            <Button variant={viewMode === 'calendario' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs rounded-none" onClick={() => setViewMode('calendario')}><CalendarDays size={13} className="mr-1" />Calendário</Button>
          </div>
          <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 text-xs" onClick={() => { setEditPrazo(null); setDialogOpen(true); }}>
            <Plus size={14} className="mr-1" /> Novo Prazo
          </Button>
        </div>
      </div>

      {viewMode === 'lista' && (
        <div className="flex gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_PRAZO.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterResp} onValueChange={setFilterResp}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os advogados</SelectItem>
              {respUnicos.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {viewMode === 'lista' ? (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">Nenhum prazo encontrado.</p>}
          {filtered.map(prazo => {
            const dias = diasRestantes(prazo.dataHora);
            const proc = state.processos.find(p => p.id === prazo.processoId);
            const [data, hora] = prazo.dataHora.split('T');
            return (
              <Card key={prazo.id} className={`border-l-4 ${urgencyStyle(dias, prazo.status)}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#1e3a5f]">{prazo.descricao}</span>
                        <Badge className={`${tipoColor[prazo.tipo]} text-[10px] px-1.5`}>{prazo.tipo.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{proc?.numero || '—'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Clock size={10} />{data} {hora && hora.slice(0,5)}</span>
                        <span>{prazo.diasUteis ? 'Dias úteis' : 'Dias corridos'}</span>
                        <span>{prazo.responsavel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {urgencyBadge(dias, prazo.status)}
                      {prazo.status === 'pendente' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700 px-2" onClick={() => marcarCumprido(prazo.id)}>
                          <CheckCircle size={13} className="mr-1" />OK
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditPrazo(prazo); setDialogOpen(true); }}><Edit size={12} /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteId(prazo.id)}><Trash2 size={12} /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <CalendarioMes prazos={state.prazos} processos={state.processos} onSelect={p => { setSelectedPrazo(p); }} />
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-[#1e3a5f]">{editPrazo ? 'Editar Prazo' : 'Novo Prazo'}</DialogTitle></DialogHeader>
          <PrazoForm
            initial={editPrazo ? { processoId: editPrazo.processoId, tipo: editPrazo.tipo, descricao: editPrazo.descricao, dataHora: editPrazo.dataHora, diasUteis: editPrazo.diasUteis, responsavel: editPrazo.responsavel, status: editPrazo.status, alertaDias: editPrazo.alertaDias } : emptyPrazo()}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditPrazo(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Detalhe prazo do calendário */}
      <Dialog open={!!selectedPrazo} onOpenChange={() => setSelectedPrazo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-[#1e3a5f]">Prazo</DialogTitle></DialogHeader>
          {selectedPrazo && (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{selectedPrazo.descricao}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Data:</span> <span className="font-medium">{selectedPrazo.dataHora.split('T')[0]}</span></div>
                <div><span className="text-gray-400">Tipo:</span> <span className="font-medium capitalize">{selectedPrazo.tipo.replace('_', ' ')}</span></div>
                <div><span className="text-gray-400">Responsável:</span> <span className="font-medium">{selectedPrazo.responsavel}</span></div>
                <div><span className="text-gray-400">Status:</span> <span className="font-medium capitalize">{selectedPrazo.status}</span></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs bg-[#2563eb]" onClick={() => { setEditPrazo(selectedPrazo); setSelectedPrazo(null); setDialogOpen(true); }}>Editar</Button>
                {selectedPrazo.status === 'pendente' && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { marcarCumprido(selectedPrazo.id); setSelectedPrazo(null); }}>Marcar cumprido</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Excluir este prazo?</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { if (deleteId) { dispatch({ type: 'DELETE_PRAZO', payload: deleteId }); toast.success('Prazo excluído.'); setDeleteId(null); } }}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
