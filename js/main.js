/*jslint browser: true, indent: 2 */
/*global Transparency, $, console */

"use strict";

var apikey = "1b71620f-a0f1-4448-afe9-069e40b1ef51";
var baseurl = "http://api.vasttrafik.se/bin/rest.exe/v1/";

var parseDateTime = function (dd, tt) {
  var d = dd.split('-'), t = tt.split(':');
  return new Date(d[0], d[1], d[2], t[0], t[1]);
};

var base;

var timeDiff = function (p) {
  var date, time, dt, to_return;
  date = p.rtDate === undefined ? p.date : p.rtDate;
  time = p.rtTime === undefined ? p.time : p.rtTime;
  dt = parseDateTime(date, time);
  to_return = (dt - base) / 1000 / 60;
  return to_return;
};

var boardDirectives = {
  sname: {
    style: function (params) {
      return "background-color: " + this.fgColor + "; color: " + this.bgColor + "; font-weight: bold; padding-left: 5px; padding-right: 5px; font-size: 24px;";
    }
  },
  direction: {
    html: function () {
      return this.direction.replace("via", "<br /><small>via") + "</small>";
    }
  }
};

var stopDirectives = {
  name : {
    "data-stopid" : function (params) {
      return this.id;
    }
  }
};

var gotLocation = function (pos) {
  //$.ajax({
    //url: baseurl + "location.nearbystops?jsonpCallback=?",
    //data: {
      //"authKey": apikey,
      //"format": "json",
      //"originCoordLat": pos.coords.latitude,
      //"originCoordLong": pos.coords.longitude,
      //"maxNo": 50
    //},
    //dataType: "jsonp",
    //cache: false
  //}).done(function (data) {
  $.ajax({
    url: "http://ktamas.com/nearby.json",
    dataType: "json",
    cache: false
  }).done(function (data) {
    // get only the stations, not the individual lanes (tracks)
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
    base = parseDateTime(d, t);

    // a board is an array of departures
    var board = [];

    // a board has x departures, with the following structure
    // { line, towards, next, därefter }
    //
    // for the input we have the following structure (test/board.json)
    // - the current time (base)
    // - an array of departures, with all the info
    //
    // We need to iterate through the array of departures and place each 
    // departure in its own slot. But how do we sort that?
    //
    // We sort it after working our way through the array.

    lines = {};
    data.DepartureBoard.Departure.forEach(function (dep, i) {
      // me: why yes this is a horrible abuse of the awful javascript type system
      // gazs: what type system?
      var pos = board.map(function (e) { return e.sname + e.direction; }).indexOf(dep.sname + dep.direction);
      if (pos < 0) {
        board.push({ sname: dep.sname, direction: dep.direction, next: timeDiff(dep), darefter: null, track: dep.track });
      } else {
        board[pos].darefter = timeDiff(dep);
      }
    });

    //board.sort(function (a, b) {
      //return parseFloat(a.sname) - (b.sname);
    //}).sort(function (a, b) {
      //return a.track > b.track;
    //});
    
    board.sort(function (a, b) {
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
    console.log(board);
    //Transparency.render(document.getElementById("departure"), finalData, boardDirectives);
  });
};

$(document).ready(function () {
  navigator.geolocation.getCurrentPosition(gotLocation, gotError);
});
