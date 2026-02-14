export const countryTemplate = [
    { type: "header", level: 3, text: "Main Details" },
    { type: "list", items: [
        { key: "capital", label: "Capital" },
        { key: "continent", label: "Continent" },
        { key: "coordinates", label: "Coordinates" }, // Assumes `roundedLat` and `roundedLon` are pre-calculated
        { key: "area", label: "Area" }, 
      ]
    },
    { type: "header", level: 3, text: "Additional Details" },
    { type: "list", items: [
        { key: "language", label: "Language(s)" },
        { key: "population", label: "Population" },
        { key: "borders", label: "Borders" },
      ]
    },
    { type: "header", level: 5, text: "Bounding Coordinates" },
    { type: "list", items: [
        { key: "northernmostPoint", label: "North-most" },
        { key: "southernmostPoint", label: "South-most" },
        { key: "easternmostPoint", label: "East-most" },
        { key: "westernmostPoint", label: "West-most" },
      ]
    },
  ];
  
export const riverTemplate = [
    { type: "list", items: [
        { key: "name", label: "Name" },
        { key: "length", label: "Length" },
        { key: "origin", label: "Origin" },
        { key: "mouth", label: "Mouth" },
        { key: "tributaries", label: "Tributaries" },
      ]
    },
  ];
export const districtTemplate = [
    { type: "header", level: 3, text: "Main Details" },
    { type: "paragraph", items: [
        { key: "state", label: "State" },
        { key: "coordinates", label: "Coordinates" }, // Assumes `roundedLat` and `roundedLon` are pre-calculated
        { key: "area", label: "Area" }, 

      ]
    },
    { type: "header", level: 3, text: "Additional Details" },
    { type: "paragraph", items: [
        { key: "borders", label: "Borders" },
        { key: "summary", label: "Summary" },
      ]
    },
  ];
export const stateTemplate = [
    { type: "header", level: 3, text: "Main Details" },
    { type: "list", items: [
        { key: "country", label: "Country" },
        { key: "capital", label: "Capital" },
        { key: "coordinates", label: "Coordinates" }, // Assumes `roundedLat` and `roundedLon` are pre-calculated
        { key: "area", label: "Area" }, 

      ]
    },
    { type: "header", level: 3, text: "Additional Details" },
    { type: "list", items: [
        { key: "borders", label: "Borders" },
        { key: "summary", label: "Summary" },
      ]
    },
  ];
    
