import { encode } from './render'
import { decode } from './render'
import { unpackGrid } from './render'
import { remove_undefined } from './render'
import { toTileKey, GLState, toDistance } from './channel'

import LZString from "lz-string"
const yaml = require('js-yaml');

/*
 * Hard-coded authentication for optional OMERO connection
 */

const omero_authenticate = function(username, pass) {

  return pass.then(function(password) {
    return fetch('https://omero.hms.harvard.edu/api/v0/token/',
            {mode: 'no-cors'}
          ).then(function(token){
        return fetch('https://omero.hms.harvard.edu/api/v0/login/', {
          method: 'POST',
          body: JSON.stringify({
            csrfmiddlewaretoken: token.data,
            username: username,
            password: password,
            server: 1
          })
        }).then(function(session){
          return 'csrftoken=' + token.data + ';sessionid=' + session.eventContext.sessionUuid + ';';
        })
    })
  });
}

const pos_modulo = function(i, n) {
  return ((i % n) + n) % n;
};

// Define d url parameter (description)
const dFromWaypoint = function(waypoint) {
  return encode(waypoint.Description);
};

// Define n url parameter (name)
const nFromWaypoint = function(waypoint) {
  return encode(waypoint.Name);
};

// Define m url parameter (active mask indices)
const mFromWaypoint = function(waypoint, masks) {
  const names = waypoint.ActiveMasks || [];
  const m = names.map(name => index_name(masks, name));
  if (m.length < 2) {
    return [-1].concat(m);
  }
  return m;
};

// Define a url parameter (arrow)
const aFromWaypoint = function(waypoint, masks) {
  const arrows = waypoint.Arrows || [{}]
  const arrow = arrows[0].Point;
  if (arrow) {
    return arrow
  }
  return [-100, -100];
};

// Define g url parameter (channel group index)
const gFromWaypoint = function(waypoint, cgs) {
  const cg_name = waypoint.Group;
  return index_name(cgs, cg_name);
};

// Define v url parameter (viewport)
const vFromWaypoint = function(waypoint) {
  return [
    waypoint.Zoom,
    waypoint.Pan[0],
    waypoint.Pan[1],
  ];
};

// Define p url parameter (polygon)
const pFromWaypoint = function(waypoint) {
  const p = waypoint.Polygon;
  return p? p: toPolygonURL([]);
};

// Define o url parameter (overlay)
const oFromWaypoint = function(waypoint) {
  return [
    waypoint.Overlays[0].x,
    waypoint.Overlays[0].y,
    waypoint.Overlays[0].width,
    waypoint.Overlays[0].height,
  ];
};

// Convert a polygon to a url parameter
var toPolygonURL = function(polygon){
    var pointString='';
    polygon.forEach(function(d){
        pointString += d.x.toFixed(5) + "," + d.y.toFixed(5) + ",";
    })
    pointString = pointString.slice(0, -1); //removes "," at the end
    var result =  LZString.compressToEncodedURIComponent(pointString);
    return result;
}

// Convert a url parameter to a polygon
var fromPolygonURL = function(polygonString){
    var decompressed = LZString.decompressFromEncodedURIComponent(polygonString);
    if (!decompressed){
      return [];
    }

    var xArray = [], yArray = [];

    //get all values out of the string
    decompressed.split(',').forEach(function(d,i){
        if (i % 2 == 0){ xArray.push(parseFloat(d)); }
        else{ yArray.push(parseFloat(d)); }
    });

    //recreate polygon data structure
    var newPolygon = [];
    if (xArray.length == yArray.length) {
      xArray.forEach(function(d, i){
          newPolygon.push({x: d, y: yArray[i]});
      });
    }
    return newPolygon;
}

// Serialize state to url
const serialize = function(keys, state, delimit) {
  return keys.reduce(function(h, k) {
    var value = state[k] || 0;
    // Array separated by underscore
    if (value.constructor === Array) {
      value = value.join('_');
    }
    return h + delimit + k + '=' + value;
  }, '').slice(1);

};

// Deserialize url to state
const deserialize = function(entries) {
  const query = entries.reduce(function(o, entry) {
    if (entry) {
      const kv = entry.split('=');
      const val = kv.slice(1).join('=') || '1';
      const vals = val.split('_');
      const key = kv[0];
      // Handle arrays or scalars
      o[key] = vals.length > 1? vals: val;
    }
    return o;
  }, {});

  return query;
};

/*
 * Return an anonymous totken for any username and password
 */
const anon_authenticate = function(username, pass) {
  return pass.then(function(password) {
    return "Anonymous";  
  })
}

const to_subgroups = (subpath_map, rendered_map, group, all) => {
  const used = new Set();
  const shown = group.Shown;
  const n_color = group.Colors.length;
  const channels = group.Channels.slice(0, n_color);
  const zipped = channels.reduce((o, Name, idx) => {
    o.set(Name, {
      Format: group.Format || 'jpg',
      Colors: [ group.Colors[idx] ],
      Description: (group.Descriptions || [])[idx] || ''
    });
    return o;
  }, new Map());
  // Return single-channel subpaths to render
  if (subpath_map.size > 0) {
    return channels.filter((n, i) => {
      if (!all && !shown[i]) return false;
      if (!subpath_map.has(n)) return false;
      return true;
    }).reduce((out, Name) => {
      // Disallow duplicate subpaths
      const Path = subpath_map.get(Name);
      if (used.has(Path)) return out; 
      used.add(Path);
      const Colorize = !rendered_map.get(Name);
      const { Colors, Description } = zipped.get(Name);
      const { Format } = zipped.get(Name);
      return [...out, {
        Name, Path, Colors, Format,
        Colorize, Description
      }];
    }, []);
  }
  // Return group subpath
  const { Name, Path, Colors } = group;
  const Format =  group.Format || 'jpg';
  return [{
    Name, Path, Colors, Format,
    Colorize: false, Description: ''
  }];
}

const is_active = ({ masks, subgroups, key, match }) => {
  const mask_list = masks.map(m => m[key]);
  const group_list = subgroups.map(g => g[key]);
  const mask_index = mask_list.indexOf(match);
  const group_index = group_list.indexOf(match);
  const active = group_index >= 0 || mask_index >= 0;
  return { active, group_index, mask_index };
}

const can_mutate_group = (old, group) => {
  // Don't copy a copy, don't copy if same
  if ('OriginalGroup' in group) return true;
  if (old === group) return true;
  const old_c = old.Channels;
  const new_c = group.Channels;
  // Check if channel names are the same
  if (old_c.length === new_c.length) {
    return new_c.every((c, i) => c === old_c[i]);
  }
  return false;
}

