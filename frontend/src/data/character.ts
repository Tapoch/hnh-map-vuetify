import * as L from "leaflet";
import { HnHMaxZoom } from "../utils/leaflet-custom-types";

export interface CharacterPosition {
  x: number;
  y: number;
}

export interface CharacterPayload {
  name: string;
  position: CharacterPosition;
  type: string;
  id: number;
  map: number;
}

export interface CharacterMapView {
  map: L.Map;
  mapid?: number;
}

export class Character {
  name: string;
  position: CharacterPosition;
  type: string;
  id: number;
  map: number;
  marker: L.Marker | null;
  text: string;
  value: number;
  onClick: ((e: L.LeafletMouseEvent) => void) | null;
  tstate: boolean;

  constructor(characterData: CharacterPayload) {
    this.name = characterData.name;
    this.position = characterData.position;
    this.type = characterData.type;
    this.id = characterData.id;
    this.map = characterData.map;
    this.marker = null;
    this.text = this.name;
    this.value = this.id;
    this.onClick = null;
    this.tstate = false;
  }

  getId() {
    return `${this.name}`;
  }

  remove(mapview: CharacterMapView) {
    if (this.marker) {
      this.marker.unbindTooltip();
      mapview.map.removeLayer(this.marker);
      this.marker.remove();
      this.marker = null;
    }
  }

  add(mapview: CharacterMapView) {
    if (this.map === mapview.mapid) {
      let position = mapview.map.unproject([this.position.x, this.position.y], HnHMaxZoom);
      this.marker = L.marker(position, { riseOnHover: true /*title: this.name*/ });
      (this.marker as any).marker = this;
      this.marker.bindPopup(this.name);
      this.marker.bindTooltip("<div style='color:#48fd00;'><b>" + this.name + "</b></div>", {
        permanent: true,
        direction: "top",
        sticky: true,
        opacity: 1,
        offset: [-13, 0],
      });
      this.marker.on("click", this.callCallback.bind(this));
      this.marker.addTo(mapview.map);
      this.unbindTooltip();
    }
  }

  update(mapview: CharacterMapView, updated: CharacterPayload) {
    if (this.map !== updated.map) {
      this.remove(mapview);
    }
    this.map = updated.map;
    this.position = updated.position;
    if (!this.marker && this.map === mapview.mapid) {
      this.add(mapview);
    }
    if (this.marker) {
      let position = mapview.map.unproject([updated.position.x, updated.position.y], HnHMaxZoom);
      this.marker.setLatLng(position);
    }
  }

  bindTooltip() {
    this.tstate = true;
    if (this.marker) {
      this.marker.openTooltip();
    }
  }

  unbindTooltip() {
    this.tstate = false;
    if (this.marker) {
      this.marker.closeTooltip();
    }
  }

  tooltip(value: boolean) {
    if (value) this.bindTooltip();
    else this.unbindTooltip();
  }

  setClickCallback(callback: (e: L.LeafletMouseEvent) => void) {
    this.onClick = callback;
  }

  callCallback(e: L.LeafletMouseEvent) {
    if (this.onClick != null) {
      this.onClick(e);
    }
  }
}
