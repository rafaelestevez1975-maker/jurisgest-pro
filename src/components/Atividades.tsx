import { useEffect, useState, useMemo } from 'react';
import { useApp } from '../context';
import { db } from '../lib/db';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search } from 'lucide-react';

interface Atividade {
  id: string; usuario_email: string | null; usuario_nome: string | null;
  acao: string; entidade: string | null; entidade_id: string | null;
  descricao: string; criado_em: string;
}

const ACAO_COR: Record<string, string> = {
  login: 'bg-slate-100 text-slate-600', criar: 'bg-green-100 text-green-700',
  editar: 'bg-blue-100 text-blue-700', excluir: 'bg-red-100 text-red-700',
  arquivar: 'bg-amber-100 text-amber-700', agendar: 'bg-indigo-100 text-indigo-700',
  importar: 'bg-purple-100 text-purple-700',
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

  const carregar = () => {
    setCarregando(true);
    db.listarAtividades(1500).then(({ data }) => setRows((data as Atividade[]) || [])).finally(() => setCarregando(false));
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

  if (!usuario.isAdmin) return <p className="text-sm text-gray-500">Apenas o administrador pode ver o relatório de atividades.</p>;

  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString('pt-BR'); } catch { return iso; } };

  const exportarCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [['data_hora', 'usuario', 'email', 'acao', 'entidade', 'descricao'].join(';')];
    filtradas.forEach(r => linhas.push([fmt(r.criado_em), r.usuario_nome || '', r.usuario_email || '', r.acao, r.entidade || '', r.descricao].map(esc).join(';')));
    const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'atividades.csv'; a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-600">{filtradas.length} atividade(s){rows.length && filtradas.length !== rows.length ? ` de ${rows.length}` : ''}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={exportarCsv} disabled={!filtradas.length}>Exportar CSV</Button>
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={carregar} disabled={carregando}><RefreshCw size={13} className={`mr-1 ${carregando ? 'animate-spin' : ''}`} />Atualizar</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48"><Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" /><Input className="pl-7 h-9 text-xs" placeholder="Buscar na descrição/usuário…" value={busca} onChange={e => setBusca(e.target.value)} /></div>
        <Select value={fUser} onValueChange={setFUser}><SelectTrigger className="h-9 text-xs w-44"><SelectValue placeholder="Usuário" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os usuários</SelectItem>{usuarios.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
        <Select value={fAcao} onValueChange={setFAcao}><SelectTrigger className="h-9 text-xs w-36"><SelectValue placeholder="Ação" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as ações</SelectItem>{acoes.map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}</SelectContent></Select>
        <Input type="date" className="h-9 text-xs w-36" value={de} onChange={e => setDe(e.target.value)} title="De" />
        <Input type="date" className="h-9 text-xs w-36" value={ate} onChange={e => setAte(e.target.value)} title="Até" />
      </div>
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
    </div>
  );
}
