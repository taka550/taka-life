'use strict';
const STORAGE_KEY='takaWeightApp.v1';
const SETTINGS={heightCm:176,targetWeight:85};
const SEED=[];
let state=loadState(); let showAll=false; let deferredPrompt=null;
const $=id=>document.getElementById(id);
function loadState(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY));if(v&&Array.isArray(v.records))return v}catch(e){}return {version:1,settings:{...SETTINGS},records:SEED}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function sortRecords(){state.records.sort((a,b)=>`${a.date} ${a.time||periodOrder(a.period)}`.localeCompare(`${b.date} ${b.time||periodOrder(b.period)}`))}
function periodOrder(p){return p==='朝'?'06:00':p==='昼'?'12:00':'20:00'}
function detectPeriod(time){const h=Number((time||'12:00').split(':')[0]);return h<11?'朝':h<17?'昼':'夜'}
function nowLocal(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return {date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time:`${pad(d.getHours())}:${pad(d.getMinutes())}`}}
function setNow(){const n=nowLocal();$('dateInput').value=n.date;$('timeInput').value=n.time;$('periodInput').value='auto'}
function fmt(n,d=1){return Number(n).toFixed(d)}
function latest(){sortRecords();return state.records.at(-1)}
function render(){sortRecords();renderGreeting();renderDashboard();renderSummary();renderHistory();renderChart();renderMio()}
function renderGreeting(){const h=new Date().getHours();let en='GOOD EVENING',ja='おかえり、タカ。',msg='今日も一日、お疲れさま。';if(h<11){en='GOOD MORNING';ja='おはよう、タカ。';msg='今日を、少し豊かに。'}else if(h<17){en='GOOD AFTERNOON';ja='こんにちは、タカ。';msg='ひと息ついて、午後もゆっくりいこう。'}$('timeGreeting').textContent=en;$('welcomeTitle').textContent=ja;$('welcomeMessage').textContent=msg}
function renderDashboard(){const recs=state.records,cur=latest();if(!cur)return;const first=recs[0],prev=recs.at(-2)||cur;const bmi=cur.weight/((state.settings.heightCm/100)**2);const remaining=Math.max(0,cur.weight-state.settings.targetWeight);const total=first.weight-state.settings.targetWeight;const rate=total>0?Math.max(0,Math.min(100,(first.weight-cur.weight)/total*100)):100;
$('currentWeight').textContent=fmt(cur.weight);$('currentMeta').textContent=`${cur.date.replaceAll('-','/')} ${cur.period}${cur.time?' '+cur.time:''}`;$('diffPrev').textContent=`${cur.weight-prev.weight>=0?'+':''}${fmt(cur.weight-prev.weight)} kg`;$('bmi').textContent=fmt(bmi);$('toGoal').textContent=`${fmt(remaining)} kg`;$('diffFirst').textContent=`${cur.weight-first.weight>=0?'+':''}${fmt(cur.weight-first.weight)} kg`;$('goalRate').textContent=`${Math.round(rate)}%`;document.querySelector('.goal-ring').style.setProperty('--rate',`${rate}%`);$('goalMessage').textContent=cur.weight<=state.settings.targetWeight?'🎉 目標体重に到達中！':`目標まであと ${fmt(remaining)}kg。焦らず積み重ねやで。`}

