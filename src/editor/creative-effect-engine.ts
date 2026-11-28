/**
 * Shared creative-effect processors used by the live preview and browser export.
 * Effects are deterministic for a given frame time so exported frames are stable.
 */
const CSS_EFFECTS: Record<string, string> = {
  "Blur":"blur(3px)", "Gaussian Blur":"blur(4px)", "Radial Blur":"blur(2px) saturate(1.12)",
  "Motion Blur":"blur(1.4px)", "Directional Blur":"blur(1.8px)", "Spin Blur":"blur(2px)",
  "Soft Focus":"blur(.8px) brightness(1.05)", "Background Blur":"blur(2px)",
  "Vignette":"contrast(1.08)", "Chromatic Aberration":"saturate(1.14) contrast(1.06)",
  "RGB Split":"saturate(1.25) contrast(1.08)", "Channel Shift":"saturate(1.25)",
  "Glitch":"contrast(1.12) saturate(1.16)", "Digital Glitch":"contrast(1.18) saturate(1.22)",
  "VHS Distortion":"saturate(.82) contrast(1.08)", "Signal Interference":"contrast(1.12) saturate(.9)",
  "Pixel Sort":"contrast(1.18) saturate(1.12)", "Data Moshing":"contrast(1.2) saturate(1.18)",
  "Scan Distortion":"contrast(1.12)", "Static Burst":"contrast(1.1) saturate(.8)",
  "Digital Shake":"contrast(1.1) saturate(1.14)", "Bit Crush":"contrast(1.3) saturate(1.2)",
  "Lens Flare":"brightness(1.08) saturate(1.12)", "Anamorphic Flare":"contrast(1.08) saturate(1.15)",
  "Light Leak":"brightness(1.08) sepia(.08)", "Film Burn":"sepia(.18) brightness(1.08)",
  "Bloom":"brightness(1.08) saturate(1.14)", "Soft Glow":"brightness(1.06) contrast(.96)",
  "Prism Refraction":"saturate(1.22) hue-rotate(8deg)", "Rainbow Refraction":"saturate(1.3) hue-rotate(12deg)",
  "Bokeh":"brightness(1.06) saturate(1.12)", "Sun Rays":"sepia(.08) brightness(1.08)",
  "Halation":"sepia(.1) saturate(1.12) brightness(1.04)", "Light Streak":"contrast(1.08) saturate(1.12)",
  "Film Grain":"contrast(1.08) saturate(.9)", "Dust & Scratches":"contrast(1.06) saturate(.92)",
  "VHS Tape":"saturate(.82) contrast(1.08)", "8mm Film":"sepia(.16) saturate(.9) contrast(1.08)",
  "16mm Film":"sepia(.08) saturate(.94) contrast(1.06)", "Projector Flicker":"contrast(1.1)",
  "Gate Weave":"contrast(1.05) saturate(.94)", "Old Television":"grayscale(.18) contrast(1.12)",
  "Film Jitter":"contrast(1.08) saturate(.9)", "Analog Noise":"contrast(1.06) saturate(.88)",
  "Neon Glow":"saturate(1.55) contrast(1.12)", "Edge Detect":"grayscale(1) contrast(1.8)",
  "Cartoon":"saturate(1.35) contrast(1.35)", "Pencil Sketch":"grayscale(1) contrast(1.45)",
  "Posterize":"contrast(1.45) saturate(1.25)", "Duotone":"grayscale(1) sepia(.28) contrast(1.2)",
  "Halftone":"contrast(1.22) saturate(.92)", "Pixelate":"contrast(1.18)",
  "Mosaic":"contrast(1.15)", "Silhouette":"brightness(.42) contrast(1.8)",
  "Thermal Vision":"hue-rotate(245deg) saturate(1.8) contrast(1.15)",
  "Infrared":"hue-rotate(285deg) saturate(1.45) contrast(1.12)",
  "Comic Book":"saturate(1.5) contrast(1.45)", "Watercolour":"saturate(.82) contrast(.9) brightness(1.06)",
  "Mirror":"contrast(1.04)", "Kaleidoscope":"saturate(1.22) contrast(1.08)",
  "Split Screen":"contrast(1.04)", "Quad Screen":"contrast(1.04)", "Clone":"contrast(1.04)",
  "Infinite Zoom":"contrast(1.06)", "Twirl":"saturate(1.12)", "Bulge":"contrast(1.08)",
  "Scanlines":"contrast(1.08)", "Digital Noise":"contrast(1.08) saturate(.92)",
  "RGB Noise":"saturate(1.18) contrast(1.08)", "Crosshatch":"grayscale(.4) contrast(1.3)",
  "Wave Warp":"saturate(1.12)", "Ripple":"saturate(1.08)", "Fisheye":"contrast(1.08)",
  "Liquid Warp":"saturate(1.18)", "Heat Haze":"brightness(1.05) saturate(1.12)",
  "Displacement":"contrast(1.08)", "Turbulence":"contrast(1.12) saturate(1.12)",
  "Jelly Warp":"saturate(1.14)", "Barrel Distortion":"contrast(1.08)",
  "Volumetric Light":"brightness(1.08) saturate(1.1)", "God Rays":"brightness(1.1) sepia(.06)",
  "Dream Glow":"brightness(1.1) contrast(.92) saturate(1.1)",
  "Holographic Glow":"saturate(1.45) hue-rotate(12deg)",
  "Aurora Glow":"saturate(1.35) hue-rotate(22deg)",
  "Solarize":"invert(.72) contrast(1.15)", "Colour Negative":"invert(1)",
  "Selective Colour":"saturate(1.25) contrast(1.08)", "Vintage Print":"sepia(.24) contrast(1.08)",
  "Lomo":"contrast(1.2) saturate(1.28)", "Pastel Wash":"saturate(.76) brightness(1.08)",
  "Rich Shadows":"contrast(1.2) saturate(1.06)", "Matte Highlights":"contrast(.9) brightness(1.06)",
  "Cinema Grade":"contrast(1.16) saturate(1.12)",
  "Frame Echo":"contrast(1.08) saturate(1.1)", "Long Exposure":"brightness(1.04) saturate(1.12)",
  "Ghost Trail":"contrast(1.08) saturate(.92)", "Speed Smear":"blur(1px) contrast(1.08)",
  "Temporal Blend":"contrast(1.05) saturate(1.05)", "Rolling Shutter":"contrast(1.08)",
  "Fine Grain":"contrast(1.06) saturate(.94)", "Heavy Grain":"contrast(1.12) saturate(.88)",
  "Dust Specks":"contrast(1.04)", "Scratch Pass":"contrast(1.08)", "Glassy Surface":"contrast(1.08) saturate(1.12)",
  "Metallic Sheen":"contrast(1.2) saturate(.9)", "Edge Glow":"contrast(1.14) saturate(1.2)"
};

