'use strict';

/*
    static function to create the proxy route in express

    router = an instance of lib/router.js

    returns the express Router after being configured
 */
function Proxy(router) {
    var express = require('express');
    var expressRouter = express.Router();


    expressRouter.use(function(req, res){
        router.resolve(req,res).catch(function(e) {
            console.error(e);
            console.error(e.stack);
        });
    });

    return expressRouter;
}

module.exports = Proxy;