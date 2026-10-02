/* =========================================================
   ALEX GRAJO — 3D STORE JOURNEY
   ---------------------------------------------------------
   A scroll-driven WebGL walkthrough of a Shopify store.
   The camera travels through: storefront -> entrance ->
   skill shelves -> product aisle -> transformation corridor ->
   client reviews -> experience wall -> checkout counter.

   Built with Three.js (vendored locally in /vendor).
   The HTML content stays fully crawlable and readable on top
   of the canvas, so SEO and accessibility are unaffected.
   ========================================================= */

import * as THREE from './vendor/three.module.min.js';

/* ---------------------------------------------------------
   1. CONFIG
   --------------------------------------------------------- */

const PALETTE = {
    forest: 0x075e46,
    forestDark: 0x064a38,
    forestDeep: 0x043d2f,
    mint: 0xe8fff2,
    mintSoft: 0xf4fff8,
    mintBorder: 0xcde8db,
    white: 0xffffff,
    ink: 0x17211d,
    glow: 0x9ff5cd,
};

const CORRIDOR = {
    width: 18,
    height: 7.2,
    zStart: 54,
    zEnd: -158,
};

/* Where every room sits along the walkway. These are matched to the
   scroll span of the matching HTML section, measured in the browser. */
const Z = {
    plazaStart: 50,
    facade: 33,
    entrance: 23,
    skillsStart: 11,
    skillsEnd: -13,
    projectsStart: -18,
    projectsEnd: -31,
    transform1: -48,
    transform2: -66,
    reviewsStart: -80,
    reviewsEnd: -96,
    experienceStart: -104,
    experienceEnd: -120,
    checkout: -138,
    end: -152,
};

/* Which HTML section maps to which stretch of the walk. The `p` values
   come from measuring each section's centre as a fraction of total scroll. */
const STAGES = [
    { id: 'home', label: 'Storefront' },
    { id: 'about', label: 'Inside the store' },
    { id: 'skills', label: 'Skill shelves' },
    { id: 'projects', label: 'Product aisle' },
    { id: 'hallunaco', label: 'Before / after' },
    { id: 'munchkinmall', label: 'Store redesigns' },
    { id: 'feedback', label: 'Client reviews' },
    { id: 'experience', label: 'Experience wall' },
    { id: 'contact', label: 'Checkout' },
];

/* The camera rail: scroll progress -> where the visitor is standing and
   what they are looking at. `fz` is measured forward from the camera. */
const WAYPOINTS = [
    { p: 0.000, z: 46, x: 0.0, y: 2.5, fx: 0.0, fy: 3.2, fz: -16 },
    { p: 0.040, z: 40, x: 0.2, y: 2.4, fx: 0.4, fy: 3.1, fz: -14 },
    { p: 0.071, z: 34, x: -0.4, y: 2.3, fx: -1.6, fy: 3.0, fz: -12 },
    { p: 0.110, z: 25, x: -1.2, y: 2.2, fx: -5.6, fy: 3.0, fz: -5 },
    { p: 0.154, z: 13, x: 1.1, y: 2.2, fx: 5.6, fy: 3.0, fz: -8 },
    { p: 0.240, z: -2, x: -1.3, y: 2.2, fx: -5.8, fy: 3.0, fz: -8 },
    { p: 0.319, z: -14, x: 1.2, y: 2.2, fx: 6.0, fy: 3.0, fz: -7 },
    { p: 0.400, z: -25, x: -1.3, y: 2.2, fx: -6.0, fy: 3.0, fz: -7 },
    { p: 0.488, z: -39, x: 1.0, y: 2.2, fx: 3.0, fy: 2.9, fz: -9 },
    { p: 0.560, z: -47, x: -1.2, y: 2.2, fx: -5.6, fy: 3.0, fz: -4 },
    { p: 0.636, z: -55, x: 1.1, y: 2.2, fx: 5.6, fy: 3.0, fz: -10 },
    { p: 0.720, z: -66, x: -1.2, y: 2.2, fx: -5.6, fy: 3.0, fz: -4 },
    { p: 0.800, z: -75, x: 1.0, y: 2.2, fx: 5.4, fy: 3.0, fz: -8 },
    { p: 0.875, z: -88, x: -1.1, y: 2.2, fx: -5.6, fy: 3.0, fz: -8 },
    { p: 0.941, z: -101, x: 1.0, y: 2.2, fx: 5.6, fy: 3.0, fz: -6 },
    { p: 0.975, z: -119, x: -0.8, y: 2.2, fx: -5.4, fy: 3.0, fz: -8 },
    { p: 1.000, z: -134, x: 0.0, y: 2.4, fx: 0.0, fy: 3.3, fz: -12 },
];

const SKILL_PLATES = [
    { n: '01', title: 'Shopify Store Setup', sub: 'Domain · Payments · Shipping · Taxes' },
    { n: '02', title: 'Theme Customization', sub: 'Dawn · Shrine · Premium Themes' },
    { n: '03', title: 'Liquid Edits & Code Tweaks', sub: 'Sections · Snippets · Schema' },
    { n: '04', title: 'Product & Collection Setup', sub: 'Variants · Metafields · Tags' },
    { n: '05', title: 'Navigation & Architecture', sub: 'Menus · Filters · Search' },
    { n: '06', title: 'App Integration', sub: 'Reviews · Email · Upsells' },
    { n: '07', title: 'Responsive Storefronts', sub: 'Mobile QA · Speed · Polish' },
];

const PROJECT_WALLS = [
    { img: 'images/stonestream.jpg', title: 'StoneStream', side: -1, z: Z.projectsStart - 1 },
    { img: 'images/olyvo.jpg', title: 'Olyvo Labs', side: -1, z: Z.projectsStart - 9 },
    { img: 'images/verilia.jpg', title: 'Verilia', side: -1, z: Z.projectsStart - 17 },
    { img: 'images/hallunaco-after.jpg', title: 'HallunaCo.', side: 1, z: Z.projectsStart - 5 },
    { img: 'images/3d/munchkinmall-after.jpg', title: 'Munchkin Mall', side: 1, z: Z.projectsStart - 13 },
];

const TRANSFORMATIONS = [
    { before: 'images/hallunaco-before.jpg', after: 'images/hallunaco-after.jpg', label: 'HallunaCo.', z: Z.transform1 },
    { before: 'images/3d/munchkinmall-before.jpg', after: 'images/3d/munchkinmall-after.jpg', label: 'Munchkin Mall', z: Z.transform2 },
];

/* ---------------------------------------------------------
   2. SMALL HELPERS
   --------------------------------------------------------- */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

const IS_TOUCH = window.matchMedia('(hover: none)').matches;
const TIER = IS_TOUCH || window.innerWidth < 820 ? 'low' : 'high';

/* ---------------------------------------------------------
   3. PROCEDURAL TEXTURES (canvas based — no image requests)
   --------------------------------------------------------- */

function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
}

function finishTexture(canvas, { repeat = null, anisotropy = 4 } = {}) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;

    if (repeat) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
    }

    return texture;
}

function wrapLines(ctx, text, maxWidth, maxLines = 3) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';

    words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    });

    if (line) lines.push(line);
    if (lines.length > maxLines) lines.length = maxLines;
    return lines;
}

/* Floor: soft mint showroom tiles */
function floorTexture() {
    const canvas = makeCanvas(512, 512);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#f2fcf7');
    gradient.addColorStop(1, '#e0f6ea');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    /* 4x4 tiles per texture, each tile softly shaded */
    const cell = 128;
    for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
            ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(205,232,219,0.28)';
            ctx.fillRect(col * cell, row * cell, cell, cell);
        }
    }

    ctx.strokeStyle = 'rgba(7, 94, 70, 0.12)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += cell) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
    }

    return finishTexture(canvas, { repeat: [1.6, 26], anisotropy: 8 });
}

