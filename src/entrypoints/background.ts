import BookmarkService from '../utils/services'
import { Setting } from '../utils/setting'
import iconLogo from '../assets/icon.png'
import { OperType, BookmarkInfo, SyncDataInfo, RootBookmarksType, BrowserType } from '../utils/models'
import { Bookmarks } from 'wxt/browser'

// =============== 定时自动同步常量 ===============
const ALARM_NAME = 'bookmarkhub-auto-sync';           // alarm 名（固定）
const MIN_INTERVAL_MIN = 15;                          // 最小间隔 15 分钟
const DEFAULT_INTERVAL_MIN = 60;                      // 默认间隔 60 分钟

// =============== AI 整理书签常量 ===============
const AI_ORGANIZE_STATE_KEY = 'aiOrganizeState';      // storage key
const AI_ORGANIZE_POLL_ALARM = 'bookmarkhub-ai-organize-poll'; // 轮询 alarm (1 分钟)
const AI_ORGANIZE_TIMEOUT_MS = 30 * 60 * 1000;        // 30 分钟超时

export default defineBackground(() => {

  browser.runtime.onInstalled.addListener(c => {
    // 安装/更新后，初始化 alarm
    refreshAlarm().catch(err => console.error('init alarm error:', err));
  });

  let curOperType = OperType.NONE;
  let curBrowserType = BrowserType.CHROME;
  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.name === 'upload') {
      curOperType = OperType.SYNC
      // ===== 触发源 02：手动上传 =====
      uploadBookmarks().then(async (ok) => {
        curOperType = OperType.NONE
        browser.action.setBadgeText({ text: "" });
        await refreshLocalCount();
        if (ok) {
          // 手动上传成功后，更新统一同步时间
          await setLastSyncAt('manual');
        }
        sendResponse(true);
      });
    }
    if (msg.name === 'download') {
      curOperType = OperType.SYNC
      // ===== 触发源 02：手动下载 =====
      downloadBookmarks().then(async (ok) => {
        curOperType = OperType.NONE
        browser.action.setBadgeText({ text: "" });
        await refreshLocalCount();
        if (ok) {
          // 手动下载成功后，更新统一同步时间
          await setLastSyncAt('manual');
        }
        sendResponse(true);
      });

    }
    if (msg.name === 'removeAll') {
      curOperType = OperType.REMOVE
      clearBookmarkTree().then(() => {
        curOperType = OperType.NONE
        browser.action.setBadgeText({ text: "" });
        refreshLocalCount();
        sendResponse(true);
      });

    }
    if (msg.name === 'setting') {
      browser.runtime.openOptionsPage().then(() => {
        sendResponse(true);
      });
    }
    // ===== 新增：手动触发刷新 alarm 的消息（用于设置页保存后立即生效） =====
    if (msg.name === 'refreshAutoSync') {
      refreshAlarm().then(() => sendResponse(true)).catch(err => {
        console.error(err);
        sendResponse(false);
      });
      return true;
    }
    // ===== 新增：手动触发立即自动同步 =====
    if (msg.name === 'runAutoSyncNow') {
      runAutoSync().then(() => sendResponse(true)).catch(err => {
        console.error(err);
        sendResponse(false);
      });
      return true;
    }
    // ===== 新增：启动 AI 整理书签任务 =====
    if (msg.name === 'aiOrganizeStart') {
      aiOrganizeStart()
        .then(res => sendResponse(res))
        .catch(err => {
          console.error('[aiOrganize] start error:', err);
          sendResponse({ ok: false, error: String(err?.message || err) });
        });
      return true;
    }
    // ===== 新增：获取 AI 整理状态 =====
    if (msg.name === 'aiOrganizeGetState') {
      aiOrganizeGetState()
        .then(res => sendResponse(res))
        .catch(err => {
          console.error('[aiOrganize] getState error:', err);
          sendResponse({ ok: false, error: String(err?.message || err) });
        });
      return true;
    }
    // ===== 新增：清除 AI 整理状态 =====
    if (msg.name === 'aiOrganizeClearState') {
      aiOrganizeClearState()
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
      return true;
    }
    // ===== 新增：直接打开 popup 窗口（无任务也可手动触发，目前保留作为内部工具） =====
    if (msg.name === 'aiOrganizeOpenPopup') {
      openPopupWindow().then(res => sendResponse(res)).catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
      return true;
    }
    return true;
  });
  browser.bookmarks.onCreated.addListener((id, info) => {
    if (curOperType === OperType.NONE) {
      // console.log("onCreated", id, info)
      browser.action.setBadgeText({ text: "!" });
      browser.action.setBadgeBackgroundColor({ color: "#F00" });
      refreshLocalCount();
    }
  });
  browser.bookmarks.onChanged.addListener((id, info) => {
    if (curOperType === OperType.NONE) {
      // console.log("onChanged", id, info)
      browser.action.setBadgeText({ text: "!" });
      browser.action.setBadgeBackgroundColor({ color: "#F00" });
    }
  })
  browser.bookmarks.onMoved.addListener((id, info) => {
    if (curOperType === OperType.NONE) {
      // console.log("onMoved", id, info)
      browser.action.setBadgeText({ text: "!" });
      browser.action.setBadgeBackgroundColor({ color: "#F00" });
    }
  })
  browser.bookmarks.onRemoved.addListener((id, info) => {
    if (curOperType === OperType.NONE) {
      // console.log("onRemoved", id, info)
      browser.action.setBadgeText({ text: "!" });
      browser.action.setBadgeBackgroundColor({ color: "#F00" });
      refreshLocalCount();
    }
  })

  // =============== 监听 chrome.alarms 事件 ===============
  // MV3 Service Worker 中不能用 setInterval，必须用 chrome.alarms
  // 周期最小 1 分钟；为避免太频繁校验，最小同步间隔 15 分钟（前端 UI 限制）
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      console.log(`[BookmarkHub] alarm fired at ${new Date().toISOString()}`);
      runAutoSync().catch(err => console.error('auto sync error:', err));
    }
  });

  // =============== 监听浏览器启动事件（可选：用于立即触发一次） ===============
  browser.runtime.onStartup.addListener(() => {
    console.log('[BookmarkHub] browser startup, refreshing alarm');
    refreshAlarm().then(async () => {
      const setting = await Setting.build();
      if (setting.enableAutoSync && setting.autoSyncOnStartup) {
        console.log('[BookmarkHub] startup auto sync triggered');
        runAutoSync().catch(err => console.error('startup sync error:', err));
      }
    }).catch(err => console.error(err));
  });

  /**
   * 刷新/重建 alarm：
   *   - 如果未启用自动同步，清除 alarm
   *   - 如果已启用且配置变更，重建 alarm
   *   - interval < 15 分钟时强制为 15 分钟（chrome.alarms 周期至少 1 分钟，
   *     但太短会触发 API 限流和浏览器节流）
   */
  async function refreshAlarm() {
    const setting = await Setting.build();
    const existing = await browser.alarms.get(ALARM_NAME);
    if (!setting.enableAutoSync) {
      if (existing) {
        await browser.alarms.clear(ALARM_NAME);
        console.log('[BookmarkHub] auto sync disabled, alarm cleared');
      }
      return;
    }
    let interval = Math.max(MIN_INTERVAL_MIN, Math.floor(setting.autoSyncInterval || DEFAULT_INTERVAL_MIN));
    // Chrome alarms API periodInMinutes 最小值为 1，这里我们直接用 periodInMinutes 即可
    const opts: any = { periodInMinutes: interval };
    if (existing) {
      await browser.alarms.clear(ALARM_NAME);
    }
    await browser.alarms.create(ALARM_NAME, opts);
    console.log(`[BookmarkHub] alarm created with interval ${interval} min, direction=${setting.autoSyncDirection}`);
  }

  /**
   * 执行一次自动同步
   *   - 单一操作过程中通过 curOperType 锁住，避免与手动操作/书签事件冲突
   *   - 同步方向: upload / download / bidirectional
   *   - 同步完成后更新时间戳；失败不更新
   */
  async function runAutoSync() {
    const setting = await Setting.build();
    if (!setting.enableAutoSync) {
      console.log('[BookmarkHub] auto sync skipped (disabled)');
      return;
    }
    // 校验基础配置
    if (!setting.githubToken || !setting.gistID || !setting.gistFileName) {
      console.warn('[BookmarkHub] auto sync skipped: missing token/gist/filename');
      if (setting.enableNotify) {
        await browser.notifications.create({
          type: "basic",
          iconUrl: iconLogo,
          title: browser.i18n.getMessage('autoSyncTitle'),
          message: browser.i18n.getMessage('autoSyncMissingConfig')
        });
      }
      return;
    }

    // 加锁：避免与手动同步/书签事件冲突
    if (curOperType !== OperType.NONE) {
      console.log('[BookmarkHub] auto sync skipped: another operation in progress');
      return;
    }
    curOperType = OperType.SYNC;

    try {
      const direction = setting.autoSyncDirection;
      console.log(`[BookmarkHub] auto sync start, direction=${direction}`);
      let anyOk = false;
      if (direction === 'upload') {
        anyOk = await uploadBookmarks({ silent: true });
      } else if (direction === 'download') {
        anyOk = await downloadBookmarks({ silent: true });
      } else {
        // bidirectional: 先下载再上传（保证两端一致）
        const dlOk = await downloadBookmarks({ silent: true });
        const ulOk = await uploadBookmarks({ silent: true });
        anyOk = dlOk || ulOk;
      }
      // 至少一个方向成功才更新同步时间
      if (anyOk) {
        // 触发源 01: 定时自动同步成功
        await setLastSyncAt('auto');
        // 自动同步成功后，主动刷新本地计数（清掉 "!" 红标）
        await refreshLocalCount();
        browser.action.setBadgeText({ text: "" });
        console.log('[BookmarkHub] auto sync done at', new Date().toISOString());
      } else {
        console.warn('[BookmarkHub] auto sync all directions failed, lastSyncAt not updated');
      }
    } catch (e) {
      console.error('[BookmarkHub] auto sync failed:', e);
    } finally {
      curOperType = OperType.NONE;
    }
  }

  // =============== AI 整理书签：核心逻辑 ===============

  /**
   * 启动 AI 整理任务：
   *  1. 校验配置（token / gist_id / file_name / backend_url）
   *  2. 调用后端 /api/organize/start 拿到 task_id
   *  3. 写入 storage 的 aiOrganizeState
   *  4. 创建 chrome.alarms 1 分钟轮询后端状态
   *
   * 返回: { ok: true, task_id } 或 { ok: false, error: '...' }
   */
  async function aiOrganizeStart(): Promise<{ ok: boolean; task_id?: string; state?: any; error?: string }> {
    const setting = await Setting.build();
    if (!setting.githubToken || !setting.gistID || !setting.gistFileName) {
      return { ok: false, error: browser.i18n.getMessage('aiOrganizeMissingConfig') || 'Please configure Token / Gist ID / File Name first' };
    }
    if (!setting.aiOrganizeBackendUrl) {
      return { ok: false, error: 'AI Organize Backend URL is empty' };
    }

    // 检查是否已有任务在跑
    const existing = await browser.storage.local.get(AI_ORGANIZE_STATE_KEY);
    const prevState = existing?.[AI_ORGANIZE_STATE_KEY];
    if (prevState && (prevState.status === 'pending' || prevState.status === 'running')) {
      return { ok: false, error: 'A previous task is still running', state: prevState };
    }

    const startedAt = Date.now();
    // 写初始状态
    const initState = {
      task_id: null,
      status: 'pending',  // pending / running / success / failed
      progress: { current: 0, total: 0, current_step: browser.i18n.getMessage('aiOrganizeRunningTitle') || '🤖 AI Organizing…', message: '' },
      result: null,
      error: null,
      log: [],
      started_at: startedAt,
      finished_at: null,
      dismissed: false,
      backend_url: setting.aiOrganizeBackendUrl,
    };
    await browser.storage.local.set({ [AI_ORGANIZE_STATE_KEY]: initState });

    try {
      // 调后端
      const url = setting.aiOrganizeBackendUrl.replace(/\/+$/, '') + '/api/organize/start';
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gist_token: setting.githubToken,
          gist_id: setting.gistID,
          gist_file_name: setting.gistFileName,
          max_concurrency: 5,
          classify_concurrency: 3,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Backend HTTP ${resp.status}: ${txt.slice(0, 200)}`);
      }
      const data = await resp.json();
      if (!data.task_id) {
        throw new Error('Backend did not return task_id');
      }

      // 更新状态
      const newState = {
        ...initState,
        task_id: data.task_id,
        status: 'running',
        progress: { current: 0, total: 0, current_step: browser.i18n.getMessage('aiOrganizeRunningTitle') || '🤖 AI Organizing…', message: 'Task started' },
      };
      await browser.storage.local.set({ [AI_ORGANIZE_STATE_KEY]: newState });

      // 创建轮询 alarm（1 分钟一次）—— service worker 不持久，popup 也会自己轮询
      try {
        await browser.alarms.create(AI_ORGANIZE_POLL_ALARM, { periodInMinutes: 1 });
      } catch (e) {
        console.warn('[aiOrganize] failed to create poll alarm:', e);
      }

      return { ok: true, task_id: data.task_id, state: newState };
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      const failState = {
        ...initState,
        status: 'failed',
        error: errMsg,
        finished_at: Date.now(),
      };
      await browser.storage.local.set({ [AI_ORGANIZE_STATE_KEY]: failState });
      return { ok: false, error: errMsg, state: failState };
    }
  }

  /**
   * 获取 AI 整理当前状态：
   *  - 如果后端有 task_id 且未结束，主动 poll 一次后端拿最新进度
   *  - 更新 storage 中的状态
   *  - 返回给 popup
   */
  async function aiOrganizeGetState(): Promise<{ ok: boolean; state?: any; error?: string }> {
    const data = await browser.storage.local.get(AI_ORGANIZE_STATE_KEY);
    const state = data?.[AI_ORGANIZE_STATE_KEY];
    if (!state) {
      return { ok: true, state: null };
    }
    // 如果已经终态，直接返回
    if (state.status === 'success' || state.status === 'failed') {
      return { ok: true, state };
    }
    // 如果还没拿到 task_id 或正在 pending，直接返回
    if (!state.task_id) {
      return { ok: true, state };
    }
    // 主动 poll 一次后端
    try {
      const url = (state.backend_url || '').replace(/\/+$/, '') + `/api/organize/${state.task_id}/status`;
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) {
        // 后端暂时连不上，返回原状态
        return { ok: true, state };
      }
      const remote = await resp.json();
      const newState = {
        ...state,
        status: remote.status || state.status,
        progress: remote.progress || state.progress,
        log: remote.log || state.log,
        result: remote.result || state.result,
        error: remote.error || null,
        finished_at: (remote.status === 'success' || remote.status === 'failed') ? Date.now() : state.finished_at,
      };
      await browser.storage.local.set({ [AI_ORGANIZE_STATE_KEY]: newState });
      // 终态时清理轮询 alarm
      if (newState.status === 'success' || newState.status === 'failed') {
        try { await browser.alarms.clear(AI_ORGANIZE_POLL_ALARM); } catch (e) { /* ignore */ }
      }
      return { ok: true, state: newState };
    } catch (e: any) {
      // 网络错误：返回原状态
      return { ok: true, state };
    }
  }

  /**
   * 打开 popup 窗口（已开则聚焦，不再开新窗口）
   *  - 整理过程中不调用此函数，避免打扰用户
   *  - 任务完成后由 alarm 监听器调用，自动弹出汇总详情
   */
  async function openPopupWindow(): Promise<{ ok: boolean; focused?: boolean; error?: string }> {
    const popupUrl = browser.runtime.getURL('popup.html');
    return new Promise((resolve) => {
      try {
        chrome.windows.getAll({ windowTypes: ['popup'] }, (wins) => {
          const target = (wins || []).find(w => (w as any).tabs?.some((t: any) => t.url?.startsWith(popupUrl)));
          if (target && target.id != null) {
            chrome.windows.update(target.id, { focused: true, drawAttention: true }, () => {
              const lastErr = chrome.runtime.lastError;
              if (lastErr) {
                resolve({ ok: false, error: lastErr.message });
              } else {
                resolve({ ok: true, focused: true });
              }
            });
          } else {
            chrome.windows.create({
              url: popupUrl,
              type: 'popup',
              width: 420,
              height: 560,
              focused: true,
            }, () => {
              const lastErr = chrome.runtime.lastError;
              if (lastErr) {
                resolve({ ok: false, error: lastErr.message });
              } else {
                resolve({ ok: true, focused: false });
              }
            });
          }
        });
      } catch (e: any) {
        resolve({ ok: false, error: String(e?.message || e) });
      }
    });
  }

  /**
   * 清除 AI 整理状态（用户点关闭模态框后调用，避免重复弹）
   */
  async function aiOrganizeClearState(): Promise<void> {
    try { await browser.alarms.clear(AI_ORGANIZE_POLL_ALARM); } catch (e) { /* ignore */ }
    await browser.storage.local.remove(AI_ORGANIZE_STATE_KEY);
  }

  /**
   * 检查是否需要自动弹出 popup 窗口（任务完成且 popup 未弹过）
   *  - 仅在状态从非 success 转入 success 时触发，避免重复弹
   *  - 设置 popup_auto_opened=true 后再次轮询就不会再触发
   */
  async function maybeAutoOpenPopupOnComplete(prevStatus: string | undefined, currStatus: string): Promise<void> {
    if (currStatus !== 'success') return;
    if (prevStatus === 'success') return; // 不是首次进入 success，不重复弹
    const data = await browser.storage.local.get(AI_ORGANIZE_STATE_KEY);
    const st = data?.[AI_ORGANIZE_STATE_KEY];
    if (!st || st.status !== 'success') return;
    if (st.dismissed) return;          // 用户已经关闭过，不重复弹
    if (st.popup_auto_opened) return;  // 已经弹过，不重复弹
    // 标记 + 打开
    await browser.storage.local.set({
      [AI_ORGANIZE_STATE_KEY]: { ...st, popup_auto_opened: true }
    });
    const r = await openPopupWindow();
    console.log('[aiOrganize] auto-open popup on complete:', r);
  }

  // 监听 AI 整理轮询 alarm
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === AI_ORGANIZE_POLL_ALARM) {
      try {
        // 记录轮询前状态
        const before = await browser.storage.local.get(AI_ORGANIZE_STATE_KEY);
        const prevStatus = before?.[AI_ORGANIZE_STATE_KEY]?.status;
        // 正常轮询后端
        await aiOrganizeGetState();
        // 轮询后再读一次状态，检查是否刚转入 success → 自动弹 popup
        const after = await browser.storage.local.get(AI_ORGANIZE_STATE_KEY);
        const currStatus = after?.[AI_ORGANIZE_STATE_KEY]?.status;
        if (currStatus) {
          await maybeAutoOpenPopupOnComplete(prevStatus, currStatus);
        }
      } catch (err) {
        console.error('[aiOrganize] poll error:', err);
      }
    }
  });

  async function uploadBookmarks(opts: { silent?: boolean } = {}): Promise<boolean> {
    try {
      let setting = await Setting.build()
      if (setting.githubToken == '') {
        throw new Error("Gist Token Not Found");
      }
      if (setting.gistID == '') {
        throw new Error("Gist ID Not Found");
      }
      if (setting.gistFileName == '') {
        throw new Error("Gist File Not Found");
      }
      let bookmarks = await getBookmarks();
      let syncdata = new SyncDataInfo();
      syncdata.version = browser.runtime.getManifest().version;
      syncdata.createDate = Date.now();
      syncdata.bookmarks = formatBookmarks(bookmarks);
      syncdata.browser = navigator.userAgent;
      await BookmarkService.update({
        files: {
          [setting.gistFileName]: {
            content: JSON.stringify(syncdata)
          }
        },
        description: setting.gistFileName
      });
      const count = getBookmarkCount(syncdata.bookmarks);
      await browser.storage.local.set({ remoteCount: count });
      if (setting.enableNotify && !opts.silent) {
        await browser.notifications.create({
          type: "basic",
          iconUrl: iconLogo,
          title: browser.i18n.getMessage('uploadBookmarks'),
          message: browser.i18n.getMessage('success')
        });
      }
      return true;

    }
    catch (error: any) {
      console.error(error);
      await browser.notifications.create({
        type: "basic",
        iconUrl: iconLogo,
        title: browser.i18n.getMessage('uploadBookmarks'),
        message: `${browser.i18n.getMessage('error')}：${error.message}`
      });
      return false;
    }
  }
  async function downloadBookmarks(opts: { silent?: boolean } = {}): Promise<boolean> {
    try {
      let gist = await BookmarkService.get();
      let setting = await Setting.build()
      if (gist) {
        let syncdata: SyncDataInfo = JSON.parse(gist);
        if (syncdata.bookmarks == undefined || syncdata.bookmarks.length == 0) {
          if (setting.enableNotify && !opts.silent) {
            await browser.notifications.create({
              type: "basic",
              iconUrl: iconLogo,
              title: browser.i18n.getMessage('downloadBookmarks'),
              message: `${browser.i18n.getMessage('error')}：Gist File ${setting.gistFileName} is NULL`
            });
          }
          return false;
        }
        await clearBookmarkTree({ silent: true });
        await createBookmarkTree(syncdata.bookmarks);
        const count = getBookmarkCount(syncdata.bookmarks);
        await browser.storage.local.set({ remoteCount: count });
        if (setting.enableNotify && !opts.silent) {
          await browser.notifications.create({
            type: "basic",
            iconUrl: iconLogo,
            title: browser.i18n.getMessage('downloadBookmarks'),
            message: browser.i18n.getMessage('success')
          });
        }
        return true;
      }
      else {
        await browser.notifications.create({
          type: "basic",
          iconUrl: iconLogo,
          title: browser.i18n.getMessage('downloadBookmarks'),
          message: `${browser.i18n.getMessage('error')}：Gist File ${setting.gistFileName} Not Found`
        });
        return false;
      }
    }
    catch (error: any) {
      console.error(error);
      await browser.notifications.create({
        type: "basic",
        iconUrl: iconLogo,
        title: browser.i18n.getMessage('downloadBookmarks'),
        message: `${browser.i18n.getMessage('error')}：${error.message}`
      });
      return false;
    }
  }

  async function getBookmarks() {
    let bookmarkTree: BookmarkInfo[] = await browser.bookmarks.getTree();
    if (bookmarkTree && bookmarkTree[0].id === "root________") {
      curBrowserType = BrowserType.FIREFOX;
    }
    else {
      curBrowserType = BrowserType.CHROME;
    }
    return bookmarkTree;
  }

  async function clearBookmarkTree(opts: { silent?: boolean } = {}) {
    try {
      let setting = await Setting.build()
      if (setting.githubToken == '') {
        throw new Error("Gist Token Not Found");
      }
      if (setting.gistID == '') {
        throw new Error("Gist ID Not Found");
      }
      if (setting.gistFileName == '') {
        throw new Error("Gist File Not Found");
      }
      let bookmarks = await getBookmarks();
      let tempNodes: BookmarkInfo[] = [];
      bookmarks[0].children?.forEach(c => {
        c.children?.forEach(d => {
          tempNodes.push(d)
        })
      });
      if (tempNodes.length > 0) {
        for (let node of tempNodes) {
          if (node.id) {
            await browser.bookmarks.removeTree(node.id)
          }
        }
      }
      if (curOperType === OperType.REMOVE && setting.enableNotify && !opts.silent) {
        await browser.notifications.create({
          type: "basic",
          iconUrl: iconLogo,
          title: browser.i18n.getMessage('removeAllBookmarks'),
          message: browser.i18n.getMessage('success')
        });
      }
    }
    catch (error: any) {
      console.error(error);
      await browser.notifications.create({
        type: "basic",
        iconUrl: iconLogo,
        title: browser.i18n.getMessage('removeAllBookmarks'),
        message: `${browser.i18n.getMessage('error')}：${error.message}`
      });
    }
  }

  async function createBookmarkTree(bookmarkList: BookmarkInfo[] | undefined) {
    if (bookmarkList == null) {
      return;
    }
    for (let i = 0; i < bookmarkList.length; i++) {
      let node = bookmarkList[i];
      if (node.title == RootBookmarksType.MenuFolder
        || node.title == RootBookmarksType.MobileFolder
        || node.title == RootBookmarksType.ToolbarFolder
        || node.title == RootBookmarksType.UnfiledFolder) {
        if (curBrowserType == BrowserType.FIREFOX) {
          switch (node.title) {
            case RootBookmarksType.MenuFolder:
              node.children?.forEach(c => c.parentId = "menu________");
              break;
            case RootBookmarksType.MobileFolder:
              node.children?.forEach(c => c.parentId = "mobile______");
              break;
            case RootBookmarksType.ToolbarFolder:
              node.children?.forEach(c => c.parentId = "toolbar_____");
              break;
            case RootBookmarksType.UnfiledFolder:
              node.children?.forEach(c => c.parentId = "unfiled_____");
              break;
            default:
              node.children?.forEach(c => c.parentId = "unfiled_____");
              break;
          }
        } else {
          switch (node.title) {
            case RootBookmarksType.MobileFolder:
              node.children?.forEach(c => c.parentId = "3");
              break;
            case RootBookmarksType.ToolbarFolder:
              node.children?.forEach(c => c.parentId = "1");
              break;
            case RootBookmarksType.UnfiledFolder:
            case RootBookmarksType.MenuFolder:
              node.children?.forEach(c => c.parentId = "2");
              break;
            default:
              node.children?.forEach(c => c.parentId = "2");
              break;
          }
        }
        await createBookmarkTree(node.children);
        continue;
      }

      let res: Bookmarks.BookmarkTreeNode = { id: '', title: '' };
      try {
        /* 处理firefox中创建 chrome://chrome-urls/ 格式的书签会报错的问题 */
        res = await browser.bookmarks.create({
          parentId: node.parentId,
          title: node.title,
          url: node.url
        });
      } catch (err) {
        console.error(res, err);
      }
      if (res.id && node.children && node.children.length > 0) {
        node.children.forEach(c => c.parentId = res.id);
        await createBookmarkTree(node.children);
      }
    }
  }

  function getBookmarkCount(bookmarkList: BookmarkInfo[] | undefined) {
    let count = 0;
    if (bookmarkList) {
      bookmarkList.forEach(c => {
        if (c.url) {
          count = count + 1;
        }
        else {
          count = count + getBookmarkCount(c.children);
        }
      });
    }
    return count;
  }

  async function refreshLocalCount() {
    let bookmarkList = await getBookmarks();
    const count = getBookmarkCount(bookmarkList);
    await browser.storage.local.set({ localCount: count });
  }

  /**
   * 写入统一同步时间字段。
   * 字段：lastSyncAt (number) + lastSyncSource ('auto' | 'manual')
   *   - 触发源 01: runAutoSync() 成功后调用 setLastSyncAt('auto')
   *   - 触发源 02: 手动 upload/download 成功后调用 setLastSyncAt('manual')
   * 同时兼容旧字段 lastAutoSyncTime，避免老用户 options 页读不到时间。
   */
  async function setLastSyncAt(source: 'auto' | 'manual') {
    const now = Date.now();
    await browser.storage.local.set({
      lastSyncAt: now,
      lastSyncSource: source,
      lastAutoSyncTime: now,  // 兼容老字段
    });
  }


  function formatBookmarks(bookmarks: BookmarkInfo[]): BookmarkInfo[] | undefined {
    if (bookmarks[0].children) {
      for (let a of bookmarks[0].children) {
        switch (a.id) {
          case "1":
          case "toolbar_____":
            a.title = RootBookmarksType.ToolbarFolder;
            break;
          case "menu________":
            a.title = RootBookmarksType.MenuFolder;
            break;
          case "2":
          case "unfiled_____":
            a.title = RootBookmarksType.UnfiledFolder;
            break;
          case "3":
          case "mobile______":
            a.title = RootBookmarksType.MobileFolder;
            break;
        }
      }
    }

    let a = format(bookmarks[0]);
    return a.children;
  }

  function format(b: BookmarkInfo): BookmarkInfo {
    b.dateAdded = undefined;
    b.dateGroupModified = undefined;
    b.id = undefined;
    b.index = undefined;
    b.parentId = undefined;
    b.type = undefined;
    b.unmodifiable = undefined;
    if (b.children && b.children.length > 0) {
      b.children?.map(c => format(c))
    }
    return b;
  }
  ///暂时不启用自动备份
  /*
  async function backupToLocalStorage(bookmarks: BookmarkInfo[]) {
      try {
          let syncdata = new SyncDataInfo();
          syncdata.version = browser.runtime.getManifest().version;
          syncdata.createDate = Date.now();
          syncdata.bookmarks = formatBookmarks(bookmarks);
          syncdata.browser = navigator.userAgent;
          const keyname = 'BookmarkHub_backup_' + Date.now().toString();
          await browser.storage.local.set({ [keyname]: JSON.stringify(syncdata) });
      }
      catch (error:any) {
          console.error(error)
      }
  }
  */

});