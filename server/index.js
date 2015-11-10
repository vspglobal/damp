'use strict';

var express = require('express');
var Router = require('../lib/router');
var favicon = require('serve-favicon');
var path  = require('path');

function App() {
}

var server;

/* Static method to run the express app
 args = {
     target: where the route proxies to by default
     delay: time to sleep (in milliseconds) before invoking the service by default
     config: path to yml file with default routeset
     appconfig: base directory to use for loading/storing application config
     appheader: HTTP header to check for determining which config to use
 }

return: express app
*/
App.run = function(args) {
    if(server) {
        throw new Error("server already running");
    }

    this.router = new Router({
        defaultTarget: args.target,
        defaultDelay: args.delay,
        defaultRouteSetPath: args.config,
        appRouteSetBasedir: args.appconfig,
        appHeaderName: args.appheader
    });

    this.router.init();

    // setup express
    var app = express();

    // redirect / to /_ui
    app.get('/',function(req,res) {
        res.redirect('/_ui/index.html');
    })

    // add the UI routes
    var favicon_path = path.normalize(__dirname + '/../client/favicon.ico');
    app.use(favicon(favicon_path));
    app.use('/_ui', express.static('client'));

    // add the API controller
    var API = require('./api');
    app.use('/_api', API(this.router, '/_api'));

    // add the proxy controller
    var Proxy = require('./proxy');
    app.use(Proxy(this.router));

    server = app.listen(args.port);

    return app;
}

/*
    Stop express server
 */
App.stop = function() {
    if(server) {
        server.close();
        server = null;
    }
}

module.exports = App;

