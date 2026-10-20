import { closeDistanceFinder, initialize_DistanceFinder_EventListeners } from "./components/DistanceFinder/distance.js";
import { addListenerstoUI } from "./layout/add-listeners-to-ui.js";
import { map } from "./components/map.js";
import { Marker } from "./components/Marker/marker.js";
import { addDisclaimer } from "./layout/disclaimer.js";
import { detailsCloseButton, detalisElement, distanceBox, distanceIcon, input } from "./utils/dom-elements.js";
import { lockTabKey } from "./utils/keydown-helpers.js";
import { closeSound, successSound } from "./utils/sounds.js";
let marker;
addDisclaimer(); // Add a disclaimer to the UI

fetch('https://ipinfo.io/json') //fetching the location of the user and setting the map to that location, if failed then setting it to the default location
  .then(response => response.json())
  .then(data => {
      const [lat, lon] = data.loc.split(',');
      map.setView([lat, lon], 7)
  })
  .catch(error => {
map.setView([10.16,76.64],7)
  }).finally(()=>{
    window.marker = new Marker(map.getCenter()).addTo(map)
  })
document.addEventListener('keydown',handleKeyDownOnDocument) // Initialize event listeners for key shortcuts on the document, general any time shortcuts
addListenerstoUI() // Initialize event listeners for the UI elements on the page
initialize_DistanceFinder_EventListeners(); // Initialize event listeners for the distance finder


function handleKeyDownOnDocument(event) { //for key shortcuts for the whole application
    if (event.code == "Escape") {
        if(distanceBox.style.display == "block") closeDistanceFinder(); // close search details box
        if(detalisElement.parentElement.style.display == 'block') detailsCloseButton.click(); // close search details box
    }
    if (event.altKey && event.code === "KeyS") {
        event.preventDefault();
        // Focus on the search bar element
        input?.focus(); 
    }
    if (event.altKey && event.code == "KeyK") {
      event.preventDefault()
        //for geting key shortcuts
       displayKeyShortcuts()
    }
    if (event.altKey && event.code == "KeyM") {
        //for stating altitude
        map.getContainer().focus();
    }
    if (event.ctrlKey && event.shiftKey && event.code == "KeyD") {
        //
        event.preventDefault();
        distanceIcon.click();
        distanceBox.focus();
    }
};



const keys = document.createElement('div');
keys.id = 'keys';
keys.setAttribute('role', 'alert');
keys.setAttribute('aria-label', 'keys');

const keysText = document.createElement('p');
keysText.setAttribute("tabindex", 1);
keysText.setAttribute("aria-atom","true");
keysText.id = 'keysTextc';
const keysTextContainer = document.createElement('div');
keysTextContainer.id='keysText';
keysText.innerHTML = `<h2>Keyboard Shortcuts for World-Map-Explorer</h2>
<p>Use browse mode to navigate throgh each list item following using arrow keys</p>
<ol>
    <li><strong>Alt + M</strong>: Focus on the map</li>
    <li><strong>ORCA Modifier + A</strong>: Switch between browse mode and focus mode in Ubuntu</li>
    <li><strong>NVDA Modifier + Space</strong>: Turn on/off scan mode in Windows</li>
    <li>Use <strong>Arrow Keys</strong> to navigate using curser</li>
    <li><strong>Alt + S</strong>: Toggle search bar</li>
    <li><strong>F</strong>: Announce the name of the current location of curser</li>
    <li><strong>Shift + F</strong>: Announce the coordinates of the current location</li>
    <li><strong>Enter</strong>: Select the current location of the pointer</li>
    <li><strong>+ or =</strong>: Zoom in</li>
    <li><strong>-</strong>: Zoom out</li>
    <li><strong>Z</strong>: Know the distance traveled by the cursor in one key press</li>
    <li><strong>A</strong>: Announce the altitude of the current place</li>
    <li><strong>L</strong>: Reset the cursor to the user's location (if location permission is enabled)</li>
    <li><strong>D</strong>: Know the distance to the western and eastern border</li>
    <li><strong>D twice</strong>: Know the distance to the northern and southern border</li>
    <li><strong>Shift + Up</strong>: Know the distance to the northern border</li>
    <li><strong>Shift + Down</strong>: Know the distance to the southern border</li>
    <li><strong>Shift + Right</strong>: Know the distance to the eastern border</li>
    <li><strong>Shift + Left</strong>: Know the distance to the western border</li>
    <li><strong>J</strong>: Activate adjustable pointer or curser</li>
    <li><strong>UpArrow and DownArrow</strong> (when adjustable pointer is active): Increase or decrease distance</li>
    <li><strong>LeftArrow and RightArrow</strong> (when adjustable pointer is active): Increase or decrease angle</li>
    <li><strong>F</strong>: Announce details of the place indicated by the adjustable pointer</li>
    <li><strong>Alt + L</strong>: Select the current location as the initial or final location in distance finder</li>
    <li><strong>Enter</strong> (when adjustable pointer is active): Move the curser to the location pointed by the adjustable pointer</li>
    <li><strong>Alt + K</strong> To check keyboard shortcuts anytime</li>
    <li><strong>Ctrl + Shift + D</strong> To turn on distance finder</li>
</ol>
`;


const closeButtonforKeys = document.createElement('button');
closeButtonforKeys.id = 'close-button-k';
closeButtonforKeys.setAttribute('aria-label', 'Close keys');
closeButtonforKeys.innerHTML = '<i class="fa fa-times"></i>';
const lockTabKeyRefer = (event)=> lockTabKey(event, keysText, closeButtonforKeys)

  closeButtonforKeys.addEventListener('click', () => {
    document.removeEventListener('keydown', lockTabKeyRefer);
    keys.remove();
    closeSound.play()
  });
  keysText.appendChild(closeButtonforKeys);
  keysTextContainer.appendChild(keysText);
  keys.appendChild(keysTextContainer);
export function displayKeyShortcuts() {
  document.body.prepend(keys);
  successSound.play();
  document.addEventListener("keydown", lockTabKeyRefer);

  setTimeout(() => {
    keysText.focus();
  }, 0);
}
window.displayKeyShortcuts = displayKeyShortcuts;