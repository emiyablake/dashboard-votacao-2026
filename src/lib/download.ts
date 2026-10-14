/** utilitarios de exportacao dos dados dos paineis */

export type Linha = Record<string, string | number | null | undefined>;
export interface DadosExport {
  nome: string;
  titulo?: string;
  linhas: Linha[];
}

function baixa(nomeArquivo: string, conteudo: string, mime: string) {
  const blob = new Blob([conteudo], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const escCSV = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const escXML = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** gera e baixa um CSV (separador ";", BOM p/ Excel pt-BR) */
export function downloadCSV(nomeArquivo: string, linhas: Linha[]) {
  if (linhas.length === 0) return;
  const cols = Object.keys(linhas[0]);
  const csv =
    "﻿" +
    [cols.join(";"), ...linhas.map((l) => cols.map((c) => escCSV(l[c])).join(";"))].join(
      "\r\n"
    );
  baixa(`${nomeArquivo}.csv`, csv, "text/csv");
}

/** gera e baixa um XML simples com uma tag por linha */
export function downloadXML(nomeArquivo: string, linhas: Linha[], raiz = "dados") {
  if (linhas.length === 0) return;
  const cols = Object.keys(linhas[0]);
  const corpo = linhas
    .map(
      (l) =>
        `  <registro>${cols
          .map((c) => `<${c}>${escXML(String(l[c] ?? ""))}</${c}>`)
          .join("")}</registro>`
    )
    .join("\r\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\r\n<${raiz}>\r\n${corpo}\r\n</${raiz}>`;
  baixa(`${nomeArquivo}.xml`, xml, "text/xml");
}

/** gera e baixa um PDF em formato paisagem com tabela (jsPDF carregado sob demanda) */
export async function downloadPDF(nomeArquivo: string, titulo: string, linhas: Linha[]) {
  if (linhas.length === 0) return;
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const cols = Object.keys(linhas[0]);
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(titulo, 28, 28);
  autoTable(doc, {
    head: [cols],
    body: linhas.map((l) => cols.map((c) => String(l[c] ?? ""))),
    startY: 36,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });
  doc.save(`${nomeArquivo}.pdf`);
}

/** slug simples pra nome de arquivo */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
