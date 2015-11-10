'use strict';

/* global -Promise */
var Promise = require('promise');
var fs = require('fs');
var httpProxy = require('http-proxy');
var RouteSet = require('./routeset');
var Route = require('./route');
var Util = require('./util');



/*
    Constructor for Router

    params = {
        defaultTarget: default target
        defaultDelay: default delay
        defaultRouteSetPath: path to load default routeset from
        appRouteSetBasedir: path to load app routesets from
        appHeaderName: name of header to check for applications
    }
 */
function Router(params) {
    if(!params) {
        params = {};
    }


    this.defaultRouteSetPath = params.defaultRouteSetPath;
    if(params.defaultDelay || params.defaultTarget) {
        this.defaultRoute = new Route({
            delay: params.defaultDelay,
            target: params.defaultTarget
        });
    }
    this.appRouteSetBasedir = params.appRouteSetBasedir;
    this.appHeaderName = params.appHeaderName?params.appHeaderName.toLowerCase():null;
    this.appRouteSets = {};

    var router = this;
    Util.mkdirp(this.appRouteSetBasedir).then(function() {
        console.log('App routes being persisted at %s',router.appRouteSetBasedir);
    });
}

/*
    Method to initialize the Router.  No arguments.

    Returns promise from Router.getRouteSets()

 */
Router.prototype.init = function() {
    var router = this;
    return RouteSet.load(router.defaultRouteSetPath)
        .then(function(rs) {
            rs.name = '_default_';
            if(router.defaultRoute) {
                rs.addRoute(router.defaultRoute);
            }
            rs.toLog();
            router.defaultRouteSet = rs;

            return router.getRouteSets(true);
        });
};

module.exports = Router;

/*
    Method to get all the routesets for the router

    'all' - boolean, true to load routesets from file or false to only return the ones known in memory

    Returns promise with list of Routesets
 */
Router.prototype.getRouteSets = function(all) {
    var router = this;

    var getRoutes = function() {
        var routesets = Object.keys(router.appRouteSets).map(function(k) {
            return router.appRouteSets[k];
        });
        routesets.push(router.defaultRouteSet);
        return routesets;
    };

    if(all) {
        return new Promise(function(resolve,reject) {
            fs.readdir(router.appRouteSetBasedir, function (err, files) {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        }).then(function(files) {
                return Promise.all(
                    files.map(function (f) {
                        var match = /^(.+)\.yml$/.exec(f);
                        if (match) {
                            return router.getAppRouteSet(match[1], true);
                        } else {
                            return Promise.resolve(true);
                        }
                    })
                );
        }).then(function () {
            return getRoutes();
        });
    } else {
        return Promise.resolve(getRoutes());
    }
};


/*
    Resolve the request into the repsonse by resolving the routesets.  First tries resolving from a request specific routeset, otherwise resolving from the default routeset.

    'req' - Node.js request
    'res' - Node.js response

    Returns promise from Router.resolveRouteSet
 */
Router.prototype.resolve = function(req,res) {

    var router = this;
    return this.resolveRequestRouteSet(req,res)
        .catch(function() {
            return router.resolveDefaultRouteSet(req,res);
        });
};

/*
 Resolve the request into the repsonse by resolving the request routeset, or reject if none matches

 'req' - Node.js request
 'res' - Node.js response

 Returns promise from Router.resolveRouteSet
 */
Router.prototype.resolveRequestRouteSet = function(req,res) {
    var router = this;
    return this.getRequestRouteSet(req).then( function(requestRouteSet) {
        if(requestRouteSet) {
            return router.resolveRouteSet(requestRouteSet,req,res);
        } else {
            return Promise.reject(true);
        }
    });
};

/*
 Resolve the request into the repsonse from the default route set

 'req' - Node.js request
 'res' - Node.js response

 Returns promise from Router.resolveRouteSet
 */

Router.prototype.resolveDefaultRouteSet = function(req,res) {
    return this.resolveRouteSet(this.defaultRouteSet,req,res);
};

// setup the proxy
var proxy = httpProxy.createProxyServer();

/*
    Handle proxy errors by logging and returning 500
 */
proxy.on('error', function (err, req, res) {
    var m = '?', u = '?', rs='?', t='?';
    if(req) {
        m = req.method;
        u = req.url;
        rs = req._routeset;
        t = req._target;
    }
    console.error('%s %s %s routeset:%s target:%s err:%s',new Date().toLocaleString(),m,u,rs,t,err);

    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });

    res.end('Something went wrong...');
});

