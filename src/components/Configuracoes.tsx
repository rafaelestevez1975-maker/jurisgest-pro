import { useState } from 'react';
import { useApp, genId } from '../context';
import { Advogado, Feriado } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Building, Users, CalendarDays, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';

const TRIBUNAIS_CRED = ['TJSP','TJRJ','TJMG','TJRS','TJPR','TJSC','TRT15','TRF3','STJ','STF','DataJud/CNJ'];

export default function Configuracoes() {
  const { state, dispatch } = useApp();
  const [escritorio, setEscritorio] = useState(state.escritorio);
  const [novoAdv, setNovoAdv] = useState({ nome: '', oab: '', email: '' });
  const [novoFeriado, setNovoFeriado] = useState({ data: '', descricao: '' });
  const [deleteAdvId, setDeleteAdvId] = useState<string | null>(null);
  const [credEdit, setCredEdit] = useState<Record<string, { login: string; token: string }>>(
    Object.fromEntries(state.credenciais.map(c => [c.tribunal, { login: c.login, token: c.token }]))
  );

  const salvarEscritorio = () => {
    dispatch({ type: 'UPDATE_ESCRITORIO', payload: escritorio });
    toast.success('Dados do escritório salvos!');
  };

  const addAdvogado = () => {
    if (!novoAdv.nome || !novoAdv.oab) { toast.error('Nome e OAB são obrigatórios.'); return; }
    dispatch({ type: 'ADD_ADVOGADO', payload: { ...novoAdv, id: genId() } });
    setNovoAdv({ nome: '', oab: '', email: '' });
    toast.success('Advogado cadastrado!');
  };

  const addFeriado = () => {
    if (!novoFeriado.data || !novoFeriado.descricao) { toast.error('Data e descrição são obrigatórias.'); return; }
    dispatch({ type: 'ADD_FERIADO', payload: { ...novoFeriado, id: genId() } });
    setNovoFeriado({ data: '', descricao: '' });
    toast.success('Feriado adicionado!');
  };

  const salvarCredencial = (tribunal: string) => {
    const cred = credEdit[tribunal] || { login: '', token: '' };
    const existing = state.credenciais.find(c => c.tribunal === tribunal);
    if (existing) {
      dispatch({ type: 'UPDATE_CREDENCIAL', payload: { tribunal, ...cred } });
    } else {
      dispatch({ type: 'ADD_CREDENCIAL', payload: { tribunal, ...cred } });
    }
    toast.success(`Credencial do ${tribunal} salva!`);
  };

  const setCred = (tribunal: string, key: 'login' | 'token', value: string) => {
    setCredEdit(prev => ({ ...prev, [tribunal]: { ...(prev[tribunal] || { login: '', token: '' }), [key]: value } }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Configurações</h1>
        <p className="text-sm text-gray-500">Dados do escritório, advogados e integrações</p>
      </div>

      <Tabs defaultValue="escritorio">
        <TabsList className="text-xs h-9 flex-wrap">
          <TabsTrigger value="escritorio" className="text-xs"><Building size={12} className="mr-1" />Escritório</TabsTrigger>
          <TabsTrigger value="advogados" className="text-xs"><Users size={12} className="mr-1" />Advogados</TabsTrigger>
          <TabsTrigger value="feriados" className="text-xs"><CalendarDays size={12} className="mr-1" />Feriados</TabsTrigger>
          <TabsTrigger value="credenciais" className="text-xs"><Shield size={12} className="mr-1" />Tribunais</TabsTrigger>
        </TabsList>

        {/* Escritório */}
        <TabsContent value="escritorio" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-[#1e3a5f]">Dados do Escritório</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Nome do escritório</Label>
                  <Input className="mt-1 h-8 text-sm" value={escritorio.nome} onChange={e => setEscritorio(s => ({ ...s, nome: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">OAB principal</Label>
                  <Input className="mt-1 h-8 text-sm" value={escritorio.oab} onChange={e => setEscritorio(s => ({ ...s, oab: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Telefone</Label>
                  <Input className="mt-1 h-8 text-sm" value={escritorio.telefone} onChange={e => setEscritorio(s => ({ ...s, telefone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input className="mt-1 h-8 text-sm" value={escritorio.email} onChange={e => setEscritorio(s => ({ ...s, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Endereço</Label>
                  <Input className="mt-1 h-8 text-sm" value={escritorio.endereco} onChange={e => setEscritorio(s => ({ ...s, endereco: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 mt-2" onClick={salvarEscritorio}>
                <Save size={13} className="mr-1" />Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advogados */}
        <TabsContent value="advogados" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-[#1e3a5f]">Advogados Cadastrados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {state.advogados.map(adv => (
                <div key={adv.id} className="flex items-center justify-between border rounded p-3">
                  <div>
                    <p className="text-sm font-semibold">{adv.nome}</p>
                    <p className="text-xs text-gray-500">{adv.oab} · {adv.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteAdvId(adv.id)}><Trash2 size={13} /></Button>
                </div>
              ))}
              <div className="border rounded p-3 bg-blue-50 space-y-2">
                <p className="text-xs font-semibold text-[#1e3a5f]">Adicionar advogado</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Nome</Label><Input className="mt-1 h-8 text-sm" value={novoAdv.nome} onChange={e => setNovoAdv(a => ({ ...a, nome: e.target.value }))} /></div>
                  <div><Label className="text-xs">OAB</Label><Input className="mt-1 h-8 text-sm" value={novoAdv.oab} onChange={e => setNovoAdv(a => ({ ...a, oab: e.target.value }))} /></div>
                  <div className="col-span-2"><Label className="text-xs">Email</Label><Input className="mt-1 h-8 text-sm" value={novoAdv.email} onChange={e => setNovoAdv(a => ({ ...a, email: e.target.value }))} /></div>
                </div>
                <Button size="sm" className="bg-[#2563eb] h-8 text-xs" onClick={addAdvogado}><Plus size={12} className="mr-1" />Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!deleteAdvId} onOpenChange={() => setDeleteAdvId(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
              <p className="text-sm text-gray-600">Excluir este advogado?</p>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeleteAdvId(null)}>Cancelar</Button>
                <Button variant="destructive" size="sm" onClick={() => { if (deleteAdvId) { dispatch({ type: 'DELETE_ADVOGADO', payload: deleteAdvId }); setDeleteAdvId(null); toast.success('Advogado excluído.'); } }}>Excluir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Feriados */}
        <TabsContent value="feriados" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-[#1e3a5f]">Feriados Municipais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-500">Os feriados nacionais já estão incluídos automaticamente na contagem de dias úteis. Adicione aqui os feriados municipais da sua comarca.</p>
              {state.feriadosMunicipais.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">Nenhum feriado municipal cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {state.feriadosMunicipais.sort((a, b) => a.data.localeCompare(b.data)).map(f => (
                    <div key={f.id} className="flex items-center justify-between border rounded p-2 text-xs">
                      <span className="font-medium">{f.data}</span>
                      <span className="flex-1 ml-3 text-gray-600">{f.descricao}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => { dispatch({ type: 'DELETE_FERIADO', payload: f.id }); toast.success('Feriado removido.'); }}><Trash2 size={11} /></Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border rounded p-3 bg-blue-50 space-y-2">
                <p className="text-xs font-semibold text-[#1e3a5f]">Adicionar feriado</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Data</Label><Input type="date" className="mt-1 h-8 text-sm" value={novoFeriado.data} onChange={e => setNovoFeriado(f => ({ ...f, data: e.target.value }))} /></div>
                  <div><Label className="text-xs">Descrição</Label><Input className="mt-1 h-8 text-sm" value={novoFeriado.descricao} onChange={e => setNovoFeriado(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Aniversário da cidade" /></div>
                </div>
                <Button size="sm" className="bg-[#2563eb] h-8 text-xs" onClick={addFeriado}><Plus size={12} className="mr-1" />Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credenciais */}
        <TabsContent value="credenciais" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#1e3a5f]">Credenciais dos Tribunais</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Configure aqui os acessos para monitoramento automático de publicações.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {TRIBUNAIS_CRED.map(tribunal => {
                const cred = credEdit[tribunal] || { login: '', token: '' };
                return (
                  <div key={tribunal} className="border rounded p-3 space-y-2">
                    <p className="text-xs font-semibold text-[#1e3a5f]">{tribunal}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Login / CPF</Label><Input className="mt-1 h-8 text-sm" value={cred.login} onChange={e => setCred(tribunal, 'login', e.target.value)} /></div>
                      <div><Label className="text-xs">Senha / Token</Label><Input type="password" className="mt-1 h-8 text-sm" value={cred.token} onChange={e => setCred(tribunal, 'token', e.target.value)} /></div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => salvarCredencial(tribunal)}>
                      <Save size={11} className="mr-1" />Salvar
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
