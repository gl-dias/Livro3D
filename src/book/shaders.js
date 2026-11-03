// Materiais do livro. Nada de luz real nem mapa de sombra: um foco calculado por
// pixel e sombras escritas à mão, com poucas contas. É o que deixa barato no celular.

// Uma única conta de luz, igual pra mesa, papel e objetos. Assim tudo parece
// estar debaixo da mesma lâmpada.
const LIGHT = /* glsl */ `
  const vec3 LIGHT_POS = vec3(0.0, 4.2, 0.35);
  const vec3 LIGHT_TINT = vec3(1.0, 0.965, 0.9);
  float spot(vec2 xz) {
    vec2 q = (xz - vec2(0.0, 0.05)) / vec2(2.75, 1.95);
    float d = length(q);
    return 1.0 - smoothstep(0.26, 1.0, d);
  }
`

export const pageVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

export const pageFragment = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform vec4 uTurn;     // xA, xB, força, maciez: sombra da folha que passa por cima
  uniform float uGutter;  // quanto a dobra escurece
  uniform float uGloss;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vW;
  ${LIGHT}
  void main() {
    bool front = gl_FrontFacing;
    vec3 tex = front ? texture2D(uFront, vUv).rgb
                     : texture2D(uBack, vec2(1.0 - vUv.x, vUv.y)).rgb;

    vec3 N = normalize(vN) * (front ? 1.0 : -1.0);
    vec3 L = normalize(LIGHT_POS - vW);
    float diff = max(dot(N, L), 0.0);
    float sp = spot(vW.xz);

    // Papel recebe luz e ainda devolve um pouco do que bate na mesa.
    float light = 0.08 + (0.16 + 0.78 * diff) * sp;

    // Dobra: em vUv.x = 0 está a lombada, nas duas faces.
    float gutter = 1.0 - uGutter * exp(-vUv.x * 13.0) - uGutter * 0.35 * exp(-vUv.x * 42.0);

    // Sombra da folha em movimento sobre a página parada.
    float sh = smoothstep(uTurn.x - uTurn.w, uTurn.x + uTurn.w * 0.2, vW.x)
             * (1.0 - smoothstep(uTurn.y - uTurn.w * 0.2, uTurn.y + uTurn.w, vW.x));
    float shadow = 1.0 - uTurn.z * sh;

    vec3 V = normalize(cameraPosition - vW);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 26.0) * uGloss * sp;

    vec3 col = tex * LIGHT_TINT * light * gutter * shadow + vec3(spec);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export const litVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

export const litFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGloss;
  uniform float uStripes;
  varying vec3 vN;
  varying vec3 vW;
  ${LIGHT}
  void main() {
    vec3 N = normalize(vN);
    vec3 L = normalize(LIGHT_POS - vW);
    vec3 V = normalize(cameraPosition - vW);
    vec3 H = normalize(L + V);
    float diff = max(dot(N, L), 0.0);
    float sp = spot(vW.xz);
    float light = 0.07 + (0.16 + 0.8 * diff) * sp;
    float spec = pow(max(dot(N, H), 0.0), 48.0) * uGloss * sp;
    vec3 c = uColor;
    if (uStripes > 0.0) {
      // borda do bloco de páginas: linhas finas no sentido do papel
      float l = sin(vW.y * uStripes);
      c *= 0.86 + 0.14 * l;
    }
    gl_FragColor = vec4(c * LIGHT_TINT * light + vec3(spec), 1.0);
    #include <colorspace_fragment>
  }
`

export const tableVertex = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

export const tableFragment = /* glsl */ `
  uniform sampler2D uWood;
  uniform vec4 uBook;     // xMin, xMax, zMin, zMax
  uniform float uBookH;   // altura do livro, afasta e abre a sombra
  uniform vec3 uMug;      // x, z, raio
  uniform vec4 uPen;      // ponta a (xz), ponta b (xz)
  varying vec3 vW;
  ${LIGHT}
  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }
  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  void main() {
    vec2 p = vW.xz;
    vec3 wood = texture2D(uWood, p * vec2(0.19, 0.42)).rgb;
    float sp = spot(p);

    // Reflexo largo na madeira perto de quem olha, como na referência.
    float sheen = exp(-pow((p.y - 1.05) / 0.5, 2.0)) * exp(-pow(p.x / 2.4, 2.0));

    vec2 c = vec2(uBook.x + uBook.y, uBook.z + uBook.w) * 0.5;
    vec2 h = vec2(uBook.y - uBook.x, uBook.w - uBook.z) * 0.5;
    float soft = 0.05 + uBookH * 0.9;
    float dBook = sdBox(p - c - vec2(0.0, 0.02), h);
    float shBook = 1.0 - 0.86 * (1.0 - smoothstep(-soft * 0.3, soft, dBook));

    float dMug = length(p - uMug.xy - vec2(0.012, 0.03)) - uMug.z;
    float shMug = 1.0 - 0.72 * (1.0 - smoothstep(-0.03, 0.14, dMug));

    float dPen = sdSegment(p, uPen.xy, uPen.zw) - 0.012;
    float shPen = 1.0 - 0.7 * (1.0 - smoothstep(-0.006, 0.05, dPen));

    vec3 lit = wood * (0.04 + 0.92 * sp) + wood * sheen * 0.8 * sp;
    vec3 col = lit * LIGHT_TINT * shBook * shMug * shPen;

    // Longe do foco a mesa some no mesmo preto do site.
    vec3 bg = vec3(0.00304, 0.00304, 0.00335);
    col = mix(bg, col + bg, smoothstep(0.0, 0.25, sp + 0.04));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`
