const TEXTURE_RANGE = [
  0,1,2,3,4,5,6,7,
  8,9,10,11,12,13,14,15,
  16,17,18,19,20,21,22,23,
  24,25,26,27,28,29,30,31
]
const ACTIVE_TEXTURE_RANGE = [
  0,1,2,3,4,5,6,7,
  8,9,10,11,12,13,14,15
]

const to_uniforms = (program, gl, is_alpha_shader) => {
  if (is_alpha_shader) {
    return [ TEXTURE_RANGE, [0, 1], to_alpha_uniforms(program, gl) ];
  }
  return [
    ACTIVE_TEXTURE_RANGE, ACTIVE_TEXTURE_RANGE,
    to_linear_uniforms(program, gl, ACTIVE_TEXTURE_RANGE)
  ];
}

const render_alpha_tile = (props, uniforms, tile, via) => {
  const { gl } = via;
  if (props === null) {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return via.gl.canvas;
  }
  const { data } = props;
  const { alpha_index, alpha_cached } = data;
  const {
    u_lens, u_shape, u_alpha_index, u_blend_alpha,
    u_lens_rad, u_lens_scale, u_level, u_origin,
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const max = data.max_level;
  const lens_rad = data.lens_rad;
  const lens_scale = data.lens_scale;
  const x = tile.x * data.tile_square[0];
  const y = tile.y * data.tile_square[1];
  const tile_lens_2fv = data.lens_center;
  const tile_level = Math.max(0, max - tile.level);
  const tile_origin_2fv = new Float32Array([x, y]);
  const tile_shape_2fv = new Float32Array([w, h]);
  const full = [0, 0, 0, 0];
  gl.uniform1f(u_level, tile_level);
  gl.uniform2fv(u_lens, tile_lens_2fv);
  gl.uniform1f(u_lens_rad, lens_rad);
  gl.uniform1f(u_lens_scale, lens_scale);
  gl.uniform2fv(u_shape, tile_shape_2fv);
  gl.uniform2fv(u_origin, tile_origin_2fv);
  gl.uniform1i(u_alpha_index, alpha_index);
  gl.uniform1f(u_blend_alpha, data.blend_alpha);

  // Point to the alpha channel
  gl.uniform1i(via.texture_uniforms[0], alpha_index);
  gl.uniform1i(via.texture_uniforms[1], alpha_index + 1);

  // Bind all needed textures
  via.texture_uniforms.forEach((_, _i) => {
    const i = alpha_index + _i;
    const from = data.channels[_i];
    // Allow caching of one alpha channel
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, via.flip_y);
    // Don't rebind if is cached alpha
    if (alpha_cached) return;
    // Actually re-bind the alpha tile texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
  });

  // Actually draw the arrays
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return gl.canvas;
}

const render_linear_tile = (props, uniforms, tile, via) => {
  const { gl } = via;
  if (props === null) {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return via.gl.canvas;
  }
  const { data } = props;
  const { alpha_index, alpha_cached } = data;
  const {
    u_shape, u_crops, u_colors, u_modes,
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const x = tile.x * data.tile_square[0];
  const y = tile.y * data.tile_square[1];
  const tile_origin_2fv = new Float32Array([x, y]);
  const tile_shape_2fv = new Float32Array([w, h]);
  const full = [0, 0, 0, 0];
  const black = hex2gl("000000");
  gl.uniform2fv(u_shape, tile_shape_2fv);

  // Bind all needed textures
  via.texture_uniforms.forEach((_, i) => {
    gl.uniform4fv(u_crops[i], data.crops[i] || full);
    gl.uniform3fv(u_colors[i], data.colors[i] || black);
    gl.uniform2ui(u_modes[i], ...(data.modes[i] || [0, 0]));
    // Load the data
    const from = data.channels[i];
    if (from === undefined) return;
    // Allow caching of one alpha channel
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, via.flip_y);
    // Actually re-bind the tile texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
  });
  // Actually draw the arrays
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return gl.canvas;
}