/*
 Handle proxy response by logging
 */
proxy.on('proxyRes', function (proxyRes, req, res) {
    var runtime = Date.now() - req._start;
    console.log('%s %s %s routeset:%s target:%s status:%d time:%d',new Date().toLocaleString(),req.method,req.url,req._routeset,req._target,proxyRes.statusCode,runtime );
});

/*
 Handle proxy request by setting header for original Host header
 */
proxy.on('proxyReq', function(proxyReq, req, res, options) {
    proxyReq.setHeader('X-Forwarded-Host',req.headers.host+':'+req.socket.address.port);
});

/*
    Resolve a specific routeset by calling resolve on it with the method and URL from the request

     'routeset' - Routset to resolve against
     'req' - Node.js request
     'res' - Node.js response

     Returns a promise that resolves to 'true' if it is handled or 'false' if the routeset didn't resolve the request
 */
Router.prototype.resolveRouteSet = function(routeset,req,res) {
    return new Promise(function(resolve,reject) {
        req._start = Date.now();
        routeset.resolve(req.method, req.url, function(status) {
            // resp
            var runtime = Date.now() - req._start;
            console.log('%s %s %s routeset:%s target:- status:%d time:%d',new Date().toLocaleString(),req.method,req.url,routeset.name,status,runtime );
            res.writeHead( status );
            res.end();

            resolve(true);
        },function(target) {
            // proxy
            req._target = target;
            req._routeset = routeset.name;
            proxy.web(req, res, {
                target: target,
                xfwd: true,
                secure: false
            });
            resolve(true);
        }, function() {
            // continue
            reject(true);
        });
    });
};

/*
 Try to find the routeset configured for the request by looking at host and transaction id headers

 'req' - Node.js request

 Returns a promise that resolves to the routeset or false if doesn't match
 */
Router.prototype.getRequestRouteSet = function(req) {
    var appHeader = req.headers[this.appHeaderName];
    var router = this;

    return new Promise(function(resolve,reject) {
            if (appHeader) {
                var match = /damp-appname:(.+)$/.exec(appHeader);
                if (match) {
                    resolve(router.getAppRouteSet(match[1]));
                } else {
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        }).then(function(routeset) {
            if(!routeset) {
                var match = /damp-routeset:(.+)$/.exec(appHeader);
                if(match) {
                    routeset = RouteSet.decode(match[1]);
                }
            }

            return routeset;
        }).then(function (routeset) {
            // still here...parse the host
            if(!routeset) {
                try {
                    var appname = req.headers.host.split('.')[0];
                    routeset = router.getAppRouteSet(appname);
                } catch (e) {}
            }

            return routeset;
        });
};

/*
 Get the routeset for a given application name

 'appName' - Name of app to get routeset for
 'createIfMissing' - boolean.  True to create an empty routeset if one doesn't exist for that name

 Returns a Routeset
 */
Router.prototype.getAppRouteSet = function(appName, createIfMissing) {
    var appRouteSet = this.appRouteSets[appName];

    if(appRouteSet) {
        return Promise.resolve(appRouteSet);
    } else {
        var router = this;
        return RouteSet.load(router.appRouteSetBasedir+'/'+appName+'.yml')
        .then(function (rs) {
            rs.name = appName;
            if(!rs.routes.length && !createIfMissing) {
                rs = null;
            } else {
                router.appRouteSets[appName] = rs;
            }

            return rs;
        });
    }
};



