/*{
  "DESCRIPTION": "Hitomezashi — Japanese sashiko stitching whose row/column parity spontaneously knits spirals and rectangles, lit as electric-ice circuitry.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "scale", "TYPE": "float", "DEFAULT": 13.0, "MIN": 5.0, "MAX": 28.0 },
    { "NAME": "width", "TYPE": "float", "DEFAULT": 0.09, "MIN": 0.03, "MAX": 0.2 },
    { "NAME": "glow",  "TYPE": "float", "DEFAULT": 0.8, "MIN": 0.2, "MAX": 1.6 },
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 3.0 }
  ]
}*/

float bit(float i, float seed){ return step(0.5, fract(sin(i * 12.9898 + seed) * 43758.5453)); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 p = uv * scale + vec2(0.06, 0.04) * TIME * speed;   // slow drift

  // horizontal stitches on integer y-lines; present on segment [k,k+1] by row parity
  float row = floor(p.y + 0.5);
  float aBit = bit(row, 1.7);
  float hOn = step(mod(floor(p.x) + aBit, 2.0), 0.5);
  float hLine = hOn * smoothstep(width, width * 0.2, abs(p.y - row));
  float hGlow = hOn * smoothstep(width * 3.0, 0.0, abs(p.y - row));

  // vertical stitches on integer x-lines; present on segment [j,j+1] by column parity
  float coli = floor(p.x + 0.5);
  float bBit = bit(coli, 4.3);
  float vOn = step(mod(floor(p.y) + bBit, 2.0), 0.5);
  float vLine = vOn * smoothstep(width, width * 0.2, abs(p.x - coli));
  float vGlow = vOn * smoothstep(width * 3.0, 0.0, abs(p.x - coli));

  float net = max(hLine, vLine);
  float halo = max(hGlow, vGlow);

  // electric current — sharp packets sweeping along the weave from two directions
  float tt = TIME * speed;
  float packet = pow(0.5 + 0.5 * sin((p.x + p.y) * 1.7 - tt * 5.0), 10.0)
               + pow(0.5 + 0.5 * sin((p.x - p.y) * 1.5 - tt * 4.0), 10.0);
  float ambient = 0.4 + 0.25 * sin((p.x + p.y) * 0.6 - tt * 1.5);

  vec3 ice = vec3(0.30, 0.68, 1.0);
  vec3 col = vec3(0.0, 0.012, 0.03);
  col += net * ice * ambient;                        // base glowing stitches
  col += net * vec3(0.75, 0.92, 1.0) * packet * 1.8; // bright current packets
  col += net * vec3(0.6, 0.85, 1.0) * 0.22;          // cool core
  col += halo * ice * (0.25 + 0.5 * packet) * glow;  // soft glow, hotter under current

  col *= 1.0 - 0.25 * dot(uv, uv);
  col = col / (1.0 + 0.5 * col);
  col = pow(max(col, 0.0), vec3(0.88));
  gl_FragColor = vec4(col, 1.0);
}
