import SimpleEventHandler from "./simpleEventHandler.js"
import { get_links_alias } from "./links_alias.js"
import { getAjaxHeaders } from "./state"
import { getGetTileUrl } from "./state"
import { HashState } from "./state"
import { Render } from './render'
import { RenderOSD } from './osd'
import * as d3 from "d3"

// Flatten an array of arrays
const flatten = function(items) {
  return items.reduce(function(flat, item) {
    return flat.concat(item);
  });
};

// Arange openseadragon tileSources in a grid on the page and initialize when done
const arrange_images = function(viewer, tileSources, hashstate, init) {

  // Channel groups and segmentation masks
  const cgs = hashstate.cgs;
  const masks = hashstate.masks;

  cgs.forEach(g => {
    g['Format'] = g['Format'] || 'jpg';
  });
  masks.forEach(m => {
    m['Format'] = m['Format'] || 'png';
  });
  const layers = cgs.concat(masks);

  const grid = hashstate.grid;

  const images = hashstate.images;

  // If only one image, set image name to the first image description
  const imageName = hashstate.el.getElementsByClassName('minerva-imageName')[0];
  imageName.innerText = images.length == 1
    ? images[0].Description
    : hashstate.exhibit.Name

  // Read the grid arangement from the configuration file
  const numRows = grid.length;
  const numColumns = grid[0].length;

  const nTotal = numRows * numColumns * layers.length;
  var nLoaded = 0;

  const spacingFraction = 0.05;
  const maxImageWidth = flatten(grid).reduce(function(max, img) {
    return Math.max(max, img.Width);
  }, 0);
  const maxImageHeight = flatten(grid).reduce(function(max, img) {
    return Math.max(max, img.Height);
  }, 0);

  const cellHeight = (1 + spacingFraction) / numRows - spacingFraction;
  const cellWidth = cellHeight * maxImageWidth / maxImageHeight;
  const aspect_ratio = (cellWidth * numColumns) / (cellHeight * numRows);

  // Iterate through the rows
  for (var yi = 0; yi < numRows; yi++) {
    const y = yi * (cellHeight + spacingFraction);
    // Iterate through the columns
    for (var xi = 0; xi < numColumns; xi++) {
      const image = grid[yi][xi];
      const displayHeight = (1 - (numRows-1) * spacingFraction) / numRows * image.Height / maxImageHeight;
      const displayWidth = displayHeight * image.Width / image.Height;
      const x = xi * (cellWidth + spacingFraction) + (cellWidth - displayWidth) / 2;
      // Iterate through the layers
      for (var j=0; j < layers.length; j++) {
        const layer = layers[j];
        getAjaxHeaders(hashstate, image).then(function(ajaxHeaders){
          const useAjax = (image.Provider == 'minerva' || image.Provider == 'minerva-public');
          // Add an openseadragon tiled image
          viewer.addTiledImage({
            loadTilesWithAjax: useAjax,
            crossOriginPolicy: 'anonymous',
            ajaxHeaders: ajaxHeaders,
            tileSource: {
              height: image.Height,
              width:  image.Width,
              maxLevel: image.MaxLevel,
              tileWidth: image.TileSize.slice(0,1).pop(),
              tileHeight: image.TileSize.slice(0,2).pop(),
              getTileUrl: getGetTileUrl(image, layer)
            },
            degrees: image.Rotation || 0,
            x: x,
            y: y,
            opacity: 0,
            width: displayWidth,
            //preload: true,
            success: function(data) {
              const item = data.item;
              if (!tileSources.hasOwnProperty(layer.Path)) {
                tileSources[layer.Path] = [];
              }
              tileSources[layer.Path].push(item);

              // Set preload flags of neighboring layers if in 3D mode
              if (hashstate.design.is3d) {
                const item_idx = viewer.world.getIndexOfItem(item);
                item.addHandler('fully-loaded-change', function(e){
                  const next_item = viewer.world.getItemAt(item_idx + 1);
                  const last_item = viewer.world.getItemAt(item_idx - 1);
                  if (next_item) {
                    next_item.setPreload(e.fullyLoaded);
                  }
                  if (last_item) {
                    last_item.setPreload(e.fullyLoaded);
                  }
                })
              }
              // Initialize hash state
              nLoaded += 1;
              if (nLoaded == nTotal) {
                init(aspect_ratio);
              }
            }
          });
        });
      }
      // Add the image title
      const titleElt = $('<p>');
      const title = image.Description;
      titleElt.addClass('minerva-overlay-title').text(title);
      viewer.addOverlay({
        element: titleElt[0],
        x: x + displayWidth / 2,
        y: y,
        placement: 'BOTTOM',
        checkResize: false
      });
    }
  }
};

let marker_data = [{"﻿String":"ARL13B","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=ARL13B&keywords=ARL13B"},{"﻿String":"ASMA","Alias":"A-SMA, a-SMA, alpha-SMA, α-SMA","Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=ACTA2&keywords=alpha,smooth,muscle,actin"},{"﻿String":"BANF1","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=BANF1&keywords=BANF1"},{"﻿String":"CD11B","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=ITGAM&keywords=CD11B"},{"﻿String":"CD14","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD14&keywords=CD14"},{"﻿String":"CD163","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD163&keywords=CD163"},{"﻿String":"CD19","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD19&keywords=CD19"},{"﻿String":"CD20","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=MS4A1&keywords=CD20"},{"﻿String":"CD21","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CR2&keywords=CD21"},{"﻿String":"CD3D","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD3D&keywords=CD3D"},{"﻿String":"CD4","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD4&keywords=CD4"},{"﻿String":"CD45","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=PTPRC&keywords=CD45"},{"﻿String":"CD45RB","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=PTPRC&keywords=CD45RB"},{"﻿String":"CD68","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD68&keywords=CD68"},{"﻿String":"CD8A","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD8A&keywords=CD8A"},{"﻿String":"FOXP3","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=FOXP3&keywords=FOXP3"},{"﻿String":"GFAP","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=GFAP&keywords=GFAP"},{"﻿String":"GTUBULIN","Alias":"gamma-tubulin","Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=TUBG1&keywords=gamma,tubulin"},{"﻿String":"IBA1","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=AIF1&keywords=IBA1"},{"﻿String":"KERATIN","Alias":"pan-cytokeratin, pan-keratin","Link":"https://www.genecards.org/Search/Keyword?queryString=KERATIN"},{"﻿String":"KI67","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=MKI67&keywords=KI67"},{"﻿String":"LAG3","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=LAG3&keywords=LAG3"},{"﻿String":"LAMINAC","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=LMNA&keywords=LAMIN,AC"},{"﻿String":"LAMINB","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=LMNB1&keywords=LAMINB"},{"﻿String":"PD-1","Alias":"PD1","Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=PDCD1&keywords=PD-1"},{"﻿String":"PD-L1","Alias":"PDL1","Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD274&keywords=PD-L1"},{"﻿String":"CD19","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD19&keywords=CD19"},{"﻿String":"CD14","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD14&keywords=CD11c"},{"﻿String":"CD56","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=NCAM1&keywords=CD56"},{"﻿String":"CD34","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD34&keywords=CD34"},{"﻿String":"CD44","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD44&keywords=CD34"},{"﻿String":"CD14","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD14&keywords=CD14"},{"﻿String":"CD33","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD33&keywords=CD33"},{"﻿String":"CD41","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=ITGA2B&keywords=CD41"},{"﻿String":"CD61","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=ITGB3&keywords=CD61"},{"﻿String":"CD62","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=SELP&keywords=CD62"},{"﻿String":"CD146","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=MCAM&keywords=CD146"},{"﻿String":"CD1d","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD1D&keywords=CD1d"},{"﻿String":"CD2","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD2&keywords=CD2"},{"﻿String":"CD5","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD5&keywords=cd5"},{"﻿String":"CD7","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD7&keywords=CD7"},{"﻿String":"CD9","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD9&keywords=CD9"},{"﻿String":"CD10","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=MME&keywords=CD10"},{"﻿String":"CD11A","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=ITGAL&keywords=CD11A"},{"﻿String":"CD70","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD70&keywords=CD70"},{"﻿String":"CD74","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=CD74&keywords=CD74"},{"﻿String":"CD103","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=ITGAE&keywords=CD103"},{"﻿String":"CD133","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=PROM1&keywords=CD133"},{"﻿String":"CD168","Alias":null,"Link":"https://www.genecards.org/cgi-bin/carddisp.pl?gene=HMMR&keywords=CD168"}];
let cell_type_data = [{"﻿String":"Natural Killer Cells","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/c%C3%A9lulas/natural-killer-cells"},{"﻿String":"B Cells","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/cells/b-cells"},{"﻿String":"Basophil","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/c%C3%A9lulas/basophils"},{"﻿String":"Helper T cell","Alias":"CD4+ T Cell","Link":"https://www.immunology.org/public-information/bitesized-immunology/células/cd4-t-cells"},{"﻿String":"Cytotoxic T Cell","Alias":"CD8+ T Cell","Link":"https://www.immunology.org/public-information/bitesized-immunology/c%C3%A9lulas/cd8-t-cells"},{"﻿String":"Dendritic Cell","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/cells/dendritic-cells"},{"﻿String":"Eosinophils","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/c%C3%A9lulas/eosinophils"},{"﻿String":"Macrophage","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/c%C3%A9lulas/macrophages"},{"﻿String":"Mast Cell","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/c%C3%A9lulas/mast-cells"},{"﻿String":"Neutrophil","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/cells/neutrophils"},{"﻿String":"Regulatory T Cell","Alias":"Treg","Link":"https://www.immunology.org/public-information/bitesized-immunology/células/regulatory-t-cells-tregs"},{"﻿String":"T follicular helper cell","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/cells/t-follicular-helper-cells"},{"﻿String":"bone marrow","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/%C3%B3rganos-y-tejidos/bone-marrow"},{"﻿String":"lymph node","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/organs-and-tissues/lymph-node"},{"﻿String":"complement system","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/sistemas-y-procesos/complement-system"},{"﻿String":"phagocytosis","Alias":null,"Link":"https://www.immunology.org/public-information/bitesized-immunology/systems-and-processes/phagocytosis"}];

