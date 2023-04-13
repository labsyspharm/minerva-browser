import viaWebGL from 'viawebgl';

const is_tile_source = (tile, state, isRendered) => {
  return [
    tile.colorize === true,
    !isRendered(tile.name),
    state.channel_map.has(tile.name)
  ].every(x => x);
}

const is_tile_target = (tile) => {
  const regex = /^data:image\/png;/;
  return tile.url.match(regex) !== null;
}

const to_target_key = (tile) => {
  const { level, x, y } = tile;
  return `${level}-${x}-${y}`;
}

const toChannelMap = (subgroups) => {
  const channel_map = subgroups.filter((group) => {
    return group.Colors.length === 1;
  }).reduce((o, {Colors, Name}) => {
    const color = hex2gl(Colors[0]);
    o.set(Name, { color });
    return o;
  }, new Map());
  return channel_map;
}

class State {

  constructor(opts) {
//    this.channel_map = toChannelMap(opts.subgroups);
    this.channel_map = toChannelMap(opts.active_subgroups);
    this.active_subgroups = opts.active_subgroups;
    this.callbacks = new Map();
    this.sources = new Map();
    this.tiles = new Map();
    this.settings = {};
  }

  trackSource (tile) {
    const tk = to_target_key(tile);
    const _sources = this.sources.get(tk);
    const sources = _sources || new Set;
    sources.add({
      x: tile.x,
      y: tile.y,
      level: tile.level,
      name: tile.name,
      data: tile._image 
    });
    this.sources.set(tk, sources);
  }

  getSources (tile) {
    const tk = to_target_key(tile);
    if (!this.sources.has(tk)) return new Set;
    return this.sources.get(tk);
  }

  getCallbacks (tile) {
    const tk = to_target_key(tile);
    if (!this.callbacks.has(tk)) return null;
    return this.callbacks.get(tk);
  }

  update (active_subgroups) {
    const { tiles } = this;
    this.channel_map = toChannelMap(active_subgroups);
    this.active_subgroups = active_subgroups;
    [...tiles.values()].forEach((tile) => {
      delete tile._cached; 
    });
  }
}

const to_tile_frame = (e) => {
  const px_size = OpenSeadragon.pixelDensityRatio;
  const pos = e.tile.position.times(px_size);
  const size = e.tile.size.times(px_size);
  return {
    x: pos.x, y: pos.y, w: size.x, h: size.y
  };
}

const draw_tile = (props, output, viaGL) => {
  const { rendered, frame } = props;
  const { w, h } = frame;
  const gl_w = viaGL.width;
  const gl_h = viaGL.height;
  rendered.drawImage( output, 0, 0, gl_w, gl_h, 0, 0, w, h);
}

// TODO?
const draw_tile_full = (props, output, viaGL) => {
  const { context, frame } = props;
  const { w, h, x, y } = frame;
  const gl_w = viaGL.width;
  const gl_h = viaGL.height;
  context.drawImage( output, 0, 0, gl_w, gl_h, x, y, w, h);
}

const render_tile = (props, uniforms, viaGL) => {
  const { gl } = viaGL;
  const { 
    frame, name, data, is_rendered_1i, color_3fv
  } = props;
  const {
    u_is_rendered, u_tile_shape, u_tile_color
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const tile_shape_2fv = new Float32Array([w, h]);
  gl.uniform1i(u_is_rendered, +is_rendered_1i);
  gl.uniform2fv(u_tile_shape, tile_shape_2fv);
  gl.uniform3fv(u_tile_color, color_3fv);
  console.log(name, [...color_3fv]);

  // Send the tile to the texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8UI, w, h, 0,
            gl.RGB_INTEGER, gl.UNSIGNED_BYTE, data);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  draw_tile(props, gl.canvas, viaGL);
}

const to_tile_props = (closure, sources, d, e) => {
  const { state, isRendered } = closure;
  const { name, data } = sources[0]; // TODO
  const is_rendered_1i = isRendered(name) || false;
  const color_3fv = state.channel_map.get(name).color;
  const context = d._getContext(false)
  const rendered = e.rendered;
  const frame = to_tile_frame(e);
  return {
    rendered, context, frame, name, data, is_rendered_1i, color_3fv 
  }
}

const to_render_target = (closure, sources) => {
  const { viaGL, state, uniforms } = closure;
  return (d, e) => {
    const props = to_tile_props(closure, sources, d, e);
    if (props) render_tile(props, uniforms, viaGL);
  }
}

const copy_sources = (closure, e) => {
  const { state, viewer } = closure;
  const is_t = is_tile_target(e.tile);
  const sources = state.getSources(e.tile);
  const source_count = state.active_subgroups.length;
  const all_sources = sources.size === source_count;
  const ready = [ all_sources ].every(x => x);
  const d = viewer.drawer;
  if (!ready) return null; // TODO? still necessary?
  if (!sources.size) return null;
  // Redraw the target with correct info
  // TODO: use mutiple channels
  const favored = state.active_subgroups[0].Name
  const visible = [...sources].filter(source => {
    return state.channel_map.has(source.name);
  });
  const source = visible.find((source, i) => {
    if (source.name === favored) return true;
    return i = visible.size - 1; // catch-all
  });
  to_render_target(closure, [source])(d, e);
}

