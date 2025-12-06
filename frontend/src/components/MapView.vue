<template>
  <div>
    <v-navigation-drawer
      v-model="drawer"
      :rail="mini"
      :width="mini ? 72 : 320"
      :theme="drawerTheme"
      app
      style="z-index: 1000"
      permanent
    >
      <v-theme-provider :theme="isDarkTheme ? 'dark' : 'light'">
        <div class="side-panel">
        <div class="d-flex align-center justify-space-between mb-2">
          <v-btn icon="mdi-menu" variant="plain" size="small" @click.stop="mini = !mini" />
          <div class="text-caption font-weight-medium">Map Settings</div>
        </div>

        <v-switch
          density="compact"
          inset
          v-model="isDarkTheme"
          @change="toggleTheme"
          label="Dark mode"
          class="mb-1"
        ></v-switch>

        <v-slider
          density="compact"
          hide-details
          :min="0.5"
          :max="3"
          :step="0.1"
          thumb-label
          v-model="iconScale"
          class="mt-1"
        ></v-slider>
        <div class="caption" :class="isDarkTheme ? 'text-grey-lighten-1' : 'text-grey'">Icon size: {{ iconScaleLabel }}x</div>

        <v-list-subheader class="mt-3">View</v-list-subheader>
        <v-switch density="compact" inset v-model="showGridCoordinates" label="Grid coordinates"></v-switch>
        <v-switch density="compact" inset v-model="showMarkers" label="Markers"></v-switch>
        <v-switch density="compact" inset v-model="showThingwalls" label="Thingwalls"></v-switch>
        <v-switch density="compact" inset v-model="showThingwallTooltips" label="Thingwall tooltips"></v-switch>
        <v-switch density="compact" inset v-model="showQuests" label="Quest givers"></v-switch>
        <v-switch density="compact" inset v-model="showQuestTooltips" label="Quest tooltips"></v-switch>
        <v-switch density="compact" inset v-model="showPlayers" label="Players"></v-switch>
        <v-switch density="compact" inset v-model="showPlayerTooltips" label="Player names"></v-switch>

        <v-btn block class="mt-2" size="small" variant="tonal" @click="zoomOut">Zoom Out</v-btn>

        <v-list-subheader class="mt-4">Navigation</v-list-subheader>
        <v-select
          return-object
          variant="outlined"
          density="compact"
          item-title="Name"
          item-value="ID"
          :items="maps"
          v-model="selectedMap"
          label="Jump To Map"
        ></v-select>
        <v-select
          class="mt-2"
          return-object
          variant="outlined"
          density="compact"
          item-title="Name"
          item-value="ID"
          :items="maps"
          v-model="overlayMap"
          label="Overlay Map"
          clearable
        ></v-select>

        <v-list-subheader class="mt-4">Markers</v-list-subheader>
        <v-select
          return-object
          variant="outlined"
          density="compact"
          item-title="name"
          item-value="id"
          :items="otherMarks"
          v-model="selectedMarker"
          label="Jump to Marker"
        >
          <template #item="{ item }">
            <img class="mr-2" style="width:24px;height: 24px;" :src="item.image + '.png'"/>
            {{ item.name }}
          </template>
        </v-select>
        <v-select
          class="mt-2"
          return-object
          variant="outlined"
          density="compact"
          item-title="name"
          item-value="id"
          :items="thingMarks"
          v-model="selectedThing"
          label="Thingwalls"
        >
          <template #item="{ item }">
            <img class="mr-2" style="width:24px;height: 24px;" :src="item.image + '.png'"/>
            {{ item.name }}
          </template>
        </v-select>
        <v-select
          class="mt-2"
          return-object
          variant="outlined"
          density="compact"
          item-title="name"
          item-value="id"
          :items="questMarks"
          v-model="selectedQuest"
          label="Quest givers"
        >
          <template #item="{ item }">
            <img class="mr-2" style="width:24px;height: 24px;" :src="item.image + '.png'"/>
            {{ item.name }}
          </template>
        </v-select>
        <v-select
          class="mt-2"
          return-object
          variant="outlined"
          density="compact"
          item-title="name"
          item-value="id"
          :items="players"
          v-model="selectedPlayer"
          label="Players"
          clearable
        ></v-select>
        </div>
      </v-theme-provider>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <div ref="mapContainer" class="map"></div>
        <div class="control-panel card"></div>

        <ContextMenu ref="menu" v-slot="{ data }">
          <ul v-if="data">
            <li>
              <a @click.prevent="wipeTile(data)"
                >Wipe tile {{ data.coords.x }}, {{ data.coords.y }}</a
              >
            </li>
            <li>
              <a @click.prevent="queryCoordSet(data)"
                >Rewrite tile coords for {{ data.coords.x }},
                {{ data.coords.y }}</a
              >
            </li>
          </ul>
        </ContextMenu>

        <ContextMenu ref="markermenu" v-slot="{ data }">
          <ul v-if="data">
            <li>
              <a @click.prevent="hideMarker(data)"
                >Hide marker {{ data.name }}</a
              >
            </li>
          </ul>
        </ContextMenu>

        <v-dialog v-model="coordDialog" max-width="320">
          <v-card>
            <v-card-title>Rewrite tile coords</v-card-title>
            <v-card-text class="d-flex flex-column gap-2">
              <v-text-field
                v-model="coordSet.x"
                label="X"
                type="number"
                density="compact"
              ></v-text-field>
              <v-text-field
                v-model="coordSet.y"
                label="Y"
                type="number"
                density="compact"
              ></v-text-field>
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn variant="text" @click="coordDialog = false">Cancel</v-btn>
              <v-btn color="primary" variant="flat" @click="setCoords()"
                >Submit</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </div>
