import type { AppState } from './types';

const hoje = new Date();
const addDias = (d: number) => {
  const dt = new Date(hoje);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().split('T')[0];
};

export const FERIADOS_NACIONAIS: string[] = [
  // 2024
  '2024-01-01','2024-04-21','2024-05-01','2024-09-07','2024-10-12','2024-11-02','2024-11-15','2024-12-25',
  '2024-03-29','2024-05-30',
  // 2025
  '2025-01-01','2025-04-21','2025-05-01','2025-09-07','2025-10-12','2025-11-02','2025-11-15','2025-12-25',
  '2025-04-18','2025-06-19',
  // 2026
  '2026-01-01','2026-04-03','2026-04-21','2026-05-01','2026-06-04','2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-12-25',
];

export function contarDiasUteis(dataInicio: string, dataFim: string, feriadosMunicipais: string[] = []): number {
  const feriados = new Set([...FERIADOS_NACIONAIS, ...feriadosMunicipais]);
  let count = 0;
  const d = new Date(dataInicio + 'T12:00:00');
  const fim = new Date(dataFim + 'T12:00:00');
  while (d <= fim) {
    const dow = d.getDay();
    const ds = d.toISOString().split('T')[0];
    if (dow !== 0 && dow !== 6 && !feriados.has(ds)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function diasRestantes(dataHora: string): number {
  const hoje2 = new Date();
  hoje2.setHours(0, 0, 0, 0);
  const alvo = new Date(dataHora);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje2.getTime()) / (1000 * 60 * 60 * 24));
}

export const INITIAL_STATE: AppState = {
  escritorio: {
    nome: 'Escritório Jurídico',
    oab: 'OAB/SP 123.456',
    endereco: 'Rua das Flores, 100 - São Paulo/SP',
    telefone: '(11) 3333-4444',
    email: 'contato@escritorio.adv.br',
  },
  advogados: [
    { id: 'adv1', nome: 'Dr. Carlos Mendes', oab: 'OAB/SP 111.222', email: 'carlos@escritorio.adv.br' },
    { id: 'adv2', nome: 'Dra. Ana Paula Lima', oab: 'OAB/SP 333.444', email: 'ana@escritorio.adv.br' },
  ],
  feriadosMunicipais: [],
  credenciais: [],
  clientes: [
    {
      id: 'cli1', nome: 'João Silva Santos', tipo: 'PF', cpfCnpj: '123.456.789-00', rg: '12.345.678-9',
      email: 'joao.silva@email.com', celular: '(11) 99999-1111', telefone: '(11) 3333-1111',
      cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista',
      cidade: 'São Paulo', uf: 'SP', observacoes: 'Cliente desde 2022. Área trabalhista.', criadoEm: '2022-03-15',
    },
    {
      id: 'cli2', nome: 'Empresa ABC Ltda', tipo: 'PJ', cpfCnpj: '12.345.678/0001-99',
      email: 'juridico@empresaabc.com.br', celular: '(21) 99888-2222', telefone: '(21) 3333-2222',
      cep: '20040-020', logradouro: 'Av. Rio Branco', numero: '200', bairro: 'Centro',
      cidade: 'Rio de Janeiro', uf: 'RJ', observacoes: 'Empresa de médio porte. Direito empresarial e cível.', criadoEm: '2023-01-10',
    },
    {
      id: 'cli3', nome: 'Maria Oliveira', tipo: 'PF', cpfCnpj: '987.654.321-00', rg: '98.765.432-1',
      email: 'maria.oliveira@email.com', celular: '(31) 97777-3333',
      cep: '30112-000', logradouro: 'Rua da Bahia', numero: '500', bairro: 'Centro',
      cidade: 'Belo Horizonte', uf: 'MG', observacoes: 'Processo de divórcio litigioso.', criadoEm: '2023-06-20',
    },
  ],
  processos: [
    {
      id: 'proc1', numero: '0001234-56.2024.8.26.0001', clienteId: 'cli1',
      vara: '5ª Vara do Trabalho', tribunal: 'TJSP', comarca: 'São Paulo',
      area: 'trabalhista', fase: 'conhecimento', parteContraria: 'Empresa XYZ Comércio Ltda',
      advogadoResponsavel: 'Dr. Carlos Mendes', valorCausa: 85000, dataDistribuicao: '2024-02-10',
      status: 'ativo', observacoes: 'Reclamação trabalhista por horas extras e FGTS.',
      movimentacoes: [
        { id: 'm1', data: '2024-02-10', tipo: 'Distribuição', descricao: 'Processo distribuído para a 5ª VT.' },
        { id: 'm2', data: '2024-03-15', tipo: 'Despacho', descricao: 'Citação da ré determinada.' },
        { id: 'm3', data: '2024-04-20', tipo: 'Audiência', descricao: 'Audiência de conciliação realizada. Sem acordo.' },
      ],
      criadoEm: '2024-02-10',
    },
    {
      id: 'proc2', numero: '0009876-54.2024.8.19.0001', clienteId: 'cli2',
      vara: '3ª Vara Cível', tribunal: 'TJRJ', comarca: 'Rio de Janeiro',
      area: 'cível', fase: 'conhecimento', parteContraria: 'Fornecedor Nacional S.A.',
      advogadoResponsavel: 'Dra. Ana Paula Lima', valorCausa: 320000, dataDistribuicao: '2024-01-22',
      status: 'ativo', observacoes: 'Ação de cobrança por inadimplemento contratual.',
      movimentacoes: [
        { id: 'm4', data: '2024-01-22', tipo: 'Distribuição', descricao: 'Processo distribuído.' },
        { id: 'm5', data: '2024-03-01', tipo: 'Contestação', descricao: 'Contestação apresentada pelo réu.' },
      ],
      criadoEm: '2024-01-22',
    },
    {
      id: 'proc3', numero: '0005555-11.2023.8.13.0024', clienteId: 'cli3',
      vara: '2ª Vara de Família', tribunal: 'TJMG', comarca: 'Belo Horizonte',
      area: 'família', fase: 'recursal', parteContraria: 'Roberto Oliveira',
      advogadoResponsavel: 'Dr. Carlos Mendes', valorCausa: 150000, dataDistribuicao: '2023-07-05',
      status: 'ativo', observacoes: 'Divórcio litigioso com discussão de guarda e partilha.',
      movimentacoes: [
        { id: 'm6', data: '2023-07-05', tipo: 'Distribuição', descricao: 'Ação de divórcio distribuída.' },
        { id: 'm7', data: '2023-10-12', tipo: 'Sentença', descricao: 'Sentença de procedência parcial.' },
        { id: 'm8', data: '2024-01-15', tipo: 'Recurso', descricao: 'Apelação interposta pela parte contrária.' },
      ],
      criadoEm: '2023-07-05',
    },
    {
      id: 'proc4', numero: '0003333-22.2024.5.15.0001', clienteId: 'cli1',
      vara: '1ª Vara do Trabalho de Campinas', tribunal: 'TRT15', comarca: 'Campinas',
      area: 'trabalhista', fase: 'conhecimento', parteContraria: 'Transportadora Veloz Ltda',
      advogadoResponsavel: 'Dra. Ana Paula Lima', valorCausa: 42000, dataDistribuicao: '2024-03-18',
      status: 'ativo', observacoes: 'Verbas rescisórias não pagas.',
      movimentacoes: [
        { id: 'm9', data: '2024-03-18', tipo: 'Distribuição', descricao: 'Processo distribuído.' },
      ],
      criadoEm: '2024-03-18',
    },
    {
      id: 'proc5', numero: '0007777-88.2022.8.26.0100', clienteId: 'cli2',
      vara: '12ª Vara Cível', tribunal: 'TJSP', comarca: 'São Paulo',
      area: 'empresarial', fase: 'execução', parteContraria: 'Devedor Silva ME',
      advogadoResponsavel: 'Dr. Carlos Mendes', valorCausa: 95000, dataDistribuicao: '2022-08-30',
      status: 'ativo', observacoes: 'Execução de título extrajudicial.',
      movimentacoes: [
        { id: 'm10', data: '2022-08-30', tipo: 'Distribuição', descricao: 'Execução distribuída.' },
        { id: 'm11', data: '2023-04-10', tipo: 'Penhora', descricao: 'Penhora de veículo realizada.' },
        { id: 'm12', data: '2023-11-20', tipo: 'Leilão', descricao: 'Primeiro leilão negativo.' },
      ],
      criadoEm: '2022-08-30',
    },
  ],
  prazos: [
    { id: 'pr1', processoId: 'proc1', tipo: 'prazo_fatal', descricao: 'Contrarrazões de Recurso', dataHora: addDias(2) + 'T18:00', diasUteis: true, responsavel: 'Dr. Carlos Mendes', status: 'pendente', alertaDias: 3, criadoEm: hoje.toISOString() },
    { id: 'pr2', processoId: 'proc2', tipo: 'audiência', descricao: 'Audiência de Instrução e Julgamento', dataHora: addDias(5) + 'T14:30', diasUteis: false, responsavel: 'Dra. Ana Paula Lima', status: 'pendente', alertaDias: 3, criadoEm: hoje.toISOString() },
    { id: 'pr3', processoId: 'proc3', tipo: 'prazo_dilatório', descricao: 'Manifestação sobre laudo pericial', dataHora: addDias(10) + 'T23:59', diasUteis: true, responsavel: 'Dr. Carlos Mendes', status: 'pendente', alertaDias: 5, criadoEm: hoje.toISOString() },
    { id: 'pr4', processoId: 'proc4', tipo: 'diligência', descricao: 'Retirar documentos na empresa', dataHora: addDias(3) + 'T10:00', diasUteis: false, responsavel: 'Dra. Ana Paula Lima', status: 'pendente', alertaDias: 1, criadoEm: hoje.toISOString() },
    { id: 'pr5', processoId: 'proc5', tipo: 'prazo_fatal', descricao: 'Impugnação ao cumprimento de sentença', dataHora: addDias(15) + 'T23:59', diasUteis: true, responsavel: 'Dr. Carlos Mendes', status: 'pendente', alertaDias: 5, criadoEm: hoje.toISOString() },
    { id: 'pr6', processoId: 'proc1', tipo: 'reunião', descricao: 'Reunião com cliente para atualização', dataHora: addDias(7) + 'T15:00', diasUteis: false, responsavel: 'Dr. Carlos Mendes', status: 'pendente', alertaDias: 1, criadoEm: hoje.toISOString() },
    { id: 'pr7', processoId: 'proc2', tipo: 'prazo_fatal', descricao: 'Réplica à contestação', dataHora: addDias(30) + 'T23:59', diasUteis: true, responsavel: 'Dra. Ana Paula Lima', status: 'pendente', alertaDias: 7, criadoEm: hoje.toISOString() },
    { id: 'pr8', processoId: 'proc3', tipo: 'audiência', descricao: 'Sessão de julgamento do recurso', dataHora: addDias(-5) + 'T09:00', diasUteis: false, responsavel: 'Dr. Carlos Mendes', status: 'cumprido', alertaDias: 3, criadoEm: hoje.toISOString() },
  ],
  publicacoes: [
    {
      id: 'pub1', data: addDias(-1), tribunal: 'TJSP', numeroProcesso: '0001234-56.2024.8.26.0001',
      processoId: 'proc1', status: 'não_lida',
      conteudo: 'Intimação: Fica intimado o advogado Dr. Carlos Mendes para apresentar contrarrazões ao recurso ordinário interposto, no prazo de 8 (oito) dias úteis, nos termos do art. 1.010 do CPC.',
      criadoEm: hoje.toISOString(),
    },
    {
      id: 'pub2', data: addDias(-2), tribunal: 'TJRJ', numeroProcesso: '0009876-54.2024.8.19.0001',
      processoId: 'proc2', status: 'não_lida',
      conteudo: 'Designada audiência de instrução e julgamento para o dia ' + addDias(5) + ' às 14h30, na 3ª Vara Cível desta Comarca.',
      criadoEm: hoje.toISOString(),
    },
    {
      id: 'pub3', data: addDias(-3), tribunal: 'TJMG', numeroProcesso: '0005555-11.2023.8.13.0024',
      processoId: 'proc3', status: 'lida',
      conteudo: 'Conclusos os autos ao relator para julgamento do recurso de apelação. Prazo regimental para inclusão em pauta.',
      criadoEm: hoje.toISOString(),
    },
  ],
  peticoes: [
    { id: 'pet1', nome: 'Petição Inicial Trabalhista', processoId: 'proc1', tipo: 'inicial', dataProtocolo: '2024-02-10', numeroProtocolo: 'PROT-2024-0234', status: 'juntado', observacoes: '', criadoEm: '2024-02-10' },
    { id: 'pet2', nome: 'Recurso Ordinário', processoId: 'proc3', tipo: 'recurso', dataProtocolo: '2024-01-15', numeroProtocolo: 'PROT-2024-0089', status: 'juntado', observacoes: 'Recurso contra sentença de procedência parcial.', criadoEm: '2024-01-15' },
    { id: 'pet3', nome: 'Inicial - Ação de Cobrança', processoId: 'proc2', tipo: 'inicial', dataProtocolo: '2024-01-22', numeroProtocolo: 'PROT-2024-0112', status: 'juntado', observacoes: '', criadoEm: '2024-01-22' },
  ],
};
