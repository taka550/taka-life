'use strict';
const STORAGE_KEY='takaWeightApp.v1';
const SETTINGS={heightCm:176,targetWeight:85};
const SEED=[];
let state=loadState(); let showAll=false; let deferredPrompt=null;
const $=id=>document.getElementById(id);
function loadState(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY));if(v&&Array.isArray(v.records)){return {...v,version:2,settings:{...SETTINGS,...(v.settings||{})},bloodPressureRecords:Array.isArray(v.bloodPressureRecords)?v.bloodPressureRecords:[],bloodGlucoseRecords:Array.isArray(v.bloodGlucoseRecords)?v.bloodGlucoseRecords:[],hba1cRecords:Array.isArray(v.hba1cRecords)?v.hba1cRecords:[]}}}catch(e){}return {version:2,settings:{...SETTINGS},records:SEED,bloodPressureRecords:[],bloodGlucoseRecords:[],hba1cRecords:[]}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function sortRecords(){state.records.sort((a,b)=>`${a.date} ${a.time||periodOrder(a.period)}`.localeCompare(`${b.date} ${b.time||periodOrder(b.period)}`))}
function periodOrder(p){return p==='朝'?'06:00':p==='昼'?'12:00':'20:00'}
function detectPeriod(time){const h=Number((time||'12:00').split(':')[0]);return h<11?'朝':h<17?'昼':'夜'}
function nowLocal(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return {date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time:`${pad(d.getHours())}:${pad(d.getMinutes())}`}}
function setNow(){const n=nowLocal();$('dateInput').value=n.date;$('timeInput').value=n.time;$('periodInput').value='auto'}
function setBpNow(){const n=nowLocal();$('bpDateInput').value=n.date;$('bpTimeInput').value=n.time}
function setBgNow(){const n=nowLocal();$('bgDateInput').value=n.date;$('bgTimeInput').value=n.time}
function setHba1cToday(){const n=nowLocal();$('hba1cDateInput').value=n.date}
function fmt(n,d=1){return Number(n).toFixed(d)}
function latest(){sortRecords();return state.records.at(-1)}
function render(){sortRecords();renderGreeting();renderLatestRecords();renderSummary();renderHistory();renderChart();renderBloodPressure();renderBloodGlucose();renderHba1c();renderMio()}
function renderGreeting(){const h=new Date().getHours();let en='GOOD EVENING',ja='おかえり、タカ。',msg='今日も一日、お疲れさま。';if(h<11){en='GOOD MORNING';ja='おはよう、タカ。';msg='今日を、少し豊かに。'}else if(h<17){en='GOOD AFTERNOON';ja='こんにちは、タカ。';msg='ひと息ついて、午後もゆっくりいこう。'}$('timeGreeting').textContent=en;$('welcomeTitle').textContent=ja;$('welcomeMessage').textContent=msg}
function formatRecordDate(date,period,time='',includeTime=false){
  if(!date)return 'まだ記録がありません';
  const d=new Date(`${date}T12:00:00`);
  const days=['日','月','火','水','木','金','土'];
  const base=`${date.replaceAll('-','/')}（${days[d.getDay()]}）`;
  return `${base} ${period||''}${includeTime&&time?` ${time}`:''}`.trim();
}
function bmiStatus(value){
  if(value<18.5)return '痩せ';
  if(value<25)return '標準';
  if(value<30)return 'やや肥満';
  return '肥満';
}
function bmiPosition(value){
  if(!Number.isFinite(value))return 50;
  return Math.max(4,Math.min(96,((value-15)/(40-15))*100));
}
function renderLatestRecords(){
  const weight=latest();
  if(weight){
    const parts=Number(weight.weight).toFixed(1).split('.');
    if($('currentWeightInteger'))$('currentWeightInteger').textContent=parts[0];
    if($('currentWeightDecimal'))$('currentWeightDecimal').textContent=`.${parts[1]}`;
    const period=weight.period||detectPeriod(weight.time);
    if($('currentMeta'))$('currentMeta').textContent=formatRecordDate(weight.date,period,weight.time,true);
    const heightM=Number(state.settings.heightCm||SETTINGS.heightCm)/100;
    const bmi=Number(weight.weight)/(heightM*heightM);
    const status=bmiStatus(bmi);
    if($('latestBmi'))$('latestBmi').textContent=bmi.toFixed(1);
    if($('latestBmiLabel'))$('latestBmiLabel').textContent=status;
    if($('bmiMarker'))$('bmiMarker').style.setProperty('--bmi-position',`${bmiPosition(bmi)}%`);
  }else{
    if($('currentWeightInteger'))$('currentWeightInteger').textContent='--';
    if($('currentWeightDecimal'))$('currentWeightDecimal').textContent='';
    if($('currentMeta'))$('currentMeta').textContent='まだ記録がありません';
    if($('latestBmi'))$('latestBmi').textContent='--';
    if($('latestBmiLabel'))$('latestBmiLabel').textContent='記録なし';
  }

  sortBloodPressureRecords();
  const withPeriod=state.bloodPressureRecords.map(r=>({...r,period:r.period||detectPeriod(r.time)}));
  const morning=[...withPeriod].reverse().find(r=>r.period==='朝');
  const night=[...withPeriod].reverse().find(r=>r.period==='夜');
  const setBp=(record,valueId,pulseId,metaId)=>{
    if($(valueId))$(valueId).textContent=record?`${record.systolic} / ${record.diastolic}`:'-- / --';
    if($(pulseId))$(pulseId).textContent=record?`♥ 脈拍 ${record.pulse}`:'♥ 脈拍 --';
    if($(metaId))$(metaId).textContent=record?formatRecordDate(record.date,record.period):'まだ記録がありません';
  };
  setBp(morning,'latestBpMorning','latestBpMorningPulse','latestBpMorningMeta');
  setBp(night,'latestBpNight','latestBpNightPulse','latestBpNightMeta');

  sortHba1cRecords();
  const hba=state.hba1cRecords.at(-1);
  if($('latestHba1c'))$('latestHba1c').textContent=hba?Number(hba.value).toFixed(1):'--';
  if($('latestHba1cMeta'))$('latestHba1cMeta').textContent=hba?formatRecordDate(hba.date,''):'まだ記録がありません';
}
function renderSummary(){const recs=state.records;if(!recs.length)return;const cur=recs.at(-1);const sevenDaysAgo=new Date(`${cur.date}T12:00:00`);sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7);const base=[...recs].reverse().find(r=>new Date(`${r.date}T${r.time||'12:00'}:00`)<=sevenDaysAgo)||recs[0];const change=cur.weight-base.weight;const recent=recs.slice(-7);const avg=recent.reduce((s,r)=>s+r.weight,0)/recent.length;$('weekChange').textContent=`${change>=0?'+':''}${fmt(change)} kg`;$('recentAverage').textContent=`${fmt(avg)} kg`;$('recordCount').textContent=`${recs.length}回`}

