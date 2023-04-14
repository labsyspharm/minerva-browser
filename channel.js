
const is_tile_source = (tile, state) => {
  const { layers } = state; 
  const found = layers.find(sub => {
    return sub.Name === tile.name;
  });
  return found !== undefined;
}

/*
const is_active_tile_source = (tile, state) => {
  return [
    is_tile_source(tile, state),
    state.channel_map.has(tile.name)
  ].every(x => x);
}
*/

const is_tile_target = (tile) => {
  const regex = /^data:image\/png;/;
  return tile.url.match(regex) !== null;
}

const to_target_key = (tile) => {
  const { level, x, y } = tile;
  return `${level}-${x}-${y}`;
}

const toChannelMap = (layers) => {
  const channel_map = layers.filter((group) => {
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
//    this.channel_map = toChannelMap(opts.layers);
    this.channel_map = toChannelMap(opts.active_subgroups);
    this.active_subgroups = opts.active_subgroups;
    this.layers = opts.layers;
    this.callbacks = new Map();
    this.sources = new Map();
    this.tiles = new Map();
    this.settings = {};
  }

  trackSource(tile) {
    const tk = to_target_key(tile);
    const _sources = this.sources.get(tk);
    const sources = _sources || new Set;
    const idx = this.layers.map(l => l.Name).indexOf(tile.name);
    sources.add({
      x: tile.x,
      y: tile.y,
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

const draw_tile = (props, output, via) => {
  const { rendered, frame } = props;
//  const { w, h } = frame;
  const gl_w = via.width;
  const gl_h = via.height;
  const w = props.data.width;
  const h = props.data.height;
  rendered.drawImage( output, 0, 0, gl_w, gl_h, 0, 0, w, h);
}

const render_tile = (props, uniforms, via) => {
  const { gl } = via;
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

  // Send the tile to the texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8UI, w, h, 0,
            gl.RGB_INTEGER, gl.UNSIGNED_BYTE, data);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  draw_tile(props, gl.canvas, via);
}

const to_tile_props = (closure, sources, d, e) => {
  const { state } = closure;
  const is_rendered_1i = false;
  const { name, data } = sources[0]; // TODO
  const color_3fv = state.channel_map.get(name).color;
  const context = d._getContext(false)
  const rendered = e.rendered;
  const frame = to_tile_frame(e);

  return {
    rendered, context, frame, name, data, is_rendered_1i, color_3fv 
  }
}

const to_render_target = (closure, sources) => {
  const { via, state, uniforms } = closure;
  return (d, e) => {
    const props = to_tile_props(closure, sources, d, e);
    if (props) render_tile(props, uniforms, via);
  }
}

const copy_sources = (closure, e) => {
  const { state, viewer } = closure;
  const is_t = is_tile_target(e.tile);
  const sources = state.getSources(e.tile);
  const source_count = state.active_subgroups.length;
  const all_sources = sources.size === source_count;
  const d = viewer.drawer;
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
  if (source === undefined) return;
  to_render_target(closure, [source])(d, e);
}

const to_tile_drawing = (closure) => {
  const { 
    via, state, uniforms, viewer
  } = closure;
  return (e) => {
    const is_target = is_tile_target(e.tile);
    const is_source = is_tile_source(e.tile, state);
    const missing = ![ is_source, is_target ].some(x => x);
    // Unable to colorize this layer
    if (missing) return; 

    // Clear any rendered tile
    const w = e.rendered.canvas.width;
    const h = e.rendered.canvas.height;
    e.rendered.fillStyle = "black";
    e.rendered.fillRect(0, 0, w, h);

    // Copy all sources to target
    if (is_target) copy_sources(closure, e);
  }
}

const shaders = {
  FRAGMENT_SHADER: `#version 300 es
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
  VERTEX_SHADER: `#version 300 es
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

const to_vertices = () => {
  const one_point_size = 2 * Float32Array.BYTES_PER_ELEMENT;
  const points_list_size = 4 * one_point_size;
  return {
    one_point_size, points_list_size,
    points_buffer: new Float32Array([
      0, 1, 0, 0, 1, 1, 1, 0
    ])
  };
}

const validate = (gl, kind, stat, sh, value) => {
  if (!gl['get'+kind+'Parameter'](value, gl[stat+'_STATUS'])){
    console.log(sh+':\n'+gl['get'+kind+'InfoLog'](value));
  }
  return value;
}

const toProgram = (gl, shaders) => {
  const program = gl.createProgram();
  Object.entries(shaders).map(([sh, given]) => {
      const shader = gl.createShader(gl[sh]);
      gl.shaderSource(shader, given);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      validate(gl,'Shader','COMPILE',sh,shader);
  });
  gl.linkProgram(program);
  return validate(gl,'Program','LINK','LINK',program);
}

const toBuffers = (program, via) => {
  // Allow for custom loading
  const gl = via.gl;

  // Get GLSL locations
  const u_tile = gl.getUniformLocation(program, 'u_tile');
  const a_uv = gl.getAttribLocation(program, 'a_uv');
  const u8 = gl.getUniformLocation(program, 'u8');

  // Assign uniform values
  gl.uniform1ui(u8, 255);
  gl.uniform1i(u_tile, 0);

  // Assign vertex inputs
  gl.bindBuffer(gl.ARRAY_BUFFER, via.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, via.points_buffer, gl.STATIC_DRAW);

  // Enable vertex buffer
  gl.enableVertexAttribArray(a_uv);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, 0, via.one_point_size,
                         0 * via.points_list_size)

  // Set Texture for GLSL
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, via.texture),
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  // Assign texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
}

const update_shape = (gl, { width, height }) => {
  gl.canvas.width = width;
  gl.canvas.height = height;
  gl.viewport(0, 0, width, height);
}

const initialize_gl = (tileShape) => {
  const tile_canvas = document.createElement('canvas');
  const gl = tile_canvas.getContext('webgl2');
  const program = toProgram(gl, shaders);
  update_shape(gl, tileShape);
  gl.useProgram(program);
  toBuffers(program, {
    gl, texture: gl.createTexture(),
    buffer: gl.createBuffer(),
    ...to_vertices()
  });
  const via = { ...tileShape, gl };
  return { program, via };
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
      const width = source.getTileWidth();
      const height = source.getTileHeight();
      return { width, height };
    });
    return shapes.pop() || o;
  }, {width: 1024, height: 1024 });
}

