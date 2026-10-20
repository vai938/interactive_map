import { tosqKMorMeter } from "../../utils/to-km-or-meter.js";
import { fetchPrefix } from "./fetch-prefix.js";
import { countryTemplate, districtTemplate, riverTemplate, stateTemplate } from "./templates.js";

export async function fetchDetails(result, area) {
  // fetch details of the place based on country, state, district, river, or other
  const { osm_type, osm_id, display_name } = result;
  const tags = (await getTagsFromOverpass(osm_type, osm_id)) || {};
  const adminLevel = parseInt(tags["admin_level"] || 0);
  if (area) area = tosqKMorMeter(area);

  try {
    if (tags["type"] === "waterway" || tags["waterway"] === "river") {
      return await fetchRiverDetails(tags, result, area);
    }
    if (adminLevel && adminLevel <= 2) {
      return await fetchCountryDetails(display_name, osm_type, osm_id, area);
    }
    if (adminLevel && [3, 4].includes(adminLevel)) {
      return await fetchStateDetails(display_name, osm_type, osm_id, area);
    }
    if (adminLevel && adminLevel === 5) {
      return await fetchDistrictDetails(display_name, osm_type, osm_id, area);
    }
  } catch (err) {
    console.warn("Detailed template formatting failed, falling back to basic details:", err);
  }

  return fetchOtherDetails(tags, result, area);
}

async function fetchCountryDetails(displayName, osm_type, osm_id, area) {
  const overpassData = (await getOverpassData(osm_type, osm_id)) || { tags: {}, center: { lat: 0, lon: 0 } };
  const tags = overpassData.tags || {};
  const center = overpassData.center || { lat: 0, lon: 0 };
  const wikidataDetails = (await fetchWikidataDetails(displayName)) || {};
  const boundingCoordinates = (await fetchBoundingCoordinates(wikidataDetails)) || [];

  const details = {
    capital: (await fetchClaimValue(wikidataDetails, "P36")) || "Unknown",
    continent: (await fetchClaimValue(wikidataDetails, "P30")) || "Unknown",
    language: (await fetchMultipleClaims(wikidataDetails, "P37")) || "Unknown",
    population: getClaimValue(wikidataDetails.claims?.P1082?.[0]) || "Unknown",
    borders: (await fetchMultipleClaims(wikidataDetails, "P47")) || "None recorded",
    area: area || "Unknown",
    coordinates: `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`,
    northernmostPoint: boundingCoordinates[0] || "Unknown",
    southernmostPoint: boundingCoordinates[1] || "Unknown",
    easternmostPoint: boundingCoordinates[2] || "Unknown",
    westernmostPoint: boundingCoordinates[3] || "Unknown",
  };

  return formatOutput(displayName, details, countryTemplate);
}

async function fetchStateDetails(displayName, osm_type, osm_id, area) {
  const overpassData = (await getOverpassData(osm_type, osm_id)) || { tags: {}, center: { lat: 0, lon: 0 } };
  const tags = overpassData.tags || {};
  const center = overpassData.center || { lat: 0, lon: 0 };
  const wikidataDetails = tags.wikidata ? (await fetchWikidataEntity(tags.wikidata)) || {} : {};

  const details = {
    country: (await fetchClaimValue(wikidataDetails, "P17")) || "Unknown",
    capital: (await fetchClaimValue(wikidataDetails, "P36")) || "Unknown",
    area: area || "Unknown",
    coordinates: `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`,
    borders: (await fetchMultipleClaims(wikidataDetails, "P47")) || "None recorded",
    summary: wikidataDetails.descriptions?.en?.value || "No summary available.",
  };

  return formatOutput(displayName, details, stateTemplate);
}

