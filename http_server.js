#!/usr/bin/env node

// Copyright (C) 2017-2023 Smart code 203358507

const INDEX_CACHE = 7200;
const ASSETS_CACHE = 2629744;
const HTTP_PORT = 8080;

const express = require('express');
const path = require('path');

const build_path = path.resolve(__dirname, 'build');
const index_path = path.join(build_path, 'index.html');

// Optionally start a bundled streaming server
let streamingServerProcess = null;
if (process.env.START_STREAMING_SERVER === '1' || process.env.START_STREAMING_STUB === '1') {
    try {
        const starter = require('./scripts/start_streaming_server');
        if (process.env.START_STREAMING_STUB === '1') {
            starter.startStub(Number(process.env.STREAMING_SERVER_PORT || 11470));
        } else {
            streamingServerProcess = starter.start({
                binaryPath: process.env.STREAMING_SERVER_BINARY || undefined,
                args: process.env.STREAMING_SERVER_ARGS ? process.env.STREAMING_SERVER_ARGS.split(' ') : [],
                attached: process.env.STREAMING_SERVER_ATTACHED === '1'
            });
        }
    } catch (err) {
        console.error('Failed to init bundled streaming server starter:', err);
    }
}

express().use(express.static(build_path, {
    setHeaders: (res, path) => {
        if (path === index_path) res.set('cache-control', `public, max-age: ${INDEX_CACHE}`);
        else res.set('cache-control', `public, max-age: ${ASSETS_CACHE}`);
    }
})).all('*', (_req, res) => {
    // TODO: better 404 page
    res.status(404).send('<h1>404! Page not found</h1>');
}).listen(HTTP_PORT, () => console.info(`Server listening on port: ${HTTP_PORT}`));

process.on('exit', () => {
    try {
        if (streamingServerProcess && typeof streamingServerProcess.kill === 'function') {
            streamingServerProcess.kill();
        }
    } catch (e) {
        // ignore
    }
});
