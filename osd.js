import * as d3 from "d3"
import { round4 } from "./render"
import { greenOrWhite } from "./render"

var lasso_draw_counter = 0;
// Draw a point of a lasso-style polygon
var lasso_draw = function(event){

  lasso_draw_counter ++;
  if (lasso_draw_counter % 5 != 1) {
    return  
  }

  const viewer = this.viewer;

  // add points to polygon and (re)draw
  var webPoint = event.position;
  var viewportPoint = viewer.viewport.pointFromPixel(webPoint);
  this.hashstate.state.p.push({"x":viewportPoint.x,"y":viewportPoint.y});

  this.newView(false);
}
// Change the spring stiffness for navigation
const changeSprings = function(viewer, seconds, stiffness) {
  const springs = [
    'centerSpringX', 'centerSpringY', 'zoomSpring'
  ];
  springs.forEach(function(spring) {
    const s = viewer.viewport[spring];
    s.animationTime = seconds;
    s.springStiffness = stiffness;
    s.springTo(s.target.value);
  });
};

// Set the opacity of active channel groups or segmentation masks
const newMarkers = function(tileSources, group, active_masks) {

  const mask_paths = active_masks.map(m => m.Path);

  Object.keys(tileSources)
    .forEach(el => {
      const mask_path_index = mask_paths.indexOf(el);
      const opacity = (el === group.Path || mask_path_index >=0) ? 1 : 0;
      tileSources[el].forEach(tiledImage => {
        tiledImage.setOpacity(opacity);
        const {world} = tiledImage.viewer || {};
        if (world && mask_path_index >= 0) {
          // Reorder tiled images based on current active mask order
          const itemIndex = world.getItemCount() - 1 - mask_path_index;
          world.setItemIndex(tiledImage, Math.max(itemIndex, 0));
        }
      });
    });
};

// Render openseadragon from given hash state
export const RenderOSD = function(hashstate, viewer, tileSources, eventHandler) {

  this.svg_overlay = d3.select(viewer.svgOverlay().node());
  this.tileSources = tileSources;
  this.hashstate = hashstate;
  this.viewer = viewer;
  this.mouseEvent = {};
  this.trackers = [];
  this.eventHandler = eventHandler;
}