const PARTICLE_NAMES = /snow|rain|dust|particle|ember|firefl|confetti|bubble|glitter|petal|leaf|starfield|sparkle|smoke|fog|bokeh|fireflies|falling/i;
const LIGHT_NAMES = /flare|light|glow|rays|bloom|halation|prism|rainbow|streak|flash|aurora|laser|volumetric/i;
const FILM_NAMES = /grain|scratch|scanline|vhs|tape|projector|analog|static|noise|old television|film jitter/i;
const GLITCH_NAMES = /glitch|rgb split|channel shift|signal interference|pixel sort|data moshing|databend|corrupt|error screen|scan distortion|bit crush/i;
const MOTION_NAMES = /shake|whip pan|zoom pulse|dolly zoom|spin blur|motion echo|stutter|speed trail|frame echo|time slice|ghost trail|rolling shutter/i;
const OPTICAL_NAMES = /blur|focus|bokeh|chromatic|lens|fisheye|distortion|warp|ripple|twirl|bulge|pinch|kaleidoscope|mirror/i;
const STYLIZED_NAMES = /cartoon|sketch|posterize|duotone|halftone|pixelate|mosaic|silhouette|thermal|infrared|comic|watercolour|solarize|negative/i;

export function hasCreativeEffectProcessor(name: string): boolean {
  return !!CSS_EFFECTS[name] || PARTICLE_NAMES.test(name) || LIGHT_NAMES.test(name) ||
    FILM_NAMES.test(name) || GLITCH_NAMES.test(name) || MOTION_NAMES.test(name) ||
    OPTICAL_NAMES.test(name) || STYLIZED_NAMES.test(name) ||
    /mirror|screen|clone|zoom|transform|texture|surface|warp|distortion|atmosphere|weather/i.test(name);
}

export function getCreativeEffectCss(name?: string): string {
  if (!name || name === "none") return "none";
  if (CSS_EFFECTS[name]) return CSS_EFFECTS[name];
  if (GLITCH_NAMES.test(name)) return "contrast(1.16) saturate(1.18)";
  if (FILM_NAMES.test(name)) return "contrast(1.07) saturate(.91)";
  if (LIGHT_NAMES.test(name)) return "brightness(1.06) saturate(1.14)";
  if (PARTICLE_NAMES.test(name)) return "contrast(1.04) saturate(1.08)";
  if (STYLIZED_NAMES.test(name)) return "contrast(1.22) saturate(1.18)";
  if (OPTICAL_NAMES.test(name)) return "contrast(1.08) saturate(1.12)";
  if (MOTION_NAMES.test(name)) return "contrast(1.08) saturate(1.08)";
  return hasCreativeEffectProcessor(name) ? "contrast(1.06) saturate(1.08)" : "none";
}

