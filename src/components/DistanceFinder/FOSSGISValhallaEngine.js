export function FOSSGISValhallaEngine(id, costing, locations) {
    var INSTR_MAP = [
      0, 8, 8, 8, 14, 14, 14, 0, 0, 1, 2, 3, 4, 4, 7, 6, 5, 0, 24, 25, 24, 25, 0, 1, 5, 20, 10, 10, 17, 0, null, null, null, null, null, null, 21, 20,
    ];
  
    return {
      id: id,
      creditline: "<a href='https://gis-ops.com/global-open-valhalla-server-online/' target='_blank'>Valhalla (FOSSGIS)</a>",
      draggable: false,
  
      getRoute: function (callback) {
        return $.ajax({
          url: "https://valhalla1.openstreetmap.de/route",
          data: {
            json: JSON.stringify({
              locations: locations,
              costing: costing,
              directions_options: {
                units: "km",
              },
            }),
          },
          dataType: "json",
          success: function (data) {
            var trip = data.trip;
  
            if (trip.status === 0) {
              var line = [];
              var steps = [];
              var distance = 0;
              var time = 0;
  
              trip.legs.forEach(function (leg) {
                var legLine = L.PolylineUtil.decode(leg.shape, {
                  precision: 6,
                });
  
                line = line.concat(legLine);
  
                leg.maneuvers.forEach(function (manoeuvre, idx) {
                  var point = legLine[manoeuvre.begin_shape_index];
  
                  steps.push([
                    { lat: point[0], lng: point[1] },
                    INSTR_MAP[manoeuvre.type],
                    "<b>" + (idx + 1) + ".</b> " + manoeuvre.instruction,
                    manoeuvre.length * 1000,
                    [],
                  ]);
                });
  
                distance = distance + leg.summary.length;
                time = time + leg.summary.time;
              });
  
              callback(false, {
                line: line,
                steps: steps,
                distance: distance,
                time: parseInt(time / 60),
              });
            } else {
              callback(true, { message: trip.status_message });
            }
          },
          error: function (xhr, status, error) {
            // Use this for a detailed error message
            callback(true, { responseText: xhr.responseText, statusText: status });
          },
        });
      },
    };
  }