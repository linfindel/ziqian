let fileContent;

fetch("accepted_tags.txt")
.then(response => response.text())
.then(data => {
  fileContent = data;
  console.log(fileContent);

  getLocation();
  setTimeout(() => {
    getLocation();
  }, 5000);
})

function generateOverpassQuery(radius, lat, lon) {
  const lines = fileContent.split('\n');
  const tags = [];

  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        if (value === '*') {
          tags.push(`${key}`);
        } else {
          tags.push(`${key}=${value}`);
        }
      }
    }
  });

  // Create the base query
  const query = `
    [out:json];
    (
      ${tags.map(tag => `node[${tag}]["access"!="no"]["access"!="private"]["garden:type"!="residential"]["garden:type"!="private"](around:${radius}, ${lat}, ${lon});`).join('\n  ')}
      ${tags.map(tag => `way[${tag}]["access"!="no"]["access"!="private"]["garden:type"!="residential"]["garden:type"!="private"](around:${radius}, ${lat}, ${lon});`).join('\n  ')}
      ${tags.map(tag => `relation[${tag}]["access"!="no"]["access"!="private"]["garden:type"!="residential"]["garden:type"!="private"](around:${radius}, ${lat}, ${lon});`).join('\n  ')}
    );
    out body;
    >;
    out skel qt;
  `;

  return query;
}

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(setPosition);
  }
  
  else {
    alert("Geolocation is not supported by this browser");
  }
}

var map = L.map("map");

L.tileLayer("http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
  maxZoom: 17,
  attribution: "OpenStreetMap"
}).addTo(map);

var locationIcon = L.icon({
  iconUrl: 'location.png',
  iconSize: [25, 25]
});

const locationMarker = L.marker([51.5, -0.09], {icon: locationIcon}).addTo(map);

function setPosition(position) {
  map.setView([position.coords.latitude, position.coords.longitude], 17)
  locationMarker.setLatLng([position.coords.latitude, position.coords.longitude]);

  getPOIs(position.coords.latitude, position.coords.longitude);
}

async function getPOIs(lat, lon, radius = 200) {
  console.log(generateOverpassQuery(radius, lat, lon));

  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = generateOverpassQuery(radius, lat, lon);

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    const featureIDs = [];

    data.elements.forEach(element => {
      const feature = {
        id: element.id,
        type: element.type
      };
      featureIDs.push(feature);
    });

    console.log(featureIDs);

    for (const { type, id } of featureIDs) {
      fetch(`https://api.openstreetmap.org/api/0.6/${type}/${id}/full.json`)
      .then(response => response.json())
      .then((data) => {
        let elements = data.elements;
        let tags;
        elements.forEach(element => {
          if (element.tags) {
            tags = element.tags;

            console.log(tags);
          }
        });
      })
    }
  }
  
  catch (error) {
    console.error('Error fetching POIs:', error);
    return [];
  }
}