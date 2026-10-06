// 用「無畫面的瀏覽器」跑網頁版測試頁（web/street/test.html），會擋的測試全部通過才回傳 0。
// 用法：node tools/test-web.mjs          → 測本機的檔案（自己起一個小伺服器）
//       node tools/test-web.mjs --live   → 測線上網址（部署完確認用）
// 不用安裝任何套件：用電腦上的 Chrome／Edge（或 GitHub Actions 內建的 Chrome），透過 DevTools 協定操作。
// 找不到瀏覽器時可以用環境變數 CHROME_PATH 指定。回傳碼：0＝全過、1＝有測試沒過、2＝跑不起來
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url)), WEB = join(ROOT, "web");
const live = process.argv.includes("--live"), TIMEOUT = 240e3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = (msg, code = 2) => { console.log(`❌ ${msg}`); process.exit(code); };

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const win = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
  for (const p of win) if (existsSync(p)) return p;
  for (const n of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try { const p = execSync(`command -v ${n}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); if (p) return p; } catch {}
  }
  return null;
}

// 本機：簡單的靜態伺服器（不快取）
function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav" };
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = normalize(join(WEB, p));
    if (!f.startsWith(normalize(WEB))) { res.writeHead(403).end(); return; }
    try { const body = await readFile(f); res.writeHead(200, { "Content-Type": (types[extname(f)] || "application/octet-stream") + "; charset=utf-8", "Cache-Control": "no-store" }); res.end(body); }
    catch { res.writeHead(404).end("not found"); }
  });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r(srv)));
}

// DevTools 協定：送指令、等回覆
function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const wait = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
  const ready = new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  return { ready, send: (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }), close: () => ws.close() };
}

const browserPath = findBrowser();
if (!browserPath) fail("找不到 Chrome 或 Edge（可以用環境變數 CHROME_PATH 指定）");
let srv = null, url;
if (live) {
  const cfg = JSON.parse(readFileSync(join(ROOT, "workbench.config.json"), "utf8"));
  const play = (cfg.links || []).find(l => /試玩/.test(l.label));
  if (!play) fail("workbench.config.json 沒有「試玩」網址");
  url = new URL("test.html", play.url).href + `?nc=${Date.now()}`;
} else {
  srv = await serve();
  url = `http://127.0.0.1:${srv.address().port}/street/test.html`;
}

const profile = await mkdtemp(join(tmpdir(), "test-web-"));
const args = ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
  "--disable-gpu", "--mute-audio", "--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--window-size=1280,900", "about:blank"];
if (process.platform === "linux") args.unshift("--no-sandbox");
const browser = spawn(browserPath, args, { stdio: ["ignore", "ignore", "pipe"] });
let browserErr = "", browserExit = null;   // 啟動失敗時印出原因
browser.stderr.on("data", d => { browserErr = (browserErr + d).slice(-1500); });
browser.on("exit", code => { browserExit = code; });
const cleanup = async () => { try { browser.kill(); } catch {} if (srv) srv.close(); await sleep(300); await rm(profile, { recursive: true, force: true }).catch(() => {}); };

try {
  // 瀏覽器把連線埠寫在 DevToolsActivePort
  let port = null;
  // GitHub 的機器偶爾要 10 秒以上才開好，最多等 45 秒
  for (let i = 0; i < 450 && !port && browserExit === null; i++) { await sleep(100); try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0].trim(); } catch {} }
  if (!port) throw new Error(`瀏覽器沒有啟動${browserExit !== null ? `（結束代碼 ${browserExit}）` : "（45 秒內沒有回應）"}\n${browserErr.trim().split("\n").slice(-8).join("\n")}`);
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page");
  const c = cdp(page.webSocketDebuggerUrl); await c.ready;
  await c.send("Page.enable"); await c.send("Runtime.enable");
  console.log(`測試頁：${url}`);
  await c.send("Page.navigate", { url });
  const t0 = Date.now(); let res = null;
  while (Date.now() - t0 < TIMEOUT) {
    await sleep(1000);
    const r = await c.send("Runtime.evaluate", { expression: "window.SR_TEST_RESULTS ? JSON.stringify(SR_TEST_RESULTS.map(r => ({ id: r.id, name: r.name, pass: r.pass, report: !!r.report, value: String(r.value) }))) : null", returnByValue: true });
    if (r.result?.result?.value) { res = JSON.parse(r.result.result.value); break; }
  }
  const meta = (await c.send("Runtime.evaluate", { expression: "document.getElementById('meta')?.textContent || ''", returnByValue: true })).result?.result?.value || "";
  c.close();
  if (!res) throw new Error(`測試頁 ${TIMEOUT / 1000} 秒內沒有跑完（${meta}）`);
  const block = res.filter(r => !r.report), bad = block.filter(r => !r.pass), warn = res.filter(r => r.report && !r.pass);
  console.log(meta);
  for (const r of warn) console.log(`  ⚠ 報告 ${r.id}：${r.value}`);
  for (const r of bad) console.log(`  ✗ ${r.id} ${r.name}：${r.value}`);
  console.log(bad.length ? `❌ 網頁版測試 ${bad.length} 項沒過` : `✅ 網頁版測試 ${block.length}/${block.length} 通過`);
  await cleanup();
  process.exit(bad.length ? 1 : 0);
} catch (e) { await cleanup(); fail(`網頁版測試跑不起來：${e.message}`); }
