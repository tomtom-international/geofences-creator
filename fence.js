function Fence(id, data, options) {
  tt.Evented.call(this);

  var defaultOptions = {
    style: {
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

Object.setPrototypeOf(Fence.prototype, tt.Evented.prototype);
Object.setPrototypeOf(Fence, tt.Evented);

Fence.prototype.addTo = function(map) {
  var style = this.options.style;

  map.addSource(this.id, {
    type: "geojson",
    data: this.data
  });

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

Fence.prototype.remove = function() {
  if (this._popup) {
    this.closePopup();
  }

  if (this._map) {
    this._map.removeLayer(this.id + "_line");
    this._map.removeLayer(this.id + "_fill");
    this._map.removeSource(this.id);
    this._map = null;
  }

  return this;
};

Fence.prototype.addData = function(data) {
  if (this._map) {
    var source = this._map.getSource(this.id);
    source.setData(data);
    this.data = data;
  }
};

Fence.prototype.handleClick = function(event) {
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

Fence.prototype.getPopup = function() {
  return this._popup;
};

Fence.prototype.bindPopup = function(content, popupOptions) {
  this._popup = new tt.Popup(popupOptions).setHTML(content);
  return this;
};

Fence.prototype.isPopupOpen = function() {
  return this._popup && this._popup.isOpen();
};

Fence.prototype.openPopup = function(lngLat) {
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

Fence.prototype.closePopup = function() {
  if (this._popup) {
    this._popup.remove();
    this.fire({
      type: "popupclose",
      popup: this._popup
    });
  }
  return this;
};

Fence.prototype.togglePopup = function() {
  if (this._popup && !this._popup.isOpen()) {
    this.openPopup();
  } else {
    this.closePopup();
  }
  return this;
};

Fence.prototype.setPopupContent = function(content) {
  this._popup && this._popup.setHTML(content);
  return this;
};
