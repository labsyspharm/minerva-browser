window.$ = window.jQuery = require('jquery');
window.Popper = require('popper.js').default;
window.showdown = require('showdown');
require('bootstrap/dist/js/bootstrap');
require('bootstrap-select');

import {build_page} from './main.js';
import OpenSeadragon from 'openseadragon';
import {OpenSeadragonScalebar} from './openseadragon-scalebar.js';
import {OpenSeadragonSvgOverlay} from './openseadragon-svg-overlay.js';
OpenSeadragonScalebar(OpenSeadragon);
OpenSeadragonSvgOverlay(OpenSeadragon);
window.OpenSeadragon = OpenSeadragon;

export default {
  build_page: build_page
}
