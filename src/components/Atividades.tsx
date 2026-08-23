import { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context';
import { db } from '../lib/db';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search, FileSpreadsheet, FileText } from 'lucide-react';
import { exportarExcel, exportarPDF } from '../lib/export';

interface Atividade {
  id: string; usuario_email: string | null; usuario_nome: string | null;
  acao: string; entidade: string | null; entidade_id: string | null;
  descricao: string; criado_em: string;
}

const ACAO_COR: Record<string, string> = {
  login: 'bg-slate-100 text-slate-600', criar: 'bg-green-100 text-green-700',
  editar: 'bg-blue-100 text-blue-700', excluir: 'bg-red-100 text-red-700',
  arquivar: 'bg-amber-100 text-amber-700', agendar: 'bg-indigo-100 text-indigo-700',
  importar: 'bg-purple-100 text-purple-700', cumprir: 'bg-emerald-100 text-emerald-700',
};

export default function Atividades() {
  const { usuario } = useApp();
  const [rows, setRows] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [fUser, setFUser] = useState('todos');
  const [fAcao, setFAcao] = useState('todos');
  const [busca, setBusca] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [aba, setAba] = useState<'detalhe' | 'resumo'>('resumo');

  const carregar = () => {
    setCarregando(true);
    db.listarAtividades(5000).then(({ data }) => setRows((data as Atividade[]) || [])).finally(() => setCarregando(false));
  };
  useEffect(() => { if (usuario.isAdmin) carregar(); /* eslint-disable-next-line */ }, [usuario.isAdmin]);

  const usuarios = useMemo(() => [...new Set(rows.map(r => r.usuario_nome || r.usuario_email || '—'))].filter(Boolean), [rows]);
  const acoes = useMemo(() => [...new Set(rows.map(r => r.acao))].filter(Boolean), [rows]);

  const filtradas = rows.filter(r => {
    if (fUser !== 'todos' && (r.usuario_nome || r.usuario_email || '—') !== fUser) return false;
    if (fAcao !== 'todos' && r.acao !== fAcao) return false;
    const dia = (r.criado_em || '').split('T')[0];
    if (de && dia < de) return false;
    if (ate && dia > ate) return false;
    if (busca && !`${r.descricao} ${r.usuario_nome || ''} ${r.usuario_email || ''} ${r.entidade || ''}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // Resumo por usuário (respeita o período De/Até; login contado à parte das tarefas).
  const resumo = useMemo(() => {
    type Lin = { nome: string; logins: number; baixas: number; andamentos: number; agendou: number; cadastros: number; edicoes: number; arquivou: number; excluiu: number; total: number; ultima: string };
    const m = new Map<string, Lin>();
    rows.forEach(r => {
      const dia = (r.criado_em || '').split('T')[0];
      if (de && dia < de) return;
      if (ate && dia > ate) return;
      const nome = r.usuario_nome || r.usuario_email || '—';
      const e = m.get(nome) || { nome, logins: 0, baixas: 0, andamentos: 0, agendou: 0, cadastros: 0, edicoes: 0, arquivou: 0, excluiu: 0, total: 0, ultima: '' };
      const andamento = r.entidade === 'andamento';
      if (r.acao === 'login') e.logins++;
      else {
        e.total++;
        if (r.acao === 'cumprir') e.baixas++;
        else if (andamento) e.andamentos++;
        else if (r.acao === 'agendar') e.agendou++;
        else if (r.acao === 'criar') e.cadastros++;
        else if (r.acao === 'editar') e.edicoes++;
        else if (r.acao === 'arquivar') e.arquivou++;
        else if (r.acao === 'excluir') e.excluiu++;
      }
      if (!e.ultima || r.criado_em > e.ultima) e.ultima = r.criado_em;
      m.set(nome, e);
    });
    return [...m.values()].sort((a, b) => b.total - a.total || b.logins - a.logins);
  }, [rows, de, ate]);

  if (!usuario.isAdmin) return <p className="text-sm text-gray-500">Apenas o administrador pode ver o relatório de atividades.</p>;

  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; } };

  const dadosExport = () => {
    if (aba === 'resumo') {
      const headers = ['Usuário', 'Logins', 'Baixas', 'Andamentos', 'Agendou', 'Cadastros', 'Edições', 'Arquivou', 'Excluiu', 'Total tarefas', 'Última atividade'];
      const rows = resumo.map(u => [u.nome, u.logins, u.baixas, u.andamentos, u.agendou, u.cadastros, u.edicoes, u.arquivou, u.excluiu, u.total, u.ultima ? fmt(u.ultima) : '—'] as (string | number | null | undefined)[]);
      return { headers, rows };
    }
    const headers = ['Data/Hora', 'Usuário', 'E-mail', 'Ação', 'Entidade', 'Descrição'];
    const rows = filtradas.map(r => [fmt(r.criado_em), r.usuario_nome || '', r.usuario_email || '', r.acao, r.entidade || '', r.descricao] as (string | number | null | undefined)[]);
    return { headers, rows };
  };
  const exportarXls = () => { const { headers, rows } = dadosExport(); exportarExcel(aba === 'resumo' ? 'atividades_por_usuario' : 'atividades', headers, rows, aba === 'resumo' ? 'Por usuário' : 'Atividades'); };
  const exportarPdf = () => { const { headers, rows } = dadosExport(); exportarPDF(aba === 'resumo' ? 'Tarefas por usuário' : 'Relatório de Atividades', headers, rows); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="inline-flex rounded-md border overflow-hidden">
          <button className={`px-3 py-1.5 text-xs ${aba === 'resumo' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`} onClick={() => setAba('resumo')}>Por usuário</button>
          <button className={`px-3 py-1.5 text-xs border-l ${aba === 'detalhe' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`} onClick={() => setAba('detalhe')}>Detalhado</button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={exportarXls} disabled={aba === 'resumo' ? !resumo.length : !filtradas.length}><FileSpreadsheet size={13} className="mr-1" />Excel</Button>
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={exportarPdf} disabled={aba === 'resumo' ? !resumo.length : !filtradas.length}><FileText size={13} className="mr-1" />PDF</Button>
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={carregar} disabled={carregando}><RefreshCw size={13} className={`mr-1 ${carregando ? 'animate-spin' : ''}`} />Atualizar</Button>
        </div>
      </div>

      {aba === 'resumo' ? (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500">Período:</span>
            <Input type="date" className="h-9 text-xs w-36" value={de} onChange={e => setDe(e.target.value)} title="De" />
            <Input type="date" className="h-9 text-xs w-36" value={ate} onChange={e => setAte(e.target.value)} title="Até" />
            <span className="text-xs text-gray-400">{resumo.length} usuário(s)</span>
          </div>
          <div className="border rounded overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">Usuário</th>
                    <th className="px-2 py-2 font-medium text-center" title="Quantas vezes acessou o sistema">Logins</th>
                    <th className="px-2 py-2 font-medium text-center">Baixas</th>
                    <th className="px-2 py-2 font-medium text-center">Andamentos</th>
                    <th className="px-2 py-2 font-medium text-center">Agendou</th>
                    <th className="px-2 py-2 font-medium text-center">Cadastros</th>
                    <th className="px-2 py-2 font-medium text-center">Edições</th>
                    <th className="px-2 py-2 font-medium text-center">Arquivou</th>
                    <th className="px-2 py-2 font-medium text-center" title="Total de tarefas (exclui logins)">Total</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Última atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resumo.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-400">Nenhuma atividade no período.</td></tr>}
                  {resumo.map(u => (
                    <tr key={u.nome} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 whitespace-nowrap font-medium">{u.nome}</td>
                      <td className="px-2 py-1.5 text-center"><Badge className="bg-slate-100 text-slate-600 text-[10px]">{u.logins}</Badge></td>
                      <td className="px-2 py-1.5 text-center font-semibold text-emerald-700">{u.baixas || ''}</td>
                      <td className="px-2 py-1.5 text-center">{u.andamentos || ''}</td>
                      <td className="px-2 py-1.5 text-center">{u.agendou || ''}</td>
                      <td className="px-2 py-1.5 text-center">{u.cadastros || ''}</td>
                      <td className="px-2 py-1.5 text-center">{u.edicoes || ''}</td>
                      <td className="px-2 py-1.5 text-center">{u.arquivou || ''}</td>
                      <td className="px-2 py-1.5 text-center font-bold text-[#1e3a5f]">{u.total}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-500 font-mono">{u.ultima ? fmt(u.ultima) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">Tarefas executadas por cada usuário no período, e quantas vezes acessou o sistema (Logins). "Baixas" = prazos/tarefas baixados; "Andamentos" = andamentos lançados. Use o período acima para recortar.</p>
        </>
      ) : (
      <>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48"><Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" /><Input className="pl-7 h-9 text-xs" placeholder="Buscar na descrição/usuário…" value={busca} onChange={e => setBusca(e.target.value)} /></div>
        <Select value={fUser} onValueChange={setFUser}><SelectTrigger className="h-9 text-xs w-44"><SelectValue placeholder="Usuário" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os usuários</SelectItem>{usuarios.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
        <Select value={fAcao} onValueChange={setFAcao}><SelectTrigger className="h-9 text-xs w-36"><SelectValue placeholder="Ação" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as ações</SelectItem>{acoes.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent></Select>
        <Input type="date" className="h-9 text-xs w-36" value={de} onChange={e => setDe(e.target.value)} title="De" />
        <Input type="date" className="h-9 text-xs w-36" value={ate} onChange={e => setAte(e.target.value)} title="Até" />
      </div>
      <p className="text-sm text-gray-600">{filtradas.length} atividade(s){rows.length && filtradas.length !== rows.length ? ` de ${rows.length}` : ''}</p>
      <div className="border rounded overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 z-10"><tr className="text-left text-gray-500"><th className="px-3 py-2 font-medium whitespace-nowrap">Data/hora</th><th className="px-3 py-2 font-medium">Usuário</th><th className="px-3 py-2 font-medium">Ação</th><th className="px-3 py-2 font-medium">Descrição</th></tr></thead>
            <tbody className="divide-y">
              {filtradas.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Nenhuma atividade registrada ainda.</td></tr>}
              {filtradas.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-500 font-mono">{fmt(r.criado_em)}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{r.usuario_nome || r.usuario_email || '—'}</td>
                  <td className="px-3 py-1.5"><Badge className={`${ACAO_COR[r.acao] || 'bg-gray-100 text-gray-600'} text-[10px] capitalize`}>{r.acao}</Badge></td>
                  <td className="px-3 py-1.5 break-words">{r.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-gray-400">Registro imutável (ninguém edita/apaga). Inclui login e ações dos usuários no sistema. As ações automáticas dos robôs ficam em Monitoramento.</p>
      </>
      )}
    </div>
  );
}