/* Wall: quiet vertical panelling with a mint wash at the base */
function wallTexture() {
    const canvas = makeCanvas(512, 256);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#fbfefc');
    gradient.addColorStop(0.72, '#f4fdf8');
    gradient.addColorStop(1, '#e7f8ef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = 'rgba(7, 94, 70, 0.07)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(7, 94, 70, 0.035)';
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(512, 128);
    ctx.stroke();

    return finishTexture(canvas, { repeat: [2, 1], anisotropy: 4 });
}

/* Generic text plate used for signs, shelf labels and wall titles */
function plateTexture({
    title = '',
    subtitle = '',
    badge = '',
    lines = [],
    bg = '#ffffff',
    fg = '#075e46',
    accent = '#cde8db',
    width = 1024,
    height = 512,
    align = 'left',
} = {}) {
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const titleSize = Math.round(height * 0.135);
    const subSize = Math.round(height * 0.058);
    const lineSize = Math.round(height * 0.05);

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    /* accent bar */
    ctx.fillStyle = accent;
    ctx.fillRect(0, height - Math.round(height * 0.035), width, Math.round(height * 0.035));

    const padX = Math.round(width * 0.06);
    const centerX = align === 'center' ? width / 2 : padX;
    let cursorY = Math.round(height * 0.28);

    if (badge) {
        ctx.fillStyle = fg;
        ctx.font = `700 ${Math.round(height * 0.062)}px Arial, Helvetica, sans-serif`;
        ctx.textAlign = align === 'center' ? 'center' : 'left';
        ctx.fillText(badge.toUpperCase(), centerX, Math.round(height * 0.16));
    }

    ctx.textAlign = align === 'center' ? 'center' : 'left';

    if (title) {
        ctx.fillStyle = fg;
        ctx.font = `800 ${titleSize}px Arial, Helvetica, sans-serif`;
        wrapLines(ctx, title, width - padX * (align === 'center' ? 2.4 : 1.3), 2).forEach((line, i) => {
            ctx.fillText(line, centerX, cursorY + i * titleSize * 1.08);
        });
        cursorY += titleSize * 1.35;
    }

    if (subtitle) {
        ctx.fillStyle = 'rgba(23, 33, 29, 0.62)';
        ctx.font = `600 ${subSize}px Arial, Helvetica, sans-serif`;
        cursorY += subSize * 0.6;
        ctx.fillText(subtitle, centerX, cursorY);
        cursorY += subSize * 1.6;
    }

    if (lines.length) {
        ctx.fillStyle = 'rgba(23, 33, 29, 0.5)';
        ctx.font = `400 ${lineSize}px Arial, Helvetica, sans-serif`;
        lines.forEach((line) => {
            ctx.fillText(line, centerX, cursorY);
            cursorY += lineSize * 1.55;
        });
    }

    return finishTexture(canvas, { anisotropy: 8 });
}

/* Storefront sign */
function signTexture(title, subtitle) {
    const canvas = makeCanvas(1024, 384);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#075e46';
    ctx.fillRect(0, 0, 1024, 384);

    ctx.fillStyle = '#e8fff2';
    ctx.font = '800 150px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 512, 190);

    ctx.fillStyle = 'rgba(232, 255, 242, 0.85)';
    ctx.font = '700 44px Arial, Helvetica, sans-serif';
    ctx.fillText(subtitle, 512, 275);

    const glow = ctx.createLinearGradient(0, 0, 0, 384);
    glow.addColorStop(0, 'rgba(255,255,255,0.16)');
    glow.addColorStop(0.5, 'rgba(255,255,255,0)');
    glow.addColorStop(1, 'rgba(0,0,0,0.14)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1024, 384);

    return finishTexture(canvas, { anisotropy: 8 });
}

/* Soft radial glow used for light pools and halos */
function glowTexture(inner = 'rgba(159, 245, 205, 0.85)') {
    const canvas = makeCanvas(256, 256);
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.45, 'rgba(159, 245, 205, 0.28)');
    gradient.addColorStop(1, 'rgba(159, 245, 205, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/* Review card for the feedback wall */
function reviewTexture(stars = 5) {
    const canvas = makeCanvas(512, 320);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 320);

    ctx.fillStyle = '#075e46';
    ctx.font = '700 46px Arial, Helvetica, sans-serif';
    ctx.fillText('★'.repeat(stars), 40, 80);

    ctx.fillStyle = 'rgba(23, 33, 29, 0.55)';
    [150, 190, 230].forEach((y, i) => {
        ctx.fillRect(40, y, i === 2 ? 260 : 430, 12);
    });

    ctx.fillStyle = '#cde8db';
    ctx.fillRect(40, 262, 130, 14);

    return finishTexture(canvas, { anisotropy: 4 });
}

/* ---------------------------------------------------------
   4. IMAGE TEXTURES (re-uses the page's own screenshots)
   --------------------------------------------------------- */

const textureCache = new Map();

function imageTexture(url, { maxWidth = 900, aspect = 1.62 } = {}) {
    const key = `${url}|${maxWidth}|${aspect}`;
    if (textureCache.has(key)) return textureCache.get(key);

    const entry = { texture: null, ready: false, callbacks: [] };
    textureCache.set(key, entry);

    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';

    image.onload = () => {
        /* A viewport-shaped crop taken from the TOP of the screenshot —
           the same thing CSS does with `object-position: top`. */
        let sourceW = image.naturalWidth;
        let sourceH = sourceW / aspect;

        if (sourceH > image.naturalHeight) {
            sourceH = image.naturalHeight;
            sourceW = sourceH * aspect;
        }

        const sourceX = (image.naturalWidth - sourceW) / 2;
        const sourceY = 0;

        const targetW = Math.min(maxWidth, Math.round(sourceW));
        const targetH = Math.max(1, Math.round(targetW / aspect));
        const canvas = makeCanvas(targetW, targetH);

        canvas.getContext('2d').drawImage(
            image,
            sourceX, sourceY, sourceW, sourceH,
            0, 0, targetW, targetH
        );

        entry.texture = finishTexture(canvas, { anisotropy: 8 });
        entry.ready = true;
        entry.callbacks.splice(0).forEach((fn) => fn(entry.texture));
    };

    image.onerror = () => {
        entry.failed = true;
    };

    image.src = url;
    return entry;
}

/* ---------------------------------------------------------
   5. GEOMETRY HELPERS
   --------------------------------------------------------- */

function roundedPanelGeometry(width, height, radius = 0.18, depth = 0.12) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 1,
        curveSegments: 4,
    });

    geometry.center();
    return geometry;
}

/* ExtrudeGeometry maps UVs in world units, which makes any texture look
   like flat colour. This rewrites them so the rounded panel shows the
   whole plate, and its bevel samples the plate's edge. */
function fixPanelUVs(geometry, width, height) {
    const uv = geometry.attributes.uv;
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;

    for (let i = 0; i < uv.count; i += 1) {
        const nx = Math.abs(normal.getX(i));
        const ny = Math.abs(normal.getY(i));
        const nz = Math.abs(normal.getZ(i));

        if (nz >= nx && nz >= ny) {
            uv.setXY(
                i,
                position.getX(i) / width + 0.5,
                position.getY(i) / height + 0.5
            );
        } else {
            /* sides and bevels take the colour from the plate's edge */
            uv.setXY(i, 0.03, 0.03);
        }
    }

    uv.needsUpdate = true;
    return geometry;
}

