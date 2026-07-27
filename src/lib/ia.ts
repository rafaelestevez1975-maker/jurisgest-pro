// ─── Central de IA ────────────────────────────────────────────────────────────
// Suporta 3 formas de usar a IA para gerar petições:
//  1. 'api'    — chama a API Anthropic direto (precisa de chave sk-ant-…; cobra por token)
//  2. 'local'  — chama uma "ponte local" (ex.: Claude Code rodando na máquina do usuário)
//  3. 'copiar' — monta o prompt pronto para colar no Claude Desktop / Claude.ai (usa a
//                assinatura que o usuário já tem, sem custo de API) e cola a resposta de volta.

export const MODELOS_IA: { id: string; nome: string }[] = [
  { id: 'claude-sonnet-5', nome: 'Claude Sonnet 5 — recomendado p/ petições' },
  { id: 'claude-opus-4-8', nome: 'Claude Opus 4.8 — máxima qualidade' },
  { id: 'claude-haiku-4-5-20251001', nome: 'Claude Haiku 4.5 — rápido e econômico' },
];

export type ModoIA = 'api' | 'local' | 'copiar';

export interface IAConfig {
  model: string;
  modo: ModoIA;
  endpointLocal: string;
}

const LS_KEY = 'jurisgest_ia_config';
const PADRAO: IAConfig = { model: 'claude-sonnet-5', modo: 'copiar', endpointLocal: 'http://localhost:4141/gerar' };

export function lerIAConfig(): IAConfig {
  try {
    const r = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return {
      model: r.model || PADRAO.model,
      modo: (r.modo as ModoIA) || PADRAO.modo,
      endpointLocal: r.endpointLocal || PADRAO.endpointLocal,
    };
  } catch { return { ...PADRAO }; }
}

export function salvarIAConfig(c: IAConfig) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// ─── Chamada direta à API Anthropic ─────────────────────────────────────────────
export async function chamarClaudeAPI(opts: {
  apiKey: string; model: string; system?: string; prompt: string; maxTokens?: number;
}): Promise<string> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error((e as { error?: { message?: string } })?.error?.message || `Erro ${resp.status} na API Anthropic.`);
  }
  const data = await resp.json();
  const txt = (data.content || []).map((b: { text?: string }) => b.text || '').join('').trim();
  if (!txt) throw new Error('A API não retornou texto.');
  return txt;
}

// ─── Ponte local (ex.: Claude Code na máquina do usuário) ───────────────────────
// Espera um serviço HTTP local que aceite POST {system, prompt} e devolva {text}.
export async function chamarClaudeLocal(opts: { endpoint: string; system?: string; prompt: string }): Promise<string> {
  let resp: Response;
  try {
    resp = await fetch(opts.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ system: opts.system, prompt: opts.prompt }),
    });
  } catch {
    throw new Error('Não foi possível falar com a ponte local. Verifique se o serviço está rodando na sua máquina e o endereço em Configurações.');
  }
  if (!resp.ok) throw new Error(`A ponte local retornou ${resp.status}.`);
  const data = await resp.json().catch(() => null);
  const txt = typeof data === 'string' ? data : (data?.text || data?.result || data?.content || '');
  if (!txt) throw new Error('A ponte local respondeu sem texto (esperado um campo "text").');
  return String(txt).trim();
}

// ─── Montagem de prompts de petição ─────────────────────────────────────────────
export const SYSTEM_PETICAO =
  `Você é advogado(a) brasileiro(a) experiente redigindo peças processuais. ` +
  `Escreva em português jurídico formal e técnico, com a estrutura correta da peça pedida ` +
  `(endereçamento ao juízo, qualificação das partes, síntese, DOS FATOS, DO DIREITO com ` +
  `fundamentação legal — citando artigos de lei aplicáveis — e, quando couber, DOS PEDIDOS, ` +
  `valor da causa e fecho com local, data e espaço para assinatura/OAB). ` +
  `Seja fiel aos fatos informados e coeso. ` +
  `NÃO invente fatos, nomes, valores ou números de processo que não foram fornecidos: onde ` +
  `faltar informação, insira um marcador entre colchetes como [INSERIR ...]. ` +
  `NÃO invente jurisprudência com número de acórdão falso; se citar tese, mantenha genérica ou marque [CONFERIR CITAÇÃO]. ` +
  `Entregue apenas o texto da peça, pronto para revisão do advogado.`;

export interface DadosPeticao {
  tipoPeca: string;
  tribunal: string;
  vara: string;
  comarca: string;
  numero: string;
  cliente: string;
  poloCliente: string;
  parteContraria: string;
  area: string;
  fatos: string;
  pedidos: string;
  instrucoes: string;
  escritorio?: string;
  oab?: string;
}

export function montarPromptPeticao(p: DadosPeticao): string {
  const linhas: string[] = [
    `Redija uma **${p.tipoPeca || 'peça processual'}** completa e pronta para protocolo.`,
    ``,
    `DADOS DO CASO:`,
    `- Juízo/Vara: ${[p.vara, p.comarca, p.tribunal].filter(Boolean).join(' — ') || '[INSERIR JUÍZO]'}`,
    p.numero ? `- Nº do processo: ${p.numero}` : `- Ação nova (sem número de processo ainda)`,
    `- Cliente (constituinte): ${p.cliente || '[INSERIR CLIENTE]'}${p.poloCliente ? ` — polo ${p.poloCliente}` : ''}`,
    `- Parte contrária: ${p.parteContraria || '[INSERIR PARTE CONTRÁRIA]'}`,
  ];
  if (p.area) linhas.push(`- Área do direito: ${p.area}`);
  if (p.escritorio) linhas.push(`- Subscritor: ${p.escritorio}${p.oab ? ` — OAB ${p.oab}` : ''}`);
  linhas.push(
    ``,
    `FATOS E FUNDAMENTOS (informados pelo advogado):`,
    p.fatos.trim() || '[INSERIR OS FATOS]',
    ``,
    `PEDIDOS PRETENDIDOS:`,
    p.pedidos.trim() || '[INSERIR OS PEDIDOS]',
  );
  if (p.instrucoes.trim()) linhas.push(``, `INSTRUÇÕES ADICIONAIS:`, p.instrucoes.trim());
  return linhas.join('\n');
}

// Prompt "solto" (com a instrução de sistema embutida) para colar no Claude Desktop/Claude.ai
export function promptCompletoParaColar(p: DadosPeticao): string {
  return `${SYSTEM_PETICAO}\n\n---\n\n${montarPromptPeticao(p)}`;
}
