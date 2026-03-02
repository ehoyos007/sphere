import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';


// ============================================================
// PROJECT DATA
// ============================================================
const STORAGE_KEY = 'sphere-projects';

const SAMPLE_PROJECTS = [
    {
        id: 'proj-1', name: 'Website Redesign', color: '#00d4ff', status: 'active',
        tasks: [
            { id: 't1-1', title: 'Design homepage mockup', completed: true },
            { id: 't1-2', title: 'Set up repository', completed: true },
            { id: 't1-3', title: 'Build landing page', completed: false },
            { id: 't1-4', title: 'Implement responsive nav', completed: false },
            { id: 't1-5', title: 'Deploy to staging', completed: false }
        ]
    },
    {
        id: 'proj-2', name: 'Mobile App', color: '#00ffe1', status: 'active',
        tasks: [
            { id: 't2-1', title: 'Set up React Native project', completed: true },
            { id: 't2-2', title: 'Design onboarding flow', completed: true },
            { id: 't2-3', title: 'Build auth screens', completed: true },
            { id: 't2-4', title: 'Implement push notifications', completed: false },
            { id: 't2-5', title: 'App Store submission', completed: false }
        ]
    },
    {
        id: 'proj-3', name: 'API Gateway', color: '#a78bfa', status: 'active',
        tasks: [
            { id: 't3-1', title: 'Define OpenAPI spec', completed: true },
            { id: 't3-2', title: 'Set up rate limiting', completed: false },
            { id: 't3-3', title: 'Implement auth middleware', completed: false },
            { id: 't3-4', title: 'Add logging & monitoring', completed: false }
        ]
    },
    {
        id: 'proj-4', name: 'Design System', color: '#f472b6', status: 'active',
        tasks: [
            { id: 't4-1', title: 'Define color tokens', completed: true },
            { id: 't4-2', title: 'Build button component', completed: true },
            { id: 't4-3', title: 'Build input components', completed: true },
            { id: 't4-4', title: 'Create icon library', completed: false },
            { id: 't4-5', title: 'Write documentation', completed: false },
            { id: 't4-6', title: 'Publish to npm', completed: false }
        ]
    },
    {
        id: 'proj-5', name: 'Data Pipeline', color: '#fb923c', status: 'active',
        tasks: [
            { id: 't5-1', title: 'Set up Kafka cluster', completed: true },
            { id: 't5-2', title: 'Build ETL jobs', completed: false },
            { id: 't5-3', title: 'Configure data warehouse', completed: false },
            { id: 't5-4', title: 'Create dashboards', completed: false }
        ]
    },
    {
        id: 'proj-6', name: 'CI/CD Pipeline', color: '#4ade80', status: 'completed',
        tasks: [
            { id: 't6-1', title: 'Set up GitHub Actions', completed: true },
            { id: 't6-2', title: 'Configure Docker builds', completed: true },
            { id: 't6-3', title: 'Add automated tests', completed: true },
            { id: 't6-4', title: 'Deploy to production', completed: true }
        ]
    },
    {
        id: 'proj-7', name: 'User Analytics', color: '#facc15', status: 'active',
        tasks: [
            { id: 't7-1', title: 'Integrate tracking SDK', completed: true },
            { id: 't7-2', title: 'Define event schema', completed: true },
            { id: 't7-3', title: 'Build funnel reports', completed: false },
            { id: 't7-4', title: 'Set up A/B testing', completed: false },
            { id: 't7-5', title: 'Create retention dashboard', completed: false }
        ]
    },
    {
        id: 'proj-8', name: 'Security Audit', color: '#f87171', status: 'active',
        tasks: [
            { id: 't8-1', title: 'Run dependency scan', completed: true },
            { id: 't8-2', title: 'Pen test API endpoints', completed: false },
            { id: 't8-3', title: 'Review auth flows', completed: false },
            { id: 't8-4', title: 'Fix critical issues', completed: false }
        ]
    },
    {
        id: 'proj-9', name: 'Performance Opt', color: '#38bdf8', status: 'active',
        tasks: [
            { id: 't9-1', title: 'Profile slow queries', completed: true },
            { id: 't9-2', title: 'Add Redis caching', completed: true },
            { id: 't9-3', title: 'Optimize bundle size', completed: false },
            { id: 't9-4', title: 'Implement lazy loading', completed: false }
        ]
    },
    {
        id: 'proj-10', name: 'Documentation', color: '#c084fc', status: 'active',
        tasks: [
            { id: 't10-1', title: 'Write API reference', completed: true },
            { id: 't10-2', title: 'Create getting started guide', completed: true },
            { id: 't10-3', title: 'Add code examples', completed: true },
            { id: 't10-4', title: 'Build docs site', completed: false }
        ]
    }
];

