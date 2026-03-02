import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// --- CONFIGURATION ---
const params = {
    // Animation
    timeScale: 0.6,
    rotationSpeedX: 0.0003,
    rotationSpeedY: 0.0008,

    // Grid
    gridDensity: 18.0,
    lineWidth: 0.04,
    lineGlow: 2.5,
    gridColor: 0x00d4ff,
    gridAccent: 0x00ffe1,
    gridBrightness: 1.8,

    // Scan
    scanSpeed: 0.4,
    scanWidth: 0.15,
    scanIntensity: 1.5,

    // Shell
    shellColor: 0x00aaff,
    shellOpacity: 0.25,

    // Nodes
    nodeSize: 1.2,
    nodePulse: 0.8
};

// 1. SCENE SETUP
const scene = new THREE.Scene();
scene.background = null; // rendered by space background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 2.8;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.5;
controls.maxDistance = 20;

const mainGroup = new THREE.Group();
scene.add(mainGroup);

// --- GLSL NOISE ---
const noiseFunctions = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
`;

// --- SPACE BACKGROUND (separate scene rendered behind everything) ---
const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Nebula fullscreen quad
const nebulaMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec2 vUv;

        ${noiseFunctions}

        void main() {
            vec2 uv = vUv;
            float aspect = uResolution.x / uResolution.y;
            vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

            // Near-black void
            vec3 deep = vec3(0.003, 0.003, 0.008);

            // Single very faint nebula wisp — barely visible
            float t = uTime * 0.015;
            float n1 = snoise(vec3(p * 1.5, t)) * 0.5 + 0.5;
            vec3 nebula = vec3(0.005, 0.005, 0.015) * smoothstep(0.4, 0.8, n1);

            vec3 color = deep + nebula;

            // Vignette to pure black at edges
            float vig = 1.0 - length(uv - 0.5) * 1.2;
            vig = max(vig, 0.0);
            color *= vig;

            gl_FragColor = vec4(color, 1.0);
        }
    `,
    depthTest: false,
    depthWrite: false
});

const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nebulaMat);
bgScene.add(bgQuad);

// Starfield — 3 layers at different depths
function createStarLayer(count, radius, sizeMin, sizeMax) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const brightnesses = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius + (Math.random() - 0.5) * radius * 0.4;
        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        sizes[i] = sizeMin + Math.random() * (sizeMax - sizeMin);
        phases[i] = Math.random() * Math.PI * 2;
        brightnesses[i] = 0.3 + Math.random() * 0.7;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aBright', new THREE.BufferAttribute(brightnesses, 1));
    return geo;
}

const starMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 }
    },
    vertexShader: `
        uniform float uTime;
        attribute float aSize;
        attribute float aPhase;
        attribute float aBright;
        varying float vAlpha;
        varying float vBright;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            // Twinkle
            float twinkle = sin(uTime * (1.0 + aPhase * 0.5) + aPhase) * 0.5 + 0.5;
            twinkle = mix(0.4, 1.0, twinkle);

            gl_PointSize = aSize * twinkle * (300.0 / -mvPosition.z);
            vAlpha = twinkle;
            vBright = aBright;
        }
    `,
    fragmentShader: `
        varying float vAlpha;
        varying float vBright;

        void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);
            if (dist > 0.5) discard;

            // Bright core + soft halo
            float core = exp(-dist * dist * 80.0);
            float halo = exp(-dist * dist * 8.0) * 0.3;
            float star = core + halo;

            // Cold white, no color
            vec3 color = vec3(0.85, 0.87, 0.9);

            gl_FragColor = vec4(color * star, star * vAlpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

// Layer 1: distant faint dust
const stars1 = new THREE.Points(createStarLayer(1200, 45, 0.15, 0.4), starMat);
scene.add(stars1);
// Layer 2: sparse mid stars
const stars2 = new THREE.Points(createStarLayer(200, 30, 0.3, 0.8), starMat);
scene.add(stars2);
// Layer 3: rare bright pinpoints
const stars3 = new THREE.Points(createStarLayer(30, 18, 0.6, 1.5), starMat);
scene.add(stars3);

// Shooting stars
const shootingStarCount = 4;
const ssPositions = new Float32Array(shootingStarCount * 6); // line segments: 2 verts each
const ssAlphas = new Float32Array(shootingStarCount * 2);
const ssGeo = new THREE.BufferGeometry();
ssGeo.setAttribute('position', new THREE.BufferAttribute(ssPositions, 3));
ssGeo.setAttribute('aAlpha', new THREE.BufferAttribute(ssAlphas, 1));

const ssMat = new THREE.ShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(0.4, 0.42, 0.45) }
    },
    vertexShader: `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
            vAlpha = aAlpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
            gl_FragColor = vec4(uColor, vAlpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const shootingStars = new THREE.LineSegments(ssGeo, ssMat);
scene.add(shootingStars);

// Shooting star state
const ssState = [];
for (let i = 0; i < shootingStarCount; i++) {
    ssState.push({
        active: false,
        timer: Math.random() * 20 + 5, // staggered start
        life: 0,
        maxLife: 0,
        origin: new THREE.Vector3(),
        dir: new THREE.Vector3()
    });
}

function updateShootingStars(t, dt) {
    const pos = ssGeo.attributes.position.array;
    const alp = ssGeo.attributes.aAlpha.array;

    for (let i = 0; i < shootingStarCount; i++) {
        const s = ssState[i];

        if (!s.active) {
            s.timer -= dt;
            if (s.timer <= 0) {
                // Launch
                s.active = true;
                s.life = 0;
                s.maxLife = 0.4 + Math.random() * 0.6;

                // Random position on a large sphere
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 12 + Math.random() * 8;
                s.origin.set(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );

                // Random direction with slight downward bias
                s.dir.set(
                    (Math.random() - 0.5) * 2,
                    -0.5 - Math.random(),
                    (Math.random() - 0.5) * 2
                ).normalize().multiplyScalar(15 + Math.random() * 10);
            }

            // Hide
            const idx = i * 6;
            pos[idx] = pos[idx+1] = pos[idx+2] = 0;
            pos[idx+3] = pos[idx+4] = pos[idx+5] = 0;
            alp[i * 2] = 0;
            alp[i * 2 + 1] = 0;
            continue;
        }

        s.life += dt;
        const progress = s.life / s.maxLife;

        if (progress >= 1.0) {
            s.active = false;
            s.timer = 3 + Math.random() * 15;
            const idx = i * 6;
            pos[idx] = pos[idx+1] = pos[idx+2] = 0;
            pos[idx+3] = pos[idx+4] = pos[idx+5] = 0;
            alp[i * 2] = 0;
            alp[i * 2 + 1] = 0;
            continue;
        }

        // Head position
        const head = s.origin.clone().add(s.dir.clone().multiplyScalar(progress));
        // Tail (slightly behind)
        const tailProgress = Math.max(0, progress - 0.15);
        const tail = s.origin.clone().add(s.dir.clone().multiplyScalar(tailProgress));

        const fade = progress < 0.3 ? progress / 0.3 : 1.0 - (progress - 0.3) / 0.7;

        const idx = i * 6;
        pos[idx]     = tail.x; pos[idx+1] = tail.y; pos[idx+2] = tail.z;
        pos[idx+3]   = head.x; pos[idx+4] = head.y; pos[idx+5] = head.z;
        alp[i * 2]     = fade * 0.15;  // tail dim
        alp[i * 2 + 1] = fade * 0.8;   // head bright
    }

    ssGeo.attributes.position.needsUpdate = true;
    ssGeo.attributes.aAlpha.needsUpdate = true;
}

// 2. GRID SPHERE (main element)
const gridGeo = new THREE.SphereGeometry(1.0, 128, 128);
const gridMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uGridDensity: { value: params.gridDensity },
        uLineWidth: { value: params.lineWidth },
        uLineGlow: { value: params.lineGlow },
        uColor: { value: new THREE.Color(params.gridColor) },
        uAccent: { value: new THREE.Color(params.gridAccent) },
        uBrightness: { value: params.gridBrightness },
        uScanSpeed: { value: params.scanSpeed },
        uScanWidth: { value: params.scanWidth },
        uScanIntensity: { value: params.scanIntensity }
    },
    vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
            vPosition = position;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        #define PI 3.14159265359

        uniform float uTime;
        uniform float uGridDensity;
        uniform float uLineWidth;
        uniform float uLineGlow;
        uniform vec3 uColor;
        uniform vec3 uAccent;
        uniform float uBrightness;
        uniform float uScanSpeed;
        uniform float uScanWidth;
        uniform float uScanIntensity;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        ${noiseFunctions}

        void main() {
            // Spherical coordinates
            vec3 p = normalize(vPosition);
            float theta = atan(p.z, p.x);          // longitude [-PI, PI]
            float phi = acos(clamp(p.y, -1.0, 1.0)); // latitude [0, PI]

            // Grid lines — latitude and longitude
            float latLines = abs(fract(phi * uGridDensity / PI) - 0.5) * 2.0;
            float lonLines = abs(fract(theta * uGridDensity / (2.0 * PI)) - 0.5) * 2.0;

            // Anti-aliased lines with glow falloff
            float latLine = 1.0 - smoothstep(0.0, uLineWidth, latLines);
            float lonLine = 1.0 - smoothstep(0.0, uLineWidth, lonLines);

            // Softer outer glow around lines
            float latGlow = 1.0 - smoothstep(0.0, uLineWidth * uLineGlow, latLines);
            float lonGlow = 1.0 - smoothstep(0.0, uLineWidth * uLineGlow, lonLines);

            // Combine — crisp lines + soft glow
            float grid = max(latLine, lonLine);
            float glow = max(latGlow, lonGlow) * 0.3;

            // Intersection nodes — brighter where lines cross
            float intersection = latLine * lonLine;

            // Animated scan line sweeping vertically
            float scanPos = fract(uTime * uScanSpeed);
            float scanDist = abs(phi / PI - scanPos);
            scanDist = min(scanDist, 1.0 - scanDist); // wrap
            float scan = (1.0 - smoothstep(0.0, uScanWidth, scanDist)) * uScanIntensity;

            // Horizontal data pulse traveling along longitude lines
            float pulse = sin(theta * 8.0 + uTime * 3.0) * 0.5 + 0.5;
            pulse *= latLine * 0.4;

            // Subtle noise shimmer on the grid
            float shimmer = snoise(vPosition * 10.0 + uTime * 0.5) * 0.15 + 0.85;

            // Color composition
            vec3 baseColor = uColor * shimmer;
            vec3 accentColor = uAccent;

            vec3 color = baseColor * (grid + glow);
            color += accentColor * intersection * 2.0;  // bright nodes
            color += accentColor * scan * 0.6;           // scan sweep
            color += baseColor * pulse;                  // data pulse

            // Fresnel edge highlight
            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
            color += uColor * fresnel * 0.3;

            // Alpha: visible on grid lines, transparent between
            float alpha = grid + glow + intersection * 0.5 + scan * 0.2 + fresnel * 0.15;
            alpha = clamp(alpha, 0.0, 1.0);

            gl_FragColor = vec4(color * uBrightness, alpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
});