async function fetchDistrictDetails(displayName, osm_type, osm_id, area) {
  const overpassData = (await getOverpassData(osm_type, osm_id)) || { tags: {}, center: { lat: 0, lon: 0 } };
  const tags = overpassData.tags || {};
  const center = overpassData.center || { lat: 0, lon: 0 };
  const wikidataDetails = tags.wikidata ? (await fetchWikidataEntity(tags.wikidata)) || {} : {};

  const details = {
    state: (await fetchClaimValue(wikidataDetails, "P131")) || "Unknown",
    area: area || "Unknown",
    coordinates: `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`,
    borders: (await fetchMultipleClaims(wikidataDetails, "P47")) || "None recorded",
    summary: wikidataDetails.descriptions?.en?.value || "No summary available.",
  };

  return formatOutput(displayName, details, districtTemplate);
}

async function fetchRiverDetails(tags, result, area = null) {
  const wikidataEntity = tags.wikidata ? await fetchWikidataEntity(tags.wikidata) : null;

  const details = {
    length: wikidataEntity ? getClaimValue(wikidataEntity.claims?.P2043?.[0]) + " KM" : "Unknown",
    origin: wikidataEntity ? await fetchClaimValue(wikidataEntity, "P885") : "Unknown",
    mouth: wikidataEntity ? await fetchClaimValue(wikidataEntity, "P403") : "Unknown",
    tributaries: wikidataEntity ? await fetchMultipleClaims(wikidataEntity, "P974") : "Unknown",
  };

  return formatOutput(`River: ${tags.name || result.name || "Unknown"}`, details, riverTemplate, area);
}

async function fetchOtherDetails(tags, result, area) {
  let prefix = "";
  try {
    prefix = await fetchPrefix(tags || {});
  } catch {
    prefix = "";
  }

  let data = `
      <h3>Place Details</h3>
      <ul>
      <li><strong>Name:</strong> <span>${result.name || result.display_name?.split(",")?.[0] || "Unknown"}</span></li>
      <li><strong>Type:</strong> <span>${prefix || result.type || result.class || "Location"}</span></li>
      `;
  data += area ? `<li><strong>Area:</strong> <span>${area}</span></li>` : "";
  if (result.lat && result.lon) {
    data += `<li><strong>Coordinates:</strong> <span>${parseFloat(result.lat).toFixed(4)}, ${parseFloat(result.lon).toFixed(4)}</span></li>`;
  }
  data += `
      <li><strong>Address:</strong> <span>${result.display_name}</span></li></ul>
      `;
  return data;
}

// Utility Functions
async function getTagsFromOverpass(osm_type, osm_id) {
  try {
    const query = `[out:json]; ${osm_type}(${osm_id}); out tags;`;
    const result = await fetchOverpass(query);
    if (result?.elements?.[0]?.tags) {
      return result.elements[0].tags;
    }
  } catch (err) {
    console.warn("getTagsFromOverpass error:", err);
  }

  // Fallback to /api/details from Nominatim which includes extratags
  try {
    const osmTypeLetter = osm_type ? osm_type.toUpperCase().charAt(0) : "R";
    const details = await fetch(`/api/details?osmtype=${osmTypeLetter}&osmid=${osm_id}`)
      .then((r) => r.json());
    return {
      admin_level: details?.admin_level,
      name: details?.localname || details?.names?.name,
      ...(details?.extratags || {}),
    };
  } catch {
    return {};
  }
}

async function getOverpassData(osm_type, osm_id) {
  try {
    const query = `[out:json]; ${osm_type}(${osm_id}); out tags center;`;
    const result = await fetchOverpass(query);
    if (result?.elements?.[0]) {
      return result.elements[0];
    }
  } catch (err) {
    console.warn("getOverpassData error:", err);
  }

  // Fallback to /api/details
  try {
    const osmTypeLetter = osm_type ? osm_type.toUpperCase().charAt(0) : "R";
    const details = await fetch(`/api/details?osmtype=${osmTypeLetter}&osmid=${osm_id}`)
      .then((r) => r.json());
    return {
      tags: {
        admin_level: details?.admin_level,
        name: details?.localname || details?.names?.name,
        ...(details?.extratags || {}),
      },
      center: {
        lat: details?.centroid?.coordinates?.[1] || 0,
        lon: details?.centroid?.coordinates?.[0] || 0,
      },
    };
  } catch {
    return { tags: {}, center: { lat: 0, lon: 0 } };
  }
}

