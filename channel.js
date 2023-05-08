const TEXTURE_RANGE = [...new Array(1024).keys()];
const ACTIVE_TEXTURE_RANGE = [...new Array(16).keys()];

const to_uniforms = (program, gl, is_alpha_shader) => {
  if (is_alpha_shader) {
    return [ TEXTURE_RANGE, [0, 1], to_alpha_uniforms(program, gl) ];
  }
  return [
    TEXTURE_RANGE, ACTIVE_TEXTURE_RANGE,
    to_linear_uniforms(program, gl, ACTIVE_TEXTURE_RANGE)
  ];
}

const render_alpha_tile = (props, uniforms, tile, via, skip) => {
  const { gl } = via;
  if (props === null) {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return via.gl.canvas;
  }
  const { data } = props;
  const { alpha_index, alpha_cached } = data;
  const {
    u_lens, u_shape, u_blend_alpha,
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
  const full = [0, 0, w, h];
  gl.uniform1f(u_level, tile_level);
  gl.uniform2fv(u_lens, tile_lens_2fv);
  gl.uniform1f(u_lens_rad, lens_rad);
  gl.uniform1f(u_lens_scale, lens_scale);
  gl.uniform2fv(u_shape, tile_shape_2fv);
  gl.uniform2fv(u_origin, tile_origin_2fv);
  gl.uniform1f(u_blend_alpha, data.blend_alpha);

  // Point to the alpha channel
  gl.uniform1i(via.texture_uniforms[0], 0);
  gl.uniform1i(via.texture_uniforms[1], 1);

  // Bind all needed textures
  [0, 1].forEach((_, i) => {
    const texi = alpha_index[i];
    const from = data.channels[i];
    // Allow caching of one alpha channel
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[texi]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, via.stage);
    // Don't re-upload if is cached alpha
    if (alpha_cached[i]) return;
    // Actually re-upload the alpha tile texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
  });

  // Actually draw the arrays
  if (skip !== true) {
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  return gl.canvas;
}

const render_linear_tile = (props, uniforms, tile, via) => {
  const { gl } = via;
  if (props === null) {
    return null;
  }
  const { data } = props;
  const { channel_index, channel_cached } = data;
  const {
    u_shape, u_crops, u_colors, u_modes,
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const x = tile.x * data.tile_square[0];
  const y = tile.y * data.tile_square[1];
  const tile_origin_2fv = new Float32Array([x, y]);
  const tile_shape_2fv = new Float32Array([w, h]);
  const full = [0, 0, w, h];
  const black = hex2gl("000000");
  gl.uniform2fv(u_shape, tile_shape_2fv);

  // Bind all needed textures
  via.texture_uniforms.forEach((_, i) => {
    gl.uniform4fv(u_crops[i], data.crops[i] || full);
    gl.uniform3fv(u_colors[i], data.colors[i] || black);
    gl.uniform2ui(u_modes[i], ...(data.modes[i] || [0, 0]));
    // Load the data
    const texi = channel_index[i];
    const from = data.channels[i];
    if (from === undefined) return;
    // Allow caching of one alpha channel
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[texi]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, via.stage);
    // Don't re-upload if is cached alpha
    if (channel_cached[i]) return;
    // Actually re-upload the tile texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
  });
  // Actually draw the arrays
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return gl.canvas;
}

const to_tile_props = (shown, HS, key, cache_gl) => {
  const { 
    tile_square, max_level 
  } = cache_gl.shape_opts;
  if (shown.channels.length < 1) return null;
  if (shown.colors.length < 1) return null;
  if (shown.modes.length < 1) return null;
  if (shown.crops.length < 1) return null;
  if (shown.paths.length < 1) return null;

  const n_tex = cache_gl.via.textures.length;
  const channel_info = shown.paths.reduce((o, sub) => {
    const next = HS.gl_state.nextChannel(key, sub, n_tex);
    o.channel_cached.push(next.cached);
    o.channel_index.push(next.index);
    return o;
  },{
    channel_cached: [], channel_index: []
  });

  const data = {
    ...channel_info,
    tile_square,
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
vec2 full_pos = vec2(1., -1.) * (2. * a_uv - 1.);
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
    vec2 c_shape = vec2(crop[2], crop[3]);
    float x = (c_shape.x * pos.x + crop[0])/size.x;
    float y = (c_shape.y * pos.y + crop[1])/size.y;
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
  uniform usampler2D u_t0;
  uniform usampler2D u_t1;

  in vec2 uv;
  out vec4 color;

  // From uv coordinates to global
  vec2 tile_to_global(vec2 v) {
    float scale = pow(2., u_level);
    vec2 tile_flip = vec2(v.x, v.y) * u_shape;
    return (u_origin + tile_flip) * scale;
  }

  // Compare to lens radius
  int lens_status(vec2 lens, vec2 v) {
    vec2 global_v = tile_to_global(v);
    float d = distance(lens, global_v);
    float rad = u_lens_rad / u_lens_scale;
    float border = 3. / u_lens_scale;
    // Exceeds lens border
    if (abs(d) > rad) {
      return 0;
    };
    return 1;
  }

  // Sample texture at given texel offset
  uvec4 texel(usampler2D sam, vec2 size, vec2 pos) {
    return texture(sam, vec2(pos.x, pos.y));
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
    return vec4(tex) / 255.;
  }

  vec4 alpha_blend(vec4 v0, usampler2D t) {
    vec4 v1 = color_channel(t);
    float a = u_blend_alpha * v1.a;
    return (1. - a) * v0 + a * v1;
  }

  void main() {
    color = vec4(texel(u_t0, u_shape, uv)) / 255.;
    if (u_blend_alpha > 0.) {
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

const toBuffers = (stage, tex, active_tex, program, via) => {
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
    gl.bindTexture(gl.TEXTURE_2D, via.textures[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, via.stage);
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
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.uniform1i(u_t, i);
    return u_t;
  })
}

const to_gl_tile_key = (stage, tile) => {
  const [w, h] = to_tile_shape(tile);
  const { level } = tile;
  return `${stage}-${w}-${h}`;
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

const initialize_gl = (stage, tile, cleanup) => {
  const key = to_gl_tile_key(stage, tile);
  const r1 = (Math.random() + 1).toString(36).substring(2);
  const r2 = (Math.random() + 1).toString(36).substring(2);
  const tile_canvas = document.createElement('canvas');
  tile_canvas.addEventListener("webglcontextlost", cleanup, false);
  tile_canvas.id = "tile-"+key+"-"+r1+'-'+r2;
  const gl = tile_canvas.getContext('webgl2');
  const is_alpha_shader = stage ? 0 : 1;
  const shaders = SHADERS[+is_alpha_shader];
  const program = toProgram(gl, shaders);
  update_shape(gl, tile);
  gl.useProgram(program);
  const [tex, active_tex, uniforms] = to_uniforms(
    program, gl, is_alpha_shader
  );
  const textures = tex.map(() => gl.createTexture());
  const texture_uniforms = toBuffers(stage, tex, active_tex, program, {
    gl, ...to_vertices(), buffer: gl.createBuffer(), textures
  });
  const via = { gl, stage, texture_uniforms, textures, program };
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
  const reverse = s => [...s].reverse().join('');
  return reverse(reverse(full_url).split('/')[1] || '');
} 

const set_cache_gl = (gl_state, tile, shape_opts, stage) => {
  const key = to_gl_tile_key(stage, tile);
  const caches_gl = gl_state.caches_gl;
  if (caches_gl.has(key)) {
    return caches_gl.get(key);
  }
  const cache_gl = to_cache_gl(
    gl_state, shape_opts, stage, tile,
    () => caches_gl.delete(key)
  );
  caches_gl.set(key, cache_gl);
  return cache_gl;
}

const toTileKey = ({level, x, y}) => {
  return `${level}-${x}-${y}`;
}

const toChannelTileKey = (subpath, key) => {
  return `${subpath || ''}--${key}`;
}

const parseImageJob = (imageJob) => {
  const full_url = imageJob.src;
  const { tile } = imageJob;
  const key = toTileKey(tile);
  return { full_url, key, tile };
}

const customTileCache = (HS, target) => {
  const is_target = target !== null;
  return {
    createTileCache: function(cache_gl, out) {
      cache_gl._out = out;
    },
    destroyTileCache: function(cache_gl) {
      if (is_target) {
        const { key } = cache_gl._out;
        HS.gl_state.untrackTiles(key);
      }
      delete cache_gl._out;
    },
    getTileHashKey(level, x, y, url) {
      const key = toTileKey({ level, x, y });
      return toChannelTileKey(split_url(url), key);
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

const render_from_cache = (HS, lens_scale, lens_center, layers, cache_gl, out, skip) => {
  const { tile, key } = out;
  const lens_rad = HS.lensRad;
  const { 
    tile_square, max_level 
  } = cache_gl.shape_opts;
  const n_tex = cache_gl.via.textures.length;
  const alpha_info = ['base','lens'].reduce((o, sub) => {
    const next = HS.gl_state.nextAlpha(key, sub, n_tex);
    o.alpha_cached.push(next.cached);
    o.alpha_index.push(next.index);
    return o;
  },{
    alpha_cached: [], alpha_index: []
  })
  // Allow blending of two alpha layers
  const { width, height } = layers.find(l => !!l);
  const data = {
    ...alpha_info,
    blend_alpha: HS.lensAlpha,
    max_level,
    lens_scale,
    lens_center,
    tile_square,
    lens_rad,
    channels: layers,
    width, height
  };
  return render_alpha_tile({ data }, cache_gl.uniforms, tile, cache_gl.via, skip);
}

const render_to_cache = (HS, lens_scale, lens_center, key, tile, target, cache_gl) => {
  const shown = HS.gl_state.to_shown(key || '', target);
  const props = to_tile_props(shown, HS, key, cache_gl);
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

const render_output = (HS, lens_scale, lens_center, cache_gl, out, skip) => {
  const { key, tile } = out;
  const { top_layer, bottom_layer } = out;
  const layers = [bottom_layer, top_layer];
  const found = ['base', 'lens'].map((sub) => {
    return HS.gl_state.toCached('alphas', out.key, sub);
  }).some(x => x) || null;
  const has_layers = layers.some(l => !!l);
  if (has_layers === false) return null;
  if (found === null && out.busy === false) {
    out.busy = true;
    (async () => {
      render_from_cache(HS, lens_scale, lens_center, layers, cache_gl, out, true);
      out.busy = false;
    })();
    if (skip || !out.bottom_layer) return null;
    return out.bottom_layer.getContext('2d');
  }
  if (skip) return null;
  render_from_cache(HS, lens_scale, lens_center, layers, cache_gl, out, false);
  return cache_gl.via.gl; 
}

const render_layers = (HS, tileSource, viewer, opts) => {
  const { tile, key } = opts;
  const hash = HS.gl_state.active_hash(HS, key, 'all');
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
  if (bottom_out) {
    const h = bottom_out.height;
    const w = bottom_out.width;
    bottom_layer.height = h;
    bottom_layer.width = w;
    bottom_ctx.drawImage(bottom_out, 0, 0, w, h, 0, 0, w, h);
  }

  // Copy top layer to 2d context
  const top_out = render_to_cache(HS, lens_scale, lens_center, key, tile, 'lens', cache_gl_1);
  if (top_out) {
    const h = top_out.height;
    const w = top_out.width;
    top_layer.height = h;
    top_layer.width = w;
    top_ctx.drawImage(top_out, 0, 0, w, h, 0, 0, w, h);
  }
  return {
    bottom_layer: bottom_out ? bottom_layer : null,
    top_layer: top_out ? top_layer : null,
    hash
  };
}

const finish_target = (HS, tileSource, viewer, imageJob, opts) => {
  // Update both layers in the cache
  const layers = {
    top_layer: null,
    bottom_layer: null,
    hash: HS.gl_state.active_hash(HS, opts.key, 'all')
  }
  const _out = { 
    ...opts, ...layers, all_loaded: false, busy: false
  };
  imageJob.finish(_out);
}

const toTileTarget = (HS, viewer, target, tileSource) => {
  return {
    ...tileSource,
    ...customTileCache(HS, 'all'),
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      HS.gl_state.untrackTiles(key);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const [w, h] = to_tile_shape(tile);
      canvas.height = h;
      canvas.width = w;
      // Wait for all source images to resolve 
      finish_target(HS, tileSource, viewer, imageJob, { tile, key, ctx });
      imageJob.userData.promise = Promise.resolve();
      return;
    },
    downloadTileAbort: function(imageJob) {
      imageJob.userData.promise.controller.abort();
    },
    getTileCacheDataAsContext2D: function(cache) {
      const out = cache._out;
      const hash = HS.gl_state.active_hash(HS, out.key, 'all');
      // Measure viewport scale
      const shape_opts = to_shape_opts(tileSource);
      const lens_scale = HS.gl_state.toLensScale(viewer);
      const lens_center = HS.gl_state.toLensCenter(viewer);
      const cache_gl_0 = set_cache_gl(HS.gl_state, out.tile, shape_opts, 0);
      const need_top = need_top_layer(HS, lens_scale, lens_center, cache_gl_0, out.tile);
      out.all_loaded = HS.gl_state.all_loaded(out.key);

      // Return the cached 2D canvas output
      if (hash !== out.hash && out.busy === false && out.all_loaded) {
        out.busy = true;
        (async () => {
          const { tile, key } = out;
          const opts = { tile, key };
          out.all_loaded = HS.gl_state.all_loaded(out.key);
          const { 
            bottom_layer, top_layer, hash
          } = render_layers(HS, tileSource, viewer, opts);
          HS.gl_state.dropAlphas(out.key);
          out.bottom_layer = bottom_layer;
          out.top_layer = top_layer;
          out.hash = hash;
          out.busy = false;
          if (need_top) {
            render_output(HS, lens_scale, lens_center, cache_gl_0, out, true);
          }
        })();
      }
      // Render lens layer if needed
      if (need_top && out.all_loaded) {
        const out_full = render_output(HS, lens_scale, lens_center, cache_gl_0, out, false);
        if (out_full !== null) return out_full;
      }
      if (out.all_loaded) {
        const out_bottom = out.bottom_layer?.getContext('2d') || null;
        if (out_bottom !== null) return out_bottom;
      }
      const ctx = out.ctx;
      const allow_downsample = true;
      if (allow_downsample && out.tile.level > 0) {
        const source = HS.gl_state.target_image.source;
        const { tileCache, world } = viewer;
        const p_crop = positionTiles(viewer, HS, out.tile).crop;
        const p_tile = getParentTile(source, out.tile);
        const ckey = toChannelTileKey(undefined, p_tile.key);
        const p_rec = tileCache.getImageRecord(ckey);
        const [x0, y0, x1, y1] = p_crop;
        const p_out = p_rec?._out || null;
        if (p_out === null) return ctx;
        const [w, h] = to_tile_shape(out.tile);
        if (need_top) {
          const out_full = render_output(
            HS, lens_scale, lens_center, cache_gl_0, p_out, false
          );
          if (out_full !== null) {
            ctx.drawImage(out_full.canvas, x0, y0, x1, y1, 0, 0, w, h);
            return ctx;
          };
        }
        if (p_out.all_loaded) {
          const out_bottom = p_out.bottom_layer?.getContext('2d') || null;
          if (out_bottom !== null) {
            ctx.drawImage(out_bottom.canvas, x0, y0, x1, y1, 0, 0, w, h);
            return ctx;
          }
        }
        return ctx;
      }
      return ctx;
    }
  }
}

const getParentTile = (source, tile) => {
  if (tile.level === 0) return null;
  const mid = tile.bounds.getCenter();
  const level = Math.max(0, tile.level - 1);
  const { x, y } = source.getTileAtPoint(level, mid);
  const key = toTileKey({ x, y, level });
  const url = source.getTileUrl(level, x, y);
  return { url, key, x, y, level };
}

const positionTiles = (viewer, HS, tile) => {
  const { width: w, height: h } = tile.sourceBounds;
  const source = HS.gl_state.target_image.source;
  const to_image_coords = (x, y) => {
    const p = new OpenSeadragon.Point(x, y);
    return HS.gl_state.target_image.viewportToImageCoordinates(p);
  }
  const t = tile.bounds;
  const p_level = Math.max(0, tile.level - 1);
  const p_idx = source.getTileAtPoint(p_level, t.getCenter());
  const p = source.getTileBounds(p_level, p_idx.x, p_idx.y, false);
  const b = source.getTileBounds(p_level, p_idx.x, p_idx.y, true);
  const sx = 1 + Math.log2(b.width / w);
  const sy = 1 + Math.log2(b.height/ h);
  const txty = to_image_coords(t.x, t.y);
  const pxpy = to_image_coords(p.x, p.y);
  const twth = to_image_coords(t.width, t.height);
  const pwph = to_image_coords(p.width, p.height);
  const x0 = b.width * (txty.x - pxpy.x)/pwph.x;
  const y0 = b.height * (txty.y - pxpy.y)/pwph.y;
  const x1 = b.width * (twth.x)/pwph.x;
  const y1 = b.height * (twth.y)/pwph.y;
  const crop = [x0, y0, x1, y1].map(v => {
    return Math.round(v);
  });
  const { x: width, y: height } = pwph;
  return { crop, width, height };
}

const fetch_tile = (full_url, w, h, resolver) => {
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
  }).then(bitmap => {
    const full = [0, 0, w, h];
    resolver(bitmap, full);
  }).catch(() => {
    resolver(null, null);
  });
  promise.controller = {
    abort: () => {
      controller.abort();
    }
  }
  return promise;
}

const toTileSource = (HS, viewer, tileSource) => {
  const shape_opts = to_shape_opts(tileSource);
  return {
    ...tileSource,
    ...customTileCache(HS, null),
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      const subpath = split_url(full_url);
      set_cache_gl(HS.gl_state, tile, shape_opts, 1);
      const resolver = (i_data, i_crop) => {
        const finish = (key, data, crop, scaled) => {
          imageJob.finish({ tile, key, subpath, crop, data, scaled });
        }
        const p_crop = positionTiles(viewer, HS, tile).crop;
        const used_parent = (p_data) => {
          finish(key, p_data, p_crop, true);
          return true;
        }
        // Loaded current tile
        if (i_data !== null) {
          return finish(key, i_data, i_crop, false);
        }
        const p_tile = getParentTile(imageJob.source, tile);
        if (p_tile === null) return finish(key, null, null, false);
        const tracked = HS.gl_state.getTrackedTile(p_tile.key);
        const p_tracked = tracked.get(subpath);
        // Access existing parent tile
        if (p_tracked) {
          const { ImageData, ScaledCrop, IsScaled } = p_tracked;
          // Only allow cropping from one level above
          if (!IsScaled) used_parent(ImageData);
          else imageJob.finish(null, null, '');
          return;
        }
        // Try to access parent tile
        const p_resolver = (p_data) => {
          if (p_data !== null) {
            return used_parent(p_data);
          }
        }
        const {width: w, height: h} = positionTiles(viewer, HS, tile);
        fetch_tile(p_tile.url, w, h, p_resolver);
      }
      const [ w, h ] = to_tile_shape(tile);
      imageJob.userData.promise = fetch_tile(full_url, w, h, resolver);
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

  return {
    u_lens, u_shape, u_blend_alpha,
    u_lens_rad, u_lens_scale, u_level, u_origin
  };
}

const to_cache_gl = (gl_state, shape_opts, stage, tile, cleanup) => {
  const { via, uniforms } = initialize_gl(stage, tile, cleanup);
  return { via, shape_opts, uniforms };
}

class GLState {

  constructor(HS) {
    this.alphas = [];
    this.channels = [];
    this.caches_gl = new Map();
    this.image_data = new Map();
    this.target_image = null;
    this.settings = {};
    this.HS = HS;
  }

  toCached(cache, key, sub) {
    const ckey = toChannelTileKey(sub, key);
    const found = this[cache].find(item => {
      return item[1] === ckey;
    });
    return found || null;
  }

  nextCache(cache, key, sub, n_tex) {
    const ckey = toChannelTileKey(sub, key);
    const to_output = (item, cached) => {
      const index = item[0];
      return { index, cached };
    }
    const found = this.toCached(cache, key, sub);
    if (found !== null) {
      return to_output(found, true);
    }
    const len = Math.floor(n_tex);
    if (this[cache].length < len) {
      const alpha_map = new Map(this[cache]);
      const index = [...Array(len).keys()].find(index => {
        return !alpha_map.has(index);
      });
      this[cache] = [[ index, ckey ], ...this[cache]];
    }
    else {
      const index = this[cache].pop()[0];
      this[cache] = [[ index, ckey ], ...this[cache]];
    }
    return to_output(this[cache][0], false);
  }

  nextChannel(key, sub, n_tex) {
    return this.nextCache('channels', key, sub, n_tex);
  }

  nextAlpha(key, sub, n_tex) {
    return this.nextCache('alphas', key, sub, n_tex);
  }

  dropCache(cache, key, sub) {
    const ckey = toChannelTileKey(sub, key);
    this[cache] = this[cache].filter((item) => {
      return ckey !== item[1];
    });
  }

  dropAlphas(key) {
    ['base', 'lens'].forEach((sub) => {
      const i_sources = this.active_sources(sub);
      const rgb = i_sources.every(x => !x.Colorize);
      if (rgb === false) this.dropCache('alphas', key, sub);
    });
  }

  dropSources(key) {
    this['channels'] = this['channels'].filter((item) => {
      return !!item[1].match('--'+key);
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
    const paths = sources.map(sub => {
      return sub.Path;
    });
    return { crops, channels, colors, modes, paths };
  }

  loaded_sources(key, target) {
    const image_data = this.getTrackedTile(key);
    const sources = this.active_sources(target);
    const channel_map = this.channel_map(target);
    return sources.filter((sub) => {
      return (
        channel_map.has(sub.Path)
        && image_data.get(sub.Path)
      );
    }).map((sub) => {
      const {
        ImageData, ScaledCrop
      } = image_data.get(sub.Path);
      return { ...sub, ImageData, ScaledCrop }; 
    });
  }

  all_loaded(key) {
    const sources = this.active_sources('all');
    const tracked = this.getTrackedTile(key);
    const loading = [...sources].filter(source => {
      return !(tracked.get(source.Path) || null);
    });
    return loading.length === 0;
  }

  active_hash(HS, key, target) {
    const all_loaded = this.all_loaded(key);
    const lens = +HS.gl_state.showVisibleLens;
    const sources = this.active_sources(target);
    const hash_main = sources.map((source) => {
      const { Name, Colors } = source;
      return Name + '_' + Colors.join('_');
    }).join('-');
    return `${hash_main}-${all_loaded}-${lens}`;
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

  untrackTiles(key) {
    const sources = this.active_sources('all');
    sources.map(source => {
      this.untrackTile(key, source.Path);
    });
    this.dropSources(key);
    this.dropAlphas(key);
  }

  untrackTile(key, subpath) {
    this.trackTile(key, subpath, null);
  }

  trackTile(key, subpath, tracked) {
    const _sources = this.getTrackedTile(key);
    _sources.set(subpath, tracked);
    this.image_data.set(key, _sources);
  }

  getTrackedTile(key) {
    return this.image_data.get(key) || new Map;
  }
}

export { toTileKey, toTileTarget, toTileSource, GLState, toDistance }
