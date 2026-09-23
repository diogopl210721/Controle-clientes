import { useState } from "react";
import { Check, Plus, Send, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { formatarDataHora } from "../lib/helpers";
import ExportarButton from "./ExportarButton";

export default function DiarioCliente({
  cliente,
  onAtualizar,
  compact = false,
}) {
  const [nota, setNota] = useState(""),
    [alvo, setAlvo] = useState(""),
    [busy, setBusy] = useState(false),
    [erro, setErro] = useState(""),
    [verConcluidos, setVerConcluidos] = useState(!compact);
  const historico = cliente.historico || [],
    abertos = historico.filter((h) => !h.resolvido),
    concluidos = historico.filter((h) => h.resolvido);
  async function executar(action) {
    setBusy(true);
    setErro("");
    try {
      const { error } = await action();
      if (error) throw error;
      await onAtualizar();
      return true;
    } catch {
      setErro("Não foi possível salvar. Confira a conexão e tente novamente.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function enviar(e) {
    e.preventDefault();
    if (!nota.trim() || busy) return;
    const atual = abertos.find((h) => String(h.id) === alvo);
    if (alvo && !atual) {
      setErro(
        "Este assunto já foi concluído. Selecione outro ou crie um novo.",
      );
      return;
    }
    const ok = await executar(() =>
      atual
        ? supabase
            .from("historico")
            .update({
              descricao: `${atual.descricao}\n${formatarDataHora(new Date())} — ${nota.trim()}`,
            })
            .eq("id", atual.id)
        : supabase
            .from("historico")
            .insert({ cliente_id: cliente.id, descricao: nota.trim() }),
    );
    if (ok) {
      setNota("");
      setAlvo("");
    }
  }
  const marcar = (h) =>
    executar(() =>
      supabase
        .from("historico")
        .update({
          resolvido: !h.resolvido,
          resolvido_em: !h.resolvido ? new Date().toISOString() : null,
        })
        .eq("id", h.id),
    );
  const remover = (h) => {
    if (
      window.confirm(
        "Excluir este assunto e suas atualizações? Esta ação não pode ser desfeita.",
      )
    )
      executar(() => supabase.from("historico").delete().eq("id", h.id));
  };
  const renderItem = (h) => (
    <article
      className={`journal-entry ${h.resolvido ? "resolved" : ""}`}
      key={h.id}
    >
      <button
        className="check-button"
        aria-label={h.resolvido ? "Reabrir assunto" : "Concluir assunto"}
        title={h.resolvido ? "Reabrir assunto" : "Concluir assunto"}
        disabled={busy}
        onClick={() => marcar(h)}
      >
        {h.resolvido ? <Check size={14} /> : <span />}
      </button>
      <div className="journal-body">
        <div className="journal-meta">
          <time>{formatarDataHora(h.created_at)}</time>
          <span className={`badge ${h.resolvido ? "green" : "amber"}`}>
            {h.resolvido ? "Concluído" : "Em aberto"}
          </span>
        </div>
        <p>{h.descricao}</p>
        {h.resolvido && (
          <small>Concluído em {formatarDataHora(h.resolvido_em)}</small>
        )}
        <div className="journal-actions">
          {!h.resolvido && (
            <button
              className="text-button"
              onClick={() => {
                setAlvo(String(h.id));
              }}
            >
              <RotateCcw size={13} /> Continuar assunto
            </button>
          )}
          <ExportarButton cliente={cliente} assunto={h} compact />
          {!compact && (
            <button
              className="icon-button danger"
              aria-label="Excluir assunto"
              onClick={() => remover(h)}
              disabled={busy}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
  return (
    <div className={`journal ${compact ? "compact-journal" : ""}`}>
      <div className="journal-summary">
        <span>
          {abertos.length} assunto{abertos.length !== 1 ? "s" : ""} em aberto
        </span>
        {concluidos.length > 0 && (
          <button
            className="text-button"
            onClick={() => setVerConcluidos(!verConcluidos)}
          >
            {verConcluidos ? "Ocultar" : "Ver"} concluídos ({concluidos.length})
          </button>
        )}
      </div>
      {abertos.map(renderItem)}
      {verConcluidos && concluidos.map(renderItem)}
      {!historico.length && (
        <p className="journal-empty">
          Nenhum assunto registrado. Conte o primeiro passo abaixo.
        </p>
      )}
      {erro && (
        <div className="notice error" role="alert">
          {erro}
        </div>
      )}
      <form className="journal-composer" onSubmit={enviar}>
        <label>
          <span className="composer-label">
            <Plus size={15} />
            Registrar no diário
          </span>
          <select
            aria-label="Novo assunto ou continuar"
            value={alvo}
            onChange={(e) => setAlvo(e.target.value)}
          >
            <option value="">Novo assunto</option>
            {abertos.map((h) => (
              <option key={h.id} value={h.id}>
                Continuar: {h.descricao.slice(0, 70)}
              </option>
            ))}
          </select>
        </label>
        <textarea
          aria-label="Registro do atendimento"
          placeholder={
            alvo
              ? "O que mudou neste assunto?"
              : "O que aconteceu neste atendimento?"
          }
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={compact ? 2 : 3}
          disabled={busy}
        />
        <div className="composer-bottom">
          <small>
            {alvo
              ? "A atualização será acrescentada ao assunto selecionado."
              : "Cada assunto pode ser acompanhado até a conclusão."}
          </small>
          <button className="button primary" disabled={busy || !nota.trim()}>
            {busy ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
            Registrar
          </button>
        </div>
      </form>
    </div>
  );
}
