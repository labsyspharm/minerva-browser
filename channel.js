import viaWebGL from 'viawebgl';

const toSettings = ({ opts, tiles, layers }) => {
  const { channelMap: channel_map } = opts;
  [...tiles.values()].forEach((tile) => {
    delete tile._cached; 
  });
  return { channel_map };
}

const is_tile_target = (tile) => {
  const regex = /^data:image\/png;/;
  return tile.url.match(regex) !== null;
}

const to_target_key = (tile) => {
  const { level, x, y } = tile;
  return `${level}-${x}-${y}`;
}

class State {

  constructor(opts) {
    this.layers = new Map();
    this.targets = new Map();
    this.sources = new Map();
    this.tiles = new Map();
    this.settings = {};
    this.update(opts);
  }

  get channel_map () {
    return this.settings.channel_map;
  }

  trackTile ({ rendered, tile }) {
    this.tiles.set(tile.url, tile);
    const tk = to_target_key(tile);
    if (is_tile_target(tile)) {
      this.targets.set(tk, rendered);
    }
    else {
      const _sources = this.sources.get(tk);
      const sources = _sources || new Set;
      sources.add(tile);
      this.sources.set(tk, sources);
    }
  }

  getSources (tile) {
    const tk = to_target_key(tile);
    if (!this.sources.has(tk)) return new Set;
    return this.sources.get(tk);
  }

  getTarget (tile) {
    const tk = to_target_key(tile);
    if (!this.targets.has(tk)) return null;
    return this.targets.get(tk);
  }

  trackLayer (idx) {
    return ({item: tiledImage}) => {
      this.layers.set(idx, tiledImage);
    }
  }

  update (opts) {
    const { tiles, layers } = this;
    const settings = toSettings({ opts, tiles, layers });
    this.settings.channel_map = settings.channel_map;
    this.sources = new Map();
  }
}

const draw_tile = (ctx, output, viaGL, w, h) => {
  const gl_w = viaGL.width;
  const gl_h = viaGL.height;
  ctx.drawImage(output, 0, 0, gl_w, gl_h, 0, 0, w, h);
}

const to_tile_props = (state, isRendered, tile) => {
  const { name, _data } = tile;
  const is_rendered_1i = isRendered(name) || false;
  if (!state.channel_map.has(name)) {
    console.error(name);
  }
  const color_3fv = state.channel_map.get(name).color;
  return {
    name, _data, is_rendered_1i, color_3fv 
  }
}

const render_tile = (tile_props, uniforms, gl, w, h) => {
  const { 
    name, _data, is_rendered_1i, color_3fv
  } = tile_props;
  const {
    u_is_rendered, u_tile_shape, u_tile_color
  } = uniforms;
  const tile_shape_2fv = new Float32Array([w, h]);
  gl.uniform1i(u_is_rendered, +is_rendered_1i);
  gl.uniform2fv(u_tile_shape, tile_shape_2fv);
  gl.uniform3fv(u_tile_color, color_3fv);

  // Send the tile to the texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
            gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, _data);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return gl.canvas;
}

const to_gl_relation = (e, state, is_t) => {
  const target = state.getTarget(e.tile);
  const sources = state.getSources(e.tile);
  const ready = [
    target !== null,
    sources.size === state.channel_map.size
  ].every(x => x);

  console.log(sources.size, state.channel_map.size);

  if (!ready) return null;
  if (!is_t) return [[...sources], target];
  return [[...sources], e.rendered];
}

const to_tile_drawing = ({ viaGL, state, uniforms, isRendered }) => {
  return (_, e) => {
    // Read parameters from each tile
    const { source } = e.tiledImage;
    const { name } = source;
    e.tile.name = name;
    const w = e.rendered.canvas.width;
    const h = e.rendered.canvas.height;
    
    const is_source = [
      source.colorize === true,
      state.channel_map.has(name)
    ].every(x => x);
    const is_target = is_tile_target(e.tile);
    const missing = ![ is_source, is_target ].some(x => x);
    // Unable to colorize this layer
    if (missing) return; 
    // check cache
    if (e.tile._cached) {
      return;
    }

    // Clear the rendered tile
    e.rendered.fillStyle = "black";
    e.rendered.fillRect(0, 0, w, h);

    console.log(['source', 'target'][+is_target])
    if (is_source) {
      console.error('is_source');
      // Load image into array
      e.tile._data = ((e, w, h) => {
        const { tile, rendered } = e;
        if (tile._data) return tile._data;
        return rendered.getImageData(0, 0, w, h).data;
      })(e, w, h);
    }
    // Count current tile 
    state.trackTile(e);
    e.tile._cached = true;
    // Count all existing sources
    const relation = to_gl_relation(e, state, is_target);
    if (relation === null) return;

    // Start webGL rendering
    const [sources, target] = relation;
    const tile_props = to_tile_props(state, isRendered, sources[0]); //TODO
    const output = render_tile(tile_props, uniforms, viaGL.gl, w, h);
    // Draw the target tile
    draw_tile(target, output, viaGL, w, h);
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

const toOptions = (props) => {
  const { subgroups, tileSources } = props;
  const tileShape = toTileShape(tileSources);
  const channelMap = subgroups.filter((group) => {
    return group.Colors.length === 1;
  }).reduce((o, {Colors, Name}) => {
    const color = hex2gl(Colors[0]);
    o.set(Name, { color });
    return o;
  }, new Map());
  return { channelMap, tileShape };
}

const linkShaders = (props) => {
  const { viewer, subgroups, tileSources, isRendered } = props;
  // Take the nominal tilesize from arbitrary tile source

  const opts = toOptions({subgroups, tileSources});
  const state = new State(opts);

  // Initialize WebGL
  const seaGL = new viaWebGL.openSeadragonGL(viewer);
  seaGL.viaGL.fShader = shaders.fragment;
  seaGL.viaGL.vShader = shaders.vertex;
  seaGL.viaGL.updateShape(...opts.tileShape);
  const viaGL = seaGL.viaGL;

  viaGL["gl-loaded"] = function (program) {
    const u_tile_shape = viaGL.gl.getUniformLocation(program, "u_tile_shape");
    const u_is_rendered = viaGL.gl.getUniformLocation(program, "u_is_rendered");
    const u_tile_color = viaGL.gl.getUniformLocation(program, "u_tile_color");
    const uniforms = { u_is_rendered, u_tile_shape, u_tile_color };
    const closure = { viaGL, state, uniforms, isRendered }
    seaGL["tile-drawing"] = to_tile_drawing(closure);
  };
  seaGL["tile-loaded"] = () => null;
  viaGL.init().then(seaGL.adder.bind(seaGL));

  // Allow update
  const updater = (subgroups) => {
    const opts = toOptions({subgroups, tileSources});
    state.update(opts);
  }
  return { updater }
}

export { linkShaders }
