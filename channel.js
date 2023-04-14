
const is_tile_target = (tile) => {
  const regex = /^data:image\/png;/;
  const url = tile.getUrl()
  return url.match(regex) !== null;
}

const to_target_key = (tile) => {
  const { level, x, y } = tile;
  return `${level}-${x}-${y}`;
}

const split_url = (full_url) => {
  const parts = full_url.split('/');
  if (parts.length < 2) return null;
  return parts.slice(-2).pop();
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
  const { rendered } = props;
  const gl_w = via.width;
  const gl_h = via.height;
  const w = props.data.width;
  const h = props.data.height;
  rendered.drawImage( output, 0, 0, gl_w, gl_h, 0, 0, w, h);
}

const render_tile = (props, uniforms, via) => {
  if (props === null) {
    return via.gl.canvas;
  }
  const { gl } = via;
  const { data } = props;
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
  gl.uniform3fv(u_t0_color, data.colors[0] || black);
  gl.uniform3fv(u_t1_color, data.colors[1] || black);
  gl.uniform3fv(u_t2_color, data.colors[2] || black);
  gl.uniform3fv(u_t3_color, data.colors[3] || black);
  gl.uniform3fv(u_t4_color, data.colors[4] || black);
  gl.uniform3fv(u_t5_color, data.colors[5] || black);
  gl.uniform3fv(u_t6_color, data.colors[6] || black);
  gl.uniform3fv(u_t7_color, data.colors[7] || black);

  // Send the tile channels to the texture
  [0,1,2,3,4,5,6,7].forEach((i) => {
    const from = data.channels[i];
    if (from === undefined) return;
    gl.activeTexture(gl['TEXTURE'+i]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8UI, w, h, 0,
              gl.RGB_INTEGER, gl.UNSIGNED_BYTE, from.data);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  return gl.canvas;
}

const to_tile_props = (shown) => {
  if (shown.channels.length < 1) return null;
  if (shown.colors.length < 1) return null;
  const data = {
    colors: shown.colors,
    channels: shown.channels,
    width: shown.channels[0].data.width,
    height: shown.channels[0].data.height
  }
  return { data };
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

const update_shape = (gl, tileShape) => {
  const w = tileShape.tileWidth;
  const h = tileShape.tileHeight;
  gl.canvas.width = w;
  gl.canvas.height = h;
  gl.viewport(0, 0, w, h);
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

const toTileShape = (tileSources) => {
  const tileSourceVals = [...Object.values(tileSources)];
  return tileSourceVals.reduce((o, tiledImages) => {
    const shapes = tiledImages.map(({source}) => {
      const tileWidth = source.getTileWidth();
      const tileHeight = source.getTileHeight();
      return { tileWidth, tileHeight };
    });
    return shapes.pop() || o;
  }, {tileWidth: 1024, tileHeight: 1024 });
}

const to_shown = (state, key) => {
  const sources = state.getSources(key);
  console.log(key, sources, 'target');
  const source_map = [...sources].reduce((o, source) => {
    o.set(source.subfolder, source);
    return o;
  }, new Map);
  const subgroups = state.active_subgroups.filter((sub) => {
    if (!state.channel_map.has(sub.Path)) return false;
    if (!source_map.has(sub.Path)) return false;
    return true;
  });
  const colors = subgroups.map(sub => {
    return state.channel_map.get(sub.Path).color;
  });
  const channels = subgroups.map(sub => {
    return source_map.get(sub.Path);
  });
  return { channels, colors };
}

const customizeTileSource = (HS, tileSource) => {
  const { tileWidth, tileHeight } = tileSource;
  const tileShape = { tileWidth, tileHeight };
  const closure = to_closure(HS.gl_state, tileShape);
  return {
    ...tileSource,
    createTileCache: function(cache, out) {
        //data is webgl canvas
        cache._out = out;
    },
    destroyTileCache: function(cache) {
        cache._out = null;
    },
    getTileCacheData: function(cache) {
        return cache._out;
    },
    getTileCacheDataAsImage: function() {
        throw "Image-based drawing unsupported";
    },
    downloadTileStart: function(imageJob) {
      const parts = imageJob.src.split('/');
      const is_target = parts.length <= 1;
      const key = parts.pop();
      if (is_target) {
        setTimeout(() => {
          const shown = to_shown(HS.gl_state, key || '');
          const { via, uniforms } = closure;
          const props = to_tile_props(shown);
          const out = render_tile(props, uniforms, via)
          imageJob.finish(out);
        }, 1000);
        return;
      }
      const image = new Image();
      image.src = imageJob.src;
      image.onload = () => {
        const { via } = closure;
        console.log(key, 'source');
        HS.gl_state.trackSource(key, {
          full_url: imageJob.src, data: image 
        });
        imageJob.finish(via.gl.canvas);
      }
      imageJob.userData.image = image;
    },
    downloadTileAbort: function(imageJob) {
      const image = imageJob.userData.image;
      image.onload = image.onerror = image.onabort = null;
    },
    getTileCacheDataAsContext2D: function(cache) {
        const out = cache._out;
        // Create 2D canvas context
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext('2d');
        canvas.height = out.height;
        canvas.width = out.width;
        const h = out.height;
        const w = out.width;
        // Draw cached webgl2 context to 2d context
        ctx.drawImage( out, 0, 0, w, h, 0, 0, w, h);
        return ctx;
    }
  }
}

const to_uniforms = (via, program) => {
  const u_shape = via.gl.getUniformLocation(program, "u_shape");
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
    u_t5_color, u_t6_color, u_t7_color
  };
}

const to_closure = (state, tileShape) => {
  const { program, via } = initialize_gl(tileShape);
  const uniforms = to_uniforms(via, program);
  return { state, via, uniforms };
}

const linkShaders = (props) => {
  return { updater: () => null }; // TODO TODO

  //TODO
  const layers = props.layers.filter(sub => {
    return sub.Colorize === true;
  });
  const { viewer, active_subgroups, tileSources } = props;
  const state = new State({ active_subgroups, layers });
  const tileShape = toTileShape(tileSources);

  // TODO
  const closure = to_closure(state, tileShape);
  
  viewer.addHandler('tile-unloaded', (e) => {
    console.log(e.tile.level, e.tile.x, e.tile.y)
  });
  viewer.addHandler('tile-loaded', (e) => {
    const { getCompletionCallback } = e;
    const { data, tiledImage, tile } = e;
    const { name, colorize } = tiledImage.source;
    const url = tile.getUrl();
    state.tiles.set(url, tile);
    tile.colorize = colorize;
    tile.name = name;
    tile._data = data;
    if (data === null) {
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
      state.trackSource(tk, {
        full_url: url, data: tile._data 
      });
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

export { linkShaders, customizeTileSource }
