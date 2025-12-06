import L, { Util, Browser } from "leaflet";

const mockTileCache: Record<string, string> = {};

const isDev = import.meta.env.MODE === "development";

function isDevMockEnabled() {
  return isDev && typeof window !== "undefined" && window.__HNH_MOCK_TILES__;
}

function mockTileDataUrl(map, x, y, z) {
  const key = `${map}:${x}:${y}:${z}`;
  if (mockTileCache[key]) {
    return mockTileCache[key];
  }
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");
  const hue = (map * 37 + x * 13 + y * 17 + z * 23) % 360;
  ctx.fillStyle = `hsl(${hue}, 45%, 75%)`;
  ctx.fillRect(0, 0, 100, 100);
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.strokeRect(0, 0, 100, 100);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.font = "10px sans-serif";
  ctx.fillText(`${map}:${z}`, 6, 14);
  ctx.fillText(`${x},${y}`, 6, 28);
  mockTileCache[key] = canvas.toDataURL("image/png");
  return mockTileCache[key];
}

export const SmartTileLayer = L.TileLayer.extend({
  cache: {},
  invalidTile: "",
  map: 0,

  getTileUrl: function (coords: L.Coords) {
    return this.getTrueTileUrl(coords, this._getZoomForUrl());
  },

  getTrueTileUrl: function (coords: L.Coords, zoom: number) {
    const data = {
      r: Browser.retina ? "@2x" : "",
      s: this._getSubdomain(coords),
      x: coords.x,
      y: coords.y,
      map: this.map,
      z: zoom,
    };
    if (this._map && !this._map.options.crs.infinite) {
      const invertedY = this._globalTileRange.max.y - coords.y;
      if (this.options.tms) {
        data["y"] = invertedY;
      }
      data["-y"] = invertedY;
    }

    data["cache"] =
      this.cache[data["map"] + ":" + data["x"] + ":" + data["y"] + ":" + data["z"]];

    if (isDevMockEnabled()) {
      return mockTileDataUrl(data["map"], data["x"], data["y"], data["z"]);
    }

    if (!data["cache"] || data["cache"] === -1) {
      return this.invalidTile;
    }

    return Util.template(this._url, Util.extend(data, this.options));
  },

  refresh: function (x, y, z) {
    let zoom = z;
    let maxZoom = this.options.maxZoom;
    let zoomReverse = this.options.zoomReverse;
    let zoomOffset = this.options.zoomOffset;

    if (zoomReverse) {
      zoom = maxZoom - zoom;
    }

    zoom = zoom + zoomOffset;

    let key = x + ":" + y + ":" + zoom;

    let tile = this._tiles[key];
    if (tile) {
      tile.el.src = this.getTrueTileUrl({ x: x, y: y }, z);
    }
  },
});
