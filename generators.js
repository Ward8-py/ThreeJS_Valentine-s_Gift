/**
 * generators.js
 * Pure functions that return a THREE.Vector3 sample point for each named shape.
 * Each generator is called once per particle during initialisation.
 *
 * All shapes are scaled to fit roughly within a ±110 unit bounding box
 * so that morphing between them feels balanced without camera adjustment.
 */

const Generators = Object.freeze({

    /**
     * Heart — implicit surface  a³ - x²y³ - 0.1125z²y³ ≤ 0
     * Sampled via rejection inside a [-1.5, 1.5]³ cube.
     */
    heart() {
        while (true) {
            const x = (Math.random() - 0.5) * 3.0;
            const y = (Math.random() - 0.5) * 3.0;
            const z = (Math.random() - 0.5) * 3.0;
            const a   = x * x + 2.25 * z * z + y * y - 1.0;
            const val = a * a * a - x * x * (y * y * y) - 0.1125 * z * z * (y * y * y);
            if (val <= 0.0 && val > -0.2) {
                return new THREE.Vector3(x * 85, y * 85, z * 85);
            }
        }
    },

    /**
     * Saturn — filled sphere (70 %) + flat ring halo (30 %).
     * Ring radius jittered so it reads as a natural debris disc.
     */
    saturn() {
        if (Math.random() > 0.3) {
            // Uniform sphere interior (cube-root radius for volume uniformity)
            const r     = 55 * Math.cbrt(Math.random());
            const theta = Math.random() * 2.0 * Math.PI;
            const phi   = Math.acos(2.0 * Math.random() - 1.0);
            return new THREE.Vector3(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }

        // Flat ring
        const angle  = Math.random() * Math.PI * 2;
        const radius = 90 + Math.random() * 60;
        return new THREE.Vector3(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 2,
            Math.sin(angle) * radius
        );
    },

    /**
     * Rose / Spiral — Archimedean spiral swept outward with a parabolic
     * vertical lift so the shape reads as a rising bloom.
     */
    rose() {
        const r     = Math.random() * 90;
        const theta = r * 0.5;
        const x     = r * Math.cos(theta);
        const z     = r * Math.sin(theta);
        const y     = (Math.random() - 0.5) * r * 0.5 + Math.pow(r / 90, 2) * 30 - 15;
        return new THREE.Vector3(x, y, z);
    },

    /**
     * Fireworks — 80 % surface shell + 20 % interior volume.
     * The hollow shell gives the impression of an exploded burst.
     */
    fireworks() {
        const r     = Math.random() > 0.8 ? Math.random() * 110 : 110;
        const theta = Math.random() * 2.0 * Math.PI;
        const phi   = Math.acos(2.0 * Math.random() - 1.0);
        return new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    },

    /**
     * Sphere — uniform volume fill using cube-root radius trick.
     */
    sphere() {
        const r     = 85 * Math.cbrt(Math.random());
        const theta = Math.random() * 2.0 * Math.PI;
        const phi   = Math.acos(2.0 * Math.random() - 1.0);
        return new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    },

});
