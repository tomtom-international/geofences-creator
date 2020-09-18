var currentTab = "api-key-form";

showTab(currentTab);

var geofencingApiURL = "https://api.tomtom.com/geofencing/1/";

tt.setProductInfo("Fence manager", "2.1");
var map;

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

var turfOptions = {
  steps: 60,
  units: "meters"
};

var popupOptions = {
  maxWidth: "300px"
};

function showTab(tabId) {
  document.getElementById(currentTab).style.display = "none";
  document.getElementById(tabId).style.display = "block";
  currentTab = tabId;
}

function validateForm() {
  var currentTabElem = document.getElementById(currentTab);
  var fields = currentTabElem.getElementsByTagName("input");
  var i, valid = true;
  for (i = 0; i < fields.length; i++) {
    fields[i].addEventListener("input", function() {
      this.classList.remove("invalid");
    })
    if (fields[i].value == "") {
      fields[i].classList.add("invalid");
      valid = false;
    }
  }
  return valid;
}

document.getElementById("save-api-key").addEventListener("click", function() {
  if (validateForm()) {
    apiKey = document.getElementById("api-key").value;
    showTab("admin-key-form");
  };
})

document.getElementById("save-admin-key").addEventListener("click", function() {
  if (validateForm()) {
    geofencingAdminKey = document.getElementById("admin-key").value;
    showTab("project-id-form");
  };
})

document.getElementById("save-project-id").addEventListener("click", function() {
  if (validateForm()) {
    geofencingProjectId = document.getElementById("project-id").value;
    hideConfigForm();
  };
})

function hideConfigForm() {
  document.getElementById("config-form").style.display = "none";
  document.getElementById("map").style.display = "block";
  map = tt.map({
    container: "map",
    key: apiKey,
    attributionControlPosition: "bottom-left"
  });
  
  var attributions = [
    '<a href="https://www.tomtom.com/mapshare/tools/" target="_blank">Report map issue</a>'
  ];
  map.getAttributionControl().addAttribution(attributions);
  
  map.addControl(new tt.NavigationControl(), "top-left");
  
  new Foldable(".js-foldable", "top-right");

  document.getElementById("circle-button").addEventListener("click", function(e) {
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
    setButtonActive(e.target);
  });
  
  document.getElementById("rectangle-button").addEventListener("click", function(e) {
      drawHandler(
        null,
        function(e) {
          this.geometry.coordinates[1] = [e.lngLat.lng, e.lngLat.lat];
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
            coordinates: [[event.lngLat.lng, event.lngLat.lat]]
          };
          this.setOneClickMapListeners();
        }
      );
      setButtonActive(e.target);
    });
  
  document.getElementById("corridor-button").addEventListener("click", function(e) {
      drawHandler(
        "corridor-form",
        function(e) {
          this.geometry.coordinates[this.geometry.coordinates.length - 1] = [
            e.lngLat.lng,
            e.lngLat.lat
          ];
  
          var geoJsonData = turf.buffer(
            this.geometry,
            this.geometry.radius,
            turfOptions
          );
  
          this.redraw(geoJsonData);
        },
        function(event) {
          this.geometry = {
            type: "LineString",
            shapeType: "Corridor",
            radius: parseFloat(document.getElementById("corridor-radius").value),
            coordinates: [
              [event.lngLat.lng, event.lngLat.lat],
              [event.lngLat.lng, event.lngLat.lat]
            ]
          };
          this.setDblClickMapListeners();
          map.on("dblclick", this.finishPolygon);
        }
      );
      setButtonActive(e.target);
    });
  
  document.getElementById("polygon-button").addEventListener("click", function(e) {
    drawHandler(
      null,
      function(e) {
        this.geometry.coordinates[this.geometry.coordinates.length - 1] = [
          e.lngLat.lng,
          e.lngLat.lat
        ];
        this.geometry.type = "LineString";
        this.redraw(this.geometry);
      },
      function(event) {
        var self = this;
        this.geometry = {
          coordinates: [
            [event.lngLat.lng, event.lngLat.lat],
            [event.lngLat.lng, event.lngLat.lat]
          ]
        };
        this.setDblClickMapListeners();
        map.on("dblclick", function() {
          self.geometry = convertLineStringToPolygon(self.geometry);
          self.redraw(self.geometry);
          self.endDrawing();
        });
      },
      true
    );
    setButtonActive(e.target);
  });
  
  document
    .getElementById("search-button")
    .addEventListener("click", searchHandler);

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
    map.fitBounds(bounds, { padding: { top: 15, bottom:15, left: 15, right: 15 }, animate: false });
    return fences;
  })
  .then(function(fences) {
    fences.forEach(function(fence) {
      displayFence(fence);
    });
  });
}

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

