import { geoLayer } from "../../services/fetch-place.js";
import { performSearch } from "../../services/do-search.js";
import { toKMorMeter } from "../../utils/to-km-or-meter.js";
import { closeSound } from "../../utils/sounds.js";
import { FOSSGISValhallaEngine } from "./FOSSGISValhallaEngine.js";

import { detailsCloseButton, detalisElement, distanceBox, distanceIcon } from "../../utils/dom-elements.js";
import { successSound } from "../../utils/sounds.js";
import { adjustablePointer } from "../Marker/adjustable-pointer.js";
import Marker from "../Marker/marker.js";
import { notifySreenReader } from "../../utils/accessibility.js";

// Tracks the currently focused input element (starting or destination location)
let activeInputElement = null;
// Button to trigger distance calculation
const findDistanceButton = document.getElementById("find");
// Element for user input of the starting location
let startingLocationElement = document.getElementById("beginning");  
// Element for user input of the destination location
let destinationLocationElement = document.getElementById("destination");
// Coordinates for the destination
let destinationCoordinates;
// Coordinates for the starting location
let startingCoordinates;
// Layer group to represent the road path on the map
let roadPathLayerGroup;

/**
 * Sets up event listeners for a search action triggered by an input element and a button.
 * @param {HTMLElement} inputElement - The input element for entering a location.
 * @param {string} buttonId - The ID of the button associated with the search action.
 * @param {Function} searchHandler - The function to execute for the search action.
 */
const setupSearchEventListeners = (inputElement, buttonId, searchHandler) => {
  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchHandler();
  });

  document.getElementById(buttonId)?.addEventListener("click", searchHandler);
};

/**
 * Initializes all event listeners related to the distance finder feature.
 */
export const initialize_DistanceFinder_EventListeners = () => {
  // Opens the distance box and cleans up previous actions
  distanceIcon.addEventListener("click", () => {
    distanceBox.style.display = "block";
    if(detalisElement.parentElement.style.display == 'block') detailsCloseButton.click(); // close search details box
    if (adjustablePointer) {
      marker = new Marker(adjustablePointer.primaryMarker.getLatLng()).addTo(map); // Creates a new marker on the map
      adjustablePointer.remove(); // Removes any active pointer on the map
    }
    successSound.play(); // Plays a sound to indicate action completion
  });

  // Sets up event listeners for searching starting and destination locations
  setupSearchEventListeners(startingLocationElement, "b-searchbutton", handleStartingLocationSearch);
  setupSearchEventListeners(destinationLocationElement, "d-searchbutton", handleDestinationSearch);

  // Tracks the currently focused input element for starting or destination location
  [startingLocationElement, destinationLocationElement].forEach((inputElement) => {
    inputElement.addEventListener("focus", () => {
      activeInputElement = document.activeElement;

    });
  });

  // Handles selecting a location from the map
  document.getElementById("fromMap")?.addEventListener("click", () => {
    if (!marker) return; // Ensures a marker exists on the map

    try {
      const { lat, lng } = marker.getLatLng();
      activeInputElement.value = `${(lat.toFixed(5))},${lng.toFixed(5)}`; // Updates the active input with the selected coordinates
      const selectedLocation = { lat:lat, lon: lng };

      // Updates the appropriate variable based on the focused input
      if (activeInputElement.id === "beginning") {
        startingCoordinates = selectedLocation;
      } else {
        destinationCoordinates = selectedLocation;
      }

      successSound.play(); // Plays a sound to confirm selection
    } catch (error) {
      console.error("Error selecting location from map:", error);
      alert("Focus on the starting point or destination then select point on map");
    }
  });

  // Closes the distance finder box
  document.getElementById("closeBtn")?.addEventListener("click", closeDistanceFinder);

  // Adds a keyboard shortcut to trigger the "select from map" action
  distanceBox.addEventListener("keydown", (event) => {
    if (event.altKey && event.key === "l") {
      event.preventDefault();
      document.getElementById("fromMap")?.click(); // Simulates clicking the "fromMap" button
    }
  });

  // Triggers distance calculation when the "find" button is clicked
  findDistanceButton.addEventListener("click", calculateDistance.bind(findDistanceButton));
};