function loadProjects() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try { return JSON.parse(stored); } catch (e) { /* fall through */ }
    }
    saveProjects(SAMPLE_PROJECTS);
    return SAMPLE_PROJECTS;
}

function saveProjects(projects) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function getProjectCompletion(project) {
    if (!project.tasks.length) return 0;
    const done = project.tasks.filter(t => t.completed).length;
    return done / project.tasks.length;
}

let projects = loadProjects();


// ============================================================
// CONFIGURATION
// ============================================================
const params = {
    // Animation
    timeScale: 0.6,
    rotationSpeedX: 0.0003,
    rotationSpeedY: 0.0008,

    // Grid
    gridDensity: 8.0,
    lineWidth: 0.035,
    lineGlow: 1.0,
    gridColor: 0x00d4ff,
    gridAccent: 0x00ffe1,
    gridBrightness: 1.6,

    // Scan
    scanSpeed: 0.0,
    scanWidth: 0.02,
    scanIntensity: 0.0,

    // Shell
    shellColor: 0x00aaff,
    shellOpacity: 0.25,

    // Nodes
    nodeSize: 2.5,
    nodePulse: 0.8,

    // Bloom
    bloomStrength: 0.0,
    bloomRadius: 0.1,
    bloomThreshold: 1.0,

    // Halo
    haloIntensity: 0.0
};


// ============================================================
// SCENE SETUP
// ============================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 2.8;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 0.5;
controls.maxDistance = 20;

const mainGroup = new THREE.Group();
mainGroup.scale.setScalar(0);
scene.add(mainGroup);


// ============================================================
// GLSL NOISE
// ============================================================
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


