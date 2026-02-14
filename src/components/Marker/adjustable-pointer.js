
import { notifySreenReader } from '../../utils/accessibility.js';
import { map } from '../map.js';
import { toKMorMeter } from '../../utils/to-km-or-meter.js';
import { findplaceNamAandData } from '../../services/find-place-name-and-data.js';
import Marker from './marker.js';
import { clickSound } from '../../utils/sounds.js';

let isPointerStable = true; //flag to check if arrow is moving to reduce multiple api calls until first one is completed
export let adjustablePointer;// initiaizing object of adjustable pointer
export function initializeAdjustablePointer(coord) {
  if (marker) {
    marker.clearGeoJson();
    marker.remove();
  }
  
    adjustablePointer = new L.adjustablePointer(coord); // distance in meters, angle in degrees
    adjustablePointer.addTo(map);
    notifySreenReader(
      `Adjustable pointer on.use 'UP' and 'DOWN' arrow keys to change distance. 'LEFT' and 'RIGHT' arrow keys to change angle`,
      true
    );
  
}

L.adjustablePointer = L.Layer.extend({
  initialize: function (pointer) {
    this.pointer = pointer;
  },

  onAdd: function (map) {
    isPointerStable = true; //flag to check reduce multiple api calls until first one is completed

    this.angle = 0;
    this._map = map;
    this.distance = 100;
    this.distanceOriginal = 0;
    this.flatdist;
    this.realangle = 0;

    var svgstr = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="7.5" cy="7.5" r="6.5" fill="#C60000" stroke="black" stroke-width="2"/>
            </svg>`;

    var customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: svgstr,
      iconSize: [15, 15],
      iconAnchor: [6.5, 6.5],
    });

    this.primaryMarker = new L.Marker(this.pointer, {
      icon: customIcon,
    }).addTo(this._map);

    const marker1 = this.primaryMarker;
    const marker2 = this._secondoryupdate(this.pointer);

    var secondaryMarkerElement = marker2.getElement();
    var arrowIconSvg = secondaryMarkerElement.querySelector('svg');
    this.line = L.polyline([marker1.getLatLng(), marker2.getLatLng()], {
      color: 'black',
      weight: 5,
    }).addTo(map);

    this._handleSecondaryMove = function (e) {
      adjustablePointer.angle = adjustablePointer._getAngle(marker1, marker2);
      arrowIconSvg.setAttribute('transform', 'rotate(' + (adjustablePointer.angle - 90) + ')');
      adjustablePointer.distanceOriginal = distanceOnMap(
        marker1.getLatLng(),
        marker2.getLatLng()
      );
      adjustablePointer.realangle = adjustablePointer._getAngle(marker1, marker2, true);
      adjustablePointer.flatdist = //calculating flat distance with maths
        (Math.sqrt(
          Math.pow(
            adjustablePointer.secondaryMarker.getLatLng().lat -
              adjustablePointer.primaryMarker.getLatLng().lat,
            2
          ) +
            Math.pow(
              adjustablePointer.secondaryMarker.getLatLng().lng -
                adjustablePointer.primaryMarker.getLatLng().lng,
              2
            )
        ) *
          40075016.7) /
        360;
      adjustablePointer.line.setLatLngs([marker1.getLatLng(), marker2.getLatLng()]);
      adjustablePointer._updateInfoBox();
    };
    this._map.on('zoom', function () {
      adjustablePointer.distance = L.point(
        map.latLngToContainerPoint(marker1.getLatLng())
      ).distanceTo(L.point(map.latLngToContainerPoint(marker2.getLatLng())));
    });
    this._handleSecondaryMoveEnd = function () {
      adjustablePointer.distance = L.point(
        map.latLngToContainerPoint(marker1.getLatLng())
      ).distanceTo(L.point(map.latLngToContainerPoint(marker2.getLatLng())));
      setTimeout(() => {
        findplaceNamAandData
          .bind(this)(this)
          .then((nm) => {
            document.getElementById('placeDisplay').textContent = nm.name;
            isPointerStable = true;
          });
      }, 500);
    };

    this.secondaryMarker.on('move', this._handleSecondaryMove);
    this.secondaryMarker.on('moveend', this._handleSecondaryMoveEnd);

    this._updateInfoBox();
    findplaceNamAandData
      .bind(this.secondaryMarker)(this.secondaryMarker)
      .then((nm) => {
        document.getElementById('placeDisplay').textContent = nm.name;
        isPointerStable = true;
      });
    map.addEventListener('keydown', adjustablePointer._handleKeydown);
  },

  onRemove: function (map) {
    this._map.off('zoom');
    // Remove document event listeners
    map.removeEventListener('keydown', this._handleKeydown);

    // Remove the primary marker from the map
    if (this.primaryMarker) {
      this._map.removeLayer(this.primaryMarker);
    }

    // Remove the secondary marker from the map
    if (this.secondaryMarker) {
      this.secondaryMarker.off('move', this._handleSecondaryMove);
      this.secondaryMarker.off('moveend', this._handleSecondaryMoveEnd);
      this._map.removeLayer(this.secondaryMarker);
    }

    // Remove the polyline from the map
    if (this.line) {
      this._map.removeLayer(this.line);
    }

    // Clear the place display element
    document.getElementById('placeDisplay').textContent = '';
    document.getElementById('infoBox').style.display = '';
  },

  _handleKeydown: function (event) {
    event = event.originalEvent;
    clickSound.play();
    switch (event.code) {
      case 'KeyJ':
        adjustablePointer.remove();
        marker = new Marker(adjustablePointer.primaryMarker.getLatLng()).addTo(
          map
        );
        notifySreenReader('Swithced to Curser', true);
        adjustablePointer = null;

        break;
      case 'ArrowUp':
        adjustablePointer.distance = adjustablePointer.distance + 10; 
        adjustablePointer._secondoryupdate(adjustablePointer.primaryMarker.getLatLng());
        

        break;
      case 'ArrowDown':
        if(adjustablePointer.distance < 50){
          notifySreenReader('Minimum distance reached, please zoom in to reduce distance more.', true);
        }else{
          adjustablePointer.distance = adjustablePointer.distance - 10;
        adjustablePointer._secondoryupdate(adjustablePointer.primaryMarker.getLatLng());
        }
       
        break;
      case 'ArrowRight':
        adjustablePointer.angle = adjustablePointer.angle + 1;
        adjustablePointer._secondoryupdate(adjustablePointer.primaryMarker.getLatLng());

        break;
      case 'ArrowLeft':
        adjustablePointer.angle = adjustablePointer.angle - 1;
        adjustablePointer._secondoryupdate(adjustablePointer.primaryMarker.getLatLng());

        break;
      case 'KeyF':
        notifySreenReader(document.getElementById('infoBox').textContent);
        break;
      case 'Enter':
        adjustablePointer.remove();

        marker = new Marker(adjustablePointer.secondaryMarker.getLatLng()).addTo(
          map
        );
        notifySreenReader('Curser placed');
        adjustablePointer = null;

        break;

      default:
        return;
    }
    whenPointerStable(event);
  },

  _calculateDestination: function (start, d, angle) {
    const point1 = map.latLngToLayerPoint(start);
    const theta = (angle - 90) * (Math.PI / 180);
    const x = d * Math.cos(theta) + point1.x;
    const y = d * Math.sin(theta) + point1.y;
    const final = map.layerPointToLatLng([x, y]);

    return final;
  },

  _getAngle: function (marker1, marker2, isReal) {
    let realangle;
    const latLng1 = marker1.getLatLng();
    const latLng2 = marker2.getLatLng();
    var rpoint1 = latLng1;
    var rpoint2 = latLng2;

    // Convert geographical coordinates to pixel coordinates
    const point1 = map.latLngToLayerPoint(latLng1);
    const point2 = map.latLngToLayerPoint(latLng2);

    // Calculate differences in pixel coordinates
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;

    // Calculate the angle in radians
    let angleRad = Math.atan2(deltaY, deltaX);

    // Convert the angle to degrees
    let angleDeg = angleRad * (180 / Math.PI);

    // Normalize the angle to be between 0 and 360 degrees
    angleDeg = (angleDeg + 90 + 360) % 360;

    if (latLng1.lng - latLng2.lng >= 180 || latLng1.lng - latLng2.lng <= -180) {
      realangle = 360 - angleDeg;
    } else {
      realangle = angleDeg;
    }

    if (isReal) {
      return realangle;
    } else {
      return angleDeg;
    }
  },

  _secondoryupdate: function (primary) {
    let arrowhead = `<svg id="mysvg" xmlns="http://www.w3.org/2000/svg" transform="rotate(270)" width="18" height="15" viewBox="0 0 18 15" fill="none">
        <path id="polygon" d="M0.5 0.75L16.7 7.5L0.5 14.25V0.75Z" fill="#005304" stroke="black"/>
        </svg>`;

    const arrowIcon = L.divIcon({
      className: 'arrow-div-icon',
      html: arrowhead, // Use the SVG string as the HTML content
      iconSize: [18, 15], // Adjust the icon size as needed
      iconAnchor: [9, 7.5], // Adjust the anchor point as needed
    });
    const destinationLatLng = this._calculateDestination(
      primary,
      this.distance,
      this.angle
    );

    // Add or move the secondary marker
    if (this.secondaryMarker) {
      this.secondaryMarker.setLatLng(destinationLatLng);
    } else {
      this.secondaryMarker = new L.marker(destinationLatLng, {
        icon: arrowIcon,
        draggable: true,
      }).addTo(this._map);
    }
    if (
      this.secondaryMarker.getLatLng().lat > 85 ||
      this.secondaryMarker.getLatLng().lat < -85
    ) {
    }
    if (
      this.secondaryMarker.getLatLng().lng > 180 ||
      this.secondaryMarker.getLatLng().lnt < -180
    ) {
    }
    this._updateInfoBox();
    this.flatdist =
      (Math.sqrt(
        Math.pow(
          adjustablePointer.secondaryMarker.getLatLng().lat -
            adjustablePointer.primaryMarker.getLatLng().lat,
          2
        ) +
          Math.pow(
            adjustablePointer.secondaryMarker.getLatLng().lng -
              adjustablePointer.primaryMarker.getLatLng().lng,
            2
          )
      ) *
        40075016.7) /
      360;
    return this.secondaryMarker;
  },

  _updateInfoBox: function () {
    // Only show the box when the secondary marker exists
    if (this.secondaryMarker) {
      document.getElementById('infoBox').style.display = 'block';

      // Update the display:

      

      document.getElementById('distanceDisplay').textContent = toKMorMeter(
        this.distanceOriginal
      );
      document.getElementById('flatdistance').textContent = toKMorMeter(
        this.flatdist
      );
      document.getElementById('angleDisplay').textContent =
        Math.round(this.angle) + ' degrees. ' + getDirection(this.angle);
      document.getElementById('realAngle').textContent =
        Math.round(this.realangle) +
        ' degrees. ' +
        getDirection(this.realangle);
      document.getElementById('lat').textContent =
        ' Latitude : ' + this.secondaryMarker.getLatLng().lat.toFixed(5) + '.';
      document.getElementById('lng').textContent =
        ' Longitude : ' + this.secondaryMarker.getLatLng().lng.toFixed(5);
    } else {
      document.getElementById('infoBox').style.display = 'none';
    }
  },
});

function distanceOnMap(point1, point2) {
  let lon1 = (point1.lng * Math.PI) / 180;
  let lon2 = (point2.lng * Math.PI) / 180;
  let lat1 = (point1.lat * Math.PI) / 180;
  let lat2 = (point2.lat * Math.PI) / 180;

  let dlon = lon2 - lon1;
  let d;

  let dlat = lat2 - lat1;
  let a =
    Math.pow(Math.sin(dlat / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon / 2), 2);

  d = Math.asin(Math.sqrt(a));
  let c = 2 * d;

  let r = 6371;

  return c * r * 1000;
}


function getDirection(angle) {
  angle = (angle + 360) % 360; // Normalize angle to [0, 360)
  const directions = [
    'North.',
    'North-East.',
    'East.',
    'South-East.',
    'South.',
    'South-West.',
    'West.',
    'North-West.',
  ];
  const index = Math.round(angle / 45) % 8;
  return directions[index];
}


const whenPointerStable=_.debounce((event) => {
  if (event.code.startsWith('Arrow')) {
      if(event.code == 'ArrowUp' || event.code == 'ArrowDown'){
        notifySreenReader(
          'Flat Distance: ' + toKMorMeter(adjustablePointer.flatdist) + 'Real: ' + toKMorMeter(adjustablePointer.distanceOriginal)
        );
      }
      if(event.code == 'ArrowRight' || event.code == 'ArrowLeft'){
        notifySreenReader('Angle: ' + Math.round(adjustablePointer.angle) + ' degrees. ' + getDirection(adjustablePointer.angle));
      }
      findplaceNamAandData
        .bind(adjustablePointer.secondaryMarker)(adjustablePointer.secondaryMarker)
        .then((nm) => {
          document.getElementById('placeDisplay').textContent = nm.name;        });
  }
}, 700);
