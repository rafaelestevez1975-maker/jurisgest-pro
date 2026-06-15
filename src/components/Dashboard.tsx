import { useApp } from '../context';
import { diasRestantes } from '../data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, Clock, Bell, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

function urgencyColor(dias: number) {
  if (dias < 0) return 'bg-gray-100 text-gray-600';
  if (dias <= 3) return 'bg-red-100 text-red-700 border-red-200';
  if (dias <= 7) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

function urgencyBadge(dias: number) {
  if (dias < 0) return <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">Vencido</Badge>;
  if (dias <= 3) return <Badge className="bg-red-500 text-white text-xs">{dias}d</Badge>;
  if (dias <= 7) return <Badge className="bg-yellow-500 text-white text-xs">{dias}d</Badge>;
  return <Badge className="bg-green-600 text-white text-xs">{dias}d</Badge>;
}

export default function Dashboard() {
  const { state } = useApp();
  const { clientes, processos, prazos, publicacoes } = state;

  const processosAtivos = processos.filter(p => p.status === 'ativo').length;
  const prazosVencendo7 = prazos.filter(p => p.status === 'pendente' && diasRestantes(p.dataHora) <= 7 && diasRestantes(p.dataHora) >= 0).length;
  const intimacoesPendentes = publicacoes.filter(p => p.status === 'não_lida').length;

  const proximosPrazos = [...prazos]
    .filter(p => p.status === 'pendente')
    .sort((a, b) => diasRestantes(a.dataHora) - diasRestantes(b.dataHora))
    .slice(0, 5);

  const processosPorStatus = {
    ativo: processos.filter(p => p.status === 'ativo').length,
    arquivado: processos.filter(p => p.status === 'arquivado').length,
    ganho: processos.filter(p => p.status === 'ganho').length,
    perdido: processos.filter(p => p.status === 'perdido').length,
    acordo: processos.filter(p => p.status === 'acordo').length,
  };

  const processosPorArea: Record<string, number> = {};
  processos.forEach(p => { processosPorArea[p.area] = (processosPorArea[p.area] || 0) + 1; });

  const pubsRecentes = [...publicacoes].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral do escritório</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#2563eb]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Clientes</p>
                <p className="text-3xl font-bold text-[#1e3a5f]">{clientes.length}</p>
              </div>
              <Users className="text-[#2563eb] opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Processos Ativos</p>
                <p className="text-3xl font-bold text-[#1e3a5f]">{processosAtivos}</p>
              </div>
              <Briefcase className="text-indigo-500 opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Prazos em 7 dias</p>
                <p className="text-3xl font-bold text-[#1e3a5f]">{prazosVencendo7}</p>
              </div>
              <Clock className="text-yellow-500 opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Publicações não lidas</p>
                <p className="text-3xl font-bold text-[#1e3a5f]">{intimacoesPendentes}</p>
              </div>
              <Bell className="text-red-500 opacity-80" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Prazos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1e3a5f] flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-500" /> Próximos Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {proximosPrazos.length === 0 ? (
              <p className="text-sm text-gray-500 px-4 pb-4">Nenhum prazo pendente.</p>
            ) : (
              <div className="divide-y">
                {proximosPrazos.map(prazo => {
                  const dias = diasRestantes(prazo.dataHora);
                  const proc = state.processos.find(p => p.id === prazo.processoId);
                  return (
                    <div key={prazo.id} className={`flex items-center justify-between px-4 py-3 ${urgencyColor(dias)}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{prazo.descricao}</p>
                        <p className="text-xs opacity-70">{proc?.numero?.slice(0, 20)}... · {prazo.responsavel.split(' ')[1] || prazo.responsavel}</p>
                      </div>
                      <div className="ml-3 flex-shrink-0">{urgencyBadge(dias)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processos por Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1e3a5f] flex items-center gap-2">
              <TrendingUp size={16} className="text-[#2563eb]" /> Processos por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Ativo', value: processosPorStatus.ativo, color: 'bg-blue-500' },
              { label: 'Acordo', value: processosPorStatus.acordo, color: 'bg-purple-500' },
              { label: 'Ganho', value: processosPorStatus.ganho, color: 'bg-green-500' },
              { label: 'Perdido', value: processosPorStatus.perdido, color: 'bg-red-500' },
              { label: 'Arquivado', value: processosPorStatus.arquivado, color: 'bg-gray-400' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs w-16 text-gray-600">{item.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: processos.length ? `${(item.value / processos.length) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-4 text-right">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Publicações Recentes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1e3a5f] flex items-center gap-2">
              <Bell size={16} className="text-red-500" /> Publicações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pubsRecentes.length === 0 ? (
              <p className="text-sm text-gray-500 px-4 pb-4">Nenhuma publicação.</p>
            ) : (
              <div className="divide-y">
                {pubsRecentes.map(pub => (
                  <div key={pub.id} className="px-4 py-3 flex items-start gap-3">
                    {pub.status === 'não_lida'
                      ? <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      : <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-[#2563eb]">{pub.tribunal}</span>
                        <span className="text-xs text-gray-500">{pub.numeroProcesso}</span>
                        <span className="text-xs text-gray-400">{pub.data}</span>
                        {pub.status === 'não_lida' && <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">Não lida</Badge>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{pub.conteudo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
