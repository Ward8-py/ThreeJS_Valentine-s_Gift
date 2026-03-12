/**
 * main.js
 * Application entry point.
 *
 * Boot order:
 *   1. initScene()      — Three.js renderer, camera, post-processing, stars
 *   2. initParticles()  — BufferGeometry, ShaderMaterial, shape buffers
 *   3. startAnimationLoop() — raf loop
 *   4. initUI()         — DOM events (start button, menu buttons)
 *
 * All modules are loaded as plain <script> tags (no bundler required),
 * so execution order is guaranteed by the order in index.html.
 */

(function bootstrap() {
    // Three.js scene must exist before particles can be added to it
    initScene();

    const { particleSystem, uniforms } = initParticles();

    startAnimationLoop(particleSystem, uniforms);

    // UI setup last — the start button triggers startCamera() which
    // requires the scene to already be rendering
    initUI(particleSystem, uniforms);
})();
