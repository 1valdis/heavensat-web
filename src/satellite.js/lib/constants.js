"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.xke = exports.x2o3 = exports.vkmpersec = exports.twoPi = exports.tumin = exports.rad2deg = exports.pi = exports.mu = exports.minutesPerDay = exports.j4 = exports.j3oj2 = exports.j3 = exports.j2 = exports.earthRadius = exports.deg2rad = void 0;
var pi = exports.pi = Math.PI;
var twoPi = exports.twoPi = pi * 2;
var deg2rad = exports.deg2rad = pi / 180.0;
var rad2deg = exports.rad2deg = 180 / pi;
var minutesPerDay = exports.minutesPerDay = 1440.0;
var mu = exports.mu = 398600.8; // in km3 / s2
var earthRadius = exports.earthRadius = 6378.135; // in km
var xke = exports.xke = 60.0 / Math.sqrt(earthRadius * earthRadius * earthRadius / mu);
var vkmpersec = exports.vkmpersec = earthRadius * xke / 60.0;
var tumin = exports.tumin = 1.0 / xke;
var j2 = exports.j2 = 0.001082616;
var j3 = exports.j3 = -0.00000253881;
var j4 = exports.j4 = -0.00000165597;
var j3oj2 = exports.j3oj2 = j3 / j2;
var x2o3 = exports.x2o3 = 2.0 / 3.0;