/**
 * scene.js
 * Owns the Three.js renderer, camera, post-processing pipeline,
 * background star field, and the main animation loop.
 *
 * Exports: { camera, scene, renderer, composer, afterimagePass }
 * Exposes: initScene(), startAnimationLoop()
 */

let camera, scene, renderer, composer, afterimagePass;

function initScene() {
    // ── Scene & Camera ──────────────────────────────
    scene  = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0015);

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    camera.position.z = CONFIG.camZ;

    // ── Renderer ────────────────────────────────────
    renderer = new THREE.WebGLRenderer({
        antialias:        false,
        powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // ── Post-processing pipeline ─────────────────────
    //   RenderPass → AfterimagePass → UnrealBloomPass
    const renderPass = new THREE.RenderPass(scene, camera);

    afterimagePass = new THREE.AfterimagePass();
    afterimagePass.uniforms['damp'].value = 0.65;

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
        1.5,   // strength
        0.4,   // radius
        0.85   // threshold
    );
    bloomPass.threshold = 0;
    bloomPass.strength  = 1.0;
    bloomPass.radius    = 0.3;

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(afterimagePass);
    composer.addPass(bloomPass);

    // ── Background stars ─────────────────────────────
    _createStarField();
}

/** Scattered background stars — rendered behind particles, no fog. */
function _createStarField() {
    const positions = [];

    for (let i = 0; i < 3000; i++) {
        const r     = 300 + Math.random() * 700;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        positions.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
        color:       0xffffff,
        size:        1.5,
        transparent: true,
        opacity:     0.5,
        fog:         false,
    });

    window._starField = new THREE.Points(geo, mat);
    scene.add(window._starField);
}

/** Main render loop — called once after init. */
function startAnimationLoop(particleSystem, uniforms) {
    function animate() {
        requestAnimationFrame(animate);

        const timeSec = performance.now() * 0.001;
        uniforms.time.value = timeSec;

        // Auto-rotation recovers gradually when hand velocity is negligible
        if (Math.abs(STATE.velocity.x) > 0.001 || Math.abs(STATE.velocity.y) > 0.001) {
            STATE.autoRotSpeed = 0;
        } else {
            STATE.autoRotSpeed = THREE.MathUtils.lerp(STATE.autoRotSpeed, 0.001, 0.02);
        }

        STATE.autoRotY  += STATE.autoRotSpeed;
        STATE.manualRotY += STATE.velocity.x;
        STATE.manualRotX += STATE.velocity.y;
        STATE.velocity.x *= CONFIG.physics.friction;
        STATE.velocity.y *= CONFIG.physics.friction;

        particleSystem.rotation.y = STATE.autoRotY + STATE.manualRotY;
        particleSystem.rotation.x = STATE.manualRotX;

        if (window._starField) {
            window._starField.rotation.y = STATE.autoRotY * 0.5;
        }

        composer.render();
    }

    animate();
}

/** Keep camera + renderer in sync with the window. */
window.addEventListener('resize', () => {
    if (!camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

    const hc = document.getElementById('hand-canvas');
    hc.width  = window.innerWidth;
    hc.height = window.innerHeight;
});
