import { lockTabKey } from "../utils/keydown-helpers.js";
import { closeSound } from "../utils/sounds.js";

const disclaimer = document.createElement('div');
disclaimer.id = 'disclaimer';
disclaimer.setAttribute('role', 'alert');
disclaimer.setAttribute('aria-label', 'Disclaimer');

const message = document.createElement('p');
message.setAttribute("tabindex", 1);
message.setAttribute("aria-atom","true");
message.id = 'messagec';
const messageContainer = document.createElement('div');
messageContainer.id='message';
message.innerHTML = `<p>
    <strong>Welcome to World-Map-Explorer</strong><br><br>
    Please note the following:<br>
    <ol>
        <li>This application uses OpenStreetMap (OSM) data for map information. OSM is responsible for the maintenance and accuracy of the map</li>
        <li>While using main features of map like searching and navigating using curser, keep focus mode on or keep scan mode off </li>
        <li>To navigate using marker, press TAB untill focus on map(or <strong>ALT + M</strong>). Then make sure focus mode is on. Now you can navigate using arrow keys</li>
        <li>To get all short cuts press <strong>ALT + K</strong></li>
        <li>For users navigating markers with screen readers:<br>
            &nbsp;&nbsp;&nbsp;&nbsp;- For NVDA users, press <strong>NVDA Modifier+Space</strong> to toggle Focus Mode.<br>
            &nbsp;&nbsp;&nbsp;&nbsp;- For JAWS users, press <strong>Insert+Z</strong> to disable Virtual Cursor.<br>
            &nbsp;&nbsp;&nbsp;&nbsp;- For ORCA users, press <strong>ORCA Modifier+A</strong> to toggle Focus Mode.<br>
            &nbsp;&nbsp;&nbsp;&nbsp;- For VoiceOver users, press <strong>Control+Option+Shift+U</strong> to interact with curser.</li>
    </ol>
    You can find more details in the <a href="/src/pages/user-guide/index.html" target="_blank" rel="noopener noreferrer">User Guide</a>.<br><br>
    Thank you for using World-Map-Explorer! 
</p>`;

const closeButton = document.createElement('button');
closeButton.id = 'close-button';
closeButton.setAttribute('aria-label', 'Close Disclaimer');
closeButton.innerHTML = '<i class="fa fa-times"></i>';


const lockTabKeyRefer = (event)=> lockTabKey(event, message, closeButton)

closeButton.addEventListener('click', () => {
  document.removeEventListener('keydown', lockTabKeyRefer);
  disclaimer.remove();
  closeSound.play()
});
message.appendChild(closeButton);
  
messageContainer.appendChild(message);
disclaimer.appendChild(messageContainer);

export function addDisclaimer(){
  document.body.prepend(disclaimer);

  document.addEventListener('keydown', lockTabKeyRefer);  
  // disclaimer part ends
  window.onload = function () { 
    message.focus();
  }
}  
























