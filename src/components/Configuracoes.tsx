import { useState } from 'react';
import { useApp, genId } from '../context';
import type { Advogado, AreaDireito, Feriado, PapelUsuario } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Building, Users, CalendarDays, Shield, Save, Brain, Eye, EyeOff, KeyRound, Loader2, Activity, Edit } from 'lucide-react';
import Atividades from './Atividades';
import { MultiSelect } from './Relatorios';
import { toast } from 'sonner';
import { db } from '../lib/db';

// Gera uma senha forte legível (sem caracteres ambíguos) para o admin copiar e repassar.
function gerarSenha(len = 12): string {
  const abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#%+=';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, n => abc[n % abc.length]).join('');
}

const TRIBUNAIS_CRED = ['TJSP','TJRJ','TJMG','TJRS','TJPR','TJSC','TRT15','TRF3','STJ','STF','DataJud/CNJ'];
const AREAS: AreaDireito[] = ['cível','trabalhista','criminal','previdenciário','família','tributário','empresarial','administrativo','procon','outro'];
const AREA_OPTS = AREAS.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }));

function AreaChips({ selected, onToggle }: { selected: AreaDireito[]; onToggle: (a: AreaDireito) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {AREAS.map(a => {
        const on = selected.includes(a);
        return (
          <button key={a} type="button" onClick={() => onToggle(a)}
            style={on ? { backgroundColor: '#1e3a5f', color: '#fff', borderColor: '#1e3a5f' } : undefined}
            className={`text-[11px] capitalize px-2 py-0.5 rounded-full border transition-colors ${on ? '' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            {a}
          </button>
        );
      })}
    </div>
  );
}

export default function Configuracoes() {
  const { state, dispatch, reload } = useApp();
  const [escritorio, setEscritorio] = useState(state.escritorio);
  const [novoAdv, setNovoAdv] = useState<{ nome: string; oab: string; email: string; papel: PapelUsuario; areas: AreaDireito[]; password: string }>({ nome: '', oab: '', email: '', papel: 'advogado', areas: [], password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  // Redefinição de senha de um usuário existente
  const [resetFor, setResetFor] = useState<Advogado | null>(null);
  const [resetPwd, setResetPwd] = useState('');
  const [resetting, setResetting] = useState(false);
  const [novoFeriado, setNovoFeriado] = useState({ data: '', descricao: '' });
  // Edição de dados do usuário (nome/OAB/e-mail)
  const [editAdvId, setEditAdvId] = useState<string | null>(null);
  const [editAdv, setEditAdv] = useState<{ nome: string; oab: string; email: string }>({ nome: '', oab: '', email: '' });
  const abrirEditAdv = (adv: Advogado) => { setEditAdvId(adv.id); setEditAdv({ nome: adv.nome, oab: adv.oab || '', email: adv.email || '' }); };
  const salvarEditAdv = (adv: Advogado) => {
    if (!editAdv.nome.trim()) { toast.error('Informe o nome.'); return; }
    dispatch({ type: 'UPDATE_ADVOGADO', payload: { ...adv, nome: editAdv.nome.trim(), oab: editAdv.oab.trim(), email: editAdv.email.trim().toLowerCase() } });
    setEditAdvId(null);
    toast.success('Usuário atualizado.');
  };
  const setAtivoAdv = (adv: Advogado, ativo: boolean) => {
    dispatch({ type: 'UPDATE_ADVOGADO', payload: { ...adv, ativo } });
    toast.success(ativo ? 'Acesso reativado.' : 'Acesso inativado (o usuário não é excluído).');
  };
  const [credEdit, setCredEdit] = useState<Record<string, { login: string; token: string }>>(
    Object.fromEntries(state.credenciais.map(c => [c.tribunal, { login: c.login, token: c.token }]))
  );
  const [anthropicKey, setAnthropicKey] = useState(state.anthropicApiKey || '');
  const [showKey, setShowKey] = useState(false);

  const salvarEscritorio = () => {
    dispatch({ type: 'UPDATE_ESCRITORIO', payload: escritorio });
    toast.success('Dados do escritório salvos!');
  };

  const addAdvogado = async () => {
    if (!novoAdv.nome.trim()) { toast.error('Informe o nome.'); return; }
    if (!novoAdv.email.trim()) { toast.error('Informe o e-mail (será o login do usuário).'); return; }
    if (novoAdv.password.length < 6) { toast.error('Defina uma senha com ao menos 6 caracteres.'); return; }
    setSavingUser(true);
    const { data, error } = await db.gerenciarUsuario({
      action: 'criar',
      email: novoAdv.email.trim().toLowerCase(),
      password: novoAdv.password,
      nome: novoAdv.nome.trim(),
      oab: novoAdv.oab.trim(),
      papel: novoAdv.papel,
      areas: novoAdv.areas,
    });
    setSavingUser(false);
    const msg = error?.message || data?.error;
    if (msg) { toast.error('Não foi possível criar o usuário: ' + msg); return; }
    toast.success(data?.jaExistia
      ? 'A conta de e-mail já existia no sistema — acesso e perfil concedidos (senha mantida).'
      : 'Usuário e login criados! Repasse o e-mail e a senha à pessoa.');
    setNovoAdv({ nome: '', oab: '', email: '', papel: 'advogado', areas: [], password: '' });
    setShowPwd(false);
    await reload();
  };

  const redefinirSenha = async () => {
    if (!resetFor) return;
    if (resetPwd.length < 6) { toast.error('A senha deve ter ao menos 6 caracteres.'); return; }
    setResetting(true);
    const { data, error } = await db.gerenciarUsuario({ action: 'senha', email: resetFor.email, password: resetPwd });
    setResetting(false);
    const msg = error?.message || data?.error;
    if (msg) { toast.error('Não foi possível redefinir a senha: ' + msg); return; }
    toast.success('Senha redefinida! Repasse a nova senha ao usuário.');
    setResetFor(null); setResetPwd('');
  };

  const setAreasAdv = (adv: Advogado, areas: AreaDireito[]) => {
    dispatch({ type: 'UPDATE_ADVOGADO', payload: { ...adv, areas } });
  };

  const setPapelAdv = (adv: Advogado, papel: PapelUsuario) => {
    dispatch({ type: 'UPDATE_ADVOGADO', payload: { ...adv, papel } });
  };

  const PAPEL_LABEL: Record<PapelUsuario, string> = { admin: 'Administrador', advogado: 'Advogado (edita)', operacao: 'Operação', visualizador: 'Visualização (só lê)' };

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
          <TabsTrigger value="advogados" className="text-xs"><Users size={12} className="mr-1" />Usuários</TabsTrigger>
          <TabsTrigger value="feriados" className="text-xs"><CalendarDays size={12} className="mr-1" />Feriados</TabsTrigger>
          <TabsTrigger value="credenciais" className="text-xs"><Shield size={12} className="mr-1" />Tribunais</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs"><Brain size={12} className="mr-1" />Integrações IA</TabsTrigger>
          <TabsTrigger value="atividades" className="text-xs"><Activity size={12} className="mr-1" />Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="atividades" className="mt-4">
          <Atividades />
        </TabsContent>

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
              <Button size="sm" variant="success" className="mt-2" onClick={salvarEscritorio}>
                <Save size={13} className="mr-1" />Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advogados */}
        <TabsContent value="advogados" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-[#1e3a5f]">Usuários e permissões</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-[11px] text-gray-500 bg-blue-50 border border-blue-100 rounded p-2.5 leading-relaxed">
                O <b>login (e-mail + senha) é criado aqui mesmo</b> e fica guardado com segurança no Supabase — não precisa abrir nenhum painel externo. Ao adicionar, informe e-mail e senha e repasse à pessoa; ela poderá entrar imediatamente. Use <b>Redefinir senha</b> para trocar depois.
                <br /><b>Administrador</b>: faz tudo, inclusive Configurações. <b>Advogado</b>: edita, mas só enxerga as áreas marcadas. <b>Visualização</b>: enxerga as mesmas áreas, porém <b>somente leitura</b>.
              </div>
              {state.advogados.map(adv => {
                const papel = adv.papel || 'advogado';
                const inativo = adv.ativo === false;
                return (
                <div key={adv.id} className={`border rounded p-3 ${inativo ? 'bg-gray-50 opacity-80' : ''}`}>
                  {editAdvId === adv.id ? (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-[#1e3a5f]">Editar usuário</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">Nome</Label><Input className="mt-1 h-8 text-sm" value={editAdv.nome} onChange={e => setEditAdv(a => ({ ...a, nome: e.target.value }))} /></div>
                        <div><Label className="text-xs">OAB</Label><Input className="mt-1 h-8 text-sm" value={editAdv.oab} onChange={e => setEditAdv(a => ({ ...a, oab: e.target.value }))} /></div>
                      </div>
                      <div><Label className="text-xs">E-mail de login</Label><Input type="email" className="mt-1 h-8 text-sm" value={editAdv.email} onChange={e => setEditAdv(a => ({ ...a, email: e.target.value }))} /></div>
                      <div className="flex gap-2"><Button size="sm" variant="success" className="h-7 text-xs" onClick={() => salvarEditAdv(adv)}>Salvar</Button><Button size="sm" variant="cancel" className="h-7 text-xs" onClick={() => setEditAdvId(null)}>Cancelar</Button></div>
                    </div>
                  ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                        <span className={inativo ? 'line-through text-gray-400' : ''}>{adv.nome}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${papel === 'admin' ? 'bg-[#1e3a5f] text-white' : papel === 'visualizador' ? 'bg-amber-100 text-amber-700' : papel === 'operacao' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{PAPEL_LABEL[papel]}</span>
                        {inativo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">inativo</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{adv.oab}{adv.email ? ` · ${adv.email}` : ' · sem e-mail (perfil não será reconhecido no login)'}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#2563eb]" title="Editar dados do usuário" onClick={() => abrirEditAdv(adv)}><Edit size={13} /></Button>
                      {adv.email && (
                        <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" onClick={() => { setResetFor(adv); setResetPwd(''); }}>
                          <KeyRound size={12} className="mr-1" />Redefinir senha
                        </Button>
                      )}
                      {inativo
                        ? <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-green-600 hover:text-green-700" onClick={() => setAtivoAdv(adv, true)}>Reativar</Button>
                        : <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-amber-600 hover:text-amber-700" title="Inativar acesso (o usuário não é excluído)" onClick={() => setAtivoAdv(adv, false)}>Inativar</Button>}
                    </div>
                  </div>
                  )}
                  <div className="mt-2 grid sm:grid-cols-[180px_1fr] gap-3">
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1">Perfil de acesso</p>
                      <Select value={papel} onValueChange={(v) => setPapelAdv(adv, v as PapelUsuario)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin" className="text-xs">Administrador</SelectItem>
                          <SelectItem value="advogado" className="text-xs">Advogado (edita)</SelectItem>
                          <SelectItem value="operacao" className="text-xs">Operação (anexa, cumpre tarefas)</SelectItem>
                          <SelectItem value="visualizador" className="text-xs">Visualização (só lê)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1">Áreas visíveis <span className="text-gray-300 normal-case">{papel === 'admin' ? '(admin vê todas)' : '(sem marcar = vê todas)'}</span></p>
                      <div className={papel === 'admin' ? 'opacity-40 pointer-events-none' : ''}>
                        <MultiSelect label="Áreas" options={AREA_OPTS} selected={adv.areas || []} onChange={s => setAreasAdv(adv, s as AreaDireito[])} width="w-full" emptyLabel="Todas as áreas" />
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
              <div className="border rounded p-3 bg-blue-50 space-y-2">
                <p className="text-xs font-semibold text-[#1e3a5f]">Adicionar usuário</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Nome</Label><Input className="mt-1 h-8 text-sm" value={novoAdv.nome} onChange={e => setNovoAdv(a => ({ ...a, nome: e.target.value }))} /></div>
                  <div>
                    <Label className="text-xs">Perfil de acesso</Label>
                    <Select value={novoAdv.papel} onValueChange={(v) => setNovoAdv(a => ({ ...a, papel: v as PapelUsuario }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin" className="text-xs">Administrador</SelectItem>
                        <SelectItem value="advogado" className="text-xs">Advogado (edita)</SelectItem>
                        <SelectItem value="operacao" className="text-xs">Operação (anexa, cumpre tarefas)</SelectItem>
                        <SelectItem value="visualizador" className="text-xs">Visualização (só lê)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">OAB <span className="text-gray-400">(opcional)</span></Label><Input className="mt-1 h-8 text-sm" value={novoAdv.oab} onChange={e => setNovoAdv(a => ({ ...a, oab: e.target.value }))} /></div>
                  <div><Label className="text-xs">E-mail de login</Label><Input type="email" className="mt-1 h-8 text-sm" placeholder="pessoa@email.com" value={novoAdv.email} onChange={e => setNovoAdv(a => ({ ...a, email: e.target.value }))} /></div>
                  <div className="col-span-2">
                    <Label className="text-xs">Senha de acesso</Label>
                    <div className="flex gap-1 mt-1">
                      <div className="relative flex-1">
                        <Input type={showPwd ? 'text' : 'password'} className="h-8 text-sm pr-8" placeholder="mín. 6 caracteres" value={novoAdv.password} onChange={e => setNovoAdv(a => ({ ...a, password: e.target.value }))} />
                        <button type="button" className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd(s => !s)}>{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-[11px] px-2" onClick={() => { setNovoAdv(a => ({ ...a, password: gerarSenha() })); setShowPwd(true); }}>Gerar</Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Áreas visíveis <span className="text-gray-400">(sem marcar = vê todas)</span></Label>
                    <div className="mt-1"><MultiSelect label="Áreas" options={AREA_OPTS} selected={novoAdv.areas} onChange={s => setNovoAdv(prev => ({ ...prev, areas: s as AreaDireito[] }))} width="w-full" emptyLabel="Todas as áreas" /></div>
                  </div>
                </div>
                <Button size="sm" variant="success" className="h-8 text-xs" onClick={addAdvogado} disabled={savingUser}>
                  {savingUser ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Plus size={12} className="mr-1" />}
                  {savingUser ? 'Criando login...' : 'Adicionar usuário'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!resetFor} onOpenChange={(o) => { if (!o) { setResetFor(null); setResetPwd(''); } }}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader>
              <p className="text-xs text-gray-500 -mt-1">Nova senha de <b>{resetFor?.nome}</b> <span className="text-gray-400">({resetFor?.email})</span>. Repasse-a à pessoa após salvar.</p>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input type={showPwd ? 'text' : 'password'} className="h-9 text-sm pr-8" placeholder="mín. 6 caracteres" value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
                  <button type="button" className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd(s => !s)}>{showPwd ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                </div>
                <Button type="button" size="sm" variant="outline" className="h-9 text-[11px] px-2" onClick={() => { setResetPwd(gerarSenha()); setShowPwd(true); }}>Gerar</Button>
              </div>
              <DialogFooter>
                <Button variant="cancel" size="sm" onClick={() => { setResetFor(null); setResetPwd(''); }}>Cancelar</Button>
                <Button size="sm" variant="success" onClick={redefinirSenha} disabled={resetting}>
                  {resetting ? <Loader2 size={13} className="mr-1 animate-spin" /> : <KeyRound size={13} className="mr-1" />}Salvar senha
                </Button>
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
                  {[...state.feriadosMunicipais].sort((a, b) => Number(a.ativo === false) - Number(b.ativo === false) || a.data.localeCompare(b.data)).map(f => {
                    const inativo = f.ativo === false;
                    return (
                    <div key={f.id} className={`flex items-center justify-between border rounded p-2 text-xs ${inativo ? 'bg-gray-50 opacity-75' : ''}`}>
                      <span className={`font-medium ${inativo ? 'line-through text-gray-400' : ''}`}>{f.data}</span>
                      <span className={`flex-1 ml-3 ${inativo ? 'line-through text-gray-400' : 'text-gray-600'}`}>{f.descricao}</span>
                      {inativo
                        ? <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-green-600 hover:text-green-700" onClick={() => { dispatch({ type: 'UPDATE_FERIADO', payload: { ...f, ativo: true } }); toast.success('Feriado reativado.'); }}>Reativar</Button>
                        : <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-amber-600 hover:text-amber-700" title="Inativar (não é excluído; deixa de contar no cálculo)" onClick={() => { dispatch({ type: 'UPDATE_FERIADO', payload: { ...f, ativo: false } }); toast.success('Feriado inativado.'); }}>Inativar</Button>}
                    </div>
                    );
                  })}
                </div>
              )}
              <div className="border rounded p-3 bg-blue-50 space-y-2">
                <p className="text-xs font-semibold text-[#1e3a5f]">Adicionar feriado</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Data</Label><Input type="date" className="mt-1 h-8 text-sm" value={novoFeriado.data} onChange={e => setNovoFeriado(f => ({ ...f, data: e.target.value }))} /></div>
                  <div><Label className="text-xs">Descrição</Label><Input className="mt-1 h-8 text-sm" value={novoFeriado.descricao} onChange={e => setNovoFeriado(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Aniversário da cidade" /></div>
                </div>
                <Button size="sm" variant="success" className="h-8 text-xs" onClick={addFeriado}><Plus size={12} className="mr-1" />Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrações IA */}
        <TabsContent value="ia" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#1e3a5f] flex items-center gap-2"><Brain size={14} />Anthropic Claude API</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Necessária para análise de imagens (prints de tela) e extração inteligente de texto de qualquer sistema jurídico. Usada no módulo <strong>Processos → Importar com IA</strong>.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Como obter sua chave API gratuita:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Acesse <strong>console.anthropic.com</strong> e crie uma conta</li>
                  <li>Vá em <strong>API Keys</strong> e clique em <strong>Create Key</strong></li>
                  <li>Copie a chave (começa com <code className="bg-blue-100 px-1 rounded">sk-ant-</code>) e cole abaixo</li>
                </ol>
                <p className="mt-1 text-blue-600">A chave é armazenada apenas localmente neste navegador, nunca enviada a terceiros.</p>
              </div>
              <div>
                <Label className="text-xs font-semibold">Chave API Anthropic</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      className="h-9 text-sm font-mono pr-10"
                      type={showKey ? 'text' : 'password'}
                      placeholder="sk-ant-api03-..."
                      value={anthropicKey}
                      onChange={e => setAnthropicKey(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowKey(s => !s)}
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="success"
                    className="h-9 text-xs"
                    onClick={() => {
                      dispatch({ type: 'SET_ANTHROPIC_KEY', payload: anthropicKey.trim() });
                      toast.success(anthropicKey.trim() ? 'Chave API salva!' : 'Chave API removida.');
                    }}
                  >
                    <Save size={13} className="mr-1" />Salvar
                  </Button>
                </div>
                {state.anthropicApiKey && (
                  <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Chave configurada — análise de imagens e texto com IA ativa
                  </p>
                )}
              </div>
              <div className="border rounded p-3 bg-gray-50 text-xs space-y-2">
                <p className="font-semibold text-gray-700">Recursos habilitados com a chave API:</p>
                <ul className="space-y-1 text-gray-600">
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span><strong>Análise de imagens</strong> — upload de prints de tela do PJe, e-SAJ, Integra, Projudi, DJe e qualquer outro sistema</span></li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span><strong>Extração inteligente de texto</strong> — cole texto de qualquer sistema e a IA identifica número, partes, tribunal, valor e data</span></li>
                  <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span><strong>Complementação DataJud</strong> — após extrair o número do processo, busca dados públicos adicionais automaticamente</span></li>
                </ul>
                <p className="text-gray-400 mt-2">Sem a chave, apenas a extração básica por padrões (regex) está disponível para texto.</p>
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
                    <Button size="sm" variant="success" className="h-7 text-xs" onClick={() => salvarCredencial(tribunal)}>
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