/* A rounded plaque carrying a texture, with correct UVs */
function texturedPanel(width, height, texture, options = {}) {
    const {
        radius = 0.2,
        depth = 0.12,
        roughness = 0.55,
        metalness = 0.05,
        emissive = 0x000000,
        emissiveIntensity = 0,
    } = options;

    const geometry = fixPanelUVs(
        roundedPanelGeometry(width, height, radius, depth),
        width,
        height
    );

    return new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
            map: texture,
            roughness,
            metalness,
            emissive,
            emissiveIntensity,
        })
    );
}

const MATERIALS = {};

function materials() {
    if (MATERIALS.floor) return MATERIALS;

    MATERIALS.floor = new THREE.MeshStandardMaterial({
        map: floorTexture(),
        roughness: 0.55,
        metalness: 0.18,
        color: 0xffffff,
    });

    MATERIALS.wall = new THREE.MeshStandardMaterial({
        map: wallTexture(),
        roughness: 0.92,
        metalness: 0.02,
        color: 0xffffff,
    });

    MATERIALS.ceiling = new THREE.MeshStandardMaterial({
        color: 0xeef8f3,
        roughness: 0.95,
        metalness: 0,
    });

    MATERIALS.forest = new THREE.MeshStandardMaterial({
        color: 0x0a6b51,
        roughness: 0.45,
        metalness: 0.12,
    });

    MATERIALS.forestDark = new THREE.MeshStandardMaterial({
        color: PALETTE.forestDark,
        roughness: 0.5,
        metalness: 0.1,
    });

    MATERIALS.mint = new THREE.MeshStandardMaterial({
        color: PALETTE.mint,
        roughness: 0.7,
        metalness: 0.05,
    });

    MATERIALS.mintSoft = new THREE.MeshStandardMaterial({
        color: PALETTE.mintSoft,
        roughness: 0.8,
        metalness: 0.04,
    });

    MATERIALS.white = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.65,
        metalness: 0.04,
    });

    MATERIALS.ink = new THREE.MeshStandardMaterial({
        color: PALETTE.ink,
        roughness: 0.6,
        metalness: 0.1,
    });

    MATERIALS.glow = new THREE.MeshStandardMaterial({
        color: PALETTE.glow,
        emissive: PALETTE.glow,
        emissiveIntensity: 0.9,
        roughness: 0.4,
        metalness: 0,
    });

    MATERIALS.glass = new THREE.MeshPhysicalMaterial({
        color: 0xdff7ec,
        transparent: true,
        opacity: 0.28,
        roughness: 0.08,
        metalness: 0,
        transmission: 0,
        side: THREE.DoubleSide,
    });

    return MATERIALS;
}

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    return mesh;
}

/* ---------------------------------------------------------
   6. WORLD BUILDERS
   --------------------------------------------------------- */

function buildShell(group, m) {
    const length = CORRIDOR.zStart - CORRIDOR.zEnd;
    const centerZ = (CORRIDOR.zStart + CORRIDOR.zEnd) / 2;

    /* floor */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR.width, length), m.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, centerZ);
    group.add(floor);

    /* ceiling */
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(CORRIDOR.width, length), m.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, CORRIDOR.height, centerZ);
    group.add(ceiling);

    /* side walls */
    [-1, 1].forEach((side) => {
        const wall = box(0.5, CORRIDOR.height, length, m.wall, side * (CORRIDOR.width / 2), CORRIDOR.height / 2, centerZ);
        group.add(wall);

        /* mint baseboard light strip */
        const strip = box(0.62, 0.09, length, m.glow, side * (CORRIDOR.width / 2 - 0.05), 0.32, centerZ);
        strip.material = new THREE.MeshStandardMaterial({
            color: PALETTE.glow,
            emissive: PALETTE.glow,
            emissiveIntensity: 0.75,
            roughness: 0.4,
        });
        group.add(strip);
    });
}

function buildLighting(group, m) {
    const strips = [];
    const step = TIER === 'low' ? 20 : 13;

    for (let z = CORRIDOR.zStart - 10; z > CORRIDOR.zEnd + 2; z -= step) {
        const strip = box(
            TIER === 'low' ? 2.6 : 3.4,
            0.12,
            0.5,
            m.glow,
            0,
            CORRIDOR.height - 0.22,
            z
        );
        group.add(strip);
        strips.push(strip);

        /* soft light pool on the floor */
        const pool = new THREE.Mesh(
            new THREE.PlaneGeometry(8, 8),
            new THREE.MeshBasicMaterial({
                map: glowTexture('rgba(159, 245, 205, 0.55)'),
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                opacity: 0.22,
            })
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(0, 0.02, z);
        group.add(pool);
    }

    return strips;
}

/* The storefront you walk towards */
function buildStorefront(group, m) {
    const z = Z.facade;
    const facade = new THREE.Group();
    facade.position.z = z;

    const doorWidth = 5.4;
    const doorHeight = 4.6;

    /* pillars either side of the entrance */
    [-1, 1].forEach((side) => {
        const x = side * (doorWidth / 2 + 1.1);
        facade.add(box(2.2, CORRIDOR.height, 1.4, m.white, x, CORRIDOR.height / 2, 0));
        facade.add(box(2.36, 0.5, 1.5, m.forest, x, 0.25, 0));
    });

    /* header beam + sign */
    facade.add(box(doorWidth + 4.4, 2.3, 1.4, m.white, 0, CORRIDOR.height - 1.15, 0));

    const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 2.1),
        new THREE.MeshStandardMaterial({
            map: signTexture('AG.', 'SHOPIFY & E-COMMERCE SPECIALIST'),
            roughness: 0.5,
            metalness: 0.1,
            emissive: 0x0a2f24,
            emissiveIntensity: 0.35,
        })
    );
    sign.position.set(0, CORRIDOR.height - 1.15, 0.75);
    facade.add(sign);

    /* glass doors, open inwards */
    [-1, 1].forEach((side) => {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth / 2 - 0.1, doorHeight), m.glass);
        panel.position.set(side * (doorWidth / 4), doorHeight / 2, 0.3);
        panel.rotation.y = side * -0.5;
        facade.add(panel);

        const handle = box(0.08, 1.1, 0.08, m.forest, side * 0.35, 2, 0.62);
        facade.add(handle);
    });

    /* shop windows either side of the entrance, so it reads as a storefront */
    [-1, 1].forEach((side) => {
        const inner = doorWidth / 2 + 2.2;
        const outer = CORRIDOR.width / 2;
        const windowWidth = outer - inner;
        const centerX = side * (inner + windowWidth / 2);

        /* glass pane */
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, 5.2), m.glass);
        pane.position.set(centerX, 3.2, 0.65);
        facade.add(pane);

        /* sill, mullions and top rail */
        facade.add(box(windowWidth + 0.3, 1.0, 1.0, m.white, centerX, 0.5, 0.5));
        facade.add(box(windowWidth, 0.22, 0.6, m.forest, centerX, 5.85, 0.55));

        for (let i = 1; i < 4; i += 1) {
            const x = inner + (windowWidth / 4) * i;
            facade.add(box(0.14, 5.2, 0.4, m.forest, side * x, 3.2, 0.6));
        }

        /* whatever is on display inside the window */
        const display = box(1.4, 1.8, 0.9, side < 0 ? m.mint : m.mintSoft, centerX, 1.9, -0.6);
        facade.add(display);
        const displayTop = box(0.9, 0.9, 0.9, m.forest, centerX + 0.2, 3.1, -0.9);
        facade.add(displayTop);
    });

    /* thin wall filling the gap between the shop windows and the corridor walls */
    [-1, 1].forEach((side) => {
        const panel = box(0.6, CORRIDOR.height, 0.6, m.white, side * (CORRIDOR.width / 2 - 0.3), CORRIDOR.height / 2, 0);
        facade.add(panel);
    });

    /* entrance frame */
    facade.add(box(doorWidth + 0.5, 0.35, 0.5, m.forest, 0, doorHeight, 0.2));
    facade.add(box(0.35, doorHeight, 0.5, m.forest, -doorWidth / 2, doorHeight / 2, 0.2));
    facade.add(box(0.35, doorHeight, 0.5, m.forest, doorWidth / 2, doorHeight / 2, 0.2));

    /* welcome mat */
    const mat = box(doorWidth + 1.6, 0.08, 2.4, m.forest, 0, 0.05, 1.8);
    facade.add(mat);

    /* planters with simple shrubs */
    [-1, 1].forEach((side) => {
        const planterX = side * (doorWidth / 2 + 1.15);
        facade.add(box(1.5, 0.9, 1.5, m.forest, planterX, 0.45, 2.6));

        const shrub = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.85, 1),
            new THREE.MeshStandardMaterial({ color: 0x0f7a5b, roughness: 0.85, flatShading: true })
        );
        shrub.position.set(planterX, 1.5, 2.6);
        shrub.scale.set(1, 1.15, 1);
        facade.add(shrub);
    });

    group.add(facade);

    /* plaza: bollard walkway leading up to the doors, ahead of the visitor */
    const bollards = TIER === 'low' ? 4 : 8;
    for (let i = 0; i < bollards; i += 1) {
        const side = i % 2 === 0 ? -1 : 1;
        const offset = Math.floor(i / 2);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.05, 12), m.forest);
        post.position.set(side * 4.6, 0.46, Z.facade + 9 - offset * 3.4);
        group.add(post);

        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), m.glow);
        cap.position.set(side * 4.6, 0.98, Z.facade + 9 - offset * 3.4);
        group.add(cap);
    }

    /* floating product crates filling the plaza airspace ahead of the camera */
    const crates = [
        { x: -4.0, y: 2.9, z: 41.5, s: 1.0, r: 0.5 },
        { x: 3.9, y: 3.6, z: 40, s: 1.1, r: -0.4 },
        { x: -2.8, y: 4.8, z: 44, s: 0.85, r: 0.9 },
        { x: 3.0, y: 5.3, z: 43, s: 0.9, r: 0.25 },
        { x: -4.2, y: 5.5, z: 37.5, s: 0.75, r: -0.7 },
    ];

    const floaters = [];
    crates.forEach((crate, i) => {
        const mesh = box(crate.s, crate.s, crate.s, i % 2 === 0 ? m.mint : m.forest, crate.x, crate.y, crate.z);
        mesh.rotation.set(crate.r, crate.r * 1.4, crate.r * 0.6);
        group.add(mesh);
        floaters.push({ mesh, base: crate.y, speed: 0.6 + i * 0.12, phase: i });
    });

    /* campaign ring painted on the plaza floor */
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.4, 56),
        new THREE.MeshBasicMaterial({
            color: PALETTE.glow,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, 38);
    group.add(ring);

    return floaters;
}