const gridMesh = new THREE.Mesh(gridGeo, gridMat);
mainGroup.add(gridMesh);


// 3. OUTER SHELL (subtle fresnel edge)
const shellGeo = new THREE.SphereGeometry(1.02, 64, 64);
const shellMat = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
            float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewPosition)), 4.0);
            gl_FragColor = vec4(uColor, fresnel * uOpacity);
        }
    `,
    uniforms: {
        uColor: { value: new THREE.Color(params.shellColor) },
        uOpacity: { value: params.shellOpacity }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false
});
mainGroup.add(new THREE.Mesh(shellGeo, shellMat));


// 4. NODE PARTICLES — placed at grid intersections on the sphere surface
const nodeCount = 400;
const nodePos = new Float32Array(nodeCount * 3);
const nodeSizes = new Float32Array(nodeCount);
const nodePhases = new Float32Array(nodeCount);

for (let i = 0; i < nodeCount; i++) {
    // Distribute on sphere surface at grid-like positions
    const latIdx = Math.floor(Math.random() * params.gridDensity);
    const lonIdx = Math.floor(Math.random() * params.gridDensity * 2);
    const phi = (latIdx / params.gridDensity) * Math.PI;
    const theta = (lonIdx / (params.gridDensity * 2)) * Math.PI * 2;

    const r = 1.0;
    nodePos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    nodePos[i * 3 + 1] = r * Math.cos(phi);
    nodePos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    nodeSizes[i] = 0.3 + Math.random() * 0.7;
    nodePhases[i] = Math.random() * Math.PI * 2;
}

const nodeGeo = new THREE.BufferGeometry();
nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nodeSizes, 1));
nodeGeo.setAttribute('aPhase', new THREE.BufferAttribute(nodePhases, 1));

const nodeMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(params.gridAccent) },
        uSize: { value: params.nodeSize },
        uPulse: { value: params.nodePulse }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform float uPulse;
        attribute float aSize;
        attribute float aPhase;
        varying float vAlpha;
        varying float vGlow;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            float pulse = sin(uTime * 2.0 + aPhase) * 0.5 + 0.5;
            float size = (6.0 * aSize + 3.0) * uSize;
            size *= 1.0 + pulse * uPulse * 0.5;
            gl_PointSize = size * (1.0 / -mvPosition.z);

            vAlpha = 0.5 + 0.5 * pulse;
            vGlow = aSize;
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        varying float vGlow;

        void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);
            if (dist > 0.5) discard;

            // Sharp center + soft glow
            float core = 1.0 - smoothstep(0.0, 0.15, dist);
            float glow = 1.0 - smoothstep(0.0, 0.5, dist);
            glow = pow(glow, 2.0);

            vec3 color = uColor * (core * 2.0 + glow);
            float alpha = (core + glow * 0.5) * vAlpha;

            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const nodes = new THREE.Points(nodeGeo, nodeMat);
mainGroup.add(nodes);


// 5. FLOATING DATA PARTICLES (sparse, inside sphere)
const pCount = 200;
const pPos = new Float32Array(pCount * 3);
const pSizes = new Float32Array(pCount);

for (let i = 0; i < pCount; i++) {
    const r = 0.9 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pPos[i * 3 + 2] = r * Math.cos(phi);
    pSizes[i] = Math.random();
}

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

const pMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00d4ff) }
    },
    vertexShader: `
        uniform float uTime;
        attribute float aSize;
        varying float vAlpha;

        void main() {
            vec3 pos = position;
            pos.y += sin(uTime * 0.3 + pos.x * 5.0) * 0.015;
            pos.x += cos(uTime * 0.2 + pos.z * 5.0) * 0.015;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            float baseSize = 4.0 * aSize + 2.0;
            gl_PointSize = baseSize * (1.0 / -mvPosition.z);

            vAlpha = 0.3 + 0.3 * sin(uTime * 1.5 + aSize * 12.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);
            if (dist > 0.5) discard;
            float glow = 1.0 - (dist * 2.0);
            glow = pow(glow, 2.5);
            gl_FragColor = vec4(uColor, glow * vAlpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const particles = new THREE.Points(pGeo, pMat);
mainGroup.add(particles);


// --- GUI ---
const gui = new GUI({ title: 'Settings' });

const folderGrid = gui.addFolder('Grid');
folderGrid.add(params, 'gridDensity', 6, 40, 1).name('Density').onChange(v => gridMat.uniforms.uGridDensity.value = v);
folderGrid.add(params, 'lineWidth', 0.01, 0.15).name('Line Width').onChange(v => gridMat.uniforms.uLineWidth.value = v);
folderGrid.add(params, 'lineGlow', 1.0, 6.0).name('Line Glow').onChange(v => gridMat.uniforms.uLineGlow.value = v);
folderGrid.add(params, 'gridBrightness', 0.5, 4.0).name('Brightness').onChange(v => gridMat.uniforms.uBrightness.value = v);
folderGrid.addColor(params, 'gridColor').name('Grid Color').onChange(v => gridMat.uniforms.uColor.value.set(v));
folderGrid.addColor(params, 'gridAccent').name('Accent Color').onChange(v => {
    gridMat.uniforms.uAccent.value.set(v);
    nodeMat.uniforms.uColor.value.set(v);
});

const folderScan = gui.addFolder('Scan');
folderScan.add(params, 'scanSpeed', 0.0, 2.0).name('Speed').onChange(v => gridMat.uniforms.uScanSpeed.value = v);
folderScan.add(params, 'scanWidth', 0.02, 0.5).name('Width').onChange(v => gridMat.uniforms.uScanWidth.value = v);
folderScan.add(params, 'scanIntensity', 0.0, 3.0).name('Intensity').onChange(v => gridMat.uniforms.uScanIntensity.value = v);

const folderShell = gui.addFolder('Shell');
folderShell.addColor(params, 'shellColor').name('Edge Color').onChange(v => shellMat.uniforms.uColor.value.set(v));
folderShell.add(params, 'shellOpacity', 0.0, 1.0).name('Edge Opacity').onChange(v => shellMat.uniforms.uOpacity.value = v);

const folderAnim = gui.addFolder('Animation');
folderAnim.add(params, 'timeScale', 0.0, 2.0).name('Time Scale');
folderAnim.add(params, 'rotationSpeedX', -0.01, 0.01).name('Rotation X');
folderAnim.add(params, 'rotationSpeedY', -0.01, 0.01).name('Rotation Y');

const folderNodes = gui.addFolder('Nodes');
folderNodes.add(params, 'nodeSize', 0.1, 3.0).name('Size').onChange(v => nodeMat.uniforms.uSize.value = v);
folderNodes.add(params, 'nodePulse', 0.0, 2.0).name('Pulse').onChange(v => nodeMat.uniforms.uPulse.value = v);


// --- NODE INTERACTION (click to focus) ---
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.06;
const mouse = new THREE.Vector2();

// Focus state
let focusedNodeIndex = -1;
let isFocusing = false;
let focusAnimProgress = 1; // 1 = done
const focusFrom = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
const focusTo = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
const unfocusedCamPos = new THREE.Vector3();
const unfocusedTarget = new THREE.Vector3();
const FOCUS_DURATION = 0.8; // seconds
let focusAnimTime = 0;

// Focus ring — a small ring mesh that orbits the selected node
const ringGeo = new THREE.RingGeometry(0.04, 0.055, 32);
const ringMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(params.gridAccent) },
        uOpacity: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
            float pulse = sin(uTime * 4.0) * 0.2 + 0.8;
            gl_FragColor = vec4(uColor * 1.5, uOpacity * pulse);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
});
const focusRing = new THREE.Mesh(ringGeo, ringMat);
focusRing.visible = false;
mainGroup.add(focusRing);

