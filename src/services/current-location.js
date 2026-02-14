import { map } from "../components/map.js";


export function fetchCurrentLocation() {
    map.locate({ setView: true, maxZoom: 16 , enableHighAccuracy: true});
}