/* Glass plinths down the middle of the walkway — they give the trip
   mid-ground parallax instead of an empty hall. */
function buildPedestals(group, m) {
    const spots = [
        { z: 18, x: 4.4 },
        { z: 2, x: -4.6 },
        { z: -37, x: 4.6 },
        { z: -58, x: -4.4 },
        { z: -76, x: 4.2 },
        { z: -99, x: -4.2 },
        { z: -124, x: 4.4 },
    ];

    const floaters = [];

    spots.forEach((spot, index) => {
        const height = 0.9 + (index % 3) * 0.25;
        const pedestal = new THREE.Group();
        pedestal.position.set(spot.x, 0, spot.z);

        pedestal.add(box(1.5, height, 1.5, m.white, 0, height / 2, 0));
        pedestal.add(box(1.62, 0.1, 1.62, m.forest, 0, height, 0));

        /* the product on top */
        const size = 0.65 + (index % 4) * 0.12;
        const product = box(
            size,
            size * 1.25,
            size,
            index % 2 === 0 ? m.mint : m.forest,
            0,
            height + 0.12 + size * 0.62,
            0
        );
        product.rotation.y = index * 0.5;
        pedestal.add(product);

        /* halo behind the product */
        const halo = new THREE.Mesh(
            new THREE.PlaneGeometry(3.4, 3.4),
            new THREE.MeshBasicMaterial({
                map: glowTexture('rgba(159, 245, 205, 0.5)'),
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                opacity: 0.55,
            })
        );
        halo.position.set(0, height + 1.1, -0.9);
        pedestal.add(halo);

        group.add(pedestal);
        floaters.push({
            mesh: product,
            base: product.position.y,
            speed: 0.65 + index * 0.07,
            phase: index * 0.8,
        });
    });

    return floaters;
}

/* Wall of "about" panels just inside the entrance */
function buildEntranceRoom(group, m) {
    const z = Z.entrance;

    /* left wall: about panel */
    const aboutPanel = texturedPanel(6.6, 3.4, plateTexture({
        badge: '01 — About',
        title: 'Clean, organized stores',
        subtitle: 'Shopify · E-commerce · Support',
        bg: '#ffffff',
        fg: '#075e46',
        accent: '#cde8db',
        width: 1280,
        height: 660,
    }), { radius: 0.3, depth: 0.18 });

    aboutPanel.position.set(-CORRIDOR.width / 2 + 0.32, 3.4, z);
    aboutPanel.rotation.y = Math.PI / 2;
    group.add(aboutPanel);

    /* right wall: info panel */
    const infoPanel = texturedPanel(6.0, 3.2, plateTexture({
        badge: 'Philippines',
        title: 'Open for opportunities',
        subtitle: 'grajoalex811@gmail.com',
        bg: '#f4fff8',
        fg: '#075e46',
        accent: '#075e46',
        width: 1280,
        height: 680,
    }), { radius: 0.3, depth: 0.18 });

    infoPanel.position.set(CORRIDOR.width / 2 - 0.32, 3.2, z);
    infoPanel.rotation.y = -Math.PI / 2;
    group.add(infoPanel);

    /* a display table in the middle of the room */
    const table = new THREE.Group();
    table.position.set(0, 0, z + 4);
    table.add(box(5.0, 0.22, 2.2, m.forest, 0, 1.05, 0));
    [-1, 1].forEach((side) => {
        table.add(box(0.24, 1.05, 2.1, m.mint, side * 2.4, 0.52, 0));
    });
    table.add(box(3.2, 0.06, 1.6, m.mintSoft, 0, 1.2, 0));
    group.add(table);

    /* product stack on the table */
    const stack = [
        { x: -1.5, size: 0.7, mat: m.mint },
        { x: -0.5, size: 0.9, mat: m.forest },
        { x: 0.7, size: 0.62, mat: m.mint },
        { x: 1.6, size: 0.8, mat: m.mintSoft },
    ];

    const floaters = [];
    stack.forEach((item, i) => {
        const mesh = box(item.size, item.size, item.size, item.mat, item.x, 1.5 + item.size / 2, z + 4);
        group.add(mesh);
        floaters.push({ mesh, base: mesh.position.y, speed: 0.7 + i * 0.1, phase: i * 1.7 });
    });

    return floaters;
}

