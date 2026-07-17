import { useState, useMemo } from 'react';
import { useApp, genId } from '../context';
import { db } from '../lib/db';
import type { Processo, Cliente, AreaDireito, FaseProcessual, StatusProcesso, PoloProcesso, Movimentacao } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, ChevronRight, Clock, Scale, Wifi, Loader2, CheckCircle2, AlertCircle, ImageIcon, FileText, Brain, Upload, Users, X, ListPlus } from 'lucide-react';
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

// ─── IA Import Dialog (Imagem / Texto / DataJud) ────────────────────────────

// Extrai o primeiro número CNJ de um texto
function extrairNumeroCNJ(texto: string): string {
  const match = texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
  return match ? match[0] : '';
}

// Parse de texto livre para dados processuais
function parsearTexto(texto: string): Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>> {
  const result: Partial<Omit<Processo, 'id' | 'criadoRemp' | 'movimentacoes'>> = {};
  const t = texto;

  // Número CNJ
  const numMatch = t.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
  if (numMatch) result.numero = numMatch[0];

  // Tribunal
  const trib = t.match(/\b(TJSP|TJRJ|TJMG|TJRS|TJPR|TJSC|TJBA|TJPE|TJCE|TRT\d{1,2}|TRF\d|STJ|STF|TST)\b/i);
  if (trib) result.tribunal = trib[0].toUpperCase();

  // Valor da causa
  const valorMatch = t.match(/R\$\s*([\d.,]+)/i);
  if (valorMatch) {
    const v = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(v)) result.valorCausa = v;
  }

  // Data de ajuizamento / distribuição
  const dataMatch = t.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dataMatch) {
    const [d, m, a] = dataMatch[0].split('/');
    result.dataDistribuicao = `${a}-${m}-${d}`;
  }

  // Comarca
  const comarcaMatch = t.match(/Comarca\s+(?:de\s+)?([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/i);
  if (comarcaMatch) result.comarca = comarcaMatch[1];

  // Vara
  const varaMatch = t.match(/(\d+[ªa°]?\s+Vara[^,\n]{0,60})/i);
  if (varaMatch) result.vara = varaMatch[1].trim();

  return result;
}

async function analisarComClaudeVision(
  base64: string,
  mimeType: string,
  apiKey: string
): Promise<{ dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>>; partes: { poloAtivo: string; poloPassivo: string }; textoExtraido: string }> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: `Analise esta imagem de um documento ou tela de sistema jurídico brasileiro e extraia APENAS as informações processuais em JSON válido com esta estrutura:
{
  "numero": "número CNJ completo (NNNNNNN-DD.AAAA.J.TT.OOOO)",
  "tribunal": "sigla do tribunal (ex: TJSP, TRT2, STJ)",
  "vara": "nome completo da vara ou juízo",
  "comarca": "cidade/comarca",
  "poloAtivo": "nome completo da parte autora/requerente",
  "poloPassivo": "nome completo da parte ré/requerida",
  "valorCausa": número em reais sem formatação ou null,
  "dataDistribuicao": "data no formato YYYY-MM-DD ou null",
  "classe": "classe processual (ex: Reclamação Trabalhista, Ação de Cobrança)",
  "assunto": "assunto principal do processo",
  "textoExtraido": "todo o texto relevante extraído da imagem"
}
Retorne APENAS o JSON, sem explicações.`
          }
        ]
      }]
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Erro ${resp.status} ao chamar Claude API.`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude não retornou JSON válido.');
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    dados: {
      numero: parsed.numero || '',
      tribunal: parsed.tribunal || '',
      vara: parsed.vara || '',
      comarca: parsed.comarca || '',
      valorCausa: parsed.valorCausa || undefined,
      dataDistribuicao: parsed.dataDistribuicao || '',
      area: inferirArea((parsed.classe || '') + ' ' + (parsed.assunto || '')),
      parteContraria: parsed.poloPassivo || '',
      status: 'ativo',
      fase: 'conhecimento',
      observacoes: parsed.assunto ? `Assunto: ${parsed.assunto}` : '',
    },
    partes: { poloAtivo: parsed.poloAtivo || '', poloPassivo: parsed.poloPassivo || '' },
    textoExtraido: parsed.textoExtraido || '',
  };
}

async function analisarTextoComClaude(
  texto: string,
  apiKey: string
): Promise<{ dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>>; partes: { poloAtivo: string; poloPassivo: string } }> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analise este texto copiado de um sistema jurídico brasileiro e extraia as informações processuais em JSON válido:
{
  "numero": "número CNJ completo (NNNNNNN-DD.AAAA.J.TT.OOOO) ou null",
  "tribunal": "sigla do tribunal (TJSP, TRT2, STJ, etc.) ou null",
  "vara": "nome da vara ou juízo ou null",
  "comarca": "cidade/comarca ou null",
  "poloAtivo": "nome da parte autora/requerente ou null",
  "poloPassivo": "nome da parte ré/requerida ou null",
  "valorCausa": número em reais sem formatação ou null,
  "dataDistribuicao": "data no formato YYYY-MM-DD ou null",
  "classe": "classe processual ou null",
  "assunto": "assunto principal ou null"
}
TEXTO:
${texto}

Retorne APENAS o JSON.`
      }]
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Erro ${resp.status} ao chamar Claude API.`);
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude não retornou JSON válido.');
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    dados: {
      numero: parsed.numero || '',
      tribunal: parsed.tribunal || '',
      vara: parsed.vara || '',
      comarca: parsed.comarca || '',
      valorCausa: parsed.valorCausa || undefined,
      dataDistribuicao: parsed.dataDistribuicao || '',
      area: inferirArea((parsed.classe || '') + ' ' + (parsed.assunto || '')),
      parteContraria: parsed.poloPassivo || '',
      status: 'ativo',
      fase: 'conhecimento',
      observacoes: parsed.assunto ? `Assunto: ${parsed.assunto}` : '',
    },
    partes: { poloAtivo: parsed.poloAtivo || '', poloPassivo: parsed.poloPassivo || '' },
  };
}

function DialogImportarIA({ onPreencherFormulario, onClose }: {
  onPreencherFormulario: (dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>> & { movimentacoes?: Movimentacao[] }) => void;
  onClose: () => void;
}) {
  const { state } = useApp();
  const apiKey = state.anthropicApiKey;
  const [tab, setTab] = useState<'imagem' | 'texto' | 'datajud'>('imagem');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('');
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<{
    dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>>;
    partes: { poloAtivo: string; poloPassivo: string };
    consultarDataJud?: boolean;
  } | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [consultandoDataJud, setConsultandoDataJud] = useState(false);

  const handleImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      setImageBase64(base64);
      setImageMime(file.type as string);
      setResultado(null);
      setErro('');
    };
    reader.readAsDataURL(file);
  };

  const analisarImagem = async () => {
    if (!apiKey) { setErro('Configure a Chave API Anthropic nas Configurações do sistema primeiro.'); return; }
    if (!imageBase64) { setErro('Selecione uma imagem primeiro.'); return; }
    setLoading(true); setErro(''); setResultado(null);
    try {
      const res = await analisarComClaudeVision(imageBase64, imageMime, apiKey);
      setResultado({ dados: res.dados, partes: res.partes, consultarDataJud: !!res.dados.numero });
    } catch (e: any) { setErro(e.message); }
    setLoading(false);
  };

  const analisarTexto = async () => {
    if (!texto.trim()) { setErro('Cole o texto primeiro.'); return; }
    setLoading(true); setErro(''); setResultado(null);

    // Try fast regex parse first
    const parsedRapido = parsearTexto(texto);

    if (apiKey) {
      // Enhance with Claude
      try {
        const res = await analisarTextoComClaude(texto, apiKey);
        setResultado({ dados: { ...parsedRapido, ...res.dados }, partes: res.partes, consultarDataJud: !!(res.dados.numero || parsedRapido.numero) });
      } catch {
        // Fallback to regex only
        const cnj = extrairNumeroCNJ(texto);
        setResultado({ dados: parsedRapido, partes: { poloAtivo: '', poloPassivo: parsedRapido.parteContraria || '' }, consultarDataJud: !!cnj });
      }
    } else {
      // Regex only
      const cnj = extrairNumeroCNJ(texto);
      setResultado({ dados: parsedRapido, partes: { poloAtivo: '', poloPassivo: parsedRapido.parteContraria || '' }, consultarDataJud: !!cnj });
    }
    setLoading(false);
  };

  const complementarDataJud = async () => {
    const numero = resultado?.dados.numero;
    if (!numero) return;
    setConsultandoDataJud(true);
    try {
      const dj = await buscarDataJud(numero);
      const passivo = dj.partes.find(p => p.polo?.toLowerCase().includes('passiv'));
      const ativo = dj.partes.find(p => p.polo?.toLowerCase().includes('ativ'));
      const movs: Movimentacao[] = dj.movimentos.map(m => ({ id: genId(), data: m.data, tipo: 'DataJud', descricao: m.nome }));
      setResultado(prev => prev ? {
        ...prev,
        dados: {
          ...prev.dados,
          tribunal: dj.tribunal || prev.dados.tribunal,
          vara: dj.orgaoJulgador || prev.dados.vara,
          comarca: dj.orgaoJulgador.replace(/vara.*/i, '').trim() || prev.dados.comarca,
          valorCausa: dj.valorCausa ?? prev.dados.valorCausa,
          dataDistribuicao: dj.dataAjuizamento || prev.dados.dataDistribuicao,
          area: inferirArea(dj.classe + ' ' + dj.assunto) || prev.dados.area,
          fase: dj.grau === '2' ? 'recursal' : prev.dados.fase,
          parteContraria: passivo?.nome || prev.dados.parteContraria,
          observacoes: dj.assunto ? `Assunto: ${dj.assunto}` : prev.dados.observacoes,
          _movs: movs,
        } as any,
        partes: { poloAtivo: ativo?.nome || prev.partes.poloAtivo, poloPassivo: passivo?.nome || prev.partes.poloPassivo },
      } : prev);
      toast.success('Dados complementados pelo DataJud!');
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível consultar o DataJud.');
    }
    setConsultandoDataJud(false);
  };

  const confirmar = () => {
    if (!resultado) return;
    const dados = resultado.dados as any;
    const movs: Movimentacao[] = dados._movs || [];
    const { _movs: _removed, ...dadosLimpos } = dados;
    onPreencherFormulario({ ...dadosLimpos, clienteId, movimentacoes: movs });
    onClose();
  };

  const noApiKey = !apiKey;

  return (
    <div className="space-y-4">
      {noApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Chave API Anthropic não configurada</p>
            <p className="mt-0.5">Vá em <strong>Configurações → Integrações IA</strong> e insira sua chave. Sem ela, a análise de imagens não funciona e o texto usa apenas extração por padrões.</p>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={v => { setTab(v as any); setResultado(null); setErro(''); }}>
        <TabsList className="w-full h-9 text-xs">
          <TabsTrigger value="imagem" className="flex-1 text-xs flex items-center gap-1.5">
            <ImageIcon size={12} /> Upload de Imagem
          </TabsTrigger>
          <TabsTrigger value="texto" className="flex-1 text-xs flex items-center gap-1.5">
            <FileText size={12} /> Colar Texto
          </TabsTrigger>
          <TabsTrigger value="datajud" className="flex-1 text-xs flex items-center gap-1.5">
            <Wifi size={12} /> DataJud API
          </TabsTrigger>
        </TabsList>

        {/* ── ABA IMAGEM ── */}
        <TabsContent value="imagem" className="space-y-3 mt-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <p className="font-semibold flex items-center gap-1.5"><Brain size={12} />Análise por IA (Claude Vision)</p>
            <p className="mt-0.5">Faça upload de qualquer print de tela — PJe, e-SAJ, Integra, DJe, e-Proc, etc. A IA extrai automaticamente número, partes, vara, tribunal, valor e data.</p>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-300 transition-colors">
            <input type="file" accept="image/*" id="img-upload" className="hidden" onChange={handleImagem} />
            <label htmlFor="img-upload" className="cursor-pointer block">
              {preview ? (
                <img src={preview} alt="preview" className="max-h-48 mx-auto rounded shadow object-contain" />
              ) : (
                <div className="py-6">
                  <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Clique para selecionar imagem</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP — print de tela de qualquer sistema</p>
                </div>
              )}
            </label>
          </div>
          {preview && (
            <Button className="w-full h-9 bg-[#2563eb] hover:bg-blue-700 text-sm" onClick={analisarImagem} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Analisando com IA...</> : <><Brain size={14} className="mr-2" />Analisar Imagem com IA</>}
            </Button>
          )}
        </TabsContent>

        {/* ── ABA TEXTO ── */}
        <TabsContent value="texto" className="space-y-3 mt-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <p className="font-semibold">Copie e cole texto de qualquer sistema</p>
            <p className="mt-0.5">Cole texto do Integra, PJe, e-SAJ, e-Proc, Projudi, portais de tribunais, e-mails de citação, etc. O sistema extrai os dados processuais automaticamente.</p>
          </div>
          <Textarea
            placeholder="Cole aqui o texto copiado do sistema jurídico...&#10;&#10;Exemplo: Processo nº 0001234-56.2024.8.26.0001 — 5ª Vara do Trabalho de São Paulo — TJSP..."
            rows={7}
            className="text-sm resize-none"
            value={texto}
            onChange={e => { setTexto(e.target.value); setResultado(null); setErro(''); }}
          />
          <Button className="w-full h-9 bg-[#2563eb] hover:bg-blue-700 text-sm" onClick={analisarTexto} disabled={loading || !texto.trim()}>
            {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Analisando...</> : <><Brain size={14} className="mr-2" />{apiKey ? 'Analisar com IA' : 'Extrair dados (modo básico)'}</>}
          </Button>
        </TabsContent>

        {/* ── ABA DATAJUD ── */}
        <TabsContent value="datajud" className="mt-3">
          <DialogBuscarDataJud
            onPreencherFormulario={d => { onPreencherFormulario(d); onClose(); }}
            onClose={onClose}
            embedded
          />
        </TabsContent>
      </Tabs>

      {/* ── ERRO ── */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2 text-xs text-red-700">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /><span>{erro}</span>
        </div>
      )}

      {/* ── RESULTADO ── */}
      {resultado && tab !== 'datajud' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600" />
              <span className="text-xs font-semibold text-green-800">Dados extraídos com sucesso</span>
            </div>
            {resultado.consultarDataJud && (
              <Button size="sm" variant="outline" className="h-6 text-[10px] text-blue-700 border-blue-300" onClick={complementarDataJud} disabled={consultandoDataJud}>
                {consultandoDataJud ? <Loader2 size={10} className="animate-spin mr-1" /> : <Wifi size={10} className="mr-1" />}
                Complementar via DataJud
              </Button>
            )}
          </div>
          <div className="p-3 grid grid-cols-2 gap-2 text-xs">
            {[
              ['Nº Processo', resultado.dados.numero],
              ['Tribunal', resultado.dados.tribunal],
              ['Vara / Juízo', resultado.dados.vara],
              ['Comarca', resultado.dados.comarca],
              ['Polo Ativo', resultado.partes.poloAtivo],
              ['Polo Passivo', resultado.partes.poloPassivo],
              ['Valor da Causa', resultado.dados.valorCausa ? `R$ ${resultado.dados.valorCausa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
              ['Data Distribuição', resultado.dados.dataDistribuicao],
              ['Área do Direito', resultado.dados.area],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} className="bg-gray-50 rounded p-2">
                <p className="text-gray-400 text-[10px] uppercase">{k}</p>
                <p className="font-medium capitalize mt-0.5 truncate">{v as string}</p>
              </div>
            ))}
          </div>
          {resultado.dados.observacoes && (
            <div className="px-3 pb-3 text-xs text-gray-500 bg-yellow-50 mx-3 mb-3 rounded p-2">{resultado.dados.observacoes}</div>
          )}
          <div className="px-3 pb-3 border-t pt-3">
            <Label className="text-xs font-semibold">Vincular a cliente cadastrado</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>{state.clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      )}

      {tab !== 'datajud' && (
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700" disabled={!resultado || tab === 'datajud'} onClick={confirmar}>
            Pré-preencher formulário
          </Button>
        </DialogFooter>
      )}
    </div>
  );
}

