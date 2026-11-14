// 检查进度仓是否符合规则：node scripts/check.mjs
// 规则见 README.md。网站按同样的规则读文件，这里不通过的文件网站也读不到。
import fs from "node:fs";
import path from "node:path";

const LANGS = {
  python: [".py"], java: [".java"], go: [".go"], cpp: [".cpp", ".cc"], c: [".c"],
  javascript: [".js"], typescript: [".ts"], rust: [".rs"], kotlin: [".kt"], swift: [".swift"], csharp: [".cs"],
};
const STATUS = new Set(["已通过", "曾通过", "未开始"]);
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
      if (!v || !STATUS.has(v.status)) errors.push(`progress.json：第 ${k} 题的 status 必须是 已通过 / 曾通过 / 未开始`);
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

for (const w of warnings) console.log("提示：" + w);
for (const e of errors) console.log("错误：" + e);
if (errors.length) {
  console.log(`\n有 ${errors.length} 处不符合规则，网站可能读不到这些数据。规则见 README.md。`);
  process.exit(1);
}
console.log("检查通过。");