const linkShaders = (props) => {
  const { viewer, active_subgroups, tileSources } = props;
  // Take the nominal tilesize from arbitrary tile source
  const layers = props.layers.filter(sub => {
    return sub.Colorize === true;
  });

  const state = new State({ active_subgroups, layers });

  // Initialize WebGL
  const { program, via } = initialize_gl(toTileShape(tileSources))
  const u_tile_shape = via.gl.getUniformLocation(program, "u_tile_shape");
  const u_is_rendered = via.gl.getUniformLocation(program, "u_is_rendered");
  const u_tile_color = via.gl.getUniformLocation(program, "u_tile_color");
  const uniforms = { u_is_rendered, u_tile_shape, u_tile_color };
  viewer.addHandler('tile-drawing', to_tile_drawing({
    via, viewer, state, uniforms
  }));
  viewer.addHandler('tile-loaded', (e) => {
    const { getCompletionCallback } = e;
    const { image, tiledImage, tile } = e;
    const { name, colorize } = tiledImage.source;
    state.tiles.set(tile.url, tile);
    tile.colorize = colorize;
    tile.name = name;
    tile._image = image;
    if (image === null) {
      return;
    }
    const tk = to_target_key(tile);
    if (is_tile_target(tile)) {
      // One callback for each subgroup
      const callbacks = layers.map(() => {
        return getCompletionCallback();
      });
      state.callbacks.set(tk, callbacks);
  }
    else if (is_tile_source(tile, state)) {
      const callbacks = state.callbacks.get(tk) || [];
      state.trackSource(tile);
      const cb = callbacks.pop();
      if (cb !== undefined) cb();
      const cbl = callbacks.length;
    }
  });
  // Indicate all tiles need draw
  const world = viewer.world;
  for (var i = 0; i < world.getItemCount(); i++) {
    const tiled_image = world.getItemAt(i);
    tiled_image._needsDraw = true;
  }
  viewer.world.update();

  // Allow update
  const updater = (active_subgroups) => {
    state.update(active_subgroups);
  }
  return { updater }
}

export { linkShaders }
