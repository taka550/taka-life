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
  theaterTimers.push(setTimeout(()=>devil?.classList.add('is-visible'),220));
  theaterTimers.push(setTimeout(()=>{scenes[0]?.classList.add('is-visible');devil?.classList.add('is-talking');angel?.classList.add('is-listening')},720));
  theaterTimers.push(setTimeout(()=>{devil?.classList.remove('is-talking');devil?.classList.add('is-listening');angel?.classList.remove('is-listening');angel?.classList.add('is-visible')},1900));
  theaterTimers.push(setTimeout(()=>{scenes[1]?.classList.add('is-visible');angel?.classList.add('is-talking')},2400));
  theaterTimers.push(setTimeout(()=>{angel?.classList.remove('is-talking');angel?.classList.add('is-listening');devil?.classList.remove('is-listening');scenes[2]?.classList.add('is-visible');devil?.classList.add('is-talking')},3900));
  theaterTimers.push(setTimeout(()=>{devil?.classList.remove('is-talking');devil?.classList.add('is-listening');angel?.classList.remove('is-listening');scenes[3]?.classList.add('is-visible');angel?.classList.add('is-talking')},5400));
  theaterTimers.push(setTimeout(()=>{angel?.classList.remove('is-talking');angel?.classList.remove('is-listening');devil?.classList.remove('is-listening');finale?.classList.add('is-visible')},7000));
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
    $('angelText2').textContent='今日も健康第一で、無理なく始めましょう。';
    $('finaleText').textContent='記録した日から、物語が始まる。';
    playTheater();
    return;
  }
  const diff=prev?cur.weight-prev.weight:0;
  let lines;
  if(cur.weight<=state.settings.targetWeight){
    lines=['おっ、目標ラインに到達してるやん。祝勝会の準備する？','ここまでの積み重ねが数字に表れましたね。まずは本当にお疲れさま。','三日連続の宴会は却下されそうやな。でも今日は少しくらい喜ぼう。','達成後は無理に減らさず、心地よく続けられる形で定着させましょう。'];
  }else if(diff<=-.5){
    lines=[`前回から${Math.abs(diff).toFixed(1)}kgダウン。これはニヤけてもええ数字やな。`,'しっかり下がりましたね。ただ、一日の数字だけでなく記録を続けていることが一番の成果です。','ほなチョコパン二個でお祝い……は、計算が合わんか。','焦らず、水分と食事を整えて。今日も健康第一でいきましょう。'];
  }else if(diff>=.5){
    lines=[`前回から${diff.toFixed(1)}kgアップ。体重計を見なかったことにする？`,'水分や食事のタイミングでも動く範囲です。今日だけで判断しなくて大丈夫。','ちゃんと記録した時点で、逃げてへん。そこは合格や。','次の記録まで淡々と。無理な調整はせず、いつもの生活へ戻しましょう。'];
  }else{
    lines=['今日は大きな変化なし。派手さはないけど、こういう日が強いねん。','安定している日も立派な前進です。続けられていることを大切にしましょう。','珍しく真面目なこと言うけど、地味に続ける人が最後に勝つで。','今日も無理せず、一歩ずつ。二人でタカを応援しています。'];
  }
  $('devilText1').textContent=lines[0];$('angelText1').textContent=lines[1];$('devilText2').textContent=lines[2];$('angelText2').textContent=lines[3];
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

// ===== Ver.3.0.2 AI Mio First Generation =====
const GEMINI_KEY_STORAGE='takaLife.geminiApiKey.v1';
const GEMINI_MODEL_CACHE='takaLife.geminiModel.v2';
const MIO_MEMORY_STORAGE='takaLife.mioMemory.v1';
const MAX_MIO_MEMORY=8;

const GEMINI_MODEL_PREFERENCES=[
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3-flash',
  'gemini-flash-latest'
];

