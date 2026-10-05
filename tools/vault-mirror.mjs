// 企劃文件雙向同步：Obsidian（彈珠專案/） ⇄ GitHub docs/企劃/（管理台讀寫這裡）
// 用法：git pull 之後執行 node tools/vault-mirror.mjs，再 commit＋push（企劃說「同步企劃文件」時 AI 執行）
// 第一次用：tools/vault.config.json 寫 {"vault_dir": "D:/.../魚的油雞文件"}（不進 git）
//
// 每個檔案記住上次同步時兩邊的內容指紋（docs/企劃/.mirror.json），所以知道是哪一邊改過：
//   只有 Obsidian 改 → 寫到 GitHub        只有 GitHub 改（管理台編輯）→ 寫回 Obsidian
//   兩邊都改 → 不動，列為「衝突」請人決定   GitHub 新增的文件（管理台新文件）→ 建到 Obsidian
//   Obsidian 刪掉的 → GitHub 也刪（GitHub 沒改過時）  管理台上傳的圖（圖/）→ 保留，並備份到 Obsidian
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname, relative, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfgPath = join(root, "tools", "vault.config.json");
if (!existsSync(cfgPath)) { console.error("找不到 tools/vault.config.json，請先填 vault_dir"); process.exit(1); }
const vault = JSON.parse(readFileSync(cfgPath, "utf8")).vault_dir;
const P = join(vault, "彈珠專案");
const OUT = join(root, "docs", "企劃");
const IMG = join(OUT, "圖");
const STATE = join(OUT, ".mirror.json");
const UPLOAD_BACKUP = join(P, "03 媒體庫", "管理台上傳");

// Obsidian 來源 → docs/企劃/ 目的地
const MAP = [
  ["回饋.md", "回饋.md"],
  ["04 紀錄/開發日誌.md", "開發日誌.md"],
  ["00 主架構規劃書.md", "規劃書/00 主架構規劃書.md"],
  ["01 功能規劃書", "規劃書"],
  ["02 知識庫", "知識庫"],
  ["03 媒體庫", "媒體庫"],
  ["Notion 匯入", "notion-import"],
];
// 公開 repo 只放自己的圖：試玩截圖、自家美術設計稿。別家遊戲截圖與網路參考圖只留在 Obsidian。
const PUBLIC_IMAGE = /^(試玩截圖|美術設計)-/;
const HEADER = "> 🔁 正本在 Obsidian，和這裡雙向同步：可以在管理台編輯，下次「同步企劃文件」會寫回 Obsidian。\n\n";
const OLD_HEADER = /^> 🔁 [^\n]*\n\n/m;

const hash = s => createHash("sha1").update(s).digest("hex").slice(0, 16);
const walk = d => (existsSync(d) ? readdirSync(d).flatMap(n => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : [f]; }) : []);
const rel = f => relative(OUT, f).replace(/\\/g, "/");
const read = f => readFileSync(f, "utf8").replace(/\r/g, "");
const imagesInVault = Object.fromEntries(walk(join(P, "03 媒體庫")).filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f)).map(f => [basename(f), f]));