const to_tile_drawing = (closure) => {
  const { 
    viaGL, state, uniforms, isRendered, viewer
  } = closure;
  return (_, e) => {
    const is_target = is_tile_target(e.tile);
    const is_source = is_tile_source(e.tile, state, isRendered);
    const missing = ![ is_source, is_target ].some(x => x);
    // Unable to colorize this layer
    if (missing) return; 
    // check cache
    if (e.tile._cached) {
      return;
    }
    if (is_target) {
      // Clear any rendered tile
      const w = e.rendered.canvas.width;
      const h = e.rendered.canvas.height;
      e.rendered.fillStyle = "black";
      e.rendered.fillRect(0, 0, w, h);
      // redraw target if possible
      copy_sources(closure, e);
    }
    if (is_source) {
      // Clear any rendered tile
      const w = e.rendered.canvas.width;
      const h = e.rendered.canvas.height;
//      e.rendered.fillStyle = "black";
//      e.rendered.fillRect(0, 0, w, h);
      // redraw target if possible
      copy_sources(closure, e);
    }
    e.tile._cached = true;
  }
}

const shaders = {
  fragment: `#version 300 es
precision highp int;
precision highp float;
precision highp usampler2D;

uniform int u_is_rendered;
uniform vec2 u_tile_shape;
uniform vec3 u_tile_color;
uniform usampler2D u_tile;

in vec2 uv;
out vec4 color;

// Sample texture at given texel offset
uvec4 offset(usampler2D sam, vec2 size, vec2 pos, vec2 off) {
  float x = pos.x + off.x / size.x;
  float y = pos.y + off.y / size.y;
  return texture(sam, vec2(x, y));
}

// Colorize continuous u8 signal
vec4 u8_r_range(float alpha) {
  uint pixel = offset(u_tile, u_tile_shape, uv, vec2(0, 0)).r;
  float value = float(pixel) / 255.;

  // Color pixel value
  vec3 pixel_color = u_tile_color * value;
  return vec4(pixel_color, alpha);
}

void main() {
  if (u_is_rendered == 1) {
    uvec4 rgb = offset(u_tile, u_tile_shape, uv, vec2(0, 0));
    float r = float(rgb.r)/255.;
    float g = float(rgb.g)/255.;
    float b = float(rgb.b)/255.;
    color = vec4(r, g, b, 1.0);
  }
  else {
    color = u8_r_range(1.0);
  }
}`,
  vertex: `#version 300 es
in vec2 a_uv;
out vec2 uv;

void main() {
  // Texture coordinates
  uv = a_uv;

  // Clip coordinates
  vec2 full_pos = 2. * a_uv - 1.;
  gl_Position = vec4(full_pos, 0., 1.);
}`
}

const hex2gl = (hex) => {
  const val = parseInt(hex.replace('#',''), 16);
  const bytes = [16, 8, 0].map(shift => {
    return ((val >> shift) & 255) / 255;
  });
  return new Float32Array(bytes);
}

const toTileShape = (tileSources) => {
  const tileSourceVals = [...Object.values(tileSources)];
  return tileSourceVals.reduce((o, tiledImages) => {
    const shapes = tiledImages.map(({source}) => {
      const { _tileWidth, _tileHeight } = source;
      return [ _tileWidth, _tileHeight ];
    })
    return shapes.pop() || o;
  }, [1024, 1024]);
}

const linkShaders = (props) => {
  const { viewer, active_subgroups, subgroups, tileSources, isRendered } = props;
  // Take the nominal tilesize from arbitrary tile source

  const state = new State({ active_subgroups, subgroups });

  // Initialize WebGL
  const seaGL = new viaWebGL.openSeadragonGL(viewer);
  seaGL.viaGL.fShader = shaders.fragment;
  seaGL.viaGL.vShader = shaders.vertex;
  const tileShape = toTileShape(tileSources);
  seaGL.viaGL.updateShape(...tileShape);
  const viaGL = seaGL.viaGL;

  viaGL["gl-loaded"] = function (program) {
    const u_tile_shape = viaGL.gl.getUniformLocation(program, "u_tile_shape");
    const u_is_rendered = viaGL.gl.getUniformLocation(program, "u_is_rendered");
    const u_tile_color = viaGL.gl.getUniformLocation(program, "u_tile_color");
    const uniforms = { u_is_rendered, u_tile_shape, u_tile_color };
    const closure = { viaGL, viewer, state, uniforms, isRendered };
    seaGL["tile-drawing"] = to_tile_drawing(closure);
  };
  seaGL["tile-loaded"] = (_, e) => {
    const { getCompletionCallback } = e;
    const { image, tiledImage, tile } = e;
    const { name, colorize } = tiledImage.source;
    state.tiles.set(tile.url, tile);
    tile.colorize = colorize;
    tile.name = name;
    if (image === null) {
      tile._image = null;
      return;
    }
    const tk = to_target_key(tile);
    if (is_tile_target(tile)) {
      // One callback for each active subgroup
      const callbacks = active_subgroups.map(() => {
        return getCompletionCallback();
      });
      state.callbacks.set(tk, callbacks);
    }
    else if (is_tile_source(tile, state, isRendered)) {
      const callbacks = state.callbacks.get(tk) || [];
      tile._image = image.cloneNode();
      tile._image.onload = () => {
        // Count current tile 
        state.trackSource(tile);
        const cb = callbacks.pop();
        if (cb !== undefined) cb();
      }
    }
  };
  viaGL.init().then(seaGL.adder.bind(seaGL));

  // Allow update
  const updater = (active_subgroups) => {
    state.update(active_subgroups);
  }
  return { updater }
}

export { linkShaders }
