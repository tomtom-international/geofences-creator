var geofencingApiURL = "https://api.tomtom.com/geofencing/1/";

tt.setProductInfo("Fence manager", "2.0");
var map = tt.map({
  container: "map",
  key: apiKey,
  theme: {
    style: "main",
    layer: "basic",
    source: "vector"
  },
  attributionControlPosition: "bottom-left"
});

var attributions = [
  '<a href="https://www.tomtom.com/mapshare/tools/" target="_blank">Report map issue</a>'
];
map.getAttributionControl().addAttribution(attributions);

map.addControl(new tt.NavigationControl(), "top-left");

new Foldable(".js-foldable", "top-right");

var inputPopup =
  '<div class="form">' +
  '<div class="form__row form__row--compact">' +
  '<label class="form__label">Name <input type="text" id="input-name" class="form__input"></label>' +
  "</div>" +
  '<div class="form__row form__row--compact">' +
  '<label class="form__label">Additional JSON properties (optional)' +
  '<textarea id="input-properties" class="form__input" cols="40" rows="5">{}</textarea></label>' +
  "</div>" +
  '<div class="form__row form__row--compact">' +
  '<input type="button" id="save-button" class="btn-submit btn-submit--save" value="Save">' +
  "</div>" +
  "</div>";

var fenceStyle = {
  fillPaint: {
    "fill-color": "#2FAAFF",
    "fill-opacity": 0.2
  },
  linePaint: {
    "line-color": "#2FAAFF",
    "line-opacity": 0.8,
    "line-width": 3
  },
  lineLayout: {
    "line-join": "round",
    "line-cap": "round"
  }
};

var turfOptions = {
  steps: 60,
  units: "meters"
};

var popupOptions = {
  maxWidth: "300px"
};

function getFences() {
  return axios
    .get(
      geofencingApiURL +
        "projects/" +
        geofencingProjectId +
        "/fences?key=" +
        apiKey
    )
    .then(function(response) {
      return response.data.fences;
    })
    .catch(function(err) {
      displayModal(
        "There was an error while fetching fences: " + err.response.data
      );
    });
}

function getFenceDetails(fence) {
  var counter =
    arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var retryTimes = 5;
  return axios
    .get(geofencingApiURL + "fences/" + fence.id + "?key=" + apiKey)
    .then(function(response) {
      return response.data;
    })
    .catch(function(err) {
      if (err.response.status == 403 && counter < retryTimes) {
        counter++;
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            resolve(getFenceDetails(fence, counter));
          }, 1000);
        });
      } else {
        displayModal(
          "There was an error while fetching fence: " + err.response.data
        );
      }
    });
}

function detailsPopup(data) {
  var prop = JSON.stringify(data.properties, null, 4).replace(/\n/g, "<br>");
  return (
    '<div class="form">' +
    '<div class="form__row form__row--compact">' +
    "Name: " +
    data.name +
    "</div>" +
    '<div class="form__row form__row--compact">' +
    "Id: " +
    data.id +
    "</div>" +
    '<div class="form__row form__row--compact">' +
    "Properties: <br>" +
    prop +
    "</div>" +
    '<div class="form__row form__row--compact">' +
    '<input type="button" id="remove-button-' +
    data.id +
    '" class="btn-submit btn-submit--remove" value="Remove">' +
    "</div>" +
    "</div>"
  );
}

function displayFence(data) {
  var geoJsonData;
  if (data.geometry.type == "Polygon" || data.geometry.type == "MultiPolygon") {
    geoJsonData = data;
  } else {
    switch (data.geometry.shapeType) {
      case "Circle":
        geoJsonData = turf.circle(
          data.geometry.coordinates,
          data.geometry.radius,
          turfOptions
        );
        break;
      case "Rectangle":
        geoJsonData = turf.envelope(data.geometry);
        break;
      case "Corridor":
        geoJsonData = turf.buffer(
          data.geometry,
          data.geometry.radius,
          turfOptions
        );
        break;
    }
  }

  var polygon = new Polygon(data.id, geoJsonData)
    .addTo(map)
    .bindPopup(detailsPopup(geoJsonData), popupOptions)
    .on("popupopen", function() {
      document
        .getElementById("remove-button-" + data.id)
        .addEventListener("click", function() {
          polygon.remove();
          removeFence(data.id);
        });
    });
}

function removeFence(id) {
  return axios
    .delete(
      geofencingApiURL +
        "fences/" +
        id +
        "?key=" +
        apiKey +
        "&adminKey=" +
        geofencingAdminKey
    )
    .then(console.log("Fence deleted"))
    .catch(function(err) {
      displayModal(
        "There was an error while deleting fence: " + err.response.data.message
      );
    });
}

function drawHandler(activeForm, onMouseMove, startDrawing, isPolygon) {
  setActiveForm(activeForm);
  map.off("click");
  map.on("click", function(event) {
    var drawnShape = Object.create(shape);
    drawnShape.geoJson = tomtom.L.geoJson().addTo(map);
    drawnShape.onMouseMove = onMouseMove;
    drawnShape.startDrawing = startDrawing;
    drawnShape.startDrawing(event, isPolygon);
    drawnShape.setEscapeHandler();
  });
}