function sortBloodPressureRecords(){
  if(!Array.isArray(state.bloodPressureRecords))state.bloodPressureRecords=[];
  state.bloodPressureRecords.sort((a,b)=>`${a.date} ${a.time||'00:00'}`.localeCompare(`${b.date} ${b.time||'00:00'}`));
}
function renderBloodPressure(){
  const latestEl=$('bpLatest'),body=$('bpHistoryBody');
  if(!latestEl||!body)return;
  sortBloodPressureRecords();
  const records=state.bloodPressureRecords;
  if(!records.length){
    latestEl.innerHTML='<span>最新記録</span><strong>まだ記録がありません</strong>';
    body.innerHTML='<tr><td colspan="3">まだ記録がありません</td></tr>';
    return;
  }
  const cur=records.at(-1);
  latestEl.innerHTML=`<span>最新記録　${cur.date.replaceAll('-','/')} ${cur.time}</span><strong>${cur.systolic} / ${cur.diastolic} <small>mmHg</small>　${cur.pulse} <small>回/分</small></strong>`;
  body.innerHTML=[...records].reverse().slice(0,5).map(r=>`<tr><td>${r.date.slice(5).replace('-','/')}<br><small>${r.time}</small></td><td><strong>${r.systolic} / ${r.diastolic}</strong></td><td>${r.pulse}</td></tr>`).join('');
}

function sortBloodGlucoseRecords(){
  if(!Array.isArray(state.bloodGlucoseRecords))state.bloodGlucoseRecords=[];
  state.bloodGlucoseRecords.sort((a,b)=>`${a.date} ${a.time||'00:00'}`.localeCompare(`${b.date} ${b.time||'00:00'}`));
}
function renderBloodGlucose(){
  const latestEl=$('bgLatest'),body=$('bgHistoryBody');
  if(!latestEl||!body)return;
  sortBloodGlucoseRecords();
  const records=state.bloodGlucoseRecords;
  if(!records.length){
    latestEl.innerHTML='<span>最新記録</span><strong>まだ記録がありません</strong>';
    body.innerHTML='<tr><td colspan="3">まだ記録がありません</td></tr>';
    return;
  }
  const cur=records.at(-1);
  latestEl.innerHTML=`<span>最新記録　${cur.date.replaceAll('-','/')} ${cur.time}</span><strong>${cur.value} <small>mg/dL</small>　<em>${cur.timing}</em></strong>`;
  body.innerHTML=[...records].reverse().slice(0,5).map(r=>`<tr><td>${r.date.slice(5).replace('-','/')}<br><small>${r.time}</small></td><td><strong>${r.value}</strong></td><td>${r.timing}</td></tr>`).join('');
}
function sortHba1cRecords(){
  if(!Array.isArray(state.hba1cRecords))state.hba1cRecords=[];
  state.hba1cRecords.sort((a,b)=>a.date.localeCompare(b.date));
}
function renderHba1c(){
  const latestEl=$('hba1cLatest');
  if(!latestEl)return;
  sortHba1cRecords();
  const cur=state.hba1cRecords.at(-1);
  latestEl.innerHTML=cur?`<span>最新記録　${cur.date.replaceAll('-','/')}</span><strong>${Number(cur.value).toFixed(1)} <small>%</small></strong>`:'<span>最新記録</span><strong>まだ記録がありません</strong>';
}

function groupByDate(){const m=new Map();for(const r of state.records){if(!m.has(r.date))m.set(r.date,{date:r.date,朝:null,昼:null,夜:null});m.get(r.date)[r.period]=r.weight}return [...m.values()].sort((a,b)=>b.date.localeCompare(a.date))}
function renderHistory(){const rows=groupByDate(),visible=showAll?rows:rows.slice(0,5);$('historyBody').innerHTML=visible.map(r=>`<tr><td>${r.date.replaceAll('-','/')}</td><td>${r.朝??'—'}</td><td>${r.昼??'—'}</td><td>${r.夜??'—'}</td></tr>`).join('');$('showAllBtn').textContent=showAll?'5日表示':'すべて表示'}
function renderChart(){const cvs=$('chart'),ctx=cvs.getContext('2d'),ratio=window.devicePixelRatio||1,w=cvs.clientWidth||320,h=220;cvs.width=w*ratio;cvs.height=h*ratio;ctx.scale(ratio,ratio);ctx.clearRect(0,0,w,h);let days=groupByDate().reverse();const range=$('rangeSelect').value;if(range!=='all')days=days.slice(-Number(range));if(!days.length)return;const vals=days.flatMap(d=>[d.朝,d.夜]).filter(v=>v!=null).concat([state.settings.targetWeight]);let min=Math.floor((Math.min(...vals)-.5)*2)/2,max=Math.ceil((Math.max(...vals)+.5)*2)/2;if(max-min<2)max=min+2;const pad={l:34,r:12,t:14,b:34},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,x=i=>pad.l+(days.length===1?pw/2:i*pw/(days.length-1)),y=v=>pad.t+(max-v)*ph/(max-min);
ctx.font='11px -apple-system';ctx.strokeStyle='rgba(92,69,51,.13)';ctx.fillStyle='#827469';ctx.lineWidth=1;for(let v=min;v<=max+.001;v+=.5){ctx.beginPath();ctx.moveTo(pad.l,y(v));ctx.lineTo(w-pad.r,y(v));ctx.stroke();ctx.fillText(v.toFixed(1),2,y(v)+4)}
ctx.strokeStyle='#a65747';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pad.l,y(state.settings.targetWeight));ctx.lineTo(w-pad.r,y(state.settings.targetWeight));ctx.stroke();ctx.setLineDash([]);
function series(key,color,shape){ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.5;ctx.beginPath();let started=false;days.forEach((d,i)=>{const v=d[key];if(v==null)return;if(!started){ctx.moveTo(x(i),y(v));started=true}else ctx.lineTo(x(i),y(v))});ctx.stroke();days.forEach((d,i)=>{const v=d[key];if(v==null)return;ctx.beginPath();if(shape==='diamond'){ctx.moveTo(x(i),y(v)-4);ctx.lineTo(x(i)+4,y(v));ctx.lineTo(x(i),y(v)+4);ctx.lineTo(x(i)-4,y(v));ctx.closePath()}else ctx.arc(x(i),y(v),3.5,0,Math.PI*2);ctx.fill()})}
series('朝','#6f7652','circle');series('夜','#8c625d','diamond');const labelEvery=Math.max(1,Math.ceil(days.length/6));days.forEach((d,i)=>{if(i%labelEvery===0||i===days.length-1){ctx.save();ctx.translate(x(i),h-8);ctx.rotate(-.35);ctx.fillStyle='#827469';ctx.fillText(d.date.slice(5).replace('-','/'),-10,0);ctx.restore()}})}
let theaterTimers=[];
function clearTheaterTimers(){theaterTimers.forEach(clearTimeout);theaterTimers=[]}
function theaterScenes(){
  return [...document.querySelectorAll('.speech')];
}
function showAllTheater(){
  clearTheaterTimers();
  $('angelCharacter')?.classList.add('is-visible');
  $('devilCharacter')?.classList.add('is-visible');
  theaterScenes().forEach(el=>el.classList.add('is-visible'));
  $('theaterFinale')?.classList.add('is-visible');
  $('angelCharacter')?.classList.remove('is-talking');
  $('devilCharacter')?.classList.remove('is-talking');
}
function playTheater(){
  clearTheaterTimers();
  const angel=$('angelCharacter'),devil=$('devilCharacter'),finale=$('theaterFinale');
  const scenes=theaterScenes();
  [angel,devil].forEach(el=>el?.classList.remove('is-visible','is-talking','is-listening'));
  scenes.forEach(el=>el.classList.remove('is-visible'));
  finale?.classList.remove('is-visible');

  theaterTimers.push(setTimeout(()=>angel?.classList.add('is-visible'),220));
  scenes.forEach((scene,index)=>{
    const isDevil=scene.classList.contains('speech-devil');
    const speaker=isDevil?devil:angel;
    const listener=isDevil?angel:devil;
    const at=720+(index*1250);
    theaterTimers.push(setTimeout(()=>{
      speaker?.classList.add('is-visible');
      speaker?.classList.remove('is-listening');
      speaker?.classList.add('is-talking');
      listener?.classList.remove('is-talking');
      listener?.classList.add('is-listening');
      scene?.classList.add('is-visible');
    },at));
  });
  theaterTimers.push(setTimeout(()=>{
    [angel,devil].forEach(el=>el?.classList.remove('is-talking','is-listening'));
    finale?.classList.add('is-visible');
  },720+(scenes.length*1250)));
}

