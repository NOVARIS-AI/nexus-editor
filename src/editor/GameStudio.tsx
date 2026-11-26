import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, Gamepad2, Pause, Play, RotateCcw, Save, Sparkles } from "lucide-react";
import "./game-studio.css";

type Mode = "platformer" | "runner" | "topdown";
type World = { title: string; mode: Mode; theme: string; speed: number };
const THEMES: Record<string,{sky:string;ground:string;accent:string}> = {
  Neon:{sky:"#10152f",ground:"#20204a",accent:"#50e8ff"},
  Jungle:{sky:"#173c35",ground:"#235c3b",accent:"#b5ef72"},
  Sunset:{sky:"#5a3158",ground:"#553b46",accent:"#ffd078"},
  Space:{sky:"#090d25",ground:"#24284f",accent:"#b9a1ff"}
};
const W=800,H=450;
export default function GameStudio(){
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const keys=useRef<Record<string,boolean>>({});
 const state=useRef({x:100,y:300,vx:0,vy:0,onGround:false,score:0,coins:[260,440,620],frame:0,paused:false,over:false});
 const [brief,setBrief]=useState("A neon platform adventure where a tiny explorer collects energy orbs and avoids obstacles.");
 const [world,setWorld]=useState<World>({title:"Neon Quest",mode:"platformer",theme:"Neon",speed:1});
 const [running,setRunning]=useState(true);
 const [score,setScore]=useState(0);
 const [saved,setSaved]=useState(false);
 const reset=useCallback(()=>{state.current={x:100,y:300,vx:0,vy:0,onGround:false,score:0,coins:[260,440,620],frame:0,paused:false,over:false};setScore(0);setRunning(true);},[]);
 const generate=()=>{const b=brief.toLowerCase();const mode:Mode=/runner|run|race|endless/.test(b)?"runner":/top.?down|maze|dungeon|adventure/.test(b)?"topdown":"platformer";const theme=/jungle|forest|nature/.test(b)?"Jungle":/space|galaxy|planet/.test(b)?"Space":/sunset|desert|warm/.test(b)?"Sunset":"Neon";const title=brief.trim().split(/[.!?]/)[0].slice(0,32)||"My First Game";setWorld({title,mode,theme,speed:/fast|speed|quick/.test(b)?1.5:1});reset();setSaved(false);};
 useEffect(()=>{
  const c=canvas.current;if(!c)return;const ctx=c.getContext("2d");if(!ctx)return;let raf=0;let last=0;
  const draw=(time:number)=>{const dt=Math.min(.032,(time-last)/1000||.016);last=time;const s=state.current;const colors=THEMES[world.theme]||THEMES.Neon;
   ctx.clearRect(0,0,W,H);const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,colors.sky);grad.addColorStop(1,"#111526");ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
   for(let i=0;i<48;i++){ctx.fillStyle="rgba(255,255,255,.55)";ctx.fillRect((i*137)%W,(i*71)%250,2,2);}
   ctx.fillStyle=colors.ground;ctx.fillRect(0,390,W,60);
   if(!s.paused&&!s.over){
    s.frame+=dt*60;const left=keys.current.ArrowLeft||keys.current.a;const right=keys.current.ArrowRight||keys.current.d;const jump=keys.current[" "]||keys.current.ArrowUp||keys.current.w;
    if(world.mode==="topdown"){s.x+=((right?1:0)-(left?1:0))*250*dt;s.y+=((jump?1:0)-(keys.current.ArrowDown||keys.current.s?1:0))*220*dt;}
    else {if(world.mode==="runner")s.x=Math.min(270,s.x+100*dt);else s.x+=((right?1:0)-(left?1:0))*260*dt;if(jump&&s.onGround){s.vy=-570;s.onGround=false;}s.vy+=1450*dt;s.y+=s.vy*dt;if(s.y>=342){s.y=342;s.vy=0;s.onGround=true;}}
    s.x=Math.max(25,Math.min(W-45,s.x));s.y=Math.max(30,Math.min(360,s.y));
    s.coins=s.coins.map(x=>{const px=world.mode==="runner"?((x-s.frame*world.speed*3)%900+900)%900:x;if(Math.abs(px-s.x)<28&&Math.abs(350-s.y)<42){s.score++;return -100;}return px;});
    if(s.coins.every(x=>x<0))s.coins=[220,460,680];
   }
   // distant scenery
   for(let i=0;i<5;i++){const x=(i*190-(world.mode==="runner"?s.frame*world.speed*1.2:0)%950+950)%950;ctx.fillStyle=colors.accent+"33";ctx.beginPath();ctx.arc(x,360,25+i%3*8,Math.PI,0);ctx.fill();}
   for(const x of s.coins){if(x<0)continue;const px=world.mode==="runner"?x:x;ctx.fillStyle=colors.accent;ctx.shadowColor=colors.accent;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(px,350,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
   // player
   ctx.fillStyle="#fff";ctx.shadowColor=colors.accent;ctx.shadowBlur=22;ctx.fillRect(s.x-15,s.y-28,30,34);ctx.shadowBlur=0;ctx.fillStyle=colors.accent;ctx.fillRect(s.x-9,s.y-19,6,5);ctx.fillRect(s.x+3,s.y-19,6,5);
   ctx.fillStyle="#fff";ctx.font="bold 20px system-ui";ctx.fillText("ORB "+s.score,24,36);ctx.font="12px system-ui";ctx.fillStyle="#c7c9dc";ctx.fillText(world.mode.toUpperCase()+" · "+world.theme.toUpperCase(),24,57);
   if(s.paused||s.over){ctx.fillStyle="#050713bb";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="bold 34px system-ui";ctx.fillText(s.over?"GAME OVER":"PAUSED",W/2,H/2);ctx.font="14px system-ui";ctx.fillText("Tap Play or Reset to continue",W/2,H/2+30);ctx.textAlign="left";}
   setScore(s.score);
  };raf=requestAnimationFrame(function loop(t){draw(t);raf=requestAnimationFrame(loop);});return()=>cancelAnimationFrame(raf);
 },[world]);
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key))e.preventDefault();keys.current[e.key]=true;};const up=(e:KeyboardEvent)=>{keys.current[e.key]=false;};window.addEventListener("keydown",down);window.addEventListener("keyup",up);return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};},[]);
 const toggle=()=>{state.current.paused=!state.current.paused;setRunning(!state.current.paused);};
 const save=()=>{try{localStorage.setItem("nexus-game-studio-draft",JSON.stringify({world,brief,score}));setSaved(true);}catch{setSaved(false);}};
 const exportGame=()=>{const title=world.title.replace(/[<>&"]/g,"");const theme=THEMES[world.theme]||THEMES.Neon;const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><title>'+title+'</title><style>*{box-sizing:border-box}body{margin:0;background:'+theme.sky+';color:white;font:16px system-ui;text-align:center}h1{font-size:22px}canvas{width:min(96vw,800px);border-radius:16px;background:'+theme.sky+';touch-action:none}button{padding:14px 22px;margin:5px;border:0;border-radius:12px;background:'+theme.accent+';font-weight:bold}</style><h1>'+title+'</h1><canvas id="g" width="800" height="450"></canvas><p>Use arrows / A-D and Space to jump. Collect the glowing orbs.</p><button id="l">◀</button><button id="j">JUMP</button><button id="r">▶</button><script>const c=document.querySelector("#g"),x=c.getContext("2d");let p=100,y=342,v=0,score=0,coins=[260,440,620],keys={};onkeydown=e=>keys[e.key]=1;onkeyup=e=>keys[e.key]=0;for(const [id,key] of [["l","ArrowLeft"],["r","ArrowRight"],["j"," "]]){let b=document.getElementById(id);b.onpointerdown=()=>keys[key]=1;b.onpointerup=b.onpointerleave=()=>keys[key]=0}function loop(){x.fillStyle="'+theme.sky+'";x.fillRect(0,0,800,450);x.fillStyle="'+theme.ground+'";x.fillRect(0,390,800,60);if(keys.ArrowLeft||keys.a)p-=4;if(keys.ArrowRight||keys.d)p+=4;if((keys[" "]||keys.ArrowUp)&&y>=342)v=-15;v+=.7;y+=v;if(y>342){y=342;v=0}p=Math.max(20,Math.min(780,p));x.fillStyle="'+theme.accent+'";for(let i=0;i<coins.length;i++){if(coins[i]<0)continue;x.beginPath();x.arc(coins[i],350,10,0,7);x.fill();if(Math.abs(coins[i]-p)<25&&Math.abs(y-350)<40){coins[i]=-100;score++}}x.fillStyle="white";x.fillRect(p-15,y-28,30,34);x.font="bold 20px system-ui";x.fillText("ORB "+score,24,35);if(coins.every(n=>n<0))coins=[220,460,680];requestAnimationFrame(loop)}loop();</script>';const blob=new Blob([html],{type:"text/html"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=title.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".html";a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
 return <section className="page-content game-studio"><div className="page-title-row"><div><div className="eyebrow">VELTRONIX NEXUS · GAME CREATION</div><h1>Game Studio <span>✦</span></h1><p>Describe an idea, generate a playable starter, then customise and export it.</p></div><span className="game-score">ORB {score}</span></div>
 <div className="game-studio-grid"><section className="game-builder"><div className="game-panel-head"><span><Sparkles size={17}/> QUICK GAME BUILDER</span><small>NO CODE REQUIRED</small></div><label>Describe your game idea<textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={4} placeholder="A jungle platformer where a fox collects gems..."/></label><div className="game-options"><label>Game style<select value={world.mode} onChange={e=>setWorld(w=>({...w,mode:e.target.value as Mode}))}><option value="platformer">Platform adventure</option><option value="runner">Endless runner</option><option value="topdown">Top-down explorer</option></select></label><label>World theme<select value={world.theme} onChange={e=>setWorld(w=>({...w,theme:e.target.value}))}><option>Neon</option><option>Jungle</option><option>Sunset</option><option>Space</option></select></label></div><button className="gradient-button game-generate" onClick={generate}><Sparkles size={16}/> Generate playable game</button><div className="game-tip">Starter generation is local and instant. You can change the title, style and world without an AI API key.</div><div className="game-actions"><button onClick={save}><Save size={15}/> {saved?"Saved":"Save draft"}</button><button onClick={exportGame}><ArrowDownToLine size={15}/> Export HTML game</button></div></section>
 <section className="game-preview-panel"><div className="game-preview-top"><span><Gamepad2 size={17}/> LIVE GAME PREVIEW</span><b>{world.title}</b></div><canvas ref={canvas} width={W} height={H} aria-label="Playable game preview"/><div className="game-controls"><button onPointerDown={()=>keys.current.ArrowLeft=true} onPointerUp={()=>keys.current.ArrowLeft=false} onPointerLeave={()=>keys.current.ArrowLeft=false}>◀</button><button onPointerDown={()=>keys.current[" "]=true} onPointerUp={()=>keys.current[" "]=false} onPointerLeave={()=>keys.current[" "]=false}>JUMP</button><button onPointerDown={()=>keys.current.ArrowRight=true} onPointerUp={()=>keys.current.ArrowRight=false} onPointerLeave={()=>keys.current.ArrowRight=false}>▶</button><span>Keyboard: A / D or ← / → · Space to jump</span></div><div className="game-preview-actions"><button onClick={toggle}>{running?<Pause size={15}/>:<Play size={15}/>} {running?"Pause":"Play"}</button><button onClick={reset}><RotateCcw size={15}/> Restart</button></div></section></div></section>;
}
