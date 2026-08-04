import { useState, useMemo, useEffect } from 'react';
import { useApp, genId, logAcao } from '../context';
import { db } from '../lib/db';
import type { Processo, Cliente, AreaDireito, FaseProcessual, StatusProcesso, PoloProcesso, Movimentacao, TipoPrazo, Prazo, Documento } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Plus, Search, Edit, Archive, ArchiveRestore, ChevronRight, Clock, Scale, Wifi, Loader2, CheckCircle2, AlertCircle, ImageIcon, FileText, Brain, Upload, Users, X, ListPlus, Bot, Link2, GitMerge, Download, Check, ChevronsUpDown, Sparkles, CheckCheck, Phone, Mail, MessageCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { CopiarNumero } from './CopiarNumero';

const AREAS: AreaDireito[] = ['cível','trabalhista','criminal','previdenciário','família','tributário','empresarial','administrativo','procon','outro'];
const FASES: FaseProcessual[] = ['conhecimento','recursal','execução','outro'];
const STATUS_LIST: StatusProcesso[] = ['ativo','suspenso','arquivado','ganho','perdido','acordo'];
const TRIBUNAIS = ['TJSP','TJRJ','TJMG','TJRS','TJPR','TJSC','TJBA','TJPE','TJCE','TRT1','TRT2','TRT3','TRT4','TRT15','TRF1','TRF2','TRF3','TRF4','TRF5','STJ','STF','TST','JFSP','JFRJ','Outro'];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// Combobox com busca no topo + opção de criar um valor novo digitando.
// Guarda texto livre (tribunal/comarca/UF); o que já foi usado vira sugestão.
function ComboBox({ value, onChange, options, placeholder = 'Selecione ou digite...', allowCustom = true }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const norm = (s: string) => (s || '').toLowerCase().trim();
  const filtered = options.filter(o => norm(o).includes(norm(query)));
  const jaExiste = options.some(o => norm(o) === norm(query));
  const commit = (v: string) => { onChange(v.trim()); setOpen(false); setQuery(''); };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button type="button" className="mt-1 h-8 w-full text-sm border rounded-md px-3 flex items-center justify-between bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400">
          <span className={`truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>{value || placeholder}</span>
          <ChevronsUpDown size={14} className="text-gray-400 flex-shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[180px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar ou digitar novo..." value={query} onValueChange={setQuery} className="h-9 text-sm" />
          <CommandList>
            {filtered.length === 0 && !(allowCustom && query.trim()) && <CommandEmpty className="text-xs py-3 text-center text-gray-400">Nada encontrado.</CommandEmpty>}
            <CommandGroup>
              {filtered.map(o => (
                <CommandItem key={o} value={o} onSelect={() => commit(o)} className="text-sm">
                  <Check size={14} className={`mr-2 flex-shrink-0 ${norm(o) === norm(value) ? 'opacity-100 text-blue-600' : 'opacity-0'}`} />
                  {o}
                </CommandItem>
              ))}
              {allowCustom && query.trim() && !jaExiste && (
                <CommandItem value={`__add__${query}`} onSelect={() => commit(query)} className="text-sm text-blue-600">
                  <Plus size={14} className="mr-2 flex-shrink-0" /> Adicionar “{query.trim()}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Seletor de cliente COM BUSCA por digitação (filtra a lista, sem precisar rolar tudo).
// Diferente do ComboBox: seleciona um cliente EXISTENTE por id (não cria texto livre).
function ClienteCombo({ value, onChange, clientes }: {
  value: string;
  onChange: (id: string) => void;
  clientes: { id: string; nome: string; arquivado?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(query);
  // Esconde clientes arquivados da lista (evita duplicados fantasmas), mas mantém o que já está selecionado.
  const base = clientes.filter(c => !c.arquivado || c.id === value);
  const filtered = q ? base.filter(c => norm(c.nome).includes(q)) : base;
  const selecionado = clientes.find(c => c.id === value);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button type="button" className="mt-1 h-8 w-full text-sm border rounded-md px-3 flex items-center justify-between bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400">
          <span className={`truncate ${selecionado ? 'text-gray-900' : 'text-gray-400'}`}>{selecionado ? selecionado.nome : 'Selecione...'}</span>
          <ChevronsUpDown size={14} className="text-gray-400 flex-shrink-0 ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[240px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Digite o nome do cliente..." value={query} onValueChange={setQuery} className="h-9 text-sm" autoFocus />
          <CommandList>
            {filtered.length === 0 && <CommandEmpty className="text-xs py-3 text-center text-gray-400">Nenhum cliente encontrado.</CommandEmpty>}
            <CommandGroup>
              {filtered.map(c => (
                <CommandItem key={c.id} value={c.id} onSelect={() => { onChange(c.id); setOpen(false); setQuery(''); }} className="text-sm">
                  <Check size={14} className={`mr-2 flex-shrink-0 ${value === c.id ? 'opacity-100 text-blue-600' : 'opacity-0'}`} />
                  {c.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
// Tipos de andamento sugeridos (padronizam a categoria; ainda é possível digitar outro)
export const TIPOS_ANDAMENTO = ['Observação','Acordo','Suspenso','Sentença','Decisão','Despacho','Audiência','Petição','Recurso','Cumprimento de sentença','Baixa','Arquivamento','Distribuição','Outro'];

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
  if (c.includes('procon') || c.includes('consumidor')) return 'procon';
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

// Modelo de visão (rápido/barato) usado nas extrações e no resumo.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

// Chamada genérica à API do Claude (browser direto). Centraliza modelo, headers e erros.
async function chamarClaudeAPI(apiKey: string, content: unknown, maxTokens = 1024): Promise<string> {
  const key = (apiKey || '').trim();
  // Erros claros/acionáveis antes de bater na API:
  if (!key) {
    throw new Error('Nenhuma API key da Anthropic configurada. Cole uma API key (sk-ant-api03-…) em Configurações › Escritório para usar a análise por IA.');
  }
  if (key.startsWith('sk-ant-oat')) {
    throw new Error('A chave salva é um token OAuth do Claude Code (sk-ant-oat…), que serve para as petições — NÃO para a análise de imagem. Gere uma API key em console.anthropic.com (começa com sk-ant-api03-…) e cole em Configurações › Escritório.');
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    let msg = (err as { error?: { message?: string } })?.error?.message || `HTTP ${resp.status}`;
    if (resp.status === 401 || /x-api-key|authentication|invalid.*key/i.test(msg)) {
      msg = 'API key inválida ou sem crédito. Confira a chave (sk-ant-api03-…) em Configurações › Escritório e o saldo na conta Anthropic.';
    }
    throw new Error(`Falha na integração com o Claude: ${msg}`);
  }
  const data = await resp.json();
  return ((data.content as { type: string; text?: string }[]) || [])
    .filter(b => b.type === 'text').map(b => b.text || '').join('\n');
}

// Comprime/normaliza qualquer imagem para JPEG (fundo branco) com lado máx. ~1600px.
// Resolve o erro de integração causado por imagem grande demais ou media_type não suportado.
function comprimirImagem(file: File, maxLado = 1600, quality = 0.85): Promise<{ base64: string; mime: string; dataUrl: string; nome: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo não é uma imagem válida.'));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Não foi possível processar a imagem.')); return; }
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg', dataUrl, nome: file.name || 'imagem.jpg' });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function analisarComClaudeVision(
  imagens: { base64: string; mime: string }[],
  apiKey: string
): Promise<{ dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>>; partes: { poloAtivo: string; poloPassivo: string }; textoExtraido: string }> {
  const content = [
    ...imagens.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.base64 } })),
    {
      type: 'text',
      text: `Estas são uma ou mais imagens (páginas/telas diferentes) do MESMO processo judicial brasileiro. Combine as informações de todas e extraia APENAS os dados processuais em JSON válido com esta estrutura:
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
  "textoExtraido": "todo o texto relevante extraído das imagens"
}
Retorne APENAS o JSON, sem explicações.`,
    },
  ];
  const text = await chamarClaudeAPI(apiKey, content, 1500);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('O Claude não retornou um JSON válido para a(s) imagem(ns).');
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

// Resumo do caso com IA a partir dos dados já preenchidos do processo.
async function resumirCasoComClaude(apiKey: string, contexto: string): Promise<string> {
  const text = await chamarClaudeAPI(apiKey,
    `Você é um assistente jurídico. Com base nos dados abaixo de um processo judicial brasileiro, escreva um RESUMO objetivo do caso em português (3 a 6 frases): do que se trata, quem são as partes, o pedido/objeto, a situação atual e o valor, quando houver. NÃO invente fatos que não estejam nos dados. Escreva em texto corrido, sem markdown e sem títulos.\n\nDADOS DO PROCESSO:\n${contexto}`,
    600);
  return text.trim();
}

async function analisarTextoComClaude(
  texto: string,
  apiKey: string
): Promise<{ dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>>; partes: { poloAtivo: string; poloPassivo: string } }> {
  const promptText = `Analise este texto copiado de um sistema jurídico brasileiro e extraia as informações processuais em JSON válido:
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

Retorne APENAS o JSON.`;
  const text = await chamarClaudeAPI(apiKey, promptText, 1024);
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
  const [imagens, setImagens] = useState<{ base64: string; mime: string; dataUrl: string; nome: string }[]>([]);
  const [comprimindo, setComprimindo] = useState(false);
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<{
    dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>>;
    partes: { poloAtivo: string; poloPassivo: string };
    consultarDataJud?: boolean;
  } | null>(null);
  const [clienteId, setClienteId] = useState('');
  const [consultandoDataJud, setConsultandoDataJud] = useState(false);

  const handleImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setComprimindo(true); setErro(''); setResultado(null);
    try {
      const novos = await Promise.all(files.map(f => comprimirImagem(f)));
      setImagens(prev => [...prev, ...novos]);
    } catch (err: any) { setErro(err.message || 'Falha ao carregar a imagem.'); }
    setComprimindo(false);
    e.target.value = '';
  };
  const removerImagem = (i: number) => setImagens(prev => prev.filter((_, idx) => idx !== i));

  const analisarImagem = async () => {
    if (!apiKey) { setErro('Configure a Chave API Anthropic nas Configurações do sistema primeiro.'); return; }
    if (!imagens.length) { setErro('Selecione ao menos uma imagem.'); return; }
    setLoading(true); setErro(''); setResultado(null);
    try {
      const res = await analisarComClaudeVision(imagens.map(i => ({ base64: i.base64, mime: i.mime })), apiKey);
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
    // Anexa o 1º print (aba imagem) para ser salvo no Storage e vinculado ao processo
    const _image = (tab === 'imagem' && imagens.length)
      ? { base64: imagens[0].base64, mime: imagens[0].mime, nome: imagens[0].nome }
      : undefined;
    onPreencherFormulario({ ...dadosLimpos, clienteId, movimentacoes: movs, _image } as any);
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
            <p className="mt-0.5">Selecione <b>uma ou mais imagens</b> do mesmo processo (prints do PJe, e-SAJ, Integra, DJe, e-Proc, capa dos autos…). A IA combina tudo e extrai número, partes, vara, tribunal, valor e data. As imagens são otimizadas automaticamente antes do envio.</p>
          </div>
          <input type="file" accept="image/*" multiple id="img-upload" className="hidden" onChange={handleImagem} />
          {imagens.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {imagens.map((img, i) => (
                <div key={i} className="relative group border rounded overflow-hidden">
                  <img src={img.dataUrl} alt={img.nome} className="h-20 w-full object-cover" />
                  <button type="button" onClick={() => removerImagem(i)} title="Remover" className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
          <label htmlFor="img-upload" className="cursor-pointer block border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-300 transition-colors">
            {comprimindo ? (
              <div className="py-4 text-sm text-gray-500 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Otimizando imagem…</div>
            ) : (
              <div className="py-4">
                <ImageIcon size={28} className="mx-auto text-gray-300 mb-1" />
                <p className="text-sm text-gray-500 font-medium">{imagens.length ? 'Adicionar mais imagens' : 'Clique para selecionar imagem(ns)'}</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP — pode selecionar várias de uma vez</p>
              </div>
            )}
          </label>
          {imagens.length > 0 && (
            <Button className="w-full h-9 bg-[#2563eb] hover:bg-blue-700 text-sm" onClick={analisarImagem} disabled={loading || comprimindo}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Analisando com IA...</> : <><Brain size={14} className="mr-2" />Analisar {imagens.length > 1 ? `${imagens.length} imagens` : 'imagem'} com IA</>}
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
            <ClienteCombo value={clienteId} onChange={setClienteId} clientes={state.clientes} />
          </div>
        </div>
      )}

      {tab !== 'datajud' && (
        <DialogFooter>
          <Button variant="cancel" size="sm" onClick={onClose}>Cancelar</Button>
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
              <ClienteCombo value={clienteId} onChange={setClienteId} clientes={state.clientes} />
              <p className="text-[10px] text-gray-400 mt-1">Parte ativa identificada: <strong>{poleAtivo?.nome || '—'}</strong></p>
            </div>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="cancel" size="sm" onClick={onClose}>Cancelar</Button>
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
  suspenso: 'bg-orange-100 text-orange-700',
  arquivado: 'bg-gray-100 text-gray-600',
  ganho: 'bg-green-100 text-green-700',
  perdido: 'bg-red-100 text-red-700',
  acordo: 'bg-purple-100 text-purple-700',
};

const emptyProcesso = (): Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'> => ({
  numero: '', clienteId: '', vara: '', tribunal: '', comarca: '', uf: '', area: 'cível',
  fase: 'conhecimento', parteContraria: '', advogadoResponsavel: '', valorCausa: undefined,
  advogadoAdverso: '', advogadoAdversoTelefone: '', advogadoAdversoEmail: '',
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
  const [resumindo, setResumindo] = useState(false);
  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // Gera um resumo do caso com IA a partir dos dados já preenchidos, e adiciona às observações.
  const gerarResumoIA = async () => {
    const apiKey = state.anthropicApiKey;
    if (!apiKey) { toast.error('Configure a Chave API Anthropic em Configurações → Integrações IA.'); return; }
    const cliente = state.clientes.find(c => c.id === form.clienteId);
    const ctx = [
      `Número: ${form.numero || '—'}`,
      `Cliente (nosso): ${cliente?.nome || '—'} — polo ${form.polo}`,
      `Parte contrária: ${form.parteContraria || '—'}`,
      `Área: ${form.area} | Fase: ${form.fase} | Situação: ${form.status}`,
      `Tribunal: ${form.tribunal || '—'} | Comarca: ${form.comarca || '—'}${form.uf ? '/' + form.uf : ''} | Vara: ${form.vara || '—'}`,
      `Valor da causa: ${form.valorCausa ? 'R$ ' + form.valorCausa.toLocaleString('pt-BR') : '—'}`,
      `Objeto/assunto: ${form.objeto || '—'}`,
      form.observacoes ? `Observações atuais: ${form.observacoes}` : '',
    ].filter(Boolean).join('\n');
    setResumindo(true);
    try {
      const resumo = await resumirCasoComClaude(apiKey, ctx);
      set('observacoes', form.observacoes ? `${form.observacoes}\n\nResumo do caso (IA):\n${resumo}` : `Resumo do caso (IA):\n${resumo}`);
      toast.success('Resumo gerado e adicionado às observações.');
    } catch (e: unknown) { toast.error((e as Error)?.message || 'Falha ao gerar o resumo.'); }
    setResumindo(false);
  };

  // Opções dos comboboxes: lista padrão + o que já foi usado nos processos (sugestões),
  // ordenado. O usuário ainda pode digitar um valor novo (allowCustom).
  const uniqSort = (arr: (string | undefined)[]) => Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const tribunalOpts = uniqSort([...TRIBUNAIS, ...state.processos.map(p => p.tribunal)]);
  const comarcaOpts = uniqSort(state.processos.map(p => p.comarca));
  const ufOpts = uniqSort([...UFS, ...state.processos.map(p => p.uf)]);

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
          {form.numero.trim() && form.numero.replace(/\D/g, '').length !== 20 && (
            <p className="text-[11px] text-amber-600 mt-1 flex items-start gap-1"><AlertCircle size={11} className="flex-shrink-0 mt-0.5" /> Número fora do padrão CNJ (20 dígitos). Sem CNJ válido, os andamentos <b>não</b> serão capturados automaticamente pelo DataJud.</p>
          )}
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Cliente *</Label>
          <ClienteCombo value={form.clienteId} onChange={v => set('clienteId', v)} clientes={state.clientes} />
        </div>
        <div>
          <Label className="text-xs">Tribunal *</Label>
          <ComboBox value={form.tribunal} onChange={v => { set('tribunal', v); if (/^(trt|tst)/i.test(v.trim())) set('area', 'trabalhista'); }} options={tribunalOpts} placeholder="Selecione ou digite..." />
        </div>
        <div>
          <Label className="text-xs">Comarca</Label>
          <ComboBox value={form.comarca} onChange={v => set('comarca', v)} options={comarcaOpts} placeholder="Selecione ou digite..." />
        </div>
        <div>
          <Label className="text-xs">Estado (UF)</Label>
          <ComboBox value={form.uf || ''} onChange={v => set('uf', v)} options={ufOpts} placeholder="UF..." />
        </div>
        <div>
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
        <div className="col-span-2 border rounded-md p-2.5 bg-slate-50/60">
          <p className="text-[11px] font-semibold text-[#1e3a5f] mb-1.5">Advogado da parte adversa <span className="font-normal text-gray-400">(facilita acordos e negociações)</span></p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Nome do advogado adverso</Label>
              <Input className="mt-1 h-8 text-sm" value={form.advogadoAdverso || ''} onChange={e => set('advogadoAdverso', e.target.value)} placeholder="Ex: Dr. Fulano — OAB 00000/UF" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input className="mt-1 h-8 text-sm" value={form.advogadoAdversoTelefone || ''} onChange={e => set('advogadoAdversoTelefone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input type="email" className="mt-1 h-8 text-sm" value={form.advogadoAdversoEmail || ''} onChange={e => set('advogadoAdversoEmail', e.target.value)} placeholder="advogado@email.com" />
            </div>
          </div>
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
          <div className="flex items-center justify-between">
            <Label className="text-xs">Observações</Label>
            <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] text-blue-700 border-blue-200 hover:bg-blue-50" onClick={gerarResumoIA} disabled={resumindo}>
              {resumindo ? <Loader2 size={11} className="animate-spin mr-1" /> : <Brain size={11} className="mr-1" />} Resumo do caso com IA
            </Button>
          </div>
          <Textarea className="mt-1 text-sm" rows={3} value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="cancel" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" variant="success" onClick={() => {
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

const TIPOS_PRAZO_DET: TipoPrazo[] = ['prazo_fatal', 'audiência', 'prazo_dilatório', 'diligência', 'reunião', 'outro'];

// Diálogo COMPLETO do processo (todas as abas: Informações, Andamentos, Prazos/agendamento,
// Petições, Documentos + Editar/Arquivar). Reutilizável em qualquer tela (Agenda, Publicações…).
export function ProcessoDetalheDialog({ processo, onClose }: { processo: Processo | null; onClose: () => void }) {
  return (
    <Dialog open={!!processo} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader><DialogTitle className="text-[#1e3a5f]">Detalhes do Processo</DialogTitle></DialogHeader>
        {processo && <ProcessoDetalhe processo={processo} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

export function ProcessoDetalhe({ processo: processoProp, onClose }: { processo: Processo; onClose?: () => void }) {
  const { state, dispatch, usuario, reload } = useApp();
  // sempre "vivo": reflete edições/andamentos/prazos na hora
  const processo = state.processos.find(p => p.id === processoProp.id) || processoProp;
  const [novaMovTab, setNovaMovTab] = useState(false);
  const [novaMov, setNovaMov] = useState({ data: '', tipo: '', descricao: '', valor: '' });
  const [buscandoMov, setBuscandoMov] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const toggleExpandido = (id: string) => setExpandidos(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [editMovId, setEditMovId] = useState<string | null>(null);
  const iniciarEditMov = (m: Movimentacao) => {
    setNovaMov({ data: m.data || '', tipo: m.tipo || '', descricao: m.descricao || '', valor: (m.valor || m.valor === 0) ? String(m.valor) : '' });
    setEditMovId(m.id);
    setNovaMovTab(true);
  };
  // Arquiva/restaura o processo direto do detalhe (arquivar = tirar da lista ativa, sem apagar).
  const arquivarProc = () => {
    const arq = !processo.arquivado;
    dispatch({ type: 'UPDATE_PROCESSO', payload: { ...processo, arquivado: arq } });
    toast.success(arq ? 'Processo arquivado — fica em "Arquivados" e pode ser restaurado.' : 'Processo restaurado.');
    onClose?.();
  };
  const [editando, setEditando] = useState(false);
  const [novoPrazoTab, setNovoPrazoTab] = useState(false);
  const [novoPrazo, setNovoPrazo] = useState<{ descricao: string; dataHora: string; tipo: TipoPrazo; responsavel: string }>({ descricao: '', dataHora: '', tipo: 'prazo_fatal', responsavel: '' });
  // edição inline de um prazo já agendado (a partir da aba do processo)
  const [editPrazoId, setEditPrazoId] = useState<string | null>(null);
  const [editPrazo, setEditPrazoForm] = useState<{ descricao: string; dataHora: string; tipo: TipoPrazo; responsavel: string }>({ descricao: '', dataHora: '', tipo: 'prazo_fatal', responsavel: '' });
  const cliente = state.clientes.find(c => c.id === processo.clienteId);
  const prazosProc = state.prazos.filter(p => p.processoId === processo.id);
  const peticoesProc = state.peticoes.filter(p => p.processoId === processo.id);
  // Publicações do DJEN vinculadas ao processo — trazem a ÍNTEGRA de despachos/decisões
  // (o DataJud só dá o nome do movimento). Mescladas na linha do tempo dos andamentos.
  const pubsProc = state.publicacoes.filter(p => p.processoId === processo.id);

  const salvarEdicao = (data: Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>) => {
    dispatch({ type: 'UPDATE_PROCESSO', payload: { ...processo, ...data } });
    setEditando(false);
    toast.success('Dados do processo atualizados!');
  };

  const addPrazo = () => {
    if (!novoPrazo.descricao.trim() || !novoPrazo.dataHora) { toast.error('Preencha a tarefa e a data/hora.'); return; }
    dispatch({
      type: 'ADD_PRAZO',
      payload: {
        id: genId(), processoId: processo.id, tipo: novoPrazo.tipo, descricao: novoPrazo.descricao.trim(),
        dataHora: novoPrazo.dataHora, diasUteis: true, responsavel: novoPrazo.responsavel,
        status: 'pendente', alertaDias: 3, agendadoPor: '', criadoEm: new Date().toISOString(),
      } as Prazo,
    });
    setNovoPrazo({ descricao: '', dataHora: '', tipo: 'prazo_fatal', responsavel: '' });
    setNovoPrazoTab(false);
    toast.success('Prazo agendado!');
  };

  const iniciarEditPrazo = (pr: Prazo) => {
    // Abrir = ciência: se quem abre é o responsável e ainda não visualizou, registra.
    if (pr.responsavel === usuario.nome && !pr.vistoEm && pr.status === 'pendente') {
      dispatch({ type: 'UPDATE_PRAZO', payload: { ...pr, vistoEm: new Date().toISOString(), vistoPor: usuario.nome } });
    }
    setNovoPrazoTab(false);
    setEditPrazoId(pr.id);
    setEditPrazoForm({ descricao: pr.descricao, dataHora: pr.dataHora, tipo: pr.tipo, responsavel: pr.responsavel || '' });
  };
  const salvarEditPrazo = () => {
    const pr = prazosProc.find(p => p.id === editPrazoId);
    if (!pr) { setEditPrazoId(null); return; }
    if (!editPrazo.descricao.trim() || !editPrazo.dataHora) { toast.error('Preencha a tarefa e a data/hora.'); return; }
    dispatch({ type: 'UPDATE_PRAZO', payload: { ...pr, descricao: editPrazo.descricao.trim(), dataHora: editPrazo.dataHora, tipo: editPrazo.tipo, responsavel: editPrazo.responsavel } });
    setEditPrazoId(null);
    toast.success('Prazo atualizado!');
  };
  const [imgUrl, setImgUrl] = useState('');
  useEffect(() => {
    let ativo = true;
    if (processo.imagemPath) db.signedUrlProcessoImagem(processo.imagemPath).then(u => { if (ativo) setImgUrl(u); });
    else setImgUrl('');
    return () => { ativo = false; };
  }, [processo.imagemPath]);

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [subindoDoc, setSubindoDoc] = useState(false);
  const carregarDocs = () => { db.listarDocumentos(processo.id).then(setDocumentos); };
  useEffect(() => { db.listarDocumentos(processo.id).then(setDocumentos); }, [processo.id]);
  const enviarDocs = async (files: FileList | File[] | null, tipo: string) => {
    const lista = files ? Array.from(files) : [];
    if (!lista.length) return;
    setSubindoDoc(true);
    let ok = 0; const falhas: string[] = [];
    for (const file of lista) {
      const { error } = await db.uploadDocumento(processo.id, file, tipo);
      if (error) falhas.push(file.name);
      else { ok++; logAcao('criar', 'documento', `Anexou documento "${file.name}" ao processo ${processo.numero}`, processo.id); }
    }
    carregarDocs();
    setSubindoDoc(false);
    if (ok) toast.success(`${ok} documento(s) anexado(s).`);
    if (falhas.length) toast.error(`Falha ao anexar ${falhas.length}: ${falhas.slice(0, 3).join(', ')}${falhas.length > 3 ? '…' : ''}`);
  };
  const baixarDoc = async (d: Documento) => {
    const url = await db.signedUrlDocumento(d.arquivoPath);
    if (url) window.open(url, '_blank'); else toast.error('Não foi possível abrir o documento.');
  };

  const addMovimentacao = () => {
    if (!novaMov.data || !novaMov.descricao) { toast.error('Preencha data e descrição.'); return; }
    const dados = {
      data: novaMov.data, tipo: novaMov.tipo, descricao: novaMov.descricao,
      valor: novaMov.valor ? Number(novaMov.valor) : undefined,
    };
    const updated = editMovId
      ? { ...processo, movimentacoes: processo.movimentacoes.map(m => m.id === editMovId ? { ...m, ...dados } : m) }
      : { ...processo, movimentacoes: [...processo.movimentacoes, { id: genId(), ...dados }] };
    dispatch({ type: 'UPDATE_PROCESSO', payload: updated });
    setNovaMov({ data: '', tipo: '', descricao: '', valor: '' });
    setNovaMovTab(false);
    toast.success(editMovId ? 'Andamento atualizado!' : 'Andamento adicionado!');
    setEditMovId(null);
  };

  const sincronizarDataJud = async () => {
    setBuscandoMov(true);
    try {
      // Via servidor (edge function) — o DataJud não permite chamada direta do navegador (sem CORS).
      const { data, error } = await db.sincronizarProcessoDataJud({ processoId: processo.id, numero: processo.numero });
      if (error) throw error;
      if (data?.erro) {
        toast.error(data.erro);
      } else if ((data?.novos_andamentos ?? 0) > 0) {
        toast.success(`${data!.novos_andamentos} movimentação(ões) importada(s) do ${data?.tribunal || 'DataJud'}!`);
        await reload();
      } else if (data?.encontrado_no_datajud === false) {
        toast.info('Processo ainda não indexado no DataJud — nada a importar por enquanto.');
      } else {
        toast.info('Nenhuma movimentação nova encontrada.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao consultar o DataJud.');
    }
    setBuscandoMov(false);
  };

  return (
    <div className="max-h-[82vh] overflow-y-auto pr-1">
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-mono text-sm font-bold text-[#1e3a5f] truncate">{processo.numero}</p>
            <CopiarNumero numero={processo.numero} size={13} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{processo.tribunal}{processo.comarca ? ` · ${processo.comarca}` : ''}{processo.uf ? `/${processo.uf}` : ''}</p>
          <p className="text-sm text-gray-800 mt-1 break-words">
            <span className="font-medium">{cliente?.nome || '—'}</span>
            <span className="text-gray-400"> × </span>
            <span className="font-medium">{processo.parteContraria || 'parte adversa não informada'}</span>
            {processo.polo ? <span className="text-[11px] text-gray-400"> · nosso cliente no polo {processo.polo}</span> : null}
          </p>
          {processo.alertaBloqueio && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 rounded px-2 py-1 text-[11px] font-medium">
              <AlertTriangle size={12} /> Alerta: há ordem/efetivação de <b>bloqueio ou penhora online</b> (SISBAJUD/BacenJud) neste processo — confira os andamentos.
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {processo.arquivado && <Badge className="bg-slate-200 text-slate-600 text-[10px]">Arquivado</Badge>}
          <Badge className={`${statusColor[processo.status]} capitalize text-xs`}>{processo.status}</Badge>
          {usuario.podeEditar && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditando(true)}><Edit size={12} className="mr-1" />Editar</Button>
          )}
          {usuario.podeEditar && (
            processo.arquivado
              ? <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50" onClick={arquivarProc}><ArchiveRestore size={12} className="mr-1" />Restaurar</Button>
              : <Button size="sm" variant="outline" className="h-7 text-xs text-slate-600" onClick={arquivarProc}><Archive size={12} className="mr-1" />Arquivar</Button>
          )}
        </div>
      </div>
      <Tabs defaultValue="info">
        <TabsList className="text-xs h-8">
          <TabsTrigger value="info" className="text-xs">Informações</TabsTrigger>
          <TabsTrigger value="movimentos" className="text-xs">Andamentos ({processo.movimentacoes.length})</TabsTrigger>
          <TabsTrigger value="prazos" className="text-xs">Prazos ({prazosProc.length})</TabsTrigger>
          <TabsTrigger value="peticoes" className="text-xs">Petições ({peticoesProc.length})</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs">Documentos ({documentos.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {([
              ['Cliente', cliente?.nome, false],
              ['Número (CNJ)', processo.numero, false],
              ['Tribunal', processo.tribunal, false],
              ['Comarca', processo.comarca, false],
              ['Estado (UF)', processo.uf, false],
              ['Vara / Juízo', processo.vara, false],
              ['Área', processo.area, true],
              ['Fase', processo.fase, true],
              ['Situação', processo.status, true],
              ['Cliente é (polo)', processo.polo, true],
              ['Parte Contrária', processo.parteContraria, false],
              ['Advogado', processo.advogadoResponsavel, false],
              ['Data de Distribuição', fmtDataBR(processo.dataDistribuicao), false],
              ['Valor da Causa', (processo.valorCausa || processo.valorCausa === 0) ? `R$ ${processo.valorCausa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—', false],
            ] as [string, string | undefined, boolean][]).map(([k, v, cap]) => (
              <div key={k} className="bg-gray-50 rounded p-2 min-w-0">
                <p className="text-gray-400 text-[10px] uppercase">{k}</p>
                <p className={`font-medium mt-0.5 break-words ${cap ? 'capitalize' : ''}`}>{v || '—'}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 bg-blue-50/60 border border-blue-100 rounded p-2.5 text-xs">
            <p className="text-gray-400 text-[10px] uppercase">Objeto — o que é a ação</p>
            <p className="font-medium mt-0.5 break-words">{processo.objeto || '—'}</p>
          </div>
          {(processo.advogadoAdverso || processo.advogadoAdversoTelefone || processo.advogadoAdversoEmail) && (
            <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-2.5 text-xs">
              <p className="text-gray-400 text-[10px] uppercase mb-1">Advogado da parte adversa <span className="text-gray-300 normal-case">(contato p/ acordos)</span></p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {processo.advogadoAdverso && <span className="font-medium text-gray-800 inline-flex items-center gap-1"><Scale size={11} className="text-gray-400" />{processo.advogadoAdverso}</span>}
                {processo.advogadoAdversoTelefone && (
                  <span className="inline-flex items-center gap-2">
                    <a href={`tel:${processo.advogadoAdversoTelefone.replace(/[^\d+]/g, '')}`} className="text-[#2563eb] hover:underline inline-flex items-center gap-1"><Phone size={11} />{processo.advogadoAdversoTelefone}</a>
                    <a href={`https://wa.me/55${processo.advogadoAdversoTelefone.replace(/\D/g, '').replace(/^55/, '')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline inline-flex items-center gap-1" title="Abrir no WhatsApp"><MessageCircle size={11} />WhatsApp</a>
                  </span>
                )}
                {processo.advogadoAdversoEmail && <a href={`mailto:${processo.advogadoAdversoEmail}`} className="text-[#2563eb] hover:underline inline-flex items-center gap-1"><Mail size={11} />{processo.advogadoAdversoEmail}</a>}
              </div>
            </div>
          )}
          {processo.observacoes && <div className="mt-2 bg-yellow-50 border border-yellow-100 rounded p-2 text-xs text-gray-600 whitespace-pre-wrap">{processo.observacoes}</div>}
          {processo.imagemPath && (
            <div className="mt-3">
              <p className="text-[10px] uppercase text-gray-400 font-semibold mb-1 flex items-center gap-1">
                <ImageIcon size={11} /> Print anexado{processo.imagemNome ? ` · ${processo.imagemNome}` : ''}
              </p>
              {imgUrl
                ? <a href={imgUrl} target="_blank" rel="noreferrer"><img src={imgUrl} alt="print do processo" className="max-h-72 rounded border shadow-sm hover:opacity-90 transition-opacity" /></a>
                : <p className="text-xs text-gray-400">Carregando imagem…</p>}
            </div>
          )}
        </TabsContent>
        <TabsContent value="movimentos" className="mt-3 space-y-2">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <p className="text-xs text-gray-500">
              {processo.movimentacoes.length} andamento(s)
              {pubsProc.length > 0 && <> · <span className="text-indigo-600 font-medium">{pubsProc.length} despacho(s)/decisão(ões) com íntegra</span></>}
              {(() => { const tot = processo.movimentacoes.reduce((s, m) => s + (m.valor || 0), 0); return tot > 0 ? <> · <span className="text-green-700 font-medium">valores: R$ {tot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></> : null; })()}
            </p>
            {usuario.podeContribuir && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" className="h-7 text-xs bg-[#2563eb] hover:bg-[#1e40af]" onClick={() => { setEditMovId(null); setNovaMov({ data: '', tipo: '', descricao: '', valor: '' }); setNovaMovTab(v => !v); }}>
                  <Plus size={12} className="mr-1" />Novo Andamento
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200" onClick={sincronizarDataJud} disabled={buscandoMov}>
                  {buscandoMov ? <Loader2 size={11} className="animate-spin mr-1" /> : <Wifi size={11} className="mr-1" />}
                  Sincronizar DataJud
                </Button>
              </div>
            )}
          </div>
          {usuario.podeContribuir && novaMovTab && (
            <div className="border rounded p-3 space-y-2 mb-3 bg-blue-50">
              <p className="text-xs font-semibold text-[#1e3a5f]">{editMovId ? 'Editar andamento' : 'Novo andamento'}</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Data</Label><Input type="date" className="mt-1 h-7 text-xs" value={novaMov.data} onChange={e => setNovaMov(m => ({...m, data: e.target.value}))} /></div>
                <div>
                  <Label className="text-xs">Tipo do andamento</Label>
                  <Input list="dl-andamento" className="mt-1 h-7 text-xs" placeholder="Observação, Acordo, Suspenso…" value={novaMov.tipo} onChange={e => setNovaMov(m => ({...m, tipo: e.target.value}))} />
                  <datalist id="dl-andamento">{TIPOS_ANDAMENTO.map(t => <option key={t} value={t} />)}</datalist>
                </div>
              </div>
              <div><Label className="text-xs">Descrição</Label><Textarea className="mt-1 text-xs" rows={2} value={novaMov.descricao} onChange={e => setNovaMov(m => ({...m, descricao: e.target.value}))} /></div>
              <div>
                <Label className="text-xs">Valor <span className="text-gray-400">(R$ — opcional, ex.: cumprimento de sentença, depósito, custas)</span></Label>
                <Input type="number" step="0.01" min="0" className="mt-1 h-7 text-xs" placeholder="0,00" value={novaMov.valor} onChange={e => setNovaMov(m => ({...m, valor: e.target.value}))} />
              </div>
              <div className="flex gap-2"><Button size="sm" variant="success" className="h-7 text-xs" onClick={addMovimentacao}>{editMovId ? 'Salvar' : 'Adicionar'}</Button><Button size="sm" variant="cancel" className="h-7 text-xs" onClick={() => { setNovaMovTab(false); setEditMovId(null); }}>Cancelar</Button></div>
            </div>
          )}
          {(() => {
            type TL = { key: string; data: string; kind: 'mov' | 'pub'; movId?: string; tipo?: string; descricao?: string; valor?: number; conteudo?: string; orgao?: string; link?: string };
            const itens: TL[] = [
              ...processo.movimentacoes.map(m => ({ key: 'm' + m.id, data: m.data || '', kind: 'mov' as const, movId: m.id, tipo: m.tipo, descricao: m.descricao, valor: m.valor })),
              ...pubsProc.map(p => ({ key: 'p' + p.id, data: p.data || '', kind: 'pub' as const, tipo: p.tipo, conteudo: p.conteudo, orgao: p.orgao, link: p.link })),
            ].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
            if (itens.length === 0) return <p className="text-xs text-gray-400">Nenhum andamento ainda. Use "Novo Andamento" ou "Sincronizar DataJud".</p>;
            return itens.map(it => it.kind === 'mov' ? (
              <div key={it.key} className="flex gap-3 text-xs border-b border-gray-100 pb-1.5">
                <div className="w-24 flex-shrink-0 text-gray-400 font-mono">{fmtDataBR(it.data)}</div>
                <div className="min-w-0 flex-1">
                  {it.tipo && <span className="font-semibold text-[#2563eb]">{it.tipo}: </span>}
                  <span className="text-gray-700 break-words">{it.descricao}</span>
                  {(it.valor || it.valor === 0) && (
                    <span className="ml-1.5 inline-block bg-green-100 text-green-700 rounded px-1.5 py-0.5 font-medium whitespace-nowrap">R$ {it.valor!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
                {usuario.podeContribuir && it.movId && (
                  <button title="Editar andamento" className="flex-shrink-0 text-gray-300 hover:text-[#2563eb] transition-colors" onClick={() => { const m = processo.movimentacoes.find(x => x.id === it.movId); if (m) iniciarEditMov(m); }}><Edit size={12} /></button>
                )}
              </div>
            ) : (
              <div key={it.key} className="flex gap-3 text-xs border-b border-gray-100 pb-2">
                <div className="w-24 flex-shrink-0 text-gray-400 font-mono">{fmtDataBR(it.data)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5"><FileText size={9} className="mr-0.5" />Publicação{it.tipo ? ` · ${it.tipo}` : ''}</Badge>
                    {it.orgao && <span className="text-gray-400 text-[11px]">{it.orgao}</span>}
                  </div>
                  <div className={`mt-1 text-gray-700 whitespace-pre-wrap break-words bg-indigo-50/50 border border-indigo-100 rounded p-2 ${expandidos.has(it.key) ? '' : 'max-h-20 overflow-hidden'}`}>
                    {it.conteudo || '—'}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    {(it.conteudo || '').length > 160 && (
                      <button onClick={() => toggleExpandido(it.key)} className="text-[11px] text-indigo-600 hover:underline font-medium">
                        {expandidos.has(it.key) ? 'Recolher' : 'Ver íntegra'}
                      </button>
                    )}
                    {it.link && <a href={it.link} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline">Abrir no tribunal</a>}
                  </div>
                </div>
              </div>
            ));
          })()}
        </TabsContent>
        <TabsContent value="prazos" className="mt-3 space-y-2">
          {prazosProc.length === 0 && <p className="text-xs text-gray-400">Nenhum prazo vinculado.</p>}
          {prazosProc.map(pr => {
            const concluido = pr.status === 'cumprido' || pr.status === 'cancelado';
            const [dt, hr] = pr.dataHora.split('T');
            if (editPrazoId === pr.id) {
              return (
              <div key={pr.id} className="border border-amber-300 rounded p-3 space-y-2 bg-amber-50">
                <p className="text-[11px] font-semibold text-amber-800">Editando prazo agendado</p>
                <div><Label className="text-xs">Tarefa / descrição do prazo</Label><Input className="mt-1 h-7 text-xs" value={editPrazo.descricao} onChange={e => setEditPrazoForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Data e hora</Label><Input type="datetime-local" step="300" className="mt-1 h-7 text-xs" value={editPrazo.dataHora} onChange={e => setEditPrazoForm(p => ({ ...p, dataHora: e.target.value }))} /></div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={editPrazo.tipo} onValueChange={v => setEditPrazoForm(p => ({ ...p, tipo: v as TipoPrazo }))}>
                      <SelectTrigger className="mt-1 h-7 text-xs capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS_PRAZO_DET.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Responsável</Label>
                  <Select value={editPrazo.responsavel} onValueChange={v => setEditPrazoForm(p => ({ ...p, responsavel: v }))}>
                    <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2"><Button size="sm" variant="success" className="h-7 text-xs" onClick={salvarEditPrazo}>Salvar</Button><Button size="sm" variant="cancel" className="h-7 text-xs" onClick={() => setEditPrazoId(null)}>Cancelar</Button></div>
              </div>
              );
            }
            return (
            <div key={pr.id} className="flex items-center justify-between border rounded p-2 text-xs gap-2">
              <div className="min-w-0">
                <p className={`font-medium break-words ${concluido ? 'line-through text-gray-400' : ''}`}>{pr.descricao}</p>
                <p className="text-gray-400">{fmtDataBR(dt)}{hr && hr !== '23:59' ? ` ${hr.slice(0,5)}` : ''}{pr.responsavel ? ` · ${pr.responsavel.split(' ')[0]}` : ''} · <span className="capitalize">{pr.tipo.replace('_', ' ')}</span></p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="outline" className="capitalize text-[10px]">{pr.status}</Badge>
                {(usuario.podeEditar || (usuario.podeContribuir && (pr.responsavel === usuario.nome || pr.agendadoPor === usuario.nome))) && !concluido && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-[#2563eb]" title="Editar prazo" onClick={() => iniciarEditPrazo(pr)}><Edit size={13} /></Button>
                )}
                {usuario.podeEditar && (concluido ? (
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-blue-600 hover:text-blue-700" onClick={() => dispatch({ type: 'UPDATE_PRAZO', payload: { ...pr, status: 'pendente', aprovadoEm: undefined, aprovadoPor: undefined, cumpridoDeclaradoEm: undefined, cumpridoDeclaradoPor: undefined } })}>Reabrir</Button>
                ) : (
                  <>
                    <Button size="sm" className="h-7 text-[10px] px-2 bg-green-600 hover:bg-green-700" onClick={() => { dispatch({ type: 'UPDATE_PRAZO', payload: { ...pr, status: 'cumprido', aprovadoEm: new Date().toISOString(), aprovadoPor: usuario.nome } }); toast.success('Prazo concluído (baixado).'); }}>Concluir</Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" title="Cancelar prazo" onClick={() => { dispatch({ type: 'UPDATE_PRAZO', payload: { ...pr, status: 'cancelado' } }); toast.info('Prazo cancelado.'); }}><X size={13} /></Button>
                  </>
                ))}
              </div>
            </div>
            );
          })}
          {usuario.podeEditar && (novoPrazoTab ? (
            <div className="border rounded p-3 space-y-2 mt-2 bg-blue-50">
              <div><Label className="text-xs">Tarefa / descrição do prazo</Label><Input className="mt-1 h-7 text-xs" placeholder="Ex: Apresentar contestação" value={novoPrazo.descricao} onChange={e => setNovoPrazo(p => ({ ...p, descricao: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Data e hora</Label><Input type="datetime-local" step="300" className="mt-1 h-7 text-xs" value={novoPrazo.dataHora} onChange={e => setNovoPrazo(p => ({ ...p, dataHora: e.target.value }))} /></div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={novoPrazo.tipo} onValueChange={v => setNovoPrazo(p => ({ ...p, tipo: v as TipoPrazo }))}>
                    <SelectTrigger className="mt-1 h-7 text-xs capitalize"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_PRAZO_DET.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Responsável</Label>
                <Select value={novoPrazo.responsavel} onValueChange={v => setNovoPrazo(p => ({ ...p, responsavel: v }))}>
                  <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{state.advogados.map(a => <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2"><Button size="sm" variant="success" className="h-7 text-xs" onClick={addPrazo}>Agendar</Button><Button size="sm" variant="cancel" className="h-7 text-xs" onClick={() => setNovoPrazoTab(false)}>Cancelar</Button></div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs mt-2" onClick={() => setNovoPrazoTab(true)}><Clock size={12} className="mr-1" />Agendar prazo</Button>
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
        <TabsContent value="documentos" className="mt-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">{documentos.filter(d => !d.arquivado).length} documento(s) ativo(s){documentos.some(d => d.arquivado) ? ` · ${documentos.filter(d => d.arquivado).length} inativo(s)` : ''}</p>
            {usuario.podeContribuir && (
              <label className="text-xs text-blue-700 border border-blue-300 rounded px-3 py-1.5 cursor-pointer hover:bg-blue-50 flex items-center gap-1.5">
                {subindoDoc ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Anexar documento(s)
                <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.jpg,.jpeg,.png" disabled={subindoDoc} onChange={e => { enviarDocs(e.target.files, 'documento'); e.target.value = ''; }} />
              </label>
            )}
          </div>
          {documentos.length === 0 && <p className="text-xs text-gray-400">Nenhum documento anexado. Use "Anexar" para guardar defesas, contratos, provas, comprovantes — ficam salvos para consulta futura.</p>}
          {[...documentos].sort((a, b) => Number(a.arquivado) - Number(b.arquivado)).map(d => (
            <div key={d.id} className={`flex items-center justify-between border rounded p-2 text-xs gap-2 ${d.arquivado ? 'bg-gray-50 opacity-75' : ''}`}>
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={14} className="text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className={`font-medium truncate ${d.arquivado ? 'line-through text-gray-400' : ''}`}>{d.nome}</p>
                  <p className="text-gray-400 truncate">{d.arquivoNome}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {d.arquivado && <Badge className="bg-slate-200 text-slate-600 text-[10px]">inativo</Badge>}
                <Badge variant="outline" className="text-[10px] capitalize">{d.tipo}</Badge>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700" title="Baixar / abrir" onClick={() => baixarDoc(d)}><Download size={13} /></Button>
                {usuario.podeEditar && (d.arquivado ? (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-green-600 hover:text-green-700" title="Reativar documento" onClick={async () => { await db.setDocumentoArquivado(d.id, false); carregarDocs(); toast.success('Documento reativado.'); logAcao('editar', 'documento', `Reativou documento "${d.nome}" do processo ${processo.numero}`, processo.id); }}>Reativar</Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 text-slate-400 hover:text-amber-600" title="Inativar (o documento não é excluído, apenas fica inativo)" onClick={async () => { await db.setDocumentoArquivado(d.id, true); carregarDocs(); toast.success('Documento inativado.'); logAcao('editar', 'documento', `Inativou documento "${d.nome}" do processo ${processo.numero}`, processo.id); }}>Inativar</Button>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Editar dados do processo */}
      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="text-[#1e3a5f]">Editar Processo</DialogTitle></DialogHeader>
          {editando && (
            <ProcessoForm
              initial={{ numero: processo.numero, clienteId: processo.clienteId, vara: processo.vara, tribunal: processo.tribunal, comarca: processo.comarca, area: processo.area, fase: processo.fase, parteContraria: processo.parteContraria, advogadoResponsavel: processo.advogadoResponsavel, advogadoAdverso: processo.advogadoAdverso, advogadoAdversoTelefone: processo.advogadoAdversoTelefone, advogadoAdversoEmail: processo.advogadoAdversoEmail, valorCausa: processo.valorCausa, dataDistribuicao: processo.dataDistribuicao, status: processo.status, polo: processo.polo, objeto: processo.objeto, observacoes: processo.observacoes }}
              onSave={salvarEdicao}
              onCancel={() => setEditando(false)}
            />
          )}
        </DialogContent>
      </Dialog>
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
            <Button variant="cancel" size="sm" onClick={onClose} disabled={importando}>Cancelar</Button>
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

function fmtDataBR(d?: string): string {
  if (!d) return '';
  const [a, m, dia] = d.split('T')[0].split('-');
  return dia && m && a ? `${dia}/${m}/${a}` : d;
}

// Diálogo para o usuário concordar em inativar o processo após um alerta de arquivamento/baixa.
function DialogConcordarArquivamento({ proc, onConfirm, onCancel }: {
  proc: Processo;
  onConfirm: (situacao: StatusProcesso, obs: string) => void;
  onCancel: () => void;
}) {
  const [situacao, setSituacao] = useState<StatusProcesso>('arquivado');
  const [obs, setObs] = useState('');
  const INATIVAR: StatusProcesso[] = ['arquivado', 'ganho', 'perdido', 'acordo'];
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-600" /> Inativar processo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Processo <span className="font-mono font-semibold">{proc.numero}</span>. Foi detectado um <b>arquivamento/baixa</b>
            {proc.alertaArquivamento?.trecho ? <> em {proc.alertaArquivamento.fonte === 'publicacao' ? 'publicação' : 'andamento'}: <span className="italic">“{proc.alertaArquivamento.trecho}”</span></> : '.'}
          </p>
          <div>
            <Label className="text-xs">Nova situação</Label>
            <Select value={situacao} onValueChange={v => setSituacao(v as StatusProcesso)}>
              <SelectTrigger className="mt-1 h-8 text-sm capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>{INATIVAR.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea className="mt-1 text-sm" rows={3} placeholder="Ex.: baixado após acordo cumprido; verificado no sistema do tribunal..." value={obs} onChange={e => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="cancel" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => onConfirm(situacao, obs)}>Confirmar inativação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Processos() {
  const { state, dispatch, usuario } = useApp();
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
  const [arquivarId, setArquivarId] = useState<string | null>(null);
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [soAlerta, setSoAlerta] = useState(false);
  const [soNovos, setSoNovos] = useState(false);
  const [soBloqueio, setSoBloqueio] = useState(false);
  const [alertaConcordar, setAlertaConcordar] = useState<Processo | null>(null);
  // prefill from DataJud — stored here, passed to form via key remount
  const [prefill, setPrefill] = useState<(Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'> & { movimentacoes?: Movimentacao[] }) | null>(null);
  const [formKey, setFormKey] = useState(0);
  // print pendente (extraído por imagem) a ser salvo no Storage ao cadastrar
  const [pendingImage, setPendingImage] = useState<{ base64: string; mime: string; nome: string } | null>(null);

  const arquivadosCount = state.processos.filter(p => p.arquivado).length;
  const procById = useMemo(() => new Map(state.processos.map(p => [p.id, p])), [state.processos]);

  const confirmarOrigem = (proc: Processo) => {
    if (!proc.sugestaoOrigemId) return;
    dispatch({ type: 'UPDATE_PROCESSO', payload: { ...proc, processoOrigemId: proc.sugestaoOrigemId, sugestaoOrigemId: undefined } });
    const org = procById.get(proc.sugestaoOrigemId);
    toast.success(`Vinculado ao processo de origem ${org?.numero || ''}.`);
  };
  const descartarSugestao = (proc: Processo) => {
    dispatch({ type: 'UPDATE_PROCESSO', payload: { ...proc, sugestaoOrigemId: undefined } });
    toast.info('Sugestão de vínculo descartada.');
  };

  const alertaCount = state.processos.filter(p => p.alertaArquivamento?.ativo && !p.arquivado && usuario.emArea(p.area)).length;
  const novosCount = state.processos.filter(p => p.alertaNovo && !p.arquivado && usuario.emArea(p.area)).length;
  const bloqueioCount = state.processos.filter(p => p.alertaBloqueio && !p.arquivado && usuario.emArea(p.area)).length;

  const marcarRevisado = (proc: Processo) => {
    dispatch({ type: 'UPDATE_PROCESSO', payload: { ...proc, alertaNovo: false } });
    db.marcarProcessoRevisado(proc.id).then(({ error }) => {
      if (error) toast.error('Não foi possível salvar a revisão (verifique a conexão).');
    });
  };
  const marcarTodosRevisados = () => {
    const novos = state.processos.filter(p => p.alertaNovo && !p.arquivado && usuario.emArea(p.area));
    novos.forEach(marcarRevisado);
    if (novos.length) toast.success(`${novos.length} processo(s) marcados como revisados.`);
    setSoNovos(false);
  };

  const salvarAlerta = (proc: Processo, alerta: NonNullable<Processo['alertaArquivamento']>, extra?: Partial<Processo>) => {
    dispatch({ type: 'UPDATE_PROCESSO', payload: { ...proc, ...extra, alertaArquivamento: alerta } });
    db.resolverAlertaArquivamento(proc.id, alerta).then(({ error }) => {
      if (error) toast.error('Não foi possível salvar a decisão do alerta (verifique a conexão).');
    });
  };
  const ignorarAlerta = (proc: Processo) => {
    salvarAlerta(proc, { ...(proc.alertaArquivamento || { ativo: true }), ativo: false, decisao: 'ignorado', resolvidoEm: new Date().toISOString() });
    toast.info('Alerta ignorado — o processo segue ativo.');
  };
  // Fecha TODOS os alertas de arquivamento da lista de uma vez, sem arquivar os processos.
  const fecharTodosAlertas = () => {
    const alvos = state.processos.filter(p => p.alertaArquivamento?.ativo && !p.arquivado && usuario.emArea(p.area));
    alvos.forEach(p => salvarAlerta(p, { ...(p.alertaArquivamento || { ativo: true }), ativo: false, decisao: 'ignorado', resolvidoEm: new Date().toISOString() }));
    if (alvos.length) toast.success(`${alvos.length} alerta(s) fechado(s) — os processos seguem ativos (nada foi arquivado).`);
    setSoAlerta(false);
  };
  // "Fechar" o processo das listas de atenção (alerta de arquivamento e/ou novo capturado)
  // SEM arquivar — só tira a urgência/pendência da lista. O processo continua ativo.
  const dispensarDosAlertas = (proc: Processo) => {
    const temAlerta = !!proc.alertaArquivamento?.ativo;
    const temNovo = !!proc.alertaNovo;
    if (!temAlerta && !temNovo) return;
    if (temAlerta) {
      salvarAlerta(proc, { ...(proc.alertaArquivamento || { ativo: true }), ativo: false, decisao: 'ignorado', resolvidoEm: new Date().toISOString() }, temNovo ? { alertaNovo: false } : undefined);
      if (temNovo) db.marcarProcessoRevisado(proc.id).then(({ error }) => { if (error) toast.error('Não foi possível salvar (verifique a conexão).'); });
    } else {
      marcarRevisado(proc);
    }
    toast.success('Processo retirado das listas de alerta/novos (segue ativo — não foi arquivado).');
  };
  const concordarArquivamento = (proc: Processo, situacao: StatusProcesso, obs: string) => {
    const texto = obs.trim();
    const novaObs = texto
      ? `${proc.observacoes ? proc.observacoes + '\n' : ''}[${new Date().toLocaleDateString('pt-BR')}] Inativado (alerta de arquivamento): ${texto}`
      : proc.observacoes;
    salvarAlerta(
      proc,
      { ...(proc.alertaArquivamento || { ativo: true }), ativo: false, decisao: 'arquivado', obs: texto || undefined, resolvidoEm: new Date().toISOString() },
      { status: situacao, observacoes: novaObs },
    );
    setAlertaConcordar(null);
    toast.success(`Processo marcado como ${situacao}.`);
  };

  const filtered = state.processos.filter(p => {
    if (mostrarArquivados ? !p.arquivado : !!p.arquivado) return false;
    if (!usuario.podeVerProcesso(p)) return false;
    if (soAlerta && !p.alertaArquivamento?.ativo) return false;
    if (soNovos && !p.alertaNovo) return false;
    if (soBloqueio && !p.alertaBloqueio) return false;
    const cliente = state.clientes.find(c => c.id === p.clienteId);
    const s = search.toLowerCase();
    const matchSearch = (p.numero || '').toLowerCase().includes(s) ||
      (cliente?.nome || '').toLowerCase().includes(s) ||
      (p.parteContraria || '').toLowerCase().includes(s);
    const matchStatus = filterStatus === 'todos' || p.status === filterStatus;
    const matchArea = filterArea === 'todas' || p.area === filterArea;
    const matchTribunal = filterTribunal === 'todos' || p.tribunal === filterTribunal;
    return matchSearch && matchStatus && matchArea && matchTribunal;
  });

  const arquivarProcesso = (id: string) => {
    const p = state.processos.find(x => x.id === id);
    if (p) dispatch({ type: 'UPDATE_PROCESSO', payload: { ...p, arquivado: true } });
    toast.success('Processo arquivado.');
    setArquivarId(null);
  };
  const restaurarProcesso = (p: Processo) => {
    dispatch({ type: 'UPDATE_PROCESSO', payload: { ...p, arquivado: false } });
    toast.success('Processo restaurado.');
  };

  const handleSave = async (data: Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>, movs?: Movimentacao[]) => {
    if (editProcesso) {
      dispatch({ type: 'UPDATE_PROCESSO', payload: { ...editProcesso, ...data } });
      toast.success('Processo atualizado!');
      setDialogOpen(false); setEditProcesso(null); setPrefill(null); setPendingImage(null);
      return;
    }

    // Evita duplicar: se já existe processo com o mesmo número, anexa o print a ele
    const numeroLimpo = (data.numero || '').replace(/\D/g, '');
    const existente = numeroLimpo
      ? state.processos.find(p => p.numero.replace(/\D/g, '') === numeroLimpo)
      : undefined;
    if (existente) {
      if (pendingImage) {
        const up = await db.uploadProcessoImagem(existente.id, pendingImage.base64, pendingImage.mime, pendingImage.nome);
        if (up.path) {
          dispatch({ type: 'UPDATE_PROCESSO', payload: { ...existente, imagemPath: up.path, imagemNome: pendingImage.nome } });
          toast.success('Processo já cadastrado — print anexado a ele.');
        } else {
          toast.error('Não foi possível salvar o print.');
        }
      } else {
        toast.info('Processo já cadastrado — abrindo o existente.');
      }
      setDialogOpen(false); setEditProcesso(null); setPrefill(null); setPendingImage(null);
      setViewProcesso(existente);
      return;
    }

    const id = genId();
    let imagemPath: string | undefined;
    let imagemNome: string | undefined;
    let origem = data.origem;
    if (pendingImage) {
      const up = await db.uploadProcessoImagem(id, pendingImage.base64, pendingImage.mime, pendingImage.nome);
      if (up.path) { imagemPath = up.path; imagemNome = pendingImage.nome; origem = 'imagem'; }
    }
    dispatch({
      type: 'ADD_PROCESSO',
      payload: { ...data, id, origem, imagemPath, imagemNome, movimentacoes: movs || [], criadoEm: new Date().toISOString().split('T')[0] },
    });
    toast.success(pendingImage ? 'Processo cadastrado com o print anexado!' : 'Processo cadastrado!');
    setDialogOpen(false); setEditProcesso(null); setPrefill(null); setPendingImage(null);
  };

  const handleDataJudPrefill = (dados: Partial<Omit<Processo, 'id' | 'criadoEm' | 'movimentacoes'>> & { movimentacoes?: Movimentacao[]; _image?: { base64: string; mime: string; nome: string } }) => {
    const { _image, ...rest } = dados;
    setPendingImage(_image || null);
    const base = emptyProcesso();
    setPrefill({ ...base, ...rest });
    setEditProcesso(null);
    setFormKey(k => k + 1);
    setDatajudOpen(false);
    setDialogOpen(true);
    toast.success(_image ? 'Dados extraídos do print — confira e salve.' : 'Formulário pré-preenchido!');
  };

  // filter(Boolean): remove tribunais vazios — um <SelectItem value=""> quebra o Radix Select
  const tribunaisUnicos = [...new Set(state.processos.map(p => p.tribunal).filter(Boolean))];

  const initialForm = editProcesso
    ? { numero: editProcesso.numero, clienteId: editProcesso.clienteId, vara: editProcesso.vara, tribunal: editProcesso.tribunal, comarca: editProcesso.comarca, area: editProcesso.area, fase: editProcesso.fase, parteContraria: editProcesso.parteContraria, advogadoResponsavel: editProcesso.advogadoResponsavel, advogadoAdverso: editProcesso.advogadoAdverso, advogadoAdversoTelefone: editProcesso.advogadoAdversoTelefone, advogadoAdversoEmail: editProcesso.advogadoAdversoEmail, valorCausa: editProcesso.valorCausa, dataDistribuicao: editProcesso.dataDistribuicao, status: editProcesso.status, polo: editProcesso.polo, objeto: editProcesso.objeto, observacoes: editProcesso.observacoes }
    : prefill
      ? { numero: prefill.numero, clienteId: prefill.clienteId, vara: prefill.vara, tribunal: prefill.tribunal, comarca: prefill.comarca, area: prefill.area, fase: prefill.fase, parteContraria: prefill.parteContraria, advogadoResponsavel: prefill.advogadoResponsavel || '', advogadoAdverso: prefill.advogadoAdverso, advogadoAdversoTelefone: prefill.advogadoAdversoTelefone, advogadoAdversoEmail: prefill.advogadoAdversoEmail, valorCausa: prefill.valorCausa, dataDistribuicao: prefill.dataDistribuicao, status: prefill.status, polo: prefill.polo ?? 'autor', objeto: prefill.objeto ?? '', observacoes: prefill.observacoes }
      : emptyProcesso();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Processos</h1>
          <p className="text-sm text-gray-500">
            {state.processos.length - arquivadosCount} ativo(s){arquivadosCount > 0 && ` · ${arquivadosCount} arquivado(s)`}
          </p>
        </div>
        {usuario.podeEditar && (
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
        )}
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
        <Button variant={mostrarArquivados ? 'default' : 'outline'} size="sm" className={`h-9 text-xs ${mostrarArquivados ? 'bg-slate-500 hover:bg-slate-600' : ''}`} onClick={() => setMostrarArquivados(v => !v)}>
          <Archive size={14} className="mr-1" /> {mostrarArquivados ? 'Ver ativos' : `Arquivados${arquivadosCount ? ` (${arquivadosCount})` : ''}`}
        </Button>
        {alertaCount > 0 && (
          <Button variant={soAlerta ? 'default' : 'outline'} size="sm"
            className={`h-9 text-xs ${soAlerta ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}
            onClick={() => { setSoAlerta(v => !v); setSoNovos(false); }}>
            <AlertCircle size={14} className="mr-1" /> {soAlerta ? 'Ver todos' : `Alertas de arquivamento (${alertaCount})`}
          </Button>
        )}
        {novosCount > 0 && (
          <Button variant={soNovos ? 'default' : 'outline'} size="sm"
            className={`h-9 text-xs ${soNovos ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}`}
            onClick={() => { setSoNovos(v => !v); setSoAlerta(false); }}>
            <Sparkles size={14} className="mr-1" /> {soNovos ? 'Ver todos' : `Novos capturados (${novosCount})`}
          </Button>
        )}
        {soNovos && novosCount > 0 && usuario.podeEditar && (
          <Button size="sm" variant="outline" className="h-9 text-xs border-blue-300 text-blue-700 hover:bg-blue-50" onClick={marcarTodosRevisados}>
            <CheckCheck size={14} className="mr-1" /> Marcar todos como revisados
          </Button>
        )}
        {bloqueioCount > 0 && (
          <Button variant={soBloqueio ? 'default' : 'outline'} size="sm"
            className={`h-9 text-xs ${soBloqueio ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
            onClick={() => { setSoBloqueio(v => !v); setSoAlerta(false); setSoNovos(false); }}>
            <AlertTriangle size={14} className="mr-1" /> {soBloqueio ? 'Ver todos' : `Bloqueio/Penhora (${bloqueioCount})`}
          </Button>
        )}
        {soAlerta && alertaCount > 0 && usuario.podeEditar && (
          <Button size="sm" variant="outline" className="h-9 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={fecharTodosAlertas}>
            <X size={14} className="mr-1" /> Fechar todos (sem arquivar)
          </Button>
        )}
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
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="font-mono text-xs font-bold text-[#1e3a5f] truncate">{proc.numero}</p>
                        <CopiarNumero numero={proc.numero} size={11} />
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{cliente?.nome || '—'} <span className="text-gray-400">vs</span> {proc.parteContraria || '—'}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{proc.tribunal}{proc.comarca ? ` · ${proc.comarca}` : ''}</span>
                        {(proc.numero || '').replace(/\D/g, '').length !== 20 && (
                          <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5" title="Número fora do padrão CNJ (20 dígitos) — os andamentos não são capturados automaticamente pelo DataJud"><AlertCircle size={9} className="mr-0.5" />Sem CNJ</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] px-1.5 capitalize">{proc.area}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 capitalize">{proc.fase}</Badge>
                        {proc.alertaNovo && <Badge className="bg-blue-600 text-white text-[10px] px-1.5"><Sparkles size={9} className="mr-0.5" />Novo</Badge>}
                        {proc.alertaBloqueio && <Badge className="bg-red-600 text-white text-[10px] px-1.5" title="Há ordem ou efetivação de bloqueio/penhora online (SISBAJUD/BacenJud)"><AlertTriangle size={9} className="mr-0.5" />Bloqueio/Penhora</Badge>}
                        {proc.origem === 'auto_intimacao' && <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5"><Bot size={9} className="mr-0.5" />Auto (intimação)</Badge>}
                        {proc.origem === 'imagem' && <Badge className="bg-teal-100 text-teal-700 text-[10px] px-1.5"><ImageIcon size={9} className="mr-0.5" />Print</Badge>}
                        {proc.processoOrigemId && procById.get(proc.processoOrigemId) && <Badge variant="outline" className="text-[10px] px-1.5 text-purple-700 border-purple-300"><Link2 size={9} className="mr-0.5" />origem: {procById.get(proc.processoOrigemId)!.numero}</Badge>}
                        {prazosProc > 0 && <Badge className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5"><Clock size={9} className="mr-0.5" />{prazosProc} prazo(s)</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`${statusColor[proc.status]} capitalize text-[10px]`}>{proc.status}</Badge>
                    {usuario.podeEditar && (
                      <>
                        {(proc.alertaArquivamento?.ativo || proc.alertaNovo) && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100" title="Tirar dos alertas/novos sem arquivar (continua ativo)" onClick={e => { e.stopPropagation(); dispensarDosAlertas(proc); }}><X size={13} className="mr-0.5" />Fechar</Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setEditProcesso(proc); setPrefill(null); setDialogOpen(true); }}><Edit size={13} /></Button>
                        {proc.arquivado
                          ? <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600 hover:text-green-700" title="Restaurar" onClick={e => { e.stopPropagation(); restaurarProcesso(proc); }}><ArchiveRestore size={13} /></Button>
                          : <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" title="Arquivar" onClick={e => { e.stopPropagation(); setArquivarId(proc.id); }}><Archive size={13} /></Button>}
                      </>
                    )}
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>
                {usuario.podeEditar && proc.sugestaoOrigemId && !proc.arquivado && procById.get(proc.sugestaoOrigemId) && (
                  <div onClick={e => e.stopPropagation()} className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 text-[11px] text-amber-800">
                    <GitMerge size={13} className="flex-shrink-0" />
                    <span className="min-w-0">
                      Possível continuação de <span className="font-mono font-semibold">{procById.get(proc.sugestaoOrigemId)!.numero}</span>
                      <span className="text-amber-600"> (mesmas partes · {procById.get(proc.sugestaoOrigemId)!.tribunal}).</span> Vincular como processo de origem?
                    </span>
                    <div className="ml-auto flex gap-1 flex-shrink-0">
                      <Button size="sm" className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700" onClick={() => confirmarOrigem(proc)}><Link2 size={10} className="mr-0.5" />Vincular</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-amber-300 text-amber-700" onClick={() => descartarSugestao(proc)}>Descartar</Button>
                    </div>
                  </div>
                )}
                {proc.alertaNovo && !proc.arquivado && (
                  <div onClick={e => e.stopPropagation()} className="mt-2 bg-blue-50 border border-blue-200 rounded p-2.5 text-[11px] text-blue-800">
                    <div className="flex items-start gap-1.5">
                      <Sparkles size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p><b>Processo novo capturado automaticamente.</b> Confira os dados e veja se é preciso tomar providências (prazo, vínculo de origem, responsável).</p>
                        {usuario.podeEditar ? (
                          <div className="flex gap-1.5 mt-1.5">
                            <Button size="sm" className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700" onClick={() => setViewProcesso(proc)}>Abrir e revisar</Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-blue-300 text-blue-700" onClick={() => marcarRevisado(proc)}><CheckCheck size={11} className="mr-0.5" />Marcar como revisado</Button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-blue-600 mt-1">Somente leitura — um editor pode marcar como revisado.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {proc.alertaArquivamento?.ativo && (
                  <div onClick={e => e.stopPropagation()} className="mt-2 bg-amber-50 border border-amber-300 rounded p-2.5 text-[11px] text-amber-800">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p><b>Alerta: possível baixa/arquivamento</b> detectado em {proc.alertaArquivamento.fonte === 'publicacao' ? 'publicação' : 'andamento'}{proc.alertaArquivamento.data ? ` de ${fmtDataBR(proc.alertaArquivamento.data)}` : ''}.</p>
                        {proc.alertaArquivamento.trecho && <p className="italic text-amber-700 mt-0.5 line-clamp-2">“{proc.alertaArquivamento.trecho}”</p>}
                        {usuario.podeEditar ? (
                          <div className="flex gap-1.5 mt-1.5">
                            <Button size="sm" className="h-6 text-[10px] px-2 bg-amber-600 hover:bg-amber-700" onClick={() => setAlertaConcordar(proc)}>Concordar e inativar</Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-amber-300 text-amber-700" onClick={() => ignorarAlerta(proc)}>Ignorar</Button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-amber-600 mt-1">Somente leitura — um editor pode confirmar a inativação.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {alertaConcordar && (
        <DialogConcordarArquivamento
          proc={alertaConcordar}
          onConfirm={(s, o) => concordarArquivamento(alertaConcordar, s, o)}
          onCancel={() => setAlertaConcordar(null)}
        />
      )}

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
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader><DialogTitle className="text-[#1e3a5f]">Detalhes do Processo</DialogTitle></DialogHeader>
          {viewProcesso && <ProcessoDetalhe processo={viewProcesso} onClose={() => setViewProcesso(null)} />}
        </DialogContent>
      </Dialog>

      {/* Dialog Arquivar */}
      <Dialog open={!!arquivarId} onOpenChange={() => setArquivarId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Arquivar processo</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">O processo sai da lista ativa, mas <b>não é excluído</b> — os andamentos, prazos e publicações são mantidos, e você pode restaurá-lo em "Arquivados".</p>
          <DialogFooter>
            <Button variant="cancel" size="sm" onClick={() => setArquivarId(null)}>Cancelar</Button>
            <Button size="sm" className="bg-slate-500 hover:bg-slate-600" onClick={() => arquivarId && arquivarProcesso(arquivarId)}>Arquivar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