</template>

<script setup>
import {ref, reactive, computed, watch, onMounted, onBeforeUnmount, getCurrentInstance} from "vue";
import {useRoute, useRouter} from "vue-router";
import {
  GridCoordLayer,
  HnHCRS,
  HnHMaxZoom,
  HnHMinZoom,
  TileSize,
} from "../utils/leaflet-custom-types";
import { SmartTileLayer } from "../utils/smart-tile-layer";
import * as L from "leaflet";
import { API_ENDPOINT } from "../main";
import { Marker } from "../data/marker";
import { UniqueList } from "../data/unique-list";
import { Character } from "../data/character";
import ContextMenu from "./ContextMenu.vue";

const drawer = ref(true);
const mini = ref(false);
const isDarkTheme = ref(false);
const themeMedia = ref(null);
const themePreference = ref("auto");

const showGridCoordinates = ref(false);
const showMarkers = ref(false);
const showQuests = ref(false);
const showQuestTooltips = ref(false);
const showThingwalls = ref(true);
const showThingwallTooltips = ref(true);
const showPlayers = ref(true);
const showPlayerTooltips = ref(true);

const trackingCharacterId = ref(-1);
const autoMode = ref(false);

const otherMarks = ref([]);
const thingMarks = ref([]);
const questMarks = ref([]);
const players = ref([]);
const maps = ref([]);
const selectedMap = ref(null);
const selectedMarker = ref(null);
const selectedQuest = ref(null);
const selectedThing = ref(null);
const selectedPlayer = ref(null);
const overlayMap = ref(null);
const auths = ref([]);
const mapid = ref(0);
const coordSetFrom = reactive({ x: 0, y: 0 });
const coordSet = reactive({ x: 0, y: 0 });
const iconScale = ref(1);
const coordDialog = ref(false);

const mapContainer = ref(null);
const mapRef = ref(null);
const layerRef = ref(null);
const overlayLayerRef = ref(null);
const coordLayerRef = ref(null);
const markerLayerRef = ref(null);
const sourceRef = ref(null);
const markers = ref(new UniqueList());
const characters = ref(new UniqueList());
const intervalId = ref(null);

