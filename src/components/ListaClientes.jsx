import { useState } from "react";
import {
  Search,
  ChevronRight,
  Archive,
  RotateCcw,
  Building2,
  Clock3,
  X,
  Plus,
  CalendarClock,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import {
  diasSemInteracao,
  diasEntre,
  formatarDataHora,
  ordenarAtencao,
} from "../lib/helpers";
import { PRIORIDADES } from "../lib/fases";
import BotoesContato from "./BotoesContato";
import DiarioCliente from "./DiarioCliente";
import ExportarButton from "./ExportarButton";

function CartaoCliente({ cliente: c, onSelecionarCliente, onAtualizar }) {
  const [busy, setBusy] = useState(false),
    [erro, setErro] = useState(""),
    [expandido, setExpandido] = useState(false);
  const encerrado = c.acompanhamento?.encerrado,
    dias = diasSemInteracao(c.acompanhamento?.ultima_interacao),
    contrato = diasEntre(c.contrato?.data_termino);
  async function atualizar(campos) {
    setBusy(true);
    setErro("");
    try {
      const { error } = await supabase
        .from("acompanhamento")
        .upsert(
          { cliente_id: c.id, ...campos, updated_at: new Date().toISOString() },
          { onConflict: "cliente_id" },
        );
      if (error) throw error;
      await onAtualizar();
    } catch {
      setErro("Não foi possível salvar a alteração. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const encerrar = () => {
    if (
      encerrado ||
      window.confirm(
        `Encerrar o atendimento de ${c.razao_social}? Você poderá reabri-lo em Concluídos.`,
      )
    )
      atualizar({
        encerrado: !encerrado,
        encerrado_em: encerrado ? null : new Date().toISOString(),
      });
  };
  return (
    <article className="client-card">
      <div className="client-card-head">
        <span className="client-symbol">
          <Building2 size={24} />
        </span>
        <div className="client-name">
          <button onClick={() => onSelecionarCliente(c)}>
            <h2>{c.razao_social}</h2>
          </button>
          <p>
            {c.codigo_cliente}
            {c.nome_fantasia && c.nome_fantasia !== c.razao_social
              ? ` · ${c.nome_fantasia}`
              : ""}
            {c.nome_contato ? ` · ${c.nome_contato}` : ""}
          </p>
        </div>
        <select
          aria-label={`Prioridade de ${c.razao_social}`}
          className={`priority-select ${c.acompanhamento?.prioridade || "normal"}`}
          value={c.acompanhamento?.prioridade || "normal"}
          onChange={(e) => atualizar({ prioridade: e.target.value })}
          disabled={busy}
        >
          {PRIORIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="client-signals">
        {encerrado ? (
          <span>
            <CheckIcon />
            Encerrado em {formatarDataHora(c.acompanhamento?.encerrado_em)}
          </span>
        ) : (
          <span className={dias >= 5 ? "signal-alert" : ""}>
            <Clock3 size={14} />
            {dias === null
              ? "Sem histórico de contato"
              : dias === 0
                ? "Contato registrado hoje"
                : `${dias} dias sem contato`}
          </span>
        )}
        {contrato !== null && (
          <span className={contrato <= 90 ? "signal-alert" : ""}>
            <CalendarClock size={14} />
            {contrato < 0
              ? `Contrato venceu há ${Math.abs(contrato)} dias`
              : contrato === 0
                ? "Contrato vence hoje"
                : `Contrato vence em ${contrato} dias`}
          </span>
        )}
      </div>
      {erro && (
        <div role="alert" className="notice error">
          {erro}
        </div>
      )}
      <button
        className="diary-toggle"
        onClick={() => setExpandido(!expandido)}
        aria-expanded={expandido}
      >
        <span>
          {(c.historico || []).filter((h) => !h.resolvido).length} assunto(s) em
          aberto{" "}
          <small>· {expandido ? "Recolher diário" : "Abrir diário"}</small>
        </span>
        <ChevronRight className={expandido ? "rotated" : ""} size={17} />
      </button>
      {expandido && (
        <DiarioCliente cliente={c} onAtualizar={onAtualizar} compact />
      )}
      <div className="client-card-foot">
        <BotoesContato
          telefone={c.telefone}
          endereco={c.contrato?.endereco_entrega || c.endereco}
        />
        <div className="client-card-actions">
          <ExportarButton cliente={c} compact />
          <button
            className="icon-button"
            onClick={encerrar}
            disabled={busy}
            title={encerrado ? "Reabrir atendimento" : "Encerrar atendimento"}
            aria-label={
              encerrado ? "Reabrir atendimento" : "Encerrar atendimento"
            }
          >
            {encerrado ? <RotateCcw size={17} /> : <Archive size={17} />}
          </button>
          <button
            className="button secondary"
            onClick={() => onSelecionarCliente(c)}
          >
            Abrir ficha <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
function CheckIcon() {
  return <Archive size={14} />;
}

export default function ListaClientes({
  clientes,
  onSelecionarCliente,
  onNovoCliente,
  onAtualizar,
  filtro,
  onMudarFiltro,
  aba,
  onMudarAba,
  consultor,
}) {
  const [busca, setBusca] = useState("");
  const carteira = clientes.filter(
    (c) =>
      !consultor ||
      (consultor === "__sem_consultor__"
        ? !c.consultor
        : c.consultor === consultor),
  );
  const ativos = carteira.filter((c) => !c.acompanhamento?.encerrado),
    concluidos = carteira.filter((c) => c.acompanhamento?.encerrado);
  const normalizar = (v) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const termo = normalizar(busca);
  const lista = (aba === "ativos" ? ativos : concluidos)
    .filter((c) =>
      [
        c.razao_social,
        c.codigo_cliente,
        c.nome_fantasia,
        c.telefone,
        c.nome_contato,
        c.cnpj,
      ].some((v) => normalizar(v).includes(termo)),
    )
    .filter((c) => {
      if (aba === "concluidos") return true;
      if (filtro === "parados")
        return (
          (diasSemInteracao(c.acompanhamento?.ultima_interacao) ?? -1) >= 5
        );
      if (filtro === "vencimento") {
        const d = diasEntre(c.contrato?.data_termino);
        return d !== null && d <= 90;
      }
      return true;
    })
    .sort(ordenarAtencao);
  return (
    <div className="client-list-page">
      <div className="list-toolbar">
        <div className="segmented">
          <button
            className={aba === "ativos" ? "selected" : ""}
            onClick={() => onMudarAba("ativos")}
          >
            Em andamento <span>{ativos.length}</span>
          </button>
          <button
            className={aba === "concluidos" ? "selected" : ""}
            onClick={() => onMudarAba("concluidos")}
          >
            Concluídos <span>{concluidos.length}</span>
          </button>
        </div>
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Buscar atendimentos"
            placeholder="Buscar cliente, código, contato…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
      </div>
      {filtro && aba === "ativos" && (
        <button className="filter-chip" onClick={() => onMudarFiltro(null)}>
          {filtro === "parados"
            ? "Sem contato há 5 dias ou mais"
            : "Contratos vencidos ou em até 90 dias"}
          <X size={14} />
        </button>
      )}
      <div className="list-count">
        {lista.length} atendimento{lista.length !== 1 ? "s" : ""}{" "}
        {consultor &&
          `· ${consultor === "__sem_consultor__" ? "Sem consultor" : consultor}`}
      </div>
      <div className="client-card-grid">
        {lista.map((c) => (
          <CartaoCliente
            key={c.id}
            cliente={c}
            onSelecionarCliente={onSelecionarCliente}
            onAtualizar={onAtualizar}
          />
        ))}
      </div>
      {!lista.length && (
        <div className="panel empty-state">
          <Search size={30} />
          <h2>Nenhum atendimento por aqui</h2>
          <p>
            {busca || filtro
              ? "Tente outra busca ou remova o filtro."
              : "Cadastre um cliente para começar o acompanhamento."}
          </p>
          {!busca && !filtro && aba === "ativos" && (
            <button className="button primary" onClick={onNovoCliente}>
              <Plus size={17} />
              Novo cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