function getGeminiKey(){
  return localStorage.getItem(GEMINI_KEY_STORAGE)||'';
}
function saveGeminiKey(){
  const key=$('geminiApiKey')?.value.trim()||'';
  if(!key){
    setMioAiStatus('APIキーを入力してください。','error');
    return false;
  }
  localStorage.setItem(GEMINI_KEY_STORAGE,key);
  localStorage.removeItem(GEMINI_MODEL_CACHE);
  setMioAiStatus('このiPhoneにAPIキーを保存しました。','success');
  updateMioApiUi();
  return true;
}
function loadMioMemory(){
  try{
    const value=JSON.parse(localStorage.getItem(MIO_MEMORY_STORAGE)||'[]');
    return Array.isArray(value)?value.slice(-MAX_MIO_MEMORY):[];
  }catch(e){
    return [];
  }
}
function saveMioMemory(userMessage,result){
  const memory=loadMioMemory();
  memory.push({
    at:new Date().toISOString(),
    userMessage:String(userMessage||'').slice(0,240),
    finale:String(result?.finale||'').slice(0,160)
  });
  localStorage.setItem(MIO_MEMORY_STORAGE,JSON.stringify(memory.slice(-MAX_MIO_MEMORY)));
}
function updateMioApiUi(){
  const saved=Boolean(getGeminiKey());
  if($('geminiApiKey')&&!$('geminiApiKey').value&&saved)$('geminiApiKey').value=getGeminiKey();

  const preview=$('mioContextPreview');
  const cur=latest();
  const memoryCount=loadMioMemory().length;
  if(preview){
    preview.textContent=cur
      ? `最新記録：${cur.date} ${cur.period} ${Number(cur.weight).toFixed(1)}kg ／ 目標 ${state.settings.targetWeight}kg ／ 最近の会話メモ ${memoryCount}件`
      : `体重記録はまだありません。相談内容と最近の会話メモ ${memoryCount}件を使います。`;
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
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'center'}),50);
}
function closeMioChat(){
  const panel=$('mioAiPanel');
  if(panel)panel.hidden=true;
}
function calcTrend(records){
  if(records.length<2)return null;
  const first=Number(records[0].weight);
  const last=Number(records[records.length-1].weight);
  if(!Number.isFinite(first)||!Number.isFinite(last))return null;
  return Number((last-first).toFixed(1));
}
function localDayPart(date){
  const hour=date.getHours();
  if(hour<10)return '朝';
  if(hour<16)return '昼';
  return '夜';
}
function buildMioContext(userText){
  sortRecords();
  const cur=latest();
  const recent=state.records.slice(-7).map(r=>({
    date:r.date,
    period:r.period,
    time:r.time||'',
    weight:Number(r.weight),
    memo:r.memo||''
  }));
  const now=new Date();
  const latestWeight=cur?Number(cur.weight):null;
  const heightM=Number(state.settings.heightCm)/100;
  const bmi=latestWeight&&heightM?Number((latestWeight/(heightM*heightM)).toFixed(1)):null;

  return {
    user:{
      name:'タカ',
      heightCm:state.settings.heightCm,
      targetWeightKg:state.settings.targetWeight,
      healthPriority:'健康第一。無理な減量や断定的な医療助言は避ける。'
    },
    currentTime:{
      local:new Intl.DateTimeFormat('ja-JP',{
        dateStyle:'full',timeStyle:'short'
      }).format(now),
      weekday:new Intl.DateTimeFormat('ja-JP',{weekday:'long'}).format(now),
      dayPart:localDayPart(now)
    },
    weight:{
      latest:cur?{
        date:cur.date,period:cur.period,time:cur.time||'',
        kg:latestWeight,memo:cur.memo||'',bmi
      }:null,
      targetKg:state.settings.targetWeight,
      differenceToTargetKg:latestWeight!==null
        ? Number((latestWeight-Number(state.settings.targetWeight)).toFixed(1))
        : null,
      recentChangeKg:calcTrend(recent),
      recentRecords:recent
    },
    recentMioConversations:loadMioMemory().slice(-5),
    userMessage:userText
  };
}
function mioSystemPrompt(context){
  return `あなたはTaka-Lifeアプリ内の二人のキャラクターです。
ユーザー名はタカ。日本語で、親しみのある自然な「ミオ劇場」を作ってください。

【キャラクター】
デビルミオ：
- 茶目っ気があり、関西弁を軽く使う
- 誘惑役だが、意地悪ではなくタカの味方
- 元気で短く、会話にツッコミやユーモアを入れる

エンジェルミオ：
- 優しく落ち着いた標準語
- 健康第一で、責めず、現実的に支える
- タカの努力や疲れを自然に受け止める

【会話ルール】
- 二人は別人として掛け合う
- 最近の会話メモは、自然に関係する場合だけ参照する
- 体重の一回の増減だけで良し悪しを断定しない
- 医療診断、薬の変更、絶食、急激な減量、過度な運動を勧めない
- 説教調、過剰な褒め方、同じ表現の繰り返しを避ける
- 各セリフは35文字から100文字程度
- Markdown、JSON、説明文、前置きは出力しない
- 次の5つの見出しを、この順番・表記のまま必ず1回ずつ使う

DEVIL1:
ANGEL1:
DEVIL2:
ANGEL2:
FINALE:

【正しい出力例】
DEVIL1: 今日はよう頑張ったやん。ちょっと肩の力抜いてもええで。
ANGEL1: 疲れを感じられているのも大切なサインです。今夜はゆっくり休みましょう。
DEVIL2: せやけど、ごほうびを盛りすぎるんはナシやで。ほどほどが一番や。
ANGEL2: 今日できたことを一つ認めて、明日に疲れを持ち越さないようにしましょう。
FINALE: 今夜は焦らず、ゆっくり整える時間にしよう。

【タカの現在情報】
${JSON.stringify(context,null,2)}`;
}
async function getAvailableGeminiModel(forceRefresh=false){
  const key=getGeminiKey();
  if(!key)throw new Error('APIキーが未設定です。');

  if(!forceRefresh){
    const cached=localStorage.getItem(GEMINI_MODEL_CACHE);
    if(cached)return cached;
  }

  const response=await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
    {headers:{'x-goog-api-key':key}}
  );
  const data=await response.json().catch(()=>({}));

  if(!response.ok){
    const detail=data?.error?.message||`HTTP ${response.status}`;
    throw new Error(`利用可能モデルを確認できませんでした：${detail}`);
  }

  const available=(data.models||[])
    .filter(model=>
      Array.isArray(model.supportedGenerationMethods) &&
      model.supportedGenerationMethods.includes('generateContent')
    )
    .map(model=>String(model.name||'').replace(/^models\//,''))
    .filter(name=>
      /gemini/i.test(name) &&
      !/embedding|image|imagen|veo|tts|audio|live|robotics|research/i.test(name)
    );

  const selected=
    GEMINI_MODEL_PREFERENCES.find(name=>available.includes(name))
    || available.find(name=>/flash/i.test(name) && !/preview|exp/i.test(name))
    || available.find(name=>/flash/i.test(name))
    || available[0];

  if(!selected){
    throw new Error('このAPIキーで利用できる文章生成モデルが見つかりませんでした。');
  }

  localStorage.setItem(GEMINI_MODEL_CACHE,selected);
  return selected;
}
function extractCandidateText(data){
  const parts=data?.candidates?.[0]?.content?.parts;
  if(!Array.isArray(parts))return '';
  return parts
    .filter(part=>typeof part?.text==='string' && !part?.thought)
    .map(part=>part.text)
    .join('')
    .trim();
}
function cleanMioLine(value){
  return String(value||'')
    .replace(/^[\s*#>\-・]+/,'')
    .replace(/[\s*]+$/,'')
    .trim();
}
function normalizeMioLabel(label){
  const value=String(label||'')
    .toUpperCase()
    .replace(/[\s_\-【】\[\]（）()：:＊*]/g,'');
  const map={
    'DEVIL1':'devil1','デビル1':'devil1','デビル①':'devil1',
    'ANGEL1':'angel1','エンジェル1':'angel1','エンジェル①':'angel1',
    'DEVIL2':'devil2','デビル2':'devil2','デビル②':'devil2',
    'ANGEL2':'angel2','エンジェル2':'angel2','エンジェル②':'angel2',
    'FINALE':'finale','FINAL':'finale','締め':'finale','まとめ':'finale'
  };
  return map[value]||null;
}
function parseLabelledMioResult(text){
  const normalized=String(text||'')
    .replace(/```(?:text|json|markdown)?/gi,'')
    .replace(/```/g,'')
    .replace(/\r/g,'')
    .trim();

  const result={};
  const labelPattern=/^\s*[*#>\-・]*\s*(DEVIL\s*1|ANGEL\s*1|DEVIL\s*2|ANGEL\s*2|FINALE|FINAL|デビル\s*[12①②]|エンジェル\s*[12①②]|締め|まとめ)\s*[*】\]]*\s*[:：\-]\s*(.*)$/gim;
  const matches=[...normalized.matchAll(labelPattern)];

  for(let i=0;i<matches.length;i++){
    const key=normalizeMioLabel(matches[i][1]);
    if(!key)continue;
    const start=matches[i].index+matches[i][0].length;
    const end=i+1<matches.length?matches[i+1].index:normalized.length;
    const inline=matches[i][2]||'';
    const continuation=normalized.slice(start,end).trim();
    const combined=cleanMioLine([inline,continuation].filter(Boolean).join(' '));
    if(combined)result[key]=combined;
  }

  const required=['devil1','angel1','devil2','angel2','finale'];
  if(required.every(key=>result[key]))return result;

  const lines=normalized.split('\n').map(line=>line.trim()).filter(Boolean);
  for(let i=0;i<lines.length;i++){
    const raw=lines[i].replace(/^[*#>\-・\s]+|[*\s]+$/g,'');
    const key=normalizeMioLabel(raw.replace(/[:：]$/,''));
    if(!key||result[key])continue;
    const values=[];
    for(let j=i+1;j<lines.length;j++){
      const nextRaw=lines[j].replace(/^[*#>\-・\s]+|[*\s]+$/g,'');
      if(normalizeMioLabel(nextRaw.replace(/[:：]$/,'')))break;
      values.push(lines[j]);
    }
    const value=cleanMioLine(values.join(' '));
    if(value)result[key]=value;
  }
  if(required.every(key=>result[key]))return result;

  const contentLines=lines
    .map(line=>cleanMioLine(line))
    .filter(line=>line.length>=8)
    .filter(line=>!normalizeMioLabel(line.replace(/[:：]$/,'')));

  if(contentLines.length>=5){
    return {
      devil1:contentLines[0],
      angel1:contentLines[1],
      devil2:contentLines[2],
      angel2:contentLines[3],
      finale:contentLines.slice(4).join(' ')
    };
  }

  const found=required.filter(key=>result[key]).length;
  const preview=normalized.replace(/\s+/g,' ').slice(0,130);
  throw new Error(`Geminiとの接続は成功しましたが、ミオ劇場の5つのセリフが揃いませんでした（${found}/5件）。もう一度「ミオ劇場をつくる」を押してください。返答冒頭：${preview||'空の返答'}`);
}
function buildGenerateBody(context){
  return {
    contents:[{
      role:'user',
      parts:[{text:mioSystemPrompt(context)}]
    }],
    generationConfig:{
      maxOutputTokens:900
    }
  };
}
async function requestGemini(model,key,context){
  const response=await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-goog-api-key':key
      },
      body:JSON.stringify(buildGenerateBody(context))
    }
  );
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const detail=data?.error?.message||`HTTP ${response.status}`;
    const err=new Error(detail);
    err.status=response.status;
    throw err;
  }
  return data;
}

async function testGeminiConnectionOnly(){
  const key=getGeminiKey();
  if(!key)throw new Error('APIキーが未設定です。');

  let model=await getAvailableGeminiModel(true);
  const body={
    contents:[{
      role:'user',
      parts:[{
        text:'接続確認です。日本語で「接続できました」とだけ返してください。'
      }]
    }],
    generationConfig:{
      maxOutputTokens:40
    }
  };

  for(let attempt=0;attempt<2;attempt++){
    const response=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-goog-api-key':key
        },
        body:JSON.stringify(body)
      }
    );

    const data=await response.json().catch(()=>({}));

    if(!response.ok){
      const detail=data?.error?.message||`HTTP ${response.status}`;
      const unavailable=response.status===404 ||
        /no longer available|not found|not supported for generatecontent/i.test(detail);

      if(unavailable && attempt===0){
        localStorage.removeItem(GEMINI_MODEL_CACHE);
        model=await getAvailableGeminiModel(true);
        continue;
      }
      throw new Error(detail);
    }

    const text=extractCandidateText(data);
    if(!text)throw new Error('Geminiから返事がありませんでした。');
    return {
      model,
      message:text.replace(/\s+/g,' ').trim().slice(0,120)
    };
  }

  throw new Error('接続確認に失敗しました。');
}

async function callGeminiForMio(userText,options={}){
  const key=getGeminiKey();
  if(!key)throw new Error('APIキーが未設定です。');

  const context=buildMioContext(userText);
  let model=await getAvailableGeminiModel(Boolean(options.forceModelRefresh));

  for(let attempt=0;attempt<3;attempt++){
    try{
      const retryContext=attempt===0?context:{
        ...context,
        formatReminder:'前の返答は読み取れませんでした。DEVIL1、ANGEL1、DEVIL2、ANGEL2、FINALEの5行だけを必ず返してください。'
      };
      const data=await requestGemini(model,key,retryContext);
      const text=extractCandidateText(data);
      if(!text)throw new Error('Geminiから文章の返事がありませんでした。');
      return parseLabelledMioResult(text);
    }catch(err){
      const modelUnavailable=err.status===404 ||
        /no longer available|not found|not supported for generatecontent/i.test(err.message||'');

      if(modelUnavailable && attempt===0){
        localStorage.removeItem(GEMINI_MODEL_CACHE);
        model=await getAvailableGeminiModel(true);
        continue;
      }

      if(/5つのセリフを読み取れません/.test(err.message||'') && attempt<2){
        continue;
      }
      throw err;
    }
  }
  throw new Error('Geminiのセリフを読み取れませんでした。もう一度お試しください。');
}
function applyAiMioTheater(result){
  clearTheaterTimers();
  $('devilText1').textContent=result.devil1;
  $('angelText1').textContent=result.angel1;
  $('devilText2').textContent=result.devil2;
  $('angelText2').textContent=result.angel2;
  $('finaleText').textContent=result.finale;
  closeMioChat();
  $('mioTheater')?.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(playTheater,450);
}
async function runGeminiTest(){
  if(!getGeminiKey()&&!saveGeminiKey())return;
  const btn=$('testGeminiBtn');

  try{
    if(btn){
      btn.disabled=true;
      btn.textContent='接続中…';
    }

    setMioAiStatus('Geminiへ接続できるか確認しています…');

    const result=await testGeminiConnectionOnly();
    localStorage.setItem(GEMINI_MODEL_CACHE,result.model);

    setMioAiStatus(
      `接続成功！ ${result.model} から「${result.message}」と返ってきました。`,
      'success'
    );
  }catch(err){
    setMioAiStatus(`接続できませんでした：${err.message}`,'error');
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent='接続テスト';
    }
  }
}
async function askMio(){
  const question=$('mioQuestion')?.value.trim()||
    '今日の記録を見て、二人からひとことお願いします。';

  if(!getGeminiKey()){
    setMioAiStatus('先にAPIキーを入力して保存してください。','error');
    $('geminiApiKey')?.focus();
    return;
  }

  const btn=$('askMioBtn');
  try{
    if(btn){btn.disabled=true;btn.textContent='ミオたちが考え中…'}
    setMioAiStatus('体重記録と最近の会話を見ながら、5つのセリフを作っています…');
    const result=await callGeminiForMio(question);
    saveMioMemory(question,result);
    applyAiMioTheater(result);
    setMioAiStatus('');
    updateMioApiUi();
  }catch(err){
    setMioAiStatus(`作成できませんでした：${err.message}`,'error');
  }finally{
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

document.querySelectorAll('[data-scroll]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=a.dataset.scroll;if(t==='top'){window.scrollTo({top:0,behavior:'smooth'});return}const targets={record:'#recordSection',mio:'#mioTheater',history:'#historySection'};document.querySelector(targets[t]).scrollIntoView({behavior:'smooth',block:'start'});if(t==='record')setTimeout(()=>$('weightInput').focus(),450)}));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').addEventListener('click',async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden')}});
const APP_VERSION='3.0.2';
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
