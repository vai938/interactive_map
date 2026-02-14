import { map } from "../components/map.js";
import { isInindiaKashmir } from "../services/nominatim.js";
import { notifySreenReader } from "../utils/accessibility.js";
import { geocodingAPI, headerofNominatim } from "../utils/to-km-or-meter.js";

export async function findplaceNamAandData(point, lat, lon, zoom) {
  if (point) {
    const { lat: _lat, lng: _lng } = point.getLatLng();
    const _zoom = map.getZoom();

    let name;
    let d;

    await fetch(
      `/api/reverse?lat=${_lat}&lon=${_lng}&zoom=${_zoom}`,
      headerofNominatim
    )
      .then((response) => response.json())
      .then(async (data) => {
        d = data;
        name = data.name || data.display_name;

        if (data.error === "Unable to geocode") {
          name = "Sea";
        }
        if (await isInindiaKashmir(point, data)) {
          name = "India";
        }
      })
      .catch((error) => {
        console.error("Error in fetching place name:", error);
      });

    notifySreenReader(name, true);
    return { name: name, data: d };
  } else {
    alert("click somewhere first!");
  }
}
