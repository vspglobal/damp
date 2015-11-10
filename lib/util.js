'use strict';


/* global -Promise */
var Promise = require('promise');
var fs    = require('fs'),
    path  = require('path');

function Util() { }


/*
    Static funciton to create a directory recursively and synchronously
 */
Util.mkdirp = function(dirpath) {
    return new Promise(function(resolve,reject) {
        var parts = dirpath.split(path.sep);
        for( var i = 1; i <= parts.length; i++ ) {
            try {
                fs.mkdirSync( '/'+path.join.apply(null, parts.slice(0, i)) );
            } catch(e) {
                if ( e.code !== 'EEXIST' ) {
                    reject(e);
                }
            }
        }

        resolve(true);
    });
};

module.exports = Util;