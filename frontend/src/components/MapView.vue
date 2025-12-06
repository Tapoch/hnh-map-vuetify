<template>
  <div>
    <v-navigation-drawer
      v-model="drawer"
      :rail="mini"
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
        <div ref="map" class="map"></div>
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

<script>
import {
  GridCoordLayer,
  HnHCRS,
  HnHMaxZoom,
  HnHMinZoom,
  TileSize,
} from "../utils/LeafletCustomTypes";
import { SmartTileLayer } from "../utils/SmartTileLayer";
import * as L from "leaflet";
import { API_ENDPOINT } from "../main";
import { Marker } from "../data/Marker";
import { UniqueList } from "../data/UniqueList";
import { Character } from "../data/Character";
import ContextMenu from "./ContextMenu.vue";

export default {
  name: "MapView",
  components: {
    ContextMenu,
  },
    data: function () {
      return {
        drawer: true,
        mini: true,
        isDarkTheme: false,
      themeMedia: null,
      themePreference: "auto",
      showGridCoordinates: false,
      showMarkers: false,
      showQuests: false,
      showQuestTooltips: false,
      showThingwalls: true,
      showThingwallTooltips: true,
      showPlayers: true,
      showPlayerTooltips: true,
      expandControlPanel: true,

      trackingCharacterId: -1,
      autoMode: false,
      polling: null,
      zz: false,
      // markersCache: [],
      allMarks: [],
      otherMarks: [],
      marksCategories: [],
      thingMarks: [],
      questMarks: [],
      players: [],
      maps: [],
      selectedMap: null,
      selectedMarker: null,
      selectedQuest: null,
      selectedThing: null,
      selectedPlayer: null,
      overlayMap: null,
      auths: [],
      mapid: 0,
      coordSetFrom: { x: 0, y: 0 },
        coordSet: {
          x: 0,
          y: 0,
        },
        iconScale: 1,
        coordDialog: false,
      };
    },
  computed: {
    iconScaleLabel() {
      return this.iconScale.toFixed(1);
    },
    drawerTheme() {
      return this.isDarkTheme ? "dark" : "light";
    },
  },
  watch: {
    showGridCoordinates(value) {
      console.log("showGridCoordinates", value);
      if (value) {
        this.coordLayer.setOpacity(1);
      } else {
        this.coordLayer.setOpacity(0);
      }
    },
    showMarkers(value) {
      console.log("showMarkers", value);
      if (!value) {
        this.otherMarks.forEach((it) => it.remove(this));
      } else {
        this.otherMarks
          .filter(
            (it) => it.map === this.mapid || it.map === this.overlayLayer.map
          )
          .forEach((it) => it.add(this));
      }
    },
    showThingwalls(value) {
      console.log("showThingwalls", value);
      if (!value) {
        this.thingMarks.forEach((it) => it.remove(this));
      } else {
        this.thingMarks
          .filter(
            (it) => it.map === this.mapid || it.map === this.overlayLayer.map
          )
          .forEach((it) => {
            it.add(this);
            it.tooltip(this.showThingwallTooltips);
          });
      }
    },
    showQuests(value) {
      console.log("showQuests", value);
      if (!value) {
        this.questMarks.forEach((it) => it.remove(this));
      } else {
        this.questMarks
          .filter(
            (it) => it.map === this.mapid || it.map === this.overlayLayer.map
          )
          .forEach((it) => {
            it.add(this);
            it.tooltip(this.showQuestTooltips);
          });
      }
    },
    showPlayers(value) {
      console.log("showPlayers", value);
      if (!value) {
        this.characters.getElements().forEach((it) => it.remove(this));
      } else {
        this.characters
          .getElements()
          .filter(
            (it) => it.map === this.mapid || it.map === this.overlayLayer.map
          )
          .forEach((it) => {
            it.add(this);
            it.tooltip(this.showPlayers);
          });
      }
    },
    showThingwallTooltips(value) {
      console.log("showThingwallTooltips", value);
      this.thingMarks.forEach((it) => it.tooltip(value));
    },
    showQuestTooltips(value) {
      console.log("showQuestTooltips", value);
      this.questMarks.forEach((it) => it.tooltip(value));
    },
    showPlayerTooltips(value) {
      console.log("showPlayerTooltips", value);
      this.characters.getElements().forEach((it) => it.tooltip(value));
    },
    trackingCharacterId(value) {
      if (value !== -1) {
        let character = this.characters.byId(value);
        if (character) {
          this.changeMap(character.map);
          let latlng = this.map.unproject(
            [character.position.x, character.position.y],
            HnHMaxZoom
          );
          this.map.setView(
            latlng,
            HnHMaxZoom - Math.floor(HnHMaxZoom - HnHMinZoom) / 2
          );

          this.$router.push({ path: `/character/${value}` });
          this.autoMode = true;
        } else {
          this.map.setView([0, 0], HnHMinZoom);
          let mapid = this.maps[0].ID;
          this.$router.replace({ path: `/grid/${mapid}/0/0/${HnHMinZoom}` });
          this.trackingCharacterId = -1;
        }
      }
    },
    iconScale(value) {
      this.persistIconScale(value);
      this.refreshMarkerIcons();
    },
    selectedMap(value) {
      console.log("selectedMap", value);
      if (value) {
        this.changeMap(value.ID);
        let zoom = this.map.getZoom();
        this.map.setView([0, 0], zoom);

        this.$router.replace({ path: `/grid/${this.mapid}/0/0/${zoom}` });
        this.trackingCharacterId = -1;
      }
    },
    overlayMap(value) {
      console.log("overlayMap");
      if (value) {
        this.overlayLayer.map = value.ID;
        this.overlayLayer.redraw();
        if (this.showMarkers) {
          this.otherMarks.forEach((it) => it.remove(this));
          this.otherMarks
            .filter(
              (it) => it.map === this.mapid || it.map === this.overlayLayer.map
            )
            .forEach((it) => it.add(this));
        }
        if (this.showThingwalls) {
          this.thingMarks.forEach((it) => it.remove(this));
          this.thingMarks
            .filter(
              (it) => it.map === this.mapid || it.map === this.overlayLayer.map
            )
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showThingwallTooltips);
            });
        }
        if (this.showQuests) {
          this.questMarks.forEach((it) => it.remove(this));
          this.questMarks
            .filter(
              (it) => it.map === this.mapid || it.map === this.overlayLayer.map
            )
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showQuestTooltips);
            });
        }
        if (this.showPlayers) {
          this.characters.getElements().forEach((it) => it.remove(this));
          this.characters
            .getElements()
            .filter(
              (it) => it.map === this.mapid || it.map === this.overlayLayer.map
            )
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showPlayerTooltips);
            });
        }
      } else {
        this.overlayLayer.map = -1;
        this.overlayLayer.redraw();
        if (this.showMarkers) {
          this.otherMarks.forEach((it) => it.remove(this));
          this.otherMarks
            .filter((it) => it.map === this.mapid)
            .forEach((it) => it.add(this));
        }
        if (this.showThingwalls) {
          this.thingMarks.forEach((it) => it.remove(this));
          this.thingMarks
            .filter((it) => it.map === this.mapid)
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showThingwallTooltips);
            });
        }
        if (this.showQuests) {
          this.questMarks.forEach((it) => it.remove(this));
          this.questMarks
            .filter((it) => it.map === this.mapid)
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showPlayerTooltips);
            });
        }
        if (this.showPlayers) {
          this.characters.getElements().forEach((it) => it.remove(this));
          this.characters
            .getElements()
            .filter((it) => it.map === this.mapid)
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showPlayerTooltips);
            });
        }
      }
    },
    selectedMarker(value) {
      //selectedMap
      console.log("selectedMarker", value);
      if (value) {
        let markerMapId = value.map;

        this.maps.forEach((map) => {
          if (markerMapId === map.ID) {
            this.selectedMap = map;

            if (this.mapid !== map.ID) this.changeMap(map.ID);

            this.map.setView(
              value.marker.getLatLng(),
              HnHMaxZoom - Math.floor(HnHMaxZoom - HnHMinZoom) / 2
            );
            this.trackingCharacterId = -1;
            return;
          }
        });
      }
    },
    selectedQuest(value) {
      //selectedMap
      console.log("selectedQuest", value);
      if (value) {
        let markerMapId = value.map;

        this.maps.forEach((map) => {
          if (markerMapId === map.ID) {
            this.selectedMap = map;

            if (this.mapid !== map.ID) this.changeMap(map.ID);

            this.map.setView(
              value.marker.getLatLng(),
              HnHMaxZoom - Math.floor(HnHMaxZoom - HnHMinZoom) / 2
            );
            this.trackingCharacterId = -1;
            return;
          }
        });
      }
    },
    selectedThing(value) {
      //selectedMap
      console.log("selectedThing", value);
      if (value) {
        let markerMapId = value.map;

        this.maps.forEach((map) => {
          if (markerMapId === map.ID) {
            this.selectedMap = map;

            if (this.mapid !== map.ID) this.changeMap(map.ID);

            this.map.setView(
              value.marker.getLatLng(),
              HnHMaxZoom - Math.floor(HnHMaxZoom - HnHMinZoom) / 2
            );
            this.trackingCharacterId = -1;
            return;
          }
        });
      }
    },
    selectedPlayer(value) {
      if (value && value.id) {
        this.trackingCharacterId = value.id;
      }
    },
    overlayMap(value) {
      if (!value) {
        this.overlayLayer.map = -1;
        this.overlayLayer.redraw();
      }
    },
  },
  created() {
    this.iconScale = this.loadIconScale();
    this.themePreference = this.loadThemePreference();
    if (typeof window !== "undefined" && window.matchMedia) {
      this.themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
      if (this.themePreference === "auto") {
        this.isDarkTheme = this.themeMedia.matches;
      }
      this.themeMedia.addEventListener("change", this.handleThemeChange);
    }
  },
  mounted() {
    let chars = this.$http.get(`${API_ENDPOINT}/v1/characters`);
    let maps = this.$http.get(`${API_ENDPOINT}/maps`);

    Promise.all([chars, maps]).then(
      (values) => {
        this.setupMap(values[0].data, values[1].data);
      },
      () => this.$emit("error")
    );
  },
  beforeUnmount: function () {
    clearInterval(this.intervalId);
    if (this.themeMedia && this.themeMedia.removeEventListener) {
      this.themeMedia.removeEventListener("change", this.handleThemeChange);
    }
  },
  methods: {
    loadIconScale() {
      if (typeof localStorage === "undefined") {
        return 1;
      }
      const raw = localStorage.getItem("map_icon_scale");
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && isFinite(parsed)) {
        return Math.min(3, Math.max(0.5, parsed));
      }
      return 1;
    },
    persistIconScale(value) {
      if (typeof localStorage === "undefined") {
        return;
      }
      localStorage.setItem("map_icon_scale", value);
    },
    refreshMarkerIcons() {
      if (!this.map || !this.overlayLayer) {
        return;
      }
      const refreshList = (list, enabled, tooltip) => {
        list.forEach((it) => {
          if (it.marker) {
            it.remove(this);
          }
          if (
            enabled &&
            (it.map === this.mapid || it.map === this.overlayLayer.map)
          ) {
            it.add(this);
            if (tooltip !== undefined) {
              it.tooltip(tooltip);
            }
          }
        });
      };
      refreshList(this.otherMarks, this.showMarkers);
      refreshList(
        this.thingMarks,
        this.showThingwalls,
        this.showThingwallTooltips
      );
      refreshList(this.questMarks, this.showQuests, this.showQuestTooltips);
    },
    handleThemeChange(e) {
      if (this.themePreference === "auto") {
        this.isDarkTheme = e.matches;
      }
    },
    loadThemePreference() {
      if (typeof localStorage === "undefined") return "auto";
      const pref = localStorage.getItem("map_theme_pref");
      if (pref === "dark" || pref === "light") return pref;
      return "auto";
    },
    persistThemePreference(pref) {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem("map_theme_pref", pref);
    },
    toggleTheme() {
      this.themePreference = this.isDarkTheme ? "dark" : "light";
      this.persistThemePreference(this.themePreference);
    },
    setupMap(characters, maps) {
      this.$http.get(`${API_ENDPOINT}/config`).then(
        (response) => {
          this.processConfig(response.data);
        },
        () => this.$emit("error")
      );
      // Create map and layer
      this.map = L.map(this.$refs.map, {
        // Map setup
        minZoom: HnHMinZoom,
        maxZoom: HnHMaxZoom,
        crs: HnHCRS,

        // Disable all visuals
        attributionControl: false,
        inertia: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });

      for (let id in maps) {
        let map = maps[id];
        map.text = map.Name;
        map.value = map.ID;
        this.maps.push(map);
      }
      this.maps.sort((a, b) => {
        return a.size < b.size;
      });

      // Update url on manual drag, zoom
      this.map.on("drag", () => {
        let point = this.map.project(this.map.getCenter(), this.map.getZoom());
        let coordinate = {
          x: ~~(point.x / TileSize),
          y: ~~(point.y / TileSize),
          z: this.map.getZoom(),
        };
        this.$router.replace({
          path: `/grid/${this.mapid}/${coordinate.x}/${coordinate.y}/${coordinate.z}`,
        });
        this.trackingCharacterId = -1;
      });
      this.map.on("zoom", () => {
        if (this.autoMode) {
          this.autoMode = false;
        } else {
          let point = this.map.project(
            this.map.getCenter(),
            this.map.getZoom()
          );
          let coordinate = {
            x: Math.floor(point.x / TileSize),
            y: Math.floor(point.y / TileSize),
            z: this.map.getZoom(),
          };
          this.$router.replace({
            path: `/grid/${this.mapid}/${coordinate.x}/${coordinate.y}/${coordinate.z}`,
          });
          this.trackingCharacterId = -1;
        }
      });

      this.layer = new SmartTileLayer("grids/{map}/{z}/{x}_{y}.png?{cache}", {
        minZoom: HnHMinZoom,
        maxZoom: HnHMaxZoom,
        zoomOffset: 0,
        zoomReverse: true,
        tileSize: TileSize,
      });
      this.layer.invalidTile =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      this.layer.addTo(this.map);

      this.overlayLayer = new SmartTileLayer(
        "grids/{map}/{z}/{x}_{y}.png?{cache}",
        {
          minZoom: HnHMinZoom,
          maxZoom: HnHMaxZoom,
          zoomOffset: 0,
          zoomReverse: true,
          tileSize: TileSize,
          opacity: 0.6,
        }
      );
      this.overlayLayer.invalidTile =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      this.overlayLayer.addTo(this.map);

      this.coordLayer = new GridCoordLayer({ tileSize: TileSize, opacity: 0 });
      this.coordLayer.addTo(this.map);

      this.markerLayer = L.layerGroup();
      this.markerLayer.addTo(this.map);

      /*this.map.on('mousemove', (mev) => {
          coords = this.map.project(mev.latlng, this.map.getZoom());
      })*/

      this.map.on(
        "contextmenu",
        ((mev) => {
          if (this.auths.includes("admin") || this.auths.includes("writer")) {
            let point = this.map.project(mev.latlng, this.map.getZoom());
            let coords = {
              x: Math.floor(point.x / TileSize),
              y: Math.floor(point.y / TileSize),
            };
            this.$refs.menu.open(mev.originalEvent, { coords: coords });
          }
        }).bind(this)
      );

      this.source = new EventSource("updates");
      this.source.onmessage = function (event) {
        var updates = JSON.parse(event.data);
        for (var update of updates) {
          var key =
            update["M"] +
            ":" +
            update["X"] +
            ":" +
            update["Y"] +
            ":" +
            update["Z"];
          this.layer.cache[key] = update["T"];
          if (this.layer.map === update["M"]) {
            this.layer.refresh(update["X"], update["Y"], update["Z"]);
          }
        }
      }.bind(this);

      this.source.addEventListener(
        "merge",
        ((e) => {
          var merge = JSON.parse(e.data);
          if (this.mapid === merge["From"]) {
            let mapTo = merge["To"];
            let point = this.map.project(
              this.map.getCenter(),
              this.map.getZoom()
            );
            let coordinate = {
              x: Math.floor(point.x / TileSize),
              y: Math.floor(point.y / TileSize),
              z: this.map.getZoom(),
            };
            coordinate.x += merge["Shift"].x;
            coordinate.y += merge["Shift"].y;
            this.$router.replace({
              path: `/grid/${mapTo}/${coordinate.x}/${coordinate.y}/${coordinate.z}`,
            });

            let latLng = this.toLatLng(coordinate.x * 100, coordinate.y * 100);

            this.changeMap(mapTo);
            this.$http.get(`${API_ENDPOINT}/v1/markers`).then(
              (response) => {
                this.updateMarkers(response.data);
              },
              () => {
                this.$emit("error");
              }
            );
            this.map.setView(latLng, this.map.getZoom());
          }
        }).bind(this)
      );

      this.markers = new UniqueList();
      this.characters = new UniqueList();

      // Create markers
      this.updateCharacters(characters);

      // Check parameters
      if (this.$route.params.characterId) {
        // Navigate to character
        this.trackingCharacterId = +this.$route.params.characterId;
      } else if (
        this.$route.params.gridX &&
        this.$route.params.gridY &&
        this.$route.params.zoom
      ) {
        // Navigate to specific grid
        let latLng = this.toLatLng(
          this.$route.params.gridX * 100,
          this.$route.params.gridY * 100
        );

        if (this.mapid !== this.$route.params.map) {
          this.changeMap(this.$route.params.map);
        }

        this.map.setView(latLng, this.$route.params.zoom);
      } else {
        // Just show a map
        if (this.maps.length > 0) {
          this.changeMap(this.maps[0].ID);
        }
        this.map.setView([0, 0], HnHMinZoom);
      }

      this.intervalId = setInterval(() => {
        this.$http.get(`${API_ENDPOINT}/v1/characters`).then(
          (response) => {
            this.updateCharacters(response.data);
          },
          () => {
            clearInterval(this.intervalId);
            this.$emit("error");
          }
        );
      }, 2000);
      // Request markers
      this.$http.get(`${API_ENDPOINT}/v1/markers`).then(
        (response) => {
          this.updateMarkers(response.data);
        },
        () => {
          this.$emit("error");
        }
      );
    },
    updateMarkers(markersData) {
      this.markers.update(
        markersData.map((it) => {
          let m = new Marker(it);
          if (m.type === "thingwall") m.tstate = this.showThingwallTooltips;
          else if (m.type === "quest") m.tstate = this.showQuestTooltips;
          else m.tstate = false;
          return m;
        }),
        (marker) => {
          // Add
          if (
            marker.map === this.mapid ||
            marker.map === this.overlayLayer.map
          ) {
            marker.add(this);
          }
          marker.setClickCallback(() => {
            this.map.setView(marker.marker.getLatLng(), this.map.getZoom());
          });
          marker.setContextMenu((mev) => {
            if (this.auths.includes("admin") || this.auths.includes("writer")) {
              this.$refs.markermenu.open(mev.originalEvent, {
                name: marker.name,
                id: marker.id,
              });
            }
          });
        },
        (marker) => {
          // Remove
          marker.remove(this);
        },
        (marker, updated) => {
          // Update
          marker.update(this, updated);
        }
      );
      // this.markersCache.length = 0;
      // this.markers.getElements().forEach(it => this.markersCache.push(it));
      /*this.markersCache.sort((a, b) => {
        let im = a.image.localeCompare(b.image);
        return im === 0 ? a.name.localeCompare(b.name) : im;
      });*/

      this.allMarks.length = 0;
      this.otherMarks.length = 0;
      this.thingMarks.length = 0;
      this.questMarks.length = 0;
      this.markers
        .getElements()
        .filter((it) => it.name != null && it.name.length > 0 && !it.hidden)
        .sort((a, b) => {
          let im = a.image.localeCompare(b.image);
          return im === 0 ? a.name.localeCompare(b.name) : im;
        })
        .forEach((it) => {
          this.allMarks.push(it);
          if (it.type === "thingwall") this.thingMarks.push(it);
          else if (it.type === "quest") this.questMarks.push(it);
          else this.otherMarks.push(it);

          if (!this.marksCategories.includes(it.type))
            this.marksCategories.push(it.type);
        });
    },
    updateCharacters(charactersData) {
      this.characters.update(
        charactersData.map((it) => {
          let ch = new Character(it);
          ch.tstate = this.showPlayerTooltips;
          return ch;
        }),
        (character) => {
          // Add
          character.add(this);
          character.setClickCallback(() => {
            // Zoom to character on marker click
            this.trackingCharacterId = character.id;
          });
        },
        (character) => {
          // Remove
          character.remove(this);
        },
        (character, updated) => {
          // Update
          if (this.trackingCharacterId === updated.id) {
            if (this.mapid !== updated.map) {
              this.changeMap(updated.map);
            }
            let latlng = this.map.unproject(
              [updated.position.x, updated.position.y],
              HnHMaxZoom
            );
            this.map.setView(latlng, this.map.getZoom());
          }
          character.update(this, updated);
        }
      );
      this.players.length = 0;
      this.characters.getElements().forEach((it) => this.players.push(it));
    },
    processConfig(config) {
      document.title = config.title;
      this.auths = config.auths;
    },
    toLatLng(x, y) {
      return this.map.unproject([x, y], HnHMaxZoom);
    },
    zoomOut() {
      this.trackingCharacterId = -1;
      this.map.setView([0, 0], HnHMinZoom);
    },
    wipeTile(data) {
      this.$http.get(`${API_ENDPOINT}/admin/wipeTile`, {
        params: { ...data.coords, map: this.mapid },
      });
    },
    hideMarker(data) {
      this.$http.get(`${API_ENDPOINT}/admin/hideMarker`, {
        params: { id: data.id },
      });
      this.markers.byId(data.id).remove(this);
    },
    queryCoordSet(data) {
      this.coordSetFrom = data.coords;
      this.coordDialog = true;
    },
    setCoords() {
      this.$http.get(`${API_ENDPOINT}/admin/setCoords`, {
        params: {
          map: this.mapid,
          fx: this.coordSetFrom.x,
          fy: this.coordSetFrom.y,
          tx: this.coordSet.x,
          ty: this.coordSet.y,
        },
      });
      this.coordDialog = false;
    },
    changeMap(mapid) {
      if (mapid !== this.mapid) {
        this.mapid = mapid;
        this.layer.map = this.mapid;
        this.layer.redraw();
        this.overlayLayer.map = -1;
        this.overlayLayer.redraw();
        if (this.showMarkers) {
          this.otherMarks.forEach((it) => it.remove(this));
          this.otherMarks
            .filter((it) => it.map === this.mapid)
            .forEach((it) => {
              it.add(this);
              it.tooltip(false);
            });
        }
        if (this.showThingwalls) {
          this.thingMarks.forEach((it) => it.remove(this));
          this.thingMarks
            .filter((it) => it.map === this.mapid)
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showThingwallTooltips);
            });
        }
        if (this.showQuests) {
          this.questMarks.forEach((it) => it.remove(this));
          this.questMarks
            .filter((it) => it.map === this.mapid)
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showQuestTooltips);
            });
        }
        if (this.showPlayers) {
          this.characters.getElements().forEach((it) => it.remove(this));
          this.characters
            .getElements()
            .filter((it) => it.map === this.mapid)
            .forEach((it) => {
              it.add(this);
              it.tooltip(this.showPlayerTooltips);
            });
        }
      }
    },
  },
};
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