function getFenceDetails(fence, counter = 0) {
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

  var polygon = new Polygon(geoJsonData)
    .addTo(map)
    .bindPopup(detailsPopup(data), popupOptions)
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

var drawnShape;

function drawHandler(activeForm, onMouseMove, onStartDrawing, isPolygon) {
  setActiveForm(activeForm);

  if (drawnShape) {
    drawnShape.cancelDrawing();
    clearButtonsState();
  }

  drawnShape = Object.create(shape);
  drawnShape.startDrawing = drawnShape.startDrawing.bind(drawnShape);
  drawnShape.endDrawing = drawnShape.endDrawing.bind(drawnShape);
  drawnShape.addVertex = drawnShape.addVertex.bind(drawnShape);
  drawnShape.finishPolygon = drawnShape.finishPolygon.bind(drawnShape);
  drawnShape.onMouseMove = onMouseMove.bind(drawnShape);
  drawnShape.onStartDrawing = onStartDrawing.bind(drawnShape);
  drawnShape.isPolygon = isPolygon;

  map.on("click", drawnShape.startDrawing);
}

var shape = {
  startDrawing: function(event) {
    this.polygon = new Polygon().addTo(map);
    this.setEscapeHandler();
    this.onStartDrawing(event);
  },
  endDrawing: function() {
    var self = this;

    map.off("mousemove", this.onMouseMove);
    map.off("click", this.addVertex);
    map.off("click", this.endDrawing);
    map.off("dblclick", this.finishPolygon);

    function onPopupOpen() {
      document
        .getElementById("save-button")
        .addEventListener("click", function() {
          self.polygon.off("popupopen", onPopupOpen);
          saveButtonHandler(self.polygon, self.geometry);
          self.polygon = null;
        });
    }

    this.polygon
      .bindPopup(inputPopup)
      .on("popupopen", onPopupOpen)
      .openPopup();
  },
  cancelDrawing: function() {
    map.off("mousemove", this.onMouseMove);
    map.off("click", this.startDrawing);
    map.off("click", this.endDrawing);
    map.off("click", this.addVertex);
    map.off("dblclick", this.finishPolygon);
    this.polygon && this.polygon.remove();
    document.onkeydown = null;
  },
  setOneClickMapListeners: function() {
    map.off("click", this.startDrawing);
    map.on("mousemove", this.onMouseMove);
    map.on("click", this.endDrawing);
  },
  setDblClickMapListeners: function() {
    map.off("click", this.startDrawing);
    map.on("mousemove", this.onMouseMove);
    map.on("click", this.addVertex);
  },
  addVertex: function(event) {
    var oneBeforeLastCoordinate = this.geometry.coordinates[
      this.geometry.coordinates.length - 2
    ];
    if (
      oneBeforeLastCoordinate[0] != event.lngLat.lng &&
      oneBeforeLastCoordinate[1] != event.lngLat.lat
    ) {
      this.geometry.coordinates.push([event.lngLat.lng, event.lngLat.lat]);
    }
  },
  finishPolygon: function() {
    if (this.isPolygon) {
      this.geometry = convertLineStringToPolygon(this.geometry);
      this.redraw();
    } else {
      this.geometry.coordinates.pop();
    }
    this.endDrawing();
  },
  redraw: function(geoJsonData) {
    this.polygon.setData(geoJsonData);
  },
  setEscapeHandler: function() {
    var self = this;
    document.onkeydown = function(event) {
      if (event.key === "Escape" || event.key === "Esc") {
        self.cancelDrawing();
        clearButtonsState();
      }
    };
    document.getElementById("search-button").addEventListener("click", function() {self.cancelDrawing()});
  }
};

function searchHandler(e) {
  clearButtonsState();
  setButtonActive(e.target);
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

function convertLineStringToPolygon(geometry) {
  geometry.coordinates[geometry.coordinates.length - 1] =
    geometry.coordinates[0];
  geometry.type = "Polygon";
  geometry.coordinates = [geometry.coordinates];
  return geometry;
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
              polygon.remove();
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
    });
}

function getAdditionalData(response) {
  var geometryId = response.results[0].dataSources.geometry.id;
  return tt.services
    .additionalData({
      key: apiKey,
      geometries: [geometryId],
      geometriesZoom: 12
    });
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
  var geometry = additionalDataResult.geometryData.features[0].geometry;
  var buffer = parseInt(document.getElementById("buffer-text").value);
  if (buffer != 0) {
    geometry = turf.buffer(geometry, buffer, turfOptions).geometry;
  }

  var bounds = getFitBounds(geometry);
  map.fitBounds(bounds, { padding: { top: 15, bottom:15, left: 15, right: 15 }, animate: false });

  var polygon;

  function onPopupOpen() {
    document
      .getElementById("save-button")
      .addEventListener("click", function() {
        polygon.off("popupopen", onPopupOpen);
        saveButtonHandler(polygon, geometry);
      });
  }

  polygon = new Polygon(geometry)
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

function clearButtonsState() {
  document.getElementsByClassName("choice-button").forEach(button => {
    button.classList.remove("active");
  })
}

function setButtonActive(button) {
  button.classList.add("active");
}

var modal = document.getElementById("modal");
var modalContent = document.getElementById("modal-content");
modal.addEventListener("click", function() {
  modal.style.display = "none";
});