const exhibitCSS = `
@import url("https://fonts.googleapis.com/css?family=Hind+Vadodara:500|Overpass:200,800");
.minerva-root { letter-spacing: 0.02em; margin: 0; font-family: Overpass, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; font-size: 0.9rem; font-weight: 400; line-height: 1.5; color: #eee; text-align: left; }

.minerva-root { /*!
 * Bootstrap v4.4.1 (https://getbootstrap.com/)
 * Copyright 2011-2019 The Bootstrap Authors
 * Copyright 2011-2019 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */ }
.minerva-root :root { --blue: #007bff; --indigo: #6610f2; --purple: #6f42c1; --pink: #e83e8c; --red: #dc3545; --orange: #fd7e14; --yellow: #ffc107; --green: #28a745; --teal: #20c997; --cyan: #17a2b8; --white: #fff; --gray: #6c757d; --gray-dark: #343a40; --primary: #007bff; --secondary: #6c757d; --success: #28a745; --info: #17a2b8; --warning: #ffc107; --danger: #dc3545; --light: #f8f9fa; --dark: #343a40; --breakpoint-xs: 0; --breakpoint-sm: 576px; --breakpoint-md: 768px; --breakpoint-lg: 992px; --breakpoint-xl: 1200px; --font-family-sans-serif: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; --font-family-monospace: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.minerva-root *, .minerva-root *::before, .minerva-root *::after { box-sizing: border-box; }
.minerva-root html { font-family: sans-serif; line-height: 1.15; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: rgba(0, 0, 0, 0); }
.minerva-root article, .minerva-root aside, .minerva-root figcaption, .minerva-root figure, .minerva-root footer, .minerva-root header, .minerva-root hgroup, .minerva-root main, .minerva-root nav, .minerva-root section { display: block; }
.minerva-root body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; font-size: 1rem; font-weight: 400; line-height: 1.5; color: #212529; text-align: left; background-color: #fff; }
.minerva-root [tabindex="-1"]:focus:not(:focus-visible) { outline: 0 !important; }
.minerva-root hr { box-sizing: content-box; height: 0; overflow: visible; }
.minerva-root h1, .minerva-root h2, .minerva-root h3, .minerva-root h4, .minerva-root h5, .minerva-root h6 { margin-top: 0; margin-bottom: 0.5rem; }
.minerva-root p { margin-top: 0; margin-bottom: 1rem; }
.minerva-root abbr[title], .minerva-root abbr[data-original-title] { text-decoration: underline; text-decoration: underline dotted; cursor: help; border-bottom: 0; text-decoration-skip-ink: none; }
.minerva-root address { margin-bottom: 1rem; font-style: normal; line-height: inherit; }
.minerva-root ol, .minerva-root ul, .minerva-root dl { margin-top: 0; margin-bottom: 1rem; }
.minerva-root ol ol, .minerva-root ul ul, .minerva-root ol ul, .minerva-root ul ol { margin-bottom: 0; }
.minerva-root dt { font-weight: 700; }
.minerva-root dd { margin-bottom: .5rem; margin-left: 0; }
.minerva-root blockquote { margin: 0 0 1rem; }
.minerva-root b, .minerva-root strong { font-weight: bolder; }
.minerva-root small { font-size: 80%; }
.minerva-root sub, .minerva-root sup { position: relative; font-size: 75%; line-height: 0; vertical-align: baseline; }
.minerva-root sub { bottom: -.25em; }
.minerva-root sup { top: -.5em; }
.minerva-root a { color: #007bff; text-decoration: none; background-color: transparent; }
.minerva-root a:hover { color: #0056b3; text-decoration: underline; }
.minerva-root a:not([href]) { color: inherit; text-decoration: none; }
.minerva-root a:not([href]):hover { color: inherit; text-decoration: none; }
.minerva-root pre, .minerva-root code, .minerva-root kbd, .minerva-root samp { font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 1em; }
.minerva-root pre { margin-top: 0; margin-bottom: 1rem; overflow: auto; }
.minerva-root figure { margin: 0 0 1rem; }
.minerva-root img { vertical-align: middle; border-style: none; }
.minerva-root svg { overflow: hidden; vertical-align: middle; }
.minerva-root table { border-collapse: collapse; }
.minerva-root caption { padding-top: 0.75rem; padding-bottom: 0.75rem; color: #6c757d; text-align: left; caption-side: bottom; }
.minerva-root th { text-align: inherit; }
.minerva-root label { display: inline-block; margin-bottom: 0.5rem; }
.minerva-root button { border-radius: 0; }
.minerva-root button:focus { outline: 1px dotted; outline: 5px auto -webkit-focus-ring-color; }
.minerva-root input, .minerva-root button, .minerva-root select, .minerva-root optgroup, .minerva-root textarea { margin: 0; font-family: inherit; font-size: inherit; line-height: inherit; }
.minerva-root button, .minerva-root input { overflow: visible; }
.minerva-root button, .minerva-root select { text-transform: none; }
.minerva-root select { word-wrap: normal; }
.minerva-root button, .minerva-root [type="button"], .minerva-root [type="reset"], .minerva-root [type="submit"] { -webkit-appearance: button; }
.minerva-root button:not(:disabled), .minerva-root [type="button"]:not(:disabled), .minerva-root [type="reset"]:not(:disabled), .minerva-root [type="submit"]:not(:disabled) { cursor: pointer; }
.minerva-root button::-moz-focus-inner, .minerva-root [type="button"]::-moz-focus-inner, .minerva-root [type="reset"]::-moz-focus-inner, .minerva-root [type="submit"]::-moz-focus-inner { padding: 0; border-style: none; }
.minerva-root input[type="radio"], .minerva-root input[type="checkbox"] { box-sizing: border-box; padding: 0; }
.minerva-root input[type="date"], .minerva-root input[type="time"], .minerva-root input[type="datetime-local"], .minerva-root input[type="month"] { -webkit-appearance: listbox; }
.minerva-root textarea { overflow: auto; resize: vertical; }
.minerva-root fieldset { min-width: 0; padding: 0; margin: 0; border: 0; }
.minerva-root legend { display: block; width: 100%; max-width: 100%; padding: 0; margin-bottom: .5rem; font-size: 1.5rem; line-height: inherit; color: inherit; white-space: normal; }
.minerva-root progress { vertical-align: baseline; }
.minerva-root [type="number"]::-webkit-inner-spin-button, .minerva-root [type="number"]::-webkit-outer-spin-button { height: auto; }
.minerva-root [type="search"] { outline-offset: -2px; -webkit-appearance: none; }
.minerva-root [type="search"]::-webkit-search-decoration { -webkit-appearance: none; }
.minerva-root ::-webkit-file-upload-button { font: inherit; -webkit-appearance: button; }
.minerva-root output { display: inline-block; }
.minerva-root summary { display: list-item; cursor: pointer; }
.minerva-root template { display: none; }
.minerva-root [hidden] { display: none !important; }
.minerva-root h1, .minerva-root h2, .minerva-root h3, .minerva-root h4, .minerva-root h5, .minerva-root h6, .minerva-root .h1, .minerva-root .h2, .minerva-root .h3, .minerva-root .h4, .minerva-root .h5, .minerva-root .h6 { margin-bottom: 0.5rem; font-weight: 500; line-height: 1.2; }
.minerva-root h1, .minerva-root .h1 { font-size: 2.5rem; }
.minerva-root h2, .minerva-root .h2 { font-size: 2rem; }
.minerva-root h3, .minerva-root .h3 { font-size: 1.75rem; }
.minerva-root h4, .minerva-root .h4 { font-size: 1.5rem; }
.minerva-root h5, .minerva-root .h5 { font-size: 1.25rem; }
.minerva-root h6, .minerva-root .h6 { font-size: 1rem; }
.minerva-root .lead { font-size: 1.25rem; font-weight: 300; }
.minerva-root .display-1 { font-size: 6rem; font-weight: 300; line-height: 1.2; }
.minerva-root .display-2 { font-size: 5.5rem; font-weight: 300; line-height: 1.2; }
.minerva-root .display-3 { font-size: 4.5rem; font-weight: 300; line-height: 1.2; }
.minerva-root .display-4 { font-size: 3.5rem; font-weight: 300; line-height: 1.2; }
.minerva-root hr { margin-top: 1rem; margin-bottom: 1rem; border: 0; border-top: 1px solid rgba(0, 0, 0, 0.1); }
.minerva-root small, .minerva-root .small { font-size: 80%; font-weight: 400; }
.minerva-root mark, .minerva-root .mark { padding: 0.2em; background-color: #fcf8e3; }
.minerva-root .list-unstyled { padding-left: 0; list-style: none; }
.minerva-root .list-inline { padding-left: 0; list-style: none; }
.minerva-root .list-inline-item { display: inline-block; }
.minerva-root .list-inline-item:not(:last-child) { margin-right: 0.5rem; }
.minerva-root .initialism { font-size: 90%; text-transform: uppercase; }
.minerva-root .blockquote { margin-bottom: 1rem; font-size: 1.25rem; }
.minerva-root .blockquote-footer { display: block; font-size: 80%; color: #6c757d; }
.minerva-root .img-fluid { max-width: 100%; height: auto; }
.minerva-root .img-thumbnail { padding: 0.25rem; background-color: #fff; border: 1px solid #dee2e6; border-radius: 0.25rem; max-width: 100%; height: auto; }
.minerva-root .figure { display: inline-block; }
.minerva-root .figure-img { margin-bottom: 0.5rem; line-height: 1; }
.minerva-root .figure-caption { font-size: 90%; color: #6c757d; }
.minerva-root code { font-size: 87.5%; color: #e83e8c; word-wrap: break-word; }
a > .minerva-root code { color: inherit; }
.minerva-root kbd { padding: 0.2rem 0.4rem; font-size: 87.5%; color: #fff; background-color: #212529; border-radius: 0.2rem; }
.minerva-root kbd kbd { padding: 0; font-size: 100%; font-weight: 700; }
.minerva-root pre { display: block; font-size: 87.5%; color: #212529; }
.minerva-root pre code { font-size: inherit; color: inherit; word-break: normal; }
.minerva-root .pre-scrollable { max-height: 340px; overflow-y: scroll; }
.minerva-root .container { width: 100%; padding-right: 15px; padding-left: 15px; margin-right: auto; margin-left: auto; }
@media (min-width: 576px) { .minerva-root .container { max-width: 540px; } }
@media (min-width: 768px) { .minerva-root .container { max-width: 720px; } }
@media (min-width: 992px) { .minerva-root .container { max-width: 960px; } }
@media (min-width: 1200px) { .minerva-root .container { max-width: 1140px; } }
.minerva-root .container-fluid, .minerva-root .container-sm, .minerva-root .container-md, .minerva-root .container-lg, .minerva-root .container-xl { width: 100%; padding-right: 15px; padding-left: 15px; margin-right: auto; margin-left: auto; }
@media (min-width: 576px) { .minerva-root .container, .minerva-root .container-sm { max-width: 540px; } }
@media (min-width: 768px) { .minerva-root .container, .minerva-root .container-sm, .minerva-root .container-md { max-width: 720px; } }
@media (min-width: 992px) { .minerva-root .container, .minerva-root .container-sm, .minerva-root .container-md, .minerva-root .container-lg { max-width: 960px; } }
@media (min-width: 1200px) { .minerva-root .container, .minerva-root .container-sm, .minerva-root .container-md, .minerva-root .container-lg, .minerva-root .container-xl { max-width: 1140px; } }
.minerva-root .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
.minerva-root .no-gutters { margin-right: 0; margin-left: 0; }
.minerva-root .no-gutters > .col, .minerva-root .no-gutters > [class*="col-"] { padding-right: 0; padding-left: 0; }
.minerva-root .col-1, .minerva-root .col-2, .minerva-root .col-3, .minerva-root .col-4, .minerva-root .col-5, .minerva-root .col-6, .minerva-root .col-7, .minerva-root .col-8, .minerva-root .col-9, .minerva-root .col-10, .minerva-root .col-11, .minerva-root .col-12, .minerva-root .col, .minerva-root .col-auto, .minerva-root .col-sm-1, .minerva-root .col-sm-2, .minerva-root .col-sm-3, .minerva-root .col-sm-4, .minerva-root .col-sm-5, .minerva-root .col-sm-6, .minerva-root .col-sm-7, .minerva-root .col-sm-8, .minerva-root .col-sm-9, .minerva-root .col-sm-10, .minerva-root .col-sm-11, .minerva-root .col-sm-12, .minerva-root .col-sm, .minerva-root .col-sm-auto, .minerva-root .col-md-1, .minerva-root .col-md-2, .minerva-root .col-md-3, .minerva-root .col-md-4, .minerva-root .col-md-5, .minerva-root .col-md-6, .minerva-root .col-md-7, .minerva-root .col-md-8, .minerva-root .col-md-9, .minerva-root .col-md-10, .minerva-root .col-md-11, .minerva-root .col-md-12, .minerva-root .col-md, .minerva-root .col-md-auto, .minerva-root .col-lg-1, .minerva-root .col-lg-2, .minerva-root .col-lg-3, .minerva-root .col-lg-4, .minerva-root .col-lg-5, .minerva-root .col-lg-6, .minerva-root .col-lg-7, .minerva-root .col-lg-8, .minerva-root .col-lg-9, .minerva-root .col-lg-10, .minerva-root .col-lg-11, .minerva-root .col-lg-12, .minerva-root .col-lg, .minerva-root .col-lg-auto, .minerva-root .col-xl-1, .minerva-root .col-xl-2, .minerva-root .col-xl-3, .minerva-root .col-xl-4, .minerva-root .col-xl-5, .minerva-root .col-xl-6, .minerva-root .col-xl-7, .minerva-root .col-xl-8, .minerva-root .col-xl-9, .minerva-root .col-xl-10, .minerva-root .col-xl-11, .minerva-root .col-xl-12, .minerva-root .col-xl, .minerva-root .col-xl-auto { position: relative; width: 100%; padding-right: 15px; padding-left: 15px; }
.minerva-root .col { flex-basis: 0; flex-grow: 1; max-width: 100%; }
.minerva-root .row-cols-1 > * { flex: 0 0 100%; max-width: 100%; }
.minerva-root .row-cols-2 > * { flex: 0 0 50%; max-width: 50%; }
.minerva-root .row-cols-3 > * { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
.minerva-root .row-cols-4 > * { flex: 0 0 25%; max-width: 25%; }
.minerva-root .row-cols-5 > * { flex: 0 0 20%; max-width: 20%; }
.minerva-root .row-cols-6 > * { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
.minerva-root .col-auto { flex: 0 0 auto; width: auto; max-width: 100%; }
.minerva-root .col-1 { flex: 0 0 8.3333333333%; max-width: 8.3333333333%; }
.minerva-root .col-2 { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
.minerva-root .col-3 { flex: 0 0 25%; max-width: 25%; }
.minerva-root .col-4 { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
.minerva-root .col-5 { flex: 0 0 41.6666666667%; max-width: 41.6666666667%; }
.minerva-root .col-6 { flex: 0 0 50%; max-width: 50%; }
.minerva-root .col-7 { flex: 0 0 58.3333333333%; max-width: 58.3333333333%; }
.minerva-root .col-8 { flex: 0 0 66.6666666667%; max-width: 66.6666666667%; }
.minerva-root .col-9 { flex: 0 0 75%; max-width: 75%; }
.minerva-root .col-10 { flex: 0 0 83.3333333333%; max-width: 83.3333333333%; }
.minerva-root .col-11 { flex: 0 0 91.6666666667%; max-width: 91.6666666667%; }
.minerva-root .col-12 { flex: 0 0 100%; max-width: 100%; }
.minerva-root .order-first { order: -1; }
.minerva-root .order-last { order: 13; }
.minerva-root .order-0 { order: 0; }
.minerva-root .order-1 { order: 1; }
.minerva-root .order-2 { order: 2; }
.minerva-root .order-3 { order: 3; }
.minerva-root .order-4 { order: 4; }
.minerva-root .order-5 { order: 5; }
.minerva-root .order-6 { order: 6; }
.minerva-root .order-7 { order: 7; }
.minerva-root .order-8 { order: 8; }
.minerva-root .order-9 { order: 9; }
.minerva-root .order-10 { order: 10; }
.minerva-root .order-11 { order: 11; }
.minerva-root .order-12 { order: 12; }
.minerva-root .offset-1 { margin-left: 8.3333333333%; }
.minerva-root .offset-2 { margin-left: 16.6666666667%; }
.minerva-root .offset-3 { margin-left: 25%; }
.minerva-root .offset-4 { margin-left: 33.3333333333%; }
.minerva-root .offset-5 { margin-left: 41.6666666667%; }
.minerva-root .offset-6 { margin-left: 50%; }
.minerva-root .offset-7 { margin-left: 58.3333333333%; }
.minerva-root .offset-8 { margin-left: 66.6666666667%; }
.minerva-root .offset-9 { margin-left: 75%; }
.minerva-root .offset-10 { margin-left: 83.3333333333%; }
.minerva-root .offset-11 { margin-left: 91.6666666667%; }
@media (min-width: 576px) { .minerva-root .col-sm { flex-basis: 0; flex-grow: 1; max-width: 100%; }
  .minerva-root .row-cols-sm-1 > * { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .row-cols-sm-2 > * { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .row-cols-sm-3 > * { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .row-cols-sm-4 > * { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .row-cols-sm-5 > * { flex: 0 0 20%; max-width: 20%; }
  .minerva-root .row-cols-sm-6 > * { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-sm-auto { flex: 0 0 auto; width: auto; max-width: 100%; }
  .minerva-root .col-sm-1 { flex: 0 0 8.3333333333%; max-width: 8.3333333333%; }
  .minerva-root .col-sm-2 { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-sm-3 { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .col-sm-4 { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .col-sm-5 { flex: 0 0 41.6666666667%; max-width: 41.6666666667%; }
  .minerva-root .col-sm-6 { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .col-sm-7 { flex: 0 0 58.3333333333%; max-width: 58.3333333333%; }
  .minerva-root .col-sm-8 { flex: 0 0 66.6666666667%; max-width: 66.6666666667%; }
  .minerva-root .col-sm-9 { flex: 0 0 75%; max-width: 75%; }
  .minerva-root .col-sm-10 { flex: 0 0 83.3333333333%; max-width: 83.3333333333%; }
  .minerva-root .col-sm-11 { flex: 0 0 91.6666666667%; max-width: 91.6666666667%; }
  .minerva-root .col-sm-12 { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .order-sm-first { order: -1; }
  .minerva-root .order-sm-last { order: 13; }
  .minerva-root .order-sm-0 { order: 0; }
  .minerva-root .order-sm-1 { order: 1; }
  .minerva-root .order-sm-2 { order: 2; }
  .minerva-root .order-sm-3 { order: 3; }
  .minerva-root .order-sm-4 { order: 4; }
  .minerva-root .order-sm-5 { order: 5; }
  .minerva-root .order-sm-6 { order: 6; }
  .minerva-root .order-sm-7 { order: 7; }
  .minerva-root .order-sm-8 { order: 8; }
  .minerva-root .order-sm-9 { order: 9; }
  .minerva-root .order-sm-10 { order: 10; }
  .minerva-root .order-sm-11 { order: 11; }
  .minerva-root .order-sm-12 { order: 12; }
  .minerva-root .offset-sm-0 { margin-left: 0; }
  .minerva-root .offset-sm-1 { margin-left: 8.3333333333%; }
  .minerva-root .offset-sm-2 { margin-left: 16.6666666667%; }
  .minerva-root .offset-sm-3 { margin-left: 25%; }
  .minerva-root .offset-sm-4 { margin-left: 33.3333333333%; }
  .minerva-root .offset-sm-5 { margin-left: 41.6666666667%; }
  .minerva-root .offset-sm-6 { margin-left: 50%; }
  .minerva-root .offset-sm-7 { margin-left: 58.3333333333%; }
  .minerva-root .offset-sm-8 { margin-left: 66.6666666667%; }
  .minerva-root .offset-sm-9 { margin-left: 75%; }
  .minerva-root .offset-sm-10 { margin-left: 83.3333333333%; }
  .minerva-root .offset-sm-11 { margin-left: 91.6666666667%; } }
@media (min-width: 768px) { .minerva-root .col-md { flex-basis: 0; flex-grow: 1; max-width: 100%; }
  .minerva-root .row-cols-md-1 > * { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .row-cols-md-2 > * { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .row-cols-md-3 > * { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .row-cols-md-4 > * { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .row-cols-md-5 > * { flex: 0 0 20%; max-width: 20%; }
  .minerva-root .row-cols-md-6 > * { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-md-auto { flex: 0 0 auto; width: auto; max-width: 100%; }
  .minerva-root .col-md-1 { flex: 0 0 8.3333333333%; max-width: 8.3333333333%; }
  .minerva-root .col-md-2 { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-md-3 { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .col-md-4 { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .col-md-5 { flex: 0 0 41.6666666667%; max-width: 41.6666666667%; }
  .minerva-root .col-md-6 { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .col-md-7 { flex: 0 0 58.3333333333%; max-width: 58.3333333333%; }
  .minerva-root .col-md-8 { flex: 0 0 66.6666666667%; max-width: 66.6666666667%; }
  .minerva-root .col-md-9 { flex: 0 0 75%; max-width: 75%; }
  .minerva-root .col-md-10 { flex: 0 0 83.3333333333%; max-width: 83.3333333333%; }
  .minerva-root .col-md-11 { flex: 0 0 91.6666666667%; max-width: 91.6666666667%; }
  .minerva-root .col-md-12 { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .order-md-first { order: -1; }
  .minerva-root .order-md-last { order: 13; }
  .minerva-root .order-md-0 { order: 0; }
  .minerva-root .order-md-1 { order: 1; }
  .minerva-root .order-md-2 { order: 2; }
  .minerva-root .order-md-3 { order: 3; }
  .minerva-root .order-md-4 { order: 4; }
  .minerva-root .order-md-5 { order: 5; }
  .minerva-root .order-md-6 { order: 6; }
  .minerva-root .order-md-7 { order: 7; }
  .minerva-root .order-md-8 { order: 8; }
  .minerva-root .order-md-9 { order: 9; }
  .minerva-root .order-md-10 { order: 10; }
  .minerva-root .order-md-11 { order: 11; }
  .minerva-root .order-md-12 { order: 12; }
  .minerva-root .offset-md-0 { margin-left: 0; }
  .minerva-root .offset-md-1 { margin-left: 8.3333333333%; }
  .minerva-root .offset-md-2 { margin-left: 16.6666666667%; }
  .minerva-root .offset-md-3 { margin-left: 25%; }
  .minerva-root .offset-md-4 { margin-left: 33.3333333333%; }
  .minerva-root .offset-md-5 { margin-left: 41.6666666667%; }
  .minerva-root .offset-md-6 { margin-left: 50%; }
  .minerva-root .offset-md-7 { margin-left: 58.3333333333%; }
  .minerva-root .offset-md-8 { margin-left: 66.6666666667%; }
  .minerva-root .offset-md-9 { margin-left: 75%; }
  .minerva-root .offset-md-10 { margin-left: 83.3333333333%; }
  .minerva-root .offset-md-11 { margin-left: 91.6666666667%; } }
@media (min-width: 992px) { .minerva-root .col-lg { flex-basis: 0; flex-grow: 1; max-width: 100%; }
  .minerva-root .row-cols-lg-1 > * { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .row-cols-lg-2 > * { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .row-cols-lg-3 > * { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .row-cols-lg-4 > * { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .row-cols-lg-5 > * { flex: 0 0 20%; max-width: 20%; }
  .minerva-root .row-cols-lg-6 > * { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-lg-auto { flex: 0 0 auto; width: auto; max-width: 100%; }
  .minerva-root .col-lg-1 { flex: 0 0 8.3333333333%; max-width: 8.3333333333%; }
  .minerva-root .col-lg-2 { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-lg-3 { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .col-lg-4 { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .col-lg-5 { flex: 0 0 41.6666666667%; max-width: 41.6666666667%; }
  .minerva-root .col-lg-6 { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .col-lg-7 { flex: 0 0 58.3333333333%; max-width: 58.3333333333%; }
  .minerva-root .col-lg-8 { flex: 0 0 66.6666666667%; max-width: 66.6666666667%; }
  .minerva-root .col-lg-9 { flex: 0 0 75%; max-width: 75%; }
  .minerva-root .col-lg-10 { flex: 0 0 83.3333333333%; max-width: 83.3333333333%; }
  .minerva-root .col-lg-11 { flex: 0 0 91.6666666667%; max-width: 91.6666666667%; }
  .minerva-root .col-lg-12 { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .order-lg-first { order: -1; }
  .minerva-root .order-lg-last { order: 13; }
  .minerva-root .order-lg-0 { order: 0; }
  .minerva-root .order-lg-1 { order: 1; }
  .minerva-root .order-lg-2 { order: 2; }
  .minerva-root .order-lg-3 { order: 3; }
  .minerva-root .order-lg-4 { order: 4; }
  .minerva-root .order-lg-5 { order: 5; }
  .minerva-root .order-lg-6 { order: 6; }
  .minerva-root .order-lg-7 { order: 7; }
  .minerva-root .order-lg-8 { order: 8; }
  .minerva-root .order-lg-9 { order: 9; }
  .minerva-root .order-lg-10 { order: 10; }
  .minerva-root .order-lg-11 { order: 11; }
  .minerva-root .order-lg-12 { order: 12; }
  .minerva-root .offset-lg-0 { margin-left: 0; }
  .minerva-root .offset-lg-1 { margin-left: 8.3333333333%; }
  .minerva-root .offset-lg-2 { margin-left: 16.6666666667%; }
  .minerva-root .offset-lg-3 { margin-left: 25%; }
  .minerva-root .offset-lg-4 { margin-left: 33.3333333333%; }
  .minerva-root .offset-lg-5 { margin-left: 41.6666666667%; }
  .minerva-root .offset-lg-6 { margin-left: 50%; }
  .minerva-root .offset-lg-7 { margin-left: 58.3333333333%; }
  .minerva-root .offset-lg-8 { margin-left: 66.6666666667%; }
  .minerva-root .offset-lg-9 { margin-left: 75%; }
  .minerva-root .offset-lg-10 { margin-left: 83.3333333333%; }
  .minerva-root .offset-lg-11 { margin-left: 91.6666666667%; } }
@media (min-width: 1200px) { .minerva-root .col-xl { flex-basis: 0; flex-grow: 1; max-width: 100%; }
  .minerva-root .row-cols-xl-1 > * { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .row-cols-xl-2 > * { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .row-cols-xl-3 > * { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .row-cols-xl-4 > * { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .row-cols-xl-5 > * { flex: 0 0 20%; max-width: 20%; }
  .minerva-root .row-cols-xl-6 > * { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-xl-auto { flex: 0 0 auto; width: auto; max-width: 100%; }
  .minerva-root .col-xl-1 { flex: 0 0 8.3333333333%; max-width: 8.3333333333%; }
  .minerva-root .col-xl-2 { flex: 0 0 16.6666666667%; max-width: 16.6666666667%; }
  .minerva-root .col-xl-3 { flex: 0 0 25%; max-width: 25%; }
  .minerva-root .col-xl-4 { flex: 0 0 33.3333333333%; max-width: 33.3333333333%; }
  .minerva-root .col-xl-5 { flex: 0 0 41.6666666667%; max-width: 41.6666666667%; }
  .minerva-root .col-xl-6 { flex: 0 0 50%; max-width: 50%; }
  .minerva-root .col-xl-7 { flex: 0 0 58.3333333333%; max-width: 58.3333333333%; }
  .minerva-root .col-xl-8 { flex: 0 0 66.6666666667%; max-width: 66.6666666667%; }
  .minerva-root .col-xl-9 { flex: 0 0 75%; max-width: 75%; }
  .minerva-root .col-xl-10 { flex: 0 0 83.3333333333%; max-width: 83.3333333333%; }
  .minerva-root .col-xl-11 { flex: 0 0 91.6666666667%; max-width: 91.6666666667%; }
  .minerva-root .col-xl-12 { flex: 0 0 100%; max-width: 100%; }
  .minerva-root .order-xl-first { order: -1; }
  .minerva-root .order-xl-last { order: 13; }
  .minerva-root .order-xl-0 { order: 0; }
  .minerva-root .order-xl-1 { order: 1; }
  .minerva-root .order-xl-2 { order: 2; }
  .minerva-root .order-xl-3 { order: 3; }
  .minerva-root .order-xl-4 { order: 4; }
  .minerva-root .order-xl-5 { order: 5; }
  .minerva-root .order-xl-6 { order: 6; }
  .minerva-root .order-xl-7 { order: 7; }
  .minerva-root .order-xl-8 { order: 8; }
  .minerva-root .order-xl-9 { order: 9; }
  .minerva-root .order-xl-10 { order: 10; }
  .minerva-root .order-xl-11 { order: 11; }
  .minerva-root .order-xl-12 { order: 12; }
  .minerva-root .offset-xl-0 { margin-left: 0; }
  .minerva-root .offset-xl-1 { margin-left: 8.3333333333%; }
  .minerva-root .offset-xl-2 { margin-left: 16.6666666667%; }
  .minerva-root .offset-xl-3 { margin-left: 25%; }
  .minerva-root .offset-xl-4 { margin-left: 33.3333333333%; }
  .minerva-root .offset-xl-5 { margin-left: 41.6666666667%; }
  .minerva-root .offset-xl-6 { margin-left: 50%; }
  .minerva-root .offset-xl-7 { margin-left: 58.3333333333%; }
  .minerva-root .offset-xl-8 { margin-left: 66.6666666667%; }
  .minerva-root .offset-xl-9 { margin-left: 75%; }
  .minerva-root .offset-xl-10 { margin-left: 83.3333333333%; }
  .minerva-root .offset-xl-11 { margin-left: 91.6666666667%; } }
.minerva-root .table { width: 100%; margin-bottom: 1rem; color: #212529; }
.minerva-root .table th, .minerva-root .table td { padding: 0.75rem; vertical-align: top; border-top: 1px solid #dee2e6; }
.minerva-root .table thead th { vertical-align: bottom; border-bottom: 2px solid #dee2e6; }
.minerva-root .table tbody + tbody { border-top: 2px solid #dee2e6; }
.minerva-root .table-sm th, .minerva-root .table-sm td { padding: 0.3rem; }
.minerva-root .table-bordered { border: 1px solid #dee2e6; }
.minerva-root .table-bordered th, .minerva-root .table-bordered td { border: 1px solid #dee2e6; }
.minerva-root .table-bordered thead th, .minerva-root .table-bordered thead td { border-bottom-width: 2px; }
.minerva-root .table-borderless th, .minerva-root .table-borderless td, .minerva-root .table-borderless thead th, .minerva-root .table-borderless tbody + tbody { border: 0; }
.minerva-root .table-striped tbody tr:nth-of-type(odd) { background-color: rgba(0, 0, 0, 0.05); }
.minerva-root .table-hover tbody tr:hover { color: #212529; background-color: rgba(0, 0, 0, 0.075); }
.minerva-root .table-primary, .minerva-root .table-primary > th, .minerva-root .table-primary > td { background-color: #b8daff; }
.minerva-root .table-primary th, .minerva-root .table-primary td, .minerva-root .table-primary thead th, .minerva-root .table-primary tbody + tbody { border-color: #7abaff; }
.minerva-root .table-hover .table-primary:hover { background-color: #9fcdff; }
.minerva-root .table-hover .table-primary:hover > td, .minerva-root .table-hover .table-primary:hover > th { background-color: #9fcdff; }
.minerva-root .table-secondary, .minerva-root .table-secondary > th, .minerva-root .table-secondary > td { background-color: #d6d8db; }
.minerva-root .table-secondary th, .minerva-root .table-secondary td, .minerva-root .table-secondary thead th, .minerva-root .table-secondary tbody + tbody { border-color: #b3b7bb; }
.minerva-root .table-hover .table-secondary:hover { background-color: #c8cbcf; }
.minerva-root .table-hover .table-secondary:hover > td, .minerva-root .table-hover .table-secondary:hover > th { background-color: #c8cbcf; }
.minerva-root .table-success, .minerva-root .table-success > th, .minerva-root .table-success > td { background-color: #c3e6cb; }
.minerva-root .table-success th, .minerva-root .table-success td, .minerva-root .table-success thead th, .minerva-root .table-success tbody + tbody { border-color: #8fd19e; }
.minerva-root .table-hover .table-success:hover { background-color: #b1dfbb; }
.minerva-root .table-hover .table-success:hover > td, .minerva-root .table-hover .table-success:hover > th { background-color: #b1dfbb; }
.minerva-root .table-info, .minerva-root .table-info > th, .minerva-root .table-info > td { background-color: #bee5eb; }
.minerva-root .table-info th, .minerva-root .table-info td, .minerva-root .table-info thead th, .minerva-root .table-info tbody + tbody { border-color: #86cfda; }
.minerva-root .table-hover .table-info:hover { background-color: #abdde5; }
.minerva-root .table-hover .table-info:hover > td, .minerva-root .table-hover .table-info:hover > th { background-color: #abdde5; }
.minerva-root .table-warning, .minerva-root .table-warning > th, .minerva-root .table-warning > td { background-color: #ffeeba; }
.minerva-root .table-warning th, .minerva-root .table-warning td, .minerva-root .table-warning thead th, .minerva-root .table-warning tbody + tbody { border-color: #ffdf7e; }
.minerva-root .table-hover .table-warning:hover { background-color: #ffe8a1; }
.minerva-root .table-hover .table-warning:hover > td, .minerva-root .table-hover .table-warning:hover > th { background-color: #ffe8a1; }
.minerva-root .table-danger, .minerva-root .table-danger > th, .minerva-root .table-danger > td { background-color: #f5c6cb; }
.minerva-root .table-danger th, .minerva-root .table-danger td, .minerva-root .table-danger thead th, .minerva-root .table-danger tbody + tbody { border-color: #ed969e; }
.minerva-root .table-hover .table-danger:hover { background-color: #f1b0b7; }
.minerva-root .table-hover .table-danger:hover > td, .minerva-root .table-hover .table-danger:hover > th { background-color: #f1b0b7; }
.minerva-root .table-light, .minerva-root .table-light > th, .minerva-root .table-light > td { background-color: #fdfdfe; }
.minerva-root .table-light th, .minerva-root .table-light td, .minerva-root .table-light thead th, .minerva-root .table-light tbody + tbody { border-color: #fbfcfc; }
.minerva-root .table-hover .table-light:hover { background-color: #ececf6; }
.minerva-root .table-hover .table-light:hover > td, .minerva-root .table-hover .table-light:hover > th { background-color: #ececf6; }
.minerva-root .table-dark, .minerva-root .table-dark > th, .minerva-root .table-dark > td { background-color: #c6c8ca; }
.minerva-root .table-dark th, .minerva-root .table-dark td, .minerva-root .table-dark thead th, .minerva-root .table-dark tbody + tbody { border-color: #95999c; }
.minerva-root .table-hover .table-dark:hover { background-color: #b9bbbe; }
.minerva-root .table-hover .table-dark:hover > td, .minerva-root .table-hover .table-dark:hover > th { background-color: #b9bbbe; }
.minerva-root .table-active, .minerva-root .table-active > th, .minerva-root .table-active > td { background-color: rgba(0, 0, 0, 0.075); }
.minerva-root .table-hover .table-active:hover { background-color: rgba(0, 0, 0, 0.075); }
.minerva-root .table-hover .table-active:hover > td, .minerva-root .table-hover .table-active:hover > th { background-color: rgba(0, 0, 0, 0.075); }
.minerva-root .table .thead-dark th { color: #fff; background-color: #343a40; border-color: #454d55; }
.minerva-root .table .thead-light th { color: #495057; background-color: #e9ecef; border-color: #dee2e6; }
.minerva-root .table-dark { color: #fff; background-color: #343a40; }
.minerva-root .table-dark th, .minerva-root .table-dark td, .minerva-root .table-dark thead th { border-color: #454d55; }
.minerva-root .table-dark.table-bordered { border: 0; }
.minerva-root .table-dark.table-striped tbody tr:nth-of-type(odd) { background-color: rgba(255, 255, 255, 0.05); }
.minerva-root .table-dark.table-hover tbody tr:hover { color: #fff; background-color: rgba(255, 255, 255, 0.075); }
@media (max-width: 575.98px) { .minerva-root .table-responsive-sm { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .minerva-root .table-responsive-sm > .table-bordered { border: 0; } }
@media (max-width: 767.98px) { .minerva-root .table-responsive-md { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .minerva-root .table-responsive-md > .table-bordered { border: 0; } }
@media (max-width: 991.98px) { .minerva-root .table-responsive-lg { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .minerva-root .table-responsive-lg > .table-bordered { border: 0; } }
@media (max-width: 1199.98px) { .minerva-root .table-responsive-xl { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .minerva-root .table-responsive-xl > .table-bordered { border: 0; } }
.minerva-root .table-responsive { display: block; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.minerva-root .table-responsive > .table-bordered { border: 0; }
.minerva-root .form-control { display: block; width: 100%; height: calc(1.5em + 0.75rem + 2px); padding: 0.375rem 0.75rem; font-size: 1rem; font-weight: 400; line-height: 1.5; color: #495057; background-color: #fff; background-clip: padding-box; border: 1px solid #ced4da; border-radius: 0.25rem; transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; }
@media (prefers-reduced-motion: reduce) { .minerva-root .form-control { transition: none; } }
.minerva-root .form-control::-ms-expand { background-color: transparent; border: 0; }
.minerva-root .form-control:-moz-focusring { color: transparent; text-shadow: 0 0 0 #495057; }
.minerva-root .form-control:focus { color: #495057; background-color: #fff; border-color: #80bdff; outline: 0; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .form-control::placeholder { color: #6c757d; opacity: 1; }
.minerva-root .form-control:disabled, .minerva-root .form-control[readonly] { background-color: #e9ecef; opacity: 1; }
.minerva-root select.form-control:focus::-ms-value { color: #495057; background-color: #fff; }
.minerva-root .form-control-file, .minerva-root .form-control-range { display: block; width: 100%; }
.minerva-root .col-form-label { padding-top: calc(0.375rem + 1px); padding-bottom: calc(0.375rem + 1px); margin-bottom: 0; font-size: inherit; line-height: 1.5; }
.minerva-root .col-form-label-lg { padding-top: calc(0.5rem + 1px); padding-bottom: calc(0.5rem + 1px); font-size: 1.25rem; line-height: 1.5; }
.minerva-root .col-form-label-sm { padding-top: calc(0.25rem + 1px); padding-bottom: calc(0.25rem + 1px); font-size: 0.875rem; line-height: 1.5; }
.minerva-root .form-control-plaintext { display: block; width: 100%; padding: 0.375rem 0; margin-bottom: 0; font-size: 1rem; line-height: 1.5; color: #212529; background-color: transparent; border: solid transparent; border-width: 1px 0; }
.minerva-root .form-control-plaintext.form-control-sm, .minerva-root .form-control-plaintext.form-control-lg { padding-right: 0; padding-left: 0; }
.minerva-root .form-control-sm { height: calc(1.5em + 0.5rem + 2px); padding: 0.25rem 0.5rem; font-size: 0.875rem; line-height: 1.5; border-radius: 0.2rem; }
.minerva-root .form-control-lg { height: calc(1.5em + 1rem + 2px); padding: 0.5rem 1rem; font-size: 1.25rem; line-height: 1.5; border-radius: 0.3rem; }
.minerva-root select.form-control[size], .minerva-root select.form-control[multiple] { height: auto; }
.minerva-root textarea.form-control { height: auto; }
.minerva-root .form-group { margin-bottom: 1rem; }
.minerva-root .form-text { display: block; margin-top: 0.25rem; }
.minerva-root .form-row { display: flex; flex-wrap: wrap; margin-right: -5px; margin-left: -5px; }
.minerva-root .form-row > .col, .minerva-root .form-row > [class*="col-"] { padding-right: 5px; padding-left: 5px; }
.minerva-root .form-check { position: relative; display: block; padding-left: 1.25rem; }
.minerva-root .form-check-input { position: absolute; margin-top: 0.3rem; margin-left: -1.25rem; }
.minerva-root .form-check-input[disabled] ~ .form-check-label, .minerva-root .form-check-input:disabled ~ .form-check-label { color: #6c757d; }
.minerva-root .form-check-label { margin-bottom: 0; }
.minerva-root .form-check-inline { display: inline-flex; align-items: center; padding-left: 0; margin-right: 0.75rem; }
.minerva-root .form-check-inline .form-check-input { position: static; margin-top: 0; margin-right: 0.3125rem; margin-left: 0; }
.minerva-root .valid-feedback { display: none; width: 100%; margin-top: 0.25rem; font-size: 80%; color: #28a745; }
.minerva-root .valid-tooltip { position: absolute; top: 100%; z-index: 5; display: none; max-width: 100%; padding: 0.25rem 0.5rem; margin-top: .1rem; font-size: 0.875rem; line-height: 1.5; color: #fff; background-color: rgba(40, 167, 69, 0.9); border-radius: 0.25rem; }
.was-validated .minerva-root:valid ~ .valid-feedback, .was-validated .minerva-root:valid ~ .valid-tooltip, .minerva-root.is-valid ~ .valid-feedback, .minerva-root.is-valid ~ .valid-tooltip { display: block; }
.was-validated .minerva-root .form-control:valid, .minerva-root .form-control.is-valid { border-color: #28a745; padding-right: calc(1.5em + 0.75rem); background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right calc(0.375em + 0.1875rem) center; background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem); }
.was-validated .minerva-root .form-control:valid:focus, .minerva-root .form-control.is-valid:focus { border-color: #28a745; box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25); }
.was-validated .minerva-root textarea.form-control:valid, .minerva-root textarea.form-control.is-valid { padding-right: calc(1.5em + 0.75rem); background-position: top calc(0.375em + 0.1875rem) right calc(0.375em + 0.1875rem); }
.was-validated .minerva-root .custom-select:valid, .minerva-root .custom-select.is-valid { border-color: #28a745; padding-right: calc(0.75em + 2.3125rem); background: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") no-repeat right 0.75rem center/8px 10px, url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e") #fff no-repeat center right 1.75rem/calc(0.75em + 0.375rem) calc(0.75em + 0.375rem); }
.was-validated .minerva-root .custom-select:valid:focus, .minerva-root .custom-select.is-valid:focus { border-color: #28a745; box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25); }
.was-validated .minerva-root .form-check-input:valid ~ .form-check-label, .minerva-root .form-check-input.is-valid ~ .form-check-label { color: #28a745; }
.was-validated .minerva-root .form-check-input:valid ~ .valid-feedback, .was-validated .minerva-root .form-check-input:valid ~ .valid-tooltip, .minerva-root .form-check-input.is-valid ~ .valid-feedback, .minerva-root .form-check-input.is-valid ~ .valid-tooltip { display: block; }
.was-validated .minerva-root .custom-control-input:valid ~ .custom-control-label, .minerva-root .custom-control-input.is-valid ~ .custom-control-label { color: #28a745; }
.was-validated .minerva-root .custom-control-input:valid ~ .custom-control-label::before, .minerva-root .custom-control-input.is-valid ~ .custom-control-label::before { border-color: #28a745; }
.was-validated .minerva-root .custom-control-input:valid:checked ~ .custom-control-label::before, .minerva-root .custom-control-input.is-valid:checked ~ .custom-control-label::before { border-color: #34ce57; background-color: #34ce57; }
.was-validated .minerva-root .custom-control-input:valid:focus ~ .custom-control-label::before, .minerva-root .custom-control-input.is-valid:focus ~ .custom-control-label::before { box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25); }
.was-validated .minerva-root .custom-control-input:valid:focus:not(:checked) ~ .custom-control-label::before, .minerva-root .custom-control-input.is-valid:focus:not(:checked) ~ .custom-control-label::before { border-color: #28a745; }
.was-validated .minerva-root .custom-file-input:valid ~ .custom-file-label, .minerva-root .custom-file-input.is-valid ~ .custom-file-label { border-color: #28a745; }
.was-validated .minerva-root .custom-file-input:valid:focus ~ .custom-file-label, .minerva-root .custom-file-input.is-valid:focus ~ .custom-file-label { border-color: #28a745; box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25); }
.minerva-root .invalid-feedback { display: none; width: 100%; margin-top: 0.25rem; font-size: 80%; color: #dc3545; }
.minerva-root .invalid-tooltip { position: absolute; top: 100%; z-index: 5; display: none; max-width: 100%; padding: 0.25rem 0.5rem; margin-top: .1rem; font-size: 0.875rem; line-height: 1.5; color: #fff; background-color: rgba(220, 53, 69, 0.9); border-radius: 0.25rem; }
.was-validated .minerva-root:invalid ~ .invalid-feedback, .was-validated .minerva-root:invalid ~ .invalid-tooltip, .minerva-root.is-invalid ~ .invalid-feedback, .minerva-root.is-invalid ~ .invalid-tooltip { display: block; }
.was-validated .minerva-root .form-control:invalid, .minerva-root .form-control.is-invalid { border-color: #dc3545; padding-right: calc(1.5em + 0.75rem); background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right calc(0.375em + 0.1875rem) center; background-size: calc(0.75em + 0.375rem) calc(0.75em + 0.375rem); }
.was-validated .minerva-root .form-control:invalid:focus, .minerva-root .form-control.is-invalid:focus { border-color: #dc3545; box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25); }
.was-validated .minerva-root textarea.form-control:invalid, .minerva-root textarea.form-control.is-invalid { padding-right: calc(1.5em + 0.75rem); background-position: top calc(0.375em + 0.1875rem) right calc(0.375em + 0.1875rem); }
.was-validated .minerva-root .custom-select:invalid, .minerva-root .custom-select.is-invalid { border-color: #dc3545; padding-right: calc(0.75em + 2.3125rem); background: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") no-repeat right 0.75rem center/8px 10px, url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e") #fff no-repeat center right 1.75rem/calc(0.75em + 0.375rem) calc(0.75em + 0.375rem); }
.was-validated .minerva-root .custom-select:invalid:focus, .minerva-root .custom-select.is-invalid:focus { border-color: #dc3545; box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25); }
.was-validated .minerva-root .form-check-input:invalid ~ .form-check-label, .minerva-root .form-check-input.is-invalid ~ .form-check-label { color: #dc3545; }
.was-validated .minerva-root .form-check-input:invalid ~ .invalid-feedback, .was-validated .minerva-root .form-check-input:invalid ~ .invalid-tooltip, .minerva-root .form-check-input.is-invalid ~ .invalid-feedback, .minerva-root .form-check-input.is-invalid ~ .invalid-tooltip { display: block; }
.was-validated .minerva-root .custom-control-input:invalid ~ .custom-control-label, .minerva-root .custom-control-input.is-invalid ~ .custom-control-label { color: #dc3545; }
.was-validated .minerva-root .custom-control-input:invalid ~ .custom-control-label::before, .minerva-root .custom-control-input.is-invalid ~ .custom-control-label::before { border-color: #dc3545; }
.was-validated .minerva-root .custom-control-input:invalid:checked ~ .custom-control-label::before, .minerva-root .custom-control-input.is-invalid:checked ~ .custom-control-label::before { border-color: #e4606d; background-color: #e4606d; }
.was-validated .minerva-root .custom-control-input:invalid:focus ~ .custom-control-label::before, .minerva-root .custom-control-input.is-invalid:focus ~ .custom-control-label::before { box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25); }
.was-validated .minerva-root .custom-control-input:invalid:focus:not(:checked) ~ .custom-control-label::before, .minerva-root .custom-control-input.is-invalid:focus:not(:checked) ~ .custom-control-label::before { border-color: #dc3545; }
.was-validated .minerva-root .custom-file-input:invalid ~ .custom-file-label, .minerva-root .custom-file-input.is-invalid ~ .custom-file-label { border-color: #dc3545; }
.was-validated .minerva-root .custom-file-input:invalid:focus ~ .custom-file-label, .minerva-root .custom-file-input.is-invalid:focus ~ .custom-file-label { border-color: #dc3545; box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25); }
.minerva-root .form-inline { display: flex; flex-flow: row wrap; align-items: center; }
.minerva-root .form-inline .form-check { width: 100%; }
@media (min-width: 576px) { .minerva-root .form-inline label { display: flex; align-items: center; justify-content: center; margin-bottom: 0; }
  .minerva-root .form-inline .form-group { display: flex; flex: 0 0 auto; flex-flow: row wrap; align-items: center; margin-bottom: 0; }
  .minerva-root .form-inline .form-control { display: inline-block; width: auto; vertical-align: middle; }
  .minerva-root .form-inline .form-control-plaintext { display: inline-block; }
  .minerva-root .form-inline .input-group, .minerva-root .form-inline .custom-select { width: auto; }
  .minerva-root .form-inline .form-check { display: flex; align-items: center; justify-content: center; width: auto; padding-left: 0; }
  .minerva-root .form-inline .form-check-input { position: relative; flex-shrink: 0; margin-top: 0; margin-right: 0.25rem; margin-left: 0; }
  .minerva-root .form-inline .custom-control { align-items: center; justify-content: center; }
  .minerva-root .form-inline .custom-control-label { margin-bottom: 0; } }
.minerva-root .btn { display: inline-block; font-weight: 400; color: #212529; text-align: center; vertical-align: middle; cursor: pointer; user-select: none; background-color: transparent; border: 1px solid transparent; padding: 0.375rem 0.75rem; font-size: 1rem; line-height: 1.5; border-radius: 0.25rem; transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; }
@media (prefers-reduced-motion: reduce) { .minerva-root .btn { transition: none; } }
.minerva-root .btn:hover { color: #212529; text-decoration: none; }
.minerva-root .btn:focus, .minerva-root .btn.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .btn.disabled, .minerva-root .btn:disabled { opacity: 0.65; }
.minerva-root a.btn.disabled, .minerva-root fieldset:disabled a.btn { pointer-events: none; }
.minerva-root .btn-primary { color: #fff; background-color: #007bff; border-color: #007bff; }
.minerva-root .btn-primary:hover { color: #fff; background-color: #0069d9; border-color: #0062cc; }
.minerva-root .btn-primary:focus, .minerva-root .btn-primary.focus { color: #fff; background-color: #0069d9; border-color: #0062cc; box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5); }
.minerva-root .btn-primary.disabled, .minerva-root .btn-primary:disabled { color: #fff; background-color: #007bff; border-color: #007bff; }
.minerva-root .btn-primary:not(:disabled):not(.disabled):active, .minerva-root .btn-primary:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-primary.dropdown-toggle { color: #fff; background-color: #0062cc; border-color: #005cbf; }
.minerva-root .btn-primary:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-primary:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-primary.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(38, 143, 255, 0.5); }
.minerva-root .btn-secondary { color: #fff; background-color: #6c757d; border-color: #6c757d; }
.minerva-root .btn-secondary:hover { color: #fff; background-color: #5a6268; border-color: #545b62; }
.minerva-root .btn-secondary:focus, .minerva-root .btn-secondary.focus { color: #fff; background-color: #5a6268; border-color: #545b62; box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5); }
.minerva-root .btn-secondary.disabled, .minerva-root .btn-secondary:disabled { color: #fff; background-color: #6c757d; border-color: #6c757d; }
.minerva-root .btn-secondary:not(:disabled):not(.disabled):active, .minerva-root .btn-secondary:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-secondary.dropdown-toggle { color: #fff; background-color: #545b62; border-color: #4e555b; }
.minerva-root .btn-secondary:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-secondary:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-secondary.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(130, 138, 145, 0.5); }
.minerva-root .btn-success { color: #fff; background-color: #28a745; border-color: #28a745; }
.minerva-root .btn-success:hover { color: #fff; background-color: #218838; border-color: #1e7e34; }
.minerva-root .btn-success:focus, .minerva-root .btn-success.focus { color: #fff; background-color: #218838; border-color: #1e7e34; box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5); }
.minerva-root .btn-success.disabled, .minerva-root .btn-success:disabled { color: #fff; background-color: #28a745; border-color: #28a745; }
.minerva-root .btn-success:not(:disabled):not(.disabled):active, .minerva-root .btn-success:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-success.dropdown-toggle { color: #fff; background-color: #1e7e34; border-color: #1c7430; }
.minerva-root .btn-success:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-success:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-success.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(72, 180, 97, 0.5); }
.minerva-root .btn-info { color: #fff; background-color: #17a2b8; border-color: #17a2b8; }
.minerva-root .btn-info:hover { color: #fff; background-color: #138496; border-color: #117a8b; }
.minerva-root .btn-info:focus, .minerva-root .btn-info.focus { color: #fff; background-color: #138496; border-color: #117a8b; box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5); }
.minerva-root .btn-info.disabled, .minerva-root .btn-info:disabled { color: #fff; background-color: #17a2b8; border-color: #17a2b8; }
.minerva-root .btn-info:not(:disabled):not(.disabled):active, .minerva-root .btn-info:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-info.dropdown-toggle { color: #fff; background-color: #117a8b; border-color: #10707f; }
.minerva-root .btn-info:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-info:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-info.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(58, 176, 195, 0.5); }
.minerva-root .btn-warning { color: #212529; background-color: #ffc107; border-color: #ffc107; }
.minerva-root .btn-warning:hover { color: #212529; background-color: #e0a800; border-color: #d39e00; }
.minerva-root .btn-warning:focus, .minerva-root .btn-warning.focus { color: #212529; background-color: #e0a800; border-color: #d39e00; box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5); }
.minerva-root .btn-warning.disabled, .minerva-root .btn-warning:disabled { color: #212529; background-color: #ffc107; border-color: #ffc107; }
.minerva-root .btn-warning:not(:disabled):not(.disabled):active, .minerva-root .btn-warning:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-warning.dropdown-toggle { color: #212529; background-color: #d39e00; border-color: #c69500; }
.minerva-root .btn-warning:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-warning:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-warning.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(222, 170, 12, 0.5); }
.minerva-root .btn-danger { color: #fff; background-color: #dc3545; border-color: #dc3545; }
.minerva-root .btn-danger:hover { color: #fff; background-color: #c82333; border-color: #bd2130; }
.minerva-root .btn-danger:focus, .minerva-root .btn-danger.focus { color: #fff; background-color: #c82333; border-color: #bd2130; box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5); }
.minerva-root .btn-danger.disabled, .minerva-root .btn-danger:disabled { color: #fff; background-color: #dc3545; border-color: #dc3545; }
.minerva-root .btn-danger:not(:disabled):not(.disabled):active, .minerva-root .btn-danger:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-danger.dropdown-toggle { color: #fff; background-color: #bd2130; border-color: #b21f2d; }
.minerva-root .btn-danger:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-danger:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-danger.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(225, 83, 97, 0.5); }
.minerva-root .btn-light { color: #212529; background-color: #f8f9fa; border-color: #f8f9fa; }
.minerva-root .btn-light:hover { color: #212529; background-color: #e2e6ea; border-color: #dae0e5; }
.minerva-root .btn-light:focus, .minerva-root .btn-light.focus { color: #212529; background-color: #e2e6ea; border-color: #dae0e5; box-shadow: 0 0 0 0.2rem rgba(216, 217, 219, 0.5); }
.minerva-root .btn-light.disabled, .minerva-root .btn-light:disabled { color: #212529; background-color: #f8f9fa; border-color: #f8f9fa; }
.minerva-root .btn-light:not(:disabled):not(.disabled):active, .minerva-root .btn-light:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-light.dropdown-toggle { color: #212529; background-color: #dae0e5; border-color: #d3d9df; }
.minerva-root .btn-light:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-light:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-light.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(216, 217, 219, 0.5); }
.minerva-root .btn-dark { color: #fff; background-color: #343a40; border-color: #343a40; }
.minerva-root .btn-dark:hover { color: #fff; background-color: #23272b; border-color: #1d2124; }
.minerva-root .btn-dark:focus, .minerva-root .btn-dark.focus { color: #fff; background-color: #23272b; border-color: #1d2124; box-shadow: 0 0 0 0.2rem rgba(82, 88, 93, 0.5); }
.minerva-root .btn-dark.disabled, .minerva-root .btn-dark:disabled { color: #fff; background-color: #343a40; border-color: #343a40; }
.minerva-root .btn-dark:not(:disabled):not(.disabled):active, .minerva-root .btn-dark:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-dark.dropdown-toggle { color: #fff; background-color: #1d2124; border-color: #171a1d; }
.minerva-root .btn-dark:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-dark:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-dark.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(82, 88, 93, 0.5); }
.minerva-root .btn-outline-primary { color: #007bff; border-color: #007bff; }
.minerva-root .btn-outline-primary:hover { color: #fff; background-color: #007bff; border-color: #007bff; }
.minerva-root .btn-outline-primary:focus, .minerva-root .btn-outline-primary.focus { box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5); }
.minerva-root .btn-outline-primary.disabled, .minerva-root .btn-outline-primary:disabled { color: #007bff; background-color: transparent; }
.minerva-root .btn-outline-primary:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-primary:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-primary.dropdown-toggle { color: #fff; background-color: #007bff; border-color: #007bff; }
.minerva-root .btn-outline-primary:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-primary:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-primary.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5); }
.minerva-root .btn-outline-secondary { color: #6c757d; border-color: #6c757d; }
.minerva-root .btn-outline-secondary:hover { color: #fff; background-color: #6c757d; border-color: #6c757d; }
.minerva-root .btn-outline-secondary:focus, .minerva-root .btn-outline-secondary.focus { box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5); }
.minerva-root .btn-outline-secondary.disabled, .minerva-root .btn-outline-secondary:disabled { color: #6c757d; background-color: transparent; }
.minerva-root .btn-outline-secondary:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-secondary:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-secondary.dropdown-toggle { color: #fff; background-color: #6c757d; border-color: #6c757d; }
.minerva-root .btn-outline-secondary:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-secondary:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-secondary.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5); }
.minerva-root .btn-outline-success { color: #28a745; border-color: #28a745; }
.minerva-root .btn-outline-success:hover { color: #fff; background-color: #28a745; border-color: #28a745; }
.minerva-root .btn-outline-success:focus, .minerva-root .btn-outline-success.focus { box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5); }
.minerva-root .btn-outline-success.disabled, .minerva-root .btn-outline-success:disabled { color: #28a745; background-color: transparent; }
.minerva-root .btn-outline-success:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-success:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-success.dropdown-toggle { color: #fff; background-color: #28a745; border-color: #28a745; }
.minerva-root .btn-outline-success:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-success:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-success.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5); }
.minerva-root .btn-outline-info { color: #17a2b8; border-color: #17a2b8; }
.minerva-root .btn-outline-info:hover { color: #fff; background-color: #17a2b8; border-color: #17a2b8; }
.minerva-root .btn-outline-info:focus, .minerva-root .btn-outline-info.focus { box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5); }
.minerva-root .btn-outline-info.disabled, .minerva-root .btn-outline-info:disabled { color: #17a2b8; background-color: transparent; }
.minerva-root .btn-outline-info:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-info:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-info.dropdown-toggle { color: #fff; background-color: #17a2b8; border-color: #17a2b8; }
.minerva-root .btn-outline-info:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-info:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-info.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5); }
.minerva-root .btn-outline-warning { color: #ffc107; border-color: #ffc107; }
.minerva-root .btn-outline-warning:hover { color: #212529; background-color: #ffc107; border-color: #ffc107; }
.minerva-root .btn-outline-warning:focus, .minerva-root .btn-outline-warning.focus { box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5); }
.minerva-root .btn-outline-warning.disabled, .minerva-root .btn-outline-warning:disabled { color: #ffc107; background-color: transparent; }
.minerva-root .btn-outline-warning:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-warning:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-warning.dropdown-toggle { color: #212529; background-color: #ffc107; border-color: #ffc107; }
.minerva-root .btn-outline-warning:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-warning:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-warning.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5); }
.minerva-root .btn-outline-danger { color: #dc3545; border-color: #dc3545; }
.minerva-root .btn-outline-danger:hover { color: #fff; background-color: #dc3545; border-color: #dc3545; }
.minerva-root .btn-outline-danger:focus, .minerva-root .btn-outline-danger.focus { box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5); }
.minerva-root .btn-outline-danger.disabled, .minerva-root .btn-outline-danger:disabled { color: #dc3545; background-color: transparent; }
.minerva-root .btn-outline-danger:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-danger:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-danger.dropdown-toggle { color: #fff; background-color: #dc3545; border-color: #dc3545; }
.minerva-root .btn-outline-danger:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-danger:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-danger.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5); }
.minerva-root .btn-outline-light { color: #f8f9fa; border-color: #f8f9fa; }
.minerva-root .btn-outline-light:hover { color: #212529; background-color: #f8f9fa; border-color: #f8f9fa; }
.minerva-root .btn-outline-light:focus, .minerva-root .btn-outline-light.focus { box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5); }
.minerva-root .btn-outline-light.disabled, .minerva-root .btn-outline-light:disabled { color: #f8f9fa; background-color: transparent; }
.minerva-root .btn-outline-light:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-light:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-light.dropdown-toggle { color: #212529; background-color: #f8f9fa; border-color: #f8f9fa; }
.minerva-root .btn-outline-light:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-light:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-light.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5); }
.minerva-root .btn-outline-dark { color: #343a40; border-color: #343a40; }
.minerva-root .btn-outline-dark:hover { color: #fff; background-color: #343a40; border-color: #343a40; }
.minerva-root .btn-outline-dark:focus, .minerva-root .btn-outline-dark.focus { box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5); }
.minerva-root .btn-outline-dark.disabled, .minerva-root .btn-outline-dark:disabled { color: #343a40; background-color: transparent; }
.minerva-root .btn-outline-dark:not(:disabled):not(.disabled):active, .minerva-root .btn-outline-dark:not(:disabled):not(.disabled).active, .show > .minerva-root .btn-outline-dark.dropdown-toggle { color: #fff; background-color: #343a40; border-color: #343a40; }
.minerva-root .btn-outline-dark:not(:disabled):not(.disabled):active:focus, .minerva-root .btn-outline-dark:not(:disabled):not(.disabled).active:focus, .show > .minerva-root .btn-outline-dark.dropdown-toggle:focus { box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5); }
.minerva-root .btn-link { font-weight: 400; color: #007bff; text-decoration: none; }
.minerva-root .btn-link:hover { color: #0056b3; text-decoration: underline; }
.minerva-root .btn-link:focus, .minerva-root .btn-link.focus { text-decoration: underline; box-shadow: none; }
.minerva-root .btn-link:disabled, .minerva-root .btn-link.disabled { color: #6c757d; pointer-events: none; }
.minerva-root .btn-lg, .minerva-root .btn-group-lg > .btn { padding: 0.5rem 1rem; font-size: 1.25rem; line-height: 1.5; border-radius: 0.3rem; }
.minerva-root .btn-sm, .minerva-root .btn-group-sm > .btn { padding: 0.25rem 0.5rem; font-size: 0.875rem; line-height: 1.5; border-radius: 0.2rem; }
.minerva-root .btn-block { display: block; width: 100%; }
.minerva-root .btn-block + .btn-block { margin-top: 0.5rem; }
.minerva-root input[type="submit"].btn-block, .minerva-root input[type="reset"].btn-block, .minerva-root input[type="button"].btn-block { width: 100%; }
.minerva-root .fade { transition: opacity 0.15s linear; }
@media (prefers-reduced-motion: reduce) { .minerva-root .fade { transition: none; } }
.minerva-root .fade:not(.show) { opacity: 0; }
.minerva-root .collapse:not(.show) { display: none; }
.minerva-root .collapsing { position: relative; height: 0; overflow: hidden; transition: height 0.35s ease; }
@media (prefers-reduced-motion: reduce) { .minerva-root .collapsing { transition: none; } }
.minerva-root .dropup, .minerva-root .dropright, .minerva-root .dropdown, .minerva-root .dropleft { position: relative; }
.minerva-root .dropdown-toggle { white-space: nowrap; }
.minerva-root .dropdown-toggle::after { display: inline-block; margin-left: 0.255em; vertical-align: 0.255em; content: ""; border-top: 0.3em solid; border-right: 0.3em solid transparent; border-bottom: 0; border-left: 0.3em solid transparent; }
.minerva-root .dropdown-toggle:empty::after { margin-left: 0; }
.minerva-root .dropdown-menu { position: absolute; top: 100%; left: 0; z-index: 1000; display: none; float: left; min-width: 10rem; padding: 0.5rem 0; margin: 0.125rem 0 0; font-size: 1rem; color: #212529; text-align: left; list-style: none; background-color: #fff; background-clip: padding-box; border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 0.25rem; }
.minerva-root .dropdown-menu-left { right: auto; left: 0; }
.minerva-root .dropdown-menu-right { right: 0; left: auto; }
@media (min-width: 576px) { .minerva-root .dropdown-menu-sm-left { right: auto; left: 0; }
  .minerva-root .dropdown-menu-sm-right { right: 0; left: auto; } }
@media (min-width: 768px) { .minerva-root .dropdown-menu-md-left { right: auto; left: 0; }
  .minerva-root .dropdown-menu-md-right { right: 0; left: auto; } }
@media (min-width: 992px) { .minerva-root .dropdown-menu-lg-left { right: auto; left: 0; }
  .minerva-root .dropdown-menu-lg-right { right: 0; left: auto; } }
@media (min-width: 1200px) { .minerva-root .dropdown-menu-xl-left { right: auto; left: 0; }
  .minerva-root .dropdown-menu-xl-right { right: 0; left: auto; } }
.minerva-root .dropup .dropdown-menu { top: auto; bottom: 100%; margin-top: 0; margin-bottom: 0.125rem; }
.minerva-root .dropup .dropdown-toggle::after { display: inline-block; margin-left: 0.255em; vertical-align: 0.255em; content: ""; border-top: 0; border-right: 0.3em solid transparent; border-bottom: 0.3em solid; border-left: 0.3em solid transparent; }
.minerva-root .dropup .dropdown-toggle:empty::after { margin-left: 0; }
.minerva-root .dropright .dropdown-menu { top: 0; right: auto; left: 100%; margin-top: 0; margin-left: 0.125rem; }
.minerva-root .dropright .dropdown-toggle::after { display: inline-block; margin-left: 0.255em; vertical-align: 0.255em; content: ""; border-top: 0.3em solid transparent; border-right: 0; border-bottom: 0.3em solid transparent; border-left: 0.3em solid; }
.minerva-root .dropright .dropdown-toggle:empty::after { margin-left: 0; }
.minerva-root .dropright .dropdown-toggle::after { vertical-align: 0; }
.minerva-root .dropleft .dropdown-menu { top: 0; right: 100%; left: auto; margin-top: 0; margin-right: 0.125rem; }
.minerva-root .dropleft .dropdown-toggle::after { display: inline-block; margin-left: 0.255em; vertical-align: 0.255em; content: ""; }
.minerva-root .dropleft .dropdown-toggle::after { display: none; }
.minerva-root .dropleft .dropdown-toggle::before { display: inline-block; margin-right: 0.255em; vertical-align: 0.255em; content: ""; border-top: 0.3em solid transparent; border-right: 0.3em solid; border-bottom: 0.3em solid transparent; }
.minerva-root .dropleft .dropdown-toggle:empty::after { margin-left: 0; }
.minerva-root .dropleft .dropdown-toggle::before { vertical-align: 0; }
.minerva-root .dropdown-menu[x-placement^="top"], .minerva-root .dropdown-menu[x-placement^="right"], .minerva-root .dropdown-menu[x-placement^="bottom"], .minerva-root .dropdown-menu[x-placement^="left"] { right: auto; bottom: auto; }
.minerva-root .dropdown-divider { height: 0; margin: 0.5rem 0; overflow: hidden; border-top: 1px solid #e9ecef; }
.minerva-root .dropdown-item { display: block; width: 100%; padding: 0.25rem 1.5rem; clear: both; font-weight: 400; color: #212529; text-align: inherit; white-space: nowrap; background-color: transparent; border: 0; }
.minerva-root .dropdown-item:hover, .minerva-root .dropdown-item:focus { color: #16181b; text-decoration: none; background-color: #f8f9fa; }
.minerva-root .dropdown-item.active, .minerva-root .dropdown-item:active { color: #fff; text-decoration: none; background-color: #007bff; }
.minerva-root .dropdown-item.disabled, .minerva-root .dropdown-item:disabled { color: #6c757d; pointer-events: none; background-color: transparent; }
.minerva-root .dropdown-menu.show { display: block; }
.minerva-root .dropdown-header { display: block; padding: 0.5rem 1.5rem; margin-bottom: 0; font-size: 0.875rem; color: #6c757d; white-space: nowrap; }
.minerva-root .dropdown-item-text { display: block; padding: 0.25rem 1.5rem; color: #212529; }
.minerva-root .btn-group, .minerva-root .btn-group-vertical { position: relative; display: inline-flex; vertical-align: middle; }
.minerva-root .btn-group > .btn, .minerva-root .btn-group-vertical > .btn { position: relative; flex: 1 1 auto; }
.minerva-root .btn-group > .btn:hover, .minerva-root .btn-group-vertical > .btn:hover { z-index: 1; }
.minerva-root .btn-group > .btn:focus, .minerva-root .btn-group > .btn:active, .minerva-root .btn-group > .btn.active, .minerva-root .btn-group-vertical > .btn:focus, .minerva-root .btn-group-vertical > .btn:active, .minerva-root .btn-group-vertical > .btn.active { z-index: 1; }
.minerva-root .btn-toolbar { display: flex; flex-wrap: wrap; justify-content: flex-start; }
.minerva-root .btn-toolbar .input-group { width: auto; }
.minerva-root .btn-group > .btn:not(:first-child), .minerva-root .btn-group > .btn-group:not(:first-child) { margin-left: -1px; }
.minerva-root .btn-group > .btn:not(:last-child):not(.dropdown-toggle), .minerva-root .btn-group > .btn-group:not(:last-child) > .btn { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.minerva-root .btn-group > .btn:not(:first-child), .minerva-root .btn-group > .btn-group:not(:first-child) > .btn { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.minerva-root .dropdown-toggle-split { padding-right: 0.5625rem; padding-left: 0.5625rem; }
.minerva-root .dropdown-toggle-split::after, .dropup .minerva-root .dropdown-toggle-split::after, .dropright .minerva-root .dropdown-toggle-split::after { margin-left: 0; }
.dropleft .minerva-root .dropdown-toggle-split::before { margin-right: 0; }
.minerva-root .btn-sm + .dropdown-toggle-split, .minerva-root .btn-group-sm > .btn + .dropdown-toggle-split { padding-right: 0.375rem; padding-left: 0.375rem; }
.minerva-root .btn-lg + .dropdown-toggle-split, .minerva-root .btn-group-lg > .btn + .dropdown-toggle-split { padding-right: 0.75rem; padding-left: 0.75rem; }
.minerva-root .btn-group-vertical { flex-direction: column; align-items: flex-start; justify-content: center; }
.minerva-root .btn-group-vertical > .btn, .minerva-root .btn-group-vertical > .btn-group { width: 100%; }
.minerva-root .btn-group-vertical > .btn:not(:first-child), .minerva-root .btn-group-vertical > .btn-group:not(:first-child) { margin-top: -1px; }
.minerva-root .btn-group-vertical > .btn:not(:last-child):not(.dropdown-toggle), .minerva-root .btn-group-vertical > .btn-group:not(:last-child) > .btn { border-bottom-right-radius: 0; border-bottom-left-radius: 0; }
.minerva-root .btn-group-vertical > .btn:not(:first-child), .minerva-root .btn-group-vertical > .btn-group:not(:first-child) > .btn { border-top-left-radius: 0; border-top-right-radius: 0; }
.minerva-root .btn-group-toggle > .btn, .minerva-root .btn-group-toggle > .btn-group > .btn { margin-bottom: 0; }
.minerva-root .btn-group-toggle > .btn input[type="radio"], .minerva-root .btn-group-toggle > .btn input[type="checkbox"], .minerva-root .btn-group-toggle > .btn-group > .btn input[type="radio"], .minerva-root .btn-group-toggle > .btn-group > .btn input[type="checkbox"] { position: absolute; clip: rect(0, 0, 0, 0); pointer-events: none; }
.minerva-root .input-group { position: relative; display: flex; flex-wrap: wrap; align-items: stretch; width: 100%; }
.minerva-root .input-group > .form-control, .minerva-root .input-group > .form-control-plaintext, .minerva-root .input-group > .custom-select, .minerva-root .input-group > .custom-file { position: relative; flex: 1 1 0%; min-width: 0; margin-bottom: 0; }
.minerva-root .input-group > .form-control + .form-control, .minerva-root .input-group > .form-control + .custom-select, .minerva-root .input-group > .form-control + .custom-file, .minerva-root .input-group > .form-control-plaintext + .form-control, .minerva-root .input-group > .form-control-plaintext + .custom-select, .minerva-root .input-group > .form-control-plaintext + .custom-file, .minerva-root .input-group > .custom-select + .form-control, .minerva-root .input-group > .custom-select + .custom-select, .minerva-root .input-group > .custom-select + .custom-file, .minerva-root .input-group > .custom-file + .form-control, .minerva-root .input-group > .custom-file + .custom-select, .minerva-root .input-group > .custom-file + .custom-file { margin-left: -1px; }
.minerva-root .input-group > .form-control:focus, .minerva-root .input-group > .custom-select:focus, .minerva-root .input-group > .custom-file .custom-file-input:focus ~ .custom-file-label { z-index: 3; }
.minerva-root .input-group > .custom-file .custom-file-input:focus { z-index: 4; }
.minerva-root .input-group > .form-control:not(:last-child), .minerva-root .input-group > .custom-select:not(:last-child) { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.minerva-root .input-group > .form-control:not(:first-child), .minerva-root .input-group > .custom-select:not(:first-child) { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.minerva-root .input-group > .custom-file { display: flex; align-items: center; }
.minerva-root .input-group > .custom-file:not(:last-child) .custom-file-label, .minerva-root .input-group > .custom-file:not(:last-child) .custom-file-label::after { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.minerva-root .input-group > .custom-file:not(:first-child) .custom-file-label { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.minerva-root .input-group-prepend, .minerva-root .input-group-append { display: flex; }
.minerva-root .input-group-prepend .btn, .minerva-root .input-group-append .btn { position: relative; z-index: 2; }
.minerva-root .input-group-prepend .btn:focus, .minerva-root .input-group-append .btn:focus { z-index: 3; }
.minerva-root .input-group-prepend .btn + .btn, .minerva-root .input-group-prepend .btn + .input-group-text, .minerva-root .input-group-prepend .input-group-text + .input-group-text, .minerva-root .input-group-prepend .input-group-text + .btn, .minerva-root .input-group-append .btn + .btn, .minerva-root .input-group-append .btn + .input-group-text, .minerva-root .input-group-append .input-group-text + .input-group-text, .minerva-root .input-group-append .input-group-text + .btn { margin-left: -1px; }
.minerva-root .input-group-prepend { margin-right: -1px; }
.minerva-root .input-group-append { margin-left: -1px; }
.minerva-root .input-group-text { display: flex; align-items: center; padding: 0.375rem 0.75rem; margin-bottom: 0; font-size: 1rem; font-weight: 400; line-height: 1.5; color: #495057; text-align: center; white-space: nowrap; background-color: #e9ecef; border: 1px solid #ced4da; border-radius: 0.25rem; }
.minerva-root .input-group-text input[type="radio"], .minerva-root .input-group-text input[type="checkbox"] { margin-top: 0; }
.minerva-root .input-group-lg > .form-control:not(textarea), .minerva-root .input-group-lg > .custom-select { height: calc(1.5em + 1rem + 2px); }
.minerva-root .input-group-lg > .form-control, .minerva-root .input-group-lg > .custom-select, .minerva-root .input-group-lg > .input-group-prepend > .input-group-text, .minerva-root .input-group-lg > .input-group-append > .input-group-text, .minerva-root .input-group-lg > .input-group-prepend > .btn, .minerva-root .input-group-lg > .input-group-append > .btn { padding: 0.5rem 1rem; font-size: 1.25rem; line-height: 1.5; border-radius: 0.3rem; }
.minerva-root .input-group-sm > .form-control:not(textarea), .minerva-root .input-group-sm > .custom-select { height: calc(1.5em + 0.5rem + 2px); }
.minerva-root .input-group-sm > .form-control, .minerva-root .input-group-sm > .custom-select, .minerva-root .input-group-sm > .input-group-prepend > .input-group-text, .minerva-root .input-group-sm > .input-group-append > .input-group-text, .minerva-root .input-group-sm > .input-group-prepend > .btn, .minerva-root .input-group-sm > .input-group-append > .btn { padding: 0.25rem 0.5rem; font-size: 0.875rem; line-height: 1.5; border-radius: 0.2rem; }
.minerva-root .input-group-lg > .custom-select, .minerva-root .input-group-sm > .custom-select { padding-right: 1.75rem; }
.minerva-root .input-group > .input-group-prepend > .btn, .minerva-root .input-group > .input-group-prepend > .input-group-text, .minerva-root .input-group > .input-group-append:not(:last-child) > .btn, .minerva-root .input-group > .input-group-append:not(:last-child) > .input-group-text, .minerva-root .input-group > .input-group-append:last-child > .btn:not(:last-child):not(.dropdown-toggle), .minerva-root .input-group > .input-group-append:last-child > .input-group-text:not(:last-child) { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.minerva-root .input-group > .input-group-append > .btn, .minerva-root .input-group > .input-group-append > .input-group-text, .minerva-root .input-group > .input-group-prepend:not(:first-child) > .btn, .minerva-root .input-group > .input-group-prepend:not(:first-child) > .input-group-text, .minerva-root .input-group > .input-group-prepend:first-child > .btn:not(:first-child), .minerva-root .input-group > .input-group-prepend:first-child > .input-group-text:not(:first-child) { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.minerva-root .custom-control { position: relative; display: block; min-height: 1.5rem; padding-left: 1.5rem; }
.minerva-root .custom-control-inline { display: inline-flex; margin-right: 1rem; }
.minerva-root .custom-control-input { position: absolute; left: 0; z-index: -1; width: 1rem; height: 1.25rem; opacity: 0; }
.minerva-root .custom-control-input:checked ~ .custom-control-label::before { color: #fff; border-color: #007bff; background-color: #007bff; }
.minerva-root .custom-control-input:focus ~ .custom-control-label::before { box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .custom-control-input:focus:not(:checked) ~ .custom-control-label::before { border-color: #80bdff; }
.minerva-root .custom-control-input:not(:disabled):active ~ .custom-control-label::before { color: #fff; background-color: #b3d7ff; border-color: #b3d7ff; }
.minerva-root .custom-control-input[disabled] ~ .custom-control-label, .minerva-root .custom-control-input:disabled ~ .custom-control-label { color: #6c757d; }
.minerva-root .custom-control-input[disabled] ~ .custom-control-label::before, .minerva-root .custom-control-input:disabled ~ .custom-control-label::before { background-color: #e9ecef; }
.minerva-root .custom-control-label { position: relative; margin-bottom: 0; vertical-align: top; }
.minerva-root .custom-control-label::before { position: absolute; top: 0.25rem; left: -1.5rem; display: block; width: 1rem; height: 1rem; pointer-events: none; content: ""; background-color: #fff; border: #adb5bd solid 1px; }
.minerva-root .custom-control-label::after { position: absolute; top: 0.25rem; left: -1.5rem; display: block; width: 1rem; height: 1rem; content: ""; background: no-repeat 50% / 50% 50%; }
.minerva-root .custom-checkbox .custom-control-label::before { border-radius: 0.25rem; }
.minerva-root .custom-checkbox .custom-control-input:checked ~ .custom-control-label::after { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%23fff' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z'/%3e%3c/svg%3e"); }
.minerva-root .custom-checkbox .custom-control-input:indeterminate ~ .custom-control-label::before { border-color: #007bff; background-color: #007bff; }
.minerva-root .custom-checkbox .custom-control-input:indeterminate ~ .custom-control-label::after { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3e%3cpath stroke='%23fff' d='M0 2h4'/%3e%3c/svg%3e"); }
.minerva-root .custom-checkbox .custom-control-input:disabled:checked ~ .custom-control-label::before { background-color: rgba(0, 123, 255, 0.5); }
.minerva-root .custom-checkbox .custom-control-input:disabled:indeterminate ~ .custom-control-label::before { background-color: rgba(0, 123, 255, 0.5); }
.minerva-root .custom-radio .custom-control-label::before { border-radius: 50%; }
.minerva-root .custom-radio .custom-control-input:checked ~ .custom-control-label::after { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='%23fff'/%3e%3c/svg%3e"); }
.minerva-root .custom-radio .custom-control-input:disabled:checked ~ .custom-control-label::before { background-color: rgba(0, 123, 255, 0.5); }
.minerva-root .custom-switch { padding-left: 2.25rem; }
.minerva-root .custom-switch .custom-control-label::before { left: -2.25rem; width: 1.75rem; pointer-events: all; border-radius: 0.5rem; }
.minerva-root .custom-switch .custom-control-label::after { top: calc(0.25rem + 2px); left: calc(-2.25rem + 2px); width: calc(1rem - 4px); height: calc(1rem - 4px); background-color: #adb5bd; border-radius: 0.5rem; transition: transform 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; }
@media (prefers-reduced-motion: reduce) { .minerva-root .custom-switch .custom-control-label::after { transition: none; } }
.minerva-root .custom-switch .custom-control-input:checked ~ .custom-control-label::after { background-color: #fff; transform: translateX(0.75rem); }
.minerva-root .custom-switch .custom-control-input:disabled:checked ~ .custom-control-label::before { background-color: rgba(0, 123, 255, 0.5); }
.minerva-root .custom-select { display: inline-block; width: 100%; height: calc(1.5em + 0.75rem + 2px); padding: 0.375rem 1.75rem 0.375rem 0.75rem; font-size: 1rem; font-weight: 400; line-height: 1.5; color: #495057; vertical-align: middle; background: #fff url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") no-repeat right 0.75rem center/8px 10px; border: 1px solid #ced4da; border-radius: 0.25rem; appearance: none; }
.minerva-root .custom-select:focus { border-color: #80bdff; outline: 0; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .custom-select:focus::-ms-value { color: #495057; background-color: #fff; }
.minerva-root .custom-select[multiple], .minerva-root .custom-select[size]:not([size="1"]) { height: auto; padding-right: 0.75rem; background-image: none; }
.minerva-root .custom-select:disabled { color: #6c757d; background-color: #e9ecef; }
.minerva-root .custom-select::-ms-expand { display: none; }
.minerva-root .custom-select:-moz-focusring { color: transparent; text-shadow: 0 0 0 #495057; }
.minerva-root .custom-select-sm { height: calc(1.5em + 0.5rem + 2px); padding-top: 0.25rem; padding-bottom: 0.25rem; padding-left: 0.5rem; font-size: 0.875rem; }
.minerva-root .custom-select-lg { height: calc(1.5em + 1rem + 2px); padding-top: 0.5rem; padding-bottom: 0.5rem; padding-left: 1rem; font-size: 1.25rem; }
.minerva-root .custom-file { position: relative; display: inline-block; width: 100%; height: calc(1.5em + 0.75rem + 2px); margin-bottom: 0; }
.minerva-root .custom-file-input { position: relative; z-index: 2; width: 100%; height: calc(1.5em + 0.75rem + 2px); margin: 0; opacity: 0; }
.minerva-root .custom-file-input:focus ~ .custom-file-label { border-color: #80bdff; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .custom-file-input[disabled] ~ .custom-file-label, .minerva-root .custom-file-input:disabled ~ .custom-file-label { background-color: #e9ecef; }
.minerva-root .custom-file-input:lang(en) ~ .custom-file-label::after { content: "Browse"; }
.minerva-root .custom-file-input ~ .custom-file-label[data-browse]::after { content: attr(data-browse); }
.minerva-root .custom-file-label { position: absolute; top: 0; right: 0; left: 0; z-index: 1; height: calc(1.5em + 0.75rem + 2px); padding: 0.375rem 0.75rem; font-weight: 400; line-height: 1.5; color: #495057; background-color: #fff; border: 1px solid #ced4da; border-radius: 0.25rem; }
.minerva-root .custom-file-label::after { position: absolute; top: 0; right: 0; bottom: 0; z-index: 3; display: block; height: calc(1.5em + 0.75rem); padding: 0.375rem 0.75rem; line-height: 1.5; color: #495057; content: "Browse"; background-color: #e9ecef; border-left: inherit; border-radius: 0 0.25rem 0.25rem 0; }
.minerva-root .custom-range { width: 100%; height: 1.4rem; padding: 0; background-color: transparent; appearance: none; }
.minerva-root .custom-range:focus { outline: none; }
.minerva-root .custom-range:focus::-webkit-slider-thumb { box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .custom-range:focus::-moz-range-thumb { box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .custom-range:focus::-ms-thumb { box-shadow: 0 0 0 1px #fff, 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .custom-range::-moz-focus-outer { border: 0; }
.minerva-root .custom-range::-webkit-slider-thumb { width: 1rem; height: 1rem; margin-top: -0.25rem; background-color: #007bff; border: 0; border-radius: 1rem; transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; appearance: none; }
@media (prefers-reduced-motion: reduce) { .minerva-root .custom-range::-webkit-slider-thumb { transition: none; } }
.minerva-root .custom-range::-webkit-slider-thumb:active { background-color: #b3d7ff; }
.minerva-root .custom-range::-webkit-slider-runnable-track { width: 100%; height: 0.5rem; color: transparent; cursor: pointer; background-color: #dee2e6; border-color: transparent; border-radius: 1rem; }
.minerva-root .custom-range::-moz-range-thumb { width: 1rem; height: 1rem; background-color: #007bff; border: 0; border-radius: 1rem; transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; appearance: none; }
@media (prefers-reduced-motion: reduce) { .minerva-root .custom-range::-moz-range-thumb { transition: none; } }
.minerva-root .custom-range::-moz-range-thumb:active { background-color: #b3d7ff; }
.minerva-root .custom-range::-moz-range-track { width: 100%; height: 0.5rem; color: transparent; cursor: pointer; background-color: #dee2e6; border-color: transparent; border-radius: 1rem; }
.minerva-root .custom-range::-ms-thumb { width: 1rem; height: 1rem; margin-top: 0; margin-right: 0.2rem; margin-left: 0.2rem; background-color: #007bff; border: 0; border-radius: 1rem; transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; appearance: none; }
@media (prefers-reduced-motion: reduce) { .minerva-root .custom-range::-ms-thumb { transition: none; } }
.minerva-root .custom-range::-ms-thumb:active { background-color: #b3d7ff; }
.minerva-root .custom-range::-ms-track { width: 100%; height: 0.5rem; color: transparent; cursor: pointer; background-color: transparent; border-color: transparent; border-width: 0.5rem; }
.minerva-root .custom-range::-ms-fill-lower { background-color: #dee2e6; border-radius: 1rem; }
.minerva-root .custom-range::-ms-fill-upper { margin-right: 15px; background-color: #dee2e6; border-radius: 1rem; }
.minerva-root .custom-range:disabled::-webkit-slider-thumb { background-color: #adb5bd; }
.minerva-root .custom-range:disabled::-webkit-slider-runnable-track { cursor: default; }
.minerva-root .custom-range:disabled::-moz-range-thumb { background-color: #adb5bd; }
.minerva-root .custom-range:disabled::-moz-range-track { cursor: default; }
.minerva-root .custom-range:disabled::-ms-thumb { background-color: #adb5bd; }
.minerva-root .custom-control-label::before, .minerva-root .custom-file-label, .minerva-root .custom-select { transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; }
@media (prefers-reduced-motion: reduce) { .minerva-root .custom-control-label::before, .minerva-root .custom-file-label, .minerva-root .custom-select { transition: none; } }
.minerva-root .nav { display: flex; flex-wrap: wrap; padding-left: 0; margin-bottom: 0; list-style: none; }
.minerva-root .all-layers { background-color: transparent; color: #007bff; text-align: left; border: none; }
.minerva-root .all-layers:hover { color: #0056b3; border: none; }
.minerva-root .all-layers:focus-visible, .minerva-root .all-layers:focus { outline: none; }
.minerva-root .nav-link, .minerva-root .all-layers { display: block; padding: 0.5rem 1rem; }
.minerva-root .nav-link:hover, .minerva-root .nav-link:focus, .minerva-root .all-layers:hover, .minerva-root .all-layers:focus  { text-decoration: none; }
.minerva-root .nav-link.disabled, .minerva-root .all-layers.disabled { color: #6c757d; pointer-events: none; cursor: default; }
.minerva-root .nav-tabs { border-bottom: 1px solid #dee2e6; }
.minerva-root .nav-tabs .nav-item { margin-bottom: -1px; }
.minerva-root .nav-tabs .nav-link { border: 1px solid transparent; border-top-left-radius: 0.25rem; border-top-right-radius: 0.25rem; }
.minerva-root .nav-tabs .nav-link:hover, .minerva-root .nav-tabs .nav-link:focus { border-color: #e9ecef #e9ecef #dee2e6; }
.minerva-root .nav-tabs .nav-link.disabled { color: #6c757d; background-color: transparent; border-color: transparent; }
.minerva-root .nav-tabs .nav-link.active, .minerva-root .nav-tabs .nav-item.show .nav-link { color: #495057; background-color: #fff; border-color: #dee2e6 #dee2e6 #fff; }
.minerva-root .nav-tabs .dropdown-menu { margin-top: -1px; border-top-left-radius: 0; border-top-right-radius: 0; }
.minerva-root .nav-pills .nav-link, .minerva-root .all-layers { border-radius: 0.25rem; }
.minerva-root .nav-pills .nav-link.active, .minerva-root .nav-pills .show > .nav-link, .minerva-root .all-layers.active  { color: #fff; background-color: #007bff; }
.minerva-root .nav-fill .nav-item { flex: 1 1 auto; text-align: center; }
.minerva-root .nav-justified .nav-item { flex-basis: 0; flex-grow: 1; text-align: center; }
.minerva-root .tab-content > .tab-pane { display: none; }
.minerva-root .tab-content > .active { display: block; }
.minerva-root .navbar { position: relative; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; }
.minerva-root .navbar .container, .minerva-root .navbar .container-fluid, .minerva-root .navbar .container-sm, .minerva-root .navbar .container-md, .minerva-root .navbar .container-lg, .minerva-root .navbar .container-xl { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.minerva-root .navbar-brand { display: inline-block; padding-top: 0.3125rem; padding-bottom: 0.3125rem; margin-right: 1rem; font-size: 1.25rem; line-height: inherit; white-space: nowrap; }
.minerva-root .navbar-brand:hover, .minerva-root .navbar-brand:focus { text-decoration: none; }
.minerva-root .navbar-nav { display: flex; flex-direction: column; padding-left: 0; margin-bottom: 0; list-style: none; }
.minerva-root .navbar-nav .nav-link, .minvera-root .all-layers { padding-right: 0; padding-left: 0; }
.minerva-root .navbar-nav .dropdown-menu { position: static; float: none; }
.minerva-root .navbar-text { display: inline-block; padding-top: 0.5rem; padding-bottom: 0.5rem; }
.minerva-root .navbar-collapse { flex-basis: 100%; flex-grow: 1; align-items: center; }
.minerva-root .navbar-toggler { padding: 0.25rem 0.75rem; font-size: 1.25rem; line-height: 1; background-color: transparent; border: 1px solid transparent; border-radius: 0.25rem; }
.minerva-root .navbar-toggler:hover, .minerva-root .navbar-toggler:focus { text-decoration: none; }
.minerva-root .navbar-toggler-icon { display: inline-block; width: 1.5em; height: 1.5em; vertical-align: middle; content: ""; background: no-repeat center center; background-size: 100% 100%; }
@media (max-width: 575.98px) { .minerva-root .navbar-expand-sm > .container, .minerva-root .navbar-expand-sm > .container-fluid, .minerva-root .navbar-expand-sm > .container-sm, .minerva-root .navbar-expand-sm > .container-md, .minerva-root .navbar-expand-sm > .container-lg, .minerva-root .navbar-expand-sm > .container-xl { padding-right: 0; padding-left: 0; } }
@media (min-width: 576px) { .minerva-root .navbar-expand-sm { flex-flow: row nowrap; justify-content: flex-start; }
  .minerva-root .navbar-expand-sm .navbar-nav { flex-direction: row; }
  .minerva-root .navbar-expand-sm .navbar-nav .dropdown-menu { position: absolute; }
  .minerva-root .navbar-expand-sm .navbar-nav .nav-link { padding-right: 0.5rem; padding-left: 0.5rem; }
  .minerva-root .navbar-expand-sm > .container, .minerva-root .navbar-expand-sm > .container-fluid, .minerva-root .navbar-expand-sm > .container-sm, .minerva-root .navbar-expand-sm > .container-md, .minerva-root .navbar-expand-sm > .container-lg, .minerva-root .navbar-expand-sm > .container-xl { flex-wrap: nowrap; }
  .minerva-root .navbar-expand-sm .navbar-collapse { display: flex !important; flex-basis: auto; }
  .minerva-root .navbar-expand-sm .navbar-toggler { display: none; } }
@media (max-width: 767.98px) { .minerva-root .navbar-expand-md > .container, .minerva-root .navbar-expand-md > .container-fluid, .minerva-root .navbar-expand-md > .container-sm, .minerva-root .navbar-expand-md > .container-md, .minerva-root .navbar-expand-md > .container-lg, .minerva-root .navbar-expand-md > .container-xl { padding-right: 0; padding-left: 0; } }
@media (min-width: 768px) { .minerva-root .navbar-expand-md { flex-flow: row nowrap; justify-content: flex-start; }
  .minerva-root .navbar-expand-md .navbar-nav { flex-direction: row; }
  .minerva-root .navbar-expand-md .navbar-nav .dropdown-menu { position: absolute; }
  .minerva-root .navbar-expand-md .navbar-nav .nav-link { padding-right: 0.5rem; padding-left: 0.5rem; }
  .minerva-root .navbar-expand-md > .container, .minerva-root .navbar-expand-md > .container-fluid, .minerva-root .navbar-expand-md > .container-sm, .minerva-root .navbar-expand-md > .container-md, .minerva-root .navbar-expand-md > .container-lg, .minerva-root .navbar-expand-md > .container-xl { flex-wrap: nowrap; }
  .minerva-root .navbar-expand-md .navbar-collapse { display: flex !important; flex-basis: auto; }
  .minerva-root .navbar-expand-md .navbar-toggler { display: none; } }
@media (max-width: 991.98px) { .minerva-root .navbar-expand-lg > .container, .minerva-root .navbar-expand-lg > .container-fluid, .minerva-root .navbar-expand-lg > .container-sm, .minerva-root .navbar-expand-lg > .container-md, .minerva-root .navbar-expand-lg > .container-lg, .minerva-root .navbar-expand-lg > .container-xl { padding-right: 0; padding-left: 0; } }
@media (min-width: 992px) { .minerva-root .navbar-expand-lg { flex-flow: row nowrap; justify-content: flex-start; }
  .minerva-root .navbar-expand-lg .navbar-nav { flex-direction: row; }
  .minerva-root .navbar-expand-lg .navbar-nav .dropdown-menu { position: absolute; }
  .minerva-root .navbar-expand-lg .navbar-nav .nav-link { padding-right: 0.5rem; padding-left: 0.5rem; }
  .minerva-root .navbar-expand-lg > .container, .minerva-root .navbar-expand-lg > .container-fluid, .minerva-root .navbar-expand-lg > .container-sm, .minerva-root .navbar-expand-lg > .container-md, .minerva-root .navbar-expand-lg > .container-lg, .minerva-root .navbar-expand-lg > .container-xl { flex-wrap: nowrap; }
  .minerva-root .navbar-expand-lg .navbar-collapse { display: flex !important; flex-basis: auto; }
  .minerva-root .navbar-expand-lg .navbar-toggler { display: none; } }
@media (max-width: 1199.98px) { .minerva-root .navbar-expand-xl > .container, .minerva-root .navbar-expand-xl > .container-fluid, .minerva-root .navbar-expand-xl > .container-sm, .minerva-root .navbar-expand-xl > .container-md, .minerva-root .navbar-expand-xl > .container-lg, .minerva-root .navbar-expand-xl > .container-xl { padding-right: 0; padding-left: 0; } }
@media (min-width: 1200px) { .minerva-root .navbar-expand-xl { flex-flow: row nowrap; justify-content: flex-start; }
  .minerva-root .navbar-expand-xl .navbar-nav { flex-direction: row; }
  .minerva-root .navbar-expand-xl .navbar-nav .dropdown-menu { position: absolute; }
  .minerva-root .navbar-expand-xl .navbar-nav .nav-link { padding-right: 0.5rem; padding-left: 0.5rem; }
  .minerva-root .navbar-expand-xl > .container, .minerva-root .navbar-expand-xl > .container-fluid, .minerva-root .navbar-expand-xl > .container-sm, .minerva-root .navbar-expand-xl > .container-md, .minerva-root .navbar-expand-xl > .container-lg, .minerva-root .navbar-expand-xl > .container-xl { flex-wrap: nowrap; }
  .minerva-root .navbar-expand-xl .navbar-collapse { display: flex !important; flex-basis: auto; }
  .minerva-root .navbar-expand-xl .navbar-toggler { display: none; } }
.minerva-root .navbar-expand { flex-flow: row nowrap; justify-content: flex-start; }
.minerva-root .navbar-expand > .container, .minerva-root .navbar-expand > .container-fluid, .minerva-root .navbar-expand > .container-sm, .minerva-root .navbar-expand > .container-md, .minerva-root .navbar-expand > .container-lg, .minerva-root .navbar-expand > .container-xl { padding-right: 0; padding-left: 0; }
.minerva-root .navbar-expand .navbar-nav { flex-direction: row; }
.minerva-root .navbar-expand .navbar-nav .dropdown-menu { position: absolute; }
.minerva-root .navbar-expand .navbar-nav .nav-link { padding-right: 0.5rem; padding-left: 0.5rem; }
.minerva-root .navbar-expand > .container, .minerva-root .navbar-expand > .container-fluid, .minerva-root .navbar-expand > .container-sm, .minerva-root .navbar-expand > .container-md, .minerva-root .navbar-expand > .container-lg, .minerva-root .navbar-expand > .container-xl { flex-wrap: nowrap; }
.minerva-root .navbar-expand .navbar-collapse { display: flex !important; flex-basis: auto; }
.minerva-root .navbar-expand .navbar-toggler { display: none; }
.minerva-root .navbar-light .navbar-brand { color: rgba(0, 0, 0, 0.9); }
.minerva-root .navbar-light .navbar-brand:hover, .minerva-root .navbar-light .navbar-brand:focus { color: rgba(0, 0, 0, 0.9); }
.minerva-root .navbar-light .navbar-nav .nav-link { color: rgba(0, 0, 0, 0.5); }
.minerva-root .navbar-light .navbar-nav .nav-link:hover, .minerva-root .navbar-light .navbar-nav .nav-link:focus { color: rgba(0, 0, 0, 0.7); }
.minerva-root .navbar-light .navbar-nav .nav-link.disabled { color: rgba(0, 0, 0, 0.3); }
.minerva-root .navbar-light .navbar-nav .show > .nav-link, .minerva-root .navbar-light .navbar-nav .active > .nav-link, .minerva-root .navbar-light .navbar-nav .nav-link.show, .minerva-root .navbar-light .navbar-nav .nav-link.active { color: rgba(0, 0, 0, 0.9); }
.minerva-root .navbar-light .navbar-toggler { color: rgba(0, 0, 0, 0.5); border-color: rgba(0, 0, 0, 0.1); }
.minerva-root .navbar-light .navbar-toggler-icon { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(0, 0, 0, 0.5)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e"); }
.minerva-root .navbar-light .navbar-text { color: rgba(0, 0, 0, 0.5); }
.minerva-root .navbar-light .navbar-text a { color: rgba(0, 0, 0, 0.9); }
.minerva-root .navbar-light .navbar-text a:hover, .minerva-root .navbar-light .navbar-text a:focus { color: rgba(0, 0, 0, 0.9); }
.minerva-root .navbar-dark .navbar-brand { color: #fff; }
.minerva-root .navbar-dark .navbar-brand:hover, .minerva-root .navbar-dark .navbar-brand:focus { color: #fff; }
.minerva-root .navbar-dark .navbar-nav .nav-link { color: rgba(255, 255, 255, 0.5); }
.minerva-root .navbar-dark .navbar-nav .nav-link:hover, .minerva-root .navbar-dark .navbar-nav .nav-link:focus { color: rgba(255, 255, 255, 0.75); }
.minerva-root .navbar-dark .navbar-nav .nav-link.disabled { color: rgba(255, 255, 255, 0.25); }
.minerva-root .navbar-dark .navbar-nav .show > .nav-link, .minerva-root .navbar-dark .navbar-nav .active > .nav-link, .minerva-root .navbar-dark .navbar-nav .nav-link.show, .minerva-root .navbar-dark .navbar-nav .nav-link.active { color: #fff; }
.minerva-root .navbar-dark .navbar-toggler { color: rgba(255, 255, 255, 0.5); border-color: rgba(255, 255, 255, 0.1); }
.minerva-root .navbar-dark .navbar-toggler-icon { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba(255, 255, 255, 0.5)' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e"); }
.minerva-root .navbar-dark .navbar-text { color: rgba(255, 255, 255, 0.5); }
.minerva-root .navbar-dark .navbar-text a { color: #fff; }
.minerva-root .navbar-dark .navbar-text a:hover, .minerva-root .navbar-dark .navbar-text a:focus { color: #fff; }
.minerva-root .card { position: relative; display: flex; flex-direction: column; min-width: 0; word-wrap: break-word; background-color: #fff; background-clip: border-box; border: 1px solid rgba(0, 0, 0, 0.125); border-radius: 0.25rem; }
.minerva-root .card > hr { margin-right: 0; margin-left: 0; }
.minerva-root .card > .list-group:first-child .list-group-item:first-child { border-top-left-radius: 0.25rem; border-top-right-radius: 0.25rem; }
.minerva-root .card > .list-group:last-child .list-group-item:last-child { border-bottom-right-radius: 0.25rem; border-bottom-left-radius: 0.25rem; }
.minerva-root .card-body { flex: 1 1 auto; min-height: 1px; padding: 1.25rem; }
.minerva-root .card-title { margin-bottom: 0.75rem; }
.minerva-root .card-subtitle { margin-top: -0.375rem; margin-bottom: 0; }
.minerva-root .card-text:last-child { margin-bottom: 0; }
.minerva-root .card-link:hover { text-decoration: none; }
.minerva-root .card-link + .card-link { margin-left: 1.25rem; }
.minerva-root .card-header { padding: 0.75rem 1.25rem; margin-bottom: 0; background-color: rgba(0, 0, 0, 0.03); border-bottom: 1px solid rgba(0, 0, 0, 0.125); }
.minerva-root .card-header:first-child { border-radius: calc(0.25rem - 1px) calc(0.25rem - 1px) 0 0; }
.minerva-root .card-header + .list-group .list-group-item:first-child { border-top: 0; }
.minerva-root .card-footer { padding: 0.75rem 1.25rem; background-color: rgba(0, 0, 0, 0.03); border-top: 1px solid rgba(0, 0, 0, 0.125); }
.minerva-root .card-footer:last-child { border-radius: 0 0 calc(0.25rem - 1px) calc(0.25rem - 1px); }
.minerva-root .card-header-tabs { margin-right: -0.625rem; margin-bottom: -0.75rem; margin-left: -0.625rem; border-bottom: 0; }
.minerva-root .card-header-pills { margin-right: -0.625rem; margin-left: -0.625rem; }
.minerva-root .card-img-overlay { position: absolute; top: 0; right: 0; bottom: 0; left: 0; padding: 1.25rem; }
.minerva-root .card-img, .minerva-root .card-img-top, .minerva-root .card-img-bottom { flex-shrink: 0; width: 100%; }
.minerva-root .card-img, .minerva-root .card-img-top { border-top-left-radius: calc(0.25rem - 1px); border-top-right-radius: calc(0.25rem - 1px); }
.minerva-root .card-img, .minerva-root .card-img-bottom { border-bottom-right-radius: calc(0.25rem - 1px); border-bottom-left-radius: calc(0.25rem - 1px); }
.minerva-root .card-deck .card { margin-bottom: 15px; }
@media (min-width: 576px) { .minerva-root .card-deck { display: flex; flex-flow: row wrap; margin-right: -15px; margin-left: -15px; }
  .minerva-root .card-deck .card { flex: 1 0 0%; margin-right: 15px; margin-bottom: 0; margin-left: 15px; } }
.minerva-root .card-group > .card { margin-bottom: 15px; }
@media (min-width: 576px) { .minerva-root .card-group { display: flex; flex-flow: row wrap; }
  .minerva-root .card-group > .card { flex: 1 0 0%; margin-bottom: 0; }
  .minerva-root .card-group > .card + .card { margin-left: 0; border-left: 0; }
  .minerva-root .card-group > .card:not(:last-child) { border-top-right-radius: 0; border-bottom-right-radius: 0; }
  .minerva-root .card-group > .card:not(:last-child) .card-img-top, .minerva-root .card-group > .card:not(:last-child) .card-header { border-top-right-radius: 0; }
  .minerva-root .card-group > .card:not(:last-child) .card-img-bottom, .minerva-root .card-group > .card:not(:last-child) .card-footer { border-bottom-right-radius: 0; }
  .minerva-root .card-group > .card:not(:first-child) { border-top-left-radius: 0; border-bottom-left-radius: 0; }
  .minerva-root .card-group > .card:not(:first-child) .card-img-top, .minerva-root .card-group > .card:not(:first-child) .card-header { border-top-left-radius: 0; }
  .minerva-root .card-group > .card:not(:first-child) .card-img-bottom, .minerva-root .card-group > .card:not(:first-child) .card-footer { border-bottom-left-radius: 0; } }
.minerva-root .card-columns .card { margin-bottom: 0.75rem; }
@media (min-width: 576px) { .minerva-root .card-columns { column-count: 3; column-gap: 1.25rem; orphans: 1; widows: 1; }
  .minerva-root .card-columns .card { display: inline-block; width: 100%; } }
.minerva-root .accordion > .card { overflow: hidden; }
.minerva-root .accordion > .card:not(:last-of-type) { border-bottom: 0; border-bottom-right-radius: 0; border-bottom-left-radius: 0; }
.minerva-root .accordion > .card:not(:first-of-type) { border-top-left-radius: 0; border-top-right-radius: 0; }
.minerva-root .accordion > .card > .card-header { border-radius: 0; margin-bottom: -1px; }
.minerva-root .breadcrumb { display: flex; flex-wrap: wrap; padding: 0.75rem 1rem; margin-bottom: 1rem; list-style: none; background-color: #e9ecef; border-radius: 0.25rem; }
.minerva-root .breadcrumb-item + .breadcrumb-item { padding-left: 0.5rem; }
.minerva-root .breadcrumb-item + .breadcrumb-item::before { display: inline-block; padding-right: 0.5rem; color: #6c757d; content: "/"; }
.minerva-root .breadcrumb-item + .breadcrumb-item:hover::before { text-decoration: underline; }
.minerva-root .breadcrumb-item + .breadcrumb-item:hover::before { text-decoration: none; }
.minerva-root .breadcrumb-item.active { color: #6c757d; }
.minerva-root .pagination { display: flex; padding-left: 0; list-style: none; border-radius: 0.25rem; }
.minerva-root .page-link { position: relative; display: block; padding: 0.5rem 0.75rem; margin-left: -1px; line-height: 1.25; color: #007bff; background-color: #fff; border: 1px solid #dee2e6; }
.minerva-root .page-link:hover { z-index: 2; color: #0056b3; text-decoration: none; background-color: #e9ecef; border-color: #dee2e6; }
.minerva-root .page-link:focus { z-index: 3; outline: 0; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.minerva-root .page-item:first-child .page-link { margin-left: 0; border-top-left-radius: 0.25rem; border-bottom-left-radius: 0.25rem; }
.minerva-root .page-item:last-child .page-link { border-top-right-radius: 0.25rem; border-bottom-right-radius: 0.25rem; }
.minerva-root .page-item.active .page-link { z-index: 3; color: #fff; background-color: #007bff; border-color: #007bff; }
.minerva-root .page-item.disabled .page-link { color: #6c757d; pointer-events: none; cursor: auto; background-color: #fff; border-color: #dee2e6; }
.minerva-root .pagination-lg .page-link { padding: 0.75rem 1.5rem; font-size: 1.25rem; line-height: 1.5; }
.minerva-root .pagination-lg .page-item:first-child .page-link { border-top-left-radius: 0.3rem; border-bottom-left-radius: 0.3rem; }
.minerva-root .pagination-lg .page-item:last-child .page-link { border-top-right-radius: 0.3rem; border-bottom-right-radius: 0.3rem; }
.minerva-root .pagination-sm .page-link { padding: 0.25rem 0.5rem; font-size: 0.875rem; line-height: 1.5; }
.minerva-root .pagination-sm .page-item:first-child .page-link { border-top-left-radius: 0.2rem; border-bottom-left-radius: 0.2rem; }
.minerva-root .pagination-sm .page-item:last-child .page-link { border-top-right-radius: 0.2rem; border-bottom-right-radius: 0.2rem; }
.minerva-root .badge { display: inline-block; padding: 0.25em 0.4em; font-size: 75%; font-weight: 700; line-height: 1; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.25rem; transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; }
@media (prefers-reduced-motion: reduce) { .minerva-root .badge { transition: none; } }
a.minerva-root .badge:hover, a.minerva-root .badge:focus { text-decoration: none; }
.minerva-root .badge:empty { display: none; }
.minerva-root .btn .badge { position: relative; top: -1px; }
.minerva-root .badge-pill { padding-right: 0.6em; padding-left: 0.6em; border-radius: 10rem; }
.minerva-root .badge-primary { color: #fff; background-color: #007bff; }
a.minerva-root .badge-primary:hover, a.minerva-root .badge-primary:focus { color: #fff; background-color: #0062cc; }
a.minerva-root .badge-primary:focus, a.minerva-root .badge-primary.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.5); }
.minerva-root .badge-secondary { color: #fff; background-color: #6c757d; }
a.minerva-root .badge-secondary:hover, a.minerva-root .badge-secondary:focus { color: #fff; background-color: #545b62; }
a.minerva-root .badge-secondary:focus, a.minerva-root .badge-secondary.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(108, 117, 125, 0.5); }
.minerva-root .badge-success { color: #fff; background-color: #28a745; }
a.minerva-root .badge-success:hover, a.minerva-root .badge-success:focus { color: #fff; background-color: #1e7e34; }
a.minerva-root .badge-success:focus, a.minerva-root .badge-success.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.5); }
.minerva-root .badge-info { color: #fff; background-color: #17a2b8; }
a.minerva-root .badge-info:hover, a.minerva-root .badge-info:focus { color: #fff; background-color: #117a8b; }
a.minerva-root .badge-info:focus, a.minerva-root .badge-info.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.5); }
.minerva-root .badge-warning { color: #212529; background-color: #ffc107; }
a.minerva-root .badge-warning:hover, a.minerva-root .badge-warning:focus { color: #212529; background-color: #d39e00; }
a.minerva-root .badge-warning:focus, a.minerva-root .badge-warning.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.5); }
.minerva-root .badge-danger { color: #fff; background-color: #dc3545; }
a.minerva-root .badge-danger:hover, a.minerva-root .badge-danger:focus { color: #fff; background-color: #bd2130; }
a.minerva-root .badge-danger:focus, a.minerva-root .badge-danger.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.5); }
.minerva-root .badge-light { color: #212529; background-color: #f8f9fa; }
a.minerva-root .badge-light:hover, a.minerva-root .badge-light:focus { color: #212529; background-color: #dae0e5; }
a.minerva-root .badge-light:focus, a.minerva-root .badge-light.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(248, 249, 250, 0.5); }
.minerva-root .badge-dark { color: #fff; background-color: #343a40; }
a.minerva-root .badge-dark:hover, a.minerva-root .badge-dark:focus { color: #fff; background-color: #1d2124; }
a.minerva-root .badge-dark:focus, a.minerva-root .badge-dark.focus { outline: 0; box-shadow: 0 0 0 0.2rem rgba(52, 58, 64, 0.5); }
.minerva-root .jumbotron { padding: 2rem 1rem; margin-bottom: 2rem; background-color: #e9ecef; border-radius: 0.3rem; }
@media (min-width: 576px) { .minerva-root .jumbotron { padding: 4rem 2rem; } }
.minerva-root .jumbotron-fluid { padding-right: 0; padding-left: 0; border-radius: 0; }
.minerva-root .alert { position: relative; padding: 0.75rem 1.25rem; margin-bottom: 1rem; border: 1px solid transparent; border-radius: 0.25rem; }
.minerva-root .alert-heading { color: inherit; }
.minerva-root .alert-link { font-weight: 700; }
.minerva-root .alert-dismissible { padding-right: 4rem; }
.minerva-root .alert-dismissible .close { position: absolute; top: 0; right: 0; padding: 0.75rem 1.25rem; color: inherit; }
.minerva-root .alert-primary { color: #004085; background-color: #cce5ff; border-color: #b8daff; }
.minerva-root .alert-primary hr { border-top-color: #9fcdff; }
.minerva-root .alert-primary .alert-link { color: #002752; }
.minerva-root .alert-secondary { color: #383d41; background-color: #e2e3e5; border-color: #d6d8db; }
.minerva-root .alert-secondary hr { border-top-color: #c8cbcf; }
.minerva-root .alert-secondary .alert-link { color: #202326; }
.minerva-root .alert-success { color: #155724; background-color: #d4edda; border-color: #c3e6cb; }
.minerva-root .alert-success hr { border-top-color: #b1dfbb; }
.minerva-root .alert-success .alert-link { color: #0b2e13; }
.minerva-root .alert-info { color: #0c5460; background-color: #d1ecf1; border-color: #bee5eb; }
.minerva-root .alert-info hr { border-top-color: #abdde5; }
.minerva-root .alert-info .alert-link { color: #062c33; }
.minerva-root .alert-warning { color: #856404; background-color: #fff3cd; border-color: #ffeeba; }
.minerva-root .alert-warning hr { border-top-color: #ffe8a1; }
.minerva-root .alert-warning .alert-link { color: #533f03; }
.minerva-root .alert-danger { color: #721c24; background-color: #f8d7da; border-color: #f5c6cb; }
.minerva-root .alert-danger hr { border-top-color: #f1b0b7; }
.minerva-root .alert-danger .alert-link { color: #491217; }
.minerva-root .alert-light { color: #818182; background-color: #fefefe; border-color: #fdfdfe; }
.minerva-root .alert-light hr { border-top-color: #ececf6; }
.minerva-root .alert-light .alert-link { color: #686868; }
.minerva-root .alert-dark { color: #1b1e21; background-color: #d6d8d9; border-color: #c6c8ca; }
.minerva-root .alert-dark hr { border-top-color: #b9bbbe; }
.minerva-root .alert-dark .alert-link { color: #040505; }
@keyframes progress-bar-stripes { from { background-position: 1rem 0; }
  to { background-position: 0 0; } }
.minerva-root .progress { display: flex; height: 1rem; overflow: hidden; font-size: 0.75rem; background-color: #e9ecef; border-radius: 0.25rem; }
.minerva-root .progress-bar { display: flex; flex-direction: column; justify-content: center; overflow: hidden; color: #fff; text-align: center; white-space: nowrap; background-color: #007bff; transition: width 0.6s ease; }
@media (prefers-reduced-motion: reduce) { .minerva-root .progress-bar { transition: none; } }
.minerva-root .progress-bar-striped { background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent); background-size: 1rem 1rem; }
.minerva-root .progress-bar-animated { animation: progress-bar-stripes 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .minerva-root .progress-bar-animated { animation: none; } }
.minerva-root .media { display: flex; align-items: flex-start; }
.minerva-root .media-body { flex: 1; }
.minerva-root .list-group { display: flex; flex-direction: column; padding-left: 0; margin-bottom: 0; }
.minerva-root .list-group-item-action { width: 100%; color: #495057; text-align: inherit; }
.minerva-root .list-group-item-action:hover, .minerva-root .list-group-item-action:focus { z-index: 1; color: #495057; text-decoration: none; background-color: #f8f9fa; }
.minerva-root .list-group-item-action:active { color: #212529; background-color: #e9ecef; }
.minerva-root .list-group-item { position: relative; display: block; padding: 0.75rem 1.25rem; background-color: #fff; border: 1px solid rgba(0, 0, 0, 0.125); }
.minerva-root .list-group-item:first-child { border-top-left-radius: 0.25rem; border-top-right-radius: 0.25rem; }
.minerva-root .list-group-item:last-child { border-bottom-right-radius: 0.25rem; border-bottom-left-radius: 0.25rem; }
.minerva-root .list-group-item.disabled, .minerva-root .list-group-item:disabled { color: #6c757d; pointer-events: none; background-color: #fff; }
.minerva-root .list-group-item.active { z-index: 2; color: #fff; background-color: #007bff; border-color: #007bff; }
.minerva-root .list-group-item + .minerva-root .list-group-item { border-top-width: 0; }
.minerva-root .list-group-item + .minerva-root .list-group-item.active { margin-top: -1px; border-top-width: 1px; }
.minerva-root .list-group-horizontal { flex-direction: row; }
.minerva-root .list-group-horizontal .list-group-item:first-child { border-bottom-left-radius: 0.25rem; border-top-right-radius: 0; }
.minerva-root .list-group-horizontal .list-group-item:last-child { border-top-right-radius: 0.25rem; border-bottom-left-radius: 0; }
.minerva-root .list-group-horizontal .list-group-item.active { margin-top: 0; }
.minerva-root .list-group-horizontal .list-group-item + .list-group-item { border-top-width: 1px; border-left-width: 0; }
.minerva-root .list-group-horizontal .list-group-item + .list-group-item.active { margin-left: -1px; border-left-width: 1px; }
@media (min-width: 576px) { .minerva-root .list-group-horizontal-sm { flex-direction: row; }
  .minerva-root .list-group-horizontal-sm .list-group-item:first-child { border-bottom-left-radius: 0.25rem; border-top-right-radius: 0; }
  .minerva-root .list-group-horizontal-sm .list-group-item:last-child { border-top-right-radius: 0.25rem; border-bottom-left-radius: 0; }
  .minerva-root .list-group-horizontal-sm .list-group-item.active { margin-top: 0; }
  .minerva-root .list-group-horizontal-sm .list-group-item + .list-group-item { border-top-width: 1px; border-left-width: 0; }
  .minerva-root .list-group-horizontal-sm .list-group-item + .list-group-item.active { margin-left: -1px; border-left-width: 1px; } }
@media (min-width: 768px) { .minerva-root .list-group-horizontal-md { flex-direction: row; }
  .minerva-root .list-group-horizontal-md .list-group-item:first-child { border-bottom-left-radius: 0.25rem; border-top-right-radius: 0; }
  .minerva-root .list-group-horizontal-md .list-group-item:last-child { border-top-right-radius: 0.25rem; border-bottom-left-radius: 0; }
  .minerva-root .list-group-horizontal-md .list-group-item.active { margin-top: 0; }
  .minerva-root .list-group-horizontal-md .list-group-item + .list-group-item { border-top-width: 1px; border-left-width: 0; }
  .minerva-root .list-group-horizontal-md .list-group-item + .list-group-item.active { margin-left: -1px; border-left-width: 1px; } }
@media (min-width: 992px) { .minerva-root .list-group-horizontal-lg { flex-direction: row; }
  .minerva-root .list-group-horizontal-lg .list-group-item:first-child { border-bottom-left-radius: 0.25rem; border-top-right-radius: 0; }
  .minerva-root .list-group-horizontal-lg .list-group-item:last-child { border-top-right-radius: 0.25rem; border-bottom-left-radius: 0; }
  .minerva-root .list-group-horizontal-lg .list-group-item.active { margin-top: 0; }
  .minerva-root .list-group-horizontal-lg .list-group-item + .list-group-item { border-top-width: 1px; border-left-width: 0; }
  .minerva-root .list-group-horizontal-lg .list-group-item + .list-group-item.active { margin-left: -1px; border-left-width: 1px; } }
@media (min-width: 1200px) { .minerva-root .list-group-horizontal-xl { flex-direction: row; }
  .minerva-root .list-group-horizontal-xl .list-group-item:first-child { border-bottom-left-radius: 0.25rem; border-top-right-radius: 0; }
  .minerva-root .list-group-horizontal-xl .list-group-item:last-child { border-top-right-radius: 0.25rem; border-bottom-left-radius: 0; }
  .minerva-root .list-group-horizontal-xl .list-group-item.active { margin-top: 0; }
  .minerva-root .list-group-horizontal-xl .list-group-item + .list-group-item { border-top-width: 1px; border-left-width: 0; }
  .minerva-root .list-group-horizontal-xl .list-group-item + .list-group-item.active { margin-left: -1px; border-left-width: 1px; } }
.minerva-root .list-group-flush .list-group-item { border-right-width: 0; border-left-width: 0; border-radius: 0; }
.minerva-root .list-group-flush .list-group-item:first-child { border-top-width: 0; }
.minerva-root .list-group-flush:last-child .list-group-item:last-child { border-bottom-width: 0; }
.minerva-root .list-group-item-primary { color: #004085; background-color: #b8daff; }
.minerva-root .list-group-item-primary.list-group-item-action:hover, .minerva-root .list-group-item-primary.list-group-item-action:focus { color: #004085; background-color: #9fcdff; }
.minerva-root .list-group-item-primary.list-group-item-action.active { color: #fff; background-color: #004085; border-color: #004085; }
.minerva-root .list-group-item-secondary { color: #383d41; background-color: #d6d8db; }
.minerva-root .list-group-item-secondary.list-group-item-action:hover, .minerva-root .list-group-item-secondary.list-group-item-action:focus { color: #383d41; background-color: #c8cbcf; }
.minerva-root .list-group-item-secondary.list-group-item-action.active { color: #fff; background-color: #383d41; border-color: #383d41; }
.minerva-root .list-group-item-success { color: #155724; background-color: #c3e6cb; }
.minerva-root .list-group-item-success.list-group-item-action:hover, .minerva-root .list-group-item-success.list-group-item-action:focus { color: #155724; background-color: #b1dfbb; }
.minerva-root .list-group-item-success.list-group-item-action.active { color: #fff; background-color: #155724; border-color: #155724; }
.minerva-root .list-group-item-info { color: #0c5460; background-color: #bee5eb; }
.minerva-root .list-group-item-info.list-group-item-action:hover, .minerva-root .list-group-item-info.list-group-item-action:focus { color: #0c5460; background-color: #abdde5; }
.minerva-root .list-group-item-info.list-group-item-action.active { color: #fff; background-color: #0c5460; border-color: #0c5460; }
.minerva-root .list-group-item-warning { color: #856404; background-color: #ffeeba; }
.minerva-root .list-group-item-warning.list-group-item-action:hover, .minerva-root .list-group-item-warning.list-group-item-action:focus { color: #856404; background-color: #ffe8a1; }
.minerva-root .list-group-item-warning.list-group-item-action.active { color: #fff; background-color: #856404; border-color: #856404; }
.minerva-root .list-group-item-danger { color: #721c24; background-color: #f5c6cb; }
.minerva-root .list-group-item-danger.list-group-item-action:hover, .minerva-root .list-group-item-danger.list-group-item-action:focus { color: #721c24; background-color: #f1b0b7; }
.minerva-root .list-group-item-danger.list-group-item-action.active { color: #fff; background-color: #721c24; border-color: #721c24; }
.minerva-root .list-group-item-light { color: #818182; background-color: #fdfdfe; }
.minerva-root .list-group-item-light.list-group-item-action:hover, .minerva-root .list-group-item-light.list-group-item-action:focus { color: #818182; background-color: #ececf6; }
.minerva-root .list-group-item-light.list-group-item-action.active { color: #fff; background-color: #818182; border-color: #818182; }
.minerva-root .list-group-item-dark { color: #1b1e21; background-color: #c6c8ca; }
.minerva-root .list-group-item-dark.list-group-item-action:hover, .minerva-root .list-group-item-dark.list-group-item-action:focus { color: #1b1e21; background-color: #b9bbbe; }
.minerva-root .list-group-item-dark.list-group-item-action.active { color: #fff; background-color: #1b1e21; border-color: #1b1e21; }
.minerva-root .close { float: right; font-size: 1.5rem; font-weight: 700; line-height: 1; color: #000; text-shadow: 0 1px 0 #fff; opacity: .5; }
.minerva-root .close:hover { color: #000; text-decoration: none; }
.minerva-root .close:not(:disabled):not(.disabled):hover, .minerva-root .close:not(:disabled):not(.disabled):focus { opacity: .75; }
.minerva-root button.close { padding: 0; background-color: transparent; border: 0; appearance: none; }
.minerva-root a.close.disabled { pointer-events: none; }
.minerva-root .toast { max-width: 350px; overflow: hidden; font-size: 0.875rem; background-color: rgba(255, 255, 255, 0.85); background-clip: padding-box; border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px); opacity: 0; border-radius: 0.25rem; }
.minerva-root .toast:not(:last-child) { margin-bottom: 0.75rem; }
.minerva-root .toast.showing { opacity: 1; }
.minerva-root .toast.show { display: block; opacity: 1; }
.minerva-root .toast.hide { display: none; }
.minerva-root .toast-header { display: flex; align-items: center; padding: 0.25rem 0.75rem; color: #6c757d; background-color: rgba(255, 255, 255, 0.85); background-clip: padding-box; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.minerva-root .toast-body { padding: 0.75rem; }
.minerva-root .modal-open { overflow: hidden; }
.minerva-root .modal-open .modal { overflow-x: hidden; overflow-y: auto; }
.minerva-root .modal { position: fixed; top: 0; left: 0; z-index: 1050; display: none; width: 100%; height: 100%; overflow: hidden; outline: 0; }
.minerva-root .modal-dialog { position: relative; width: auto; margin: 0.5rem; pointer-events: none; }
.modal.fade .minerva-root .modal-dialog { transition: transform 0.3s ease-out; transform: translate(0, -50px); }
@media (prefers-reduced-motion: reduce) { .modal.fade .minerva-root .modal-dialog { transition: none; } }
.modal.show .minerva-root .modal-dialog { transform: none; }
.modal.modal-static .minerva-root .modal-dialog { transform: scale(1.02); }
.minerva-root .modal-dialog-scrollable { display: flex; max-height: calc(100% - 1rem); }
.minerva-root .modal-dialog-scrollable .modal-content { max-height: calc(100vh - 1rem); overflow: hidden; }
.minerva-root .modal-dialog-scrollable .modal-header, .minerva-root .modal-dialog-scrollable .modal-footer { flex-shrink: 0; }
.minerva-root .modal-dialog-scrollable .modal-body { overflow-y: auto; }
.minerva-root .modal-dialog-centered { display: flex; align-items: center; min-height: calc(100% - 1rem); }
.minerva-root .modal-dialog-centered::before { display: block; height: calc(100vh - 1rem); content: ""; }
.minerva-root .modal-dialog-centered.modal-dialog-scrollable { flex-direction: column; justify-content: center; height: 100%; }
.minerva-root .modal-dialog-centered.modal-dialog-scrollable .modal-content { max-height: none; }
.minerva-root .modal-dialog-centered.modal-dialog-scrollable::before { content: none; }
.minerva-root .modal-content { position: relative; display: flex; flex-direction: column; width: 100%; pointer-events: auto; background-color: #fff; background-clip: padding-box; border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 0.3rem; outline: 0; }
.minerva-root .modal-backdrop { position: fixed; top: 0; left: 0; z-index: 1040; width: 100vw; height: 100vh; background-color: #000; }
.minerva-root .modal-backdrop.fade { opacity: 0; }
.minerva-root .modal-backdrop.show { opacity: 0.5; }
.minerva-root .modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1rem 1rem; border-bottom: 1px solid #dee2e6; border-top-left-radius: calc(0.3rem - 1px); border-top-right-radius: calc(0.3rem - 1px); }
.minerva-root .modal-header .close { padding: 1rem 1rem; margin: -1rem -1rem -1rem auto; }
.minerva-root .modal-title { margin-bottom: 0; line-height: 1.5; }
.minerva-root .modal-body { position: relative; flex: 1 1 auto; padding: 1rem; }
.minerva-root .modal-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; padding: 0.75rem; border-top: 1px solid #dee2e6; border-bottom-right-radius: calc(0.3rem - 1px); border-bottom-left-radius: calc(0.3rem - 1px); }
.minerva-root .modal-footer > * { margin: 0.25rem; }
.minerva-root .modal-scrollbar-measure { position: absolute; top: -9999px; width: 50px; height: 50px; overflow: scroll; }
@media (min-width: 576px) { .minerva-root .modal-dialog { max-width: 500px; margin: 1.75rem auto; }
  .minerva-root .modal-dialog-scrollable { max-height: calc(100% - 3.5rem); }
  .minerva-root .modal-dialog-scrollable .modal-content { max-height: calc(100vh - 3.5rem); }
  .minerva-root .modal-dialog-centered { min-height: calc(100% - 3.5rem); }
  .minerva-root .modal-dialog-centered::before { height: calc(100vh - 3.5rem); }
  .minerva-root .modal-sm { max-width: 300px; } }
@media (min-width: 992px) { .minerva-root .modal-lg, .minerva-root .modal-xl { max-width: 800px; } }
@media (min-width: 1200px) { .minerva-root .modal-xl { max-width: 1140px; } }
.minerva-root .tooltip { position: absolute; z-index: 1070; display: block; margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; font-style: normal; font-weight: 400; line-height: 1.5; text-align: left; text-align: start; text-decoration: none; text-shadow: none; text-transform: none; letter-spacing: normal; word-break: normal; word-spacing: normal; white-space: normal; line-break: auto; font-size: 0.875rem; word-wrap: break-word; opacity: 0; }
.minerva-root .tooltip.show { opacity: 0.9; }
.minerva-root .tooltip .arrow { position: absolute; display: block; width: 0.8rem; height: 0.4rem; }
.minerva-root .tooltip .arrow::before { position: absolute; content: ""; border-color: transparent; border-style: solid; }
.minerva-root .bs-tooltip-top, .minerva-root .bs-tooltip-auto[x-placement^="top"] { padding: 0.4rem 0; }
.minerva-root .bs-tooltip-top .arrow, .minerva-root .bs-tooltip-auto[x-placement^="top"] .arrow { bottom: 0; }
.minerva-root .bs-tooltip-top .arrow::before, .minerva-root .bs-tooltip-auto[x-placement^="top"] .arrow::before { top: 0; border-width: 0.4rem 0.4rem 0; border-top-color: #000; }
.minerva-root .bs-tooltip-right, .minerva-root .bs-tooltip-auto[x-placement^="right"] { padding: 0 0.4rem; }
.minerva-root .bs-tooltip-right .arrow, .minerva-root .bs-tooltip-auto[x-placement^="right"] .arrow { left: 0; width: 0.4rem; height: 0.8rem; }
.minerva-root .bs-tooltip-right .arrow::before, .minerva-root .bs-tooltip-auto[x-placement^="right"] .arrow::before { right: 0; border-width: 0.4rem 0.4rem 0.4rem 0; border-right-color: #000; }
.minerva-root .bs-tooltip-bottom, .minerva-root .bs-tooltip-auto[x-placement^="bottom"] { padding: 0.4rem 0; }
.minerva-root .bs-tooltip-bottom .arrow, .minerva-root .bs-tooltip-auto[x-placement^="bottom"] .arrow { top: 0; }
.minerva-root .bs-tooltip-bottom .arrow::before, .minerva-root .bs-tooltip-auto[x-placement^="bottom"] .arrow::before { bottom: 0; border-width: 0 0.4rem 0.4rem; border-bottom-color: #000; }
.minerva-root .bs-tooltip-left, .minerva-root .bs-tooltip-auto[x-placement^="left"] { padding: 0 0.4rem; }
.minerva-root .bs-tooltip-left .arrow, .minerva-root .bs-tooltip-auto[x-placement^="left"] .arrow { right: 0; width: 0.4rem; height: 0.8rem; }
.minerva-root .bs-tooltip-left .arrow::before, .minerva-root .bs-tooltip-auto[x-placement^="left"] .arrow::before { left: 0; border-width: 0.4rem 0 0.4rem 0.4rem; border-left-color: #000; }
.minerva-root .tooltip-inner { max-width: 200px; padding: 0.25rem 0.5rem; color: #fff; text-align: center; background-color: #000; border-radius: 0.25rem; }
.minerva-root .popover { position: absolute; top: 0; left: 0; z-index: 1060; display: block; max-width: 276px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"; font-style: normal; font-weight: 400; line-height: 1.5; text-align: left; text-align: start; text-decoration: none; text-shadow: none; text-transform: none; letter-spacing: normal; word-break: normal; word-spacing: normal; white-space: normal; line-break: auto; font-size: 0.875rem; word-wrap: break-word; background-color: #fff; background-clip: padding-box; border: 1px solid rgba(0, 0, 0, 0.2); border-radius: 0.3rem; }
.minerva-root .popover .arrow { position: absolute; display: block; width: 1rem; height: 0.5rem; margin: 0 0.3rem; }
.minerva-root .popover .arrow::before, .minerva-root .popover .arrow::after { position: absolute; display: block; content: ""; border-color: transparent; border-style: solid; }
.minerva-root .bs-popover-top, .minerva-root .bs-popover-auto[x-placement^="top"] { margin-bottom: 0.5rem; }
.minerva-root .bs-popover-top > .arrow, .minerva-root .bs-popover-auto[x-placement^="top"] > .arrow { bottom: calc(-0.5rem - 1px); }
.minerva-root .bs-popover-top > .arrow::before, .minerva-root .bs-popover-auto[x-placement^="top"] > .arrow::before { bottom: 0; border-width: 0.5rem 0.5rem 0; border-top-color: rgba(0, 0, 0, 0.25); }
.minerva-root .bs-popover-top > .arrow::after, .minerva-root .bs-popover-auto[x-placement^="top"] > .arrow::after { bottom: 1px; border-width: 0.5rem 0.5rem 0; border-top-color: #fff; }
.minerva-root .bs-popover-right, .minerva-root .bs-popover-auto[x-placement^="right"] { margin-left: 0.5rem; }
.minerva-root .bs-popover-right > .arrow, .minerva-root .bs-popover-auto[x-placement^="right"] > .arrow { left: calc(-0.5rem - 1px); width: 0.5rem; height: 1rem; margin: 0.3rem 0; }
.minerva-root .bs-popover-right > .arrow::before, .minerva-root .bs-popover-auto[x-placement^="right"] > .arrow::before { left: 0; border-width: 0.5rem 0.5rem 0.5rem 0; border-right-color: rgba(0, 0, 0, 0.25); }
.minerva-root .bs-popover-right > .arrow::after, .minerva-root .bs-popover-auto[x-placement^="right"] > .arrow::after { left: 1px; border-width: 0.5rem 0.5rem 0.5rem 0; border-right-color: #fff; }
.minerva-root .bs-popover-bottom, .minerva-root .bs-popover-auto[x-placement^="bottom"] { margin-top: 0.5rem; }
.minerva-root .bs-popover-bottom > .arrow, .minerva-root .bs-popover-auto[x-placement^="bottom"] > .arrow { top: calc(-0.5rem - 1px); }
.minerva-root .bs-popover-bottom > .arrow::before, .minerva-root .bs-popover-auto[x-placement^="bottom"] > .arrow::before { top: 0; border-width: 0 0.5rem 0.5rem 0.5rem; border-bottom-color: rgba(0, 0, 0, 0.25); }
.minerva-root .bs-popover-bottom > .arrow::after, .minerva-root .bs-popover-auto[x-placement^="bottom"] > .arrow::after { top: 1px; border-width: 0 0.5rem 0.5rem 0.5rem; border-bottom-color: #fff; }
.minerva-root .bs-popover-bottom .popover-header::before, .minerva-root .bs-popover-auto[x-placement^="bottom"] .popover-header::before { position: absolute; top: 0; left: 50%; display: block; width: 1rem; margin-left: -0.5rem; content: ""; border-bottom: 1px solid #f7f7f7; }
.minerva-root .bs-popover-left, .minerva-root .bs-popover-auto[x-placement^="left"] { margin-right: 0.5rem; }
.minerva-root .bs-popover-left > .arrow, .minerva-root .bs-popover-auto[x-placement^="left"] > .arrow { right: calc(-0.5rem - 1px); width: 0.5rem; height: 1rem; margin: 0.3rem 0; }
.minerva-root .bs-popover-left > .arrow::before, .minerva-root .bs-popover-auto[x-placement^="left"] > .arrow::before { right: 0; border-width: 0.5rem 0 0.5rem 0.5rem; border-left-color: rgba(0, 0, 0, 0.25); }
.minerva-root .bs-popover-left > .arrow::after, .minerva-root .bs-popover-auto[x-placement^="left"] > .arrow::after { right: 1px; border-width: 0.5rem 0 0.5rem 0.5rem; border-left-color: #fff; }
.minerva-root .popover-header { padding: 0.5rem 0.75rem; margin-bottom: 0; font-size: 1rem; background-color: #f7f7f7; border-bottom: 1px solid #ebebeb; border-top-left-radius: calc(0.3rem - 1px); border-top-right-radius: calc(0.3rem - 1px); }
.minerva-root .popover-header:empty { display: none; }
.minerva-root .popover-body { padding: 0.5rem 0.75rem; color: #212529; }
.minerva-root .carousel { position: relative; }
.minerva-root .carousel.pointer-event { touch-action: pan-y; }
.minerva-root .carousel-inner { position: relative; width: 100%; overflow: hidden; }
.minerva-root .carousel-inner::after { display: block; clear: both; content: ""; }
.minerva-root .carousel-item { position: relative; display: none; float: left; width: 100%; margin-right: -100%; backface-visibility: hidden; transition: transform 0.6s ease-in-out; }
@media (prefers-reduced-motion: reduce) { .minerva-root .carousel-item { transition: none; } }
.minerva-root .carousel-item.active, .minerva-root .carousel-item-next, .minerva-root .carousel-item-prev { display: block; }
.minerva-root .carousel-item-next:not(.carousel-item-left), .minerva-root .active.carousel-item-right { transform: translateX(100%); }
.minerva-root .carousel-item-prev:not(.carousel-item-right), .minerva-root .active.carousel-item-left { transform: translateX(-100%); }
.minerva-root .carousel-fade .carousel-item { opacity: 0; transition-property: opacity; transform: none; }
.minerva-root .carousel-fade .carousel-item.active, .minerva-root .carousel-fade .carousel-item-next.carousel-item-left, .minerva-root .carousel-fade .carousel-item-prev.carousel-item-right { z-index: 1; opacity: 1; }
.minerva-root .carousel-fade .active.carousel-item-left, .minerva-root .carousel-fade .active.carousel-item-right { z-index: 0; opacity: 0; transition: opacity 0s 0.6s; }
@media (prefers-reduced-motion: reduce) { .minerva-root .carousel-fade .active.carousel-item-left, .minerva-root .carousel-fade .active.carousel-item-right { transition: none; } }
.minerva-root .carousel-control-prev, .minerva-root .carousel-control-next { position: absolute; top: 0; bottom: 0; z-index: 1; display: flex; align-items: center; justify-content: center; width: 15%; color: #fff; text-align: center; opacity: 0.5; transition: opacity 0.15s ease; }
@media (prefers-reduced-motion: reduce) { .minerva-root .carousel-control-prev, .minerva-root .carousel-control-next { transition: none; } }
.minerva-root .carousel-control-prev:hover, .minerva-root .carousel-control-prev:focus, .minerva-root .carousel-control-next:hover, .minerva-root .carousel-control-next:focus { color: #fff; text-decoration: none; outline: 0; opacity: 0.9; }
.minerva-root .carousel-control-prev { left: 0; }
.minerva-root .carousel-control-next { right: 0; }
.minerva-root .carousel-control-prev-icon, .minerva-root .carousel-control-next-icon { display: inline-block; width: 20px; height: 20px; background: no-repeat 50% / 100% 100%; }
.minerva-root .carousel-control-prev-icon { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath d='M5.25 0l-4 4 4 4 1.5-1.5L4.25 4l2.5-2.5L5.25 0z'/%3e%3c/svg%3e"); }
.minerva-root .carousel-control-next-icon { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath d='M2.75 0l-1.5 1.5L3.75 4l-2.5 2.5L2.75 8l4-4-4-4z'/%3e%3c/svg%3e"); }
.minerva-root .carousel-indicators { position: absolute; right: 0; bottom: 0; left: 0; z-index: 15; display: flex; justify-content: center; padding-left: 0; margin-right: 15%; margin-left: 15%; list-style: none; }
.minerva-root .carousel-indicators li { box-sizing: content-box; flex: 0 1 auto; width: 30px; height: 3px; margin-right: 3px; margin-left: 3px; text-indent: -999px; cursor: pointer; background-color: #fff; background-clip: padding-box; border-top: 10px solid transparent; border-bottom: 10px solid transparent; opacity: .5; transition: opacity 0.6s ease; }
@media (prefers-reduced-motion: reduce) { .minerva-root .carousel-indicators li { transition: none; } }
.minerva-root .carousel-indicators .active { opacity: 1; }
.minerva-root .carousel-caption { position: absolute; right: 15%; bottom: 20px; left: 15%; z-index: 10; padding-top: 20px; padding-bottom: 20px; color: #fff; text-align: center; }
@keyframes spinner-border { to { transform: rotate(360deg); } }
.minerva-root .spinner-border { display: inline-block; width: 2rem; height: 2rem; vertical-align: text-bottom; border: 0.25em solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spinner-border .75s linear infinite; }
.minerva-root .spinner-border-sm { width: 1rem; height: 1rem; border-width: 0.2em; }
@keyframes spinner-grow { 0% { transform: scale(0); }
  50% { opacity: 1; } }
.minerva-root .spinner-grow { display: inline-block; width: 2rem; height: 2rem; vertical-align: text-bottom; background-color: currentColor; border-radius: 50%; opacity: 0; animation: spinner-grow .75s linear infinite; }
.minerva-root .spinner-grow-sm { width: 1rem; height: 1rem; }
.minerva-root .align-baseline { vertical-align: baseline !important; }
.minerva-root .align-top { vertical-align: top !important; }
.minerva-root .align-middle { vertical-align: middle !important; }
.minerva-root .align-bottom { vertical-align: bottom !important; }
.minerva-root .align-text-bottom { vertical-align: text-bottom !important; }
.minerva-root .align-text-top { vertical-align: text-top !important; }
.minerva-root .bg-primary { background-color: #007bff !important; }
.minerva-root a.bg-primary:hover, .minerva-root a.bg-primary:focus, .minerva-root button.bg-primary:hover, .minerva-root button.bg-primary:focus { background-color: #0062cc !important; }
.minerva-root .bg-secondary { background-color: #6c757d !important; }
.minerva-root a.bg-secondary:hover, .minerva-root a.bg-secondary:focus, .minerva-root button.bg-secondary:hover, .minerva-root button.bg-secondary:focus { background-color: #545b62 !important; }
.minerva-root .bg-success { background-color: #28a745 !important; }
.minerva-root a.bg-success:hover, .minerva-root a.bg-success:focus, .minerva-root button.bg-success:hover, .minerva-root button.bg-success:focus { background-color: #1e7e34 !important; }
.minerva-root .bg-info { background-color: #17a2b8 !important; }
.minerva-root a.bg-info:hover, .minerva-root a.bg-info:focus, .minerva-root button.bg-info:hover, .minerva-root button.bg-info:focus { background-color: #117a8b !important; }
.minerva-root .bg-warning { background-color: #ffc107 !important; }
.minerva-root a.bg-warning:hover, .minerva-root a.bg-warning:focus, .minerva-root button.bg-warning:hover, .minerva-root button.bg-warning:focus { background-color: #d39e00 !important; }
.minerva-root .bg-danger { background-color: #dc3545 !important; }
.minerva-root a.bg-danger:hover, .minerva-root a.bg-danger:focus, .minerva-root button.bg-danger:hover, .minerva-root button.bg-danger:focus { background-color: #bd2130 !important; }
.minerva-root .bg-light { background-color: #f8f9fa !important; }
.minerva-root a.bg-light:hover, .minerva-root a.bg-light:focus, .minerva-root button.bg-light:hover, .minerva-root button.bg-light:focus { background-color: #dae0e5 !important; }
.minerva-root .bg-dark { background-color: #343a40 !important; }
.minerva-root a.bg-dark:hover, .minerva-root a.bg-dark:focus, .minerva-root button.bg-dark:hover, .minerva-root button.bg-dark:focus { background-color: #1d2124 !important; }
.minerva-root .bg-white { background-color: #fff !important; }
.minerva-root .bg-transparent { background-color: transparent !important; }
.minerva-root .border { border: 1px solid #dee2e6 !important; }
.minerva-root .border-top { border-top: 1px solid #dee2e6 !important; }
.minerva-root .border-right { border-right: 1px solid #dee2e6 !important; }
.minerva-root .border-bottom { border-bottom: 1px solid #dee2e6 !important; }
.minerva-root .border-left { border-left: 1px solid #dee2e6 !important; }
.minerva-root .border-0 { border: 0 !important; }
.minerva-root .border-top-0 { border-top: 0 !important; }
.minerva-root .border-right-0 { border-right: 0 !important; }
.minerva-root .border-bottom-0 { border-bottom: 0 !important; }
.minerva-root .border-left-0 { border-left: 0 !important; }
.minerva-root .border-primary { border-color: #007bff !important; }
.minerva-root .border-secondary { border-color: #6c757d !important; }
.minerva-root .border-success { border-color: #28a745 !important; }
.minerva-root .border-info { border-color: #17a2b8 !important; }
.minerva-root .border-warning { border-color: #ffc107 !important; }
.minerva-root .border-danger { border-color: #dc3545 !important; }
.minerva-root .border-light { border-color: #f8f9fa !important; }
.minerva-root .border-dark { border-color: #343a40 !important; }
.minerva-root .border-white { border-color: #fff !important; }
.minerva-root .rounded-sm { border-radius: 0.2rem !important; }
.minerva-root .rounded { border-radius: 0.25rem !important; }
.minerva-root .rounded-top { border-top-left-radius: 0.25rem !important; border-top-right-radius: 0.25rem !important; }
.minerva-root .rounded-right { border-top-right-radius: 0.25rem !important; border-bottom-right-radius: 0.25rem !important; }
.minerva-root .rounded-bottom { border-bottom-right-radius: 0.25rem !important; border-bottom-left-radius: 0.25rem !important; }
.minerva-root .rounded-left { border-top-left-radius: 0.25rem !important; border-bottom-left-radius: 0.25rem !important; }
.minerva-root .rounded-lg { border-radius: 0.3rem !important; }
.minerva-root .rounded-circle { border-radius: 50% !important; }
.minerva-root .rounded-pill { border-radius: 50rem !important; }
.minerva-root .rounded-0 { border-radius: 0 !important; }
.minerva-root .clearfix::after { display: block; clear: both; content: ""; }
.minerva-root .d-none { display: none !important; }
.minerva-root .d-inline { display: inline !important; }
.minerva-root .d-inline-block { display: inline-block !important; }
.minerva-root .d-block { display: block !important; }
.minerva-root .d-table { display: table !important; }
.minerva-root .d-table-row { display: table-row !important; }
.minerva-root .d-table-cell { display: table-cell !important; }
.minerva-root .d-flex { display: flex !important; }
.minerva-root .d-inline-flex { display: inline-flex !important; }
@media (min-width: 576px) { .minerva-root .d-sm-none { display: none !important; }
  .minerva-root .d-sm-inline { display: inline !important; }
  .minerva-root .d-sm-inline-block { display: inline-block !important; }
  .minerva-root .d-sm-block { display: block !important; }
  .minerva-root .d-sm-table { display: table !important; }
  .minerva-root .d-sm-table-row { display: table-row !important; }
  .minerva-root .d-sm-table-cell { display: table-cell !important; }
  .minerva-root .d-sm-flex { display: flex !important; }
  .minerva-root .d-sm-inline-flex { display: inline-flex !important; } }
@media (min-width: 768px) { .minerva-root .d-md-none { display: none !important; }
  .minerva-root .d-md-inline { display: inline !important; }
  .minerva-root .d-md-inline-block { display: inline-block !important; }
  .minerva-root .d-md-block { display: block !important; }
  .minerva-root .d-md-table { display: table !important; }
  .minerva-root .d-md-table-row { display: table-row !important; }
  .minerva-root .d-md-table-cell { display: table-cell !important; }
  .minerva-root .d-md-flex { display: flex !important; }
  .minerva-root .d-md-inline-flex { display: inline-flex !important; } }
@media (min-width: 992px) { .minerva-root .d-lg-none { display: none !important; }
  .minerva-root .d-lg-inline { display: inline !important; }
  .minerva-root .d-lg-inline-block { display: inline-block !important; }
  .minerva-root .d-lg-block { display: block !important; }
  .minerva-root .d-lg-table { display: table !important; }
  .minerva-root .d-lg-table-row { display: table-row !important; }
  .minerva-root .d-lg-table-cell { display: table-cell !important; }
  .minerva-root .d-lg-flex { display: flex !important; }
  .minerva-root .d-lg-inline-flex { display: inline-flex !important; } }
@media (min-width: 1200px) { .minerva-root .d-xl-none { display: none !important; }
  .minerva-root .d-xl-inline { display: inline !important; }
  .minerva-root .d-xl-inline-block { display: inline-block !important; }
  .minerva-root .d-xl-block { display: block !important; }
  .minerva-root .d-xl-table { display: table !important; }
  .minerva-root .d-xl-table-row { display: table-row !important; }
  .minerva-root .d-xl-table-cell { display: table-cell !important; }
  .minerva-root .d-xl-flex { display: flex !important; }
  .minerva-root .d-xl-inline-flex { display: inline-flex !important; } }
@media print { .minerva-root .d-print-none { display: none !important; }
  .minerva-root .d-print-inline { display: inline !important; }
  .minerva-root .d-print-inline-block { display: inline-block !important; }
  .minerva-root .d-print-block { display: block !important; }
  .minerva-root .d-print-table { display: table !important; }
  .minerva-root .d-print-table-row { display: table-row !important; }
  .minerva-root .d-print-table-cell { display: table-cell !important; }
  .minerva-root .d-print-flex { display: flex !important; }
  .minerva-root .d-print-inline-flex { display: inline-flex !important; } }
.minerva-root .embed-responsive { position: relative; display: block; width: 100%; padding: 0; overflow: hidden; }
.minerva-root .embed-responsive::before { display: block; content: ""; }
.minerva-root .embed-responsive .embed-responsive-item, .minerva-root .embed-responsive iframe, .minerva-root .embed-responsive embed, .minerva-root .embed-responsive object, .minerva-root .embed-responsive video { position: absolute; top: 0; bottom: 0; left: 0; width: 100%; height: 100%; border: 0; }
.minerva-root .embed-responsive-21by9::before { padding-top: 42.8571428571%; }
.minerva-root .embed-responsive-16by9::before { padding-top: 56.25%; }
.minerva-root .embed-responsive-4by3::before { padding-top: 75%; }
.minerva-root .embed-responsive-1by1::before { padding-top: 100%; }
.minerva-root .flex-row { flex-direction: row !important; }
.minerva-root .flex-column { flex-direction: column !important; }
.minerva-root .flex-row-reverse { flex-direction: row-reverse !important; }
.minerva-root .flex-column-reverse { flex-direction: column-reverse !important; }
.minerva-root .flex-wrap { flex-wrap: wrap !important; }
.minerva-root .flex-nowrap { flex-wrap: nowrap !important; }
.minerva-root .flex-wrap-reverse { flex-wrap: wrap-reverse !important; }
.minerva-root .flex-fill { flex: 1 1 auto !important; }
.minerva-root .flex-grow-0 { flex-grow: 0 !important; }
.minerva-root .flex-grow-1 { flex-grow: 1 !important; }
.minerva-root .flex-shrink-0 { flex-shrink: 0 !important; }
.minerva-root .flex-shrink-1 { flex-shrink: 1 !important; }
.minerva-root .justify-content-start { justify-content: flex-start !important; }
.minerva-root .justify-content-end { justify-content: flex-end !important; }
.minerva-root .justify-content-center { justify-content: center !important; }
.minerva-root .justify-content-between { justify-content: space-between !important; }
.minerva-root .justify-content-around { justify-content: space-around !important; }
.minerva-root .align-items-start { align-items: flex-start !important; }
.minerva-root .align-items-end { align-items: flex-end !important; }
.minerva-root .align-items-center { align-items: center !important; }
.minerva-root .align-items-baseline { align-items: baseline !important; }
.minerva-root .align-items-stretch { align-items: stretch !important; }
.minerva-root .align-content-start { align-content: flex-start !important; }
.minerva-root .align-content-end { align-content: flex-end !important; }
.minerva-root .align-content-center { align-content: center !important; }
.minerva-root .align-content-between { align-content: space-between !important; }
.minerva-root .align-content-around { align-content: space-around !important; }
.minerva-root .align-content-stretch { align-content: stretch !important; }
.minerva-root .align-self-auto { align-self: auto !important; }
.minerva-root .align-self-start { align-self: flex-start !important; }
.minerva-root .align-self-end { align-self: flex-end !important; }
.minerva-root .align-self-center { align-self: center !important; }
.minerva-root .align-self-baseline { align-self: baseline !important; }
.minerva-root .align-self-stretch { align-self: stretch !important; }
@media (min-width: 576px) { .minerva-root .flex-sm-row { flex-direction: row !important; }
  .minerva-root .flex-sm-column { flex-direction: column !important; }
  .minerva-root .flex-sm-row-reverse { flex-direction: row-reverse !important; }
  .minerva-root .flex-sm-column-reverse { flex-direction: column-reverse !important; }
  .minerva-root .flex-sm-wrap { flex-wrap: wrap !important; }
  .minerva-root .flex-sm-nowrap { flex-wrap: nowrap !important; }
  .minerva-root .flex-sm-wrap-reverse { flex-wrap: wrap-reverse !important; }
  .minerva-root .flex-sm-fill { flex: 1 1 auto !important; }
  .minerva-root .flex-sm-grow-0 { flex-grow: 0 !important; }
  .minerva-root .flex-sm-grow-1 { flex-grow: 1 !important; }
  .minerva-root .flex-sm-shrink-0 { flex-shrink: 0 !important; }
  .minerva-root .flex-sm-shrink-1 { flex-shrink: 1 !important; }
  .minerva-root .justify-content-sm-start { justify-content: flex-start !important; }
  .minerva-root .justify-content-sm-end { justify-content: flex-end !important; }
  .minerva-root .justify-content-sm-center { justify-content: center !important; }
  .minerva-root .justify-content-sm-between { justify-content: space-between !important; }
  .minerva-root .justify-content-sm-around { justify-content: space-around !important; }
  .minerva-root .align-items-sm-start { align-items: flex-start !important; }
  .minerva-root .align-items-sm-end { align-items: flex-end !important; }
  .minerva-root .align-items-sm-center { align-items: center !important; }
  .minerva-root .align-items-sm-baseline { align-items: baseline !important; }
  .minerva-root .align-items-sm-stretch { align-items: stretch !important; }
  .minerva-root .align-content-sm-start { align-content: flex-start !important; }
  .minerva-root .align-content-sm-end { align-content: flex-end !important; }
  .minerva-root .align-content-sm-center { align-content: center !important; }
  .minerva-root .align-content-sm-between { align-content: space-between !important; }
  .minerva-root .align-content-sm-around { align-content: space-around !important; }
  .minerva-root .align-content-sm-stretch { align-content: stretch !important; }
  .minerva-root .align-self-sm-auto { align-self: auto !important; }
  .minerva-root .align-self-sm-start { align-self: flex-start !important; }
  .minerva-root .align-self-sm-end { align-self: flex-end !important; }
  .minerva-root .align-self-sm-center { align-self: center !important; }
  .minerva-root .align-self-sm-baseline { align-self: baseline !important; }
  .minerva-root .align-self-sm-stretch { align-self: stretch !important; } }
@media (min-width: 768px) { .minerva-root .flex-md-row { flex-direction: row !important; }
  .minerva-root .flex-md-column { flex-direction: column !important; }
  .minerva-root .flex-md-row-reverse { flex-direction: row-reverse !important; }
  .minerva-root .flex-md-column-reverse { flex-direction: column-reverse !important; }
  .minerva-root .flex-md-wrap { flex-wrap: wrap !important; }
  .minerva-root .flex-md-nowrap { flex-wrap: nowrap !important; }
  .minerva-root .flex-md-wrap-reverse { flex-wrap: wrap-reverse !important; }
  .minerva-root .flex-md-fill { flex: 1 1 auto !important; }
  .minerva-root .flex-md-grow-0 { flex-grow: 0 !important; }
  .minerva-root .flex-md-grow-1 { flex-grow: 1 !important; }
  .minerva-root .flex-md-shrink-0 { flex-shrink: 0 !important; }
  .minerva-root .flex-md-shrink-1 { flex-shrink: 1 !important; }
  .minerva-root .justify-content-md-start { justify-content: flex-start !important; }
  .minerva-root .justify-content-md-end { justify-content: flex-end !important; }
  .minerva-root .justify-content-md-center { justify-content: center !important; }
  .minerva-root .justify-content-md-between { justify-content: space-between !important; }
  .minerva-root .justify-content-md-around { justify-content: space-around !important; }
  .minerva-root .align-items-md-start { align-items: flex-start !important; }
  .minerva-root .align-items-md-end { align-items: flex-end !important; }
  .minerva-root .align-items-md-center { align-items: center !important; }
  .minerva-root .align-items-md-baseline { align-items: baseline !important; }
  .minerva-root .align-items-md-stretch { align-items: stretch !important; }
  .minerva-root .align-content-md-start { align-content: flex-start !important; }
  .minerva-root .align-content-md-end { align-content: flex-end !important; }
  .minerva-root .align-content-md-center { align-content: center !important; }
  .minerva-root .align-content-md-between { align-content: space-between !important; }
  .minerva-root .align-content-md-around { align-content: space-around !important; }
  .minerva-root .align-content-md-stretch { align-content: stretch !important; }
  .minerva-root .align-self-md-auto { align-self: auto !important; }
  .minerva-root .align-self-md-start { align-self: flex-start !important; }
  .minerva-root .align-self-md-end { align-self: flex-end !important; }
  .minerva-root .align-self-md-center { align-self: center !important; }
  .minerva-root .align-self-md-baseline { align-self: baseline !important; }
  .minerva-root .align-self-md-stretch { align-self: stretch !important; } }
@media (min-width: 992px) { .minerva-root .flex-lg-row { flex-direction: row !important; }
  .minerva-root .flex-lg-column { flex-direction: column !important; }
  .minerva-root .flex-lg-row-reverse { flex-direction: row-reverse !important; }
  .minerva-root .flex-lg-column-reverse { flex-direction: column-reverse !important; }
  .minerva-root .flex-lg-wrap { flex-wrap: wrap !important; }
  .minerva-root .flex-lg-nowrap { flex-wrap: nowrap !important; }
  .minerva-root .flex-lg-wrap-reverse { flex-wrap: wrap-reverse !important; }
  .minerva-root .flex-lg-fill { flex: 1 1 auto !important; }
  .minerva-root .flex-lg-grow-0 { flex-grow: 0 !important; }
  .minerva-root .flex-lg-grow-1 { flex-grow: 1 !important; }
  .minerva-root .flex-lg-shrink-0 { flex-shrink: 0 !important; }
  .minerva-root .flex-lg-shrink-1 { flex-shrink: 1 !important; }
  .minerva-root .justify-content-lg-start { justify-content: flex-start !important; }
  .minerva-root .justify-content-lg-end { justify-content: flex-end !important; }
  .minerva-root .justify-content-lg-center { justify-content: center !important; }
  .minerva-root .justify-content-lg-between { justify-content: space-between !important; }
  .minerva-root .justify-content-lg-around { justify-content: space-around !important; }
  .minerva-root .align-items-lg-start { align-items: flex-start !important; }
  .minerva-root .align-items-lg-end { align-items: flex-end !important; }
  .minerva-root .align-items-lg-center { align-items: center !important; }
  .minerva-root .align-items-lg-baseline { align-items: baseline !important; }
  .minerva-root .align-items-lg-stretch { align-items: stretch !important; }
  .minerva-root .align-content-lg-start { align-content: flex-start !important; }
  .minerva-root .align-content-lg-end { align-content: flex-end !important; }
  .minerva-root .align-content-lg-center { align-content: center !important; }
  .minerva-root .align-content-lg-between { align-content: space-between !important; }
  .minerva-root .align-content-lg-around { align-content: space-around !important; }
  .minerva-root .align-content-lg-stretch { align-content: stretch !important; }
  .minerva-root .align-self-lg-auto { align-self: auto !important; }
  .minerva-root .align-self-lg-start { align-self: flex-start !important; }
  .minerva-root .align-self-lg-end { align-self: flex-end !important; }
  .minerva-root .align-self-lg-center { align-self: center !important; }
  .minerva-root .align-self-lg-baseline { align-self: baseline !important; }
  .minerva-root .align-self-lg-stretch { align-self: stretch !important; } }
@media (min-width: 1200px) { .minerva-root .flex-xl-row { flex-direction: row !important; }
  .minerva-root .flex-xl-column { flex-direction: column !important; }
  .minerva-root .flex-xl-row-reverse { flex-direction: row-reverse !important; }
  .minerva-root .flex-xl-column-reverse { flex-direction: column-reverse !important; }
  .minerva-root .flex-xl-wrap { flex-wrap: wrap !important; }
  .minerva-root .flex-xl-nowrap { flex-wrap: nowrap !important; }
  .minerva-root .flex-xl-wrap-reverse { flex-wrap: wrap-reverse !important; }
  .minerva-root .flex-xl-fill { flex: 1 1 auto !important; }
  .minerva-root .flex-xl-grow-0 { flex-grow: 0 !important; }
  .minerva-root .flex-xl-grow-1 { flex-grow: 1 !important; }
  .minerva-root .flex-xl-shrink-0 { flex-shrink: 0 !important; }
  .minerva-root .flex-xl-shrink-1 { flex-shrink: 1 !important; }
  .minerva-root .justify-content-xl-start { justify-content: flex-start !important; }
  .minerva-root .justify-content-xl-end { justify-content: flex-end !important; }
  .minerva-root .justify-content-xl-center { justify-content: center !important; }
  .minerva-root .justify-content-xl-between { justify-content: space-between !important; }
  .minerva-root .justify-content-xl-around { justify-content: space-around !important; }
  .minerva-root .align-items-xl-start { align-items: flex-start !important; }
  .minerva-root .align-items-xl-end { align-items: flex-end !important; }
  .minerva-root .align-items-xl-center { align-items: center !important; }
  .minerva-root .align-items-xl-baseline { align-items: baseline !important; }
  .minerva-root .align-items-xl-stretch { align-items: stretch !important; }
  .minerva-root .align-content-xl-start { align-content: flex-start !important; }
  .minerva-root .align-content-xl-end { align-content: flex-end !important; }
  .minerva-root .align-content-xl-center { align-content: center !important; }
  .minerva-root .align-content-xl-between { align-content: space-between !important; }
  .minerva-root .align-content-xl-around { align-content: space-around !important; }
  .minerva-root .align-content-xl-stretch { align-content: stretch !important; }
  .minerva-root .align-self-xl-auto { align-self: auto !important; }
  .minerva-root .align-self-xl-start { align-self: flex-start !important; }
  .minerva-root .align-self-xl-end { align-self: flex-end !important; }
  .minerva-root .align-self-xl-center { align-self: center !important; }
  .minerva-root .align-self-xl-baseline { align-self: baseline !important; }
  .minerva-root .align-self-xl-stretch { align-self: stretch !important; } }
.minerva-root .float-left { float: left !important; }
.minerva-root .float-right { float: right !important; }
.minerva-root .float-none { float: none !important; }
@media (min-width: 576px) { .minerva-root .float-sm-left { float: left !important; }
  .minerva-root .float-sm-right { float: right !important; }
  .minerva-root .float-sm-none { float: none !important; } }
@media (min-width: 768px) { .minerva-root .float-md-left { float: left !important; }
  .minerva-root .float-md-right { float: right !important; }
  .minerva-root .float-md-none { float: none !important; } }
@media (min-width: 992px) { .minerva-root .float-lg-left { float: left !important; }
  .minerva-root .float-lg-right { float: right !important; }
  .minerva-root .float-lg-none { float: none !important; } }
@media (min-width: 1200px) { .minerva-root .float-xl-left { float: left !important; }
  .minerva-root .float-xl-right { float: right !important; }
  .minerva-root .float-xl-none { float: none !important; } }
.minerva-root .overflow-auto { overflow: auto !important; }
.minerva-root .overflow-hidden { overflow: hidden !important; }
.minerva-root .position-static { position: static !important; }
.minerva-root .position-relative { position: relative !important; }
.minerva-root .position-absolute { position: absolute !important; }
.minerva-root .position-fixed { position: fixed !important; }
.minerva-root .position-sticky { position: sticky !important; }
.minerva-root .fixed-top { position: fixed; top: 0; right: 0; left: 0; z-index: 1030; }
.minerva-root .fixed-bottom { position: fixed; right: 0; bottom: 0; left: 0; z-index: 1030; }
@supports (position: sticky) { .minerva-root .sticky-top { position: sticky; top: 0; z-index: 1020; } }
.minerva-root .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.minerva-root .sr-only-focusable:active, .minerva-root .sr-only-focusable:focus { position: static; width: auto; height: auto; overflow: visible; clip: auto; white-space: normal; }
.minerva-root .shadow-sm { box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important; }
.minerva-root .shadow { box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important; }
.minerva-root .shadow-lg { box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important; }
.minerva-root .shadow-none { box-shadow: none !important; }
.minerva-root .w-25 { width: 25% !important; }
.minerva-root .w-50 { width: 50% !important; }
.minerva-root .w-75 { width: 75% !important; }
.minerva-root .w-100 { width: 100% !important; }
.minerva-root .w-auto { width: auto !important; }
.minerva-root .h-25 { height: 25% !important; }
.minerva-root .h-50 { height: 50% !important; }
.minerva-root .h-75 { height: 75% !important; }
.minerva-root .h-100 { height: 100% !important; }
.minerva-root .h-auto { height: auto !important; }
.minerva-root .mw-100 { max-width: 100% !important; }
.minerva-root .mh-100 { max-height: 100% !important; }
.minerva-root .min-vw-100 { min-width: 100vw !important; }
.minerva-root .min-vh-100 { min-height: 100vh !important; }
.minerva-root .vw-100 { width: 100vw !important; }
.minerva-root .vh-100 { height: 100vh !important; }
.minerva-root .stretched-link::after { position: absolute; top: 0; right: 0; bottom: 0; left: 0; z-index: 1; pointer-events: auto; content: ""; background-color: rgba(0, 0, 0, 0); }
.minerva-root .m-0 { margin: 0 !important; }
.minerva-root .mt-0, .minerva-root .my-0 { margin-top: 0 !important; }
.minerva-root .mr-0, .minerva-root .mx-0 { margin-right: 0 !important; }
.minerva-root .mb-0, .minerva-root .my-0 { margin-bottom: 0 !important; }
.minerva-root .ml-0, .minerva-root .mx-0 { margin-left: 0 !important; }
.minerva-root .m-1 { margin: 0.25rem !important; }
.minerva-root .mt-1, .minerva-root .my-1 { margin-top: 0.25rem !important; }
.minerva-root .mr-1, .minerva-root .mx-1 { margin-right: 0.25rem !important; }
.minerva-root .mb-1, .minerva-root .my-1 { margin-bottom: 0.25rem !important; }
.minerva-root .ml-1, .minerva-root .mx-1 { margin-left: 0.25rem !important; }
.minerva-root .m-2 { margin: 0.5rem !important; }
.minerva-root .mt-2, .minerva-root .my-2 { margin-top: 0.5rem !important; }
.minerva-root .mr-2, .minerva-root .mx-2 { margin-right: 0.5rem !important; }
.minerva-root .mb-2, .minerva-root .my-2 { margin-bottom: 0.5rem !important; }
.minerva-root .ml-2, .minerva-root .mx-2 { margin-left: 0.5rem !important; }
.minerva-root .m-3 { margin: 1rem !important; }
.minerva-root .mt-3, .minerva-root .my-3 { margin-top: 1rem !important; }
.minerva-root .mr-3, .minerva-root .mx-3 { margin-right: 1rem !important; }
.minerva-root .mb-3, .minerva-root .my-3 { margin-bottom: 1rem !important; }
.minerva-root .ml-3, .minerva-root .mx-3 { margin-left: 1rem !important; }
.minerva-root .m-4 { margin: 1.5rem !important; }
.minerva-root .mt-4, .minerva-root .my-4 { margin-top: 1.5rem !important; }
.minerva-root .mr-4, .minerva-root .mx-4 { margin-right: 1.5rem !important; }
.minerva-root .mb-4, .minerva-root .my-4 { margin-bottom: 1.5rem !important; }
.minerva-root .ml-4, .minerva-root .mx-4 { margin-left: 1.5rem !important; }
.minerva-root .m-5 { margin: 3rem !important; }
.minerva-root .mt-5, .minerva-root .my-5 { margin-top: 3rem !important; }
.minerva-root .mr-5, .minerva-root .mx-5 { margin-right: 3rem !important; }
.minerva-root .mb-5, .minerva-root .my-5 { margin-bottom: 3rem !important; }
.minerva-root .ml-5, .minerva-root .mx-5 { margin-left: 3rem !important; }
.minerva-root .p-0 { padding: 0 !important; }
.minerva-root .pt-0, .minerva-root .py-0 { padding-top: 0 !important; }
.minerva-root .pr-0, .minerva-root .px-0 { padding-right: 0 !important; }
.minerva-root .pb-0, .minerva-root .py-0 { padding-bottom: 0 !important; }
.minerva-root .pl-0, .minerva-root .px-0 { padding-left: 0 !important; }
.minerva-root .p-1 { padding: 0.25rem !important; }
.minerva-root .pt-1, .minerva-root .py-1 { padding-top: 0.25rem !important; }
.minerva-root .pr-1, .minerva-root .px-1 { padding-right: 0.25rem !important; }
.minerva-root .pb-1, .minerva-root .py-1 { padding-bottom: 0.25rem !important; }
.minerva-root .pl-1, .minerva-root .px-1 { padding-left: 0.25rem !important; }
.minerva-root .p-2 { padding: 0.5rem !important; }
.minerva-root .pt-2, .minerva-root .py-2 { padding-top: 0.5rem !important; }
.minerva-root .pr-2, .minerva-root .px-2 { padding-right: 0.5rem !important; }
.minerva-root .pb-2, .minerva-root .py-2 { padding-bottom: 0.5rem !important; }
.minerva-root .pl-2, .minerva-root .px-2 { padding-left: 0.5rem !important; }
.minerva-root .p-3 { padding: 1rem !important; }
.minerva-root .pt-3, .minerva-root .py-3 { padding-top: 1rem !important; }
.minerva-root .pr-3, .minerva-root .px-3 { padding-right: 1rem !important; }
.minerva-root .pb-3, .minerva-root .py-3 { padding-bottom: 1rem !important; }
.minerva-root .pl-3, .minerva-root .px-3 { padding-left: 1rem !important; }
.minerva-root .p-4 { padding: 1.5rem !important; }
.minerva-root .pt-4, .minerva-root .py-4 { padding-top: 1.5rem !important; }
.minerva-root .pr-4, .minerva-root .px-4 { padding-right: 1.5rem !important; }
.minerva-root .pb-4, .minerva-root .py-4 { padding-bottom: 1.5rem !important; }
.minerva-root .pl-4, .minerva-root .px-4 { padding-left: 1.5rem !important; }
.minerva-root .p-5 { padding: 3rem !important; }
.minerva-root .pt-5, .minerva-root .py-5 { padding-top: 3rem !important; }
.minerva-root .pr-5, .minerva-root .px-5 { padding-right: 3rem !important; }
.minerva-root .pb-5, .minerva-root .py-5 { padding-bottom: 3rem !important; }
.minerva-root .pl-5, .minerva-root .px-5 { padding-left: 3rem !important; }
.minerva-root .m-n1 { margin: -0.25rem !important; }
.minerva-root .mt-n1, .minerva-root .my-n1 { margin-top: -0.25rem !important; }
.minerva-root .mr-n1, .minerva-root .mx-n1 { margin-right: -0.25rem !important; }
.minerva-root .mb-n1, .minerva-root .my-n1 { margin-bottom: -0.25rem !important; }
.minerva-root .ml-n1, .minerva-root .mx-n1 { margin-left: -0.25rem !important; }
.minerva-root .m-n2 { margin: -0.5rem !important; }
.minerva-root .mt-n2, .minerva-root .my-n2 { margin-top: -0.5rem !important; }
.minerva-root .mr-n2, .minerva-root .mx-n2 { margin-right: -0.5rem !important; }
.minerva-root .mb-n2, .minerva-root .my-n2 { margin-bottom: -0.5rem !important; }
.minerva-root .ml-n2, .minerva-root .mx-n2 { margin-left: -0.5rem !important; }
.minerva-root .m-n3 { margin: -1rem !important; }
.minerva-root .mt-n3, .minerva-root .my-n3 { margin-top: -1rem !important; }
.minerva-root .mr-n3, .minerva-root .mx-n3 { margin-right: -1rem !important; }
.minerva-root .mb-n3, .minerva-root .my-n3 { margin-bottom: -1rem !important; }
.minerva-root .ml-n3, .minerva-root .mx-n3 { margin-left: -1rem !important; }
.minerva-root .m-n4 { margin: -1.5rem !important; }
.minerva-root .mt-n4, .minerva-root .my-n4 { margin-top: -1.5rem !important; }
.minerva-root .mr-n4, .minerva-root .mx-n4 { margin-right: -1.5rem !important; }
.minerva-root .mb-n4, .minerva-root .my-n4 { margin-bottom: -1.5rem !important; }
.minerva-root .ml-n4, .minerva-root .mx-n4 { margin-left: -1.5rem !important; }
.minerva-root .m-n5 { margin: -3rem !important; }
.minerva-root .mt-n5, .minerva-root .my-n5 { margin-top: -3rem !important; }
.minerva-root .mr-n5, .minerva-root .mx-n5 { margin-right: -3rem !important; }
.minerva-root .mb-n5, .minerva-root .my-n5 { margin-bottom: -3rem !important; }
.minerva-root .ml-n5, .minerva-root .mx-n5 { margin-left: -3rem !important; }
.minerva-root .m-auto { margin: auto !important; }
.minerva-root .mt-auto, .minerva-root .my-auto { margin-top: auto !important; }
.minerva-root .mr-auto, .minerva-root .mx-auto { margin-right: auto !important; }
.minerva-root .mb-auto, .minerva-root .my-auto { margin-bottom: auto !important; }
.minerva-root .ml-auto, .minerva-root .mx-auto { margin-left: auto !important; }
@media (min-width: 576px) { .minerva-root .m-sm-0 { margin: 0 !important; }
  .minerva-root .mt-sm-0, .minerva-root .my-sm-0 { margin-top: 0 !important; }
  .minerva-root .mr-sm-0, .minerva-root .mx-sm-0 { margin-right: 0 !important; }
  .minerva-root .mb-sm-0, .minerva-root .my-sm-0 { margin-bottom: 0 !important; }
  .minerva-root .ml-sm-0, .minerva-root .mx-sm-0 { margin-left: 0 !important; }
  .minerva-root .m-sm-1 { margin: 0.25rem !important; }
  .minerva-root .mt-sm-1, .minerva-root .my-sm-1 { margin-top: 0.25rem !important; }
  .minerva-root .mr-sm-1, .minerva-root .mx-sm-1 { margin-right: 0.25rem !important; }
  .minerva-root .mb-sm-1, .minerva-root .my-sm-1 { margin-bottom: 0.25rem !important; }
  .minerva-root .ml-sm-1, .minerva-root .mx-sm-1 { margin-left: 0.25rem !important; }
  .minerva-root .m-sm-2 { margin: 0.5rem !important; }
  .minerva-root .mt-sm-2, .minerva-root .my-sm-2 { margin-top: 0.5rem !important; }
  .minerva-root .mr-sm-2, .minerva-root .mx-sm-2 { margin-right: 0.5rem !important; }
  .minerva-root .mb-sm-2, .minerva-root .my-sm-2 { margin-bottom: 0.5rem !important; }
  .minerva-root .ml-sm-2, .minerva-root .mx-sm-2 { margin-left: 0.5rem !important; }
  .minerva-root .m-sm-3 { margin: 1rem !important; }
  .minerva-root .mt-sm-3, .minerva-root .my-sm-3 { margin-top: 1rem !important; }
  .minerva-root .mr-sm-3, .minerva-root .mx-sm-3 { margin-right: 1rem !important; }
  .minerva-root .mb-sm-3, .minerva-root .my-sm-3 { margin-bottom: 1rem !important; }
  .minerva-root .ml-sm-3, .minerva-root .mx-sm-3 { margin-left: 1rem !important; }
  .minerva-root .m-sm-4 { margin: 1.5rem !important; }
  .minerva-root .mt-sm-4, .minerva-root .my-sm-4 { margin-top: 1.5rem !important; }
  .minerva-root .mr-sm-4, .minerva-root .mx-sm-4 { margin-right: 1.5rem !important; }
  .minerva-root .mb-sm-4, .minerva-root .my-sm-4 { margin-bottom: 1.5rem !important; }
  .minerva-root .ml-sm-4, .minerva-root .mx-sm-4 { margin-left: 1.5rem !important; }
  .minerva-root .m-sm-5 { margin: 3rem !important; }
  .minerva-root .mt-sm-5, .minerva-root .my-sm-5 { margin-top: 3rem !important; }
  .minerva-root .mr-sm-5, .minerva-root .mx-sm-5 { margin-right: 3rem !important; }
  .minerva-root .mb-sm-5, .minerva-root .my-sm-5 { margin-bottom: 3rem !important; }
  .minerva-root .ml-sm-5, .minerva-root .mx-sm-5 { margin-left: 3rem !important; }
  .minerva-root .p-sm-0 { padding: 0 !important; }
  .minerva-root .pt-sm-0, .minerva-root .py-sm-0 { padding-top: 0 !important; }
  .minerva-root .pr-sm-0, .minerva-root .px-sm-0 { padding-right: 0 !important; }
  .minerva-root .pb-sm-0, .minerva-root .py-sm-0 { padding-bottom: 0 !important; }
  .minerva-root .pl-sm-0, .minerva-root .px-sm-0 { padding-left: 0 !important; }
  .minerva-root .p-sm-1 { padding: 0.25rem !important; }
  .minerva-root .pt-sm-1, .minerva-root .py-sm-1 { padding-top: 0.25rem !important; }
  .minerva-root .pr-sm-1, .minerva-root .px-sm-1 { padding-right: 0.25rem !important; }
  .minerva-root .pb-sm-1, .minerva-root .py-sm-1 { padding-bottom: 0.25rem !important; }
  .minerva-root .pl-sm-1, .minerva-root .px-sm-1 { padding-left: 0.25rem !important; }
  .minerva-root .p-sm-2 { padding: 0.5rem !important; }
  .minerva-root .pt-sm-2, .minerva-root .py-sm-2 { padding-top: 0.5rem !important; }
  .minerva-root .pr-sm-2, .minerva-root .px-sm-2 { padding-right: 0.5rem !important; }
  .minerva-root .pb-sm-2, .minerva-root .py-sm-2 { padding-bottom: 0.5rem !important; }
  .minerva-root .pl-sm-2, .minerva-root .px-sm-2 { padding-left: 0.5rem !important; }
  .minerva-root .p-sm-3 { padding: 1rem !important; }
  .minerva-root .pt-sm-3, .minerva-root .py-sm-3 { padding-top: 1rem !important; }
  .minerva-root .pr-sm-3, .minerva-root .px-sm-3 { padding-right: 1rem !important; }
  .minerva-root .pb-sm-3, .minerva-root .py-sm-3 { padding-bottom: 1rem !important; }
  .minerva-root .pl-sm-3, .minerva-root .px-sm-3 { padding-left: 1rem !important; }
  .minerva-root .p-sm-4 { padding: 1.5rem !important; }
  .minerva-root .pt-sm-4, .minerva-root .py-sm-4 { padding-top: 1.5rem !important; }
  .minerva-root .pr-sm-4, .minerva-root .px-sm-4 { padding-right: 1.5rem !important; }
  .minerva-root .pb-sm-4, .minerva-root .py-sm-4 { padding-bottom: 1.5rem !important; }
  .minerva-root .pl-sm-4, .minerva-root .px-sm-4 { padding-left: 1.5rem !important; }
  .minerva-root .p-sm-5 { padding: 3rem !important; }
  .minerva-root .pt-sm-5, .minerva-root .py-sm-5 { padding-top: 3rem !important; }
  .minerva-root .pr-sm-5, .minerva-root .px-sm-5 { padding-right: 3rem !important; }
  .minerva-root .pb-sm-5, .minerva-root .py-sm-5 { padding-bottom: 3rem !important; }
  .minerva-root .pl-sm-5, .minerva-root .px-sm-5 { padding-left: 3rem !important; }
  .minerva-root .m-sm-n1 { margin: -0.25rem !important; }
  .minerva-root .mt-sm-n1, .minerva-root .my-sm-n1 { margin-top: -0.25rem !important; }
  .minerva-root .mr-sm-n1, .minerva-root .mx-sm-n1 { margin-right: -0.25rem !important; }
  .minerva-root .mb-sm-n1, .minerva-root .my-sm-n1 { margin-bottom: -0.25rem !important; }
  .minerva-root .ml-sm-n1, .minerva-root .mx-sm-n1 { margin-left: -0.25rem !important; }
  .minerva-root .m-sm-n2 { margin: -0.5rem !important; }
  .minerva-root .mt-sm-n2, .minerva-root .my-sm-n2 { margin-top: -0.5rem !important; }
  .minerva-root .mr-sm-n2, .minerva-root .mx-sm-n2 { margin-right: -0.5rem !important; }
  .minerva-root .mb-sm-n2, .minerva-root .my-sm-n2 { margin-bottom: -0.5rem !important; }
  .minerva-root .ml-sm-n2, .minerva-root .mx-sm-n2 { margin-left: -0.5rem !important; }
  .minerva-root .m-sm-n3 { margin: -1rem !important; }
  .minerva-root .mt-sm-n3, .minerva-root .my-sm-n3 { margin-top: -1rem !important; }
  .minerva-root .mr-sm-n3, .minerva-root .mx-sm-n3 { margin-right: -1rem !important; }
  .minerva-root .mb-sm-n3, .minerva-root .my-sm-n3 { margin-bottom: -1rem !important; }
  .minerva-root .ml-sm-n3, .minerva-root .mx-sm-n3 { margin-left: -1rem !important; }
  .minerva-root .m-sm-n4 { margin: -1.5rem !important; }
  .minerva-root .mt-sm-n4, .minerva-root .my-sm-n4 { margin-top: -1.5rem !important; }
  .minerva-root .mr-sm-n4, .minerva-root .mx-sm-n4 { margin-right: -1.5rem !important; }
  .minerva-root .mb-sm-n4, .minerva-root .my-sm-n4 { margin-bottom: -1.5rem !important; }
  .minerva-root .ml-sm-n4, .minerva-root .mx-sm-n4 { margin-left: -1.5rem !important; }
  .minerva-root .m-sm-n5 { margin: -3rem !important; }
  .minerva-root .mt-sm-n5, .minerva-root .my-sm-n5 { margin-top: -3rem !important; }
  .minerva-root .mr-sm-n5, .minerva-root .mx-sm-n5 { margin-right: -3rem !important; }
  .minerva-root .mb-sm-n5, .minerva-root .my-sm-n5 { margin-bottom: -3rem !important; }
  .minerva-root .ml-sm-n5, .minerva-root .mx-sm-n5 { margin-left: -3rem !important; }
  .minerva-root .m-sm-auto { margin: auto !important; }
  .minerva-root .mt-sm-auto, .minerva-root .my-sm-auto { margin-top: auto !important; }
  .minerva-root .mr-sm-auto, .minerva-root .mx-sm-auto { margin-right: auto !important; }
  .minerva-root .mb-sm-auto, .minerva-root .my-sm-auto { margin-bottom: auto !important; }
  .minerva-root .ml-sm-auto, .minerva-root .mx-sm-auto { margin-left: auto !important; } }
@media (min-width: 768px) { .minerva-root .m-md-0 { margin: 0 !important; }
  .minerva-root .mt-md-0, .minerva-root .my-md-0 { margin-top: 0 !important; }
  .minerva-root .mr-md-0, .minerva-root .mx-md-0 { margin-right: 0 !important; }
  .minerva-root .mb-md-0, .minerva-root .my-md-0 { margin-bottom: 0 !important; }
  .minerva-root .ml-md-0, .minerva-root .mx-md-0 { margin-left: 0 !important; }
  .minerva-root .m-md-1 { margin: 0.25rem !important; }
  .minerva-root .mt-md-1, .minerva-root .my-md-1 { margin-top: 0.25rem !important; }
  .minerva-root .mr-md-1, .minerva-root .mx-md-1 { margin-right: 0.25rem !important; }
  .minerva-root .mb-md-1, .minerva-root .my-md-1 { margin-bottom: 0.25rem !important; }
  .minerva-root .ml-md-1, .minerva-root .mx-md-1 { margin-left: 0.25rem !important; }
  .minerva-root .m-md-2 { margin: 0.5rem !important; }
  .minerva-root .mt-md-2, .minerva-root .my-md-2 { margin-top: 0.5rem !important; }
  .minerva-root .mr-md-2, .minerva-root .mx-md-2 { margin-right: 0.5rem !important; }
  .minerva-root .mb-md-2, .minerva-root .my-md-2 { margin-bottom: 0.5rem !important; }
  .minerva-root .ml-md-2, .minerva-root .mx-md-2 { margin-left: 0.5rem !important; }
  .minerva-root .m-md-3 { margin: 1rem !important; }
  .minerva-root .mt-md-3, .minerva-root .my-md-3 { margin-top: 1rem !important; }
  .minerva-root .mr-md-3, .minerva-root .mx-md-3 { margin-right: 1rem !important; }
  .minerva-root .mb-md-3, .minerva-root .my-md-3 { margin-bottom: 1rem !important; }
  .minerva-root .ml-md-3, .minerva-root .mx-md-3 { margin-left: 1rem !important; }
  .minerva-root .m-md-4 { margin: 1.5rem !important; }
  .minerva-root .mt-md-4, .minerva-root .my-md-4 { margin-top: 1.5rem !important; }
  .minerva-root .mr-md-4, .minerva-root .mx-md-4 { margin-right: 1.5rem !important; }
  .minerva-root .mb-md-4, .minerva-root .my-md-4 { margin-bottom: 1.5rem !important; }
  .minerva-root .ml-md-4, .minerva-root .mx-md-4 { margin-left: 1.5rem !important; }
  .minerva-root .m-md-5 { margin: 3rem !important; }
  .minerva-root .mt-md-5, .minerva-root .my-md-5 { margin-top: 3rem !important; }
  .minerva-root .mr-md-5, .minerva-root .mx-md-5 { margin-right: 3rem !important; }
  .minerva-root .mb-md-5, .minerva-root .my-md-5 { margin-bottom: 3rem !important; }
  .minerva-root .ml-md-5, .minerva-root .mx-md-5 { margin-left: 3rem !important; }
  .minerva-root .p-md-0 { padding: 0 !important; }
  .minerva-root .pt-md-0, .minerva-root .py-md-0 { padding-top: 0 !important; }
  .minerva-root .pr-md-0, .minerva-root .px-md-0 { padding-right: 0 !important; }
  .minerva-root .pb-md-0, .minerva-root .py-md-0 { padding-bottom: 0 !important; }
  .minerva-root .pl-md-0, .minerva-root .px-md-0 { padding-left: 0 !important; }
  .minerva-root .p-md-1 { padding: 0.25rem !important; }
  .minerva-root .pt-md-1, .minerva-root .py-md-1 { padding-top: 0.25rem !important; }
  .minerva-root .pr-md-1, .minerva-root .px-md-1 { padding-right: 0.25rem !important; }
  .minerva-root .pb-md-1, .minerva-root .py-md-1 { padding-bottom: 0.25rem !important; }
  .minerva-root .pl-md-1, .minerva-root .px-md-1 { padding-left: 0.25rem !important; }
  .minerva-root .p-md-2 { padding: 0.5rem !important; }
  .minerva-root .pt-md-2, .minerva-root .py-md-2 { padding-top: 0.5rem !important; }
  .minerva-root .pr-md-2, .minerva-root .px-md-2 { padding-right: 0.5rem !important; }
  .minerva-root .pb-md-2, .minerva-root .py-md-2 { padding-bottom: 0.5rem !important; }
  .minerva-root .pl-md-2, .minerva-root .px-md-2 { padding-left: 0.5rem !important; }
  .minerva-root .p-md-3 { padding: 1rem !important; }
  .minerva-root .pt-md-3, .minerva-root .py-md-3 { padding-top: 1rem !important; }
  .minerva-root .pr-md-3, .minerva-root .px-md-3 { padding-right: 1rem !important; }
  .minerva-root .pb-md-3, .minerva-root .py-md-3 { padding-bottom: 1rem !important; }
  .minerva-root .pl-md-3, .minerva-root .px-md-3 { padding-left: 1rem !important; }
  .minerva-root .p-md-4 { padding: 1.5rem !important; }
  .minerva-root .pt-md-4, .minerva-root .py-md-4 { padding-top: 1.5rem !important; }
  .minerva-root .pr-md-4, .minerva-root .px-md-4 { padding-right: 1.5rem !important; }
  .minerva-root .pb-md-4, .minerva-root .py-md-4 { padding-bottom: 1.5rem !important; }
  .minerva-root .pl-md-4, .minerva-root .px-md-4 { padding-left: 1.5rem !important; }
  .minerva-root .p-md-5 { padding: 3rem !important; }
  .minerva-root .pt-md-5, .minerva-root .py-md-5 { padding-top: 3rem !important; }
  .minerva-root .pr-md-5, .minerva-root .px-md-5 { padding-right: 3rem !important; }
  .minerva-root .pb-md-5, .minerva-root .py-md-5 { padding-bottom: 3rem !important; }
  .minerva-root .pl-md-5, .minerva-root .px-md-5 { padding-left: 3rem !important; }
  .minerva-root .m-md-n1 { margin: -0.25rem !important; }
  .minerva-root .mt-md-n1, .minerva-root .my-md-n1 { margin-top: -0.25rem !important; }
  .minerva-root .mr-md-n1, .minerva-root .mx-md-n1 { margin-right: -0.25rem !important; }
  .minerva-root .mb-md-n1, .minerva-root .my-md-n1 { margin-bottom: -0.25rem !important; }
  .minerva-root .ml-md-n1, .minerva-root .mx-md-n1 { margin-left: -0.25rem !important; }
  .minerva-root .m-md-n2 { margin: -0.5rem !important; }
  .minerva-root .mt-md-n2, .minerva-root .my-md-n2 { margin-top: -0.5rem !important; }
  .minerva-root .mr-md-n2, .minerva-root .mx-md-n2 { margin-right: -0.5rem !important; }
  .minerva-root .mb-md-n2, .minerva-root .my-md-n2 { margin-bottom: -0.5rem !important; }
  .minerva-root .ml-md-n2, .minerva-root .mx-md-n2 { margin-left: -0.5rem !important; }
  .minerva-root .m-md-n3 { margin: -1rem !important; }
  .minerva-root .mt-md-n3, .minerva-root .my-md-n3 { margin-top: -1rem !important; }
  .minerva-root .mr-md-n3, .minerva-root .mx-md-n3 { margin-right: -1rem !important; }
  .minerva-root .mb-md-n3, .minerva-root .my-md-n3 { margin-bottom: -1rem !important; }
  .minerva-root .ml-md-n3, .minerva-root .mx-md-n3 { margin-left: -1rem !important; }
  .minerva-root .m-md-n4 { margin: -1.5rem !important; }
  .minerva-root .mt-md-n4, .minerva-root .my-md-n4 { margin-top: -1.5rem !important; }
  .minerva-root .mr-md-n4, .minerva-root .mx-md-n4 { margin-right: -1.5rem !important; }
  .minerva-root .mb-md-n4, .minerva-root .my-md-n4 { margin-bottom: -1.5rem !important; }
  .minerva-root .ml-md-n4, .minerva-root .mx-md-n4 { margin-left: -1.5rem !important; }
  .minerva-root .m-md-n5 { margin: -3rem !important; }
  .minerva-root .mt-md-n5, .minerva-root .my-md-n5 { margin-top: -3rem !important; }
  .minerva-root .mr-md-n5, .minerva-root .mx-md-n5 { margin-right: -3rem !important; }
  .minerva-root .mb-md-n5, .minerva-root .my-md-n5 { margin-bottom: -3rem !important; }
  .minerva-root .ml-md-n5, .minerva-root .mx-md-n5 { margin-left: -3rem !important; }
  .minerva-root .m-md-auto { margin: auto !important; }
  .minerva-root .mt-md-auto, .minerva-root .my-md-auto { margin-top: auto !important; }
  .minerva-root .mr-md-auto, .minerva-root .mx-md-auto { margin-right: auto !important; }
  .minerva-root .mb-md-auto, .minerva-root .my-md-auto { margin-bottom: auto !important; }
  .minerva-root .ml-md-auto, .minerva-root .mx-md-auto { margin-left: auto !important; } }
@media (min-width: 992px) { .minerva-root .m-lg-0 { margin: 0 !important; }
  .minerva-root .mt-lg-0, .minerva-root .my-lg-0 { margin-top: 0 !important; }
  .minerva-root .mr-lg-0, .minerva-root .mx-lg-0 { margin-right: 0 !important; }
  .minerva-root .mb-lg-0, .minerva-root .my-lg-0 { margin-bottom: 0 !important; }
  .minerva-root .ml-lg-0, .minerva-root .mx-lg-0 { margin-left: 0 !important; }
  .minerva-root .m-lg-1 { margin: 0.25rem !important; }
  .minerva-root .mt-lg-1, .minerva-root .my-lg-1 { margin-top: 0.25rem !important; }
  .minerva-root .mr-lg-1, .minerva-root .mx-lg-1 { margin-right: 0.25rem !important; }
  .minerva-root .mb-lg-1, .minerva-root .my-lg-1 { margin-bottom: 0.25rem !important; }
  .minerva-root .ml-lg-1, .minerva-root .mx-lg-1 { margin-left: 0.25rem !important; }
  .minerva-root .m-lg-2 { margin: 0.5rem !important; }
  .minerva-root .mt-lg-2, .minerva-root .my-lg-2 { margin-top: 0.5rem !important; }
  .minerva-root .mr-lg-2, .minerva-root .mx-lg-2 { margin-right: 0.5rem !important; }
  .minerva-root .mb-lg-2, .minerva-root .my-lg-2 { margin-bottom: 0.5rem !important; }
  .minerva-root .ml-lg-2, .minerva-root .mx-lg-2 { margin-left: 0.5rem !important; }
  .minerva-root .m-lg-3 { margin: 1rem !important; }
  .minerva-root .mt-lg-3, .minerva-root .my-lg-3 { margin-top: 1rem !important; }
  .minerva-root .mr-lg-3, .minerva-root .mx-lg-3 { margin-right: 1rem !important; }
  .minerva-root .mb-lg-3, .minerva-root .my-lg-3 { margin-bottom: 1rem !important; }
  .minerva-root .ml-lg-3, .minerva-root .mx-lg-3 { margin-left: 1rem !important; }
  .minerva-root .m-lg-4 { margin: 1.5rem !important; }
  .minerva-root .mt-lg-4, .minerva-root .my-lg-4 { margin-top: 1.5rem !important; }
  .minerva-root .mr-lg-4, .minerva-root .mx-lg-4 { margin-right: 1.5rem !important; }
  .minerva-root .mb-lg-4, .minerva-root .my-lg-4 { margin-bottom: 1.5rem !important; }
  .minerva-root .ml-lg-4, .minerva-root .mx-lg-4 { margin-left: 1.5rem !important; }
  .minerva-root .m-lg-5 { margin: 3rem !important; }
  .minerva-root .mt-lg-5, .minerva-root .my-lg-5 { margin-top: 3rem !important; }
  .minerva-root .mr-lg-5, .minerva-root .mx-lg-5 { margin-right: 3rem !important; }
  .minerva-root .mb-lg-5, .minerva-root .my-lg-5 { margin-bottom: 3rem !important; }
  .minerva-root .ml-lg-5, .minerva-root .mx-lg-5 { margin-left: 3rem !important; }
  .minerva-root .p-lg-0 { padding: 0 !important; }
  .minerva-root .pt-lg-0, .minerva-root .py-lg-0 { padding-top: 0 !important; }
  .minerva-root .pr-lg-0, .minerva-root .px-lg-0 { padding-right: 0 !important; }
  .minerva-root .pb-lg-0, .minerva-root .py-lg-0 { padding-bottom: 0 !important; }
  .minerva-root .pl-lg-0, .minerva-root .px-lg-0 { padding-left: 0 !important; }
  .minerva-root .p-lg-1 { padding: 0.25rem !important; }
  .minerva-root .pt-lg-1, .minerva-root .py-lg-1 { padding-top: 0.25rem !important; }
  .minerva-root .pr-lg-1, .minerva-root .px-lg-1 { padding-right: 0.25rem !important; }
  .minerva-root .pb-lg-1, .minerva-root .py-lg-1 { padding-bottom: 0.25rem !important; }
  .minerva-root .pl-lg-1, .minerva-root .px-lg-1 { padding-left: 0.25rem !important; }
  .minerva-root .p-lg-2 { padding: 0.5rem !important; }
  .minerva-root .pt-lg-2, .minerva-root .py-lg-2 { padding-top: 0.5rem !important; }
  .minerva-root .pr-lg-2, .minerva-root .px-lg-2 { padding-right: 0.5rem !important; }
  .minerva-root .pb-lg-2, .minerva-root .py-lg-2 { padding-bottom: 0.5rem !important; }
  .minerva-root .pl-lg-2, .minerva-root .px-lg-2 { padding-left: 0.5rem !important; }
  .minerva-root .p-lg-3 { padding: 1rem !important; }
  .minerva-root .pt-lg-3, .minerva-root .py-lg-3 { padding-top: 1rem !important; }
  .minerva-root .pr-lg-3, .minerva-root .px-lg-3 { padding-right: 1rem !important; }
  .minerva-root .pb-lg-3, .minerva-root .py-lg-3 { padding-bottom: 1rem !important; }
  .minerva-root .pl-lg-3, .minerva-root .px-lg-3 { padding-left: 1rem !important; }
  .minerva-root .p-lg-4 { padding: 1.5rem !important; }
  .minerva-root .pt-lg-4, .minerva-root .py-lg-4 { padding-top: 1.5rem !important; }
  .minerva-root .pr-lg-4, .minerva-root .px-lg-4 { padding-right: 1.5rem !important; }
  .minerva-root .pb-lg-4, .minerva-root .py-lg-4 { padding-bottom: 1.5rem !important; }
  .minerva-root .pl-lg-4, .minerva-root .px-lg-4 { padding-left: 1.5rem !important; }
  .minerva-root .p-lg-5 { padding: 3rem !important; }
  .minerva-root .pt-lg-5, .minerva-root .py-lg-5 { padding-top: 3rem !important; }
  .minerva-root .pr-lg-5, .minerva-root .px-lg-5 { padding-right: 3rem !important; }
  .minerva-root .pb-lg-5, .minerva-root .py-lg-5 { padding-bottom: 3rem !important; }
  .minerva-root .pl-lg-5, .minerva-root .px-lg-5 { padding-left: 3rem !important; }
  .minerva-root .m-lg-n1 { margin: -0.25rem !important; }
  .minerva-root .mt-lg-n1, .minerva-root .my-lg-n1 { margin-top: -0.25rem !important; }
  .minerva-root .mr-lg-n1, .minerva-root .mx-lg-n1 { margin-right: -0.25rem !important; }
  .minerva-root .mb-lg-n1, .minerva-root .my-lg-n1 { margin-bottom: -0.25rem !important; }
  .minerva-root .ml-lg-n1, .minerva-root .mx-lg-n1 { margin-left: -0.25rem !important; }
  .minerva-root .m-lg-n2 { margin: -0.5rem !important; }
  .minerva-root .mt-lg-n2, .minerva-root .my-lg-n2 { margin-top: -0.5rem !important; }
  .minerva-root .mr-lg-n2, .minerva-root .mx-lg-n2 { margin-right: -0.5rem !important; }
  .minerva-root .mb-lg-n2, .minerva-root .my-lg-n2 { margin-bottom: -0.5rem !important; }
  .minerva-root .ml-lg-n2, .minerva-root .mx-lg-n2 { margin-left: -0.5rem !important; }
  .minerva-root .m-lg-n3 { margin: -1rem !important; }
  .minerva-root .mt-lg-n3, .minerva-root .my-lg-n3 { margin-top: -1rem !important; }
  .minerva-root .mr-lg-n3, .minerva-root .mx-lg-n3 { margin-right: -1rem !important; }
  .minerva-root .mb-lg-n3, .minerva-root .my-lg-n3 { margin-bottom: -1rem !important; }
  .minerva-root .ml-lg-n3, .minerva-root .mx-lg-n3 { margin-left: -1rem !important; }
  .minerva-root .m-lg-n4 { margin: -1.5rem !important; }
  .minerva-root .mt-lg-n4, .minerva-root .my-lg-n4 { margin-top: -1.5rem !important; }
  .minerva-root .mr-lg-n4, .minerva-root .mx-lg-n4 { margin-right: -1.5rem !important; }
  .minerva-root .mb-lg-n4, .minerva-root .my-lg-n4 { margin-bottom: -1.5rem !important; }
  .minerva-root .ml-lg-n4, .minerva-root .mx-lg-n4 { margin-left: -1.5rem !important; }
  .minerva-root .m-lg-n5 { margin: -3rem !important; }
  .minerva-root .mt-lg-n5, .minerva-root .my-lg-n5 { margin-top: -3rem !important; }
  .minerva-root .mr-lg-n5, .minerva-root .mx-lg-n5 { margin-right: -3rem !important; }
  .minerva-root .mb-lg-n5, .minerva-root .my-lg-n5 { margin-bottom: -3rem !important; }
  .minerva-root .ml-lg-n5, .minerva-root .mx-lg-n5 { margin-left: -3rem !important; }
  .minerva-root .m-lg-auto { margin: auto !important; }
  .minerva-root .mt-lg-auto, .minerva-root .my-lg-auto { margin-top: auto !important; }
  .minerva-root .mr-lg-auto, .minerva-root .mx-lg-auto { margin-right: auto !important; }
  .minerva-root .mb-lg-auto, .minerva-root .my-lg-auto { margin-bottom: auto !important; }
  .minerva-root .ml-lg-auto, .minerva-root .mx-lg-auto { margin-left: auto !important; } }
@media (min-width: 1200px) { .minerva-root .m-xl-0 { margin: 0 !important; }
  .minerva-root .mt-xl-0, .minerva-root .my-xl-0 { margin-top: 0 !important; }
  .minerva-root .mr-xl-0, .minerva-root .mx-xl-0 { margin-right: 0 !important; }
  .minerva-root .mb-xl-0, .minerva-root .my-xl-0 { margin-bottom: 0 !important; }
  .minerva-root .ml-xl-0, .minerva-root .mx-xl-0 { margin-left: 0 !important; }
  .minerva-root .m-xl-1 { margin: 0.25rem !important; }
  .minerva-root .mt-xl-1, .minerva-root .my-xl-1 { margin-top: 0.25rem !important; }
  .minerva-root .mr-xl-1, .minerva-root .mx-xl-1 { margin-right: 0.25rem !important; }
  .minerva-root .mb-xl-1, .minerva-root .my-xl-1 { margin-bottom: 0.25rem !important; }
  .minerva-root .ml-xl-1, .minerva-root .mx-xl-1 { margin-left: 0.25rem !important; }
  .minerva-root .m-xl-2 { margin: 0.5rem !important; }
  .minerva-root .mt-xl-2, .minerva-root .my-xl-2 { margin-top: 0.5rem !important; }
  .minerva-root .mr-xl-2, .minerva-root .mx-xl-2 { margin-right: 0.5rem !important; }
  .minerva-root .mb-xl-2, .minerva-root .my-xl-2 { margin-bottom: 0.5rem !important; }
  .minerva-root .ml-xl-2, .minerva-root .mx-xl-2 { margin-left: 0.5rem !important; }
  .minerva-root .m-xl-3 { margin: 1rem !important; }
  .minerva-root .mt-xl-3, .minerva-root .my-xl-3 { margin-top: 1rem !important; }
  .minerva-root .mr-xl-3, .minerva-root .mx-xl-3 { margin-right: 1rem !important; }
  .minerva-root .mb-xl-3, .minerva-root .my-xl-3 { margin-bottom: 1rem !important; }
  .minerva-root .ml-xl-3, .minerva-root .mx-xl-3 { margin-left: 1rem !important; }
  .minerva-root .m-xl-4 { margin: 1.5rem !important; }
  .minerva-root .mt-xl-4, .minerva-root .my-xl-4 { margin-top: 1.5rem !important; }
  .minerva-root .mr-xl-4, .minerva-root .mx-xl-4 { margin-right: 1.5rem !important; }
  .minerva-root .mb-xl-4, .minerva-root .my-xl-4 { margin-bottom: 1.5rem !important; }
  .minerva-root .ml-xl-4, .minerva-root .mx-xl-4 { margin-left: 1.5rem !important; }
  .minerva-root .m-xl-5 { margin: 3rem !important; }
  .minerva-root .mt-xl-5, .minerva-root .my-xl-5 { margin-top: 3rem !important; }
  .minerva-root .mr-xl-5, .minerva-root .mx-xl-5 { margin-right: 3rem !important; }
  .minerva-root .mb-xl-5, .minerva-root .my-xl-5 { margin-bottom: 3rem !important; }
  .minerva-root .ml-xl-5, .minerva-root .mx-xl-5 { margin-left: 3rem !important; }
  .minerva-root .p-xl-0 { padding: 0 !important; }
  .minerva-root .pt-xl-0, .minerva-root .py-xl-0 { padding-top: 0 !important; }
  .minerva-root .pr-xl-0, .minerva-root .px-xl-0 { padding-right: 0 !important; }
  .minerva-root .pb-xl-0, .minerva-root .py-xl-0 { padding-bottom: 0 !important; }
  .minerva-root .pl-xl-0, .minerva-root .px-xl-0 { padding-left: 0 !important; }
  .minerva-root .p-xl-1 { padding: 0.25rem !important; }
  .minerva-root .pt-xl-1, .minerva-root .py-xl-1 { padding-top: 0.25rem !important; }
  .minerva-root .pr-xl-1, .minerva-root .px-xl-1 { padding-right: 0.25rem !important; }
  .minerva-root .pb-xl-1, .minerva-root .py-xl-1 { padding-bottom: 0.25rem !important; }
  .minerva-root .pl-xl-1, .minerva-root .px-xl-1 { padding-left: 0.25rem !important; }
  .minerva-root .p-xl-2 { padding: 0.5rem !important; }
  .minerva-root .pt-xl-2, .minerva-root .py-xl-2 { padding-top: 0.5rem !important; }
  .minerva-root .pr-xl-2, .minerva-root .px-xl-2 { padding-right: 0.5rem !important; }
  .minerva-root .pb-xl-2, .minerva-root .py-xl-2 { padding-bottom: 0.5rem !important; }
  .minerva-root .pl-xl-2, .minerva-root .px-xl-2 { padding-left: 0.5rem !important; }
  .minerva-root .p-xl-3 { padding: 1rem !important; }
  .minerva-root .pt-xl-3, .minerva-root .py-xl-3 { padding-top: 1rem !important; }
  .minerva-root .pr-xl-3, .minerva-root .px-xl-3 { padding-right: 1rem !important; }
  .minerva-root .pb-xl-3, .minerva-root .py-xl-3 { padding-bottom: 1rem !important; }
  .minerva-root .pl-xl-3, .minerva-root .px-xl-3 { padding-left: 1rem !important; }
  .minerva-root .p-xl-4 { padding: 1.5rem !important; }
  .minerva-root .pt-xl-4, .minerva-root .py-xl-4 { padding-top: 1.5rem !important; }
  .minerva-root .pr-xl-4, .minerva-root .px-xl-4 { padding-right: 1.5rem !important; }
  .minerva-root .pb-xl-4, .minerva-root .py-xl-4 { padding-bottom: 1.5rem !important; }
  .minerva-root .pl-xl-4, .minerva-root .px-xl-4 { padding-left: 1.5rem !important; }
  .minerva-root .p-xl-5 { padding: 3rem !important; }
  .minerva-root .pt-xl-5, .minerva-root .py-xl-5 { padding-top: 3rem !important; }
  .minerva-root .pr-xl-5, .minerva-root .px-xl-5 { padding-right: 3rem !important; }
  .minerva-root .pb-xl-5, .minerva-root .py-xl-5 { padding-bottom: 3rem !important; }
  .minerva-root .pl-xl-5, .minerva-root .px-xl-5 { padding-left: 3rem !important; }
  .minerva-root .m-xl-n1 { margin: -0.25rem !important; }
  .minerva-root .mt-xl-n1, .minerva-root .my-xl-n1 { margin-top: -0.25rem !important; }
  .minerva-root .mr-xl-n1, .minerva-root .mx-xl-n1 { margin-right: -0.25rem !important; }
  .minerva-root .mb-xl-n1, .minerva-root .my-xl-n1 { margin-bottom: -0.25rem !important; }
  .minerva-root .ml-xl-n1, .minerva-root .mx-xl-n1 { margin-left: -0.25rem !important; }
  .minerva-root .m-xl-n2 { margin: -0.5rem !important; }
  .minerva-root .mt-xl-n2, .minerva-root .my-xl-n2 { margin-top: -0.5rem !important; }
  .minerva-root .mr-xl-n2, .minerva-root .mx-xl-n2 { margin-right: -0.5rem !important; }
  .minerva-root .mb-xl-n2, .minerva-root .my-xl-n2 { margin-bottom: -0.5rem !important; }
  .minerva-root .ml-xl-n2, .minerva-root .mx-xl-n2 { margin-left: -0.5rem !important; }
  .minerva-root .m-xl-n3 { margin: -1rem !important; }
  .minerva-root .mt-xl-n3, .minerva-root .my-xl-n3 { margin-top: -1rem !important; }
  .minerva-root .mr-xl-n3, .minerva-root .mx-xl-n3 { margin-right: -1rem !important; }
  .minerva-root .mb-xl-n3, .minerva-root .my-xl-n3 { margin-bottom: -1rem !important; }
  .minerva-root .ml-xl-n3, .minerva-root .mx-xl-n3 { margin-left: -1rem !important; }
  .minerva-root .m-xl-n4 { margin: -1.5rem !important; }
  .minerva-root .mt-xl-n4, .minerva-root .my-xl-n4 { margin-top: -1.5rem !important; }
  .minerva-root .mr-xl-n4, .minerva-root .mx-xl-n4 { margin-right: -1.5rem !important; }
  .minerva-root .mb-xl-n4, .minerva-root .my-xl-n4 { margin-bottom: -1.5rem !important; }
  .minerva-root .ml-xl-n4, .minerva-root .mx-xl-n4 { margin-left: -1.5rem !important; }
  .minerva-root .m-xl-n5 { margin: -3rem !important; }
  .minerva-root .mt-xl-n5, .minerva-root .my-xl-n5 { margin-top: -3rem !important; }
  .minerva-root .mr-xl-n5, .minerva-root .mx-xl-n5 { margin-right: -3rem !important; }
  .minerva-root .mb-xl-n5, .minerva-root .my-xl-n5 { margin-bottom: -3rem !important; }
  .minerva-root .ml-xl-n5, .minerva-root .mx-xl-n5 { margin-left: -3rem !important; }
  .minerva-root .m-xl-auto { margin: auto !important; }
  .minerva-root .mt-xl-auto, .minerva-root .my-xl-auto { margin-top: auto !important; }
  .minerva-root .mr-xl-auto, .minerva-root .mx-xl-auto { margin-right: auto !important; }
  .minerva-root .mb-xl-auto, .minerva-root .my-xl-auto { margin-bottom: auto !important; }
  .minerva-root .ml-xl-auto, .minerva-root .mx-xl-auto { margin-left: auto !important; } }
.minerva-root .text-monospace { font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
.minerva-root .text-justify { text-align: justify !important; }
.minerva-root .text-wrap { white-space: normal !important; }
.minerva-root .text-nowrap { white-space: nowrap !important; }
.minerva-root .text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.minerva-root .text-left { text-align: left !important; }
.minerva-root .text-right { text-align: right !important; }
.minerva-root .text-center { text-align: center !important; }
@media (min-width: 576px) { .minerva-root .text-sm-left { text-align: left !important; }
  .minerva-root .text-sm-right { text-align: right !important; }
  .minerva-root .text-sm-center { text-align: center !important; } }
@media (min-width: 768px) { .minerva-root .text-md-left { text-align: left !important; }
  .minerva-root .text-md-right { text-align: right !important; }
  .minerva-root .text-md-center { text-align: center !important; } }
@media (min-width: 992px) { .minerva-root .text-lg-left { text-align: left !important; }
  .minerva-root .text-lg-right { text-align: right !important; }
  .minerva-root .text-lg-center { text-align: center !important; } }
@media (min-width: 1200px) { .minerva-root .text-xl-left { text-align: left !important; }
  .minerva-root .text-xl-right { text-align: right !important; }
  .minerva-root .text-xl-center { text-align: center !important; } }
.minerva-root .text-lowercase { text-transform: lowercase !important; }
.minerva-root .text-uppercase { text-transform: uppercase !important; }
.minerva-root .text-capitalize { text-transform: capitalize !important; }
.minerva-root .font-weight-light { font-weight: 300 !important; }
.minerva-root .font-weight-lighter { font-weight: lighter !important; }
.minerva-root .font-weight-normal { font-weight: 400 !important; }
.minerva-root .font-weight-bold { font-weight: 700 !important; }
.minerva-root .font-weight-bolder { font-weight: bolder !important; }
.minerva-root .font-italic { font-style: italic !important; }
.minerva-root .text-white { color: #fff !important; }
.minerva-root .text-primary { color: #007bff !important; }
.minerva-root a.text-primary:hover, .minerva-root a.text-primary:focus { color: #0056b3 !important; }
.minerva-root .text-secondary { color: #6c757d !important; }
.minerva-root a.text-secondary:hover, .minerva-root a.text-secondary:focus { color: #494f54 !important; }
.minerva-root .text-success { color: #28a745 !important; }
.minerva-root a.text-success:hover, .minerva-root a.text-success:focus { color: #19692c !important; }
.minerva-root .text-info { color: #17a2b8 !important; }
.minerva-root a.text-info:hover, .minerva-root a.text-info:focus { color: #0f6674 !important; }
.minerva-root .text-warning { color: #ffc107 !important; }
.minerva-root a.text-warning:hover, .minerva-root a.text-warning:focus { color: #ba8b00 !important; }
.minerva-root .text-danger { color: #dc3545 !important; }
.minerva-root a.text-danger:hover, .minerva-root a.text-danger:focus { color: #a71d2a !important; }
.minerva-root .text-light { color: #f8f9fa !important; }
.minerva-root a.text-light:hover, .minerva-root a.text-light:focus { color: #cbd3da !important; }
.minerva-root .text-dark { color: #343a40 !important; }
.minerva-root a.text-dark:hover, .minerva-root a.text-dark:focus { color: #121416 !important; }
.minerva-root .text-body { color: #212529 !important; }
.minerva-root .text-muted { color: #6c757d !important; }
.minerva-root .text-black-50 { color: rgba(0, 0, 0, 0.5) !important; }
.minerva-root .text-white-50 { color: rgba(255, 255, 255, 0.5) !important; }
.minerva-root .text-hide { font: 0/0 a; color: transparent; text-shadow: none; background-color: transparent; border: 0; }
.minerva-root .text-decoration-none { text-decoration: none !important; }
.minerva-root .text-break { word-break: break-word !important; overflow-wrap: break-word !important; }
.minerva-root .text-reset { color: inherit !important; }
.minerva-root .visible { visibility: visible !important; }
.minerva-root .invisible { visibility: hidden !important; }
@media print { .minerva-root *, .minerva-root *::before, .minerva-root *::after { text-shadow: none !important; box-shadow: none !important; }
  .minerva-root a:not(.btn) { text-decoration: underline; }
  .minerva-root abbr[title]::after { content: " (" attr(title) ")"; }
  .minerva-root pre { white-space: pre-wrap !important; }
  .minerva-root pre, .minerva-root blockquote { border: 1px solid #adb5bd; page-break-inside: avoid; }
  .minerva-root thead { display: table-header-group; }
  .minerva-root tr, .minerva-root img { page-break-inside: avoid; }
  .minerva-root p, .minerva-root h2, .minerva-root h3 { orphans: 3; widows: 3; }
  .minerva-root h2, .minerva-root h3 { page-break-after: avoid; }
  @page { .minerva-root { size: a3; } }
  .minerva-root body { min-width: 992px !important; }
  .minerva-root .container { min-width: 992px !important; }
  .minerva-root .navbar { display: none; }
  .minerva-root .badge { border: 1px solid #000; }
  .minerva-root .table { border-collapse: collapse !important; }
  .minerva-root .table td, .minerva-root .table th { background-color: #fff !important; }
  .minerva-root .table-bordered th, .minerva-root .table-bordered td { border: 1px solid #dee2e6 !important; }
  .minerva-root .table-dark { color: inherit; }
  .minerva-root .table-dark th, .minerva-root .table-dark td, .minerva-root .table-dark thead th, .minerva-root .table-dark tbody + tbody { border-color: #dee2e6; }
  .minerva-root .table .thead-dark th { color: inherit; border-color: #dee2e6; } }
.minerva-root h1, .minerva-root h2, .minerva-root h3, .minerva-root h4, .minerva-root h5, .minerva-root h6, .minerva-root .h1, .minerva-root .h2, .minerva-root .h3, .minerva-root .h4, .minerva-root .h5, .minerva-root .h6 { margin-top: 3.75rem; }
.minerva-root svg a:hover text { text-decoration: underline; fill: #0fabff; }
.minerva-root .banner-text-container, .minerva-root .banner-tall { background-color: rgba(0, 0, 0, 0.3); }
.minerva-root .banner-tall { min-height: 75vh; }
@media (max-width: 767.98px) { .minerva-root .banner-tall { min-height: auto; } }
@media (max-width: 575.98px) { .minerva-root .display-4 { font-size: 2rem; margin-top: 1rem; } }
.minerva-root .select2-results ul { color: black; }

.minerva-root {
  display: grid; 
  grid-template-columns: 1fr; 
  grid-template-rows: 1fr; 
  grid-column-gap: 0px;
  grid-row-gap: 0px; 
  height: 100%;
  width: 100%;
}

.minerva-root > div {
  grid-area: 1 / 1 / 2 / 2;
}

.minerva-root .minerva-toggle-sidebar {
  color: #eee;
}

.minerva-root .minerva-toggle-sidebar:hover {
  color: #eee;
}

.minerva-root {
  scrollbar-face-color: #646464;
  scrollbar-base-color: #646464;
  scrollbar-3dlight-color: #646464;
  scrollbar-highlight-color: #646464;
  scrollbar-track-color: #000;
  scrollbar-arrow-color: #000;
  scrollbar-shadow-color: #646464;
  scrollbar-dark-shadow-color: #646464;
}
.minerva-root ::-webkit-scrollbar { 
  width: 8px;
  height: 3px;
}
.minerva-root ::-webkit-scrollbar-button {
  background-color: #666;
}
.minerva-root ::-webkit-scrollbar-track {
  background-color: #646464;
}
.minerva-root ::-webkit-scrollbar-track-piece {
  background-color: #000;
}
.minerva-root ::-webkit-scrollbar-thumb {
  height: 50px;
  background-color: #666;
  border-radius: 3px;
}
.minerva-root ::-webkit-scrollbar-corner {
  background-color: #646464;
}
.minerva-root ::-webkit-resizer {
  background-color: #666;
}

.minerva-root .minerva-sidebar-menu {
  -webkit-transition: all 0.5s ease;
  -moz-transition: all 0.5s ease;
  -o-transition: all 0.5s ease;
  transition: all 0.5s ease;
  margin-left: 0px;
  width: 400px;
  left: 3px;
  top: 1rem;
}

.minerva-root .minerva-sidebar-menu.minimal {
  margin-left: -314px;
}

.minerva-root .minerva-sidebar-menu.toggled {
  margin-left: -366px;
}

.minerva-root .minerva-legend {
  -webkit-transition: all 0.5s ease;
  -moz-transition: all 0.5s ease;
  -o-transition: all 0.5s ease;
  transition: all 0.5s ease;
}

.minerva-root input[type="range"] {
  transform-origin: left;
  transform: rotate(270deg);
}

.minerva-root .minerva-z-slider-legend {
  padding-top: 127px;
  padding-left: 7px;
  height: 140px;
  width: 15px;
}

.minerva-root .minerva-channel-groups-legend {
  width: 200px;
}

.minerva-root .minerva-legend.toggled .btn-group-vertical {
  display: none !important;
}

.minerva-root .minerva-legend.toggled .minerva-channel-groups-legend {
  display: none !important;
}

.minerva-root .minerva-sidebar-menu .minerva-open-sidebar {
  display: none;
}
.minerva-root .minerva-sidebar-menu .minerva-close-sidebar {
  display: inline;
}
.minerva-root .minerva-sidebar-menu.toggled .minerva-open-sidebar {
  display: inline;
}
.minerva-root .minerva-sidebar-menu.toggled .minerva-close-sidebar {
  display: none;
}

.minerva-root .minerva-legend .minerva-open-legend {
  display: none;
}
.minerva-root .minerva-legend .minerva-close-legend {
  display: inline;
}
.minerva-root .minerva-legend.toggled .minerva-open-legend {
  display: inline;
}
.minerva-root .minerva-legend.toggled .minerva-close-legend {
  display: none;
} 
/* position: absolute; top: 0; bottom: 0; width: 100%; */
.minerva-root .minerva-openseadragon {
  /* position: absolute;
  top: 0;
  left: 0;
  bottom: 0; */
  width: 100%;
  height: 100%;
  pointer-events: fill;
  /* border: 1px solid #444; */
}

.minerva-root .openseadragon-canvas canvas {
  z-index: -2;
}

.minerva-root .openseadragon-canvas svg {
  z-index: -1;
}

.minerva-root .overlap {
  position: relative;
  pointer-events: none;
}

.minerva-root .btn:focus, .minerva-root .btn:active {
  outline: none !important;
  box-shadow: none !important;
}

.minerva-root a, .minerva-root .navbar-toggler {
  pointer-events: auto;
}

.minerva-root .bg-trans {
    background: hsla(0, 0%, 0%, 0.8);
}

.minerva-root .bg-black {
    background: #000;
}

.minerva-root .legend-label {
    display: inline-block;
    min-width: 4.5em;
}

.minerva-root .legend-color {
    margin-left: 0.5em;
    width: 1.5em;
    border-radius: 0;
    vertical-align: middle;
}

.minerva-root .minerva-overlay-title {
    color: white;
    text-align: center;
}

.minerva-root .nav-color-dark {
    color:  #495057 !important;
}
.minerva-root .minerva-green {
    color: palegreen;
}
.minerva-root .minerva-white {
    color: white;
}
.minerva-root .minerva-white.minerva-overlay {
    border: 2px solid white;
    background: none;
}
.minerva-root .minerva-green.minerva-overlay {
    border: 4px solid palegreen;
    background: none;
}

.minerva-root .right-padding {
    padding: .5rem 1rem;
}

.minerva-root .minerva-waypoint-content code {
    color: inherit;
}

.minerva-root .minerva-waypoint-content img {
    max-width: 100%;
}
.minerva-root .minerva-waypoint-content h1 {
    font-size: 1.25rem;
    margin: 0 0 1rem 0;
}
.minerva-root .minerva-waypoint-content h2 {
    font-size: 1.25rem;
    margin: 0 0 1rem 0;
}
.minerva-root .minerva-waypoint-content h3 {
    font-size: 1.1rem;
    margin: 0 0 1rem 0;
}
.minerva-root .minerva-waypoint-content h4 {
    font-size: 1.1rem;
    margin: 0 0 1rem 0;
}
.minerva-root .minerva-waypoint-content h5 {
    font-size: 1rem;
    margin: 0 0 1rem 0;
}
.minerva-root .minerva-waypoint-content h6 {
    font-size: 1rem;
    margin: 0 0 1rem 0;
}

.minerva-root .minerva-waypoint-content .edit_code {
    font-family: monospace;
}

.minerva-root .minerva-waypoint-content .copy_yaml_input {
    position: absolute;
    z-index: 100;
    bottom: 0;
    right: 0;
}

.minerva-root .copy_yaml_input button {
    background-color: black; 
    /* border: 1px solid white; */
    /* padding: 0 5px 0 5px; */
    pointer-events: all;
    /* margin-left: 5px; */
    height: 100%;
    color: white; 
}

.minerva-root .channel-picker {
    border-style: solid;
    border-color: hsl(0, 0%, 70%);
    border-width: 1px 0;
}

.minerva-root .channel-picker:first-child {
    border-left-width: 1px;
}

.minerva-root .channel-picker:last-child {
    border-right-width: 1px;
}

.minerva-root .openseadragon-canvas polygon {
    fill: rgba(70, 130, 180, 0.0);
    stroke: white;
    stroke-width: 2px;
    vector-effect: non-scaling-stroke;
}

.minerva-root .matrix-label {
    font-size: 10px;
    color: white;
    fill : white;
}

.minerva-root .matrix-row-label {
    font-size: 10px;
    color: white;
    fill : white;
}

.minerva-root .colorLegend {
    font-size: 8px;
    color: white;
    fill : white;
}

body {
  margin: 0;
  height: 100vh;
  background-color: black;
  /* mobile viewport bug fix */
  height: -webkit-fill-available;
}

body .tooltip {
    position: absolute;
    margin-top: 3px;
    text-align: center;
    width: 60px;
    height: 28px;
    padding: 2px;
    font: 12px sans-serif;
    background: black;
    color: white;
    border: 0px;
    border-radius: 5px;
    pointer-events: none;
}

.minerva-root .bar {
    fill: steelblue;
}

.minerva-root .bar:hover {
    fill: #a6cee3;
}

.minerva-root .axis--x path {
    display: none;
}
`

