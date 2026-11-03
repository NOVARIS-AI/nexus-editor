export type AudioPresetKind = "sfx" | "music";
export type AudioPreset = { name:string; category:string; kind:AudioPresetKind; duration:number; recipe:"sweep"|"impact"|"click"|"chime"|"noise"|"ambience"|"percussion"|"music" };
export const NEXUS_AUDIO_PRESETS:AudioPreset[] = [
{name:"Soft Whoosh",category:"Transitions",kind:"sfx",duration:1.2,recipe:"sweep"},
{name:"Reverse Whoosh",category:"Transitions",kind:"sfx",duration:1.4,recipe:"sweep"},
{name:"Air Sweep",category:"Transitions",kind:"sfx",duration:1.1,recipe:"noise"},
{name:"Cinematic Impact",category:"Cinematic",kind:"sfx",duration:1.8,recipe:"impact"},
{name:"Deep Bass Hit",category:"Cinematic",kind:"sfx",duration:1.3,recipe:"impact"},
{name:"Trailer Riser",category:"Cinematic",kind:"sfx",duration:3.5,recipe:"sweep"},
{name:"Downlifter",category:"Cinematic",kind:"sfx",duration:2.2,recipe:"sweep"},
{name:"Digital Glitch",category:"Digital",kind:"sfx",duration:.8,recipe:"noise"},
{name:"UI Click",category:"UI",kind:"sfx",duration:.16,recipe:"click"},
{name:"Button Tap",category:"UI",kind:"sfx",duration:.12,recipe:"click"},
{name:"Notification Chime",category:"UI",kind:"sfx",duration:.8,recipe:"chime"},
{name:"Success Sparkle",category:"UI",kind:"sfx",duration:1.1,recipe:"chime"},
{name:"Error Blip",category:"UI",kind:"sfx",duration:.35,recipe:"click"},
{name:"Magic Shimmer",category:"Fantasy",kind:"sfx",duration:1.8,recipe:"chime"},
{name:"Laser Zap",category:"Fantasy",kind:"sfx",duration:.7,recipe:"sweep"},
{name:"Thunder Roll",category:"Nature",kind:"sfx",duration:3.2,recipe:"ambience"},
{name:"Rain Texture",category:"Nature",kind:"sfx",duration:5,recipe:"ambience"},
{name:"Ocean Wash",category:"Nature",kind:"sfx",duration:5,recipe:"ambience"},
{name:"Wind Bed",category:"Nature",kind:"sfx",duration:5,recipe:"ambience"},
{name:"Vinyl Crackle",category:"Texture",kind:"sfx",duration:4,recipe:"noise"},
{name:"Camera Shutter",category:"Everyday",kind:"sfx",duration:.3,recipe:"click"},
{name:"Clock Tick",category:"Everyday",kind:"sfx",duration:.22,recipe:"click"},
{name:"Footstep Thump",category:"Everyday",kind:"sfx",duration:.32,recipe:"impact"},
{name:"Talking Drum Accent",category:"African Percussion",kind:"sfx",duration:1,recipe:"percussion"},
{name:"Shekere Shake",category:"African Percussion",kind:"sfx",duration:1.5,recipe:"noise"},
{name:"Clap Accent",category:"Percussion",kind:"sfx",duration:.35,recipe:"percussion"},
{name:"Snare Snap",category:"Percussion",kind:"sfx",duration:.28,recipe:"percussion"},
{name:"Kick Punch",category:"Percussion",kind:"sfx",duration:.45,recipe:"impact"},
{name:"808 Drop",category:"Percussion",kind:"sfx",duration:1.4,recipe:"impact"},
{name:"Ambient Pulse",category:"Music beds",kind:"music",duration:12,recipe:"music"},
{name:"Bright Creator Bed",category:"Music beds",kind:"music",duration:12,recipe:"music"},
{name:"Cinematic Build Bed",category:"Music beds",kind:"music",duration:12,recipe:"music"},
{name:"Warm Piano Bed",category:"Music beds",kind:"music",duration:12,recipe:"music"},
{name:"Afro Groove Bed",category:"Music beds",kind:"music",duration:12,recipe:"music"},
{name:"Lo-fi Study Bed",category:"Music beds",kind:"music",duration:12,recipe:"music"},
{name:"Corporate Uplift Bed",category:"Music beds",kind:"music",duration:12,recipe:"music"},
{name:"Dreamy Ambient Bed",category:"Music beds",kind:"music",duration:12,recipe:"music"}
];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
function addTone(ctx:OfflineAudioContext,frequency:number,start:number,duration:number,wave:OscillatorType,volume:number,endFrequency=frequency){
 const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.setValueAtTime(Math.max(20,frequency),start);if(endFrequency!==frequency)osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),start+duration);
 gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.02);
}
function addNoise(ctx:OfflineAudioContext,start:number,duration:number,volume:number,frequency=2400){
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(.7+Math.random()*.3);
 const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type="lowpass";filter.frequency.value=frequency;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.02);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(start);source.stop(start+duration);
}
function writeWav(buffer:AudioBuffer):Blob{
 const channels=1,frames=buffer.length,bytes=frames*2,out=new ArrayBuffer(44+bytes),view=new DataView(out),data=buffer.getChannelData(0);
 const str=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
 str(0,"RIFF");view.setUint32(4,36+bytes,true);str(8,"WAVE");str(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,"data");view.setUint32(40,bytes,true);
 for(let i=0;i<frames;i++){const sample=clamp(data[i],-1,1);view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);}
 return new Blob([out],{type:"audio/wav"});
}
export async function generateNexusAudio(preset:AudioPreset):Promise<Blob>{
 const sampleRate=22050,duration=clamp(preset.duration,.1,12),frames=Math.ceil(sampleRate*duration);
 const Offline=globalThis.OfflineAudioContext;
 if(!Offline)throw new Error("This browser does not support offline audio generation. Import an audio file instead.");
 const ctx=new Offline(1,frames,sampleRate);
 const master=ctx.createGain();master.gain.value=.68;master.connect(ctx.destination);
 if(preset.recipe==="sweep"){const reverse=preset.name.toLowerCase().includes("reverse");addTone(ctx,reverse?120:1000,.02,duration,"sawtooth",.22,reverse?1500:55);addNoise(ctx,.01,duration*.75,.08,5000);}
 else if(preset.recipe==="impact"){addTone(ctx,125,.01,duration*.8,"sine",.42,32);addNoise(ctx,.01,Math.min(.28,duration*.35),.25,1800);}
 else if(preset.recipe==="click"){addTone(ctx,preset.name.includes("Error")?260:900,.005,duration*.8,"triangle",.2,preset.name.includes("Error")?140:520);if(preset.name.includes("Shutter"))addNoise(ctx,.01,.16,.1,6000);}
 else if(preset.recipe==="chime"){[880,1174.66,1567.98].forEach((freq,index)=>addTone(ctx,freq,.02+index*.11,duration*.72,"sine",.13/(index+1),freq*.98));}
 else if(preset.recipe==="noise"||preset.recipe==="ambience"){addNoise(ctx,.01,duration*.98,preset.recipe==="ambience"?.13:.22,preset.name.includes("Rain")?5200:1700);if(preset.recipe==="ambience")addTone(ctx,55,.02,duration*.95,"sine",.035,48);}
 else if(preset.recipe==="percussion"){addNoise(ctx,.01,preset.name.includes("Shekere")?duration*.9:.12,.22,6500);addTone(ctx,preset.name.includes("Talking")?180:95,.01,duration*.65,"triangle",.24,preset.name.includes("Talking")?260:45);}
 else {const chords=preset.name.includes("Cinematic")?[[110,164.81,220],[98,146.83,196],[130.81,196,261.63],[87.31,130.81,174.61]]:preset.name.includes("Afro")?[[130.81,164.81,196],[110,146.83,174.61],[123.47,155.56,185],[98,130.81,164.81]]:preset.name.includes("Piano")?[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]]:[[220,261.63,329.63],[196,246.94,293.66],[174.61,220,261.63],[196,246.94,329.63]];
  chords.forEach((chord,index)=>{const start=index*duration/4,span=duration/4+.08;chord.forEach((freq,j)=>addTone(ctx,freq,start,span,"sine",j===0?.075:.035,freq));addTone(ctx,chord[0]/2,start,span,"triangle",.045,chord[0]/2);});
 }
 const rendered=await ctx.startRendering();return writeWav(rendered);
}
