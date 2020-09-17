import SimpleEventHandler from "./simpleEventHandler.js"
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
  const imageName = document.getElementById('minerva-imageName');
  imageName.innerText = images.length == 1
    ? images[0].Description
    : exhibit.Name

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
        const channelSettings = hashstate.channelSettings(layer.Channels);
        getAjaxHeaders(hashstate, image).then(function(ajaxHeaders){
          const useAjax = (image.Provider == 'minerva' || image.Provider == 'minerva-public');
          // Add an openseadragon tiled image
          viewer.addTiledImage({
            loadTilesWithAjax: useAjax,
            crossOriginPolicy: useAjax? 'Anonymous': undefined,
            ajaxHeaders: ajaxHeaders,
            tileSource: {
              height: image.Height,
              width:  image.Width,
              maxLevel: image.MaxLevel,
              tileWidth: image.TileSize.slice(0,1).pop(),
              tileHeight: image.TileSize.slice(0,2).pop(),
              getTileUrl: getGetTileUrl(image, layer, channelSettings)
            },
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
                init();
              }
            }
          });
        });
      }
      // Add the image title and white border
      const titleElt = $('<p>');
      const title = image.Description;
      titleElt.addClass('overlay-title').text(title);
      viewer.addOverlay({
        element: titleElt[0],
        x: x + displayWidth / 2,
        y: y,
        placement: 'BOTTOM',
        checkResize: false
      });
      viewer.addOverlay({
        x: x,
        y: y,
        width: displayWidth,
        height: image.Height / image.Width * displayWidth,
        className: 'slide-border'
      });
    }
  }
};