// ============================================================
// SPACE BACKGROUND
// ============================================================
const bgScene = new THREE.Scene();
const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bgDpr = Math.min(window.devicePixelRatio, 2);
const bgTarget = new THREE.WebGLRenderTarget(
    Math.floor(window.innerWidth * bgDpr),
    Math.floor(window.innerHeight * bgDpr)
);

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

            vec3 deep = vec3(0.003, 0.003, 0.008);
            float t = uTime * 0.015;
            float n1 = snoise(vec3(p * 1.8, t)) * 0.5 + 0.5;
            float n2 = snoise(vec3(p * 3.5 + 100.0, t * 0.7)) * 0.5 + 0.5;
            float n3 = snoise(vec3(p * 6.0 + 200.0, t * 0.5)) * 0.5 + 0.5;

            vec3 nebula1 = vec3(0.008, 0.004, 0.025) * smoothstep(0.32, 0.72, n1);
            vec3 nebula2 = vec3(0.003, 0.01, 0.016) * smoothstep(0.38, 0.78, n2);
            vec3 nebula3 = vec3(0.004, 0.002, 0.012) * smoothstep(0.42, 0.82, n3);
            vec3 color = deep + nebula1 + nebula2 + nebula3;

            float vig = 1.0 - length(uv - 0.5) * 1.2;
            color *= max(vig, 0.0);

            gl_FragColor = vec4(color, 1.0);
        }
    `,
    depthTest: false,
    depthWrite: false
});

bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), nebulaMat));


// ============================================================
// STARFIELD
// ============================================================
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
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
        uniform float uTime;
        attribute float aSize;
        attribute float aPhase;
        attribute float aBright;
        varying float vAlpha;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            float twinkle = sin(uTime * (1.0 + aPhase * 0.5) + aPhase) * 0.5 + 0.5;
            twinkle = mix(0.4, 1.0, twinkle);
            gl_PointSize = aSize * twinkle * (300.0 / -mvPosition.z);
            vAlpha = twinkle * aBright;
        }
    `,
    fragmentShader: `
        varying float vAlpha;
        void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);
            if (dist > 0.5) discard;
            float core = exp(-dist * dist * 80.0);
            float halo = exp(-dist * dist * 8.0) * 0.3;
            float star = core + halo;
            vec3 color = vec3(0.85, 0.87, 0.9);
            gl_FragColor = vec4(color * star, star * vAlpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const stars1 = new THREE.Points(createStarLayer(1200, 45, 0.15, 0.4), starMat);
const stars2 = new THREE.Points(createStarLayer(200, 30, 0.3, 0.8), starMat);
const stars3 = new THREE.Points(createStarLayer(30, 18, 0.6, 1.5), starMat);
scene.add(stars1, stars2, stars3);


// ============================================================
// SHOOTING STARS
// ============================================================
const shootingStarCount = 4;
const ssPositions = new Float32Array(shootingStarCount * 6);
const ssAlphas = new Float32Array(shootingStarCount * 2);
const ssGeo = new THREE.BufferGeometry();
ssGeo.setAttribute('position', new THREE.BufferAttribute(ssPositions, 3));
ssGeo.setAttribute('aAlpha', new THREE.BufferAttribute(ssAlphas, 1));

const ssMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0.4, 0.42, 0.45) } },
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
        void main() { gl_FragColor = vec4(uColor, vAlpha); }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const shootingStars = new THREE.LineSegments(ssGeo, ssMat);
scene.add(shootingStars);

const ssState = [];
for (let i = 0; i < shootingStarCount; i++) {
    ssState.push({
        active: false,
        timer: Math.random() * 20 + 5,
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
                s.active = true;
                s.life = 0;
                s.maxLife = 0.4 + Math.random() * 0.6;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = 12 + Math.random() * 8;
                s.origin.set(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );
                s.dir.set(
                    (Math.random() - 0.5) * 2,
                    -0.5 - Math.random(),
                    (Math.random() - 0.5) * 2
                ).normalize().multiplyScalar(15 + Math.random() * 10);
            }
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

        const head = s.origin.clone().add(s.dir.clone().multiplyScalar(progress));
        const tailProgress = Math.max(0, progress - 0.15);
        const tail = s.origin.clone().add(s.dir.clone().multiplyScalar(tailProgress));
        const fade = progress < 0.3 ? progress / 0.3 : 1.0 - (progress - 0.3) / 0.7;

        const idx = i * 6;
        pos[idx]   = tail.x; pos[idx+1] = tail.y; pos[idx+2] = tail.z;
        pos[idx+3] = head.x; pos[idx+4] = head.y; pos[idx+5] = head.z;
        alp[i * 2]     = fade * 0.15;
        alp[i * 2 + 1] = fade * 0.8;
    }

    ssGeo.attributes.position.needsUpdate = true;
    ssGeo.attributes.aAlpha.needsUpdate = true;
}


// ============================================================
// GRID SPHERE
// ============================================================
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
        uScanIntensity: { value: params.scanIntensity },
        uPulseOrigin: { value: new THREE.Vector3(0, 1, 0) },
        uPulseTime: { value: -1.0 }
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
        uniform vec3 uPulseOrigin;
        uniform float uPulseTime;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        ${noiseFunctions}

        void main() {
            vec3 p = normalize(vPosition);
            float theta = atan(p.z, p.x);
            float phi = acos(clamp(p.y, -1.0, 1.0));

            float latLines = abs(fract(phi * uGridDensity / PI) - 0.5) * 2.0;
            float lonLines = abs(fract(theta * uGridDensity / (2.0 * PI)) - 0.5) * 2.0;

            float latLine = 1.0 - smoothstep(0.0, uLineWidth, latLines);
            float lonLine = 1.0 - smoothstep(0.0, uLineWidth, lonLines);
            float latGlow = 1.0 - smoothstep(0.0, uLineWidth * uLineGlow, latLines);
            float lonGlow = 1.0 - smoothstep(0.0, uLineWidth * uLineGlow, lonLines);

            float grid = max(latLine, lonLine);
            float glow = max(latGlow, lonGlow) * 0.3;
            float intersection = latLine * lonLine;

            float scanPos = fract(uTime * uScanSpeed);
            float scanDist = abs(phi / PI - scanPos);
            scanDist = min(scanDist, 1.0 - scanDist);
            float scan = (1.0 - smoothstep(0.0, uScanWidth, scanDist)) * uScanIntensity;

            float pulse = sin(theta * 8.0 + uTime * 3.0) * 0.5 + 0.5;
            pulse *= latLine * 0.4;

            float shimmer = snoise(vPosition * 10.0 + uTime * 0.5) * 0.15 + 0.85;

            vec3 baseColor = uColor * shimmer;
            vec3 color = baseColor * (grid + glow);
            color += uAccent * intersection * 2.0;
            color += uAccent * scan * 0.6;
            color += baseColor * pulse;

            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
            color += uColor * fresnel * 0.3;

            float alpha = grid + glow + intersection * 0.5 + scan * 0.2 + fresnel * 0.15;

            if (uPulseTime >= 0.0 && uPulseTime < 2.0) {
                float angDist = acos(clamp(dot(p, uPulseOrigin), -1.0, 1.0));
                float pulseRadius = uPulseTime * 2.5;
                float pulseRing = 1.0 - smoothstep(0.0, 0.12, abs(angDist - pulseRadius));
                float pulseFade = exp(-uPulseTime * 1.5);
                color += uAccent * pulseRing * pulseFade * 3.0;
                alpha += pulseRing * pulseFade * 0.4;
            }

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


// ============================================================
// OUTER SHELL
// ============================================================
const shellMat = new THREE.ShaderMaterial({
    uniforms: {
        uColor: { value: new THREE.Color(params.shellColor) },
        uOpacity: { value: params.shellOpacity }
    },
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
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false
});
mainGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64), shellMat));


// ============================================================
// ATMOSPHERIC HALO
// ============================================================
const haloMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(params.gridColor) },
        uIntensity: { value: params.haloIntensity }
    },
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
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 5.0);
            float breath = 0.8 + 0.2 * sin(uTime * 0.5);
            gl_FragColor = vec4(uColor, fresnel * uIntensity * breath);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
});
mainGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), haloMat));


// ============================================================
// PROJECT NODES — golden angle distribution on sphere
// ============================================================
const nodeCount = projects.length;
const nodePos = new Float32Array(nodeCount * 3);
const nodeSizes = new Float32Array(nodeCount);
const nodePhases = new Float32Array(nodeCount);
const nodeColors = new Float32Array(nodeCount * 3);

function placeProjectNodes() {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < nodeCount; i++) {
        // Golden angle distribution for even spacing
        const y = 1 - (i / (nodeCount - 1)) * 2; // -1 to 1
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;

        nodePos[i * 3]     = radiusAtY * Math.cos(theta);
        nodePos[i * 3 + 1] = y;
        nodePos[i * 3 + 2] = radiusAtY * Math.sin(theta);

        // Size encodes completion (0.4 base + 0.6 * completion)
        const completion = getProjectCompletion(projects[i]);
        nodeSizes[i] = 0.4 + completion * 0.6;
        nodePhases[i] = Math.random() * Math.PI * 2;

        // Per-node color
        const col = new THREE.Color(projects[i].color);
        nodeColors[i * 3]     = col.r;
        nodeColors[i * 3 + 1] = col.g;
        nodeColors[i * 3 + 2] = col.b;
    }
}

placeProjectNodes();

const nodeGeo = new THREE.BufferGeometry();
nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nodeSizes, 1));
nodeGeo.setAttribute('aPhase', new THREE.BufferAttribute(nodePhases, 1));
const nodeHovers = new Float32Array(nodeCount);
nodeGeo.setAttribute('aColor', new THREE.BufferAttribute(nodeColors, 3));
nodeGeo.setAttribute('aHovered', new THREE.BufferAttribute(nodeHovers, 1));

const nodeMat = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uSize: { value: params.nodeSize },
        uPulse: { value: params.nodePulse }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform float uPulse;
        attribute float aSize;
        attribute float aPhase;
        attribute vec3 aColor;
        attribute float aHovered;
        varying float vAlpha;
        varying vec3 vColor;
        varying float vHover;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            float pulse = sin(uTime * 2.0 + aPhase) * 0.5 + 0.5;
            float size = (6.0 * aSize + 3.0) * uSize;
            size *= 1.0 + pulse * uPulse * 0.5;
            // Hover: smooth scale up
            size *= 1.0 + aHovered * 0.9;
            gl_PointSize = size * (1.0 / -mvPosition.z);
            vAlpha = 0.5 + 0.5 * pulse;
            vColor = aColor;
            vHover = aHovered;
        }
    `,
    fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        varying float vHover;
        void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);
            if (dist > 0.5) discard;

            // Bright core
            float core = 1.0 - smoothstep(0.0, 0.10, dist);
            // Soft glow falloff
            float glow = exp(-dist * dist * 10.0);
            // Orbital ring
            float ring = smoothstep(0.26, 0.30, dist) * (1.0 - smoothstep(0.33, 0.40, dist));
            // Outer haze
            float haze = exp(-dist * dist * 4.0) * 0.25;

            // Hover boost: brighter core + ring
            float hBoost = 1.0 + vHover * 0.7;

            vec3 color = vColor * (core * 2.5 + glow * 1.0 + ring * 1.8 + haze) * hBoost;
            float alpha = (core + glow * 0.5 + ring * 0.8 + haze) * vAlpha * hBoost;
            alpha = clamp(alpha, 0.0, 1.0);
            gl_FragColor = vec4(color, alpha);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const nodes = new THREE.Points(nodeGeo, nodeMat);
