{
  "patcher": {
    "fileversion": 1,
    "appversion": { "major": 8, "minor": 6, "revision": 0 },
    "classnamespace": "box",
    "rect": [100, 100, 600, 500],
    "bglocked": 0,
    "openinpresentation": 1,
    "default_fontsize": 12.0,
    "default_fontface": 0,
    "default_fontname": "Arial",
    "gridonopen": 1,
    "gridsize": [15.0, 15.0],
    "gridsnaponopen": 1,
    "objectsnaponopen": 1,
    "statusbarvisible": 2,
    "toolbarvisible": 1,
    "lefttoolbarpinned": 0,
    "toptoolbarpinned": 0,
    "righttoolbarpinned": 0,
    "bottomtoolbarpinned": 0,
    "toolbars_unpinned_last_save": 0,
    "tallnewobj": 0,
    "boxes": [
      {
        "box": {
          "id": "obj-1",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [20, 20, 350, 20],
          "text": "∞ HEADY BRIDGE :: Sacred Geometry Music Connection ∞",
          "fontface": 1,
          "fontsize": 14,
          "presentation": 1,
          "presentation_rect": [10, 10, 350, 22]
        }
      },
      {
        "box": {
          "id": "obj-node",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": ["", ""],
          "patching_rect": [20, 80, 250, 22],
          "text": "node.script heady-bridge.js"
        }
      },
      {
        "box": {
          "id": "obj-thisdevice",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "outlettype": [""],
          "patching_rect": [20, 50, 100, 22],
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "obj-route",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 10,
          "outlettype": ["", "", "", "", "", "", "", "", "", ""],
          "patching_rect": [20, 120, 550, 22],
          "text": "route status port clients transport set_tempo trigger_clip stop_clip fire_scene set_param"
        }
      },
      {
        "box": {
          "id": "obj-status-led",
          "maxclass": "led",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": ["int"],
          "patching_rect": [20, 160, 24, 24],
          "presentation": 1,
          "presentation_rect": [10, 40, 20, 20],
          "oncolor": [0.2, 0.8, 0.4, 1.0],
          "offcolor": [0.4, 0.1, 0.1, 1.0]
        }
      },
      {
        "box": {
          "id": "obj-status-text",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [50, 162, 100, 20],
          "text": "Status",
          "presentation": 1,
          "presentation_rect": [35, 40, 80, 20]
        }
      },
      {
        "box": {
          "id": "obj-port-text",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [150, 162, 100, 20],
          "text": "Port: 9876",
          "presentation": 1,
          "presentation_rect": [120, 40, 80, 20]
        }
      },
      {
        "box": {
          "id": "obj-clients-text",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [260, 162, 100, 20],
          "text": "Clients: 0",
          "presentation": 1,
          "presentation_rect": [210, 40, 80, 20]
        }
      },
      {
        "box": {
          "id": "obj-transport",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [20, 200, 150, 22],
          "text": "js heady-live-api.js transport"
        }
      },
      {
        "box": {
          "id": "obj-tempo-observer",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 3,
          "outlettype": ["", "", ""],
          "patching_rect": [20, 260, 180, 22],
          "text": "live.observer"
        }
      },
      {
        "box": {
          "id": "obj-tempo-path",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [""],
          "patching_rect": [20, 240, 250, 22],
          "text": "property tempo, path live_set"
        }
      },
      {
        "box": {
          "id": "obj-playing-observer",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 3,
          "outlettype": ["", "", ""],
          "patching_rect": [250, 260, 180, 22],
          "text": "live.observer"
        }
      },
      {
        "box": {
          "id": "obj-playing-path",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [""],
          "patching_rect": [250, 240, 300, 22],
          "text": "property is_playing, path live_set"
        }
      },
      {
        "box": {
          "id": "obj-loadbang",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "outlettype": ["bang"],
          "patching_rect": [20, 220, 60, 22],
          "text": "loadbang"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": ["obj-thisdevice", 0],
          "destination": ["obj-node", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-node", 0],
          "destination": ["obj-route", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-route", 0],
          "destination": ["obj-status-led", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-route", 3],
          "destination": ["obj-transport", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-loadbang", 0],
          "destination": ["obj-tempo-path", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-loadbang", 0],
          "destination": ["obj-playing-path", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-tempo-path", 0],
          "destination": ["obj-tempo-observer", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-playing-path", 0],
          "destination": ["obj-playing-observer", 0]
        }
      }
    ]
  }
}
