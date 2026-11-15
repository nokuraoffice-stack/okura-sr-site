// 集計と合否（作成日 2026-11-15）
// 使い方: node eval/aggregate.mjs <周のフォルダ>   （auto.json と visual.json を読む）
// 点数＝1の数 ÷（自＋画 − 該当なし）。判定できない・未確定は0。人は分母外。
// 合格＝必須★（A）が全部1、かつ全体90%以上。
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const AUTO = ['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15','A16','B3','B4','B6','B7','B9','C1','C2','C3','C4','C5','C6','D1','D2','D3','D4','E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12','E13','E14','E15','E16','F1','F2','F3','F4','F5','F6'];
const VISUAL = ['B1','B2','B5','B8','C7','C8','C9','D5','D6','R1','R2','R3','R4','R5','R6','R7','R8','R9','R10','R11','R12','R13','R14','R15','R16'];
const NA = []; // 該当なし（基準点の後は増やさない）
const auto = JSON.parse(fs.readFileSync(path.join(dir, 'auto.json'), 'utf8')).results;
const vis = JSON.parse(fs.readFileSync(path.join(dir, 'visual.json'), 'utf8')).results; // { id: {r: 1|0|"判定できない", note} }
const rows = [];
for (const id of AUTO) rows.push({ id, kind: '自', r: auto[id] ? auto[id].r : 0, note: auto[id] ? auto[id].note : '結果なし' });
for (const id of VISUAL) rows.push({ id, kind: '画', r: vis[id] && vis[id].r === 1 ? 1 : 0, raw: vis[id] ? vis[id].r : '結果なし', note: vis[id] ? vis[id].note || '' : '結果なし' });
const denom = rows.length - NA.length;
const ones = rows.filter((x) => x.r === 1 && !NA.includes(x.id)).length;
const starZero = rows.filter((x) => x.id.startsWith('A') && x.r !== 1).map((x) => x.id);
const pct = Math.round((ones / denom) * 1000) / 10;
const pass = starZero.length === 0 && pct >= 90;
const byCat = {};
for (const x of rows) { const c = x.id[0]; byCat[c] = byCat[c] || [0, 0]; byCat[c][1]++; if (x.r === 1) byCat[c][0]++; }
const summary = { date: new Date().toISOString().slice(0, 10), ones, denom, pct, starZero, pass, byCat, zeros: rows.filter((x) => x.r !== 1).map((x) => ({ id: x.id, kind: x.kind, raw: x.raw, note: x.note })) };
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 1));
let md = `# 採点表 ${path.basename(dir)}\n\n作成日: ${summary.date}\n\n- 点数: ${ones}/${denom} = ${pct}%\n- 必須★の0: ${starZero.join(', ') || 'なし'}\n- 合否: ${pass ? '合格' : '不合格'}\n\n| 区分 | 1の数 | 項目数 |\n|---|---|---|\n`;
for (const [c, [a, b]] of Object.entries(byCat)) md += `| ${c} | ${a} | ${b} |\n`;
md += `\n| № | 判定 | 点 | 理由（0・判定できないのみ） |\n|---|---|---|---|\n`;
for (const x of rows) md += `| ${x.id} | ${x.kind} | ${x.r === 1 ? 1 : x.raw === '判定できない' ? '判定できない(0)' : 0} | ${(x.note || '').replace(/\|/g, '／').replace(/\n/g, ' ')} |\n`;
md += `\n「人」（H1・H2）は採点しない。\n`;
fs.writeFileSync(path.join(dir, 'scores.md'), md);
console.log(`${ones}/${denom} = ${pct}%  必須★の0: ${starZero.join(',') || 'なし'}  ${pass ? '合格' : '不合格'}`);
