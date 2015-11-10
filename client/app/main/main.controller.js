'use strict';

angular.module('dampApp')
    .controller('MainCtrl', ['$timeout', '$scope', '$http', '$filter', '$routeParams', '$location', 'ngTableParams', 'routesetService', 'modalService', '$uibModal', '$route', function ($timeout, $scope, $http, $filter, $routeParams, $location, ngTableParams, routesetService, modalService, $uibModal, $route) {
        // query params
        $scope.query = $routeParams.query || '*';

        // callback to update the node list
        $scope.setQuery = function (new_query) {
            $scope.query = new_query;
            $scope.updateRoutes();
        }

        // rerun the search
        $scope.updateRoutes = function () {
            $location.search({
                'query': $scope.query
            });
        };

        // check if 2 routes are equal
        $scope.routesMatch = function (r1, r2) {
            if (r1 === r2) {
                return true;
            } else {
                return r1.id === r2.id;
            }
        };

        // display the help modal
        $scope.showHelp = function() {

            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'app/partials/help.html',
                controller: 'HelpCtrl',
                backdrop: true,
                keyboard: true,
                modalFade: true,
                size: 'md',
                resolve: {}
            });


            modalInstance.result.then(function () {
            }, function () {
            });
        };


        // delete a routeset...display confirmation first
        $scope.deleteRouteset = function (routeset) {
            var modalOptions = {
                closeButtonText: 'Cancel',
                actionButtonText: 'Delete',
                headerText: 'Delete App ' + routeset.name,
                bodyText: 'Are you sure you want to delete this app?'
            };

            modalService.showModal({}, modalOptions).then(function () {
                routesetService.delete(routeset, function () {
                    $route.reload();
                });
            });

        };

        // create a new application...modal to collect information
        $scope.createApp = function () {

            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'app/partials/app.html',
                controller: 'CreateAppCtrl',
                backdrop: true,
                keyboard: true,
                modalFade: true,
                size: 'sm',
                resolve: {}
            });


            modalInstance.result.then(function (routeset) {
                // success
                routesetService.create(routeset, function () {
                    $route.reload();
                })
            }, function () {
            });
        };

        // create a route in a routeset
        $scope.createRoute = function (routeset) {
            return $scope.updateRoute({routeset: routeset});
        };

        // update a route in a routeset
        $scope.updateRoute = function (route) {

            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'app/partials/route.html',
                controller: 'RouteCtrl',
                size: 'md',
                resolve: {
                    route: route
                }
            });

            modalInstance.result.then(function () {
                if (route.id) {// update
                } else { // create
                    route.routeset.routes.push(route);
                }

                routesetService.update(route.routeset, function () {
                    $route.reload();
                })
            }, function () {
            });
        };

        // delete a route from a routeset
        $scope.deleteRoute = function (route) {
            var modalOptions = {
                closeButtonText: 'Cancel',
                actionButtonText: 'Delete',
                headerText: 'Delete Route',
                bodyText: 'Are you sure you want to delete this route?',
            };

            modalService.showModal({}, modalOptions).then(function (result) {
                route.routeset.routes = route.routeset.routes.filter(function (r) {
                    return !$scope.routesMatch(route, r);
                })

                routesetService.update(route.routeset, function () {
                    $route.reload();
                });
            });

        };

        // run search
        $scope.routes = [];
        if ($scope.query) {
            $scope.loading = true;

            routesetService.search($scope.query, function (routesets) {
                $scope.loading = false;
                $scope.routesets = routesets;
                $scope.routeTable = new ngTableParams({
                    page: 1,
                    total: 1,
                    count: 5,
                    sorting: {
                        routesetName: 'asc',     // initial sorting
                        path: 'asc',     // initial sorting
                        method: 'asc'     // initial sorting
                    }
                }, {
                    groupBy: 'routesetName',
                    counts: [],
                    getData: function ($defer, params) {
                        var routes = routesets.map(function (routeset) {
                            routeset.routes.forEach(function (route) {
                                route.routesetName = routeset.name;
                                route.routeset = routeset;
                                route.method = route.method || 'ALL';

                                route.id = route.method.toLowerCase() + "-" + route.path.toLowerCase();

                                if (route.status < 300) {
                                    route.statusStyle = 'label-success';
                                } else if (route.status < 400) {
                                    route.statusStyle = 'label-info';
                                } else if (route.status < 500) {
                                    route.statusStyle = 'label-warning';
                                } else {
                                    route.statusStyle = 'label-danger';
                                }

                                switch (route.method) {
                                    case 'GET':
                                        route.methodStyle = 'label-success';
                                        break;
                                    case 'PUT':
                                        route.methodStyle = 'label-info';
                                        break;
                                    case 'POST':
                                        route.methodStyle = 'label-warning';
                                        break;
                                    case 'DELETE':
                                        route.methodStyle = 'label-danger';
                                        break;
                                    default:
                                        route.methodStyle = 'label-default';
                                        break;
                                }
                            });

                            return routeset.routes;
                        }).reduce(function (a, b) {
                            return a.concat(b);
                        }, []);

                        var orderedData = params.sorting() ? $filter('orderBy')(routes, params.orderBy()) : routes;

                        $defer.resolve(orderedData);
                    }
                });


            });
        }
    }]);


angular.module('dampApp')
    .controller('CreateAppCtrl', function ($scope, $uibModalInstance) {

        $scope.routeset = {};

        $scope.ok = function () {
            $uibModalInstance.close($scope.routeset);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    });

angular.module('dampApp')
    .controller('RouteCtrl', function ($scope, $uibModalInstance, route) {

        $scope.route = route;
        $scope.route.action = route.status?'Reply':'Proxy';
        $scope.methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];

        $scope.ok = function () {
            if($scope.route.action == 'Proxy') {
                $scope.route.status = undefined;
            } else if($scope.route.action == 'Reply') {
                $scope.route.target = undefined;
            }
            $uibModalInstance.close($scope.route);
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    });

angular.module('dampApp')
    .controller('HelpCtrl', function ($scope, $uibModalInstance ) {

        $scope.appheader = 'X-TransactionId';

        $scope.ok = function () {
            $uibModalInstance.close();
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    });