// Second outer ring, slower counter-rotation
const ringGeo2 = new THREE.RingGeometry(0.06, 0.07, 32);
const ringMat2 = ringMat.clone();
ringMat2.uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(params.gridColor) },
    uOpacity: { value: 0.0 }
};
const focusRing2 = new THREE.Mesh(ringGeo2, ringMat2);
focusRing2.visible = false;
mainGroup.add(focusRing2);

// Node label
const labelEl = document.createElement('div');
labelEl.className = 'node-label';
labelEl.style.display = 'none';
document.body.appendChild(labelEl);

// Easing
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getNodeWorldPos(index) {
    const pos = nodeGeo.attributes.position;
    const local = new THREE.Vector3(pos.getX(index), pos.getY(index), pos.getZ(index));
    return local.applyMatrix4(nodes.matrixWorld);
}

function focusNode(index) {
    if (index === focusedNodeIndex) return;

    focusedNodeIndex = index;
    isFocusing = true;
    focusAnimTime = 0;

    // Save current camera state as "from"
    focusFrom.pos.copy(camera.position);
    focusFrom.target.copy(controls.target);

    // Save unfocused state only when first focusing
    if (!unfocusedCamPos.lengthSq()) {
        unfocusedCamPos.copy(camera.position);
        unfocusedTarget.copy(controls.target);
    }

    // Compute target: camera looks at node, positioned offset along the node's normal
    const worldPos = getNodeWorldPos(index);
    const normal = worldPos.clone().normalize();
    focusTo.target.copy(worldPos);
    focusTo.pos.copy(worldPos).add(normal.multiplyScalar(0.6));

    // Show ring + label
    focusRing.visible = true;
    focusRing2.visible = true;
    ringMat.uniforms.uOpacity.value = 1.0;
    ringMat2.uniforms.uOpacity.value = 1.0;
    labelEl.style.display = 'block';

    // Generate node info
    const phi = Math.acos(worldPos.y / worldPos.length());
    const theta = Math.atan2(worldPos.z, worldPos.x);
    const latDeg = ((Math.PI / 2 - phi) * 180 / Math.PI).toFixed(1);
    const lonDeg = (theta * 180 / Math.PI).toFixed(1);
    labelEl.innerHTML = `
        <div class="node-label-header">NODE ${index.toString().padStart(3, '0')}</div>
        <div class="node-label-row"><span>LAT</span><span>${latDeg}&deg;</span></div>
        <div class="node-label-row"><span>LON</span><span>${lonDeg}&deg;</span></div>
        <div class="node-label-row"><span>SIG</span><span>${(nodeSizes[index] * 100).toFixed(0)}%</span></div>
        <div class="node-label-status">ACTIVE</div>
    `;
}

