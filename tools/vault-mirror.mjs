// 把 Obsidian（正本）的企劃文件鏡像到 docs/企劃/，讓任何帳號的 AI 都能從 GitHub 讀到。
// 用法：node tools/vault-mirror.mjs        （企劃說「同步企劃文件」時執行）
// 第一次用：tools/vault.config.json 寫 {"vault_dir": "D:\\...\\魚的油雞文件"}（不進 git）
// docs/企劃/ 每次整個重建：不要在那裡改東西，改 Obsidian（或之後的 Notion）。
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, relative, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfgPath = join(root, "tools", "vault.config.json");
if (!existsSync(cfgPath)) { console.error("找不到 tools/vault.config.json，請先填 vault_dir"); process.exit(1); }
const vault = JSON.parse(readFileSync(cfgPath, "utf8")).vault_dir;
const P = join(vault, "彈珠專案");
const OUT = join(root, "docs", "企劃");
const IMG = join(OUT, "圖");

// 來源 → 目的地（相對 docs/企劃/）
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

const walk = d => readdirSync(d).flatMap(n => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : [f]; });
const imagesInVault = Object.fromEntries(walk(join(P, "03 媒體庫")).filter(f => /\.(png|jpe?g|gif|webp)$/i.test(f)).map(f => [basename(f), f]));

// 公開 repo 不放本機路徑與私人連結（Obsidian 裡保留原文）
const sanitize = s => s
  .replace(/[A-Za-z]:\\[^\s`|）)"，,]*/g, "（本機路徑）")
  .replace(/https?:\/\/claude\.ai\/[^\s)|"，,]*/g, "（Claude 私人連結）");

function convert(md, outFile) {
  const toImg = relative(dirname(outFile), IMG).replace(/\\/g, "/");
  return md
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
}

// 清空 docs/企劃/ 的內容再重建（不刪資料夾本身，避免被開著時刪不掉）
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) rmSync(join(OUT, name), { recursive: true, force: true });
let n = 0;
const header = "> 🔁 鏡像自 Obsidian（正本），請不要在這裡改；更新方式：對 AI 說「同步企劃文件」。\n\n";
for (const [src, dst] of MAP) {
  const from = join(P, src);
  if (!existsSync(from)) { console.warn(`略過（Obsidian 裡沒有）：${src}`); continue; }
  const files = statSync(from).isDirectory() ? walk(from).map(f => [f, join(OUT, dst, relative(from, f))]) : [[from, join(OUT, dst)]];
  for (const [f, to] of files) {
    const ext = extname(f).toLowerCase();
    if (ext !== ".md" && ext !== ".csv") continue; // 圖檔只在被引用、且可公開時才複製
    mkdirSync(dirname(to), { recursive: true });
    if (ext === ".csv") writeFileSync(to, sanitize(readFileSync(f, "utf8")));
    else {
      let md = readFileSync(f, "utf8").replace(/\r/g, "");
      const fm = md.match(/^---\n[\s\S]*?\n---\n/);
      md = sanitize(fm ? fm[0] + "\n" + header + convert(md.slice(fm[0].length), to) : header + convert(md, to));
      writeFileSync(to, md);
    }
    n++;
  }
}
writeFileSync(join(OUT, "README.md"), `# 企劃文件（鏡像）

${header}| 內容 | 檔案 |
|---|---|
| 試玩回饋 | [回饋.md](回饋.md) |
| 開發日誌 | [開發日誌.md](開發日誌.md) |
| 主架構規劃書、F01～F15（背景說明；正式規則在 \`docs/spectra/specs/\`） | [規劃書/](規劃書/) |
| 劇情、角色、名詞、數值、世界觀 | [知識庫/](知識庫/) |
| 美術風格、素材清單 | [媒體庫/](媒體庫/) |
| Notion 匯入用 CSV | [notion-import/](notion-import/) |

最後同步：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}
`);
console.log(`已同步 ${n} 個檔案 → docs/企劃/`);