mainGroup.add(nodes);


// ============================================================
// FLOATING NODE LABELS
// ============================================================
const nodeLabels = [];
for (let i = 0; i < nodeCount; i++) {
    const label = document.createElement('div');
    label.className = 'node-floating-label';
    label.textContent = projects[i].name;
    label.dataset.color = projects[i].color;
    document.body.appendChild(label);
    nodeLabels.push(label);
}

function updateNodeLabels() {
    for (let i = 0; i < nodeCount; i++) {
        const worldPos = getNodeWorldPos(i);
        const screenPos = worldPos.clone().project(camera);

        // Hide if behind camera or during focus
        const behind = screenPos.z > 1;
        const hidden = behind || (focusedNodeIndex !== -1 && focusedNodeIndex !== i);

        if (hidden) {
            nodeLabels[i].style.opacity = '0';
            continue;
        }

        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        nodeLabels[i].style.left = x + 'px';
        nodeLabels[i].style.top = (y - 24) + 'px';

        // Depth-based opacity: closer = brighter
        const depthFade = THREE.MathUtils.smoothstep(screenPos.z, 0.98, 0.995);
        const baseOpacity = 1.0 - depthFade * 0.7;
        const isHovered = i === hoveredNodeIndex;
        const opacity = isHovered ? 1.0 : baseOpacity * 0.6;

        nodeLabels[i].style.opacity = String(opacity);
        nodeLabels[i].classList.toggle('hovered', isHovered);

        if (isHovered) {
            nodeLabels[i].style.color = projects[i].color;
        } else {
            nodeLabels[i].style.color = '';
        }
    }
}

