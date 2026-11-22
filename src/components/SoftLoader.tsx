import { useEffect, useRef, useState } from "react";

type Props = { title: string; subtitle: string };
const TAU = Math.PI * 2;
const COUNT = 180;

function smooth(values: number[], sigma: number) {
  const radius = Math.ceil(sigma * 3);
  const weights: number[] = [];
  let total = 0;
  for (let d = -radius; d <= radius; d++) {
    const weight = Math.exp(-(d * d) / (2 * sigma * sigma));
    weights.push(weight); total += weight;
  }
  return values.map((_, i) => {
    let sum = 0;
    for (let d = -radius; d <= radius; d++) sum += values[(i + d + COUNT) % COUNT] * weights[d + radius];
    return sum / total;
  });
}
function polygonRadius(sides: number, angle: number, offset = 0) {
  const segment = TAU / sides;
  const phase = angle + Math.PI / 2 + offset;
  const local = ((phase % segment) + segment) % segment - segment / 2;
  return Math.cos(Math.PI / sides) / Math.cos(local);
}
function makeShape(name: string, radius: (angle: number) => number, sigma: number, mean = .92) {
  let values = Array.from({ length: COUNT }, (_, i) => radius((i / COUNT) * TAU));
  if (sigma > 0) values = smooth(values, sigma);
  const average = values.reduce((a, b) => a + b, 0) / COUNT;
  return { name, values: values.map((v) => v * mean / average) };
}
const SHAPES = [
  makeShape("Yumuşak yıldız", (t) => 1 + .1 * Math.cos(10 * t), 0),
  makeShape("Altıgen", (t) => polygonRadius(6, t), 4.5),
  makeShape("Beşgen", (t) => polygonRadius(5, t), 5.5),
  makeShape("Kare", (t) => polygonRadius(4, t, Math.PI / 4), 5.5),
  makeShape("Üçgen", (t) => polygonRadius(3, t), 7, .88),
  makeShape("Hap", (t) => Math.pow(Math.pow(Math.abs(Math.cos(t)) / .74, 3.2) + Math.pow(Math.abs(Math.sin(t)), 3.2), -1 / 3.2), 0, .88),
  makeShape("Güneş", (t) => 1 + .14 * Math.cos(8 * t), 0),
];

