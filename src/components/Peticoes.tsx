import { useState } from 'react';
import { useApp, genId } from '../context';
import type { Peticao, TipoPeticao, StatusPeticao } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Archive, ArchiveRestore, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS: TipoPeticao[] = ['inicial','contestação','recurso','parecer','embargos','outro'];
const STATUS_LIST: StatusPeticao[] = ['rascunho','protocolado','juntado'];

const statusColor: Record<StatusPeticao, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  protocolado: 'bg-yellow-100 text-yellow-700',
  juntado: 'bg-green-100 text-green-700',
};

const emptyPeticao = (): Omit<Peticao, 'id' | 'criadoEm'> => ({
  nome: '', processoId: '', tipo: 'inicial', dataProtocolo: '', numeroProtocolo: '', status: 'rascunho', observacoes: '',
});

function PeticaoForm({ initial, onSave, onCancel }: {
  initial: Omit<Peticao, 'id' | 'criadoEm'>;
  onSave: (d: Omit<Peticao, 'id' | 'criadoEm'>) => void;
  onCancel: () => void;
}) {
  const { state } = useApp();
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Nome / Título *</Label>
          <Input className="mt-1 h-8 text-sm" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Petição Inicial" />
        </div>
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
          <Select value={form.tipo} onValueChange={v => set('tipo', v as TipoPeticao)}>
            <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => set('status', v as StatusPeticao)}>
            <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data de Protocolo</Label>
          <Input type="date" className="mt-1 h-8 text-sm" value={form.dataProtocolo || ''} onChange={e => set('dataProtocolo', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Nº de Protocolo</Label>
          <Input className="mt-1 h-8 text-sm" value={form.numeroProtocolo || ''} onChange={e => set('numeroProtocolo', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Observações</Label>
          <Textarea className="mt-1 text-sm" rows={2} value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700" onClick={() => {
          if (!form.nome || !form.processoId) { toast.error('Preencha nome e processo.'); return; }
          onSave(form);
        }}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

function ImportCSVPet({ onImport, onClose }: { onImport: (pets: Omit<Peticao, 'id' | 'criadoEm'>[]) => void; onClose: () => void }) {
  const { state } = useApp();
  const [preview, setPreview] = useState<Omit<Peticao, 'id' | 'criadoEm'>[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        const proc = state.processos.find(p => p.numero === obj.numero_processo || obj.numero_processo);
        return {
          nome: obj.nome || '', processoId: proc?.id || '', tipo: (obj.tipo || 'outro') as TipoPeticao,
          dataProtocolo: obj.data_protocolo || '', numeroProtocolo: obj.numero_protocolo || '',
          status: (obj.status || 'protocolado') as StatusPeticao, observacoes: obj.observacoes || '',
        };
      }).filter(r => r.nome);
      setPreview(rows);
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">Formato CSV:</p>
        <code>nome,numero_processo,tipo,data_protocolo,numero_protocolo,status,observacoes</code>
      </div>
      <Input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
      {preview.length > 0 && (
        <div className="border rounded max-h-48 overflow-y-auto text-xs divide-y">
          {preview.map((p, i) => <div key={i} className="px-3 py-2 flex items-center gap-2"><FileText size={12} className="text-gray-400" /><span className="font-medium">{p.nome}</span><Badge variant="outline" className="text-[10px] capitalize">{p.tipo}</Badge></div>)}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="bg-[#2563eb]" disabled={!preview.length} onClick={() => { onImport(preview); onClose(); }}>Importar ({preview.length})</Button>
      </DialogFooter>
    </div>
  );
}

export default function Peticoes() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPeticao, setEditPeticao] = useState<Peticao | null>(null);
  const [arquivarId, setArquivarId] = useState<string | null>(null);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const arquivadosCount = state.peticoes.filter(p => p.arquivado).length;

  const filtered = state.peticoes.filter(p => {
    if (mostrarArquivados ? !p.arquivado : !!p.arquivado) return false;
    const proc = state.processos.find(pr => pr.id === p.processoId);
    const matchSearch = !search || p.nome.toLowerCase().includes(search.toLowerCase()) || p.numeroProtocolo?.includes(search) || proc?.numero.includes(search);
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchTipo = filterTipo === 'todos' || p.tipo === filterTipo;
    return matchSearch && matchStatus && matchTipo;
  }).sort((a, b) => (b.dataProtocolo || '').localeCompare(a.dataProtocolo || ''));

  const arquivarPeticao = (id: string) => {
    const p = state.peticoes.find(x => x.id === id);
    if (p) dispatch({ type: 'UPDATE_PETICAO', payload: { ...p, arquivado: true } });
    toast.success('Petição arquivada.');
    setArquivarId(null);
  };
  const restaurarPeticao = (p: Peticao) => {
    dispatch({ type: 'UPDATE_PETICAO', payload: { ...p, arquivado: false } });
    toast.success('Petição restaurada.');
  };

  const handleSave = (data: Omit<Peticao, 'id' | 'criadoEm'>) => {
    if (editPeticao) {
      dispatch({ type: 'UPDATE_PETICAO', payload: { ...editPeticao, ...data } });
      toast.success('Petição atualizada!');
    } else {
      dispatch({ type: 'ADD_PETICAO', payload: { ...data, id: genId(), criadoEm: new Date().toISOString().split('T')[0] } });
      toast.success('Petição cadastrada!');
    }
    setDialogOpen(false);
    setEditPeticao(null);
  };

  const handleImport = (rows: Omit<Peticao, 'id' | 'criadoEm'>[]) => {
    const novas: Peticao[] = rows.map(r => ({ ...r, id: genId(), criadoEm: new Date().toISOString().split('T')[0] }));
    dispatch({ type: 'IMPORT_PETICOES', payload: novas });
    toast.success(`${novas.length} petições importadas!`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Petições e Documentos</h1>
          <p className="text-sm text-gray-500">
            {state.peticoes.length - arquivadosCount} ativa(s){arquivadosCount > 0 && ` · ${arquivadosCount} arquivada(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setImportOpen(true)}><Upload size={14} className="mr-1" />Importar CSV</Button>
          <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 text-xs" onClick={() => { setEditPeticao(null); setDialogOpen(true); }}><Plus size={14} className="mr-1" />Nova Petição</Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Nome, nº protocolo ou processo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos status</SelectItem>{STATUS_LIST.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="h-9 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos tipos</SelectItem>{TIPOS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant={mostrarArquivados ? 'default' : 'outline'} size="sm" className={`h-9 text-xs ${mostrarArquivados ? 'bg-slate-500 hover:bg-slate-600' : ''}`} onClick={() => setMostrarArquivados(v => !v)}>
          <Archive size={14} className="mr-1" /> {mostrarArquivados ? 'Ver ativas' : `Arquivadas${arquivadosCount ? ` (${arquivadosCount})` : ''}`}
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">Nenhuma petição encontrada.</p>}
        {filtered.map(pet => {
          const proc = state.processos.find(p => p.id === pet.processoId);
          const cli = proc ? state.clientes.find(c => c.id === proc.clienteId) : null;
          return (
            <Card key={pet.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#1e3a5f]">{pet.nome}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                        <span className="font-mono truncate max-w-48">{proc?.numero?.slice(0,20) || '—'}...</span>
                        {cli && <span>· {cli.nome.split(' ')[0]}</span>}
                        {pet.dataProtocolo && <span>· {pet.dataProtocolo}</span>}
                        {pet.numeroProtocolo && <span className="text-blue-600">#{pet.numeroProtocolo}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="capitalize text-[10px]">{pet.tipo}</Badge>
                    <Badge className={`${statusColor[pet.status]} capitalize text-[10px]`}>{pet.status}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditPeticao(pet); setDialogOpen(true); }}><Edit size={12} /></Button>
                    {pet.arquivado
                      ? <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" title="Restaurar" onClick={() => restaurarPeticao(pet)}><ArchiveRestore size={13} /></Button>
                      : <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" title="Arquivar" onClick={() => setArquivarId(pet.id)}><Archive size={13} /></Button>}
                  </div>
                </div>
                {pet.observacoes && <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1">{pet.observacoes}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-[#1e3a5f]">{editPeticao ? 'Editar Petição' : 'Nova Petição'}</DialogTitle></DialogHeader>
          <PeticaoForm initial={editPeticao ? { nome: editPeticao.nome, processoId: editPeticao.processoId, tipo: editPeticao.tipo, dataProtocolo: editPeticao.dataProtocolo, numeroProtocolo: editPeticao.numeroProtocolo, status: editPeticao.status, observacoes: editPeticao.observacoes } : emptyPeticao()} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditPeticao(null); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Importar Petições (CSV)</DialogTitle></DialogHeader>
          <ImportCSVPet onImport={handleImport} onClose={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!arquivarId} onOpenChange={() => setArquivarId(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Arquivar petição</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">A petição sai da lista ativa, mas <b>não é excluída</b> — você pode restaurá-la em "Arquivadas".</p>
          <DialogFooter><Button variant="outline" size="sm" onClick={() => setArquivarId(null)}>Cancelar</Button><Button size="sm" className="bg-slate-500 hover:bg-slate-600" onClick={() => arquivarId && arquivarPeticao(arquivarId)}>Arquivar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
