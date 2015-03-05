'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngMaterial',
  'ngRoute',
  'myApp.home',
  'myApp.register',
  'myApp.welcome',
  'myApp.addPost'
]).
config(['$mdThemingProvider', '$mdIconProvider', '$routeProvider',
function($mdThemingProvider, $mdIconProvider, $routeProvider) {
  $mdIconProvider
    .defaultIconSet('./images/avatars.svg', 128)
    .icon('menu', './images/menu.svg', 24);

  $mdThemingProvider.theme('default')
    .primaryPalette('green')
    .accentPalette('red');

  $routeProvider.otherwise({redirectTo: '/home'});
}]);