const router = useRouter();
const route = useRoute();
const { proxy } = getCurrentInstance();
const http = proxy.$http;

const menu = ref(null);
const markermenu = ref(null);

const iconScaleLabel = computed(() => iconScale.value.toFixed(1));
const drawerTheme = computed(() => (isDarkTheme.value ? "dark" : "light"));

function mapviewCtx() {
  return {
    map: mapRef.value,
    markerLayer: markerLayerRef.value,
    iconScale: iconScale.value,
  };
}

function currentOverlayMapId() {
  return overlayLayerRef.value ? overlayLayerRef.value.map : -1;
}

function shouldShowOnCurrentMaps(item) {
  const overlayId = currentOverlayMapId();
  return (
    item.map === mapid.value ||
    (overlayId !== -1 && item.map === overlayId)
  );
}

function renderMarks(listRef, enabled, tooltipState) {
  if (!mapRef.value) return;

  listRef.value.forEach((it) => it.remove(mapviewCtx()));
  if (!enabled) return;

  listRef.value
    .filter((it) => shouldShowOnCurrentMaps(it))
    .forEach((it) => {
      it.add(mapviewCtx());
      if (typeof tooltipState !== "undefined") {
        it.tooltip(tooltipState);
      }
    });
}

function renderCharacters(enabled) {
  if (!mapRef.value) return;

  characters.value.getElements().forEach((it) => it.remove({ map: mapRef.value }));
  if (!enabled) return;

  characters.value
    .getElements()
    .filter((it) => shouldShowOnCurrentMaps(it))
    .forEach((it) => {
      it.add({ map: mapRef.value });
      it.tooltip(showPlayerTooltips.value);
    });
}

function loadIconScale() {
  if (typeof localStorage === "undefined") return 1;
  const raw = localStorage.getItem("map_icon_scale");
  const parsed = parseFloat(raw);
  if (!isNaN(parsed) && isFinite(parsed)) {
    return Math.min(3, Math.max(0.5, parsed));
  }
  return 1;
}

function persistIconScale(value) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("map_icon_scale", value);
}

function loadThemePreference() {
  if (typeof localStorage === "undefined") return "auto";
  const pref = localStorage.getItem("map_theme_pref");
  if (pref === "dark" || pref === "light") return pref;
  return "auto";
}

function persistThemePreference(pref) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("map_theme_pref", pref);
}

function handleThemeChange(e) {
  if (themePreference.value === "auto") {
    isDarkTheme.value = e.matches;
  }
}

function toggleTheme() {
  themePreference.value = isDarkTheme.value ? "dark" : "light";
  persistThemePreference(themePreference.value);
}

function refreshMarkerIcons() {
  if (!mapRef.value || !overlayLayerRef.value) return;
  renderMarks(otherMarks, showMarkers.value);
  renderMarks(thingMarks, showThingwalls.value, showThingwallTooltips.value);
  renderMarks(questMarks, showQuests.value, showQuestTooltips.value);
}

function processConfig(config) {
  document.title = config.title;
  auths.value = config.auths;
}

function toLatLng(x, y) {
  return mapRef.value.unproject([x, y], HnHMaxZoom);
}

function zoomOut() {
  trackingCharacterId.value = -1;
  mapRef.value.setView([0, 0], HnHMinZoom);
}

function wipeTile(data) {
  http.get(`${API_ENDPOINT}/admin/wipeTile`, {
    params: { ...data.coords, map: mapid.value },
  });
}

function hideMarker(data) {
  http.get(`${API_ENDPOINT}/admin/hideMarker`, {
    params: { id: data.id },
  });
  markers.value.byId(data.id)?.remove(mapviewCtx());
}

