import { map } from '/src/components/map.js';

var indiaBoundaries; //variable to store the boundary lines that is leaflet geojson object
var borderpane = map.createPane("borderPane"); //creates a pane for the boundary lines to make them appear below the other map drawings
map.getPane("borderPane").style.zIndex = 200; //sets the z-index of the boundary lines to 200 to make them appear below the other map drawings

let IndiaNorthBoundary = await getIndiaBoundary() //fetches the boundary data of correct India and adds it to the map
export let IndiaFull = await fetchIndia()
export let kasmir = await fetchKashmir()
  
  export async function getIndiaBoundary() { //function to add the boundary lines to the map
    return fetch('/src/assets/geojson/boundary.geojson')
      .then(response => response.json())
      .then(data => {
        return data
      });
  } //function to add the boundary lines to the map
window.getIndiaBoundary = getIndiaBoundary;
  async function fetchIndia() {
    return fetch('/src/assets/geojson/india-osm.geojson')
      .then(response => response.json())
      .then(data => {
        return data
      });
  } //function to fetch the boundary data of india

  export async function fetchKashmir() {
    return fetch('/src/assets/geojson/kashmir.geojson')
      .then(response => response.json())
      .then(data => {
        return data
      });
  }




  //fetches the boundary data of correct India and adds it to the map
export async function addIndiaBoundaries() { 
  indiaBoundaries?.remove(); //removes the boundary lines if they are already present on the map
 indiaBoundaries = L.geoJSON(IndiaNorthBoundary, {
   style: boundaryStyle,
   pane: "borderPane",
 }).addTo(map);
} //function to add the boundary lines to the map

function boundaryStyle(feature) {  //function to style the boundary lines of disputed and claimed territories
  // the weight is a function of the current map scale
  var wt;
  wt = map.getZoom() / 4;
  switch (feature.properties.boundary) {
    case 'disputed':
      return {
        color: "#f2efea", weight: wt * 2,
      };
    case 'claimed':
      return {
        color: "#b9a8b9", weight: wt
      };
  }
}

