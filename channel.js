
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
  const { frame, data, colors } = props;
  const {
    u_shape, u_t0_color, u_t1_color,
    u_t2_color, u_t3_color, u_t4_color,
    u_t5_color, u_t6_color, u_t7_color
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const tile_shape_2fv = new Float32Array([w, h]);
  const black = hex2gl("000000");
  gl.uniform2fv(u_shape, tile_shape_2fv);
  gl.uniform3fv(u_t0_color, colors[0] || black);
  gl.uniform3fv(u_t1_color, colors[1] || black);
  gl.uniform3fv(u_t2_color, colors[2] || black);
  gl.uniform3fv(u_t3_color, colors[3] || black);
  gl.uniform3fv(u_t4_color, colors[4] || black);
  gl.uniform3fv(u_t5_color, colors[5] || black);
  gl.uniform3fv(u_t6_color, colors[6] || black);
  gl.uniform3fv(u_t7_color, colors[7] || black);

  // Send the tile channels to the texture
  [0,1,2,3,4,5,6,7].forEach((i) => {
    const from = data.channels[i];
    if (from === undefined) return;
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8UI, w, h, 0,
              gl.RGB_INTEGER, gl.UNSIGNED_BYTE, from.data);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  draw_tile(props, gl.canvas, via);
}

const to_tile_props = (closure, shown, d, e) => {
  const { state } = closure;
  const data = {
    channels: shown,
    width: shown[0].data.width,
    height: shown[0].data.height
  }
  const colors = shown.map(show => {
    return state.channel_map.get(show.name).color;
  });
  const context = d._getContext(false)
  const rendered = e.rendered;
  const frame = to_tile_frame(e);

  return {
    rendered, context, frame, data, colors 
  }
}

const to_render_target = (closure, shown) => {
  const { via, state, uniforms } = closure;
  return (d, e) => {
    const props = to_tile_props(closure, shown, d, e);
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
  if (!sources.size) return;
  // Redraw the target with correct info
  const source_map = [...sources].reduce((o, source) => {
    o.set(source.name, source);
    return o;
  }, new Map);
  const shown = state.active_subgroups.filter((sub) => {
    if (!state.channel_map.has(sub.Name)) return false;
    if (!source_map.has(sub.Name)) return false;
    return true;
  }).map(sub => source_map.get(sub.Name));
  if (!shown.length) return;
  to_render_target(closure, shown)(d, e);
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
    if (e.tile._cached) return;

    console.log('HI');

    // Clear any rendered tile
    const w = e.rendered.canvas.width;
    const h = e.rendered.canvas.height;
    e.rendered.fillStyle = "black";
    e.rendered.fillRect(0, 0, w, h);

    // Copy all sources to target
    if (is_target) {
      copy_sources(closure, e);
      e.tile._cached = true;
    }
  }
}

const shaders = {
  FRAGMENT_SHADER: `#version 300 es
precision highp int;
precision highp float;
precision highp usampler2D;

uniform vec2 u_shape;
uniform vec3 u_t0_color;
uniform vec3 u_t1_color;
uniform vec3 u_t2_color;
uniform vec3 u_t3_color;
uniform vec3 u_t4_color;
uniform vec3 u_t5_color;
uniform vec3 u_t6_color;
uniform vec3 u_t7_color;
uniform usampler2D u_t0;
uniform usampler2D u_t1;
uniform usampler2D u_t2;
uniform usampler2D u_t3;
uniform usampler2D u_t4;
uniform usampler2D u_t5;
uniform usampler2D u_t6;
uniform usampler2D u_t7;

in vec2 uv;
out vec4 color;

// Sample texture at given texel offset
uvec4 texel(usampler2D sam, vec2 size, vec2 pos, vec2 off) {
  float x = pos.x + off.x / size.x;
  float y = pos.y + off.y / size.y;
  return texture(sam, vec2(x, y));
}

// Colorize continuous u8 signal
vec3 u8_r_range(usampler2D sam, vec3 color) {
  vec2 xy = vec2(0, 0);
  // Scale color by texel value 
  uint scale = texel(sam, u_shape, uv, xy).r;
  return color * float(scale) / 255.;
}

void main() {
  vec3 v0 = u8_r_range(u_t0, u_t0_color);
  vec3 v1 = u8_r_range(u_t1, u_t1_color);
  vec3 v2 = u8_r_range(u_t2, u_t2_color);
  vec3 v3 = u8_r_range(u_t3, u_t3_color);
  vec3 v4 = u8_r_range(u_t4, u_t4_color);
  vec3 v5 = u8_r_range(u_t5, u_t5_color);
  vec3 v6 = u8_r_range(u_t6, u_t6_color);
  vec3 v7 = u8_r_range(u_t7, u_t7_color);
  color = vec4(v0+v1+v2+v3+v4+v5+v6+v7, 1.0);
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
  const u_t0 = gl.getUniformLocation(program, 'u_t0');
  const u_t1 = gl.getUniformLocation(program, 'u_t1');
  const u_t2 = gl.getUniformLocation(program, 'u_t2');
  const u_t3 = gl.getUniformLocation(program, 'u_t3');
  const u_t4 = gl.getUniformLocation(program, 'u_t4');
  const u_t5 = gl.getUniformLocation(program, 'u_t5');
  const u_t6 = gl.getUniformLocation(program, 'u_t6');
  const u_t7 = gl.getUniformLocation(program, 'u_t7');
  const a_uv = gl.getAttribLocation(program, 'a_uv');
  const u8 = gl.getUniformLocation(program, 'u8');

  // Assign uniform values
  gl.uniform1ui(u8, 255);
  gl.uniform1i(u_t0, 0);
  gl.uniform1i(u_t1, 1);
  gl.uniform1i(u_t2, 2);
  gl.uniform1i(u_t3, 3);
  gl.uniform1i(u_t4, 4);
  gl.uniform1i(u_t5, 5);
  gl.uniform1i(u_t6, 6);
  gl.uniform1i(u_t7, 7);

  // Assign vertex inputs
  gl.bindBuffer(gl.ARRAY_BUFFER, via.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, via.points_buffer, gl.STATIC_DRAW);

  // Enable vertex buffer
  gl.enableVertexAttribArray(a_uv);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, 0, via.one_point_size,
                         0 * via.points_list_size);

  [0,1,2,3,4,5,6,7].forEach((i) => {
    // Set Texture
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    // Assign texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  })
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
    gl, ...to_vertices(), buffer: gl.createBuffer(),
    textures: [0,1,2,3,4,5,6,7].map(() => gl.createTexture())
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
  const u_shape = via.gl.getUniformLocation(program, "u_shape");
  const u_t0_color = via.gl.getUniformLocation(program, "u_t0_color");
  const u_t1_color = via.gl.getUniformLocation(program, "u_t1_color");
  const u_t2_color = via.gl.getUniformLocation(program, "u_t2_color");
  const u_t3_color = via.gl.getUniformLocation(program, "u_t3_color");
  const u_t4_color = via.gl.getUniformLocation(program, "u_t4_color");
  const u_t5_color = via.gl.getUniformLocation(program, "u_t5_color");
  const u_t6_color = via.gl.getUniformLocation(program, "u_t6_color");
  const u_t7_color = via.gl.getUniformLocation(program, "u_t7_color");
  const uniforms = {
    u_shape, u_t0_color, u_t1_color,
    u_t2_color, u_t3_color, u_t4_color,
    u_t5_color, u_t6_color, u_t7_color
  };
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
