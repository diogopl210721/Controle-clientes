import React, { useState } from "react";
import DiarioCliente from "./DiarioCliente";
import ExportarButton from "./ExportarButton";
import { useDialog } from "../hooks/useDialog";
import { X, Loader2, Save, Trash2, Archive, RotateCcw } from "lucide-react";
import { supabase } from "../supabaseClient";
import {
  formatarDataHora,
  diasSemInteracao,
  statusInteracao,
  diasEntre,
} from "../lib/helpers";
import { PRIORIDADES } from "../lib/fases";
import BotoesContato from "./BotoesContato";

function Campo({ label, value, onChange, tipo = "text", className = "" }) {
  return (
    <label className={className}>
      <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
        {label}
      </span>
      <input
        type={tipo}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </label>
  );
}

function Bloco({ titulo, children, onSalvar, salvando }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          {titulo}
        </h3>
        {onSalvar && (
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            {salvando ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}{" "}
            Salvar
          </button>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

export default function FichaCliente({ cliente, onFechar, onAtualizar }) {
  const dialogRef = useDialog(onFechar);
  const [tab, setTab] = useState("diario");
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState({ ...cliente });
  const [contrato, setContrato] = useState({ ...(cliente.contrato || {}) });
  const [acomp, setAcomp] = useState({ ...(cliente.acompanhamento || {}) });
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoContrato, setSalvandoContrato] = useState(false);
  const [salvandoAcomp, setSalvandoAcomp] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [mudandoEncerramento, setMudandoEncerramento] = useState(false);

  const status = statusInteracao(cliente.acompanhamento?.ultima_interacao);
  const dias = diasSemInteracao(cliente.acompanhamento?.ultima_interacao);

  const salvarDados = async () => {
    setSalvandoDados(true);
    const { error } = await supabase
      .from("clientes")
      .update({
        codigo_cliente: dados.codigo_cliente,
        razao_social: dados.razao_social,
        nome_fantasia: dados.nome_fantasia,
        cnpj: dados.cnpj,
        nome_contato: dados.nome_contato,
        telefone: dados.telefone,
        cidade: dados.cidade,
        uf: dados.uf,
        consultor: dados.consultor,
      })
      .eq("id", cliente.id);
    setSalvandoDados(false);
    if (error) setErro("Não foi possível salvar os dados. Tente novamente.");
    else {
      setErro("");
      onAtualizar();
    }
  };

  const salvarContrato = async () => {
    setSalvandoContrato(true);
    const payload = {
      cliente_id: cliente.id,
      numero_contrato: contrato.numero_contrato,
      data_inicio: contrato.data_inicio || null,
      data_termino: contrato.data_termino || null,
      situacao: contrato.situacao,
      modelo_recipiente: contrato.modelo_recipiente,
      qtde_recipiente: contrato.qtde_recipiente || null,
      endereco_entrega: contrato.endereco_entrega,
      preco_atual: contrato.preco_atual || null,
      consumo_medio_6m: contrato.consumo_medio_6m || null,
      frequencia: contrato.frequencia,
    };
    const { data: contratoSalvo, error } = contrato.id
      ? await supabase
          .from("contratos")
          .update(payload)
          .eq("id", contrato.id)
          .select()
          .single()
      : await supabase.from("contratos").insert(payload).select().single();
    setSalvandoContrato(false);
    if (error) setErro("Não foi possível salvar o contrato. Tente novamente.");
    else {
      setContrato(contratoSalvo);
      setErro("");
      onAtualizar();
    }
  };

  const salvarAcompanhamento = async () => {
    setSalvandoAcomp(true);
    const { error } = await supabase
      .from("acompanhamento")
      .upsert(
        {
          cliente_id: cliente.id,
          prioridade: acomp.prioridade || "normal",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cliente_id" },
      );
    setSalvandoAcomp(false);
    if (error)
      setErro("Não foi possível salvar a prioridade. Tente novamente.");
    else onAtualizar();
  };

  const excluirCliente = async () => {
    setExcluindo(true);
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", cliente.id);
    setExcluindo(false);
    if (error) setErro("Não foi possível excluir o cliente. Tente novamente.");
    if (!error) {
      await onAtualizar();
      onFechar();
    }
  };

  const alternarEncerramento = async () => {
    setMudandoEncerramento(true);
    const encerrarAgora = !acomp.encerrado;
    const payload = {
      cliente_id: cliente.id,
      encerrado: encerrarAgora,
      encerrado_em: encerrarAgora ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("acompanhamento")
      .upsert(payload, { onConflict: "cliente_id" });
    setMudandoEncerramento(false);
    if (error) {
      setErro("Não foi possível alterar o atendimento. Tente novamente.");
    } else {
      setAcomp((d) => ({ ...d, ...payload }));
      onAtualizar();
    }
  };

  return (
    <div className="modal-backdrop legacy-content">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ficha-titulo"
        className="client-dialog"
      >
        <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="min-w-0">
              <h2
                id="ficha-titulo"
                className="font-bold text-slate-800 text-sm"
              >
                {cliente.razao_social}
              </h2>
              <p className="text-[11px] text-slate-400">
                {cliente.codigo_cliente} ·{" "}
                <span
                  className={
                    status === "critico"
                      ? "text-red-600 font-semibold"
                      : status === "atencao"
                        ? "text-amber-600 font-semibold"
                        : "text-emerald-600 font-semibold"
                  }
                >
                  {dias === null ? "sem histórico" : `${dias} dias sem contato`}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BotoesContato
                telefone={cliente.telefone}
                endereco={contrato.endereco_entrega}
              />
              <button
                onClick={() => setConfirmandoExclusao(true)}
                className="text-slate-300 hover:text-red-500 p-1"
                title="Excluir cliente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                aria-label="Fechar ficha"
                onClick={onFechar}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {confirmandoExclusao && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-red-700">
                Excluir {cliente.razao_social} e todo o histórico dele? Não dá
                pra desfazer.
              </p>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setConfirmandoExclusao(false)}
                  className="text-[11px] font-semibold text-slate-500 px-2 py-1 hover:bg-white rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluirCliente}
                  disabled={excluindo}
                  className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded disabled:opacity-50"
                >
                  {excluindo ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="detail-tabs segmented">
          <button
            className={tab === "diario" ? "selected" : ""}
            onClick={() => setTab("diario")}
          >
            Diário
          </button>
          <button
            className={tab === "dados" ? "selected" : ""}
            onClick={() => setTab("dados")}
          >
            Dados e contrato
          </button>
        </div>
        {erro && (
          <div className="notice error" role="alert">
            {erro}
          </div>
        )}
        <div className="p-3 space-y-3">
          {tab === "diario" && (
            <>
              <div className="detail-summary">
                <span className="badge blue">
                  Prioridade {cliente.acompanhamento?.prioridade || "normal"}
                </span>
                <span className="badge green">
                  {cliente.acompanhamento?.encerrado
                    ? "Concluído"
                    : "Em andamento"}
                </span>
              </div>
              <DiarioCliente cliente={cliente} onAtualizar={onAtualizar} />
            </>
          )}
          {tab === "dados" && (
            <>
              <Bloco
                titulo="Dados do cliente"
                onSalvar={salvarDados}
                salvando={salvandoDados}
              >
                <Campo
                  label="Código *"
                  value={dados.codigo_cliente}
                  onChange={(v) =>
                    setDados((d) => ({ ...d, codigo_cliente: v }))
                  }
                />
                <Campo
                  label="Razão social *"
                  value={dados.razao_social}
                  onChange={(v) => setDados((d) => ({ ...d, razao_social: v }))}
                />
                <Campo
                  label="Nome fantasia"
                  value={dados.nome_fantasia}
                  onChange={(v) =>
                    setDados((d) => ({ ...d, nome_fantasia: v }))
                  }
                />
                <Campo
                  label="CNPJ"
                  value={dados.cnpj}
                  onChange={(v) => setDados((d) => ({ ...d, cnpj: v }))}
                />
                <Campo
                  label="Telefone"
                  value={dados.telefone}
                  onChange={(v) => setDados((d) => ({ ...d, telefone: v }))}
                />
                <Campo
                  label="Contato"
                  value={dados.nome_contato}
                  onChange={(v) => setDados((d) => ({ ...d, nome_contato: v }))}
                />
                <Campo
                  label="Cidade"
                  value={dados.cidade}
                  onChange={(v) => setDados((d) => ({ ...d, cidade: v }))}
                />
                <Campo
                  label="UF"
                  value={dados.uf}
                  onChange={(v) => setDados((d) => ({ ...d, uf: v }))}
                />
                <Campo
                  label="Consultor"
                  value={dados.consultor}
                  onChange={(v) => setDados((d) => ({ ...d, consultor: v }))}
                  className="col-span-2"
                />
              </Bloco>

              <Bloco
                titulo="Contrato"
                onSalvar={salvarContrato}
                salvando={salvandoContrato}
              >
                <Campo
                  label="Número do contrato"
                  value={contrato.numero_contrato}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, numero_contrato: v }))
                  }
                />
                <Campo
                  label="Situação"
                  value={contrato.situacao}
                  onChange={(v) => setContrato((d) => ({ ...d, situacao: v }))}
                />
                <Campo
                  label="Início"
                  tipo="date"
                  value={contrato.data_inicio}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, data_inicio: v }))
                  }
                />
                <Campo
                  label="Término"
                  tipo="date"
                  value={contrato.data_termino}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, data_termino: v }))
                  }
                />
                {contrato.data_termino && (
                  <p className="text-[11px] text-slate-400 col-span-2 -mt-1">
                    {(() => {
                      const d = diasEntre(contrato.data_termino);
                      if (d === null) return null;
                      if (d < 0)
                        return (
                          <span className="text-red-600 font-semibold">
                            Contrato venceu há {Math.abs(d)} dias
                          </span>
                        );
                      return (
                        <span
                          className={
                            d <= 30
                              ? "text-red-600 font-semibold"
                              : d <= 90
                                ? "text-amber-600 font-semibold"
                                : "text-slate-500"
                          }
                        >
                          Faltam {d} dias para o contrato terminar
                        </span>
                      );
                    })()}
                  </p>
                )}
                <Campo
                  label="Modelo de tanque"
                  value={contrato.modelo_recipiente}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, modelo_recipiente: v }))
                  }
                />
                <Campo
                  label="Qtde. recipiente"
                  tipo="number"
                  value={contrato.qtde_recipiente}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, qtde_recipiente: v }))
                  }
                />
                <Campo
                  label="Preço atual (R$)"
                  tipo="number"
                  value={contrato.preco_atual}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, preco_atual: v }))
                  }
                />
                <Campo
                  label="Consumo médio 6M (kg)"
                  tipo="number"
                  value={contrato.consumo_medio_6m}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, consumo_medio_6m: v }))
                  }
                />
                <Campo
                  label="Frequência de entrega"
                  value={contrato.frequencia}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, frequencia: v }))
                  }
                />
                <Campo
                  label="Endereço de entrega"
                  value={contrato.endereco_entrega}
                  onChange={(v) =>
                    setContrato((d) => ({ ...d, endereco_entrega: v }))
                  }
                  className="col-span-2"
                />
              </Bloco>
            </>
          )}
          <Bloco
            titulo="Acompanhamento"
            onSalvar={salvarAcompanhamento}
            salvando={salvandoAcomp}
          >
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-slate-500 block mb-0.5">
                Prioridade
              </label>
              <select
                aria-label="Prioridade do atendimento"
                value={acomp.prioridade || "normal"}
                onChange={(e) =>
                  setAcomp((d) => ({ ...d, prioridade: e.target.value }))
                }
                className="w-full p-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
              <div>
                {acomp.encerrado ? (
                  <p className="text-[11px] text-slate-500">
                    Atendimento encerrado em{" "}
                    <span className="font-semibold">
                      {formatarDataHora(acomp.encerrado_em)}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Atendimento em andamento
                  </p>
                )}
              </div>
              <button
                onClick={alternarEncerramento}
                disabled={mudandoEncerramento}
                className={`text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded disabled:opacity-50 ${
                  acomp.encerrado
                    ? "text-blue-600 hover:bg-blue-50"
                    : "text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                {mudandoEncerramento ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : acomp.encerrado ? (
                  <RotateCcw className="w-3.5 h-3.5" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
                {acomp.encerrado
                  ? "Reabrir atendimento"
                  : "Encerrar atendimento"}
              </button>
            </div>
          </Bloco>

          <div className="detail-export">
            <ExportarButton cliente={cliente} />
            <small>
              Exporta os dados salvos, os contratos e todo o diário.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
