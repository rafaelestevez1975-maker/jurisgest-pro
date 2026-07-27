import { useState, useMemo } from 'react';
import { useApp, genId } from '../context';
import type { Prazo, Processo, TipoPrazo, StatusPrazo, AreaDireito } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, CheckCircle, XCircle, AlertTriangle, Clock, Eye, EyeOff, Scale, ExternalLink, ChevronDown, Search, X } from 'lucide-react';
import { diasRestantes } from '../data';
import { ProcessoDetalheDialog } from './Processos';
import { MultiSelect } from './Relatorios';
import { toast } from 'sonner';
import { CopiarNumero } from './CopiarNumero';

const TIPOS: TipoPrazo[] = ['audiência','prazo_fatal','prazo_dilatório','diligência','reunião','outro'];
const STATUS_PRAZO: StatusPrazo[] = ['pendente','cumprido','cancelado'];
const AREAS_DIR: AreaDireito[] = ['cível','trabalhista','criminal','previdenciário','família','tributário','empresarial','administrativo','procon','outro'];

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

function CienciaIndicator({ prazo, onConfirmar, podeConfirmar = true }: { prazo: Prazo; onConfirmar: () => void; podeConfirmar?: boolean }) {
  if (prazo.status !== 'pendente') return null;
  if (prazo.vistoEm) {
    const data = prazo.vistoEm.split('T')[0];
    return (
      <div className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
        <Eye size={10} className="flex-shrink-0" />
        <span>Visto em {data}{prazo.vistoPor ? ` · ${prazo.vistoPor.split(' ')[0]}` : ''}</span>
      </div>
    );
  }
  // Somente leitura: mostra o status de ciência sem permitir a ação de mutação.
  if (!podeConfirmar) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 opacity-70">
        <EyeOff size={10} className="flex-shrink-0" />
        <span>Aguardando ciência</span>
      </div>
    );
  }
  return (
    <button
      className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 hover:bg-amber-100 transition-colors"
      onClick={onConfirmar}
      title="Clique para confirmar ciência deste prazo"
    >
      <EyeOff size={10} className="flex-shrink-0" />
      <span>Aguardando ciência</span>
    </button>
  );
}

const emptyPrazo = (): Omit<Prazo, 'id' | 'criadoEm'> => ({
  processoId: '', tipo: 'prazo_fatal', descricao: '', dataHora: '', diasUteis: true,
  responsavel: '', status: 'pendente', alertaDias: 3, agendadoPor: '',
});

