import { useState } from 'react';
import { useApp } from '../context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle, Sparkles, Search, Loader2, BookOpen, MessageCircleQuestion } from 'lucide-react';

interface Topico {
  id: string;
  modulo: string;
  titulo: string;
  texto: string;
  chaves: string;
}

// ─── Base de conhecimento do JurisGest Pro ──────────────────────────────────
const TOPICOS: Topico[] = [
  { id: 'dashboard', modulo: 'Dashboard', titulo: 'O que mostra o Dashboard', chaves: 'painel inicio visão geral resumo indicadores kpi',
    texto: 'É a visão geral do escritório. Mostra os números principais (clientes, processos ativos, prazos em 7 dias, publicações não lidas), o valor total em causas ativas, os andamentos capturados, os próximos prazos por urgência, a distribuição de processos por status e por área, os andamentos recentes capturados pelo robô e as publicações recentes.' },

  { id: 'add-cliente', modulo: 'Clientes', titulo: 'Como cadastrar um cliente', chaves: 'adicionar novo cliente cadastro cpf cnpj cep endereço pessoa física jurídica',
    texto: 'Em Clientes, clique em "Novo Cliente". Preencha nome, tipo (PF/PJ), CPF/CNPJ, contatos e endereço (o CEP preenche o endereço automaticamente via ViaCEP). Você também pode importar vários de uma vez em "Importar CSV".' },
  { id: 'arquivar-cliente', modulo: 'Clientes', titulo: 'Arquivar / restaurar cliente', chaves: 'arquivar excluir apagar deletar restaurar remover inativar',
    texto: 'Nada é excluído no sistema — apenas arquivado. No card do cliente, clique no ícone de caixa (Arquivar); ele sai da lista ativa mas os processos vinculados são mantidos. Para ver ou restaurar, use o botão "Arquivados" na barra de busca.' },

  { id: 'add-processo', modulo: 'Processos', titulo: 'Como cadastrar um processo', chaves: 'adicionar novo processo cnj numero vara tribunal comarca área fase valor causa polo autor réu objeto',
    texto: 'Em Processos, clique em "Novo Processo". Informe o número CNJ, cliente vinculado, vara, tribunal, comarca, área, fase, polo do cliente (autor/réu), objeto/assunto, parte contrária, advogado, valor da causa e data de distribuição. Dá para acompanhar a timeline de andamentos e os prazos de cada processo.' },
  { id: 'importar-lote', modulo: 'Processos', titulo: 'Importar processos em lote', chaves: 'importar lote massa vários planilha csv colar lista integra número cnj',
    texto: 'Em Processos → "Importar em Lote", cole uma lista (tabela copiada do Integra/planilha, CSV, ou só os números CNJ). O sistema identifica número, cliente e parte adversa, infere o tribunal, cria os clientes que faltam e cadastra tudo. Opcionalmente enriquece cada um pelo DataJud.' },
  { id: 'importar-ia', modulo: 'Processos', titulo: 'Importar processo com IA (print/foto/DataJud)', chaves: 'ia inteligência artificial imagem print foto citação datajud texto extrair automático',
    texto: 'Em Processos → "Importar com IA" você pode: enviar um print/foto de qualquer sistema (PJe, e-SAJ, Integra…) e a IA extrai número, partes, tribunal e valor; colar um texto; ou consultar o DataJud pelo número. Requer a chave de IA (Anthropic) em Configurações para as opções de imagem/texto.' },
  { id: 'arquivar-processo', modulo: 'Processos', titulo: 'Arquivar / restaurar processo', chaves: 'arquivar excluir apagar processo restaurar encerrado',
    texto: 'Assim como os clientes, processos não são excluídos — só arquivados. Use o ícone de caixa no card. Os andamentos, prazos e publicações são preservados. Veja e restaure em "Arquivados".' },

  { id: 'prazos', modulo: 'Agenda', titulo: 'Cadastrar e acompanhar prazos', chaves: 'agenda prazo audiência dias úteis feriado responsável alerta calendário vencimento',
    texto: 'Na Agenda você cadastra prazos (tipo, descrição, data/hora, dias úteis ou corridos, responsável e alerta). A contagem em dias úteis desconta sábados, domingos e feriados. Há visão em calendário e em lista, com cores por urgência.' },
  { id: 'ciencia', modulo: 'Agenda', titulo: 'Ciência do prazo (quem viu)', chaves: 'ciência visto confirmar responsável viu prazo aguardando',
    texto: 'Cada prazo mostra se o responsável tomou ciência. Enquanto ninguém confirma, aparece "Aguardando ciência" (âmbar). Ao clicar em "Confirmar ciência" e escolher o advogado, fica registrado quem viu e quando.' },

  { id: 'publicacoes-filtros', modulo: 'Publicações', titulo: 'Filtrar publicações (arquivadas, agendadas…)', chaves: 'publicações intimações filtro chips não lida lida agendada arquivada tribunal período vínculo',
    texto: 'Use os chips com contadores: Ativas, Não lidas, Lidas, Agendadas (com prazo gerado), Arquivadas e Todas. Há ainda filtro por tribunal, por vínculo (vinculadas/não vinculadas a processo), por período e busca livre.' },
  { id: 'publicacao-abrir', modulo: 'Publicações', titulo: 'Abrir uma publicação e agir sobre ela', chaves: 'abrir publicação clicar detalhe conteúdo gerar prazo arquivar vincular link tribunal',
    texto: 'Clique em qualquer publicação para abrir o detalhe com o conteúdo completo, o link para o site do tribunal e a opção de vincular a um processo. De dentro do detalhe você pode Arquivar ou Gerar Prazo.' },

  { id: 'robo-datajud', modulo: 'Monitoramento', titulo: 'Robô de andamentos (DataJud) — grátis', chaves: 'robô robo datajud cnj andamentos automático grátis 6 horas movimentações',
    texto: 'O robô consulta a API pública do CNJ (DataJud) e cadastra automaticamente os novos andamentos de cada processo. Roda a cada 6 horas quando ativado. É gratuito. Como o DataJud é lento, cada execução processa um lote (os processos há mais tempo sem verificação).' },
  { id: 'intimacoes-cnj', modulo: 'Monitoramento', titulo: 'Intimações pela OAB (CNJ / DJEN) — grátis', chaves: 'intimações publicações oab procurador djen comunica cnj grátis diário justiça nacional advogado',
    texto: 'O sistema captura as suas intimações de todo o Brasil pelo número da OAB, direto do Diário de Justiça Eletrônico Nacional (DJEN) do CNJ — de graça, sem provedor pago. Cadastre-se como Procurador (com a OAB) em Monitoramento e use o botão verde "Capturar intimações agora"; roda também 2×/dia automaticamente.' },
  { id: 'busca-nome', modulo: 'Monitoramento', titulo: 'Descobrir processos pelo nome (Escavador)', chaves: 'busca nacional nome cliente parte escavador pago token descobrir processos cpf cnpj provedor',
    texto: 'Para descobrir TODOS os processos pelo nome de um cliente (não pela OAB), é preciso um provedor pago que indexa as partes (ex.: Escavador), pois o CNJ gratuito não busca por nome de parte. Cadastre o token do Escavador em Monitoramento para ativar. Processos já capturados pelo seu nome de procurador não se repetem.' },

  { id: 'relatorios', modulo: 'Relatórios', titulo: 'Gerar relatórios de processos', chaves: 'relatório filtrar ativos inativos valor causa autor réu área objeto últimos andamentos exportar csv imprimir pdf',
    texto: 'Em Relatórios você filtra a carteira por situação (ativos/inativos), área, cliente, polo (autor/réu), parte contrária, objeto, tribunal, fase, advogado, faixa de valor da causa e período. Cada processo mostra os últimos 3 andamentos. Dá para exportar em CSV e imprimir/gerar PDF.' },

  { id: 'config', modulo: 'Configurações', titulo: 'Configurar escritório, advogados e IA', chaves: 'configurações escritório oab advogados feriados tribunais chave api anthropic ia integração',
    texto: 'Em Configurações você define os dados do escritório, cadastra os advogados, os feriados municipais, as credenciais de tribunais e a chave de IA (Anthropic) usada na importação por imagem/texto e nesta Ajuda.' },
  { id: 'login', modulo: 'Segurança', titulo: 'Acesso, login e privacidade', chaves: 'login senha acesso segurança privacidade sair lgpd proteção dados',
    texto: 'O sistema exige login. Os dados só aparecem para a sua conta — ninguém mais os acessa. Use o botão "Sair" no topo para encerrar a sessão. Nada é excluído do sistema: registros são apenas arquivados.' },
];