function unfocusNode() {
    if (focusedNodeIndex === -1) return;

    focusedNodeIndex = -1;
    isFocusing = true;
    focusAnimTime = 0;

    focusFrom.pos.copy(camera.position);
    focusFrom.target.copy(controls.target);
    focusTo.pos.copy(unfocusedCamPos);
    focusTo.target.copy(unfocusedTarget);

    // Fade out ring + label
    focusRing.visible = false;
    focusRing2.visible = false;
    ringMat.uniforms.uOpacity.value = 0.0;
    ringMat2.uniforms.uOpacity.value = 0.0;
    labelEl.style.display = 'none';
}

function updateFocusAnimation(dt) {
    if (!isFocusing) return;

    focusAnimTime += dt;
    const t = Math.min(focusAnimTime / FOCUS_DURATION, 1.0);
    const e = easeInOutCubic(t);

    camera.position.lerpVectors(focusFrom.pos, focusTo.pos, e);
    controls.target.lerpVectors(focusFrom.target, focusTo.target, e);

    if (t >= 1.0) {
        isFocusing = false;
    }
}

function updateFocusRing(t) {
    if (focusedNodeIndex === -1) return;

    const worldPos = getNodeWorldPos(focusedNodeIndex);
    const normal = worldPos.clone().normalize();

    // Position rings at node
    focusRing.position.copy(worldPos.clone().sub(mainGroup.position));
    focusRing2.position.copy(focusRing.position);

    // Orient rings to face outward from sphere center
    focusRing.lookAt(focusRing.position.clone().add(normal));
    focusRing2.lookAt(focusRing2.position.clone().add(normal));

    // Spin rings
    focusRing.rotateZ(t * 0.5);
    focusRing2.rotateZ(-t * 0.3);

    ringMat.uniforms.uTime.value = t;
    ringMat2.uniforms.uTime.value = t;

    // Update label screen position
    const screenPos = worldPos.clone().project(camera);
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
    labelEl.style.left = (x + 20) + 'px';
    labelEl.style.top = (y - 40) + 'px';
}