RenderOSD.prototype = {

  // Handle mouse position
  get mouseXY() {
    const e = this.mouseEvent;
    const pos = OpenSeadragon.getMousePosition(e);
    return this.normalize(pos);
  },
  set mouseXY(e) {
    this.mouseEvent = e;
  },

  // Initialize connection to openseadragon
  init: function () {
  
    const viewer = this.viewer;
    const HS = this.hashstate;
    const THIS = this;

    // Track mouse drag for lasso polygon drawing
    var mouse_drag = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        dragHandler: function(event) {
            if (HS.drawType == "lasso" && HS.drawing) {
                viewer.setMouseNavEnabled(false);
                lasso_draw.bind(THIS)(event);
            }
        }
    })

    // Track mouse drag end for lasso polygon drawing
    var mouse_up = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        dragEndHandler: function(event) {
            if (HS.drawType == "lasso" && HS.drawing) {
                HS.finishDrawing();
            }
            viewer.setMouseNavEnabled(true);
        }
    })

    // Track mouse drag for box overlay drawing
    this.viewer.addHandler('canvas-drag', function(e) {
      const THIS = e.userData;
      const HS = THIS.hashstate;
      if (HS.drawType != "box") {
        return;
      }

      const position = THIS.normalize(e.position);

      if (HS.drawing == 1) {
        HS.drawing = 2;
        e.preventDefaultAction = true;
        THIS.drawLowerBounds(position);
      }
      else if (HS.drawing == 2) {
        e.preventDefaultAction = true;
        THIS.drawUpperBounds(position);
      }
    }, this);

    // Track mouse drag end for box overlay drawing
    this.viewer.addHandler('canvas-drag-end', function(e) {
      const THIS = e.userData;
      const HS = THIS.hashstate;
      if (HS.drawType != "box") {
        return;
      }

      const position = THIS.normalize(e.position);

      if (HS.drawing == 2) {
        e.preventDefaultAction = true;
        THIS.drawUpperBounds(position);
        HS.finishDrawing();
        HS.pushState();
        THIS.newView(false);
      }
    }, this);

    // Track mouse click for arrow and box  drawing
    this.viewer.addHandler('canvas-click', function(e) {
      const THIS = e.userData;
      const HS = THIS.hashstate;

      const position = THIS.normalize(e.position);
      //trigger event
      var imageCoordinates =  THIS.viewer.viewport.viewportToImageCoordinates(position.x, position.y);
      THIS.eventHandler.trigger(THIS.eventHandler.events.osdClickEvent, {'x': imageCoordinates.x, "y" : imageCoordinates.y});

      if (HS.drawType == "lasso") {
        return;
      }
      if (HS.drawType == "arrow") {
        // const position = THIS.normalize(e.position);
        if (HS.drawing == 1) {
          HS.a = [position.x, position.y];
          HS.finishDrawing();
          THIS.viewer.setMouseNavEnabled(true);
          HS.pushState();
          THIS.newView(false);
        }
        return;
      }

      // Dragging the lower bounds of the box
      if (HS.drawing == 1) {
        HS.drawing = 2;
        e.preventDefaultAction = true;
        THIS.drawLowerBounds(position);
      }
      // Dragging the upper bounds of the box
      else if (HS.drawing == 2) {
        e.preventDefaultAction = true;
        THIS.drawUpperBounds(position);
        HS.finishDrawing();
        THIS.viewer.setMouseNavEnabled(true);
        HS.pushState();
        THIS.newView(false);
      }
    }, this);

    // Track mouse movement for box overlay drawing
    $(this.viewer.element).mousemove(this, function(e) {
      const THIS = e.data;
      const HS = THIS.hashstate;
      if (HS.drawType == "lasso") {
        return;
      }

      THIS.mouseXY = e;
      if (HS.drawing == 2) {
        THIS.drawUpperBounds(THIS.mouseXY);
      }
    });

    // Transfer animated viewport into hash state
    this.viewer.addHandler('animation', function(e) {
      const THIS = e.userData;
      const HS = THIS.hashstate;
      const scale = THIS.viewer.viewport.getZoom();
      const pan = THIS.viewer.viewport.getCenter();
      HS.v = [
        round4(scale),
        round4(pan.x),
        round4(pan.y)
      ];
    }, this);

    // Transfer animated viewport into hash state and url
    this.viewer.addHandler('animation-finish', function(e) {
      const THIS = e.userData;
      const HS = THIS.hashstate;
      const scale = THIS.viewer.viewport.getZoom();
      const pan = THIS.viewer.viewport.getCenter();
      HS.v = [
        round4(scale),
        round4(pan.x),
        round4(pan.y)
      ];
      HS.pushState();
      THIS.newView(false);
      THIS.faster();
    }, this);

    // Display viewer
    this.finishAnimation();
    this.viewer.setVisible(true);

  },
  
  // Immediately set viewport
  finishAnimation: function() {
    const target = this.viewer.viewport.getBounds();
    this.viewer.viewport.fitBounds(target, true);
  },
  // Make springs faster
  faster: function() {
    changeSprings(this.viewer, 1.2, 6.4);
  },
  // Make springs slower
  slower: function() {
    changeSprings(this.viewer, 3.2, 6.4);
  },
  // Normalize pixel coordinates to openseadragon viewport coordinates
  normalize: function(pixels) {
    const vp = this.viewer.viewport;
    const norm = vp.viewerElementToViewportCoordinates;
    return norm.call(vp, pixels);
  },
  // Draw lower bounds of a box overlay
  drawLowerBounds: function(position) {
    const HS = this.hashstate;
    const wh = [0, 0];
    const new_xy = [
      position.x, position.y
    ];
    HS.o = new_xy.concat(wh);
    this.newView(false);
  },
  // Compute new bounds in x or y
  computeBounds: function(value, start, len) {
    const center = start + (len / 2);
    const end = start + len;
    // Below center
    if (value < center) {
      return {
        start: value,
        range: end - value,
      };
    }
    // Above center
    return {
      start: start,
      range: value - start,
    };
  },
  // Draw upper bounds of a box overlay
  drawUpperBounds: function(position) {
    const HS = this.hashstate;
    const xy = HS.o.slice(0, 2);
    const wh = HS.o.slice(2);

    // Set actual bounds
    const x = this.computeBounds(position.x, xy[0], wh[0]);
    const y = this.computeBounds(position.y, xy[1], wh[1]);

    const o = [x.start, y.start, x.range, y.range];
    HS.o = o.map(round4);
    this.newView(false);
  },

  // update openseadragon optionally redrawing
  newView: function(redraw) {

    const HS = this.hashstate;
    this.trackers.forEach(t => t.destroy());
    this.trackers = [];

    this.addPolygon(HS.id+"-selection", HS.state.p);

    // Update the box overlays
    HS.allOverlays.forEach(function(indices) {
      const [prefix, s, w, o] = indices;
      var overlay = HS.overlay;
      if (prefix == 'waypoint-overlay') {
        overlay = HS.stories[s].Waypoints[w].Overlays[o];
      }
      var el = 'minerva-'+ HS.id + '-' + indices.join('-');
      this.addOverlay(overlay, el, s, w);
    }, this)

    // Update the arrow overlays
    const THIS = this;
    $.each($(HS.el).find('.minerva-arrow-overlay'), function(id, el) {
      const current = THIS.viewer.getOverlayById(el.id);
      const xy = new OpenSeadragon.Point(-100, -100);
      if (current) {
        current.update({
          location: xy,
        });
      }
    });
    HS.allArrows.forEach(function(indices) {
      this.addArrow(indices);
    }, this);
    
    // Redraw design
    if(redraw) {
      // Update OpenSeadragon
      this.activateViewport();
      newMarkers(this.tileSources, HS.group, HS.active_masks);
    }
    this.viewer.forceRedraw();
  },

  // add a lasso polygon to svg overlay
  addPolygon: function(id, polygon) {
    var svg_overlay = this.svg_overlay;

    d3.select('#' + id).remove();
    var selPoly = svg_overlay.selectAll(id).data([polygon]);
    selPoly.enter().append("polygon")
        .attr('id', id)
        .attr("points",function(d) {
            return d.map(function(d) { return [d.x,d.y].join(","); }).join(" ");
        });
  },

  // add an arrow overlay to openseadragon
  addArrow: function(indices) {

    // prefix: waypoint arrow or user arrow
    // s_i: story index, w_i: waypoint index, a_i: arrow index
    const [prefix, s_i, w_i, a_i] = indices;
    const HS = this.hashstate;

    var a = {
      Point: HS.a,
      Text: ''
    }
    // Take waypoint arrows from waypoint
    if (prefix == 'waypoint-arrow') {
      a = Object.assign({}, HS.stories[s_i].Waypoints[w_i].Arrows[a_i])
    }
    // Set default angle of 60 degrees
    if (a.Angle == undefined) {
      a.Angle = 60;
    }
    const text_class = "minerva-arrow-text";
    const arrow_class = a.Arrowhead? "minerva-arrowhead-image" : "minerva-arrow-image";
    const text_el = "minerva-arrow-text-" + HS.id + '-' + indices.join('-');
    const el = "minerva-arrow-image-" + HS.id + '-' + indices.join('-');

    // Hide arrows not equal to current story and waypoint
    if (s_i != HS.s || w_i != HS.w) {
      a.Point = [-100, -100];
    }

    const current = this.viewer.getOverlayById(el);
    const xy = new OpenSeadragon.Point(a.Point[0], a.Point[1]);
    // Update existing arrows
    if (current) {
      current.update({
        location: xy,
      });
    }
    // Create new arrows
    else {
      const proto_element = HS.el.getElementsByClassName(arrow_class)[0];
      const element = proto_element.cloneNode(true);
      element.id = el;
      document.body.appendChild(element);
      this.viewer.addOverlay({
        x: a.Point[0],
        y: a.Point[1],
        element: el,
        placement: OpenSeadragon.Placement.CENTER
      });
    }

    const current_text = this.viewer.getOverlayById(text_el);
    const xy_text = new OpenSeadragon.Point(a.Point[0], a.Point[1]);
    // Update existing arrow text
    if (current_text) {
      current_text.update({
        location: xy_text,
      });
    }
    // Create new arrow text
    else {
      const proto_text_element = HS.el.getElementsByClassName(text_class)[0];
      const text_element = proto_text_element.cloneNode(true);
      text_element.id = text_el;
      document.body.appendChild(text_element);
      this.viewer.addOverlay({
        x: a.Point[0],
        y: a.Point[1],
        element: text_el,
        placement: OpenSeadragon.Placement.CENTER
      });
    }

    // Create specific ids for each arrow subelement
    const a_image_el = $('#'+el);
    const a_svg_el = $('#'+el+' svg');
    const a_text_el = $('#'+text_el);
    const a_label_el = $('#'+text_el+' .minerva-arrow-label');
    const a_radius = a_svg_el[0].getAttribute('width') / 2;
    const a_y = a_radius * Math.sin(a.Angle * Math.PI /180);
    const a_x = a_radius * Math.cos(a.Angle * Math.PI /180);

    // Enable hidden (text-only) arrows
    if (a.HideArrow == true) {
      a_image_el.css('display', 'none');
    }
    else {
      a_image_el.css('display', 'block');
      a_svg_el[0].setAttribute('transform', 
        'translate('+a_x+','+a_y+')rotate('+a.Angle+')');
      a_label_el.css('top', '100px');
    }

    const a_text = a.Text;
    
    // Position text to endpoint of arrow
    if (a_text) {
      const t_w = a_text_el.width();
      const t_h = a_text_el.height();
      var t_x = 2 * a_x + t_w * Math.sign(Math.round(a_x)) / 2;
      var t_y = 2 * a_y + t_h * Math.sign(Math.round(a_y)) / 2;
      if (a.HideArrow == true) {
        t_x = 0;
        t_y = 0;
      }
      a_label_el.css('transform',
        'translate('+t_x+'px, '+t_y+'px)');
      a_label_el.addClass('p-3');
      a_label_el.text(a_text);
    }
    else {
      a_label_el.removeClass('p-3');
      a_label_el.text('');
    }
  },

  // add a box overlay to openseadragon
  addOverlay: function(overlay, el, s, w) {

    const current = this.viewer.getOverlayById(el);
    const HS = this.hashstate;

    const not_outline = (HS.waypoint.Mode != 'outline');
    const not_current = (HS.s != s || HS.w != w);

    // Hide if not part of the outline and not current story/waypoint
    if (not_outline && not_current) {
      if (current) {
        const xy = new OpenSeadragon.Point(-100, -100);
        current.update({
          location: xy,
          width: 1,
          height: 1,
        });
      }
      return; 
    }

    var div = document.getElementById(el);

    // Create a new overlay if needed
    if (!div) {
      div = document.createElement("div"); 
      div.className = "minerva-white minerva-overlay";
      div.id = el;
      HS.el.getElementsByClassName('minerva-all-overlays')[0].appendChild(div); 
    }

    const xy = new OpenSeadragon.Point(overlay.x, overlay.y);
    const is_green = HS.drawing && HS.drawType == "box";
    greenOrWhite('#' + el, is_green);

    // Update existing overlays
    if (current) {
      current.update({
        location: xy,
        width: overlay.width,
        height: overlay.height
      });
    }
    // Add new overlays
    else {
      this.viewer.addOverlay({
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
        element: el
      });
    }

    const THIS = this;

    // Allow interactive box overlays if in outline mode
    if (HS.waypoint.Mode == 'outline') {
      const tracker = new OpenSeadragon.MouseTracker({
        element: document.getElementById(el),
        moveHandler: function(event) {
          $(div).css('cursor', 'pointer');
        },
        clickHandler: (function(event) {
          const [s, w] = el.split('-').slice(-3,-1);
          event.preventDefaultAction = false;
          HS.s = s;
          HS.w = w;
          HS.pushState();
          window.onpopstate();
        }).bind(this)
      });
      this.trackers.push(tracker);
    }
  },

  // Pan to viewport given by hash state
  activateViewport: function() {
    const HS = this.hashstate;
    const viewport = this.viewer.viewport;
    viewport.panTo(HS.viewport.pan);
    viewport.zoomTo(HS.viewport.scale);
    viewport.applyConstraints(true);
  }
}
