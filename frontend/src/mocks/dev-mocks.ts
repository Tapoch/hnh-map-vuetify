import { Server } from "miragejs";

function installEventSourceMock() {
  if ((window as any).__HNH_EVENT_SOURCE_INSTALLED__) {
    return;
  }
  (window as any).__HNH_EVENT_SOURCE_INSTALLED__ = true;
  (window as any).__HNH_MOCK_TILES__ = true;
  class MockEventSource {
    url: string;
    readyState: number;
    onmessage: ((event: MessageEvent<any>) => void) | null;
    listeners: Record<string, (e: MessageEvent<any>) => void>;
    interval: number | undefined;

    constructor(url: string) {
      this.url = url;
      this.readyState = 1;
      this.onmessage = null;
      this.listeners = {};
      const sendBatch = () => {
        const updates = [];
        for (let z = 0; z <= 2; z++) {
          for (let x = -2; x <= 2; x++) {
            for (let y = -2; y <= 2; y++) {
              updates.push({ M: 2, X: x, Y: y, Z: z, T: Date.now() });
            }
          }
        }
        const payload = JSON.stringify(updates);
        if (this.onmessage) {
          this.onmessage({ data: payload } as MessageEvent);
        }
      };
      sendBatch();
      this.interval = window.setInterval(sendBatch, 4000);
    }

    addEventListener(type: string, cb: (e: MessageEvent<any>) => void) {
      this.listeners[type] = cb;
    }

    close() {
      if (this.interval) {
        clearInterval(this.interval);
      }
      this.readyState = 2;
    }
  }

  window.EventSource = MockEventSource as any;
}

export function startDevMocks() {
  new Server({
    routes() {
      this.namespace = 'map/api';
      this.timing = 250;

      this.get("v1/characters", () => {
        return [
          { name: "Alice", id: 1, map: 2, position: { x: 0, y: 0 }, type: "player" },
          { name: "Bob", id: 2, map: 2, position: { x: 200, y: -150 }, type: "player" },
        ];
      });

      this.get("v1/markers", () => {
        return [
          {
            name: "Spawn",
            id: 150,
            map: 2,
            position: { x: 100, y: -100 },
            image: "gfx/terobjs/mm/custom",
            hidden: false
          },
          {
            name: "Thingwall",
            id: 160,
            map: 2,
            position: { x: -200, y: 50 },
            image: "gfx/terobjs/mm/thingwall",
            hidden: false
          }
        ];
      });

      this.get("maps", () => {
        return {
          "2": { ID: 2, Name: "MAIN", Hidden: false, Priority: true },
          "5": { ID: 5, Name: "LEVEL 2", Hidden: false, Priority: true }
        };
      });

      this.get("config", () => {
        return { title: "map (mock)", auths: ["map", "markers", "point", "g1", "g2", "g3", "g4", "g5", "upload", "writer", "admin"] };
      });
    }
  });

  installEventSourceMock();
}
