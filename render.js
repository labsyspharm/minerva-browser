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

const updateColor = (group, color, c) => {
  group.Colors = group.Colors.map((col, i) => {
    return [col, color][+(c === i)];
  });
  return group;
}

const addChannel = (group, subgroup) => {
  return {
    ...group,
    Shown: [...group.Shown, true],
    Channels: [...group.Channels, subgroup.Name],
    Colors: [...group.Colors, subgroup.Colors[0]],
    Descriptions: [...group.Descriptions, subgroup.Description]
  };
}

const toggleChannelShown = (group, c) => {
  group.Shown = group.Shown.map((show, i) => {
    return [show, !show][+(c === i)];
  });
  return group;
}

// Render the non-openseadragon UI
export const Render = function(hashstate, osd) {

  this.trackers = hashstate.trackers;
  this.pollycache = hashstate.pollycache;
  this.showdown = new showdown.Converter({tables: true});

  this.osd = osd;
  this.hashstate = hashstate;
};

Render.prototype = {

  init: function() {

    const HS = this.hashstate;
    // Go to true center
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

    // Toggle legend info
    ((k) => {
      const el = document.getElementsByClassName(k).item(0);
      el.addEventListener('click', () => this.toggleInfo());
    })('minerva-channel-legend-info-icon');
    
    const toggleAdding = () => {
      HS.toggleAdding();
      this.newView(true);
    }
    const openAdding = () => {
      if (HS.infoOpen && !HS.addingOpen) {
        toggleAdding();
      }
    }
    // Toggle channel selection
    ((k) => {
      const el = document.getElementsByClassName(k).item(0);
      el.addEventListener('click', toggleAdding);
    })('minerva-channel-legend-add-panel');

    ((k) => {
      var el = HS.el.getElementsByClassName(k).item(0);
      el.addEventListener("click", openAdding);
    })('minerva-channel-legend-adding-info-panel');

    ((k) => {
      var el = HS.el.getElementsByClassName(k).item(0);
      el.addEventListener("click", openAdding);
    })('minerva-channel-legend-adding-panel');


    // Modals to copy shareable link and edit description
    $('#copy_link_modal').on('hidden.bs.modal', HS.cancelDrawing.bind(HS));
    $('.minerva-edit_description_modal').on('hidden.bs.modal', HS.cancelDrawing.bind(HS));

    const isMobile = () => {
      const fixed_el = document.querySelector('.minerva-fixed');
      return (fixed_el?.clientWidth || 0) <= 750;
    }

    // Button to toggle sidebar
    $('.minerva-toggle-sidebar').click((e) => {
      e.preventDefault();
      $(".minerva-sidebar-menu").toggleClass("toggled");
      if (isMobile()) {
        if (HS.infoOpen) this.toggleInfo();
        $(".minerva-legend").addClass("toggled");
      }
    });

    // Button to toggle legend
    $('.minerva-toggle-legend').click((e) => {
      e.preventDefault();
      $(".minerva-legend").toggleClass("toggled");
      const closed = $(".minerva-legend").hasClass("toggled");
      if (closed && HS.infoOpen) this.toggleInfo();
      if (isMobile()) {
        $(".minerva-sidebar-menu").addClass("toggled");
      }
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

  toggleInfo() {
    const HS = this.hashstate;
    HS.toggleInfo();
    if (!HS.infoOpen) {
      HS.addingOpen = false;
      HS.activeChannel = -1;
    }
    this.newView(true);
  },

  // Rerender only openseadragon UI or all UI if redraw is true
  newView: function(redraw) {

    const HS = this.hashstate;
    this.osd.newView(redraw);
    // Redraw design
    if(redraw) {

      // redrawLensUI
      HS.updateLensUI(null);

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

      const logo_svg = this.getLogoImage();
      logo_svg.style = "width: 85px";
      const logo_link = "https://minerva.im";
      const logo_class = "minerva-logo-anchor";
      const menu_class = 'minerva-sidebar-menu';
      const side_menu = document.getElementsByClassName(menu_class)[0];
      const logos = side_menu.getElementsByClassName(logo_class);
      [...logos].forEach((d) => {
        side_menu.removeChild(d);
      })
      const logo_root = document.createElement('a');
      const info_div = document.createElement('div');
      logo_root.className = `position-fixed ${logo_class}`;
      logo_root.style.cssText = `
        left: 0.5em;
        bottom: 0.5em;
        display: block;
        color: inherit;
        line-height: 0.9em;
        text-decoration: none;
        padding: 0.4em 0.3em 0.2em;
        background-color: rgba(0,0,0,0.8);
      `;
      logo_root.setAttribute('href', logo_link);
      info_div.innerText = 'Made with';
      logo_root.appendChild(info_div);
      logo_root.appendChild(logo_svg);
      side_menu.appendChild(logo_root);
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
    toggleCursor(prefix+'.minerva-openseadragon > div', 'crosshair', drawing);
    // Show correct switch state based on drawing mode
    greenOrWhite(prefix+'.minerva-draw-switch *', drawing && (drawType == "box"));
    greenOrWhite(prefix+'.minerva-lasso-switch *', drawing && (drawType == "lasso"));
    greenOrWhite(prefix+'.minerva-arrow-switch *', drawing && (drawType == "arrow"));

    // Special minmial nav if no text
    const minimal_sidebar = !edit && HS.totalCount == 1 && !decode(HS.d);
    classOrNot(prefix+'.minerva-sidebar-menu', minimal_sidebar, 'minimal');
    displayOrNot(prefix+'.minerva-welcome-nav', !minimal_sidebar);
    // Disable sidebar if no content
    if (minimal_sidebar && noHome) {
      classOrNot(prefix+'.minerva-sidebar-menu', true, 'toggled');
      displayOrNot(prefix+'.minerva-toggle-sidebar', false);
    }

    // Toggle additional info features
    const { infoOpen, addingOpen } = HS;
    const hasInfo = HS.allowInfoIcon;
    const canAdd = HS.singleChannelInfoOpen;
    ((k) => {
      const bar = "minerva-settings-bar";
      const settings = "minerva-settings-icon";
      const bar_line = 'border-right: 2px solid grey;';
      const root = HS.el.getElementsByClassName(k)[0];
      const bar_el = root.getElementsByClassName(bar)[0];
      const el = root.getElementsByClassName(settings)[0];
      bar_el.style.cssText = ['',bar_line][+infoOpen];
      el.innerText = ['⚙\uFE0E','⨂'][+infoOpen];
    })("minerva-channel-legend-info-icon");
    ((k) => {
      const add = "minerva-add-icon";
      const root = HS.el.getElementsByClassName(k)[0];
      const el = root.getElementsByClassName(add)[0];
      el.innerText = ['⊕','⨂'][+addingOpen];
    })("minerva-channel-legend-add-panel");
    classOrNot(".minerva-legend-grid", !hasInfo, "disabled");
    classOrNot(".minerva-channel-legend-2", canAdd, 'toggled');
    classOrNot(".minerva-channel-legend-info", infoOpen, 'toggled');
    classOrNot(".minerva-channel-legend-info-icon", !hasInfo, 'disabled');
    classOrNot(".minerva-channel-legend-add-panel", canAdd, 'toggled');
    classOrNot(".minerva-channel-legend-adding", addingOpen, "toggled");
    classOrNot(".minerva-channel-legend-adding-info", addingOpen, "toggled");
    classOrNot(".minerva-channel-legend-adding-info", !canAdd, "disabled");
    classOrNot(".minerva-channel-legend-adding", !canAdd, "disabled");

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
    const { group, activeChannel } = HS;
    var label = '';
    var picked = new RegExp("^$");
    if (activeChannel >= 0) {
      label = group.Channels[activeChannel]; 
      const color = group.Colors[activeChannel]; 
      if (color) picked = new RegExp(color, "i");
    }
    $('.minerva-channel-legend-1').empty();
    $('.minerva-channel-legend-2').empty();
    $('.minerva-channel-legend-3').empty();
    $('.minerva-channel-legend-info').empty();
    $('.minerva-channel-legend-adding').empty();
    $('.minerva-channel-legend-adding-info').empty();
    $('.minerva-channel-legend-color-picker').empty();
    if (activeChannel < 0) {
      $('.minerva-channel-legend-color-picker').removeClass('toggled');
    }
    const legend_lines = HS.channel_legend_lines;
    legend_lines.forEach(this.addChannelLegend, this);
    // Add all channels not present in legend
    const defaults = HS.subpath_defaults;
    const to_hex = (k) => defaults.get(k).Colors[0];
    const missing_names = [...defaults.keys()].filter((key) => {
      return !legend_lines.find(({ name }) => key === name);
    });

    // Allow channel choices
    missing_names.forEach(this.addChannelChoice, this);

    // Add color selection
    const COLORS = [
      'FF00FF',
      '8000FF',
      '0000FF',
      '00FFFF',
      '008040',
      '00FF00',
      'FFFF00',
      'FF8000',
      'FF0000',
      'FFFFFF'
    ];

    ((cls) => {
      const picker = HS.el.getElementsByClassName(cls)[0];
      var header = document.createElement('div');
      header.className = "all-columns";
      header.innerText = label;
      picker.appendChild(header);
      COLORS.forEach(color => {
        var colorize = document.createElement('div');
        $(colorize).css('background-color', '#'+color);
        colorize.addEventListener("click", () => {
          HS.group = updateColor(group, color, activeChannel);
          this.newView(true);
        });
        if (picked.test(color)) {
          colorize.className = "glowing";
        }
        picker.appendChild(colorize);
      });
      var submit = document.createElement('a');
      submit.className = "nav-link active";
      submit.innerText = "Update";
      picker.appendChild(submit);
      submit.addEventListener("click", () => {
        $("."+cls).removeClass("toggled");
        HS.activeChannel = -1;
        this.newView(true);
      })
    })("minerva-channel-legend-color-picker");
  },

  // Add channel legend label
  addChannelLegend: function(legend_line) {
    const HS = this.hashstate;
    const color = legend_line.color;
    const mask_index = legend_line.mask_index;
    const group_index = legend_line.group_index;
    const shown_idx = (() => {
      if (legend_line.rendered) return 2;
      return +legend_line.shown;
    })();

    const onClick = () => {
      if (group_index != -1) {
        HS.group = toggleChannelShown(HS.group, group_index);
      }
      if (mask_index != -1) {
        if (shown_idx > 0) {
          HS.m = HS.m.filter(m => m != mask_index);
        }
        else if (!HS.m.includes(mask_index)){
          HS.m = [...HS.m, mask_index];
        }
      }
      HS.pushState();
      window.onpopstate();
    }

    var visible = document.createElement('li');
    var colorize = document.createElement('li');
    var label = document.createElement('li');
    label.innerText = legend_line.name;
    colorize.className = "glowing";

    // Opacities
    label.style.cssText = 'opacity:'+[0.5,1,1][shown_idx];
    visible.style.cssText = 'opacity:'+[0.5,1,0][shown_idx];
    colorize.style.cssText = 'opacity:'+[0.5,1,1][shown_idx];
    $(colorize).css('background-color', '#'+color);

    // If features are active
    if (HS.singleChannelInfoOpen) {
      label.addEventListener("click", onClick);
      visible.addEventListener("click", onClick);
      colorize.addEventListener("click", (e) => {
        if (!shown_idx && group_index != -1) {
          HS.group = toggleChannelShown(HS.group, group_index);
        }
        $(".minerva-channel-legend-color-picker").addClass("toggled");
        if (group_index != -1) {
          HS.activeChannel = group_index;
        }
        this.newView(true);
        e.stopPropagation();
      });
      const text_hide = 'color: transparent';
      const colorize_ico = document.createElement('i');
      let text_col = ['text-dark', 'text-dark', ''][shown_idx];
      if (group_index === -1) text_col = '';
      colorize_ico.style.cssText = ['', '', text_hide][shown_idx];
      colorize_ico.className = `fa fa-eye-dropper ${text_col}`;
      colorize.appendChild(colorize_ico);

      var visible_ico = document.createElement('i');
      visible_ico.className = 'fa fa-eye' + ['-slash', '', ''][shown_idx];
      visible.appendChild(visible_ico);
    }
    else {
      label.addEventListener("click", () => this.toggleInfo());
      colorize.addEventListener("click", () => this.toggleInfo());
    }

    // Append channel legend to list
    (() => {
      var c1 = HS.el.getElementsByClassName('minerva-channel-legend-1')[0];
      var c2 = HS.el.getElementsByClassName('minerva-channel-legend-2')[0];
      var c3 = HS.el.getElementsByClassName('minerva-channel-legend-3')[0];
      c1.appendChild(colorize);
      c2.appendChild(visible);
      c3.appendChild(label);
    })();

    if (!HS.allowInfoLegend) return;

    // Add legend description
    ((k) => {
      const { description } = legend_line;
      var ul = HS.el.getElementsByClassName(k).item(0);
      var li = document.createElement('li');
      const styles = [
        'opacity:'+[0.5,1,1][shown_idx]
      ].concat((group_index === HS.activeChannel) ? [
        'border-bottom: '+ '2px solid #' + color
      ] : []);
      li.style.cssText = styles.join('; ');
      li.addEventListener("click", onClick);
      li.innerText = description;
      ul.appendChild(li);
    })('minerva-channel-legend-info');

  },

  // Add new single channel possibility
  addChannelChoice: function(name) {
    const HS = this.hashstate;
    const defaults = HS.subpath_defaults;
    const subgroup = defaults.get(name);
    const onClick = () => {
      HS.group = addChannel(HS.group, subgroup);
      HS.pushState();
      window.onpopstate();
    }
    const empty = '---';
    ((k) => {
        var ul = HS.el.getElementsByClassName(k).item(0);
        var li = document.createElement('li');
        li.addEventListener("click", onClick);
        li.innerText = name || empty;
        ul.appendChild(li);
    })('minerva-channel-legend-adding');

    ((k) => {
        var ul = HS.el.getElementsByClassName(k).item(0);
        var li = document.createElement('li');
        li.addEventListener("click", onClick);
        li.innerText = subgroup.Description || empty;
        if (li.innerText === empty) {
          li.style.color = 'transparent';
        }
        ul.appendChild(li);
    })('minerva-channel-legend-adding-info');
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
    return colors[i % colors.length];
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
      HS.stories.forEach(function(story, sid) {
        if (story.Mode != 'explore') {
          this.addStory(story, sid, sid_list);
        }
      }, this);
      sid_item.appendChild(sid_list);
      items.appendChild(sid_item);
    }

    const footer = document.createElement('p')
    const md = HS.design.footer;
    footer.innerHTML = this.showdown.makeHtml(md);
    items.appendChild(footer);
  },

  // Generate svg logo element
  getLogoImage: function() {
		const parser = new DOMParser();
		const styleStr = '<style type="text/css"> .st0{fill:#FFFFFF;} .st1{fill:#00A5DF;} .st2{fill:#963CBD;} .st3{fill:#004EA8;} .st4{fill:#93C90F;} .st5{fill:#007749;} .st6{fill:#D00070;} .st7{fill:#890C58;} .st8{fill:#FF6720;} .st9{fill:#00778B;} .st10{fill:#AB2328;}</style>';
    const wordStr = '<g><polygon class="st0" points="178.39,125.26 197.56,27.3 228.84,98.11 261.23,27.3 278.46,125.26 264.36,125.26 255.57,70.26  228.6,129.44 202.4,70.2 192.61,125.26 "/><rect x="293.46" y="34.15" class="st0" width="13.75" height="91.11"/><polygon class="st0" points="327.1,125.26 327.1,27.95 388.31,96.67 388.31,34.15 402.06,34.15 402.06,130.8 340.85,62.24  340.85,125.26 "/><polygon class="st0" points="476.7,47.07 434.41,47.07 434.41,71.91 465.87,71.91 465.87,84.84 434.41,84.84 434.41,112.33  476.7,112.33 476.7,125.26 420.66,125.26 420.66,34.15 476.7,34.15 "/><path class="st0" d="M534.69,86.43l28.2,38.83h-16.82l-26.02-37.29h-12.55v37.29h-13.75V34.15h26.18c12.04,0,20.73,2.26,26.08,6.79 c5.9,5.03,8.85,11.68,8.85,19.94c0,6.45-1.85,12-5.55,16.64C545.63,82.16,540.75,85.13,534.69,86.43 M507.51,75.99h14.44 c13.02,0,19.53-4.98,19.53-14.93c0-9.32-6.33-13.98-19-13.98h-14.97V75.99z"/><polygon class="st0" points="574.71,34.15 599.9,97.29 625.45,34.15 640.5,34.15 599.61,132.1 559.66,34.15 "/><path class="st0" d="M687.86,103.13h-39l-10.15,22.13H623.9l45.08-96.83l43.49,96.83h-15.05L687.86,103.13z M682.26,90.21 l-13.51-30.98l-14.16,30.98H682.26z"/></g>';
    const iconStr = '<g><polygon class="st1" points="84.9,125.15 74.67,101.74 61.02,109.33 54.73,141.49 66.91,150.34 71.24,125.99 84.9,156.83 98.55,125.99 102.88,150.34 115.07,141.49 108.77,109.33 95.12,101.74 "/><polygon class="st1" points="98.18,94.75 105.77,94 103.52,82.52 "/><polygon class="st1" points="64.02,94 71.62,94.75 66.27,82.52 "/><polygon class="st2" points="161.32,101.3 136.22,78.79 160.71,82.19 156.07,67.87 123.52,63.92 112.09,74.55 131.19,91.51 105.77,94 108.77,109.33 137.41,125.25 149.6,116.4 127.78,104.76 "/><polygon class="st2" points="95.12,101.74 98.18,94.75 84.9,96.05 "/><polygon class="st2" points="106.39,69.49 108.02,62.04 96.41,60.63 "/><polygon class="st3" points="98.18,94.75 95.12,101.74 108.77,109.33 105.77,94 "/><polygon class="st4" points="113.51,37.09 108.02,62.04 123.52,63.92 147.52,41.6 142.87,27.28 125.05,44.43 132.13,11.46 102.96,28.38 113.77,6.13 98.71,6.13 84.9,35.85 91.48,50.01 "/><polygon class="st4" points="73.39,60.63 84.9,53.87 78.32,50.01 73.39,60.63 "/><polygon class="st4" points="103.52,82.52 112.09,74.55 106.39,69.49 "/><polygon class="st5" points="106.39,69.49 112.09,74.55 123.52,63.92 108.02,62.04 "/><polygon class="st6" points="91.48,50.01 84.9,53.87 96.41,60.63 "/><polygon class="st6" points="63.41,69.49 57.7,74.55 66.27,82.52 "/><polygon class="st6" points="56.28,37.09 78.32,50.01 84.9,35.85 71.09,6.13 56.03,6.13 66.83,28.38 37.66,11.46 44.74,44.43 26.92,27.28 22.27,41.6 46.27,63.92 61.77,62.04 "/><polygon class="st7" points="84.9,53.87 91.48,50.01 84.9,35.85 78.32,50.01 "/><polygon class="st8" points="71.62,94.75 74.67,101.74 84.9,96.05 "/><polygon class="st8" points="73.39,60.63 73.39,60.63 73.39,60.63 61.77,62.04 63.41,69.49 73.39,60.63 "/><polygon class="st8" points="38.6,91.51 57.7,74.55 46.27,63.92 13.69,67.87 9.08,82.19 33.58,78.79 8.47,101.3 42.02,104.76 20.2,116.4 32.38,125.25 61.02,109.33 64.02,94 "/><polygon class="st9" points="71.62,94.75 64.02,94 61.02,109.33 74.67,101.74 "/><polygon class="st10" points="63.41,69.49 61.77,62.04 46.27,63.92 57.7,74.55 "/></g>';
    const svgStart = '<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 720 162" style="enable-background:new 0 0 720 162;" xml:space="preserve">';
    const xmlV1 = '<?xml version="1.0" encoding="utf-8"?>';
    const wrapSVG = (a) => {
      return xmlV1 + svgStart + a.join('') + '</svg>';
    }
    const fullStr = wrapSVG([styleStr, wordStr, iconStr]);
    const doc = parser.parseFromString(fullStr, "image/svg+xml");
    return doc.children[0];
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
    const allVis = ['VisMatrix', 'VisBarChart', 'VisScatterplot', "VisCanvasScatterplot"];
    
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
      
      const c = index_name(HS.cgs, chan);
      if (c >= 0) {
        HS.g = c;
      }
      else {
        var escaped_chan = chan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re_chan = RegExp(escaped_chan,'gi');
        const r_c = index_regex(HS.cgs, re_chan);
        if (r_c >= 0) {
          HS.g = r_c;
        }
      }
      THIS.newView(true);
    }

    // Handle click from plot that selects a cell position
    const arrowHandler = function(d){
        var cellPosition = [parseInt(d['X_position']), parseInt(d['Y_position'])]
        var viewportCoordinates = THIS.osd.viewer.viewport.imageToViewportCoordinates(cellPosition[0], cellPosition[1]);
        //change hashstate vars
        HS.v = [ 10, viewportCoordinates.x, viewportCoordinates.y]
        //render without menu redraw
        THIS.osd.newView(true);
        //delay visible arrow until animation end
        HS.a = [viewportCoordinates.x,viewportCoordinates.y];
    }


    // Visualization code
    const renderVis = function(visType, el, id) {
      // Select infovis renderer based on renderer given in markdown
      const renderer = {
        'VisMatrix': infovis.renderMatrix,
        'VisBarChart': infovis.renderBarChart,
        'VisScatterplot': infovis.renderScatterplot,
        'VisCanvasScatterplot': infovis.renderCanvasScatterplot
      }[visType]
      // Select click handler based on renderer given in markdown
      const clickHandler = {
        'VisMatrix': chanAndMaskHandler,
        'VisBarChart': maskHandler,
        'VisScatterplot': arrowHandler,
        'VisCanvasScatterplot': arrowHandler
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

    finish_waypoint('');

  },
  // Color all the remaining HTML Code elements
  colorMarkerText: function (wid_waypoint) {
    const HS = this.hashstate;
    const channelOrders = this.channelOrders(HS.channel_names);
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
      var border = color? '2px solid #' + color: 'inherit';
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