// ---- Obsidian → GitHub 的轉換 ----
const sanitize = s => s
  .replace(/[A-Za-z]:\\[^\s`|）)"，,]*/g, "（本機路徑）")
  .replace(/https?:\/\/claude\.ai\/[^\s)|"，,]*/g, "（Claude 私人連結）");
function toRepo(md, outFile) {
  const toImg = relative(dirname(outFile), IMG).replace(/\\/g, "/");
  const body = s => s
    .replace(/!\[\[([^\]|#]+?\.(?:png|jpe?g|gif|webp))(?:\|[^\]]*)?\]\]/gi, (_, name) => {
      if (PUBLIC_IMAGE.test(name) && imagesInVault[name]) {
        mkdirSync(IMG, { recursive: true });
        copyFileSync(imagesInVault[name], join(IMG, name));
        return `![${name}](${encodeURI(`${toImg}/${name}`)})`;
      }
      return `（參考圖「${name}」只放在 Obsidian）`;
    })
    .replace(/!\[\[([^\]|]+?)\]\]/g, (_, ref) => `（見「${ref.replace("#", "・")}」）`)
    .replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_, page, sec, alias) => alias || (sec ? `${page}・${sec}` : page));
  const fm = md.match(/^---\n[\s\S]*?\n---\n/);
  return sanitize(fm ? fm[0] + "\n" + HEADER + body(md.slice(fm[0].length)) : HEADER + body(md));
}
// ---- GitHub → Obsidian 的還原（盡量還原成 Obsidian 的寫法） ----
function toVault(md) {
  return md.replace(/\r/g, "")
    .replace(OLD_HEADER, "")
    .replace(/^(---\n[\s\S]*?\n---\n)\n/, "$1")
    .replace(/（參考圖「([^」]+)」只放在 Obsidian）/g, "![[$1]]")
    .replace(/!\[([^\]]*)\]\((?:\.\.\/)*(?:%E5%9C%96|圖)\/([^)]+)\)/g, (_, alt, p) => `![[${decodeURI(p)}]]`)
    .replace(/（見「([^」]+)」）/g, (_, r) => `![[${r.replace("・", "#")}]]`);
}

// ---- 對照表：Obsidian 路徑 ⇄ docs/企劃 路徑 ----
const pairs = [];
for (const [src, dst] of MAP) {
  const from = join(P, src);
  if (!existsSync(from)) continue;
  if (statSync(from).isDirectory()) for (const f of walk(from)) pairs.push({ vaultFile: f, repoFile: join(OUT, dst, relative(from, f)) });
  else pairs.push({ vaultFile: from, repoFile: join(OUT, dst) });
}
const vaultPathFor = repoRel => {
  for (const [src, dst] of MAP) {
    if (repoRel === dst) return join(P, src);
    if (repoRel.startsWith(dst + "/") && !/\.md$/.test(src)) return join(P, src, repoRel.slice(dst.length + 1));
  }
  return null;
};

const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { files: {} };
const report = { toRepo: [], toVault: [], created: [], deleted: [], conflicts: [], uploads: [] };
mkdirSync(OUT, { recursive: true });

// 1. 每一個 Obsidian 檔案
for (const { vaultFile, repoFile } of pairs) {
  const ext = extname(vaultFile).toLowerCase();
  if (ext !== ".md" && ext !== ".csv") continue;
  const key = rel(repoFile);
  const vaultText = read(vaultFile), vH = hash(vaultText);
  const repoText = existsSync(repoFile) ? read(repoFile) : null, rH = repoText === null ? null : hash(repoText);
  const st = state.files[key];
  const vaultChanged = !st || st.vault !== vH;
  const repoChanged = st && rH !== st.repo;
  if (st && repoChanged && vaultChanged) { report.conflicts.push(key); continue; }
  if (st && repoChanged && rH !== null) {
    const back = ext === ".md" ? toVault(repoText) : repoText;
    writeFileSync(vaultFile, back);
    state.files[key] = { src: relative(P, vaultFile).replace(/\\/g, "/"), vault: hash(back), repo: rH };
    report.toVault.push(key);
    continue;
  }
  if (st && repoChanged && rH === null) { report.conflicts.push(key + "（在 GitHub 被刪掉）"); continue; }
  const out = ext === ".md" ? toRepo(vaultText, repoFile) : sanitize(vaultText);
  if (out !== repoText) { mkdirSync(dirname(repoFile), { recursive: true }); writeFileSync(repoFile, out); if (st) report.toRepo.push(key); }
  state.files[key] = { src: relative(P, vaultFile).replace(/\\/g, "/"), vault: vH, repo: hash(out) };
}

// 2. Obsidian 刪掉的檔案：GitHub 沒改過就一起刪
const vaultKeys = new Set(pairs.map(p => rel(p.repoFile)));
for (const [key, st] of Object.entries(state.files)) {
  if (vaultKeys.has(key)) continue;
  const repoFile = join(OUT, key);
  if (!existsSync(repoFile)) { delete state.files[key]; continue; }
  if (hash(read(repoFile)) === st.repo) { rmSync(repoFile); delete state.files[key]; report.deleted.push(key); }
  else report.conflicts.push(key + "（Obsidian 刪了，但 GitHub 改過）");
}

// 3. GitHub 新增的文件（管理台「新文件」）→ 建到 Obsidian
for (const f of walk(OUT)) {
  const key = rel(f);
  if (key.startsWith("圖/") || key === "README.md" || key === ".mirror.json" || state.files[key]) continue;
  if (!/\.(md|csv)$/i.test(key)) continue;
  const target = vaultPathFor(key);
  if (!target) { report.conflicts.push(key + "（不知道要放到 Obsidian 哪裡）"); continue; }
  if (existsSync(target)) { report.conflicts.push(key + "（Obsidian 已有同名檔案）"); continue; }
  const text = read(f), back = key.endsWith(".md") ? toVault(text) : text;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, back);
  state.files[key] = { src: relative(P, target).replace(/\\/g, "/"), vault: hash(back), repo: hash(text) };
  report.created.push(key);
}

// 4. 管理台上傳的圖（不是從 Obsidian 複製來的）→ 保留在 GitHub，並備份到 Obsidian
for (const f of walk(IMG)) {
  const name = basename(f), key = rel(f);
  if (imagesInVault[name] && PUBLIC_IMAGE.test(name)) continue;
  const backup = join(UPLOAD_BACKUP, relative(IMG, f));
  if (!existsSync(backup)) { mkdirSync(dirname(backup), { recursive: true }); copyFileSync(f, backup); report.uploads.push(key); }
}

writeFileSync(STATE, JSON.stringify(state, null, 1) + "\n");
writeFileSync(join(OUT, "README.md"), `# 企劃文件

${HEADER}| 內容 | 檔案 |
|---|---|
| 試玩回饋 | [回饋.md](回饋.md) |
| 開發日誌 | [開發日誌.md](開發日誌.md) |
| 主架構規劃書、F01～F15（背景說明；正式規則在 \`docs/spectra/specs/\`） | [規劃書/](規劃書/) |
| 劇情、角色、名詞、數值、世界觀 | [知識庫/](知識庫/) |
| 美術風格、素材清單 | [媒體庫/](媒體庫/) |
| 圖（試玩截圖、管理台上傳的素材與回饋截圖） | [圖/](圖/) |
| Notion 匯入用 CSV | [notion-import/](notion-import/) |
`);

const line = (label, list) => list.length && console.log(`${label}（${list.length}）：\n  ${list.join("\n  ")}`);
console.log(`同步完成：${pairs.length} 個 Obsidian 檔案`);
line("Obsidian → GitHub", report.toRepo);
line("GitHub → Obsidian（管理台的修改）", report.toVault);
line("管理台新增的文件 → Obsidian", report.created);
line("Obsidian 刪掉 → GitHub 也刪", report.deleted);
line("管理台上傳的圖 → 備份到 Obsidian", report.uploads);
if (report.conflicts.length) { line("⚠️ 衝突（兩邊都改過，沒有動，請人決定保留哪一邊）", report.conflicts); process.exitCode = 2; }
