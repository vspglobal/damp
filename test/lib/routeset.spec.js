'use strict';

require('jasmine-expect');

var os = require('os');
var fs = require('fs');
var Route = require('../../lib/route');
var RouteSet = require('../../lib/routeset');

describe('lib: routeset.js ', function () {


  it('applies multiple delays and continues', function (done) {
    var route = new Route({
      delay: 1000
    });

    var routeset = new RouteSet();

    routeset.addRoute(route);
    routeset.addRoute(route);

    var start = Date.now();
    routeset.resolve('GET','/foo',
    function() {
      expect(false).toBe(true);
      done();
    },function() {
      expect(false).toBe(true);
      done();
    },function() {
      expect(Date.now()-start).not.toBeLessThan(2000);
      done();
    });
  });

  it('applies delay then status', function (done) {
    var route = new Route({
      path: '/foo',
      delay: 1000
    });
    var route2 = new Route({
      status: 500
    });

    var routeset = new RouteSet();

    routeset.addRoute(route);
    routeset.addRoute(route2);

    var start = Date.now();
    routeset.resolve('GET','/foo',
        function(status) {
          expect(status).toBe(500);
          expect(Date.now()-start).not.toBeLessThan(1000);
          done();
        },function() {
          expect(false).toBe(true);
          done();
        },function() {
          expect(false).toBe(true);
          done();
        });
  });

  it('applies delay then proxy', function (done) {
    var route = new Route({
      path: '/foo',
      delay: 1000
    });
    var route2 = new Route({
      target: 'http://foo.com'
    });

    var routeset = new RouteSet();

    routeset.addRoute(route);
    routeset.addRoute(route2);

    var start = Date.now();
    routeset.resolve('GET','/foo',
        function() {
          expect(false).toBe(true);
          done();
        },function(target) {
          expect(target).toBe('http://foo.com');
          expect(Date.now()-start).not.toBeLessThan(1000);
          done();
        },function() {
          expect(false).toBe(true);
          done();
        });
  });

  it('applies most specific route', function (done) {
    var route = new Route({
      path: '/foo/*',
      status: 500
    });
    var route2 = new Route({
      path: '/foo/bar',
      status: 200
    });

    var routeset = new RouteSet();

    routeset.addRoute(route);
    routeset.addRoute(route2);

    routeset.resolve('GET','/foo/bar',
    function(status) {
      expect(status).toBe(200);
      done();
    },function() {
      expect(false).toBe(true);
      done();
    },function() {
      expect(false).toBe(true);
      done();
    });
  });

  it('decodes base64', function () {
    var route = new Route({
      path: '/foo/*',
      status: 500
    });
    var route2 = new Route({
      path: '/foo/bar',
      status: 200
    });

    var routeset = new RouteSet();
    routeset.addRoute(route);
    routeset.addRoute(route2);

    var base64str = new Buffer(JSON.stringify(routeset.routes)).toString('base64');

    var routeset2 = RouteSet.decode(base64str);

    expect(routeset2.routes.length).toBe(2);
    expect(routeset2.routes[0].status).toBe(500);
    expect(routeset2.routes[0].path).toBe('/foo/*');
    expect(routeset2.routes[1].status).toBe(200);
    expect(routeset2.routes[1].path).toBe('/foo/bar');

  });

  it('loads and stores routesets', function (done) {
    var tmp = os.tmpdir();
    var route = new Route({
      path: '/foo/*',
      status: 500
    });
    var route2 = new Route({
      path: '/foo/bar',
      status: 200
    });

    var path = tmp+'/test-routeset.yml';

    try {
      fs.unlinkSync(path);
    } catch (e) {}

    RouteSet.load(path)
        .then(function (routeset) {
          routeset.addRoute(route);
          routeset.addRoute(route2);
          return routeset.store();
        }).then(function () {
          return RouteSet.load(path);
        }).then(function(routeset2) {
          expect(routeset2.routes.length).toBe(2);
          expect(routeset2.routes[0].status).toBe(500);
          expect(routeset2.routes[0].path).toBe('/foo/*');
          expect(routeset2.routes[1].status).toBe(200);
          expect(routeset2.routes[1].path).toBe('/foo/bar');
          done();
        }).catch(function (err) {
          console.error(err);
          console.error(err.stack);
          expect(err).toBe(null);
          done();
        });
  });

});
