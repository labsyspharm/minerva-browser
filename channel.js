const nTex = 512; // At least 32
const TEXTURE_RANGE = [...new Array(nTex).keys()];
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

const render_alpha_tile = (props, tile, via) => {
  const { gl, uniforms } = via;
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
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
  gl.drawElements(gl.TRIANGLES, 3*via.n_triangles, gl.UNSIGNED_SHORT, 0);
  return gl.canvas;
}

const render_linear_tile = (props, tile, via) => {
  const { gl, uniforms } = via;
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
    const from = data.channels[i];
    if (from === undefined) return;
    // Allow caching of channels
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.bindTexture(gl.TEXTURE_2D, via.textures[i]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    // Actually re-upload the tile texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
              gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, from);
  });
  // Actually draw the arrays
  gl.drawElements(gl.TRIANGLES, 3*via.n_triangles, gl.UNSIGNED_SHORT, 0);
  return gl.canvas;
}

const to_image_shape = (render) => {
}

const to_tile_props = (render, shape, useds, graphics, isLens) => {
  const { 
    tile_square, max_level 
  } = graphics.shape_opts;
  // Ensure all information can be zipped
  const { channels, colors, modes, crops } = render;
  const indices = render.paths.reduce((o, _, i) => {
    const channel = channels[i];
    const color = colors[i];
    const mode = modes[i];
    const crop = crops[i];
    const used = useds[i];
    // Check all found
    const missing = [
      color, mode, crop, used
    ].some(x => x === undefined);
    // Skip any first invalid
    if (missing) return o;
    return [...o, i];
  }, []);
  // No tiles to render
  if (indices.length === 0 || !shape?.width || !shape?.height) {
    return { data : null };
  }
  const channel_info = {
    channels: indices.map(i => channels[i] || null),
    channel_cached: indices.map(i => useds[i].cached),
    channel_index: indices.map(i => useds[i].index),
    colors: indices.map(i => colors[i]),
    modes: indices.map(i => modes[i]),
    crops: indices.map(i => crops[i])
  }
  // Channels to render
  const data = {
    ...channel_info, ...shape, tile_square,
  }
  return { data };
}

const to_linear_uniform_declarations = () => {
  return ACTIVE_TEXTURE_RANGE.map((i) => {
    const tex = `u_t${i}`
    return `  uniform vec4 ${tex}_crop;
  uniform uvec2 ${tex}_mode;
  uniform vec3 ${tex}_color;
  uniform usampler2D ${tex};`
  }).join('\n');
}

