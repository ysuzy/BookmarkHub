<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/dudor/BookmarkHub">
    <img src="images/icon128.png" alt="BookmarkHub" >
  </a>

  <h1 align="center">BookmarkHub</h1>
  <p align="center">
    BookmarkHub 是一款浏览器插件，可以在不同浏览器之间同步你的书签。
    <br />
    <a href="https://github.com/dudor/BookmarkHub/issues">反馈问题</a>
    ·
    <a href="/README_cn.md">简体中文</a>
    ·
    <a href="/README.md">English</a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/dudor/BookmarkHub/releases"><img src="https://img.shields.io/badge/version-v0.1.0+-blue.svg" alt="Version"></a>
  <a href="https://github.com/dudor/BookmarkHub/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
  <a href="https://chrome.google.com/webstore/detail/bookmarkhub-sync-bookmark/fohimdklhhcpcnpmmichieidclgfdmol"><img src="https://img.shields.io/badge/chrome-available-brightgreen.svg" alt="Chrome"></a>
  <a href="https://addons.mozilla.org/zh-CN/firefox/addon/BookmarkHub/"><img src="https://img.shields.io/badge/firefox-available-brightgreen.svg" alt="Firefox"></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/BookmarkHub/fdnmfpogadcljhecfhdikdecbkggfmgk"><img src="https://img.shields.io/badge/edge-available-brightgreen.svg" alt="Edge"></a>
</p>

<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary><h2 style="display: inline-block">目录</h2></summary>
  <ol>
    <li><a href="#关于">关于</a></li>
    <li><a href="#功能">功能</a></li>
    <li><a href="#v010-新特性">v0.1.0+ 新特性</a></li>
    <li><a href="#下载安装">下载安装</a></li>
    <li><a href="#使用方法">使用方法</a>
      <ul>
        <li><a href="#基础用法书签同步">基础用法（书签同步）</a></li>
        <li><a href="#定时自动同步新">定时自动同步（新）</a></li>
        <li><a href="#ai-整理书签新">AI 整理书签（新）</a></li>
      </ul>
    </li>
    <li><a href="#自建-ai-后端">自建 AI 后端</a></li>
    <li><a href="#待实现的功能">待实现的功能</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## 关于

BookmarkHub 是一款浏览器插件，可以在不同浏览器之间同步你的书签。

适用于各大主流浏览器，如 Chrome、Firefox、Microsoft Edge 等。

它使用 GitHub 的 Gist 记录来存储浏览器的书签，可以放心安全的使用。

![BookmarkHub](images/3.gif)

![BookmarkHub](images/1.png)

![BookmarkHub](images/2.png)

## 功能

**书签同步**
* 不需要注册特殊账号，只需要用你的 GitHub 账号的 Token 和 Gist
* 一键上传下载书签
* 一键清空本地所有书签
* 支持跨电脑跨浏览器同步书签
* 支持显示本地和远程书签的数量
* 浏览器启动时自动同步（可配置）

**定时自动同步** *(v0.1.0+ 新功能)*
* 后台定时自动同步（15 分钟 – 72 小时可配），再也不用手动记得同步
* 三种同步方向：**上传**（本地 → Gist）、**下载**（Gist → 本地）、**双向同步**
* 可选「浏览器启动时同步」—— Chrome 一启动就立刻拉取最新书签
* 选项页提供「立即运行」按钮，可手动触发一次
* 省电省 API 配额：使用 Chrome `alarms` API（兼容 MV3 Service Worker，MV3 已禁用 `setInterval`）；Service Worker 只在定时时刻唤醒，跑完即休眠
* 健壮的失败处理：缺少配置 → 桌面通知；与手动同步冲突 → 静默跳过；网络失败 → 不更新「上次同步」时间戳

**AI 整理书签** *(v0.1.0+ 新功能)*
* 一键把所有书签用大模型自动分成 10 大类（技术开发 / AI 工具 / 学习教育 / 在线工具 / 社交媒体 / 娱乐休闲 / 购物消费 / 金融理财 / 新闻资讯 / 生活服务 / 其他）
* 内置 LLM 归一化层，处理分类偏差
* 实时进度弹窗，带"任务卡住？重置"逃生口
* 整理结果写入 Gist 顶级新增的 `AIOrganized` 根目录
* **后端自建可控** —— 你的 Token、书签、API Key 全都在你本地

