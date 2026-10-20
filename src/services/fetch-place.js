import { detalisElement } from '../utils/dom-elements.js';
import { notifyLoading, notifySreenReader } from '../utils/accessibility.js';
import { isInindiaKashmir } from "../services/nominatim.js";
import { fetchDetails } from '../components/Search/place-details.js';
import { removeResults } from '../services/do-search.js';
import { successSound } from '../utils/sounds.js';
import { geocodingAPI, headerofNominatim } from '../utils/to-km-or-meter.js';
import { IndiaFull, kasmir } from '../services/fetch-india.js';
import { map } from '../components/map.js';

export var geoLayer;//for storing geojson layer other than boundary(like points and lines)
const Options = {
  color: 'red', // Border color
  fillColor: 'yellow',
  fillOpacity: 0.5, // Adjust fill opacity as needed
  pane: 'selectedPane', // Add to the selected pane
};

export const osmIds = [ //osm ids of kasmir included parts of china and pak
  307573, 270056, 153310, 2748339, 2748436, 1997914, 153292,
];

let Loadinginterval; // Loading interval for indication
let cancelFetch = false; // External flag to allow cancelling
let SearchID = 0; // Search ID to track the current search


export async function showPlaceDetails(result) {
  SearchID++; // Increment the search ID
  let currentSearch = SearchID; // Store the current search ID
  removeResults();
  detalisElement.parentElement.style.display = 'block';
  detalisElement.innerHTML =
    '<h2 style="padding:50px; text-align: center; justify-content: center; align-items: center;"><i class="fas fa-circle-notch fa-spin"></i></h2>';
  Loadinginterval && clearInterval(Loadinginterval); // Clear the loading interval if needed
  Loadinginterval = setInterval(notifyLoading, 2000); // Loading indication

  // Create a timeout that will reject after 15 seconds
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => {
      if (!cancelFetch && currentSearch === SearchID) { // Check if the last called function is the current one
        reject(new Error('Taking too long to load'));
      }else{
        cancelFetch = false;
      }
    }, 90000)
  );

  try {
    // Fetching geoJSON data (vector boundary data) and adding to map, then returning the area
    const area = await geoJSON(result.osm_type, result.osm_id);

    // Race between fetchDetails and the timeout
    const fetchPromise = fetchDetails(result, area);
    const data = await Promise.race([fetchPromise, timeoutPromise]); // Return as soon as either completes

    clearInterval(Loadinginterval); // Clear the loading interval once finished

    successSound.play();

    if(!cancelFetch && currentSearch === SearchID){
      if (await isInindiaKashmir(marker, result)) {
        detalisElement.innerHTML = 'No data found for this region';
      } else {
        detalisElement.innerHTML = data;
      }
  
      detalisElement.focus();
    }else{
      cancelFetch = false;
    }
    return data; // Return the fetched data or result
  } catch (error) {
    clearInterval(Loadinginterval); // Ensure the loading interval is cleared
    console.error(error);
    if(!cancelFetch && currentSearch === SearchID){
      // detalisElement.innerHTML ='';
      detalisElement.focus();
    }else{
      cancelFetch = false;
    }
  }
}

// Function to cancel the operation
export function cancelShowPlaceDetails() {
  cancelFetch = true; // Set flag to true to cancel the ongoing request
  clearInterval(Loadinginterval); // Cancel the loading interval if needed
}


async function geoJSON(type, id) {
  let area = null;
  geoLayer && geoLayer?.remove();
  marker.clearGeoJson(); // removing if there any already

  let result = null;
  let centre = null;
  const osmTypeLetter = type ? type.toUpperCase().charAt(0) : "R";

  // 1. Try to fetch polygon geometry directly from /api/details proxy
  try {
    const addressData = await fetch(
      `/api/details?osmtype=${osmTypeLetter}&osmid=${id}`,
      headerofNominatim
    ).then((response) => response.json());

    if (addressData?.geometry) {
      result = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: addressData.localname || addressData.names?.name || "",
              admin_level: addressData.admin_level,
            },
            geometry: addressData.geometry,
          },
        ],
      };
    }

    if (addressData?.centroid?.coordinates) {
      centre = [addressData.centroid.coordinates[1], addressData.centroid.coordinates[0]];
    } else if (addressData?.geometry?.coordinates && addressData.geometry.type === "Point") {
      centre = [addressData.geometry.coordinates[1], addressData.geometry.coordinates[0]];
    }
  } catch (error) {
    console.warn("Could not retrieve details from Nominatim proxy:", error);
  }

  // 2. If polygon not available from Nominatim, fallback to Overpass proxy
  if (!result || !result.features || result.features.length === 0) {
    try {
      const overpassRaw = await fetch("/api/overpass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: `[out:json][timeout:25];(${type}(${id}););out geom;`,
        }),
      }).then((res) => res.json());

      if (overpassRaw && Array.isArray(overpassRaw.elements) && overpassRaw.elements.length > 0) {
        result = osmtogeojson(overpassRaw);
      }
    } catch (err) {
      console.warn("Overpass fetch failed:", err);
    }
  }

  if (result?.features?.[0]?.properties?.name === "India") {
    result = IndiaFull;
  }

  if (result?.features?.[0]) {
    osmIds.forEach((value) => {
      if (value == id && kasmir?.features?.[0]) {
        try {
          result = turf.difference(result.features[0], kasmir.features[0]);
        } catch (e) {
          console.warn("turf.difference error:", e);
        }
      }
    });
  }

  // Determine center of mass if not already set
  if (!centre && result?.features?.[0]) {
    try {
      const centerObj = turf.centerOfMass(result);
      if (centerObj?.geometry?.coordinates) {
        centre = [centerObj.geometry.coordinates[1], centerObj.geometry.coordinates[0]];
      }
    } catch (error) {
      console.warn("turf.centerOfMass failed:", error);
    }
  }

  if (result && result.features && result.features.length > 0) {
    try {
      geoLayer = L.geoJson(result, Options);
      if (centre && typeof leafletPip !== "undefined" && leafletPip.pointInLayer) {
        if (leafletPip.pointInLayer(L.latLng(centre), geoLayer).length <= 0) {
          map.fitBounds(geoLayer.getBounds());
        }
      } else {
        map.fitBounds(geoLayer.getBounds());
      }
      geoLayer.addTo(map);

      notifySreenReader("The cursor is inside the boundary, Inbound navigation is enabled");
      marker.setGeoJson(result);
      area = turf.area(result);
    } catch (e) {
      console.warn("Could not apply geoLayer to map:", e);
    }
  } else {
    notifySreenReader("Location found");
  }

  if (centre) {
    marker.setLatLng(centre);
    map.setView(centre, Math.max(map.getZoom(), 8));
  }

  return area;
}

