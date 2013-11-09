/*jslint browser: true, indent: 2 */
/*global Transparency, $, console */

"use strict";

var apikey = "1b71620f-a0f1-4448-afe9-069e40b1ef51";
var baseurl = "http://api.vasttrafik.se/bin/rest.exe/v1/";

var gDate = function (dd, tt) {
  var d = dd.split('-'), t = tt.split(':');
  return new Date(d[0], d[1], d[2], t[0], t[1]);
};

var base;

var timedecorator = function (params) {
  var date = this.rtDate === undefined ? this.date : this.rtDate;
  var time = this.rtTime === undefined ? this.time : this.rtTime;
  var dt = gDate(date, time);
  var to_return = (dt - base) / 1000 / 60;
  return to_return === 0 ? "Nu" : to_return;
};

var directives = {
  DepartureBoard : {
    Departure : {
      diff : { text: timedecorator }
    }
  }
};


var gotLocation = function (pos) {
  $.ajax({
    url: baseurl + "location.nearbystops?jsonpCallback=?",
    data: {
      "authKey": apikey,
      "format": "json",
      "originCoordLat": pos.coords.latitude,
      "originCoordLong": pos.coords.longitude,
      "maxNo": 30
    },
    dataType: "jsonp",
    cache: false
  }).done(function (data) {
    var filteredStops = data.LocationList.StopLocation.filter(function (item) { return item.track === undefined; });
    Transparency.render(document.getElementById("stops"), filteredStops);
    $(".dropdown-menu li a").click(function () {
      $(".btn:first-child").text($(this).text());
      $(".btn:first-child").val($(this).text());
    });

    $(".btn").text(filteredStops[0].name);
    $.ajax({
      url: baseurl + "departureBoard?jsonpCallback=?",
      data: {
        "authKey": apikey,
        "format": "json",
        "id": filteredStops[0].id,
        "timespan": 60
      },
      dataType: "jsonp",
      cache: false
    }).done(function (data) {
      var t, d;
      t = data.DepartureBoard.servertime;
      d = data.DepartureBoard.serverdate;
      window.base = gDate(d, t);
      Transparency.render(document.getElementById("departure"), data, directives);
    });
  });
};

var gotError = function (error) {
  window.alert("Got error: " + error.code + " - " + error.message);
};


$(document).ready(function () {
  navigator.geolocation.getCurrentPosition(gotLocation, gotError);
});