function updateNodeHovers(dt) {
    const lerpSpeed = 12.0;
    const factor = Math.min(1, lerpSpeed * dt);
    for (let i = 0; i < nodeCount; i++) {
        const target = i === hoveredNodeIndex ? 1.0 : 0.0;
        nodeHovers[i] += (target - nodeHovers[i]) * factor;
    }
    nodeGeo.attributes.aHovered.needsUpdate = true;
}


// ============================================================
// POST-PROCESSING
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    params.bloomStrength,
    params.bloomRadius,
    params.bloomThreshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());


// ============================================================
// GUI — simplified for PM
// ============================================================
const gui = new GUI({ title: 'Settings' });

const folderAnim = gui.addFolder('Animation');
folderAnim.add(params, 'timeScale', 0.0, 2.0).name('Time Scale');
folderAnim.add(params, 'rotationSpeedX', -0.01, 0.01).name('Rotation X');
folderAnim.add(params, 'rotationSpeedY', -0.01, 0.01).name('Rotation Y');

const folderNodes = gui.addFolder('Nodes');
folderNodes.add(params, 'nodeSize', 0.1, 5.0).name('Size').onChange(v => nodeMat.uniforms.uSize.value = v);
folderNodes.add(params, 'nodePulse', 0.0, 2.0).name('Pulse').onChange(v => nodeMat.uniforms.uPulse.value = v);