/** Paints effect-specific texture/light/particle passes over the clip in export. */
export function drawCreativeEffect(
  ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
  time: number, name?: string, intensity = 1
): void {
  if (!name || name === "none" || intensity <= 0) return;
  const alpha = Math.max(0, Math.min(1, intensity));
  const key = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();

  if (GLITCH_NAMES.test(name)) {
    const bandY = y + (Math.abs(Math.sin(time * 13 + key)) * .72 + .08) * height;
    const shift = Math.sin(time * 19 + key) * width * .025 * alpha;
    ctx.globalAlpha = .42 * alpha; ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "#ff315d"; ctx.fillRect(x + shift, bandY, width, Math.max(2, height * .012));
    ctx.fillStyle = "#27e8ff"; ctx.fillRect(x - shift, bandY + height * .016, width, Math.max(2, height * .008));
    if (/rgb|chromatic|channel/i.test(name)) {
      ctx.globalAlpha = .12 * alpha; ctx.fillStyle = "#ff315d"; ctx.fillRect(x, y, width * .018, height);
      ctx.fillStyle = "#27e8ff"; ctx.fillRect(x + width * .982, y, width * .018, height);
    }
  } else if (FILM_NAMES.test(name)) {
    ctx.globalAlpha = .16 * alpha; ctx.fillStyle = "#111";
    const spacing = /scanline|television|vhs/i.test(name) ? 4 : 7;
    for (let row = 0; row < height; row += spacing) ctx.fillRect(x, y + row, width, 1);
    ctx.globalAlpha = .12 * alpha; ctx.fillStyle = "#fff";
    for (let i = 0; i < 90; i++) {
      const px = x + ((i * 73 + key * 11) % 997) / 997 * width;
      const py = y + ((i * 137 + key * 7) % 991) / 991 * height;
      ctx.fillRect(px, py, 1.2, 1.2);
    }
  } else if (PARTICLE_NAMES.test(name)) {
    const snow = /snow|starfield/i.test(name), rain = /rain|drip/i.test(name);
    const count = Math.max(12, Math.round(Math.min(100, width * height / 15000)));
    ctx.globalAlpha = .62 * alpha; ctx.fillStyle = snow ? "#f5fbff" : /ember|fire|flame/i.test(name) ? "#ffb35a" : "#fff2cf";
    ctx.strokeStyle = rain ? "rgba(170,220,255,.7)" : ctx.fillStyle;
    for (let i = 0; i < count; i++) {
      const px = x + ((i * 97 + key * 13) % 997) / 997 * width;
      const drift = (time * (rain ? 190 : 38) + i * 41 + key) % (height + 16);
      const py = y + drift - 8;
      const radius = snow ? 1.5 + (i % 4) * .55 : 1 + (i % 3) * .5;
      if (rain) { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3, py + 12); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (LIGHT_NAMES.test(name)) {
    const pulse = .5 + .5 * Math.sin(time * 1.8 + key);
    const cx = x + width * (.25 + .5 * ((key % 7) / 7));
    const cy = y + height * (.2 + .35 * ((key % 5) / 5));
    const radius = Math.max(width, height) * (.18 + pulse * .12);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, "rgba(255,244,205," + (.18 * alpha) + ")");
    gradient.addColorStop(1, "rgba(255,210,140,0)");
    ctx.globalCompositeOperation = "screen"; ctx.fillStyle = gradient; ctx.fillRect(x, y, width, height);
    if (/streak|flare|laser|anamorphic/i.test(name)) {
      ctx.globalAlpha = .28 * alpha; ctx.fillStyle = "#ffe8b0";
      ctx.fillRect(x, cy, width, Math.max(1, height * .004));
    }
  } else if (MOTION_NAMES.test(name) && /echo|trail|stutter/i.test(name)) {
    ctx.globalAlpha = .14 * alpha; ctx.fillStyle = "#d6eaff";
    const offset = Math.sin(time * 8 + key) * width * .012;
    ctx.fillRect(x + offset, y, width, height);
  } else if (/vignette/i.test(name)) {
    const gradient = ctx.createRadialGradient(x + width/2, y + height/2, Math.min(width,height)*.18, x + width/2, y + height/2, Math.hypot(width,height)*.62);
    gradient.addColorStop(0,"rgba(0,0,0,0)"); gradient.addColorStop(1,"rgba(0,0,0," + (.62 * alpha) + ")");
    ctx.fillStyle = gradient; ctx.fillRect(x,y,width,height);
  }
  ctx.restore();
}