/* Seven shelves, each carrying one skill plate */
function buildSkillRoom(group, m) {
    const floaters = [];
    const leftWall = -CORRIDOR.width / 2 + 0.35;
    const rightWall = CORRIDOR.width / 2 - 0.35;

    SKILL_PLATES.forEach((skill, index) => {
        const onLeft = index % 2 === 0;
        const slot = Math.floor(index / 2);
        const z = Z.skillsStart - slot * 4 + (onLeft ? 0 : 2);

        const unit = new THREE.Group();
        unit.position.set(onLeft ? leftWall : rightWall, 0, z);
        unit.rotation.y = onLeft ? Math.PI / 2 : -Math.PI / 2;

        /* shelf frame */
        unit.add(box(4.4, 3.5, 0.34, m.forest, 0, 2.0, 0));
        unit.add(box(4.1, 3.2, 0.42, m.mintSoft, 0, 2.0, 0.06));

        /* plate with the skill name */
        const plate = new THREE.Mesh(
            new THREE.PlaneGeometry(3.7, 1.44),
            new THREE.MeshStandardMaterial({
                map: plateTexture({
                    badge: skill.n,
                    title: skill.title,
                    subtitle: skill.sub,
                    bg: '#ffffff',
                    fg: '#075e46',
                    accent: '#cde8db',
                    width: 1280,
                    height: 500,
                }),
                roughness: 0.55,
                metalness: 0.04,
            })
        );
        plate.position.set(0, 2.85, 0.28);
        unit.add(plate);

        /* two shelf boards carrying goods */
        [1.45, 0.85].forEach((y, row) => {
            unit.add(box(4.0, 0.1, 1.0, m.forest, 0, y, 0.4));

            const count = TIER === 'low' ? 2 : 3;
            for (let i = 0; i < count; i += 1) {
                const size = 0.5 + ((i + row) % 3) * 0.14;
                const item = box(
                    size,
                    size * (1 + ((row + i) % 2) * 0.3),
                    size,
                    (row + i) % 3 === 0 ? m.mint : (row + i) % 3 === 1 ? m.white : m.forest,
                    -1.25 + i * 1.25,
                    y + 0.06 + size * 0.65,
                    0.35
                );
                item.rotation.y = (i - 1) * 0.22;
                unit.add(item);
            }
        });

        /* storefront kick plate */
        unit.add(box(4.6, 0.3, 1.1, m.forestDark, 0, 0.15, 0.35));

        group.add(unit);

        /* floating skill chip orbiting the shelf */
        const chip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), m.glow);
        const chipStart = new THREE.Vector3(
            (onLeft ? leftWall : rightWall) + (onLeft ? 2.4 : -2.4),
            4.3,
            z
        );
        chip.position.copy(chipStart);
        group.add(chip);
        floaters.push({
            mesh: chip,
            base: 4.3,
            speed: 0.9 + index * 0.05,
            phase: index,
            orbit: { center: new THREE.Vector3(chipStart.x, 4.3, z), radius: 0.75, speed: 0.5 + index * 0.05 },
        });
    });

    /* room title banner hanging across the corridor, facing the visitor */
    const title = texturedPanel(7.2, 1.7, plateTexture({
        title: '02 — SKILLS',
        subtitle: 'What I do, shelf by shelf',
        bg: '#075e46',
        fg: '#e8fff2',
        accent: '#9ff5cd',
        align: 'center',
        width: 1280,
        height: 300,
    }), { radius: 0.18, depth: 0.14, emissive: 0x063d2e, emissiveIntensity: 0.5 });

    title.position.set(0, CORRIDOR.height - 1.35, Z.skillsStart + 4);
    title.rotation.y = Math.PI;
    group.add(title);

    return floaters;
}

/* Hero project panels, one per store, clickable in 3D */
function buildProjectAisle(group, m) {
    const panels = [];

    PROJECT_WALLS.forEach((project, index) => {
        const onLeft = project.side < 0;
        const wallX = onLeft ? -CORRIDOR.width / 2 + 1.1 : CORRIDOR.width / 2 - 1.1;

        const holder = new THREE.Group();
        holder.position.set(wallX, 4.7, project.z);
        holder.rotation.y = onLeft ? Math.PI / 2 : -Math.PI / 2;

        /* frame + screen */
        holder.add(box(6.9, 4.5, 0.28, m.forest, 0, 0, 0));
        const screenMaterial = new THREE.MeshStandardMaterial({
            color: 0xe8fff2,
            roughness: 0.42,
            metalness: 0.06,
        });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.05), screenMaterial);
        screen.position.z = 0.17;
        holder.add(screen);

        /* caption bar */
        const caption = new THREE.Mesh(
            new THREE.PlaneGeometry(6.5, 0.9),
            new THREE.MeshStandardMaterial({
                map: plateTexture({
                    title: '',
                    badge: project.title,
                    subtitle: 'Shopify storefront · live screenshot',
                    bg: '#f4fff8',
                    fg: '#075e46',
                    accent: '#075e46',
                    height: 160,
                    align: 'center',
                }),
                roughness: 0.55,
                metalness: 0.04,
            })
        );
        caption.position.set(0, -2.62, 0.2);
        holder.add(caption);

        /* plinth below, resting on the shop floor */
        holder.add(box(7.2, 0.26, 1.6, m.mint, 0, -4.62, 0.5));

        group.add(holder);

        /* swap in the screenshot once it is decoded */
        const asset = imageTexture(project.img, { maxWidth: 900, aspect: 7.1 / 4.2 });
        const applyTexture = (texture) => {
            screenMaterial.map = texture;
            screenMaterial.color.set(0xffffff);
            screenMaterial.needsUpdate = true;
        };

        if (asset.ready) applyTexture(asset.texture);
        else asset.callbacks.push(applyTexture);

        screen.userData.project = {
            title: project.title,
            url: {
                StoneStream: 'https://www.stone-stream.com/',
                'Olyvo Labs': 'https://olyvolabs.com/',
                Verilia: 'https://verilia.shop/',
                'HallunaCo.': 'https://hallunaco.com/',
                'Munchkin Mall': 'https://shopmunchkinmall.com/',
            }[project.title],
        };

        panels.push({
            mesh: screen,
            holder,
            baseY: 3.4,
            baseRotation: holder.rotation.y,
            index,
            side: onLeft ? 1 : -1,
            targetScale: 1,
        });
    });

    return panels;
}

/* Before / after corridor */
function buildTransformationCorridor(group, m) {
    TRANSFORMATIONS.forEach((item) => {
        const build = (url, side, label) => {
            const wallX = side < 0 ? -CORRIDOR.width / 2 + 0.5 : CORRIDOR.width / 2 - 0.5;

            const holder = new THREE.Group();
            holder.position.set(wallX, 5.0, item.z);
            holder.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

            holder.add(box(6.2, 4.6, 0.26, m.forest, 0, 0, 0));

            const screenMaterial = new THREE.MeshStandardMaterial({ color: 0xe8fff2, roughness: 0.44, metalness: 0.05 });
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 3.6), screenMaterial);
            screen.position.z = 0.16;
            holder.add(screen);

            const tag = new THREE.Mesh(
                new THREE.PlaneGeometry(5.8, 0.8),
                new THREE.MeshStandardMaterial({
                    map: plateTexture({
                        badge: label,
                        subtitle: item.label,
                        bg: label === 'BEFORE' ? '#ffffff' : '#075e46',
                        fg: label === 'BEFORE' ? '#075e46' : '#e8fff2',
                        accent: '#cde8db',
                        height: 150,
                        align: 'center',
                    }),
                    roughness: 0.55,
                })
            );
            tag.position.set(0, -2.2, 0.19);
            holder.add(tag);

            holder.add(box(6.6, 0.24, 1.3, m.mint, 0, -4.62, 0.45));
            group.add(holder);

            /* tall screenshots are cropped from the top, like the site does */
            const asset = imageTexture(url, { maxWidth: 820, aspect: 6 / 4 });
            const applyTexture = (texture) => {
                screenMaterial.map = texture;
                screenMaterial.color.set(0xffffff);
                screenMaterial.needsUpdate = true;
            };
            if (asset.ready) applyTexture(asset.texture);
            else asset.callbacks.push(applyTexture);
        };

        build(item.before, -1, 'BEFORE');
        build(item.after, 1, 'AFTER');

        /* arrow plaque in the middle of the corridor */
        const arrow = new THREE.Mesh(
            new THREE.PlaneGeometry(2.6, 1.2),
            new THREE.MeshStandardMaterial({
                map: plateTexture({
                    title: '→',
                    bg: '#f4fff8',
                    fg: '#075e46',
                    accent: '#9ff5cd',
                    align: 'center',
                    height: 256,
                }),
                roughness: 0.5,
                transparent: true,
            })
        );
        arrow.position.set(0, 2.8, item.z);
        arrow.rotation.y = Math.PI;
        group.add(arrow);
    });
}