.leaflet-control {
  margin: auto !important;
}

.map-tile {
  border-bottom: 1px solid #404040;
  border-right: 1px solid #404040;
  color: #404040;
  font-size: 12px;
}

.map-tile-text {
  position: absolute;
  left: 2px;
  top: 2px;
  color: #fdb800;
  font-size: 10px;
  text-shadow: -1px -1px #000, 1px 1px #000, -1px 1px #000, 1px -1px #000;
}

.control-panel {
  position: absolute;
  top: 10%;
  left: 10px;
  z-index: 502;
}

.v-list-item {
  padding: 0px !important;
  min-height: 0px !important;
  margin-left: 0 !important;
  height: auto !important;
}

.v-btn {
  padding: 0px !important;
}

.short-btn {
  min-height: auto !important;
  height: auto !important;
  text-transform: none !important;
}

.v-list {
  padding: 5px !important;
  height: auto !important;
  min-height: 0px !important;
}

.v-navigation-drawer__content {
  padding: 0px !important;
}

.v-navigation-drawer {
  width: auto !important;
}

.v-text-field__details {
  min-height: 0px !important;
  margin: 0px !important;
}

.v-messages {
  min-height: 0px !important;
}

.v-list-item__content {
  padding: 0px !important;
}

.v-input__slot {
  padding: 0px 5px !important;
}

.leaflet-tooltip {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #fdb800 !important;
  font-size: 10px !important;
  text-shadow: -1px -1px #000, 1px 1px #000, -1px 1px #000, 1px -1px #000 !important;
}

.leaflet-tooltip-top:before,
.leaflet-tooltip-bottom:before,
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

.side-panel {
  height: 100%;
  padding: 12px 10px;
  overflow-y: auto;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
</style>
