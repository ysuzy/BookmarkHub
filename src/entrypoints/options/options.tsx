import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client';
import { Container, Form, Button, Col, Row, InputGroup, Alert, Modal } from 'react-bootstrap';
import { useForm } from "react-hook-form";
import 'bootstrap/dist/css/bootstrap.min.css';
import './options.css'
import optionsStorage from '../../utils/optionsStorage'

// 同步周期下拉选项：标签通过 i18n 读取（key 形如 autoSyncInterval_1h）
// 浏览器全局 i18n 在模块顶层即可获取，组件渲染时 label 已就绪
const INTERVAL_OPTIONS: { value: number; label: string; i18nKey: string }[] = [
    { value: 15,   i18nKey: 'autoSyncInterval_15m' },
    { value: 30,   i18nKey: 'autoSyncInterval_30m' },
    { value: 60,   i18nKey: 'autoSyncInterval_1h'  },
    { value: 120,  i18nKey: 'autoSyncInterval_2h'  },
    { value: 360,  i18nKey: 'autoSyncInterval_6h'  },
    { value: 720,  i18nKey: 'autoSyncInterval_12h' },
    { value: 1440, i18nKey: 'autoSyncInterval_24h' },
    { value: 2880, i18nKey: 'autoSyncInterval_48h' },
    { value: 4320, i18nKey: 'autoSyncInterval_72h' },
].map(o => ({ value: o.value, i18nKey: o.i18nKey, label: browser.i18n.getMessage(o.i18nKey as any) }));