const folderBloom = gui.addFolder('Bloom');
folderBloom.add(params, 'bloomStrength', 0.0, 3.0).name('Strength').onChange(v => bloomPass.strength = v);
folderBloom.add(params, 'bloomRadius', 0.0, 1.0).name('Radius').onChange(v => bloomPass.radius = v);
folderBloom.add(params, 'bloomThreshold', 0.0, 1.0).name('Threshold').onChange(v => bloomPass.threshold = v);


// ============================================================
// NODE INTERACTION
// ============================================================
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.12;
const mouse = new THREE.Vector2();

let focusedNodeIndex = -1;
let hoveredNodeIndex = -1;
let isFocusing = false;
let focusAnimProgress = 1;
const focusFrom = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
const focusTo = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
const unfocusedCamPos = new THREE.Vector3();
const unfocusedTarget = new THREE.Vector3();
const FOCUS_DURATION = 0.8;
let focusAnimTime = 0;
let pulseStartTime = -1;

// Focus rings
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
const focusRing = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.055, 32), ringMat);
focusRing.visible = false;
mainGroup.add(focusRing);

const ringMat2 = ringMat.clone();
ringMat2.uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(params.gridColor) },
    uOpacity: { value: 0.0 }
};
const focusRing2 = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.07, 32), ringMat2);
focusRing2.visible = false;
mainGroup.add(focusRing2);


// ============================================================
// PROJECT DETAIL PANEL
// ============================================================
const panelEl = document.getElementById('project-panel');
const panelName = document.getElementById('panel-name');
const panelStatus = document.getElementById('panel-status');
const panelPct = document.getElementById('panel-pct');
const panelBarFill = document.getElementById('panel-bar-fill');
const panelTasks = document.getElementById('panel-tasks');
const panelAddBtn = document.getElementById('panel-add-btn');
const panelAddInput = document.getElementById('panel-add-input');
const panelNewTask = document.getElementById('panel-new-task');
const panelDot = panelEl.querySelector('.project-panel-dot');

function openPanel(projectIndex) {
    const project = projects[projectIndex];
    if (!project) return;

    panelName.textContent = project.name;
    panelDot.style.color = project.color;
    panelName.style.color = project.color;
    panelStatus.textContent = project.status.toUpperCase();

    renderPanelTasks(projectIndex);
    updatePanelProgress(projectIndex);

    // Reset add-task UI
    panelAddBtn.style.display = '';
    panelAddInput.style.display = 'none';
    panelNewTask.value = '';

    panelEl.classList.add('open');
}

function closePanel() {
    panelEl.classList.remove('open');
}

function renderPanelTasks(projectIndex) {
    const project = projects[projectIndex];
    panelTasks.innerHTML = '';

    project.tasks.forEach((task, taskIdx) => {
        const item = document.createElement('div');
        item.className = 'task-item' + (task.completed ? ' completed' : '');

        const checkbox = document.createElement('div');
        checkbox.className = 'task-checkbox';
        checkbox.textContent = task.completed ? '\u2713' : '';

        const title = document.createElement('span');
        title.className = 'task-title';
        title.textContent = task.title;

        item.appendChild(checkbox);
        item.appendChild(title);

        item.addEventListener('click', () => {
            task.completed = !task.completed;
            saveProjects(projects);
            renderPanelTasks(projectIndex);
            updatePanelProgress(projectIndex);
            updateNodeSize(projectIndex);
            updateHudStats();
        });

        panelTasks.appendChild(item);
    });
}

function updatePanelProgress(projectIndex) {
    const completion = getProjectCompletion(projects[projectIndex]);
    const pct = Math.round(completion * 100);
    panelPct.textContent = pct + '%';
    panelBarFill.style.width = pct + '%';
}

function updateNodeSize(projectIndex) {
    const completion = getProjectCompletion(projects[projectIndex]);
    nodeSizes[projectIndex] = 0.4 + completion * 0.6;
    nodeGeo.attributes.aSize.needsUpdate = true;
}

// Add task button
panelAddBtn.addEventListener('click', () => {
    panelAddBtn.style.display = 'none';
    panelAddInput.style.display = '';
    panelNewTask.focus();
});

