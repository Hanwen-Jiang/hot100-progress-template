# Hot 100 进度仓

这是力扣「[热题 100](https://leetcode.cn/studyplan/top-100-liked/)」的**个人进度仓库**：记录你每道题的状态，存放你自己写的题解。

题目、分层提示、动画演示和标准题解在网站 **https://leetcode.cgent.link** 上。用 GitHub 登录网站后，它会读取你账号下的 `hot100-progress` 仓库，显示你自己的进度和题解；在网站上改的状态也会直接提交到这个仓库。

## 怎么开始

- **推荐**：打开网站，用 GitHub 登录，按提示一键创建。网站会用这个模板在你的账号下生成一个 `hot100-progress` 仓库。
- **手动**：点右上角的 **Use this template → Create a new repository**，仓库名填 `hot100-progress`（名字要一致，网站按这个名字找）。

## 文件规则

网站和自动检查都按下面的规则读文件，不符合规则的文件读不到。每次 push 后，GitHub Actions 里的 `check` 会检查一遍。

### 1. 进度：`progress.json`

```json
{
  "version": 1,
  "problems": {
    "1": { "status": "已通过", "updatedAt": "2026-11-14" },
    "146": { "status": "曾通过", "updatedAt": "2026-10-02" }
  }
}
```

- 键是题号（字符串），值里的 `status` 只能是 `已通过`、`曾通过`、`未开始` 三者之一。
- 没出现在 `problems` 里的题都算 `未开始`。刚创建的仓库是空的，也就是 0 进度。
- `updatedAt` 可选，格式 `YYYY-MM-DD`。

### 2. 题解：`solutions/<语言>/<四位题号>.<题名>[.<写法>].<后缀>`

| 语言目录 | 后缀 |
| --- | --- |
| `python` | `.py` |
| `java` | `.java` |
| `go` | `.go` |
| `cpp` | `.cpp` |
| `c` | `.c` |
| `javascript` | `.js` |
| `typescript` | `.ts` |
| `rust` | `.rs` |
| `kotlin` | `.kt` |
| `swift` | `.swift` |
| `csharp` | `.cs` |

- 题号补齐到四位，题名照抄 `hot100.json` 里的 `name`，例如 `solutions/python/0001.两数之和.py`、`solutions/java/0146.LRU 缓存.java`。
- 同一道题的多种写法，在题名后面加一段写法名：`solutions/python/0200.岛屿数量.BFS.py`。
- 用力扣插件生成的 Java 文件，网站只显示 `submit region` 标记之间的代码，本地测试代码不会出现在页面上。
- 不在热题 100 里的题也可以放进来，网站暂时不显示，但不会报错。

`hot100.json` 是 100 道题的清单（题号、题名、难度、专题、重要程度、建议的文件名），新建文件时照着它取名最省事。

## 不要做的事

- 不要改 `progress.json` 的整体结构，也不要删掉 `version` 字段。
- 不要把账号、密码、令牌之类的东西提交进来——这是公开仓库。
