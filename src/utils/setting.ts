import { Options } from 'webext-options-sync';
import optionsStorage from './optionsStorage'
export class SettingBase implements Options {
    constructor() { }
    [key: string]: string | number | boolean;
    githubToken: string = '';
    gistID: string = '';
    gistFileName: string = 'BookmarkHub';
    enableNotify: boolean = true;
    githubURL: string = 'https://api.github.com';
    // ===== 定时自动同步新增字段 =====
    enableAutoSync: boolean = false;
    autoSyncInterval: number = 60;
    autoSyncDirection: 'upload' | 'download' | 'bidirectional' = 'bidirectional';
    autoSyncOnStartup: boolean = true;
    // ===== AI 整理书签新增字段 =====
    aiOrganizeBackendUrl: string = 'http://103.11.78.250:18903';
}
export class Setting extends SettingBase {
    private constructor() { super() }
    static async build() {
        let options = await optionsStorage.getAll();
        let setting = new Setting();
        setting.gistID = options.gistID;
        setting.gistFileName = options.gistFileName;
        setting.githubToken = options.githubToken;
        setting.enableNotify = options.enableNotify;
        // ===== 同步新增字段 =====
        setting.enableAutoSync = (options.enableAutoSync as any) ?? false;
        setting.autoSyncInterval = Number(options.autoSyncInterval) || 60;
        const dir = (options.autoSyncDirection as any) || 'bidirectional';
        setting.autoSyncDirection = (dir === 'upload' || dir === 'download' || dir === 'bidirectional') ? dir : 'bidirectional';
        setting.autoSyncOnStartup = (options.autoSyncOnStartup as any) ?? true;
        // ===== AI 整理书签 =====
        setting.aiOrganizeBackendUrl = (options.aiOrganizeBackendUrl as any) || 'http://103.11.78.250:18903';
        return setting;
    }
}




// export class SettingBase {
//     constructor() { }
//     [key: string]: string | number | boolean;
//     githubToken: string = '';
//     gistID: string = '';
//     gistFileName: string = 'BookmarkHub';
//     enableNotify: boolean = true;
//     githubURL: string = 'https://api.github.com';
// }
// export class Setting extends SettingBase {
//     private constructor() { super() }
//     static async build() {
//         let options =new Setting();
//         let setting = new Setting();
//         setting.gistID = options.gistID;
//         setting.gistFileName = options.gistFileName;
//         setting.githubToken = options.githubToken;
//         setting.enableNotify = options.enableNotify;
//         return setting;
//     }
// }