panelNewTask.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && panelNewTask.value.trim()) {
        const project = projects[focusedNodeIndex];
        if (!project) return;

        const newTask = {
            id: 't' + Date.now(),
            title: panelNewTask.value.trim(),
            completed: false
        };

        project.tasks.push(newTask);
        saveProjects(projects);
        renderPanelTasks(focusedNodeIndex);
        updatePanelProgress(focusedNodeIndex);
        updateNodeSize(focusedNodeIndex);
        updateHudStats();

        panelNewTask.value = '';
        panelNewTask.focus();
    } else if (e.key === 'Escape') {
        panelAddBtn.style.display = '';
        panelAddInput.style.display = 'none';
        panelNewTask.value = '';
    }
});


// ============================================================
// HUD DOM refs
// ============================================================
const hudFpsEl = document.getElementById('hud-fps');
const hudProjectsEl = document.getElementById('hud-projects');
const hudActiveEl = document.getElementById('hud-active');
const hudCompletionEl = document.getElementById('hud-completion');

function updateHudStats() {
    hudProjectsEl.textContent = projects.length;
    hudActiveEl.textContent = projects.filter(p => p.status === 'active').length;

    const totalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);
    const doneTasks = projects.reduce((sum, p) => sum + p.tasks.filter(t => t.completed).length, 0);
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    hudCompletionEl.textContent = pct + '%';
}

updateHudStats();


// ============================================================
// FOCUS / UNFOCUS
// ============================================================
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

    focusFrom.pos.copy(camera.position);
    focusFrom.target.copy(controls.target);

    if (!unfocusedCamPos.lengthSq()) {
        unfocusedCamPos.copy(camera.position);
        unfocusedTarget.copy(controls.target);
    }

    const worldPos = getNodeWorldPos(index);
    const normal = worldPos.clone().normalize();
    focusTo.target.copy(worldPos);
    focusTo.pos.copy(worldPos).add(normal.multiplyScalar(0.6));

    // Show rings
    focusRing.visible = true;
    focusRing2.visible = true;

    // Set ring color to project color
    const projColor = new THREE.Color(projects[index].color);
    ringMat.uniforms.uColor.value.copy(projColor);
    ringMat.uniforms.uOpacity.value = 1.0;
    ringMat2.uniforms.uOpacity.value = 1.0;

    // Trigger pulse wave
    const px = nodePos[index * 3];
    const py = nodePos[index * 3 + 1];
    const pz = nodePos[index * 3 + 2];
    gridMat.uniforms.uPulseOrigin.value.set(px, py, pz).normalize();
    pulseStartTime = clock.getElapsedTime();

    // Hide hover tooltip
    hoverTooltip.style.display = 'none';

    // Open project panel
    openPanel(index);
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

    focusRing.visible = false;
    focusRing2.visible = false;
    ringMat.uniforms.uOpacity.value = 0.0;
    ringMat2.uniforms.uOpacity.value = 0.0;

    closePanel();
}

function updateFocusAnimation(dt) {
    if (!isFocusing) return;
    focusAnimTime += dt;
    const t = Math.min(focusAnimTime / FOCUS_DURATION, 1.0);
    const e = easeInOutCubic(t);
    camera.position.lerpVectors(focusFrom.pos, focusTo.pos, e);
    controls.target.lerpVectors(focusFrom.target, focusTo.target, e);
    if (t >= 1.0) isFocusing = false;
}

function updateFocusRing(t) {
    if (focusedNodeIndex === -1) return;

    const worldPos = getNodeWorldPos(focusedNodeIndex);
    const normal = worldPos.clone().normalize();

    focusRing.position.copy(worldPos.clone().sub(mainGroup.position));
    focusRing2.position.copy(focusRing.position);

    focusRing.lookAt(focusRing.position.clone().add(normal));
    focusRing2.lookAt(focusRing2.position.clone().add(normal));

    focusRing.rotateZ(t * 0.5);
    focusRing2.rotateZ(-t * 0.3);

    ringMat.uniforms.uTime.value = t;
    ringMat2.uniforms.uTime.value = t;
}

// Click handler
renderer.domElement.addEventListener('click', (e) => {
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

// Close panel on ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') unfocusNode();
});

// Close panel when clicking outside
document.addEventListener('click', (e) => {
    if (focusedNodeIndex === -1) return;
    // Don't close if clicking the canvas (handled above) or the panel itself
    if (e.target === renderer.domElement) return;
    if (panelEl.contains(e.target)) return;
    unfocusNode();
});