const add_mask_visibility = (masks) => {
  return masks.map((mask) => {
    mask.Shown = true;
    return mask;
  });
}

const add_visibility = (cgs) => {
  return cgs.map((group) => {
    group.Shown = group.Channels.map(() => true);
    return group;
  });
}

/*
 * The HashState contains all state variables in sync with url hash
 */
export const HashState = function(exhibit, options) {

  this.trackers = [];
  this.pollycache = {};
  this.embedded = options.embedded || false;
  this.authenticate = options.authenticate || anon_authenticate;
  this.speech_bucket = options.speech_bucket || "";
  this.marker_links_map = options.marker_links_map;
  this.marker_alias_map = options.marker_alias_map;
  this.cell_type_links_map = options.cell_type_links_map;
  this.cell_type_alias_map = options.cell_type_alias_map;
  this.exhibit = exhibit;
  this.el = options.el;
  this.id = options.id;

  this.customPopState = options.customPopState || false;
  this.customPushState = options.customPushState || false;
  this.customWelcome = options.customWelcome || "";
  this.hideWelcome = options.hideWelcome || false;
  this.noHome = options.noHome || false;

  this._gl_state = null;
  this.state = {
    buffer: {
      waypoint: undefined
    },
    lensUI: null,
    lensRad: 100,
    lensAlpha: 1,
    eventPoint: [0, 0],
    lensResizeBasis: null,
    lensAlphaBasis: null,
    lensHeld: true,
    lensAlphaHeld: true,
    lensResizeHeld: true,
    lensResizeMin: 60,
    lensResizeMax: 600,
    lensResizeSpeed: 1,
    lensInsideBorder: 20,
    lensResizeThickness: 60,
    activeChannel: -1,
    drawType: "lasso",
    addingOpen: false,
    infoOpen: false,
    changed: false,
    design: {},
    m: [-1],
    w: [0],
    g: 0,
    s: 0,
    a: [-100, -100],
    v: [1, 0.5, 0.5],
    o: [-100, -100, 1, 1],
    p: [],
    name: '',
    description: '',
    edit: false,
    drawing: 0
  };

  this.newExhibit();
  this._gl_state = new GLState(this)
};

const toClipPath = (rad, nav_gap) => {
  const norm = 100*(2*rad) / nav_gap;
  const arc = Math.asin(nav_gap/(2*rad));
  const c = [...Array(32)].map((_, _i, _a) => {
    const diff = _i*arc/(_a.length-1)+Math.PI/2;
    const angle = (arc/2 - diff);
    const x = Math.round(Math.cos(angle)*norm*10)/10;
    const y = Math.round(Math.sin(angle)*norm*10)/10;
    return `${y+50+norm}% ${x+50}%`;
  }).join(',');
  return `polygon(100% 0, 0 0, 0 100%, 100% 100%, ${c})`;
}
 
const to_container = (nav_gap) => {
  const container = document.createElement('div');
  container.setAttribute('class', `minerva-lens-ui-wrapper`);
  container.setAttribute('style', `
    display: grid;
    position: absolute;
    pointer-events: none;
    grid-template-columns: ${nav_gap}px auto ${nav_gap}px;
    grid-template-rows: ${nav_gap}px auto ${nav_gap}px;
    justify-content: center;
    align-content: center;
  `);
  const padding = document.createElement('div');
  padding.setAttribute('style', `
    grid-column: 2; grid-row: 2;
    justify-content: center;
    align-content: center;
    display: grid;
  `);
  const alpha_handle = document.createElement('div');
  alpha_handle.setAttribute('style', `
    grid-column: 2; grid-row: 2;
    color: rgba(0, 123, 255, 1);
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: 1fr auto 1fr;
    justify-content: center;
    align-content: center;
    display: grid;
  `);
  const alpha_label = document.createElement('span');
  alpha_label.setAttribute('class', `bg-trans`);
  alpha_label.setAttribute('style', `
    border-radius: ${nav_gap/2}px;
    border: 2px solid white;
    padding-top: 5px;
    height: ${nav_gap}px;
    width: ${nav_gap}px;
    grid-column: 2;
    grid-row: 2;
  `);
  const size_handle = document.createElement('div');
  size_handle.setAttribute('class', `bg-trans`);
  size_handle.setAttribute('style', `
    grid-column: 3; grid-row: 3;
    border-radius: ${nav_gap/2}px;
    border: 2px solid white;
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: 1fr auto 1fr;
    justify-content: center;
    align-content: center;
    display: grid;
  `);
  const size_label = document.createElement('span');
  size_label.setAttribute('style', `
    font-family: Arial;
    padding-top: 5px;
    grid-column: 2;
    grid-row: 2;
  `);
  const size_svg = (new DOMParser()).parseFromString(`
<svg fill="#007bff" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 358.666 358.666" xml:space="preserve" transform="rotate(-45)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <polygon points="190.367,316.44 190.367,42.226 236.352,88.225 251.958,72.619 179.333,0 106.714,72.613 122.291,88.231 168.302,42.226 168.302,316.44 122.314,270.443 106.708,286.044 179.333,358.666 251.958,286.056 236.363,270.432 "></polygon> </g> </g> </g></svg>
`, "image/svg+xml").children[0];
  size_svg.style = `
    width: ${nav_gap-5}px;
    margin-top: -6px;
  `;
  size_label.appendChild(size_svg);
  size_handle.append(size_label);
  alpha_handle.append(alpha_label);
  container.append(padding);
  container.append(size_handle);
  container.append(alpha_handle);
  return { container, padding, alpha_label, alpha_handle };
}

const to_pad = (rad, nav_gap) => {
  return Math.ceil(2*rad / Math.sqrt(2)) - 20;
}

const update_container = ({ 
  alpha_handle, alpha_label, container, padding, nav_gap,
  alpha, rad, x, y, no_lens
}) => {
  const alpha_angle = 3 * (alpha - 0.03);
  const pad = to_pad(rad, nav_gap);
  const css_x = Math.round(x - rad) + 'px';
  const css_y = Math.round(y - rad) + 'px';
  container.style.border = "2px solid white";
  container.style.borderRadius = rad + "px";
  container.style.display = ['grid', 'none'][+no_lens];
  alpha_handle.style.transform = `rotate(${alpha_angle}rad)`;
  alpha_label.style.clipPath = toClipPath(rad, nav_gap);
  alpha_label.style.translate = `-${rad}px 0px`;
  container.style.height = 2*rad + 'px';
  container.style.width = 2*rad + 'px';
  padding.style.height = pad + 'px';
  padding.style.width = pad + 'px';
  container.style.left = css_x;
  container.style.top = css_y;
}

