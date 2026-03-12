/**
 * gestures.js
 * MediaPipe Hands integration.
 *
 * Recognised gestures:
 *   Right hand open   → rotate particle system (velocity-based inertia)
 *   Right hand fist   → crumble effect; cycle shapes after holding ~20 frames
 *   Left  hand fist   → colour-shift burst (on fist release)
 *   Two hands         → pinch-to-zoom
 *
 * Draws a colour-coded wireframe skeleton on #hand-canvas for visual feedback.
 */

const handCanvas = document.getElementById('hand-canvas');
const handCtx    = handCanvas.getContext('2d');
handCanvas.width  = window.innerWidth;
handCanvas.height = window.innerHeight;

// Internal gesture state
let _isMorphing  = false;
let _morphTimer  = 0;

// Hand skeleton connection pairs (MediaPipe landmark indices)
const HAND_CONNECTIONS = [
    [0, 1], [1, 2],  [2, 3],  [3, 4],
    [0, 5], [5, 6],  [6, 7],  [7, 8],
    [5, 9], [9, 10], [10,11], [11,12],
    [9,13], [13,14], [14,15], [15,16],
    [13,17],[0, 17], [17,18], [18,19], [19,20],
];

/** Returns true when all four fingers are curled below their base knuckle. */
function _isFist(lm) {
    return (
        lm[8].y  > lm[5].y  &&   // index
        lm[12].y > lm[9].y  &&   // middle
        lm[16].y > lm[13].y &&   // ring
        lm[20].y > lm[17].y      // pinky
    );
}

/** Draw skeleton + landmark dots for one hand. */
function _drawHandWireframe(landmarks, isLeft) {
    const w = handCanvas.width;
    const h = handCanvas.height;

    handCtx.strokeStyle = isLeft
        ? 'rgba(255, 0, 127, 0.4)'
        : 'rgba(0, 255, 136, 0.4)';
    handCtx.lineWidth  = 2;
    handCtx.fillStyle  = isLeft
        ? 'rgba(255, 0, 127, 0.8)'
        : 'rgba(0, 255, 136, 0.8)';

    handCtx.beginPath();
    HAND_CONNECTIONS.forEach(([a, b]) => {
        handCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        handCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    });
    handCtx.stroke();

    landmarks.forEach(pt => {
        handCtx.beginPath();
        handCtx.arc(pt.x * w, pt.y * h, 3, 0, Math.PI * 2);
        handCtx.fill();
    });
}

/** Main entry — set up MediaPipe and attach to the webcam stream. */
function startCamera() {
    const video  = document.getElementById('input_video');
    const crumble = getCrumbleUniform();
    const scale   = getScaleUniform();

    // HUD element references
    const hudFist  = document.getElementById('ind-fist');
    const hudZoom  = document.getElementById('ind-zoom');
    const hudSwipe = document.getElementById('ind-swipe');
    const hudBlink = document.getElementById('ind-blink');

    const hands = new Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
        maxNumHands:            2,
        modelComplexity:        0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
        selfieMode:             true,
    });

    hands.onResults(results => {
        // Clear previous frame's skeleton
        handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

        // Reset HUD highlights
        hudFist.classList.remove('active-gesture');
        hudZoom.classList.remove('active-gesture');
        hudSwipe.classList.remove('active-gesture');
        hudBlink.classList.remove('active-gesture');

        // No hands detected — stop crumble and clear velocity
        if (!results.multiHandLandmarks?.length) {
            STATE.lastHandPos.set(0, 0);
            if (_isMorphing) {
                _isMorphing = false;
                _morphTimer = 0;
                gsap.to(crumble, { value: 0.0, duration: 1.0 });
            }
            return;
        }

        const count = results.multiHandLandmarks.length;

        // ── Two-hand pinch-to-zoom ─────────────────────────────────────
        if (count === 2) {
            hudZoom.classList.add('active-gesture');
            const wrist1 = results.multiHandLandmarks[0][9];
            const wrist2 = results.multiHandLandmarks[1][9];
            const dist   = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);

            if (STATE.lastPinchDist !== null) {
                STATE.currentScale += (dist - STATE.lastPinchDist) * 5.0;
                STATE.currentScale  = THREE.MathUtils.clamp(STATE.currentScale, 0.4, 3.5);
                gsap.to(scale, { value: STATE.currentScale, duration: 0.1 });
            }
            STATE.lastPinchDist = dist;
        } else {
            STATE.lastPinchDist = null;
        }

        // ── Per-hand processing ────────────────────────────────────────
        let anyRotating = false;
        let anyFist     = false;

        for (let i = 0; i < count; i++) {
            const lm       = results.multiHandLandmarks[i];
            const isLeft   = results.multiHandedness[i].label === 'Right'; // mirrored
            const fist     = _isFist(lm);

            _drawHandWireframe(lm, isLeft);

            if (isLeft) {
                // Left fist: trigger colour burst on *release*
                if (fist && !STATE.leftFist) {
                    STATE.leftFist = true;
                    hudBlink.classList.add('active-gesture');
                } else if (!fist && STATE.leftFist) {
                    STATE.leftFist = false;
                    hudBlink.classList.add('active-gesture');
                    triggerColorChange();
                }

            } else {
                // Right fist: crumble + shape cycle
                if (fist) {
                    anyFist = true;
                    hudFist.classList.add('active-gesture');

                    if (!_isMorphing) {
                        _isMorphing = true;
                        gsap.to(crumble, { value: 1.0, duration: 0.8 });
                    }

                    _morphTimer++;
                    if (_morphTimer > 20) {
                        _morphTimer = 0;
                        morphToNextShape();
                    }

                    STATE.lastHandPos.set(0, 0);

                } else {
                    // Right hand open: rotate
                    anyRotating = true;
                    hudSwipe.classList.add('active-gesture');

                    if (_isMorphing) {
                        _isMorphing = false;
                        _morphTimer = 0;
                        gsap.to(crumble, { value: 0.0, duration: 1.5, ease: 'elastic.out(1, 0.5)' });
                    }

                    if (STATE.lastHandPos.x !== 0) {
                        STATE.velocity.x = (lm[8].x - STATE.lastHandPos.x) * CONFIG.sensitivity.rotate;
                        STATE.velocity.y = (lm[8].y - STATE.lastHandPos.y) * CONFIG.sensitivity.rotate;
                    }
                    STATE.lastHandPos.set(lm[8].x, lm[8].y);
                }
            }
        }

        // Clean up if the fist / rotate hand left the frame
        if (!anyFist && _isMorphing) {
            _isMorphing = false;
            _morphTimer = 0;
            gsap.to(crumble, { value: 0.0, duration: 1.5, ease: 'elastic.out(1, 0.5)' });
        }
        if (!anyRotating) {
            STATE.lastHandPos.set(0, 0);
        }
    });

    const webCam = new Camera(video, {
        onFrame: async () => { await hands.send({ image: video }); },
        width:  640,
        height: 480,
    });
    webCam.start();
}
