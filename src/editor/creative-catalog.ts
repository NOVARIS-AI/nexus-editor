export type CreativeCatalogItem = { name: string; category: string; kind: "effect" | "overlay" | "transition"; description: string };

const build = (kind: CreativeCatalogItem["kind"], groups: Record<string, string[]>): CreativeCatalogItem[] =>
  Object.entries(groups).flatMap(([category, names]) => names.map(name => ({ name, category, kind, description: name + " · " + category })));

// Visual catalogue only: items without a renderer are labelled as catalogue previews in the UI.
export const NEXUS_EFFECT_CATALOG = build("effect", {
  "Core Effects": ["Blur","Vignette","Glitch","Retro DV","Chromatic Aberration","Shake","Sparkle"],
  "Glitch & Digital": ["RGB Split","Digital Glitch","VHS Distortion","Signal Interference","Pixel Sort","Data Moshing","Scan Distortion","Static Burst","Digital Shake","Bit Crush","Channel Shift","Corrupt Frame","Databend","Error Screen"],
  "Light & Lens": ["Lens Flare","Anamorphic Flare","Light Leak","Film Burn","Bloom","Soft Glow","Prism Refraction","Rainbow Refraction","Bokeh","Sun Rays","Light Sweep","Camera Flash","Halation","Light Streak"],
  "Motion & Camera": ["Motion Blur","Camera Shake","Handheld Camera","Zoom Pulse","Dolly Zoom","Spin Blur","Whip Pan","Directional Blur","Speed Trails","Motion Echo","Freeze Frame","Stutter","Push In","Pull Out"],
  "Film & Retro": ["Film Grain","Dust & Scratches","VHS Tape","8mm Film","16mm Film","Projector Flicker","Gate Weave","Old Television","Film Jitter","Analog Noise","Tape Tracking"],
  "Particles & Atmosphere": ["Floating Dust","Snowfall","Rainfall","Falling Petals","Fireflies","Smoke","Fog","Embers","Starfield","Confetti","Bubbles"],
  "Focus & Optical": ["Gaussian Blur","Radial Blur","Tilt Shift","Background Blur","Vignette","Chromatic Aberration","Lens Distortion","Focus Pull","Soft Focus","Sharpen","Miniature Focus","Depth Blur"],
  "Stylized & Creative": ["Neon Glow","Edge Detect","Cartoon","Pencil Sketch","Posterize","Duotone","Halftone","Pixelate","Mosaic","Silhouette","Thermal Vision","Infrared","Comic Book","Watercolour"],
  "Transform & Mirror": ["Mirror","Kaleidoscope","Split Screen","Quad Screen","Clone","Infinite Zoom","Pinch","Twirl","Bulge","Perspective Warp","Squeeze","Tiled Mirror"],
  "Texture & Surface": ["Scanlines","Digital Noise","Compression Texture","RGB Noise","Grid Overlay","Crosshatch","Paper Texture","Canvas Texture","Concrete Texture","Glitter Texture","Cracked Glass","Prismatic Texture"],
  "Distortion & Warp": ["Wave Warp","Ripple","Fisheye","Liquid Warp","Heat Haze","Displacement","Turbulence","Jelly Warp","Barrel Distortion","Swirl Warp","Pinch Warp","Wobble"]
});

