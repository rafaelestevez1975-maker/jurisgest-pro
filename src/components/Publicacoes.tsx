import { useState } from 'react';
import { useApp, genId } from '../context';
import { supabase } from '../lib/supabase';
import { adicionarDiasUteis } from '../data';
import type { Publicacao, StatusPublicacao } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Bell, Clock, ExternalLink, AlertCircle, Archive, ArchiveRestore, RefreshCw, CheckCheck, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// Detecta o prazo (nº de dias) mencionado no texto da intimação
function detectarPrazoDias(texto: string): number | null {
  if (!texto) return null;
  const t = texto.toLowerCase();
  const m = t.match(/(?:no\s+)?prazo\s+(?:legal\s+|comum\s+|de\s+lei\s+)?de\s+(\d{1,3})/)
    || t.match(/(?:\bem|dentro\s+de|no\s+prazo\s+de|prazo\s+de)\s+(\d{1,3})\s*(?:\([^)]*\)\s*)?dias/)
    || t.match(/(\d{1,3})\s*\(?[^)]*\)?\s*dias\s*(?:úteis|uteis|corridos)/)
    || t.match(/prazo[^.]{0,25}?(\d{1,3})\s*dias/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 90 ? n : null;
}

const TRIBUNAIS_MONIT = [
  { nome: 'TJSP', url: 'https://esaj.tjsp.jus.br/dje/', desc: 'Diário de Justiça Eletrônico do TJSP' },
  { nome: 'TJRJ', url: 'https://www.tjrj.jus.br/dje', desc: 'DJe do Tribunal de Justiça do Rio de Janeiro' },
  { nome: 'TJMG', url: 'https://www.tjmg.jus.br/portaldj/', desc: 'DJe do Tribunal de Justiça de Minas Gerais' },
  { nome: 'TJRS', url: 'https://www.tjrs.jus.br/site/publicacoes/', desc: 'DJe do TJRS' },
  { nome: 'TJPR', url: 'https://www.tjpr.jus.br/dje', desc: 'DJe do TJPR' },
  { nome: 'TJSC', url: 'https://dje.tjsc.jus.br/', desc: 'DJe do TJSC' },
  { nome: 'TRT (todos)', url: 'https://pje.trt.jus.br', desc: 'PJe dos Tribunais Regionais do Trabalho' },
  { nome: 'TRF', url: 'https://www.cjf.jus.br', desc: 'Tribunais Regionais Federais' },
  { nome: 'STJ', url: 'https://processo.stj.jus.br', desc: 'Superior Tribunal de Justiça' },
  { nome: 'STF', url: 'https://portal.stf.jus.br', desc: 'Supremo Tribunal Federal' },
  { nome: 'DataJud (CNJ)', url: 'https://datajud-wiki.cnj.jus.br', desc: 'API do CNJ — consulta dados de processos de todos os tribunais' },
];

const statusColor: Record<StatusPublicacao, string> = {
  'não_lida': 'bg-red-100 text-red-700',
  'lida': 'bg-gray-100 text-gray-600',
  'prazo_gerado': 'bg-green-100 text-green-700',
  'arquivada': 'bg-slate-100 text-slate-500',
};

const statusLabel: Record<StatusPublicacao, string> = {
  'não_lida': 'não lida',
  'lida': 'lida',
  'prazo_gerado': 'agendada',
  'arquivada': 'arquivada',
};