function applyTheaterTimeTheme(){
  const stage=$('animeStage'),chip=$('theaterTimeChip');
  if(!stage)return;
  const h=new Date().getHours();
  let theme='night',label='NIGHT THEATER';
  if(h>=5&&h<11){theme='morning';label='MORNING THEATER'}
  else if(h>=11&&h<17){theme='day';label='DAY THEATER'}
  else if(h>=17&&h<20){theme='evening';label='EVENING THEATER'}
  stage.dataset.timeTheme=theme;
  if(chip)chip.textContent=label;
}

function renderMio(){
  applyTheaterTimeTheme();
  const cur=latest(),prev=state.records.at(-2);
  if(!cur){
    $('devilText1').textContent='まだ記録がないみたい。最初の一歩、待ってるで。';
    $('angelText1').textContent='数字より、まず記録を始めることが大切です。';
    $('devilText2').textContent='一回入れたら、うちらの出番やな。';
    $('angelText2').textContent='そうですね。まず一回だけ、今の数字をそのまま入れてみましょう。';
    $('devilText3').textContent='一回入れたら、うちらが勝手に劇場を始めるで。入場料はゼロや。';
    $('angelText3').textContent='勝手には始めません（笑）。タカが記録したら、二人でちゃんと応援します。';
    $('finaleText').textContent='記録した日から、物語が始まる。';
    playTheater();
    return;
  }
  const diff=prev?cur.weight-prev.weight:0;
  let lines;
  if(cur.weight<=state.settings.targetWeight){
    lines=['おっ、目標ライン到達や。祝勝会は焼肉、ケーキ、締めのラーメンで三部作にする？','三部作は長すぎます（笑）。でも、ここまで積み重ねたタカはちゃんと祝っていいですよ。','ほな焼肉だけ残して、ケーキとラーメンは友情出演にしとこか。','友情出演でも食べる気ですね。今日は好きなものを一つ、ゆっくり楽しむくらいにしましょう。','一つだけかいな。ほな、その一つを主役級の扱いで迎えたるわ。','主役級でも量は普通です（笑）。達成を喜んで、明日からまた心地よく続けましょう。'];
  }else if(diff<=-.5){
    lines=[`前回から${Math.abs(diff).toFixed(1)}kgダウン。これはチョコパンが拍手してる数字やな。`,'チョコパンは拍手しません（笑）。でも、タカが記録を続けている成果はちゃんと出ています。','ほな拍手してる体で、一個だけ祝賀会に呼んでもええやろ。','すぐ招待しますね。今日は食べるなら一つをゆっくり味わって、数字だけで追加しない作戦です。','了解や。チョコパンには「本日は単独公演です」って伝えとくわ。','それなら平和です（笑）。下がったことを喜びつつ、今日も普段どおりでいきましょう。'];
  }else if(diff>=.5){
    lines=[`前回から${diff.toFixed(1)}kgアップ。体重計に今日は有休を出してもらう？`,'体重計は働いています（笑）。水分や食事のタイミングでも動くので、今日だけで決めつけなくて大丈夫です。','ほな数字は見た。でも記憶からは一旦ログアウト、これでどうや。','ログアウトはしません（笑）。記録できたことを合格にして、次の食事を普段どおりに戻しましょう。','了解。反省会の代わりに、体重計へ「また次回」とだけ言うとくわ。','それで十分です。タカ、無理な帳尻合わせはせず、次の記録まで普通に過ごしましょう。'];
  }else{
    lines=['今日は大きな変化なし。体重計も「本日は平常運転です」やな。','体重計はアナウンスしません（笑）。でも、安定して記録を続けられているのは立派です。','ほな派手なご褒美はなしで、地味にスコーン一個だけ出演させる？','結局出演させるんですね（笑）。食べたい日なら一つを楽しむ、そうでなければ普段どおりで十分です。','了解。今日はスコーンのオーディションだけして、採用はタカに任せるわ。','採用権はタカです（笑）。変化が少ない日も、そのまま記録して終わりにしましょう。'];
  }
  $('devilText1').textContent=lines[0];$('angelText1').textContent=lines[1];$('devilText2').textContent=lines[2];$('angelText2').textContent=lines[3];$('devilText3').textContent=lines[4];$('angelText3').textContent=lines[5];
  $('finaleText').textContent=`最新 ${cur.weight.toFixed(1)}kg。二人とも、タカの味方。`;
  playTheater();
}
$('replayTheaterBtn')?.addEventListener('click',playTheater);
$('skipTheaterBtn')?.addEventListener('click',showAllTheater);
$('weightForm').addEventListener('submit',e=>{e.preventDefault();const weight=Number($('weightInput').value),date=$('dateInput').value,time=$('timeInput').value,period=$('periodInput').value==='auto'?detectPeriod(time):$('periodInput').value,memo=$('memoInput').value.trim();if(!date||!time||!Number.isFinite(weight)){return}const existing=state.records.find(r=>r.date===date&&r.period===period);if(existing){Object.assign(existing,{time,weight,memo,createdAt:`${date}T${time}:00`})}else{state.records.push({id:Date.now(),date,time,period,weight,memo,createdAt:`${date}T${time}:00`})}saveState();$('weightInput').value='';$('memoInput').value='';$('saveMessage').textContent=existing?`${date} ${period}の記録を上書きしたで。`:`${date} ${period}に記録したで。`;render()});

