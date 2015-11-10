'use strict';

require('jasmine-expect');

var os = require('os');
var fs = require('fs');
var App = require('../../server');
var request = require('supertest');
var Route = require('../../lib/route');
var RouteSet = require('../../lib/routeset');

describe('app: api.js ', function () {
    var tmp = os.tmpdir();
    var appRouteSetBasedir = tmp+'/index-spec-routesets';
    var appName = 'fooApp';
    var app;

    beforeEach(function (done) {
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
        routeset.store().then(function() {

            app = App.run({
                appconfig: appRouteSetBasedir,
                port: 12345
            });

            done();
        });

    });

    afterEach(function () {
        App.stop();
        try {
            fs.unlinkSync(appRouteSetBasedir+'/'+appName+'.yml');
        } catch (e) {}
    });


    it('responds to /_api', function (done) {
        request(app)
            .get('/_api')
            .expect(200, {
                routesets: '/_api/routesets'
            }, done);
    });

    it('responds to /_api/routesets', function (done) {
        request(app)
            .get('/_api/routesets')
            .expect(200)
            .expect(function(res) {
                if(res.body.length === 1) {
                    return 'Should only have 1 routeset';
                }
            }).end(done);
    });

    it('responds to POST /_api/routesets', function (done) {
        request(app)
            .post('/_api/routesets')
            .send({
                    name: 'bob',
                    routes: [
                        {
                            path: '/bob',
                            status: 500
                        }
                    ]
                })
            .set('Content-Type', 'application/json')
            .expect(201)
            .expect(function () {
                RouteSet.load(appRouteSetBasedir+'/bob.yml').then(function(routeset) {
                    expect(routeset.routes.length).toBe(1);
                    expect(routeset.routes[0].path).toBe('/bob');
                    expect(routeset.routes[0].status).toBe(500);
                    done();
                }).catch(function(e) {
                    done(e);
                });
            }).end(done);
    });

    it('responds to /_api/routesets/_default_', function (done) {
        request(app)
            .get('/_api/routesets/_default_')
            .expect(200)
            .expect(function(res) {
                if(res.body.length === 1) {
                    return 'Should only have 1 route';
                }
            }).end(done);
    });

    it('responds to /_api/routesets/'+appName, function (done) {
        request(app)
            .get('/_api/routesets/'+appName)
            .expect(200)
            .expect(function(res) {
                if(res.body.length === 1) {
                    return 'Should only have 1 route';
                }
            }).end(done);
    });

    it('responds to /_api/routesets/bad', function (done) {
        request(app)
            .get('/_api/routesets/bad')
            .expect(404)
            .end(done);
    });

    it('blocks PUT to /_api/routesets/_default_', function (done) {
        request(app)
            .put('/_api/routesets/_default_')
            .expect(400)
            .end(done);
    });

    it('blocks DELETE to /_api/routesets/_default_', function (done) {
        request(app)
            .delete('/_api/routesets/_default_')
            .expect(400)
            .end(done);
    });
});
