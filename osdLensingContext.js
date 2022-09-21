import * as lensing from 'lensing';
import * as OSD from "openseadragon";
import { newMarkers } from "./osd"
import { getGetTileUrl } from "./state"
import LensingFilters from './osdLensingFilters';

const showGroup = (Group, group) => {
  return Group && Group == group.Name;
}

const updateLensing = (lensing, waypoint) => {
  const pxRatio = window.devicePixelRatio;
  const { Mag, Rad, Shape } = waypoint.Lensing || {};
  if (!("Lensing" in waypoint)) {
    lensing.configs.shape = '';
    lensing.configs.counterException = true;
    lensing.manageLensUpdate();
    return;
  }
  else {
    if (Shape == "square") {
      lensing.configs.shape = 'square';
    }
    else {
      lensing.configs.shape = 'circle';
    }
    lensing.configs.counterException = true;
    lensing.manageLensUpdate();
  }
  if (typeof Mag == "number") {
    lensing.configs.mag = Mag; 
    lensing.lenses.selections.magnifier.settings.active = Mag;
    lensing.configs.counterException = true;
    lensing.positionData.refPoint = lensing.positionData.eventPoint;
    lensing.positionData.zoom = lensing.viewer.viewport.getZoom(true);
    lensing.controls.updateReport();
    const zoomEvent = {eventType: 'zoom', immediately: true};
    lensing.viewerAux.raiseEvent('click', zoomEvent);
  }
  if (typeof Rad == "number") {
    lensing.configs.radDefault = Rad * pxRatio;
    lensing.configs.rad = Rad * pxRatio;
    lensing.configs.counterException = true;
    lensing.manageLensUpdate();
  }
}

export class OsdLensingContext {

    // Class vars
    lensingContext = null;
    viewerContext = null;

    constructor(viewerContext, opts) {

        // Contexts
        this.hashstate = opts.hashstate;
        this.viewerContext = viewerContext;
        const {
          lensingContext, lensing
        } = this.newContext(opts);
        this.lensing = lensing;
        this.lensingContext = lensingContext;
        this.initializeChannels();
        this.tileSources = {};
    }

    newContext(opts) {
        // LENSING - viewer
        const viewerConfigs = {
            immediateRender: true,
            maxZoomPixelRatio: 10,
            visibilityRatio: 0.9,
            showHomeControl: false,
            showFullPageControl: false,
            ...opts.config
        };
        const { waypoint } = this.hashstate;
        const lensingViewer = new lensing.construct(
            OSD,
            this.viewerContext.viewport.viewer,
            viewerConfigs,
            {},
            LensingFilters
        );
        updateLensing(lensingViewer, waypoint);
        return {
          lensing: lensingViewer,
          lensingContext: lensingViewer.viewerAux
        };
    }

    initializeChannels() {
      const { cgs, waypoint, grid } = this.hashstate;
      const image = (grid.pop() || []).pop();
      const lens = waypoint.Lensing || {};
      const viewer = this.lensingContext;
      const { Group } = lens;  
      const layer = [...cgs].forEach(layer => {
        layer.Format = 'jpg';
        viewer.addTiledImage({
          loadTilesWithAjax: false,
          tileSource: {
            height: image.Height,
            width:  image.Width,
            maxLevel: image.MaxLevel,
            crossOriginPolicy: 'anonymous',
            opacity: [0, 1][+showGroup(Group, layer)],
            tileWidth: image.TileSize.slice(0,1).pop(),
            tileHeight: image.TileSize.slice(0,2).pop(),
            getTileUrl: getGetTileUrl(image, layer) 
          },
          width: image.Width / image.Height,
          success: (data) => {
            const item = data.item;
            if (!(layer.Path in this.tileSources)) {
              this.tileSources[layer.Path] = [];
            }
            this.tileSources[layer.Path].push(item);
          }
        });
      });
      return viewer;
    }

    activateViewport() {
      const HS = this.hashstate;
      const { viewport } = this.lensingContext;
      viewport.panTo(HS.viewport.pan);
      viewport.zoomTo(HS.viewport.scale);
      viewport.applyConstraints(true);
    }

    newViewRedraw() {
      const lensing = this.lensing;
      const HS = this.hashstate;
      this.activateViewport();
      const lens = HS.waypoint.Lensing || {};
      const active_masks = []; // TODO: mask support
      const show_group = showGroup.bind(null, lens.Group);
      const group = HS.cgs.filter(show_group).pop() || {};
      newMarkers(this.tileSources, group, active_masks);
      updateLensing(lensing, HS.waypoint);
    }
}
