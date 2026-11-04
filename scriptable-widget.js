// «Утро Жени» — Scriptable, публичный виджет v2
// Редакционная газета публикуется в GitHub. В публичном JSON нет личных данных из Notion.
// Полная частная газета отправляется в подключённый Gmail.
const FEED_URL='https://raw.githubusercontent.com/sssneer124-maker/utro-zheni-feed./main/feed.json';
const ZONE='Europe/Moscow',LAT=50.9841,LON=39.5154;
const WINE=new Color('#522037'),GOLD=new Color('#ecc28a'),PAPER=new Color('#fff9f0'),INK=new Color('#492837'),ROSE=new Color('#ae7684'),MUTED=new Color('#907581');
const fm=FileManager.local(),CACHE=fm.joinPath(fm.documentsDirectory(),'utro_zheni_widget_feed_v2.json');
function txt(v,n){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n||180);}
function font(name,size){try{return Font.custom(name,size)}catch(e){return Font.systemFont(size)}}
function add(where,s,size,color,bold,lines){
 const t=where.addText(txt(s,240));t.font=bold?Font.boldSystemFont(size):Font.systemFont(size);t.textColor=color;t.lineLimit=lines||1;
 t.minimumScaleFactor=.78;return t;
}
function dateParts(s){const p=s.split('-');return{d:parseInt(p[2],10),m:parseInt(p[1],10),y:parseInt(p[0],10)}}
function normalize(a){return a&&a.schema_version===1&&/^\d{4}-\d{2}-\d{2}$/.test(a.date)?a:null}
async function feed(){
 try{
  const req=new Request(FEED_URL+'?v='+Math.floor(Date.now()/900000));req.timeoutInterval=13;
  const a=normalize(await req.loadJSON());if(!a)throw Error('format');
  fm.writeString(CACHE,JSON.stringify(a));return{a,cache:false};
 }catch(e){try{const a=normalize(JSON.parse(fm.readString(CACHE)));return{a,cache:true}}catch(e2){return{a:null,cache:true}}}
}
async function weather(){
 try{
 const req=new Request('https://api.open-meteo.com/v1/forecast?latitude='+LAT+'&longitude='+LON+'&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Europe%2FMoscow&forecast_days=1');req.timeoutInterval=10;
 const d=await req.loadJSON();const n=Math.round(d.current.temperature_2m),c=d.current.weather_code;
 const desc=c>=95?'Гроза':c>=80?'Ливни':c>=61?'Дождь':c>=51?'Морось':c>=45?'Туман':c>=3?'Облачно':c>=1?'Переменная облачность':'Ясно';
 return{degree:(n>0?'+':'')+n+'°',desc,range:Math.round(d.daily.temperature_2m_min[0])+'…'+Math.round(d.daily.temperature_2m_max[0])+'°',
  rise:String(d.daily.sunrise[0]||'').slice(11,16),set:String(d.daily.sunset[0]||'').slice(11,16)};
 }catch(e){return null}
}
const [fstate,sky]=await Promise.all([feed(),weather()]);
const f=fstate.a;
const dateStr=f?f.date:new Intl.DateTimeFormat('sv-SE',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const d=dateParts(dateStr);
const date=new Date(dateStr+'T12:00:00+03:00');
const month=new Intl.DateTimeFormat('ru-RU',{timeZone:ZONE,month:'long'}).format(date);
const weekday=new Intl.DateTimeFormat('ru-RU',{timeZone:ZONE,weekday:'long'}).format(date);
const w=new ListWidget();w.backgroundColor=PAPER;w.setPadding(11,14,11,14);
const head=w.addStack();head.layoutVertically();head.backgroundColor=WINE;head.cornerRadius=15;head.setPadding(6,12,8,12);
add(head,'УТРО ЖЕНИ ✧ DAILY PAPER',9,GOLD,true);
const line=head.addStack();line.layoutHorizontally();line.centerAlignContent();
const num=line.addText(String(d.d));num.font=font('SnellRoundhand-Bold',58);num.textColor=GOLD;num.lineLimit=1;
line.addSpacer(12);
const right=line.addStack();right.layoutVertically();
let t=add(right,month+' '+d.y,16,new Color('#f5d5c5'),true);t.font=font('Georgia-Bold',16);
t=add(right,'Доброе утро ♡',23,GOLD,false);t.font=font('SnellRoundhand',23);
add(right,weekday+' · Лиски',9,new Color('#e3b5b7'),false);
w.addSpacer(9);
const wh=w.addStack();wh.layoutHorizontally();wh.centerAlignContent();
add(wh,sky?sky.degree:'—°',27,INK,true);wh.addSpacer(9);
const wv=wh.addStack();wv.layoutVertically();add(wv,sky?sky.desc:'Погода обновляется',11,INK,true);add(wv,sky?sky.range:'Лиски',9,MUTED);
w.addSpacer(8);
const hr=w.addStack();hr.backgroundColor=new Color('#d7b8b1');hr.size=new Size(0,1);
w.addSpacer(8);
add(w,'✦ ЛЕВ · ГОРОСКОП',9,ROSE,true);
add(w,f&&f.horoscope?txt(f.horoscope.text,98):'Новый прогноз будет в следующем выпуске.',10,INK,false,2);
w.addSpacer(7);
const cards=w.addStack();cards.layoutHorizontally();cards.spacing=14;
const l=cards.addStack();l.layoutVertically();
add(l,'✧ КАРТА ДНЯ',9,ROSE,true);
add(l,f&&f.tarot?f.tarot.name:'Таро',12,INK,true,1);
cards.addSpacer();
const r=cards.addStack();r.layoutVertically();
add(r,'Ⅶ ЧИСЛО И АРКАН',9,ROSE,true);
const number=f&&f.number_day?f.number_day.value:'—';const arc=f&&f.number_day?f.number_day.tarot_name:'';
add(r,String(number)+' · '+arc,12,INK,true,1);
w.addSpacer(8);
add(w,'♡ ENGLISH OF THE DAY',9,ROSE,true);
const en=f&&f.english?f.english:{};
add(w,en.phrase||"I'll figure it out.",13,INK,true,1);
add(w,en.translation||'Я разберусь.',10,MUTED,false,1);
w.addSpacer(8);
add(w,'☕ НОВОСТИ К КОФЕ',9,ROSE,true);
const news=f&&Array.isArray(f.news_digest)&&f.news_digest.length?f.news_digest[0]:f&&f.news?f.news:null;
add(w,news?txt(news.title||news,110):'Свежие новости ещё не опубликованы',10,INK,false,2);
w.addSpacer();
const footer=w.addStack();footer.layoutHorizontally();
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
add(footer,dateStr===today?'Сегодня · 05:00':'Выпуск '+dateStr,9,MUTED);
footer.addSpacer();
add(footer,fstate.cache?'Копия':'Онлайн ✧',9,MUTED);
w.refreshAfterDate=new Date(Date.now()+25*60*1000);
Script.setWidget(w);
if(!config.runsInWidget)await w.presentLarge();
Script.complete();