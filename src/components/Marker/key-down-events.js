
import { clickSound } from '../../utils/sounds.js';
import { findplaceNamAandData } from '../../services/find-place-name-and-data.js';
import { map } from '../map.js';
import { notifySreenReader } from '../../utils/accessibility.js';
import { toKMorMeter } from '../../utils/to-km-or-meter.js';
import { showPlaceDetails } from '../../services/fetch-place.js';
import { initializeAdjustablePointer } from './adjustable-pointer.js';

let timeout;//for clearing timeout, for avoiding multiple unnecessary calls
let pressCount = 0; //for counting key press for 'D' key
let lastPressTime = 0; //store last key press time

export function markerShortcuts(event) {
  const keyActions = {
    KeyD: () => handleKeyDPress.bind(this)(event),
    KeyJ: () => {
      initializeAdjustablePointer(this.getLatLng());
      event.preventDefault();
    },
    KeyF: () => {
      if (event.shiftKey) {
        getCoordinates(this);
      } else {
        event.preventDefault();
        findplaceNamAandData.bind(this)(this);
      }
    },
    Enter: () => pressEnter.bind(this)(),
    KeyZ: () => {
      event.preventDefault();
      getScaledDistance.bind(this)();
    },
    KeyA: () => {
      event.preventDefault();
      notifySreenReader(document.getElementById('elevation').innerHTML);
    },
  };

  const arrowActions = () => {
    if (event.shiftKey) {
      getBorderDistance.bind(this)(event);
    } else {
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        findplaceNamAandData
          .bind(this)(this)
          .then((place) => {
            notifySreenReader(place.name, true);
          });
      }, 650);
      if (map) map.panTo(this.getLatLng());
    }
  };

  // Execute the action corresponding to the event code or handle arrow keys
  if (keyActions[event.code]) {
    event.preventDefault();
    keyActions[event.code]();
  } else if (event.key.startsWith('Arrow')) {
    arrowActions();
  }
}

export function markerMove(event) { //for key shortcuts related to marker only in free move , not in inbound
  //for key shortcuts related to marker
  if (event.key.startsWith('Arrow') && !event.shiftKey) {
    this.setLatLng(getNextLatLng.bind(this)(event.code));
  }
}
export function InboundMarkerMove(event) { //for key shortcuts related to marker only in inbound
  if (event.key.startsWith('Arrow') && !event.shiftKey) {
    InboundMarkerMovement.bind(this)(event.code);
  }
}

function InboundMarkerMovement(key) { //detect the border, and blocks movement if it crosses the border
  let borderpoints = this._borderPoints;
  const moves = {
    ArrowUp: [0.000001, 0],
    ArrowDown: [-0.000001, 0],
    ArrowLeft: [0, -0.000001],
    ArrowRight: [0, 0.000001],
  };
  const limits = {
    ArrowUp: () =>
      perKeyDist.bind(this)() > this.getLatLng().distanceTo(borderpoints.north),
    ArrowDown: () =>
      perKeyDist.bind(this)() > this.getLatLng().distanceTo(borderpoints.south),
    ArrowLeft: () =>
      perKeyDist.bind(this)() > this.getLatLng().distanceTo(borderpoints.west),
    ArrowRight: () =>
      perKeyDist.bind(this)() > this.getLatLng().distanceTo(borderpoints.east),
  };

  if (limits[key]()) {
    // Call the function to evaluate the condition
    notifySreenReader('Border touched', true);
    const move = moves[key];
    this.setLatLng([
      this.getLatLng().lat - move[0],
      this.getLatLng().lng - move[1],
    ]);
  } else {
    this.setLatLng(getNextLatLng.bind(this)(key));
  }
}

function getBorderDistance(event) { //for getting distance from border
  const directions = {
    ArrowUp: { point: 'north', label: 'to north' },
    ArrowDown: { point: 'south', label: 'to south' },
    ArrowLeft: { point: 'west', label: 'to west' },
    ArrowRight: { point: 'east', label: 'to east' },
  };

  const direction = directions[event.key];
  if (!direction || !this._borderPoints) return;

  const distance = toKMorMeter(
    this.getLatLng().distanceTo(this._borderPoints[direction.point])
  );
  notifySreenReader(`${distance} ${direction.label}`, true);
}

function getNextLatLng(direction) {
  clickSound.play();
  const center = this.getLatLng();
  const point = map.latLngToLayerPoint(center);
  let { x: lat, y: lng } = point; // Destructure point coordinates
  const movement = 10; // Define movement step size

  // Define movement actions for each direction
  const directionActions = {
    ArrowUp: () => (lng -= movement),
    ArrowDown: () => (lng += movement),
    ArrowLeft: () => (lat -= movement),
    ArrowRight: () => (lat += movement),
  };

  if (directionActions[direction]) {
    directionActions[direction]();
  }

  const newLatLng = map.layerPointToLatLng({ x: lat, y: lng });
  return newLatLng;
}



function getScaledDistance() { //for getting distance per key press
  try {
    notifySreenReader(
      toKMorMeter(perKeyDist.bind(this)()) + ' per key press',
      true
    );
  } catch (error) {
    alert('Add curser first');
  }
}

function getCoordinates(marker) { //for getting coordinates of the marker
  notifySreenReader(
    marker.getLatLng().lat.toFixed(5) +
      ' Latitude, ' +
      marker.getLatLng().lng.toFixed(5) +
      ' Longitude'
  ,true);
}

export function perKeyDist() {  //for getting distance per key press for mathematical calculations
  return (
    ((40075016 * Math.cos((this.getLatLng().lat * Math.PI) / 180)) /
      Math.pow(2, map.getZoom() + 8)) *
    10
  );
}
function pressEnter() { //for handling enter key press
  timeout && clearTimeout(timeout);
  timeout = setTimeout(() => {
    findplaceNamAandData
      .bind(this)(this)
      .then((place) => {


        notifySreenReader(place.name, true);
        showPlaceDetails(place.data);
      });
  }, 650);
}
function handleKeyDPress(event) {
 try {
  if (event.code !== 'KeyD') return;

  const now = Date.now();
  if (now - lastPressTime > 500) pressCount = 0; // Reset if timeout
  lastPressTime = now;
  pressCount++;

  const borderpoints = this._borderPoints;
  if (!this._geoJson) {
    return notifySreenReader('No border found, Please try again', true);
  }

  const getDistance = (point) =>
    this.getLatLng().distanceTo(borderpoints[point]);
  const distances =
  pressCount === 1
    ? `${toKMorMeter(getDistance('east')+getDistance('west'))} to east from west`
    : `${toKMorMeter(getDistance('north')+getDistance('south'))} to north from south`;
    notifyDistance(distances)

  if (pressCount === 2) pressCount = 0; // Reset after second press
 } catch (error) {
  console.error(error);
  notifySreenReader('No border found, Please try again', true);
 }
}


const notifyDistance = _.debounce((distances) => {
notifySreenReader(distances, true,);
}, 500);


