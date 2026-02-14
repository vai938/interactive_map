import { map } from "../components/map.js";


let active = -1 //for arrow key navigation in search results



export function keyboardselect(e){  //function for arrow key navigation in search results
    if (e.keyCode == 40) {
    e.preventDefault()
      if (active < this.querySelector("#search-results").children.length-1) {
        active++
        this.querySelector("#search-results").children[active].focus()
      }
    }else if(e.keyCode == 38){
    e.preventDefault()
      if (active > 0) {
        active--
        this.querySelector("#search-results").children[active].focus()
      }
    }else if(e.keyCode == 13){
    e.preventDefault()
        active=-1
      document.activeElement?.click()
  
    }
  }


export function lockTabKey(event, text, closeButton) {
    if (event.keyCode === 9) {
  
        if(document.activeElement=== text){
          closeButton.focus();
      event.preventDefault();
  
        }
        else if(document.activeElement=== closeButton){
          text.focus();
      event.preventDefault();
  
        }
    }
  }

  export function perKeyDist(){
        perkeydist = (((40075016 * Math.cos((marker.getLatLng().lat * Math.PI) / 180)) /
                    Math.pow(2, map.getZoom() + 8)) *
                10);

  }
