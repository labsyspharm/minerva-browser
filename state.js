import { encode } from './render'
import { decode } from './render'
import { unpackGrid } from './render'
import { remove_undefined } from './render'

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

  this.state = {
    buffer: {
      waypoint: undefined
    },
    drawType: "lasso",
    changed: false,
    design: {},
    m: [-1],
    w: [0],
    g: 0,
    s: 0,
    a: [-100, -100],
    v: [0.5, 0.5, 0.5],
    o: [-100, -100, 1, 1],
    p: [],
    name: '',
    description: '',
    edit: false,
    drawing: 0
  };

  this.newExhibit();

};

HashState.prototype = {

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
      return ['s', 'w', 'g', 'm', 'a', 'v', 'o', 'p'];
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
  },

  /*
   * Exhibit Hash Keys
   */

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
    return this.design.masks || [];
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

  // Get the current group given by group index
  get group() {
    return this.cgs[this.g];
  },

  // Get the colors of the current group's channels
  get colors() {
    const g_colors = this.group.Colors;
    return g_colors.concat(this.active_masks.reduce((c, m) => {
      return c.concat(m.Colors || []);
    }, []));
  },

  // Get the names of the current group's channels
  get channels() {
    const g_chans = this.group.Channels;
    return g_chans.concat(this.active_masks.reduce((c, m) => {
      return c.concat(m.Channels || []);
    }, []));
  },

  // Get the waypoints of the current story
  get waypoints() {
    return this.story.Waypoints;
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
    if (!waypoint.Overlays) {
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

  /*
   * State manaagement
   */

  // create an exhibit from the configuration file
  newExhibit: function() {
    const exhibit = this.exhibit;
    const cgs = exhibit.Groups || [];
    const masks = exhibit.Masks || [];
    var stories = exhibit.Stories || [];
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
      stories: stories,
      masks: masks,
      cgs: cgs
    };

    const outline_story = this.newTempStory('outline');
    this.stories = [outline_story].concat(this.stories);

    if (this.stories.length > 1) {
      const explore_story = this.newTempStory('explore');
      this.stories = this.stories.concat([explore_story]);
    }
  },

  // Create an empty story from current hash state
  newTempStory: function(mode) {
    const exhibit = this.exhibit;
    const first_g = index_name(this.cgs, this.design.first_group);
    const first_group = (first_g != -1) ? this.cgs[first_g] : this.group;
    const group = mode != 'tag' ? first_group : this.group;
    const a = this.a;
    const o = this.o;
    const p = this.p;
    const v = this.v;

    const header = this.design.header;
    const d = mode == 'outline' ? encode(header) : this.d;

    // Three types of empty story
    const name = {
      'explore': 'Appendix',
      'tag': 'Shared Link',
      'outline': 'Introduction'
    }[mode];

    const groups = {
    }[mode];

    const masks = {
      'explore': this.masks.filter(mask => mask.Name).map(mask => mask.Name),
    }[mode];

    const active_masks = {
      'tag': this.active_masks.filter(mask => mask.Name).map(mask => mask.Name),
    }[mode];

    // Empty story object of a single waypoint
    return {
      Mode: mode,
      Description: '',
      Name: name || 'Story',
      Waypoints: [remove_undefined({
        Mode: mode,
        Zoom: v[0],
        Arrows: [{
          Point: a
        }],
        Polygon: p,
        Pan: v.slice(1),
        ActiveMasks: active_masks,
        Group: group.Name,
        Masks: masks,
        Groups: groups,
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
      else if (this.isMissingHash && !this.hideWelcome) {
        this.s = 0; 
        const welcome = $(this.el).find('.minerva-welcome_modal');
        if (!this.customWelcome) {
          const channel_count = welcome.find('.minerva-channel_count')[0];
          channel_count.innerText = this.channels.length;
        }
        else {
          const welcome_body = welcome.find('.modal-body')[0];
          welcome_body.innerHTML = this.customWelcome;
        }
        welcome.modal('show');

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

// Return a function for Openseadragon's getTileUrl API
export const getGetTileUrl = function(image, layer) {

  const renderList = layer.Render;

  // This default function simply requests for rendered jpegs
  const getJpegTile = function(level, x, y) {
    const fileExt = '.' + layer.Format;
    return image.Path + '/' + layer.Path + '/' + (image.MaxLevel - level) + '_' + x + '_' + y + fileExt;
  };

  // Handle Optional AWS lambda functionality rendering images
  if (image.Provider == 'minerva' || image.Provider == 'minerva-public') {
    const channelList = renderList.reduce(function(list, settings, i) {

      const allowed = settings.Images;
      if (allowed.indexOf(image.Name) >= 0) {
        const index = settings.Index;
        const color = settings.Color;
        const min = settings.Range[0];
        const max = settings.Range[1];
        const specs = [index, color, min, max];
        list.push(specs.join(','));
      }
      return list;
    }, []);

    let api = image.Path;
    let channelPath = channelList.join('/');
    if (image.Path.includes('/prerendered-tile/')) {
      channelPath = layer.Path;
    }

    const getMinervaTile = function(level, x, y) {
      const lod = (image.MaxLevel - level) + '/';
      const pos = x + '/' + y + '/0/0/';
      const url = api + pos + lod + channelPath;
      return url; 
    };

    return getMinervaTile;
  }
  // Handle optional Omero functionality for rendering images
  else if (image.Provider == 'omero') {
    const channelList = renderList.reduce(function(list, settings, i) {

      const allowed = settings.Images;
      if (allowed.indexOf(image.Name) >= 0) {
        const index = settings.Index;
        const color = settings.Color;
        const min = Math.round(settings.Range[0] * 65535);
        const max = Math.round(settings.Range[1] * 65535);
        list.push(index + '|' + min + ':' + max + '$' + color);
      }
      return list;
    }, []);
    const channelPath = channelList.join(',');

    const getOmeroTile = function(level, x, y) {
      const api = image.Path + '?c=' + channelPath;
      const lod = (image.MaxLevel - level);
      const pos = lod + ',' + x + ',' + y + ',';
      const trash = '&m=c&z=1&t=1&format=jpeg&tile=';
      const url = api + trash + pos + image.TileSize.join(','); 
      return url; 
    };

    return getOmeroTile; 
  }
  // Default function is returned
  else {
    return getJpegTile; 
  }
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
