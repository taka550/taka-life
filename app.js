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
$('nowBtn').addEventListener('click',setNow);$('showAllBtn').addEventListener('click',()=>{showAll=!showAll;renderHistory()});$('rangeSelect').addEventListener('change',renderChart);window.addEventListener('resize',renderChart);
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
$('exportJsonBtn').addEventListener('click',()=>download(`taka-weight-backup-${nowLocal().date}.json`,JSON.stringify(state,null,2),'application/json'));
$('exportCsvBtn').addEventListener('click',()=>{sortRecords();const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;const rows=[['No.','日付','時刻','時間帯','体重(kg)','メモ'],...state.records.map((r,i)=>[i+1,r.date.replaceAll('-','/'),r.time,r.period,r.weight,r.memo])];download(`管理台帳1_${nowLocal().date}.csv`,`\ufeff${rows.map(row=>row.map(esc).join(',')).join('\r\n')}`,'text/csv;charset=utf-8')});
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const text=await file.text();if(file.name.toLowerCase().endsWith('.json')){const imported=JSON.parse(text);if(!Array.isArray(imported.records))throw new Error('recordsなし');state={version:1,settings:{...SETTINGS,...(imported.settings||{})},records:imported.records};}else{const lines=text.replace(/^\ufeff/,'').trim().split(/\r?\n/);const parse=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'){cur+='"';i++}else if(c==='"')q=!q;else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out};const rows=lines.slice(1).map(parse);state.records=rows.filter(r=>r[1]&&r[4]).map((r,i)=>({id:Date.now()+i,date:r[1].replaceAll('/','-'),time:r[2]||'',period:r[3]||detectPeriod(r[2]),weight:Number(r[4]),memo:r[5]||'',createdAt:`${r[1].replaceAll('/','-')}T${r[2]||'12:00'}:00`}))}saveState();render();$('saveMessage').textContent='バックアップを読み込んだで。'}catch(err){alert('読み込みに失敗しました。JSONまたはこのアプリのCSVを選んでください。')}e.target.value=''})

// ===== Ver.2.6.7 AI Mio Service =====
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
  return `あなたはTaka-Lifeの専属コメディ脚本家です。タカ専用の短い即興コント「ミオ劇場」を1本だけ書いてください。

【最優先】
これは相談回答ではなく、エンジェルミオが自然に話し始めたところへ、デビルミオが横からちゃちゃを入れて始まる30秒ほどの漫才です。各セリフは直前のセリフを受け、会話の自然さを最優先してください。

【今回の舞台となる話題】
メインテーマは「${context.mainTheme.label}」です。
話題の焦点は「${context.mainTheme.focus}」です。
最初から最後まで、この焦点から別の話題へ移らないでください。

【二人の関係】
二人は仲良しで、どちらもタカの味方です。エンジェルは舞台を整える司会役、デビルは横から乱入するボケ役です。健康を害する行動や薬の変更などは勧めません。

【エンジェルミオ】
- 最初に話す。タカの入力があれば、その具体的な出来事や言葉を必ず一つ拾う。
- 入力が空なら、渡されたアプリ情報のうちメインテーマに関係する事実を一つだけ拾う。
- 初手は1〜2文。状況を受け止め、少し話を広げて、デビルが割り込みやすい隙を作る。
- 「言葉にできて大切です」「自分のペースで」「無理せず」「焦らず」など、何にでも使える汎用文は禁止。
- デビルのボケには、その言葉を具体的に拾って笑いながらツッコむ。説教や長い助言は禁止。

【デビルミオ】
- エンジェルの発言に横からちゃちゃを入れる、誘惑・ボケ担当。軽い関西弁。
- 必ず直前のエンジェルの具体語を一つ拾い、ツッコミ待ちのボケを一つだけ入れる。
- 自分から新しい話題を始めない。健康指導や現実的なまとめを担当しない。
- 2回目はエンジェルのツッコミへ言い返す。3回目は少し折れつつ、小さなボケで締める。
- 毎回同じ「ゼロカロリー」「ご褒美」だけに頼らない。

【必ず守る6ターン】
1. エンジェル1：入力またはアプリ情報を具体的に拾い、自然に話を広げる。
2. デビル1：エンジェル1の具体語に横からちゃちゃを入れ、誘惑かボケをする。
3. エンジェル2：デビル1の言葉を拾って直接ツッコみ、タカの状況へ戻す。
4. デビル2：エンジェル2のツッコミへ言い返し、同じ話題でボケを一段だけ重ねる。
5. エンジェル3：デビル2をもう一度拾ってツッコみ、今日の自然な着地点を一つ示す。
6. デビル3：少し折れながら、直前の言葉を使った小さなオチで締める。
フィナーレ：二人の共同コメントを短く一文。説教や抽象的な美辞麗句は禁止。

【会話を自然にするルール】
- 各ターンの冒頭または前半で、直前のセリフに出た具体語・理屈・ボケへ反応する。
- 同じ情報を言い換えるだけではなく、「受ける→返す」の因果関係を作る。
- エンジェルが先に結論を出し切らない。デビルが入る余地を残す。
- デビルが途中で常識人や健康指導役に変わらない。
- プロフィールや記憶は、メインテーマに自然に効く場合だけ最大1点使う。無理に盛り込まない。
- 事実を捏造しない。二人ともタカを「タカ」と呼ぶ。
- 各セリフ30〜75文字、1〜2文。途中で切れた文、箇条書き、説明文は禁止。

【出力前の自己確認】
エンジェルから始まった／デビルが横から入った／全ターンが直前の発言を拾った／話題が一つ／役割が最後まで崩れていない。この5点を満たしてから出力してください。

【出力形式】前置き・Markdown・説明は禁止。必ずこの順番。
【エンジェル1】
セリフ
【デビル1】
セリフ
【エンジェル2】
セリフ
【デビル2】
セリフ
【エンジェル3】
セリフ
【デビル3】
セリフ
【フィナーレ】
セリフ

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
function parseMioTheater(text){
  const normalized=String(text||'')
    .replace(/```(?:text|json|markdown)?/gi,'')
    .replace(/```/g,'')
    .replace(/\r/g,'')
    .trim();

  const labels=[
    {slot:'angel1',pattern:'(?:エンジェル\s*1|エンジェル①|ANGEL\s*1)'},
    {slot:'devil1',pattern:'(?:デビル\s*1|デビル①|DEVIL\s*1)'},
    {slot:'angel2',pattern:'(?:エンジェル\s*2|エンジェル②|ANGEL\s*2)'},
    {slot:'devil2',pattern:'(?:デビル\s*2|デビル②|DEVIL\s*2)'},
    {slot:'angel3',pattern:'(?:エンジェル\s*3|エンジェル③|ANGEL\s*3)'},
    {slot:'devil3',pattern:'(?:デビル\s*3|デビル③|DEVIL\s*3)'},
    {slot:'finale',pattern:'(?:フィナーレ|まとめ|FINALE)'}
  ];
  const result={};

  for(let i=0;i<labels.length;i++){
    const current=labels[i];
    const next=labels[i+1];
    const endPattern=next?`(?=\\s*[【\\[]?${next.pattern}[】\\]]?\\s*[:：-]?)`:'$';
    const regex=new RegExp(`[【\\[]?${current.pattern}[】\\]]?\\s*[:：-]?\\s*([\\s\\S]*?)${endPattern}`,'i');
    const match=normalized.match(regex);
    if(match?.[1])result[current.slot]=cleanMioText(match[1]);
  }

  // Fallback 1: one non-heading paragraph per line
  if(Object.keys(result).length<7){
    const chunks=normalized
      .split(/\n+/)
      .map(line=>line
        .replace(/^\s*[【\[]?(?:デビル\s*[123①②③]?|エンジェル\s*[123①②③]?|フィナーレ|まとめ|DEVIL\s*[123]?|ANGEL\s*[123]?|FINALE)[】\]]?\s*[:：-]?\s*/i,'')
        .trim())
      .filter(line=>line.length>=16);

    const slots=['angel1','devil1','angel2','devil2','angel3','devil3','finale'];
    for(let i=0;i<slots.length;i++){
      if(!result[slots[i]]&&chunks[i])result[slots[i]]=cleanMioText(chunks[i]);
    }
  }

  // Fallback 2: split a prose answer by sentence groups.
  if(Object.keys(result).length<7){
    const sentences=(normalized.match(/[^。！？!?]+[。！？!?]/g)||[])
      .map(value=>cleanMioText(value))
      .filter(value=>value.length>=12);
    if(sentences.length>=7){
      const slots=['angel1','devil1','angel2','devil2','angel3','devil3','finale'];
      const groups=[
        sentences.slice(0,1),
        sentences.slice(1,2),
        sentences.slice(2,3),
        sentences.slice(3,4),
        sentences.slice(4,5),
        sentences.slice(5,6),
        sentences.slice(6)
      ];
      slots.forEach((slot,index)=>{
        if(!result[slot]&&groups[index].length)result[slot]=cleanMioText(groups[index].join(''));
      });
    }
  }

  const fallbacks={
    angel1:'タカ、今日はここまでの記録を見ながら、今いちばん気になることを一つだけ話しましょう。',
    devil1:'一つだけなん？ ほな、その一つを三倍に膨らませて盛大に始めよか。',
    angel2:'三倍にしたら話が散らかります（笑）。今日は最初に選んだ一つでいきますよ。',
    devil2:'散らかすんやない、話題を豪華に飾り付けてるだけや。',
    angel3:'飾り付けも一つで十分です（笑）。タカ、今日はその話を気持ちよく締めましょう。',
    devil3:'しゃあないな。ほな飾りは小さいリボン一個だけにしとくわ。',
    finale:'今日は一つの話を、二人で楽しく締めました。'
  };

  const slots=['angel1','devil1','angel2','devil2','angel3','devil3','finale'];
  const foundCount=slots.filter(slot=>result[slot]).length;
  if(foundCount===0)throw new Error('ミオ劇場の文章を読み取れませんでした。');

  for(const slot of slots){
    if(!result[slot])result[slot]=fallbacks[slot];
  }
  return result;
}
function buildGenerateBody(context){
  return {
    contents:[{role:'user',parts:[{text:mioTheaterPrompt(context)}]}],
    generationConfig:{maxOutputTokens:1200,temperature:0.92}
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
        body:buildGenerateBody(context),
        timeoutMs:22000
      });
      const text=extractCandidateText(data);
      if(!text)throw new Error('ミオから返事がありませんでした。');
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
    setMioAiStatus('デビルミオとエンジェルミオが脚本を相談中… 0秒');
    timer=setInterval(()=>{seconds++;setMioAiStatus(`デビルミオとエンジェルミオが脚本を相談中… ${seconds}秒`)},1000);
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
const APP_VERSION='2.6.7';
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
updateGeminiUsageUi();


document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')updateGeminiUsageUi();
});
window.addEventListener('focus',()=>updateGeminiUsageUi());
