import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client';
import { Dropdown, Badge, Modal, Button } from 'react-bootstrap';
import { IconContext } from 'react-icons'
import {
    AiOutlineCloudUpload, AiOutlineCloudDownload,
    AiOutlineCloudSync, AiOutlineSetting, AiOutlineClear,
    AiOutlineInfoCircle, AiOutlineGithub, AiOutlineRobot
} from 'react-icons/ai'
import 'bootstrap/dist/css/bootstrap.min.css';
import './popup.css'

type LastSyncState = {
    ts: number;            // 时间戳（毫秒），0 = 从未同步
    source: 'auto' | 'manual' | 'none';
};

type AIOrganizeProgress = {
    current: number;
    total: number;
    current_step: string;
    message: string;
};

type AIOrganizeState = {
    task_id: string | null;
    status: 'pending' | 'running' | 'success' | 'failed';
    progress: AIOrganizeProgress;
    result: {
        total_bookmarks?: number;
        category_count?: number;
        categories?: { category: string; count: number }[];
        organized_root?: string;
    } | null;
    error: string | null;
    started_at: number;
    finished_at: number | null;
    dismissed?: boolean;
};

const Popup: React.FC = () => {
    const [count, setCount] = useState({ local: "0", remote: "0" })
    const [lastSync, setLastSync] = useState<LastSyncState>({ ts: 0, source: 'none' });
    const [aiState, setAiState] = useState<AIOrganizeState | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiRunningHint, setAiRunningHint] = useState(false);  // 启动任务的瞬时反馈
    const pollTimerRef = useRef<any>(null);

    useEffect(() => {
        document.addEventListener('click', (e: MouseEvent) => {
            let elem = e.target as HTMLInputElement;
            if (elem != null && elem.className === 'dropdown-item') {
                elem.setAttribute('disabled', 'disabled');
                browser.runtime.sendMessage({ name: elem.name })
                    .then(async (_res) => {
                        elem.removeAttribute('disabled');
                        console.log("msg", Date.now());
                        if (elem.name === 'upload' || elem.name === 'download') {
                            await loadLastSync();
                        }
                    })
                    .catch(c => {
                        console.log("error", c);
                    });
            }
        });
    }, [])

    useEffect(() => {
        let getSetting = async () => {
            let data = await browser.storage.local.get(["localCount", "remoteCount", "lastSyncAt", "lastSyncSource"]);
            setCount({ local: data["localCount"], remote: data["remoteCount"] });
            setLastSync({
                ts: data["lastSyncAt"] || 0,
                source: data["lastSyncSource"] || 'none',
            });
        }
        getSetting();
    }, [])

    /**
     * AI 整理进度轮询：
     *  - 每 1.5 秒拉一次后端状态
     *  - running 期间持续刷新
     *  - 终态时停止轮询 + 弹模态框
     */
    useEffect(() => {
        const tick = async () => {
            try {
                const r: any = await browser.runtime.sendMessage({ name: 'aiOrganizeGetState' });
                if (r?.ok && r.state) {
                    setAiState(r.state);
                    if ((r.state.status === 'success' || r.state.status === 'failed') && !r.state.dismissed) {
                        setShowAiModal(true);
                    }
                } else {
                    setAiState(null);
                }
            } catch (e) {
                // ignore
            }
        };
        tick();
        pollTimerRef.current = setInterval(tick, 1500);
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, []);

    /**
     * 重新加载 lastSyncAt。手动触发同步后调用。
     */
    const loadLastSync = async () => {
        const data = await browser.storage.local.get(["lastSyncAt", "lastSyncSource"]);
        setLastSync({
            ts: data["lastSyncAt"] || 0,
            source: data["lastSyncSource"] || 'none',
        });
    };

    /**
     * 触发 AI 整理任务
     */
    const handleAiOrganize = async (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        // 防止重复点击：running 或 pending 时直接 return（按钮本身已 disabled）
        if (aiState && (aiState.status === 'running' || aiState.status === 'pending')) return;
        if (aiRunningHint) return;
        setAiRunningHint(true);
        try {
            const r: any = await browser.runtime.sendMessage({ name: 'aiOrganizeStart' });
            if (r?.ok) {
                // 立即拉一次状态（不等 1.5s 轮询），让进度条立即出现
                const s: any = await browser.runtime.sendMessage({ name: 'aiOrganizeGetState' });
                if (s?.ok && s.state) setAiState(s.state);
            } else {
                alert(r?.error || 'Failed to start');
            }
        } catch (e: any) {
            alert(String(e?.message || e));
        } finally {
            setAiRunningHint(false);
        }
    };

    /**
     * 关闭 AI 整理结果模态框 + 清除 storage
     */
    const handleCloseAiModal = async () => {
        setShowAiModal(false);
        try {
            await browser.runtime.sendMessage({ name: 'aiOrganizeClearState' });
        } catch (e) { /* ignore */ }
        setAiState(null);
    };

    /**
     * 渲染同步时间行
     */
    const renderLastSync = () => {
        const label = browser.i18n.getMessage('lastSync') || 'Last Sync';
        if (!lastSync.ts) {
            const notYet = browser.i18n.getMessage('lastSyncNotYet') || 'Not yet updated';
            return (
                <>
                    {label}: <span className="sync-time-not-yet">{notYet}</span>
                </>
            );
        }
        const dateStr = new Date(lastSync.ts).toLocaleString();
        const sourceKey = lastSync.source === 'auto' ? 'lastSyncSourceAuto' : 'lastSyncSourceManual';
        const sourceDefault = lastSync.source === 'auto' ? 'Auto' : 'Manual';
        const sourceLabel = browser.i18n.getMessage(sourceKey) || sourceDefault;
        return (
            <>
                {label}: <span className="sync-time-real">{dateStr}</span>{' '}
                <span className={`sync-source sync-source-${lastSync.source}`}>[{sourceLabel}]</span>
            </>
        );
    };

    /**
     * 渲染 AI 整理进度条（仅在 running 时显示）
     */
    const renderAiProgress = () => {
        if (!aiState || aiState.status !== 'running') return null;
        const pct = aiState.progress.total > 0
            ? Math.min(100, Math.round((aiState.progress.current / aiState.progress.total) * 100))
            : 0;
        const labelTpl = browser.i18n.getMessage('aiOrganizeProgressLabel') || '{current} / {total} done ({step})';
        const label = labelTpl
            .replace('{current}', String(aiState.progress.current))
            .replace('{total}', String(aiState.progress.total || '?'))
            .replace('{step}', aiState.progress.current_step || '');

        return (
            <div className="ai-organize-progress">
                <div className="ai-organize-progress-title">
                    {browser.i18n.getMessage('aiOrganizeRunningTitle') || '🤖 AI Organizing…'}
                </div>
                <div className="progress" style={{ height: 6, marginTop: 4, marginBottom: 4 }}>
                    <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: `${pct}%`, backgroundColor: '#6366f1' }}
                    />
                </div>
                <div className="ai-organize-progress-text">{label}</div>
            </div>
        );
    };

    /**
     * 重置 AI 整理 storage 状态（用于任务卡住时的逃生口）
     */
    const handleAiReset = async () => {
        if (!confirm('确定要清除 AI 整理状态吗？\n（仅在任务卡住时使用，会取消后端任务的本地跟踪，不会停止后端真实任务）')) return;
        try {
            await browser.runtime.sendMessage({ name: 'aiOrganizeClearState' });
            setAiState(null);
            setShowAiModal(false);
        } catch (e) { /* ignore */ }
    };

    return (
        <IconContext.Provider value={{ className: 'dropdown-item-icon' }}>
            {renderAiProgress()}
            <Dropdown.Menu show>
                <Dropdown.Item name='upload' as="button" title={browser.i18n.getMessage('uploadBookmarksDesc')}><AiOutlineCloudUpload />{browser.i18n.getMessage('uploadBookmarks')}</Dropdown.Item>
                <Dropdown.Item name='download' as="button" title={browser.i18n.getMessage('downloadBookmarksDesc')}><AiOutlineCloudDownload />{browser.i18n.getMessage('downloadBookmarks')}</Dropdown.Item>
                <Dropdown.Item name='removeAll' as="button" title={browser.i18n.getMessage('removeAllBookmarksDesc')}><AiOutlineClear />{browser.i18n.getMessage('removeAllBookmarks')}</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                    as="button"
                    onClick={handleAiOrganize}
                    disabled={aiRunningHint || (aiState?.status === 'running' || aiState?.status === 'pending')}
                    title={browser.i18n.getMessage('aiOrganizeRunButton')}
                >
                    <AiOutlineRobot />{aiState && (aiState.status === 'running' || aiState.status === 'pending')
                        ? (browser.i18n.getMessage('aiOrganizeRunning') || 'AI 整理中…')
                        : (browser.i18n.getMessage('aiOrganizeRunButton') || 'AI Organize')}
                </Dropdown.Item>
                {aiState && (aiState.status === 'running' || aiState.status === 'pending') && (
                    <Dropdown.Item
                        as="button"
                        onClick={handleAiReset}
                        style={{ fontSize: 11, color: '#888' }}
                        title="卡住时点此重置"
                    >
                        ⚠️ 任务卡住了？点这里重置
                    </Dropdown.Item>
                )}
                <Dropdown.Divider />
                <Dropdown.Item name='setting' as="button"><AiOutlineSetting />{browser.i18n.getMessage('settings')}</Dropdown.Item>
                <Dropdown.ItemText className="popup-last-sync">
                    {renderLastSync()}
                </Dropdown.ItemText>
                <Dropdown.ItemText>
                    <AiOutlineInfoCircle /><a href="https://github.com/dudor/BookmarkHub" target="_blank">{browser.i18n.getMessage('help')}</a>|
                    <Badge id="localCount" variant="light" title={browser.i18n.getMessage('localCount')}>{count["local"]}</Badge>/<Badge id="remoteCount" variant="light" title={browser.i18n.getMessage('remoteCount')}>{count["remote"]}</Badge>|
                    <a href="https://github.com/dudor" target="_blank" title={browser.i18n.getMessage('author')}><AiOutlineGithub /></a>
                </Dropdown.ItemText>
            </Dropdown.Menu >

            {/* AI 整理结果模态框 */}
            <Modal
                show={showAiModal}
                onHide={handleCloseAiModal}
                backdrop="static"
                size="sm"
                centered
                className="ai-organize-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: '16px' }}>
                        {aiState?.status === 'success'
                            ? (browser.i18n.getMessage('aiOrganizeModalTitle') || '🎉 Organize Complete')
                            : (browser.i18n.getMessage('aiOrganizeFailed') || '❌ Organize Failed')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '12px 16px' }}>
                    {aiState?.status === 'success' && aiState.result ? (
                        <>
                            <div className="ai-organize-summary">
                                {(browser.i18n.getMessage('aiOrganizeModalSummary') || 'Organized {count} bookmarks into {cats} categories')
                                    .replace('{count}', String(aiState.result.total_bookmarks || 0))
                                    .replace('{cats}', String(aiState.result.category_count || 0))}
                            </div>
                            {aiState.result.categories && aiState.result.categories.length > 0 && (
                                <div className="ai-organize-cat-list">
                                    {aiState.result.categories.map((c, i) => (
                                        <div key={i} className="ai-organize-cat-row">
                                            <span className="ai-organize-cat-name">{c.category}</span>
                                            <span className="ai-organize-cat-count">{c.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="ai-organize-hint-line">
                                {browser.i18n.getMessage('aiOrganizeModalHint') || 'Click "Sync Now" in the popup to see the result.'}
                            </div>
                        </>
                    ) : (
                        <div className="ai-organize-error">
                            {aiState?.error || 'Unknown error'}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer style={{ padding: '8px 16px' }}>
                    <Button variant="primary" size="sm" onClick={handleCloseAiModal}>
                        {browser.i18n.getMessage('aiOrganizeModalClose') || 'Close'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </IconContext.Provider>
    )
}


ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>,
);