const toReferenceVector = (origin, point) => {
  return [0,1].map(i => point[i] - origin[i]);
}

const resizeDirection = (ref, vec) => {
  const dot = (a,b) => a[0]*b[0] + a[1]*b[1];
  return -1 * Math.sign(dot(ref, vec));
}

const toAngleTrajectory = (ref, vec) => {
  const diff = ref[1]*vec[0] - ref[0]*vec[1];
  const sum = ref[0]*vec[0] + ref[1]*vec[1];
  return Math.atan2(diff, sum);
}

const toTrajectory = (ref, vec) => {
  const dot = (a,b) => a[0]*b[0] + a[1]*b[1];
  const scalar = dot(ref,vec) / dot(ref,ref);
  return ref.map(x => scalar * x);
}

const toAngle = (vec) => {
  return Math.atan2(vec[1], vec[0]);
}

// Set the opacity of active masks
const newMasks = function(active_masks, viewer) {

  const { world } = viewer;
  const n_items = world.getItemCount();
  const indices = [...Array(n_items).keys()];

  // Full list of tiled image masks
  const mask_t = indices.map(i => {
    const tiledImage = world.getItemAt(i);
    const tileSource = tiledImage.source;
    return { tiledImage, tileSource };
  }).filter(t => t.tileSource.is_mask);

  // Map tile source paths to tiled images
  const mask_map =  new Map(mask_t.map(t => {
    return [t.tileSource.path, t.tiledImage];
  }));

  // Hide hidden masks
  mask_t.forEach(t => {
    t.tiledImage.setOpacity(0);
  });

  // Organize active masks
  active_masks.forEach((m, i) => {
    const order = n_items - 1 - i;
    if (!mask_map.has(m.Path)) return;
    const tiledImage = mask_map.get(m.Path);
    world.setItemIndex(tiledImage, Math.max(order, 0));
    tiledImage.setOpacity(1);
  });
};