function ImportCSVPub({ onImport, onClose }: { onImport: (pubs: Omit<Publicacao, 'id' | 'criadoEm'>[]) => void; onClose: () => void }) {
  const [preview, setPreview] = useState<Omit<Publicacao, 'id' | 'criadoEm'>[]>([]);

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
        return {
          data: obj.data || new Date().toISOString().split('T')[0],
          tribunal: obj.tribunal || '',
          numeroProcesso: obj.numero_processo || obj.numeroproceso || '',
          processoId: undefined,
          conteudo: obj.conteudo || obj.texto || '',
          status: 'não_lida' as StatusPublicacao,
        };
      }).filter(r => r.tribunal || r.conteudo);
      setPreview(rows);
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
        <p className="font-semibold mb-1">Formato esperado:</p>
        <code className="block">data,tribunal,numero_processo,conteudo</code>
      </div>
      <Input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
      {preview.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1">{preview.length} publicações:</p>
          <div className="border rounded max-h-40 overflow-y-auto text-xs divide-y">
            {preview.map((p, i) => <div key={i} className="px-3 py-2"><span className="font-medium">{p.tribunal}</span> · <span className="font-mono">{p.numeroProcesso}</span> · <span className="text-gray-500 truncate">{p.conteudo.slice(0, 40)}...</span></div>)}
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="bg-[#2563eb]" disabled={!preview.length} onClick={() => { onImport(preview); onClose(); }}>Importar ({preview.length})</Button>
      </DialogFooter>
    </div>
  );
}

