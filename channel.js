const render_tile = (props, uniforms, tile, via) => {
  const { gl } = via;
  if (props === null) {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return via.gl.canvas;
  }
  const { data } = props;
  const {
    u_lens, u_shape,
    u_lens_rad, u_lens_scale,
    u_level, u_origin, u_full_height,
    u_t0_color, u_t1_color,
    u_t2_color, u_t3_color, u_t4_color,
    u_t5_color, u_t6_color, u_t7_color,
    u_t0_mode, u_t1_mode,
    u_t2_mode, u_t3_mode, u_t4_mode,
    u_t5_mode, u_t6_mode, u_t7_mode
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const max = data.max_level;
  const lens_rad = data.lens_rad;
  const lens_scale = data.lens_scale;
  const full_height = data.full_height;
  const x = tile.x * data.tile_square[0];
  const y = tile.y * data.tile_square[1];
  const tile_lens_2fv = data.lens_center;
  const tile_level = Math.max(0, max - tile.level);
  const tile_origin_2fv = new Float32Array([x, y]);
  const tile_shape_2fv = new Float32Array([w, h]);
  const black = hex2gl("000000");
  gl.uniform1f(u_level, tile_level);
  gl.uniform2fv(u_lens, tile_lens_2fv);
  gl.uniform1f(u_lens_rad, lens_rad);
  gl.uniform1f(u_lens_scale, lens_scale);
  gl.uniform2fv(u_shape, tile_shape_2fv);
  gl.uniform2fv(u_origin, tile_origin_2fv);
  gl.uniform1f(u_full_height, full_height);
  gl.uniform3fv(u_t0_color, data.colors[0] || black);
  gl.uniform3fv(u_t1_color, data.colors[1] || black);
  gl.uniform3fv(u_t2_color, data.colors[2] || black);
  gl.uniform3fv(u_t3_color, data.colors[3] || black);
  gl.uniform3fv(u_t4_color, data.colors[4] || black);
  gl.uniform3fv(u_t5_color, data.colors[5] || black);
  gl.uniform3fv(u_t6_color, data.colors[6] || black);
  gl.uniform3fv(u_t7_color, data.colors[7] || black);
  gl.uniform2ui(u_t0_mode, ...(data.modes[0] || [0, 0]));
  gl.uniform2ui(u_t1_mode, ...(data.modes[1] || [0, 0]));
  gl.uniform2ui(u_t2_mode, ...(data.modes[2] || [0, 0]));
  gl.uniform2ui(u_t3_mode, ...(data.modes[3] || [0, 0]));
  gl.uniform2ui(u_t4_mode, ...(data.modes[4] || [0, 0]));
  gl.uniform2ui(u_t5_mode, ...(data.modes[5] || [0, 0]));
  gl.uniform2ui(u_t6_mode, ...(data.modes[6] || [0, 0]));
  gl.uniform2ui(u_t7_mode, ...(data.modes[7] || [0, 0]));

  // Send the tile channels to the texture
  [0,1,2,3,4,5,6,7].forEach((i) => {
    const from = data.channels[i];
    if (from === undefined) return;
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  return gl.canvas;
}

const to_tile_props = (shown, HS, lens_scale, cache_gl) => {
  const { 
    tile_square, max_level, full_height
  } = cache_gl.shape_opts;
  const lens_center = HS.gl_state.lens_center;
  if (shown.channels.length < 1) return null;
  if (shown.colors.length < 1) return null;
  if (shown.modes.length < 1) return null;
  const data = {
    max_level,
    lens_scale,
    full_height,
    lens_center,
    tile_square,
    lens_rad: 0,
    modes: shown.modes,
    colors: shown.colors,
    channels: shown.channels,
    width: shown.channels[0].width,
    height: shown.channels[0].height
  }
  return { data };
}

const shaders = {
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
  uniform float u_full_height;
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

  // From uv coordinates to global
  vec2 tile_to_global(vec2 v) {
    float scale = pow(2., u_level);
    vec2 tile_flip = vec2(v.x, 1. - v.y) * u_shape;
    return (u_origin + tile_flip) * scale;
  }

  // Within lens radius
  bool not_in_lens(vec2 lens, vec2 v) {
    vec2 global_v = tile_to_global(v);
    float d = distance(lens, global_v);
    float rad = u_lens_rad / u_lens_scale;
    return abs(d) > rad;
  }

  // Sample texture at given texel offset
  uvec4 texel(usampler2D sam, vec2 size, vec2 pos, vec2 off) {
    float y = 1. - (pos.y + off.y / size.y);
    float x = pos.x + off.x / size.x;
    return texture(sam, vec2(x, y));
  }

  // Colorize continuous u8 signal
  vec4 color_channel(usampler2D sam, vec3 rgb, uvec2 mode) {
    uvec4 tex = texel(sam, u_shape, uv, vec2(0, 0));

    // Render empty lens background
    if (mode[0] == uint(1)) {
      vec2 global_v = tile_to_global(uv);
      if (not_in_lens(u_lens, uv)) {
        return vec4(0.0);
      }
    }

    if (mode[1] == uint(0)) {
      return vec4(0.0);
    }
    if (mode[1] == uint(1)) {
      return vec4(tex) / 255.;
    }
    // Scale color by texel value 
    return vec4(rgb * float(tex.r) / 255., 1.0);
  }

  void main() {
    vec4 v0 = color_channel(u_t0, u_t0_color, u_t0_mode);
    vec4 v1 = color_channel(u_t1, u_t1_color, u_t1_mode);
    vec4 v2 = color_channel(u_t2, u_t2_color, u_t2_mode);
    vec4 v3 = color_channel(u_t3, u_t3_color, u_t3_mode);
    vec4 v4 = color_channel(u_t4, u_t4_color, u_t4_mode);
    vec4 v5 = color_channel(u_t5, u_t5_color, u_t5_mode);
    vec4 v6 = color_channel(u_t6, u_t6_color, u_t6_mode);
    vec4 v7 = color_channel(u_t7, u_t7_color, u_t7_mode);
    vec4 sum = v0+v1+v2+v3+v4+v5+v6+v7;
    color = vec4(sum);
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

const toBuffers = (flip_y, program, via) => {
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
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip_y);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    // Assign texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  })
}

const to_gl_tile_key = (flip_y, tile) => {
  const [w, h] = to_tile_shape(tile);
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
  const program = toProgram(gl, shaders);
  update_shape(gl, tile);
  gl.useProgram(program);
  toBuffers(flip_y, program, {
    gl, ...to_vertices(), buffer: gl.createBuffer(),
    textures: [0,1,2,3,4,5,6,7].map(() => gl.createTexture())
  });
  const via = { gl, program };
  return { via };
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
  if (caches_gl.has(key)) return caches_gl.get(key);
  const cache_gl = to_cache_gl(
    gl_state, shape_opts, flip_y, tile,
    () => caches_gl.delete(key)
  );
  caches_gl.set(key, cache_gl);
  return cache_gl;
}

const parseImageJob = (imageJob) => {
  const full_url = imageJob.src;
  const parts = full_url.split('/');
  const { tile } = imageJob;
  const key = parts.pop();
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
  const full_height = tileSource.height;
  const max_level = tileSource.maxLevel;
  const tile_square = [
    tileSource.tileWidth, tileSource.tileHeight
  ]
  return {
   full_height, max_level, tile_square
  };
}

const render_from_cache = (HS, lens_scale, channels, tile, cache_gl) => {
  const lens_center = HS.gl_state.lens_center;
  const lens_rad = HS.lensing?.Rad || 100;
  const { 
    tile_square, max_level, full_height
  } = cache_gl.shape_opts;
  const data = {
    channels,
    max_level,
    lens_scale,
    full_height,
    lens_center,
    tile_square,
    lens_rad,
    colors: [],
    modes: [[0, 1], [1, 1]],
    width: channels[0].width,
    height: channels[0].height
  };
  return render_tile({ data }, cache_gl.uniforms, tile, cache_gl.via);
}

const render_to_cache = (HS, lens_scale, key, tile, target, cache_gl) => {
  const shown = HS.gl_state.to_shown(key || '', target);
  const props = to_tile_props(shown, HS, lens_scale, cache_gl);
  return render_tile(props, cache_gl.uniforms, tile, cache_gl.via);
}

const render_output = (HS, lens_scale, cache_2d, cache_gl, out, shape_opts) => {

  // Render the top layer
  const { key, tile } = out;
  const { top_layer, bottom_layer, w, h } = cache_2d;
  const channels = [bottom_layer, top_layer];
  
  // Render both layers from cache
  const rendered_layer = document.createElement("canvas");
  const rendered_ctx = rendered_layer.getContext('2d');
  const done = render_from_cache(HS, lens_scale, channels, tile, cache_gl);

  // Copy both layers to resulting context
  rendered_layer.height = done.height;
  rendered_layer.width = done.width;
  rendered_ctx.drawImage(done, 0, 0, w, h, 0, 0, w, h);
  return rendered_ctx;
}

const toTileTarget = (HS, viewer, target, tileSource) => {
  const shape_opts = to_shape_opts(tileSource);
  const caches_2d = HS.gl_state.caches_2d;
  const set_image_callbacks = (key) => {
    const callbacks = HS.gl_state.get_image_callbacks(key);
    return HS.gl_state.update_target_callbacks(callbacks, key, 'all');
  }
  return {
    ...tileSource,
    ...customTileCache(HS, 'all'),
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      set_cache_gl(HS.gl_state, tile, shape_opts);
      const promises = set_image_callbacks(key);
      // Wait for all source images to resolve 
      const promise = Promise.all(promises).then((results) => {
        const all_failed = results.every(x => !x);
        const msg = "All sources failed for tile.";
        if (all_failed) imageJob.finish(null, null, msg);
        else imageJob.finish({ tile, key, subpath: "" });
      }).catch(() => {
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
      const { key, tile } = out;
      const cache_2d = HS.gl_state.get_cache_2D(key);
      const hash = HS.gl_state.active_hash(key, 'base');
      const cache_gl_0 = set_cache_gl(HS.gl_state, tile, shape_opts, 0);
      const cache_gl_1 = set_cache_gl(HS.gl_state, tile, shape_opts, 1);
      // Measure viewport scale
      const lens_scale = HS.gl_state.toLensScale(viewer);
      // Return the cached 2D canvas output
      if (hash === cache_2d?.hash) {
        // Render both layers from cache
        return render_output(HS, lens_scale, cache_2d, cache_gl_0, out, shape_opts);
      }
      else if (cache_2d) {
        cache_2d.hash = hash;
      }
      const bottom_layer = document.createElement("canvas");
      const top_layer = document.createElement("canvas");
      const bottom_ctx = bottom_layer.getContext('2d');
      const top_ctx = top_layer.getContext('2d');

      // Copy bottom layer to 2d context
      const bottom_out = render_to_cache(HS, lens_scale, key, tile, 'base', cache_gl_1);
      const h = bottom_out.height;
      const w = bottom_out.width;
      bottom_layer.height = h;
      bottom_layer.width = w;
      bottom_ctx.drawImage(bottom_out, 0, 0, w, h, 0, 0, w, h);

      // Copy top layer to 2d context
      const top_out = render_to_cache(HS, lens_scale, key, tile, 'lens', cache_gl_1);
      top_layer.height = h;
      top_layer.width = w;
      top_ctx.drawImage(top_out, 0, 0, w, h, 0, 0, w, h);

      // Update both layers in the cache
      const new_cache_2d = { top_layer, bottom_layer, w, h, hash };
      HS.gl_state.set_cache_2D(key, new_cache_2d);

      return render_output(HS, lens_scale, new_cache_2d, cache_gl_0, out, shape_opts);
    }
  }
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
      const resolver = (success) => {
        const waiter = to_image_callbacks(key, subpath);
        if (waiter !== null) waiter.resolve(success);
        imageJob.finish({ tile, key, subpath });
      }
      if (HS.gl_state.forsaken.has(full_url)) {
        return resolver(false);
      }
      const controller = new AbortController();
      const abort = () => controller.abort();
      const on_failure = (e) => {
        HS.gl_state.forsaken.add(full_url);
        resolver(false);
      }
      imageJob.userData.promise = fetch(full_url, {
        method: "GET", signal: controller.signal
      }).then(result => {
        if (!result.ok) {
          throw new Error(`Status ${result.status}`);
        }
        return result.blob();
      }).then(blob => {
        return createImageBitmap(blob);
      }).then(data => {
        HS.gl_state.trackImageData(key, subpath, data);
        resolver(true);
      }).catch(on_failure);
      imageJob.userData.promise.controller = {
        abort: () => {
          controller.abort();
          waiter.reject();
        }
      }
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

const to_uniforms = (via) => {
  const { program, gl } = via;
  const u_lens = gl.getUniformLocation(program, "u_lens");
  const u_shape = gl.getUniformLocation(program, "u_shape");
  const u_level = gl.getUniformLocation(program, "u_level");
  const u_origin = gl.getUniformLocation(program, "u_origin");
  const u_lens_rad = gl.getUniformLocation(program, "u_lens_rad");
  const u_lens_scale = gl.getUniformLocation(program, "u_lens_scale");
  const u_full_height = gl.getUniformLocation(program, "u_full_height");
  const u_t0_mode = gl.getUniformLocation(program, "u_t0_mode");
  const u_t1_mode = gl.getUniformLocation(program, "u_t1_mode");
  const u_t2_mode = gl.getUniformLocation(program, "u_t2_mode");
  const u_t3_mode = gl.getUniformLocation(program, "u_t3_mode");
  const u_t4_mode = gl.getUniformLocation(program, "u_t4_mode");
  const u_t5_mode = gl.getUniformLocation(program, "u_t5_mode");
  const u_t6_mode = gl.getUniformLocation(program, "u_t6_mode");
  const u_t7_mode = gl.getUniformLocation(program, "u_t7_mode");
  const u_t0_color = gl.getUniformLocation(program, "u_t0_color");
  const u_t1_color = gl.getUniformLocation(program, "u_t1_color");
  const u_t2_color = gl.getUniformLocation(program, "u_t2_color");
  const u_t3_color = gl.getUniformLocation(program, "u_t3_color");
  const u_t4_color = gl.getUniformLocation(program, "u_t4_color");
  const u_t5_color = gl.getUniformLocation(program, "u_t5_color");
  const u_t6_color = gl.getUniformLocation(program, "u_t6_color");
  const u_t7_color = gl.getUniformLocation(program, "u_t7_color");
  return {
    u_lens, u_shape,
    u_lens_rad, u_lens_scale,
    u_level, u_origin, u_full_height,
    u_t0_color, u_t1_color,
    u_t2_color, u_t3_color, u_t4_color,
    u_t5_color, u_t6_color, u_t7_color,
    u_t0_mode, u_t1_mode,
    u_t2_mode, u_t3_mode, u_t4_mode,
    u_t5_mode, u_t6_mode, u_t7_mode
  };
}

const to_cache_gl = (gl_state, shape_opts, flip_y, tile, cleanup) => {
  const { via } = initialize_gl(flip_y, tile, cleanup);
  const uniforms = to_uniforms(via);
  return { via, shape_opts, uniforms };
}

class GLState {

  constructor(HS) {
    this.forsaken = new Set();
    this.caches_2d = new Map();
    this.caches_gl = new Map();
    this.image_data = new Map();
    this.file_callbacks = new Map();
    this.target_image = null;
    this.settings = {};
    this.HS = HS;
  }

  setTargetImage(item) {
    this.target_image = item;
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
    return { channels, colors, modes };
  }

  set_cache_2D(key, v) {
    this.caches_2d.set(key, v);
  }

  get_cache_2D(key) {
    if (!this.caches_2d.has(key)) return null;
    return this.caches_2d.get(key);
  }

  get_image_callbacks(key) {
    return this.file_callbacks.get(key) || new Map;
  }

  update_callbacks(sources, callbacks, key) {
    const unset = (path) => {
      callbacks.delete(path);
    }
    const image_data = this.getImageData(key || '');
    const defer = sources.reduce((defer, source) => {
      // Check if image data exists
      if (image_data.has(source.Path)) return defer;
      if (defer.callbacks.has(source.Path)) return defer;
      defer.promises.push(new Promise((resolve, reject) => {
        const timeout_sec = 15; // Timeout per Image File
        setTimeout(() => resolve(false), timeout_sec*1000);
        // Load image data
        defer.callbacks.set(source.Path, {
          resolve: (success) => {
            unset(source.Path);
            resolve(success);
          },
          reject: () => {
            unset(source.Path);
            reject();
          }
        });
      }));
      return defer;
    }, { callbacks, promises: [] });
    const file_callbacks = this.file_callbacks;
    file_callbacks.set(key, defer.callbacks);
    return defer.promises;
  }

  update_target_callbacks(callbacks, key, target) {
    const sources = this.active_sources(target);
    return this.update_callbacks(sources, callbacks, key);
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
      const ImageData = image_data.get(sub.Path);
      return { ...sub, ImageData }; 
    });
  }

  active_hash(key, target) {
    const sources = this.loaded_sources(key, target);
    const hash = sources.map((source) => {
      const { Name, Colors } = source;
      return Name + '_' + Colors.join('_');
    }).join('-');
    return hash;
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

  trackImageData(key, subpath, data) {
    const _sources = this.image_data.get(key) || new Map;
    _sources.set(subpath, data);
    this.image_data.set(key, _sources);
  }

  getImageData(tk) {
    return this.image_data.get(tk) || new Map;
  }

  get lens_center() {
    const center = this.HS.lensCenter;
    if (center.length !== 2) {
      return new Float32Array([-1, -1]);
    }
    return new Float32Array(center);
  }
}

export { toTileTarget, toTileSource, GLState }
