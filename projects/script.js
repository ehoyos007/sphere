import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';


// ============================================================
// SUPABASE CONFIG
// ============================================================
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';
let isLive = false;

try {
    const config = await import('./config.js');
    SUPABASE_URL = config.SUPABASE_URL;
    SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
    if (SUPABASE_URL && SUPABASE_ANON_KEY) isLive = true;
} catch (e) {
    console.warn('No config.js found — using sample data');
}


// ============================================================
// SUPABASE DATA LAYER
// ============================================================
const REPO_COLORS = [
    '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#4ade80',
    '#facc15', '#f87171', '#00d4ff', '#c084fc', '#34d399',
    '#fbbf24', '#818cf8', '#fb7185', '#2dd4bf', '#38bdf8'
];

async function supaFetch(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return res.json();
}

async function fetchTodaySession() {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
    const data = await supaFetch(`daily_sessions?session_date=eq.${today}&select=id`);
    return data[0] || null;
}

async function fetchSessionTasks(sessionId) {
    return supaFetch(
        `daily_session_tasks?session_id=eq.${sessionId}&select=*&order=priority.asc,created_at.asc`
    );
}

async function patchTaskStatus(taskId, status) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/daily_session_tasks?id=eq.${taskId}`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`PATCH failed ${res.status}`);
}

function groupTasksByRepo(tasks) {
    const repoMap = {};
    tasks.forEach(t => {
        const repo = t.repo || 'uncategorized';
        if (!repoMap[repo]) repoMap[repo] = [];
        repoMap[repo].push(t);
    });

    return Object.entries(repoMap).map(([repo, repoTasks], idx) => {
        // Separate parents and subtasks
        const parentTasks = repoTasks.filter(t => !t.parent_task_id);
        const subtaskMap = {};
        repoTasks.filter(t => t.parent_task_id).forEach(t => {
            if (!subtaskMap[t.parent_task_id]) subtaskMap[t.parent_task_id] = [];
            subtaskMap[t.parent_task_id].push(t);
        });

        // Attach subtasks to parents
        const structured = parentTasks.map(p => ({
            ...p,
            subtasks: subtaskMap[p.id] || []
        }));

        return {
            id: `repo-${idx}`,
            name: repo,
            color: REPO_COLORS[idx % REPO_COLORS.length],
            tasks: structured,
            _allTasks: repoTasks // flat list for stats
        };
    });
}

function getProjectCompletion(project) {
    const all = project._allTasks || project.tasks;
    if (!all.length) return 0;
    const done = all.filter(t => t.status === 'done' || t.completed === true).length;
    return done / all.length;
}

function getProjectWipCount(project) {
    const all = project._allTasks || project.tasks;
    return all.filter(t => t.status === 'in_progress').length;
}


// ============================================================
// SAMPLE DATA (fallback)
// ============================================================
const SAMPLE_PROJECTS = [
    {
        id: 'proj-1', name: 'sphere', color: '#00d4ff',
        tasks: [
            { id: 's1', title: 'Supabase integration', status: 'done', task_type: 'feature', priority: 'high', subtasks: [] },
            { id: 's2', title: 'Dynamic node rebuild', status: 'done', task_type: 'feature', priority: 'high', subtasks: [] },
            { id: 's3', title: 'Task status cycling', status: 'in_progress', task_type: 'task', priority: 'medium', subtasks: [] },
            { id: 's4', title: 'Refresh system', status: 'todo', task_type: 'task', priority: 'medium', subtasks: [] }
        ],
        _allTasks: [
            { id: 's1', title: 'Supabase integration', status: 'done', task_type: 'feature', priority: 'high' },
            { id: 's2', title: 'Dynamic node rebuild', status: 'done', task_type: 'feature', priority: 'high' },
            { id: 's3', title: 'Task status cycling', status: 'in_progress', task_type: 'task', priority: 'medium' },
            { id: 's4', title: 'Refresh system', status: 'todo', task_type: 'task', priority: 'medium' }
        ]
    },
    {
        id: 'proj-2', name: 'fhe-studio', color: '#00ffe1',
        tasks: [
            { id: 'f1', title: 'Fix login redirect', status: 'done', task_type: 'bug', priority: 'critical', subtasks: [] },
            { id: 'f2', title: 'Add dark mode', status: 'in_progress', task_type: 'feature', priority: 'medium', subtasks: [] },
            { id: 'f3', title: 'Write API tests', status: 'todo', task_type: 'test', priority: 'high', subtasks: [] }
        ],
        _allTasks: [
            { id: 'f1', title: 'Fix login redirect', status: 'done', task_type: 'bug', priority: 'critical' },
            { id: 'f2', title: 'Add dark mode', status: 'in_progress', task_type: 'feature', priority: 'medium' },
            { id: 'f3', title: 'Write API tests', status: 'todo', task_type: 'test', priority: 'high' }
        ]
    },
    {
        id: 'proj-3', name: 'ally-api', color: '#a78bfa',
        tasks: [
            { id: 'a1', title: 'Define OpenAPI spec', status: 'done', task_type: 'task', priority: 'high', subtasks: [] },
            { id: 'a2', title: 'Rate limiting middleware', status: 'done', task_type: 'feature', priority: 'high', subtasks: [] },
            { id: 'a3', title: 'Auth middleware', status: 'in_progress', task_type: 'feature', priority: 'high', subtasks: [] },
            { id: 'a4', title: 'Add monitoring', status: 'todo', task_type: 'task', priority: 'medium', subtasks: [] },
            { id: 'a5', title: 'MIT license check', status: 'deferred', task_type: 'mit', priority: 'low', subtasks: [] }
        ],
        _allTasks: [
            { id: 'a1', title: 'Define OpenAPI spec', status: 'done', task_type: 'task', priority: 'high' },
            { id: 'a2', title: 'Rate limiting middleware', status: 'done', task_type: 'feature', priority: 'high' },
            { id: 'a3', title: 'Auth middleware', status: 'in_progress', task_type: 'feature', priority: 'high' },
            { id: 'a4', title: 'Add monitoring', status: 'todo', task_type: 'task', priority: 'medium' },
            { id: 'a5', title: 'MIT license check', status: 'deferred', task_type: 'mit', priority: 'low' }
        ]
    }
];


// ============================================================
// DATA LOADING
// ============================================================
let projects = [];
let dataSource = 'SAMPLE';

async function loadData() {
    if (!isLive) {
        projects = SAMPLE_PROJECTS;
        dataSource = 'SAMPLE';
        return;
    }

    try {
        const session = await fetchTodaySession();
        if (!session) {
            console.warn('No session for today — using sample data');
            projects = SAMPLE_PROJECTS;
            dataSource = 'SAMPLE';
            return;
        }

        const tasks = await fetchSessionTasks(session.id);
        console.log('[sphere] Raw tasks from Supabase:', tasks);
        console.log('[sphere] Task repos:', tasks.map(t => ({ id: t.id, title: t.title, repo: t.repo })));
        if (!tasks.length) {
            console.warn('No tasks for today — using sample data');
            projects = SAMPLE_PROJECTS;
            dataSource = 'SAMPLE';
            return;
        }

        projects = groupTasksByRepo(tasks);
        console.log('[sphere] Grouped projects:', projects.map(p => ({ name: p.name, taskCount: p.tasks.length })));
        dataSource = 'LIVE';
    } catch (e) {
        console.error('Supabase fetch failed:', e);
        projects = SAMPLE_PROJECTS;
        dataSource = 'SAMPLE';
    }
}


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
    bloomStrength: 0.15,
    bloomRadius: 0.3,
    bloomThreshold: 0.8,

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
        uPulseTime: { value: -1.0 },
        uNodePositions: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) },
        uNodeCount: { value: 0 },
        uNodeColors: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) },
        uCameraDist: { value: 3.0 }
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
        uniform vec3 uNodePositions[16];
        uniform int uNodeCount;
        uniform vec3 uNodeColors[16];
        uniform float uCameraDist;

        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        ${noiseFunctions}

        void main() {
            vec3 p = normalize(vPosition);
            float theta = atan(p.z, p.x);
            float phi = acos(clamp(p.y, -1.0, 1.0));

            // === FAINT TECHNICAL UNDERLAYER (lat/lon grid) ===
            float latLines = abs(fract(phi * uGridDensity / PI) - 0.5) * 2.0;
            float lonLines = abs(fract(theta * uGridDensity / (2.0 * PI)) - 0.5) * 2.0;
            float latLine = 1.0 - smoothstep(0.0, uLineWidth, latLines);
            float lonLine = 1.0 - smoothstep(0.0, uLineWidth, lonLines);
            float techGrid = max(latLine, lonLine);

            float shimmer = snoise(vPosition * 10.0 + uTime * 0.5) * 0.15 + 0.85;

            // Technical base — faint data-heavy underlayer
            vec3 color = uColor * shimmer * techGrid * 0.15;
            float alpha = techGrid * 0.08;

            // Scan line
            float scanPos = fract(uTime * uScanSpeed);
            float scanDist = abs(phi / PI - scanPos);
            scanDist = min(scanDist, 1.0 - scanDist);
            float scan = (1.0 - smoothstep(0.0, uScanWidth, scanDist)) * uScanIntensity;
            color += uAccent * scan * 0.3;
            alpha += scan * 0.08;

            // Fresnel rim — subtle edge glow
            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
            color += uColor * fresnel * 0.15;
            alpha += fresnel * 0.08;

            // === HEX CELL GRID (primary surface geometry) ===
            float hexScale = 14.0;
            vec2 hexUV = vec2(theta / (2.0 * PI), phi / PI) * hexScale;
            vec2 r = vec2(1.0, 1.732);
            vec2 h = r * 0.5;
            vec2 a = mod(hexUV, r) - h;
            vec2 b = mod(hexUV - h, r) - h;
            vec2 gv = dot(a, a) < dot(b, b) ? a : b;
            float hexDist = max(abs(gv.x), abs(gv.y) * 0.866025 + abs(gv.x) * 0.5);

            float hexFill = 1.0 - smoothstep(0.30, 0.36, hexDist);
            float edgeCore = 1.0 - smoothstep(0.32, 0.42, hexDist);
            float edgeOuter = 1.0 - smoothstep(0.26, 0.48, hexDist);
            float hexGlow = max(edgeOuter - edgeCore, 0.0);
            float innerGlow = smoothstep(0.0, 0.35, hexDist);

            // Breathing animation on hex borders
            float breathe = 0.93 + 0.07 * sin(uTime * 0.8);

            // === DARK HALO: suppress near node positions ===
            for (int i = 0; i < 16; i++) {
                if (i >= uNodeCount) break;
                float angDist = acos(clamp(dot(p, normalize(uNodePositions[i])), -1.0, 1.0));
                float suppress = smoothstep(0.04, 0.12, angDist);
                color *= suppress;
                alpha *= suppress;
            }

            // === TERRITORY NEON CASINGS ===
            if (uNodeCount > 0) {
                // Voronoi ownership
                float nearDist = 99.0;
                float secondDist = 99.0;
                int nearIdx = 0;
                for (int i = 0; i < 16; i++) {
                    if (i >= uNodeCount) break;
                    float d = acos(clamp(dot(p, normalize(uNodePositions[i])), -1.0, 1.0));
                    if (d < nearDist) {
                        secondDist = nearDist;
                        nearIdx = i;
                        nearDist = d;
                    } else if (d < secondDist) {
                        secondDist = d;
                    }
                }

                vec3 tintColor = uNodeColors[nearIdx];
                float zoomFactor = smoothstep(3.0, 1.2, uCameraDist);
                float hexIntensity = 0.75 + 0.25 * zoomFactor;

                // Volumetric casing fill — very faint colored interior
                float fillStrength = 0.03 * hexIntensity;
                color += tintColor * hexFill * fillStrength;
                alpha += hexFill * fillStrength * 0.2;

                // Inner glow — subtle depth near edges
                float volumetric = innerGlow * hexFill * 0.02 * hexIntensity;
                color += tintColor * volumetric;
                alpha += volumetric * 0.08;

                // Luminous neon borders — 3 emissive layers with breathing
                // Layer 1: Tight bright core (neon tube)
                float coreStrength = edgeCore * 0.35 * hexIntensity * breathe;
                color += tintColor * coreStrength * 1.5;
                alpha += coreStrength * 0.4;

                // Layer 2: Softer bloom spread
                float bloomSpread = hexGlow * 0.15 * hexIntensity * breathe;
                color += tintColor * bloomSpread * 0.6;
                alpha += bloomSpread * 0.12;

                // Layer 3: Wide diffuse halo (very subtle)
                float wideHalo = max((1.0 - smoothstep(0.26, 0.52, hexDist)) - hexFill, 0.0);
                float haloStrength = wideHalo * 0.04 * hexIntensity;
                color += tintColor * haloStrength * 0.3;
                alpha += haloStrength * 0.04;

                // Voronoi boundary glow — seam between territories
                float borderDist = secondDist - nearDist;
                float border = 1.0 - smoothstep(0.0, 0.05, borderDist);
                color += tintColor * border * 0.5 * breathe;
                alpha += border * 0.25;
                float borderWide = 1.0 - smoothstep(0.0, 0.10, borderDist);
                color += tintColor * borderWide * 0.1;
                alpha += borderWide * 0.05;
            } else {
                // No territories loaded — neutral hex outline
                color += uColor * edgeCore * 0.25 * breathe;
                alpha += edgeCore * 0.15;
            }

            // === PULSE WAVE ===
            if (uPulseTime >= 0.0 && uPulseTime < 2.0) {
                float angDist = acos(clamp(dot(p, uPulseOrigin), -1.0, 1.0));
                float pulseRadius = uPulseTime * 2.5;
                float pulseRing = 1.0 - smoothstep(0.0, 0.12, abs(angDist - pulseRadius));
                float pulseFade = exp(-uPulseTime * 1.5);
                color += uAccent * pulseRing * pulseFade * 3.0;
                alpha += pulseRing * pulseFade * 0.4;
            }

            alpha = clamp(alpha, 0.0, 0.7);
            color = min(color * uBrightness, vec3(1.2));
            gl_FragColor = vec4(color, alpha);
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
// PROJECT NODES — dynamic, rebuildable
// ============================================================
let nodeCount = 0;
let nodePos, nodeSizes, nodePhases, nodeColors, nodeHovers;
let nodeGeo = null;
let nodeMat = null;
let nodes = null;
let nodeLabels = [];

function buildNodes() {
    // Dispose old
    if (nodes) {
        mainGroup.remove(nodes);
        nodeGeo.dispose();
    }
    nodeLabels.forEach(l => l.remove());
    nodeLabels = [];

    nodeCount = projects.length;
    if (nodeCount === 0) return;

    nodePos = new Float32Array(nodeCount * 3);
    nodeSizes = new Float32Array(nodeCount);
    nodePhases = new Float32Array(nodeCount);
    nodeColors = new Float32Array(nodeCount * 3);
    nodeHovers = new Float32Array(nodeCount);

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < nodeCount; i++) {
        // Golden angle distribution (handle single-node edge case)
        const y = nodeCount === 1 ? 0 : 1 - (i / (nodeCount - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;

        nodePos[i * 3]     = radiusAtY * Math.cos(theta);
        nodePos[i * 3 + 1] = y;
        nodePos[i * 3 + 2] = radiusAtY * Math.sin(theta);

        const completion = getProjectCompletion(projects[i]);
        nodeSizes[i] = 0.4 + completion * 0.6;
        nodePhases[i] = Math.random() * Math.PI * 2;

        const col = new THREE.Color(projects[i].color);
        nodeColors[i * 3]     = col.r;
        nodeColors[i * 3 + 1] = col.g;
        nodeColors[i * 3 + 2] = col.b;
    }

    nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nodeSizes, 1));
    nodeGeo.setAttribute('aPhase', new THREE.BufferAttribute(nodePhases, 1));
    nodeGeo.setAttribute('aColor', new THREE.BufferAttribute(nodeColors, 3));
    nodeGeo.setAttribute('aHovered', new THREE.BufferAttribute(nodeHovers, 1));

    nodeMat = new THREE.ShaderMaterial({
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
                // Hexagonal distance for distinct shape
                vec2 a = abs(uv);
                float dist = max(a.x * 0.866025 + a.y * 0.5, a.y);
                dist *= 1.15;
                if (dist > 0.5) discard;

                float core = 1.0 - smoothstep(0.0, 0.10, dist);
                float glow = exp(-dist * dist * 10.0);
                float ring = smoothstep(0.26, 0.30, dist) * (1.0 - smoothstep(0.33, 0.40, dist));
                float haze = exp(-dist * dist * 4.0) * 0.25;

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

    nodes = new THREE.Points(nodeGeo, nodeMat);
    mainGroup.add(nodes);

    // Populate grid halo uniforms with node positions
    const haloPositions = gridMat.uniforms.uNodePositions.value;
    const haloCount = Math.min(nodeCount, 16);
    for (let i = 0; i < haloCount; i++) {
        haloPositions[i].set(nodePos[i * 3], nodePos[i * 3 + 1], nodePos[i * 3 + 2]);
    }
    gridMat.uniforms.uNodeCount.value = haloCount;

    // Populate grid territory color uniforms
    const haloColors = gridMat.uniforms.uNodeColors.value;
    for (let i = 0; i < haloCount; i++) {
        const col = new THREE.Color(projects[i].color);
        haloColors[i].set(col.r, col.g, col.b);
    }

    // Create floating labels
    for (let i = 0; i < nodeCount; i++) {
        const label = document.createElement('div');
        label.className = 'node-floating-label';
        label.textContent = projects[i].name;
        label.dataset.color = projects[i].color;
        document.body.appendChild(label);
        nodeLabels.push(label);
    }

    // Build connection filaments after nodes are placed
    buildFilaments();
}


// ============================================================
// CONNECTION FILAMENTS — neon arcs between nearby nodes
// ============================================================
let filamentMesh = null;
let filamentGeo = null;
let filamentMat = null;

function slerp(a, b, t) {
    const d = Math.max(-1, Math.min(1, a.dot(b)));
    const omega = Math.acos(d);
    if (omega < 0.001) return a.clone().lerp(b, t);
    const sinO = Math.sin(omega);
    return a.clone().multiplyScalar(Math.sin((1 - t) * omega) / sinO)
        .add(b.clone().multiplyScalar(Math.sin(t * omega) / sinO));
}

function buildFilaments() {
    if (filamentMesh) {
        mainGroup.remove(filamentMesh);
        filamentGeo.dispose();
        filamentMat.dispose();
        filamentMesh = null;
    }

    if (nodeCount < 2) return;

    const ARC_SEGS = 32;
    const ARC_R = 0.97;
    const MAX_ANGLE = Math.PI * 0.75;

    // Find connectable pairs
    const pairs = [];
    for (let i = 0; i < nodeCount; i++) {
        const pi = new THREE.Vector3(nodePos[i * 3], nodePos[i * 3 + 1], nodePos[i * 3 + 2]);
        for (let j = i + 1; j < nodeCount; j++) {
            const pj = new THREE.Vector3(nodePos[j * 3], nodePos[j * 3 + 1], nodePos[j * 3 + 2]);
            const ang = Math.acos(Math.min(1, Math.max(-1, pi.dot(pj))));
            if (ang < MAX_ANGLE) pairs.push({ i, j, pi: pi.clone(), pj: pj.clone() });
        }
    }

    if (pairs.length === 0) return;

    const totalVerts = pairs.length * (ARC_SEGS + 1);
    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const arcProgress = new Float32Array(totalVerts);
    const arcPhase = new Float32Array(totalVerts);
    const indices = [];

    let vi = 0;
    for (const pair of pairs) {
        const phase = Math.random() * Math.PI * 2;
        const colI = new THREE.Color(projects[pair.i].color);
        const colJ = new THREE.Color(projects[pair.j].color);

        for (let s = 0; s <= ARC_SEGS; s++) {
            const t = s / ARC_SEGS;
            const pt = slerp(pair.pi, pair.pj, t).normalize().multiplyScalar(ARC_R);

            positions[vi * 3]     = pt.x;
            positions[vi * 3 + 1] = pt.y;
            positions[vi * 3 + 2] = pt.z;

            const col = colI.clone().lerp(colJ, t);
            colors[vi * 3]     = col.r;
            colors[vi * 3 + 1] = col.g;
            colors[vi * 3 + 2] = col.b;

            arcProgress[vi] = t;
            arcPhase[vi] = phase;

            if (s > 0) indices.push(vi - 1, vi);
            vi++;
        }
    }

    filamentGeo = new THREE.BufferGeometry();
    filamentGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    filamentGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    filamentGeo.setAttribute('aProgress', new THREE.BufferAttribute(arcProgress, 1));
    filamentGeo.setAttribute('aPhase', new THREE.BufferAttribute(arcPhase, 1));
    filamentGeo.setIndex(indices);

    filamentMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
            uniform float uTime;
            attribute vec3 aColor;
            attribute float aProgress;
            attribute float aPhase;
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vColor = aColor;
                float wave = sin((aProgress - uTime * 0.6 + aPhase) * 6.283 * 2.0) * 0.5 + 0.5;
                float edgeFade = aProgress * (1.0 - aProgress) * 4.0;
                vAlpha = wave * edgeFade * 0.45;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                gl_FragColor = vec4(vColor * 1.5, vAlpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    filamentMesh = new THREE.LineSegments(filamentGeo, filamentMat);
    mainGroup.add(filamentMesh);
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
folderNodes.add(params, 'nodeSize', 0.1, 5.0).name('Size').onChange(v => { if (nodeMat) nodeMat.uniforms.uSize.value = v; });
folderNodes.add(params, 'nodePulse', 0.0, 2.0).name('Pulse').onChange(v => { if (nodeMat) nodeMat.uniforms.uPulse.value = v; });

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
const panelPct = document.getElementById('panel-pct');
const panelBarFill = document.getElementById('panel-bar-fill');
const panelTasks = document.getElementById('panel-tasks');
const panelDot = panelEl.querySelector('.project-panel-dot');
const panelFooter = panelEl.querySelector('.project-panel-footer');

const STATUS_CYCLE = ['todo', 'in_progress', 'done'];
const STATUS_ICONS = {
    todo: '',
    in_progress: '...',
    done: '\u2713',
    deferred: '\u2192'
};
const TYPE_LABELS = {
    bug: { text: 'BUG', cls: 'type-bug' },
    feature: { text: 'FEAT', cls: 'type-feat' },
    mit: { text: 'MIT', cls: 'type-mit' },
    test: { text: 'TEST', cls: 'type-test' }
};
const PRIORITY_COLORS = {
    critical: '#f87171',
    high: '#fb923c',
    medium: '#facc15',
    low: '#4ade80'
};

function openPanel(projectIndex) {
    const project = projects[projectIndex];
    if (!project) return;

    panelName.textContent = project.name;
    panelDot.style.color = project.color;
    panelName.style.color = project.color;

    renderPanelTasks(projectIndex);
    updatePanelProgress(projectIndex);

    // Update footer data source
    panelFooter.innerHTML = `<span class="data-source-${dataSource.toLowerCase()}">${dataSource}</span> &middot; ESC to close`;

    panelEl.classList.add('open');
}

function closePanel() {
    panelEl.classList.remove('open');
}

function renderPanelTasks(projectIndex) {
    const project = projects[projectIndex];
    panelTasks.innerHTML = '';

    project.tasks.forEach((task) => {
        renderSingleTask(task, projectIndex, false);
        // Render subtasks
        if (task.subtasks && task.subtasks.length) {
            task.subtasks.forEach(sub => {
                renderSingleTask(sub, projectIndex, true);
            });
        }
    });
}

function renderSingleTask(task, projectIndex, isSubtask) {
    const item = document.createElement('div');
    const status = task.status || (task.completed ? 'done' : 'todo');
    item.className = 'task-item task-status-' + status;
    if (isSubtask) item.classList.add('task-subtask');

    // Priority dot
    if (task.priority && PRIORITY_COLORS[task.priority]) {
        const dot = document.createElement('span');
        dot.className = 'task-priority-dot';
        dot.style.background = PRIORITY_COLORS[task.priority];
        dot.title = task.priority;
        item.appendChild(dot);
    }

    // Status checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'task-checkbox task-cb-' + status;
    checkbox.textContent = STATUS_ICONS[status] || '';
    item.appendChild(checkbox);

    // Title
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    item.appendChild(title);

    // Type badge
    if (task.task_type && TYPE_LABELS[task.task_type]) {
        const badge = document.createElement('span');
        badge.className = 'task-type-badge ' + TYPE_LABELS[task.task_type].cls;
        badge.textContent = TYPE_LABELS[task.task_type].text;
        item.appendChild(badge);
    }

    // Click to cycle status (deferred tasks are frozen)
    if (status !== 'deferred') {
        item.addEventListener('click', () => cycleTaskStatus(task, projectIndex));
    }

    panelTasks.appendChild(item);
}

async function cycleTaskStatus(task, projectIndex) {
    const currentIdx = STATUS_CYCLE.indexOf(task.status || 'todo');
    const newStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    // Optimistic update
    const oldStatus = task.status;
    task.status = newStatus;

    // Also update in _allTasks if it exists
    const project = projects[projectIndex];
    if (project._allTasks) {
        const allTask = project._allTasks.find(t => t.id === task.id);
        if (allTask) allTask.status = newStatus;
    }

    renderPanelTasks(projectIndex);
    updatePanelProgress(projectIndex);
    updateNodeSize(projectIndex);
    updateHudStats();
    updateRepoNavStats();

    // PATCH Supabase
    if (isLive) {
        try {
            await patchTaskStatus(task.id, newStatus);
        } catch (e) {
            console.error('Failed to patch task:', e);
            // Revert
            task.status = oldStatus;
            if (project._allTasks) {
                const allTask = project._allTasks.find(t => t.id === task.id);
                if (allTask) allTask.status = oldStatus;
            }
            renderPanelTasks(projectIndex);
            updatePanelProgress(projectIndex);
            updateNodeSize(projectIndex);
            updateHudStats();
            updateRepoNavStats();
        }
    }
}

function updatePanelProgress(projectIndex) {
    const completion = getProjectCompletion(projects[projectIndex]);
    const pct = Math.round(completion * 100);
    panelPct.textContent = pct + '%';
    panelBarFill.style.width = pct + '%';
}

function updateNodeSize(projectIndex) {
    if (!nodeGeo || projectIndex >= nodeCount) return;
    const completion = getProjectCompletion(projects[projectIndex]);
    nodeSizes[projectIndex] = 0.4 + completion * 0.6;
    nodeGeo.attributes.aSize.needsUpdate = true;
}


// ============================================================
// FLOATING NODE LABELS
// ============================================================
function updateNodeLabels() {
    for (let i = 0; i < nodeCount; i++) {
        if (!nodeLabels[i]) continue;
        const worldPos = getNodeWorldPos(i);
        const screenPos = worldPos.clone().project(camera);

        const behind = screenPos.z > 1;

        if (behind) {
            nodeLabels[i].style.opacity = '0';
            continue;
        }

        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        nodeLabels[i].style.left = x + 'px';
        nodeLabels[i].style.top = (y - 24) + 'px';

        const depthFade = THREE.MathUtils.smoothstep(screenPos.z, 0.98, 0.995);
        const baseOpacity = 1.0 - depthFade * 0.7;
        const isHovered = i === hoveredNodeIndex;
        const isFocusedDimmed = focusedNodeIndex !== -1 && focusedNodeIndex !== i;
        const opacity = isHovered ? 1.0 : isFocusedDimmed ? 0.3 : baseOpacity * 0.85;

        nodeLabels[i].style.opacity = String(opacity);
        nodeLabels[i].classList.toggle('hovered', isHovered);

        // Always set territory color for neon glow
        const col = projects[i].color;
        nodeLabels[i].style.color = col;
        nodeLabels[i].style.background = col + '15';
        nodeLabels[i].style.borderColor = col + '30';
    }
}

function updateNodeHovers(dt) {
    if (!nodeGeo || !nodeHovers) return;
    const lerpSpeed = 12.0;
    const factor = Math.min(1, lerpSpeed * dt);
    for (let i = 0; i < nodeCount; i++) {
        const target = i === hoveredNodeIndex ? 1.0 : 0.0;
        nodeHovers[i] += (target - nodeHovers[i]) * factor;
    }
    nodeGeo.attributes.aHovered.needsUpdate = true;
}


// ============================================================
// HUD DOM refs
// ============================================================
const hudFpsEl = document.getElementById('hud-fps');
const hudReposEl = document.getElementById('hud-repos');
const hudWipEl = document.getElementById('hud-wip');
const hudCompletionEl = document.getElementById('hud-completion');
const dataSourceEl = document.getElementById('data-source');

function updateHudStats() {
    if (hudReposEl) hudReposEl.textContent = projects.length;
    if (hudWipEl) {
        const wipCount = projects.reduce((sum, p) => sum + getProjectWipCount(p), 0);
        hudWipEl.textContent = wipCount;
    }

    const totalTasks = projects.reduce((sum, p) => (p._allTasks || p.tasks).length, 0);
    const doneTasks = projects.reduce((sum, p) => {
        const all = p._allTasks || p.tasks;
        return sum + all.filter(t => t.status === 'done' || t.completed === true).length;
    }, 0);
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    if (hudCompletionEl) hudCompletionEl.textContent = pct + '%';

    // Data source indicator
    if (dataSourceEl) {
        dataSourceEl.textContent = dataSource;
        dataSourceEl.className = 'data-source-indicator data-source-' + dataSource.toLowerCase();
    }
}


// ============================================================
// FOCUS / UNFOCUS
// ============================================================
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getNodeWorldPos(index) {
    if (!nodeGeo) return new THREE.Vector3();
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

    focusRing.visible = true;
    focusRing2.visible = true;

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

    hoverTooltip.style.display = 'none';
    openPanel(index);
    updateRepoNavActive(index);
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
    updateRepoNavActive(-1);
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

    // Read local position directly from geometry (already in mainGroup space)
    const pos = nodeGeo.attributes.position;
    const localPos = new THREE.Vector3(pos.getX(focusedNodeIndex), pos.getY(focusedNodeIndex), pos.getZ(focusedNodeIndex));

    focusRing.position.copy(localPos);
    focusRing2.position.copy(localPos);

    // lookAt expects world-space target — convert local outward normal to world
    const normal = localPos.clone().normalize();
    const lookTarget = localPos.clone().add(normal);
    mainGroup.localToWorld(lookTarget);

    focusRing.lookAt(lookTarget);
    focusRing2.lookAt(lookTarget);

    focusRing.rotateZ(t * 0.5);
    focusRing2.rotateZ(-t * 0.3);

    ringMat.uniforms.uTime.value = t;
    ringMat2.uniforms.uTime.value = t;
}

// Click handler
renderer.domElement.addEventListener('click', (e) => {
    if (e.target !== renderer.domElement) return;
    if (!nodes) return;

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
    if (e.target === renderer.domElement) return;
    if (panelEl.contains(e.target)) return;
    // Don't close if clicking refresh button or repo nav
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn && refreshBtn.contains(e.target)) return;
    const repoNav = document.getElementById('repo-nav');
    if (repoNav && repoNav.contains(e.target)) return;
    unfocusNode();
});


// ============================================================
// HOVER TOOLTIP
// ============================================================
const hoverTooltip = document.getElementById('hover-tooltip');
const hoverIdEl = hoverTooltip.querySelector('.hover-tooltip-id');
const hoverSigEl = hoverTooltip.querySelector('.hover-tooltip-sig');

renderer.domElement.addEventListener('mousemove', (e) => {
    if (!nodes) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(nodes);

    if (hits.length > 0 && focusedNodeIndex === -1) {
        const idx = hits[0].index;
        hoveredNodeIndex = idx;
        const project = projects[idx];
        const all = project._allTasks || project.tasks;
        const done = all.filter(t => t.status === 'done' || t.completed === true).length;
        const wip = all.filter(t => t.status === 'in_progress').length;
        const total = all.length;

        hoverTooltip.style.display = 'block';
        hoverTooltip.style.left = (e.clientX + 15) + 'px';
        hoverTooltip.style.top = (e.clientY - 10) + 'px';
        hoverIdEl.textContent = project.name;

        let sig = `${done}/${total} done`;
        if (wip > 0) sig += ` (${wip} wip)`;
        hoverSigEl.textContent = sig;
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
// REPO NAVIGATION PANEL
// ============================================================
const repoNavList = document.getElementById('repo-nav-list');
const repoNavToggle = document.getElementById('repo-nav-toggle');
let repoNavCollapsed = false;

function buildRepoNav() {
    repoNavList.innerHTML = '';

    projects.forEach((project, idx) => {
        const item = document.createElement('div');
        item.className = 'repo-nav-item';
        item.dataset.index = idx;

        const all = project._allTasks || project.tasks;
        const done = all.filter(t => t.status === 'done' || t.completed === true).length;
        const total = all.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const wip = all.filter(t => t.status === 'in_progress').length;

        let metaText = `${done}/${total} done`;
        if (wip > 0) metaText += ` · ${wip} wip`;

        item.innerHTML = `
            <span class="repo-nav-dot" style="color: ${project.color}; background: ${project.color};"></span>
            <div class="repo-nav-info">
                <span class="repo-nav-name">${project.name}</span>
                <span class="repo-nav-meta">${metaText}</span>
            </div>
            <div class="repo-nav-bar">
                <div class="repo-nav-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${project.color}99, ${project.color});"></div>
            </div>
        `;

        item.addEventListener('click', () => {
            focusNode(idx);
            updateRepoNavActive(idx);
        });

        repoNavList.appendChild(item);
    });

    updateRepoNavActive(focusedNodeIndex);
}

function updateRepoNavActive(activeIndex) {
    const items = repoNavList.querySelectorAll('.repo-nav-item');
    items.forEach((item, idx) => {
        item.classList.toggle('active', idx === activeIndex);
    });
}

function updateRepoNavStats() {
    const items = repoNavList.querySelectorAll('.repo-nav-item');
    projects.forEach((project, idx) => {
        if (!items[idx]) return;
        const all = project._allTasks || project.tasks;
        const done = all.filter(t => t.status === 'done' || t.completed === true).length;
        const total = all.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const wip = all.filter(t => t.status === 'in_progress').length;

        let metaText = `${done}/${total} done`;
        if (wip > 0) metaText += ` · ${wip} wip`;

        const meta = items[idx].querySelector('.repo-nav-meta');
        const barFill = items[idx].querySelector('.repo-nav-bar-fill');
        if (meta) meta.textContent = metaText;
        if (barFill) barFill.style.width = pct + '%';
    });
}

// Toggle collapse
if (repoNavToggle) {
    repoNavToggle.addEventListener('click', () => {
        repoNavCollapsed = !repoNavCollapsed;
        repoNavList.classList.toggle('collapsed', repoNavCollapsed);
    });
}

// Tab key shortcut
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.key === 'Tab') {
        e.preventDefault();
        repoNavCollapsed = !repoNavCollapsed;
        repoNavList.classList.toggle('collapsed', repoNavCollapsed);
    }

    // Arrow keys to cycle repos (only when nav is open)
    if (repoNavCollapsed || projects.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        let nextIdx;
        if (focusedNodeIndex === -1) {
            nextIdx = e.key === 'ArrowDown' ? 0 : projects.length - 1;
        } else {
            const delta = e.key === 'ArrowDown' ? 1 : -1;
            nextIdx = (focusedNodeIndex + delta + projects.length) % projects.length;
        }
        focusNode(nextIdx);
        updateRepoNavActive(nextIdx);
    }
});


// ============================================================
// REFRESH SYSTEM
// ============================================================
let refreshIntervalId = null;
const REFRESH_INTERVAL = 60_000; // 60 seconds

async function refreshData() {
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn?.querySelector('.refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('spinning');

    // Remember focused repo name
    const focusedRepoName = focusedNodeIndex >= 0 ? projects[focusedNodeIndex]?.name : null;

    await loadData();
    buildNodes();
    buildRepoNav();
    updateHudStats();

    // Re-find focused repo by name
    if (focusedRepoName) {
        const newIdx = projects.findIndex(p => p.name === focusedRepoName);
        if (newIdx >= 0) {
            focusedNodeIndex = newIdx;
            openPanel(newIdx);
            updateRepoNavActive(newIdx);
        } else {
            focusedNodeIndex = -1;
            closePanel();
            updateRepoNavActive(-1);
        }
    }

    if (refreshIcon) {
        setTimeout(() => refreshIcon.classList.remove('spinning'), 600);
    }
}

function startAutoRefresh() {
    if (!isLive) return;
    refreshIntervalId = setInterval(refreshData, REFRESH_INTERVAL);
}

// R key shortcut + button
window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        if (e.target.tagName === 'INPUT') return;
        refreshData();
    }
});

// Bind refresh button after DOM is ready
const refreshBtn = document.getElementById('refresh-btn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        refreshData();
    });
}


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
    if (nodeMat) nodeMat.uniforms.uTime.value = t * params.timeScale;
    if (filamentMat) filamentMat.uniforms.uTime.value = t * params.timeScale;
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

    // Update grid halo uniforms — transform node positions into grid-local space
    if (nodeCount > 0) {
        const gridRotY = -t * 0.01; // inverse of gridMesh.rotation.y
        const cosR = Math.cos(gridRotY);
        const sinR = Math.sin(gridRotY);
        const haloPositions = gridMat.uniforms.uNodePositions.value;
        const haloCount = Math.min(nodeCount, 16);
        for (let i = 0; i < haloCount; i++) {
            const x = nodePos[i * 3];
            const y = nodePos[i * 3 + 1];
            const z = nodePos[i * 3 + 2];
            // Rotate by inverse of grid Y rotation
            haloPositions[i].set(x * cosR + z * sinR, y, -x * sinR + z * cosR);
        }
        gridMat.uniforms.uCameraDist.value = camera.position.length();
    }

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


// ============================================================
// ASYNC INIT
// ============================================================
async function init() {
    // Show loading state
    if (hudReposEl) hudReposEl.textContent = '...';
    if (hudWipEl) hudWipEl.textContent = '...';
    if (hudCompletionEl) hudCompletionEl.textContent = '...';

    await loadData();
    buildNodes();
    buildRepoNav();
    updateHudStats();
    startAutoRefresh();
    animate();
}

init();
