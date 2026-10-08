import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { catalogs } from '../src/services/catalogs.js';
import { upsertValidated } from '../src/services/upsert.js';

test('bundle CommonJS do Netlify inicia e atende health, ready e medidas', async () => {
  const mongo = await MongoMemoryServer.create();
  const bundlePath = path.resolve('node_modules/.cache/api-laudo-pneus/netlify-regression/api.cjs');
  try {
    await mongoose.connect(mongo.getUri());
    const { Model, rows, keys } = catalogs.medidas;
    await upsertValidated(Model, rows, keys);
    await mongoose.disconnect();
    await build({
      entryPoints: ['netlify/functions/api.js'], outfile: bundlePath,
      bundle: true, platform: 'node', format: 'cjs', target: 'node22', packages: 'external'
    });
    const code = `
      const { handler } = require(${JSON.stringify(bundlePath)});
      (async () => {
        const results = [];
        for (const route of ['/health','/ready','/api/medidas']) {
          const response = await handler({path:'/.netlify/functions/api'+route,httpMethod:'GET',headers:{},body:null,queryStringParameters:{}},{});
          const body = JSON.parse(response.body);
          results.push({route,status:response.statusCode,records:Array.isArray(body)?body.length:undefined});
        }
        console.log(JSON.stringify(results));
        await require('mongoose').disconnect();
      })().catch(error => { console.error(error.name); process.exit(1); });
    `;
    const child = spawn(process.execPath, ['-e', code], {
      env: { ...process.env, NODE_ENV: 'test', MONGO_URI: mongo.getUri(), LAMBDA_TASK_ROOT: process.cwd() },
      stdio: ['ignore','pipe','pipe'], windowsHide: true
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    const status = await new Promise((resolve,reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error('Bundle excedeu tempo de teste')); }, 20000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(status, 0, stderr);
    const results = JSON.parse(stdout.trim());
    assert.deepEqual(results.map(r => r.status), [200,200,200]);
    assert.equal(results[2].records, 9);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
    await fs.rm(bundlePath, { force: true });
  }
});
