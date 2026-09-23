import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
export default function ExportarButton({
  cliente,
  assunto = null,
  compact = false,
}) {
  const [busy, setBusy] = useState(false),
    [erro, setErro] = useState("");
  async function exportar() {
    setBusy(true);
    setErro("");
    try {
      const { exportarAtendimento } = await import("../lib/exportarPDF");
      await exportarAtendimento(cliente, assunto);
    } catch {
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="export-control">
      <button
        className={compact ? "icon-button" : "button export-button"}
        onClick={exportar}
        disabled={busy}
        title={
          assunto
            ? "Exportar este assunto em PDF"
            : "Exportar atendimento em PDF"
        }
        aria-label={
          assunto
            ? "Exportar este assunto em PDF"
            : "Exportar atendimento em PDF"
        }
      >
        {busy ? <Loader2 size={17} className="spin" /> : <Download size={17} />}{" "}
        {!compact && (busy ? "Gerando PDF…" : "Exportar atendimento em PDF")}
      </button>
      {erro && (
        <span className="inline-error" role="alert">
          {erro}
        </span>
      )}
    </span>
  );
}
