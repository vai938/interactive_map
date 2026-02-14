import { map } from "../map.js";
import { notifySreenReader } from "../../utils/accessibility.js";
import { bordercrossSound } from "../../utils/sounds.js";
import { isInindiaKashmir } from "../../services/nominatim.js";
import { osmIds } from "../../services/fetch-place.js";
import { IndiaFull, kasmir } from "../../services/fetch-india.js";
import { findborderpoints } from "./border-distance.js";

let controller = null;
let errorCount = 0;
let oldName, presentName;
let isMarkerStable = true;
let wentFar = 0;
let Kashmir = kasmir;

/* =========================
   BORDER CROSS CHECK
========================= */
export function checkBorderCrossed(distance) {
  // 🔒 Guard against invalid distance
  if (!Number.isFinite(distance)) {
    return;
  }

  if (this?._placeBorderofCurrentLocation) {
    const inside =
      leafletPip.pointInLayer(
        this.getLatLng(),
        this._placeBorderofCurrentLocation
      ).length > 0;

    if (!inside && isMarkerStable) {
      isMarkerStable = false;
      bordercrossSound.play();
      oldName = presentName;

      getBorder
        .bind(this)()
        .then((data) => {
          if (!data) return;

          if (data.name !== "sea(mostly)") {
            checkBorderCrossed.bind(this)(0);
          }

          if (distance <= 60 && oldName && data.name !== oldName.name) {
            if (crossedhigherlevel(oldName, data)) {
              notifySreenReader(
                `${oldName.display_name} crossed. ${data.display_name} entered`,
                true
              );
            } else {
              notifySreenReader(
                `${oldName.name} crossed. ${data.name} entered`,
                true
              );
            }

            if (wentFar >= 7) {
              notifySreenReader("May be went too far");
              wentFar = 0;
            }
          }
        })
        .catch(() => {
          // ❗ swallow — getBorder already handles errors
        });
    } else if (!isMarkerStable) {
      wentFar++;
    }
  } else {
    getBorder.bind(this)();
  }
}

/* =========================
   FETCH & DRAW BORDER
========================= */
export async function getBorder() {
  if (!this._placeBorderofSelectedLocation) {
    this._borderPoints = null;
  }

  // Abort previous request safely
  if (controller) {
    controller.abort();
  }
  controller = new AbortController();
  const signal = controller.signal;

  try {
    isMarkerStable = false;

    map.eachLayer((layer) => {
      if (
        layer instanceof L.GeoJSON &&
        layer.getPane()?.classList.contains("leaflet-overlay-pane")
      ) {
        map.removeLayer(layer);
      }
    });

    const response = await fetch(
      `/api/reverse?lat=${this.getLatLng().lat}&lon=${this.getLatLng().lng}&zoom=${getFixedZoom()}`,
      { signal }
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // 🔕 Non-JSON is normal (Overpass / reverse failures)
      return;
    }

    if (data.features?.length > 0) {
      presentName = data.features[0].properties;
    } else if (data.properties) {
      presentName = data.properties;
    } else {
      return;
    }

    if (presentName?.name === "India") {
      data = IndiaFull;
    }

    if (await isInindiaKashmir(this, presentName)) {
      presentName = { name: "India", display_name: "India" };
      data = IndiaFull;
    }

    osmIds.forEach((value) => {
      if (value === presentName.osm_id) {
        data = turf.difference(data.features[0], Kashmir.features[0]);
      }
    });

    if (!this._placeBorderofSelectedLocation) {
      this._geoJson = data;
      this._borderPoints = findborderpoints.bind(this)(data);
    }

    this._placeBorderofCurrentLocation = L.geoJson(data, {
      fillOpacity: 0,
    }).addTo(map);

    isMarkerStable = true;
    return presentName;
  } catch (error) {
    // ✅ AbortError is EXPECTED — ignore silently
    if (error?.name === "AbortError") {
      errorCount++;
      if (errorCount > 5) {
        notifySreenReader("You're going too fast");
        errorCount = 0;
      }
      return;
    }

    // Other non-fatal failures
    isMarkerStable = true;
    return { name: "sea(mostly)", display_name: "sea(mostly)" };
  }
}

/* =========================
   HELPERS
========================= */
function crossedhigherlevel(cro, ent) {
  if (!cro || !ent) return false;

  if (ent.place_rank >= 10) {
    return (
      ent.address?.state !== cro.address?.state ||
      ent.address?.province !== cro.address?.province ||
      ent.address?.country !== cro.address?.country
    );
  }

  if (ent.place_rank >= 8) {
    return ent.address?.country !== cro.address?.country;
  }

  return false;
}

function getFixedZoom() {
  const z = map.getZoom();
  if (z >= 8) return 6;
  if (z >= 5) return 5;
  return 2;
}