const MODULOS = [...new Set(TOPICOS.map(t => t.modulo))];

function pontuar(topico: Topico, termos: string[]): number {
  const alvo = `${topico.titulo} ${topico.chaves} ${topico.texto}`.toLowerCase();
  return termos.reduce((s, t) => s + (t.length > 2 && alvo.includes(t) ? (topico.titulo.toLowerCase().includes(t) ? 3 : 1) : 0), 0);
}

async function perguntarIA(pergunta: string, apiKey: string): Promise<string> {
  const base = TOPICOS.map(t => `[${t.modulo}] ${t.titulo}: ${t.texto}`).join('\n');
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
      max_tokens: 800,
      system: `Você é o assistente de ajuda do JurisGest Pro, um sistema de gestão jurídica para escritórios de advocacia. Responda em português do Brasil, de forma direta, prática e curta (no máximo 2 parágrafos), explicando como usar o recurso. Baseie-se SOMENTE nas informações abaixo sobre o sistema; se a pergunta fugir do sistema, diga que só pode ajudar com o JurisGest Pro.\n\nRECURSOS DO SISTEMA:\n${base}`,
      messages: [{ role: 'user', content: pergunta }],
    }),
  });
  if (!resp.ok) throw new Error(`IA retornou ${resp.status}`);
  const data = await resp.json();
  return (data?.content?.[0]?.text || '').trim() || 'Não consegui gerar uma resposta.';
}

