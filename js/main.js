var apikey = "1b71620f-a0f1-4448-afe9-069e40b1ef51";
var base = "http://api.vasttrafik.se/bin/rest.exe/v1/";

var gDate = function (dd, tt) {
  var d = dd.split('-');
  var t = tt.split(':');
  return new Date(d[0],d[1],d[2],t[0],t[1]);
}

var timedecorator = function (params) {
  var dt = gDate(this.rtDate, this.rtTime);
  to_return = (dt - base) / 1000 / 60;
  return to_return === 0 ? "Nu" : to_return;
};

var directives = {
  DepartureBoard : {
    Departure : {
      diff : { text: timedecorator }
    }
  }
};

navigator.geolocation.getCurrentPosition(function(position) {
  //console.log(position);
  $.ajax({
    url: base + "location.nearbystops?jsonpCallback=?",
    data: {
      "authKey": apikey,
      "format": "json",
      "originCoordLat": position.coords.latitude,
      "originCoordLong": position.coords.longitude,
      "maxNo": 10
    },
    dataType: "jsonp"
  }).done(function(data) {
   Transparency.render(document.getElementById("stops"), data);
   var first = data.LocationList.StopLocation[0].id;
   $.ajax({
    url: base + "departureBoard?jsonpCallback=?",
    data: {
      "authKey": apikey,
      "format": "json",
      "id": first
    },
    dataType: "jsonp",
    cache: false
  }).done(function(data) {
   t = data.DepartureBoard.servertime;
   d = data.DepartureBoard.serverdate;
   window.base = gDate(d, t);
   Transparency.render( document.getElementById("departure"), data, directives);
 });
});
});
