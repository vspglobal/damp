'use strict';


/*
    Static method to create the API routes in express

    router = instance of lib/router.js
    baseurl = baseurl of nodejs for building absolute paths

    returns express router
 */
function API(router, baseurl) {
    var wildcard = require('wildcard');
    var express = require('express');
    var expressRouter = express.Router();

    // handle requests to manage the routesets
    var bodyParser = require('body-parser');
    var jsonParser = bodyParser.json();

    expressRouter.route('/')
        .get(function (req, res) {
            res.send({
                routesets: baseurl+'/routesets'
            });
        });

    expressRouter.route('/routesets')
        .get(function(req, res) {
            router.getRouteSets(req.query.all !== undefined)
                .then(function (routesets) {
                    res.send(
                        routesets.map(function (rs) {
                            return {
                                name: rs.name,
                                routes: rs.routes,
                                self: baseurl + '/routesets/' + rs.name
                            };
                        }).filter(function (rs) {
                            return (!req.query.name || wildcard(req.query.name,rs.name));
                        })
                      );
                })
                .catch(function (err) {
                    res.status(500).send(err);
                });
        })
        .post(jsonParser, function(req,res) {
            var rs = req.body;
            if(!rs || !rs.name) {
                res.status(400).send('name is required');
            } else {
                router.getAppRouteSet(rs.name,true).then(function(routeset) {
                    routeset.setRoutes(rs.routes);
                    return routeset.store();
                }).then(function() {
                    res.status(201).send('Created');
                }).catch(function (err) {
                    res.status(500).send(err);
                });

            }
        });

    expressRouter.route('/routesets/:name')
        .get(function(req, res) {
            var rsName = req.params.name;
            var rs;
            if(rsName === '_default_') {
                rs = Promise.resolve(router.defaultRouteSet);
            } else {
                rs = router.getAppRouteSet(rsName);
            }

            rs.then(function(routeset) {
                res.send(
                    {
                        name: routeset.name,
                        routes: routeset.routes,
                        self: baseurl+'/routesets/' + routeset.name
                    }
                );
            }).catch(function(err) {
                res.sendStatus(404);
            });
        })
        .put(jsonParser, function(req,res) {
            var rsName = req.params.name;
            var rs = req.body;

            if(rsName === '_default_') {
                res.status(400).send('_default_ cannot be update via the API');
            } else {
                router.getAppRouteSet(rsName,true).then(function (routeset) {
                    routeset.setRoutes(rs.routes);
                    return routeset.store();
                }).then(function(routeset) {
                        res.send(
                            {
                                name: rsName,
                                routes: routeset.routes,
                                self: baseurl+'/routesets/' + rsName
                            }
                        );
                }).catch(function (err) {
                    console.error(err);
                    console.error(err.stack);
                    res.status(500).send(err);
                });

            }
        })
        .delete(jsonParser, function(req,res) {
            var rsName = req.params.name;

            if(rsName === '_default_') {
                res.status(400).send('_default_ cannot be update via the API');
            } else {
                router.getAppRouteSet(rsName,true).then(function (routeset) {
                    delete router.appRouteSets[rsName];
                    return routeset.delete();
                }).then(function() {
                    res.sendStatus(200);
                }).catch(function (err) {
                    console.error(err);
                    console.error(err.stack);
                    res.status(500).send(err);
                });

            }
        });

    return expressRouter;
}

module.exports = API;