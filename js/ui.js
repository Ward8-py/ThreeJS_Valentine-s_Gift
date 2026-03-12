/**
 * ui.js
 * Wires up all DOM interactions that don't belong to gesture or particle logic:
 *   - Start button / overlay dismissal
 *   - Side menu morph buttons
 *
 * Called once from main.js after the scene is ready.
 */

function initUI(particleSystem, uniforms) {
    // ── Start button ──────────────────────────────────────────────────────
    document.getElementById('start-btn').addEventListener('click', () => {
        const overlay = document.getElementById('overlay');
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 800);

        document.getElementById('ui').style.opacity        = '1';
        document.getElementById('glass-menu').style.opacity = '1';

        // Show the initial romantic quote
        document.getElementById('message-box').classList.add('visible');

        // Start the webcam / hand-tracking pipeline
        startCamera();
    });

    // ── Side menu morph buttons ───────────────────────────────────────────
    document.querySelectorAll('.glass-btn[data-shape]').forEach(btn => {
        btn.addEventListener('click', () => {
            triggerMorph(btn.dataset.shape);
        });
    });
}
