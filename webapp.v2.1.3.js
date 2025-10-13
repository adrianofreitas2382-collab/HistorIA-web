
// HistorIA v2.1.3 - Correção de regex e inclusão de SW + 404
console.log("HistorIA v2.1.3 carregado com SW e página 404.");
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function ops(label, texto) {
  const parts = texto.split(new RegExp(esc(label) + '[:：]\\s*', 'i'));
  const m = (parts[1] || '').split('---')[0];
  const pick = (letter) => {
    const rx = new RegExp('^\\s*' + letter + '\\)\\s*(.+)$', 'im');
    return (m.match(rx)?.[1] || '').trim();
  };
  return { A: pick('A'), B: pick('B'), C: pick('C') };
}