// ============================================================
// HOVER TOOLTIP
// ============================================================
const hoverTooltip = document.getElementById('hover-tooltip');
const hoverIdEl = hoverTooltip.querySelector('.hover-tooltip-id');
const hoverSigEl = hoverTooltip.querySelector('.hover-tooltip-sig');

renderer.domElement.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(nodes);

    if (hits.length > 0 && focusedNodeIndex === -1) {
        const idx = hits[0].index;
        hoveredNodeIndex = idx;
        const project = projects[idx];
        const done = project.tasks.filter(t => t.completed).length;
        const total = project.tasks.length;

        hoverTooltip.style.display = 'block';
        hoverTooltip.style.left = (e.clientX + 15) + 'px';
        hoverTooltip.style.top = (e.clientY - 10) + 'px';
        hoverIdEl.textContent = project.name;
        hoverSigEl.textContent = `${done}/${total} tasks`;
        renderer.domElement.style.cursor = 'pointer';
    } else {
        hoveredNodeIndex = -1;
        hoverTooltip.style.display = 'none';
        renderer.domElement.style.cursor = '';
    }
});


// ============================================================
// SETTINGS TOGGLE
// ============================================================
const toggle = document.querySelector('.gui-toggle');
const guiRoot = gui.domElement;
let guiVisible = false;
guiRoot.classList.add('hidden');

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


// ============================================================
// HUD + FPS
// ============================================================
let fpsFrames = 0;
let fpsTime = 0;

function updateHud(dt) {
    fpsFrames++;
    fpsTime += dt;
    if (fpsTime >= 1.0) {
        hudFpsEl.textContent = Math.round(fpsFrames / fpsTime) + ' FPS';
        fpsFrames = 0;
        fpsTime = 0;
    }
}


// ============================================================
// ENTRY ANIMATION
// ============================================================
let entryProgress = 0;
const ENTRY_DURATION = 2.0;

function elasticOut(t) {
    return Math.sin(-13 * (t + 1) * Math.PI / 2) * Math.pow(2, -10 * t) + 1;
}


// ============================================================
// ANIMATION LOOP
// ============================================================
const clock = new THREE.Clock();
let lastTime = 0;

function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = t - lastTime;
    lastTime = t;

    // Entry animation
    if (entryProgress < 1) {
        entryProgress = Math.min(1, entryProgress + dt / ENTRY_DURATION);
        mainGroup.scale.setScalar(elasticOut(entryProgress));
    }

    // Update uniforms
    nebulaMat.uniforms.uTime.value = t;
    starMat.uniforms.uTime.value = t;
    gridMat.uniforms.uTime.value = t * params.timeScale;
    nodeMat.uniforms.uTime.value = t * params.timeScale;
    haloMat.uniforms.uTime.value = t;

    // Pulse wave
    const pulseElapsed = pulseStartTime >= 0 ? (t - pulseStartTime) : -1;
    gridMat.uniforms.uPulseTime.value = pulseElapsed > 2.0 ? -1 : pulseElapsed;

    // Shooting stars
    updateShootingStars(t, dt);

    // Star parallax rotation
    stars1.rotation.y = t * 0.001;
    stars2.rotation.y = t * 0.002;
    stars3.rotation.y = t * 0.003;

    gridMesh.rotation.y = t * 0.01;

    // Auto-rotation (paused during focus)
    if (focusedNodeIndex === -1 && !isFocusing) {
        mainGroup.rotation.x += params.rotationSpeedX;
        mainGroup.rotation.y += params.rotationSpeedY;
    }

    // Focus
    updateFocusAnimation(dt);
    updateFocusRing(t);

    // Node hover + labels
    updateNodeHovers(dt);
    if (entryProgress >= 1) updateNodeLabels();

    // HUD
    updateHud(dt);

    controls.update();

    // Render background
    renderer.setRenderTarget(bgTarget);
    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.setRenderTarget(null);
    scene.background = bgTarget.texture;

    // Post-processed render
    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    const resizeDpr = Math.min(window.devicePixelRatio, 2);
    bgTarget.setSize(
        Math.floor(window.innerWidth * resizeDpr),
        Math.floor(window.innerHeight * resizeDpr)
    );
    nebulaMat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
});

animate();