function queryCoordSet(data) {
  coordSetFrom.x = data.coords.x;
  coordSetFrom.y = data.coords.y;
  coordDialog.value = true;
}

function setCoords() {
  http.get(`${API_ENDPOINT}/admin/setCoords`, {
    params: {
      map: mapid.value,
      fx: coordSetFrom.x,
      fy: coordSetFrom.y,
      tx: coordSet.x,
      ty: coordSet.y,
    },
  });
  coordDialog.value = false;
}

function changeMap(mapId) {
  if (mapId === mapid.value) return;
  mapid.value = mapId;
  layerRef.value.map = mapid.value;
  layerRef.value.redraw();
  overlayLayerRef.value.map = -1;
  overlayLayerRef.value.redraw();
  renderMarks(otherMarks, showMarkers.value);
  renderMarks(thingMarks, showThingwalls.value, showThingwallTooltips.value);
  renderMarks(questMarks, showQuests.value, showQuestTooltips.value);
  renderCharacters(showPlayers.value);
}

function updateMarkers(markersData) {
  markers.value.update(
    markersData.map((it) => {
      let m = new Marker(it);
      if (m.type === "thingwall") m.tstate = showThingwallTooltips.value;
      else if (m.type === "quest") m.tstate = showQuestTooltips.value;
      else m.tstate = false;
      return m;
    }),
    (marker) => {
      if (marker.map === mapid.value || marker.map === overlayLayerRef.value.map) {
        marker.add(mapviewCtx());
      }
      marker.setClickCallback(() => {
        mapRef.value.setView(marker.marker.getLatLng(), mapRef.value.getZoom());
      });
      marker.setContextMenu((mev) => {
        if (auths.value.includes("admin") || auths.value.includes("writer")) {
          markermenu.value?.open(mev.originalEvent, {
            name: marker.name,
            id: marker.id,
          });
        }
      });
    },
    (marker) => {
      marker.remove(mapviewCtx());
    },
    (marker, updated) => {
      marker.update(mapviewCtx(), updated);
    }
  );

  otherMarks.value.length = 0;
  thingMarks.value.length = 0;
  questMarks.value.length = 0;
  markers.value
    .getElements()
    .filter((it) => it.name != null && it.name.length > 0 && !it.hidden)
    .sort((a, b) => {
      let im = a.image.localeCompare(b.image);
      return im === 0 ? a.name.localeCompare(b.name) : im;
    })
    .forEach((it) => {
      if (it.type === "thingwall") thingMarks.value.push(it);
      else if (it.type === "quest") questMarks.value.push(it);
      else otherMarks.value.push(it);
    });
}

function updateCharacters(charactersData) {
  characters.value.update(
    charactersData.map((it) => {
      let ch = new Character(it);
      ch.tstate = showPlayerTooltips.value;
      return ch;
    }),
    (character) => {
      character.add({ map: mapRef.value });
      character.setClickCallback(() => {
        trackingCharacterId.value = character.id;
      });
    },
    (character) => {
      character.remove({ map: mapRef.value });
    },
    (character, updated) => {
      if (trackingCharacterId.value === updated.id) {
        if (mapid.value !== updated.map) {
          changeMap(updated.map);
        }
        let latlng = mapRef.value.unproject(
          [updated.position.x, updated.position.y],
          HnHMaxZoom
        );
        mapRef.value.setView(latlng, mapRef.value.getZoom());
      }
      character.update({ map: mapRef.value }, updated);
    }
  );
  players.value.length = 0;
  characters.value.getElements().forEach((it) => players.value.push(it));
}