// Click handler
renderer.domElement.addEventListener('click', (e) => {
    // Ignore if over GUI
    if (e.target !== renderer.domElement) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(nodes);

    if (hits.length > 0) {
        focusNode(hits[0].index);
    } else {
        unfocusNode();
    }
});

// Escape to unfocus
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') unfocusNode();
});

// Cursor hint
renderer.domElement.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(nodes);
    renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : '';
});


// --- TOGGLE BUTTON ---
const toggle = document.createElement('button');
toggle.className = 'gui-toggle';
toggle.innerHTML = '&#9881;';
toggle.title = 'Toggle Settings (S)';
document.body.appendChild(toggle);

const guiRoot = gui.domElement;
let guiVisible = true;

function toggleGui() {
    guiVisible = !guiVisible;
    guiRoot.classList.toggle('hidden', !guiVisible);
}

toggle.addEventListener('click', toggleGui);
window.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') {
        if (e.target.tagName === 'INPUT') return;
        toggleGui();
    }
});

// 6. ANIMATION LOOP
const clock = new THREE.Clock();

let lastTime = 0;

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = t - lastTime;
    lastTime = t;

    // Update uniforms
    nebulaMat.uniforms.uTime.value = t;
    starMat.uniforms.uTime.value = t;
    gridMat.uniforms.uTime.value = t * params.timeScale;
    nodeMat.uniforms.uTime.value = t * params.timeScale;
    pMat.uniforms.uTime.value = t;

    // Shooting stars
    updateShootingStars(t, dt);

    // Slow star rotation for parallax depth
    stars1.rotation.y = t * 0.001;
    stars2.rotation.y = t * 0.002;
    stars3.rotation.y = t * 0.003;

    gridMesh.rotation.y = t * 0.01;

    // Pause auto-rotation while focused
    if (focusedNodeIndex === -1 && !isFocusing) {
        mainGroup.rotation.x += params.rotationSpeedX;
        mainGroup.rotation.y += params.rotationSpeedY;
    }

    // Node focus animation
    updateFocusAnimation(dt);
    updateFocusRing(t);

    controls.update();

    // Render: background first, then main scene on top
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    nebulaMat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

animate();