const exhibitHTML = `
<div class="minerva-root">
    <div>
        <div class="minerva-openseadragon"></div>
    </div>
    <div>
        <div class="minerva-legend position-absolute"
             style="pointer-events: none; top: 1rem; right: 8px">
             <div>
              <a class="minerva-toggle-legend p-1" href="javascript;;">
                <i class="minerva-open-legend fas fa-chevron-left" style="font-size: 25px;"></i>
                <i class="minerva-close-legend fas fa-chevron-right" style="font-size: 25px;"></i>
              </a>
              <div class="btn-group-vertical bg-trans p-2"
                    style="display:inline-block; vertical-align:top;">
                   <ul class="minerva-channel-legend list-unstyled m-0"></ul>
                   <div class="p-1 minerva-only-3d">
                     Depth:
                   </div>
                   <div style="text-align: right;">
                     <span class="minerva-depth-legend"> </span>
                   </div>
               </div> 
                <div class="minerva-channel-groups-legend nav flex-column nav-pills p-2 bg-trans"
                     style="display:inline-block; vertical-align:top;
                     pointer-events: all; overflow-y: scroll; max-height: 80vh;">
                </div>
                <div class="minerva-z-slider-legend bg-trans"
                     style="pointer-events: all; display:inline-block; vertical-align:top;">
                    <input class="minerva-z-slider" type="range"/>
                </div>
            </div>
        </div>
        <div class="minerva-sidebar-menu container position-absolute">
            <div class="row">
                <div class="col-11 bg-trans minerva-waypoint-content p-3" style="max-height: 80vh; overflow-y: scroll">
                    <div class="row">
                        <div class="col-10">
                            <h3 class="minerva-imageName m-0"></h3>
                        </div>
                        <div class="col-2">
                            <a class="btn text-light d-none minerva-home-button"
                                href="/">
                                <i class="fas fa-home"></i>
                            </a>
                            <a class="btn text-light d-none minerva-toc-button">
                                <i class="fas fa-list-ul"></i>
                            </a>
                        </div>
                    </div>
                    <hr class="my-1">
                    <div class="minerva-waypointControls row align-items-center my-1">
                        <div class="col-2 text-center minerva-leftArrow">
                            <i class="fas fa-arrow-left" style="font-size: 25px"></i>
                        </div>
                        <div class="col-8">
                          <div class="minerva-audioControls">
                            <audio style="height: 25px; width:100%" class="minerva-audioPlayback" controls>
                              <source class="minerva-audioSource" type="audio/mp3" src="">
                            </audio> 
                          </div>
                        </div>
                        <div class="col-2 text-center minerva-rightArrow">
                            <i class="fas fa-arrow-right" style="font-size: 25px;"></i>
                        </div>
                    </div>
                    <div class="row">
                        <div class="minerva-waypointName col-10 h6 mt-0 mb-3">
                        </div>
                        <div class="minerva-waypointCount col-2"></div>
                    </div>
                    <div class="minerva-viewer-waypoint">
                    </div>
                    <div>
                        <p class="minerva-channel-label mb-1 font-weight-bold pt-2">Select a marker group:</p>
                        <select class="minerva-group-picker minerva-editControls selectpicker" multiple>
                        </select>
                        <div class="minerva-channel-groups nav flex nav-pills"></div>
                        <p class="minerva-mask-label mb-1 font-weight-bold pt-2">Add data layer:</p>
                        <select class="minerva-mask-picker minerva-editControls selectpicker" multiple>
                        </select>
                        <div class="minerva-mask-layers nav flex nav-pills">
                        </div>
                    </div>
                    <div>
                        <div class="minerva-story-container"></div>
                    </div>
                </div>
                <div class="col-1 p-0">
                    <div class="btn-group-vertical bg-trans"> 
                        <a class="minerva-toggle-sidebar btn" href="javascript;;">
                            <i class="minerva-close-sidebar fas fa-chevron-left" style="font-size: 25px;"></i>
                            <i class="minerva-open-sidebar fas fa-chevron-right" style="font-size: 25px;"></i>
                        </a>
                    </div> 
                    <div class="btn-group-vertical bg-trans">
                        <a class="btn text-light minerva-zoom-out" href="javascript;;">
                            <i class="fas fa-search-minus"></i>
                        </a>
                        <a class="btn text-light minerva-zoom-in" href="javascript;;">
                            <i class="fas fa-search-plus"></i>
                        </a>
                        <span class="nav-item minerva-arrow-switch">
                        <a class="btn" href="javascript:;">
                            <span class=""><i class="fas fa-location-arrow"></i></span>
                        </a>
                        </span>
                        <span class="nav-item minerva-lasso-switch">
                        <a class="btn" href="javascript:;">
                            <span class=""><i class="fas fa-bullseye"></i></span>
                        </a>
                        </span>
                        <span class="nav-item minerva-draw-switch">
                        <a class="btn" href="javascript:;">
                            <span class=""><i class="fas fa-crosshairs"></i></span>
                        </a>
                        </span>
                        <a class="btn minerva-duplicate-view">
                            <span class=""><i class="fas fa-clone"></i></span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div>
        <div class="d-none">
            <div class="minerva-arrow-overlay">
              <div class="minerva-arrowhead-image">
                <?xml version="1.0" encoding="UTF-8" standalone="no"?>

    <svg
       xmlns:dc="http://purl.org/dc/elements/1.1/"
       xmlns:cc="http://creativecommons.org/ns#"
       xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
       xmlns:svg="http://www.w3.org/2000/svg"
       xmlns="http://www.w3.org/2000/svg"
       xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
       xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
       width="48"
       height="51.69223"
       viewBox="0 0 12.711991 13.676902"
       version="1.1"
       id="svg8"
       inkscape:version="0.92.2 5c3e80d, 2017-08-06"
       sodipodi:docname="arrowhead.svg">
      <defs
         id="defs2" />
      <sodipodi:namedview
         id="base"
         pagecolor="#ffffff"
         bordercolor="#666666"
         borderopacity="1.0"
         inkscape:pageopacity="0.0"
         inkscape:pageshadow="2"
         inkscape:zoom="2.8"
         inkscape:cx="215.21359"
         inkscape:cy="30.005484"
         inkscape:document-units="mm"
         inkscape:current-layer="layer1"
         showgrid="false"
         inkscape:window-width="1440"
         inkscape:window-height="855"
         inkscape:window-x="366"
         inkscape:window-y="127"
         inkscape:window-maximized="0"
         units="px"
         fit-margin-top="0"
         fit-margin-left="0"
         fit-margin-right="0"
         fit-margin-bottom="0">
        <inkscape:grid
           type="xygrid"
           id="grid93"
           originx="-80.574495"
           originy="-156.63291" />
        <inkscape:grid
           type="xygrid"
           id="grid3784"
           originx="-80.574495"
           originy="-156.63291" />
      </sodipodi:namedview>
      <metadata
         id="metadata5">
        <rdf:RDF>
          <cc:Work
             rdf:about="">
            <dc:format>image/svg+xml</dc:format>
            <dc:type
               rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
            <dc:title></dc:title>
          </cc:Work>
        </rdf:RDF>
      </metadata>
      <g
         inkscape:label="Layer 1"
         inkscape:groupmode="layer"
         id="layer1"
         transform="translate(-80.487169,-126.68424)">
        <path
           style="fill:#000000;stroke:#ffffff;stroke-width:0.65998453;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
           d="m 90.862994,132.64086 1.759972,-5.27987 -11.439757,6.15985 11.439757,6.15987 -1.759972,-5.27988 c -0.185517,-0.55655 -0.185517,-1.20342 0,-1.75997 z"
           id="path91"
           inkscape:connector-curvature="0"
           sodipodi:nodetypes="scccss" />
      </g>
    </svg>

              </div>
              <div class="minerva-arrow-image">
                <?xml version="1.0" encoding="UTF-8" standalone="no"?>

    <svg
       xmlns:dc="http://purl.org/dc/elements/1.1/"
       xmlns:cc="http://creativecommons.org/ns#"
       xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
       xmlns:svg="http://www.w3.org/2000/svg"
       xmlns="http://www.w3.org/2000/svg"
       xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
       xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
       width="122.79958"
       height="51.401581"
       viewBox="0 0 32.521399 13.600001"
       version="1.1"
       id="svg8"
       inkscape:version="0.92.2 5c3e80d, 2017-08-06"
       sodipodi:docname="arrow.svg">
      <defs
         id="defs2" />
      <sodipodi:namedview
         id="base"
         pagecolor="#ffffff"
         bordercolor="#666666"
         borderopacity="1.0"
         inkscape:pageopacity="0.0"
         inkscape:pageshadow="2"
         inkscape:zoom="3.959798"
         inkscape:cx="154.51108"
         inkscape:cy="29.572515"
         inkscape:document-units="mm"
         inkscape:current-layer="layer1"
         showgrid="false"
         inkscape:window-width="1440"
         inkscape:window-height="855"
         inkscape:window-x="0"
         inkscape:window-y="1"
         inkscape:window-maximized="1"
         units="px"
         fit-margin-top="0"
         fit-margin-left="0"
         fit-margin-right="0"
         fit-margin-bottom="0">
        <inkscape:grid
           type="xygrid"
           id="grid93"
           originx="-80.574492"
           originy="-156.63309" />
        <inkscape:grid
           type="xygrid"
           id="grid3784"
           originx="-80.574492"
           originy="-156.63309" />
      </sodipodi:namedview>
      <metadata
         id="metadata5">
        <rdf:RDF>
          <cc:Work
             rdf:about="">
            <dc:format>image/svg+xml</dc:format>
            <dc:type
               rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
            <dc:title></dc:title>
          </cc:Work>
        </rdf:RDF>
      </metadata>
      <g
         inkscape:label="Layer 1"
         inkscape:groupmode="layer"
         id="layer1"
         transform="translate(-80.487168,-126.76104)">
        <path
           style="fill:#000000;stroke:#ffffff;stroke-width:0.6562736;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
           d="m 90.804653,132.6843 1.750076,-5.25019 -11.375434,6.12522 11.375434,6.12523 -1.750076,-5.25019 h 21.875777 v -1.75007 z"
           id="path91"
           inkscape:connector-curvature="0"
           sodipodi:nodetypes="cccccccc" />
      </g>
    </svg>

              </div>
              <div class="minerva-arrow-text">
                <div class="minerva-arrow-label p-3 bg-trans" style="max-width: 200px;">
                </div>
              </div>
            </div>

            <form class="form minerva-save_edits_form">
                <div class="input-group">
                    <div style="width: 100%; margin-bottom: 5px">
                        <input class="form-control minerva-edit_name bg-dark text-white rounded-0 border-0" type="text">
                        </input>
                        <br>
                        <textarea class="form-control minerva-edit_text bg-dark text-white rounded-0 border-0" rows="9">
                        </textarea>
                        <br>
                        <div class="row">
                            <div class="minerva-edit_toggle_arrow col-2 text-center">
                                <i class="fas fa-location-arrow"></i>
                            </div>
                            <div class="col-10">
                                <input class="form-control minerva-edit_arrow_text bg-dark text-white rounded-0 border-0" type="text">
                                </input>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-default minerva-edit_copy_button px-1" data-placement="bottom">
                        <i class="fas fa-copy fa-lg"></i><br>
                        <span class="mt-2 d-block" style="font-size: 0.7rem">
                                        COPY
                        </span>
                    </button>
                </div>
            </form>
        </div>


        <div class="minerva-password_modal modal fade" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Minerva Password</h2>
                    </div>
                    <div class="modal-body">

                        <form class="form">
                            <div class="form-group">
                                <input type=password class="form-control" name="p">
                            </div>
                            <button type="submit" class="btn btn-primary">Enter</button>
                        </form>
                    </div>
                </div>
              </div>
            </div>


        <div class="minerva-edit_description_modal modal fade" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content text-dark">
                    <div class="modal-header">
                        <h2 class="modal-title m-0 h5">Region of Interest</h2>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">

                        <form class="form">
                            <div class="form-group text-bold">
                                <label> Enter a description for the selected region. </label>
                                <textarea class="form-control" name="d" rows="4"></textarea>
                            </div>
                            <button type="button" class="btn btn-danger" data-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Make Shareable Link</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <div class="minerva-welcome_modal modal fade" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content text-dark">
                    <div class="modal-header">
                        <h2 class="modal-title m-0 h5">Welcome</h2>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="pb-2">
                          <span class="minerva-welcome-markers">
                            You're looking at an image layering
                            <span class="minerva-channel_count"></span>
                            markers.
                          </span>
                          <span class="minerva-welcome-nav">
                            Use the <i class="fas fa-arrow-left"></i>
                            and <i class="fas fa-arrow-right"></i>
                            arrows to move between highlighted image regions.
                            Click <i class="fas fa-list-ul"></i>
                            to return here to an overview of the full image.
                            Use <i class="fas fa-search-minus"></i> to zoom out
                            and <i class="fas fa-search-plus"></i> to zoom in.
                          </span>
                        </div>
                        <div>
                          <span class="minerva-welcome-tools">
                            To share your own highlighted image regions,
                            click <i class="fas fa-location-arrow"></i> to
                            point an arrow at a small feature,
                            click <i class="fas fa-bullseye"></i> to select
                            a feature with a custom shape, and
                            click <i class="fas fa-crosshairs"></i> to share a
                            boundary around a rectangular region.
                            Click <i class="fas fa-clone"></i> to open a
                            new window with shared navigation.
                          </span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="minerva-copy_link_modal modal fade" role="dialog">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content text-dark">
                    <div class="modal-header">
                        <h2 class="modal-title m-0 h5">Region of Interest</h2>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form class="form">
                            <div class="input-group">
                                <input type="text" class="form-control minerva-copy_link" name="copy_content" placeholder="Some path">
                                <span class="input-group-btn">
                                    <button class="btn btn-default minerva-modal_copy_button" type="submit" data-toggle="tooltip" data-placement="bottom">
                                        Copy
                                    </button>
                                </span>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="minerva-all-overlays d-none">
        </div>
    </div>
</div>
`

