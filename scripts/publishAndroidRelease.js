import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Input is the JSON returned by `eas build:view BUILD_ID --json`.
// An unfinished build can never become the advertised download.
const input = process.argv[2];
if (!input) throw new Error('Informe o arquivo JSON da compilação finalizada no Expo.');
const build = JSON.parse(await fs.readFile(input, 'utf8'));
if (build.project?.id !== '77a63f65-2c46-4086-86bb-1ff3c12ab560') throw new Error('A compilação não pertence ao projeto FM Pneus.');
if (build.status !== 'FINISHED' || build.platform !== 'ANDROID' || !/^\d+\.\d+\.\d+$/.test(build.appVersion)) throw new Error('A compilação Android ainda não está finalizada.');
const versionCode = Number(build.appBuildVersion), downloadUrl = build.artifacts?.applicationArchiveUrl || build.artifacts?.buildUrl;
const url = new URL(downloadUrl);
if (!Number.isInteger(versionCode) || versionCode <= 0 || url.protocol !== 'https:' || !['expo.dev', 'expo.io'].some(host => url.hostname === host || url.hostname.endsWith('.' + host)) || !url.pathname.endsWith('.apk')) throw new Error('O Expo não retornou um APK válido.');
const target = fileURLToPath(new URL('../src/data/app-release.json', import.meta.url));
const current = JSON.parse(await fs.readFile(target, 'utf8'));
if (versionCode < current.versionCode) throw new Error('Uma versão mais recente já foi publicada.');
await fs.writeFile(target, JSON.stringify({version: build.appVersion, versionCode, downloadUrl: url.href, notes: process.argv[3] || 'Melhorias e correções do aplicativo FM Pneus.', publishedAt: new Date().toISOString()}, null, 2) + '\n');
console.log('Aviso de atualização preparado. Publique src/data/app-release.json no GitHub para disponibilizar no aplicativo.');
