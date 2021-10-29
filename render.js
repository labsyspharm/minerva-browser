import sha1 from 'sha1'
import { index_name } from './state'
import { index_regex } from './state'
import { Clipboard } from './clipboard'
import infovis from './infovis'

// Round to one decimal place
const round1 = function(n) {
  return Math.round(n * 10) / 10;
};

// Round to four decimal places
export const round4 = function(n) {
  const N = Math.pow(10, 4);
  return Math.round(n * N) / N;
};

// Remove keys with undefined values
export const remove_undefined = function(o) {
  Object.keys(o).forEach(k => {
    o[k] == undefined && delete o[k]
  });
  return o;
};

// Encode arbitrary string in url
export const encode = function(txt) {
  return btoa(encodeURIComponent(txt));
};

// Decode arbitrary string from url
export const decode = function(txt) {
  try {
    return decodeURIComponent(atob(txt));
  }
  catch (e) {
    return '';
  }
};

// Remove all children of a DOM node
const clearChildren = function(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
};

// Return object with form values
const parseForm = function(elem) {
  const formArray = $(elem).serializeArray();
  return formArray.reduce(function(d, i) {
    d[i.name] = i.value;
    return d;
  }, {});
};

// Add or remove a class based on a condition
const classOrNot = function(selector, condition, cls) {
  if (condition) {
    return $(selector).addClass(cls);
  }
  return $(selector).removeClass(cls);
};

// Toggle display of none based on condition
const displayOrNot = function(selector, condition) {
  classOrNot(selector, !condition, 'd-none');
};

// Set to green or white based on condition
export const greenOrWhite = function(selector, condition) {
  classOrNot(selector, condition, 'minerva-green');
  classOrNot(selector, !condition, 'minerva-white');
};

// Toggle cursor style based on condition
const toggleCursor = function(selector, cursor, condition) {
  if (condition) {
    $(selector).css('cursor', cursor);
  }
  else {
    $(selector).css('cursor', 'default');
  }
};

// encode a polygon as a URL-safe string
var toPolygonURL = function(polygon){
    pointString='';
    polygon.forEach(function(d){
        pointString += d.x.toFixed(5) + "," + d.y.toFixed(5) + ",";
    })
    pointString = pointString.slice(0, -1); //removes "," at the end
    var result =  LZString.compressToEncodedURIComponent(pointString);
    return result;
}

// decode a URL-safe string as a polygon
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

// Download a text file
const download = function(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};

// Copy string to clipboard
const ctrlC = function(str) {
  Clipboard.copy(str);
};

// return a list of image objects from a flattened layout
export const unpackGrid = function(layout, images, key) {
  const image_map = images.reduce(function(o, i) {

    i.TileSize = i.TileSize || [1024, 1024];
    i.maxLevel = i.maxLevel || 0;

    // Add to dictionary by Name
    o[i.Name] = i;

    return o;
  }, {});

  return layout[key].map(function(row) {
    return row.map(function(image_name) {
      return this.image_map[image_name];
    }, {image_map: image_map});
  }, {image_map: image_map});
};

// Create a button to copy hash state yaml to clipboard
const newCopyYamlButton = function(THIS) {
  const copy_pre = 'Copy to Clipboard';
  const copy_post = 'Copied';
  $(this).tooltip({
    title: copy_pre
  });

  $(this).on('relabel', function(event, message) {
    $(this).attr('data-original-title', message).tooltip('show');
  });

  $(this).click(function() {
    $(this).trigger('relabel', [copy_post]);
    ctrlC(THIS.hashstate.bufferYaml);
    setTimeout((function() {
      $(this).trigger('relabel', [copy_pre]);
    }).bind(this), 1000);
    return false;
  });
};

// Create a button to copy form data to clipboard
const newCopyButton = function() {
  const copy_pre = 'Copy to Clipboard';
  const copy_post = 'Copied';
  $(this).tooltip({
    title: copy_pre
  });

  $(this).on('relabel', function(event, message) {
    $(this).attr('data-original-title', message).tooltip('show');
  });

  $(this).on('click', function() {
    const form = $(this).closest('form');
    const formData = parseForm(form);
    $(this).trigger('relabel', [copy_post]);
    ctrlC(formData.copy_content);
    setTimeout(function() {
      $(this).trigger('relabel', [copy_pre]);
    }, 1000);
  return false;
  });
};

// Render the non-openseadragon UI
export const Render = function(hashstate, osd) {

  this.trackers = hashstate.trackers;
  this.pollycache = hashstate.pollycache;
  this.showdown = new showdown.Converter();

  this.osd = osd;
  this.hashstate = hashstate;
};

