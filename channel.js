const TEXTURE_RANGE = [...new Array(1024).keys()];
const ACTIVE_TEXTURE_RANGE = [...new Array(16).keys()];

// Return a function for Openseadragon's getTileUrl API
const getGetTileUrl = function(ipath, lpath, max, format) {
  // This default function simply requests for rendered jpegs
  return function(level, x, y) {
    const fileExt = '.' + format;
    const fname = (max - level) + '_' + x + '_' + y + fileExt;
    return ipath + '/' + lpath + '/' + fname;
  };
};

const render_alpha_tile = (props, uniforms, tile, via) => {
  const { gl } = via;
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (props === null) {
    return via.gl.canvas;
  }
  const { data } = props;
  const { alpha_index } = data;
  const { channel_index, channel_cached } = data;
  const {
    u_lens, u_shape, u_blend_alpha, u_crops,
    u_lens_rad, u_lens_scale, u_level, u_origin,
  } = uniforms;
  const w = data.width;
  const h = data.height;
  const max = data.max_level;
  const lens_rad = data.lens_rad;
  const blend_alpha = data.blend_alpha;
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
  gl.uniform1f(u_blend_alpha, blend_alpha);

  // Load the data
  const texi = channel_index[0];
  const from = data.channels[0];
  if (from === undefined) {
    return gl.canvas;
  };

  // Bind all needed textures
  via.texture_uniforms.forEach((_, i) => {
    gl.uniform4fv(u_crops[i], data.crops[i] || full);
    // Load the data
    const texi = channel_index[i];
    const from = data.channels[i];
    if (from === undefined) return;
    // Allow caching of channels
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[texi]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    // Don't re-upload if is cached
    if (channel_cached[i]) return;
    // Actually re-upload the tile texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
  });
  // Actually draw the arrays
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return gl.canvas;
}

const render_linear_tile = (props, uniforms, tile, via) => {
  const { gl } = via;
  const { data } = props;
  if (data.channels.length < 1) {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return gl.canvas;
  }
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
    // Allow caching of channels
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[texi]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    // Don't re-upload if is cached
    if (channel_cached[i]) return;
    // Actually re-upload the tile texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
  });
  // Actually draw the arrays
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return gl.canvas;
}

const to_tile_props = (shown, gl_state, key, cache_gl, isLens) => {
  const { 
    tile_square, max_level 
  } = cache_gl.shape_opts;

  const n_tex = cache_gl.via.textures.length;
  const channel_info = shown.paths.reduce((o, sub) => {
    const next = gl_state.nextChannel(key, sub, n_tex, isLens);
    o.channel_cached.push(next.cached);
    o.channel_index.push(next.index);
    return o;
  },{
    channel_cached: [], channel_index: []
  });
  let width = cache_gl.via.gl.canvas.width;
  let height = cache_gl.via.gl.canvas.height;
  if (shown.channels.length) {
    width = shown.channels[0].width;
    height = shown.channels[0].height;
  }

  const data = {
    ...channel_info,
    tile_square,
    width, height,
    modes: shown.modes,
    colors: shown.colors,
    channels: shown.channels,
    crops: shown.crops
  }
  return { data };
}

