'use strict';

/* global -Promise */
var Promise = require('promise');
var yaml = require('js-yaml');
var Route = require('./route');
var Util = require('./util');

var fs    = require('fs'),
    path  = require('path');

/*
    params = {
        persistencePath: path persist the routes to
    }
 */
function RouteSet(params) {
    if(!params) {
        params = {};
    }
    this.persistencePath = params.persistencePath;
    this.name = params.name;
    this.routes = [];
}
module.exports = RouteSet;


/*
    Add provided route to the routeset
 */
RouteSet.prototype.addRoute = function(route) {
    this.routes.push(route);
};



/*
    Utility to log the route to the console
 */
RouteSet.prototype.toLog = function() {
    console.log('RouteSet name:%s path:%s',this.name||'-', this.persistencePath||'-');

    this.routes.forEach(function(r) {
        console.log('  path:%s delay:%s status:%s target:%s', r.path, r.delay||'-', r.status||'-', r.target||'-');
    });
};

/*
    Load the routes from the 'routes' parameter. Creates copies of the Routes
 */
RouteSet.prototype.setRoutes = function(routes) {
    if(Array.isArray(routes)) {
        this.routes = routes.map(function (r) {
            return new Route(r);
        });
    }
};

/*
    Decode the Base64 JSON representation of an array of routes and sets the routes in new routeset

    returns new routeset
 */
RouteSet.decode = function (base64str) {
    var rs =  new RouteSet();

    var routes = JSON.parse(new Buffer(base64str, 'base64').toString('ascii'));
    rs.setRoutes(routes);

    return rs;
};

/*
    Static method to load routeset from a path on the filesystem, persistencePath

    return Promise that returns the routeset
 */
RouteSet.load = function(persistencePath) {
    var rs = new RouteSet({persistencePath: persistencePath});

    if(persistencePath) {
        return new Promise(function(resolve,reject) {
            fs.stat(persistencePath, function (err, stats) {
                if (err) {
                    resolve(false);
                } else {
                    resolve(stats);
                }
            });
        }).then(function(stats) {
            if(stats && stats.isFile()) {
                return new Promise(function(resolve,reject) {
                    fs.readFile(persistencePath, 'utf8', function (err, file) {
                        if (err) {
                            // ignore error...just don't load
                            resolve(rs);
                        } else {
                            var routes = yaml.safeLoad(file);
                            rs.setRoutes(routes);
                            resolve(rs);
                        }
                    });
                });

            } else {
                // don't try to load
                return Promise.resolve(rs);
            }

        });
    } else {
        return Promise.resolve(rs);
    }
};

/*
    method on Routeset to store the routes to disk.

    returns promise that returns true or an error
 */
RouteSet.prototype.store = function() {
    if(this.persistencePath) {
        var routeset = this;
        return Util.mkdirp(path.dirname(routeset.persistenceBase))
            .then(function() {
                return new Promise(function(resolve,reject) {
                    fs.writeFile(routeset.persistencePath, yaml.safeDump(routeset.routes, {skipInvalid:true}), function(err) {
                        if(err) {
                            reject(err);
                        } else {
                            resolve(true);
                        }
                    });
                });
            });
    } else {
        return Promise.reject(new Error('No persistencePath to store to'));
    }
};

/*
 method on Routeset to delete the routeset from disk.

 returns promise that returns true or an error
 */
RouteSet.prototype.delete = function() {
    if(this.persistencePath) {
        var routeset = this;
        var unlink = Promise.denodeify(fs.unlink);
        return unlink(routeset.persistencePath);
    } else {
        return Promise.reject(new Error('No persistencePath to store to'));
    }
};

/*
 method on Routeset to resolve the routes and apply the routes

 returns promise that returns promise from Route.resolve()
 */
RouteSet.prototype.resolve = function(method, url,respondCB,proxyCB,continueCB) {
    var routeChain = this.routes.filter(function (r) {
        return r.matches(method, url);
    }).sort(function(a,b) {
        return b.priority() - a.priority();
    });

    var tryNextRoute = function() {
        if(routeChain.length===0) {
            continueCB();
        } else {
            routeChain.shift().resolve(respondCB, proxyCB, tryNextRoute);
        }
    };

    tryNextRoute();
};


