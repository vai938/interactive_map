import {
  InboundMarkerMove,
  markerMove,
  markerShortcuts,
} from "./key-down-events.js";
import { map } from "../map.js";
import { findborderpoints } from "./border-distance.js";
import { getBorder, checkBorderCrossed } from "./border-cross.js";
import { notifySreenReader } from "../../utils/accessibility.js";
import { findplaceNamAandData } from "../../services/find-place-name-and-data.js";

var selectedPane = map.createPane("selectedPane");
selectedPane.style.zIndex = 999;

export const Marker = L.CircleMarker.extend({
  options: {
    radius: 8,
    color: "#171212ff",
    weight: 2,
    fillColor: "#1a0a94ff",
    fillOpacity: 1,
    pane: "customPane",
  },

  initialize: function (latlng, options) {
    L.setOptions(this, options); // Merge user-provided options
    L.CircleMarker.prototype.initialize.call(this, latlng, options);
    this.bindTooltip("Loading location…", {
      direction: "top",
      offset: [0, -10],
      sticky: true,
      opacity: 1,
    });

    this._onKeydown = _.throttle(this._handleKeydown, 120).bind(this);
    this._onArrowKeyDown = _.throttle(this._handleArrowKeydown, 120).bind(this);
    this._onArrowKeyDownWhenGeoPresent = _.throttle(
      this._movementWhenGeojson,
      120
    ).bind(this);
    this._addKeydownEventListeners();
    this._oldPosition = this.getLatLng();
    findplaceNamAandData
      .bind(this)(this)
      .then((place) => {
          console.log("Reverse geocode result:", place);

       const name =
  place?.name ||
  place?.display_name ||
  place?.address?.city ||
  place?.address?.state ||
  place?.address?.country ||
  "Location";

this._placeName = name;

this.setTooltipContent(`
  <strong>${name}</strong><br/>
  ${place?.display_name || ""}<br/>
  Lat: ${this.getLatLng().lat.toFixed(5)}<br/>
  Lng: ${this.getLatLng().lng.toFixed(5)}
`);


        this.openTooltip(); // 🔥 forces Leaflet to refresh the hover box

        notifySreenReader(
          `Curser is active on ${place.name}. Use arrow keys to navigate`,
          true
        );
      });

    getBorder.bind(this)();
    this._onZoomEnd = this._handleZoomEnd.bind(this);
    this._onClickOnMap = this._handleClickonMap.bind(this);
  },
  _geoJson: null, // Default GeoJSON storage for calculation of border points
  _placeBorderofCurrentLocation: null, //this stores the border of the current marker location
  _placeBorderofSelectedLocation: null, //this stores the border of the selected location
  _borderPoints: null, // Default border points storage of 4 directions
  _oldPosition: null, //old marker position

  _addKeydownEventListeners: function () {
    this.on("add", () => {
      const map = this._map;
      if (map) {
        map.getContainer().addEventListener("keydown", this._onKeydown);
        map.getContainer().addEventListener("keydown", this._onArrowKeyDown);
        map.on("zoomend", this._onZoomEnd);
        map.on("click", this._onClickOnMap);
        //event listener to update the boundary lines when the zoom level changes

        //event listener to add a marker when the map is clicked
      }
    });

    this.on("remove", () => {
      const map = this._map;
      if (map) {
        map.getContainer().removeEventListener("keydown", this._onKeydown);
        map.getContainer().removeEventListener("keydown", this._onArrowKeyDown);
        map.off("zoomend", this._onZoomEnd);
        map.off("click", this._onClickOnMap);

        this._placeBorderofCurrentLocation?.remove();
        this._placeBorderofCurrentLocation = null; //clearing the previous border to avoid unwanted detection by leafletPip
      }
    });
  },
  _handleClickonMap(e) {
    this.setLatLng(e.latlng);
  },

  _handleZoomEnd() {
    getBorder.bind(this)(); // Call your getBorder function here
  },
  setGeoJson: function (geoJson) {
    //function to set the geojson data, or select a place
    this._placeBorderofCurrentLocation?.remove();
    this._placeBorderofCurrentLocation = null; //clearing the previous border to avoid unwanted detection by leafletPip

    this._placeBorderofSelectedLocation = L.geoJson(geoJson, {
      color: "red", // Border color
      fillColor: "yellow",
      fillOpacity: 0.2, // Adjust fill opacity as needed
      pane: "selectedPane",
    }).addTo(map); // Store GeoJSON
    this._geoJson = geoJson;
    this._borderPoints = findborderpoints.bind(this)(geoJson);
    this._map
      .getContainer()
      .addEventListener("keydown", this._onArrowKeyDownWhenGeoPresent);
    this._map
      .getContainer()
      .removeEventListener("keydown", this._onArrowKeyDown);
    // map.off('zoomend', this._onZoomEnd);
    map.fitBounds(this._placeBorderofSelectedLocation.getBounds()); //aligning the added layer to centre of the map
  },

  clearGeoJson: function () {
    //function to clear the geojson data, or deselect a place
    console.log("clearing geojson");
    this._map
      .getContainer()
      .removeEventListener("keydown", this._onArrowKeyDownWhenGeoPresent);
    this._map.getContainer().addEventListener("keydown", this._onArrowKeyDown);
    // map.on('zoomend', this._onZoomEnd);
    this._placeBorderofSelectedLocation?.remove(); // Clear GeoJSON storage
    this._placeBorderofSelectedLocation = null; // to avoid unwanted detection by leafletPip
    getBorder.bind(this)();
  },

  _handleKeydown: markerShortcuts,

  _handleArrowKeydown: function (event) {
    markerMove.bind(this)(event);
  },

  _movementWhenGeojson: InboundMarkerMove,
  setLatLng(latlng) {
    this._oldPosition = this.getLatLng();
    correctIfOutOfMap(latlng);
    L.CircleMarker.prototype.setLatLng.call(this, latlng);
    findplaceNamAandData.bind(this)(this).then((place) => {
  const name =
    place?.name ||
    place?.display_name ||
    place?.address?.city ||
    place?.address?.state ||
    place?.address?.country ||
    "Location";

  this.setTooltipContent(`
    <strong>${name}</strong><br/>
    Lat: ${latlng.lat.toFixed(5)}<br/>
    Lng: ${latlng.lng.toFixed(5)}
  `);
});

    this._onPositionChange(latlng);
    return this;
  },

  // Custom method to handle position changes
  async _onPositionChange(latlng) {
    // if (!this._placeBorderofSelectedLocation) {
    checkBorderCrossed.bind(this)(
      map.project(this._oldPosition).distanceTo(map.project(latlng))
    );
    // }
    this._borderPoints = findborderpoints.bind(this)(this._geoJson); // Update border points on every position change
    fetchElevation(this);
  },
});

export default Marker;

const fetchElevation = _.throttle(async (marker) => {
  fetch(
    `https://api.open-elevation.com/api/v1/lookup?locations=${
      marker.getLatLng().lat
    },${marker.getLatLng().lng}`
  )
    .then((response) => response.json())
    .then((data) => {
      if (data.results[0].elevation) {
        document.getElementById("elevation").innerHTML =
          `Altitude: ${data.results[0].elevation} meters`;
      }
    })
    .catch((error) => {
      console.error("Error in fetching place name:", error);
    });
}, 1001);

function correctIfOutOfMap(coord) {
  //function to correct the marker position if it goes out of the map and re allocate it to the other side
  const wrap = (value) => (value < -180 ? 180 : value > 180 ? -180 : value);

  coord[0] = wrap(coord[0]);
  if (coord[0] !== wrap(coord[0])) {
    notifySreenReader(`Curser moved to other side of the map`, true);
  }

  if (coord?.lng !== undefined) {
    const newLng = wrap(coord.lng);
    if (coord.lng !== newLng) {
      coord.lng = newLng;
      notifySreenReader(`Curser moved to other side of the map`, true);
    }
  }

  return coord;
}
