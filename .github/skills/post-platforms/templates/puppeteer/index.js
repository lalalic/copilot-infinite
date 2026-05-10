// post/index.js — entry point for the post-platforms skill.
//
// Standalone (no qili-media internal deps). Vendored from
// https://github.com/lalalic/qili-media/tree/main/lib/post with the cookie
// passing replaced by a persistent per-platform userDataDir so the user logs
// in once and stays logged in.
//
// Usage:
//   const { post } = require('./index');
//   await post({
//     video: { filePath: '/abs/path/video.mp4', title: '...', description: '...', cover: '/abs/path/cover.jpg' },
//     targets: { youtube: {}, tiktok: {}, xiaohongshu: {} },     // platforms to post to
//     headless: false,                                            // false = let user log in interactively
//     profilesDir: '~/.qili-media/profiles'                       // persistent per-platform Chrome profile
//   });

const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');

const Uploaders = {
    youtube: require('./youtube'),
    tiktok: require('./tiktok'),
    xiaohongshu: require('./xiaohongshu'),
    wechat: require('./wechat'),
    kindle: require('./kindle'),
};

async function tmpFolder(prefix, fn) {
    const folder = path.join(os.tmpdir(), `${prefix}-${randomUUID()}`);
    fs.mkdirSync(folder);
    try {
        return await fn(folder);
    } finally {
        fs.rm(folder, { recursive: true, force: true }, () => {});
    }
}

async function download(url, toPath) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed: ${res.status} ${url}`);
    let finalPath = toPath;
    if (path.basename(toPath).indexOf('.') === -1) {
        const ct = res.headers.get('content-type') || '';
        const ext = ct.split('/').pop().split(';')[0] || 'bin';
        finalPath = `${toPath}.${ext}`;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(finalPath, buf);
    return finalPath;
}

function expandHome(p) {
    return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

async function post({
    video,
    targets = {},
    headless = false,
    profilesDir = '~/.qili-media/profiles',
    log = console.log,
    browserOpt = {},
}) {
    const baseProfilesDir = expandHome(profilesDir);
    fs.mkdirSync(baseProfilesDir, { recursive: true });

    return await tmpFolder('post-platforms', async (folder) => {
        // Materialize remote URLs to local files (puppeteer file inputs only
        // accept local paths).
        if (video.url && !video.filePath) {
            video.filePath = await download(video.url, path.join(folder, randomUUID() + '.mp4'));
        }
        if (video.cover && /^https?:\/\//.test(video.cover)) {
            video.cover = await download(video.cover, path.join(folder, randomUUID() + '.jpg'));
        }

        const result = {};
        // One browser per platform so userDataDir is isolated and login state
        // doesn't bleed between sites.
        for (const platformKey of Object.keys(targets)) {
            const Uploader = Uploaders[platformKey];
            if (!Uploader) {
                result[platformKey] = { error: `unknown platform: ${platformKey}` };
                continue;
            }
            const userDataDir = path.join(baseProfilesDir, platformKey);
            fs.mkdirSync(userDataDir, { recursive: true });

            let browser;
            try {
                browser = await Uploader.launch({
                    headless,
                    protocolTimeout: 60_000,
                    userDataDir,
                    ...browserOpt,
                });
                const uploader = new Uploader(video, targets[platformKey]);
                uploader.folder = folder;
                uploader.log = (m) => log(`[${platformKey}] ${m}`);
                const context = browser.defaultBrowserContext();
                const url = await uploader.run(context);
                result[platformKey] = url || 'done';
            } catch (e) {
                log(`[${platformKey}] FAIL ${e.message}`);
                result[platformKey] = { error: e.message };
            } finally {
                await browser?.close().catch(() => {});
            }
        }
        return result;
    });
}

module.exports = { post, Uploaders };
