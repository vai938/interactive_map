export function findborderpoints(place) {
  // function to find all four border points of the given location (North, South, East, West)
  try {
    if (!place || !place.features || place.features.length === 0) {
      return null;
    }

    const currentPos = this.getLatLng();
    if (!currentPos || currentPos.lat === undefined || currentPos.lng === undefined) {
      return null;
    }

    const longitude = currentPos.lng;
    const latitude = currentPos.lat;

    // North-South line
    const lineSN = turf.lineString([
      [longitude, 90],
      [longitude, -90],
    ]);
    const intersectionsSN = turf.lineIntersect(lineSN, place);
    const valSN = (intersectionsSN?.features || []).map(
      (feature) => feature.geometry.coordinates[1]
    );

    const greaterLats = valSN.filter((num) => num > latitude);
    const lesserLats = valSN.filter((num) => num < latitude);
    const north = greaterLats.length > 0 ? Math.min(...greaterLats) : null;
    const south = lesserLats.length > 0 ? Math.max(...lesserLats) : null;

    // West-East line
    const lineWE = turf.lineString([
      [-180, latitude],
      [180, latitude],
    ]);
    const intersectionsWE = turf.lineIntersect(lineWE, place);
    const valWE = (intersectionsWE?.features || []).map(
      (feature) => feature.geometry.coordinates[0]
    );

    const greaterLngs = valWE.filter((num) => num > longitude);
    const lesserLngs = valWE.filter((num) => num < longitude);
    const east = greaterLngs.length > 0 ? Math.min(...greaterLngs) : null;
    const west = lesserLngs.length > 0 ? Math.max(...lesserLngs) : null;

    if (north === null && south === null && east === null && west === null) {
      return null;
    }

    return {
      north: north !== null && isFinite(north) ? [north, longitude] : null,
      south: south !== null && isFinite(south) ? [south, longitude] : null,
      west: west !== null && isFinite(west) ? [latitude, west] : null,
      east: east !== null && isFinite(east) ? [latitude, east] : null,
    };
  } catch {
    return null;
  }
}
