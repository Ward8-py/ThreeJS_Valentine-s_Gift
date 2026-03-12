/**
 * config.js
 * Central configuration and shared mutable state.
 * All other modules read from CONFIG and STATE — no magic numbers elsewhere.
 */

const CONFIG = Object.freeze({
    particleCount: 25000,
    camZ:          350,
    sensitivity:   { rotate: 1.75 },
    physics:       { friction: 0.90 },
    shapes:        ['heart', 'saturn', 'rose', 'fireworks', 'sphere'],
});

const ROMANCE_QUOTES = Object.freeze({
    heart:     "You own my heart",
    saturn:    "All these stars and I get lost in your eyes only",
    rose:      "Every thought leads back to you",
    fireworks: "I love you beyond comprehension",
    sphere:    "With you everything feels complete",
});

/**
 * Mutable runtime state — mutated by gestures.js and scene.js.
 * Kept in one place so every module shares the same reference.
 */
const STATE = {
    lastHandPos:    new THREE.Vector2(0, 0),
    velocity:       new THREE.Vector2(0, 0),
    manualRotX:     0,
    manualRotY:     0,
    currentScale:   1.0,
    lastPinchDist:  null,
    autoRotY:       0,
    autoRotSpeed:   0.001,
    leftFist:       false,
};