export const NEXUS_OVERLAY_CATALOG = build("overlay", {
  "Light Overlays": ["Golden Light Leak","Blue Light Leak","Film Burn Overlay","Lens Flare Overlay","Anamorphic Streak","Prism Rainbow","Soft Bokeh Lights","Sun Flare","Flash Frame","Glow Dust"],
  "Weather & Nature": ["Rain on Glass","Heavy Rain","Snow Layer","Falling Leaves","Cherry Blossoms","Autumn Leaves","Ocean Mist","Cloud Drift","Wind-blown Dust","Fireflies Layer"],
  "Particles": ["Gold Particles","Silver Particles","Floating Dust","White Sparkles","Star Glints","Confetti Fall","Bubbles Layer","Glitter Fall","Ember Drift","Magic Trails"],
  "Film & Texture": ["35mm Grain Overlay","16mm Dust","Film Scratches","VHS Noise Layer","Tape Lines","Projector Flicker Layer","Paper Grain","Halftone Texture","Old TV Frame","Film Border"],
  "Graphic Overlays": ["Neon Frame","Viewfinder HUD","Recording HUD","Timecode Overlay","Date Stamp","Letterbox Bars","Retro Camcorder UI","Focus Reticle","Minimal Grid","Cinematic Frame"]
});

export const NEXUS_TRANSITION_CATALOG = build("transition", {
  "Dissolve": ["Cross Dissolve","Additive Dissolve","Dip to Black","Dip to White","Blur Dissolve","Luma Dissolve","Film Dissolve","Light Dissolve"],
  "Wipe": ["Linear Wipe","Radial Wipe","Clock Wipe","Iris Wipe","Diamond Wipe","Star Wipe","Brush Wipe","Ink Wipe"],
  "Motion": ["Push Left","Push Right","Push Up","Push Down","Slide Left","Slide Right","Slide Up","Slide Down","Whip Pan","Fast Zoom"],
  "Zoom & Spin": ["Zoom In","Zoom Out","Zoom Through","Spin In","Spin Out","Swirl Transition","Pull Focus","Camera Push"],
  "Stylized": ["Glitch Cut","RGB Split Cut","Pixelate Transition","Mosaic Reveal","Kaleidoscope Transition","Film Burn Transition","Flash Transition","Light Leak Transition"],
  "Shape & Reveal": ["Circle Reveal","Circle Close","Split Reveal","Four Panel Reveal","Diagonal Reveal","Shutter Reveal","Curtain Reveal","Page Turn"]
});

export const NEXUS_CREATIVE_REFERENCE_QUERIES: Record<string, string> = {
  "filter:Cinematic": "cinematic movie still landscape photography",
  "filter:Film": "35mm analog film photography portrait street",
  "filter:Color": "vibrant colorful travel photography",
  "filter:Portrait": "portrait photography natural light",
  "filter:Product": "professional product photography still life",
  "filter:Creative": "colorful abstract art photography",
  "filter:Warm": "golden hour warm sunset photography",
  "filter:Cool": "blue hour ocean mountain photography",
  "filter:Mono": "black and white street photography",
  "filter:Nature": "nature forest flower landscape photography",
  "effect:Glitch & Digital": "digital glitch art abstract",
  "effect:Light & Lens": "lens flare bokeh light photography",
  "effect:Motion & Camera": "motion blur long exposure photography",
  "effect:Film & Retro": "vintage film texture analog camera",
  "effect:Particles & Atmosphere": "smoke fog snow particle photography",
  "effect:Focus & Optical": "macro shallow depth of field photography",
  "effect:Stylized & Creative": "pop art neon illustration",
  "effect:Transform & Mirror": "kaleidoscope mirror abstract photography",
  "effect:Texture & Surface": "film grain paper texture macro photography",
  "effect:Distortion & Warp": "abstract liquid distortion art",
  "overlay:Light Overlays": "cinematic light leak flare photography",
  "overlay:Weather & Nature": "rain snow leaves nature photography",
  "overlay:Particles": "sparkler confetti dust photography",
  "overlay:Film & Texture": "analog film dust scratches texture",
  "overlay:Graphic Overlays": "camera viewfinder interface photography",
  "transition:Dissolve": "abstract soft gradient light photography",
  "transition:Wipe": "geometric abstract shapes photography",
  "transition:Motion": "motion blur city long exposure photography",
  "transition:Zoom & Spin": "abstract radial motion photography",
  "transition:Stylized": "glitch abstract digital art",
  "transition:Shape & Reveal": "geometric shape abstract photography"
};