const to_linear_blend_calls = () => {
  return [
    'vec4 v0 = color_channel(u_t0, u_t0_color, u_t0_crop, u_t0_mode);',
    ...ACTIVE_TEXTURE_RANGE.slice(1).map((i) => {
      const tex = `u_t${i}`
      return `    v0 = v0 + color_channel(${tex}, ${tex}_color, ${tex}_crop, ${tex}_mode);`
    })
  ].join('\n');
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

const VERTEX_SHADER_SQUARE = `#version 300 es
in vec2 a_uv;
out vec2 uv;

void main() {
// Texture coordinates
uv = a_uv;

// Clip coordinates
vec2 full_pos = vec2(1., -1.) * (2. * a_uv - 1.);
gl_Position = vec4(full_pos, 0., 1.);
}
`
const VERTEX_SHADER_CIRCLE = `#version 300 es
in vec2 a_uv;
out vec2 uv;

uniform float u_lens_scale;
uniform float u_blend_alpha;
uniform float u_lens_rad;
uniform vec2 u_shape;
uniform float u_level;
uniform vec2 u_origin;
uniform vec2 u_lens;

vec2 scale_tile(vec2 v) {
  float scale = pow(2., u_level);
  return v / scale;
}

vec2 global_to_tile(vec2 v) {
  vec2 vs = scale_tile(v);
  vec2 c = vs - u_origin;
  return vec2(c.x, c.y);
}

void main() {

  // Resize lens
  vec2 new_uv = vec2(a_uv);
  float rad = u_lens_rad / u_lens_scale;
  vec2 full_lens = rad * new_uv / u_shape;

  // Position lens
  vec2 lens_off = global_to_tile(u_lens)/u_shape;
  new_uv = lens_off + scale_tile(full_lens);

  // Texture coordinates
  uv = vec2(new_uv);

  // Clip coordinates
  vec2 cv = vec2(new_uv);
  cv = vec2(1., -1.) * (cv * 2. -1.);

  gl_Position = vec4(cv, 0., 1.);
}`
const FRAGMENT_SHADPER_LINEAR = `#version 300 es
  precision highp int;
  precision highp float;
  precision highp usampler2D;

  uniform vec2 u_shape;
${to_linear_uniform_declarations()}

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
${to_linear_blend_calls()}
    return v0;
  }

  void main() {
    color = linear_blend();
  }
`
console.log(FRAGMENT_SHADPER_LINEAR)
const FRAGMENT_SHADPER_ALPHA = `#version 300 es
  precision highp int;
  precision highp float;
  precision highp usampler2D;

  uniform vec2 u_lens;
  uniform vec2 u_shape;
  uniform vec2 u_origin;
  uniform float u_blend_alpha;
  uniform vec4 u_t0_crop;
  uniform usampler2D u_t0;

  in vec2 uv;
  out vec4 color;

  ${CROP_SHADER}

  // Colorize continuous u8 signal
  vec4 color_channel(usampler2D sam) {
    uvec4 tex = texel(sam, u_shape, uv, u_t0_crop);

    vec3 rgb = vec3(tex.rgb) / 255.;
    return vec4(rgb*u_blend_alpha, u_blend_alpha);
  }

  void main() {
    color = color_channel(u_t0);
  }
`
const SHADERS = [{
    VERTEX_SHADER: VERTEX_SHADER_SQUARE,
    FRAGMENT_SHADER: FRAGMENT_SHADPER_LINEAR
  }, {
    VERTEX_SHADER: VERTEX_SHADER_CIRCLE,
    FRAGMENT_SHADER: FRAGMENT_SHADPER_ALPHA
  }
]

const to_circle = (n) => {
  const rad = 1.0;
  const x0 = 0.0;
  const y0 = 0.0;
  const pointIndices = [...Array(n).keys()];
  return pointIndices.reduce((o, i)=> {
     const angle = 2 * Math.PI * i / n;
     const x = x0 + rad * Math.cos(angle);
     const y = y0 + rad * Math.sin(angle);
     return [...o, x, y];
  }, []);
}

const to_square_polygon = () => {
  const n_verts = 4;
  const n_triangles = 2;
  const points = [
    0, 0,
    1, 0,
    0, 1,
    1, 1,
  ]
  const one_point_size = 2 * Float32Array.BYTES_PER_ELEMENT;
  const points_list_size = points.length * one_point_size;
  return {
    n_triangles,
    one_point_size, points_list_size,
    points_buffer: new Float32Array(points),
    index_buffer: new Uint16Array([0, 1, 2, 2, 1, 3]),
  };
}

const to_circle_polygon = (n_iter) => {
  const tri = [0, 1, 2];
  const third = 2**n_iter;
  const n_verts = 3*third;
  const n_triangles = n_verts - 2;
  const points = to_circle(n_verts);
  const indices = [...Array(n_iter).keys()].reduce((ov, v) => {
    const fracs = 3 * (2**v)
    const step = third / (2**v);
    return [...Array(fracs).keys()].reduce((od, d) => {
      const offset = v => (step * d + v) % n_verts;
      return tri.reduce((ot, n) => {
        return [...ot, offset(n*step/2)];
      }, od);
    }, ov);
  }, [0, third, n_verts - third]);
  const one_point_size = 2 * Float32Array.BYTES_PER_ELEMENT;
  const points_list_size = points.length * one_point_size;
  return {
    n_triangles,
    one_point_size, points_list_size,
    points_buffer: new Float32Array(points),
    index_buffer: new Uint16Array(indices),
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

  // Set up vertex array
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(a_uv);
  gl.bindBuffer(gl.ARRAY_BUFFER, via.buffer);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, via.one_point_size, 0);

  // Set up vertex indices
  const index_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
  gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      via.index_buffer,
      gl.STATIC_DRAW
  );

  gl.bindVertexArray(vao);
  gl.bufferData(gl.ARRAY_BUFFER, via.points_buffer, gl.STATIC_DRAW);

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

const to_graphics = (
  tile_canvas, program, uniforms, vertices, tex, active_tex, tile, shape_opts, cleanup
) => {
  const r1 = (Math.random() + 1).toString(36).substring(2);
  const r2 = (Math.random() + 1).toString(36).substring(2);
  const gl = tile_canvas.getContext('webgl2');
  tile_canvas.addEventListener("webglcontextlost", cleanup, false);
  tile_canvas.id = "tile-"+r1+'-'+r2;
  update_shape(gl, ...shape_opts.tile_square);
  gl.useProgram(program);
  const textures = tex.map(() => gl.createTexture());
  const texture_uniforms = toBuffers(tex, active_tex, program, {
    gl, ...vertices, buffer: gl.createBuffer(), textures
  });
  const n_triangles = vertices.n_triangles;
  return { 
    gl, texture_uniforms, textures, program,
    shape_opts, uniforms, n_triangles
  };
}

const hex2gl = (hex) => {
  const val = parseInt(hex.replace('#',''), 16);
  const bytes = [16, 8, 0].map(shift => {
    return ((val >> shift) & 255) / 255;
  });
  return new Float32Array(bytes);
}

const set_graphics = (gl_state, tile, shape_opts, isLens) => {
  const key = to_gl_tile_key(isLens);
  const graphicsMap = gl_state.graphicsMap;
  if (graphicsMap.has(key)) {
    return graphicsMap.get(key);
  }
  const [shaders, tex, active_tex] = [
    [
      SHADERS[0], ACTIVE_TEXTURE_RANGE, ACTIVE_TEXTURE_RANGE
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
  const vertices = [
    to_square_polygon(),
    to_circle_polygon(4),
  ][isLens? 1 : 0];
  const graphics = to_graphics(
    tile_canvas, program, uniforms, vertices,
    tex, active_tex, tile, shape_opts,
    () => graphicsMap.delete(key)
  );
  graphicsMap.set(key, graphics);
  return graphics;
}

const toTileKey = ({level, x, y}) => {
  return `${level}-${x}-${y}`;
}

const fromChannelTileKey = (ckey) => {
  return ckey.split('--').pop();
}

const toChannelTileKey = (subpath, key, isLens) => {
  return `${isLens}-${subpath || ''}--${key}`;
}

const parseImageJob = (imageJob) => {
  const full_url = imageJob.src;
  const { tile } = imageJob;
  const key = toTileKey(tile);
  return { full_url, key, tile };
}

const customTileCache = (HS, isLens, shape_opts) => {
  return {
    createTileCache: function(record, out) {
      const { tile } = out;
      HS.gl_state.allKeys.add(tile.cacheKey);
      record._out = out;
    },
    destroyTileCache: function(record) {
      const { tile } = record._out;
      HS.gl_state.allKeys.delete(tile.cacheKey);
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

const render_to_cache = (props, graphics, gl_state, tile, isLens) => {
  if (isLens) {
    const { tile_square, max_level } = graphics.shape_opts;
    const lens_scale = gl_state.toLensScale(gl_state.viewer);
    const lens_center = gl_state.toLensCenter(gl_state.viewer);
    const blend_alpha = gl_state.HS.lensAlpha;
    const lens_rad = gl_state.HS.lensRad;
    // Update lens-specific rendering
    props.data.tile_square = tile_square;
    props.data.blend_alpha = blend_alpha;
    props.data.lens_center = lens_center;
    props.data.lens_scale = lens_scale;
    props.data.max_level = max_level;
    props.data.lens_rad = lens_rad;
    // Render with lens shaders
    return render_alpha_tile(props, tile, graphics);
  }
  return render_linear_tile(props, tile, graphics);
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

const is_within_lens = (HS, lens_scale, lens_center, graphics, tile) => {
  const { shape_opts } = graphics;
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

const render_layers = (ctx, tile, props, graphics, gl_state, shape_opts, viewer, isLens) => {

  // Nothing drawn for invalid cache or channels
  if (props.data === null || props.data.channels.length < 1) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return false;
  }
  // Update per-tile rendering settings
  update_shape(graphics.gl, ...to_tile_shape(tile));
  const h = graphics.gl.canvas.height;
  const w = graphics.gl.canvas.width;
  const layer = ctx.canvas;
  layer.height = h;
  layer.width = w;
  
  const out = render_to_cache(props, graphics, gl_state, tile, isLens);
  ctx.drawImage(out, 0, 0, w, h, 0, 0, w, h);
  return true;
}

const toTileTarget = (HS, viewer, isLens, tileSource) => {
  const shape_opts = to_shape_opts(tileSource);
  return {
    ...tileSource,
    ...customTileCache(HS, isLens, shape_opts),
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
      // TODO
    },
    getTileCacheDataAsContext2D: function(record) {
      const { ctx, tile, key, shape, useds } =  record._out
      const gl_state = HS.gl_state;
      if (isLens) {
        const graphics = set_graphics(gl_state, tile, shape_opts, isLens);
        const render = gl_state.toRenderingSettings(null, graphics, tile, key, isLens);
        const props = to_tile_props(render, shape, useds, graphics, isLens);
        render_layers(
          ctx, tile, props, graphics, HS.gl_state, shape_opts, viewer, isLens
        );
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
  const { source } = targetImage;
  const p_level = Math.max(0, tile.level - 1);
  const p_idx = source.getTileAtPoint(p_level, tile.bounds.getCenter());
  const p = source.getTileBounds(p_level, p_idx.x, p_idx.y, false);
  const pwph = targetImage.viewportToImageCoordinates(p);
  const { x: width, y: height } = pwph;
  return { width, height };
}

const fetch_tile = (full_url, w, h, resolver) => {
  const promise = fetch(full_url, {
    method: "GET"
  }).then(result => {
    if (!result.ok) return null; 
    return result.blob();
  }).then(blob => {
    if (!blob) {
      throw new Error('Missing image data');
    }
    return createImageBitmap(blob);
  }).then(bitmap => {
    if (!bitmap) {
      throw new Error('Invalid image bitmap');
    };
    resolver(bitmap, null);
  }).catch((e) => {
    resolver(null, e?.message);
  });
  return promise;
}


const downloadImage = (gl_state, shape_opts, opts) => {
  const { targetImage, full_url, subpath, key, tile } = opts;
  return new Promise((resolve, reject) => {
    const finish = (ImageData) => {
      resolve({ tile, subpath, key, ImageData });
    }
    const [ w, h ] = to_tile_shape(tile);
    return fetch_tile(full_url, w, h, (i_data, error) => {
      if (i_data !== null) {
        return finish(i_data);
      }
      return reject(new Error(error));
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


class GLState {

  constructor(HS) {
    this.allKeys = new Set();
    this.graphicsCache = []; //TODO
    this.graphicsMap = new Map();
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
    // Attempt to load image, if needed
    const { Path, MaxLevel } = tileSource.image;
    const sources = this.active_sources(isLens);
    set_graphics(this, tile, shape_opts, isLens);
    const promise = Promise.all(sources.map((source) => {
      const { Format, Path: subpath } = source;
      // Skip loading if in a valid WebGL cache
      const check = { valid: true , found: null }; //TODO
      if (check.valid === true && check.found !== null) {
        return Promise.resolve({
          tile, subpath, key,
          imageData: null
        });
      }
      const getTileUrl = getGetTileUrl(
        Path, subpath, MaxLevel, Format
      )
      const full_url = getTileUrl(level, x, y);
      return downloadImage(this, shape_opts, {
        targetImage, full_url, subpath, key, tile
      });
    }));
    promise.then((results) => {
      const loaded = new Map(results.map((file) => {
        return [file.subpath, file];
      }));
      const entries = sources.map((sub) => {
        const file = loaded.get(sub.Path);
        return [sub.Path, { ...sub, ...file }];
      });
      // Load new image texture and render the layer
      const newImages = new Map(entries);
      // Assume all images are the same shape
      const shape = [...newImages.values()].reduce((o, i) => {
        const { width, height } = i.ImageData;
        return { width, height };
      }, null);
      const graphics = set_graphics(this, tile, shape_opts, isLens);
      const render = this.toRenderingSettings(newImages, graphics, tile, key, isLens);
      const useds = this.nextCache(tile.cacheKey, render.paths, isLens);
      const props = to_tile_props(render, shape, useds, graphics, isLens);
      const ctx = document.createElement("canvas").getContext('2d');
      render_layers(
        ctx, tile, props, graphics, this, shape_opts, viewer, isLens
      );
      // Marked as cached
      useds.forEach(used => used.cached = true);
      // Track texture used
      opts.imageJob.finish({
        ...opts, ctx, useds,
        shape: shape
      });
    }).catch((e) => {
      opts.imageJob.finish(null, null, e?.message);
    })
  }

  get usedTextures() {
    if (!this.viewer) return [];
    const cache = this.viewer.tileCache;
    // All used texture locations
    return [...this.allKeys].reduce((o, cacheKey) => {
      const imageRecord = cache.getImageRecord(cacheKey);
      const { useds } = imageRecord._out;
      return [...o, ...useds.map(i => i.index)];
    }, []);
  }

  nextCache(cacheKey, sources, isLens) {
    // Nothing cached for background 
    if (!isLens) {
      return sources.map((_, index) => {
        return { index, cached: false };
      });
    };
    // Only cache for lens
    const n_needed = sources.length;
    const in_cache = new Set(this.usedTextures);
    // Select available texture indices
    const indices = TEXTURE_RANGE.filter(k => {
      return in_cache.has(k) === false;
    }).slice(0, n_needed);
    // Return all indices
    return indices.map((index) => {
      return { index, cached: false };
    });
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

  toRenderingSettings(newImages, graphics, tile, key, isLens) {
    const readOnly = newImages === null;
    const [ w, h ] = to_tile_shape(tile);
    const images = newImages || new Map();
    const sources = this.loaded_sources(isLens);
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
      return images.get(sub.Path)?.ImageData;
    });
    const crops = sources.map(sub => {
      return [0, 0, w, h];
    });
    const paths = sources.map(sub => {
      return sub.Path;
    });
    // Generate new texture indices
    return { crops, channels, colors, modes, paths, w, h };
  }

  loaded_sources(isLens) {
    const sources = this.active_sources(isLens);
    const channel_map = this.channel_map(isLens);
    return sources.filter((sub) => {
      return channel_map.has(sub.Path);
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

  redrawLensTiles() {
    this.viewer.forceRedraw();
  }

  reloadLensTiles() {
    this.targetImageLens.reset();
    this.viewer.forceRedraw();
  }

  reloadTiles() {
    this.targetImageLens.reset();
    this.targetImageMain.reset();
    this.viewer.forceRedraw();
  }
}

export { toTileKey, toTileTarget, GLState, toDistance, getGetTileUrl, nTex }
