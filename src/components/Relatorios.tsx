import { useState, useMemo } from 'react';
import { useApp } from '../context';
import type { Processo, AreaDireito, StatusProcesso } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart2, Download, Printer, Filter, X, ChevronDown, Scale, Clock } from 'lucide-react';
import { TIPOS_ANDAMENTO, ProcessoDetalheDialog } from './Processos';

const AREAS: AreaDireito[] = ['cível', 'trabalhista', 'criminal', 'previdenciário', 'família', 'tributário', 'empresarial', 'administrativo', 'procon', 'outro'];
const STATUS_LIST: StatusProcesso[] = ['ativo', 'suspenso', 'arquivado', 'ganho', 'perdido', 'acordo'];
const INATIVOS: StatusProcesso[] = ['arquivado', 'ganho', 'perdido', 'acordo'];
const FASES = ['conhecimento', 'recursal', 'execução', 'outro'];

const statusColor: Record<string, string> = {
  ativo: 'bg-blue-100 text-blue-700',
  suspenso: 'bg-orange-100 text-orange-700',
  arquivado: 'bg-gray-100 text-gray-600',
  ganho: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
  acordo: 'bg-amber-100 text-amber-700',
};

const fmtMoeda = (v?: number) => v || v === 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
const fmtData = (d: string) => {
  if (!d) return '—';
  const [a, m, dia] = d.split('T')[0].split('-');
  return dia && m && a ? `${dia}/${m}/${a}` : d;
};

