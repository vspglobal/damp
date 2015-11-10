'use strict';

angular.module('dampApp', [
  'angular-loading-bar',
  'ngAnimate',
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngTable',
  'ngRoute',
  'ui.select',
  'ui.bootstrap'
])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .otherwise({
        redirectTo: '/'
      });

    $locationProvider.html5Mode(true);
  });