const makeTwinViewer = function(e) {
    var youngerWindow = window.open(window.location.href);
    var viewer1 = window.viewer;
    var viewer2;
    youngerWindow.addEventListener('DOMContentLoaded', (e) => {
        viewer2 = youngerWindow.viewer;
        console.log(youngerWindow.viewer);
        var viewer1Leading = false;
        var viewer2Leading = false;

        var viewer1Handler = function() {
        if (viewer2Leading) {
            return;
        }

        viewer1Leading = true;
        viewer2.viewport.zoomTo(viewer1.viewport.getZoom());
        viewer2.viewport.panTo(viewer1.viewport.getCenter());
        viewer1Leading = false;
        };

        var viewer2Handler = function() {
        if (viewer1Leading) {
            return;
        }

        viewer2Leading = true;
        viewer1.viewport.zoomTo(viewer2.viewport.getZoom());
        viewer1.viewport.panTo(viewer2.viewport.getCenter());
        viewer2Leading = false;
        };

        viewer1.addHandler('zoom', viewer1Handler);
        viewer2.addHandler('zoom', viewer2Handler);
        viewer1.addHandler('pan', viewer1Handler);
        viewer2.addHandler('pan', viewer2Handler);
    });
}

const build_page_with_exhibit = function(exhibit, options) {
  // Initialize openseadragon
  const viewer = OpenSeadragon({
    id: options.id + '-openseadragon',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/2.3.1/images/',
    navigatorPosition: 'BOTTOM_RIGHT',
    zoomOutButton: options.id + '-zoom-out',
    zoomInButton: options.id + '-zoom-in',
    immediateRender: true,
    maxZoomPixelRatio: 10,
    visibilityRatio: .9,
    degrees: exhibit.Rotation || 0,
  });

  // Constantly reset each arrow transform property
	function updateOverlays() {
			viewer.currentOverlays.forEach(overlay => {
          const isArrow = overlay.element.id.slice(0,13) == 'minerva-arrow';
					if (isArrow) {
						overlay.element.style.transform = '';
					}
			});
	}

	viewer.addHandler("update-viewport", function(){
			setTimeout(updateOverlays, 1);
	});

	viewer.addHandler("animation", updateOverlays);

  viewer.world.addHandler('add-item', function(addItemEvent) {
      const tiledImage = addItemEvent.item;
      tiledImage.addHandler('fully-loaded-change', function(fullyLoadedChangeEvent) {
          const fullyLoaded = fullyLoadedChangeEvent.fullyLoaded;
          if (fullyLoaded) {
            tiledImage.immediateRender = false;
          }
      });
      tiledImage.addHandler('opacity-change', function(opacityChangeEvent) {
          const opacity = opacityChangeEvent.opacity;
          if (opacity == 0) {
            tiledImage.immediateRender = true;
          }
      });
  });

  // Add size scalebar
  viewer.scalebar({
    location: 3,
    minWidth: '100px',
    type: 'Microscopy',
    stayInsideImage: false,
    pixelsPerMeter: 1000000*exhibit.PixelsPerMicron || 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    fontColor: 'rgb(255, 255, 255)',
    color: 'rgb(255, 255, 255)'
  })

  //set up event handler
  const eventHandler = new SimpleEventHandler(d3.select('body').node());

  const hashstate = new HashState(exhibit, options);
  const tileSources = {};
  const osd = new RenderOSD(hashstate, viewer, tileSources, eventHandler);
  const render = new Render(hashstate, osd);
  const init = (aspect_ratio) => {
    osd.init.call(osd);
    render.init.call(render, aspect_ratio);
  }

  arrange_images(viewer, tileSources, hashstate, init);

  return viewer;
};