function searchHandler() {
  setActiveForm("search-form");
  document
    .getElementById("search-action-button")
    .addEventListener("click", findGeometry);
  map.off("click");
}

function setActiveForm(formName) {
  document.getElementById("search-form").style.display = "none";
  document.getElementById("corridor-form").style.display = "none";
  if (formName) {
    document.getElementById(formName).style.display = "flex";
  }
}

var shape = {
  setEscapeHandler: function() {
    var self = this;
    document.onkeydown = function(event) {
      if (event.key === "Escape" || event.key === "Esc") {
        cancelDrawing(self.geoJson);
      }
    };
  },
  endDrawing: function() {
    var self = this;
    map.off("mousemove");
    map.off("click");
    this.geoJson
      .bindPopup(inputPopup)
      .on("popupopen", function() {
        document
          .getElementById("save-button")
          .addEventListener("click", function() {
            saveButtonHandler(self.geoJson, self.geometry);
            self.geoJson = null;
          });
      })
      .openPopup();
    map.off("dblclick");
  },
  redraw: function(geoJsonData) {
    this.geoJson.clearLayers();
    this.geoJson.addData(geoJsonData).setStyle(geoJsonOptions.style);
  },
  setOneClickMapListeners: function() {
    var self = this;
    map.on("mousemove", function(e) {
      self.onMouseMove(e);
    });
    map.off("click");
    map.on("click", function() {
      self.endDrawing(self.geometry, self.geoJson);
    });
  },
  setDblClickMapListeners: function() {
    var self = this;
    map.on("mousemove", function(e) {
      self.onMouseMove(e);
    });
    map.off("click");
    map.on("click", function(event) {
      var oneBeforeLastCoordinate =
        self.geometry.coordinates[self.geometry.coordinates.length - 2];
      if (
        oneBeforeLastCoordinate[0] != event.latlng.lng &&
        oneBeforeLastCoordinate[1] != event.latlng.lat
      ) {
        self.geometry.coordinates.push([event.latlng.lng, event.latlng.lat]);
      }
    });
  }
};

function convertLineStringToPolygon(geometry) {
  geometry.coordinates[geometry.coordinates.length - 1] =
    geometry.coordinates[0];
  geometry.type = "Polygon";
  geometry.coordinates = [geometry.coordinates];
  return geometry;
}

function cancelDrawing(geoJson) {
  map.off("mousemove");
  map.off("click");
  geoJson.remove();
  geoJson = tomtom.L.geoJson();
  map.off("dblclick");
  document.onkeydown = null;
}

function saveButtonHandler(polygon, geometry) {
  var name = document.getElementById("input-name").value;
  try {
    var properties = JSON.parse(
      document.getElementById("input-properties").value
    );
    saveFence(
      {
        name: name,
        type: "Feature",
        geometry: geometry,
        properties: properties
      },
      polygon
    );
    polygon.closePopup();
    document.onkeydown = null;
  } catch (err) {
    displayModal(
      "Error while parsing JSON properties.\nExample input:\n{'key': 'value',\n'key2': 'value2'}"
    );
  }
}

function saveFence(fenceData, polygon) {
  axios
    .post(
      geofencingApiURL +
        "projects/" +
        geofencingProjectId +
        "/fence?key=" +
        apiKey +
        "&adminKey=" +
        geofencingAdminKey,
      fenceData
    )
    .then(function(response) {
      polygon
        .bindPopup(detailsPopup(response.data))
        .on("popupopen", function() {
          document
            .getElementById("remove-button-" + response.data.id)
            .addEventListener("click", function() {
              geoJson.remove();
              removeFence(response.data.id);
            });
        });
    })
    .catch(function(err) {
      displayModal(
        "There was an error while saving fences: " + err.response.data.message
      );
    });
}

function findGeometry() {
  var query = document.getElementById("search-text").value;
  fuzzySearch(query)
    .then(getAdditionalData)
    .then(processAdditionalDataResponse);
}

function fuzzySearch(query) {
  return tt.services
    .fuzzySearch({
      key: apiKey,
      query: query
    })
    .go();
}

function getAdditionalData(response) {
  var geometryId = response.results[0].dataSources.geometry.id;
  return tt.services
    .additionalData({
      key: apiKey,
      geometries: [geometryId],
      geometriesZoom: 12
    })
    .go();
}

function processAdditionalDataResponse(additionalDataResponse) {
  if (
    additionalDataResponse.additionalData &&
    additionalDataResponse.additionalData.length
  ) {
    displayPolygonOnTheMap(additionalDataResponse.additionalData[0]);
  }
}

