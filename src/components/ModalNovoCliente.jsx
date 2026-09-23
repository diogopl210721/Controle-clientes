import React, { useState, useRef } from "react";
import { X, Loader2, FileUp, CheckCircle2 } from "lucide-react";
import { useDialog } from "../hooks/useDialog";
import { supabase } from "../supabaseClient";

const VAZIO_CLIENTE = {
  codigo_cliente: "",
  razao_social: "",
  nome_fantasia: "",
  cnpj: "",
  nome_contato: "",
  telefone: "",
  cidade: "",
  uf: "",
  consultor: "",
  canal_venda: "",
  rota: "",
};
const VAZIO_CONTRATO = {
  numero_contrato: "",
  data_inicio: "",
  data_termino: "",
  situacao: "Vigente",
  modelo_recipiente: "",
  qtde_recipiente: "",
  endereco_entrega: "",
  preco_atual: "",
  consumo_medio_6m: "",
  frequencia: "",
};

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

export default function ModalNovoCliente({ onFechar, onCriado }) {
  const dialogRef = useDialog(onFechar);
  const progresso = useRef({});
  const [erroSalvar, setErroSalvar] = useState("");
  const [cliente, setCliente] = useState(VAZIO_CLIENTE);
  const [contrato, setContrato] = useState(VAZIO_CONTRATO);
  const [evolucaoPreco, setEvolucaoPreco] = useState([]);
  const [importando, setImportando] = useState(false);
  const [importado, setImportado] = useState(false);
  const [erroImportacao, setErroImportacao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const inputArquivo = useRef(null);

  const importarPDF = async (arquivo) => {
    if (!arquivo) return;
    if (progresso.current.clienteId) {
      setErroImportacao(
        "Finalize o cadastro em andamento antes de importar outro PDF.",
      );
      return;
    }
    setImportando(true);
    setErroImportacao(null);
    try {
      const { extrairTextoPDF, interpretarTextoConsigaz } =
        await import("../lib/parsePDF");
      const texto = await extrairTextoPDF(arquivo);
      const {
        cliente: c,
        contrato: ct,
        evolucaoPreco: ev,
      } = interpretarTextoConsigaz(texto);
      setCliente((prev) => ({ ...prev, ...c }));
      setContrato((prev) => ({ ...prev, ...ct }));
      setEvolucaoPreco(ev);
      setImportado(true);
      if (!c.codigo_cliente || !c.razao_social)
        setErroImportacao(
          "Alguns campos não foram identificados. Revise e complete as informações antes de salvar.",
        );
    } catch (e) {
      console.error(e);
      setErroImportacao(
        "Não consegui ler esse PDF automaticamente. Preencha os campos manualmente.",
      );
    }
    setImportando(false);
  };

  const salvar = async () => {
    if (
      !cliente.codigo_cliente ||
      !cliente.razao_social ||
      salvando ||
      importando
    )
      return;
    setSalvando(true);
    setErroSalvar("");
    try {
      if (!progresso.current.clienteId) {
        const { data, error } = await supabase
          .from("clientes")
          .insert(cliente)
          .select()
          .single();
        if (error) throw error;
        progresso.current.clienteId = data.id;
      } else {
        const { error } = await supabase
          .from("clientes")
          .update(cliente)
          .eq("id", progresso.current.clienteId);
        if (error) throw error;
      }
      if (
        contrato.numero_contrato ||
        contrato.data_inicio ||
        contrato.endereco_entrega
      ) {
        const payload = {
          ...contrato,
          cliente_id: progresso.current.clienteId,
          data_inicio: contrato.data_inicio || null,
          data_termino: contrato.data_termino || null,
          qtde_recipiente: contrato.qtde_recipiente || null,
          preco_atual: contrato.preco_atual || null,
          consumo_medio_6m: contrato.consumo_medio_6m || null,
        };
        if (!progresso.current.contratoId) {
          const { data, error } = await supabase
            .from("contratos")
            .insert(payload)
            .select()
            .single();
          if (error) throw error;
          progresso.current.contratoId = data.id;
        } else {
          const { error } = await supabase
            .from("contratos")
            .update(payload)
            .eq("id", progresso.current.contratoId);
          if (error) throw error;
        }
        if (evolucaoPreco.length && !progresso.current.precosSalvos) {
          const { error } = await supabase
            .from("evolucao_preco")
            .insert(
              evolucaoPreco.map((e) => ({
                ...e,
                contrato_id: progresso.current.contratoId,
              })),
            );
          if (error) throw error;
          progresso.current.precosSalvos = true;
        }
      }
      const { error } = await supabase
        .from("acompanhamento")
        .upsert(
          { cliente_id: progresso.current.clienteId },
          { onConflict: "cliente_id" },
        );
      if (error) throw error;
      await onCriado();
    } catch (error) {
      setErroSalvar(
        error.code === "23505"
          ? "Já existe um registro com estes dados. Confira o código do cliente."
          : progresso.current.clienteId
            ? "O cliente foi salvo, mas uma etapa ficou pendente. Clique em Criar cliente para tentar concluir sem duplicar o cadastro."
            : "Não foi possível salvar o cliente. Confira a conexão e tente novamente.",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-cliente-titulo"
        className="new-client-dialog"
      >
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center sticky top-0">
          <h2
            id="novo-cliente-titulo"
            className="font-bold text-slate-800 text-sm"
          >
            Novo Cliente
          </h2>
          <button
            aria-label="Fechar cadastro"
            onClick={onFechar}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {erroSalvar && (
            <div className="notice error" role="alert">
              {erroSalvar}
            </div>
          )}
          <div className="border border-dashed border-blue-300 bg-blue-50 rounded-lg p-3 text-center">
            <input
              type="file"
              accept="application/pdf"
              ref={inputArquivo}
              className="hidden"
              onChange={(e) => importarPDF(e.target.files?.[0])}
            />
            <button
              onClick={() => inputArquivo.current?.click()}
              disabled={importando}
              className="text-xs font-bold text-blue-700 flex items-center gap-1.5 justify-center w-full disabled:opacity-50"
            >
              {importando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : importado ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <FileUp className="w-4 h-4" />
              )}
              {importando
                ? "Lendo PDF..."
                : importado
                  ? "PDF importado — revise os campos abaixo"
                  : "Importar PDF do cliente (Consigaz/Gasball)"}
            </button>
            {erroImportacao && (
              <p className="text-[11px] text-red-600 mt-1">{erroImportacao}</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Dados do cliente
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Campo
                label="Código *"
                value={cliente.codigo_cliente}
                onChange={(v) =>
                  setCliente((c) => ({ ...c, codigo_cliente: v }))
                }
              />
              <Campo
                label="Razão social *"
                value={cliente.razao_social}
                onChange={(v) => setCliente((c) => ({ ...c, razao_social: v }))}
              />
              <Campo
                label="Nome fantasia"
                value={cliente.nome_fantasia}
                onChange={(v) =>
                  setCliente((c) => ({ ...c, nome_fantasia: v }))
                }
              />
              <Campo
                label="CNPJ"
                value={cliente.cnpj}
                onChange={(v) => setCliente((c) => ({ ...c, cnpj: v }))}
              />
              <Campo
                label="Telefone"
                value={cliente.telefone}
                onChange={(v) => setCliente((c) => ({ ...c, telefone: v }))}
              />
              <Campo
                label="Contato"
                value={cliente.nome_contato}
                onChange={(v) => setCliente((c) => ({ ...c, nome_contato: v }))}
              />
              <Campo
                label="Cidade"
                value={cliente.cidade}
                onChange={(v) => setCliente((c) => ({ ...c, cidade: v }))}
              />
              <Campo
                label="UF"
                value={cliente.uf}
                onChange={(v) => setCliente((c) => ({ ...c, uf: v }))}
              />
              <Campo
                label="Consultor"
                value={cliente.consultor}
                onChange={(v) => setCliente((c) => ({ ...c, consultor: v }))}
                className="col-span-2"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Contrato (opcional)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Campo
                label="Número do contrato"
                value={contrato.numero_contrato}
                onChange={(v) =>
                  setContrato((c) => ({ ...c, numero_contrato: v }))
                }
              />
              <Campo
                label="Situação"
                value={contrato.situacao}
                onChange={(v) => setContrato((c) => ({ ...c, situacao: v }))}
              />
              <Campo
                label="Início"
                tipo="date"
                value={contrato.data_inicio}
                onChange={(v) => setContrato((c) => ({ ...c, data_inicio: v }))}
              />
              <Campo
                label="Término"
                tipo="date"
                value={contrato.data_termino}
                onChange={(v) =>
                  setContrato((c) => ({ ...c, data_termino: v }))
                }
              />
              <Campo
                label="Modelo de tanque"
                value={contrato.modelo_recipiente}
                onChange={(v) =>
                  setContrato((c) => ({ ...c, modelo_recipiente: v }))
                }
              />
              <Campo
                label="Qtde. recipiente"
                tipo="number"
                value={contrato.qtde_recipiente}
                onChange={(v) =>
                  setContrato((c) => ({ ...c, qtde_recipiente: v }))
                }
              />
              <Campo
                label="Preço atual (R$)"
                tipo="number"
                value={contrato.preco_atual}
                onChange={(v) => setContrato((c) => ({ ...c, preco_atual: v }))}
              />
              <Campo
                label="Frequência"
                value={contrato.frequencia}
                onChange={(v) => setContrato((c) => ({ ...c, frequencia: v }))}
              />
              <Campo
                label="Endereço de entrega"
                value={contrato.endereco_entrega}
                onChange={(v) =>
                  setContrato((c) => ({ ...c, endereco_entrega: v }))
                }
                className="col-span-2"
              />
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onFechar}
            className="px-3 py-1.5 rounded text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={
              salvando ||
              importando ||
              !cliente.codigo_cliente ||
              !cliente.razao_social
            }
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold"
          >
            {salvando ? "Salvando..." : "Criar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
