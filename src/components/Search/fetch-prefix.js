const response = await fetch("../src/assets/json/prefix.json");
    const data = await response.json();

export  async function fetchPrefix(result) {
    var tags = result;
    var prefix = "";
  
    if (tags.boundary === "administrative" && tags.admin_level) {
      prefix = data.prefix.admin_levels["level" + tags.admin_level];
    } else {
      var prefixes = data.prefix;
      var key, value;
      for (key in tags) {
        value = tags[key];
  
        if (prefixes[key]) {
          if (prefixes[key][value]) {
            return prefixes[key][value];
          }
        }
      }
      for (key in tags) {
        value = String(tags[key]);
  
        if (prefixes[key]) {
          var first = value.slice(0, 1).toUpperCase(); 
          var rest = value.slice(1).replace(/_/g, " ");
  
          return first + rest;
        }
      }
    }
    return prefix;
  }
