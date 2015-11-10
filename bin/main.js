#!/usr/bin/env node

'use strict';

var pjson = require('../package.json');
var os = require('os');
var program = require('commander');

program
    .version(pjson.version)
    .option('-c, --config <s>', 'Path to proxy config',process.env.CONFIG_PATH||'.damp.yml')
    .option('-a, --appconfig <s>', 'Path to app proxy configs',process.env.APP_CONFIG_PATH||os.tmpdir()+'/damp/')
    .option('-X, --appheader <s>', 'Header to use for app routesets',process.env.APP_HEADER||'X-TransactionID')
    .option('-t, --target <s>', 'Proxy target',process.env.DEFAULT_TARGET||'http://localhost:8080')
    .option('-d, --delay <n>', 'Delay in milliseconds',process.env.DEFAULT_DELAY||0)
    .option('-p, --port <n>', 'Port to listen on',process.env.PORT||8000)
    .parse(process.argv);

console.log('Listening on %d with configs at %s',program.port, program.appconfig);
console.log('');


var App = require('../server');
App.run(program);

