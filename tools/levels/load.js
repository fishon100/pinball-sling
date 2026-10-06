/* 在 Node 裡載入遊戲的資料檔（不需要瀏覽器）：export.js、sync.js 共用 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const JS = path.join(__dirname, "..", "..", "web", "street", "js");

function load(files, extra = {}) {
  const ctx = { console, Math, JSON, Date, setTimeout, performance: { now: () => Date.now() }, ...extra };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.location = { search: "", hash: "" };
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  ctx.fetch = () => Promise.reject(new Error("no fetch in node"));
  // 瀏覽器才有的東西：給空的替代品，讓測試能在 Node 跑（不畫畫面）
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {};
  ctx.requestAnimationFrame = () => 0; ctx.innerWidth = 400; ctx.innerHeight = 800; ctx.devicePixelRatio = 1;
  ctx.matchMedia = () => ({ matches: false, addEventListener() {} });
  const el = () => ({ getContext: () => null, addEventListener() {}, style: {}, hidden: true, classList: { add() {}, remove() {}, toggle() {} } });
  ctx.document = ctx.document || { getElementById: el, createElement: el, querySelector: () => null, querySelectorAll: () => [], body: el(), head: el(), readyState: "complete", addEventListener() {} };
  vm.createContext(ctx);
  for (const f of files) {
    const code = typeof f === "string" ? fs.readFileSync(path.join(JS, f), "utf8") : f.code;
    vm.runInContext(code, ctx, { filename: typeof f === "string" ? f : f.name });
  }
  return ctx;
}
// 試算表的 CSV → 一列一個物件（欄位名稱當 key）
function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(c => c.trim() !== "")).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// 給企劃看的差異清單：「第 N 關：欄位、欄位」／「台面 xxx」。
// 遊戲目前是編輯器送出的版本（source＝editor）時，用表蓋過去會蓋掉編輯器的修改 → 每一行都標 ⚠
function diffLines(current, next) {
  const SR = load(["levelcheck.js"]).SR, warn = current.source === "editor" ? "  ⚠ 會蓋掉編輯器的修改" : "";
  return SR.LevelCheck.diff(current, next).map(x => (x.layout ? `台面 ${x.layout}` : `第 ${x.n} 關：${x.columns.join("、")}`) + warn);
}

module.exports = { load, JS, parseCsv, diffLines };
