// Fases fechadas do processo de acompanhamento (definidas junto com o Diogo)
export const FASES = [
  { valor: 'abertura_cip', label: 'Abertura de CIP', cor: 'bg-sky-100 text-sky-700 border-sky-200' },
  { valor: 'aguardando_documentacao', label: 'Aguardando documentação', cor: 'bg-amber-100 text-amber-700 border-amber-200' },
  { valor: 'aguardando_aprovacao', label: 'Aguardando aprovação', cor: 'bg-violet-100 text-violet-700 border-violet-200' },
  { valor: 'aguardando_instalacao', label: 'Aguardando instalação/troca', cor: 'bg-orange-100 text-orange-700 border-orange-200' },
  { valor: 'renegociacao', label: 'Renegociação de preço/contrato', cor: 'bg-rose-100 text-rose-700 border-rose-200' },
  { valor: 'concluido', label: 'Concluído / Ativo normal', cor: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

export function labelFase(valor) {
  return FASES.find((f) => f.valor === valor)?.label ?? valor ?? '—';
}

export function corFase(valor) {
  return FASES.find((f) => f.valor === valor)?.cor ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

export const PRIORIDADES = [
  { valor: 'normal', label: 'Normal' },
  { valor: 'alta', label: 'Alta' },
  { valor: 'urgente', label: 'Urgente' },
];
