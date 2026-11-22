import { useEffect, useRef, useState } from "react";

export default function SoftLoader({ title, subtitle }: { title: string; subtitle: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapeName, setShapeName] = useState("Yumuşak yıldız");
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tau = Math.PI * 2;
    const count = 180;
    const definitions = [
      { name: "Yumuşak yıldız", radius: (t: number) => 1 + 0.1 * Math.cos(10 * t) },
      { name: "Altıgen", radius: (t: number) => { const segment = tau / 6; const p = (((t + Math.PI / 2) % segment) + segment) % segment - segment / 2; return Math.cos(Math.PI / 6) / Math.cos(p); } },
      { name: "Beşgen", radius: (t: number) => { const segment = tau / 5; const p = (((t + Math.PI / 2) % segment) + segment) % segment - segment / 2; return Math.cos(Math.PI / 5) / Math.cos(p); } },
      { name: "Kare", radius: (t: number) => { const angle = t + Math.PI / 2 + Math.PI / 4; const segment = tau / 4; const p = (((angle % segment) + segment) % segment) - segment / 2; return Math.cos(Math.PI / 4) / Math.cos(p); } },
      { name: "Üçgen", radius: (t: number) => { const segment = tau / 3; const p = (((t + Math.PI / 2) % segment) + segment) % segment - segment / 2; return Math.cos(Math.PI / 3) / Math.cos(p); } },
      { name: "Hap", radius: (t: number) => Math.pow(Math.pow(Math.abs(Math.cos(t)) / 0.74, 3.2) + Math.pow(Math.abs(Math.sin(t)), 3.2), -1 / 3.2) },
      { name: "Güneş", radius: (t: number) => 1 + 0.14 * Math.cos(8 * t) },
    ];
    const shapes = definitions.map((definition) => {
      const values = Array.from({ length: count }, (_, index) => definition.radius((index / count) * tau));
      const mean = values.reduce((sum, value) => sum + value, 0) / count;
      return { name: definition.name, values: values.map((value) => value * (0.92 / mean)) };
    });
    let width = 0, height = 0, dpr = 1, frame = 0;
    const start = performance.now();
    let lastLabel = "";
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const draw = (now: number) => {
      const elapsed = reduced ? 0 : (now - start) / 1000;
      const step = Math.floor(elapsed / 0.8);
      const local = (elapsed - step * 0.8) / 0.55;
      const eased = local < 1 ? 1 + 2.1 * Math.pow(local - 1, 3) + 1.1 * Math.pow(local - 1, 2) : 1;
      const from = shapes[step % shapes.length], to = shapes[(step + 1) % shapes.length];
      const mix = Math.max(0, Math.min(1, eased));
      if (lastLabel !== from.name) { lastLabel = from.name; setShapeName(from.name); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const cx = width / 2, cy = height / 2, outer = Math.min(width, height) * 0.43;
      const rotation = elapsed * 0.9 + (step + mix) * 0.55;
      const disc = new Path2D(); disc.arc(cx, cy, outer, 0, tau);
      const path = new Path2D();
      for (let index = 0; index < count; index++) {
        const radius = from.values[index] + (to.values[index] - from.values[index]) * mix;
        const angle = (index / count) * tau + rotation, distance = outer * 0.69 * radius;
        const x = cx + Math.cos(angle) * distance, y = cy + Math.sin(angle) * distance;
        if (index === 0) path.moveTo(x, y); else path.lineTo(x, y);
      }
      path.closePath();
      const glass = ctx.createRadialGradient(cx - outer * 0.42, cy - outer * 0.5, 2, cx, cy, outer);
      glass.addColorStop(0, "rgba(180,205,255,.16)"); glass.addColorStop(0.58, "rgba(92,125,184,.10)"); glass.addColorStop(1, "rgba(9,18,34,.72)");
      ctx.fillStyle = glass; ctx.fill(disc); ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(224,236,255,.28)"; ctx.stroke(disc);
      ctx.save(); ctx.clip(disc);
      const glow = ctx.createRadialGradient(cx - outer * 0.3, cy - outer * 0.38, 0, cx, cy, outer * 1.2);
      glow.addColorStop(0, "rgba(178,211,255,.18)"); glow.addColorStop(1, "rgba(110,145,205,0)");
      ctx.fillStyle = glow; ctx.fillRect(cx - outer, cy - outer, outer * 2, outer * 2); ctx.restore();
      const fill = ctx.createLinearGradient(cx - outer, cy - outer, cx + outer, cy + outer);
      fill.addColorStop(0, "rgba(245,250,255,.78)"); fill.addColorStop(0.35, "rgba(178,211,255,.48)"); fill.addColorStop(0.72, "rgba(132,163,220,.30)"); fill.addColorStop(1, "rgba(235,244,255,.68)");
      ctx.save(); ctx.shadowColor = "rgba(145,185,255,.32)"; ctx.shadowBlur = 18; ctx.fillStyle = fill; ctx.fill(path); ctx.restore();
      ctx.save(); ctx.lineWidth = outer * 0.035;
      const rim = ctx.createLinearGradient(cx - outer, cy - outer, cx + outer, cy + outer);
      rim.addColorStop(0, "rgba(255,255,255,.92)"); rim.addColorStop(0.45, "rgba(255,255,255,.12)"); rim.addColorStop(1, "rgba(210,230,255,.78)");
      ctx.strokeStyle = rim; ctx.stroke(path); ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.stroke(path); ctx.restore();
      for (let index = 0; index < 3; index++) {
        const angle = elapsed * 1.8 + (index * tau) / 3, x = cx + Math.cos(angle) * outer * 1.08, y = cy + Math.sin(angle) * outer * 1.08;
        ctx.beginPath(); ctx.arc(x, y, index === 0 ? 3.2 : 2.2, 0, tau); ctx.fillStyle = "rgba(218,234,255,.9)"; ctx.shadowColor = "rgba(170,205,255,.8)"; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return <div className="soft-loader" role="status" aria-live="polite"><div className="soft-loader-stage"><canvas ref={canvasRef} aria-hidden="true" /></div><strong>{title}</strong><span className="soft-loader-shape-name">{shapeName}</span><div className="soft-loader-status"><span>YÜKLENİYOR</span><i /><i /><i /></div><small>{subtitle}</small></div>;
}