const exhibitHTML = `
    <div class="position-fixed w-100" style="top: 0;left: 0;">
        <div>
            <div id="minerva-openseadragon" class="openseadragon"></div>
            <div id="minerva-legend" class="position-absolute"
                 style="pointer-events: none; top: 1rem; right: 8px">
                <div>
                    <div class="btn-group-vertical bg-trans p-2"
                         style="display:inline-block; vertical-align:top;">
                        <a id="minerva-toggle-legend" class="p-1" href="javascript;;">
                            <i class="open-legend fas fa-chevron-left" style="font-size: 25px;"></i>
                            <i class="close-legend fas fa-chevron-right" style="font-size: 25px;"></i>
                        </a>
                        <ul id="minerva-channel-legend" class="list-unstyled m-0"></ul>
                        <div class="p-1 only-3d">
                          Depth:
                        </div>
                        <div style="text-align: right;">
                          <span id="minerva-depth-legend"> </span>
                        </div>
                    </div> 
                    <div id="minerva-channel-groups-legend" class="nav flex-column nav-pills p-2 bg-trans"
                         style="display:inline-block; vertical-align:top;
                         pointer-events: all; overflow-y: scroll; max-height: 80vh;">
                    </div>
                    <div id="minerva-z-slider-legend" class="bg-trans"
                         style="pointer-events: all; display:inline-block; vertical-align:top;">
                        <input id="minerva-z-slider" type="range"/>
                    </div>
                </div>
            </div>
            <div id="minerva-sidebar-menu" class="container position-absolute">
                <div class="row">
                    <div class="col-11 bg-trans waypoint-content p-3" style="max-height: 80vh; overflow-y: scroll">
                        <div class="row">
                            <div class="col-10">
                                <h3 id="minerva-imageName" class="m-0"></h3>
                            </div>
                            <div class="col-2">
                                <a class="btn text-light d-none" id="minerva-home-button"
                                    href="/">
                                    <i class="fas fa-home"></i>
                                </a>
                                <a class="btn text-light d-none" id="minerva-toc-button">
                                    <i class="fas fa-list-ul"></i>
                                </a>
                            </div>
                        </div>
                        <hr class="my-1">
                        <div id="minerva-waypointControls" class="row align-items-center my-1">
                            <div class="col-2 text-center" id="minerva-leftArrow">
                                <i class="fas fa-arrow-left" style="font-size: 25px"></i>
                            </div>
                            <div class="col-8">
                              <div class="audioControls">
                                <audio style="height: 25px; width:100%" id="minerva-audioPlayback" controls>
                                  <source id="minerva-audioSource" type="audio/mp3" src="">
                                </audio> 
                              </div>
                            </div>
                            <div class="col-2 text-center" id="minerva-rightArrow">
                                <i class="fas fa-arrow-right" style="font-size: 25px;"></i>
                            </div>
                        </div>
                        <div class="row">
                            <div id="minerva-waypointName" class="col-10 h6 mt-0 mb-3">
                            </div>
                            <div id="minerva-waypointCount" class="col-2"></div>
                        </div>
                        <div id="minerva-viewer-waypoint">
                        </div>
                        <div>
                            <p id="minerva-channel-label" class="mb-1 font-weight-bold pt-2">Select a marker group:</p>
                            <select id="minerva-group-picker" class="editControls selectpicker" multiple>
                            </select>
                            <div id="minerva-channel-groups" class="nav flex nav-pills"></div>
                            <p id="minerva-mask-label" class="mb-1 font-weight-bold pt-2">Add data layer:</p>
                            <select id="minerva-mask-picker" class="editControls selectpicker" multiple>
                            </select>
                            <div id="minerva-mask-layers" class="nav flex nav-pills">
                            </div>
                        </div>
                        <div>
                            <div id="minerva-story-container"></div>
                        </div>
                    </div>
                    <div class="col-1 p-0">
                        <div class="btn-group-vertical bg-trans"> 
                            <a id="minerva-toggle-sidebar" class="btn" href="javascript;;">
                                <i class="close-sidebar fas fa-chevron-left" style="font-size: 25px;"></i>
                                <i class="open-sidebar fas fa-chevron-right" style="font-size: 25px;"></i>
                            </a>
                        </div> 
                        <div class="btn-group-vertical bg-trans">
                            <a class="btn text-light" id="minerva-zoom-out" href="#minerva-zoom-out">
                                <i class="fas fa-search-minus"></i>
                            </a>
                            <a class="btn text-light" id="minerva-zoom-in" href="#minerva-zoom-in">
                                <i class="fas fa-search-plus"></i>
                            </a>
                            <span id="minerva-arrow-switch" class="nav-item minerva-arrow-switch">
                            <a class="btn" href="javascript:;">
                                <span class=""><i class="fas fa-location-arrow"></i></span>
                            </a>
                            </span>
                            <span id="minerva-lasso-switch" class="nav-item minerva-lasso-switch">
                            <a class="btn" href="javascript:;">
                                <span class=""><i class="fas fa-bullseye"></i></span>
                            </a>
                            </span>
                            <span id="minerva-draw-switch" class="nav-item minerva-draw-switch">
                            <a class="btn" href="javascript:;">
                                <span class=""><i class="fas fa-crosshairs"></i></span>
                            </a>
                            </span>
                            <a class="btn" id='minerva-duplicate-view'>
                                <span class=""><i class="fas fa-clone"></i></span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div id="minerva-viewer-tool" class="position-absolute bg-trans" style="right:1.5%; top: 40vh;">
            </div>
        </div>
    </div>

    <div class="d-none">
        <input type="file" id="minerva-file-upload" class="d-none" />
        <ul>
            <li class="nav-item rounded-0" id="minerva-proto-story-index">
                <a class="nav-link list-group-item-action font-weight-bold"></a>
            </li>
        </ul>

        <div id="minerva-arrow-overlay" class="minerva-arrow-overlay">
          <div id="minerva-arrowhead-image">
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
          <div id="minerva-arrow-image">
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
          <div id="minerva-arrow-text">
            <div class="arrow-label p-3 bg-trans" style="max-width: 200px;">
            </div>
          </div>
        </div>

        <form class="form save_edits_form">
            <div class="input-group">
                <div style="width: 100%; margin-bottom: 5px">
                    <input class="form-control edit_name editable bg-dark text-white rounded-0 border-0" type="text">
                    </input>
                    <br>
                    <textarea class="form-control edit_text editable bg-dark text-white rounded-0 border-0" rows="9">
                    </textarea>
                    <br>
                    <div class="row">
                        <div id="minerva-edit_toggle_arrow" class="col-2 text-center">
                            <i class="fas fa-location-arrow"></i>
                        </div>
                        <div class="col-10">
                            <input class="form-control edit_arrow_text editable bg-dark text-white rounded-0 border-0" type="text">
                            </input>
                        </div>
                    </div>
                </div>
                <button class="btn btn-default edit_copy_button px-1  " data-placement="bottom">
                    <i class="fas fa-copy fa-lg"></i><br>
                    <span class="mt-2 d-block" style="font-size: 0.7rem">
                                    COPY
                    </span>
                </button>
            </div>
        </form>

        <div id="minerva-readme">
        </div>
    </div>


    <div id="minerva-password_modal" class="modal fade" role="dialog">
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


    <div id="minerva-edit_description_modal" class="modal fade" role="dialog">
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

    <div id="minerva-welcome_modal" class="modal fade" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content text-dark">
                <div class="modal-header">
                    <h2 class="modal-title m-0 h5">Welcome</h2>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    You're looking at an image layering
                    <span class="channel_count"></span>
                    CyCIF markers.
                    Use the <i class="fas fa-arrow-left"></i>
                    and <i class="fas fa-arrow-right"></i>
                    arrows to move between highlighted image regions.
                    Click <i class="fas fa-list-ul"></i>
                    to return here to an overview of the full image.
                    Use <i class="fas fa-search-minus"></i> to zoom out
                    and <i class="fas fa-search-plus"></i> to zoom in.
                    </br>
                    </br>
                    To share your own highlighted image regions,
                    click <i class="fas fa-location-arrow"></i> to
                    point an arrow at a small feature,
                    click <i class="fas fa-bullseye"></i> to select
                    a feature with a custom shape, and
                    click <i class="fas fa-crosshairs"></i> to share a
                    boundary around a rectangular region.
                    Click <i class="fas fa-clone"></i> to open a
                    new window with shared navigation.
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>


    <div id="minerva-copy_link_modal" class="modal fade" role="dialog">
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
                            <input type="text" class="form-control" id="minerva-copy_link" name="copy_content" placeholder="Some path">
                            <span class="input-group-btn">
                                <button class="btn btn-default modal_copy_button" type="submit" data-toggle="tooltip" data-placement="bottom">
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

    <div id="minerva-all-overlays" class="d-none">
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
    id: 'minerva-openseadragon',
    prefixUrl: 'https://cdnjs.cloudflare.com/ajax/libs/openseadragon/2.3.1/images/',
    navigatorPosition: 'BOTTOM_RIGHT',
    zoomOutButton: 'minerva-zoom-out',
    zoomInButton: 'minerva-zoom-in',
    immediateRender: true,
    maxZoomPixelRatio: 10,
    visibilityRatio: .9,
    degrees: exhibit.Rotation || 0,
  });

  // Constantly reset each arrow transform property
	function updateOverlays() {
			viewer.currentOverlays.forEach(overlay => {
          const isArrow = overlay.element.id.slice(0,5) == 'arrow';
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
  const render = new Render(hashstate, osd, eventHandler);
  const init = render.init.bind(render);

  arrange_images(viewer, tileSources, hashstate, init);
}

export const build_page = function(options) {

  // fill the main div with content
  const el = document.getElementById(options.id);
  el.innerHTML = exhibitHTML;

  var exhibit = options.exhibit;

  if (typeof exhibit === 'string' || exhibit instanceof String) {
    fetch(exhibit)
      .then(response => response.json())
      .then(data => build_page_with_exhibit(data, options));
  }
  else {
    build_page_with_exhibit(exhibit, options);
  }

  $('#story-board').on('hidden.bs.collapse', function() { 
      $('#js-story-collapse-indicator')[0].innerHTML = '<span class="px-2">SHOW MORE</span> <i class="fas fa-chevron-down"></i>'
  });
  $('#story-board').on('shown.bs.collapse', function() { 
      $('#js-story-collapse-indicator')[0].innerHTML = '<span class="px-2">SHOW LESS</span> <i class="fas fa-chevron-up"></i>'
  });
  
  $('.js-toggle-osd-side-nav').click(function() {
      $('#osd-side-nav').position().top == 0 
          ? $('#osd-side-nav').css('top', '75vh')
          : $('#osd-side-nav').css('top', 0);
      $('#osd-side-nav').scrollTop(0);
  })

  const duplicateViewButton = document.querySelector('#minerva-duplicate-view');
  duplicateViewButton.onclick = makeTwinViewer;
}