export default function Ajuda() {
  const { state } = useApp();
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState<string | null>(null);
  const [relevantes, setRelevantes] = useState<Topico[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const temIA = !!(state.anthropicApiKey || '').trim();

  const perguntar = async () => {
    const q = pergunta.trim();
    if (!q) return;
    setErro(''); setResposta(null);
    const termos = q.toLowerCase().split(/\s+/);
    const rank = TOPICOS.map(t => ({ t, s: pontuar(t, termos) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    setRelevantes(rank.slice(0, 4).map(x => x.t));

    if (temIA) {
      setLoading(true);
      try {
        setResposta(await perguntarIA(q, state.anthropicApiKey));
      } catch (e) {
        setErro('Não foi possível usar a IA agora (' + ((e as Error)?.message || e) + '). Veja abaixo os tópicos relacionados.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2"><HelpCircle size={22} /> Central de Ajuda</h1>
        <p className="text-sm text-gray-500">Pergunte o que quiser saber sobre o sistema e receba a explicação.</p>
      </div>

      {/* Caixa de pergunta */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageCircleQuestion size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <Input
                className="pl-9 h-10 text-sm"
                placeholder="Ex: como capturo minhas intimações? como arquivo um processo?"
                value={pergunta}
                onChange={e => setPergunta(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && perguntar()}
              />
            </div>
            <Button className="h-10 bg-[#2563eb] hover:bg-blue-700 text-sm px-4" onClick={perguntar} disabled={loading || !pergunta.trim()}>
              {loading ? <Loader2 size={15} className="animate-spin mr-1" /> : <Search size={15} className="mr-1" />}
              Perguntar
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            {temIA
              ? <><Sparkles size={11} className="text-blue-500" /> Respostas geradas por IA + tópicos do manual.</>
              : <>Busca no manual do sistema. Para respostas livres por IA, cadastre a chave Anthropic em Configurações → Integrações IA.</>}
          </p>

          {erro && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">{erro}</p>}

          {resposta && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-800 flex items-center gap-1 mb-1"><Sparkles size={12} /> Resposta</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{resposta}</p>
            </div>
          )}

          {relevantes && relevantes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">{resposta ? 'Veja também no manual:' : 'Tópicos relacionados:'}</p>
              {relevantes.map(t => (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{t.modulo}</Badge>
                    <p className="text-sm font-medium text-[#1e3a5f]">{t.titulo}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{t.texto}</p>
                </div>
              ))}
            </div>
          )}
          {relevantes && relevantes.length === 0 && !resposta && (
            <p className="text-xs text-gray-500">Nenhum tópico encontrado. Tente outras palavras ou navegue pelo manual abaixo.</p>
          )}
        </CardContent>
      </Card>

      {/* Manual completo por módulo */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1"><BookOpen size={15} /> Manual por módulo</p>
        <Accordion type="multiple" className="space-y-2">
          {MODULOS.map(mod => (
            <AccordionItem key={mod} value={mod} className="border rounded-lg px-3 bg-white">
              <AccordionTrigger className="text-sm font-medium text-[#1e3a5f] hover:no-underline py-3">{mod}</AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                {TOPICOS.filter(t => t.modulo === mod).map(t => (
                  <div key={t.id}>
                    <p className="text-sm font-medium text-gray-800">{t.titulo}</p>
                    <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{t.texto}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