function setupMap(charactersData, mapsData) {
  http.get(`${API_ENDPOINT}/config`).then(
    (response) => {
      processConfig(response.data);
    },
    () => {}
  );

  mapRef.value = L.map(mapContainer.value, {
    minZoom: HnHMinZoom,
    maxZoom: HnHMaxZoom,
    crs: HnHCRS,
    attributionControl: false,
    inertia: false,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  });

  for (let id in mapsData) {
    let m = mapsData[id];
    m.text = m.Name;
    m.value = m.ID;
    maps.value.push(m);
  }
  maps.value.sort((a, b) => {
    return a.size < b.size;
  });

  mapRef.value.on("drag", () => {
    let point = mapRef.value.project(mapRef.value.getCenter(), mapRef.value.getZoom());
    let coordinate = {
      x: ~~(point.x / TileSize),
      y: ~~(point.y / TileSize),
      z: mapRef.value.getZoom(),
    };
    router.replace({
      path: `/grid/${mapid.value}/${coordinate.x}/${coordinate.y}/${coordinate.z}`,
    });
    trackingCharacterId.value = -1;
  });
  mapRef.value.on("zoom", () => {
    if (autoMode.value) {
      autoMode.value = false;
    } else {
      let point = mapRef.value.project(mapRef.value.getCenter(), mapRef.value.getZoom());
      let coordinate = {
        x: Math.floor(point.x / TileSize),
        y: Math.floor(point.y / TileSize),
        z: mapRef.value.getZoom(),
      };
      router.replace({
        path: `/grid/${mapid.value}/${coordinate.x}/${coordinate.y}/${coordinate.z}`,
      });
      trackingCharacterId.value = -1;
    }
  });

  layerRef.value = new SmartTileLayer("grids/{map}/{z}/{x}_{y}.png?{cache}", {
    minZoom: HnHMinZoom,
    maxZoom: HnHMaxZoom,
    zoomOffset: 0,
    zoomReverse: true,
    tileSize: TileSize,
  });
  layerRef.value.invalidTile =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  layerRef.value.addTo(mapRef.value);

  overlayLayerRef.value = new SmartTileLayer("grids/{map}/{z}/{x}_{y}.png?{cache}", {
    minZoom: HnHMinZoom,
    maxZoom: HnHMaxZoom,
    zoomOffset: 0,
    zoomReverse: true,
    tileSize: TileSize,
    opacity: 0.6,
  });
  overlayLayerRef.value.invalidTile =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  overlayLayerRef.value.addTo(mapRef.value);

  coordLayerRef.value = new GridCoordLayer({ tileSize: TileSize, opacity: 0 });
  coordLayerRef.value.addTo(mapRef.value);

  markerLayerRef.value = L.layerGroup();
  markerLayerRef.value.addTo(mapRef.value);

  mapRef.value.on("contextmenu", (mev) => {
    if (auths.value.includes("admin") || auths.value.includes("writer")) {
      let point = mapRef.value.project(mev.latlng, mapRef.value.getZoom());
      let coords = {
        x: Math.floor(point.x / TileSize),
        y: Math.floor(point.y / TileSize),
      };
      menu.value?.open(mev.originalEvent, { coords });
    }
  });

  sourceRef.value = new EventSource("updates");
  sourceRef.value.onmessage = (event) => {
    var updates = JSON.parse(event.data);
    for (var update of updates) {
      var key = update["M"] + ":" + update["X"] + ":" + update["Y"] + ":" + update["Z"];
      layerRef.value.cache[key] = update["T"];
      if (layerRef.value.map === update["M"]) {
        layerRef.value.refresh(update["X"], update["Y"], update["Z"]);
      }
    }
  };

  sourceRef.value.addEventListener("merge", (e) => {
    var merge = JSON.parse(e.data);
    if (mapid.value === merge["From"]) {
      let mapTo = merge["To"];
      let point = mapRef.value.project(mapRef.value.getCenter(), mapRef.value.getZoom());
      let coordinate = {
        x: Math.floor(point.x / TileSize),
        y: Math.floor(point.y / TileSize),
        z: mapRef.value.getZoom(),
      };
      coordinate.x += merge["Shift"].x;
      coordinate.y += merge["Shift"].y;
      router.replace({
        path: `/grid/${mapTo}/${coordinate.x}/${coordinate.y}/${coordinate.z}`,
      });

      let latLng = toLatLng(coordinate.x * 100, coordinate.y * 100);

      changeMap(mapTo);
      http.get(`${API_ENDPOINT}/v1/markers`).then(
        (response) => {
          updateMarkers(response.data);
        },
        () => {}
      );
      mapRef.value.setView(latLng, mapRef.value.getZoom());
    }
  });

  updateCharacters(charactersData);

  if (route.params.characterId) {
    trackingCharacterId.value = +route.params.characterId;
  } else if (route.params.gridX && route.params.gridY && route.params.zoom) {
    let latLng = toLatLng(route.params.gridX * 100, route.params.gridY * 100);

    if (mapid.value !== route.params.map) {
      changeMap(route.params.map);
    }

    mapRef.value.setView(latLng, route.params.zoom);
  } else {
    if (maps.value.length > 0) {
      changeMap(maps.value[0].ID);
    }
    mapRef.value.setView([0, 0], HnHMinZoom);
  }

  intervalId.value = setInterval(() => {
    http.get(`${API_ENDPOINT}/v1/characters`).then(
      (response) => {
        updateCharacters(response.data);
      },
      () => {
        clearInterval(intervalId.value);
      }
    );
  }, 2000);

  http.get(`${API_ENDPOINT}/v1/markers`).then(
    (response) => {
      updateMarkers(response.data);
    },
    () => {}
  );
}