function displayPolygonOnTheMap(additionalDataResult) {
  var polygonId = additionalDataResult.providerID;
  var geometry = additionalDataResult.geometryData.features[0].geometry;
  var buffer = parseInt(document.getElementById("buffer-text").value);
  if (buffer != 0) {
    geometry = turf.buffer(geometry, buffer, turfOptions).geometry;
  }

  var bounds = getFitBounds(geometry);
  map.fitBounds(bounds, { animate: false });

  var polygon;

  function onPopupOpen() {
    document
      .getElementById("save-button")
      .addEventListener("click", function() {
        polygon.off("popupopen", onPopupOpen);
        saveButtonHandler(polygon, geometry);
      });
  }

  polygon = new Polygon(polygonId, geometry)
    .addTo(map)
    .bindPopup(inputPopup, popupOptions)
    .on("popupopen", onPopupOpen)
    .openPopup();

  document.onkeydown = function(event) {
    if (event.key === "Escape" || event.key === "Esc") {
      polygon.remove();
      document.onkeydown = null;
    }
  };
}

function getFitBounds(geoJson) {
  var envelope = turf.envelope(geoJson);
  var coordinates = envelope.geometry.coordinates;
  return [coordinates[0][0], coordinates[0][2]];
}

function displayModal(message) {
  modalContent.innerText = message;
  modal.style.display = "block";
}

getFences()
  .then(function(fences) {
    return Promise.all(
      fences.map(function(fence) {
        return getFenceDetails(fence);
      })
    );
  })
  .then(function(fences) {
    var geoJson = turf.featureCollection(fences);
    var bounds = getFitBounds(geoJson);
    map.fitBounds(bounds, { animate: false });
    return fences;
  })
  .then(function(fences) {
    fences.forEach(function(fence) {
      displayFence(fence);
    });
  });

document.getElementById("circle-button").addEventListener("click", function() {
  drawHandler(
    null,
    function(event) {
      this.geometry.radius = turf.distance(
        this.geometry.coordinates,
        [event.lngLat.lng, event.lngLat.lat],
        { units: "meters" }
      );
      var geoJsonData = turf.circle(
        this.geometry.coordinates,
        this.geometry.radius,
        turfOptions
      );
      this.redraw(geoJsonData);
    },
    function(event) {
      this.geometry = {
        type: "Point",
        shapeType: "Circle",
        coordinates: [event.lngLat.lng, event.lngLat.lat]
      };
      this.setOneClickMapListeners();
    }
  );
});

document
  .getElementById("rectangle-button")
  .addEventListener("click", function() {
    drawHandler(
      null,
      function(e) {
        this.geometry.coordinates[1] = [e.latlng.lng, e.latlng.lat];
        var features = turf.featureCollection([
          turf.point(this.geometry.coordinates[0]),
          turf.point(this.geometry.coordinates[1])
        ]);
        var geoJsonData = turf.envelope(features);
        this.redraw(geoJsonData);
      },
      function(event) {
        this.geometry = {
          type: "MultiPoint",
          shapeType: "Rectangle",
          coordinates: [[event.latlng.lng, event.latlng.lat]]
        };
        this.setOneClickMapListeners();
      }
    );
  });

document
  .getElementById("corridor-button")
  .addEventListener("click", function() {
    drawHandler(
      "corridor-form",
      function(e) {
        this.geometry.coordinates[this.geometry.coordinates.length - 1] = [
          e.latlng.lng,
          e.latlng.lat
        ];
        var geoJsonData = turf.buffer(
          this.geometry,
          this.geometry.radius,
          turfOptions
        );
        this.redraw(geoJsonData);
      },
      function(event) {
        var self = this;
        this.geometry = {
          type: "LineString",
          shapeType: "Corridor",
          radius: parseFloat(document.getElementById("corridor-radius").value),
          coordinates: [
            [event.latlng.lng, event.latlng.lat],
            [event.latlng.lng, event.latlng.lat]
          ]
        };
        this.setDblClickMapListeners();
        map.on("dblclick", function() {
          self.geometry.coordinates.pop();
          self.endDrawing(self.geometry, self.geoJson);
        });
      }
    );
  });

document.getElementById("polygon-button").addEventListener("click", function() {
  drawHandler(
    null,
    function(e) {
      this.geometry.coordinates[this.geometry.coordinates.length - 1] = [
        e.latlng.lng,
        e.latlng.lat
      ];
      this.geometry.type = "LineString";
      this.redraw(this.geometry);
    },
    function(event) {
      var self = this;
      this.geometry = {
        coordinates: [
          [event.latlng.lng, event.latlng.lat],
          [event.latlng.lng, event.latlng.lat]
        ]
      };
      this.setDblClickMapListeners();
      map.on("dblclick", function() {
        self.geometry = convertLineStringToPolygon(self.geometry);
        self.redraw(self.geometry);
        self.endDrawing(self.geometry, self.geoJson);
      });
    }
  );
});

document
  .getElementById("search-button")
  .addEventListener("click", searchHandler);

var modal = document.getElementById("modal");
var modalContent = document.getElementById("modal-content");
modal.addEventListener("click", function() {
  modal.style.display = "none";
});