// Multi-seleção compacta (popover com checkboxes)
export function MultiSelect({ label, options, selected, onChange, width = 'w-44', emptyLabel = 'Todos' }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (s: string[]) => void;
  width?: string;
  emptyLabel?: string;
}) {
  const [busca, setBusca] = useState('');
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  const filtradas = options.filter(o => o.label.toLowerCase().includes(busca.toLowerCase()));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`${width} h-8 mt-1 border rounded-md px-2.5 text-xs flex items-center justify-between bg-white hover:border-gray-300`}>
          <span className="truncate text-gray-700">
            {selected.length === 0 ? emptyLabel : selected.length === 1
              ? options.find(o => o.value === selected[0])?.label
              : `${selected.length} selecionados`}
          </span>
          <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {options.length > 8 && (
          <Input className="h-7 text-xs mb-2" placeholder={`Buscar ${label.toLowerCase()}...`} value={busca} onChange={e => setBusca(e.target.value)} />
        )}
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {filtradas.map(o => (
            <label key={o.value} className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" className="accent-blue-600" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
          {filtradas.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">Nada encontrado.</p>}
        </div>
        {selected.length > 0 && (
          <button className="text-[11px] text-blue-600 mt-2 hover:underline" onClick={() => onChange([])}>Limpar seleção</button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function Relatorios() {
  const { state, usuario } = useApp();
  const { processos, clientes, advogados, prazos } = state;

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [grupoStatus, setGrupoStatus] = useState<string>('todos'); // todos | ativos | inativos | <status>
  const [areasSel, setAreasSel] = useState<string[]>([]);
  const [clientesSel, setClientesSel] = useState<string[]>([]);
  const [tribunaisSel, setTribunaisSel] = useState<string[]>([]);
  const [polo, setPolo] = useState<string>('todos');
  const [fase, setFase] = useState<string>('todas');
  const [advogadosSel, setAdvogadosSel] = useState<string[]>([]);
  const [andamento, setAndamento] = useState<string>('todos');
  const [verProc, setVerProc] = useState<Processo | null>(null);
  const [adverso, setAdverso] = useState('');
  const [objeto, setObjeto] = useState('');
  const [busca, setBusca] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [comarcasSel, setComarcasSel] = useState<string[]>([]);
  const [ufsSel, setUfsSel] = useState<string[]>([]);
  const [vara, setVara] = useState('');
  const [origem, setOrigem] = useState<string>('todos');
  const [cnj, setCnj] = useState<string>('todos');
  const [prazoFiltro, setPrazoFiltro] = useState<string>('todos');
  const [semAndamentoDias, setSemAndamentoDias] = useState('');
  const [andDe, setAndDe] = useState('');
  const [andAte, setAndAte] = useState('');

  const tribunais = [...new Set(processos.map(p => p.tribunal).filter(Boolean))].sort();
  const comarcas = [...new Set(processos.map(p => p.comarca).filter(Boolean))].sort();
  const ufs = [...new Set(processos.map(p => p.uf).filter(Boolean) as string[])].sort();
  const nomeCliente = (id: string) => clientes.find(c => c.id === id)?.nome || '—';
  const ultimosAndamentos = (p: Processo, n = 3) =>
    [...p.movimentacoes].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, n);

  // Andamentos que casam com o filtro de tipo (Andamento) e/ou período (andDe/andAte).
  // Usado tanto para filtrar processos quanto para somar valores (ex.: cumprimento de sentença).
  const filtroAndAtivo = andamento !== 'todos' || !!andDe || !!andAte;
  const andamentosCasando = (p: Processo) => {
    const t = andamento !== 'todos' ? andamento.toLowerCase() : '';
    return p.movimentacoes.filter(m => {
      if (t && !((m.tipo || '').toLowerCase().includes(t) || (m.descricao || '').toLowerCase().includes(t))) return false;
      if (andDe && (m.data || '') < andDe) return false;
      if (andAte && (m.data || '') > andAte) return false;
      return true;
    });
  };
  const valorCasando = (p: Processo) => andamentosCasando(p).reduce((a, m) => a + (m.valor || 0), 0);

  // ── Aplicação dos filtros ────────────────────────────────────────────────
  const resultado = useMemo(() => {
    const hoje = Date.now();
    const agoraISO = new Date().toISOString();
    return processos.filter(p => {
      // recorte de área do perfil do usuário
      if (!usuario.emArea(p.area)) return false;
      // status
      if (grupoStatus === 'ativos' && p.status !== 'ativo') return false;
      if (grupoStatus === 'inativos' && !INATIVOS.includes(p.status)) return false;
      if (STATUS_LIST.includes(grupoStatus as StatusProcesso) && p.status !== grupoStatus) return false;
      // área
      if (areasSel.length && !areasSel.includes(p.area)) return false;
      // cliente(s)
      if (clientesSel.length && !clientesSel.includes(p.clienteId)) return false;
      // tribunal
      if (tribunaisSel.length && !tribunaisSel.includes(p.tribunal)) return false;
      // comarca
      if (comarcasSel.length && !comarcasSel.includes(p.comarca)) return false;
      // estado (UF)
      if (ufsSel.length && !ufsSel.includes(p.uf || '')) return false;
      // vara / juízo
      if (vara && !(p.vara || '').toLowerCase().includes(vara.toLowerCase())) return false;
      // polo
      if (polo !== 'todos' && p.polo !== polo) return false;
      // fase
      if (fase !== 'todas' && p.fase !== fase) return false;
      // advogado
      if (advogadosSel.length && !advogadosSel.includes(p.advogadoResponsavel)) return false;
      // origem do cadastro
      if (origem !== 'todos' && (p.origem || 'manual') !== origem) return false;
      // CNJ (número com 20 dígitos)
      if (cnj !== 'todos') {
        const temCnj = (p.numero || '').replace(/\D/g, '').length === 20;
        if (cnj === 'com' && !temCnj) return false;
        if (cnj === 'sem' && temCnj) return false;
      }
      // prazos vinculados
      if (prazoFiltro !== 'todos') {
        const doProc = prazos.filter(pr => pr.processoId === p.id);
        const pend = doProc.filter(pr => pr.status === 'pendente');
        const venc = pend.filter(pr => (pr.dataHora || '') < agoraISO);
        if (prazoFiltro === 'pendente' && pend.length === 0) return false;
        if (prazoFiltro === 'vencido' && venc.length === 0) return false;
        if (prazoFiltro === 'sem' && doProc.length > 0) return false;
      }
      // andamento (tipo e/ou período) — mantém processos com ao menos 1 andamento que casa
      if (filtroAndAtivo && andamentosCasando(p).length === 0) return false;
      // sem andamento há N dias
      if (semAndamentoDias) {
        const n = Number(semAndamentoDias);
        const datas = p.movimentacoes.map(m => m.data).filter(Boolean).sort();
        const ult = datas[datas.length - 1];
        const diasDesde = ult ? Math.floor((hoje - new Date(ult).getTime()) / 86400000) : Infinity;
        if (diasDesde < n) return false;
      }
      // parte contrária
      if (adverso && !p.parteContraria.toLowerCase().includes(adverso.toLowerCase())) return false;
      // objeto
      if (objeto && !(p.objeto || '').toLowerCase().includes(objeto.toLowerCase())) return false;
      // valor
      if (valorMin && (p.valorCausa ?? 0) < Number(valorMin)) return false;
      if (valorMax && (p.valorCausa ?? 0) > Number(valorMax)) return false;
      // data distribuição
      if (dataDe && (!p.dataDistribuicao || p.dataDistribuicao < dataDe)) return false;
      if (dataAte && (!p.dataDistribuicao || p.dataDistribuicao > dataAte)) return false;
      // busca livre
      if (busca) {
        const alvo = `${p.numero} ${nomeCliente(p.clienteId)} ${p.parteContraria} ${p.objeto} ${p.comarca} ${p.vara}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => (b.dataDistribuicao || '').localeCompare(a.dataDistribuicao || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processos, clientes, prazos, usuario, grupoStatus, areasSel, clientesSel, tribunaisSel, comarcasSel, ufsSel, vara, polo, fase, advogadosSel, origem, cnj, prazoFiltro, andamento, andDe, andAte, semAndamentoDias, adverso, objeto, valorMin, valorMax, dataDe, dataAte, busca]);

  const somaValor = resultado.reduce((acc, p) => acc + (p.valorCausa ?? 0), 0);
  const valorAndamentos = resultado.reduce((acc, p) => acc + valorCasando(p), 0);
  const temFiltro = grupoStatus !== 'todos' || areasSel.length || clientesSel.length || tribunaisSel.length ||
    comarcasSel.length || ufsSel.length || vara || polo !== 'todos' || fase !== 'todas' || advogadosSel.length ||
    origem !== 'todos' || cnj !== 'todos' || prazoFiltro !== 'todos' || andamento !== 'todos' || andDe || andAte || semAndamentoDias ||
    adverso || objeto || busca || valorMin || valorMax || dataDe || dataAte;

  const limpar = () => {
    setGrupoStatus('todos'); setAreasSel([]); setClientesSel([]); setTribunaisSel([]);
    setComarcasSel([]); setUfsSel([]); setVara(''); setPolo('todos'); setFase('todas'); setAdvogadosSel([]);
    setOrigem('todos'); setCnj('todos'); setPrazoFiltro('todos'); setAndamento('todos'); setAndDe(''); setAndAte(''); setSemAndamentoDias('');
    setAdverso(''); setObjeto('');
    setBusca(''); setValorMin(''); setValorMax(''); setDataDe(''); setDataAte('');
  };

  const exportarCSV = () => {
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const cab = ['Número', 'Cliente', 'Polo do cliente', 'Parte contrária', 'Área', 'Objeto', 'Tribunal', 'Comarca', 'UF', 'Fase', 'Valor da causa', 'Valor em andamentos (filtro)', 'Status', 'Distribuição', 'Último andamento'];
    const linhas = resultado.map(p => {
      const ult = ultimosAndamentos(p, 1)[0];
      return [p.numero, nomeCliente(p.clienteId), p.polo, p.parteContraria, p.area, p.objeto, p.tribunal, p.comarca, p.uf || '', p.fase, p.valorCausa ?? '', valorCasando(p) || '', p.status, fmtData(p.dataDistribuicao), ult ? `${fmtData(ult.data)} ${ult.descricao}` : ''].map(esc).join(';');
    });
    const csv = '﻿' + [cab.map(esc).join(';'), ...linhas].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio_processos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const clienteOpts = clientes.map(c => ({ value: c.id, label: c.nome }));
  const areaOpts = AREAS.map(a => ({ value: a, label: a }));
  const tribunalOpts = tribunais.map(t => ({ value: t, label: t }));
  const comarcaOpts = comarcas.map(c => ({ value: c, label: c }));
  const ufOpts = ufs.map(u => ({ value: u, label: u }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2"><BarChart2 size={22} /> Relatórios de Processos</h1>
          <p className="text-sm text-gray-500">Filtre e gere relatórios detalhados da carteira de processos</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={exportarCSV} disabled={!resultado.length}>
            <Download size={14} className="mr-1" /> Exportar CSV
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => window.print()} disabled={!resultado.length}>
            <Printer size={14} className="mr-1" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <Card className="no-print">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <Filter size={13} /> Filtros
            {temFiltro ? <button className="ml-auto text-blue-600 hover:underline flex items-center gap-1" onClick={limpar}><X size={11} /> Limpar tudo</button> : null}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Situação</Label>
              <Select value={grupoStatus} onValueChange={setGrupoStatus}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativos">Ativos</SelectItem>
                  <SelectItem value="inativos">Inativos (arquiv./encerrados)</SelectItem>
                  {STATUS_LIST.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Área(s)</Label>
              <MultiSelect label="Área" options={areaOpts} selected={areasSel} onChange={setAreasSel} width="w-full" />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Cliente(s)</Label>
              <MultiSelect label="Cliente" options={clienteOpts} selected={clientesSel} onChange={setClientesSel} width="w-full" />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Polo do cliente</Label>
              <Select value={polo} onValueChange={setPolo}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Autor ou réu</SelectItem>
                  <SelectItem value="autor">Autor / Requerente</SelectItem>
                  <SelectItem value="réu">Réu / Requerido</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Parte contrária</Label>
              <Input className="h-8 text-xs mt-1" placeholder="Nome do adverso..." value={adverso} onChange={e => setAdverso(e.target.value)} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Objeto / assunto</Label>
              <Input className="h-8 text-xs mt-1" placeholder="Ex: cobrança, danos..." value={objeto} onChange={e => setObjeto(e.target.value)} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Tribunal(is)</Label>
              <MultiSelect label="Tribunal" options={tribunalOpts} selected={tribunaisSel} onChange={setTribunaisSel} width="w-full" />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Comarca(s)</Label>
              <MultiSelect label="Comarca" options={comarcaOpts} selected={comarcasSel} onChange={setComarcasSel} width="w-full" />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Estado (UF)</Label>
              <MultiSelect label="Estado" options={ufOpts} selected={ufsSel} onChange={setUfsSel} width="w-full" />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Vara / Juízo</Label>
              <Input className="h-8 text-xs mt-1" placeholder="Ex: 2ª Vara Cível..." value={vara} onChange={e => setVara(e.target.value)} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Fase</Label>
              <Select value={fase} onValueChange={setFase}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {FASES.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Advogado / Responsável</Label>
              <MultiSelect label="Advogado" width="w-full" selected={advogadosSel} onChange={setAdvogadosSel}
                options={advogados.map(a => ({ value: a.nome, label: a.nome }))} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Andamento</Label>
              <Select value={andamento} onValueChange={setAndamento}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer</SelectItem>
                  {TIPOS_ANDAMENTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Andamento de</Label>
              <Input className="h-8 text-xs mt-1" type="date" value={andDe} onChange={e => setAndDe(e.target.value)} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Andamento até</Label>
              <Input className="h-8 text-xs mt-1" type="date" value={andAte} onChange={e => setAndAte(e.target.value)} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Sem andamento há (dias)</Label>
              <Input className="h-8 text-xs mt-1" type="number" placeholder="Ex: 30" value={semAndamentoDias} onChange={e => setSemAndamentoDias(e.target.value)} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Origem do cadastro</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto_intimacao">Automático (intimação)</SelectItem>
                  <SelectItem value="imagem">Por print / imagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Número CNJ</Label>
              <Select value={cnj} onValueChange={setCnj}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com">Com CNJ válido</SelectItem>
                  <SelectItem value="sem">Sem CNJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Prazos vinculados</Label>
              <Select value={prazoFiltro} onValueChange={setPrazoFiltro}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer</SelectItem>
                  <SelectItem value="pendente">Com prazo pendente</SelectItem>
                  <SelectItem value="vencido">Com prazo vencido</SelectItem>
                  <SelectItem value="sem">Sem prazo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Valor da causa (R$)</Label>
              <div className="flex gap-1 mt-1">
                <Input className="h-8 text-xs" type="number" placeholder="mín" value={valorMin} onChange={e => setValorMin(e.target.value)} />
                <Input className="h-8 text-xs" type="number" placeholder="máx" value={valorMax} onChange={e => setValorMax(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">Distribuído de</Label>
              <Input className="h-8 text-xs mt-1" type="date" value={dataDe} onChange={e => setDataDe(e.target.value)} />
            </div>

            <div>
              <Label className="text-[10px] text-gray-400 uppercase">até</Label>
              <Input className="h-8 text-xs mt-1" type="date" value={dataAte} onChange={e => setDataAte(e.target.value)} />
            </div>

            <div className="col-span-2 lg:col-span-4">
              <Label className="text-[10px] text-gray-400 uppercase">Busca livre</Label>
              <Input className="h-8 text-xs mt-1" placeholder="Número, cliente, adverso, objeto, comarca..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Resumo ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
        <p className="text-gray-600">
          <span className="font-bold text-[#1e3a5f]">{resultado.length}</span> processo(s)
          {somaValor > 0 && <> · soma das causas: <span className="font-semibold text-[#1e3a5f]">{fmtMoeda(somaValor)}</span></>}
          {valorAndamentos > 0 && <> · <span className="text-green-700 font-semibold">valores em andamentos{andamento !== 'todos' ? ` (${andamento.toLowerCase()})` : ''}: {fmtMoeda(valorAndamentos)}</span></>}
        </p>
      </div>

      {/* ── Resultado ── */}
      <div className="space-y-2.5 print-area">
        {resultado.length === 0 && (
          <p className="text-sm text-gray-500 py-10 text-center">Nenhum processo corresponde aos filtros.</p>
        )}
        {resultado.map(p => {
          const andamentos = ultimosAndamentos(p, 3);
          const poloLabel = p.polo === 'autor' ? 'Autor' : p.polo === 'réu' ? 'Réu' : '';
          return (
            <Card key={p.id} className="break-inside-avoid">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-7 h-7 rounded bg-[#1e3a5f] flex items-center justify-center flex-shrink-0"><Scale size={13} className="text-white" /></span>
                      <button onClick={() => setVerProc(p)} title="Abrir o processo" className="font-mono text-xs font-bold text-[#1e3a5f] hover:underline">{p.numero}</button>
                      <Badge className={`${statusColor[p.status]} text-[10px] capitalize`}>{p.status}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{p.area}</Badge>
                      {p.tribunal && <span className="text-[11px] text-gray-500">{p.tribunal}{p.comarca ? ` · ${p.comarca}` : ''}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-1.5">
                      {nomeCliente(p.clienteId)}
                      {poloLabel && <span className="text-[10px] text-blue-600 font-normal"> ({poloLabel})</span>}
                      <span className="text-gray-400 font-normal"> × </span>
                      {p.parteContraria || '—'}
                    </p>
                    {p.objeto && <p className="text-xs text-gray-600 mt-0.5"><span className="text-gray-400">Objeto:</span> {p.objeto}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400 uppercase">Valor da causa</p>
                    <p className="text-sm font-semibold text-[#1e3a5f]">{fmtMoeda(p.valorCausa)}</p>
                    {valorCasando(p) > 0 && (
                      <p className="text-[11px] text-green-700 font-medium mt-0.5" title={andamento !== 'todos' ? `Soma dos andamentos "${andamento}"${(andDe || andAte) ? ' no período' : ''}` : 'Soma dos valores em andamentos'}>
                        Andamentos: {fmtMoeda(valorCasando(p))}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">Distr.: {fmtData(p.dataDistribuicao)}</p>
                  </div>
                </div>

                {/* Últimos andamentos */}
                <div className="mt-3 border-t pt-2">
                  <p className="text-[10px] text-gray-400 uppercase mb-1 flex items-center gap-1"><Clock size={10} /> Últimos andamentos</p>
                  {andamentos.length === 0 ? (
                    <p className="text-xs text-gray-400">Sem andamentos registrados.</p>
                  ) : (
                    <ul className="space-y-1">
                      {andamentos.map(m => (
                        <li key={m.id} className="text-xs text-gray-700 flex gap-2 items-start">
                          <span className="font-mono text-gray-400 flex-shrink-0">{fmtData(m.data)}</span>
                          {m.tipo && <span className="text-[10px] bg-gray-100 text-gray-600 rounded px-1 flex-shrink-0 capitalize">{m.tipo}</span>}
                          <span className="truncate">{m.descricao}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <ProcessoDetalheDialog processo={verProc} onClose={() => setVerProc(null)} />
    </div>
  );
}
