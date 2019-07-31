function Polygon(id, data, options) {
  tt.Evented.call(this);

  var defaultOptions = {
    style: {
      stroke: true,
      color: "#2FAAFF",
      opacity: 0.8,
      fillOpacity: 0.2,
      lineJoin: "round",
      lineCap: "round",
      weight: 3
    }
  };

  this.id = id;
  this.data = data;
  this.options = Object.assign({}, defaultOptions, options);

  this.handleClick = this.handleClick.bind(this);
}

Object.setPrototypeOf(Polygon.prototype, tt.Evented.prototype);
Object.setPrototypeOf(Polygon, tt.Evented);

Polygon.prototype.addTo = function(map) {
  var style = this.options.style;

  map.addSource(this.id, {
    type: "geojson",
    data: this.data
  });

  if (style.stroke) {
    map.addLayer({
      id: this.id + "_line",
      type: "line",
      source: this.id,
      layout: {
        "line-join": style.lineJoin,
        "line-cap": style.lineCap
      },
      paint: {
        "line-color": style.color,
        "line-opacity": style.opacity,
        "line-width": style.weight
      }
    });
  }

  map.addLayer({
    id: this.id + "_fill",
    type: "fill",
    source: this.id,
    layout: {},
    paint: {
      "fill-color": style.fillColor || style.color,
      "fill-opacity": style.fillOpacity
    }
  });

  map.on("click", this.id + "_fill", this.handleClick);

  this._map = map;

  return this;
};

Polygon.prototype.remove = function() {
  if (this._popup) {
    this.closePopup();
  }

  if (this._map) {
    this.options.style.stroke && this._map.removeLayer(this.id + "_line");
    this._map.removeLayer(this.id + "_fill");
    this._map.removeSource(this.id);
    this._map = null;
  }

  return this;
};

Polygon.prototype.addData = function(data) {
  if (this._map) {
    var source = this._map.getSource(this.id);
    source.setData(data);
    this.data = data;
  }
};

Polygon.prototype.handleClick = function(event) {
  if (this._popup) {
    this.openPopup(event.lngLat);
  }

  this.fire({
    type: "click",
    point: event.point,
    lngLat: event.lngLat,
    target: this
  });
};

Polygon.prototype.getPopup = function() {
  return this._popup;
};

Polygon.prototype.bindPopup = function(content, popupOptions) {
  this._popup = new tt.Popup(popupOptions).setHTML(content);
  return this;
};

Polygon.prototype.isPopupOpen = function() {
  return this._popup && this._popup.isOpen();
};

Polygon.prototype.openPopup = function(lngLat) {
  if (this._popup && this._map) {
    lngLat = lngLat || turf.centroid(this.data).geometry.coordinates;

    if (!this.isPopupOpen()) {
      this._popup.addTo(this._map);
    }

    this._popup.setLngLat(lngLat);

    this.fire({
      type: "popupopen",
      popup: this._popup
    });
  }
  return this;
};

Polygon.prototype.closePopup = function() {
  if (this._popup) {
    this._popup.remove();
    this.fire({
      type: "popupclose",
      popup: this._popup
    });
  }
  return this;
};

Polygon.prototype.togglePopup = function() {
  if (this._popup && !this._popup.isOpen()) {
    this.openPopup();
  } else {
    this.closePopup();
  }
  return this;
};

Polygon.prototype.setPopupContent = function(content) {
  this._popup && this._popup.setHTML(content);
  return this;
};
