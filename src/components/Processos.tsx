import { useState } from 'react';
import { useApp, genId } from '../context';
import type { Processo, AreaDireito, FaseProcessual, StatusProcesso, Movimentacao } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, ChevronRight, Clock, Scale, Wifi, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AREAS: AreaDireito[] = ['cível','trabalhista','criminal','previdenciário','família','tributário','empresarial','administrativo','outro'];
const FASES: FaseProcessual[] = ['conhecimento','recursal','execução','outro'];
const STATUS_LIST: StatusProcesso[] = ['ativo','arquivado','ganho','perdido','acordo'];
const TRIBUNAIS = ['TJSP','TJRJ','TJMG','TJRS','TJPR','TJSC','TJBA','TJPE','TJCE','TRT1','TRT2','TRT3','TRT4','TRT15','TRF1','TRF2','TRF3','TRF4','TRF5','STJ','STF','TST','JFSP','JFRJ','Outro'];

// DataJud API key (public, shared by CNJ for open access)
const DATAJUD_API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

// Map tribunal code from CNJ process number to DataJud API endpoint
function tribunalFromNumero(numero: string): { endpoint: string; sigla: string } | null {
  // Format: NNNNNNN-DD.AAAA.J.TT.OOOO
  const clean = numero.replace(/\D/g, '');
  if (clean.length < 20) return null;
  // Position 13: J (justice segment), 14-15: TT (tribunal)
  const j = clean[13];
  const tt = clean.substring(14, 16);

  const map: Record<string, { endpoint: string; sigla: string }> = {
    '8.26': { endpoint: 'tjsp', sigla: 'TJSP' },
    '8.19': { endpoint: 'tjrj', sigla: 'TJRJ' },
    '8.13': { endpoint: 'tjmg', sigla: 'TJMG' },
    '8.21': { endpoint: 'tjrs', sigla: 'TJRS' },
    '8.16': { endpoint: 'tjpr', sigla: 'TJPR' },
    '8.24': { endpoint: 'tjsc', sigla: 'TJSC' },
    '8.05': { endpoint: 'tjba', sigla: 'TJBA' },
    '8.17': { endpoint: 'tjpe', sigla: 'TJPE' },
    '8.06': { endpoint: 'tjce', sigla: 'TJCE' },
    '8.10': { endpoint: 'tjgo', sigla: 'TJGO' },
    '8.12': { endpoint: 'tjms', sigla: 'TJMS' },
    '8.08': { endpoint: 'tjes', sigla: 'TJES' },
    '5.01': { endpoint: 'trt1', sigla: 'TRT1' },
    '5.02': { endpoint: 'trt2', sigla: 'TRT2' },
    '5.03': { endpoint: 'trt3', sigla: 'TRT3' },
    '5.04': { endpoint: 'trt4', sigla: 'TRT4' },
    '5.15': { endpoint: 'trt15', sigla: 'TRT15' },
    '4.01': { endpoint: 'trf1', sigla: 'TRF1' },
    '4.02': { endpoint: 'trf2', sigla: 'TRF2' },
    '4.03': { endpoint: 'trf3', sigla: 'TRF3' },
    '4.04': { endpoint: 'trf4', sigla: 'TRF4' },
    '4.05': { endpoint: 'trf5', sigla: 'TRF5' },
    '3.00': { endpoint: 'stj', sigla: 'STJ' },
    '1.00': { endpoint: 'stf', sigla: 'STF' },
  };

  const key = `${j}.${tt}`;
  return map[key] || null;
}

// Infer area from class name
function inferirArea(classeNome: string): AreaDireito {
  const c = classeNome.toLowerCase();
  if (c.includes('trabalh') || c.includes('emprego') || c.includes('horas extras') || c.includes('reclamaç')) return 'trabalhista';
  if (c.includes('criminal') || c.includes('penal') || c.includes('crime') || c.includes('delito') || c.includes('infração penal')) return 'criminal';
  if (c.includes('família') || c.includes('divórcio') || c.includes('guarda') || c.includes('aliment') || c.includes('inventário') || c.includes('uniã')) return 'família';
  if (c.includes('previdên') || c.includes('inss') || c.includes('benefício') || c.includes('aposentad')) return 'previdenciário';
  if (c.includes('tribut') || c.includes('fiscal') || c.includes('imposto') || c.includes('icms') || c.includes('iss')) return 'tributário';
  if (c.includes('empresa') || c.includes('societári') || c.includes('falênc') || c.includes('recuperaç')) return 'empresarial';
  if (c.includes('administrat') || c.includes('mandado') || c.includes('improbidade')) return 'administrativo';
  return 'cível';
}

