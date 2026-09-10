import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extrairTextoPDF(arquivo) {
  const buffer = await arquivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const conteudo = await page.getTextContent();
    textoCompleto += conteudo.items.map((it) => it.str).join(' ') + '\n';
  }
  return textoCompleto;
}

function dataBrParaISO(dataBr) {
  if (!dataBr) return null;
  const [d, m, a] = dataBr.split('/');
  if (!d || !m || !a) return null;
  return `${a}-${m}-${d}`;
}

function numeroBr(txt) {
  if (!txt) return null;
  const n = parseFloat(txt.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

// Interpreta o texto extraído de um PDF no formato Consigaz/Gasball (ficha do cliente).
// Campos não identificados ficam undefined/null para o usuário completar manualmente.
export function interpretarTextoConsigaz(texto) {
  const t = texto.replace(/\s+/g, ' ');
  const resultado = { cliente: {}, contrato: {}, evolucaoPreco: [] };

  let m;

  m = t.match(/Cliente:\s*(\d+)\s*-\s*([A-ZÀ-Ú0-9À-ÿ&.,\- ]+?)\s*CNPJ/);
  if (m) {
    resultado.cliente.codigo_cliente = m[1].trim();
    resultado.cliente.razao_social = m[2].trim();
  }

  m = t.match(/CNPJ\/CPF:\s*([\d.\/-]+)/);
  if (m) resultado.cliente.cnpj = m[1].trim();

  m = t.match(/Canal de venda:\s*(.+?)\s*Cond\. pagto/);
  if (m) resultado.cliente.canal_venda = m[1].trim();

  m = t.match(/Endereço Padrão:\s*(.+?)\s*CEP:\s*[\d-]+/);
  if (m) resultado.cliente.endereco = m[1].trim();

  m = t.match(/Bairro:\s*(.+?)\s*Cidade:\s*(.+?)\s*UF:\s*([A-Z]{2})/);
  if (m) {
    resultado.cliente.cidade = m[2].trim();
    resultado.cliente.uf = m[3].trim();
  }

  m = t.match(/Rota:\s*(\S+)/);
  if (m) resultado.cliente.rota = m[1].trim();

  m = t.match(/Contrato\s*\(\d+\)\s*:\s*(\S+)/);
  if (m) resultado.contrato.numero_contrato = m[1].trim();

  m = t.match(/Vigência:\s*(\d{2}\/\d{2}\/\d{4})\s*até\s*(\d{2}\/\d{2}\/\d{4})\s*Situação:\s*(\w+)/);
  if (m) {
    resultado.contrato.data_inicio = dataBrParaISO(m[1]);
    resultado.contrato.data_termino = dataBrParaISO(m[2]);
    resultado.contrato.situacao = m[3].trim();
  }

  m = t.match(/Item Recipiente\s*Qtde\s*(.+?)\s+(\d+)\s*Item Consumo/);
  if (m) {
    resultado.contrato.modelo_recipiente = m[1].trim();
    resultado.contrato.qtde_recipiente = parseInt(m[2], 10);
  }

  // Isola o trecho do item de consumo, entre o cabeçalho da tabela e "Evolução de Preço"
  const blocoConsumo = t.match(/Frequência\s*(.+?)\s*Evolução de Preço/);
  const textoConsumo = blocoConsumo ? blocoConsumo[1] : '';

  // Linha de consumo: "CB0010 - ONU 1075,GAS LIQUEFEITO PETROLEO (GRANEL) R$ 7,5174 107 Kg 0,56 54 Kg 0,28 QUINZENAL QUARTA"
  m = textoConsumo.match(/^(\S+)\s*-\s*(.+?)\s*R\$\s*([\d.,]+)\s+(\d+)\s*Kg\s+([\d.,]+)\s+(\d+)\s*Kg\s+([\d.,]+)\s+([A-ZÇÃÕ\s]+?)\s*$/);
  if (m) {
    resultado.contrato.item_consumo = `${m[1].trim()} - ${m[2].trim()}`;
    resultado.contrato.preco_atual = numeroBr(m[3]);
    resultado.contrato.consumo_medio_6m = parseInt(m[4], 10);
    resultado.contrato.giro_6m = numeroBr(m[5]);
    resultado.contrato.consumo_medio_1a = parseInt(m[6], 10);
    resultado.contrato.giro_1a = numeroBr(m[7]);
    resultado.contrato.frequencia = m[8].trim();
  }

  // Evolução de preço: "Item Data Preço CB0010 31/08/2026 7,5174 CB0010 26/05/2026 7,2074"
  const blocoEvolucao = t.match(/Evolução de Preço:\s*Item\s*Data\s*Preço\s*(.+)$/);
  if (blocoEvolucao) {
    const regexLinha = /(\w+)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)/g;
    let l;
    while ((l = regexLinha.exec(blocoEvolucao[1])) !== null) {
      resultado.evolucaoPreco.push({
        item: l[1],
        data: dataBrParaISO(l[2]),
        preco: numeroBr(l[3]),
      });
    }
  }

  return resultado;
}