export default function Publicacoes() {
  const { state, dispatch, reload } = useApp();
  const [capturando, setCapturando] = useState(false);
  const [prazoDiasDetectados, setPrazoDiasDetectados] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ativas');
  const [filterTribunal, setFilterTribunal] = useState<string>('todos');
  const [filterVinculo, setFilterVinculo] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [viewPub, setViewPub] = useState<Publicacao | null>(null);
  const [gerarPrazoId, setGerarPrazoId] = useState<string | null>(null);
  const [prazoDescricao, setPrazoDescricao] = useState('');
  const [prazoData, setPrazoData] = useState('');
  const [prazoResp, setPrazoResp] = useState('');

  const filtered = state.publicacoes.filter(p => {
    // Ativas = tudo exceto arquivadas; por padrão esconde arquivadas
    if (filterStatus === 'ativas') {
      if (p.status === 'arquivada') return false;
    } else if (filterStatus !== 'todos') {
      if (p.status !== filterStatus) return false;
    }
    if (filterTribunal !== 'todos' && p.tribunal !== filterTribunal) return false;
    if (filterVinculo === 'vinculadas' && !p.processoId) return false;
    if (filterVinculo === 'nao_vinculadas' && p.processoId) return false;
    const matchSearch = !search ||
      p.tribunal.toLowerCase().includes(search.toLowerCase()) ||
      p.numeroProcesso.includes(search) ||
      p.conteudo.toLowerCase().includes(search.toLowerCase());
    const matchInicio = !dataInicio || p.data >= dataInicio;
    const matchFim = !dataFim || p.data <= dataFim;
    return matchSearch && matchInicio && matchFim;
  }).sort((a, b) => b.data.localeCompare(a.data));

  const marcarLida = (id: string) => {
    const pub = state.publicacoes.find(p => p.id === id);
    if (pub && pub.status === 'não_lida') {
      dispatch({ type: 'UPDATE_PUBLICACAO', payload: { ...pub, status: 'lida' } });
    }
  };

  const abrirPublicacao = (pub: Publicacao) => {
    marcarLida(pub.id);
    setViewPub({ ...pub, status: pub.status === 'não_lida' ? 'lida' : pub.status });
  };

  const arquivar = (pub: Publicacao) => {
    dispatch({ type: 'UPDATE_PUBLICACAO', payload: { ...pub, status: 'arquivada' } });
    toast.success('Publicação arquivada.');
  };

  const desarquivar = (pub: Publicacao) => {
    dispatch({ type: 'UPDATE_PUBLICACAO', payload: { ...pub, status: 'lida' } });
    toast.success('Publicação restaurada.');
  };

  const vincularProcesso = (pub: Publicacao, processoId: string) => {
    dispatch({ type: 'UPDATE_PUBLICACAO', payload: { ...pub, processoId } });
    toast.success('Processo vinculado!');
  };

  // Buscar intimações novas no CNJ (DJEN) agora
  const capturarIntimacoes = async () => {
    setCapturando(true);
    toast.info('Buscando intimações no Diário Nacional (CNJ)…');
    try {
      const { data, error } = await supabase.functions.invoke('capturar-intimacoes', { body: { dias: 30 } });
      if (error) throw error;
      if (data?.erro) toast.error(data.mensagem || 'Falha na captura.');
      else {
        toast.success(`${data.novas_intimacoes} intimação(ões) nova(s).`);
        await reload();
      }
    } catch (e) {
      toast.error('Falha ao buscar intimações: ' + ((e as Error)?.message || e));
    }
    setCapturando(false);
  };

  const marcarTodasLidas = () => {
    const naoLidasVis = filtered.filter(p => p.status === 'não_lida');
    naoLidasVis.forEach(p => dispatch({ type: 'UPDATE_PUBLICACAO', payload: { ...p, status: 'lida' } }));
    toast.success(`${naoLidasVis.length} marcada(s) como lida(s).`);
  };

  // Abre "Gerar Prazo" já sugerindo descrição e data (detecta o prazo no texto)
  const abrirGerarPrazo = (pub: Publicacao) => {
    const dias = detectarPrazoDias(pub.conteudo);
    const feriados = state.feriadosMunicipais.map(f => f.data);
    const hoje = new Date().toISOString().split('T')[0];
    setPrazoDiasDetectados(dias);
    setPrazoDescricao(pub.tipo ? `${pub.tipo} — ${pub.tribunal}` : `Providência — ${pub.tribunal}`);
    setPrazoData(dias ? adicionarDiasUteis(hoje, dias, feriados) : '');
    setPrazoResp(state.advogados[0]?.nome || '');
    setViewPub(null);
    setGerarPrazoId(pub.id);
  };

  const handleGerarPrazo = (pubId: string) => {
    const pub = state.publicacoes.find(p => p.id === pubId);
    if (!pub || !prazoDescricao || !prazoData) { toast.error('Preencha descrição e data.'); return; }
    const responsavel = prazoResp || state.advogados[0]?.nome || '';
    dispatch({
      type: 'ADD_PRAZO',
      payload: {
        id: genId(), processoId: pub.processoId || '', tipo: 'prazo_fatal',
        descricao: prazoDescricao, dataHora: prazoData + 'T23:59', diasUteis: true,
        responsavel, status: 'pendente', alertaDias: 3, criadoEm: new Date().toISOString(),
      },
    });
    dispatch({ type: 'UPDATE_PUBLICACAO', payload: { ...pub, status: 'prazo_gerado' } });
    toast.success('Prazo gerado com sucesso!');
    setGerarPrazoId(null);
    setPrazoDescricao('');
    setPrazoData('');
    setPrazoResp('');
    setPrazoDiasDetectados(null);
  };

  const handleImport = (rows: Omit<Publicacao, 'id' | 'criadoEm'>[]) => {
    const novas: Publicacao[] = rows.map(r => ({ ...r, id: genId(), criadoEm: new Date().toISOString() }));
    dispatch({ type: 'IMPORT_PUBLICACOES', payload: novas });
    toast.success(`${novas.length} publicações importadas!`);
  };

  const limparFiltros = () => { setDataInicio(''); setDataFim(''); setSearch(''); setFilterStatus('ativas'); setFilterTribunal('todos'); setFilterVinculo('todos'); };

  const pubs = state.publicacoes;
  const contagem = {
    ativas: pubs.filter(p => p.status !== 'arquivada').length,
    'não_lida': pubs.filter(p => p.status === 'não_lida').length,
    lida: pubs.filter(p => p.status === 'lida').length,
    prazo_gerado: pubs.filter(p => p.status === 'prazo_gerado').length,
    arquivada: pubs.filter(p => p.status === 'arquivada').length,
    todos: pubs.length,
  };
  const naoLidas = contagem['não_lida'];
  const arquivadas = contagem.arquivada;
  const tribunaisUnicos = [...new Set(pubs.map(p => p.tribunal).filter(Boolean))].sort();
  const temFiltro = !!(dataInicio || dataFim || search || filterStatus !== 'ativas' || filterTribunal !== 'todos' || filterVinculo !== 'todos');

  const CHIPS: { id: string; label: string; count: number; hex: string }[] = [
    { id: 'ativas', label: 'Ativas', count: contagem.ativas, hex: '#1e3a5f' },
    { id: 'não_lida', label: 'Não lidas', count: contagem['não_lida'], hex: '#dc2626' },
    { id: 'lida', label: 'Lidas', count: contagem.lida, hex: '#4b5563' },
    { id: 'prazo_gerado', label: 'Agendadas', count: contagem.prazo_gerado, hex: '#16a34a' },
    { id: 'arquivada', label: 'Arquivadas', count: contagem.arquivada, hex: '#64748b' },
    { id: 'todos', label: 'Todas', count: contagem.todos, hex: '#2563eb' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Intimações e Publicações</h1>
          <div className="flex items-center gap-3 mt-0.5">
            {naoLidas > 0 && <p className="text-sm text-red-600 flex items-center gap-1"><Bell size={12} />{naoLidas} não lida(s)</p>}
            {arquivadas > 0 && <p className="text-sm text-slate-400 flex items-center gap-1"><Archive size={12} />{arquivadas} arquivada(s)</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {naoLidas > 0 && (
            <Button variant="outline" size="sm" className="text-xs" onClick={marcarTodasLidas}>
              <CheckCheck size={14} className="mr-1" /> Marcar lidas
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setImportOpen(true)}>
            <Upload size={14} className="mr-1" /> Importar CSV
          </Button>
          <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700" onClick={capturarIntimacoes} disabled={capturando}>
            {capturando ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
            Buscar intimações (CNJ)
          </Button>
        </div>
      </div>

      <Tabs defaultValue="publicacoes">
        <TabsList className="text-xs h-9">
          <TabsTrigger value="publicacoes" className="text-xs">Publicações ({state.publicacoes.length})</TabsTrigger>
          <TabsTrigger value="monitoramento" className="text-xs">Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="publicacoes" className="mt-4 space-y-4">
          {/* Chips de status (com contadores) */}
          <div className="flex flex-wrap gap-2">
            {CHIPS.map(chip => {
              const active = filterStatus === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setFilterStatus(chip.id)}
                  style={active ? { backgroundColor: chip.hex, borderColor: 'transparent', color: '#fff' } : undefined}
                  className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5
                    ${active ? '' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  {chip.label}
                  <span
                    style={active ? { backgroundColor: 'rgba(255,255,255,0.25)' } : undefined}
                    className={`inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold ${active ? '' : 'bg-black/10'}`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Busca + tribunal + período */}
          <div className="bg-gray-50 border rounded-lg p-3 flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <Label className="text-[10px] text-gray-400 uppercase">Busca</Label>
              <Input className="h-8 text-sm mt-1" placeholder="Tribunal, nº processo, conteúdo..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Tribunal</Label>
              <Select value={filterTribunal} onValueChange={setFilterTribunal}>
                <SelectTrigger className="h-8 text-xs w-32 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {tribunaisUnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Vínculo</Label>
              <Select value={filterVinculo} onValueChange={setFilterVinculo}>
                <SelectTrigger className="h-8 text-xs w-36 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="vinculadas">Vinculadas a processo</SelectItem>
                  <SelectItem value="nao_vinculadas">Não vinculadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Publicado de</Label>
              <Input type="date" className="h-8 text-xs mt-1 w-36" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label className="text-[10px] text-gray-400 uppercase">até</Label>
              <Input type="date" className="h-8 text-xs mt-1 w-36" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
            {temFiltro && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500" onClick={limparFiltros}>
                Limpar
              </Button>
            )}
          </div>

          {/* Contador de resultados */}
          <p className="text-xs text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'publicação' : 'publicações'}
            {filterStatus !== 'todos' && filterStatus !== 'ativas' && ` · ${CHIPS.find(c => c.id === filterStatus)?.label.toLowerCase()}`}
            {filterTribunal !== 'todos' && ` · ${filterTribunal}`}
            {filterVinculo === 'vinculadas' && ' · vinculadas a processo'}
            {filterVinculo === 'nao_vinculadas' && ' · não vinculadas'}
            {(dataInicio || dataFim) && ` · período${dataInicio ? ` de ${dataInicio}` : ''}${dataFim ? ` até ${dataFim}` : ''}`}
          </p>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              Nenhuma publicação encontrada.
              {filterStatus === 'ativas' && arquivadas > 0 && (
                <span className="block text-xs mt-1 text-slate-400">
                  Há {arquivadas} publicação(ões) arquivada(s). <button className="underline" onClick={() => setFilterStatus('arquivada')}>Ver arquivadas</button>
                </span>
              )}
            </p>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">Disponibilização</th>
                      <th className="px-3 py-2 font-medium">Órgão / Vara</th>
                      <th className="px-3 py-2 font-medium">Cliente / Parte adversa / Nº processo</th>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(pub => {
                      const proc = state.processos.find(p => p.id === pub.processoId);
                      const cli = proc ? state.clientes.find(c => c.id === proc.clienteId) : null;
                      const isArquivada = pub.status === 'arquivada';
                      const naoLida = pub.status === 'não_lida';
                      const orgao = (pub.conteudo.split('\n')[0].split(' · ').slice(-1)[0] || '').slice(0, 60);
                      return (
                        <tr key={pub.id} onClick={() => abrirPublicacao(pub)}
                          className={`border-t hover:bg-blue-50/40 cursor-pointer ${isArquivada ? 'opacity-50' : ''} ${naoLida ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          <td className="px-3 py-2.5 whitespace-nowrap align-top">
                            <div className="flex items-center gap-1.5">
                              {naoLida && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                              <span>{pub.data.split('-').reverse().join('/')}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <div className="text-xs"><span className="text-[#2563eb] font-medium">{pub.tribunal}</span></div>
                            <div className="text-[11px] text-gray-500 font-normal">{orgao}</div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            {cli ? (
                              <div className="text-xs">{cli.nome} <span className="text-gray-400 font-normal">×</span> {proc?.parteContraria || '—'}</div>
                            ) : <div className="text-[11px] text-amber-600 font-normal">Não vinculada</div>}
                            <div className="text-[11px] font-mono text-gray-500 font-normal">{pub.numeroProcesso || '—'}</div>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <Badge className={`${statusColor[pub.status]} text-[10px] px-1.5 whitespace-nowrap`}>{pub.tipo || statusLabel[pub.status]}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap align-top" onClick={e => e.stopPropagation()}>
                            {pub.status !== 'prazo_gerado' && !isArquivada && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#1e3a5f]" title="Gerar prazo" onClick={() => abrirGerarPrazo(pub)}><Clock size={14} /></Button>
                            )}
                            {isArquivada
                              ? <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" title="Restaurar" onClick={() => desarquivar(pub)}><ArchiveRestore size={14} /></Button>
                              : <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" title="Arquivar" onClick={() => arquivar(pub)}><Archive size={14} /></Button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoramento" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#1e3a5f] flex items-center gap-2">
                <AlertCircle size={16} className="text-blue-500" /> Como monitorar publicações automaticamente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900">
                <p className="font-semibold mb-2">API DataJud — CNJ (recomendado)</p>
                <p className="text-xs mb-2">O DataJud é a plataforma do CNJ que concentra dados processuais de <strong>todos os tribunais brasileiros</strong>. Com a API, é possível consultar movimentações e publicações por número de processo.</p>
                <p className="text-xs">Configure suas credenciais em <strong>Configurações → Credenciais de Tribunais</strong> para habilitar a busca automática.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Portais dos Tribunais</p>
                <div className="space-y-2">
                  {TRIBUNAIS_MONIT.map(t => (
                    <div key={t.nome} className="flex items-center justify-between border rounded p-3 hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-semibold text-[#1e3a5f]">{t.nome}</p>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => window.open(t.url, '_blank')}>
                        <ExternalLink size={12} className="mr-1" />Acessar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                <p className="font-semibold mb-1">Importação manual</p>
                <p>Você pode exportar publicações dos portais dos tribunais e importar no sistema usando a função <strong>Importar CSV</strong>. O formato esperado é: data, tribunal, numero_processo, conteudo.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detalhe da Publicação */}
      <Dialog open={!!viewPub} onOpenChange={() => setViewPub(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2 flex-wrap text-base">
              <span className="text-[#2563eb]">{viewPub?.tribunal}</span>
              {viewPub?.tipo && <Badge variant="outline" className="text-[10px]">{viewPub.tipo}</Badge>}
              <span className="text-xs text-gray-400 font-normal">{viewPub?.data}</span>
            </DialogTitle>
          </DialogHeader>
          {viewPub && (() => {
            const proc = state.processos.find(p => p.id === viewPub.processoId);
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-mono text-gray-600">{viewPub.numeroProcesso || 'Sem número'}</span>
                  <Badge className={`${statusColor[viewPub.status]} text-[10px] px-1.5`}>{statusLabel[viewPub.status]}</Badge>
                  {proc && <span className="text-blue-600">↳ vinculado</span>}
                </div>

                <div className="bg-gray-50 border rounded p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {viewPub.conteudo || 'Sem conteúdo.'}
                </div>

                {viewPub.link && (
                  <a href={viewPub.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 w-fit">
                    <ExternalLink size={12} /> Abrir no site do tribunal
                  </a>
                )}

                {!viewPub.processoId && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Vincular a processo:</span>
                    <Select onValueChange={v => { vincularProcesso(viewPub, v); setViewPub({ ...viewPub, processoId: v }); }}>
                      <SelectTrigger className="h-7 text-xs w-56"><SelectValue placeholder="Selecione o processo..." /></SelectTrigger>
                      <SelectContent>
                        {state.processos.map(p => <SelectItem key={p.id} value={p.id} className="text-xs"><span className="font-mono">{p.numero}</span></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                  {viewPub.status === 'arquivada'
                    ? <Button size="sm" variant="outline" className="text-slate-600" onClick={() => { desarquivar(viewPub); setViewPub(null); }}><ArchiveRestore size={14} className="mr-1" /> Restaurar</Button>
                    : <Button size="sm" variant="outline" className="text-slate-600" onClick={() => { arquivar(viewPub); setViewPub(null); }}><Archive size={14} className="mr-1" /> Arquivar</Button>}
                  {viewPub.status !== 'prazo_gerado' && viewPub.status !== 'arquivada' && (
                    <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#2563eb]" onClick={() => abrirGerarPrazo(viewPub)}>
                      <Clock size={14} className="mr-1" /> Gerar Prazo
                    </Button>
                  )}
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Gerar Prazo Dialog */}
      <Dialog open={!!gerarPrazoId} onOpenChange={() => setGerarPrazoId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Gerar Prazo a partir da Publicação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {prazoDiasDetectados != null && (
              <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded px-2 py-1.5 flex items-center gap-1.5">
                <Sparkles size={12} className="text-green-600" /> Detectei <b>prazo de {prazoDiasDetectados} dias</b> na intimação — a data limite já foi sugerida (em dias úteis). Confira e ajuste se necessário.
              </p>
            )}
            <div>
              <Label className="text-xs">Descrição do Prazo *</Label>
              <Input className="mt-1 h-8 text-sm" value={prazoDescricao} onChange={e => setPrazoDescricao(e.target.value)} placeholder="Ex: Contrarrazões de recurso" />
            </div>
            <div>
              <Label className="text-xs">Data Limite *</Label>
              <Input type="date" className="mt-1 h-8 text-sm" value={prazoData} onChange={e => setPrazoData(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Responsável</Label>
              <Select value={prazoResp} onValueChange={setPrazoResp}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione o advogado..." /></SelectTrigger>
                <SelectContent>
                  {state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setGerarPrazoId(null)}>Cancelar</Button>
            <Button size="sm" className="bg-[#2563eb]" onClick={() => gerarPrazoId && handleGerarPrazo(gerarPrazoId)}>Criar Prazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar Publicações (CSV)</DialogTitle></DialogHeader>
          <ImportCSVPub onImport={handleImport} onClose={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
