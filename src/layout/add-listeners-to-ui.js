import { tileLayerGeographical, tileLayerPolitical } from '../components/tile-layer.js';
import { cancelShowPlaceDetails, geoLayer } from '../services/fetch-place.js';
import { onSubmitonMainSearchBar } from '../components/Search/search.js';
import { detailsCloseButton } from '../utils/dom-elements.js';
import { fetchCurrentLocation } from '../services/current-location.js';
import { closeSearchResultsOnClickOutside } from '../utils/general-events.js';
import { closeSound } from '../utils/sounds.js';
import { map } from '../components/map.js';
import { notifySreenReader } from '../utils/accessibility.js';



let layersBtn = document.getElementById('layers-btn'); //gets the layers button element
let layersDropdown = document.getElementById('layers-dropdown'); //gets the layers dropdown element

let geographicalLayerBtn = document.getElementById("geographical-layer"); //gets the geographical layer button element
let politicalLayerBtn = document.getElementById("political-layer"); //gets the political layer button element

let locationArrow = document
  .getElementById('controls-box')
  .querySelector('.fa-location-arrow');
let plusIcon = document
  .getElementById('controls-box')
  .querySelector('.fa-plus');
let minusIcon = document
  .getElementById('controls-box')
  .querySelector('.fa-minus');



export function addListenerstoUI(){
  
layersBtn.addEventListener('click', function () {
  layersDropdown.style.display =
    layersDropdown.style.display === 'block' ? 'none' : 'block';
});

locationArrow.addEventListener('click', fetchCurrentLocation);

plusIcon.addEventListener('click', function () {
  map.zoomIn();
});

minusIcon.addEventListener('click', function () {
  map.zoomOut();
});

document.getElementById('search-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    onSubmitonMainSearchBar();
  }
});
document.getElementById('searchbutton').addEventListener('click', function (e) {
  onSubmitonMainSearchBar();
});
document.addEventListener('click', closeSearchResultsOnClickOutside);


detailsCloseButton.addEventListener('click', function () {
  closeSound.play()
  document.getElementById("searchdetails").style.display = "none";
  if (geoLayer != null) {
    geoLayer.remove();
  }
  marker.clearGeoJson();
  cancelShowPlaceDetails()
})




  geographicalLayerBtn.addEventListener("click", function () {
    layersDropdown.style.display = "none";
    tileLayerPolitical.remove();
    tileLayerGeographical.addTo(map);
    geographicalLayerBtn.classList.add("active");
    politicalLayerBtn.classList.remove("active");
    notifySreenReader("Switched to geographical map");
  });

  // Event listener for political layer
  politicalLayerBtn.addEventListener("click", function () {
    layersDropdown.style.display = "none";
    tileLayerGeographical.remove();
    tileLayerPolitical.addTo(map);
    politicalLayerBtn.classList.add("active");
    geographicalLayerBtn.classList.remove("active");
    notifySreenReader("Switched to political map");
  });
}