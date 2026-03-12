/**
 * particles.js
 * Builds the BufferGeometry + ShaderMaterial particle system,
 * pre-bakes all shape buffers, and exposes morphing / colour-shift helpers.
 *
 * Public API:
 *   initParticles()  → { particleSystem, uniforms }
 *   triggerMorph(shapeName)
 *   triggerColorChange()
 */

// Pre-baked Float32Arrays, one per shape — populated in initParticles()
const shapeBuffers = {};

let _particleSystem = null;
let _uniforms       = null;
let _currentShapeIdx = 0;   // tracks which shape is currently shown

/** ─── Initialise ──────────────────────────────────────────────────────────── */

function initParticles() {
    const N   = CONFIG.particleCount;
    const geo = new THREE.BufferGeometry();

    const positions  = new Float32Array(N * 3);
    const positionsB = new Float32Array(N * 3);
    const sizes      = new Float32Array(N);
    const colors     = new Float32Array(N * 3);

    // Gradient colours — deep rose core fading to pale blush
    const colorInner = new THREE.Color(0xff0055);
    const colorOuter = new THREE.Color(0xff99bb);

    // Pre-bake every shape into its own buffer
    CONFIG.shapes.forEach(name => {
        const buf = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
            const v    = Generators[name]();
            buf[i * 3]     = v.x;
            buf[i * 3 + 1] = v.y;
            buf[i * 3 + 2] = v.z;
        }
        shapeBuffers[name] = buf;
    });

    // Seed geometry with the heart shape + per-particle colour gradient
    const heartBuf = shapeBuffers['heart'];
    for (let i = 0; i < N; i++) {
        positions[i * 3]     = heartBuf[i * 3];
        positions[i * 3 + 1] = heartBuf[i * 3 + 1];
        positions[i * 3 + 2] = heartBuf[i * 3 + 2];

        sizes[i] = Math.random() * 3.5 + 2.0;

        const dist  = Math.sqrt(
            heartBuf[i * 3] ** 2 +
            heartBuf[i * 3 + 1] ** 2 +
            heartBuf[i * 3 + 2] ** 2
        ) / 85;
        const mixed = colorInner.clone().lerp(colorOuter, dist);
        colors[i * 3]     = mixed.r;
        colors[i * 3 + 1] = mixed.g;
        colors[i * 3 + 2] = mixed.b;
    }

    geo.setAttribute('position',  new THREE.BufferAttribute(positions,  3));
    geo.setAttribute('positionB', new THREE.BufferAttribute(positionsB, 3));
    geo.setAttribute('size',      new THREE.BufferAttribute(sizes,      1));
    geo.setAttribute('color',     new THREE.BufferAttribute(colors,     3));

    // ── Uniforms ──────────────────────────────────────────────────────────
    _uniforms = {
        time:         { value: 0.0 },
        mixVal:       { value: 0.0 },
        scale:        { value: 1.0 },
        crumbleAmt:   { value: 0.0 },
        beatIntensity:{ value: 1.0 },
        colorShift:   { value: new THREE.Vector3(0, 0, 0) },
    };

    const mat = new THREE.ShaderMaterial({
        uniforms:       _uniforms,
        vertexShader:   VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent:    true,
        depthWrite:     false,
        blending:       THREE.AdditiveBlending,
    });

    _particleSystem = new THREE.Points(geo, mat);
    scene.add(_particleSystem);

    return { particleSystem: _particleSystem, uniforms: _uniforms };
}

/** ─── Morph to a named shape ──────────────────────────────────────────────── */

function triggerMorph(name) {
    const geom = _particleSystem.geometry;

    // If we're already past the half-way point of a previous morph,
    // snap positionA to positionB before starting the new one —
    // this prevents "rubber-banding" artifacts.
    if (_uniforms.mixVal.value > 0.5) {
        geom.setAttribute('position', geom.attributes.positionB.clone());
        _uniforms.mixVal.value = 0.0;
    }

    geom.attributes.positionB.set(shapeBuffers[name]);
    geom.attributes.positionB.needsUpdate = true;

    // Heartbeat only applies to the heart shape
    gsap.killTweensOf(_uniforms.beatIntensity);
    gsap.to(_uniforms.beatIntensity, {
        value:    name === 'heart' ? 1.0 : 0.0,
        duration: 1.0,
    });

    gsap.killTweensOf(_uniforms.mixVal);
    gsap.to(_uniforms.mixVal, {
        value:    1.0,
        duration: 1.5,
        ease:    'power2.inOut',
    });

    _showShapeLabel(name);
}

/** Randomise the per-particle hue shift for a surprise colour burst. */
function triggerColorChange() {
    gsap.to(_uniforms.colorShift.value, {
        x:        Math.random(),
        y:        Math.random(),
        z:        Math.random(),
        duration: 0.6,
    });
    _showShapeLabel('COLOR SHIFT');
}

/** Advance to the next shape in the cycle (called by gesture handler). */
function morphToNextShape() {
    _currentShapeIdx = (_currentShapeIdx + 1) % CONFIG.shapes.length;
    triggerMorph(CONFIG.shapes[_currentShapeIdx]);
}

/** ─── UI helpers ───────────────────────────────────────────────────────────── */

function _showShapeLabel(name) {
    // Shape indicator (fades after 2 s)
    const indicator  = document.getElementById('shape-indicator');
    indicator.innerText  = name.toUpperCase();
    indicator.style.opacity = '1';
    setTimeout(() => { indicator.style.opacity = '0'; }, 2000);

    // Romantic quote box
    const msgBox  = document.getElementById('message-box');
    const msgText = document.getElementById('message-text');
    msgText.innerText = ROMANCE_QUOTES[name] ?? '';
    msgBox.classList.add('visible');
}

/** Expose scale update so gestures.js can drive it. */
function setScale(newScale) {
    _uniforms.scale.value = newScale;
}

function getCrumbleUniform()   { return _uniforms.crumbleAmt; }
function getScaleUniform()     { return _uniforms.scale; }
