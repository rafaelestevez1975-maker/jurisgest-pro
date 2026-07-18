import { useState } from 'react';
import { useApp, genId } from '../context';
import { Cliente } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Archive, ArchiveRestore, Upload, User, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';

const emptyCliente = (): Omit<Cliente, 'id' | 'criadoEm'> => ({
  nome: '', tipo: 'PF', cpfCnpj: '', rg: '', email: '', telefone: '', celular: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', observacoes: '',
});

function ClienteForm({ initial, onSave, onCancel }: {
  initial: Omit<Cliente, 'id' | 'criadoEm'>;
  onSave: (data: Omit<Cliente, 'id' | 'criadoEm'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [loadingCep, setLoadingCep] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(f => ({ ...f, logradouro: d.logradouro, bairro: d.bairro, cidade: d.localidade, uf: d.uf }));
      }
    } catch {}
    setLoadingCep(false);
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!form.cpfCnpj.trim()) { toast.error('CPF/CNPJ é obrigatório'); return; }
    onSave(form);
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Tipo de pessoa</Label>
          <Select value={form.tipo} onValueChange={v => set('tipo', v as 'PF' | 'PJ')}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PF">Pessoa Física</SelectItem>
              <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Nome completo / Razão social *</Label>
          <Input className="mt-1 h-8 text-sm" value={form.nome} onChange={e => set('nome', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">{form.tipo === 'PF' ? 'CPF' : 'CNPJ'} *</Label>
          <Input className="mt-1 h-8 text-sm" value={form.cpfCnpj} onChange={e => set('cpfCnpj', e.target.value)} placeholder={form.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'} />
        </div>
        {form.tipo === 'PF' && (
          <div>
            <Label className="text-xs">RG</Label>
            <Input className="mt-1 h-8 text-sm" value={form.rg || ''} onChange={e => set('rg', e.target.value)} />
          </div>
        )}
        <div>
          <Label className="text-xs">Email *</Label>
          <Input className="mt-1 h-8 text-sm" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Celular *</Label>
          <Input className="mt-1 h-8 text-sm" value={form.celular} onChange={e => set('celular', e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <Label className="text-xs">Telefone</Label>
          <Input className="mt-1 h-8 text-sm" value={form.telefone || ''} onChange={e => set('telefone', e.target.value)} />
        </div>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Endereço</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">CEP</Label>
            <div className="flex gap-1 mt-1">
              <Input className="h-8 text-sm" value={form.cep || ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
              <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={buscarCep} disabled={loadingCep}>{loadingCep ? '...' : 'Buscar'}</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Logradouro</Label>
            <Input className="mt-1 h-8 text-sm" value={form.logradouro || ''} onChange={e => set('logradouro', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Número</Label>
            <Input className="mt-1 h-8 text-sm" value={form.numero || ''} onChange={e => set('numero', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Complemento</Label>
            <Input className="mt-1 h-8 text-sm" value={form.complemento || ''} onChange={e => set('complemento', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Bairro</Label>
            <Input className="mt-1 h-8 text-sm" value={form.bairro || ''} onChange={e => set('bairro', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Cidade</Label>
            <Input className="mt-1 h-8 text-sm" value={form.cidade || ''} onChange={e => set('cidade', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">UF</Label>
            <Input className="mt-1 h-8 text-sm" maxLength={2} value={form.uf || ''} onChange={e => set('uf', e.target.value.toUpperCase())} />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs">Observações</Label>
        <Textarea className="mt-1 text-sm" rows={2} value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
      </div>
      <DialogFooter className="pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700" onClick={handleSubmit}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

function ImportCSV({ onImport, onClose }: { onImport: (clientes: Omit<Cliente, 'id' | 'criadoEm'>[]) => void; onClose: () => void }) {
  const [preview, setPreview] = useState<Omit<Cliente, 'id' | 'criadoEm'>[]>([]);
  const [error, setError] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const rows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          return {
            nome: obj.nome || '', tipo: (obj.tipo?.toUpperCase() === 'PJ' ? 'PJ' : 'PF') as 'PF' | 'PJ',
            cpfCnpj: obj.cpf_cnpj || obj.cpfcnpj || obj.cpf || obj.cnpj || '',
            rg: obj.rg || '', email: obj.email || '', telefone: obj.telefone || '',
            celular: obj.celular || '', cep: obj.cep || '', logradouro: obj.logradouro || '',
            numero: obj.numero || '', complemento: obj.complemento || '', bairro: obj.bairro || '',
            cidade: obj.cidade || '', uf: obj.uf || '', observacoes: obj.observacoes || '',
          };
        }).filter(r => r.nome);
        setPreview(rows);
        setError('');
      } catch {
        setError('Erro ao processar o arquivo. Verifique o formato CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">Formato esperado do CSV:</p>
        <code className="block">nome,tipo,cpf_cnpj,email,celular,telefone,cep,logradouro,numero,bairro,cidade,uf</code>
        <p className="mt-1">A primeira linha deve conter os cabeçalhos.</p>
      </div>
      <Input type="file" accept=".csv,.txt" onChange={handleFile} className="text-sm" />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      {preview.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">{preview.length} registros encontrados:</p>
          <div className="border rounded max-h-48 overflow-y-auto text-xs">
            {preview.map((c, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 hover:bg-gray-50">
                <span className="font-medium">{c.nome}</span>
                <span className="text-gray-500">{c.cpfCnpj}</span>
                <Badge variant="outline" className="text-[10px] px-1">{c.tipo}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700" disabled={!preview.length} onClick={() => { onImport(preview); onClose(); }}>
          Importar {preview.length > 0 ? `(${preview.length})` : ''}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function Clientes() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [arquivarId, setArquivarId] = useState<string | null>(null);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [viewCliente, setViewCliente] = useState<Cliente | null>(null);

  const filtered = state.clientes.filter(c => {
    if (mostrarArquivados ? !c.arquivado : !!c.arquivado) return false;
    return c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cpfCnpj.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase());
  });
  const arquivadosCount = state.clientes.filter(c => c.arquivado).length;

  const handleSave = (data: Omit<Cliente, 'id' | 'criadoEm'>) => {
    if (editCliente) {
      dispatch({ type: 'UPDATE_CLIENTE', payload: { ...editCliente, ...data } });
      toast.success('Cliente atualizado!');
    } else {
      dispatch({ type: 'ADD_CLIENTE', payload: { ...data, id: genId(), criadoEm: new Date().toISOString().split('T')[0] } });
      toast.success('Cliente cadastrado!');
    }
    setDialogOpen(false);
    setEditCliente(null);
  };

  const handleArquivar = (id: string) => {
    const c = state.clientes.find(x => x.id === id);
    if (c) dispatch({ type: 'UPDATE_CLIENTE', payload: { ...c, arquivado: true } });
    toast.success('Cliente arquivado.');
    setArquivarId(null);
  };

  const handleRestaurar = (c: Cliente) => {
    dispatch({ type: 'UPDATE_CLIENTE', payload: { ...c, arquivado: false } });
    toast.success('Cliente restaurado.');
  };

  const handleImport = (rows: Omit<Cliente, 'id' | 'criadoEm'>[]) => {
    const novos: Cliente[] = rows.map(r => ({ ...r, id: genId(), criadoEm: new Date().toISOString().split('T')[0] }));
    dispatch({ type: 'IMPORT_CLIENTES', payload: novos });
    toast.success(`${novos.length} clientes importados!`);
  };

  const processosDoCliente = (clienteId: string) => state.processos.filter(p => p.clienteId === clienteId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Clientes</h1>
          <p className="text-sm text-gray-500">
            {state.clientes.length - arquivadosCount} ativo(s){arquivadosCount > 0 && ` · ${arquivadosCount} arquivado(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-1" /> Importar CSV
          </Button>
          <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 text-xs" onClick={() => { setEditCliente(null); setDialogOpen(true); }}>
            <Plus size={14} className="mr-1" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Buscar por nome, CPF/CNPJ ou email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={mostrarArquivados ? 'default' : 'outline'} size="sm" className={`h-9 text-xs ${mostrarArquivados ? 'bg-slate-500 hover:bg-slate-600' : ''}`} onClick={() => setMostrarArquivados(v => !v)}>
          <Archive size={14} className="mr-1" /> {mostrarArquivados ? 'Ver ativos' : `Arquivados${arquivadosCount ? ` (${arquivadosCount})` : ''}`}
        </Button>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">Nenhum cliente encontrado.</p>}
        {filtered.map(cliente => {
          const procs = processosDoCliente(cliente.id);
          return (
            <Card key={cliente.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewCliente(cliente)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      {cliente.tipo === 'PF' ? <User size={16} className="text-[#2563eb]" /> : <Building2 size={16} className="text-[#2563eb]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[#1e3a5f]">{cliente.nome}</p>
                      <p className="text-xs text-gray-500">{cliente.cpfCnpj}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} />{cliente.email}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{cliente.celular}</span>
                        {cliente.cidade && <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10} />{cliente.cidade}/{cliente.uf}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-[10px] px-1.5">{cliente.tipo}</Badge>
                    <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5"><FileText size={9} className="mr-0.5" />{procs.length}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setEditCliente(cliente); setDialogOpen(true); }}><Edit size={13} /></Button>
                    {cliente.arquivado
                      ? <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" title="Restaurar" onClick={e => { e.stopPropagation(); handleRestaurar(cliente); }}><ArchiveRestore size={13} /></Button>
                      : <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" title="Arquivar" onClick={e => { e.stopPropagation(); setArquivarId(cliente.id); }}><Archive size={13} /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">{editCliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>
          <ClienteForm
            initial={editCliente ? { nome: editCliente.nome, tipo: editCliente.tipo, cpfCnpj: editCliente.cpfCnpj, rg: editCliente.rg, email: editCliente.email, telefone: editCliente.telefone, celular: editCliente.celular, cep: editCliente.cep, logradouro: editCliente.logradouro, numero: editCliente.numero, complemento: editCliente.complemento, bairro: editCliente.bairro, cidade: editCliente.cidade, uf: editCliente.uf, observacoes: editCliente.observacoes } : emptyCliente()}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditCliente(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar */}
      <Dialog open={!!viewCliente} onOpenChange={() => setViewCliente(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f]">Ficha do Cliente</DialogTitle>
          </DialogHeader>
          {viewCliente && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  {viewCliente.tipo === 'PF' ? <User size={20} className="text-[#2563eb]" /> : <Building2 size={20} className="text-[#2563eb]" />}
                </div>
                <div>
                  <p className="font-bold text-[#1e3a5f]">{viewCliente.nome}</p>
                  <p className="text-xs text-gray-500">{viewCliente.cpfCnpj} · {viewCliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-400">Email:</span> <span className="font-medium">{viewCliente.email}</span></div>
                <div><span className="text-gray-400">Celular:</span> <span className="font-medium">{viewCliente.celular}</span></div>
                {viewCliente.telefone && <div><span className="text-gray-400">Tel:</span> <span className="font-medium">{viewCliente.telefone}</span></div>}
                {viewCliente.rg && <div><span className="text-gray-400">RG:</span> <span className="font-medium">{viewCliente.rg}</span></div>}
                {viewCliente.logradouro && <div className="col-span-2"><span className="text-gray-400">Endereço:</span> <span className="font-medium">{viewCliente.logradouro}, {viewCliente.numero} - {viewCliente.bairro}, {viewCliente.cidade}/{viewCliente.uf}</span></div>}
              </div>
              {viewCliente.observacoes && (
                <div className="bg-gray-50 rounded p-3 text-xs text-gray-600">{viewCliente.observacoes}</div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Processos ({processosDoCliente(viewCliente.id).length})</p>
                {processosDoCliente(viewCliente.id).length === 0
                  ? <p className="text-xs text-gray-400">Nenhum processo vinculado.</p>
                  : processosDoCliente(viewCliente.id).map(proc => (
                    <div key={proc.id} className="flex items-center justify-between border rounded p-2 mb-1.5 text-xs">
                      <span className="font-mono text-[11px] truncate flex-1">{proc.numero}</span>
                      <span className="ml-2 text-gray-500 capitalize">{proc.area}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] capitalize">{proc.status}</Badge>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Importar */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar Clientes (CSV)</DialogTitle></DialogHeader>
          <ImportCSV onImport={handleImport} onClose={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar arquivamento */}
      <Dialog open={!!arquivarId} onOpenChange={() => setArquivarId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Arquivar cliente</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">O cliente sai da lista ativa, mas <b>não é excluído</b> — você pode restaurá-lo a qualquer momento em "Arquivados". Os processos vinculados são mantidos.</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setArquivarId(null)}>Cancelar</Button>
            <Button size="sm" className="bg-slate-500 hover:bg-slate-600" onClick={() => arquivarId && handleArquivar(arquivarId)}>Arquivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
