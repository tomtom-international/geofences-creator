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

var drawState;

function showTab(tabId) {
  var tooltip = "<img src='assets/tooltips.png'>";
  switch (tabId) {
    case "api-key-form":
      tooltip += "<span>TIP:</span> Remember to check if your API Key is valid for Geofencing API. If your are unsure, consult the <a href='https://developer.tomtom.com/geofencing-api/tutorials/fence-creation' target='_blank'>Tutorial</a>.";
      break;
    case "admin-key-form":
      tooltip += "Check <i>project ID</i> details in <a href='https://developer.tomtom.com/geofencing-api/geofencing-api-documentation-configuration-service/register-admin-key' target='_blank'>geofencing documentation</a>";
      break;
    case "project-id-form":
      tooltip += "Check <i>admin</i> key details in <a href='https://developer.tomtom.com/geofencing-api/geofencing-api-documentation-projects-service/add-new-project' target='_blank'>geofencing documentation</a>";
      break;
  }
  document.getElementById("tooltips").innerHTML = tooltip;
  document.getElementById(currentTab).style.display = "none";
  document.getElementById(tabId).style.display = "block";
  var icons = document.getElementsByClassName("progress-icon");
  icons.forEach(function(icon) {
    icon.style.background = "#8dc3eb";
    icon.style.color = "#fff";
  });
  var selectedIcon = document.querySelector("div[for=" + tabId + "]");
  selectedIcon.style.background = "#fff";
  selectedIcon.style.color = "#8dc3eb";
  currentTab = tabId;
}

function validateForm() {
  var currentTabElem = document.getElementById(currentTab);
  var fields = currentTabElem.getElementsByTagName("input");
  var i, valid = true;
  if (document.querySelector("[for='generated-admin-key']").style.display == "block") {
    valid = true;
  }
  for (i = 0; i < fields.length; i++) {
    fields[i].addEventListener("input", function() {
      this.classList.remove("invalid");
    })
    // Check if field is visible
    if (fields[i].offsetWidth > 0 && fields[i].offsetHeight > 0) {
      if (fields[i].id == "secret") {
        valid = false;
      }
      if (fields[i].value == "") {
        fields[i].classList.add("invalid");
        valid = false;
      }
    }
  }
  return valid;
}

document.getElementById("save-api-key").addEventListener("click", function() {
  if (validateForm()) {
    apiKey = document.getElementById("api-key").value;
    showTab("admin-key-form");
  };
});

document.getElementById("save-admin-key").addEventListener("click", function() {
  if (validateForm()) {
    var style = window.getComputedStyle(document.querySelector("[for='generated-admin-key']"));
    if ( style.getPropertyValue('display') != "none" ) {
      geofencingAdminKey = document.getElementById("generated-admin-key").innerText;
    }
    else {
      geofencingAdminKey = document.getElementById("admin-key").value;
    }
    clearProjectsList();
    retrieveProjects();
    showTab("project-id-form");
  };
});

document.getElementById("save-project-id").addEventListener("click", function() {
  if (validateForm()) {
    var select = document.getElementById("project-id");
    geofencingProjectId = select.options[select.selectedIndex].value;
    hideConfigForm();
  };
});

document.getElementById("back-to-api-key").addEventListener("click", function() {
  showTab("api-key-form");
});

document.getElementById("back-to-admin-key").addEventListener("click", function() {
  showTab("admin-key-form");
});

document.getElementById("provide-admin-key-tab").addEventListener("click", function() {
  if (document.querySelector("[for='generated-admin-key']").style.display != "block") {
    document.getElementById("gen-admin-key-tab").classList.remove("selected");
    this.classList.add("selected");
    document.querySelector("[for='secret']").style.display = "none";
    document.querySelector("[for='admin-key']").style.display = "block";
  }
})

document.getElementById("gen-admin-key-tab").addEventListener("click", function() {
  if (document.querySelector("[for='generated-admin-key']").style.display != "block") {
    document.getElementById("provide-admin-key-tab").classList.remove("selected");
    this.classList.add("selected");
    document.querySelector("[for='admin-key']").style.display = "none";
    document.querySelector("[for='secret']").style.display = "block";
  }
})

document.getElementById("gen-admin-key").addEventListener("click", function() {
  var secret = document.getElementById("secret").value;
  generateAdminKey(secret).then(function(key) {displayAdminKey(key)});
})

document.getElementById("how-to-get-api-key").addEventListener("click", function () {location.href="https://developer.tomtom.com/how-to-get-tomtom-api-key"});

document.getElementById("config").addEventListener("click", showConfigForm);