// Function to handle search and selection of the starting location
export function handleStartingLocationSearch() {
    performSearch(startingLocationElement, [])
        .then((result) => {
            startingCoordinates = {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
            };
            startingLocationElement.value = result.name;
            document.getElementById("search-results")?.remove();
        })
        .catch((error) => {
            console.error("Error fetching search results:", error);
        });
}

// Function to handle search and selection of the destination location
export function handleDestinationSearch() {
    performSearch(destinationLocationElement, [])
        .then((result) => {
            destinationCoordinates = {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
            };
            destinationLocationElement.value = result.name;
            document.getElementById("search-results")?.remove();
        })
        .catch((error) => {
            console.error("Error fetching search results:", error);
        });
}

// Function to calculate and display the distance between the starting and destination locations
export function calculateDistance() {
    this.style.pointerEvents = 'none';
    this.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i>`;
    this.className = '';

    const routePoints = [startingCoordinates, destinationCoordinates];
    const route = FOSSGISValhallaEngine("route", "auto", routePoints);

    route.getRoute(function (error, route) {
        this.style.pointerEvents = 'auto';
        this.innerHTML = '';
        this.className = 'fas fa-arrow-circle-right';

        if (!error) {
            // Add the route line to the map
            if (geoLayer != null) {
                geoLayer.remove();
            }
            if (roadPathLayerGroup) {
                roadPathLayerGroup.remove();
            }
            marker.clearGeoJson();
            roadPathLayerGroup = L.featureGroup();

            const path = L.polyline(route.line, { color: "blue" }).addTo(roadPathLayerGroup);

            L.circleMarker(path.getLatLngs()[0], { //adding starting point to map
                fillColor: "red",
                stroke: false,
                fillOpacity: 1,
                radius: 5,
            }).addTo(roadPathLayerGroup);

            L.circleMarker(path.getLatLngs()[path.getLatLngs().length - 1], { //adding destination point to map
                fillColor: "green",
                stroke: false,
                fillOpacity: 1,
                radius: 5,
            }).addTo(roadPathLayerGroup);

            roadPathLayerGroup.addTo(map);
            map.fitBounds(roadPathLayerGroup.getBounds());

            document.getElementById("dist").innerHTML = toKMorMeter(route.distance*1000)
            dist.text = `Distance: ${toKMorMeter(route.distance*1000)}`;
            const timeElement = document.getElementById("time");
            if (route.time < 60) {
                timeElement.innerHTML = `${route.time} Minutes`;
                dist.text += `Time: ${route.time} Minutes`;
            } else {
                const hrs = parseInt(route.time / 60);
                const min = route.time % 60;
                timeElement.innerHTML = `${hrs} Hours ${min} Minutes`;
                dist.text += `Time: ${hrs} Hours ${min} Minutes`;
            }

            notifySreenReader(dist.text);
            document.getElementById("distanceResult").style.display = "block"; //showing the distance result
        } else {
            const errorData = JSON.parse(route.responseText);
            if (errorData.error_code === 130) {
                alert("Failed to parse locations. Please ensure to select a valid location from suggestions.");
            } else {
                alert(errorData.error);
            }
        }
    }.bind(this));
}

// Function to close and reset the distance finder UI
export function closeDistanceFinder() {
    if (roadPathLayerGroup) {
        roadPathLayerGroup.remove();
        roadPathLayerGroup = null;
    }
    closeSound.play();
    document.getElementById("distanceResult").style.display = "none";
    startingLocationElement.value = "";
    destinationLocationElement.value = "";
    distanceBox.style.display = "none";
    notifySreenReader("Distance finder closed");
}