/* Review cards floating in the gallery */
function buildReviewWall(group, m) {
    const floaters = [];
    const count = TIER === 'low' ? 4 : 6;

    for (let i = 0; i < count; i += 1) {
        const onLeft = i % 2 === 0;
        const side = onLeft ? -1 : 1;

        const card = texturedPanel(2.9, 1.8, reviewTexture(5 - (i % 2)), {
            radius: 0.16,
            depth: 0.1,
            roughness: 0.5,
        });

        card.position.set(
            side * (CORRIDOR.width / 2 - 2.1),
            2.5 + (i % 3) * 1.4,
            Z.reviewsStart + 2 - i * 3.4
        );
        card.rotation.y = side * -Math.PI / 2 + side * 0.16;
        group.add(card);

        floaters.push({
            mesh: card,
            base: card.position.y,
            speed: 0.5 + i * 0.09,
            phase: i * 1.3,
        });
    }

    return floaters;
}

/* Experience wall: four dated columns */
function buildExperienceWall(group, m) {
    const entries = [
        { year: '2022', org: 'Teleperformance', tone: m.mint },
        { year: '2022', org: 'TELUS Digital', tone: m.mintSoft },
        { year: '2024', org: 'Elevance Health', tone: m.mint },
        { year: '2025', org: 'StoneStream', tone: m.forest },
    ];

    entries.forEach((entry, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const wallX = side * (CORRIDOR.width / 2 - 0.4);

        const column = new THREE.Group();
        column.position.set(wallX, 0, Z.experienceStart + 2 - Math.floor(i / 2) * 7);
        column.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;

        /* mint plinth with a forest cap, so the wall reads as a display unit */
        column.add(box(3.8, 4.6, 0.5, entry.tone, 0, 2.3, 0));
        column.add(box(4.0, 0.3, 0.9, m.forest, 0, 0.15, 0.3));
        column.add(box(4.0, 0.22, 0.75, m.forest, 0, 4.7, 0.15));

        const plate = texturedPanel(3.4, 2.5, plateTexture({
            badge: entry.year,
            title: entry.org,
            subtitle: 'Experience',
            bg: entry.org === 'StoneStream' ? '#075e46' : '#ffffff',
            fg: entry.org === 'StoneStream' ? '#e8fff2' : '#075e46',
            accent: entry.org === 'StoneStream' ? '#9ff5cd' : '#cde8db',
            width: 900,
            height: 660,
        }), { radius: 0.2, depth: 0.1, roughness: 0.55 });

        plate.position.set(0, 3.0, 0.32);
        column.add(plate);

        group.add(column);
    });

    /* timeline rail along the floor */
    const rail = box(0.34, 0.12, 22, m.mint, 0, 0.07, Z.experienceStart - 7);
    group.add(rail);

    for (let i = 0; i < 5; i += 1) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), m.glow);
        node.position.set(0, 0.28, Z.experienceStart + 4 - i * 5.2);
        group.add(node);
    }
}

/* Checkout counter finale */
function buildCheckout(group, m) {
    const counter = new THREE.Group();
    counter.position.set(0, 0, Z.checkout);

    /* counter body + forest top */
    counter.add(box(9.5, 1.6, 2.6, m.mintSoft, 0, 0.8, 0));
    counter.add(box(9.8, 0.22, 2.9, m.forest, 0, 1.7, 0));

    /* register / tablet */
    counter.add(box(1.1, 0.16, 0.9, m.forestDark, -2.4, 1.85, 0));
    const screen = box(1.5, 1.0, 0.09, m.forest, -2.4, 2.4, 0);
    screen.rotation.x = -0.22;
    counter.add(screen);

    /* card reader */
    const reader = box(0.42, 0.24, 0.32, m.white, -1.1, 1.95, 0.4);
    counter.add(reader);
    const readerLight = box(0.42, 0.05, 0.05, m.glow, -1.1, 2.09, 0.56);
    counter.add(readerLight);

    /* shopping bags */
    [-0.1, 0.9, 1.8].forEach((x, i) => {
        const bag = box(0.9, 1.05, 0.55, i === 1 ? m.forest : m.mint, x, 2.34, -0.2);
        counter.add(bag);

        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20, Math.PI), m.forestDark);
        handle.position.set(x, 2.87, -0.2);
        counter.add(handle);
    });

    /* coin stacks */
    for (let i = 0; i < 5; i += 1) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.07, 18), m.glow);
        coin.position.set(3.3, 1.85 + i * 0.075, 0.2);
        counter.add(coin);
    }

    /* floor decal + glow ring */
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 4.4, 48),
        new THREE.MeshBasicMaterial({
            color: PALETTE.glow,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, Z.checkout + 10);
    group.add(ring);

    /* big closing sign on the end wall */
    const endWall = box(CORRIDOR.width, CORRIDOR.height, 0.6, m.wall, 0, CORRIDOR.height / 2, Z.end - 1);
    group.add(endWall);

    const closing = texturedPanel(11, 4.6, plateTexture({
        badge: "Let's work together",
        title: 'Grow your Shopify store',
        subtitle: 'grajoalex811@gmail.com',
        lines: ['Store setup · Theme customization · SEO'],
        bg: '#075e46',
        fg: '#e8fff2',
        accent: '#9ff5cd',
        align: 'center',
        width: 1280,
        height: 540,
    }), { radius: 0.4, depth: 0.2, roughness: 0.5, emissive: 0x063d2e, emissiveIntensity: 0.45 });

    closing.position.set(0, 3.9, Z.end - 0.4);
    group.add(closing);

    group.add(counter);

    /* floating crates above the counter */
    const floaters = [];
    [[-5.4, 4.2], [5.4, 4.6], [-3.2, 5.6], [3.6, 5.2]].forEach(([x, y], i) => {
        const size = 0.7 + (i % 2) * 0.3;
        const crate = box(size, size, size, i % 2 === 0 ? m.mint : m.forest, x, y, Z.checkout - 4);
        crate.rotation.y = i * 0.6;
        group.add(crate);
        floaters.push({ mesh: crate, base: y, speed: 0.55 + i * 0.12, phase: i * 0.9 });
    });

    return floaters;
}

/* Ambient dust motes */
function buildParticles(group) {
    const count = TIER === 'low' ? 260 : 700;
    const positions = new Float32Array(count * 3);
    const length = CORRIDOR.zStart - CORRIDOR.zEnd;

    for (let i = 0; i < count; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * CORRIDOR.width * 0.92;
        positions[i * 3 + 1] = Math.random() * CORRIDOR.height;
        positions[i * 3 + 2] = CORRIDOR.zStart - Math.random() * length;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const points = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
            size: TIER === 'low' ? 0.14 : 0.1,
            color: PALETTE.glow,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        })
    );

    group.add(points);
    return points;
}

