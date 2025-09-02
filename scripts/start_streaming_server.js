#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Simple helper to start a bundled streaming server binary (if present)
// Usage: require('./scripts/start_streaming_server').start({ ...opts })

function findBinary(explicitPath) {
    if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;

    // common locations inside the repo where you can place binaries
    const platform = process.platform; // 'win32', 'linux', 'darwin'
    // Prefer 'stremio-service' or 'stremio-service.exe' (requested), then fallback to 'stremio-streaming-server'
    const candidates = [
        // preferred service binary (platform-specific)
        path.resolve(__dirname, '..', 'bin', platform, 'stremio-service'),
        path.resolve(__dirname, '..', 'bin', platform, 'stremio-service.exe'),
        path.resolve(__dirname, '..', 'bin', 'stremio-service'),
        path.resolve(__dirname, '..', 'bin', 'stremio-service.exe'),
        // legacy streaming-server binary
        path.resolve(__dirname, '..', 'bin', platform, 'stremio-streaming-server'),
        path.resolve(__dirname, '..', 'bin', 'stremio-streaming-server'),
        path.resolve(__dirname, '..', 'bin', platform, 'stremio-streaming-server.exe'),
        path.resolve(__dirname, '..', 'bin', 'stremio-streaming-server.exe'),
    ];

    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return null;
}

function start(opts = {}) {
    const { binaryPath, args = [], detached = true, env = {} } = opts;

    const bin = findBinary(binaryPath);
    if (!bin) {
        console.warn('[start_streaming_server] No bundled streaming server binary found.');
        return null;
    }

    try {
        // If attached mode is requested, do not detach and inherit stdio so logs are visible
        const attached = !!opts.attached || process.env.STREAMING_SERVER_ATTACHED === '1';
        const spawnOpts = {
            detached: !attached && !!detached,
            env: Object.assign({}, process.env, env)
        };
        spawnOpts.stdio = attached ? 'inherit' : 'ignore';

        const child = spawn(bin, args, spawnOpts);
        if (!attached) {
            // detach so http_server can exit independently if desired
            try { child.unref(); } catch (e) { /* ignore */ }
        }
        console.info(`[start_streaming_server] Launched streaming server: ${bin} (attached=${attached})`);
        return child;
    } catch (err) {
        console.error('[start_streaming_server] Failed to spawn streaming server:', err);
        return null;
    }
}

function startStub(port = 11470) {
    // A very small stub server that responds to health checks and minimal endpoints
    const express = require('express');
    const app = express();

    app.get('/', (_req, res) => res.json({ status: 'ok', stub: true }));
    app.get('/version', (_req, res) => res.json({ version: 'stub-0.0.0' }));

    const server = app.listen(port, () => console.info(`[start_streaming_server] Stub streaming server listening on ${port}`));
    return server;
}

module.exports = {
    start,
    startStub,
    findBinary
};
