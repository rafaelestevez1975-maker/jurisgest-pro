import { useState, useEffect } from 'react';
import { useApp } from '../context';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Bot, Play, Loader2, CheckCircle2, AlertTriangle, Clock, Search, Key,
  Eye, EyeOff, Scale, Globe, Info, Gavel, Users as UsersIcon, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const REGEX_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

interface RoboConfig {
  id: string;
  ativo: boolean;
  criar_publicacoes: boolean;
  escavador_token: string;
  ultima_execucao: string | null;
}
interface Sincronizacao {
  id: string; executado_em: string; tipo: string; status: string;
  processos_verificados: number; novos_andamentos: number;
  novas_publicacoes: number; erros: number; duracao_ms: number | null;
}
interface ParteMonitorada {
  id: string; nome: string; tipo: string; documento: string;
  categoria: string; oab: string;
  cliente_id: string | null; ativo: boolean;
  ultima_busca: string | null; processos_encontrados: number;
}

const statusBadge: Record<string, string> = {
  sucesso: 'bg-green-100 text-green-700',
  parcial: 'bg-amber-100 text-amber-700',
  erro: 'bg-red-100 text-red-700',
  em_andamento: 'bg-blue-100 text-blue-700',
};

function fmtData(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Monitoramento() {
  const { state, reload } = useApp();
  const [config, setConfig] = useState<RoboConfig | null>(null);
  const [historico, setHistorico] = useState<Sincronizacao[]>([]);
  const [partes, setPartes] = useState<ParteMonitorada[]>([]);
  const [running, setRunning] = useState(false);
  const [buscandoId, setBuscandoId] = useState<string | null>(null);
  const [tokenLocal, setTokenLocal] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [salvandoToken, setSalvandoToken] = useState(false);
  // formulários de cadastro
  const [procNome, setProcNome] = useState('');
  const [procOab, setProcOab] = useState('');
  const [cliNome, setCliNome] = useState('');
  const [cliDoc, setCliDoc] = useState('');

  const carregar = async () => {
    const [{ data: cfg }, { data: hist }, { data: pts }] = await Promise.all([
      supabase.from('robo_config').select('*').limit(1),
      supabase.from('sincronizacoes').select('*').order('executado_em', { ascending: false }).limit(10),
      supabase.from('partes_monitoradas').select('*').order('nome'),
    ]);
    if (cfg?.[0]) { setConfig(cfg[0] as RoboConfig); setTokenLocal((cfg[0] as RoboConfig).escavador_token || ''); }
    setHistorico((hist || []) as Sincronizacao[]);
    setPartes((pts || []) as ParteMonitorada[]);
  };

  useEffect(() => { carregar(); }, []);

  const elegiveis = state.processos.filter(p => REGEX_CNJ.test(p.numero)).length;
  const totalAndamentos = state.processos.reduce((acc, p) => acc + (p.movimentacoes?.length || 0), 0);

  const atualizarConfig = async (patch: Partial<RoboConfig>) => {
    if (!config) return;
    const novo = { ...config, ...patch };
    setConfig(novo);
    await supabase.from('robo_config').update(patch).eq('id', config.id);
  };

  const salvarToken = async () => {
    if (!config) return;
    setSalvandoToken(true);
    await supabase.from('robo_config').update({ escavador_token: tokenLocal.trim() }).eq('id', config.id);
    setConfig({ ...config, escavador_token: tokenLocal.trim() });
    setSalvandoToken(false);
    toast.success('Token salvo.');
  };

  const executarRobo = async () => {
    setRunning(true);
    toast.info('Consultando os tribunais no DataJud… pode levar 1–2 minutos.');
    try {
      const { data, error } = await supabase.functions.invoke('robo-tribunais', { body: { tipo: 'manual' } });
      if (error) throw error;
      toast.success(`${data.novos_andamentos} andamento(s) novo(s) em ${data.processos_verificados} processo(s).`);
      await Promise.all([carregar(), reload()]);
    } catch (e) {
      toast.error('Falha ao executar o robô: ' + ((e as Error)?.message || e));
    }
    setRunning(false);
  };

  const buscarParte = async (parte: ParteMonitorada) => {
    setBuscandoId(parte.id);
    try {
      const { data, error } = await supabase.functions.invoke('busca-nacional', { body: { parte_id: parte.id } });
      if (error) throw error;
      if (data?.erro) {
        toast.error(data.mensagem || 'Não foi possível buscar.');
      } else {
        toast.success(`${parte.nome}: ${data.total_encontrados} processo(s) encontrado(s), ${data.novos_cadastrados} novo(s) cadastrado(s).`);
        await Promise.all([carregar(), reload()]);
      }
    } catch (e) {
      toast.error('Falha na busca: ' + ((e as Error)?.message || e));
    }
    setBuscandoId(null);
  };

  const procuradores = partes.filter(p => p.categoria === 'procurador');
  const clientesMonit = partes.filter(p => p.categoria !== 'procurador');

  const addProcurador = async () => {
    const nome = procNome.trim();
    if (!nome && !procOab.trim()) { toast.error('Informe o nome ou a OAB do procurador.'); return; }
    const { error } = await supabase.from('partes_monitoradas').insert({
      nome: nome || `OAB ${procOab.trim()}`, categoria: 'procurador', tipo: 'PF', oab: procOab.trim(),
    });
    if (error) { toast.error('Erro ao cadastrar: ' + error.message); return; }
    setProcNome(''); setProcOab(''); toast.success('Procurador cadastrado.'); carregar();
  };

  const addCliente = async () => {
    const nome = cliNome.trim();
    if (!nome) { toast.error('Informe o nome do cliente.'); return; }
    const ehPJ = /\b(ltda|s\/a|s\.?a\.?|eireli|me|epp|associa|empresa|cia|company)\b/i.test(nome);
    const { error } = await supabase.from('partes_monitoradas').insert({
      nome, categoria: 'parte', tipo: ehPJ ? 'PJ' : 'PF', documento: cliDoc.trim(),
    });
    if (error) { toast.error('Erro ao cadastrar: ' + error.message); return; }
    setCliNome(''); setCliDoc(''); toast.success('Cliente cadastrado para monitoramento.'); carregar();
  };

  const remover = async (id: string) => {
    await supabase.from('partes_monitoradas').delete().eq('id', id);
    carregar();
  };

  const temToken = !!(config?.escavador_token || '').trim();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Monitoramento &amp; Robôs</h1>
        <p className="text-sm text-gray-500">Captura automática de andamentos e busca de processos por nome</p>
      </div>

      {/* ─── Robô de Andamentos (DataJud) ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <Bot size={18} className="text-blue-600" /> Robô de Andamentos (DataJud / CNJ)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded p-2.5">
            <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p>Consulta a API pública do CNJ e cadastra automaticamente os novos andamentos de cada processo. Roda a cada 6&nbsp;horas quando ativado. O DataJud é gratuito, porém lento e com limite de requisições — por isso cada execução processa um lote (os processos há mais tempo sem verificação).</p>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-800">Robô ativo (execução automática a cada 6h)</p>
              <p className="text-xs text-gray-500">Última execução: {fmtData(config?.ultima_execucao ?? null)}</p>
            </div>
            <Switch checked={!!config?.ativo} onCheckedChange={v => atualizarConfig({ ativo: v })} />
          </div>

          <div className="flex items-center justify-between py-1 border-t">
            <div>
              <p className="text-sm font-medium text-gray-800">Gerar publicações dos andamentos recentes</p>
              <p className="text-xs text-gray-500">Cria uma publicação "não lida" para andamentos dos últimos 3 dias</p>
            </div>
            <Switch checked={!!config?.criar_publicacoes} onCheckedChange={v => atualizarConfig({ criar_publicacoes: v })} />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="bg-gray-50 rounded p-3 text-center">
              <p className="text-2xl font-bold text-[#1e3a5f]">{elegiveis}</p>
              <p className="text-xs text-gray-500 mt-0.5">Processos monitoráveis</p>
            </div>
            <div className="bg-gray-50 rounded p-3 text-center">
              <p className="text-2xl font-bold text-[#1e3a5f]">{totalAndamentos}</p>
              <p className="text-xs text-gray-500 mt-0.5">Andamentos capturados</p>
            </div>
            <div className="bg-gray-50 rounded p-3 text-center flex flex-col items-center justify-center">
              <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 text-xs w-full" onClick={executarRobo} disabled={running}>
                {running ? <Loader2 size={14} className="animate-spin mr-1" /> : <Play size={14} className="mr-1" />}
                Executar agora
              </Button>
              <p className="text-[10px] text-gray-400 mt-1">consulta manual imediata</p>
            </div>
          </div>

          {/* Histórico */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1"><Clock size={12} /> Histórico de execuções</p>
            {historico.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">Nenhuma execução ainda. Clique em "Executar agora".</p>
            ) : (
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="p-2">Quando</th><th className="p-2">Tipo</th><th className="p-2">Status</th>
                      <th className="p-2 text-center">Verif.</th><th className="p-2 text-center">Andamentos</th>
                      <th className="p-2 text-center">Public.</th><th className="p-2 text-center">Erros</th><th className="p-2 text-center">Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map(h => (
                      <tr key={h.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{fmtData(h.executado_em)}</td>
                        <td className="p-2 capitalize">{h.tipo}</td>
                        <td className="p-2"><Badge className={`${statusBadge[h.status] || 'bg-gray-100 text-gray-600'} text-[10px] capitalize`}>{h.status}</Badge></td>
                        <td className="p-2 text-center">{h.processos_verificados}</td>
                        <td className="p-2 text-center font-medium text-green-700">{h.novos_andamentos > 0 ? `+${h.novos_andamentos}` : '0'}</td>
                        <td className="p-2 text-center">{h.novas_publicacoes || 0}</td>
                        <td className="p-2 text-center">{h.erros > 0 ? <span className="text-red-600">{h.erros}</span> : '0'}</td>
                        <td className="p-2 text-center text-gray-400">{h.duracao_ms ? `${Math.round(h.duracao_ms / 1000)}s` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Busca Nacional por Nome ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
            <Globe size={18} className="text-blue-600" /> Busca Nacional de Processos por Nome
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2.5">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p><b>Importante:</b> o DataJud gratuito do CNJ <b>não</b> indexa nomes (nem de partes nem de advogados) — só busca por número. Para localizar processos e publicações por <b>nome do procurador/OAB</b> ou por <b>nome do cliente</b> em todo o Brasil é preciso um provedor pago que indexa esses dados (ex.: <b>Escavador</b>, com crédito grátis de teste). Cole o token abaixo para ativar. Os processos encontrados são cadastrados automaticamente e passam a ser monitorados pelo robô do DataJud.</p>
          </div>

          {/* Token */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Key size={12} /> Token do Escavador (API)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showToken ? 'text' : 'password'}
                  className="h-9 text-sm pr-9"
                  placeholder="Cole aqui o token da API do Escavador…"
                  value={tokenLocal}
                  onChange={e => setTokenLocal(e.target.value)}
                />
                <button type="button" className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600" onClick={() => setShowToken(s => !s)}>
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Button size="sm" className="h-9 bg-[#2563eb] hover:bg-blue-700 text-xs" onClick={salvarToken} disabled={salvandoToken}>
                {salvandoToken ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {temToken
                ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={11} /> Token configurado — busca nacional ativada</span>
                : <span className="text-gray-400">Sem token — a busca por nome está indisponível até configurar um provedor</span>}
            </div>
          </div>

          {/* ── Procuradores (meu nome / OAB) ── */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><Gavel size={13} className="text-[#1e3a5f]" /> Procuradores — monitorar por MEU nome / OAB</p>
            <p className="text-[11px] text-gray-400 mb-2">Localiza os processos e publicações em que você atua como advogado, em todos os tribunais.</p>
            <div className="border rounded divide-y">
              {procuradores.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800">{p.nome}{p.oab && <span className="text-xs text-gray-400 ml-1">OAB {p.oab}</span>}</div>
                    <p className="text-xs text-gray-500">Última busca: {fmtData(p.ultima_busca)}{p.processos_encontrados > 0 && ` · ${p.processos_encontrados} encontrado(s)`}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => buscarParte(p)} disabled={buscandoId === p.id || !temToken}>
                      {buscandoId === p.id ? <Loader2 size={13} className="animate-spin mr-1" /> : <Search size={13} className="mr-1" />}
                      Buscar
                    </Button>
                    <button className="text-gray-300 hover:text-red-500 p-1" onClick={() => remover(p.id)} title="Remover"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 p-2 bg-gray-50">
                <Input className="h-8 text-xs flex-1" placeholder="Nome do advogado" value={procNome} onChange={e => setProcNome(e.target.value)} />
                <Input className="h-8 text-xs w-32" placeholder="OAB (ex: 12345/RS)" value={procOab} onChange={e => setProcOab(e.target.value)} />
                <Button size="sm" className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#2563eb]" onClick={addProcurador}><Plus size={13} className="mr-1" /> Adicionar</Button>
              </div>
            </div>
          </div>

          {/* ── Clientes monitorados por nome ── */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><UsersIcon size={13} className="text-[#1e3a5f]" /> Clientes monitorados por nome</p>
            <p className="text-[11px] text-gray-400 mb-2">Descobre processos pelo nome do cliente. Processos que já estão sob o seu nome de procurador são ignorados (sem repetição).</p>
            <div className="border rounded divide-y">
              {clientesMonit.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 flex items-center gap-2">{p.nome}<Badge variant="outline" className="text-[10px] px-1.5">{p.tipo}</Badge></div>
                    <p className="text-xs text-gray-500">Última busca: {fmtData(p.ultima_busca)}{p.processos_encontrados > 0 && ` · ${p.processos_encontrados} encontrado(s)`}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => buscarParte(p)} disabled={buscandoId === p.id || !temToken}>
                      {buscandoId === p.id ? <Loader2 size={13} className="animate-spin mr-1" /> : <Search size={13} className="mr-1" />}
                      Buscar
                    </Button>
                    <button className="text-gray-300 hover:text-red-500 p-1" onClick={() => remover(p.id)} title="Remover"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {clientesMonit.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">Nenhum cliente cadastrado.</p>}
              <div className="flex items-center gap-2 p-2 bg-gray-50">
                <Input className="h-8 text-xs flex-1" placeholder="Nome do cliente (parte)" value={cliNome} onChange={e => setCliNome(e.target.value)} />
                <Input className="h-8 text-xs w-36" placeholder="CPF/CNPJ (opcional)" value={cliDoc} onChange={e => setCliDoc(e.target.value)} />
                <Button size="sm" className="h-8 text-xs bg-[#1e3a5f] hover:bg-[#2563eb]" onClick={addCliente}><Plus size={13} className="mr-1" /> Adicionar</Button>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <Scale size={11} /> Processos encontrados são cadastrados automaticamente e passam a ser monitorados pelo robô do DataJud (andamentos + publicações).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
