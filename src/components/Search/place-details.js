import { tosqKMorMeter } from "../../utils/to-km-or-meter.js";
import { fetchPrefix } from "./fetch-prefix.js";
import { countryTemplate, districtTemplate, riverTemplate, stateTemplate } from "./templates.js";

export async function fetchDetails(result, area) {
  
  //fetch details of the place based on country, state, district, river, or other
  const { osm_type, osm_id, display_name } = result;
  const tags = await getTagsFromOverpass(osm_type, osm_id);
  const adminLevel = parseInt(tags["admin_level"]);
  if (area) area = tosqKMorMeter(area);
  if (adminLevel <= 2) return fetchCountryDetails(display_name, osm_type, osm_id, area);
  if ([3, 4].includes(adminLevel)) return fetchStateDetails(display_name, osm_type, osm_id, area);
  if (adminLevel === 5) return fetchDistrictDetails(display_name, osm_type, osm_id, area);
  if (tags["type"] === "waterway" || tags["waterway"] === "river") return fetchRiverDetails(tags, result);
  return fetchOtherDetails(tags, result, area);
}

async function fetchCountryDetails(displayName, osm_type, osm_id, area) {
  const { tags, center } = await getOverpassData(osm_type, osm_id);
  const wikidataDetails = await fetchWikidataDetails(displayName);
  const boundingCoordinates = await fetchBoundingCoordinates(wikidataDetails);

  const details = {
    capital: await fetchClaimValue(wikidataDetails, "P36"),
    continent: await fetchClaimValue(wikidataDetails, "P30"),
    language: await fetchMultipleClaims(wikidataDetails, "P37"),
    population: getClaimValue(wikidataDetails.claims?.P1082?.[0]),
    borders: await fetchMultipleClaims(wikidataDetails, "P47"),
    area: area,
    coordinates: `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`,
    northernmostPoint: boundingCoordinates[0],
    southernmostPoint: boundingCoordinates[1],
    easternmostPoint: boundingCoordinates[2],
    westernmostPoint: boundingCoordinates[3],
  };

  return formatOutput(displayName, details, countryTemplate);
}

async function fetchStateDetails(displayName, osm_type, osm_id, area) {
  const { tags, center } = await getOverpassData(osm_type, osm_id);
  const wikidataDetails = await fetchWikidataEntity(tags.wikidata);

  const details = {
    country: await fetchClaimValue(wikidataDetails, "P17"),
    capital: await fetchClaimValue(wikidataDetails, "P36"),
    area: area,
    coordinates: `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`,
    borders: await fetchMultipleClaims(wikidataDetails, "P47"),
    summary: wikidataDetails.descriptions?.en?.value || "No summary available.",
  };

  return formatOutput(displayName, details, stateTemplate);
}

async function fetchDistrictDetails(displayName, osm_type, osm_id, area) {
  const { tags, center } = await getOverpassData(osm_type, osm_id);
  const wikidataDetails = await fetchWikidataEntity(tags.wikidata);

  const details = {
    state: await fetchClaimValue(wikidataDetails, "P131"),
    area: area,
    coordinates: `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`,
    borders: await fetchMultipleClaims(wikidataDetails, "P47"),
    summary: wikidataDetails.descriptions?.en?.value || "No summary available.",
  };

  return formatOutput(displayName, details, districtTemplate);
}

async function fetchRiverDetails(tags, result, area = null) {
  const wikidataEntity = tags.wikidata ? await fetchWikidataEntity(tags.wikidata) : null;

  const details = {
    length: wikidataEntity ? getClaimValue(wikidataEntity.claims?.P2043?.[0]) + " K M" : "Unknown",
    origin: wikidataEntity ? await fetchClaimValue(wikidataEntity, "P885") : "Unknown",
    mouth: wikidataEntity ? await fetchClaimValue(wikidataEntity, "P403") : "Unknown",
    tributaries: wikidataEntity ? await fetchMultipleClaims(wikidataEntity, "P974") : "Unknown",
  };

  return formatOutput(`River: ${tags.name || "Unknown"}`, details, riverTemplate, area);
}

async function fetchOtherDetails(tags, result, area) {
  let prefix = await fetchPrefix(tags);
  let data = `
      <h3>Details</h3>
      <ul>
      <li>Name : ${result.name}</li>
      <li>Type : ${prefix != "" ? prefix : result.type}</li>
      `;
  data += area ? `<li>Area : ${area}</li>` : "";
  data += `
      <li>Address : ${result.display_name}</li></ul>
      `;
  return data;
}

// Utility Functions
async function getTagsFromOverpass(osm_type, osm_id) {
  const query = `[out:json]; ${osm_type}(${osm_id}); out tags;`;
  const result = await fetchOverpass(query);
  return result.elements[0]?.tags || {};
}

async function getOverpassData(osm_type, osm_id) {
  const query = `[out:json]; ${osm_type}(${osm_id}); out tags center;`;
  const result = await fetchOverpass(query);
  return result.elements[0];
}

async function fetchOverpass(query) {
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
  });
  return response.json();
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

