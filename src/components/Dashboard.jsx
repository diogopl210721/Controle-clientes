import {
  Activity,
  Clock3,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  Users,
  ArrowUpRight,
  Workflow,
  CircleCheck,
  Sparkles,
  Plus,
} from "lucide-react";
import {
  diasSemInteracao,
  diasEntre,
  motivoAtencao,
  ordenarAtencao,
} from "../lib/helpers";

export default function Dashboard({
  clientes,
  onAbrirFiltro,
  onAbrirDocumentos,
  onSelecionarCliente,
  onNovoCliente,
}) {
  const ativos = clientes.filter((c) => !c.acompanhamento?.encerrado);
  const concluidos = clientes.filter((c) => c.acompanhamento?.encerrado);
  const parados = ativos.filter(
    (c) => (diasSemInteracao(c.acompanhamento?.ultima_interacao) ?? -1) >= 5,
  );
  const vencendo = ativos.filter((c) => {
    const d = diasEntre(c.contrato?.data_termino);
    return d !== null && d <= 90;
  });
  const atencao = [...ativos]
    .filter((c) => motivoAtencao(c))
    .sort(ordenarAtencao);
  const consultores = Object.entries(
    ativos.reduce((acc, c) => {
      const nome = c.consultor || "__sem_consultor__";
      acc[nome] = (acc[nome] || 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const cards = [
    {
      label: "Em andamento",
      value: ativos.length,
      detail: "atendimentos ativos",
      icon: Activity,
      color: "blue",
    },
    {
      label: "Sem contato há 5+ dias",
      value: parados.length,
      detail: "hora de retomar a conversa",
      icon: Clock3,
      color: "rose",
      action: () => onAbrirFiltro("parados", "ativos"),
    },
    {
      label: "Contratos em atenção",
      value: vencendo.length,
      detail: "vencidos ou em até 90 dias",
      icon: CalendarClock,
      color: "amber",
      action: () => onAbrirFiltro("vencimento", "ativos"),
    },
    {
      label: "Concluídos",
      value: concluidos.length,
      detail: "histórias que avançaram",
      icon: CheckCheck,
      color: "green",
      action: () => onAbrirFiltro(null, "concluidos"),
    },
  ];
  return (
    <div className="dashboard">
      <div className="dashboard-date">
        <span className="status-dot" /> Visão do dia <span>·</span>{" "}
        {new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </div>
      <section className="metric-grid" aria-label="Indicadores de atendimento">
        {cards.map(({ label, value, detail, icon: Icon, color, action }) => {
          const Tag = action ? "button" : "div";
          return (
            <Tag key={label} className={`metric ${color}`} onClick={action}>
              <div className="metric-top">
                <span className="metric-icon">
                  <Icon size={21} />
                </span>
                {action && <ArrowUpRight size={16} />}
              </div>
              <div className="metric-label">{label}</div>
              <strong>{value}</strong>
              <small>{detail}</small>
            </Tag>
          );
        })}
      </section>
      <div className="dashboard-grid">
        <section className="panel attention-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">COMECE POR AQUI</span>
              <h2>O que merece atenção</h2>
            </div>
            <span className="count-pill">{atencao.length}</span>
          </div>
          <p className="section-description">
            Prioridades sinalizadas pelos seus registros e prazos.
          </p>
          {atencao.length ? (
            <div className="attention-list">
              {atencao.slice(0, 6).map((c) => (
                <button
                  className="attention-item"
                  key={c.id}
                  onClick={() => onSelecionarCliente(c)}
                >
                  <span
                    className={`initial-avatar ${c.acompanhamento?.prioridade === "urgente" ? "rose" : "blue"}`}
                  >
                    {c.razao_social?.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="attention-copy">
                    <strong>{c.razao_social}</strong>
                    <small>{motivoAtencao(c)}</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <CircleCheck size={32} />
              <h3>
                {ativos.length
                  ? "Tudo em dia por aqui"
                  : "Seu diário começa aqui"}
              </h3>
              <p>
                {ativos.length
                  ? "Os próximos alertas aparecerão neste espaço."
                  : "Cadastre um cliente ou importe a ficha em PDF."}
              </p>
              {!ativos.length && (
                <button className="button primary" onClick={onNovoCliente}>
                  <Plus size={16} />
                  Novo cliente
                </button>
              )}
            </div>
          )}
          <div className="panel-foot">
            <CircleCheck size={15} />
            {ativos.length - parados.length} atendimento(s) sem alerta de 5 dias
            sem contato
          </div>
        </section>
        <section className="panel consultants-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">SUA CARTEIRA</span>
              <h2>Atendimentos por consultor</h2>
            </div>
            <Users size={20} />
          </div>
          <p className="section-description">
            Escolha um consultor para abrir seu diário.
          </p>
          <div className="consultant-list">
            {consultores.map(([nome, total], i) => (
              <button
                key={nome}
                className="consultant-item"
                onClick={() => onAbrirFiltro(null, "ativos", nome)}
              >
                <span className={`initial-avatar ${i % 2 ? "violet" : "blue"}`}>
                  {nome === "__sem_consultor__"
                    ? "SC"
                    : nome.slice(0, 2).toUpperCase()}
                </span>
                <span>
                  <strong>
                    {nome === "__sem_consultor__" ? "Sem consultor" : nome}
                  </strong>
                  <small>
                    {total} atendimento{total !== 1 ? "s" : ""} em andamento
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
          {!consultores.length && (
            <p className="section-description">
              Seus consultores aparecerão após o primeiro cadastro.
            </p>
          )}
          <div className="tip-box">
            <Sparkles size={18} />
            <p>
              <strong>Um registro, mais clareza.</strong>
              <br />
              Continue um assunto aberto para manter cada conversa no mesmo
              lugar.
            </p>
          </div>
        </section>
      </div>
      <button className="process-banner" onClick={onAbrirDocumentos}>
        <span className="banner-icon">
          <Workflow size={26} />
        </span>
        <span>
          <strong>Processos e documentos</strong>
          <small>
            Consulte os requisitos e organize o passo a passo de cada processo.
          </small>
        </span>
        <span className="banner-action">
          Abrir central <ArrowUpRight size={18} />
        </span>
      </button>
    </div>
  );
}