function retrieveProjects() {
  axios
  .get(
    geofencingApiURL + 
    "projects?key=" +
    apiKey
  )
  .then(function(response) {
    if (response.data.projects.length > 0) {
      response.data.projects.forEach(function(project) {
        addProjectToProjectsList(project);
      })
    }
    else {
      axios
      .post(
        geofencingApiURL +
        "projects/project?key=" +
        apiKey +
        "&adminKey=" +
        geofencingAdminKey,
        {
          name: "Geofences creator"
        }
      )
      .then(function(response) {
        addProjectToProjectsList(response.data);
      })
      .catch(function(err) {
        displayModal("error", createProjectErrorMsg(err));
      })
    }
  })
  .catch(function(err) {
    displayModal("error",retrieveProjectsErrorMsg(err))
  })
}

function clearProjectsList() {
  document.getElementById("project-id").innerHTML = "";
}

function addProjectToProjectsList(project) {
  var selectElement = document.getElementById("project-id");
  var option = document.createElement("option")
  option.value = project.id;
  option.innerText = project.name;
  selectElement.appendChild(option)
}

function showConfigForm() {
  map.remove();
  map = null;
  document.getElementById("config-form").style.display = "block";
  document.getElementById("map").style.display = "none";
  showTab("api-key-form");
}

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
    drawState = "circle";
    let activeForm = null;
    let onMouseMove = function(event) {
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
    };
    let onStartDrawing = function(event) {
      if (drawState != "cancel") {
        this.geometry = {
          type: "Point",
          shapeType: "Circle",
          coordinates: [event.lngLat.lng, event.lngLat.lat]
        };
        this.setOneClickMapListeners();
      }
      else {
        this.cancelDrawing();
      }
    };
    drawHandler(activeForm, onMouseMove, onStartDrawing);
    setButtonActive(e.target);
  });
  
  document.getElementById("rectangle-button").addEventListener("click", function(e) {
    drawState = "rectangle";
    let activeForm = null;
    let onMouseMove = function(e) {
      this.geometry.coordinates[1] = [e.lngLat.lng, e.lngLat.lat];
      var features = turf.featureCollection([
        turf.point(this.geometry.coordinates[0]),
        turf.point(this.geometry.coordinates[1])
      ]);
      var geoJsonData = turf.envelope(features);
      this.redraw(geoJsonData);
    };
    let onStartDrawing = function(event) {
      if (drawState != "cancel") {
        this.geometry = {
          type: "MultiPoint",
          shapeType: "Rectangle",
          coordinates: [[event.lngLat.lng, event.lngLat.lat]]
        };
        this.setOneClickMapListeners();
      }
      else {
        this.cancelDrawing();
      }
    };
    drawHandler(activeForm, onMouseMove, onStartDrawing);
    setButtonActive(e.target);
  });
  
  document.getElementById("corridor-button").addEventListener("click", function(e) {
    drawState = "corridor";
    let activeForm = "corridor-form";
    let onMouseMove = function(e) {
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
    };
    let onStartDrawing = function(event) {
      if (drawState != "cancel") {
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
      else {
        this.cancelDrawing();
      }
    };
    drawHandler(activeForm, onMouseMove, onStartDrawing);
    setButtonActive(e.target);
  });
  
  document.getElementById("polygon-button").addEventListener("click", function(e) {
    drawState = "polygon";
    let activeForm = null;
    let onMouseMove = function(e) {
      this.geometry.coordinates[this.geometry.coordinates.length - 1] = [
        e.lngLat.lng,
        e.lngLat.lat
      ];
      this.geometry.type = "LineString";
      this.redraw(this.geometry);
    };
    let onStartDrawing = function(event) {
      if (drawState != "cancel") {
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
      }
      else {
        this.cancelDrawing();
      }
    };
    let isPolygon = true;
    drawHandler(activeForm, onMouseMove, onStartDrawing, isPolygon);
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
    var transformedFences = [];
    fences.forEach(function(fence) {
      fence = transformFenceToGeoJson(fence);
      transformedFences.push(fence);
      displayFence(fence);
    })
    var geoJson = turf.featureCollection(transformedFences);
    var bounds = getBounds(geoJson);
    map.fitBounds(bounds, { padding: { top: 15, bottom:15, left: 15, right: 15 }, animate: false });
  })
}