const to_tile_props = (shown, HS, lens_scale, lens_center, cache_gl) => {
  const { 
    tile_square, max_level 
  } = cache_gl.shape_opts;
  if (shown.channels.length < 1) return null;
  if (shown.colors.length < 1) return null;
  if (shown.modes.length < 1) return null;
  if (shown.crops.length < 1) return null;
  const data = {
    blend_alpha: -1,
    alpha_index: -1,
    max_level,
    lens_scale,
    lens_center,
    tile_square,
    lens_rad: 0,
    modes: shown.modes,
    colors: shown.colors,
    channels: shown.channels,
    crops: shown.crops,
    width: shown.channels[0].width,
    height: shown.channels[0].height
  }
  return { data };
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_uv;
out vec2 uv;

void main() {
// Texture coordinates
uv = a_uv;

// Clip coordinates
vec2 full_pos = 2. * a_uv - 1.;
gl_Position = vec4(full_pos, 0., 1.);
}`
const SHADERS = [{
  FRAGMENT_SHADER: `#version 300 es
  precision highp int;
  precision highp float;
  precision highp usampler2D;

  uniform vec2 u_shape;
  uniform vec4 u_t0_crop;
  uniform vec4 u_t1_crop;
  uniform vec4 u_t2_crop;
  uniform vec4 u_t3_crop;
  uniform vec4 u_t4_crop;
  uniform vec4 u_t5_crop;
  uniform vec4 u_t6_crop;
  uniform vec4 u_t7_crop;
  uniform uvec2 u_t0_mode;
  uniform uvec2 u_t1_mode;
  uniform uvec2 u_t2_mode;
  uniform uvec2 u_t3_mode;
  uniform uvec2 u_t4_mode;
  uniform uvec2 u_t5_mode;
  uniform uvec2 u_t6_mode;
  uniform uvec2 u_t7_mode;
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
  uvec4 texel(usampler2D sam, vec2 size, vec2 pos, vec4 crop) {
    vec2 s = vec2(pow(2.0, crop[0]), pow(2.0, crop[1]));
    vec2 p = vec2(pos.x / s.x, pos.y / s.y);
    vec2 off = vec2(crop[2], crop[3]);
    float x = p.x + off.x / size.x;
    if (s.x != 1. || s.y != 1.) {
      float y = 1. - p.y - off.y / size.y;
      return texture(sam, vec2(x, y));
    }
    float y = 1. - p.y;
    return texture(sam, vec2(x, y));
  }

  // Colorize continuous u8 signal
  vec4 color_channel(usampler2D sam, vec3 rgb, vec4 crop, uvec2 mode) {
    uvec4 tex = texel(sam, u_shape, uv, crop);

    // Render empty unconditionally
    if (mode[1] == uint(0)) {
      return vec4(0.0);
    }

    // Render exact rgba texture
    if (mode[1] == uint(1)) {
      return vec4(tex) / 255.;
    }

    // Scale color by texel value 
    return vec4(rgb * float(tex.r) / 255., 1.0);
  }

  vec4 linear_blend() {
    vec4 v0 = color_channel(u_t0, u_t0_color, u_t0_crop, u_t0_mode);
    v0 = v0 + color_channel(u_t1, u_t1_color, u_t1_crop, u_t1_mode);
    v0 = v0 + color_channel(u_t2, u_t2_color, u_t2_crop, u_t2_mode);
    v0 = v0 + color_channel(u_t3, u_t3_color, u_t3_crop, u_t3_mode);
    v0 = v0 + color_channel(u_t4, u_t4_color, u_t4_crop, u_t4_mode);
    v0 = v0 + color_channel(u_t5, u_t5_color, u_t5_crop, u_t5_mode);
    v0 = v0 + color_channel(u_t6, u_t6_color, u_t6_crop, u_t6_mode);
    v0 = v0 + color_channel(u_t7, u_t7_color, u_t7_crop, u_t7_mode);
    return v0;
  }

  void main() {
    color = linear_blend();
  }`,
  VERTEX_SHADER 
  }, {
  FRAGMENT_SHADER: `#version 300 es
  precision highp int;
  precision highp float;
  precision highp usampler2D;

  uniform vec2 u_lens;
  uniform vec2 u_shape;
  uniform vec2 u_origin;
  uniform float u_level;
  uniform float u_lens_rad;
  uniform float u_lens_scale;
  uniform float u_blend_alpha;
  uniform int u_alpha_index;
  uniform usampler2D u_t0;
  uniform usampler2D u_t1;

  in vec2 uv;
  out vec4 color;

  // From uv coordinates to global
  vec2 tile_to_global(vec2 v) {
    float scale = pow(2., u_level);
    vec2 tile_flip = vec2(v.x, 1. - v.y) * u_shape;
    return (u_origin + tile_flip) * scale;
  }

  // Distance from alpha slider center
  float alpha_slider(vec2 lens, vec2 v) {
    vec2 global_v = tile_to_global(v);
    float rad = u_lens_rad / u_lens_scale;
    float angle = 3. * (u_blend_alpha - 0.03);
    float x = lens.x - rad * cos(angle);
    float y = lens.y - rad * sin(angle);
    return distance(vec2(x, y), global_v);
  }

  // Compare to lens radius
  int lens_status(vec2 lens, vec2 v) {
    vec2 global_v = tile_to_global(v);
    float d = distance(lens, global_v);
    float rad = u_lens_rad / u_lens_scale;
    float border = 3. / u_lens_scale;
    // Exceeds lens border
    if (abs(d) > rad) {
      float alpha_rad = 20. / u_lens_scale;
      float alpha_ring = 23. / u_lens_scale;
      float alpha_dist = alpha_slider(lens, v);
      // Within controls
      if (alpha_dist < alpha_rad) {
        return 2;
      }
      if (alpha_dist < alpha_ring) {
        return 1;
      }
      // Exceeds controls
      return 0;
    };
    // On lens border
    if (abs(d) > rad - border) {
      return 1;
    };
    // Within lens
    return 3;
  }

  // Sample texture at given texel offset
  uvec4 texel(usampler2D sam, vec2 size, vec2 pos) {
    return texture(sam, vec2(pos.x, 1. - pos.y));
  }

  // Colorize continuous u8 signal
  vec4 color_channel(usampler2D sam) {
    uvec4 tex = texel(sam, u_shape, uv);

    // Render empty lens background
    vec2 global_v = tile_to_global(uv);
    int lens = lens_status(u_lens, uv);
    if (lens == 0) {
      return vec4(0.0);
    }
    if (lens == 1) {
      return vec4(1.0);
    }
    if (lens == 2) {
      return vec4(0., 0., 0., 1.);
    }
    return vec4(tex) / 255.;
  }

  vec4 alpha_blend(vec4 v0, usampler2D t) {
    vec4 v1 = color_channel(t);
    float a = u_blend_alpha * v1.a;
    int lens = lens_status(u_lens, uv);
    if (lens == 1 || lens == 2) {
      a = 1.0;
    }
    return (1. - a) * v0 + a * v1;
  }

  void main() {
    color = vec4(texel(u_t0, u_shape, uv)) / 255.;
    if (u_blend_alpha > 0. && u_alpha_index >= 2) {
      color = alpha_blend(color, u_t1);
    }
  }`,
  VERTEX_SHADER 
}]

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

const toBuffers = (flip_y, tex, active_tex, program, via) => {
  // Allow for custom loading
  const gl = via.gl;

  const a_uv = gl.getAttribLocation(program, 'a_uv');
  const u8 = gl.getUniformLocation(program, 'u8');
  gl.uniform1ui(u8, 255);

  // Assign vertex inputs
  gl.bindBuffer(gl.ARRAY_BUFFER, via.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, via.points_buffer, gl.STATIC_DRAW);

  // Enable vertex buffer
  gl.enableVertexAttribArray(a_uv);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, 0, via.one_point_size,
                         0 * via.points_list_size);

  tex.forEach((i) => {
    // Set Texture
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip_y);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    // Assign texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  });

  return active_tex.map((i) => {
    // Assign uniforms
    const u_t = gl.getUniformLocation(program, `u_t${i}`);
    gl.uniform1i(u_t, i);
    return u_t;
  })
}

const to_gl_tile_key = (flip_y, tile) => {
  const [w, h] = to_tile_shape(tile);
  const { level } = tile;
  return `${flip_y}-${w}-${h}`;
}

const to_tile_shape = (tile) => {
  const { width, height } = tile.sourceBounds;
  return [width, height].map(x => Math.ceil(x));
}

const update_shape = (gl, tile) => {
  const [w, h] = to_tile_shape(tile);
  gl.canvas.width = w;
  gl.canvas.height = h;
  gl.viewport(0, 0, w, h);
}

const initialize_gl = (flip_y, tile, cleanup) => {
  const key = to_gl_tile_key(flip_y, tile);
  const r1 = (Math.random() + 1).toString(36).substring(2);
  const r2 = (Math.random() + 1).toString(36).substring(2);
  const tile_canvas = document.createElement('canvas');
  tile_canvas.addEventListener("webglcontextlost", cleanup, false);
  tile_canvas.id = "tile-"+key+"-"+r1+'-'+r2;
  const gl = tile_canvas.getContext('webgl2');
  const is_alpha_shader = flip_y ? 0 : 1;
  const shaders = SHADERS[+is_alpha_shader];
  const program = toProgram(gl, shaders);
  update_shape(gl, tile);
  gl.useProgram(program);
  const [tex, active_tex, uniforms] = to_uniforms(
    program, gl, is_alpha_shader
  );
  const textures = tex.map(() => gl.createTexture());
  const texture_uniforms = toBuffers(flip_y, tex, active_tex, program, {
    gl, ...to_vertices(), buffer: gl.createBuffer(), textures
  });
  const via = { gl, flip_y, texture_uniforms, textures, program };
  return { via, uniforms };
}

const hex2gl = (hex) => {
  const val = parseInt(hex.replace('#',''), 16);
  const bytes = [16, 8, 0].map(shift => {
    return ((val >> shift) & 255) / 255;
  });
  return new Float32Array(bytes);
}

const split_url = (full_url) => {
  const parts = full_url.split('/');
  if (parts.length < 2) return null;
  return parts.slice(-2)[0];
} 

const set_cache_gl = (gl_state, tile, shape_opts, flip_y) => {
  const key = to_gl_tile_key(flip_y, tile);
  const caches_gl = gl_state.caches_gl;
  if (caches_gl.has(key)) {
    return caches_gl.get(key);
  }
  const cache_gl = to_cache_gl(
    gl_state, shape_opts, flip_y, tile,
    () => caches_gl.delete(key)
  );
  caches_gl.set(key, cache_gl);
  return cache_gl;
}

const to_tile_key = ({level, x, y}) => {
  return `${level}-${x}-${y}`;
}

const parseImageJob = (imageJob) => {
  const full_url = imageJob.src;
  const parts = full_url.split('/');
  const { tile } = imageJob;
  const key = to_tile_key(tile);
  return { full_url, key, tile };
}

const customTileCache = (HS, target) => {
  const is_source = target === null;
  return {
    createTileCache: function(cache_gl, out) {
      cache_gl._out = out;
    },
    destroyTileCache: function(cache_gl) {
      if (is_source) {
        const { key, subpath } = cache_gl._out;
        HS.gl_state.untrackImageData(key, subpath);
      }
      delete cache_gl._out;
    },
    getTileCacheData: function(cache_gl) {
      return cache_gl._out;
    },
    getTileCacheDataAsImage: function() {
      throw "Image-based drawing unsupported";
    }
  }
}

const to_shape_opts = (tileSource) => {
  const max_level = tileSource.maxLevel;
  const tile_square = [
    tileSource.tileWidth, tileSource.tileHeight
  ]
  return {
    max_level, tile_square
  };
}

const render_from_cache = (HS, lens_scale, lens_center, layers, cache_gl, out) => {
  const { tile, key } = out;
  const lens_rad = HS.lensRad;
  const { 
    tile_square, max_level 
  } = cache_gl.shape_opts;
  const n_tex = cache_gl.via.textures.length;
  const { index, cached } = HS.gl_state.nextAlpha(key, n_tex);
  // Allow blending of two alpha layers
  const [ bottom_layer, top_layer ] = layers;
  const data = {
    alpha_index: index,
    alpha_cached: cached,
    blend_alpha: HS.lensAlpha,
    max_level,
    lens_scale,
    lens_center,
    tile_square,
    lens_rad,
    channels: [bottom_layer, top_layer],
    width: bottom_layer.width,
    height: bottom_layer.height,
  };
  return render_alpha_tile({ data }, cache_gl.uniforms, tile, cache_gl.via);
}

const render_to_cache = (HS, lens_scale, lens_center, key, tile, target, cache_gl) => {
  const shown = HS.gl_state.to_shown(key || '', target);
  const props = to_tile_props(shown, HS, lens_scale, lens_center, cache_gl);
  return render_linear_tile(props, cache_gl.uniforms, tile, cache_gl.via);
}

const scale_to_global = (max_level, tile) => {
  const level = Math.max(0, max_level - tile.level);
  return v => v * 2 ** level;
}

const tile_to_global = (to_scale, shape_opts, tile) => {
  const { tile_square } = shape_opts;
  const origin = [
    tile.x * tile_square[0], tile.y * tile_square[1]
  ];
  return xy => {
    return [0, 1].map(i => {
      return to_scale(origin[i] + xy[i]);
    });
  }
}

const to_tile_corners = (tile) => {
  const { width: w, height: h } = tile.sourceBounds;
  return [ 
    [0, 0], [w, 0], [0, h], [w, h],
    [w/2, 0], [0, h/2], [w/2, h], [w, h/2]
  ];
}

const to_tile_box = (to_scale, to_global, tile) => {
  const { width: w, height: h } = tile.sourceBounds;
  const [west, north] = to_global([0, 0]);
  const [east, south] = to_global([w, h]);
  const center = to_global([w/2, h/2]);
  return {
    rad: to_scale(Math.max(w, h)), center,
    east, west, north, south
  };
}

const to_lens_box = (rad, lens_center) => {
  return {
    rad, center: lens_center,
    west: lens_center[0] - rad, east: lens_center[0] + rad,
    north: lens_center[1] - rad, south: lens_center[1] + rad
  }
}

const toDistance = (a, b) => {
  const d = [0, 1].map(i => a[i] - b[i]);
  return Math.sqrt(d[0]**2 + d[1]**2);
}

const is_within_lens = (HS, lens_scale, lens_center, cache_gl, tile) => {
  const { shape_opts } = cache_gl;
  const to_scale = scale_to_global(shape_opts.max_level, tile);
  const to_global = tile_to_global(to_scale, shape_opts, tile);
  const tbox = to_tile_box(to_scale, to_global, tile);
  const rad = HS.lensRad / lens_scale;
  const lbox = to_lens_box(rad, lens_center);
  const non_overlap_cases = [
    tbox.west > lbox.east, tbox.east < lbox.west,
    tbox.north > lbox.south, tbox.south < lbox.north
  ];
  // Bounding boxes don't overlap
  if (non_overlap_cases.some(x => x)) return false;
  // The lens is close enough that it must overlap
  const near_range = Math.max(rad, tbox.rad);
  if (toDistance(tbox.center, lens_center) < near_range) {
    return true;
  }
  // Check all corners for overlap
  return to_tile_corners(tile).map(to_global).some(xy => {
    return toDistance(lens_center, xy) < rad;
  });
}

const need_top_layer = (HS, lens_scale, lens_center, cache_gl, tile) => {
  if (!HS.gl_state.showVisibleLens) return false;
  return is_within_lens(HS, lens_scale, lens_center, cache_gl, tile);
}

const render_output = (HS, lens_scale, lens_center, cache_gl, out) => {

  const { key, tile } = out;
  const { top_layer, bottom_layer, w, h } = out;
  const layers = [bottom_layer, top_layer];
 
  // Render both layers from cache
  render_from_cache(HS, lens_scale, lens_center, layers, cache_gl, out);
}

const set_parent_callback = (HS, key, path) => {
  const callbacks = HS.gl_state.get_image_callbacks(key);
  HS.gl_state.update_parent_callback(callbacks, key, path);
}

const set_target_callbacks = (HS, key) => {
  const callbacks = HS.gl_state.get_image_callbacks(key);
  return HS.gl_state.update_target_callbacks(callbacks, key, 'all');
}

const render_layers = (HS, tileSource, viewer, opts) => {
  const { tile, key } = opts;
  const hash = HS.gl_state.active_hash(key, 'base');
  const lens_scale = HS.gl_state.toLensScale(viewer);
  const lens_center = HS.gl_state.toLensCenter(viewer);
  const bottom_layer = document.createElement("canvas");
  const top_layer = document.createElement("canvas");
  const bottom_ctx = bottom_layer.getContext('2d');
  const top_ctx = top_layer.getContext('2d');

  const shape_opts = to_shape_opts(tileSource);
  const cache_gl_1 = set_cache_gl(HS.gl_state, tile, shape_opts, 1);

  // Copy bottom layer to 2d context
  const bottom_out = render_to_cache(HS, lens_scale, lens_center, key, tile, 'base', cache_gl_1);
  const h = bottom_out.height;
  const w = bottom_out.width;
  bottom_layer.height = h;
  bottom_layer.width = w;
  bottom_ctx.drawImage(bottom_out, 0, 0, w, h, 0, 0, w, h);

  // Copy top layer to 2d context
  const top_out = render_to_cache(HS, lens_scale, lens_center, key, tile, 'lens', cache_gl_1);
  top_layer.height = h;
  top_layer.width = w;
  top_ctx.drawImage(top_out, 0, 0, w, h, 0, 0, w, h);
  return { top_layer, bottom_layer, w, h, hash };
}

const finish_target = (HS, tileSource, viewer, imageJob, opts) => {
  // Update both layers in the cache
  const layers = render_layers(HS, tileSource, viewer, opts);
  const canvas = document.createElement("canvas");
  canvas.height = layers.top_layer.height;
  canvas.width = layers.bottom_layer.width;
  const context = canvas.getContext('2d');
  const _out = { 
    ...opts, ...layers, context, busy: false
  };
  imageJob.finish(_out);
}

const toTileTarget = (HS, viewer, target, tileSource) => {
  return {
    ...tileSource,
    ...customTileCache(HS, 'all'),
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      const defer = set_target_callbacks(HS, key);
      // Wait for all source images to resolve 
      const promise = defer.promise.then((results) => {
        const all_failed = results.every(x => !x);
        const msg = "All sources failed for tile.";
        if (all_failed) imageJob.finish(null, null, msg);
        else finish_target(HS, tileSource, viewer, imageJob, { tile, key });
      }).catch((e) => {
        console.error(e);
        imageJob.finish(null);
      });
      promise.controller = {
        abort: () => promise.reject()
      };
      imageJob.userData.promise = promise;
      return;
    },
    downloadTileAbort: function(imageJob) {
      imageJob.userData.promise.controller.abort();
    },
    getTileCacheDataAsContext2D: function(cache) {
      const out = cache._out;
      const hash = HS.gl_state.active_hash(out.key, 'base');
      // Measure viewport scale
      const shape_opts = to_shape_opts(tileSource);
      const lens_scale = HS.gl_state.toLensScale(viewer);
      const lens_center = HS.gl_state.toLensCenter(viewer);
      const cache_gl_0 = set_cache_gl(HS.gl_state, out.tile, shape_opts, 0);
      const need_top = need_top_layer(HS, lens_scale, lens_center, cache_gl_0, out.tile);
      // Return the cached 2D canvas output
      if (hash !== out.hash && out.busy === false) {
        out.busy = true;
        (async () => {
          const { tile, key } = out;
          const opts = { tile, key };
          const { bottom_layer, top_layer, hash } = render_layers(HS, tileSource, viewer, opts);
          HS.gl_state.dropAlpha(key);
          out.bottom_layer = bottom_layer;
          out.top_layer = top_layer;
          out.hash = hash;
          out.busy = false;
        })();
      }
      if (need_top === false) {
        return out.bottom_layer.getContext('2d');
      }
      render_output(HS, lens_scale, lens_center, cache_gl_0, out);
      return cache_gl_0.via.gl; 
    }
  }
}

const getParentTile = (imageJob, tile) => {
  const { source } = imageJob;
  const mid = tile.bounds.getCenter();
  if (tile.level === 0) return null;
  const level = Math.max(0, tile.level - 1);
  const { x, y } = source.getTileAtPoint(level, mid);
  const bounds = source.getTileBounds(level, x, y, true);
  const key = to_tile_key({ x, y, level });
  const offset = [
    +(2 * x !== tile.x), +(2 * y !== tile.y)
  ];
  const url = source.getTileUrl(level, x, y);
  return { url, key, offset, bounds };
}

const cropParentTile = (shape_opts, p_data, p_tile, tile) => {
  const { width: w, height: h } = tile.sourceBounds;
  const { width: wp, height: hp } = p_tile.bounds;
  const [ ix, iy ] = [0, 1].map(i => {
    const block = shape_opts.tile_square[i];
    const off = p_tile.offset[i] * block / 2;
    if (i === 0) return off;
    return hp - h/2 - off;
  });
  const sx = 1 + Math.log2(wp/w);
  const sy = 1 + Math.log2(hp/h);
  return [sx, sy, ix, iy];
}

const fetch_tile = (key, full_url, resolver, aborter) => {
  const controller = new AbortController();
  const promise = fetch(full_url, {
    method: "GET", signal: controller.signal
  }).then(result => {
    if (!result.ok) {
      throw new Error(`Status ${result.status}`);
    }
    return result.blob();
  }).then(blob => {
    return createImageBitmap(blob);
  }).then(data => {
    const full = [0, 0, 0, 0];
    resolver(data, full);
  }).catch(() => {
    resolver(null, null);
  });
  promise.controller = {
    abort: () => {
      aborter(key);
      controller.abort();
    }
  }
  return promise;
}

const toTileSource = (HS, tileSource) => {
  const shape_opts = to_shape_opts(tileSource);
  const to_image_callbacks = (key, path) => {
    const callbacks = HS.gl_state.get_image_callbacks(key);
    if (!callbacks.has(path)) {
      return null; 
    };
    return callbacks.get(path);
  }
  return {
    ...tileSource,
    ...customTileCache(HS, null),
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      const subpath = split_url(full_url);
      set_cache_gl(HS.gl_state, tile, shape_opts, 1);
      const aborter = (key) => {
        const waiter = to_image_callbacks(key, subpath);
        if (waiter !== null) waiter.reject();
      }
      const resolver = (i_data, i_crop) => {
        const finish = (key, data, crop) => {
          if (data !== null && crop !== null) {
            HS.gl_state.trackImageData(key, subpath, data, crop);
          }
          const waiter = to_image_callbacks(key, subpath);
          if (waiter !== null) waiter.resolve(data, crop);
          imageJob.finish({ tile, key, subpath });
        }
        const used_parent = (p_tile) => {
          // Check if able to use parent
          const p_key = p_tile.key;
          const image_source = HS.gl_state.getImageData(p_key);
          const p_source = image_source.get(subpath) || null;
          if (p_source === null) return false;
          // No recursive downsampling
          if (p_source.ScaledCrop.some(s => s !== 0)) {
            return finish(key, null, null);
          }
          // Crop the parent tile
          createImageBitmap(p_source.ImageData).then(data => {
            const p_crop = cropParentTile(shape_opts, data, p_tile, tile);
            finish(key, data, p_crop);
          }); 
          return true;
        }
        const deferred_parent = (p_tile) => {
          const p_key = p_tile.key;
          const p_waiter = to_image_callbacks(p_key, subpath) || null;
          if (p_waiter === null) return false;
          p_waiter.promise.then((p_data, p_crop) => {
            used_parent(p_tile);
          }).catch( () => {
            finish(key, null, null);
          });
          return true;
        }
        // Loaded current tile
        if (i_data !== null) {
          return finish(key, i_data, i_crop);
        }
        const p_tile = getParentTile(imageJob, tile);
        if (p_tile === null) return finish(key, null, null);
        // Try to access parent tile
        const p_key = p_tile.key;
        const p_url = p_tile.url;
        // Depend on the loaded parent tile
        if (used_parent(p_tile)) return;
        if (deferred_parent(p_tile)) return;
        // Depend on the fetched parent tile
        set_parent_callback(HS, key, subpath);
        const p_resolver = (p_data, crop) => {
          finish(p_key, p_data, crop);
          if (p_data !== null && crop !== null) {
            return used_parent(p_tile);
          }
        }
        fetch_tile(p_key, p_url, p_resolver, aborter);
      }
      imageJob.userData.promise = fetch_tile(key, full_url, resolver, aborter);
    },
    downloadTileAbort: function(imageJob) {
      imageJob.userData.promise.controller.abort();
    },
    getTileCacheDataAsContext2D: function(cache) {
      // This should never occur, never actually drawn
      const canvas = document.createElement("canvas");
      return canvas.getContext('2d');
    }
  }
}

const to_linear_uniforms = (program, gl, active_tex) => {
  const u_shape = gl.getUniformLocation(program, "u_shape");

  const u_crops = active_tex.map((i) => {
    return gl.getUniformLocation(program, `u_t${i}_crop`);
  });
  const u_colors = active_tex.map((i) => {
    return gl.getUniformLocation(program, `u_t${i}_color`);
  });
  const u_modes = active_tex.map((i) => {
    return gl.getUniformLocation(program, `u_t${i}_mode`);
  });

  return {
    u_shape, u_crops, u_colors, u_modes
  };
}

const to_alpha_uniforms = (program, gl) => {
  const u_lens = gl.getUniformLocation(program, "u_lens");
  const u_shape = gl.getUniformLocation(program, "u_shape");
  const u_level = gl.getUniformLocation(program, "u_level");
  const u_origin = gl.getUniformLocation(program, "u_origin");
  const u_lens_rad = gl.getUniformLocation(program, "u_lens_rad");
  const u_lens_scale = gl.getUniformLocation(program, "u_lens_scale");
  const u_blend_alpha = gl.getUniformLocation(program, "u_blend_alpha");
  const u_alpha_index = gl.getUniformLocation(program, "u_alpha_index");

  return {
    u_lens, u_shape, u_alpha_index, u_blend_alpha,
    u_lens_rad, u_lens_scale, u_level, u_origin
  };
}

const to_cache_gl = (gl_state, shape_opts, flip_y, tile, cleanup) => {
  const { via, uniforms } = initialize_gl(flip_y, tile, cleanup);
  return { via, shape_opts, uniforms };
}

class GLState {

  constructor(HS) {
    this.alphas = [];
    this.caches_gl = new Map();
    this.image_data = new Map();
    this.file_callbacks = new Map();
    this.target_image = null;
    this.settings = {};
    this.HS = HS;
  }

  nextAlpha(key, n_tex) {
    const step = 2;
    const reserved = 1;
    const found = this.alphas.find(item => {
      return item[1] === key;
    });
    const to_output = (item, cached) => {
      const index = step * (item[0] + reserved);
      return { index, cached };
    }
    if (found) {
      return to_output(found, true);
    }
    const len = Math.floor(n_tex / step) - reserved;
    if (this.alphas.length < len) {
      const alpha_map = new Map(this.alphas);
      const index = [...Array(len).keys()].find(index => {
        return !alpha_map.has(index);
      });
      this.alphas = [[ index, key ], ...this.alphas];
    }
    else {
      const index = this.alphas.pop()[0];
      this.alphas = [[ index, key ], ...this.alphas];
    }
    return to_output(this.alphas[0], false);
  }

  dropAlpha(key) {
    this.alphas = this.alphas.filter((item) => {
      return key !== item[1];
    });
  }

  setTargetImage(item) {
    this.target_image = item;
  }

  get showVisibleLens() {
    return this.active_sources('lens').length;
  } 

  toLensCenter(viewer) {
    const [x, y] = this.HS.lensCenter;
    const center = ((vp) => {
      const p = new OpenSeadragon.Point(x, y);
      const point = vp.viewerElementToViewportCoordinates(p);
      if (this.target_image === null) {
        return vp.viewportToImageCoordinates(point);
      }
      return this.target_image.viewportToImageCoordinates(point);
    })(viewer.viewport);
    return new Float32Array([center.x, center.y]);
  }

  toLensScale(viewer) {
    return ((vp) => {
      const vp_zoom = vp.getZoom(true);
      if (this.target_image === null) {
        return vp.viewportToImageZoom(vp_zoom);
      }
      return this.target_image.viewportToImageZoom(vp_zoom);
    })(viewer.viewport);
  }

  to_shown(key, target) {
    const sources = this.loaded_sources(key, target);
    const channel_map = this.channel_map(target);
    const colors = sources.map(sub => {
      return channel_map.get(sub.Path).color;
    });
    const modes = sources.map(sub => {
      const is_lens = 0; // lens applied later
      const has_color = [1, 2][+sub.Colorize];
      return [is_lens, has_color];
    });
    const channels = sources.map(sub => {
      return sub.ImageData;
    });
    const crops = sources.map(sub => {
      return sub.ScaledCrop;
    });
    return { crops, channels, colors, modes };
  }

  get_image_callbacks(key) {
    return this.file_callbacks.get(key) || new Map;
  }

  update_callbacks(paths, callbacks, key) {
    const unset = (path) => {
      callbacks.delete(path);
    }
    const image_data = this.getImageData(key || '');
    const defer = paths.reduce((defer, path) => {
      // Check if image data exists
      if (image_data.has(path)) return defer;
      if (defer.callbacks.has(path)) return defer;
      const promise = new Promise((resolve, reject) => {
        const timeout_sec = 15; // Timeout per Image File
        setTimeout(() => resolve(null, null), timeout_sec*1000);
        // Load image data
        defer.callbacks.set(path, {
          resolve: (data, crop) => {
            unset(path);
            resolve(data, crop);
          },
          reject: () => {
            unset(path);
            reject();
          }
        });
      })
      // Allow "event handler" by reference to promise
      const callbacks = defer.callbacks.get(path);
      callbacks.promise = promise;
      defer.promises.push(promise);
      return defer;
    }, { callbacks, promises: [] });
    const file_callbacks = this.file_callbacks;
    file_callbacks.set(key, defer.callbacks);
    return {
      callbacks: defer.callbacks,
      promise: Promise.all(defer.promises)
    };
  }

  update_target_callbacks(callbacks, key, target) {
    const sources = this.active_sources(target);
    const paths = sources.map(s => s.Path);
    return this.update_callbacks(paths, callbacks, key);
  }

  update_parent_callback(callbacks, key, path) {
    return this.update_callbacks([path], callbacks, key);
  }

  loaded_sources(key, target) {
    const image_data = this.getImageData(key);
    const sources = this.active_sources(target);
    const channel_map = this.channel_map(target);
    return sources.filter((sub) => {
      if (!channel_map.has(sub.Path)) return false;
      if (!image_data.has(sub.Path)) return false;
      return true;
    }).map((sub) => {
      const {
        ImageData, ScaledCrop
      } = image_data.get(sub.Path);
      return { ...sub, ImageData, ScaledCrop }; 
    });
  }

  active_hash(key, target) {
    const sources = this.active_sources(target);
    const loaded = this.loaded_sources(key, target);
    const hash_main = sources.map((source) => {
      const { Name, Colors } = source;
      return Name + '_' + Colors.join('_');
    }).join('-');
    const all_loaded = sources.length === loaded.length;
    return `${hash_main}-${all_loaded}`;
  }

  active_sources(target) {
    if (target === 'lens') {
      return this.HS.lens_subgroups;
    }
    if (target === 'base') {
      return this.HS.active_subgroups;
    }
    return [
      ...this.HS.lens_subgroups,
      ...this.HS.active_subgroups
    ]
  }

  channel_map(target) {
    const sources = this.active_sources(target);
    return sources.filter((group) => {
      return group.Colors.length === 1;
    }).reduce((o, {Colors, Path}) => {
      const color = hex2gl(Colors[0]);
      o.set(Path, { color });
      return o;
    }, new Map());
  }

  untrackImageData(key, subpath) {
    const _sources = this.image_data.get(key);
    if (_sources) _sources.delete(subpath);
  }

  trackImageData(key, subpath, ImageData, ScaledCrop) {
    const _sources = this.getImageData(key);
    _sources.set(subpath, {
      ImageData, ScaledCrop
    });
    this.image_data.set(key, _sources);
  }

  getImageData(key) {
    return this.image_data.get(key) || new Map;
  }
}

export { toTileTarget, toTileSource, GLState, toDistance }