## v0.1.0+ 新特性

**亮点功能**

* 🤖 **AI 整理书签** —— 一键用大模型把全部书签分到 10 大类（详见 [使用方法 → AI 整理书签](#ai-整理书签新)）。
* ⏰ **定时自动同步** —— 后台定时自动同步（15 分钟 – 72 小时可配），三种方向（上传 / 下载 / 双向），可选「浏览器启动时同步」触发器。使用 Chrome `alarms` API（兼容 MV3 Service Worker），两次同步之间 Service Worker 始终休眠。详见 [使用方法 → 定时自动同步](#定时自动同步新)。
* ⚡ **启动自动同步** —— 浏览器启动时可自动从 Gist 拉取最新书签。
* 🎯 **实时进度 UI** —— 选项页点开始后自动弹 popup，进度条实时刷新，附"卡住重置"按钮。
* 📊 **结果汇总弹框** —— 完成后在选项页弹出汇总弹框，分类明细 + 一键"下载书签"同步到本地。
* 🔒 **隐私优先** —— 后端地址**绝不**默认填入任何示例，必须由用户主动配置自己的自建地址。无任何遥测。

**Bug 修复**

* 修复 Chrome MV3 `messages.json` 混合格式 i18n Bug（部分 locale 用扁平字符串、部分用对象格式 → Chrome 静默拒载）。
* 修复选项页汇总弹框：之前依赖 popup 通过 `chrome.alarms` 自动弹出，因 service worker 休眠机制不可靠。
* 新增 [`scripts/validate_locales.py`](../scripts/validate_locales.py) —— 任何 i18n PR 提交前先跑一遍，防止格式回退。

**自建者必看**

* **移除了硬编码的默认后端地址** —— v0.1.0+ 默认值为空字符串，你必须**主动填入**自己的后端 URL。
* 详细搭建指南见 [自建 AI 后端](#自建-ai-后端)，5 分钟搞定。

**升级提示**

* 之前用过托管 AI 后端的用户，现在需要自建（参考下文）。
* 没用过 AI 整理功能的用户不受影响。

## 下载安装

> 本插件需要把书签存储到 Gist 中，所以请确保有 GitHub 账号或可以通过网络注册 GitHub 账号。

* [Chrome 浏览器](https://chrome.google.com/webstore/detail/bookmarkhub-sync-bookmark/fohimdklhhcpcnpmmichieidclgfdmol)
* [Firefox 浏览器](https://addons.mozilla.org/zh-CN/firefox/addon/BookmarkHub/)
* [Microsoft Edge 浏览器](https://microsoftedge.microsoft.com/addons/detail/BookmarkHub/fdnmfpogadcljhecfhdikdecbkggfmgk)
* [其他基于 Chromium 内核的浏览器](https://chrome.google.com/webstore/detail/bookmarkhub-sync-bookmark/fohimdklhhcpcnpmmichieidclgfdmol)

如果想用最新的未发布版本，参考 [从源码构建](#从源码构建)。

<!-- USAGE EXAMPLES -->
## 使用方法

### 基础用法（书签同步）

1. [登陆](https://github.com/login) GitHub，如果没有账号请点此[注册](https://github.com/join)。
2. [创建一个可以管理 gist 的 token](https://github.com/settings/tokens/new)。
3. [创建一个私有的 gist](https://gist.github.com)。**注意：如果是公开的 gist，你的书签是可以被他人搜索到的。**
4. 在浏览器的应用商店下载 BookmarkHub，点击插件的设置按钮，在弹出的设置窗口填入 token 和 gist ID，然后你就可以上传下载书签了。

### 定时自动同步 *(v0.1.0+ 新功能)*

> 不用再记得点同步。BookmarkHub 可以在后台按计划运行，让你的本地书签和 Gist 自动保持一致。

**工作原理**

BookmarkHub 使用 Chrome `alarms` API（兼容 MV3 Service Worker）来调度后台同步。Service Worker 会在配置的时间点被唤醒、执行一次同步、然后重新休眠——你的电脑和浏览器在两次同步之间完全空闲。

* **默认间隔**：60 分钟
* **最小间隔**：15 分钟（硬编码——Chrome `alarms` API 理论支持 1 分钟，但低于 15 分钟的值会被内部强制提升到 15 分钟，以避免触发 GitHub API 限流和频繁唤醒 Service Worker）
* **可选间隔**：`15 分钟` / `30 分钟` / `1 小时` / `2 小时` / `6 小时` / `12 小时` / `24 小时` / `48 小时` / `72 小时`
* **不用 `setInterval`**：MV3 Service Worker 在闲置约 30 秒后会被强制终止，`setInterval` 在 MV3 下完全不可靠。`alarms` API 是 MV3 下唯一可靠的后台任务方式。
* **持久化**：alarm 在扩展安装/更新时、浏览器启动时、以及你保存设置时都会重新创建/刷新。在选项页关闭该功能会立即清除 alarm。

**三种同步方向**

| 方向 | 行为 | 典型使用场景 |
|------|------|-------------|
| `上传`（本地 → Gist） | 把本地书签推到 Gist | 主要在这台机器上编辑书签 |
| `下载`（Gist → 本地） | 从 Gist 拉取最新书签 | 在另一机器上编辑，这台机器跟随 |
| `双向同步`（先下载后上传） | 先拉后推 | 在多台机器上编辑 |

**可选：浏览器启动时同步**

除了定时计划之外，你还可以启用「**浏览器启动时同步**」，让浏览器一启动就立刻触发一次同步。最常见的流程：打开 Chrome → 书签就已经是最新的。

**失败处理**

* **缺少配置**（没填 Token / Gist ID / 文件名）→ 跳过本次同步，弹桌面通知（如果开启了通知）。`上次自动同步` 时间戳**不**更新。
* **另一个操作正在进行中**（手动上传/下载、AI 整理等）→ 静默跳过本次自动同步，等下一个 alarm 周期再试。
* **网络 / API 失败** → `上次自动同步` 时间戳**不**更新。可在 Service Worker 控制台查日志：`chrome://extensions` → BookmarkHub → **Service Worker** 链接。
* **自动同步和手动同步撞车**会通过内部锁（`curOperType`）互斥——不会发生竞态，不会重复上传。

**如何启用**

1. 打开 **选项** 页（右键扩展图标 → 选项，或访问 `chrome-extension://<id>/options.html`）。
2. 滚到 **「定时自动同步」** 区域。
3. 勾选 **「启用自动同步」**。
4. 选择 **同步间隔** 和 **同步方向**。
5. （可选）勾选 **「浏览器启动时同步」**。
6. 点击 **「保存」**。Service Worker 立刻创建/刷新 alarm——无需重启浏览器。
7. （可选）点 **「立即运行」** 立刻触发一次同步，不用等下一个时间点。

`上次自动同步` 字段会显示最近一次成功的自动同步时间戳。

### AI 整理书签（新）

> **需要自建后端** —— 参考 [自建 AI 后端](#自建-ai-后端)。

后端跑起来之后：

1. 打开 **选项页**（右键插件图标 → 选项，或者访问 `chrome-extension://<id>/options.html`）。
2. 找到 **"AI 整理"** 区块。
3. 在 **AI 整理后端地址** 填入你的后端 URL，例如 `http://localhost:18903`。
4. （可选）调整其他 AI 选项。
5. 点击 **"🚀 开始 AI 整理"** 按钮。
6. 浏览器自动弹出 popup 窗口，进度条实时刷新。
7. 完成后弹出 **汇总弹框**，显示分类明细。点 **"下载书签"** 把分类结果同步到本地。

**原理**

* 后端用你插件里已配的 Token / Gist ID 读取你的书签
* 每个书签的 URL 抓取 title + description 后批量发给 LLM 分类
* LLM 从 10 个固定大类里选
* 结果写回 Gist 顶级新增的 `AIOrganized` 根目录，每个分类一个子文件夹
* 在插件里点 "下载书签" → 新的目录结构同步到你的浏览器

**10 大分类**

| # | 分类 | 示例 |
|---|------|------|
| 1 | 技术开发 | GitHub、Stack Overflow、MDN、开发者工具 |
| 2 | AI 工具 | ChatGPT、Claude、Midjourney、Cursor |
| 3 | 学习教育 | 在线课程、教程、文档、学校 |
| 4 | 在线工具 | 格式转换、计算器、临时邮箱、网盘 |
| 5 | 社交媒体 | Twitter、微博、知乎、YouTube、Discord |
| 6 | 娱乐休闲 | 视频、游戏、音乐、漫画 |
| 7 | 购物消费 | 京东、淘宝、Amazon、比价 |
| 8 | 金融理财 | 银行、股票、加密货币钱包、交易所 |
| 9 | 新闻资讯 | 新闻媒体、博客、播客 |
| 10 | 生活服务 | 美食、出行、天气、招聘 |

如果 LLM 分类结果超过 10 个，最少的那几个会被合并到"其他"。

**常见问题**

* **"后端地址未配置"** —— 去选项页填后端地址。
* **"任务卡在 0%"** —— 点 popup 里的 **"⚠️ 任务卡住了？点这里重置"** 按钮重试，同时检查后端 `server.log`。
* **"403 Forbidden"** —— Token 失效或权限不足，重新创建一个 gist token。
* **分类结果不对劲** —— 检查 LLM 模型是否可达，参考后端日志。

## 自建 AI 后端

> **为什么要自建？** 因为 AI 整理需要读你的 Gist 和调用 LLM，后端跑在**你自己的机器**上，Token 和书签**完全不出你的控制**。

**最低要求**：Python 3.10+、512 MB 内存、能访问任意 OpenAI 兼容的 LLM API。

**5 分钟搭建**：

```bash
# 1. 拉取后端代码（独立仓库）
git clone https://github.com/your-name/BookmarkHub-AI-Organizer.git
cd BookmarkHub-AI-Organizer

# 也可以把代码放在任意你喜欢的目录，后端是自包含的。

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
export MINIMAX_API_KEY="sk-xxxxxxxxxxxxxxxx"   # 你的 LLM API key
export MINIMAX_MODEL="abab6.5s-chat"            # 或任意 OpenAI 兼容模型
export PORT=18903

# 4. 启动服务
python3 main.py
# 或者直接用 uvicorn：
uvicorn main:app --host 0.0.0.0 --port 18903
```

**验证服务**：

```bash
curl http://localhost:18903/api/health
# 期望返回：{"status": "ok"}
```

**在插件里配置**：

* 打开选项页 → AI 整理后端地址 → 填 `http://localhost:18903`（远程就填你的公网 URL）。

**API 接口**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/organize/start` | 启动整理任务 |
| GET | `/api/organize/{task_id}/status` | 轮询进度 |
| GET | `/api/organize/{task_id}/result` | 获取最终结果 |
| GET | `/api/health` | 健康检查 |

完整文档见 [`docs/AI_ORGANIZER.md`](docs/AI_ORGANIZER.md)。

## 从源码构建

```bash
git clone https://github.com/dudor/BookmarkHub.git
cd BookmarkHub
pnpm install
pnpm build           # 产物在 .output/chrome-mv3/
# 在 chrome://extensions 加载 .output/chrome-mv3/ 为未打包扩展
```

<!-- ROADMAP -->
## 待实现的功能

- [x] 浏览器启动时自动同步书签 *（v0.1.0+ 已发布）*
- [x] 后台定时自动同步（间隔可配）*（v0.1.0+ 已发布）*
- [x] AI 整理书签 *（v0.1.0+ 已发布）*
- [ ] 支持 WebDAV 协议
- [ ] 移动端
- [ ] 导入导出（HTML、JSON）
- [ ] 分享书签

<!-- LICENSE -->
## License

See `LICENSE` for more information.

<!-- CONTACT -->
## Contact

dudor

Project Link: [https://github.com/dudor/BookmarkHub](https://github.com/dudor/BookmarkHub)