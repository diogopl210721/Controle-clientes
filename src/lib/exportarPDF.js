import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatarData, formatarDataHora } from "./helpers.js";

// Export locally: no customer information is sent to an external PDF service.
export async function gerarAtendimentoPDF(cliente, assunto = null) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Controle Clientes — ${cliente.razao_social}`);
  pdf.setAuthor("Diogo Soares — www.ddsinovacao.com.br");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(normal.getCharacterSet());
  const textoSeguro = (value) =>
    Array.from(String(value ?? "—"))
      .map((c) =>
        c === "\n" || supported.has(c.codePointAt(0))
          ? c
          : `[U+${c.codePointAt(0).toString(16).toUpperCase()}]`,
      )
      .join("")
      .replace(/\r/g, "");
  const dark = rgb(0.06, 0.1, 0.19),
    muted = rgb(0.35, 0.41, 0.5),
    blue = rgb(0.03, 0.35, 0.84);
  let page, y;
  function novaPagina() {
    page = pdf.addPage([595.28, 841.89]);
    y = 735;
    page.drawRectangle({ x: 0, y: 779, width: 596, height: 63, color: dark });
    page.drawText("Controle Clientes", {
      x: 42,
      y: 807,
      size: 18,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText(
      assunto ? "RELATÓRIO DE ASSUNTO" : "RELATÓRIO DE ATENDIMENTO",
      { x: 42, y: 786, size: 9, font: normal, color: rgb(0.66, 0.81, 1) },
    );
  }
  novaPagina();
  function linha(
    text,
    { font = normal, size = 10, color = dark, gap = 5 } = {},
  ) {
    const max = 511;
    for (const paragraph of textoSeguro(text).split("\n")) {
      let current = "";
      for (const char of paragraph) {
        if (current && font.widthOfTextAtSize(current + char, size) > max) {
          const split = current.lastIndexOf(" ");
          if (split > current.length / 2) {
            desenhar(current.slice(0, split));
            current = current.slice(split + 1) + char;
          } else {
            desenhar(current);
            current = char;
          }
        } else current += char;
      }
      desenhar(current || " ");
    }
    y -= gap;
    function desenhar(value) {
      if (y < 65) novaPagina();
      page.drawText(value, { x: 42, y, font, size, color });
      y -= size + 5;
    }
  }
  function secao(titulo) {
    if (y < 112) novaPagina();
    y -= 10;
    linha(titulo, { font: bold, size: 12, color: blue, gap: 7 });
  }
  function campo(label, value) {
    linha(
      `${label}: ${value === "" || value === null || value === undefined ? "—" : value}`,
    );
  }
  linha(cliente.razao_social || "Cliente", { font: bold, size: 17 });
  linha(`Gerado em ${formatarDataHora(new Date())}`, { size: 9, color: muted });
  secao("Dados do cliente");
  const campos = [
    ["Código", "codigo_cliente"],
    ["Nome fantasia", "nome_fantasia"],
    ["CNPJ/CPF", "cnpj"],
    ["Contato", "nome_contato"],
    ["Telefone", "telefone"],
    ["Consultor", "consultor"],
    ["Cidade", "cidade"],
    ["UF", "uf"],
    ["Canal de venda", "canal_venda"],
    ["Rota", "rota"],
  ];
  campos.forEach(([label, key]) => campo(label, cliente[key]));
  secao("Acompanhamento");
  campo("Prioridade", cliente.acompanhamento?.prioridade || "normal");
  campo(
    "Situação",
    cliente.acompanhamento?.encerrado ? "Concluído" : "Em andamento",
  );
  campo(
    "Última interação",
    formatarDataHora(cliente.acompanhamento?.ultima_interacao),
  );
  if (cliente.acompanhamento?.encerrado)
    campo(
      "Encerrado em",
      formatarDataHora(cliente.acompanhamento.encerrado_em),
    );
  const contratos = cliente.contratos?.length
    ? cliente.contratos
    : cliente.contrato
      ? [cliente.contrato]
      : [];
  for (const [index, c] of contratos.entries()) {
    secao(`Contrato ${index + 1}`);
    campo("Número", c.numero_contrato);
    campo("Situação", c.situacao);
    campo("Início", formatarData(c.data_inicio));
    campo("Término", formatarData(c.data_termino));
    campo("Endereço de entrega", c.endereco_entrega);
    campo("Modelo de recipiente", c.modelo_recipiente);
    campo("Quantidade", c.qtde_recipiente);
    campo(
      "Preço atual (R$)",
      c.preco_atual == null
        ? null
        : Number(c.preco_atual).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }),
    );
    campo("Consumo médio 6 meses (kg)", c.consumo_medio_6m);
    campo("Consumo médio 1 ano (kg)", c.consumo_medio_1a);
    campo("Frequência", c.frequencia);
  }
  const historico = assunto
    ? [assunto]
    : [...(cliente.historico || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
  secao(assunto ? "Assunto selecionado" : "Diário de atendimentos");
  linha(
    `${historico.filter((h) => !h.resolvido).length} assunto(s) aberto(s) · ${historico.filter((h) => h.resolvido).length} concluído(s)`,
    { color: muted },
  );
  if (!historico.length) linha("Nenhum assunto registrado.");
  for (const h of historico) {
    if (y < 125) novaPagina();
    linha(
      `${formatarDataHora(h.created_at)} · ${h.resolvido ? "CONCLUÍDO" : "EM ABERTO"}`,
      { font: bold, color: blue, gap: 4 },
    );
    linha(h.descricao || "Sem descrição");
    if (h.resolvido)
      linha(`Concluído em ${formatarDataHora(h.resolvido_em)}`, {
        size: 9,
        color: muted,
      });
    y -= 9;
  }
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({
      start: { x: 42, y: 45 },
      end: { x: 553, y: 45 },
      color: rgb(0.85, 0.88, 0.92),
      thickness: 0.5,
    });
    p.drawText("© Diogo Soares — www.ddsinovacao.com.br", {
      x: 42,
      y: 29,
      size: 8,
      font: normal,
      color: muted,
    });
    p.drawText(`${i + 1} / ${paginas.length}`, {
      x: 520,
      y: 29,
      size: 8,
      font: normal,
      color: muted,
    });
  });
  return pdf.save();
}

export async function exportarAtendimento(cliente, assunto = null) {
  const bytes = await gerarAtendimentoPDF(cliente, assunto);
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );
  const link = document.createElement("a");
  link.href = url;
  const nome = (cliente.razao_social || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 80);
  link.download = `Controle-Clientes-${nome}${assunto ? "-assunto" : ""}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
