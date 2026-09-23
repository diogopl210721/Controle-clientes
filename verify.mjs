import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { gerarAtendimentoPDF } from "./src/lib/exportarPDF.js";
import {
  diasEntre,
  statusInteracao,
  motivoAtencao,
} from "./src/lib/helpers.js";
const out = path.resolve(process.argv[2] || "../qa");
fs.mkdirSync(out, { recursive: true });
const parserSource = fs.readFileSync(
  new URL("./src/lib/parsePDF.js", import.meta.url),
  "utf8",
);
const { interpretarTextoConsigaz } = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      parserSource.slice(parserSource.indexOf("function dataBrParaISO")),
    ).toString("base64")
);
const lines = [
  "Cliente: 987654 - CLIENTE EXEMPLO TESTE CNPJ/CPF: 00.000.000/0001-00",
  "Canal de venda: COMERCIAL Cond. pagto: 30 DIAS",
  "Entrega: ENTREGA - RUA EXEMPLO, 123 - CENTRO CEP: 80000-000",
  "Bairro: CENTRO Cidade: CURITIBA UF: PR Rota: R01",
  "Contrato (1): TESTE2026",
  "Vigência: 01/01/2026 até 31/12/2027 Situação: Vigente",
  "Item Recipiente Qtde TANQUE B-190 3 Item Consumo",
  "Frequência CB0010 - ONU 1075,GAS LIQUEFEITO PETROLEO (GRANEL)",
  "R$ 7,5174 107 Kg 0,56 54 Kg 0,28 QUINZENAL QUARTA",
  "Evolução de Preço: Item Data Preço",
  "CB0010 31/08/2026 7,5174 CB0010 26/05/2026 7,2074",
];
const parsed = interpretarTextoConsigaz(lines.join(" "));
assert.equal(parsed.cliente.codigo_cliente, "987654");
assert.equal(parsed.cliente.razao_social, "CLIENTE EXEMPLO TESTE");
assert.equal(parsed.cliente.cnpj, "00.000.000/0001-00");
assert.equal(parsed.cliente.cidade, "CURITIBA");
assert.equal(parsed.cliente.canal_venda, "COMERCIAL");
assert.equal(parsed.contrato.data_termino, "2027-12-31");
assert.equal(parsed.contrato.preco_atual, 7.5174);
assert.equal(parsed.contrato.qtde_recipiente, 3);
assert.equal(parsed.contrato.consumo_medio_6m, 107);
assert.equal(parsed.contrato.consumo_medio_1a, 54);
assert.equal(parsed.contrato.frequencia, "QUINZENAL QUARTA");
assert.equal(parsed.contrato.endereco_entrega, "RUA EXEMPLO, 123 - CENTRO");
assert.equal(parsed.evolucaoPreco.length, 2);
assert.equal(parsed.evolucaoPreco[1].preco, 7.2074);
assert.deepEqual(interpretarTextoConsigaz("PDF sem campos reconhecidos"), {
  cliente: {},
  contrato: {},
  evolucaoPreco: [],
});
assert.equal(diasEntre("2026-09-23", new Date(2026, 8, 23, 23, 59)), 0);
assert.equal(diasEntre("2026-09-22", new Date(2026, 8, 23)), -1);
assert.equal(diasEntre(null), null);
assert.equal(diasEntre("invalida"), null);
assert.equal(
  statusInteracao(new Date(Date.now() - 5 * 86400000).toISOString()),
  "atencao",
);
assert.match(
  motivoAtencao({ contrato: { data_termino: "2020-01-01" } }),
  /vencido/,
);
const fixture = await PDFDocument.create(),
  font = await fixture.embedFont(StandardFonts.Helvetica),
  page = fixture.addPage([595, 842]);
lines.forEach((text, i) =>
  page.drawText(text, { x: 35, y: 790 - i * 30, size: 10, font }),
);
fs.writeFileSync(
  path.join(out, "ficha-importacao-exemplo.pdf"),
  await fixture.save(),
);
const cliente = {
  ...parsed.cliente,
  consultor: "Diogo",
  contrato: parsed.contrato,
  contratos: [parsed.contrato],
  acompanhamento: {
    prioridade: "alta",
    ultima_interacao: "2026-09-22T12:00:00Z",
    encerrado: false,
  },
  historico: [
    {
      id: "h1",
      descricao:
        "Renovação contratual: proposta enviada.\n22/09/26 — Aguardando retorno do cliente.",
      created_at: "2026-09-20T12:00:00Z",
      resolvido: false,
    },
    {
      id: "h2",
      descricao: "Documentação conferida e concluída.",
      created_at: "2026-09-21T12:00:00Z",
      resolvido: true,
      resolvido_em: "2026-09-22T12:00:00Z",
    },
  ],
};
const report = await gerarAtendimentoPDF(cliente);
fs.writeFileSync(path.join(out, "relatorio-exemplo.pdf"), report);
const single = await gerarAtendimentoPDF(cliente, cliente.historico[1]);
fs.writeFileSync(path.join(out, "assunto-exemplo.pdf"), single);
const longo = {
  ...cliente,
  historico: [
    {
      ...cliente.historico[0],
      descricao:
        "Histórico extenso com acentuação: ação, conclusão, atenção. ".repeat(
          100,
        ) + "\nFIM DO REGISTRO LONGO ✅",
    },
  ],
};
const longBytes = await gerarAtendimentoPDF(longo);
fs.writeFileSync(path.join(out, "relatorio-longo.pdf"), longBytes);
const doc = await PDFDocument.load(longBytes);
assert.ok(doc.getPageCount() > 2);
assert.equal(doc.getAuthor(), "Diogo Soares — www.ddsinovacao.com.br");
fs.writeFileSync(
  path.join(out, "cliente-exemplo.json"),
  JSON.stringify(cliente, null, 2),
);
console.log(
  "OK: 16 campos de importação, PDF sem campos, alertas por data, relatório completo, assunto individual e paginação longa.",
);