$('bloodPressureForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const systolic=Number($('systolicInput').value);
  const diastolic=Number($('diastolicInput').value);
  const pulse=Number($('pulseInput').value);
  const date=$('bpDateInput').value;
  const time=$('bpTimeInput').value;
  const memo=$('bpMemoInput').value.trim();
  const message=$('bpSaveMessage');
  if(!date||!time||![systolic,diastolic,pulse].every(Number.isFinite))return;
  if(systolic<=diastolic){
    message.textContent='最高血圧は最低血圧より大きい値を入力してな。';
    message.dataset.type='error';
    return;
  }
  if(!Array.isArray(state.bloodPressureRecords))state.bloodPressureRecords=[];
  const existing=state.bloodPressureRecords.find(r=>r.date===date&&r.time===time);
  const record={id:existing?.id||Date.now(),date,time,period:detectPeriod(time),systolic,diastolic,pulse,memo,createdAt:`${date}T${time}:00`};
  if(existing)Object.assign(existing,record);else state.bloodPressureRecords.push(record);
  saveState();
  $('systolicInput').value='';$('diastolicInput').value='';$('pulseInput').value='';$('bpMemoInput').value='';
  message.dataset.type='success';
  message.textContent=existing?`${date} ${time}の血圧を上書きしたで。`:`${date} ${time}に血圧を記録したで。`;
  renderBloodPressure();renderLatestRecords();
});
$('bloodGlucoseForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const value=Number($('bloodGlucoseInput').value);
  const timing=$('bloodGlucoseTimingInput').value;
  const date=$('bgDateInput').value;
  const time=$('bgTimeInput').value;
  const memo=$('bgMemoInput').value.trim();
  const message=$('bgSaveMessage');
  if(!date||!time||!Number.isFinite(value))return;
  if(!Array.isArray(state.bloodGlucoseRecords))state.bloodGlucoseRecords=[];
  const existing=state.bloodGlucoseRecords.find(r=>r.date===date&&r.time===time);
  const record={id:existing?.id||Date.now(),date,time,value,timing,memo,createdAt:`${date}T${time}:00`};
  if(existing)Object.assign(existing,record);else state.bloodGlucoseRecords.push(record);
  saveState();
  $('bloodGlucoseInput').value='';$('bgMemoInput').value='';
  message.dataset.type='success';
  message.textContent=existing?`${date} ${time}の血糖値を上書きしたで。`:`${date} ${time}に血糖値を記録したで。`;
  renderBloodGlucose();renderLatestRecords();
});
$('hba1cForm')?.addEventListener('submit',e=>{
  e.preventDefault();
  const value=Number($('hba1cInput').value);
  const date=$('hba1cDateInput').value;
  const memo=$('hba1cMemoInput').value.trim();
  const message=$('hba1cSaveMessage');
  if(!date||!Number.isFinite(value))return;
  if(!Array.isArray(state.hba1cRecords))state.hba1cRecords=[];
  const existing=state.hba1cRecords.find(r=>r.date===date);
  const record={id:existing?.id||Date.now(),date,value,memo,createdAt:`${date}T12:00:00`};
  if(existing)Object.assign(existing,record);else state.hba1cRecords.push(record);
  saveState();
  $('hba1cInput').value='';$('hba1cMemoInput').value='';
  message.dataset.type='success';
  message.textContent=existing?`${date}のHbA1cを上書きしたで。`:`${date}にHbA1cを記録したで。`;
  renderHba1c();renderLatestRecords();
});
$('hba1cTodayBtn')?.addEventListener('click',setHba1cToday);
$('bgNowBtn')?.addEventListener('click',setBgNow);
$('bpNowBtn')?.addEventListener('click',setBpNow);

$('nowBtn').addEventListener('click',setNow);$('showAllBtn').addEventListener('click',()=>{showAll=!showAll;renderHistory()});$('rangeSelect').addEventListener('change',renderChart);window.addEventListener('resize',renderChart);
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
$('exportJsonBtn').addEventListener('click',()=>download(`taka-life-backup-${nowLocal().date}.json`,JSON.stringify(state,null,2),'application/json'));
$('exportCsvBtn').addEventListener('click',()=>{sortRecords();const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const rows=[['No.','日付','時刻','時間帯','体重(kg)','メモ'],...state.records.map((r,i)=>[i+1,r.date.replaceAll('-','/'),r.time,r.period,r.weight,r.memo])];download(`管理台帳1_${nowLocal().date}.csv`,`\ufeff${rows.map(row=>row.map(esc).join(',')).join('\r\n')}`,'text/csv;charset=utf-8')});
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text();if(file.name.toLowerCase().endsWith('.json')){const imported=JSON.parse(text);if(!Array.isArray(imported.records))throw new Error('recordsなし');state={version:2,settings:{...SETTINGS,...(imported.settings||{})},records:imported.records,bloodPressureRecords:Array.isArray(imported.bloodPressureRecords)?imported.bloodPressureRecords:[],bloodGlucoseRecords:Array.isArray(imported.bloodGlucoseRecords)?imported.bloodGlucoseRecords:[],hba1cRecords:Array.isArray(imported.hba1cRecords)?imported.hba1cRecords:[]};}else{const lines=text.replace(/^\ufeff/,'').trim().split(/\r?\n/);const parse=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'){cur+='"';i++}else if(c==='"')q=!q;else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out};const rows=lines.slice(1).map(parse);state={...state,version:2,bloodPressureRecords:Array.isArray(state.bloodPressureRecords)?state.bloodPressureRecords:[],bloodGlucoseRecords:Array.isArray(state.bloodGlucoseRecords)?state.bloodGlucoseRecords:[],hba1cRecords:Array.isArray(state.hba1cRecords)?state.hba1cRecords:[]};state.records=rows.filter(r=>r[1]&&r[4]).map((r,i)=>({id:Date.now()+i,date:r[1].replaceAll('/','-'),time:r[2]||'',period:r[3]||detectPeriod(r[2]),weight:Number(r[4]),memo:r[5]||'',createdAt:`${r[1].replaceAll('/','-')}T${r[2]||'12:00'}:00`}))}saveState();render();$('saveMessage').textContent='バックアップを読み込んだで。'}catch(err){alert('読み込みに失敗しました。JSONまたはこのアプリのCSVを選んでください。')}e.target.value=''})

// ===== Ver.2.8.0 AI Mio Service =====
const GEMINI_KEY_STORAGE='takaLife.geminiApiKey.v1';
const GEMINI_MODEL_CACHE='takaLife.geminiModel.v4';
const MIO_MEMORY_STORAGE='takaLife.mioMemory.v2';
const LEGACY_MIO_MEMORY_STORAGE='takaLife.mioMemory.v1';
const MAX_MIO_MEMORY=30;
const MAX_RELEVANT_MIO_MEMORY=5;
const GEMINI_API_BASE='https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL_PREFERENCES=[
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash',
  'gemini-flash-latest'
];
const GEMINI_TEST_COOLDOWN_MS=30000;
let lastGeminiTestAt=0;
const GEMINI_USAGE_STORAGE='takaLife.geminiUsage.v1';
const GEMINI_DAILY_LIMIT_ESTIMATE=20;


