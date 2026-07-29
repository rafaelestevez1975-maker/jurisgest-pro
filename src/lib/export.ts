// Exportações do sistema — apenas Excel (.xls) e PDF (via impressão).
// Sem dependências externas: o Excel abre a tabela HTML como planilha; o PDF é
// gerado pela caixa de impressão do navegador ("Salvar como PDF").

type Cell = string | number | null | undefined;

function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function baixarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// Excel (.xls) — tabela HTML reconhecida pelo Excel/Google Sheets/LibreOffice.
export function exportarExcel(filenameBase: string, headers: string[], rows: Cell[][], titulo = 'Dados') {
  const thead = `<tr>${headers.map(h => `<th style="background:#1e3a5f;color:#fff;border:1px solid #999;padding:4px 6px;text-align:left">${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #ccc;padding:3px 6px;mso-number-format:'\\@'">${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  const aba = escapeHtml(titulo.slice(0, 31));
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${aba}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1"><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`;
  baixarBlob(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `${filenameBase}.xls`);
}

// PDF — abre uma janela de impressão já formatada; o usuário escolhe "Salvar como PDF".
export function exportarPDF(titulo: string, headers: string[], rows: Cell[][]) {
  const win = window.open('', '_blank');
  if (!win) { alert('Permita pop-ups deste site para exportar em PDF.'); return; }
  const thead = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  const gerado = new Date().toLocaleString('pt-BR');
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>` +
    `<style>` +
    `*{font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}` +
    `h1{font-size:15px;color:#1e3a5f;margin:0 0 2px}` +
    `.meta{font-size:10px;color:#666;margin-bottom:10px}` +
    `table{border-collapse:collapse;width:100%;font-size:9px}` +
    `th,td{border:1px solid #ccc;padding:3px 5px;text-align:left;vertical-align:top;word-break:break-word}` +
    `th{background:#1e3a5f;color:#fff}` +
    `tr:nth-child(even) td{background:#f4f6fa}` +
    `@page{size:A4 landscape;margin:10mm}` +
    `</style></head><body>` +
    `<h1>${escapeHtml(titulo)}</h1>` +
    `<div class="meta">Gerado em ${escapeHtml(gerado)} — ${rows.length} registro(s)</div>` +
    `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>` +
    `<script>window.onload=function(){setTimeout(function(){window.print();},300)}<\/script>` +
    `</body></html>`,
  );
  win.document.close();
}
