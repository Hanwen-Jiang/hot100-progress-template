// 检查进度仓是否符合规则：node scripts/check.mjs
// 规则见 README.md。网站按同样的规则读文件，这里不通过的文件网站也读不到。
import fs from "node:fs";
import path from "node:path";

const LANGS = {
  python: [".py"], java: [".java"], go: [".go"], cpp: [".cpp", ".cc"], c: [".c"],
  javascript: [".js"], typescript: [".ts"], rust: [".rs"], kotlin: [".kt"], swift: [".swift"], csharp: [".cs"],
};
const STATUS = new Set(["已通过", "曾通过", "尝试过", "未开始"]);
const errors = [], warnings = [];

const catalog = JSON.parse(fs.readFileSync("hot100.json", "utf8"));
const hot = new Map(catalog.problems.map((p) => [p.id, p]));

// 1) progress.json
let progress;
try {
  progress = JSON.parse(fs.readFileSync("progress.json", "utf8"));
} catch (e) {
  errors.push(`progress.json 不是合法的 JSON：${e.message}`);
}
if (progress) {
  if (progress.version !== 1) errors.push("progress.json 的 version 必须是 1");
  if (!progress.problems || typeof progress.problems !== "object" || Array.isArray(progress.problems)) errors.push("progress.json 的 problems 必须是一个对象");
  else {
    for (const [k, v] of Object.entries(progress.problems)) {
      if (!/^\d+$/.test(k)) errors.push(`progress.json：题号 "${k}" 不是数字`);
      else if (!hot.has(Number(k))) warnings.push(`progress.json：${k} 不在热题 100 里，网站不会显示`);
      if (!v || !STATUS.has(v.status)) errors.push(`progress.json：第 ${k} 题的 status 必须是 已通过 / 曾通过 / 尝试过 / 未开始`);
      if (v && v.updatedAt != null && !/^\d{4}-\d{2}-\d{2}$/.test(v.updatedAt)) errors.push(`progress.json：第 ${k} 题的 updatedAt 要写成 YYYY-MM-DD`);
    }
  }
}

// 2) solutions/<语言>/<四位题号>.<题名>[.<写法>].<后缀>
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])) : []);
for (const file of walk("solutions")) {
  const rel = file.split(path.sep).join("/");
  const base = path.basename(rel);
  if (base === ".gitkeep" || base === "README.md") continue;
  const parts = rel.split("/");
  if (parts.length !== 3) { errors.push(`${rel}：题解要直接放在 solutions/<语言>/ 下面，不要再分子目录`); continue; }
  const [, lang, name] = parts;
  if (!LANGS[lang]) { errors.push(`${rel}：不认识的语言目录 "${lang}"，可选 ${Object.keys(LANGS).join(" / ")}`); continue; }
  const ext = path.extname(name);
  if (!LANGS[lang].includes(ext)) errors.push(`${rel}：${lang} 目录下的文件后缀应该是 ${LANGS[lang].join(" 或 ")}`);
  const m = name.match(/^(\d{4})\.(.+)\.[A-Za-z0-9]+$/);
  if (!m) { errors.push(`${rel}：文件名要写成 <四位题号>.<题名>[.<写法>].<后缀>，比如 0001.两数之和.py`); continue; }
  const id = Number(m[1]);
  if (!hot.has(id)) warnings.push(`${rel}：${id} 不在热题 100 里，网站不会显示`);
  else if (!m[2].startsWith(hot.get(id).name)) warnings.push(`${rel}：题名建议和 hot100.json 一致（"${hot.get(id).name}"）`);
}

// 3) attempts/<四位题号>.<题名>/<YYYY-MM-DD>.<序号>.<结果>.md
//    解析规则和网站 site/functions/_lib/progress.ts 里的 parseAttemptPath / parseAttemptBody 一致
const RESULTS = ["通过", "答案错误", "超时", "运行出错", "思路不成立"];
const REQUIRED = ["错在哪里", "怎么发现的", "差在哪一步"];

function parseAttemptPath(p) {
  const m = p.match(/^attempts\/(\d{4})\.([^/]+)\/(\d{4}-\d{2}-\d{2})\.(\d+)\.([^./]+)\.md$/);
  if (!m || !RESULTS.includes(m[5])) return null;
  return { id: Number(m[1]), name: m[2], date: m[3], seq: Number(m[4]), result: m[5] };
}

