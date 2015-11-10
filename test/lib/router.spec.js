'use strict';

require('jasmine-expect');

var os = require('os');
var fs = require('fs');
var Route = require('../../lib/route');
var RouteSet = require('../../lib/routeset');
var Router = require('../../lib/router');

describe('lib: router.js ', function () {
  var tmp = os.tmpdir();
  var appRouteSetBasedir = tmp+'/app-routesets';
  var appName = 'fooApp';

  afterEach(function() {
    try {
      fs.unlinkSync(appRouteSetBasedir+'/'+appName+'.yml');
    } catch (e) {}
  });

  beforeEach(function(done) {
    var defRouteSetPath = tmp+'/default-routeset.yml';

    try {
      fs.mkdirSync(appRouteSetBasedir);
    } catch (e) {}



    // application routes

    var routeset = new RouteSet({persistencePath: appRouteSetBasedir+'/'+appName+'.yml'});
    routeset.addRoute( new Route({
      path: '/foo/*',
      status: 500
    }));
    routeset.addRoute( new Route({
      path: '/foo/bar',
      status: 200
    }));
    routeset.store();

    // default routes

    try {
      fs.unlinkSync(defRouteSetPath);
    } catch (e) {}
    var routeset2 = new RouteSet({persistencePath: defRouteSetPath});
    routeset2.addRoute( new Route({
      path: '/baz',
      status: 201
    }));
    routeset2.store()
    .then(function() {
      done();
    });

    this.router = new Router({
      defaultDelay: 0,
      defaultTarget: 'http://baz.com',
      defaultRouteSetPath: defRouteSetPath,
      appRouteSetBasedir: appRouteSetBasedir,
      appHeaderName: 'x-transactionid'
    });
  });

  it('router loads application routes', function (done) {
    var r = this.router;
    r.init().then(function() {
      expect(r.defaultRouteSet.routes.length).toBe(2);

      r.getAppRouteSet(appName)
      .then(function(rs) {
        expect(rs.routes.length).toBe(2);
        done();
      });

    });
  });

  it('router determines app name from host header',function(done) {
    var req = {
      headers: {
        host: appName+'.vsp.com'
      }
    };

    this.router.getRequestRouteSet(req).then(function (reqRouteSet) {
      expect(reqRouteSet).not.toBe(null);
      expect(reqRouteSet.routes.length).toBe(2);
      expect(reqRouteSet.routes[0].status).toBe(500);
      done();
    }).catch(function (err) {
      expect(err).toBe(null);
    });
  });

  it('router determines app name from app header',function(done) {
    var req = {
      headers: {
        'x-transactionid': 'damp-appname:'+appName
      }
    };

    this.router.getRequestRouteSet(req).then(function (reqRouteSet) {
      expect(reqRouteSet).not.toBe(null);
      expect(reqRouteSet.routes.length).toBe(2);
      expect(reqRouteSet.routes[0].status).toBe(500);
      done();
    }).catch(function (err) {
      expect(err).toBe(null);
    });
  });

  it('router determines app name from base64 header',function(done) {

    var routeset = new RouteSet();
    routeset.addRoute( new Route({
      path: '/foo/*',
      status: 100
    }) );

    var base64str = new Buffer(JSON.stringify(routeset.routes)).toString('base64');

    var req = {
      headers: {
        'x-transactionid': 'damp-routeset:'+base64str
      }
    };

    this.router.getRequestRouteSet(req).then(function (reqRouteSet) {
      expect(reqRouteSet).not.toBe(null);
      expect(reqRouteSet.routes.length).toBe(1);
      expect(reqRouteSet.routes[0].status).toBe(100);
      done();
    }).catch(function (err) {
      expect(err).toBe(null);
    });
  });

});