watch(showGridCoordinates, (value) => {
  if (coordLayerRef.value) {
    coordLayerRef.value.setOpacity(value ? 1 : 0);
  }
});

watch(showMarkers, (value) => {
  renderMarks(otherMarks, value);
});

watch(showThingwalls, (value) => {
  renderMarks(thingMarks, value, showThingwallTooltips.value);
});

watch(showQuests, (value) => {
  renderMarks(questMarks, value, showQuestTooltips.value);
});

watch(showPlayers, (value) => {
  renderCharacters(value);
});

watch(showThingwallTooltips, (value) => {
  thingMarks.value.forEach((it) => it.tooltip(value));
});

watch(showQuestTooltips, (value) => {
  questMarks.value.forEach((it) => it.tooltip(value));
});

watch(showPlayerTooltips, (value) => {
  characters.value.getElements().forEach((it) => it.tooltip(value));
});

watch(trackingCharacterId, (value) => {
  if (value !== -1) {
    let character = characters.value.byId(value);
    if (character) {
      changeMap(character.map);
      let latlng = mapRef.value.unproject(
        [character.position.x, character.position.y],
        HnHMaxZoom
      );
      mapRef.value.setView(
        latlng,
        HnHMaxZoom - Math.floor(HnHMaxZoom - HnHMinZoom) / 2
      );

      router.push({ path: `/character/${value}` });
      autoMode.value = true;
    } else {
      mapRef.value.setView([0, 0], HnHMinZoom);
      let mapTarget = maps.value[0].ID;
      router.replace({ path: `/grid/${mapTarget}/0/0/${HnHMinZoom}` });
      trackingCharacterId.value = -1;
    }
  }
});

watch(selectedMap, (value) => {
  if (value) {
    changeMap(value.ID);
    let zoom = mapRef.value.getZoom();
    mapRef.value.setView([0, 0], zoom);
    router.replace({
      path: `/grid/${mapid.value}/0/0/${zoom}`,
    });
  }
});

watch(overlayMap, (value) => {
  if (!overlayLayerRef.value) return;

  overlayLayerRef.value.map = value ? value.ID : -1;
  overlayLayerRef.value.redraw();

  renderMarks(otherMarks, showMarkers.value);
  renderMarks(thingMarks, showThingwalls.value, showThingwallTooltips.value);
  renderMarks(questMarks, showQuests.value, showQuestTooltips.value);
  renderCharacters(showPlayers.value);
});