function generateAdminKey(secret) {
  return axios
    .post(
      geofencingApiURL + 
      "register?key=" + 
      apiKey,
      {
        secret: secret 
      }
    )
    .then(function(response) {
      return response.data.adminKey;
    })
    .catch(function(err) {
      displayModal("error", generateAdminKeyErrosMsg(err));
      throw err;
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
      displayModal("error", fetchFencesErrorMsg(err));
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
      if ((err.response.status == 403 || err.response.status == 429) && counter < retryTimes) {
        counter++;
        return new Promise(function(resolve, reject) {
          setTimeout(function() {
            resolve(getFenceDetails(fence, counter));
          }, 1000);
        });
      } else {
        displayModal("error", fetchFenceErrorMsg(err));
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

function transformFenceToGeoJson(data) {
  if (data.geometry.type == "Polygon" || data.geometry.type == "MultiPolygon") {
    return data;
  } else {
    switch (data.geometry.shapeType) {
      case "Circle":
        geoJsonData = turf.circle(
          data.geometry.coordinates,
          data.geometry.radius,
          turfOptions
        );
        data.geometry = geoJsonData.geometry;
        return data;
      case "Rectangle":
        geoJsonData = turf.envelope(data.geometry);
        data.geometry = geoJsonData.geometry;
        return data;
      case "Corridor":
        geoJsonData =  turf.buffer(
          data.geometry,
          data.geometry.radius,
          turfOptions
        );
        data.geometry = geoJsonData.geometry;
        return data;
    }
  }
}

function displayFence(data) {
  var polygon = new Polygon(data)
    .addTo(map)
    .bindPopup(detailsPopup(data), popupOptions)
    .on("popupopen", function() {
      document
        .getElementById("remove-button-" + data.id)
        .addEventListener("click", function() {
          this.disabled = true;
          removeFence(data.id).then(
            polygon.remove()
            );
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
    .catch(function(err) {
      displayModal("error", deleteFenceErrorMsg(err));
    });
}

var drawnShape;

function onPopupOpen(self) {
  document
    .getElementById("save-button")
    .addEventListener("click", function() {
      this.disabled = true;
      saveButtonHandler(self);
    });
}

function drawHandler(activeForm, onMouseMove, onStartDrawing, isPolygon) {
  setActiveForm(activeForm);
  clearButtonsState();

  if (drawnShape) {
    drawnShape.cancelDrawing();
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

    this.polygon
      .bindPopup(inputPopup)
      .once("popupopen", function () {
        onPopupOpen(self);
      })
      .openPopup();
  },
  cancelDrawing: function() {
    map.off("mousemove", this.onMouseMove);
    map.off("click", this.startDrawing);
    map.off("click", this.endDrawing);
    map.off("click", this.addVertex);
    map.off("dblclick", this.finishPolygon);
    this.polygon && this.polygon.remove();
    drawnShape = null;
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
        drawState = "cancel";
        self.cancelDrawing();
        clearButtonsState();
      }
    };
  }
};

function searchHandler(e) {
  if (drawnShape) {
    drawnShape.cancelDrawing();
  }
  drawState = "cancel";
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

function saveButtonHandler(self) {
  var name = document.getElementById("input-name").value;
  try {
    var properties = JSON.parse(
      document.getElementById("input-properties").value
    );
    saveFence(
      {
        name: name,
        type: "Feature",
        geometry: self.geometry,
        properties: properties
      },
      self.polygon
    )
    .then(function() {
      self.polygon.closePopup();
      document.onkeydown = null;
      drawnShape = null;
      self.polygon = null;
      clearButtonsState();
    });
  }
  catch (err) {
    displayModal("error", invalidJsonErrorMsg());
  }
}

function saveFence(fenceData, polygon) {
  return axios
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
              this.disabled = true;
              removeFence(response.data.id).then(
                polygon.remove()
                );
            });
        });
    })
    .catch(function(err) {
      displayModal("error", saveFenceErrorMsg(err));
      polygon.remove();
    });
}

function findGeometry() {
  if (drawnShape) {
    drawnShape.cancelDrawing();
  }
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
  var self = {};
  self.geometry = additionalDataResult.geometryData.features[0].geometry;
  var buffer = parseInt(document.getElementById("buffer-text").value);
  if (buffer != 0) {
    self.geometry = turf.buffer(self.geometry, buffer, turfOptions).geometry;
  }

  var bounds = getBounds(self.geometry);
  map.fitBounds(bounds, { padding: { top: 15, bottom:15, left: 15, right: 15 }, animate: false });

  self.polygon = new Polygon(self.geometry)
    .addTo(map)
    .bindPopup(inputPopup, popupOptions)
    .once("popupopen", function _listener() {
      onPopupOpen(self);
    })
    .openPopup();

  self.cancelDrawing = function() {
    self.polygon.remove();
  }
  drawnShape = self;

  document.onkeydown = function(event) {
    if (event.key === "Escape" || event.key === "Esc") {
      self.polygon.remove();
      document.onkeydown = null;
    }
  };
}

function getBounds(geoJson) {
  var envelope = turf.envelope(geoJson);
  var coordinates = envelope.geometry.coordinates;
  if (coordinates[0][0][0] == Infinity && coordinates[0][0][1] == Infinity && coordinates[0][2][0] == -Infinity && coordinates[0][2][1] == -Infinity) {
    return [[180,90],[-180,-90]];
  }
  else {
    return [coordinates[0][0], coordinates[0][2]];
  }
}

function displayModal(type, message) {
  if (type == "error") {
    modal.classList.add("error");
  }
    modalContent.innerText = message;
  modal.style.display = "block";
  document.querySelector("body").addEventListener("click", function() {
    modal.style.display = "none";
    modal.classList.remove("error");
  })
}

function displayAdminKey(generatedAdminKey) {
  document.getElementById("generated-admin-key").innerText = generatedAdminKey;
  document.querySelector("label[for='secret']").style.display = "none";
  document.querySelector("label[for='generated-admin-key']").style.display = "block";
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