export const build_page = function(options) {

  if (Array.isArray(options.markerData)) {
    marker_data = options.markerData;
  }
  if (Array.isArray(options.cellTypeData)) {
    cell_type_data = options.cellTypeData;
  }
  // define the marker and cell type links table
  const marker_maps = get_links_alias(marker_data);
  options.marker_links_map = marker_maps[0];
  options.marker_alias_map = marker_maps[1];
  const cell_type_maps = get_links_alias(cell_type_data);
  options.cell_type_links_map = cell_type_maps[0];
  options.cell_type_alias_map = cell_type_maps[1];

  // add CSS to the document
  var linkElement1 = document.createElement('link');
  linkElement1.setAttribute('rel', 'stylesheet');
  linkElement1.setAttribute('type', 'text/css');
  linkElement1.setAttribute('href', 'data:text/css;charset=UTF-8,' + encodeURIComponent(exhibitCSS));
  document.head.appendChild(linkElement1);
  var linkElement2 = document.createElement('link');
  linkElement2.setAttribute('rel', 'stylesheet');
  linkElement2.setAttribute('type', 'text/css');
  linkElement2.setAttribute('href', "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.1/css/bootstrap-select.css");
  document.head.appendChild(linkElement2);

  // fill the main div with content
  const el = document.getElementById(options.id);
  el.innerHTML = exhibitHTML;
  const home_el = el.getElementsByClassName('minerva-home-button')[0];
  const osd_el = el.getElementsByClassName('minerva-openseadragon')[0];
  const zoom_out_el = el.getElementsByClassName('minerva-zoom-out')[0];
  const zoom_in_el = el.getElementsByClassName('minerva-zoom-in')[0];
  options.noHome = !options.homeUrl;
  if (!options.noHome) {
    home_el.href = options.homeUrl; 
  }
  osd_el.id = options.id + '-openseadragon';
  zoom_out_el.id = options.id + '-zoom-out';
  zoom_in_el.id = options.id + '-zoom-in';

  $('.js-toggle-osd-side-nav').click(function() {
    $('#osd-side-nav').position().top == 0
      ? $('#osd-side-nav').css('top', '75vh')
      : $('#osd-side-nav').css('top', 0);
    $('#osd-side-nav').scrollTop(0);
  });

  options.el = el;
  const duplicateViewButton = el.getElementsByClassName('minerva-duplicate-view')[0];
  duplicateViewButton.onclick = makeTwinViewer;

  var exhibit = options.exhibit;
  if (typeof exhibit === 'string' || exhibit instanceof String) {
    return fetch(exhibit)
      .then(response => response.json())
      .then(data => build_page_with_exhibit(data, options));
  }
  else {
    return Promise.resolve(build_page_with_exhibit(exhibit, options));
  }

};
