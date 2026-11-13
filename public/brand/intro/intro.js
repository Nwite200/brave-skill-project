/*
 * BRAVE SKILL — cinematic brand intro renderer
 * Deterministic canvas renderer used by the website, the /intro page and the
 * offline video renderer. Time is in milliseconds.
 */
(function () {
  const C = {
    ink: "#050509",
    purple: "#873BFF",
    purpleSoft: "#A879FF",
    blue: "#1677FF",
    cyan: "#20D9E8",
    emerald: "#10C99A",
    white: "#FFFFFF",
    muted: "#94A3B8",
    dim: "#64748B",
  };

  const DURATION = 15000;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const norm = (t, start, end) => clamp((t - start) / (end - start));
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOutQuint = (x) => 1 - Math.pow(1 - x, 5);
  const lerp = (a, b, t) => a + (b - a) * t;

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const B_PATH =
    "M31 43 V80 M31 43 H51.5 C59.5 43 64.5 47.5 64.5 54.5 C64.5 61.5 59.5 66 51.5 66 H31 M31 66 H55 C63 66 68.5 70.5 68.5 78 C68.5 85 63 89 55 89 H31";
  const CAP_PATH = "M20 27.5 L48 14 L76 27.5 L48 41 Z";

  let particles = [];
  let dust = [];
  let grain = null;
  let lastSize = "";

  function makeParticles(w, h) {
    const rand = mulberry32(20261113);
    particles = Array.from({ length: 150 }, () => {
      const angle = rand() * Math.PI * 2;
      const radius = 60 + rand() * Math.max(w, h) * 0.52;
      return {
        angle,
        radius,
        speed: 0.00002 + rand() * 0.00007,
        size: 0.6 + rand() * 2.2,
        twinkle: rand() * Math.PI * 2,
        depth: 0.25 + rand() * 0.75,
        color: [C.purple, C.cyan, C.blue, C.emerald][Math.floor(rand() * 4)],
      };
    });
    dust = Array.from({ length: 28 }, () => ({
      x: rand() * w,
      y: rand() * h,
      size: 0.5 + rand() * 1.4,
      alpha: 0.05 + rand() * 0.18,
      drift: 6 + rand() * 20,
      phase: rand() * Math.PI * 2,
    }));
  }

  function makeGrain() {
    const size = 180;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(size, size);
    const rand = mulberry32(77);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = rand() * 255;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = rand() * 26;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  function glow(ctx, x, y, radius, color, alpha) {
    if (alpha <= 0.001) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function roundedText(ctx, text, x, y, spacing) {
    if ("letterSpacing" in ctx) {
      ctx.letterSpacing = `${spacing}px`;
      ctx.fillText(text, x, y);
      ctx.letterSpacing = "0px";
      return;
    }
    let cursor = x;
    for (const char of text) {
      ctx.fillText(char, cursor, y);
      cursor += ctx.measureText(char).width + spacing;
    }
  }

  function measureTracked(ctx, text, spacing) {
    let width = 0;
    for (const char of text) width += ctx.measureText(char).width + spacing;
    return width - (text.length ? spacing : 0);
  }

  function drawBackground(ctx, w, h, t, opts) {
    if (!opts.transparent) {
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, w, h);
    }
    const intro = easeOutCubic(norm(t, 0, 2000));
    const pulse = 0.5 + 0.5 * Math.sin((t / 1000) * 1.6);
    glow(ctx, w * 0.5, h * 0.40, Math.max(w, h) * 0.40, "rgba(135,59,255,0.28)", 0.42 * intro * (0.85 + pulse * 0.15));
    glow(ctx, w * 0.5, h * 0.43, Math.max(w, h) * 0.20, "rgba(32,217,232,0.16)", 0.36 * intro);
    if (!opts.transparent) {
      const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, Math.max(w, h) * 0.72);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(0.7, "rgba(0,0,0,0.28)");
      vignette.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawParticles(ctx, w, h, t, opts) {
    const s = h / 1080;
    const reveal = easeOutCubic(norm(t, 200, 2600));
    const settle = opts.logoOnly ? 0.4 : 1;
    ctx.save();
    for (const p of particles) {
      const angle = p.angle + t * p.speed * (0.4 + p.depth);
      const radius = p.radius * (0.9 + 0.1 * Math.sin(t / 4000 + p.angle));
      const x = w / 2 + Math.cos(angle) * radius;
      const y = h * 0.41 + Math.sin(angle) * radius * 0.52;
      const flicker = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t / 700 + p.twinkle));
      const alpha = clamp(reveal * flicker * p.depth * 0.55 * settle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8 * s;
      ctx.beginPath();
      ctx.arc(x, y, p.size * s * p.depth, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (p.depth > 0.7) {
        const nx = w / 2 + Math.cos(angle - 0.01) * radius;
        const ny = h * 0.41 + Math.sin(angle - 0.01) * radius * 0.52;
        ctx.globalAlpha = alpha * 0.35;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * s * 0.5;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    for (const d of dust) {
      const x = d.x + Math.sin(t / 9000 + d.phase) * d.drift;
      const y = d.y + Math.cos(t / 11000 + d.phase) * d.drift;
      ctx.globalAlpha = d.alpha * reveal;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc((x % w + w) % w, (y % h + h) % h, d.size * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGeometry(ctx, w, h, t, opts) {
    if (opts.logoOnly || opts.transparent) return;
    const reveal = easeOutCubic(norm(t, 9200, 12200));
    if (reveal <= 0.001) return;
    const s = h / 1080;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(w / 2, h * 0.43);
    ctx.globalAlpha = reveal * 0.085;
    ctx.strokeStyle = C.purple;
    ctx.lineWidth = 0.7 * s;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + t * 0.00002;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 240 * s, Math.sin(angle) * 240 * s);
      ctx.lineTo(Math.cos(angle) * 900 * s, Math.sin(angle) * 900 * s);
      ctx.stroke();
    }
    ctx.globalAlpha = reveal * 0.12;
    for (let r = 1; r <= 3; r++) {
      ctx.strokeStyle = r === 2 ? C.cyan : C.purple;
      ctx.beginPath();
      ctx.arc(0, 0, (250 + r * 90) * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRing(ctx, w, h, t, opts) {
    const s = h / 1080;
    const cx = w / 2;
    const cy = h * 0.375;
    const build = easeOutQuint(norm(t, 1500, 4100));
    const fade = opts.logoOnly ? 1 : clamp(1 - norm(t, 13800, 15000) * 0.8);
    if (build <= 0.001) return;
    const radius = 176 * s;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.16 * build * fade;
    ctx.strokeStyle = C.purple;
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.55 * build * fade;
    ctx.strokeStyle = C.purple;
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.5 * build * fade;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 10 * s, 0, Math.PI * 2);
    ctx.stroke();

    const rotation = t * 0.0011;
    const cyanArc = 0.55 + 0.25 * Math.sin(t / 3000);
    ctx.globalAlpha = build * fade;
    ctx.strokeStyle = C.cyan;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 18 * s;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(0, 0, radius, rotation, rotation + cyanArc);
    ctx.stroke();

    ctx.strokeStyle = C.purple;
    ctx.shadowColor = C.purple;
    ctx.beginPath();
    ctx.arc(0, 0, radius, rotation + Math.PI * 0.9, rotation + Math.PI * 0.9 + 0.35);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // orbital nodes
    for (let i = 0; i < 3; i++) {
      const a = rotation * (1.4 + i * 0.2) + (i / 3) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      ctx.globalAlpha = 0.7 * build * fade;
      ctx.fillStyle = i === 0 ? C.cyan : C.purpleSoft;
      ctx.beginPath();
      ctx.arc(x, y, (i === 0 ? 2.6 : 1.8) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMark(ctx, w, h, t, opts) {
    const s = h / 1080;
    const cx = w / 2;
    const cy = h * 0.375;
    const trace = norm(t, 3350, 5900);
    const appear = easeOutCubic(norm(t, 3350, 4400));
    if (trace <= 0 && !opts.logoOnly) return;
    const scale = 2.35 * s * (0.94 + 0.06 * easeOutQuint(norm(t, 3350, 5200)));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-48, -54);
    ctx.globalCompositeOperation = "lighter";

    // cap
    const capIn = easeOutQuint(norm(t, 4200, 5100));
    if (capIn > 0) {
      const capGradient = ctx.createLinearGradient(20, 14, 76, 41);
      capGradient.addColorStop(0, C.purpleSoft);
      capGradient.addColorStop(0.55, C.blue);
      capGradient.addColorStop(1, C.cyan);
      ctx.save();
      ctx.globalAlpha = capIn;
      ctx.translate(48, 27.5);
      ctx.scale(0.85 + 0.15 * capIn, 0.85 + 0.15 * capIn);
      ctx.translate(-48, -27.5);
      ctx.shadowColor = C.purple;
      ctx.shadowBlur = 18;
      ctx.fillStyle = capGradient;
      ctx.fill(new Path2D(CAP_PATH));
      ctx.restore();

      // tassel
      const tassel = easeOutCubic(norm(t, 4700, 5600));
      ctx.save();
      ctx.globalAlpha = 0.9 * tassel;
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(67, 31.5);
      ctx.bezierCurveTo(73, 34, 74, 40, 74, 45 * (0.4 + 0.6 * tassel));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(74, 47.5, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = C.cyan;
      ctx.fill();
      ctx.restore();
    }

    // B monogram light trace
    const path = new Path2D(B_PATH);
    const draw = easeInOut(trace);
    const gradient = ctx.createLinearGradient(28, 44, 70, 88);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(0.55, "#E5DEFF");
    gradient.addColorStop(1, C.cyan);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6.2;
    ctx.strokeStyle = gradient;
    ctx.shadowColor = C.purple;
    ctx.shadowBlur = 26;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([430, 430]);
    ctx.lineDashOffset = 430 * (1 - draw);
    ctx.stroke(path);
    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 5.6;
    ctx.strokeStyle = gradient;
    ctx.globalAlpha = 0.95 * appear;
    ctx.setLineDash([430, 430]);
    ctx.lineDashOffset = 430 * (1 - draw);
    ctx.stroke(path);
    ctx.restore();

    // specular sweep across the mark
    const sweep = norm(t, 5750, 7250);
    if (sweep > 0 && sweep < 1) {
      const box = { x: 18, y: 10, width: 66, height: 84 };
      const off = document.createElement("canvas");
      off.width = 96;
      off.height = 96;
      const octx = off.getContext("2d");
      octx.lineCap = "round";
      octx.lineJoin = "round";
      octx.lineWidth = 7;
      octx.strokeStyle = "#FFFFFF";
      octx.stroke(new Path2D(B_PATH));
      octx.fillStyle = "#FFFFFF";
      octx.fill(new Path2D(CAP_PATH));
      octx.globalCompositeOperation = "source-in";
      const sx = lerp(-40, 110, easeInOut(sweep));
      const band = octx.createLinearGradient(sx - 26, 0, sx + 26, 70);
      band.addColorStop(0, "rgba(255,255,255,0)");
      band.addColorStop(0.5, "rgba(255,255,255,0.85)");
      band.addColorStop(1, "rgba(255,255,255,0)");
      octx.fillStyle = band;
      octx.fillRect(0, 0, 96, 96);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.55 * Math.sin(sweep * Math.PI);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }

    // highlighted registration dot
    const dot = easeOutCubic(norm(t, 5600, 6400));
    if (dot > 0 && !opts.logoOnly) {
      ctx.globalAlpha = dot;
      ctx.fillStyle = C.emerald;
      ctx.shadowColor = C.emerald;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(76, 79, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWordmark(ctx, w, h, t, opts) {
    if (opts.logoOnly) return;
    const s = h / 1080;
    const cx = w / 2;
    const y = h * 0.615;
    const reveal = easeOutCubic(norm(t, 6100, 7700));
    if (reveal <= 0) return;
    const blur = (1 - reveal) * 14 * s;
    const lift = (1 - reveal) * 18 * s;
    const spacing = lerp(18, 7, reveal) * s;
    ctx.save();
    ctx.textBaseline = "alphabetic";
    ctx.filter = blur > 0.4 ? `blur(${blur}px)` : "none";
    ctx.globalAlpha = reveal;
    ctx.font = `600 ${72 * s}px Inter, sans-serif`;
    const brave = "BRAVE";
    const skill = "SKILL";
    const space = 24 * s;
    const total = measureTracked(ctx, brave, spacing) + space + measureTracked(ctx, skill, spacing);
    const startX = cx - total / 2;
    ctx.fillStyle = C.white;
    roundedText(ctx, brave, startX, y + lift, spacing);
    const skillX = startX + measureTracked(ctx, brave, spacing) + space;
    const skillGradient = ctx.createLinearGradient(skillX, y - 60 * s, skillX + 320 * s, y + 10 * s);
    skillGradient.addColorStop(0, "#C9C2FF");
    skillGradient.addColorStop(0.5, C.cyan);
    skillGradient.addColorStop(1, "#8FF3E3");
    ctx.fillStyle = skillGradient;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 18 * s * reveal;
    roundedText(ctx, skill, skillX, y + lift, spacing);
    ctx.restore();

    // subtitle
    const sub = easeOutCubic(norm(t, 7000, 8400));
    if (sub > 0) {
      ctx.save();
      ctx.globalAlpha = sub * 0.92;
      ctx.font = `500 ${13 * s}px Inter, sans-serif`;
      ctx.fillStyle = C.muted;
      const text = "SKILL ACQUISITION ACADEMY";
      const sp = lerp(10, 6.4, sub) * s;
      const width = measureTracked(ctx, text, sp);
      roundedText(ctx, text, cx - width / 2, y + 38 * s, sp);
      ctx.restore();
    }
  }

  function drawTagline(ctx, w, h, t, opts) {
    if (opts.logoOnly || opts.short) return;
    const s = h / 1080;
    const cx = w / 2;
    const y = h * 0.735;
    const reveal = easeOutCubic(norm(t, 8100, 9400));
    if (reveal <= 0) return;
    const sweep = easeInOut(norm(t, 8600, 10100));
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.font = `500 ${14 * s}px Inter, sans-serif`;
    ctx.fillStyle = C.white;
    const text = "LEARN.  PRACTICE.  BUILD.";
    const sp = 5 * s;
    const width = measureTracked(ctx, text, sp);
    const x = cx - width / 2;
    const gradient = ctx.createLinearGradient(cx - width * 0.7 + sweep * width * 1.4, y - 30 * s, cx - width * 0.2 + sweep * width * 1.4, y + 20 * s);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(0.42, "#FFFFFF");
    gradient.addColorStop(0.5, C.cyan);
    gradient.addColorStop(0.58, "#FFFFFF");
    gradient.addColorStop(1, "#FFFFFF");
    ctx.fillStyle = gradient;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 10 * s * Math.sin(sweep * Math.PI);
    roundedText(ctx, text, x, y, sp);
    ctx.restore();
  }

  function drawFinale(ctx, w, h, t, opts) {
    if (opts.logoOnly || opts.short) return;
    const s = h / 1080;
    const cx = w / 2;
    const y = h * 0.805;
    const reveal = easeOutCubic(norm(t, 11600, 13200));
    if (reveal <= 0) return;
    ctx.save();
    ctx.globalAlpha = reveal * 0.92;
    ctx.font = `500 ${12 * s}px Inter, sans-serif`;
    ctx.fillStyle = "#C7D0E0";
    const text = "YOUR FUTURE STARTS HERE.";
    const sp = lerp(9, 5, reveal) * s;
    const width = measureTracked(ctx, text, sp);
    roundedText(ctx, text, cx - width / 2, y, sp);
    ctx.restore();

    const line = easeOutCubic(norm(t, 12400, 13800));
    if (line > 0) {
      const grad = ctx.createLinearGradient(cx - 120 * s, 0, cx + 120 * s, 0);
      grad.addColorStop(0, "rgba(135,59,255,0)");
      grad.addColorStop(0.5, "rgba(32,217,232,0.8)");
      grad.addColorStop(1, "rgba(135,59,255,0)");
      ctx.save();
      ctx.globalAlpha = line * 0.8;
      ctx.fillStyle = grad;
      ctx.fillRect(cx - 120 * s * line, y + 24 * s, 240 * s * line, 1 * s);
      ctx.restore();
    }
  }

  function drawLogoOnlyMark(ctx, w, h, t, centered) {
    const s = Math.min(w, h) / 1080;
    ctx.save();
    if (!centered) ctx.translate(w / 2, h / 2);
    ctx.scale(2.35 * s, 2.35 * s);
    ctx.translate(-48, -54);
    const capGradient = ctx.createLinearGradient(20, 14, 76, 41);
    capGradient.addColorStop(0, C.purpleSoft);
    capGradient.addColorStop(0.55, C.blue);
    capGradient.addColorStop(1, C.cyan);
    ctx.fillStyle = capGradient;
    ctx.fill(new Path2D(CAP_PATH));
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(67, 31.5);
    ctx.bezierCurveTo(73, 34, 74, 40, 74, 45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(74, 47.5, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = C.cyan;
    ctx.fill();
    const gradient = ctx.createLinearGradient(28, 44, 70, 88);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(0.6, "#E5DEFF");
    gradient.addColorStop(1, C.cyan);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6.2;
    ctx.strokeStyle = gradient;
    ctx.stroke(new Path2D(B_PATH));
    ctx.fillStyle = C.emerald;
    ctx.beginPath();
    ctx.arc(76, 79, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function render(ctx, time, options) {
    const opts = Object.assign({ transparent: false, logoOnly: false, short: false }, options || {});
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const key = `${w}x${h}`;
    if (key !== lastSize) {
      makeParticles(w, h);
      lastSize = key;
    }
    if (!grain) grain = makeGrain();
    const t = clamp(time, 0, opts.short ? 2400 : DURATION);
    ctx.clearRect(0, 0, w, h);
    if (opts.logoOnly) {
      const inAlpha = easeOutCubic(norm(t, 0, 700));
      const sUnit = Math.min(w, h) / 1080;
      const cx = w / 2;
      const cy = h / 2;
      const radius = 330 * sUnit;
      const rotation = t * 0.0012;
      const pulse = 1 + 0.008 * Math.sin(t / 900);
      ctx.save();
      ctx.globalAlpha = inAlpha;
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(cx, cy);
      ctx.strokeStyle = C.purple;
      ctx.lineWidth = 1.2 * sUnit;
      ctx.shadowColor = C.purple;
      ctx.shadowBlur = 18 * sUnit;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = C.cyan;
      ctx.shadowColor = C.cyan;
      ctx.lineWidth = 2.4 * sUnit;
      ctx.beginPath();
      ctx.arc(0, 0, radius, rotation, rotation + Math.PI * 0.65);
      ctx.stroke();
      ctx.strokeStyle = C.purpleSoft;
      ctx.shadowColor = C.purpleSoft;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 14 * sUnit, rotation + Math.PI, rotation + Math.PI * 1.3);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = inAlpha;
      ctx.translate(cx, cy + 6 * sUnit);
      ctx.scale(pulse, pulse);
      drawLogoOnlyMark(ctx, w, h, t, true);
      ctx.restore();
      return;
    }

    drawBackground(ctx, w, h, t, opts);
    drawParticles(ctx, w, h, t, opts);
    drawGeometry(ctx, w, h, t, opts);
    drawRing(ctx, w, h, t, opts);
    drawMark(ctx, w, h, t, opts);
    drawWordmark(ctx, w, h, t, opts);
    drawTagline(ctx, w, h, t, opts);
    drawFinale(ctx, w, h, t, opts);

    // film grain + final fade
    if (!opts.transparent) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      const pattern = ctx.createPattern(grain, "repeat");
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      const fadeOut = easeInOut(norm(t, 14300, 15000));
      if (fadeOut > 0) {
        ctx.fillStyle = `rgba(5,5,9,${fadeOut})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  window.BraveIntro = {
    duration: DURATION,
    render,
    colors: C,
  };
})();
