const toSettings = ({ opts, tiles, layers }) => {
  const { channelMap: channel_map } = opts;
  [...tiles.values()].forEach((tile) => {
    delete tile._caching; 
    delete tile._cached; 
  });
  return { channel_map };
}

class State {

  constructor(opts) {
    this.layers = new Map();
    this.tiles = new Map();
    this.settings = {};
    this.update(opts);
  }

  get channel_map () {
    return this.settings.channel_map;
  }

  trackTile (tile) {
    this.tiles.set(tile.url, tile);
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
  }
}

const draw_tile = (ctx, output, viaGL, w, h) => {
  const gl_w = viaGL.width;
  const gl_h = viaGL.height;
  ctx.drawImage(output, 0, 0, gl_w, gl_h, 0, 0, w, h);
}

const to_tile_drawing = ({ viaGL, opts, uniforms }) => {
  const state = new State(opts);
  const { u_tile_shape, u_tile_color } = uniforms;
  const { gl } = viaGL;
  return (_, e) => {
    // Read parameters from each tile
    const { source } = e.tiledImage;
    const { name } = source;
    const w = e.rendered.canvas.width;
    const h = e.rendered.canvas.height;
    
    // Unable to colorize this layer
    const missing = [
      source.colorize !== true,
      !state.channel_map.has(name)
    ].some(x => x);
    if (missing) return; 

    // check cache
    state.trackTile(e.tile);
    if (e.tile._cached) {
      draw_tile(e.rendered, e.tile._cached, viaGL, w, h);
      return;
    }
     
    // Load image into array
    e.tile._data = ((e, w, h) => {
      const { tile, rendered } = e;
      if (tile._data) return tile._data;
      return rendered.getImageData(0, 0, w, h).data;
    })(e, w, h);

    // Clear the rendered tile
    e.rendered.fillStyle = "black";
    e.rendered.fillRect(0, 0, w, h);

    // Start webGL rendering
    const output = ((data, w, h) => {
      const color_3fv = state.channel_map.get(name).color;
      const tile_shape_2fv = new Float32Array([w, h]);
      gl.uniform2fv(u_tile_shape, tile_shape_2fv);
      gl.uniform3fv(u_tile_color, color_3fv);

      // Send the tile to the texture
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8UI, w, h, 0,
                gl.RGBA_INTEGER, gl.UNSIGNED_BYTE, data);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return gl.canvas;
    })(e.tile._data, w, h);
    // Begin caching current tile 
    if (!e.tile._caching) {
      e.tile._caching = createImageBitmap(output);
      e.tile._caching.then(bitmap => {
        delete e.tile._caching;
        e.tile._cached = bitmap;
      });
    }
    draw_tile(e.rendered, output, viaGL, w, h);
  }
}

const shaders = {
  fragment: `#version 300 es
precision highp int;
precision highp float;
precision highp usampler2D;

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
  color = u8_r_range(1.0);
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

export { to_tile_drawing, State, shaders }