interface DataJudResult {
  numero: string;
  tribunal: string;
  classe: string;
  assunto: string;
  dataAjuizamento: string;
  valorCausa?: number;
  orgaoJulgador: string;
  partes: { polo: string; nome: string; tipoPessoa?: string }[];
  movimentos: { data: string; nome: string }[];
  grau: string;
}

async function buscarDataJud(numero: string): Promise<DataJudResult> {
  const tribunal = tribunalFromNumero(numero);
  if (!tribunal) throw new Error('Não foi possível identificar o tribunal pelo número CNJ.');

  // Remove formatting for API query
  const numeroLimpo = numero.replace(/\D/g, '');

  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal.endpoint}/_search`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${DATAJUD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: { match: { numeroProcesso: numeroLimpo } },
      size: 1,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Tribunal ${tribunal.sigla}: servidor retornou ${resp.status}. Tente novamente.`);
  }

  const data = await resp.json();
  const hits = data?.hits?.hits;
  if (!hits || hits.length === 0) {
    throw new Error(`Processo não encontrado no ${tribunal.sigla}. Verifique o número e tente novamente.`);
  }

  const src = hits[0]._source;
  const partes: DataJudResult['partes'] = (src.partes || []).map((p: any) => ({
    polo: p.polo || '',
    nome: p.nome || '',
    tipoPessoa: p.tipoPessoa || '',
  }));
  const movimentos: DataJudResult['movimentos'] = (src.movimentos || [])
    .slice(0, 10)
    .map((m: any) => ({ data: m.dataHora?.split('T')[0] || '', nome: m.nome || '' }));

  return {
    numero: src.numeroProcesso || numero,
    tribunal: tribunal.sigla,
    classe: src.classe?.nome || '',
    assunto: (src.assuntos || []).map((a: any) => a.nome).join(', ') || '',
    dataAjuizamento: src.dataAjuizamento?.split('T')[0] || '',
    valorCausa: src.valorCausa || undefined,
    orgaoJulgador: src.orgaoJulgador?.nome || '',
    partes,
    movimentos,
    grau: src.grau || '',
  };
}

// ─── Busca DataJud Dialog ───────────────────────────────────────────────────