function renderSummary(){const recs=state.records;if(!recs.length)return;const cur=recs.at(-1);const sevenDaysAgo=new Date(`${cur.date}T12:00:00`);sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);const base=[...recs].reverse().find(r=>new Date(`${r.date}T${r.time||'12:00'}:00`)<=sevenDaysAgo)||recs[0];const change=cur.weight-base.weight;const recent=recs.slice(-7);const avg=recent.reduce((s,r)=>s+r.weight,0)/recent.length;$('weekChange').textContent=`${change>=0?'+':''}${fmt(change)} kg`;$('recentAverage').textContent=`${fmt(avg)} kg`;$('recordCount').textContent=`${recs.length}回`}
function groupByDate(){const m=new Map();for(const r of state.records){if(!m.has(r.date))m.set(r.date,{date:r.date,朝:null,昼:null,夜:null});m.get(r.date)[r.period]=r.weight}return [...m.values()].sort((a,b)=>b.date.localeCompare(a.date))}
function renderHistory(){const rows=groupByDate(),visible=showAll?rows:rows.slice(0,5);$('historyBody').innerHTML=visible.map(r=>`<tr><td>${r.date.replaceAll('-','/')}</td><td>${r.朝??'—'}</td><td>${r.昼??'—'}</td><td>${r.夜??'—'}</td></tr>`).join('');$('showAllBtn').textContent=showAll?'5日表示':'すべて表示'}
function renderChart(){const cvs=$('chart'),ctx=cvs.getContext('2d'),ratio=window.devicePixelRatio||1,w=cvs.clientWidth||320,h=220;cvs.width=w*ratio;cvs.height=h*ratio;ctx.scale(ratio,ratio);ctx.clearRect(0,0,w,h);let days=groupByDate().reverse();const range=$('rangeSelect').value;if(range!=='all')days=days.slice(-Number(range));if(!days.length)return;const vals=days.flatMap(d=>[d.朝,d.夜]).filter(v=>v!=null).concat([state.settings.targetWeight]);let min=Math.floor((Math.min(...vals)-.5)*2)/2,max=Math.ceil((Math.max(...vals)+.5)*2)/2;if(max-min<2)max=min+2;const pad={l:34,r:12,t:14,b:34},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,x=i=>pad.l+(days.length===1?pw/2:i*pw/(days.length-1)),y=v=>pad.t+(max-v)*ph/(max-min);
ctx.font='11px -apple-system';ctx.strokeStyle='rgba(92,69,51,.13)';ctx.fillStyle='#827469';ctx.lineWidth=1;for(let v=min;v<=max+.001;v+=.5){ctx.beginPath();ctx.moveTo(pad.l,y(v));ctx.lineTo(w-pad.r,y(v));ctx.stroke();ctx.fillText(v.toFixed(1),2,y(v)+4)}
ctx.strokeStyle='#a65747';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pad.l,y(state.settings.targetWeight));ctx.lineTo(w-pad.r,y(state.settings.targetWeight));ctx.stroke();ctx.setLineDash([]);
function series(key,color,shape){ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.5;ctx.beginPath();let started=false;days.forEach((d,i)=>{const v=d[key];if(v==null)return;if(!started){ctx.moveTo(x(i),y(v));started=true}else ctx.lineTo(x(i),y(v))});ctx.stroke();days.forEach((d,i)=>{const v=d[key];if(v==null)return;ctx.beginPath();if(shape==='diamond'){ctx.moveTo(x(i),y(v)-4);ctx.lineTo(x(i)+4,y(v));ctx.lineTo(x(i),y(v)+4);ctx.lineTo(x(i)-4,y(v));ctx.closePath()}else ctx.arc(x(i),y(v),3.5,0,Math.PI*2);ctx.fill()})}
series('朝','#6f7652','circle');series('夜','#8c625d','diamond');const labelEvery=Math.max(1,Math.ceil(days.length/6));days.forEach((d,i)=>{if(i%labelEvery===0||i===days.length-1){ctx.save();ctx.translate(x(i),h-8);ctx.rotate(-.35);ctx.fillStyle='#827469';ctx.fillText(d.date.slice(5).replace('-','/'),-10,0);ctx.restore()}})}
function renderMio(){const cur=latest(),prev=state.records.at(-2);if(!cur)return;const diff=prev?cur.weight-prev.weight:0;let angel,devil;if(cur.weight<=state.settings.targetWeight){angel='目標体重に到達中。ここまでの積み重ね、ちゃんと数字に出てるね。次は無理せず定着させよう 🌼';devil='達成した瞬間に祝勝会を三日連続開催するなよ。85kg台を通常運転にしてからや 😈'}else if(diff<=-.5){angel='しっかり下がったね。ただ、一日の変化より続けて記録できていることの方が大事やで 🌼';devil='減ったからってチョコパン2個は計算が合わん。数字は褒める、宴会は却下 😈'}else if(diff>=.5){angel='少し増えても、水分や食事で動く範囲。今日だけで判断せず、次の記録まで淡々といこう 🌼';devil='体重計は敵ちゃうで。見なかったことにする作戦が一番あかん。記録したから今日は合格 😈'}else{angel='大きく動かない日も、記録を続けた時点で前進。安定は立派な成果やで 🌼';devil='派手な減量劇は要らん。地味に続ける人が最後に勝つ。珍しく真面目なデビルや 😈'}$('angelText').textContent=angel;$('devilText').textContent=devil}
$('weightForm').addEventListener('submit',e=>{e.preventDefault();const weight=Number($('weightInput').value),date=$('dateInput').value,time=$('timeInput').value,period=$('periodInput').value==='auto'?detectPeriod(time):$('periodInput').value,memo=$('memoInput').value.trim();if(!date||!time||!Number.isFinite(weight)){return}const existing=state.records.find(r=>r.date===date&&r.period===period);if(existing){Object.assign(existing,{time,weight,memo,createdAt:`${date}T${time}:00`})}else{state.records.push({id:Date.now(),date,time,period,weight,memo,createdAt:`${date}T${time}:00`})}saveState();$('weightInput').value='';$('memoInput').value='';$('saveMessage').textContent=existing?`${date} ${period}の記録を上書きしたで。`:`${date} ${period}に記録したで。`;render()});
$('nowBtn').addEventListener('click',setNow);$('showAllBtn').addEventListener('click',()=>{showAll=!showAll;renderHistory()});$('rangeSelect').addEventListener('change',renderChart);window.addEventListener('resize',renderChart);
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
$('exportJsonBtn').addEventListener('click',()=>download(`taka-weight-backup-${nowLocal().date}.json`,JSON.stringify(state,null,2),'application/json'));
$('exportCsvBtn').addEventListener('click',()=>{sortRecords();const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const rows=[['No.','日付','時刻','時間帯','体重(kg)','メモ'],...state.records.map((r,i)=>[i+1,r.date.replaceAll('-','/'),r.time,r.period,r.weight,r.memo])];download(`管理台帳1_${nowLocal().date}.csv`,`\ufeff${rows.map(row=>row.map(esc).join(',')).join('\r\n')}`,'text/csv;charset=utf-8')});
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text();if(file.name.toLowerCase().endsWith('.json')){const imported=JSON.parse(text);if(!Array.isArray(imported.records))throw new Error('recordsなし');state={version:1,settings:{...SETTINGS,...(imported.settings||{})},records:imported.records};}else{const lines=text.replace(/^\ufeff/,'').trim().split(/\r?\n/);const parse=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'){cur+='"';i++}else if(c==='"')q=!q;else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out};const rows=lines.slice(1).map(parse);state.records=rows.filter(r=>r[1]&&r[4]).map((r,i)=>({id:Date.now()+i,date:r[1].replaceAll('/','-'),time:r[2]||'',period:r[3]||detectPeriod(r[2]),weight:Number(r[4]),memo:r[5]||'',createdAt:`${r[1].replaceAll('/','-')}T${r[2]||'12:00'}:00`}))}saveState();render();$('saveMessage').textContent='バックアップを読み込んだで。'}catch(err){alert('読み込みに失敗しました。JSONまたはこのアプリのCSVを選んでください。')}e.target.value=''})
$('copyChatBtn').addEventListener('click',async()=>{const cur=latest(),recent=state.records.slice(-7).map(r=>`${r.date} ${r.period} ${r.weight}kg`).join('\n');const text=`体重管理アプリの最新データです。\n最新: ${cur.date} ${cur.time||''} ${cur.period} ${cur.weight}kg\n身長: ${state.settings.heightCm}cm\n目標: ${state.settings.targetWeight}kg\n直近記録:\n${recent}\n\nこの内容を分析して、正式ルールに沿った「ミオ劇場」を作って。健康第一で、エンジェルミオとデビルミオを登場させて。`;try{await navigator.clipboard.writeText(text);$('copyChatBtn').textContent='コピーしたで ✓';setTimeout(()=>$('copyChatBtn').textContent='ChatGPTに送る文章をコピー',1800)}catch(e){prompt('この文章をコピーしてChatGPTへ貼り付けてください',text)}});
document.querySelectorAll('[data-scroll]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=a.dataset.scroll;if(t==='top'){window.scrollTo({top:0,behavior:'smooth'});return}const targets={record:'#recordSection',mio:'#mioTheater',history:'#historySection'};document.querySelector(targets[t]).scrollIntoView({behavior:'smooth',block:'start'});if(t==='record')setTimeout(()=>$('weightInput').focus(),450)}));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden')}});
const APP_VERSION='2.0.1';
let swRegistration=null;
let updateReloading=false;
let lastUpdateCheck=0;
function setUpdateStatus(message){const el=$('updateStatus');if(el)el.textContent=message}
async function checkForAppUpdate(manual=false){
  const btn=$('checkUpdateBtn');
  if(!swRegistration){setUpdateStatus('更新機能を準備中です。');return}
  try{
    if(btn){btn.disabled=true;btn.textContent='確認中…'}
    setUpdateStatus('最新版を確認しています…');
    lastUpdateCheck=Date.now();
    await swRegistration.update();
    setTimeout(()=>{
      if(!updateReloading){
        setUpdateStatus(manual?'最新版です。':'最新版を利用中です。');
        if(btn){btn.disabled=false;btn.textContent='更新を確認'}
      }
    },900);
  }catch(e){
    setUpdateStatus('更新を確認できませんでした。通信状態を確認してください。');
    if(btn){btn.disabled=false;btn.textContent='もう一度確認'}
  }
}
function watchServiceWorker(worker){
  if(!worker)return;
  worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller){
      setUpdateStatus('新しいバージョンを準備しました。自動で更新します…');
    }
  });
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(updateReloading)return;
    updateReloading=true;
    setUpdateStatus('更新しました。再読み込みします…');
    window.location.reload();
  });
  window.addEventListener('load',async()=>{
    try{
      swRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      watchServiceWorker(swRegistration.installing);
      swRegistration.addEventListener('updatefound',()=>watchServiceWorker(swRegistration.installing));
      await checkForAppUpdate(false);
    }catch(e){setUpdateStatus('更新機能を開始できませんでした。')}
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&Date.now()-lastUpdateCheck>5*60*1000)checkForAppUpdate(false);
  });
}
$('checkUpdateBtn')?.addEventListener('click',()=>checkForAppUpdate(true));
setNow();render();
