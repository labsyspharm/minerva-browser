const render_tile = (props, uniforms, via) => {
  const { gl } = via;
  if (props === null) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return via.gl.canvas;
  }
  const { data } = props;
  const {
    u_shape, u_t0_color, u_t1_color,
    u_t2_color, u_t3_color, u_t4_color,
    u_t5_color, u_t6_color, u_t7_color,
    u_t0_mode, u_t1_mode,
    u_t2_mode, u_t3_mode, u_t4_mode,
    u_t5_mode, u_t6_mode, u_t7_mode
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const tile_shape_2fv = new Float32Array([w, h]);
  const black = hex2gl("000000");
  gl.uniform2fv(u_shape, tile_shape_2fv);
  gl.uniform3fv(u_t0_color, data.colors[0] || black);
  gl.uniform3fv(u_t1_color, data.colors[1] || black);
  gl.uniform3fv(u_t2_color, data.colors[2] || black);
  gl.uniform3fv(u_t3_color, data.colors[3] || black);
  gl.uniform3fv(u_t4_color, data.colors[4] || black);
  gl.uniform3fv(u_t5_color, data.colors[5] || black);
  gl.uniform3fv(u_t6_color, data.colors[6] || black);
  gl.uniform3fv(u_t7_color, data.colors[7] || black);
  gl.uniform1ui(u_t0_mode, data.modes[0] || 0);
  gl.uniform1ui(u_t1_mode, data.modes[1] || 0);
  gl.uniform1ui(u_t2_mode, data.modes[2] || 0);
  gl.uniform1ui(u_t3_mode, data.modes[3] || 0);
  gl.uniform1ui(u_t4_mode, data.modes[4] || 0);
  gl.uniform1ui(u_t5_mode, data.modes[5] || 0);
  gl.uniform1ui(u_t6_mode, data.modes[6] || 0);
  gl.uniform1ui(u_t7_mode, data.modes[7] || 0);

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

const to_tile_props = (shown) => {
  if (shown.channels.length < 1) return null;
  if (shown.colors.length < 1) return null;
  if (shown.modes.length < 1) return null;
  const data = {
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

  uniform vec2 u_shape;
  uniform uint u_t0_mode;
  uniform uint u_t1_mode;
  uniform uint u_t2_mode;
  uniform uint u_t3_mode;
  uniform uint u_t4_mode;
  uniform uint u_t5_mode;
  uniform uint u_t6_mode;
  uniform uint u_t7_mode;
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
    float y = 1. - (pos.y + off.y / size.y);
    float x = pos.x + off.x / size.x;
    return texture(sam, vec2(x, y));
  }

  // Colorize continuous u8 signal
  vec3 u8_r_range(usampler2D sam, vec3 color, uint mode) {
    uvec4 tex = texel(sam, u_shape, uv, vec2(0, 0));
    if (mode == uint(0)) {
      return vec3(0.0);
    }
    if (mode == uint(1)) {
      vec4 float_tex = vec4(tex) / 255.;
      return vec3(float_tex) * float_tex.a;
    }
    // Scale color by texel value 
    return color * float(tex.r) / 255.;
  }

  void main() {
    vec3 v0 = u8_r_range(u_t0, u_t0_color, u_t0_mode);
    vec3 v1 = u8_r_range(u_t1, u_t1_color, u_t1_mode);
    vec3 v2 = u8_r_range(u_t2, u_t2_color, u_t2_mode);
    vec3 v3 = u8_r_range(u_t3, u_t3_color, u_t3_mode);
    vec3 v4 = u8_r_range(u_t4, u_t4_color, u_t4_mode);
    vec3 v5 = u8_r_range(u_t5, u_t5_color, u_t5_mode);
    vec3 v6 = u8_r_range(u_t6, u_t6_color, u_t6_mode);
    vec3 v7 = u8_r_range(u_t7, u_t7_color, u_t7_mode);
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

const to_gl_tile_key = (tile) => {
  const [w, h] = to_tile_shape(tile);
  return `${w}-${h}`;
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

const initialize_gl = (tile, key, cleanup) => {
  const r1 = (Math.random() + 1).toString(36).substring(2);
  const r2 = (Math.random() + 1).toString(36).substring(2);
  const tile_canvas = document.createElement('canvas');
  tile_canvas.addEventListener("webglcontextlost", cleanup, false);
  tile_canvas.id = "tile-"+key+"-"+r1+'-'+r2;
  const gl = tile_canvas.getContext('webgl2');
  const program = toProgram(gl, shaders);
  update_shape(gl, tile);
  gl.useProgram(program);
  toBuffers(program, {
    gl, ...to_vertices(), buffer: gl.createBuffer(),
    textures: [0,1,2,3,4,5,6,7].map(() => gl.createTexture())
  });
  const via = { gl };
  return { program, via };
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

const to_shown = (state, key) => {
  const sources = state.loaded_sources(key);
  const colors = sources.map(sub => {
    return state.channel_map.get(sub.Path).color;
  });
  const modes = sources.map(sub => {
    if (sub.Colorize === false) return 1;
    return 2;
  });
  const channels = sources.map(sub => {
    return sub.ImageData;
  });
  return { channels, colors, modes };
}

const set_cache_gl = (gl_state, tile) => {
  const key = to_gl_tile_key(tile);
  const caches_gl = gl_state.caches_gl;
  if (caches_gl.has(key)) return caches_gl.get(key);
  const cache_gl = to_cache_gl(gl_state, tile, key, () => {
    caches_gl.delete(key);
  });
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

const customTileCache = (HS, is_source) => {
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

const toTileTarget = (HS, tileSource) => {
  const caches_2d = HS.gl_state.caches_2d;
  const set_image_callbacks = (key) => {
    const callbacks = HS.gl_state.get_image_callbacks(key);
    return HS.gl_state.update_active_callbacks(callbacks, key);
  }
  const render_to_cache = (key, cache_gl) => {
    const shown = to_shown(HS.gl_state, key || '');
    const { via, uniforms } = cache_gl;
    const props = to_tile_props(shown);
    return render_tile(props, uniforms, via);
  }
  return {
    ...tileSource,
    ...customTileCache(HS, false),
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      set_cache_gl(HS.gl_state, tile);
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
      const cache_2d = HS.gl_state.get_cache_2D(out.key);
      const hash = HS.gl_state.active_hash(out.key);
      // Return the cached 2D canvas output
      if (hash === cache_2d?.hash) {
        return cache_2d.ctx;
      }
      else if (cache_2d) {
        cache_2d.hash = hash;
      }
      // Render to new 2D canvas output
      const cache_gl = set_cache_gl(HS.gl_state, out.tile);
      out.canvas = render_to_cache(out.key, cache_gl);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext('2d');
      const h = out.canvas.height;
      const w = out.canvas.width;
      canvas.height = h;
      canvas.width = w;
      // Copy webgl2 context to 2d context
      ctx.drawImage(out.canvas, 0, 0, w, h, 0, 0, w, h);
      HS.gl_state.set_cache_2D(out.key, { ctx, hash });
      return ctx;
    }
  }
}

const toTileSource = (HS, tileSource) => {
  const to_image_callbacks = (key, path) => {
    const callbacks = HS.gl_state.get_image_callbacks(key);
    if (!callbacks.has(path)) {
      return null; 
    };
    return callbacks.get(path);
  }
  return {
    ...tileSource,
    ...customTileCache(HS, true),
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      const subpath = split_url(full_url);
      set_cache_gl(HS.gl_state, tile);
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

const to_uniforms = (via, program) => {
  const u_shape = via.gl.getUniformLocation(program, "u_shape");
  const u_t0_mode = via.gl.getUniformLocation(program, "u_t0_mode");
  const u_t1_mode = via.gl.getUniformLocation(program, "u_t1_mode");
  const u_t2_mode = via.gl.getUniformLocation(program, "u_t2_mode");
  const u_t3_mode = via.gl.getUniformLocation(program, "u_t3_mode");
  const u_t4_mode = via.gl.getUniformLocation(program, "u_t4_mode");
  const u_t5_mode = via.gl.getUniformLocation(program, "u_t5_mode");
  const u_t6_mode = via.gl.getUniformLocation(program, "u_t6_mode");
  const u_t7_mode = via.gl.getUniformLocation(program, "u_t7_mode");
  const u_t0_color = via.gl.getUniformLocation(program, "u_t0_color");
  const u_t1_color = via.gl.getUniformLocation(program, "u_t1_color");
  const u_t2_color = via.gl.getUniformLocation(program, "u_t2_color");
  const u_t3_color = via.gl.getUniformLocation(program, "u_t3_color");
  const u_t4_color = via.gl.getUniformLocation(program, "u_t4_color");
  const u_t5_color = via.gl.getUniformLocation(program, "u_t5_color");
  const u_t6_color = via.gl.getUniformLocation(program, "u_t6_color");
  const u_t7_color = via.gl.getUniformLocation(program, "u_t7_color");
  return {
    u_shape, u_t0_color, u_t1_color,
    u_t2_color, u_t3_color, u_t4_color,
    u_t5_color, u_t6_color, u_t7_color,
    u_t0_mode, u_t1_mode,
    u_t2_mode, u_t3_mode, u_t4_mode,
    u_t5_mode, u_t6_mode, u_t7_mode
  };
}

const to_cache_gl = (gl_state, tile, key, cleanup) => {
  const { program, via } = initialize_gl(tile, key, cleanup);
  const uniforms = to_uniforms(via, program);
  return { via, uniforms };
}

class GLState {

  constructor(HS) {
    this.forsaken = new Set();
    this.caches_2d = new Map();
    this.caches_gl = new Map();
    this.image_data = new Map();
    this.file_callbacks = new Map();
    this.settings = {};
    this.HS = HS;
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

  update_active_callbacks(callbacks, key) {
    const sources = this.active_sources;
    return this.update_callbacks(sources, callbacks, key);
  }

  loaded_sources(key) {
    const image_data = this.getImageData(key);
    return this.active_sources.filter((sub) => {
      if (!this.channel_map.has(sub.Path)) return false;
      if (!image_data.has(sub.Path)) return false;
      return true;
    }).map((sub) => {
      const ImageData = image_data.get(sub.Path);
      return { ...sub, ImageData }; 
    });
  }

  active_hash(key) {
    const hash = this.loaded_sources(key).map((source) => {
      const { Name, Colors } = source;
      return Name + '_' + Colors.join('_');
    }).join('-');
    return hash;
  }

  get active_sources() {
    return this.HS.active_subgroups;
  }

  get channel_map() {
    return this.active_sources.filter((group) => {
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
}

export { toTileTarget, toTileSource, GLState }
