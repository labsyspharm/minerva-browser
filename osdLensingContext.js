import * as lensing from 'lensing';
import * as OSD from "openseadragon";
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

class OsdLensingContext {

    // Class vars
    lensingContext = null;
    viewerContext = null;

    constructor(viewerContext, opts) {

        // Contexts
        this.hashstate = opts.hashstate;
        this.viewerContext = viewerContext;
        const isRendered = (n) => {
          return this.hashstate.isRendered(n);
        }
        const {
          lensingContext, lensing
        } = this.newContext(opts);
        this.lensing = lensing;
        this.tileSources = {};
        this.lensingContext = lensingContext;
        // Recenter Lens
        this.lensing.recenter();
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
      updateLensing(lensing, HS);
    }
}

const createLens = (viewer, hashstate) => {
  const config = {
    id: viewer.id,
    prefixUrl: viewer.prefixUrl,
    zoomInButton: viewer.zoomInButton.element.id,
    zoomOutButton: viewer.zoomOutButton.element.id,
    navigatorPosition: viewer.navigatorPosition,
    maxZoomPixelRatio: viewer.maxZoomPixelRatio,
    visibilityRatio: viewer.visibilityRatio,
    degrees: viewer.degrees,
  };
  const lensOptions = {
    config, hashstate 
  };
  return new OsdLensingContext(viewer, lensOptions);
}

export { createLens }
