import { useState } from 'react';
import { useApp, genId } from '../context';
import type { Publicacao, StatusPublicacao } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Bell, Clock, ExternalLink, AlertCircle, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';

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
  const { state, dispatch } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('ativas');
  const [search, setSearch] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [importOpen, setImportOpen] = useState(false);
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
  };

  const handleImport = (rows: Omit<Publicacao, 'id' | 'criadoEm'>[]) => {
    const novas: Publicacao[] = rows.map(r => ({ ...r, id: genId(), criadoEm: new Date().toISOString() }));
    dispatch({ type: 'IMPORT_PUBLICACOES', payload: novas });
    toast.success(`${novas.length} publicações importadas!`);
  };

  const limparFiltros = () => { setDataInicio(''); setDataFim(''); setSearch(''); setFilterStatus('ativas'); };

  const naoLidas = state.publicacoes.filter(p => p.status === 'não_lida').length;
  const arquivadas = state.publicacoes.filter(p => p.status === 'arquivada').length;
  const temFiltro = dataInicio || dataFim || search || filterStatus !== 'ativas';

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
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setImportOpen(true)}>
          <Upload size={14} className="mr-1" /> Importar CSV
        </Button>
      </div>

      <Tabs defaultValue="publicacoes">
        <TabsList className="text-xs h-9">
          <TabsTrigger value="publicacoes" className="text-xs">Publicações ({state.publicacoes.length})</TabsTrigger>
          <TabsTrigger value="monitoramento" className="text-xs">Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="publicacoes" className="mt-4 space-y-4">
          {/* Filtros */}
          <div className="bg-gray-50 border rounded-lg p-3 space-y-2">
            <div className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-48">
                <Label className="text-[10px] text-gray-400 uppercase">Busca</Label>
                <Input className="h-8 text-sm mt-1" placeholder="Tribunal, nº processo, conteúdo..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 uppercase">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-36 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativas">Ativas (todas)</SelectItem>
                    <SelectItem value="não_lida">Não lidas</SelectItem>
                    <SelectItem value="lida">Lidas</SelectItem>
                    <SelectItem value="prazo_gerado">Prazo gerado</SelectItem>
                    <SelectItem value="arquivada">Arquivadas</SelectItem>
                    <SelectItem value="todos">Todas (inc. arquivadas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <Label className="text-[10px] text-gray-400 uppercase">Publicado de</Label>
                <Input type="date" className="h-8 text-xs mt-1 w-36" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] text-gray-400 uppercase">até</Label>
                <Input type="date" className="h-8 text-xs mt-1 w-36" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
              {temFiltro && (
                <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500 mt-auto" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Resultado dos filtros */}
          {(dataInicio || dataFim) && (
            <p className="text-xs text-gray-500">
              {filtered.length} publicação(ões) no período{dataInicio ? ` de ${dataInicio}` : ''}{dataFim ? ` até ${dataFim}` : ''}
            </p>
          )}

          <div className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-500 py-8 text-center">
                Nenhuma publicação encontrada.
                {filterStatus === 'ativas' && arquivadas > 0 && (
                  <span className="block text-xs mt-1 text-slate-400">
                    Há {arquivadas} publicação(ões) arquivada(s). <button className="underline" onClick={() => setFilterStatus('arquivada')}>Ver arquivadas</button>
                  </span>
                )}
              </p>
            )}
            {filtered.map(pub => {
              const proc = state.processos.find(p => p.id === pub.processoId);
              const isArquivada = pub.status === 'arquivada';
              return (
                <Card
                  key={pub.id}
                  className={`hover:shadow-md transition-shadow ${pub.status === 'não_lida' ? 'border-red-200' : ''} ${isArquivada ? 'opacity-60' : ''}`}
                  onClick={() => marcarLida(pub.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${pub.status === 'não_lida' ? 'bg-red-500' : pub.status === 'arquivada' ? 'bg-slate-300' : 'bg-gray-300'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold text-[#2563eb]">{pub.tribunal}</span>
                            <span className="text-xs font-mono text-gray-600">{pub.numeroProcesso}</span>
                            <span className="text-xs text-gray-400">{pub.data}</span>
                            <Badge className={`${statusColor[pub.status]} text-[10px] px-1.5`}>{pub.status.replace('_', ' ')}</Badge>
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-3">{pub.conteudo}</p>
                          {proc && <p className="text-xs text-blue-600 mt-1">↳ Vinculado: {proc.numero.slice(0, 20)}...</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {!pub.processoId && !isArquivada && (
                          <Select onValueChange={v => vincularProcesso(pub, v)}>
                            <SelectTrigger className="h-7 text-[10px] w-28 px-2"><SelectValue placeholder="Vincular proc." /></SelectTrigger>
                            <SelectContent>
                              {state.processos.map(p => <SelectItem key={p.id} value={p.id} className="text-xs"><span className="font-mono">{p.numero.slice(0, 15)}...</span></SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {pub.status !== 'prazo_gerado' && !isArquivada && (
                          <Button size="sm" className="h-7 text-[10px] bg-[#1e3a5f] hover:bg-[#2563eb] px-2" onClick={() => setGerarPrazoId(pub.id)}>
                            <Clock size={10} className="mr-1" /> Gerar Prazo
                          </Button>
                        )}
                        {isArquivada ? (
                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-slate-600" onClick={() => desarquivar(pub)}>
                            <ArchiveRestore size={10} className="mr-1" /> Restaurar
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-slate-500 hover:text-slate-700" onClick={() => arquivar(pub)}>
                            <Archive size={10} className="mr-1" /> Arquivar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

      {/* Gerar Prazo Dialog */}
      <Dialog open={!!gerarPrazoId} onOpenChange={() => setGerarPrazoId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Gerar Prazo a partir da Publicação</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