function geminiQuotaDayKey(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function loadGeminiUsage(){
  const today=geminiQuotaDayKey();
  try{
    const saved=JSON.parse(localStorage.getItem(GEMINI_USAGE_STORAGE)||'{}');
    if(saved?.date===today&&Number.isFinite(Number(saved.count))){
      return {date:today,count:Math.max(0,Number(saved.count))};
    }
  }catch(e){}
  const fresh={date:today,count:0};
  localStorage.setItem(GEMINI_USAGE_STORAGE,JSON.stringify(fresh));
  return fresh;
}
function saveGeminiUsage(usage){
  localStorage.setItem(GEMINI_USAGE_STORAGE,JSON.stringify(usage));
}
function incrementGeminiUsage(){
  const usage=loadGeminiUsage();
  usage.count+=1;
  saveGeminiUsage(usage);
  updateGeminiUsageUi();
  return usage.count;
}
function updateGeminiUsageUi(){
  const usage=loadGeminiUsage();
  const count=usage.count;
  const estimatedRemaining=Math.max(0,GEMINI_DAILY_LIMIT_ESTIMATE-count);
  const percent=Math.min(100,Math.round((count/GEMINI_DAILY_LIMIT_ESTIMATE)*100));
  const countEl=$('geminiUsageCount');
  const trackEl=$('geminiUsageTrack');
  const barEl=$('geminiUsageBar');
  const noteEl=$('geminiUsageNote');

  if(countEl)countEl.textContent=`${count} / ${GEMINI_DAILY_LIMIT_ESTIMATE} 回`;
  if(trackEl)trackEl.setAttribute('aria-valuenow',String(Math.min(count,GEMINI_DAILY_LIMIT_ESTIMATE)));
  if(barEl)barEl.style.width=`${percent}%`;

  if(noteEl){
    if(count>=GEMINI_DAILY_LIMIT_ESTIMATE){
      noteEl.textContent='今日の無料枠を使い切っている可能性があります。';
    }else if(count>=Math.ceil(GEMINI_DAILY_LIMIT_ESTIMATE*.75)){
      noteEl.textContent=`あと約${estimatedRemaining}回の目安です。使いすぎに注意してください。`;
    }else{
      noteEl.textContent=`あと約${estimatedRemaining}回の目安です。`;
    }
  }
}
function getGeminiKey(){
  return localStorage.getItem(GEMINI_KEY_STORAGE)||'';
}
function saveGeminiKey(){
  const key=$('geminiApiKey')?.value.trim()||'';
  if(!key){setMioAiStatus('APIキーを入力してください。','error');return false}
  localStorage.setItem(GEMINI_KEY_STORAGE,key);
  localStorage.removeItem(GEMINI_MODEL_CACHE);
  setMioAiStatus('このiPhoneにAPIキーを保存しました。','success');
  updateMioApiUi();
  return true;
}
const MIO_PROFILE={
  name:'タカ',
  age:51,
  home:'家族は大阪、本人は千葉・幕張で単身赴任',
  work:'管理職。企画・経理・法務を横断する仕事や、品質トラブル対応を担う',
  personality:'責任感が強く、納得できる根拠を大切にする。ユーモアと関西らしいツッコミが好き',
  family:'妻と息子2人を大切にしている',
  health:'2型糖尿病。マンジャロを土曜夜に使用し、翌日は食欲が落ちやすい。健康第一',
  lifestyle:'自転車通勤。朝食は基本軽めまたは食べない。夜は米を控えめにする',
  interests:'スタバでの読書、ほっこり系小説、料理、キングダムが好き',
  conversation:'説教や一般論より、具体的で自然な会話を好む。デビルミオの軽い関西弁と笑えるツッコミが好き'
};
const MIO_TAG_RULES={
  health:['マンジャロ','食欲','糖尿病','血糖','薬','体調','頭痛','ふらつ','吐き気','下痢','水分','体重','kg','減量','ダイエット','睡眠','疲れ','休む','休憩'],
  work:['仕事','会社','出勤','会議','出張','部下','上司','残業','休日出勤','議事録','案件','職場'],
  family:['家族','奥さん','妻','息子','長男','次男','大阪','奈良','サメしゃん','クマしゃん'],
  starbucks:['スタバ','コーヒー','ティー','フラペチーノ','リフレッシャーズ','カフェ','モバイルオーダー'],
  reading:['本','読書','小説','森崎','書店','パン屋','成瀬','メガチャーチ'],
  food:['食べ','ごはん','料理','昼食','夕食','朝食','寿司','アジフライ','パン','ケーキ','お酒','ハイボール'],
  exercise:['自転車','散歩','運動','歩く','通勤'],
  mood:['気分','楽しい','寂しい','不安','しんどい','嬉しい','眠い','疲れ','焦る','落ち込'],
  app:['アプリ','Taka-Life','ミオ劇場','Gemini','ジェミニ','API','GitHub','Cloudflare']
};
function normalizeMioText(value){
  return String(value||'').normalize('NFKC').toLowerCase();
}
function detectMioTags(text){
  const normalized=normalizeMioText(text);
  return Object.entries(MIO_TAG_RULES)
    .filter(([,words])=>words.some(word=>normalized.includes(normalizeMioText(word))))
    .map(([tag])=>tag);
}
function migrateLegacyMioMemory(){
  if(localStorage.getItem(MIO_MEMORY_STORAGE))return;
  try{
    const legacy=JSON.parse(localStorage.getItem(LEGACY_MIO_MEMORY_STORAGE)||'[]');
    if(!Array.isArray(legacy)||!legacy.length)return;
    const migrated=legacy.map((item,index)=>{
      const userMessage=String(item?.userMessage||'').slice(0,360);
      return {
        id:`legacy-${index}-${Date.parse(item?.at)||Date.now()}`,
        at:item?.at||new Date().toISOString(),
        userMessage,
        summary:String(item?.finale||'').slice(0,220),
        tags:detectMioTags(`${userMessage} ${item?.finale||''}`)
      };
    });
    localStorage.setItem(MIO_MEMORY_STORAGE,JSON.stringify(migrated.slice(-MAX_MIO_MEMORY)));
  }catch(e){}
}
function loadMioMemory(){
  migrateLegacyMioMemory();
  try{
    const value=JSON.parse(localStorage.getItem(MIO_MEMORY_STORAGE)||'[]');
    return Array.isArray(value)?value.slice(-MAX_MIO_MEMORY):[];
  }catch(e){return []}
}
function saveMioMemory(userMessage,result){
  const memory=loadMioMemory();
  const summary=[result?.angel1,result?.devil1,result?.angel2,result?.devil2,result?.angel3,result?.devil3,result?.finale].filter(Boolean).join(' ').slice(0,420);
  const text=`${userMessage||''} ${summary}`;
  memory.push({
    id:`mio-${Date.now()}`,
    at:new Date().toISOString(),
    userMessage:String(userMessage||'').slice(0,360),
    summary,
    tags:detectMioTags(text)
  });
  localStorage.setItem(MIO_MEMORY_STORAGE,JSON.stringify(memory.slice(-MAX_MIO_MEMORY)));
}
function scoreMioMemory(item,queryTags,queryText,index,total){
  const itemTags=Array.isArray(item?.tags)?item.tags:detectMioTags(`${item?.userMessage||''} ${item?.summary||''}`);
  const tagScore=itemTags.reduce((sum,tag)=>sum+(queryTags.includes(tag)?5:0),0);
  const normalizedQuery=normalizeMioText(queryText);
  const normalizedItem=normalizeMioText(`${item?.userMessage||''} ${item?.summary||''}`);
  const keywords=normalizedQuery.split(/[\s、。！？,.!?:：／/]+/).filter(word=>word.length>=2);
  const wordScore=keywords.reduce((sum,word)=>sum+(normalizedItem.includes(word)?2:0),0);
  const recencyScore=total?((index+1)/total)*2:0;
  return tagScore+wordScore+recencyScore;
}
function selectRelevantMioMemory(userText){
  const memory=loadMioMemory();
  const queryTags=detectMioTags(userText);
  const ranked=memory.map((item,index)=>({
    item,
    score:scoreMioMemory(item,queryTags,userText,index,memory.length)
  })).sort((a,b)=>b.score-a.score);
  const matched=ranked.filter(entry=>entry.score>=3).slice(0,MAX_RELEVANT_MIO_MEMORY);
  const selected=matched.length?matched:ranked.slice(0,Math.min(2,ranked.length));
  return selected.map(({item})=>({
    date:item.at?new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric'}).format(new Date(item.at)):'',
    userMessage:String(item.userMessage||'').slice(0,220),
    summary:String(item.summary||'').slice(0,160),
    tags:Array.isArray(item.tags)?item.tags:detectMioTags(`${item.userMessage||''} ${item.summary||''}`)
  }));
}
function updateMioApiUi(){
  const saved=Boolean(getGeminiKey());
  if($('geminiApiKey')&&!$('geminiApiKey').value&&saved)$('geminiApiKey').value=getGeminiKey();
  const preview=$('mioContextPreview');
  const cur=latest();
  const memoryCount=loadMioMemory().length;
  if(preview){
    preview.textContent=cur
      ?`最新記録：${cur.date} ${cur.period} ${Number(cur.weight).toFixed(1)}kg ／ 目標 ${state.settings.targetWeight}kg ／ 記憶 ${memoryCount}件から関連情報だけ選びます`
      :`体重記録はまだありません。記憶 ${memoryCount}件から相談に合う情報だけ選びます。`;
  }
}
function setMioAiStatus(message,type=''){
  const el=$('mioAiStatus');
  if(!el)return;
  el.textContent=message;
  el.dataset.type=type;
}
function openMioChat(){
  const panel=$('mioAiPanel');
  if(!panel)return;
  panel.hidden=false;
  updateMioApiUi();
  updateGeminiUsageUi();
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'center'}),50);
}
function closeMioChat(){const panel=$('mioAiPanel');if(panel)panel.hidden=true}
function calcTrend(records){
  if(records.length<2)return null;
  const first=Number(records[0].weight),last=Number(records.at(-1).weight);
  if(!Number.isFinite(first)||!Number.isFinite(last))return null;
  return Number((last-first).toFixed(1));
}
function localDayPart(date){const hour=date.getHours();return hour<10?'朝':hour<16?'昼':'夜'}
function selectMioMainTheme(userText,recentRecords,relevantMemories){
  const text=String(userText||'').trim();
  const tags=detectMioTags(text);
  const priority=['health','work','starbucks','reading','food','exercise','family','mood','app'];
  const labels={health:'体調・健康',work:'仕事',starbucks:'スタバ',reading:'読書',food:'食事',exercise:'運動',family:'家族',mood:'今日の気分',app:'Taka-Life'};
  let key=priority.find(tag=>tags.includes(tag));
  let source='userMessage';
  let focus=text;
  if(!key&&text){key='mood';focus=text;}
  if(!key){
    const latestWithMemo=[...recentRecords].reverse().find(record=>String(record.memo||'').trim());
    if(latestWithMemo){
      const memo=String(latestWithMemo.memo).trim();
      const memoTags=detectMioTags(memo);
      key=priority.find(tag=>memoTags.includes(tag))||'mood';
      source='latestWeightMemo';
      focus=memo;
    }
  }
  if(!key&&relevantMemories?.length){
    const memory=relevantMemories[0];
    key=priority.find(tag=>(memory.tags||[]).includes(tag))||'mood';
    source='relevantMemory';
    focus=String(memory.user||memory.summary||'').trim();
  }
  if(!key){
    key='health';source='weightData';
    const latest=recentRecords.at(-1);
    focus=latest?`最新体重 ${Number(latest.weight).toFixed(1)}kg`:'今日の調子';
  }
  return {key,label:labels[key]||'今日の話題',source,focus:focus.slice(0,180)};
}
function buildMioContext(userText){
  sortRecords();
  const cur=latest();
  const recent=state.records.slice(-5).map(r=>({date:r.date,period:r.period,time:r.time||'',weight:Number(r.weight),memo:r.memo||''}));
  const now=new Date();
  const latestWeight=cur?Number(cur.weight):null;
  const heightM=Number(state.settings.heightCm)/100;
  const bmi=latestWeight&&heightM?Number((latestWeight/(heightM*heightM)).toFixed(1)):null;
  const relevantMemory=selectRelevantMioMemory(userText);
  const mainTheme=selectMioMainTheme(userText,recent,relevantMemory);
  return {
    profile:{...MIO_PROFILE,heightCm:state.settings.heightCm,targetWeightKg:state.settings.targetWeight},
    currentTime:{local:new Intl.DateTimeFormat('ja-JP',{dateStyle:'full',timeStyle:'short'}).format(now),weekday:new Intl.DateTimeFormat('ja-JP',{weekday:'long'}).format(now),dayPart:localDayPart(now)},
    weight:{
      latest:cur?{date:cur.date,period:cur.period,time:cur.time||'',kg:latestWeight,memo:cur.memo||'',bmi}:null,
      targetKg:state.settings.targetWeight,
      differenceToTargetKg:latestWeight!==null?Number((latestWeight-Number(state.settings.targetWeight)).toFixed(1)):null,
      recentChangeKg:calcTrend(recent),
      recentRecords:recent
    },
    relevantMemories:relevantMemory,
    mainTheme,
    inputTags:detectMioTags(userText),
    userMessage:userText
  };
}
function mioTheaterPrompt(context){
  return `あなたはTaka-Life専属のコメディ脚本家です。タカ向けの30秒ほどの「ミオ劇場」を1本作ってください。

【会話の軸】
- 固定テーマ：${context.mainTheme.label}
- 焦点：${context.mainTheme.focus}
- angel1が劇場全体の基準セリフです。
- 2ターン目以降は毎回「angel1の内容」と「直前の相手のセリフ」の両方を確認して返してください。
- 固定テーマから最後まで離れないでください。連想で別テーマへ移ることも禁止です。

【役割】
- エンジェルミオ：最初に話す司会・ツッコミ役。優しいが、説教や一般論にしない。
- デビルミオ：エンジェルの話へ横から乱入する誘惑・ボケ役。軽い関西弁。新しい話題を始めない。
- 二人ともタカの味方です。危険な行動や薬の変更は勧めません。
- 二人はタカと昔から付き合いのある親友です。
- 呼び方は必ず「タカ」。絶対に「タカさん」「あなた」「ユーザー」と呼ばないでください。
- 初対面のような敬語や堅苦しい口調は禁止です。
- エンジェルミオは少し年上のお姉さんのように自然で距離が近い話し方をします。
- デビルミオは昔からの悪友として遠慮なくタメ口で話します。
- スタバ、読書、仕事など過去の思い出は共有しているものとして自然に触れて構いません。

【流れ】
1. angel1：入力やアプリ情報から具体的な一件を拾い、テーマを明確にする。デビルが割り込みやすい隙を残す。
2. devil1：angel1の具体語を使って、同じテーマのままボケる。
3. angel2：angel1の軸を保ち、devil1の具体語へ直接ツッコむ。
4. devil2：angel1の軸を保ち、angel2へ言い返して同じボケを一段だけ重ねる。
5. angel3：angel1の軸を保ち、devil2を具体的に拾って自然に着地させる。
6. devil3：angel1の軸を保ち、angel3の言葉を使って少し折れつつ小さなオチで締める。
7. finale：二人の共同コメントを短い一文で締める。

【文章ルール】
- 各セリフは30〜75文字程度、1〜2文。finaleは20〜45文字程度。
- すべて文末まで完成させてください。長くなりそうなら内容を削り、途中で切らないでください。
- 「自分のペースで」「無理せず」「焦らず」「大切ですね」などの汎用文は禁止です。
- デビルを健康指導役やまとめ役にしないでください。
- 出力は指定されたJSONスキーマに従い、説明や前置きを付けないでください。

【今回使える情報】
${JSON.stringify(context,null,2)}`;
}
function fetchWithTimeout(url,options={},timeoutMs=18000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));
}
async function geminiFetch(path,key,{method='GET',body,timeoutMs=18000}={}){
  const response=await fetchWithTimeout(`${GEMINI_API_BASE}${path}`,{
    method,
    headers:{...(body?{'Content-Type':'application/json'}:{}),'x-goog-api-key':key},
    ...(body?{body:JSON.stringify(body)}:{})
  },timeoutMs);
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const err=new Error(data?.error?.message||`HTTP ${response.status}`);
    err.status=response.status;
    const retryHeader=response.headers.get('retry-after');
    const retryFromMessage=String(err.message).match(/retry in\s+([\d.]+)s/i);
    err.retryAfterSeconds=retryHeader?Math.ceil(Number(retryHeader)):retryFromMessage?Math.ceil(Number(retryFromMessage[1])):null;
    throw err;
  }
  return data;
}
async function getAvailableGeminiModel(forceRefresh=false){
  const key=getGeminiKey();
  if(!key)throw new Error('APIキーが未設定です。');
  if(!forceRefresh){const cached=localStorage.getItem(GEMINI_MODEL_CACHE);if(cached)return cached}
  const data=await geminiFetch('/models?pageSize=1000',key,{timeoutMs:12000});
  const available=(data.models||[])
    .filter(m=>Array.isArray(m.supportedGenerationMethods)&&m.supportedGenerationMethods.includes('generateContent'))
    .map(m=>String(m.name||'').replace(/^models\//,''))
    .filter(name=>/gemini/i.test(name)&&!/embedding|image|imagen|veo|tts|audio|live|robotics|research/i.test(name));
  const selected=GEMINI_MODEL_PREFERENCES.find(name=>available.includes(name))
    ||available.find(name=>/flash/i.test(name)&&!/preview|exp/i.test(name))
    ||available.find(name=>/flash/i.test(name))
    ||available[0];
  if(!selected)throw new Error('このAPIキーで利用できる文章生成モデルが見つかりませんでした。');
  localStorage.setItem(GEMINI_MODEL_CACHE,selected);
  return selected;
}
function extractCandidateText(data){
  const parts=data?.candidates?.[0]?.content?.parts;
  if(!Array.isArray(parts))return '';
  return parts.filter(part=>typeof part?.text==='string'&&!part?.thought).map(part=>part.text).join('').trim();
}
function cleanMioText(value){
  let text=String(value||'')
    .replace(/```(?:text|json|markdown)?/gi,'')
    .replace(/```/g,'')
    .replace(/[\r\n]+/g,' ')
    .replace(/\s+/g,' ')
    .replace(/^\s*["「『]+/,'')
    .replace(/["」』]+\s*$/,'')
    .trim();
  if(text&&!/[。！？!?]$/.test(text))text+='。';
  return text;
}
function extractJsonObject(text){
  const normalized=String(text||'')
    .replace(/```(?:json|text|markdown)?/gi,'')
    .replace(/```/g,'')
    .trim();
  try{return JSON.parse(normalized)}catch(e){}
  const first=normalized.indexOf('{');
  const last=normalized.lastIndexOf('}');
  if(first<0||last<=first)return null;
  try{return JSON.parse(normalized.slice(first,last+1))}catch{return null}
}
function parseMioTheater(text){
  const slots=['angel1','devil1','angel2','devil2','angel3','devil3','finale'];
  const json=extractJsonObject(text);
  if(!json||!slots.every(slot=>typeof json[slot]==='string'&&json[slot].trim())){
    throw new Error('Geminiの返答形式が崩れました。もう一度作成してください。');
  }
  const result={theme:cleanMioText(json.theme||'今日の話題').replace(/[。！？!?]$/,'')};
  for(const slot of slots)result[slot]=cleanMioText(json[slot]);
  return result;
}
function buildGenerateBody(context,model){
  const stringField=description=>({type:'STRING',description});
  const generationConfig={
    responseMimeType:'application/json',
    responseSchema:{
      type:'OBJECT',
      properties:{
        theme:stringField('今回の固定テーマを短く表した言葉'),
        angel1:stringField('エンジェルの最初の基準セリフ。30〜75文字程度で完結'),
        devil1:stringField('angel1の具体語を拾うデビルのボケ。30〜75文字程度で完結'),
        angel2:stringField('angel1の軸を保ちdevil1へ直接返すツッコミ。30〜75文字程度で完結'),
        devil2:stringField('angel1の軸を保ちangel2へ言い返すボケ。30〜75文字程度で完結'),
        angel3:stringField('angel1の軸を保ちdevil2を拾って着地するセリフ。30〜75文字程度で完結'),
        devil3:stringField('angel1の軸を保ちangel3を拾う小さなオチ。30〜75文字程度で完結'),
        finale:stringField('二人の共同コメント。20〜45文字程度で完結')
      },
      required:['theme','angel1','devil1','angel2','devil2','angel3','devil3','finale']
    },
    maxOutputTokens:2048,
    temperature:0.78
  };
  if(/^gemini-3/i.test(model))generationConfig.thinkingConfig={thinkingLevel:'LOW'};
  else if(/^gemini-2\.5-(?:flash|flash-lite)/i.test(model))generationConfig.thinkingConfig={thinkingBudget:0};
  return {
    contents:[{role:'user',parts:[{text:mioTheaterPrompt(context)}]}],
    generationConfig
  };
}
function isModelUnavailable(err){return err?.status===404||/no longer available|not found|not supported for generatecontent/i.test(err?.message||'')}
async function testGeminiConnectionOnly(){
  const key=getGeminiKey();
  if(!key)throw new Error('APIキーが未設定です。');
  let model=await getAvailableGeminiModel(true);
  for(let attempt=0;attempt<2;attempt++){
    try{
      incrementGeminiUsage();
      const data=await geminiFetch(`/models/${encodeURIComponent(model)}:generateContent`,key,{method:'POST',timeoutMs:12000,body:{contents:[{role:'user',parts:[{text:'接続確認です。「接続できました」とだけ返してください。'}]}],generationConfig:{maxOutputTokens:20,temperature:0}}});
      if(!extractCandidateText(data))throw new Error('Geminiから返事がありませんでした。');
      return {model,message:'接続できました'};
    }catch(err){
      if(isModelUnavailable(err)&&attempt===0){localStorage.removeItem(GEMINI_MODEL_CACHE);model=await getAvailableGeminiModel(true);continue}
      throw err;
    }
  }
  throw new Error('接続確認に失敗しました。');
}
async function callGeminiForMio(userText,options={}){
  const key=getGeminiKey();
  if(!key)throw new Error('APIキーが未設定です。');
  const context=buildMioContext(userText);
  let model=await getAvailableGeminiModel(Boolean(options.forceModelRefresh));

  for(let attempt=0;attempt<2;attempt++){
    try{
      incrementGeminiUsage();
      const data=await geminiFetch(`/models/${encodeURIComponent(model)}:generateContent`,key,{
        method:'POST',
        body:buildGenerateBody(context,model),
        timeoutMs:22000
      });
      const text=extractCandidateText(data);
      const finishReason=data?.candidates?.[0]?.finishReason||'';
      if(!text)throw new Error('ミオから返事がありませんでした。');
      if(finishReason==='MAX_TOKENS')throw new Error('Geminiの返答が上限で途中終了しました。もう一度作成してください。');
      return parseMioTheater(text);
    }catch(err){
      if(isModelUnavailable(err)&&attempt===0){
        localStorage.removeItem(GEMINI_MODEL_CACHE);
        model=await getAvailableGeminiModel(true);
        continue;
      }
      throw err;
    }
  }
  throw new Error('ミオ劇場を作れませんでした。もう一度お試しください。');
}
function applyAiMioTheater(result){
  clearTheaterTimers();
  $('angelText1').textContent=result.angel1;
  $('devilText1').textContent=result.devil1;
  $('angelText2').textContent=result.angel2;
  $('devilText2').textContent=result.devil2;
  $('angelText3').textContent=result.angel3;
  $('devilText3').textContent=result.devil3;
  $('finaleText').textContent=result.finale;
  closeMioChat();
  $('mioTheater')?.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(playTheater,450);
}
function friendlyGeminiError(err,action='作成'){
  if(err?.name==='AbortError')return `Geminiの返事が遅いため時間切れになりました。少し待ってからもう一度お試しください。`;
  if(err?.status===429){
    const wait=Number(err.retryAfterSeconds);
    const usage=loadGeminiUsage();
    const dailyHint=usage.count>=GEMINI_DAILY_LIMIT_ESTIMATE
      ?' 今日の利用回数も目安上限に達しているため、日次枠の可能性があります。'
      :'';
    return Number.isFinite(wait)&&wait>0
      ?`Gemini無料枠の制限です。約${wait}秒待ってから再試行してください。${dailyHint}`.trim()
      :`Gemini無料枠の制限です。1分ほど待ってから再試行してください。${dailyHint}`.trim();
  }
  if(err?.status===401||err?.status===403)return 'APIキーまたは利用権限を確認してください。キーを保存し直してから接続テストをお試しください。';
  return `${action}できませんでした：${err?.message||'不明なエラー'}`;
}
async function runGeminiTest(){
  if(!getGeminiKey()&&!saveGeminiKey())return;
  const btn=$('testGeminiBtn');
  const elapsed=Date.now()-lastGeminiTestAt;
  if(elapsed<GEMINI_TEST_COOLDOWN_MS){
    const wait=Math.ceil((GEMINI_TEST_COOLDOWN_MS-elapsed)/1000);
    setMioAiStatus(`接続テストは約${wait}秒後にもう一度お試しください。無料枠の連続利用を防いでいます。`,'error');
    return;
  }
  lastGeminiTestAt=Date.now();
  try{
    if(btn){btn.disabled=true;btn.textContent='接続中…'}
    setMioAiStatus('Geminiへ接続できるか確認しています…');
    const result=await testGeminiConnectionOnly();
    localStorage.setItem(GEMINI_MODEL_CACHE,result.model);
    setMioAiStatus(`接続成功！ ${result.model} を利用できます。`,'success');
  }catch(err){
    setMioAiStatus(friendlyGeminiError(err,'接続'),'error');
  }finally{
    if(btn){
      btn.textContent='接続テスト';
      setTimeout(()=>{btn.disabled=false},GEMINI_TEST_COOLDOWN_MS);
    }
  }
}
async function askMio(){
  const question=$('mioQuestion')?.value.trim()||'今日の記録を見て、二人からひとことお願いします。';
  if(!getGeminiKey()){
    setMioAiStatus('先にAPIキーを入力して保存してください。','error');
    $('geminiApiKey')?.focus();
    return;
  }
  const btn=$('askMioBtn');
  let seconds=0,timer=null;
  try{
    if(btn){btn.disabled=true;btn.textContent='ミオたちが考え中…'}
    setMioAiStatus('エンジェルミオとデビルミオが脚本を相談中… 0秒');
    timer=setInterval(()=>{seconds++;setMioAiStatus(`エンジェルミオとデビルミオが脚本を相談中… ${seconds}秒`)},1000);
    const result=await callGeminiForMio(question);
    saveMioMemory(question,result);
    applyAiMioTheater(result);
    setMioAiStatus('');
    updateMioApiUi();
  }catch(err){
    setMioAiStatus(friendlyGeminiError(err,'作成'),'error');
  }finally{
    if(timer)clearInterval(timer);
    if(btn){btn.disabled=false;btn.textContent='ミオ劇場をつくる'}
  }
}
$('openMioChatBtn')?.addEventListener('click',openMioChat);
$('closeMioChatBtn')?.addEventListener('click',closeMioChat);
$('saveApiKeyBtn')?.addEventListener('click',saveGeminiKey);
$('testGeminiBtn')?.addEventListener('click',runGeminiTest);
$('askMioBtn')?.addEventListener('click',askMio);
$('toggleApiKeyBtn')?.addEventListener('click',()=>{
  const input=$('geminiApiKey');
  if(!input)return;
  const showing=input.type==='text';
  input.type=showing?'password':'text';
  $('toggleApiKeyBtn').textContent=showing?'表示':'隠す';
});
const APP_VERSION='2.8.0';
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
setNow();setBpNow();setBgNow();setHba1cToday();
document.querySelectorAll('[data-scroll-target]').forEach(button=>button.addEventListener('click',()=>{
  const target=document.getElementById(button.dataset.scrollTarget);
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
}));
render();
updateGeminiUsageUi();


document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')updateGeminiUsageUi();
});
window.addEventListener('focus',()=>updateGeminiUsageUi());
