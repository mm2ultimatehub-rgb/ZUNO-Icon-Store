import { useEffect, useMemo, useRef, useState } from "react";
import { formatSize } from "../lib/storeApi";

type GaugeSettings = { color: string; wave: number; speed: number };
const QUOTA = 1024 * 1024 * 1024;
const KEY = "zuno-depo-ayar";
const COLORS = ["#8ce8dc", "#8ec5ff", "#c2a4ff", "#ff9bc7", "#f4d58d"];

function readSettings(): GaugeSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const value = JSON.parse(raw) as Partial<GaugeSettings>;
      return {
        color: COLORS.includes(value.color ?? "") ? value.color! : COLORS[0],
        wave: Math.max(0.4, Math.min(1.8, Number(value.wave) || 1)),
        speed: Math.max(0.5, Math.min(2, Number(value.speed) || 1)),
      };
    }
  } catch { /* eski/bozuk ayarları varsayılana döndür */ }
  return { color: COLORS[0], wave: 1, speed: 1 };
}

export default function StorageGauge({ usedBytes, quotaBytes = QUOTA }: { usedBytes: number; quotaBytes?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef<GaugeSettings>(readSettings());
  const [settings, setSettings] = useState<GaugeSettings>(settingsRef.current);
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(0);
  const target = Math.max(0, Math.min(1, usedBytes / quotaBytes));
  const percent = target * 100;
  const color = percent >= 90 ? "#ff647f" : percent >= 70 ? "#ffb36b" : percent >= 50 ? "#a9c9ff" : settings.color;
  const status = percent >= 90 ? "Kritik doluluk" : percent >= 70 ? "Yüksek kullanım" : percent >= 50 ? "Depolama artıyor" : "Depolama normal";
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    settingsRef.current = settings;
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* depolama ayarı zorunlu değil */ }
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let frame = 0;
    let smooth = 0;
    let last = 0;
    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    const draw = (time: number) => {
      const dt = Math.min(0.05, (time - (last || time)) / 1000);
      last = time;
      frame += dt * settingsRef.current.speed;
      const cfg = settingsRef.current;
      const goal = target;
      const intensity = goal >= .9 ? 3.8 : goal >= .7 ? 2.2 : goal >= .5 ? 1.25 : .72;
      const shake = goal >= .9 ? 3.8 : goal >= .7 ? 1.15 : goal >= .5 ? .28 : .04;
      const cx = width / 2, cy = height / 2;
      const radius = Math.min(width, height) * .355;
      const jitterX = reducedMotion ? 0 : Math.sin(frame * 27) * shake * (goal >= .9 ? 1 : .25);
      const jitterY = reducedMotion ? 0 : Math.cos(frame * 31) * shake * (goal >= .9 ? 1 : .25);
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(cx + jitterX, cy + jitterY);

      // Outer animated halo: the orbit becomes increasingly turbulent as the quota fills.
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        const points = 180;
        for (let i = 0; i <= points; i++) {
          const a = i / points * Math.PI * 2;
          const wave = reducedMotion ? 0 : Math.sin(a * (5 + ring) + frame * (1.5 + ring * .22) + ring) * (2.2 + intensity * cfg.wave * 1.9);
          const ripple = reducedMotion ? 0 : Math.sin(a * 13 - frame * (2.1 + ring * .3)) * intensity * cfg.wave * (goal >= .9 ? 3.2 : 1.05);
          const r = radius + 15 + ring * 7 + wave + ripple;
          const x = Math.cos(a) * r, y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.globalAlpha = (0.23 - ring * .045) * (goal >= .9 ? 1 : 0.82);
        ctx.lineWidth = ring === 0 ? 2.1 : 1.15;
        ctx.shadowColor = color;
        ctx.shadowBlur = (goal >= .9 ? 24 : 13) + intensity * 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      // Glass vessel.
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8, 18, 27, .72)";
      ctx.fill();
      ctx.strokeStyle = "rgba(226, 250, 255, .38)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
      ctx.clip();
      const fillY = radius - 2 - (radius * 2 - 4) * smooth;
      const waveAmp = reducedMotion ? 0 : (3 + intensity * cfg.wave * 2.8);
      const grad = ctx.createLinearGradient(0, fillY, 0, radius);
      grad.addColorStop(0, color + "aa");
      grad.addColorStop(1, color + "38");
      ctx.beginPath();
      ctx.moveTo(-radius, radius);
      for (let x = -radius; x <= radius + 2; x += 3) {
        const wave = Math.sin(x * .045 + frame * 2.5) * waveAmp + Math.sin(x * .022 - frame * 1.55) * waveAmp * .45;
        ctx.lineTo(x, fillY + wave);
      }
      ctx.lineTo(radius, radius); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      // Soft moving caustic highlights.
      ctx.globalAlpha = .16;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 3; i++) {
        const x = Math.sin(frame * .45 + i * 2.2) * radius * .65;
        ctx.beginPath(); ctx.ellipse(x, fillY + 22 + i * 18, radius * .34, 5, -.12, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.restore();

      smooth += (goal - smooth) * (1 - Math.pow(.001, dt || .016));
      if (Math.abs(goal - smooth) < .0003) smooth = goal;
      setDisplay(smooth * 100);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); observer?.disconnect(); };
  }, [target, color, reducedMotion]);

  return <section className="zuno-storage-gauge">
    <div className="zuno-storage-gauge__top">
      <div><p className="eyebrow">DOSYA DEPOLAMA</p><h2>1 GB alan kullanımı</h2><p className="zuno-storage-gauge__status" style={{ color }}>{status}</p></div>
      <button className="zuno-gauge-settings" type="button" aria-label="Depolama animasyonu ayarları" aria-expanded={open} onClick={() => setOpen(v => !v)}>⚙</button>
    </div>
    {open && <div className="zuno-gauge-popover">
      <div className="zuno-gauge-setting"><span>Renk</span><div className="zuno-gauge-colors">{COLORS.map(c => <button key={c} type="button" aria-label={c} aria-pressed={settings.color === c} style={{ background: c }} onClick={() => setSettings(s => ({ ...s, color: c }))} />)}</div></div>
      <label className="zuno-gauge-setting">Dalga şiddeti <input type="range" min=".4" max="1.8" step=".1" value={settings.wave} onChange={e => setSettings(s => ({ ...s, wave: Number(e.target.value) }))} /></label>
      <label className="zuno-gauge-setting">Animasyon hızı <input type="range" min=".5" max="2" step=".1" value={settings.speed} onChange={e => setSettings(s => ({ ...s, speed: Number(e.target.value) }))} /></label>
    </div>}
    <div className="zuno-storage-gauge__visual">
      <canvas ref={canvasRef} role="img" aria-label={`Depolama kullanımı yüzde ${percent.toFixed(2)}`} />
      <div className="zuno-storage-gauge__readout"><strong>{display.toFixed(1)}<small>%</small></strong><span>{formatSize(usedBytes)} / 1 GB</span></div>
    </div>
    <div className="zuno-storage-gauge__bottom"><strong>{percent.toFixed(2)}%</strong><span>{formatSize(Math.max(0, quotaBytes - usedBytes))} boş alan</span></div>
    <p className="admin-note">Yalnızca ZUNO'nun Supabase dosya alanındaki gerçek dosyalar sayılır. Pinterest bağlantıları dosya olarak saklanmadığı için bu hesaba dahil değildir. Dosya yüklemeleri toplam 1 GB sınırını aşamaz.</p>
  </section>;
}
