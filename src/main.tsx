import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Session} from '@supabase/supabase-js';
import {supabase,empty,loadCache,saveCache,pullRecords} from './store';
import type {Cache,Payload} from './store';
import {categories,defaults} from './habits';
import type {Habit} from './habits';
import {localDay,shiftDay,completion,csvCell} from './model.mjs';
import './style.css';

type Screen='Today'|'History'|'Progress'|'Settings';
const DEMO='local-demo';
function Auth({onDemo}:{onDemo:()=>void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[signup,setSignup]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!supabase||busy)return;setBusy(true);setMsg('');
  try {
   const response=signup?await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin}}):await supabase.auth.signInWithPassword({email,password});
   if(response.error)throw response.error;
   if(signup&&!response.data.session)setMsg('Check your email to confirm your account, then sign in.');
  }catch(e){setMsg(e instanceof Error?e.message:'Authentication failed. Try again.')}finally{setBusy(false)}
 }
 return <main className="auth"><div className="brand"><span className="logo">✓</span> BetterMe</div><h1>Small steps, every day.</h1><p>Build a healthier, more intentional life. Your habits and reflections belong to you.</p>
 {supabase?<form className="panel stack" onSubmit={submit}><h2>{signup?'Create account':'Welcome back'}</h2><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={signup?'new-password':'current-password'}/></label><button className="primary" disabled={busy}>{busy?'Working…':signup?'Create account':'Sign in'}</button><button type="button" onClick={()=>{setSignup(!signup);setMsg('')}}>{signup?'Already have an account? Sign in':'Create a new account'}</button><p role="status">{msg}</p></form>:<div className="panel"><h2>Backend setup needed</h2><p>Set the Supabase URL and publishable key, then rebuild. See the README.</p></div>}
 <button onClick={onDemo}>Try local-only mode</button><small>Local mode is stored on this device only. It is not automatically transferred to your cloud account.</small></main>
}
function App(){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(!supabase),[demo,setDemo]=useState(false);
 useEffect(()=>{if(!supabase)return;let alive=true;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{if(alive){setSession(s);setReady(true);if(s)setDemo(false)}});
  supabase.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setReady(true)}}).catch(()=>{if(alive)setReady(true)});
  return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 if(!ready)return <main>Loading…</main>;
 const uid=session?.user.id??(demo?DEMO:null);
 if(!uid)return <Auth onDemo={()=>setDemo(true)}/>;
 return <Tracker key={uid} uid={uid} email={session?.user.email} exit={async()=>{if(demo)setDemo(false);else if(supabase){const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error}}}/>;
}
function Tracker({uid,email,exit}:{uid:string;email?:string;exit:()=>Promise<void>}){
 const [state,setState]=useState<Cache>(empty), ref=useRef<Cache>(empty()), [loaded,setLoaded]=useState(false),[status,setStatus]=useState('Loading local records…'),[day,setDay]=useState(localDay),[today,setToday]=useState(localDay),[screen,setScreen]=useState<Screen>('Today');
 const running=useRef(false),alive=useRef(false),local=uid===DEMO;
 function replace(next:Cache){ref.current=next;if(alive.current)setState(next);return saveCache(uid,next)}
 async function sync(){
  if(local||!supabase||running.current||!alive.current)return;
  if(!navigator.onLine){setStatus('Offline — changes stay on this device');return}
  running.current=true;setStatus('Syncing…');
  try{
   const batch=Object.entries(ref.current.pending);
   for(const [k,p] of batch){
    if(!alive.current)return;
    const {error}=await supabase.from('entries').upsert({user_id:uid,entry_key:k,payload:p.payload},{onConflict:'user_id,entry_key'});
    if(error)throw error;
    if(ref.current.pending[k]?.id===p.id){
     const pending={...ref.current.pending};delete pending[k];
     await replace({...ref.current,pending});
    }
   }
   const remote=await pullRecords(uid);
   if(!alive.current)return;
   const current=ref.current;
   for(const [k,p] of Object.entries(current.pending))remote[k]=p.payload;
   await replace({records:remote,pending:current.pending});
   setStatus(Object.keys(ref.current.pending).length?'Changes waiting to sync':'Synced');
  }catch{if(alive.current)setStatus('Sync unavailable — local changes retained. Retry when connected.')}
  finally{running.current=false}
 }
 useEffect(()=>{
  alive.current=true;let timer:ReturnType<typeof setInterval>|undefined;
  const reconnect=()=>{void sync()};const offline=()=>setStatus('Offline — changes stay on this device');
  loadCache(uid).then(cache=>{
   if(!alive.current)return;ref.current=cache;setState(cache);setLoaded(true);setStatus(local?'Local only':'Ready to sync');
   void sync();timer=setInterval(()=>{setToday(localDay());void sync()},15000);
   window.addEventListener('online',reconnect);window.addEventListener('offline',offline);
   window.addEventListener('focus',reconnect);
  }).catch(()=>{if(alive.current)setStatus('Local storage could not open. Reload to retry.')});
  return()=>{alive.current=false;if(timer)clearInterval(timer);window.removeEventListener('online',reconnect);window.removeEventListener('offline',offline);window.removeEventListener('focus',reconnect)};
 },[uid]);
 async function write(k:string,payload:Payload){
  if(!loaded)return;
  const prev=ref.current;
  const next={records:{...prev.records,[k]:payload},pending:local?{}:{...prev.pending,[k]:{id:crypto.randomUUID(),payload}}};
  try{await replace(next);setStatus(local?'Saved on this device':'Saved locally — syncing');void sync()}catch{setStatus('Storage error — this change is not safely saved. Retry before leaving.')}
 }
 function nav(s:Screen){setScreen(s);if(s==='Today')setDay(localDay())}
 const allHabits=[...defaults,...Object.entries(state.records).filter(([k])=>k.startsWith('habit:')).map(([,v])=>v as unknown as Habit)];
 function forDay(d:string){return allHabits.filter(h=>(!h.from||h.from<=d)&&(!h.archived||d<=h.archived))}
 const logKey=(d:string,id:string)=>'log:'+d+':'+id;
 function val(d:string,h:Habit){return Number(state.records[logKey(d,h.id)]?.value??0)}
 function setVal(h:Habit,n:number){if(Number.isFinite(n)&&n>=0)void write(logKey(day,h.id),{value:n,title:h.title,category:h.category,target:h.target,unit:h.unit})}
 const habits=forDay(day), score=completion(habits,(h:Habit)=>val(day,h)), pct=score.total?Math.round(score.done/score.total*100):0;
 const pending=Object.keys(state.pending).length;
 const [newTitle,setNewTitle]=useState(''),[newCategory,setNewCategory]=useState('Discipline'),[newUnit,setNewUnit]=useState('check'),[newTarget,setNewTarget]=useState('1');
 function addHabit(e:React.FormEvent){e.preventDefault();const target=newUnit==='check'?1:Number(newTarget);if(!newTitle.trim()||!Number.isFinite(target)||target<=0)return;
  const h:Habit={id:crypto.randomUUID(),title:newTitle.trim(),category:newCategory,unit:newUnit,target,from:localDay()};void write('habit:'+h.id,{...h});setNewTitle('');
 }
 const dates=[...new Set(Object.keys(state.records).filter(k=>k.startsWith('log:')||k.startsWith('day:')).map(k=>k.split(':')[1]))].sort().reverse();
 function exportCsv(){
  const rows=[['date','habit','category','value','target','unit']];
  for(const [k,p] of Object.entries(state.records)){if(k.startsWith('log:'))rows.push([k.split(':')[1],String(p.title),String(p.category),String(p.value),String(p.target),String(p.unit)])}
  const blob=new Blob([rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='betterme-habits.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
 }
 if(!loaded)return <main><h1>BetterMe</h1><p role="status">{status}</p><button onClick={()=>location.reload()}>Reload</button></main>;
 return <main className="app"><header><div className="brand"><span className="logo">✓</span> BetterMe</div><div className="sync" role="status">{status}{pending?' · '+pending+' pending':''}</div></header>
 {screen==='Today'&&<>
 <section className="hero"><div><p className="eyebrow">DAILY PRACTICE</p><h1>{day===today?'Today':day}</h1><p>Consistency, not perfection.</p></div><div className="ring" style={{background:'conic-gradient(#17634d '+pct+'%, #e4e9df 0)'}}><span>{pct}%</span></div><div className="hero-note">{score.done} of {score.total} personal habits completed · Worship not scored</div></section>
 <div className="datebar"><button aria-label="Previous day" onClick={()=>setDay(shiftDay(day,-1))}>←</button><input aria-label="Selected date" type="date" max={today} value={day} onChange={e=>{if(e.target.value&&e.target.value<=today)setDay(e.target.value)}}/><button aria-label="Next day" disabled={day>=today} onClick={()=>setDay(shiftDay(day,1))}>→</button></div>
 <section className="panel"><h2>Three priorities</h2>{[1,2,3].map(n=><TextEntry key={day+':priority'+n} label={'Priority '+n} initial={String(state.records['day:'+day+':priority'+n]?.text??'')} save={text=>void write('day:'+day+':priority'+n,{text})}/>)}</section>
 {categories.map(c=>{const group=habits.filter(h=>h.category===c);return group.length>0&&<section className="panel" key={c}><div className="section-heading"><h2>{c}</h2><small>{group.filter(h=>val(day,h)>=h.target).length}/{group.length}</small></div>{group.map(h=><div className="habit" key={h.id}>{h.unit==='check'?<label className="check"><input type="checkbox" checked={val(day,h)>=1} onChange={e=>setVal(h,e.target.checked?1:0)}/><span>{h.title}</span></label>:<><label htmlFor={'value-'+h.id}>{h.title}<small>Goal: {h.target} {h.unit}</small></label><input id={'value-'+h.id} aria-label={h.title+' '+h.unit} className="number" type="number" inputMode="decimal" min="0" step="any" value={val(day,h)} onChange={e=>setVal(h,e.target.value===''?0:Number(e.target.value))}/><span className="unit">{h.unit}</span></>}</div>)}</section>})}
 <section className="panel"><h2>Evening reflection</h2><TextEntry key={day+':reflection'} label="What went well? What can I improve?" multiline initial={String(state.records['day:'+day+':reflection']?.text??'')} save={text=>void write('day:'+day+':reflection',{text})}/></section></>}
 {screen==='History'&&<><h1>History</h1><p>Open a saved day to review or update your records.</p>{dates.length===0&&<p>No records yet.</p>}{dates.map(d=><button className="history-row" key={d} onClick={()=>{setDay(d);setScreen('Today')}}>{d}<span>View →</span></button>)}</>}
 {screen==='Progress'&&<><h1>Progress</h1><p>Personal habit completion for the last seven days. Worship is excluded from scoring.</p><section className="panel">{Array.from({length:7},(_,i)=>shiftDay(today,i-6)).map(d=>{const s=completion(forDay(d),(h:Habit)=>val(d,h));const p=s.total?Math.round(s.done/s.total*100):0;return <div className="chartrow" key={d}><span>{d.slice(5)}</span><div className="bar"><div style={{width:p+'%'}}/></div><span>{p}%</span></div>})}</section><button onClick={exportCsv}>Export habit records (CSV)</button></>}
 {screen==='Settings'&&<><h1>Settings</h1><section className="panel stack"><h2>Account</h2><p>{local?'Local-only mode':email}</p><button onClick={()=>void sync()} disabled={local}>Sync now</button><button onClick={()=>{if(Object.keys(ref.current.pending).length&&!window.confirm('Unsynced records stay on this device. Sign out anyway?'))return;exit().catch(()=>setStatus('Sign out failed. Retry.'))}}>Sign out</button><button onClick={exportCsv}>Export habit records</button><small>Install from your browser menu: Add to Home Screen on iPhone or Install app on supported Android browsers.</small></section><form className="panel stack" onSubmit={addHabit}><h2>Add a custom habit</h2><label>Habit name<input required maxLength={100} value={newTitle} onChange={e=>setNewTitle(e.target.value)}/></label><label>Category<select value={newCategory} onChange={e=>setNewCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Track by<select value={newUnit} onChange={e=>setNewUnit(e.target.value)}>{['check','min','h','L','pages','count'].map(u=><option key={u}>{u}</option>)}</select></label>{newUnit!=='check'&&<label>Daily target<input required type="number" min="0.01" step="any" value={newTarget} onChange={e=>setNewTarget(e.target.value)}/></label>}<button className="primary">Add habit</button></form><section className="panel"><h2>Custom habits</h2>{allHabits.filter(h=>h.from).map(h=><div className="habit" key={h.id}><span>{h.title}</span><button disabled={!!h.archived} onClick={()=>void write('habit:'+h.id,{...h,archived:localDay()})}>{h.archived?'Archived':'Archive after today'}</button></div>)}</section></>}
 <nav aria-label="Main navigation">{(['Today','History','Progress','Settings'] as Screen[]).map(s=><button key={s} aria-current={screen===s?'page':undefined} onClick={()=>nav(s)}>{s}</button>)}</nav></main>
}
function TextEntry({label,initial,save,multiline=false}:{label:string;initial:string;save:(s:string)=>void;multiline?:boolean}){
 const [value,setValue]=useState(initial),[dirty,setDirty]=useState(false);
 useEffect(()=>{if(!dirty)setValue(initial)},[initial,dirty]);
 const change=(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>{setValue(e.target.value);setDirty(true)};
 return <label className="text-entry">{label}{multiline?<textarea rows={4} maxLength={4000} value={value} onChange={change}/>:<input maxLength={250} value={value} onChange={change}/>}<button type="button" disabled={!dirty} onClick={()=>{save(value);setDirty(false)}}>{dirty?'Save':'Saved'}</button></label>
}
createRoot(document.getElementById('root')!).render(<App/>);
if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(console.error)});
