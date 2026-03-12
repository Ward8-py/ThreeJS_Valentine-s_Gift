/**
 * shaders.js
 * GLSL source strings for the particle ShaderMaterial.
 *
 * Vertex shader responsibilities:
 *   - GPU-side lerp between two position buffers (morphing)
 *   - Heartbeat pulse animation driven by time uniform
 *   - Crumble / explode effect via hash-based noise
 *   - Dynamic point size with perspective correction
 *
 * Fragment shader responsibilities:
 *   - Soft circular billboard with power-falloff edge
 *   - Additive blending colour pass-through
 */

const VERTEX_SHADER = /* glsl */`
    uniform float time;
    uniform float mixVal;
    uniform float scale;
    uniform float crumbleAmt;
    uniform vec3  colorShift;
    uniform float beatIntensity;

    attribute vec3  positionB;
    attribute float size;
    attribute vec3  color;

    varying vec3  vColor;
    varying float vAlpha;

    // Deterministic pseudo-random scalar from a 3-D seed
    float hash(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 4325.5453);
    }

    void main() {
        // Morph between shape A and shape B
        vec3 pos = mix(position, positionB, mixVal);

        // Heartbeat: gentle sinusoidal scale pulse
        float pump  = sin(time * 3.0);
        float pulse = 1.0 + (pump * 0.06 * beatIntensity);
        pos *= pulse;

        // Crumble: scatter particles along a random direction
        vec3 noiseVec = vec3(hash(pos), hash(pos.zyx), hash(pos.yxz)) * 2.0 - 1.0;
        pos += noiseVec * crumbleAmt * 120.0;

        vec4 mvPosition = modelViewMatrix * vec4(pos * scale, 1.0);
        gl_Position    = projectionMatrix * mvPosition;

        // Perspective-corrected point size
        float dynamicSize = size + (crumbleAmt * 4.0);
        gl_PointSize = dynamicSize * (400.0 / -mvPosition.z) * scale;

        // Colour with optional hue shift; wrap with mod to stay in [0,1]
        vColor = mod(color + colorShift, 1.0);
        vAlpha = smoothstep(800.0, 50.0, -mvPosition.z);
    }
`;

const FRAGMENT_SHADER = /* glsl */`
    varying vec3  vColor;
    varying float vAlpha;

    void main() {
        // Discard corners — render as a soft circular point
        vec2 coord = gl_PointCoord - vec2(0.5);
        if (length(coord) > 0.5) discard;

        float strength = 1.0 - (length(coord) * 2.0);
        strength = pow(strength, 2.5);

        gl_FragColor = vec4(vColor, strength * vAlpha * 0.9);
    }
`;
