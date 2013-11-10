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

var calctime = function (p) {
  var date, time, dt, to_return;
  date = p.rtDate === undefined ? p.date : p.rtDate;
  time = p.rtTime === undefined ? p.time : p.rtTime;
  dt = gDate(date, time);
  to_return = (dt - base) / 1000 / 60;
  return to_return;
};

var getStop = function (stopid) {
  $.ajax({
    url: baseurl + "departureBoard?jsonpCallback=?",
    data: {
      "authKey": apikey,
      "format": "json",
      "id": stopid,
      "timeSpan": 120,
      "maxDeparturesPerLine": 2
    },
    dataType: "jsonp",
    cache: false
  }).done(function (data) {
    var t, d, sortedData, lines, groupedLines;
    t = data.DepartureBoard.servertime;
    d = data.DepartureBoard.serverdate;
    base = gDate(d, t);
    lines = {};
    sortedData = data.DepartureBoard.Departure.map(function (e) {
      e.timeleft = calctime(e);
      return e;
    }).sort(function (a, b) {
      if (parseFloat(a.sname) < parseFloat(b.sname))
        return -1;
      if (parseFloat(a.sname) > parseFloat(b.sname))
        return 1;
      if (a.sname === b.sname) {
        if (a.track < b.track)
          return -1;
        if (a.track > b.track)
          return 1;
        if (a.track === b.track) {
          if (parseFloat(a.timeleft) < parseFloat(b.timeleft))
            return -1;
          if (parseFloat(a.timeleft) > parseFloat(b.timeleft))
            return 1;
          if (a.timeleft === b.timeleft)
            return 0;
        }   
      }
    });

    sortedData.forEach(function (e, i, a) {
      if (i % 2 === 0) {
        e.darefter = a[i+1].timeleft;
      }
    });
    var finalData = sortedData.filter(function (e) {
      return e.darefter !== undefined;
    });
    
    Transparency.render(document.getElementById("departure"), finalData);
  });
};

var stopDirectives = {
  name : {
    "data-stopid" : function (params) {
      return this.id;
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
      "maxNo": 50
    },
    dataType: "jsonp",
    cache: false
  }).done(function (data) {
    var filteredStops = data.LocationList.StopLocation.filter(function (item) { return item.track === undefined; });
    Transparency.render(document.getElementById("stops"), filteredStops, stopDirectives);
    $(".dropdown-menu li a").click(function () {
      $(".btn").text($(this).text());
      $(".btn").data("stopid", $(this).data("stopid"));
      getStop($(this).data("stopid"));
    });

    $(".btn").text(filteredStops[0].name);
    $(".btn").data("stopid", filteredStops[0].id);

    getStop(filteredStops[0].id);
  });
};

var gotError = function (error) {
  window.alert("Got error: " + error.code + " - " + error.message);
};


$(document).ready(function () {
  navigator.geolocation.getCurrentPosition(gotLocation, gotError);
});
