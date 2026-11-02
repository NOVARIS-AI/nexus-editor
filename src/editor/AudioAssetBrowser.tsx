import { useMemo, useState } from "react";
import { AudioLines, Download, ExternalLink, Music2, Pause, Play, Search, Upload, Sparkles } from "lucide-react";

type AudioResult = { id: string; title: string; pageUrl: string; downloadUrl: string; creator: string; license: string; licenseUrl: string; attribution: string; mimeType: string; duration?: number };
type Props = { onImport: () => void; onAddAudio: (file: File, source: { pageUrl: string; creator: string; license: string; licenseUrl: string; attribution: string }) => Promise<void> | void };
const SOURCES = [
 {name:"Wikimedia Commons",note:"Openly licensed and public-domain audio; each result shows its licence.",url:"https://commons.wikimedia.org/wiki/Category:Audio_files"},
 {name:"Mixkit",note:"Browse free music and effects; check the current licence.",url:"https://mixkit.co/"},
 {name:"Pixabay",note:"Browse music and effects; check each track's licence.",url:"https://pixabay.com/music/"},
 {name:"Freesound",note:"Community audio; licences vary by upload.",url:"https://freesound.org/"},
 {name:"TikTok Creative Center",note:"Discover trending sounds available for eligible TikTok use.",url:"https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en"},
 {name:"Meta Sound Collection",note:"Meta-provided sounds for eligible Facebook and Instagram content.",url:"https://www.facebook.com/sound/collection/"}
];
function plain(value?: string) { return (value || "").replace(/<[^>]*>/g," ").replace(/&#039;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/\s+/g," ").trim(); }
export function AudioAssetBrowser({onImport,onAddAudio}:Props) {
 const [tab,setTab]=useState<"effects"|"music">("effects");
 const [query,setQuery]=useState("");
 const [source,setSource]=useState("Wikimedia Commons");
 const [results,setResults]=useState<AudioResult[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("Search real reusable audio files. Preview a result, then download and add it to your timeline.");
 const [playing,setPlaying]=useState<string|null>(null);
 const [downloaded,setDownloaded]=useState<string[]>([]);
 const selected=SOURCES.find(item=>item.name===source)||SOURCES[0];
 const term=encodeURIComponent(query.trim()||(tab==="effects"?"sound effect":"background music"));
 const externalUrl=source==="Mixkit"?(tab==="effects"?"https://mixkit.co/free-sound-effects/":"https://mixkit.co/free-stock-music/"):source==="Pixabay"?(tab==="effects"?"https://pixabay.com/sound-effects/":"https://pixabay.com/music/"):source==="Freesound"?"https://freesound.org/search/?q="+term:selected.url;
 async function searchAudio() {
  if(source!=="Wikimedia Commons"){window.open(externalUrl,"_blank","noopener,noreferrer");setMessage("Opened "+source+". Choose a track there, download it if its licence permits, then use Import downloaded audio.");return;}
  setBusy(true);setResults([]);setMessage("Searching Wikimedia Commons for audio files…");
  try {
   const params=new URLSearchParams({action:"query",generator:"search",gsrsearch:query.trim()|| (tab==="effects"?"sound effect":"background music"),gsrnamespace:"6",gsrlimit:"40",prop:"imageinfo",iiprop:"url|extmetadata",format:"json",origin:"*"});
   const response=await fetch("https://commons.wikimedia.org/w/api.php?"+params.toString(),{headers:{Accept:"application/json"}});
   if(!response.ok)throw new Error("Audio search is temporarily unavailable.");
   const data=await response.json();
   const found=Object.values(data.query?.pages||{}).flatMap((page:any)=>{
    const info=page.imageinfo?.[0],meta=info?.extmetadata||{},mime=plain(meta.MIMEType?.value||"").toLowerCase();
    if(!info?.url||!mime.startsWith("audio/"))return [];
    const license=plain(meta.LicenseShortName?.value);if(!license)return [];
    const title=String(page.title||"Audio file").replace(/^File:/,"");
    const creator=plain(meta.Artist?.value);
    return [{id:String(page.pageid),title,pageUrl:info.descriptionurl||"https://commons.wikimedia.org/wiki/"+encodeURIComponent(page.title),downloadUrl:info.url,creator,license,licenseUrl:plain(meta.LicenseUrl?.value),attribution:plain(meta.Attribution?.value||meta.Credit?.value||creator),mimeType:mime} as AudioResult];
   });
   setResults(found);setMessage(found.length?found.length+" licensed audio candidates found. Check attribution and licence details before publishing.":"No matching audio files found. Try a broader search such as 'drum', 'piano', 'rain' or 'whoosh'.");
  } catch(error){setMessage(error instanceof Error?error.message:"Could not search audio right now.");}
  finally{setBusy(false);}
 }
 async function downloadAndAdd(item:AudioResult){
  setPlaying(null);setMessage("Downloading "+item.title+"…");
  try{
   const response=await fetch(item.downloadUrl);if(!response.ok)throw new Error("The audio download failed.");
   const blob=await response.blob();const mime=blob.type||item.mimeType;
   if(!mime.startsWith("audio/"))throw new Error("The source did not return a verified audio file.");
   const extension=mime.split("/")[1]?.split(";")[0].replace(/[^a-z0-9]/gi,"")||"audio";
   const safe=item.title.replace(/[^a-z0-9-_]+/gi,"-").slice(0,65)||"nexus-audio";
   const file=new File([blob],safe+"."+extension,{type:mime});
   await onAddAudio(file,{pageUrl:item.pageUrl,creator:item.creator,license:item.license,licenseUrl:item.licenseUrl,attribution:item.attribution});
   setDownloaded(old=>[item.title,...old.filter(x=>x!==item.title)]);
   setMessage("Downloaded and added to the audio timeline: "+item.title);
  }catch(error){setMessage((error instanceof Error?error.message:"Download failed.")+" You can open the source page and import the file manually.");}
 }
 return <section className="nexus-audio-library">
  <div className="nexus-audio-heading"><div><b>Creator audio library</b><small>Search · preview · download · add to timeline</small></div><span><AudioLines size={18}/></span></div>
  <div className="nexus-audio-tabs"><button className={tab==="effects"?"active":""} onClick={()=>setTab("effects")}>Sound effects</button><button className={tab==="music"?"active":""} onClick={()=>setTab("music")}>Music & beats</button></div>
  <label className="nexus-audio-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void searchAudio();}} placeholder={tab==="effects"?"Search whoosh, rain, applause, drum…":"Search Afrobeats, piano, ambient, guitar…"}/></label>
  <div className="nexus-audio-source"><div><b>Audio source</b><small>{selected.note}</small></div><select value={source} onChange={e=>setSource(e.target.value)}>{SOURCES.map(item=><option key={item.name}>{item.name}</option>)}</select><a href={externalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Browse {source}</a></div>
  <div className="nexus-audio-actions"><button disabled={busy} onClick={()=>void searchAudio()}><Search size={15}/>{busy?"Searching…":"Search audio"}</button><button onClick={onImport}><Upload size={15}/> Import audio from device</button></div>
  <p className="nexus-audio-count" aria-live="polite">{message}</p>
  {results.map(item=><article className="nexus-audio-result" key={item.id}>
   <div className="nexus-audio-result-main"><span className="nexus-audio-result-icon"><Music2 size={17}/></span><div><b>{item.title}</b><small>{item.mimeType} · {item.license} · {item.creator||"Creator not listed"}</small><small>{item.attribution||"Review source attribution requirements"}</small><a href={item.pageUrl} target="_blank" rel="noreferrer">Source & licence details <ExternalLink size={11}/></a></div></div>
   <audio controls preload="none" src={playing===item.id?item.downloadUrl:undefined} onPlay={()=>setPlaying(item.id)} onPause={()=>setPlaying(old=>old===item.id?null:old)} />
   <button className="nexus-audio-download" onClick={()=>void downloadAndAdd(item)}><Download size={15}/> Download & add to timeline</button>
  </article>)}
  {downloaded.length>0&&<div className="nexus-audio-downloaded"><b>Downloaded in this session</b>{downloaded.map(name=><small key={name}>✓ {name}</small>)}</div>}
  <div className="nexus-audio-platform-note"><Sparkles size={15}/><span>TikTok and Instagram sounds are not copied or scraped. Use their official libraries where permitted, or import audio you have permission to use. Platform music rights may not cover exports to other apps or commercial projects.</span></div>
 </section>;
}
