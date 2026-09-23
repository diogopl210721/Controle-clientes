const MS_DIA = 1000 * 60 * 60 * 24;

export function diasEntre(dataA, dataB = new Date()) {
  if (!dataA) return null;
  const partes = String(dataA).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const alvo = partes
    ? new Date(+partes[1], +partes[2] - 1, +partes[3])
    : new Date(dataA);
  const hoje = new Date(dataB);
  if (Number.isNaN(alvo.getTime()) || Number.isNaN(hoje.getTime())) return null;
  return Math.round(
    (Date.UTC(alvo.getFullYear(), alvo.getMonth(), alvo.getDate()) -
      Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) /
      MS_DIA,
  );
}

// dias sem interação (positivo = dias desde a última interação)
export function diasSemInteracao(ultimaInteracao) {
  if (!ultimaInteracao) return null;
  return Math.floor((new Date() - new Date(ultimaInteracao)) / MS_DIA);
}

// 'critico' (>=10 dias) | 'atencao' (7-9 dias) | 'ok' (<7 dias)
export function statusInteracao(ultimaInteracao) {
  const dias = diasSemInteracao(ultimaInteracao);
  if (dias === null) return "ok";
  if (dias >= 10) return "critico";
  if (dias >= 5) return "atencao";
  return "ok";
}

export function formatarData(data) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHora(data) {
  if (!data) return "—";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Links rápidos de contato — abrem o app nativo quando disponível
export function linkWhatsapp(telefone) {
  if (!telefone) return null;
  let digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  if (!digitos.startsWith("55")) digitos = `55${digitos}`;
  return `https://wa.me/${digitos}`;
}

export function linkWaze(endereco) {
  if (!endereco) return null;
  return `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`;
}

export function linkMaps(endereco) {
  if (!endereco) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n =
    typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : valor;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function motivoAtencao(c) {
  if (c.acompanhamento?.encerrado) return null;
  if (c.acompanhamento?.prioridade === "urgente")
    return "Prioridade urgente · acompanhe este atendimento";
  const contrato = diasEntre(c.contrato?.data_termino);
  if (contrato !== null && contrato < 0)
    return `Contrato vencido há ${Math.abs(contrato)} dia(s)`;
  if (contrato !== null && contrato <= 90)
    return `Contrato ${contrato === 0 ? "vence hoje" : `vence em ${contrato} dia(s)`}`;
  if (c.acompanhamento?.prioridade === "alta")
    return "Prioridade alta · revise os próximos passos";
  const dias = diasSemInteracao(c.acompanhamento?.ultima_interacao);
  if (dias !== null && dias >= 5)
    return `${dias} dias sem contato · retome a conversa`;
  if (!c.historico?.length)
    return "Sem registros · inicie o diário deste cliente";
  return null;
}

export function ordenarAtencao(a, b) {
  const peso = (c) =>
    (c.acompanhamento?.prioridade === "urgente"
      ? 10000
      : c.acompanhamento?.prioridade === "alta"
        ? 1000
        : 0) +
    (diasEntre(c.contrato?.data_termino) !== null &&
    diasEntre(c.contrato?.data_termino) < 0
      ? 5000
      : 0) +
    (diasSemInteracao(c.acompanhamento?.ultima_interacao) || 0);
  return (
    peso(b) - peso(a) ||
    (a.razao_social || "").localeCompare(b.razao_social || "", "pt-BR")
  );
}
