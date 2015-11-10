angular.module('dampApp')
  .factory("routesetService",["$http", function ($http) {

    return {
      search:  function (query,cb) {
        var url = "/_api/routesets?all&name="+query;

        $http.get(url).success(cb);
      },
      create:  function (routeset,cb) {
        var url = "/_api/routesets";
        $http.post(url, routeset).success(cb);
      },
      delete:  function (routeset,cb) {
        $http.delete(routeset.self).success(cb);
      },
      update:  function (routeset,cb) {
        $http.put(routeset.self,{
          routes: routeset.routes.map(function (r) {
            var newR = { };
            if(r.method && r.method !== 'ALL') {
              newR.method = r.method;
            }

            if(r.path) {
              newR.path = r.path;
            }

            if(r.delay) {
              newR.delay = r.delay;
            }
            if(r.status) {
              newR.status = r.status;
            }
            if(r.target) {
              newR.target = r.target;
            }

            return newR;
          })
        }).success(cb);
      },
    };


  }]
 )