/* ---------------------------------------------------------
   7. THE JOURNEY
   --------------------------------------------------------- */

class Journey {
    constructor(canvas) {
        this.canvas = canvas;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.pointer = new THREE.Vector2();
        this.pointerTarget = new THREE.Vector2();
        this.progress = 0;
        this.progressTarget = 0;
        this.frame = 0;
        this.fpsSamples = [];
        this.renderScale = TIER === 'low' ? 1.4 : 1.8;
        this.paused = false;
        this.hovered = null;
        this.clock = new THREE.Clock();

        this.setupRenderer();
        this.setupScene();
        this.buildWorld();
        this.computeAnchors();
        this.bindEvents();

        this.resize();
        this.render();
    }

    /* ---------- renderer ---------- */
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: TIER === 'high',
            alpha: true,
            powerPreference: 'high-performance',
        });

        this.renderer.setClearColor(0x000000, 0);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.NeutralToneMapping;
        this.renderer.toneMappingExposure = 1.04;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0xeaf7f1, 24, 82);

        this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 320);

        /* lighting: soft showroom light */
        const hemi = new THREE.HemisphereLight(0xffffff, 0xd6f3e4, 1.05);
        this.scene.add(hemi);

        const key = new THREE.DirectionalLight(0xffffff, 1.05);
        key.position.set(6, 12, 8);
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0xd9fff0, 0.5);
        fill.position.set(-8, 6, -14);
        this.scene.add(fill);

        this.roomLight = new THREE.PointLight(PALETTE.glow, 60, 40, 2);
        this.scene.add(this.roomLight);
    }

    buildWorld() {
        const m = materials();
        const world = new THREE.Group();
        this.scene.add(world);
        this.world = world;

        buildShell(world, m);
        this.lightStrips = buildLighting(world, m);

        this.floaters = [];
        this.floaters.push(...buildStorefront(world, m));
        this.floaters.push(...buildEntranceRoom(world, m));
        this.floaters.push(...buildSkillRoom(world, m));
        this.floaters.push(...buildPedestals(world, m));

        this.projectPanels = buildProjectAisle(world, m);
        buildTransformationCorridor(world, m);
        this.floaters.push(...buildReviewWall(world, m));
        buildExperienceWall(world, m);
        this.floaters.push(...buildCheckout(world, m));

        this.particles = buildParticles(world);
        this.buildPaths();
    }

    /* Camera rail: sample the waypoint table at the current scroll progress */
    buildPaths() {
        this.cameraSample = new THREE.Vector3();
        this.focusSample = new THREE.Vector3();
    }

    sampleRail(progress) {
        const points = WAYPOINTS;
        let index = 0;

        for (let i = 1; i < points.length; i += 1) {
            if (progress <= points[i].p) {
                index = i - 1;
                break;
            }
            index = i - 1;
        }

        const a = points[index];
        const b = points[Math.min(index + 1, points.length - 1)];
        const span = Math.max(0.0001, b.p - a.p);
        const raw = clamp((progress - a.p) / span, 0, 1);
        const t = raw * raw * (3 - 2 * raw); /* smoothstep keeps the walk even */

        const z = lerp(a.z, b.z, t);
        let fy = lerp(a.fy, b.fy, t);

        /* further down the store the camera lifts its gaze, which drops the
           big signs below the reading line of the page panels */
        if (z < -50) fy += Math.min(0.9, (-50 - z) * 0.016);

        return {
            x: lerp(a.x, b.x, t),
            y: lerp(a.y, b.y, t),
            z,
            fx: lerp(a.fx, b.fx, t),
            fy,
            fz: lerp(a.fz, b.fz, t),
        };
    }

    /* ---------- scroll → journey progress ---------- */
    computeAnchors() {
        const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

        this.anchors = STAGES
            .filter((stage) => document.getElementById(stage.id))
            .map((stage) => {
                const element = document.getElementById(stage.id);
                const rect = element.getBoundingClientRect();
                const top = rect.top + window.scrollY;
                const center = top + rect.height * 0.45;

                return {
                    id: stage.id,
                    label: stage.label,
                    p: clamp((center - window.innerHeight * 0.5) / docHeight, 0, 1),
                };
            });

        /* keep anchors monotonic so the rail never jumps backwards */
        this.anchors.forEach((anchor, index) => {
            if (index > 0 && anchor.p <= this.anchors[index - 1].p) {
                anchor.p = Math.min(0.999, this.anchors[index - 1].p + 0.004);
            }
        });
    }

    /* ---------- events ---------- */
    bindEvents() {
        this.onScroll = () => {
            const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
            this.progressTarget = clamp(window.scrollY / docHeight, 0, 1);
        };

        this.onResize = () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.computeAnchors();
                this.resize();
                this.onScroll();
            }, 180);

            this.resize();
        };

        this.onPointerMove = (event) => {
            this.pointerTarget.set(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1
            );
        };

        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onResize);
        window.addEventListener('pointermove', this.onPointerMove, { passive: true });

        document.addEventListener('visibilitychange', () => {
            this.paused = document.hidden;
            if (!this.paused) this.clock.getDelta();
        });
    }

    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / Math.max(1, height);

        this.camera.aspect = aspect;
        this.camera.fov = aspect < 0.85 ? 76 : aspect < 1.2 ? 64 : 58;
        this.camera.updateProjectionMatrix();

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.renderScale));
        this.renderer.setSize(width, height, false);
    }

    /* ---------- frame loop ---------- */
    start() {
        if (this.loopRunning) return;
        this.loopRunning = true;

        const tick = () => {
            this.rafId = requestAnimationFrame(tick);
            if (this.paused) return;

            const dt = Math.min(this.clock.getDelta(), 0.05);
            /* with reduced motion the world holds still, but scroll still moves the camera */
            const animDt = this.reducedMotion ? 0 : dt;
            this.time = (this.time || 0) + animDt;

            this.progress = this.reducedMotion
                ? this.progressTarget
                : damp(this.progress, this.progressTarget, 2.6, dt);

            this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 3.4, Math.max(animDt, 0.0001));
            this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 3.4, Math.max(animDt, 0.0001));

            this.updateCamera(dt);
            this.updateFloaters();
            this.updateHover();

            this.render();

            this.frame += 1;
            this.trackPerformance(dt);
        };

        this.rafId = requestAnimationFrame(tick);
    }

    stop() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this.loopRunning = false;
    }

    updateCamera(dt) {
        const rail = this.sampleRail(clamp(this.progress, 0, 1));

        /* gentle sway + pointer parallax */
        const bob = this.reducedMotion ? 0 : Math.sin((this.time || 0) * 1.1) * 0.045;

        this.camera.position.set(
            rail.x + this.pointer.x * 0.85,
            rail.y + bob + this.pointer.y * 0.3,
            rail.z
        );

        const focus = this.focusSample.set(
            rail.fx + this.pointer.x * 0.5,
            rail.fy + this.pointer.y * 0.25,
            rail.z + rail.fz
        );

        this.lookTarget = this.lookTarget || focus.clone();
        this.lookTarget.lerp(focus, 1 - Math.exp(-6 * dt));

        this.camera.lookAt(this.lookTarget);
        this.camera.rotateZ(this.pointer.x * -0.022);

        /* travelling room light follows the visitor */
        this.roomLight.position.set(
            this.camera.position.x + this.pointer.x * 1.5,
            CORRIDOR.height - 1.6,
            rail.z + 2
        );

        /* dust motes drift */
        if (this.particles) {
            this.particles.rotation.y += 0.00035;
        }
    }

    updateFloaters() {
        const time = this.time || 0;
        const camZ = this.camera.position.z;

        this.floaters.forEach((floater) => {
            const mesh = floater.mesh;
            if (Math.abs(mesh.position.z - camZ) > 48) return;

            mesh.position.y = floater.base + Math.sin(time * floater.speed + floater.phase) * 0.22;
            mesh.rotation.y += 0.0035;

            if (floater.orbit) {
                mesh.position.x = floater.orbit.center.x
                    + Math.cos(time * floater.orbit.speed + floater.phase) * floater.orbit.radius * 1.6;
                mesh.position.z = floater.orbit.center.z
                    + Math.sin(time * floater.orbit.speed + floater.phase) * floater.orbit.radius;
            }
        });

        /* light strip pulse */
        const pulse = 0.72 + Math.sin(time * 1.6) * 0.1;
        this.lightStrips.forEach((strip, i) => {
            if (Math.abs(strip.position.z - camZ) > 60) return;
            strip.material.emissiveIntensity = pulse + (i % 3) * 0.04;
        });

        /* project panels breathe, and lift when hovered */
        this.projectPanels.forEach((panel) => {
            const near = Math.abs(panel.holder.position.z - camZ) < 40;
            if (!near) return;

            panel.holder.position.y = panel.baseY + Math.sin(time * 0.8 + panel.index) * 0.16;
            panel.holder.rotation.y = panel.baseRotation + Math.sin(time * 0.4 + panel.index) * 0.03;

            panel.mesh.scale.lerp(
                new THREE.Vector3(panel.targetScale, panel.targetScale, 1),
                0.12
            );
        });
    }

    updateHover() {
        const raycaster = this.raycaster || (this.raycaster = new THREE.Raycaster());
        raycaster.setFromCamera(this.pointer, this.camera);

        const nearby = this.projectPanels
            .filter((panel) => Math.abs(panel.holder.position.z - this.camera.position.z) < 42)
            .map((panel) => panel.mesh);

        const hits = nearby.length ? raycaster.intersectObjects(nearby, false) : [];
        const hit = hits.length ? hits[0].object : null;

        this.hovered = hit;

        this.projectPanels.forEach((panel) => {
            panel.targetScale = panel.mesh === hit ? 1.035 : 1;
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    trackPerformance(dt) {
        if (this.reducedMotion || dt <= 0) return;

        this.fpsSamples.push(1 / dt);
        if (this.fpsSamples.length < 90) return;

        const average = this.fpsSamples.reduce((total, value) => total + value, 0) / this.fpsSamples.length;
        this.fpsSamples.length = 0;

        /* adaptive resolution keeps the journey smooth on weaker phones */
        if (average < 42 && this.renderScale > 0.85) {
            this.renderScale = Math.max(0.85, this.renderScale - 0.25);
            this.resize();
        } else if (average > 58 && this.renderScale < (TIER === 'low' ? 1.4 : 1.8)) {
            this.renderScale = Math.min(TIER === 'low' ? 1.4 : 1.8, this.renderScale + 0.15);
            this.resize();
        }
    }

    reset() {
        /* exposed for the toggle button and for testing */
        window.scrollTo({ top: 0, behavior: 'auto' });
        this.progress = 0;
        this.progressTarget = 0;
        this.computeAnchors();
        this.onScroll();
    }

    dispose() {
        this.stop();
        if (this.railTimer) clearInterval(this.railTimer);
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('pointermove', this.onPointerMove);

        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                const list = Array.isArray(object.material) ? object.material : [object.material];
                list.forEach((material) => {
                    Object.values(material).forEach((value) => {
                        if (value && value.isTexture) value.dispose();
                    });
                    material.dispose();
                });
            }
        });

        this.renderer.dispose();
    }
}