export default function SoftLoader({ title, subtitle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapeName, setShapeName] = useState(SHAPES[0].name);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0, dpr = 1, raf = 0, lastLabel = "";
    const start = performance.now();
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(width * dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const background = document.createElement("canvas");
    background.width = background.height = 144;
    const bg = background.getContext("2d");
    const draw = (now: number) => {
      const elapsed = reduced ? 0 : (now - start) / 1000;
      const step = Math.floor(elapsed / .8);
      const local = elapsed - step * .8;
      const progress = Math.max(0, Math.min(1, local / .55));
      const eased = progress < 1 ? 1 + 2.1 * Math.pow(progress - 1, 3) + 1.1 * Math.pow(progress - 1, 2) : 1;
      const mix = Math.max(0, Math.min(1, eased));
      const from = SHAPES[step % SHAPES.length], to = SHAPES[(step + 1) % SHAPES.length];
      if (lastLabel !== from.name) { lastLabel = from.name; setShapeName(from.name); }
      const size = width, cx = size / 2, cy = size / 2, outer = size * .435, shapeRadius = outer * .70;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      const time = elapsed * .8;
      if (bg) {
        const g = bg;
        g.fillStyle = "#09191a"; g.fillRect(0, 0, 144, 144);
        const blobs = [
          [70 + 42 * Math.cos(time), 62 + 35 * Math.sin(time * .7), 74, "rgba(105,224,207,.95)"],
          [83 + 35 * Math.cos(time * .8 + 2), 76 + 31 * Math.sin(time * .6 + 1), 65, "rgba(66,150,164,.75)"],
          [58 + 28 * Math.cos(time * .5 + 4), 84 + 25 * Math.sin(time * .9), 58, "rgba(206,177,117,.48)"],
        ] as const;
        for (const [x, y, radius, color] of blobs) {
          const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, color); gradient.addColorStop(1, "rgba(9,25,26,0)");
          g.fillStyle = gradient; g.fillRect(0, 0, 144, 144);
        }
        g.fillStyle = "rgba(224,255,249,.22)";
        for (let x = 8; x < 144; x += 16) for (let y = 8; y < 144; y += 16) g.fillRect(x, y, 1.4, 1.4);
      }
      const rotation = elapsed * .9 + (step + mix) * .55;
      const path = new Path2D();
      for (let i = 0; i < COUNT; i++) {
        const r = from.values[i] + (to.values[i] - from.values[i]) * mix;
        const angle = (i / COUNT) * TAU + rotation;
        const x = cx + Math.cos(angle) * shapeRadius * r;
        const y = cy + Math.sin(angle) * shapeRadius * r;
        if (!i) path.moveTo(x, y); else path.lineTo(x, y);
      }
      path.closePath();
      const disc = new Path2D(); disc.arc(cx, cy, outer, 0, TAU);
      ctx.save();
      ctx.shadowColor = "rgba(94,221,205,.20)"; ctx.shadowBlur = outer * .3;
      const shell = ctx.createRadialGradient(cx - outer * .4, cy - outer * .5, 0, cx, cy, outer);
      shell.addColorStop(0, "rgba(175,244,232,.18)"); shell.addColorStop(.65, "rgba(30,93,91,.20)"); shell.addColorStop(1, "rgba(5,22,24,.82)");
      ctx.fillStyle = shell; ctx.fill(disc); ctx.restore();
      ctx.save(); ctx.clip(disc);
      if (bg) ctx.drawImage(background, cx - outer, cy - outer, outer * 2, outer * 2);
      ctx.fillStyle = "rgba(7,28,29,.18)"; ctx.fillRect(cx - outer, cy - outer, outer * 2, outer * 2);
      ctx.restore();
      ctx.save(); ctx.clip(path);
      if (bg) ctx.drawImage(background, cx - shapeRadius, cy - shapeRadius, shapeRadius * 2, shapeRadius * 2);
      const tint = ctx.createLinearGradient(cx - shapeRadius, cy - shapeRadius, cx + shapeRadius, cy + shapeRadius);
      tint.addColorStop(0, "rgba(220,255,248,.42)"); tint.addColorStop(.55, "rgba(103,213,199,.20)"); tint.addColorStop(1, "rgba(240,218,171,.22)");
      ctx.fillStyle = tint; ctx.fillRect(cx - shapeRadius, cy - shapeRadius, shapeRadius * 2, shapeRadius * 2);
      ctx.restore();
      ctx.save();
      ctx.lineWidth = shapeRadius * .035;
      const rim = ctx.createLinearGradient(cx - outer, cy - outer, cx + outer, cy + outer);
      rim.addColorStop(0, "rgba(255,255,255,.96)"); rim.addColorStop(.32, "rgba(205,255,247,.24)"); rim.addColorStop(.62, "rgba(255,255,255,.08)"); rim.addColorStop(1, "rgba(215,255,246,.82)");
      ctx.strokeStyle = rim; ctx.stroke(path);
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.42)"; ctx.stroke(disc);
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const angle = elapsed * 1.25 + i * TAU / 3;
        ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * outer * 1.08, cy + Math.sin(angle) * outer * 1.08, i === 0 ? 3 : 2, 0, TAU);
        ctx.fillStyle = "rgba(194,255,245,.9)"; ctx.shadowColor = "rgba(105,238,219,.85)"; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw(performance.now());
    if (!reduced) raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);
  return <div className="soft-loader" role="status" aria-live="polite"><div className="soft-loader-stage"><canvas ref={canvasRef} aria-hidden="true" /></div><strong>{title}</strong><span className="soft-loader-shape-name">{shapeName}</span><div className="soft-loader-status"><span>YÜKLENİYOR</span><i /><i /><i /></div><small>{subtitle}</small></div>;
}
