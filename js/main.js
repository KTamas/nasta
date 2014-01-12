/*jslint browser: true, indent: 2 */
/*global Transparency, $, console */

"use strict";

var apikey = "1b71620f-a0f1-4448-afe9-069e40b1ef51";
var baseurl = "http://api.vasttrafik.se/bin/rest.exe/v1/";

var parseDateTime = function (date, time) {
  // "serverdate":"2013-11-10",
  // "servertime":"16:48",
  var d = date.split('-'), t = time.split(':');
  return new Date(d[0], d[1], d[2], t[0], t[1]);
};

// server datetime
var base;

var timeDiff = function (p) {
  var date, time, datetime;
  // use the realtime data, otherwise fall back to the timetable
  date = p.rtDate === undefined ? p.date : p.rtDate;
  time = p.rtTime === undefined ? p.time : p.rtTime;
  datetime = parseDateTime(date, time);
  return (datetime - base) / 1000 / 60;
};

var boardDirectives = {
  sname: {
    style: function (params) {
      return "background-color: " + this.fgColor + "; color: " + this.bgColor + "; font-weight: bold; padding-left: 5px; padding-right: 5px; font-size: 24px;";
    }
  },
  direction: {
    html: function () {
      if (this.direction.indexOf("via") > -1) {
        return this.direction.replace("via", "<br /><small>via") + "</small>";
      } else {
        return this.direction;
      }
    },

    style: function () {
      if (this.direction.indexOf("via") > -1) {
        return "line-height: 0.8; font-weight: bold; padding-left: 5px; overflow: hidden;";
      } else {
        return "height: 34px; line-height: 34px; font-weight: bold; padding-left: 5px; overflow: hidden;";
      }
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
    var t, d, sortedData, board;
    base = parseDateTime(data.DepartureBoard.serverdate, data.DepartureBoard.servertime);

    // a board is an array of departures
    board = [];

    // a board has n departures, with the following structure
    // { sname, direction, next, därefter, track }
    //
    // the input is (test/board.json)
    // - the current time (base)
    // - an array of departures, with all the info
    //
    // We need to iterate through the array of departures and place each 
    // departure in its own slot. But how do we sort that?
    //
    // We sort it after working our way through the array.

    data.DepartureBoard.Departure.forEach(function (dep, i) {
      // me: why yes this is a horrible abuse of the awful javascript type system
      // gazs: what type system?
      var pos = board.map(function (e) { return e.sname + e.direction; }).indexOf(dep.sname + dep.direction);
      if (pos < 0) {
        board.push({ sname: dep.sname, direction: dep.direction, next: timeDiff(dep), darefter: null, track: dep.track, fgColor: dep.fgColor, bgColor: dep.bgColor });
      } else {
        board[pos].darefter = timeDiff(dep);
      }
    });

    board.sort(function (a, b) {
      if (parseFloat(a.sname) < parseFloat(b.sname))
        return -1;
      if (parseFloat(a.sname) > parseFloat(b.sname))
        return 1;
      if (a.track < b.track)
        return -1;
      if (a.track > b.track)
        return 1;
      if (parseFloat(a.timeleft) < parseFloat(b.timeleft))
        return -1;
      if (parseFloat(a.timeleft) > parseFloat(b.timeleft))
        return 1;
    });
    
    console.log(board);
    Transparency.render(document.getElementById("departure"), board, boardDirectives);
  });
};

var cbGetStop = function (data) {
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
};

var mock = false;
var gotLocation = function (pos) {
  if (mock) {
    $.ajax({
      url: "http://ktamas.com/nearby.json",
      dataType: "json",
      cache: false
    }).done(cbGetStop);
  } else {
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
    }).done(cbGetStop);
  }
};

var gotError = function (error) {
  window.alert("Got error: " + error.code + " - " + error.message);
};

$(document).ready(function () {
  navigator.geolocation.getCurrentPosition(gotLocation, gotError);
});
