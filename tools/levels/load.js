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
module.exports = { load, JS };