Render.prototype = {

  init: function(aspect_ratio) {

    const HS = this.hashstate;
    // Go to true center
    HS.v = [HS.v[0], 0.5 * aspect_ratio, 0.5];
    HS.newExhibit();

    // Read hash
    window.onpopstate = (function(e) {
      HS.popState(e);
      this.loadPolly(HS.waypoint.Description, HS.speech_bucket);
      this.newView(true);
    }).bind(this);

    window.onpopstate();
    if (this.edit) {
      HS.startEditing();
    }
    HS.pushState();
    window.onpopstate();

    // Exhibit name
    $('#exhibit-name').text(HS.exhibit.Name);
    // Copy buttons
    $('.minerva-modal_copy_button').each(newCopyButton);

    // Define button tooltips
    $('.minerva-zoom-in').tooltip({
      title: 'Zoom in'
    });
    $('.minerva-zoom-out').tooltip({
      title: 'Zoom out'
    });
    $('.minerva-arrow-switch').tooltip({
      title: 'Share Arrow'
    });
    $('.minerva-lasso-switch').tooltip({
      title: 'Share Region'
    });
    $('.minerva-draw-switch').tooltip({
      title: 'Share Box'
    });
    $('.minerva-duplicate-view').tooltip({
      title: 'Clone linked view'
    });

    // Modals to copy shareable link and edit description
    $('#copy_link_modal').on('hidden.bs.modal', HS.cancelDrawing.bind(HS));
    $('.minerva-edit_description_modal').on('hidden.bs.modal', HS.cancelDrawing.bind(HS));

    // Button to toggle sidebar
    $('.minerva-toggle-sidebar').click(function(e) {
      e.preventDefault();
      $(".minerva-sidebar-menu").toggleClass("toggled");
    });

    // Button to toggle legend
    $('.minerva-toggle-legend').click(function(e) {
      e.preventDefault();
      $(".minerva-legend").toggleClass("toggled");
    });

    // Left arrow decreases waypoint by 1
    $('.minerva-leftArrow').click(this, function(e) {
      const HS = e.data.hashstate;
      if (HS.w == 0) {
        HS.s = HS.s - 1;
        HS.w = HS.waypoints.length - 1;
      }
      else {
        HS.w = HS.w - 1;
      }
      HS.pushState();
      window.onpopstate();
    });

    // Right arrow increases waypoint by 1
    $('.minerva-rightArrow').click(this, function(e) {
      const HS = e.data.hashstate;
      const last_w = HS.w == (HS.waypoints.length - 1);
      if (last_w) {
        HS.s = HS.s + 1;
        HS.w = 0;
      }
      else {
        HS.w = HS.w + 1;
      }
      HS.pushState();
      window.onpopstate();
    });

    // Show table of contents
    $('.minerva-toc-button').click(this, function(e) {
      const HS = e.data.hashstate;
      if (HS.waypoint.Mode != 'outline') {
        HS.s = 0; 
        HS.pushState();
        window.onpopstate();
      }
    });

    // Clear current editor buffer
    $('.clear-switch').click(this, function(e) {
      const HS = e.data.hashstate;
      HS.bufferWaypoint = undefined;
      HS.startEditing();
      HS.pushState();
      window.onpopstate();
    });
    
    // Toggle arrow drawing mode
    $('.minerva-arrow-switch').click(this, function(e) {
      const HS = e.data.hashstate;
      const THIS = e.data;
      HS.drawType = "arrow";
      if (HS.drawing) {
        HS.cancelDrawing(HS);
      }
      else {
        HS.startDrawing(HS);
      }
      HS.pushState();
      THIS.newView(false);
    });

    // Toggle lasso drawing mode
    $('.minerva-lasso-switch').click(this, function(e) {
      const HS = e.data.hashstate;
      const THIS = e.data;
      HS.drawType = "lasso";
      if (HS.drawing) {
        HS.cancelDrawing(HS);
      }
      else {
        HS.startDrawing(HS);
      }
      HS.pushState();
      THIS.newView(false);
    });

    // Toggle box drawing mode
    $('.minerva-draw-switch').click(this, function(e) {
      const HS = e.data.hashstate;
      const THIS = e.data;
      HS.drawType = "box";
      if (HS.drawing) {
        HS.cancelDrawing(HS);
      }
      else {
        HS.startDrawing(HS);
      }
      HS.pushState();
      THIS.newView(false);
    });

    // Handle Z-slider when in 3D mode
    var z_legend = HS.el.getElementsByClassName('minerva-depth-legend')[0];
    var z_slider = HS.el.getElementsByClassName('minerva-z-slider')[0];
    z_slider.max = HS.cgs.length - 1;
    z_slider.value = HS.g;
    z_slider.min = 0;

    // Show z scale bar when in 3D mode
    if (HS.design.is3d && HS.design.z_scale) {
      z_legend.innerText = round1(HS.g / HS.design.z_scale) + ' μm';
    }
    else if (HS.design.is3d){
      z_legend.innerText = HS.group.Name; 
    }

    // Handle z-slider change when in 3D mode
    const THIS = this;
    z_slider.addEventListener('input', function() {
      HS.g = z_slider.value;
      if (HS.design.z_scale) {
        z_legend.innerText = round1(HS.g / HS.design.z_scale) + ' μm';
      }
      else {
        z_legend.innerText = HS.group.Name; 
      }
      THIS.newView(true)
    }, false);

    // Handle submission of description for sharable link
    $('.minerva-edit_description_modal form').submit(this, function(e){
      const HS = e.data.hashstate;
      const formData = parseForm(e.target);
      $(this).closest('.modal').modal('hide');

      // Get description from form
      HS.d = encode(formData.d);
      $('.minerva-copy_link_modal').modal('show');

      const root = HS.location('host') + HS.location('pathname');
      const hash = HS.makeHash(['d', 'g', 'm', 'a', 'v', 'o', 'p']);
      const link = HS.el.getElementsByClassName('minerva-copy_link')[0];
      link.value = root + hash;

      return false;
    });
  },
  // Rerender only openseadragon UI or all UI if redraw is true
  newView: function(redraw) {

    const HS = this.hashstate;
    this.osd.newView(redraw);
    // Redraw design
    if(redraw) {
      // Redraw HTML Menus
      this.addChannelLegends();

      // Hide group menu if in 3D mode
      if (HS.design.is3d) {
        $('.minerva-channel-label').hide()
      }
      // Add group menu if not in 3D mode
      else {
        this.addGroups();
      }
      // Add segmentation mask menu
      this.addMasks();

      // Add a footer, if applicable
      if (HS.waypoint.Footer) {
        this.addFooter();
      };
      // Add stories navigation menu
      this.newStories();

      // Render editor if edit
      if (HS.edit) {
        this.fillWaypointEdit();
      }
      // Render viewer if not edit
      else {
        this.fillWaypointView();
      }
      // back and forward buttons
      $('.step-back').click(this, function(e) {
        const HS = e.data.hashstate;
        HS.w -= 1;
        HS.pushState();
        window.onpopstate();
      });
      $('.step-next').click(this, function(e) {
        const HS = e.data.hashstate;
        HS.w += 1;
        HS.pushState();
        window.onpopstate();
      });

      // Waypoint-specific Copy Buttons
      const THIS = this;
      $('.minerva-edit_copy_button').each(function() {
        newCopyYamlButton.call(this, THIS);
      });
      $('.minerva-edit_toggle_arrow').click(this, function(e) {
        const HS = e.data.hashstate;
        const THIS = e.data;
        const arrow_0 = HS.waypoint.Arrows[0];
        const hide_arrow = arrow_0.HideArrow;
        arrow_0.HideArrow = hide_arrow ? false : true;
        THIS.newView(true);
      });
    }

    // In editor mode
    if (HS.edit) {
      const THIS = this;

      // Set all mask options
      const mask_picker = HS.el.getElementsByClassName('minerva-mask-picker')[0];
      mask_picker.innerHTML = "";
      HS.masks.forEach(function(mask){
        const mask_option = document.createElement("option");
        mask_option.innerText = mask.Name;
        mask_picker.appendChild(mask_option);
      })

      // Enale selection of active mask indices
      $(".minerva-mask-picker").off("changed.bs.select");
      $(".minerva-mask-picker").on("changed.bs.select", function(e, idx, isSelected, oldValues) {
        const newValue = $(this).find('option').eq(idx).text();
        HS.waypoint.Masks = HS.masks.map(mask => mask.Name).filter(function(name) {
          if (isSelected) {
            return oldValues.includes(name) || name == newValue;
          }
          return oldValues.includes(name) && name != newValue;
        });
        const active_names = HS.active_masks.map(mask => mask.Name).filter(function(name) {
          return HS.waypoint.Masks.includes(name)
        })
        HS.waypoint.ActiveMasks = active_names;
        HS.m = active_names.map(name => index_name(HS.masks, name));
        THIS.newView(true);
      });

      // Set all group options
      const group_picker = HS.el.getElementsByClassName('minerva-group-picker')[0];
      group_picker.innerHTML = "";
      HS.cgs.forEach(function(group){
        const group_option = document.createElement("option");
        group_option.innerText = group.Name;
        group_picker.appendChild(group_option);
      })

      // Enale selection of active group index
      $(".minerva-group-picker").off("changed.bs.select");
      $(".minerva-group-picker").on("changed.bs.select", function(e, idx, isSelected, oldValues) {
        const newValue = $(this).find('option').eq(idx).text();
        HS.waypoint.Groups = HS.cgs.map(group => group.Name).filter(function(name) {
          if (isSelected) {
            return oldValues.includes(name) || name == newValue;
          }
          return oldValues.includes(name) && name != newValue;
        });
        const group_names = HS.waypoint.Groups;
        const current_name = HS.cgs[HS.g].Name;
        if (group_names.length > 0 && !group_names.includes(current_name)) {
          HS.g = index_name(HS.cgs, group_names[0]);
        }
        THIS.newView(true);
      });

    }

    // Based on control keys
    const edit = HS.edit;
    const noHome = HS.noHome;
    const drawing = HS.drawing;
    const drawType = HS.drawType;
    const prefix = '#' + HS.id + ' ';

    // Enable home button if in outline mode, otherwise enable table of contents button
    displayOrNot(prefix+'.minerva-home-button', !noHome && !edit && HS.waypoint.Mode == 'outline');
    displayOrNot(prefix+'.minerva-toc-button', !edit && HS.waypoint.Mode != 'outline');
    // Enable 3D UI if in 3D mode
    displayOrNot(prefix+'.minerva-channel-groups-legend', !HS.design.is3d);
    displayOrNot(prefix+'.minerva-z-slider-legend', HS.design.is3d);
    displayOrNot(prefix+'.minerva-toggle-legend', !HS.design.is3d);
    displayOrNot(prefix+'.minerva-only-3d', HS.design.is3d);
    // Enable edit UI if in edit mode
    displayOrNot(prefix+'.minerva-editControls', edit);
    // Enable standard UI if not in edit mode
    displayOrNot(prefix+'.minerva-waypointControls', !edit && HS.totalCount > 1);
    displayOrNot(prefix+'.minerva-waypointCount', !edit && HS.totalCount > 1);
    displayOrNot(prefix+'.minerva-waypointName', !edit);
    
    // Show crosshair cursor if drawing
    toggleCursor(prefix+'.minerva-openseadragon *', 'crosshair', drawing);
    // Show correct switch state based on drawing mode
    greenOrWhite(prefix+'.minerva-draw-switch *', drawing && (drawType == "box"));
    greenOrWhite(prefix+'.minerva-lasso-switch *', drawing && (drawType == "lasso"));
    greenOrWhite(prefix+'.minerva-arrow-switch *', drawing && (drawType == "arrow"));

    // Special minmial nav if no text
    const minimal_sidebar = !edit && HS.totalCount == 1 && !decode(HS.d);
    classOrNot(prefix+'.minerva-sidebar-menu', minimal_sidebar, 'minimal');
    displayOrNot(prefix+'.minerva-welcome-nav', !minimal_sidebar);

    // H&E should not display number of cycif markers
    const is_h_e = HS.group.Name == 'H&E';
    displayOrNot(prefix+'.minerva-welcome-markers', !is_h_e);
  },

  // Load speech-synthesis from AWS Polly
  loadPolly: function(txt, speech_bucket) {
    const hash = sha1(txt);
    const HS = this.hashstate;
    const prefix = '#' + HS.id + ' ';
    displayOrNot(prefix+'.minerva-audioControls', !!speech_bucket);
    if (!!speech_bucket) {
      const polly_url = 'https://s3.amazonaws.com/'+ speech_bucket +'/speech/' + hash + '.mp3';
      HS.el.getElementsByClassName('minerva-audioSource')[0].src = polly_url;
      HS.el.getElementsByClassName('minerva-audioPlayback')[0].load();
    }
  },

  /*
   * User intercation
   */
  // Draw lower bounds of box overlay
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
  // Draw upper bounds of box overlay
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

  /*
   * Display manaagement
   */

  // Add list of mask layers
  addMasks: function() {
    const HS = this.hashstate;
    $('.minerva-mask-layers').empty();
    if (HS.edit || HS.waypoint.Mode == 'explore') {
        // Show as a multi-column
        $('.minerva-mask-layers').addClass('flex');
        $('.minerva-mask-layers').removeClass('flex-column');
    }
    else {
        // Show as a single column
        $('.minerva-mask-layers').addClass('flex-column');
        $('.minerva-mask-layers').removeClass('flex');
    }
    const mask_names = HS.waypoint.Masks || [];
    const masks = HS.masks.filter(mask => {
      return mask_names.includes(mask.Name);
    });
    if (masks.length || HS.edit) {
      $('.minerva-mask-label').show()
    }
    else {
      $('.minerva-mask-label').hide()
    }
    // Add masks with indices
    masks.forEach(function(mask) {
      const m = index_name(HS.masks, mask.Name);
      this.addMask(mask, m);
    }, this);
  },

  // Add mask with index
  addMask: function(mask, m) {
    const HS = this.hashstate;
    // Create an anchor element with empty href
    var aEl = document.createElement('a');
    aEl = Object.assign(aEl, {
      className: HS.m.includes(m) ? 'nav-link active' : 'nav-link',
      href: 'javascript:;',
      innerText: mask.Name,
      title: mask.Path
    });
    var ariaSelected = HS.m.includes(m) ? true : false;
    aEl.setAttribute('aria-selected', ariaSelected);

    // Append mask layer to mask layers
    HS.el.getElementsByClassName('minerva-mask-layers')[0].appendChild(aEl);
    
    // Activate or deactivate Mask Layer
    $(aEl).click(this, function(e) {
      const HS = e.data.hashstate;
      // Set group to default group
      const group = HS.design.default_group;
      const g = index_name(HS.cgs, group);
      if ( g != -1 ) {
        HS.g = g;
      }
      // Remove mask index from m
      if (HS.m.includes(m)){
        HS.m = HS.m.filter(i => i != m);
      }
      // Add mask index to m
      else {
        HS.m.push(m);
      }
      HS.pushState();
      window.onpopstate();
    });
  },

  //Nanostring edit: Add footer from the exhibit.json file
  addFooter: function() {
    const HS = this.hashstate;
    const footerP = document.createElement('p');
    const footerText = HS.waypoint.Footer;
    footerP.innerHTML = this.showdown.makeHtml(footerText);
    HS.el.getElementsByClassName('minerva-mask-layers')[0].appendChild(footerP)
  },

  // Add list of channel groups
  addGroups: function() {
    const HS = this.hashstate;
    $('.minerva-channel-groups').empty();
    $('.minerva-channel-groups-legend').empty();
    const cgs_names = HS.waypoint.Groups || [];
    const cgs = HS.cgs.filter(group => {
      return cgs_names.includes(group.Name);
    });
    if (cgs.length || HS.edit) {
      $('.minerva-channel-label').show()
    }
    else {
      $('.minerva-channel-label').hide()
    }
    const cg_el = HS.el.getElementsByClassName('minerva-channel-groups')[0];

    // Add filtered channel groups to waypoint
    cgs.forEach(function(group) {
      const g = index_name(HS.cgs, group.Name);
      this.addGroup(group, g, cg_el, false);
    }, this);

    const cgs_multi = HS.cgs.filter(group => {
      return group.Channels.length > 1;
    });
    const cgs_single = HS.cgs.filter(group => {
      return group.Channels.length == 1;
    });
    const cg_legend = HS.el.getElementsByClassName('minerva-channel-groups-legend')[0];
    if (cgs_multi.length > 0) {
      var h = document.createElement('h6');
      h.innerText = 'Channel Groups:'
      h.className = 'm-1'
      cg_legend.appendChild(h);
    }
    // Add all channel groups to legend
    cgs_multi.forEach(function(group) {
      const g = index_name(HS.cgs, group.Name);
      this.addGroup(group, g, cg_legend, true);
    }, this);
    if (cgs_single.length > 0) {
      var h = document.createElement('h6');
      h.innerText = 'Channels:'
      h.className = 'm-1'
      cg_legend.appendChild(h);
    }
    cgs_single.forEach(function(group) {
      const g = index_name(HS.cgs, group.Name);
      this.addGroup(group, g, cg_legend, true);
    }, this);
  },
  // Add a single channel group to an element
  addGroup: function(group, g, el, show_more) {
    const HS = this.hashstate;
    var aEl = document.createElement('a');
    var selected = HS.g === g ? true : false;
    aEl = Object.assign(aEl, {
      className: selected ? 'nav-link active' : 'nav-link',
      style: 'padding-right: 40px; position: relative;',
      href: 'javascript:;',
      innerText: group.Name
    });
    aEl.setAttribute('data-toggle', 'pill');

    // Set story and waypoint for this marker
    var s_w = undefined;
    for (var s in HS.stories) {
      for (var w in HS.stories[s].Waypoints) {
        var waypoint = HS.stories[s].Waypoints[w];  
        if (waypoint.Group == group.Name) {
          // Select the first waypoint or the definitive
          if (s_w == undefined || waypoint.DefineGroup) {
            s_w = [s, w];
          }
        }
      }
    }
    
    var moreEl = document.createElement('a');
    if (selected && show_more && s_w) {
      const opacity = 'opacity: ' +  + ';';
      moreEl = Object.assign(moreEl, {
        className : 'text-white',
        style: 'position: absolute; right: 5px;',
        href: 'javascript:;',
        innerText: 'MORE',
      });
      aEl.appendChild(moreEl);

      // Update Waypoint
      $(moreEl).click(this, function(e) {
        HS.s = s_w[0];
        HS.w = s_w[1];
        HS.pushState();
        window.onpopstate();
      });
    }

    // Append channel group to element
    el.appendChild(aEl);
    
    // Update Channel Group
    $(aEl).click(this, function(e) {
      HS.g = g;
      HS.pushState();
      window.onpopstate();
    });

  },

  // Add channel legend labels
  addChannelLegends: function() {
    const HS = this.hashstate;
    $('.minerva-channel-legend').empty();
    HS.channels.forEach(this.addChannelLegend, this);
  },

  // Add channel legend label
  addChannelLegend: function(channel, c) {
    const color = this.indexColor(c, '#FFF');
    const HS = this.hashstate;

    var label = document.createElement('span');
    label.className = 'legend-label pl-3';
    label.innerText = channel;

    var badge = document.createElement('span');
    $(badge).css('background-color', color);
    badge.className = 'badge legend-color';
    badge.innerText = '\u00a0';

    // Append channel legend to list
    var ul = HS.el.getElementsByClassName('minerva-channel-legend')[0];
    var li = document.createElement('li');
    li.appendChild(badge);
    li.appendChild(label);
    ul.appendChild(li);
  },

  // Return map of channels to indices
  channelOrders: function(channels) {
    return channels.reduce(function(map, c, i){
      map[c] = i;
      return map;
    }, {});
  },

  // Lookup a color by index
  indexColor: function(i, empty) {
    const HS = this.hashstate;
    const colors = HS.colors;
    if (i === undefined) {
      return empty;
    }
    return '#' + colors[i % colors.length];
  },

  // Render all stories
  newStories: function() {

    const HS = this.hashstate;
    const items = HS.el.getElementsByClassName('minerva-story-container')[0];
    // Remove existing stories
    clearChildren(items);

    if (HS.waypoint.Mode == 'outline' && HS.totalCount > 1) {
      var toc_label = document.createElement('p');
      toc_label.innerText = 'Table of Contents';
      items.appendChild(toc_label);
      // Add configured stories

      var sid_item = document.createElement('div');
      var sid_list = document.createElement('ol');
      // NanoString Change - to allow for the Appendix to appear on the Table of Contents
      HS.stories.forEach(function(story, sid) {
          this.addStory(story, sid, sid_list);
      }, this);
      sid_item.appendChild(sid_list);
      items.appendChild(sid_item);
      //Nanostring change to allow exhibit.json to allow for text below the Table of Contents
      const tocDescription = document.createElement('p');
      const tocText = HS.stories[1]["Description"];
      tocDescription.innerHTML = this.showdown.makeHtml(tocText);
      items.appendChild(tocDescription);
    }

    const footer = document.createElement('p')
    const md = HS.design.footer;
    footer.innerHTML = this.showdown.makeHtml(md);
    items.appendChild(footer);
  },

  // Render one story
  addStory: function(story, sid, sid_list) {


    // Add configured waypoints
    story.Waypoints.forEach(function(waypoint, wid) {
      this.addWaypoint(waypoint, wid, sid, sid_list);
    }, this);

  },

  // Render one waypoint
  addWaypoint: function(waypoint, wid, sid, sid_list) {

    var wid_item = document.createElement('li');
    var wid_link = document.createElement('a');
    wid_link = Object.assign(wid_link, {
      className: '',
      href: 'javascript:;',
      innerText: waypoint.Name
    });

    // Update Waypoint
    $(wid_link).click(this, function(e) {
      const HS = e.data.hashstate;
      HS.s = sid;
      HS.w = wid;
      HS.pushState();
      window.onpopstate();
    });

    wid_item.appendChild(wid_link);
    sid_list.appendChild(wid_item);
  },

  // Render contents of waypoing during viewer mode
  fillWaypointView: function() {

    const HS = this.hashstate;
    const waypoint = HS.waypoint;
    const wid_waypoint = HS.el.getElementsByClassName('minerva-viewer-waypoint')[0];
    const waypointName = HS.el.getElementsByClassName("minerva-waypointName")[0];
    const waypointCount = HS.el.getElementsByClassName("minerva-waypointCount")[0];

    waypointCount.innerText = HS.currentCount + '/' + HS.totalCount;

    // Show waypoint name if in outline mode
    if (waypoint.Mode !== 'outline') {
      waypointName.innerText = waypoint.Name;
    }
    else {
      waypointName.innerText = '';
    }

    const scroll_dist = $('.minerva-waypoint-content').scrollTop();
    $(wid_waypoint).css('height', $(wid_waypoint).height());

    // Waypoint description markdown
    var md = waypoint.Description;

    // Create links for cell types
    HS.cell_type_links_map.forEach(function(link, type){
      var escaped_type = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = RegExp(escaped_type+'s?', 'gi');
      md = md.replace(re, function(m) {
        return '['+m+']('+link+')';
      });
    });

    // Create code blocks for protein markers
    HS.marker_links_map.forEach(function(link, marker){
      var escaped_marker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = RegExp('(^|[^0-9A-Za-z`])\('+escaped_marker+'\)([^0-9A-Za-z`]|$)', 'gi');
      md = md.replace(re, function(m, pre, m1, post) {
        return m.replace(m1, '`'+m1+'`', 'gi');
      });
    });

    // Create links for protein markers
    HS.marker_links_map.forEach(function(link, marker){
      var escaped_marker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = RegExp('`'+escaped_marker+'`', 'gi');
      md = md.replace(re, function(m) {
        return '['+m+']('+link+')';
      });
    });

    // All categories of possible visualization types
    const allVis = ['VisMatrix', 'VisBarChart', 'VisScatterplot', "VisCanvasScatterplot", "Other", "MaskAndPan"];
    
    const waypointVis = new Set(allVis.filter(v => waypoint[v]));
    const renderedVis = new Set();

    const THIS = this;
    // Scroll to a given scroll distance when waypoint is fully rendered
    const finish_waypoint = function(visType) {
      renderedVis.add(visType);
      if ([...waypointVis].every(v => renderedVis.has(v))) {
        $('.minerva-waypoint-content').scrollTop(scroll_dist);
        $(wid_waypoint).css('height', '');
        THIS.colorMarkerText(wid_waypoint);
      }

      // NanoString edit: change all url links to open in a new tab (had to filter our href=javascript;;)
      const links = document.querySelectorAll('a[href*="http"]:not(a[href*="javascript"])');
      links.forEach((link) => {
          link.setAttribute('target', '_blank');
      })  
    }

    // Handle click from plot that selects a mask
    const maskHandler = function(d) {
      var name = d.type;
      var escaped_name = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = RegExp(escaped_name,'gi');
      const m = index_regex(HS.masks, re);
      if (m >= 0) {
        HS.m = [m];
      }
      THIS.newView(true);
    }

    // Handle click from plot that selects a mask and channel
    const chanAndMaskHandler = function(d) {
      var chan = d.channel
      var mask = d.type
      var escaped_mask = mask.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re_mask = RegExp(escaped_mask,'gi');
      const m = index_regex(HS.masks, re_mask);
      if (m >= 0) {
        HS.m = [m];
      }
      
      const channelsList = HS.cgs[0].Channels
      const channelIndex = channelsList.indexOf(chan)
      // Nanostring change - shifts masks over 1 to account for All cells/structures mask
      if (channelIndex >= 0) {
        HS.g = channelIndex + 1;
      } else {
        HS.g = 0
      }
      THIS.newView(true);
    }

    // Handle click from plot that selects a cell position
    const arrowHandler = function(d){
        var cellPosition = [parseInt(d['X_position']), parseInt(d['Y_position'])]
        if (Number.isNaN(cellPosition[0])) {
          return;
        };
        var viewportCoordinates = THIS.osd.viewer.viewport.imageToViewportCoordinates(cellPosition[0], cellPosition[1]);
        //change hashstate vars
        HS.v = [ 10, viewportCoordinates.x, viewportCoordinates.y]
        //render without menu redraw
        THIS.osd.newView(true);
        //delay visible arrow until animation end
        HS.a = [viewportCoordinates.x,viewportCoordinates.y];
    }

    const MaskAndPan = function(d){
        // Pan and Zoom to coordinates from data file
        var cellPosition = [parseInt(d['X_position']), parseInt(d['Y_position'])]
        if (Number.isNaN(cellPosition[0])) {
          return;
        };
        var viewportCoordinates = THIS.osd.viewer.viewport.imageToViewportCoordinates(cellPosition[0], cellPosition[1]);
        //change hashstate vars
        HS.v = [ 10, viewportCoordinates.x, viewportCoordinates.y]
        // Add Mask specified in data file
        var name = d.type;
        var escaped_name = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = RegExp(escaped_name,'gi');
        const m = index_regex(HS.masks, re);
        if (m >= 0) {
          HS.m = [m];
        }
        //render without menu redraw
        THIS.osd.newView(true);
    }


    // Visualization code
    const renderVis = function(visType, el, id) {
      // Select infovis renderer based on renderer given in markdown
      const renderer = {
        'VisMatrix': infovis.renderMatrix,
        'VisBarChart': infovis.renderBarChart,
        'VisScatterplot': infovis.renderScatterplot,
        'VisCanvasScatterplot': infovis.renderCanvasScatterplot,
        'Other': infovis.renderOther,
        "MaskAndPan": infovis.renderMaskAndPan 
      }[visType]
      // Select click handler based on renderer given in markdown
      const clickHandler = {
        'VisMatrix': chanAndMaskHandler,
        'VisBarChart': chanAndMaskHandler,
        'VisScatterplot': arrowHandler,
        'VisCanvasScatterplot': arrowHandler,
        'Other': arrowHandler,
        'MaskAndPan': MaskAndPan
      }[visType]
      // Run infovis renderer
      const tmp = renderer(el, id, waypoint[visType], {
        'clickHandler': clickHandler
      });
      // Finish wayoint after renderer runs
      tmp.then(() => finish_waypoint(visType));
    }

    // Cache the waypoint visualizations
    var cache = document.createElement('div');
    Array.from(waypointVis).forEach(function(visType) {
      var className = visType + '-' + HS.s + '-' + HS.w;
      var visElems = wid_waypoint.getElementsByClassName(className);
      if (visElems[0]) {
        cache.appendChild(visElems[0]);
      }
    })

    // Set the HTML from the Markdown
    wid_waypoint.innerHTML = this.showdown.makeHtml(md);

    // Add a static image to the waypoint HTML
    if (waypoint.Image) {
      var img = document.createElement("img");
      img.src = waypoint.Image;
      wid_waypoint.appendChild(img);
    }

    // Allow text in between visualizations
    Array.from(waypointVis).forEach(function(visType) {
      const wid_code = Array.from(wid_waypoint.getElementsByTagName('code'));
      const el = wid_code.filter(code => code.innerText == visType)[0];
      const new_div = document.createElement('div');
      new_div.style.cssText = 'width:100%';
      new_div.className = visType + '-' + HS.s + '-' + HS.w;
      new_div.id = visType + '-' + HS.id + '-' + HS.s + '-' + HS.w;

      const cache_divs = cache.getElementsByClassName(new_div.className);
      if (cache_divs[0] && el) {
        $(el).replaceWith(cache_divs[0]);
        finish_waypoint(visType)
      }
      else if (el) {
        $(el).replaceWith(new_div);
        renderVis(visType, wid_waypoint, new_div.id);
      }
      else {
        wid_waypoint.appendChild(new_div);
        renderVis(visType, wid_waypoint, new_div.id);
      }
    })

    // Nanostring-specific event - for adding content to a specific waypoint
    const currentWaypointInfo = {waypointNum: HS.w, storyNum: HS.s, domElement: wid_waypoint, osd: this.osd, finish_waypoint}
    const waypointBuildEvent = new CustomEvent('waypointBuildEvent', {
      detail: currentWaypointInfo});
    document.dispatchEvent(waypointBuildEvent);

    finish_waypoint('');

  },
  // Color all the remaining HTML Code elements
  colorMarkerText: function (wid_waypoint) {
    const HS = this.hashstate;
    const channelOrders = this.channelOrders(HS.channels);
    const wid_code = wid_waypoint.getElementsByTagName('code');
    for (var i = 0; i < wid_code.length; i ++) {
      var code = wid_code[i];
      var index = channelOrders[code.innerText];
      if (!index) {
        Object.keys(channelOrders).forEach(function (marker) {
          const c_text = code.innerText;
          const code_marker = HS.marker_alias_map.get(c_text) || c_text;
          const key_marker = HS.marker_alias_map.get(marker) || marker;
          var escaped_code_marker = code_marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = RegExp('^'+escaped_code_marker+'$','gi');
          if (key_marker != undefined && key_marker.match(re)) {
            index = channelOrders[marker];
          }
        });
      }
      var color = this.indexColor(index);
      var border = color? '2px solid ' + color: 'inherit';
      $(code).css('border-bottom', border);
    }
  },
  // Fill the waypoint if in editor mode
  fillWaypointEdit: function() {
    const HS = this.hashstate;
    const wid_waypoint = HS.el.getElementsByClassName('minerva-viewer-waypoint')[0];
    $(wid_waypoint).empty();
    const form_proto = HS.el.getElementsByClassName('minerva-save_edits_form')[0]
    const form = form_proto.cloneNode(true);
    wid_waypoint.appendChild(form);

    const arrow_0 = HS.waypoint.Arrows[0];
    if (arrow_0.HideArrow == true) {
       $('.minerva-edit_toggle_arrow').css('opacity', '0.5');
    }
    else {
       $('.minerva-edit_toggle_arrow').css('opacity', '1');
    }

    const wid_txt = $(wid_waypoint).find('.minerva-edit_text')[0];
    const wid_txt_name = $(wid_waypoint).find('.minerva-edit_name')[0];
    const wid_txt_arrow = $(wid_waypoint).find('.minerva-edit_arrow_text')[0];
    const wid_describe = decode(HS.d);
    const wid_name = decode(HS.n);

    $(wid_txt_arrow).on('input', this, function(e) {
      const HS = e.data.hashstate;
      const THIS = e.data;
      HS.waypoint.Arrows[0].Text = this.value;
      THIS.newView(false);
    });
    wid_txt_arrow.value = HS.waypoint.Arrows[0].Text || '';

    $(wid_txt_name).on('input', this, function(e) {
      const HS = e.data.hashstate;
      HS.n = encode(this.value);
      HS.waypoint.Name = this.value;
    });
    wid_txt_name.value = wid_name;

    $(wid_txt).on('input', this, function(e) {
      const HS = e.data.hashstate;
      HS.d = encode(this.value);
      HS.waypoint.Description = this.value;
    });
    wid_txt.value = wid_describe;
  }
};
