'use strict';

require('jasmine-expect');

var Route = require('../../lib/route');

describe('lib: route.js ', function () {


  it('creates default route in constructor', function () {

    var route = new Route();
    expect(route.path).toBe('/*');
    expect(route.priority()).toBe(0);
    expect(route.matches('GET','/foo/bar')).toBe(true);
  });
  it('creates route in constructor', function () {

    var route = new Route({
      path: '/foo/*'
    });
    expect(route.path).toBe('/foo/*');
    expect(route.priority()).toBe(6);
    expect(route.matches('GET','/foo/')).toBe(true);
    expect(route.matches('GET','/foo/bar')).toBe(true);
    expect(route.matches('GET','/baz')).toBe(false);
  });

  it('applies delay and delegates', function (done) {
    var route = new Route({
      delay: 1000
    });

    var start = Date.now();
    route.resolve(function() {
      expect(false).toBe(true);
      done();
    },function() {
      expect(false).toBe(true);
      done();
    },function() {
      expect(Date.now()-start).not.toBeLessThan(990);
      done();
    });
  });

  it('matches wildcard method', function () {
    var route = new Route({
      path: '/foo',
      status: 500
    });

    expect(route.matches('GET','/foo')).toBe(true);
    expect(route.matches('POST','/foo')).toBe(true);
  });

  it('matches specific method', function () {
    var route = new Route({
      path: '/foo',
      status: 500,
      method: 'get'
    });

    expect(route.matches('GET','/foo')).toBe(true);
    expect(route.matches('get','/foo')).toBe(true);
    expect(route.matches('POST','/foo')).toBe(false);
  });

  it('applies status', function (done) {
    var route = new Route({
      status: 500
    });
    route.resolve(function(status) {
      expect(status).toBe(500);
      done();
    },function() {
      expect(false).toBe(true);
      done();
    },function() {
      expect(false).toBe(true);
      done();
    });
  });

  it('applies proxy', function (done) {
    var route = new Route({
      target: 'http://foo.com',
      delay: 1000
    });
    var start = Date.now();
    route.resolve(function() {
      expect(false).toBe(true);
      done();
    },function(target) {
      expect(target).toBe('http://foo.com');
      expect(Date.now()-start).not.toBeLessThan(990);
      done();
    },function() {
      expect(false).toBe(true);
      done();
    });
  });
});
