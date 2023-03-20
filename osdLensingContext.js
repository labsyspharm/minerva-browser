import * as lensing from 'lensing';
import * as OSD from "openseadragon";
import { newMarkers } from "./osd"
import { linkShaders } from "./channel"
import { getGetTileUrl } from "./state"
import LensingFilters from './osdLensingFilters';

const updateLensing = (lensing, HS) => {
  const pxRatio = window.devicePixelRatio;
  const { Mag, Rad, Shape, Group } = HS.lensing || {};
  const sameLens = HS.isActiveGroupName(Group).active;
  const radius = Rad ? Rad : 100;
  const noLens = !HS.lensing;
  if (noLens || sameLens) {
    lensing.configs.shape = '';
    lensing.configs.radDefault = 1;
    lensing.configs.rad = 1;
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
        this.tileSources = {};
        this.lensingContext = lensingContext;
        // Initialize Openseadragon
        this.initializeChannels((viewer) => {
          const { all_subgroups } = this.hashstate;
          const { updater } = linkShaders({
            viewer, subgroups: all_subgroups,
            tileSources: this.tileSources
          });
          this.hashstate.addColorListener('lens', updater);
        });
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
        const lensingViewer = new lensing.construct(
            OSD,
            this.viewerContext.viewport.viewer,
            viewerConfigs,
            {},
            LensingFilters
        );
        updateLensing(lensingViewer, this.hashstate);
        return {
          lensing: lensingViewer,
          lensingContext: lensingViewer.viewerAux
        };
    }

    initializeChannels(init) {
      const HS = this.hashstate;
      const { layers, grid } = HS;
      const image = (grid.pop() || []).pop();
      const viewer = this.lensingContext;
      const nTotal = layers.length;
      var nLoaded = 0;
      [...layers].forEach(layer => {
        layer.Format = 'jpg';
        viewer.addTiledImage({
          loadTilesWithAjax: false,
          compositeOperation: layer.Blend,
          crossOriginPolicy: 'anonymous',
          tileSource: {
            colorize: layer.Colorize,
            height: image.Height,
            width:  image.Width,
            name: layer.Name,
            maxLevel: image.MaxLevel,
            opacity: [0, 1][+HS.isLensName(layer.Name).active],
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
            nLoaded += 1;
            if (nLoaded == nTotal) init(viewer);
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
      const lens = HS.lensing || {};
      const active_masks = []; // TODO: mask support
      newMarkers(this.tileSources, HS.isLensPath.bind(HS));
      updateLensing(lensing, HS);
    }
}
