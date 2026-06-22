import OptionsSync from 'webext-options-sync';
/* global OptionsSync */

export default new OptionsSync({
    defaults: {
        githubToken: '',
        gistID: '',
        gistFileName: 'BookmarkHub',
        enableNotify: true,
        githubURL: 'https://api.github.com',
        // ===== 定时自动同步新增配置 =====
        enableAutoSync: false,            // 是否启用定时自动同步
        autoSyncInterval: 60,             // 同步间隔（分钟），最小 15
        autoSyncDirection: 'bidirectional', // 同步方向: upload | download | bidirectional
        autoSyncOnStartup: true,          // 浏览器启动时立即同步一次
        // ===== AI 整理书签新增配置 =====
        aiOrganizeBackendUrl: 'http://103.11.78.250:18903', // 后端服务地址
    },

    // List of functions that are called when the extension is updated
    migrations: [
        (savedOptions, currentDefaults) => {
            // Perhaps it was renamed
            // if (savedOptions.colour) {
            //     savedOptions.color = savedOptions.colour;
            //delete savedOptions.colour;
            // }
        },

        // Integrated utility that drops any properties that don't appear in the defaults
        OptionsSync.migrations.removeUnused
    ],
    logging: false
});