// Seletor de processo com busca — opcional (agendamento pode não ter processo)
function ProcessoPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const cliNome = (p: Processo) => state.clientes.find(c => c.id === p.clienteId)?.nome || '';
  const selected = state.processos.find(p => p.id === value);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = state.processos.filter(p => !p.arquivado);
    const arr = term
      ? base.filter(p =>
          p.numero.toLowerCase().includes(term) ||
          cliNome(p).toLowerCase().includes(term) ||
          p.parteContraria.toLowerCase().includes(term))
      : base;
    return arr.slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, state.processos, state.clientes]);

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="mt-1 w-full h-8 px-2 text-sm border rounded flex items-center justify-between hover:bg-gray-50">
        {selected
          ? <span className="truncate"><span className="font-mono text-xs">{selected.numero}</span> · {cliNome(selected).split(' ')[0]}</span>
          : <span className="text-gray-400">Vincular a um processo (opcional)</span>}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="mt-1 border rounded p-2 bg-white shadow-sm">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-2 text-gray-400" />
            <Input autoFocus className="pl-7 h-8 text-xs" placeholder="Buscar por número, cliente ou parte..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="max-h-52 overflow-y-auto mt-1 space-y-0.5">
            <button type="button" onClick={() => { onChange(''); setOpen(false); setQ(''); }}
              className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1 ${!value ? 'bg-gray-100 font-medium' : ''}`}>
              <X size={11} className="text-gray-400" /> Sem processo vinculado
            </button>
            {list.map(p => (
              <button key={p.id} type="button" onClick={() => { onChange(p.id); setOpen(false); setQ(''); }}
                className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-blue-50 ${p.id === value ? 'bg-blue-50 font-medium' : ''}`}>
                <span className="font-mono text-[11px] text-[#1e3a5f]">{p.numero}</span>
                <span className="text-gray-500"> · {cliNome(p) || '—'}{p.parteContraria ? ` vs ${p.parteContraria.slice(0, 24)}` : ''}</span>
              </button>
            ))}
            {list.length === 0 && <p className="text-xs text-gray-400 px-2 py-2">Nenhum processo encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function PrazoForm({ initial, onSave, onCancel }: {
  initial: Omit<Prazo, 'id' | 'criadoEm'>;
  onSave: (d: Omit<Prazo, 'id' | 'criadoEm'>) => void;
  onCancel: () => void;
}) {
  const { state } = useApp();
  const [form, setForm] = useState(initial);
  const [verProc, setVerProc] = useState<Processo | null>(null);
  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Tarefa — o que precisa ser feito *</Label>
          <Textarea className="mt-1 text-sm" rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Apresentar contestação; protocolar recurso; ligar para o cliente confirmando audiência..." />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Processo vinculado <span className="text-gray-400">(opcional — quando cabível)</span></Label>
          <ProcessoPicker value={form.processoId} onChange={v => set('processoId', v)} />
          {form.processoId && (() => {
            const proc = state.processos.find(p => p.id === form.processoId);
            return proc ? (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="font-mono text-[11px] text-[#1e3a5f]">{proc.numero}</span>
                <CopiarNumero numero={proc.numero} size={11} />
                <button type="button" onClick={() => setVerProc(proc)} className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1">
                  <ExternalLink size={10} /> Abrir processo — ver andamentos e ações
                </button>
              </div>
            ) : null;
          })()}
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
        <div>
          <Label className="text-xs">Data e Hora *</Label>
          <Input className="mt-1 h-8 text-sm" type="datetime-local" step="300" value={form.dataHora} onChange={e => set('dataHora', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Responsável <span className="text-gray-400">(cumpre o prazo)</span> *</Label>
          <Select value={form.responsavel} onValueChange={v => set('responsavel', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="A quem foi delegado..." /></SelectTrigger>
            <SelectContent>{state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Agendado por <span className="text-gray-400">(dá o OK final)</span></Label>
          <Select value={form.agendadoPor || ''} onValueChange={v => set('agendadoPor', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Quem delegou..." /></SelectTrigger>
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
          if (!form.descricao.trim() || !form.dataHora) { toast.error('Preencha a tarefa e a data/hora.'); return; }
          if (!form.responsavel) { toast.error('Escolha o advogado responsável pelo prazo.'); return; }
          onSave(form);
        }}>Salvar</Button>
      </DialogFooter>
      <ProcessoDetalheDialog processo={verProc} onClose={() => setVerProc(null)} />
    </div>
  );
}

function CalendarioMes({ prazos, mes, onMesChange, selectedDia, onSelectDia }: {
  prazos: Prazo[]; mes: Date; onMesChange: (d: Date) => void; selectedDia: string; onSelectDia: (dia: string) => void;
}) {
  const ano = mes.getFullYear(), mesNum = mes.getMonth();
  const diasNoMes = new Date(ano, mesNum + 1, 0).getDate();
  const primeiroDia = new Date(ano, mesNum, 1).getDay();
  const prefixoMes = `${ano}-${String(mesNum + 1).padStart(2, '0')}`;
  const hoje = new Date();
  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  // dias com prazo EM ABERTO (negrito) e total por dia (ponto indicador)
  const abertos = new Set<string>();
  const totalPorDia = new Map<string, number>();
  for (const p of prazos) {
    const d = p.dataHora.split('T')[0];
    if (!d.startsWith(prefixoMes)) continue;
    totalPorDia.set(d, (totalPorDia.get(d) || 0) + 1);
    if (p.status === 'pendente') abertos.add(d);
  }

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const semana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => onMesChange(new Date(ano, mesNum - 1, 1))}>‹</Button>
        <span className="font-semibold text-sm text-[#1e3a5f]">{meses[mesNum]} {ano}</span>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => onMesChange(new Date(ano, mesNum + 1, 1))}>›</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {semana.map(s => <div key={s} className="text-center text-[10px] font-semibold text-gray-400 py-1">{s}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const dia = i + 1;
          const diaISO = `${prefixoMes}-${String(dia).padStart(2, '0')}`;
          const aberto = abertos.has(diaISO);
          const total = totalPorDia.get(diaISO) || 0;
          const isHoje = diaISO === hojeISO;
          const isSel = diaISO === selectedDia;
          return (
            <button key={dia} onClick={() => onSelectDia(diaISO)}
              className={`relative h-9 rounded flex items-center justify-center text-sm transition-colors
                ${isSel ? 'bg-[#1e3a5f] text-white font-bold'
                  : isHoje ? 'text-blue-600 font-bold ring-1 ring-blue-300'
                  : aberto ? 'font-bold text-[#1e3a5f] hover:bg-gray-100'
                  : 'text-gray-500 hover:bg-gray-100'}`}>
              {dia}
              {total > 0 && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? 'bg-white' : aberto ? 'bg-amber-500' : 'bg-gray-300'}`} />}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-3">Dia em <b className="text-[#1e3a5f]">negrito</b> = há prazo em aberto. Clique no dia para listar abaixo.</p>
    </div>
  );
}

export default function Prazos() {
  const { state, dispatch, usuario } = useApp();
  const hojeISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterArea, setFilterArea] = useState<string>('todas');
  const [verComo, setVerComo] = useState<string>('todos');
  const [respSel, setRespSel] = useState<string[]>([]);   // filtro por responsável (0 = todos)
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [diaSel, setDiaSel] = useState<string>(hojeISO);
  const [mesCal, setMesCal] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPrazo, setEditPrazo] = useState<Prazo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [andamentosProc, setAndamentosProc] = useState<Processo | null>(null);
  const [cienciaDialogId, setCienciaDialogId] = useState<string | null>(null);
  const [cienciaNome, setCienciaNome] = useState('');
  const [okFinalId, setOkFinalId] = useState<string | null>(null);
  const [okNome, setOkNome] = useState('');

  // pertence ao período selecionado (dia / semana que contém o dia / mês do dia)
  const inPeriodo = (dh: string) => {
    const d = dh.split('T')[0];
    if (periodo === 'dia') return d === diaSel;
    if (periodo === 'mes') return d.slice(0, 7) === diaSel.slice(0, 7);
    const base = new Date(diaSel + 'T12:00');
    const ini = new Date(base); ini.setDate(base.getDate() - base.getDay());
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    const dt = new Date(d + 'T12:00');
    return dt >= ini && dt <= fim;
  };

  const filtered = state.prazos.filter(p => {
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (filterTipo !== 'todos' && p.tipo !== filterTipo) return false;
    if (respSel.length > 0 && !respSel.includes(p.responsavel)) return false;
    const proc = p.processoId ? state.processos.find(pr => pr.id === p.processoId) : undefined;
    if (filterArea !== 'todas' && (!proc || proc.area !== filterArea)) return false;
    // FILTRO-BASE (perfil do usuário logado): vê áreas visíveis + suas próprias tarefas.
    // Admin (areasVisiveis === null) vê tudo. Compõe (AND) com os demais filtros.
    {
      const areaVisivel = usuario.areasVisiveis === null || usuario.emArea(proc?.area);
      const minhaTarefaUsuario = p.responsavel === usuario.nome || p.agendadoPor === usuario.nome;
      if (!areaVisivel && !minhaTarefaUsuario) return false;
    }
    // "Ver como advogado": prazos das ÁREAS dele (pelo processo vinculado) OU tarefas dele
    if (verComo !== 'todos') {
      const adv = state.advogados.find(a => a.nome === verComo);
      const areas = adv?.areas || [];
      const naArea = !!proc && areas.includes(proc.area);
      const minhaTarefa = p.responsavel === verComo || p.agendadoPor === verComo;
      if (!naArea && !minhaTarefa) return false;
    }
    return inPeriodo(p.dataHora);
  }).sort((a, b) => {
    const rank = (s: string) => (s === 'pendente' ? 0 : 1);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return a.dataHora.localeCompare(b.dataHora);
  });

  // agrupa por data (subcabeçalhos, como no modelo do Integra)
  const gruposPorData = filtered.reduce<Record<string, Prazo[]>>((acc, p) => {
    const d = p.dataHora.split('T')[0];
    (acc[d] = acc[d] || []).push(p);
    return acc;
  }, {});
  const datasOrdenadas = Object.keys(gruposPorData).sort();

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

  // 1) Responsável declara que cumpriu (fica aguardando o OK de quem agendou)
  const declararCumprido = (id: string) => {
    const p = state.prazos.find(p => p.id === id);
    if (!p) return;
    dispatch({ type: 'UPDATE_PRAZO', payload: { ...p, cumpridoDeclaradoEm: new Date().toISOString(), cumpridoDeclaradoPor: p.responsavel || '' } });
    toast.success(`Marcado como cumprido — aguardando OK de ${p.agendadoPor || 'quem agendou'}.`);
  };
  const desfazerCumprido = (id: string) => {
    const p = state.prazos.find(p => p.id === id);
    if (!p) return;
    dispatch({ type: 'UPDATE_PRAZO', payload: { ...p, cumpridoDeclaradoEm: undefined, cumpridoDeclaradoPor: undefined } });
  };

  // 2) Quem agendou dá o OK final e o prazo é BAIXADO (status = cumprido)
  const darOkFinal = (id: string, nome: string) => {
    const p = state.prazos.find(p => p.id === id);
    if (!p) return;
    dispatch({ type: 'UPDATE_PRAZO', payload: { ...p, status: 'cumprido', aprovadoEm: new Date().toISOString(), aprovadoPor: nome || p.agendadoPor || '' } });
    toast.success(`Prazo baixado${nome ? ` com OK de ${nome}` : ''}.`);
    setOkFinalId(null); setOkNome('');
  };

  const reabrirPrazo = (id: string) => {
    const p = state.prazos.find(p => p.id === id);
    if (p) { dispatch({ type: 'UPDATE_PRAZO', payload: { ...p, status: 'pendente', aprovadoEm: undefined, aprovadoPor: undefined, cumpridoDeclaradoEm: undefined, cumpridoDeclaradoPor: undefined } }); toast.success('Prazo reaberto.'); }
  };

  const confirmarCiencia = (prazoId: string, nome: string) => {
    const p = state.prazos.find(p => p.id === prazoId);
    if (!p) return;
    dispatch({
      type: 'UPDATE_PRAZO',
      payload: { ...p, vistoEm: new Date().toISOString(), vistoPor: nome || p.responsavel },
    });
    toast.success(`Ciência confirmada${nome ? ` por ${nome}` : ''}!`);
    setCienciaDialogId(null);
    setCienciaNome('');
  };

  const pendentes7 = state.prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) <= 7 && diasRestantes(p.dataHora) >= 0).length;
  const aguardandoCiencia = state.prazos.filter(p => p.status === 'pendente' && !p.vistoEm).length;

  const rotuloPeriodo = () => {
    const base = new Date(diaSel + 'T12:00');
    if (periodo === 'dia') return base.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (periodo === 'mes') return base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const ini = new Date(base); ini.setDate(base.getDate() - base.getDay());
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    const f = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `Semana de ${f(ini)} a ${f(fim)}`;
  };
  const irHoje = () => { const d = new Date(); setDiaSel(hojeISO); setMesCal(new Date(d.getFullYear(), d.getMonth(), 1)); setPeriodo('dia'); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Agenda de Prazos</h1>
          <p className="text-sm text-gray-500 flex items-center gap-3 flex-wrap mt-0.5">
            {pendentes7 > 0 && <span className="text-yellow-600 font-medium flex items-center gap-1"><AlertTriangle size={12} />{pendentes7} prazo(s) em 7 dias</span>}
            {aguardandoCiencia > 0 && <span className="text-amber-600 font-medium flex items-center gap-1"><EyeOff size={12} />{aguardandoCiencia} aguardando ciência</span>}
            <span className="text-gray-400">{state.prazos.length} total</span>
          </p>
        </div>
        {usuario.podeEditar && (
          <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 text-xs" onClick={() => { setEditPrazo(null); setDialogOpen(true); }}>
            <Plus size={14} className="mr-1" /> Novo Prazo
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* ESQUERDA: calendário (largura fixa, fixo ao rolar) */}
        <Card className="w-full lg:w-[320px] lg:flex-shrink-0 lg:sticky lg:top-20">
          <CardContent className="p-4">
            <CalendarioMes prazos={state.prazos} mes={mesCal} onMesChange={setMesCal}
              selectedDia={diaSel} onSelectDia={dia => { setDiaSel(dia); setPeriodo('dia'); }} />
          </CardContent>
        </Card>

        {/* DIREITA: filtros em cima + lista ocupando o restante */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Período (Dia / Semana / Mês) + filtros */}
          <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={irHoje}>Hoje</Button>
          <div className="flex border rounded overflow-hidden">
            {(['dia', 'semana', 'mes'] as const).map(pr => (
              <Button key={pr} variant={periodo === pr ? 'default' : 'ghost'} size="sm"
                className={`h-8 text-xs rounded-none px-3 ${periodo === pr ? 'bg-[#1e3a5f] hover:bg-[#1e3a5f]' : ''}`}
                onClick={() => setPeriodo(pr)}>
                {pr === 'dia' ? 'Dia' : pr === 'semana' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </div>
          <span className="text-sm font-medium text-[#1e3a5f] capitalize">{rotuloPeriodo()}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS_PRAZO.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos tipos</SelectItem>
              {TIPOS.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterArea} onValueChange={setFilterArea}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as áreas</SelectItem>
              {AREAS_DIR.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <MultiSelect
            label="Responsável"
            emptyLabel="Responsável: todos"
            width="w-48"
            options={(() => {
              const cont = new Map<string, number>();
              state.prazos.filter(p => p.status === 'pendente').forEach(p => { const r = p.responsavel || ''; if (r) cont.set(r, (cont.get(r) || 0) + 1); });
              return [...new Set([...state.advogados.map(a => a.nome), ...state.prazos.map(p => p.responsavel)])]
                .filter(Boolean)
                .sort((a, b) => (cont.get(b) || 0) - (cont.get(a) || 0) || a.localeCompare(b))
                .map(n => ({ value: n, label: `${n}${cont.get(n) ? ` (${cont.get(n)} pend.)` : ''}` }));
            })()}
            selected={respSel}
            onChange={setRespSel}
          />
          <Select value={verComo} onValueChange={setVerComo}>
            <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="Ver como" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Ver como: todos</SelectItem>
              {state.advogados.map(a => (
                <SelectItem key={a.id} value={a.nome}>
                  {a.nome}{a.areas && a.areas.length ? ` — ${a.areas.length} área${a.areas.length > 1 ? 's' : ''}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listagem agrupada por data (modelo Integra) */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Exibindo {filtered.length} {filtered.length === 1 ? 'agendamento' : 'agendamentos'}
          {verComo !== 'todos' && (() => {
            const adv = state.advogados.find(a => a.nome === verComo);
            const areas = adv?.areas || [];
            return <span className="text-[#1e3a5f]"> · como <b>{verComo}</b> {areas.length ? <span className="capitalize">(áreas: {areas.join(', ')})</span> : '(sem áreas definidas — mostrando só as tarefas dele)'}</span>;
          })()}
        </p>
        {filtered.length === 0 && <p className="text-sm text-gray-500 py-8 text-center border rounded-lg">Nenhum prazo neste período.</p>}
        {datasOrdenadas.map(dataChave => (
          <div key={dataChave} className="space-y-2">
            <div className="bg-gray-100 rounded px-3 py-1.5 text-xs font-semibold text-gray-600 capitalize">
              {new Date(dataChave + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            {gruposPorData[dataChave].map(prazo => {
            const dias = diasRestantes(prazo.dataHora);
            const proc = state.processos.find(p => p.id === prazo.processoId);
            const [data, hora] = prazo.dataHora.split('T');
            const concluido = prazo.status === 'cumprido' || prazo.status === 'cancelado';
            return (
              <Card key={prazo.id}
                onClick={usuario.podeEditar ? () => { setEditPrazo(prazo); setDialogOpen(true); } : undefined}
                title={usuario.podeEditar ? 'Clique para abrir e editar o agendamento' : undefined}
                className={`border-l-4 ${urgencyStyle(dias, prazo.status)} ${concluido ? 'opacity-70' : ''} ${usuario.podeEditar ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${concluido ? 'line-through text-gray-400' : 'text-[#1e3a5f]'}`}>{prazo.descricao}</span>
                        <Badge className={`${tipoColor[prazo.tipo]} text-[10px] px-1.5`}>{prazo.tipo.replace('_', ' ')}</Badge>
                        {prazo.status === 'pendente' && prazo.cumpridoDeclaradoEm && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5"><Clock size={9} className="mr-0.5" />Cumprido — aguardando OK{prazo.agendadoPor ? ` de ${prazo.agendadoPor.split(' ')[0]}` : ''}</Badge>}
                        {prazo.status === 'cumprido' && <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5"><CheckCircle size={9} className="mr-0.5" />Baixado{prazo.aprovadoPor ? ` · OK ${prazo.aprovadoPor.split(' ')[0]}` : ''}</Badge>}
                        {prazo.status === 'cancelado' && <Badge className="bg-gray-100 text-gray-500 text-[10px] px-1.5">Cancelado</Badge>}
                      </div>
                      {proc ? (
                        <div className="flex items-center gap-1 mt-0.5 max-w-full">
                          <button
                            className="text-xs text-blue-600 hover:underline font-mono truncate flex items-center gap-1 min-w-0"
                            title="Abrir o processo"
                            onClick={(e) => { e.stopPropagation(); setAndamentosProc(proc); }}
                          >
                            <Scale size={10} className="flex-shrink-0" />
                            <span className="truncate">{proc.numero}</span>
                            <ExternalLink size={9} className="flex-shrink-0" />
                          </button>
                          <CopiarNumero numero={proc.numero} size={11} />
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5 italic">Sem processo vinculado</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Clock size={10} />{data} {hora && hora.slice(0,5)}</span>
                        <span>{prazo.diasUteis ? 'Dias úteis' : 'Dias corridos'}</span>
                        <span className="font-medium text-[#1e3a5f]">Resp.: {prazo.responsavel || '—'}</span>
                        {prazo.agendadoPor && <span>· agendou: {prazo.agendadoPor}</span>}
                      </div>
                      {/* Indicador de ciência */}
                      <div className="mt-2" onClick={e => e.stopPropagation()}>
                        <CienciaIndicator
                          prazo={prazo}
                          podeConfirmar={usuario.podeEditar}
                          onConfirmar={() => { setCienciaDialogId(prazo.id); setCienciaNome(prazo.responsavel); }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {urgencyBadge(dias, prazo.status)}
                      {usuario.podeEditar && prazo.status === 'pendente' && !prazo.cumpridoDeclaradoEm && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600 hover:text-green-700 px-2" title="O responsável marca que cumpriu" onClick={() => declararCumprido(prazo.id)}>
                          <CheckCircle size={13} className="mr-1" />Cumpri
                        </Button>
                      )}
                      {usuario.podeEditar && prazo.status === 'pendente' && prazo.cumpridoDeclaradoEm && (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 px-2" title="Quem agendou dá o OK final e baixa o prazo" onClick={() => { setOkFinalId(prazo.id); setOkNome(prazo.agendadoPor || ''); }}>
                            <CheckCircle size={13} className="mr-1" />Dar OK
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-amber-600" title="Desfazer 'cumpri'" onClick={() => desfazerCumprido(prazo.id)}><XCircle size={13} /></Button>
                        </>
                      )}
                      {usuario.podeEditar && prazo.status === 'cumprido' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-blue-600 px-2" onClick={() => reabrirPrazo(prazo.id)}>Reabrir</Button>
                      )}
                      {usuario.podeEditar && prazo.status !== 'cancelado' && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" title="Cancelar prazo" onClick={() => setDeleteId(prazo.id)}><XCircle size={13} /></Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        ))}
        </div>
        </div>
      </div>

      {/* Dialog formulário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-[#1e3a5f]">{editPrazo ? 'Editar Prazo' : 'Novo Prazo'}</DialogTitle></DialogHeader>
          <PrazoForm
            initial={editPrazo ? { processoId: editPrazo.processoId, tipo: editPrazo.tipo, descricao: editPrazo.descricao, dataHora: editPrazo.dataHora, diasUteis: editPrazo.diasUteis, responsavel: editPrazo.responsavel, status: editPrazo.status, alertaDias: editPrazo.alertaDias, agendadoPor: editPrazo.agendadoPor || '' } : emptyPrazo()}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditPrazo(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar ciência */}
      <Dialog open={!!cienciaDialogId} onOpenChange={() => { setCienciaDialogId(null); setCienciaNome(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2"><Eye size={16} />Confirmar Ciência do Prazo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Confirme que o responsável pelo prazo tomou ciência e está ciente do vencimento.
            </p>
            <div>
              <Label className="text-xs">Quem está confirmando a ciência</Label>
              <Select value={cienciaNome} onValueChange={setCienciaNome}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
              A data e hora de ciência será registrada automaticamente: <strong>{new Date().toLocaleDateString('pt-BR')}</strong>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setCienciaDialogId(null); setCienciaNome(''); }}>Cancelar</Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => cienciaDialogId && confirmarCiencia(cienciaDialogId, cienciaNome)}>
              <Eye size={13} className="mr-1" /> Confirmar Ciência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog OK final — quem agendou confirma e baixa o prazo */}
      <Dialog open={!!okFinalId} onOpenChange={() => { setOkFinalId(null); setOkNome(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2"><CheckCircle size={16} className="text-green-600" />OK final — baixar prazo</DialogTitle>
          </DialogHeader>
          {(() => {
            const p = okFinalId ? state.prazos.find(x => x.id === okFinalId) : null;
            return (
              <div className="space-y-3">
                {p && (
                  <div className="text-xs bg-gray-50 border rounded p-2">
                    <p className="font-medium text-gray-800">{p.descricao}</p>
                    <p className="text-gray-500 mt-0.5">
                      Cumprido por <b>{p.cumpridoDeclaradoPor || p.responsavel || '—'}</b>
                      {p.cumpridoDeclaradoEm ? ` em ${p.cumpridoDeclaradoEm.split('T')[0].split('-').reverse().join('/')}` : ''}.
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-600">Confirme o OK final. O prazo será <b>baixado</b> (marcado como cumprido) e sai da lista de pendentes.</p>
                <div>
                  <Label className="text-xs">Quem está dando o OK final</Label>
                  <Select value={okNome} onValueChange={setOkNome}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setOkFinalId(null); setOkNome(''); }}>Cancelar</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => okFinalId && darOkFinal(okFinalId, okNome)}>
              <CheckCircle size={13} className="mr-1" /> Dar OK e baixar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cancelar prazo */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancelar prazo</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">O prazo passa para a situação <b>cancelado</b> — ele <b>não é excluído</b> e continua no histórico (filtre por "cancelado" para vê-lo).</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Voltar</Button>
            <Button size="sm" className="bg-slate-500 hover:bg-slate-600" onClick={() => { if (deleteId) { const p = state.prazos.find(x => x.id === deleteId); if (p) dispatch({ type: 'UPDATE_PRAZO', payload: { ...p, status: 'cancelado' } }); toast.success('Prazo cancelado.'); setDeleteId(null); } }}>Cancelar prazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Andamentos do processo (ao clicar no nº do processo) */}
      <ProcessoDetalheDialog processo={andamentosProc} onClose={() => setAndamentosProc(null)} />
    </div>
  );
}