/* ---------------------------------------------------------
   8. JOURNEY RAIL (scroll progress navigator)
   --------------------------------------------------------- */

function buildRail(anchors) {
    const rail = document.getElementById('journeyRail');
    if (!rail || !anchors.length) return null;

    rail.innerHTML = `
        <p class="journey-rail__label">Store tour</p>
        <div class="journey-rail__track"><span class="journey-rail__fill"></span></div>
        <ol class="journey-rail__stops">
            ${anchors.map((anchor) => `
                <li class="journey-rail__stop">
                    <button
                        type="button"
                        class="journey-rail__button"
                        data-target="${anchor.id}"
                        aria-label="Jump to ${anchor.label}"
                    >
                        <span class="journey-rail__dot"></span>
                        <span class="journey-rail__text">${anchor.label}</span>
                    </button>
                </li>
            `).join('')}
        </ol>
    `;

    const fill = rail.querySelector('.journey-rail__fill');
    const stops = Array.from(rail.querySelectorAll('.journey-rail__stop'));

    stops.forEach((stop) => {
        const button = stop.querySelector('button');
        button.addEventListener('click', () => {
            const target = document.getElementById(button.dataset.target);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    return {
        update(progress, activeIndex) {
            fill.style.transform = `scaleY(${clamp(progress, 0, 1)})`;
            stops.forEach((stop, index) => {
                stop.classList.toggle('is-active', index === activeIndex);
                stop.classList.toggle('is-done', index < activeIndex);
            });
        },
    };
}

/* ---------------------------------------------------------
   9. BOOT
   --------------------------------------------------------- */

function markNo3D() {
    document.body.classList.add('no-3d');
    const canvas = document.getElementById('bg3d');
    if (canvas) canvas.style.display = 'none';
}

function initToggle(journey, rail) {
    const button = document.getElementById('toggle3d');
    if (!button) return;

    const storageKey = 'ag-3d-enabled';
    let stored = null;

    try {
        stored = window.localStorage.getItem(storageKey);
    } catch (error) {
        stored = null;
    }

    let enabled = stored === null ? true : stored === 'true';

    const apply = (animate) => {
        document.body.classList.toggle('is-3d-off', !enabled);
        button.textContent = enabled ? '3D world: on' : '3D world: off';
        button.setAttribute('aria-pressed', String(enabled));

        if (enabled) {
            journey.start();
            if (animate) window.scrollTo({ top: window.scrollY, behavior: 'auto' });
        } else {
            journey.stop();
        }
    };

    button.addEventListener('click', () => {
        enabled = !enabled;
        try {
            window.localStorage.setItem(storageKey, String(enabled));
        } catch (error) {
            /* ignore private-mode storage failures */
        }
        apply(true);
    });

    apply(false);
    return button;
}

function boot() {
    const canvas = document.getElementById('bg3d');
    if (!canvas || !window.WebGLRenderingContext) {
        markNo3D();
        return;
    }

    let journey = null;

    try {
        journey = new Journey(canvas);
    } catch (error) {
        console.warn('[3D] WebGL unavailable, using static layout:', error);
        markNo3D();
        return;
    }

    window.__journey = journey;
    document.body.classList.add('has-3d');

    const rail = buildRail(journey.anchors);
    journey.onScroll();
    journey.progress = journey.progressTarget;

    initToggle(journey, rail);
    journey.start();

    if (rail) {
        journey.railTimer = setInterval(() => {
            let active = 0;
            journey.anchors.forEach((anchor, index) => {
                if (journey.progress >= anchor.p - 0.02) active = index;
            });
            rail.update(journey.progress, active);
        }, 260);
    }

    /* keep anchors accurate after images and fonts settle */
    window.addEventListener('load', () => {
        journey.computeAnchors();
        journey.onScroll();
    });

    setTimeout(() => {
        journey.computeAnchors();
        journey.onScroll();
    }, 1200);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