function parseAttemptBody(src) {
  const errs = [];
  const text = src.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  if (!fm) errs.push("开头要有 --- 包起来的设置（至少写 lang）");
  else for (const line of fm[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kv = line.match(/^([A-Za-z]+):\s*(.*?)\s*(?:#.*)?$/);
    if (!kv) { errs.push(`设置里看不懂这一行：${line}`); continue; }
    meta[kv[1]] = kv[2];
  }
  const lang = meta.lang ?? "";
  if (fm && !LANGS[lang]) errs.push(`lang 要写成语言目录名之一：${Object.keys(LANGS).join(" / ")}`);
  if (meta.verbatim != null && meta.verbatim !== "true" && meta.verbatim !== "false") errs.push("verbatim 只能写 true 或 false");
  const body = fm ? text.slice(fm[0].length) : text;
  const sections = [];
  let code = null, codeLang = null;
  for (const chunk of body.split(/^## +/m).slice(1)) {
    const nl = chunk.indexOf("\n");
    const title = (nl < 0 ? chunk : chunk.slice(0, nl)).trim();
    const content = (nl < 0 ? "" : chunk.slice(nl + 1)).trim();
    if (title === "代码") {
      const c = content.match(/^(`{3,})([^\n`]*)\n([\s\S]*?)\n\1\s*$/);
      if (!c) errs.push("「代码」一节里要放且只放一个 ``` 代码块");
      else { code = c[3]; codeLang = c[2].trim() || null; }
    } else sections.push({ title, text: content });
  }
  return { lang, verbatim: meta.verbatim !== "false", sections, code, codeLang, errors: errs };
}

for (const file of walk("attempts")) {
  const rel = file.split(path.sep).join("/");
  const base = path.basename(rel);
  if (base === ".gitkeep" || rel === "attempts/README.md") continue;
  const parts = rel.split("/");
  if (parts.length !== 3) { errors.push(`${rel}：尝试记录要放在 attempts/<四位题号>.<题名>/ 下面，不要再分子目录`); continue; }
  if (!/^\d{4}\.[^.]+$/.test(parts[1])) { errors.push(`${rel}：目录名要写成 <四位题号>.<题名>，比如 attempts/0200.岛屿数量/`); continue; }
  const a = parseAttemptPath(rel);
  if (!a) { errors.push(`${rel}：文件名要写成 <YYYY-MM-DD>.<序号>.<结果>.md，结果是 ${RESULTS.join(" / ")} 之一，比如 2026-11-13.1.超时.md`); continue; }
  if (Number.isNaN(Date.parse(a.date))) errors.push(`${rel}：日期 ${a.date} 不是真实的日期`);
  if (a.seq < 1) errors.push(`${rel}：序号从 1 开始`);
  if (!hot.has(a.id)) warnings.push(`${rel}：${a.id} 不在热题 100 里，网站不会显示`);
  else if (a.name !== hot.get(a.id).name) warnings.push(`${rel}：目录里的题名建议和 hot100.json 一致（"${hot.get(a.id).name}"）`);
  const b = parseAttemptBody(fs.readFileSync(file, "utf8"));
  for (const e of b.errors) errors.push(`${rel}：${e}`);
  const titles = new Set(b.sections.map((s) => s.title));
  if (a.result === "通过") { if (!b.sections.some((s) => s.text)) errors.push(`${rel}：至少要有一节文字说明（比如 ## 说明）`); }
  else for (const t of REQUIRED) if (!titles.has(t)) errors.push(`${rel}：少了「## ${t}」一节`);
  for (const s of b.sections) if (!s.text) errors.push(`${rel}：「## ${s.title}」一节是空的`);
  if (a.result !== "思路不成立" && b.code == null && !b.errors.length) errors.push(`${rel}：结果是「${a.result}」时要有「## 代码」一节`);
}
const seen = new Map();
for (const file of walk("attempts")) {
  const a = parseAttemptPath(file.split(path.sep).join("/"));
  if (!a) continue;
  const key = `${a.id} ${a.date} ${a.seq}`;
  if (seen.has(key)) errors.push(`${file}：和 ${seen.get(key)} 的日期、序号重复了`);
  else seen.set(key, file);
}

for (const w of warnings) console.log("提示：" + w);
for (const e of errors) console.log("错误：" + e);
if (errors.length) {
  console.log(`\n有 ${errors.length} 处不符合规则，网站可能读不到这些数据。规则见 README.md。`);
  process.exit(1);
}
console.log("检查通过。");