// ─── Busca DataJud Dialog ───────────────────────────────────────────────────

function DialogBuscarDataJud({ onPreencherFormulario, onClose, embedded }: {
  onPreencherFormulario: (dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>> & { movimentacoes?: Movimentacao[] }) => void;
  onClose: () => void;
  embedded?: boolean;
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
  dataDistribuicao: '', status: 'ativo', polo: 'autor', objeto: '', observacoes: '',
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
        <div>
          <Label className="text-xs">Polo do Cliente</Label>
          <Select value={form.polo} onValueChange={v => set('polo', v as PoloProcesso)}>
            <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="autor">Autor / Requerente</SelectItem>
              <SelectItem value="réu">Réu / Requerido</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Parte Contrária</Label>
          <Input className="mt-1 h-8 text-sm" value={form.parteContraria} onChange={e => set('parteContraria', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Objeto / Assunto da Ação</Label>
          <Input className="mt-1 h-8 text-sm" value={form.objeto} onChange={e => set('objeto', e.target.value)} placeholder="Ex: cobrança, rescisão contratual, danos morais..." />
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
              ['Cliente é', processo.polo],
              ['Parte Contrária', processo.parteContraria],
              ['Objeto', processo.objeto],
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

// ─── Importação em Lote ─────────────────────────────────────────────────────

interface LinhaLote {
  numero: string;
  cliente: string;
  adverso: string;
  tribunal: string;
  incluir: boolean;
}

const REGEX_CNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

// Detecta se um nome parece ser Pessoa Jurídica
function ehPessoaJuridica(nome: string): boolean {
  return /\b(ltda|s\/a|s\.?a\.?|eireli|me|epp|associa|empresa|com[ée]rcio|ind[uú]stria|cia|company|franchising|banco|seguros|financeira)\b/i.test(nome);
}

// Faz o parse de texto colado (tabela do Integra, CSV ou lista de números CNJ)
function parsearLote(texto: string): LinhaLote[] {
  const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const resultado: LinhaLote[] = [];

  for (const linha of linhas) {
    // Pula cabeçalhos comuns
    if (/^(numera[çc][ãa]o|n[úu]mero|processo)\b/i.test(linha) && /cliente|adverso|pasta|parte/i.test(linha)) continue;

    // Detecta o delimitador
    let campos: string[];
    if (linha.includes('\t')) campos = linha.split('\t');
    else if (linha.includes(';')) campos = linha.split(';');
    else if (/\s{2,}/.test(linha)) campos = linha.split(/\s{2,}/);
    else if (linha.includes(',') && REGEX_CNJ.test(linha)) campos = linha.split(',');
    else campos = [linha];
    campos = campos.map(c => c.trim()).filter(Boolean);
    if (campos.length === 0) continue;

    // Extrai número: CNJ padrão, senão o primeiro campo que pareça número de processo
    const cnjMatch = linha.match(REGEX_CNJ);
    let numero = cnjMatch ? cnjMatch[0] : '';
    if (!numero) {
      const c0 = campos[0];
      if (/\d/.test(c0) && /[.\-/]/.test(c0)) numero = c0;                 // formatos antigos: 001/1.05.0357271-7
      else if (/^(tempor|sem\s*n|-|s\/n)/i.test(c0)) numero = c0.toUpperCase();
    }

    // Campos textuais (remove o número e "pastas" puramente numéricas como "0")
    const textuais = campos.filter(c => c !== numero && !/^\d+$/.test(c) && !REGEX_CNJ.test(c));
    const cliente = textuais[0] || '';
    const adverso = textuais.length >= 2 ? textuais[textuais.length - 1] : '';

    const trib = tribunalFromNumero(numero);
    // Só adiciona linhas que tenham ao menos número OU cliente
    if (numero || cliente) {
      resultado.push({ numero, cliente, adverso, tribunal: trib?.sigla || '', incluir: true });
    }
  }
  return resultado;
}

function DialogImportarLote({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [texto, setTexto] = useState('');
  const [linhas, setLinhas] = useState<LinhaLote[] | null>(null);
  const [enriquecerDataJud, setEnriquecerDataJud] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  const analisar = () => {
    const parsed = parsearLote(texto);
    if (parsed.length === 0) {
      toast.error('Nenhum processo reconhecido. Verifique o formato do texto colado.');
      return;
    }
    setLinhas(parsed);
  };

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setTexto(String(reader.result || ''));
      const parsed = parsearLote(String(reader.result || ''));
      if (parsed.length) setLinhas(parsed);
    };
    reader.readAsText(file);
  };

  const toggleLinha = (idx: number) => {
    setLinhas(ls => ls ? ls.map((l, i) => i === idx ? { ...l, incluir: !l.incluir } : l) : ls);
  };

  const editarCampo = (idx: number, campo: keyof LinhaLote, valor: string) => {
    setLinhas(ls => ls ? ls.map((l, i) => i === idx ? { ...l, [campo]: valor } : l) : ls);
  };

  const selecionadas = linhas?.filter(l => l.incluir && (l.numero || l.cliente)) || [];
  const novosClientesCount = useMemo(() => {
    if (!linhas) return 0;
    const existentes = new Set(state.clientes.map(c => c.nome.trim().toLowerCase()));
    const novos = new Set<string>();
    for (const l of selecionadas) {
      const n = l.cliente.trim().toLowerCase();
      if (n && !existentes.has(n)) novos.add(n);
    }
    return novos.size;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, state.clientes]);

  const confirmar = async () => {
    if (selecionadas.length === 0) { toast.error('Selecione ao menos um processo.'); return; }
    setImportando(true);
    setProgresso({ atual: 0, total: selecionadas.length });

    const clienteMap = new Map(state.clientes.map(c => [c.nome.trim().toLowerCase(), c.id]));
    const novosClientes: Cliente[] = [];
    const processos: Processo[] = [];
    const hoje = new Date().toISOString().split('T')[0];

    for (let i = 0; i < selecionadas.length; i++) {
      const linha = selecionadas[i];

      // Resolve ou cria o cliente
      let clienteId = '';
      const nomeCli = linha.cliente.trim();
      if (nomeCli) {
        const key = nomeCli.toLowerCase();
        if (clienteMap.has(key)) {
          clienteId = clienteMap.get(key)!;
        } else {
          const novo: Cliente = {
            id: genId(), nome: nomeCli, tipo: ehPessoaJuridica(nomeCli) ? 'PJ' : 'PF',
            cpfCnpj: '', email: '', celular: '', criadoEm: hoje,
          };
          novosClientes.push(novo);
          clienteMap.set(key, novo.id);
          clienteId = novo.id;
        }
      }

      // Enriquecimento opcional via DataJud
      let dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>> = {};
      let movs: Movimentacao[] = [];
      if (enriquecerDataJud && REGEX_CNJ.test(linha.numero)) {
        try {
          const dj = await buscarDataJud(linha.numero);
          const passivo = dj.partes.find(p => /passiv/i.test(p.polo))?.nome;
          dados = {
            tribunal: dj.tribunal,
            vara: dj.orgaoJulgador,
            area: inferirArea(dj.classe),
            valorCausa: dj.valorCausa,
            dataDistribuicao: dj.dataAjuizamento,
            parteContraria: passivo || undefined,
          };
          movs = dj.movimentos.map(m => ({ id: genId(), data: m.data, tipo: 'DataJud', descricao: m.nome }));
        } catch { /* segue sem enriquecer esta linha */ }
        await new Promise(r => setTimeout(r, 250)); // rate-limit gentil com a API pública
      }

      const base = { ...emptyProcesso(), ...dados };
      processos.push({
        ...base,
        numero: linha.numero,
        clienteId,
        parteContraria: linha.adverso || base.parteContraria || '',
        tribunal: base.tribunal || linha.tribunal || '',
        id: genId(),
        movimentacoes: movs,
        criadoEm: hoje,
      });
      setProgresso({ atual: i + 1, total: selecionadas.length });
    }

    // Persiste os novos clientes ANTES dos processos — a FK cliente_id exige
    // que o cliente já exista no banco quando o processo é inserido.
    if (novosClientes.length) {
      await Promise.all(novosClientes.map(c => db.upsertCliente(c)));
      dispatch({ type: 'IMPORT_CLIENTES', payload: novosClientes });
    }
    dispatch({ type: 'IMPORT_PROCESSOS', payload: processos });

    setImportando(false);
    toast.success(
      `${processos.length} processo(s) importado(s)` +
      (novosClientes.length ? ` · ${novosClientes.length} novo(s) cliente(s) criado(s)` : '')
    );
    onClose();
  };

  return (
    <div className="space-y-3">
      {!linhas ? (
        <>
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded p-2.5 space-y-1">
            <p className="font-medium text-blue-800">Cole uma lista de processos — um por linha.</p>
            <p>Aceita: tabela copiada do Integra/planilha (colunas separadas por tab), CSV com <code>;</code> ou <code>,</code>, ou só a lista de números CNJ. O sistema identifica <b>número, cliente e parte adversa</b>, cria os clientes que ainda não existem e cadastra tudo automaticamente.</p>
          </div>
          <Textarea
            className="min-h-40 text-xs font-mono"
            placeholder={`5065724-92.2016.4.04.7100\tAbraham Pocztaruk\t0\n0000820-82.2010.5.04.0761\tAdemir Silvestre\t0\tBraskem S/A\n1006792-10.2019.8.26.0576; Alexandre Andriewiski; Zanon & Zanon Ltda`}
            value={texto}
            onChange={e => setTexto(e.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-blue-700 border border-blue-300 rounded px-3 py-1.5 cursor-pointer hover:bg-blue-50 flex items-center gap-1.5">
              <Upload size={12} /> Carregar .csv/.txt
              <input type="file" accept=".csv,.txt,text/plain,text/csv" className="hidden" onChange={handleArquivo} />
            </label>
            <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700 text-xs" onClick={analisar} disabled={!texto.trim()}>
              <ListPlus size={14} className="mr-1" /> Analisar lista
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs">
              <span className="font-medium text-gray-800">{selecionadas.length}</span> de {linhas.length} processo(s) selecionado(s)
              {novosClientesCount > 0 && (
                <span className="text-blue-700 ml-2 inline-flex items-center gap-1"><Users size={11} /> {novosClientesCount} cliente(s) novo(s)</span>
              )}
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs text-gray-500" onClick={() => setLinhas(null)} disabled={importando}>
              <X size={12} className="mr-1" /> Voltar
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-gray-500">
                  <th className="p-1.5 w-8"></th>
                  <th className="p-1.5">Número</th>
                  <th className="p-1.5">Cliente</th>
                  <th className="p-1.5">Parte adversa</th>
                  <th className="p-1.5 w-16">Tribunal</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, idx) => {
                  const clienteExiste = l.cliente && state.clientes.some(c => c.nome.trim().toLowerCase() === l.cliente.trim().toLowerCase());
                  return (
                    <tr key={idx} className={`border-t ${l.incluir ? '' : 'opacity-40'}`}>
                      <td className="p-1.5 text-center">
                        <input type="checkbox" checked={l.incluir} onChange={() => toggleLinha(idx)} className="accent-blue-600" />
                      </td>
                      <td className="p-1.5">
                        <input className="w-full bg-transparent font-mono text-[11px] outline-none focus:bg-blue-50 rounded px-1" value={l.numero} onChange={e => editarCampo(idx, 'numero', e.target.value)} />
                      </td>
                      <td className="p-1.5">
                        <div className="flex items-center gap-1">
                          <input className="w-full bg-transparent outline-none focus:bg-blue-50 rounded px-1" value={l.cliente} onChange={e => editarCampo(idx, 'cliente', e.target.value)} />
                          {l.cliente && (clienteExiste
                            ? <span title="Cliente já cadastrado"><CheckCircle2 size={11} className="text-green-500 flex-shrink-0" /></span>
                            : <span title="Cliente novo — será criado" className="text-[9px] bg-blue-100 text-blue-700 rounded px-1 flex-shrink-0">novo</span>)}
                        </div>
                      </td>
                      <td className="p-1.5">
                        <input className="w-full bg-transparent outline-none focus:bg-blue-50 rounded px-1" value={l.adverso} onChange={e => editarCampo(idx, 'adverso', e.target.value)} />
                      </td>
                      <td className="p-1.5 text-gray-500">{l.tribunal || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" checked={enriquecerDataJud} onChange={e => setEnriquecerDataJud(e.target.checked)} className="accent-blue-600" disabled={importando} />
            <Wifi size={12} className="text-blue-600" />
            Enriquecer via DataJud (busca tribunal, vara, valor, data e movimentações de cada número CNJ)
            <span className="text-gray-400">— mais lento</span>
          </label>

          {importando && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Importando... {progresso.atual}/{progresso.total}</span>
                <span>{Math.round((progresso.atual / Math.max(progresso.total, 1)) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(progresso.atual / Math.max(progresso.total, 1)) * 100}%` }} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={onClose} disabled={importando}>Cancelar</Button>
            <Button size="sm" className="bg-[#2563eb] hover:bg-blue-700" onClick={confirmar} disabled={importando || selecionadas.length === 0}>
              {importando ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
              Importar {selecionadas.length} processo(s)
            </Button>
          </DialogFooter>
        </>
      )}
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
  const [importarIAOpen, setImportarIAOpen] = useState(false);
  const [importarLoteOpen, setImportarLoteOpen] = useState(false);
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
    ? { numero: editProcesso.numero, clienteId: editProcesso.clienteId, vara: editProcesso.vara, tribunal: editProcesso.tribunal, comarca: editProcesso.comarca, area: editProcesso.area, fase: editProcesso.fase, parteContraria: editProcesso.parteContraria, advogadoResponsavel: editProcesso.advogadoResponsavel, valorCausa: editProcesso.valorCausa, dataDistribuicao: editProcesso.dataDistribuicao, status: editProcesso.status, polo: editProcesso.polo, objeto: editProcesso.objeto, observacoes: editProcesso.observacoes }
    : prefill
      ? { numero: prefill.numero, clienteId: prefill.clienteId, vara: prefill.vara, tribunal: prefill.tribunal, comarca: prefill.comarca, area: prefill.area, fase: prefill.fase, parteContraria: prefill.parteContraria, advogadoResponsavel: prefill.advogadoResponsavel || '', valorCausa: prefill.valorCausa, dataDistribuicao: prefill.dataDistribuicao, status: prefill.status, polo: prefill.polo ?? 'autor', objeto: prefill.objeto ?? '', observacoes: prefill.observacoes }
      : emptyProcesso();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Processos</h1>
          <p className="text-sm text-gray-500">{state.processos.length} processos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setImportarLoteOpen(true)}>
            <ListPlus size={14} className="mr-1" /> Importar em Lote
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setImportarIAOpen(true)}>
            <Brain size={14} className="mr-1" /> Importar com IA
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

      {/* Dialog Importar em Lote */}
      <Dialog open={importarLoteOpen} onOpenChange={setImportarLoteOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              <ListPlus size={16} className="text-blue-500" /> Importar Processos em Lote
            </DialogTitle>
          </DialogHeader>
          {importarLoteOpen && <DialogImportarLote onClose={() => setImportarLoteOpen(false)} />}
        </DialogContent>
      </Dialog>

      {/* Dialog Importar com IA */}
      <Dialog open={importarIAOpen} onOpenChange={setImportarIAOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              <Brain size={16} className="text-blue-500" /> Importar Processo com IA
            </DialogTitle>
          </DialogHeader>
          <DialogImportarIA
            onPreencherFormulario={handleDataJudPrefill}
            onClose={() => setImportarIAOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog DataJud (legado — mantido para sincronizar andamentos) */}
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