function DialogBuscarDataJud({ onPreencherFormulario, onClose }: {
  onPreencherFormulario: (dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>> & { movimentacoes?: Movimentacao[] }) => void;
  onClose: () => void;
}) {
  const { state } = useApp();
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<DataJudResult | null>(null);
  const [erro, setErro] = useState('');
  const [clienteId, setClienteId] = useState('');

  const formatarNumero = (v: string) => {
    // Auto-format as NNNNNNN-DD.AAAA.J.TT.OOOO
    const d = v.replace(/\D/g, '');
    if (d.length <= 7) return d;
    if (d.length <= 9) return `${d.slice(0,7)}-${d.slice(7)}`;
    if (d.length <= 13) return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9)}`;
    if (d.length <= 14) return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13)}`;
    if (d.length <= 16) return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14)}`;
    if (d.length <= 20) return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d.slice(13,14)}.${d.slice(14,16)}.${d.slice(16)}`;
    return v;
  };

  const buscar = async () => {
    const numLimpo = numero.replace(/\D/g, '');
    if (numLimpo.length < 20) { setErro('Digite o número completo do processo (20 dígitos).'); return; }
    setLoading(true);
    setErro('');
    setResultado(null);
    try {
      const res = await buscarDataJud(numero);
      setResultado(res);
    } catch (e: any) {
      setErro(e.message || 'Erro ao consultar o DataJud.');
    }
    setLoading(false);
  };

  const polePassivo = resultado?.partes.find(p => p.polo?.toLowerCase().includes('passiv'));
  const poleAtivo = resultado?.partes.find(p => p.polo?.toLowerCase().includes('ativ'));

  const confirmar = () => {
    if (!resultado) return;
    const movs: Movimentacao[] = resultado.movimentos.map(m => ({
      id: genId(), data: m.data, tipo: 'Movimentação', descricao: m.nome,
    }));
    onPreencherFormulario({
      numero: resultado.numero,
      tribunal: resultado.tribunal,
      vara: resultado.orgaoJulgador,
      comarca: resultado.orgaoJulgador.replace(/vara.*/i, '').trim(),
      area: inferirArea(resultado.classe + ' ' + resultado.assunto),
      fase: resultado.grau === '2' ? 'recursal' : 'conhecimento',
      parteContraria: polePassivo?.nome || '',
      valorCausa: resultado.valorCausa,
      dataDistribuicao: resultado.dataAjuizamento,
      status: 'ativo',
      observacoes: resultado.assunto ? `Assunto: ${resultado.assunto}` : '',
      clienteId,
      movimentacoes: movs,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Instrução */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 flex gap-2">
        <Wifi size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Consulta pública via DataJud (CNJ)</p>
          <p className="mt-0.5">Cobre TJSP, TJRJ, TJMG, TRTs, TRFs, STJ, STF e mais. Não requer login.</p>
        </div>
      </div>

      {/* Campo número */}
      <div>
        <Label className="text-xs font-semibold">Número CNJ do processo *</Label>
        <div className="flex gap-2 mt-1">
          <Input
            className="h-9 text-sm font-mono flex-1"
            placeholder="0000000-00.0000.0.00.0000"
            value={numero}
            onChange={e => setNumero(formatarNumero(e.target.value))}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            maxLength={25}
          />
          <Button className="h-9 bg-[#2563eb] hover:bg-blue-700 text-xs px-4 flex-shrink-0" onClick={buscar} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Ex: 0001234-56.2024.8.26.0001</p>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2 text-xs text-red-700">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-green-800">Processo encontrado no {resultado.tribunal}</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 bg-gray-50 rounded p-2">
                <p className="text-gray-400 text-[10px] uppercase mb-0.5">Classe / Assunto</p>
                <p className="font-semibold">{resultado.classe || '—'}</p>
                {resultado.assunto && <p className="text-gray-500 mt-0.5">{resultado.assunto}</p>}
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-400 text-[10px] uppercase mb-0.5">Órgão Julgador</p>
                <p className="font-medium">{resultado.orgaoJulgador || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-400 text-[10px] uppercase mb-0.5">Ajuizamento</p>
                <p className="font-medium">{resultado.dataAjuizamento || '—'}</p>
              </div>
              {resultado.valorCausa !== undefined && (
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-400 text-[10px] uppercase mb-0.5">Valor da Causa</p>
                  <p className="font-medium">R$ {resultado.valorCausa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-400 text-[10px] uppercase mb-0.5">Grau</p>
                <p className="font-medium capitalize">{resultado.grau === '2' ? '2º Grau (Recursal)' : '1º Grau'}</p>
              </div>
            </div>

            {/* Partes */}
            {resultado.partes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1.5">Partes</p>
                <div className="space-y-1">
                  {resultado.partes.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs border rounded px-2 py-1.5">
                      <Badge variant="outline" className={`text-[9px] px-1 flex-shrink-0 ${p.polo?.toLowerCase().includes('ativ') ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-orange-50 border-orange-300 text-orange-700'}`}>
                        {p.polo || 'Parte'}
                      </Badge>
                      <span className="font-medium truncate">{p.nome}</span>
                      {p.tipoPessoa && <span className="text-gray-400 ml-auto flex-shrink-0">{p.tipoPessoa}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimas movimentações */}
            {resultado.movimentos.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1.5">Últimas movimentações ({resultado.movimentos.length})</p>
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {resultado.movimentos.map((m, i) => (
                    <div key={i} className="flex gap-2 text-xs py-1 border-b border-gray-50 last:border-0">
                      <span className="text-gray-400 flex-shrink-0 w-20">{m.data}</span>
                      <span className="text-gray-700 truncate">{m.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vincular cliente */}
            <div className="border-t pt-3">
              <Label className="text-xs font-semibold">Vincular a um cliente cadastrado</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione o cliente (opcional)" /></SelectTrigger>
                <SelectContent>
                  {state.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400 mt-1">Parte ativa identificada: <strong>{poleAtivo?.nome || '—'}</strong></p>
            </div>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button
          size="sm"
          className="bg-[#2563eb] hover:bg-blue-700"
          disabled={!resultado}
          onClick={confirmar}
        >
          Pré-preencher formulário
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Formulário ─────────────────────────────────────────────────────────────

const statusColor: Record<StatusProcesso, string> = {
  ativo: 'bg-blue-100 text-blue-700',
  arquivado: 'bg-gray-100 text-gray-600',
  ganho: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
  acordo: 'bg-purple-100 text-purple-700',
};

const emptyProcesso = (): Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'> => ({
  numero: '', clienteId: '', vara: '', tribunal: '', comarca: '', area: 'cível',
  fase: 'conhecimento', parteContraria: '', advogadoResponsavel: '', valorCausa: undefined,
  dataDistribuicao: '', status: 'ativo', observacoes: '',
});

function ProcessoForm({ initial, onSave, onCancel }: {
  initial: Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>;
  onSave: (data: Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>, movs?: Movimentacao[]) => void;
  onCancel: () => void;
}) {
  const { state } = useApp();
  const [form, setForm] = useState(initial);
  const [pendingMovs, setPendingMovs] = useState<Movimentacao[]>([]);
  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // expose a way for parent to update form (DataJud prefill)
  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      {pendingMovs.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800 flex items-center gap-2">
          <CheckCircle2 size={12} />
          <span>{pendingMovs.length} movimentação(ões) do DataJud serão importadas automaticamente.</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Número CNJ *</Label>
          <Input className="mt-1 h-8 text-sm font-mono" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Cliente *</Label>
          <Select value={form.clienteId} onValueChange={v => set('clienteId', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{state.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tribunal *</Label>
          <Select value={form.tribunal} onValueChange={v => set('tribunal', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{TRIBUNAIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Comarca</Label>
          <Input className="mt-1 h-8 text-sm" value={form.comarca} onChange={e => set('comarca', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Vara / Juízo</Label>
          <Input className="mt-1 h-8 text-sm" value={form.vara} onChange={e => set('vara', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Área do Direito</Label>
          <Select value={form.area} onValueChange={v => set('area', v as AreaDireito)}>
            <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{AREAS.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Fase Processual</Label>
          <Select value={form.fase} onValueChange={v => set('fase', v as FaseProcessual)}>
            <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{FASES.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Situação</Label>
          <Select value={form.status} onValueChange={v => set('status', v as StatusProcesso)}>
            <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data de Distribuição</Label>
          <Input className="mt-1 h-8 text-sm" type="date" value={form.dataDistribuicao} onChange={e => set('dataDistribuicao', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Parte Contrária</Label>
          <Input className="mt-1 h-8 text-sm" value={form.parteContraria} onChange={e => set('parteContraria', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Advogado Responsável</Label>
          <Select value={form.advogadoResponsavel} onValueChange={v => set('advogadoResponsavel', v)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}
              <SelectItem value="_outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Valor da Causa (R$)</Label>
          <Input className="mt-1 h-8 text-sm" type="number" value={form.valorCausa || ''} onChange={e => set('valorCausa', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Observações</Label>
          <Textarea className="mt-1 text-sm" rows={2} value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700" onClick={() => {
          if (!form.numero.trim() || !form.clienteId || !form.tribunal) { toast.error('Preencha número, cliente e tribunal.'); return; }
          onSave(form, pendingMovs);
        }}>Salvar</Button>
      </DialogFooter>

      {/* hidden state updater exposed via ref pattern — we use a prop callback instead */}
      <UpdateFormHook form={form} setForm={setForm} setPendingMovs={setPendingMovs} />
    </div>
  );
}

// Helper that receives pre-fill data from DataJud and pushes into form state
// We use a forwardRef pattern via context — simpler: use a key to remount
function UpdateFormHook({ form: _f, setForm, setPendingMovs }: { form: any; setForm: any; setPendingMovs: any }) {
  return null; // logic handled at parent level via key remount
}

// ─── Detalhe Processo ────────────────────────────────────────────────────────

function ProcessoDetalhe({ processo, onClose: _onClose }: { processo: Processo; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [novaMovTab, setNovaMovTab] = useState(false);
  const [novaMov, setNovaMov] = useState({ data: '', tipo: '', descricao: '' });
  const [buscandoMov, setBuscandoMov] = useState(false);
  const cliente = state.clientes.find(c => c.id === processo.clienteId);
  const prazosProc = state.prazos.filter(p => p.processoId === processo.id);
  const peticoesProc = state.peticoes.filter(p => p.processoId === processo.id);

  const addMovimentacao = () => {
    if (!novaMov.data || !novaMov.descricao) { toast.error('Preencha data e descrição.'); return; }
    const mov: Movimentacao = { id: genId(), ...novaMov };
    const updated = { ...processo, movimentacoes: [...processo.movimentacoes, mov] };
    dispatch({ type: 'UPDATE_PROCESSO', payload: updated });
    setNovaMov({ data: '', tipo: '', descricao: '' });
    setNovaMovTab(false);
    toast.success('Movimentação adicionada!');
  };

  const sincronizarDataJud = async () => {
    setBuscandoMov(true);
    try {
      const res = await buscarDataJud(processo.numero);
      const existentes = new Set(processo.movimentacoes.map(m => m.data + m.descricao));
      const novas = res.movimentos
        .filter(m => !existentes.has(m.data + m.nome))
        .map(m => ({ id: genId(), data: m.data, tipo: 'DataJud', descricao: m.nome }));
      if (novas.length === 0) {
        toast.info('Nenhuma movimentação nova encontrada.');
      } else {
        const updated = { ...processo, movimentacoes: [...processo.movimentacoes, ...novas] };
        dispatch({ type: 'UPDATE_PROCESSO', payload: updated });
        toast.success(`${novas.length} movimentação(ões) importada(s) do DataJud!`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao consultar DataJud.');
    }
    setBuscandoMov(false);
  };

  return (
    <div className="max-h-[75vh] overflow-y-auto pr-1">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-mono text-sm font-bold text-[#1e3a5f]">{processo.numero}</p>
          <p className="text-xs text-gray-500 mt-0.5">{cliente?.nome} · {processo.tribunal} · {processo.comarca}</p>
        </div>
        <Badge className={`${statusColor[processo.status]} capitalize text-xs`}>{processo.status}</Badge>
      </div>
      <Tabs defaultValue="info">
        <TabsList className="text-xs h-8">
          <TabsTrigger value="info" className="text-xs">Informações</TabsTrigger>
          <TabsTrigger value="movimentos" className="text-xs">Andamentos ({processo.movimentacoes.length})</TabsTrigger>
          <TabsTrigger value="prazos" className="text-xs">Prazos ({prazosProc.length})</TabsTrigger>
          <TabsTrigger value="peticoes" className="text-xs">Petições ({peticoesProc.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['Vara/Juízo', processo.vara],
              ['Área', processo.area],
              ['Fase', processo.fase],
              ['Parte Contrária', processo.parteContraria],
              ['Advogado', processo.advogadoResponsavel],
              ['Distribuição', processo.dataDistribuicao],
              ['Valor da Causa', processo.valorCausa ? `R$ ${processo.valorCausa.toLocaleString('pt-BR')}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded p-2">
                <p className="text-gray-400 text-[10px] uppercase">{k}</p>
                <p className="font-medium capitalize mt-0.5">{v || '—'}</p>
              </div>
            ))}
          </div>
          {processo.observacoes && <div className="mt-3 bg-yellow-50 border border-yellow-100 rounded p-2 text-xs text-gray-600">{processo.observacoes}</div>}
        </TabsContent>
        <TabsContent value="movimentos" className="mt-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">{processo.movimentacoes.length} movimentações</p>
            <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200" onClick={sincronizarDataJud} disabled={buscandoMov}>
              {buscandoMov ? <Loader2 size={11} className="animate-spin mr-1" /> : <Wifi size={11} className="mr-1" />}
              Sincronizar DataJud
            </Button>
          </div>
          {[...processo.movimentacoes].sort((a,b) => b.data.localeCompare(a.data)).map(m => (
            <div key={m.id} className="flex gap-3 text-xs">
              <div className="w-20 flex-shrink-0 text-gray-400">{m.data}</div>
              <div>{m.tipo && <span className="font-semibold text-[#2563eb]">{m.tipo}: </span>}<span className="text-gray-700">{m.descricao}</span></div>
            </div>
          ))}
          {novaMovTab ? (
            <div className="border rounded p-3 space-y-2 mt-3 bg-blue-50">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Data</Label><Input type="date" className="mt-1 h-7 text-xs" value={novaMov.data} onChange={e => setNovaMov(m => ({...m, data: e.target.value}))} /></div>
                <div><Label className="text-xs">Tipo</Label><Input className="mt-1 h-7 text-xs" placeholder="Ex: Despacho" value={novaMov.tipo} onChange={e => setNovaMov(m => ({...m, tipo: e.target.value}))} /></div>
              </div>
              <div><Label className="text-xs">Descrição</Label><Textarea className="mt-1 text-xs" rows={2} value={novaMov.descricao} onChange={e => setNovaMov(m => ({...m, descricao: e.target.value}))} /></div>
              <div className="flex gap-2"><Button size="sm" className="h-7 text-xs bg-[#2563eb]" onClick={addMovimentacao}>Adicionar</Button><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNovaMovTab(false)}>Cancelar</Button></div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs mt-2" onClick={() => setNovaMovTab(true)}><Plus size={12} className="mr-1" />Novo Andamento</Button>
          )}
        </TabsContent>
        <TabsContent value="prazos" className="mt-3 space-y-2">
          {prazosProc.length === 0 ? <p className="text-xs text-gray-400">Nenhum prazo vinculado.</p> : prazosProc.map(pr => (
            <div key={pr.id} className="flex items-center justify-between border rounded p-2 text-xs">
              <div><p className="font-medium">{pr.descricao}</p><p className="text-gray-400">{pr.dataHora.split('T')[0]} · {pr.responsavel.split(' ')[0]}</p></div>
              <Badge variant="outline" className="capitalize text-[10px]">{pr.status}</Badge>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="peticoes" className="mt-3 space-y-2">
          {peticoesProc.length === 0 ? <p className="text-xs text-gray-400">Nenhuma petição vinculada.</p> : peticoesProc.map(pet => (
            <div key={pet.id} className="flex items-center justify-between border rounded p-2 text-xs">
              <div><p className="font-medium">{pet.nome}</p><p className="text-gray-400">{pet.dataProtocolo} · {pet.tipo}</p></div>
              <Badge variant="outline" className="capitalize text-[10px]">{pet.status}</Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Processos() {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterArea, setFilterArea] = useState<string>('todas');
  const [filterTribunal, setFilterTribunal] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [datajudOpen, setDatajudOpen] = useState(false);
  const [editProcesso, setEditProcesso] = useState<Processo | null>(null);
  const [viewProcesso, setViewProcesso] = useState<Processo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // prefill from DataJud — stored here, passed to form via key remount
  const [prefill, setPrefill] = useState<(Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'> & { movimentacoes?: Movimentacao[] }) | null>(null);
  const [formKey, setFormKey] = useState(0);

  const filtered = state.processos.filter(p => {
    const cliente = state.clientes.find(c => c.id === p.clienteId);
    const matchSearch = p.numero.includes(search) ||
      cliente?.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.parteContraria.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchArea = filterArea === 'todas' || p.area === filterArea;
    const matchTribunal = filterTribunal === 'todos' || p.tribunal === filterTribunal;
    return matchSearch && matchStatus && matchArea && matchTribunal;
  });

  const handleSave = (data: Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>, movs?: Movimentacao[]) => {
    if (editProcesso) {
      dispatch({ type: 'UPDATE_PROCESSO', payload: { ...editProcesso, ...data } });
      toast.success('Processo atualizado!');
    } else {
      dispatch({
        type: 'ADD_PROCESSO',
        payload: { ...data, id: genId(), movimentacoes: movs || [], criadoEm: new Date().toISOString().split('T')[0] },
      });
      toast.success('Processo cadastrado!');
    }
    setDialogOpen(false);
    setEditProcesso(null);
    setPrefill(null);
  };

  const handleDataJudPrefill = (dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>> & { movimentacoes?: Movimentacao[] }) => {
    const base = emptyProcesso();
    setPrefill({ ...base, ...dados });
    setEditProcesso(null);
    setFormKey(k => k + 1);
    setDatajudOpen(false);
    setDialogOpen(true);
    toast.success('Formulário pré-preenchido com dados do DataJud!');
  };

  const tribunaisUnicos = [...new Set(state.processos.map(p => p.tribunal))];

  const initialForm = editProcesso
    ? { numero: editProcesso.numero, clienteId: editProcesso.clienteId, vara: editProcesso.vara, tribunal: editProcesso.tribunal, comarca: editProcesso.comarca, area: editProcesso.area, fase: editProcesso.fase, parteContraria: editProcesso.parteContraria, advogadoResponsavel: editProcesso.advogadoResponsavel, valorCausa: editProcesso.valorCausa, dataDistribuicao: editProcesso.dataDistribuicao, status: editProcesso.status, observacoes: editProcesso.observacoes }
    : prefill
      ? { numero: prefill.numero, clienteId: prefill.clienteId, vara: prefill.vara, tribunal: prefill.tribunal, comarca: prefill.comarca, area: prefill.area, fase: prefill.fase, parteContraria: prefill.parteContraria, advogadoResponsavel: prefill.advogadoResponsavel || '', valorCausa: prefill.valorCausa, dataDistribuicao: prefill.dataDistribuicao, status: prefill.status, observacoes: prefill.observacoes }
      : emptyProcesso();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Processos</h1>
          <p className="text-sm text-gray-500">{state.processos.length} processos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setDatajudOpen(true)}>
            <Wifi size={14} className="mr-1" /> Buscar no DataJud
          </Button>
          <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 text-xs" onClick={() => { setEditProcesso(null); setPrefill(null); setDialogOpen(true); }}>
            <Plus size={14} className="mr-1" /> Novo Processo
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Número, cliente ou parte contrária..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {STATUS_LIST.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="h-9 text-xs w-36"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as áreas</SelectItem>
            {AREAS.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTribunal} onValueChange={setFilterTribunal}>
          <SelectTrigger className="h-9 text-xs w-28"><SelectValue placeholder="Tribunal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {tribunaisUnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">Nenhum processo encontrado.</p>}
        {filtered.map(proc => {
          const cliente = state.clientes.find(c => c.id === proc.clienteId);
          const prazosProc = state.prazos.filter(p => p.processoId === proc.id && p.status === 'pendente').length;
          return (
            <Card key={proc.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewProcesso(proc)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded bg-[#1e3a5f] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Scale size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[#1e3a5f] truncate">{proc.numero}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{cliente?.nome || '—'} <span className="text-gray-400">vs</span> {proc.parteContraria}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{proc.tribunal} · {proc.comarca}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 capitalize">{proc.area}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 capitalize">{proc.fase}</Badge>
                        {prazosProc > 0 && <Badge className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5"><Clock size={9} className="mr-0.5" />{prazosProc} prazo(s)</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${statusColor[proc.status]} capitalize text-[10px]`}>{proc.status}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setEditProcesso(proc); setPrefill(null); setDialogOpen(true); }}><Edit size={13} /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={e => { e.stopPropagation(); setDeleteId(proc.id); }}><Trash2 size={13} /></Button>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog DataJud */}
      <Dialog open={datajudOpen} onOpenChange={setDatajudOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              <Wifi size={16} className="text-blue-500" /> Cadastro Automático via DataJud
            </DialogTitle>
          </DialogHeader>
          <DialogBuscarDataJud
            onPreencherFormulario={handleDataJudPrefill}
            onClose={() => setDatajudOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Formulário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              {editProcesso ? 'Editar Processo' : 'Novo Processo'}
              {prefill && !editProcesso && (
                <Badge className="bg-green-100 text-green-700 text-[10px] ml-1 font-normal">
                  <CheckCircle2 size={10} className="mr-1" />Pré-preenchido pelo DataJud
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ProcessoForm
            key={formKey}
            initial={initialForm}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditProcesso(null); setPrefill(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar */}
      <Dialog open={!!viewProcesso} onOpenChange={() => setViewProcesso(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#1e3a5f]">Detalhes do Processo</DialogTitle></DialogHeader>
          {viewProcesso && <ProcessoDetalhe processo={viewProcesso} onClose={() => setViewProcesso(null)} />}
        </DialogContent>
      </Dialog>

      {/* Dialog Deletar */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Tem certeza que deseja excluir este processo?</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => { if (deleteId) { dispatch({ type: 'DELETE_PROCESSO', payload: deleteId }); toast.success('Processo excluído.'); setDeleteId(null); } }}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
