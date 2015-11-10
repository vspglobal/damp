'use strict';

var UrlPattern = require('url-pattern');



/*

    params = {
        path: path to match on
        target: where the route proxies to
        status: HTTP status to force...this avoids actually calling the service
        delay: time to sleep (in milliseconds) before invoking the service
    }
 */
function Route(params) {
    if(!params) {
        params = {};
    }

    if(params.method) {
        this.method = params.method.toUpperCase();
    }
    this.path = params.path || '/*';
    this.target = params.target;
    this.status = params.status;
    this.delay = params.delay || 0;
}
module.exports = Route;

/*
    method to determine if the provided method and uri matches this configured route.

    return boolean
 */
Route.prototype.matches = function (method,uri) {
    return (!this.method || this.method === method.toUpperCase()) &&
        new UrlPattern(this.path).match(uri) !== null;
};

/*
    calculates the priority of the route...larger number is higher priority

    return number
 */
Route.prototype.priority = function() {
    if(!this.path || this.path === '/*') {
        return 0;
    } else {
        return this.path.length;
    }
};

/*
    method to resolve the route  calls one of callbacks based on the type of route
 */
Route.prototype.resolve = function(respondCB,proxyCB,continueCB) {
    var route = this;

    setTimeout(function () {
        if(route.status) {
            respondCB(route.status);
        } else if(route.target) {
            proxyCB(route.target);
        } else {
            continueCB();
        }
    }, route.delay);
};