const Popup: React.FC = () => {
    const { register, setValue, watch, getValues } = useForm();
    const enableAutoSync = watch('enableAutoSync');
    // 监听 Gist ID 输入，实时驱动"View Gist"按钮可用性 + URL
    const gistID = (watch('gistID') || '').trim();
    const gistFileName = (watch('gistFileName') || 'BookmarkHub').trim();
    const [gistUrl, setGistUrl] = useState('');
    useEffect(() => {
        // 简化 URL：gist.github.com/<id> 公开/私密 Gist 都可用（登录态下私密也可访问）
        setGistUrl(gistID ? `https://gist.github.com/${encodeURIComponent(gistID)}` : '');
    }, [gistID]);
    const [lastSyncText, setLastSyncText] = useState('');
    const [saveHint, setSaveHint] = useState('');

    // ====== AI 整理状态（与 popup 共享）======
    const [aiState, setAiState] = useState<any>(null);
    const [aiStartPending, setAiStartPending] = useState(false);
    const [showAiResultModal, setShowAiResultModal] = useState(false);
    const pollTimerRef = React.useRef<any>(null);

    useEffect(() => {
        const tick = async () => {
            try {
                const r: any = await browser.runtime.sendMessage({ name: 'aiOrganizeGetState' });
                if (r?.ok && r.state) {
                    setAiState(r.state);
                    // 终态 + 未关闭过 → 显示汇总模态框
                    if ((r.state.status === 'success' || r.state.status === 'failed') && !r.state.dismissed) {
                        setShowAiResultModal(true);
                    }
                } else {
                    setAiState(null);
                }
            } catch (e) { /* ignore */ }
        };
        tick();
        pollTimerRef.current = setInterval(tick, 1500);
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, []);

    /**
     * 渲染 AI 整理进度条（仅在 running/pending 时显示）
     */
    const renderAiProgress = () => {
        if (!aiState || (aiState.status !== 'running' && aiState.status !== 'pending')) return null;
        const total = aiState.progress?.total || 0;
        const current = aiState.progress?.current || 0;
        const step = aiState.progress?.current_step || '';
        const message = aiState.progress?.message || '';
        const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        const labelTpl = browser.i18n.getMessage('aiOrganizeProgressLabel') || '已完成 {current} / {total}（{step}）';
        const label = labelTpl
            .replace('{current}', String(current))
            .replace('{total}', String(total || '?'))
            .replace('{step}', step);

        return (
            <div style={{
                marginTop: 10, padding: 10,
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                borderRadius: 6, border: '1px solid #c7d2fe',
            }}>
                <div style={{ fontSize: 12, color: '#4338ca', fontWeight: 600, marginBottom: 6 }}>
                    {browser.i18n.getMessage('aiOrganizeRunningTitle') || '🤖 AI 整理中…'}
                </div>
                <div style={{ height: 6, background: '#fff', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
                <div style={{ fontSize: 11, color: '#6366f1' }}>{label}</div>
                {message && message !== step && (
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{message}</div>
                )}
            </div>
        );
    };

    const aiIsRunning = aiState && (aiState.status === 'running' || aiState.status === 'pending');

    /**
     * 关闭 AI 整理结果模态框 + 清除 storage
     */
    const handleCloseAiResultModal = async () => {
        setShowAiResultModal(false);
        try {
            await browser.runtime.sendMessage({ name: 'aiOrganizeClearState' });
        } catch (e) { /* ignore */ }
        setAiState(null);
    };

    /**
     * 渲染 AI 整理结果汇总模态框
     */
    const renderAiResultModal = () => {
        if (!aiState || (aiState.status !== 'success' && aiState.status !== 'failed')) return null;
        const isSuccess = aiState.status === 'success';
        return (
            <Modal
                show={showAiResultModal}
                onHide={handleCloseAiResultModal}
                backdrop="static"
                size="sm"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: '16px' }}>
                        {isSuccess
                            ? (browser.i18n.getMessage('aiOrganizeModalTitle') || '🎉 Organize Complete')
                            : (browser.i18n.getMessage('aiOrganizeFailed') || '❌ Organize Failed')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '12px 16px' }}>
                    {isSuccess && aiState.result ? (
                        <>
                            <div style={{ fontSize: 13, marginBottom: 10, color: '#374151' }}>
                                {(browser.i18n.getMessage('aiOrganizeModalSummary') || 'Organized {count} bookmarks into {cats} categories')
                                    .replace('{count}', String(aiState.result.total_bookmarks || 0))
                                    .replace('{cats}', String(aiState.result.category_count || 0))}
                            </div>
                            {aiState.result.categories && aiState.result.categories.length > 0 && (
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    marginBottom: 10,
                                }}>
                                    {aiState.result.categories.map((c: any, i: number) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '6px 12px',
                                                fontSize: 13,
                                                borderBottom: i < aiState.result.categories.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                background: i % 2 === 0 ? '#fff' : '#fafafa',
                                            }}
                                        >
                                            <span style={{ color: '#1f2937' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    width: 6, height: 6,
                                                    borderRadius: '50%',
                                                    background: '#6366f1',
                                                    marginRight: 8,
                                                }} />
                                                {c.category}
                                            </span>
                                            <span style={{
                                                background: '#eef2ff',
                                                color: '#4338ca',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                padding: '2px 8px',
                                                borderRadius: 10,
                                            }}>
                                                {c.count}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
                                {browser.i18n.getMessage('aiOrganizeModalHint') || 'Click "Download Bookmarks" in popup to see the result.'}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 13, color: '#dc2626' }}>
                            {aiState?.error || 'Unknown error'}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer style={{ padding: '8px 16px' }}>
                    <Button variant="primary" size="sm" onClick={handleCloseAiResultModal}>
                        {browser.i18n.getMessage('aiOrganizeModalClose') || 'Close'}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    };

    useEffect(() => {
        optionsStorage.syncForm('#formOptions');
    }, [])

    useEffect(() => {
        // 读取上次同步时间，显示在 UI（兼容旧字段 lastAutoSyncTime）
        const loadLastSync = async () => {
            const data = await browser.storage.local.get(['lastSyncAt', 'lastAutoSyncTime']);
            const ts = data?.lastSyncAt || data?.lastAutoSyncTime;
            if (ts) {
                const d = new Date(ts);
                setLastSyncText(d.toLocaleString());
            } else {
                setLastSyncText(browser.i18n.getMessage('autoSyncNever') || 'Never');
            }
        };
        loadLastSync();
    }, [])

    const onSave = async () => {
        // webext-options-sync 会自动把表单数据写入 storage；这里手动触发一次
        // 并通知 background 重建 alarm
        await optionsStorage.setAll(getValues());
        try {
            await browser.runtime.sendMessage({ name: 'refreshAutoSync' });
            setSaveHint(browser.i18n.getMessage('autoSyncSaved') || 'Saved, auto-sync settings applied');
        } catch (e) {
            setSaveHint(browser.i18n.getMessage('autoSyncSaveError') || 'Saved, but failed to notify background');
        }
        setTimeout(() => setSaveHint(''), 3000);
    }

    const onRunNow = async () => {
        const runHint = document.getElementById('runNowHint');
        const setHint = (text: string, variant: 'info' | 'success' | 'danger' = 'info') => {
            if (!runHint) return;
            runHint.textContent = text;
            runHint.className = `alert alert-${variant}`;
            runHint.style.display = 'block';
        };
        try {
            setHint(browser.i18n.getMessage('autoSyncRunning') || '⏳ Syncing...', 'info');
            await browser.runtime.sendMessage({ name: 'runAutoSyncNow' });
            // 刷新时间（兼容新字段 lastSyncAt 和旧字段 lastAutoSyncTime）
            const data = await browser.storage.local.get(['lastSyncAt', 'lastAutoSyncTime']);
            const ts = data?.lastSyncAt || data?.lastAutoSyncTime;
            if (ts) {
                const t = new Date(ts).toLocaleString();
                setLastSyncText(t);
                setHint((browser.i18n.getMessage('autoSyncRunSuccess') || '✅ Synced at ') + t, 'success');
            } else {
                setHint(browser.i18n.getMessage('autoSyncRunDone') || '✅ Sync completed', 'success');
            }
        } catch (e: any) {
            console.error(e);
            setHint((browser.i18n.getMessage('autoSyncRunError') || '❌ Sync failed: ') + (e?.message || String(e)), 'danger');
        }
    }

    return (
        <Container>
            <Form id='formOptions' name='formOptions'>
                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('githubToken')}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <InputGroup size="sm">
                            <Form.Control name="githubToken" ref={register} type="text" placeholder="github token" size="sm" />
                            <InputGroup.Append>
                                <Button variant="outline-secondary" as="a" target="_blank" rel="noopener noreferrer" href="https://github.com/settings/tokens/new" size="sm">{browser.i18n.getMessage('getToken') || 'Get Token'}</Button>
                            </InputGroup.Append>
                        </InputGroup>
                        <div className="form-help">{browser.i18n.getMessage('githubTokenHelp') || '需要一个有 gist 权限的 Personal Access Token (classic)'}</div>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('gistID')}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        {/* Gist ID 输入框独占整行，不再被按钮挤压，避免输入体验受影响 */}
                        <Form.Control name="gistID" ref={register} type="text" placeholder="e.g. a1b2c3d4e5f6..." size="sm" />
                        <div className="form-actions">
                            <a href="https://gist.github.com/" target="_blank" rel="noopener noreferrer">
                                {browser.i18n.getMessage('createNewGist') || '📝 创建 Gist'} ↗
                            </a>
                            <span className="sep">|</span>
                            <Button
                                variant="link"
                                size="sm"
                                style={{ padding: 0, fontSize: '12px', lineHeight: 1.4 }}
                                disabled={!gistID}
                                as="a"
                                target="_blank"
                                rel="noopener noreferrer"
                                href={gistUrl || '#'}
                                onClick={(e: React.MouseEvent) => { if (!gistID) e.preventDefault(); }}
                                title={gistID ? browser.i18n.getMessage('viewGistTitle') || `View "${gistFileName}" on GitHub` : (browser.i18n.getMessage('viewGistHint') || 'Save the Gist ID first')}
                            >
                                {browser.i18n.getMessage('viewGist') || 'View Gist'} ↗
                            </Button>
                        </div>
                        <div className="form-help">{browser.i18n.getMessage('gistIDHelp') || '粘贴 Gist URL 中的 ID 部分（例如 gist.github.com/&lt;ID&gt;，只填 &lt;ID&gt; 这一段，不要带 URL）'}</div>
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('gistFileName')}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Form.Control name="gistFileName" ref={register} type="text" placeholder="gist file name" size="sm" />
                    </Col>
                </Form.Group>
                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('enableNotifications')}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Form.Check
                            id="enableNotify"
                            name="enableNotify"
                            ref={register}
                            type="switch"
                            aria-label={browser.i18n.getMessage('enableNotifications') || 'Enable desktop notifications'}
                        />
                    </Col>
                </Form.Group>

                {/* =============== 自动同步区域 =============== */}
                <hr />
                <h5 style={{ marginTop: '1rem' }}>⏰ {browser.i18n.getMessage('autoSyncSection') || 'Scheduled Auto Sync'}</h5>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('autoSyncEnable') || 'Enable Auto Sync'}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Form.Check
                            id="enableAutoSync"
                            name="enableAutoSync"
                            ref={register}
                            type="switch"
                            label={browser.i18n.getMessage('autoSyncEnableDesc') || 'Sync bookmarks automatically on a schedule'}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('autoSyncInterval') || 'Interval'}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Form.Control
                            as="select"
                            name="autoSyncInterval"
                            ref={register}
                            size="sm"
                            disabled={!enableAutoSync}
                            style={{ maxWidth: '240px' }}
                        >
                            {INTERVAL_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </Form.Control>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('autoSyncDirection') || 'Sync Direction'}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Form.Control
                            as="select"
                            name="autoSyncDirection"
                            ref={register}
                            size="sm"
                            disabled={!enableAutoSync}
                            style={{ maxWidth: '240px' }}
                        >
                            <option value="bidirectional">{browser.i18n.getMessage('autoSyncDirBoth') || 'Bidirectional (download then upload)'}</option>
                            <option value="upload">{browser.i18n.getMessage('autoSyncDirUpload') || 'Upload only (local → Gist)'}</option>
                            <option value="download">{browser.i18n.getMessage('autoSyncDirDownload') || 'Download only (Gist → local)'}</option>
                        </Form.Control>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('autoSyncOnStartup') || 'On Browser Startup'}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Form.Check
                            id="autoSyncOnStartup"
                            name="autoSyncOnStartup"
                            ref={register}
                            type="switch"
                            disabled={!enableAutoSync}
                            label={browser.i18n.getMessage('autoSyncOnStartupDesc') || 'Trigger a sync immediately when browser starts'}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('autoSyncLastTime') || 'Last Auto Sync'}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <div style={{ paddingTop: '6px', color: '#666' }}>
                            {lastSyncText || '-'}
                            <Button
                                size="sm"
                                variant="outline-primary"
                                style={{ marginLeft: '12px' }}
                                onClick={onRunNow}
                            >
                                {browser.i18n.getMessage('autoSyncRunNow') || 'Run Now'}
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                style={{ marginLeft: '8px' }}
                                onClick={onSave}
                            >
                                {browser.i18n.getMessage('autoSyncSave') || 'Save'}
                            </Button>
                        </div>
                        {saveHint && <Alert variant="success" style={{ marginTop: '8px', padding: '6px 12px' }}>{saveHint}</Alert>}
                        <Alert id="runNowHint" variant="info" style={{ marginTop: '8px', padding: '6px 12px', display: 'none' }}></Alert>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}></Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <a href="https://github.com/dudor/BookmarkHub" target="_blank">{browser.i18n.getMessage('help')}</a>
                    </Col>
                </Form.Group>

                {/* =============== 高级功能：AI 整理书签 =============== */}
                <hr />
                <h5 style={{ marginTop: '1rem' }}>{browser.i18n.getMessage('aiOrganizeSection') || '🤖 AI Organize Bookmarks'}</h5>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>{browser.i18n.getMessage('aiOrganizeBackendUrl') || 'Backend URL'}</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Form.Control
                            name="aiOrganizeBackendUrl"
                            ref={register}
                            type="text"
                            placeholder="http://103.11.78.250:18903"
                            size="sm"
                        />
                        <div className="form-help">{browser.i18n.getMessage('aiOrganizeBackendUrlHelp') || 'Default demo backend. If you self-host, change to your own URL.'}</div>
                    </Col>
                </Form.Group>

                <Form.Group as={Row}>
                    <Form.Label column="sm" sm={3} lg={2} xs={3}>🤖</Form.Label>
                    <Col sm={9} lg={10} xs={9}>
                        <Button
                            size="sm"
                            variant="primary"
                            id="aiOrganizeStartBtn"
                            disabled={!!aiIsRunning || aiStartPending}
                            onClick={async () => {
                                const btn = document.getElementById('aiOrganizeStartBtn') as HTMLButtonElement;
                                const hint = document.getElementById('aiOrganizeHint');
                                const setHint = (text: string, variant: 'info' | 'success' | 'danger' = 'info') => {
                                    if (!hint) return;
                                    hint.textContent = text;
                                    hint.className = `alert alert-${variant}`;
                                    hint.style.display = 'block';
                                };
                                try {
                                    setAiStartPending(true);
                                    // 先保存当前配置（包含新填的 backend URL）
                                    await optionsStorage.setAll(getValues());
                                    const r: any = await browser.runtime.sendMessage({ name: 'aiOrganizeStart' });
                                    if (r?.ok) {
                                        // 注意：整理过程中不再自动弹出 popup，避免干扰用户
                                        // popup 会在任务完成后由 background 自动弹出，显示结果详情
                                        setHint(browser.i18n.getMessage('aiOrganizeStartHint') || '✅ 任务已启动，整理完成后会自动弹出结果窗口', 'success');
                                    } else {
                                        setHint('❌ ' + (r?.error || 'Failed to start'), 'danger');
                                    }
                                } catch (e: any) {
                                    setHint('❌ ' + (e?.message || String(e)), 'danger');
                                } finally {
                                    setAiStartPending(false);
                                }
                            }}
                        >
                            {aiIsRunning
                                ? (browser.i18n.getMessage('aiOrganizeRunning') || 'AI 整理中…')
                                : (browser.i18n.getMessage('aiOrganizeRunButton') || '开始整理')}
                        </Button>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 6, lineHeight: 1.4 }}>
                            {browser.i18n.getMessage('aiOrganizeModalHint') || 'Will create an AIOrganized folder in your Gist. Click "Download Bookmarks" in popup after it completes.'}
                        </div>
                        <Alert id="aiOrganizeHint" variant="info" style={{ marginTop: '8px', padding: '6px 12px', display: 'none' }}></Alert>
                        {renderAiProgress()}
                    </Col>
                </Form.Group>
            </Form>
            {renderAiResultModal()}
        </Container >
    )
}


ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
  );