const CROP_SHADER = `
  float linear(vec2 ran, float x) {
    float m = ran[1] - ran[0];
    return m * x + ran[0];
  }

  // Sample texture at given texel offset
  uvec4 texel(usampler2D sam, vec2 size, vec2 pos, vec4 crop) {
    vec2 ran_x = vec2(crop[0], crop[0] + crop[2]) / size.x;
    vec2 ran_y = vec2(crop[1], crop[1] + crop[3]) / size.y;
    vec2 c_shape = vec2(
      linear(ran_x, pos.x), linear(ran_y, pos.y)
    );
    return texture(sam, c_shape);
  }
`

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

  ${CROP_SHADER}

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
  uniform vec4 u_t0_crop;
  uniform usampler2D u_t0;

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

  ${CROP_SHADER}

  // Colorize continuous u8 signal
  vec4 color_channel(usampler2D sam) {
    uvec4 tex = texel(sam, u_shape, uv, u_t0_crop);

    // Render empty lens background
    vec2 global_v = tile_to_global(uv);
    int lens = lens_status(u_lens, uv);
    if (lens == 0) {
      return vec4(0.0);
    }
    vec4 rgba = vec4(tex) / 255.;
    return vec4(rgba.rgb, u_blend_alpha);
  }

  void main() {
    color = color_channel(u_t0);
  }`,
  VERTEX_SHADER 
}
]

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

const toBuffers = (tex, active_tex, program, via) => {
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
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
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

const to_gl_tile_key = (stage) => {
  return `${stage}-gl`;
}

const to_tile_shape = (tile) => {
  const { width, height } = tile.sourceBounds;
  return [width, height].map(x => Math.ceil(x));
}

const update_shape = (gl, w, h) => {
  gl.canvas.width = w;
  gl.canvas.height = h;
  gl.viewport(0, 0, w, h);
}

const initialize_gl = (tile_canvas, program, uniforms, tex, active_tex, tile, shape_opts, cleanup) => {
  const r1 = (Math.random() + 1).toString(36).substring(2);
  const r2 = (Math.random() + 1).toString(36).substring(2);
  const gl = tile_canvas.getContext('webgl2');
  tile_canvas.addEventListener("webglcontextlost", cleanup, false);
  tile_canvas.id = "tile-"+r1+'-'+r2;
  update_shape(gl, ...shape_opts.tile_square);
  gl.useProgram(program);
  const textures = tex.map(() => gl.createTexture());
  const texture_uniforms = toBuffers(tex, active_tex, program, {
    gl, ...to_vertices(), buffer: gl.createBuffer(), textures
  });
  const via = { gl, texture_uniforms, textures, program };
  return { via, uniforms };
}

const hex2gl = (hex) => {
  const val = parseInt(hex.replace('#',''), 16);
  const bytes = [16, 8, 0].map(shift => {
    return ((val >> shift) & 255) / 255;
  });
  return new Float32Array(bytes);
}

const set_cache_gl = (gl_state, tile, shape_opts, isLens) => {
  const key = to_gl_tile_key(isLens);
  const caches_gl = gl_state.caches_gl;
  if (caches_gl.has(key)) {
    return caches_gl.get(key);
  }
  const [shaders, tex, active_tex] = [
    [
      SHADERS[0], TEXTURE_RANGE, ACTIVE_TEXTURE_RANGE
    ],
    [
      SHADERS[1], TEXTURE_RANGE, [0] 
    ]
  ][isLens? 1 : 0];
  const tile_canvas = document.createElement('canvas');
  const gl = tile_canvas.getContext('webgl2');
  const program = toProgram(gl, shaders);
  const uniforms = [
    to_linear_uniforms(program, gl, active_tex),
    to_alpha_uniforms(program, gl, active_tex), 
  ][isLens? 1 : 0];

  const cache_gl = to_cache_gl(
    tile_canvas, program, uniforms, tex, active_tex, tile, shape_opts,
    () => caches_gl.delete(key)
  );
  caches_gl.set(key, cache_gl);
  return cache_gl;
}

const toTileKey = ({level, x, y}) => {
  return `${level}-${x}-${y}`;
}

const toChannelTileKey = (subpath, key, isLens) => {
  return `${subpath || ''}--${key}--${isLens}`;
}

const parseImageJob = (imageJob) => {
  const full_url = imageJob.src;
  const { tile } = imageJob;
  const key = toTileKey(tile);
  return { full_url, key, tile };
}

const customTileCache = (HS, shape_opts) => {
  return {
    createTileCache: function(record, out) {
      record._out = out;
    },
    destroyTileCache: function(record) {
      record._out = null;
    },
    getTileCacheData: function(record) {
      return record._out;
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

const render_to_cache = (gl_state, key, tile, isLens, cache_gl) => {
  const shown = gl_state.to_shown(key || '', isLens);
  const props = to_tile_props(shown, gl_state, key, cache_gl, isLens);
  if (isLens) {
    const { tile_square, max_level } = cache_gl.shape_opts;
    const lens_scale = gl_state.toLensScale(gl_state.viewer);
    const lens_center = gl_state.toLensCenter(gl_state.viewer);
    const blend_alpha = gl_state.HS.lensAlpha;
    const lens_rad = gl_state.HS.lensRad;
    const n_tex = cache_gl.via.textures.length;
    const data = {
      ...props.data,
      tile_square, blend_alpha, max_level,
      lens_rad, lens_scale, lens_center
    };
    return render_alpha_tile({ data }, cache_gl.uniforms, tile, cache_gl.via);
  }
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

const need_lens = (HS, lens_scale, lens_center, cache_gl, tile) => {
  if (!HS.gl_state.showVisibleLens) return false;
  return is_within_lens(HS, lens_scale, lens_center, cache_gl, tile);
}

const render_layers = (ctx, gl_state, shape_opts, viewer, isLens, opts) => {
  const { tile, key } = opts;
  const cache_gl = set_cache_gl(gl_state, tile, shape_opts, isLens);
  update_shape(cache_gl.via.gl, ...to_tile_shape(opts.tile));
  const h = cache_gl.via.gl.canvas.height;
  const w = cache_gl.via.gl.canvas.width;
  const layer = ctx.canvas;
  layer.height = h;
  layer.width = w;
  
  const out = render_to_cache(gl_state, key, tile, isLens, cache_gl);
  if (out) {
    ctx.drawImage(out, 0, 0, w, h, 0, 0, w, h);
  }
  return ctx;
}

const toTileTarget = (HS, viewer, isLens, tileSource) => {
  const shape_opts = to_shape_opts(tileSource);
  return {
    ...tileSource,
    ...customTileCache(HS, shape_opts),
    hasTransparency: function() {
      return isLens;
    }, 
    downloadTileStart: function(imageJob) {
      const { full_url, key, tile } = parseImageJob(imageJob);
      const canvas = document.createElement('canvas');
      const [w, h] = to_tile_shape(tile);
      canvas.height = h;
      canvas.width = w;
      HS.gl_state.load(shape_opts, isLens, {
        key, tile, imageJob, tileSource
      });
    },
    downloadTileAbort: function(imageJob) {
      imageJob.userData.promise.controller.abort();
    },
    getTileCacheDataAsContext2D: function(record) {
      const needsLens = (tile, cache_gl) => {
        const lens_scale = HS.gl_state.toLensScale(viewer);
        const lens_center = HS.gl_state.toLensCenter(viewer);
        return need_lens(HS, lens_scale, lens_center, cache_gl, tile);
      }
      const { tile, key, ctx } =  record._out
      const cache_gl = set_cache_gl(HS.gl_state, tile, shape_opts, isLens);
      const has_lens = needsLens(tile, cache_gl);
      // Render lens layer if needed
      if (isLens) {
        if (has_lens || true) {
          const opts = { tile, key };
          render_layers(ctx, HS.gl_state, shape_opts, viewer, isLens, opts);
        }
        else {
          // create and return new blank canvas
//          const canvas = document.createElement('canvas');
//          canvas.height = ctx.canvas.height;;
//          canvas.width = ctx.canvas.width;
        }
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

const positionTiles = (targetImage, tile) => {
  const { width: w, height: h } = tile.sourceBounds;
  const source = targetImage.source;
  const to_image_coords = (x, y) => {
    const p = new OpenSeadragon.Point(x, y);
    return targetImage.viewportToImageCoordinates(p);
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
    if (!result.ok) return null; 
    return result.blob();
  }).then(blob => {
    if (!blob) return null;
    return createImageBitmap(blob);
  }).then(bitmap => {
    if (!bitmap) {
      resolver(null, null);
      return;
    };
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


const downloadImage = (gl_state, shape_opts, opts) => {
  const { targetImage, full_url, subpath, key, tile } = opts;
  return new Promise((resolve, reject) => {
    const finish = (key, ImageData, ScaledCrop) => {
      resolve({ tile, subpath, key, ImageData, ScaledCrop });
    }
    const [ w, h ] = to_tile_shape(tile);
    return fetch_tile(full_url, w, h, (i_data, i_crop) => {
      const p_crop = positionTiles(targetImage, tile).crop;
      const used_parent = (p_data) => {
        return finish(key, p_data, p_crop, true);
      }
      if (i_data !== null) {
        return finish(key, i_data, i_crop, false);
      }
      gl_state.trackFailed(key, subpath);
      const tracked_failed = gl_state.getTrackedFailed(key);
      const p_tile = getParentTile(targetImage.source, tile);
      if (p_tile === null) {
        return reject(); // no parent of top level
      }
      // Fetch parent tile
      const {
        width: w, height: h
      } = positionTiles(targetImage, tile);
      fetch_tile(p_tile.url, w, h, (p_data) => {
        if (p_data !== null) {
          return used_parent(p_data);
        }
        // no parent tile
        gl_state.trackFailed(key, subpath);
        return reject();
      });
    });
  });
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

const to_alpha_uniforms = (program, gl, active_tex) => {
  const u_lens = gl.getUniformLocation(program, "u_lens");
  const u_shape = gl.getUniformLocation(program, "u_shape");
  const u_level = gl.getUniformLocation(program, "u_level");
  const u_origin = gl.getUniformLocation(program, "u_origin");
  const u_lens_rad = gl.getUniformLocation(program, "u_lens_rad");
  const u_lens_scale = gl.getUniformLocation(program, "u_lens_scale");
  const u_blend_alpha = gl.getUniformLocation(program, "u_blend_alpha");

  const u_crops = active_tex.map((i) => {
    return gl.getUniformLocation(program, `u_t${i}_crop`);
  });
  return {
    u_lens, u_crops, u_shape, u_blend_alpha,
    u_lens_rad, u_lens_scale, u_level, u_origin
  };
}

const to_cache_gl = (tile_canvas, program, uniforms, tex, active_tex, tile, shape_opts, cleanup) => {
  const { via } = initialize_gl(
    tile_canvas, program, uniforms, tex, active_tex, tile, shape_opts, cleanup
  );
  return { via, shape_opts, uniforms };
}

class GLState {

  constructor(HS) {
    this.main = [];
    this.lens = [];
    this.failed = new Map();
    this.imageCache = new Map()
    this.caches_gl = new Map();
    this.targetImageMain = null;
    this.targetImageLens = null;
    this.viewer = null;
    this.HS = HS;
  }

  load(shape_opts, isLens, opts) {
    const { HS, viewer } = this;
    const targetImage = [
      this.targetImageMain,
      this.targetImageLens,
    ][+isLens];
    const { level, x, y } = opts.tile;
    const { key, tile, tileSource } = opts;
    const { Path, MaxLevel } = tileSource.image;
    const sources = this.active_sources(isLens);
    set_cache_gl(this, tile, shape_opts, isLens);
    const promise = Promise.all(sources.map((source) => {
      const { Format, Path: subpath } = source;
      const tracked_loaded = this.getTrackedLoaded(key);
      if (tracked_loaded.has(subpath)) {
        const cachedImage = tracked_loaded.get(subpath);
        return Promise.resolve(cachedImage);
      }
      const getTileUrl = getGetTileUrl(
        Path, subpath, MaxLevel, Format
      )
      const full_url = getTileUrl(level, x, y);
      return downloadImage(this, shape_opts, {
        targetImage, full_url, subpath, key, tile
      });
    }));
    promise.then((r) => {
      const loaded = new Map(r.map((file) => {
        return [file.subpath, file];
      }));
      const entries = sources.map((sub) => {
        const file = loaded.get(sub.Path);
        return [sub.Path, { ...sub, ...file }];
      });
      this.imageCache.set(key, new Map(entries));
      const ctx = document.createElement("canvas").getContext('2d');
      render_layers(ctx, this, shape_opts, viewer, isLens, opts);
      opts.imageJob.finish({
        ...opts, ctx 
      });
    }).catch((e) => {
      if (e !== undefined) console.error(e);
      opts.imageJob.finish(null, null, '');
    })
  }

  toCached(cache, key, sub, isLens) {
    const ckey = toChannelTileKey(sub, key, isLens);
    const found = this[cache].find(item => {
      return item[1] === ckey;
    });
    return found || null;
  }

  nextCache(cache, key, sub, n_tex, isLens) {
    const ckey = toChannelTileKey(sub, key, isLens);
    console.log(ckey)
    const to_output = (item, cached) => {
      const index = item[0];
      return { index, cached };
    }
    const found = this.toCached(cache, key, sub, isLens);
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

  nextChannel(key, sub, n_tex, isLens) {
    const cache = ['main', 'lens'][+isLens];
    return this.nextCache(cache, key, sub, n_tex, isLens);
  }

  setViewer(viewer) {
    this.viewer = viewer;
  }

  setTargetImage(item, isLens) {
    if (isLens) {
      this.targetImageLens = item;
    }
    else {
      this.targetImageMain = item;
    }
  }

  get showVisibleLens() {
    return this.active_sources(true).length;
  } 

  toLensCenter(viewer) {
    const [x, y] = this.HS.lensCenter;
    const center = ((vp) => {
      if (this.targetImageLens === null) {
        return [0, 0];
      }
      const p = new OpenSeadragon.Point(x, y);
      const point = vp.viewerElementToViewportCoordinates(p);
      return this.targetImageLens.viewportToImageCoordinates(point);
    })(viewer.viewport);
    return new Float32Array([center.x, center.y]);
  }

  toLensScale(viewer) {
    return ((vp) => {
      const vp_zoom = vp.getZoom(true);
      if (this.targetImageLens === null) {
        return vp.viewportToImageZoom(vp_zoom);
      }
      return this.targetImageLens.viewportToImageZoom(vp_zoom);
    })(viewer.viewport);
  }

  to_shown(key, isLens) {
    const sources = this.loaded_sources(key, isLens);
    const channel_map = this.channel_map(isLens);
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

  loaded_sources(key, isLens) {
    const tracked_loaded = this.getTrackedLoaded(key);
    const sources = this.active_sources(isLens);
    const channel_map = this.channel_map(isLens);
    return sources.filter((sub) => {
      return (
        channel_map.has(sub.Path)
        && tracked_loaded.get(sub.Path)
      );
    }).map((sub) => {
      const {
        ImageData, ScaledCrop
      } = tracked_loaded.get(sub.Path);
      return { ...sub, ImageData, ScaledCrop }; 
    });
  }

  active_sources(isLens) {
    if (isLens) {
      return this.HS.lens_subgroups;
    }
    else {
      return this.HS.active_subgroups;
    }
  }

  channel_map(isLens) {
    const sources = this.active_sources(isLens);
    return sources.filter((group) => {
      return group.Colors.length === 1;
    }).reduce((o, {Colors, Path}) => {
      const color = hex2gl(Colors[0]);
      o.set(Path, { color });
      return o;
    }, new Map());
  }

  untrackLensTiles() {
    const { targetImageLens } = this;
    const { tileCache } = this.viewer;
    if (targetImageLens !== null) {
      tileCache.clearTilesFor(targetImageLens);
    }
  }

  untrackMainTiles() {
    const { targetImageMain } = this;
    const { tileCache } = this.viewer;
    if (targetImageMain !== null) {
      tileCache.clearTilesFor(targetImageMain);
    } 
  }

  trackFailed(key, subpath) {
    const failed = this.getTrackedFailed(key);
    failed.add(subpath);
    this.failed.set(key, failed);
  }

  getTrackedFailed(key) {
    return this.failed.get(key) || new Set();
  }

  getTrackedLoaded(key) {
    return this.imageCache.get(key) || new Map();
  }
}

export { toTileKey, toTileTarget, GLState, toDistance, getGetTileUrl }