watch(iconScale, (value) => {
  persistIconScale(value);
  refreshMarkerIcons();
});

watch(selectedQuest, (value) => {
  if (!value) return;
  let markerMapId = value.map;
  maps.value.forEach((mapItem) => {
    if (markerMapId === mapItem.ID) {
      selectedMap.value = mapItem;

      if (mapid.value !== mapItem.ID) changeMap(mapItem.ID);

      mapRef.value.setView(
        value.marker.getLatLng(),
        HnHMaxZoom - Math.floor(HnHMaxZoom - HnHMinZoom) / 2
      );
      trackingCharacterId.value = -1;
      return;
    }
  });
});

watch(selectedThing, (value) => {
  if (!value) return;
  let markerMapId = value.map;
  maps.value.forEach((mapItem) => {
    if (markerMapId === mapItem.ID) {
      selectedMap.value = mapItem;

      if (mapid.value !== mapItem.ID) changeMap(mapItem.ID);

      mapRef.value.setView(
        value.marker.getLatLng(),
        HnHMaxZoom - Math.floor(HnHMaxZoom - HnHMinZoom) / 2
      );
      trackingCharacterId.value = -1;
      return;
    }
  });
});

watch(selectedPlayer, (value) => {
  if (value && value.id) {
    trackingCharacterId.value = value.id;
  }
});

iconScale.value = loadIconScale();
themePreference.value = loadThemePreference();
if (typeof window !== "undefined" && window.matchMedia) {
  themeMedia.value = window.matchMedia("(prefers-color-scheme: dark)");
  if (themePreference.value === "auto") {
    isDarkTheme.value = themeMedia.value.matches;
  }
  themeMedia.value.addEventListener("change", handleThemeChange);
}

onMounted(() => {
  let chars = http.get(`${API_ENDPOINT}/v1/characters`);
  let mapsReq = http.get(`${API_ENDPOINT}/maps`);

  Promise.all([chars, mapsReq]).then(
    (values) => {
      setupMap(values[0].data, values[1].data);
    },
    () => {}
  );
});

onBeforeUnmount(() => {
  clearInterval(intervalId.value);
  if (themeMedia.value && themeMedia.value.removeEventListener) {
    themeMedia.value.removeEventListener("change", handleThemeChange);
  }
  if (sourceRef.value) {
    sourceRef.value.close();
  }
});
</script>

<style>
.container {
  max-width: 100%;
  padding: 0px !important;
}

.map {
  width: 100vw;
  height: 100vh;
}

.leaflet-container {
  background: #000;
}

.control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 600;
  float: right;
  background: rgba(0, 0, 0, 0.4);
}

.control-panel .toggle-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-check-input {
  margin: 0;
  margin-right: 15px;
}

.form-group {
  text-align: left;
}

.node { }

.side-panel {
  height: 100%;
  padding: 12px 10px;
  overflow-y: auto;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.short-btn {
  margin-bottom: 10px;
}

.short-btn:not(:last-child) {
  margin-bottom: 5px;
}

.overlay-map-input {
  margin-bottom: 20px;
}

.hidden {
  display: none;
}

.map-tile {
  height: 100px;
  width: 100px;
  border: 1px solid #00000033;
  background: url("../assets/winter/68_1.png");
}

.map-tile-text {
  text-align: center;
  display: none;
  color: black;
}

.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
  border: none !important;
}

.leaflet-popup-content-wrapper {
  background: transparent !important;
  box-shadow: none !important;
}

.leaflet-popup-content {
  font-size: 13px !important;
  color: #ffffff !important;
  text-shadow: -1px -1px #000, 1px 1px #000, -1px 1px #000, 1px -1px #000 !important;
  text-align: center !important;
}

.leaflet-popup-tip {
  display: none !important;
}

.hidden {
  display: none;
}
</style>
