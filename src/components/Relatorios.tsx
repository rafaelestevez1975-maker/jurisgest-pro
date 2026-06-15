import { useApp } from '../context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { diasRestantes } from '../data';
import { BarChart2, Users, Scale, Clock } from 'lucide-react';

function BarraSimples({ label, valor, max, cor }: { label: string; valor: number; max: number; cor: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 flex-shrink-0 capitalize">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3">
        <div className={`${cor} h-3 rounded-full`} style={{ width: max ? `${(valor / max) * 100}%` : '0%' }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-6 text-right">{valor}</span>
    </div>
  );
}

export default function Relatorios() {
  const { state } = useApp();
  const { processos, clientes, prazos } = state;

  // Por área
  const porArea: Record<string, number> = {};
  processos.forEach(p => { porArea[p.area] = (porArea[p.area] || 0) + 1; });
  const maxArea = Math.max(...Object.values(porArea), 1);

  // Por status
  const porStatus: Record<string, number> = {};
  processos.forEach(p => { porStatus[p.status] = (porStatus[p.status] || 0) + 1; });
  const maxStatus = Math.max(...Object.values(porStatus), 1);

  // Prazos
  const prazosVencidos = prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) < 0).length;
  const prazosHoje = prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) === 0).length;
  const prazos7 = prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) > 0 && diasRestantes(p.dataHora) <= 7).length;
  const prazos30 = prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) > 7 && diasRestantes(p.dataHora) <= 30).length;
  const prazosCumpridos = prazos.filter(p => p.status === 'cumprido').length;

  // Clientes com mais processos
  const procsPorCliente = clientes.map(c => ({
    nome: c.nome, count: processos.filter(p => p.clienteId === c.id).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxCliente = Math.max(...procsPorCliente.map(c => c.count), 1);

  const statusCores: Record<string, string> = {
    ativo: 'bg-blue-500', arquivado: 'bg-gray-400', ganho: 'bg-green-500', perdido: 'bg-red-400', acordo: 'bg-purple-500',
  };
  const areaCores = ['bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-teal-400', 'bg-cyan-400'];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Relatórios</h1>
        <p className="text-sm text-gray-500">Visão analítica do escritório</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de processos', value: processos.length, color: 'border-blue-500' },
          { label: 'Processos ativos', value: processos.filter(p => p.status === 'ativo').length, color: 'border-green-500' },
          { label: 'Processos ganhos', value: processos.filter(p => p.status === 'ganho').length, color: 'border-emerald-500' },
          { label: 'Total de clientes', value: clientes.length, color: 'border-indigo-500' },
        ].map(item => (
          <Card key={item.label} className={`border-l-4 ${item.color}`}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-[#1e3a5f]">{item.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Por área */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
              <Scale size={15} className="text-[#2563eb]" />Processos por Área do Direito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(porArea).length === 0 ? <p className="text-xs text-gray-400">Sem dados.</p> :
              Object.entries(porArea).sort((a, b) => b[1] - a[1]).map(([area, count], i) => (
                <BarraSimples key={area} label={area} valor={count} max={maxArea} cor={areaCores[i % areaCores.length]} />
              ))}
          </CardContent>
        </Card>

        {/* Por status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
              <BarChart2 size={15} className="text-[#2563eb]" />Processos por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(porStatus).length === 0 ? <p className="text-xs text-gray-400">Sem dados.</p> :
              Object.entries(porStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <BarraSimples key={status} label={status} valor={count} max={maxStatus} cor={statusCores[status] || 'bg-gray-400'} />
              ))}
          </CardContent>
        </Card>

        {/* Prazos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
              <Clock size={15} className="text-yellow-500" />Situação dos Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Vencidos', valor: prazosVencidos, cor: 'bg-red-500' },
              { label: 'Vencem hoje', valor: prazosHoje, cor: 'bg-red-400' },
              { label: 'Próximos 7 dias', valor: prazos7, cor: 'bg-yellow-400' },
              { label: 'Próximos 30 dias', valor: prazos30, cor: 'bg-blue-400' },
              { label: 'Cumpridos', valor: prazosCumpridos, cor: 'bg-green-500' },
            ].map(item => (
              <BarraSimples key={item.label} label={item.label} valor={item.valor} max={Math.max(prazos.length, 1)} cor={item.cor} />
            ))}
          </CardContent>
        </Card>

        {/* Clientes com mais processos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1e3a5f] flex items-center gap-2">
              <Users size={15} className="text-[#2563eb]" />Clientes com Mais Processos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {procsPorCliente.length === 0 ? <p className="text-xs text-gray-400">Sem dados.</p> :
              procsPorCliente.map((c, i) => (
                <BarraSimples key={c.nome} label={c.nome.split(' ').slice(0, 2).join(' ')} valor={c.count} max={maxCliente} cor={areaCores[i]} />
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
