const MS_DIA = 1000 * 60 * 60 * 24;

export function diasEntre(dataA, dataB = new Date()) {
  if (!dataA) return null;
  return Math.ceil((new Date(dataA) - new Date(dataB)) / MS_DIA);
}

// dias sem interação (positivo = dias desde a última interação)
export function diasSemInteracao(ultimaInteracao) {
  if (!ultimaInteracao) return null;
  return Math.floor((new Date() - new Date(ultimaInteracao)) / MS_DIA);
}

// 'critico' (>=10 dias) | 'atencao' (7-9 dias) | 'ok' (<7 dias)
export function statusInteracao(ultimaInteracao) {
  const dias = diasSemInteracao(ultimaInteracao);
  if (dias === null) return 'ok';
  if (dias >= 10) return 'critico';
  if (dias >= 7) return 'atencao';
  return 'ok';
}

export function formatarData(data) {
  if (!data) return '—';
  return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatarDataHora(data) {
  if (!data) return '—';
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