async function fetchOverpass(query) {
  try {
    const response = await fetch("/api/overpass", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: query }),
    });
    if (!response.ok) {
      throw new Error(`Overpass proxy error: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.warn("fetchOverpass error:", err);
    return { elements: [] };
  }
}

async function fetchWikidataDetails(displayName) {
  const wikidataEntityId = await fetchWikidataEntityId(displayName);
  const wikidataDetails = await fetchWikidataEntity(wikidataEntityId);
  return wikidataDetails;
}

async function fetchWikidataEntityId(displayName) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&origin=*&format=json&sites=enwiki&titles=${displayName}`;
  const response = await fetch(url).then((res) => res.json());
  return Object.values(response.entities)[0]?.id;
}

async function fetchWikidataEntity(entityId) {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&origin=*&format=json&ids=${entityId}&props=claims|descriptions`;
  const response = await fetch(url).then((res) => res.json());
  return response.entities?.[entityId];
}

async function fetchClaimValue(wikidataDetails, claimKey) {
  const claim = getClaimValue(wikidataDetails.claims?.[claimKey]?.[0]);
  return claim ? fetchEntityLabel(claim.id) : null;
}

async function fetchMultipleClaims(wikidataDetails, claimKey) {
  const claims = wikidataDetails.claims?.[claimKey] || [];
  return Promise.all(claims.map(async (claim) => fetchEntityLabel(claim.mainsnak.datavalue?.value.id))).then(
    (results) => results.filter(Boolean).join(", ")
  );
}

async function fetchEntityLabel(entityId) {
  if (!entityId) return null;
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`;
  const response = await fetch(url).then((res) => res.json());
  return response.entities?.[entityId]?.labels?.en?.value || null;
}

async function fetchBoundingCoordinates(wikidataDetails) {
  const points = ["P1332", "P1333", "P1334", "P1335"];
  const coordinates = await Promise.all(
    points.map(async (point) => {
      const claim = getClaimValue(wikidataDetails.claims?.[point]?.[0]);
      return claim ? `Lon: ${claim.longitude.toFixed(3)}, Lat: ${claim.latitude.toFixed(3)}` : null;
    })
  );
  return coordinates;
}

function getClaimValue(claim) {
  if (!claim || !claim.mainsnak?.datavalue) {
    return null; // Return null if the structure doesn't match
  }

  const value = claim.mainsnak.datavalue.value;

  // Handle cases where the value is a number (e.g., population) or other types
  if (typeof value === "object" && value.amount) {
    return parseFloat(value.amount); // Parse as a number
  }

  return value; // Return the value directly if it's not an object
}

function formatOutput(displayName, details, template) {
  // Start with the display name header
  let output = `<h2>${displayName}</h2>`;

  // Iterate through the template to construct sections
  for (const section of template) {
    if (section.type === "header") {
      output += `<h${section.level}>${section.text}</h${section.level}>`;
    } else if (section.type === "list") {
      output += `<ul>`;
      for (const item of section.items) {
        const value = getValue(details, item.key);
        if (value !== null && value !== undefined) {
          output += `<li>${item.label}: ${value}</li>`;
        }
      }
      output += `</ul>`;
    } else if (section.type === "paragraph") {
      for (const item of section.items) {
        const value = getValue(details, item.key);
        if (value !== null && value !== undefined) {
          output += `<p>${item.label}: ${value}</p>`;
        }
      }
    }
  }

  return output;
}

// Helper function to retrieve values from the details object
function getValue(details, key) {
  const value = details[key];
  return Array.isArray(value) ? value.join(", ") : value;
}