HashState.prototype = {

  newMasks(viewer) {
    newMasks(this.active_masks, viewer);
  },

  createLens (viewer) {
    const vp = viewer.viewport;
    const first_point = vp.viewportToViewerElementCoordinates(
      vp.getCenter(true)
    );
    const first_center = [first_point.x, first_point.y];
    this.createLensUI(viewer);
    this.updateLensUI(first_center);
    viewer.addHandler('canvas-release', (e) => {
      this.state.lensHeld = false;
      this.state.lensAlphaHeld = false;
      this.state.lensResizeHeld = false;
      this.state.lensResizeBasis = null;
      this.state.lensAlphaBasis = null;
    });
    viewer.addHandler('canvas-press', (e) => {
      const [x, y] = [Math.round(e.position.x), Math.round(e.position.y)];
      this.state.lensHeld = this.isWithinLens([x, y]);
      if (this.isWithinResizeRing([x, y])) {
        this.state.lensResizeBasis = toReferenceVector([x, y], this.lensCenter);
        this.state.lensAlphaBasis = toReferenceVector(this.lensCenter, [x, y]);
        const basis_y = this.state.lensAlphaBasis[1];
        const control_alpha = Math.sign(basis_y) === -1;
        const control_resize = basis_y > this.lensRad / 4;
        if (control_resize) this.state.lensResizeHeld = true;
        else if (control_alpha) this.state.lensAlphaHeld = true;
      }
    });
    viewer.addHandler('canvas-drag', (e) => {
      const { lensResizeBasis, lensAlphaBasis } = this.state;
      const [x, y] = [Math.round(e.position.x), Math.round(e.position.y)];
      const resizing = (lensResizeBasis !== null && lensAlphaBasis !== null);
      if (this.state.lensHeld) {
        e.preventDefaultAction = true;
        this.updateLensUI([x, y]);
      }
      else if (this.state.lensResizeHeld || this.state.lensAlphaHeld) {
        e.preventDefaultAction = true;
        if (this.state.lensAlphaHeld && this.state.lensAlphaBasis) {
          const ref = this.state.lensAlphaBasis;
          const new_ref = toReferenceVector(this.lensCenter, [x, y]);
          const alpha_angle = toAngleTrajectory(ref, new_ref);
          const alpha_arc = this.lensRad * alpha_angle;
          const max_arc = this.lensRad * Math.PI;
          const new_alpha = ((alpha, change) => {
            return Math.min(Math.max(alpha - change, 0.1), 1);
          })(this.lensAlpha, alpha_arc / max_arc)
          this.state.lensAlphaBasis = new_ref;
          this.updateLensAlpha(new_alpha);
        }
        else if (this.state.lensResizeHeld && this.state.lensResizeBasis) {
          const ref = this.state.lensResizeBasis;
          const resize_dir = resizeDirection(ref, [e.delta.x, e.delta.y]);
          const resize_vector = toTrajectory(ref, [e.delta.x, e.delta.y]);
          const resize_mag = toDistance([0, 0], resize_vector);
          const resize_speed = this.state.lensResizeSpeed;
          const new_rad = ((rad, scale) => {
            const min = this.state.lensResizeMin;
            const max = this.state.lensResizeMax;
            if (isNaN(scale)) return rad;
            return Math.min(Math.max(rad + scale, min), max);
          })(this.lensRad, resize_speed * resize_dir * resize_mag);
          this.updateLensRadius(new_rad);
        }
        else {
          return;
        }
        this.updateLensUI(this.lensCenter);
      }
    });
  },

  createLensUI (viewer) {
    const nav_gap =  this.state.lensResizeThickness * .75;
    const {
      container, padding, alpha_handle, alpha_label
    } = to_container(nav_gap);
    this.state.lensUI = {
      container, padding, alpha_handle, alpha_label, nav_gap
    };
    const { parentElement } = viewer.element;
    parentElement.append(container);
  },

  updateLensUI (newLensCenter) {
    const rad = this.lensRad;
    const alpha = this.lensAlpha;
    if (!this.state.lensUI) return;
    if (newLensCenter) {
      this.lensCenter = newLensCenter;
    }
    const [x, y] = this.lensCenter;
    const no_lens = this.lensing === null;
    const { lensUI } = this.state;
    update_container({ ...lensUI, alpha, rad, x, y, no_lens });
    this.gl_state.redrawLensTiles();
  },

  updateLensAlpha (newAlpha) {
    this.state.lensAlpha = newAlpha;
  },

  updateLensRadius (newRad) {
    this.state.lensRad = newRad;
  },

  get lensAlpha () {
    return this.state.lensAlpha;
  },

  get lensRad () {
    return this.state.lensRad;
  },

  get lensCenter () {
    return this.state.eventPoint;
  },

  set lensCenter (xy) {
    this.state.eventPoint = xy;
  },

  isWithinLens (xy) {
    const lens_border = this.state.lensInsideBorder;
    if (this.lensing === null) {
      return false;
    }
    const center = this.lensCenter;
    const dist = toDistance(center, xy);
    const rad = this.lensRad - lens_border;
    return (dist < rad);
  },

  isWithinResizeRing (xy) {
    if (this.lensing === null) {
      return false;
    }
    const rad = this.lensRad;
    const center = this.lensCenter;
    const ring =  rad + this.state.lensResizeThickness;
    const dist = toDistance(center, xy);
    return dist < ring;
  },

  /*
   * Editor buffers
   */ 

  get bufferWaypoint() {
    if (this.state.buffer.waypoint === undefined) {
      const viewport = this.viewport;
      return remove_undefined({
        Zoom: viewport.scale,
        Pan: [
          viewport.pan.x,
          viewport.pan.y
        ],
        Arrows: [{
          Point: this.a,
          Text: '',
          HideArrow: false
        }],
        ActiveMasks: undefined,
        Masks: undefined,
        Polygon: this.p,
        Group: this.group.Name,
        Groups: undefined,
        Description: '',
        Name: 'Untitled',
        Overlays: [this.overlay]
      });
    }
    return this.state.buffer.waypoint;
  },

  set bufferWaypoint(bw) {
    this.state.buffer.waypoint = bw; 
  },

  /*
   * URL History
   */
  location: function(key) {
    return decodeURIComponent(location[key]);
  },

  get search() {
    const search = this.location('search').slice(1);
    const entries = search.split('&');
    return deserialize(entries);
  },

  get hash() {
    const hash = this.location('hash').slice(1);
    const entries = hash.split('#');
    return deserialize(entries);
  },

  get url() {
    const root = this.location('pathname');
    const search = this.location('search');
    const hash = this.location('hash');
    return root + search + hash;
  },

  get searchKeys() {
    const search_keys = Object.keys(this.search);
    return ['edit'].filter(x => search_keys.includes(x))
  },

  /*
   * A shared link includes the "d" key for description,
   * Otherwise, hash keys always include
   * s: story index
   * w: waypoint index
   * g: channel group index
   * m: mask indices
   * a: arrow coordinates
   * v: viewport coordinates
   * o: overlay coordinates
   * p: polygon definition
   */
  get hashKeys() {
    const oldTag = this.waypoint.Mode == 'tag';
    if (oldTag || this.isSharedLink) {
      return ['d', 's', 'w', 'g', 'm', 'a', 'v', 'o', 'p'];
    }
    else {
      return ['s', 'w', 'g', 'm', 'a', 'v', 'o', 'p', 'r'];
    }
  },

  /*
   * Search Keys
   */
  set edit(_edit) {
    this.state.edit = !!_edit;
  },

  get edit() {
    return !!this.state.edit;
  },

  get gl_state() {
    return this._gl_state;
  },

  /*
   * Control keys
   */

  // Used only for optional OMERO support
  get omero_cookie() {
    const HS = this;
    const username = 'jth30';
    const pass = new Promise(function(resolve, reject) {

      const selector = '.minerva-password_modal';
      $(HS.el).find(selector).modal('show');
      $(HS.el).find(selector).find('form').submit(function(e){
        $(HS.el).find(selector).find('form').off();
        $(this).closest('.modal').modal('hide');
        const formData = parseForm(e.target);
       
        // Get password from form
        const p = formData.p;
        resolve(p);
        return false;
      });
    });
    return omero_authenticate(username, pass);
  },

  // Used only for optional Cloud login support
  get token() {
    const HS = this;
    const username = 'john_hoffer@hms.harvard.edu'
    const pass = new Promise(function(resolve, reject) {
      // Hard code password for public account
      resolve('MEETING@lsp2');
      /* 
      const selector = '.minerva-password_modal';
      $(HS.el).find(selector).modal('show');
      $(HS.el).find(selector).find('form').submit(function(e){
        $(HS.el).find(selector).find('form').off();
        $(this).closest('.modal').modal('hide');
        const formData = parseForm(e.target);
       
        // Get password from form
        const p = formData.p;
        resolve(p);
        return false;
      });
      */
    });
    return this.authenticate(username, pass);
  },

  // drawType is lasso, arrow, or box
  get drawType() {
    return this.state.drawType;
  },
  set drawType(_l) {
    this.state.drawType = _l;
  },

  // Stage in multi-step overlay drawing process
  get drawing() {
    return this.state.drawing;
  },
  set drawing(_d) {
    const d = parseInt(_d, 10);
    this.state.drawing = pos_modulo(d, 3);
  },

  get singleChannelInfoOpen () {
    return [
      this.infoOpen, this.allowSingleChannels
    ].every(x => x)
  },

  get allowInfoIcon () {
    if (this.allowSingleChannels) return true;
    if (this.allowInfoLegend) return true;
    return false;
  },

  get allowSingleChannels () {
    return this.subpath_map.size > 0;
  },

  get allowInfoLegend () {
    return !!this.channel_legend_lines.find(line => {
      return line.description !== '';
    });
  },

  get infoOpen() {
    if (this.allowInfoIcon) {
      return this.state.infoOpen;
    }
    return false;
  },

  set infoOpen(b) {
    if (this.allowInfoIcon) {
      this.state.infoOpen = !!b;
    }
  },

  toggleInfo() {
    this.infoOpen = !this.infoOpen;
  },

  get addingOpen() {
    return this.state.addingOpen;
  },

  set addingOpen(b) {
    this.state.addingOpen = !!b;
  },

  toggleAdding() {
    this.addingOpen = !this.addingOpen;
  },

  /*
   * Hash Keys
   */

  // Viewport
  get v() {
    return this.state.v;
  },
  set v(_v) {
    this.state.v = _v.map(parseFloat);
  },

  // Arrow
  get a() {
    return this.state.a;
  },
  set a(_a) {
    this.state.a = _a.map(parseFloat);
  },

  // Mask indices
  get m() {
    const m = this.state.m;
    const count = this.masks.length;
    if (count == 0) {
      return [-1]
    }
    return m;
  },
  set m(_m) {
    if (Array.isArray(_m)) {
      this.state.m = _m.map(i => parseInt(i, 10));
    }
    else {
      this.state.m = [-1];
  }
  },

  // Overlay coordinates
  get g() {
    const g = this.state.g;
    const count = this.cgs.length;
    return g < count ? g : 0;
  },
  set g(_g) {
    const g = parseInt(_g, 10);
    const count = this.cgs.length;
    this.state.g = pos_modulo(g, count);
    // Dispatch color event
    this.activeChannel = -1;
  },

  /*
   * Exhibit Hash Keys
   */

  // Lens radius
  get r() {
    return Math.round(this.lensRad);
  },

  set r(_r) {
    const r = parseInt(_r, 10);
    this.updateLensRadius(r);
  },

  // Waypoint index
  get w() {
    const w = this.state.w[this.s] || 0;
    const count = this.waypoints.length;
    return w < count ? w : 0;
  },

  set w(_w) {
    const w = parseInt(_w, 10);
    const count = this.waypoints.length;
    this.state.w[this.s] = pos_modulo(w, count);

    // Set group, viewport from waypoint
    const waypoint = this.waypoint;
    if (waypoint.Lensing?.Rad) {
      this.updateLensRadius(waypoint.Lensing.Rad);
    }

    // this.slower();
    this.m = mFromWaypoint(waypoint, this.masks);
    this.g = gFromWaypoint(waypoint, this.cgs);
    this.v = vFromWaypoint(waypoint);
    if (this.waypoint.Mode == 'tag') {
      this.o = oFromWaypoint(waypoint);
      this.a = aFromWaypoint(waypoint);
    }
    else {
      this.o = [-100, -100, 1, 1];
      this.a = [-100, -100];
    }
    this.p = pFromWaypoint(waypoint);
    this.d = dFromWaypoint(waypoint);
    this.n = nFromWaypoint(waypoint);
  },

  // Story index
  get s() {
    const s = this.state.s;
    const count = this.stories.length;
    return s < count ? s : 0;
  },
  set s(_s) {
    const s = parseInt(_s, 10);
    const count = this.stories.length;
    this.state.s = pos_modulo(s, count);

    // Update waypoint
    this.w = this.w;
  },

  /*
   * Tag Hash Keys
   * for sharable tagged regions
   */

  // Overlay coordinates
  get o() {
    return this.state.o;
  },
  set o(_o) {
    this.state.o = _o.map(parseFloat);
  },

  // Polygon definition 
  get p() {
    return toPolygonURL(this.state.p);
  },
  set p(_p) {
    this.state.p = fromPolygonURL(_p);
  },

  // Description text 
  get d() {
    return this.state.description;
  },
  set d(_d) {
    this.state.description = '' + _d;
  },

  // Name text
  get n() {
    return this.state.name;
  },
  set n(_n) {
    this.state.name = '' + _n;
  },

  /*
   * Configuration State
   */
  get changed() {
    return this.state.changed;
  },
  set changed(_c) {
    this.state.changed = !!_c;
  },

  // The design contains all stories and waypoints
  get design() {
    return this.state.design;
  },
  set design(design) {

    const stories = design.stories;

    // Store waypoint indices for each story
    if (this.stories.length != stories.length) {
      this.state.w = stories.map(function(story, s) {
        return this.state.w[s] || 0;
      }, this);
    }

    // Update the design
    this.state.design = design;
  },

  // The mask definitions
  get masks() {
    const masks = this.waypoint.Masks || [];
    return (this.design.masks || []).filter((mask) => {
      return masks.includes(mask.Name);
    });
  },
  set masks(_masks) {
    var design = this.design;
    design.masks = _masks;
    this.design = design;
    this.changed = true;
  },

  // The channel groups
  get cgs() {
    return this.design.cgs || [];
  },

  set cgs(_cgs) {
    var design = this.design;
    design.cgs = _cgs;
    this.design = design;
    this.changed = true;
  },

  // The stories (ie collections of waypoints)
  get stories() {
    return this.design.stories || [];
  },
  set stories(_stories) {
    var design = this.design;
    design.stories = _stories;
    this.design = design;
    this.changed = true;
  },

  // Layout of multiple images in 2D grid
  get layout() {
    return this.design.layout || {
      Grid: []
    };
  },
  set layout(_layout) {
    var design = this.design;
    design.layout = _layout;
    this.design = design;
    this.changed = true;
  },

  // The image addresses
  get images() {
    return this.design.images || [];
  },
  set images(_images) {
    var design = this.design;
    design.images = _images;
    this.design = design;
    this.changed = true;
  },

  get grid() {
    return unpackGrid(this.layout, this.images, 'Grid');
  },

  get target() {
    return unpackGrid(this.layout, this.images, 'Target');
  },

  // Count the current waypoint index
  get currentCount() {
    const s = this.s;
    const w = this.w;
    return this.stories.reduce(function(count, story, idx) {
      if (s == idx) {
        return count + w;
      }
      else if (s > idx) {
        return count + story.Waypoints.length;
      }
      else {
        return count;
      }
    }, 1);
  },

  // Count the total number of waypoints
  get totalCount() {
    return this.stories.reduce(function(count, story) {
      return count + story.Waypoints.length;
    }, 0);
  },

  /*
   * Derived State
   */

  // Check if the link contains a waypoint defined by the user
  get isSharedLink() {
    const yes_d = this.hash.hasOwnProperty('d');
    const no_s = !this.hash.hasOwnProperty('s');
    const no_shared_link = this.stories.filter(story => {
      return story.Mode == 'tag';
    }).length == 0;
    return yes_d && (no_s || no_shared_link);
  },

  // Check whether there is no hash in the link
  get isMissingHash() {
    const no_s = !this.hash.hasOwnProperty('s');
    return !this.isSharedLink && no_s;
  },

  // Get the current story given by story index
  get story() {
    return this.stories[this.s];
  },
  set story(story) {
    const stories = this.stories;
    stories[this.s] = story;
    this.stories = stories;
  },

  // Get the active masks given by mask indices
  get active_masks() {
    const masks = this.masks;
    return this.m.map(function(m) {
      return masks[m];
    }).filter(mask => mask != undefined);
  },

  // Currently editable channel
  get activeChannel() {
    return this.state.activeChannel;
  },
  
  // Update current editable channel
  set activeChannel(c) {
    if (c < 0) {
      this.state.activeChannel = -1;
    }
    else {
      const n = this.group.Channels.length;
      this.state.activeChannel = pos_modulo(c, n);
    }
  },

  // Get the current group given by group index
  get group() {
    return this.cgs[this.g];
  },

  // Update or copy the current group
  set group(group) {
    const name = group.Name;
    const cgs = [...this.cgs];
    // Don't copy on minor changes
    if (can_mutate_group(this.group, group)) {
      cgs.splice(this.g, 1, group);
      this.cgs = cgs;
    }
    else {
      const copied = cgs.filter((group) => {
        return group.OriginalGroup === name;
      }).length + 1;
      group.Name = `${name} (\u202F${copied}\u202F)`;
      group.OriginalGroup = name;
      this.cgs = [...cgs, group];
      this.g = cgs.length;
    }
  },

  // Get the current lens group
  get lens_group() {
    const name = this.lensing?.Group;
    return this.cgs.find((group) => {
      return group.Name === name;
    }) || null;
  },

  // For rendering in single-channel mode
  get subpath_map () {
    return this.design.subpath_map || new Map();
  },

  get subpath_defaults () {
    const entries = [...this.subpath_map.entries()];
    return new Map(entries.map(([k, v]) => {
      const defaults = this.all_subgroups.find((subgroup) => {
        return subgroup.Name === k;
      }) || {
        Colors: ["ffffff"], Description: '', Name: k, Path: v
      }
      return [k, defaults];
    }));
  },

  // Get openseadragon subgroup layers
  get subgroup_layers () {
    const { all_subgroups, subpath_map } = this;
    const colorize = this.allowSingleChannels;
    return all_subgroups.map((subgroup, i) => {
      const g = { ...subgroup };
      g['Format'] = g['Format'] || 'jpg';
      return g;
    }, []);
  },

  // Get mask layers
  get mask_layers () {
    const { masks } = this;
    return this.masks.map(mask => {
      const m = { ...mask };
      m['Format'] = m['Format'] || 'png';
      m['Colorize'] = false;
      return m;
    });
  },

  // Get all image layers
  get layers () {
    const { mask_layers, subgroup_layers } = this;
    return subgroup_layers.concat(mask_layers);
  },

  // Get the subgroups of all possible layers
  get all_subgroups() {
    const { subpath_map, rendered_map } = this;
    const inactive = this.cgs.filter(({Name}) => {
      return Name !== this.group.Name;
    });
    // Ensure active group has priority
    const groups = [this.group, ...inactive];
    // Find all unqiue subgroups among groups
    return [...groups.reduce((o, group) => {
      const subgroups = to_subgroups(subpath_map, rendered_map, group, true);
      return subgroups.reduce((o, subgroup) => {
        if (o.has(subgroup.Name)) return o;
        o.set(subgroup.Name, subgroup);
        return o;
      }, o);
    }, new Map()).values()];
  },

  // Get the subgroups of the current layer
  get active_subgroups() {
    const { subpath_map, rendered_map, group } = this;
    const out = to_subgroups(subpath_map, rendered_map, group, false);
    return out.map(sub => ({ ...sub, Lens: false }));
  },
  
  // Get the subgroups of current lens
  get lens_subgroups() {
    const { subpath_map, rendered_map, lens_group } = this;
    const group = this.lens_group;
    if (group === null) return [];
    const out = to_subgroups(subpath_map, rendered_map, lens_group, false);
    return out.map(sub => ({ ...sub, Lens: true }));
  },

  // Get the colors of the current lens's channels
  get lens_colors() {
    return this.lens_group?.Colors || [];
  },

  // Get the colors of the current group's channels
  get colors() {
    const g_colors = this.group.Colors;
    return g_colors.concat(this.masks.reduce((c, m) => {
      return c.concat(m.Colors || []);
    }, []));
  },

  // Get the names of the current lens's channels
  get lens_channel_names() {
    return this.lens_group?.Channels || [];
  },

  // Get the descriptions of the current lens's channels
  get lens_channel_descriptions() {
    return this.lens_group?.Descriptions || [];
  },

  // Get the visibilities of the current lens's channels
  get lens_channel_shown() {
    return this.lens_group?.Shown || [];
  },

  // Get the names of the current group's channels
  get channel_names() {
    const g_chans = this.group.Channels;
    return g_chans.concat(this.masks.reduce((c, m) => {
      return c.concat(m.Channels || []);
    }, []));
  },

  // Get the descriptions of current group's channels
  get channel_descriptions() {
    const g_chans = this.group.Descriptions || [];
    return g_chans.concat(this.masks.reduce((c, m) => {
      return c.concat(m.Descriptions || []);
    }, []));
  },

  // Get the visibilities of the current group's channels
  get channel_shown() {
    return [
      ...(this.group?.Shown || []),
      ...this.masks.map((mask, m) => {
        if (this.m.includes(m)) {
          return mask.Shown
        }
        return false;
      })
    ];
  },

  // Get all channel names and descriptions 
  get channel_legend_lines() {
    const group_length = this.group?.Shown.length;
    const channel_shown = [
      ...this.channel_shown,
      ...this.lens_channel_shown
    ];
    const channel_group_indices = [
      ...this.channel_shown.map((_, i) => {
        if (i >= group_length) return -1;
        return i;
      }),
      ...this.lens_channel_shown.map(() => -1)
    ]
    const channel_mask_indices  = [
      ...this.channel_shown.map((_, i) => {
        if (i < group_length) return -1;
        return i - group_length;
      }),
      ...this.lens_channel_shown.map(() => -1)
    ];
    const channel_descriptions = [
      ...this.channel_descriptions,
      ...this.lens_channel_descriptions
    ];
    const channel_colors = [
      ...this.colors, ...this.lens_colors
    ];
    const channel_names = [
      ...this.channel_names, ...this.lens_channel_names
    ];
    return channel_names.reduce((out, name, i) => {
      if (out.find(o => o.name === name)) return out;
      const description = channel_descriptions[i] || '';
      const mask_index = channel_mask_indices[i];
      const group_index = channel_group_indices[i];
      const color = channel_colors[i] || '';
      const shown = channel_shown[i] || false;
      const rendered = this.isRendered(name);
      const line = { 
        rendered, name, description, color,
        shown, mask_index, group_index
      };
      return [...out, line];
    }, []);
  },

  // Get the waypoints of the current story
  get waypoints() {
    return (this.story || {}).Waypoints || [];
  },
  set waypoints(waypoints) {
    const story = this.story;
    story.Waypoints = waypoints;
    this.story = story;
  },

  // Get the waypoint at the current waypoint index
  get waypoint() {
    if (this.edit) {
      return this.bufferWaypoint;
    }
    var waypoint = this.waypoints[this.w];
    if (waypoint && !waypoint.Overlays) {
      waypoint.Overlays = [{
        x: -100,
        y: -100,
        width: 1,
        height: 1
      }];
    }
    return waypoint;
  },
  set waypoint(waypoint) {
    if (this.edit) {
      this.bufferWaypoint = waypoint;
    }
    else {
      const waypoints = this.waypoints;
      waypoints[this.w] = waypoint;
      this.waypoints = waypoints;
    }
  },

  get lensing() {
    const wp = this.waypoint;
    const { Lensing } = this.exhibit;
    const lensing = !!wp ? wp.Lensing : Lensing;
    if (lensing?.Group !== this.group.Name) {
      return lensing || null;
    }
    return null;
  },

  // Get the viewport object from the current viewport coordinates
  get viewport() {
    const v = this.v;
    return {
      scale: v[0],
      pan: new OpenSeadragon.Point(v[1], v[2])
    };
  },

  // Get the overlay object from the current overlay coordinates
  get overlay() {
    const o = this.o;
    return {
      x: o[0],
      y: o[1],
      width: o[2],
      height: o[3]
    };
  },

  get rendered_map() {
    return this.design.is_rendered_map;
  },

  isRendered(name) {
    if (this.rendered_map.has(name)) {
      return this.rendered_map.get(name);
    }
    return false;
  },

  /*
   * State manaagement
   */

  // create an exhibit from the configuration file
  newExhibit: function() {
    const exhibit = this.exhibit;
    const cgs = exhibit.Groups || [];
    const masks = exhibit.Masks || [];
    var stories = exhibit.Stories || [];
    const channelList = exhibit.Channels || [];
    stories = stories.reduce((_stories, story) => {
      story.Waypoints = story.Waypoints.map(waypoint => {
        if (waypoint.Overlay != undefined) {
          waypoint.Overlays = [waypoint.Overlay];
        }
        return waypoint;
      })
      // Require story to have Waypoints
      if (story.Waypoints.length < 1) {
        return _stories; 
      }
      return _stories.concat([story]);
    }, [])

    this.design = {
      layout: exhibit.Layout || {},
      images: exhibit.Images || [],
      header: exhibit.Header || '',
      footer: exhibit.Footer || '',
      is3d: exhibit['3D'] || false,
      z_scale: exhibit['ZPerMicron'] || 0,
      default_group: exhibit.DefaultGroup || '',
      first_group: exhibit.FirstGroup || '',
      first_arrows: exhibit.FirstArrows || [],
      first_viewport: exhibit.FirstViewport || null,
      is_rendered_map: channelList.reduce((o, c) => {
        o.set(c.Name, c.Rendered || false);
        return o;
      }, new Map()),
      subpath_map: channelList.reduce((o, c) => {
        o.set(c.Name, c.Path);
        return o;
      }, new Map()),
      masks: add_mask_visibility(masks),
      cgs: add_visibility(cgs),
      stories: stories,
    };

    const outline_story = this.newTempStory('outline');
    this.stories = [outline_story].concat(this.stories);

  },

  // Create an empty story from current hash state
  newTempStory: function(mode) {
    const exhibit = this.exhibit;
    const first_g = index_name(this.cgs, this.design.first_group);
    const first_group = (first_g != -1) ? this.cgs[first_g] : this.group;
    const first_lens = ((l) => {
      if (l && Object.keys(l).length) return l;
    })(this.lensing);
    const group = mode != 'tag' ? first_group : this.group;
    let v = this.v;
    const { first_arrows, first_viewport } = this.design;
    // Allow setting viewport for table of contents
    if (first_viewport && mode != 'tag') {
      const zoom = first_viewport.Zoom;
      const pan = first_viewport.Pan;
      v = [zoom, ...pan];
    }
    const a = this.a;
    const o = this.o;
    const p = this.p;

    const header = this.design.header;
    const d = mode == 'outline' ? encode(header) : this.d;

    // Three types of empty story
    const name = {
      'tag': 'Shared Link',
      'outline': 'Introduction'
    }[mode];

    const groups = {
    }[mode];

    const arrows = {
      'outline': first_arrows
    }[mode] || [{
      Point: a
    }];

    // Empty story object of a single waypoint
    return {
      Mode: mode,
      Description: '',
      Name: name || 'Story',
      Waypoints: [remove_undefined({
        Mode: mode,
        Zoom: v[0],
        Arrows: arrows,
        Polygon: p,
        Pan: v.slice(1),
        Masks: (exhibit.Masks || []).map(mask => mask.Name).filter(
          mask_name => {
            return (this.waypoints.length == 0) || this.waypoints.some(
              wp => (wp.Masks || []).includes(mask_name)
            );
          }
        ),
        ActiveMasks: [],
        Group: group.Name,
        Groups: groups,
        Lensing: first_lens,
        Description: decode(d),
        Name: name || 'Waypoint',
        Overlays: [{
          x: o[0],
          y: o[1],
          width: o[2],
          height: o[3],
        }],
      })]
    }
  },

  // Update the url with the hash state
  pushState: function() {

    if (typeof this.customPushState === "function" ) {
      this.customPushState.call(this);
    }
    else {
      const url = this.makeUrl(this.hashKeys, this.searchKeys);

      if (this.url == url && !this.changed) {
        return;
      }

      if (this.embedded) {
        history.replaceState(this.design, document.title, url);
      }
      else {
        history.pushState(this.design, document.title, url);
      }
      const href = window.location.origin + url;
      parent.postMessage({ href }, "*");

      this.changed = false;
    }
  },

  // Update the hash state from the url
  popState: function(e) {
    if (e && e.state) {
      this.changed = false;
      this.design = e.state;
    }
    const hash = this.hash;
    const search = this.search;
    const searchKeys = this.searchKeys;

    if (typeof this.customPopState === "function" ) {
      this.customPopState.call(this);
    }
    else {
      // Take search parameters
      this.searchKeys.forEach(function(key) {
        this[key] = search[key];
      }, this);

      // Accept valid hash
      this.hashKeys.forEach(function(key) {
        if (hash.hasOwnProperty(key)) {
          this[key] = hash[key];
        }
      }, this);

      // Handle user-defined shared links
      if (this.isSharedLink) {
        this.d = hash.d;
        const tag_story = this.newTempStory('tag'); 
        this.stories = this.stories.concat([tag_story]);
        this.s = this.stories.length - 1;
        this.pushState();
        window.onpopstate();
      }
      // Show welcome page if no hash present
      else if (this.isMissingHash) {
        if (!this.hideWelcome) {
          const welcome = $(this.el).find('.minerva-welcome_modal');
          if (!this.customWelcome) {
            const channel_count = welcome.find('.minerva-channel_count')[0];
            channel_count.innerText = this.channel_names.length;
          }
          else {
            const welcome_body = welcome.find('.modal-body')[0];
            welcome_body.innerHTML = this.customWelcome;
          }
          welcome.modal('show');
        }
        // Set default story even if welcome hidden
        this.s = 0; 
        this.pushState();
        window.onpopstate();
      }
    }
  },

  // Make a url from location, hash, and search terms
  makeUrl: function(hashKeys, searchKeys) {
    const root = this.location('pathname');
    const hash = this.makeHash(hashKeys);
    const search = this.makeSearch(searchKeys);
    return  root + search + hash;
  },

  // Make the hash component of the url
  makeHash: function(hashKeys) {
    const hash = serialize(hashKeys, this, '#');
    return hash? '#' + hash : '';
  },

  // Make the search component of the url
  makeSearch: function(searchKeys) {
    const search = serialize(searchKeys, this, '&');
    return search? '?' + search : '';
  },

  // Editor mode uses a buffer waypoint
  startEditing: function(_waypoint) {
    const bw = _waypoint || this.bufferWaypoint;
    this.bufferWaypoint = bw;

    this.v = vFromWaypoint(bw);
    this.o = oFromWaypoint(bw);
    this.p = pFromWaypoint(bw);
    this.d = dFromWaypoint(bw);
    this.n = nFromWaypoint(bw);
    this.a = aFromWaypoint(bw);
    this.m = mFromWaypoint(bw, this.masks);
    this.g = gFromWaypoint(bw, this.cgs);
  },

  // Exiting editor mode updates the buffer waypoint
  finishEditing: function() {
    const bw = this.bufferWaypoint;
    bw.Group = this.group.Name;
    bw.Name = decode(this.n);
    bw.Description = decode(this.d);
    bw.Zoom = this.viewport.scale;
    bw.Overlays = [this.overlay];
    bw.ActiveMasks = this.active_masks.map(mask => mask.Name)
    bw.Arrows[0].Point = this.a;
    bw.Polygon = this.p;
    bw.Pan = [
      this.viewport.pan.x,
      this.viewport.pan.y
    ];
    this.bufferWaypoint = bw;
    this.pushState();
    window.onpopstate();
  },

  // Start drawing in one of three modes
  startDrawing: function() {
    this.drawing = 1;

    const waypoint = this.waypoint;
 
    if (this.drawType == "lasso") {
      this.p = toPolygonURL([]);
    }
    else if (this.drawType == "arrow") {
      this.a = [-100, -100];
    }
    else {
      this.o = [-100, -100, 1, 1];
    }
  },
  // Immediately cancel drawing mode
  cancelDrawing: function() {
    this.drawing = 0;
  },
  // Properly complete a drawing
  finishDrawing: function() {

    if (this.edit) {
      this.drawing = 0;
      this.finishEditing();
      this.startEditing();
      this.pushState();
    }
    else {
      $(this.el).find('.minerva-edit_description_modal').modal('show');
    }
  },

  // Return both waypoint-defined arrows and user-defined arrows
  get allArrows() {
    return this.stories.reduce((all, story, s) => {
      return all.concat(story.Waypoints.reduce((idx, _, w) => {
        const w_arrows = this.stories[s].Waypoints[w].Arrows || [];
        const w_idx = w_arrows.map((_, a) => { 
          return ['waypoint-arrow', s, w, a];
        }).concat([['user-arrow', s, w, 0]]);
        return idx.concat(w_idx);
      }, []));
    }, []);
  },

  // Return both waypoint-defined overlays and user-defined overlays
  get allOverlays() {
    return this.stories.reduce((all, story, s) => {
      return all.concat(story.Waypoints.reduce((idx, _, w) => {
        const w_overlays = this.stories[s].Waypoints[w].Overlays || [];
        const w_idx = w_overlays.map((_, o) => { 
          return ['waypoint-overlay', s, w, o];
        }).concat([['user-overlay', s, w, 0]]);
        return idx.concat(w_idx);
      }, []));
    }, []);
  },

  // Render current waypoint as configuration-style yaml
  get bufferYaml() {
    const viewport = this.viewport;
    const waypoint = this.waypoint;
    waypoint.Overlays = [this.overlay]; 
    waypoint.Name = decode(this.n);
    waypoint.Description = decode(this.d);

    const THIS = this;
    waypoint.ActiveMasks = this.m.filter(function(i){
      return i >= 0;
    }).map(function(i) {
      return THIS.masks[i].Name;
    })
    waypoint.Group = this.cgs[this.g].Name;
    waypoint.Pan = [viewport.pan.x, viewport.pan.y];
    waypoint.Zoom = viewport.scale;

    const wid_yaml = yaml.safeDump([[[waypoint]]], {
      lineWidth: 40,
      noCompatMode: true,
    });
    return wid_yaml.replace('- - - ', '    - ');
  },

  isActiveGroupName(match) {
    const key = 'Name';
    const masks = this.active_masks;
    const subgroups = [ this.group ];
    return is_active({ masks, subgroups, key, match });
  },

  isLensPath(match) {
    const masks = [];
    const key = 'Path';
    const subgroups = this.lens_subgroups;
    return is_active({ masks, subgroups, key, match });
  },

  isLensName(match) {
    const masks = [];
    const key = 'Name';
    const subgroups = this.lens_subgroups;
    return is_active({ masks, subgroups, key, match });
  },

  isVisibleLayer(match) {
    const key = 'Path';
    const masks = this.active_masks;
    const subgroups = [
      ...this.active_subgroups, ...this.lens_subgroups
    ];
    const result = is_active({ masks, subgroups, key, match });
    return result.active;
  }
};

// Get headers for various image providers
export const getAjaxHeaders = function(state, image){
  if (image.Provider == 'minerva') {
    return state.token.then(function(token){
      return {
        'Content-Type': 'application/json',
        'Authorization': token,
        'Accept': 'image/png'
      };
    });  
  }
  if (image.Provider == 'minerva-public') {
    return Promise.resolve().then(function(){
      return {
        'Content-Type': 'application/json',
        'Authorization': 'Anonymous',
        'Accept': 'image/png'
      };
    });  
  }
  if (image.Provider == 'omero') {
    /*return state.omero_cookie.then(function(cookie){
      //document.cookie = cookie;
      return {};
    })*/
  }
  return Promise.resolve({});
};


// Get index of name in a list of names
export const index_name = function(list, name) {
  if (!Array.isArray(list)) {
    return -1;
  }
  const item = list.filter(function(i) {
    return (i.Name == name);
  })[0];
  return list.indexOf(item);
};

// Get index of regex pattern in a list of names
export const index_regex = function(list, re) {
  if (!Array.isArray(list)) {
    return -1;
  }
  const item = list.filter(function(i) {
    return !!i.Name.match(re);
  })[0];
  return list.indexOf(item);
};
