import {build_page} from './main.js';
import OpenSeadragon from 'openseadragon';
import {OpenSeadragonScalebar} from './openseadragon-scalebar.js';
import {OpenSeadragonSvgOverlay} from './openseadragon-svg-overlay.js';
OpenSeadragonScalebar(OpenSeadragon);
OpenSeadragonSvgOverlay(OpenSeadragon);

export default {
  OpenSeadragon: OpenSeadragon,
  build_page: build_page
}
