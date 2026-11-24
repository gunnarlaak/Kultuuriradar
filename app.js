
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const CITIES=[['Tallinn',59.437,24.7536],['Tõrva',58.0017,25.9229],['Tartu',58.3776,26.729],['Viljandi',58.3639,25.59],['Pärnu',58.3859,24.4971],['Kuressaare',58.2528,22.4865],['Rakvere',59.3471,26.3558],['Võru',57.8442,27.019],['Valga',57.7778,26.0473],['Haapsalu',58.9431,23.5414],['Narva',59.3791,28.1903],['Narva-Jõesuu',59.4589,28.0408],['Jõhvi',59.3592,27.4214],['Kärdla',58.998,22.747],['Hiiumaa',58.998,22.747],['Vormsi',58.999,23.232],['Hullo',59.001,23.239]];
const cats={music:['Muusika','♫'],theatre:['Teater','◈'],art:['Näitus','✳'],cinema:['Kino','▣'],festival:['Festival','✺'],other:['Kultuur','✦']};
const saved=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch{return d}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=x=>String(x||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const url=x=>{try{const u=new URL(x);return u.protocol==='https:'?u.href:''}catch{return ''}};
const category=(list,title)=>{const s=[...(Array.isArray(list)?list:[list]),title].join(' ').toLowerCase();if(/festival/.test(s))return 'festival';if(/muusik|kontsert|music|concert|jazz|ooper|orkester|laul/.test(s))return 'music';if(/teater|etendus|theatre|lavastus|ballett/.test(s))return 'theatre';if(/näitus|kunst|muuseum|art|galerii|foto/.test(s))return 'art';if(/kino|film|cinema/.test(s))return 'cinema';return 'other'};
const distance=(a,b,c,d)=>{const r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,t=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 6371*2*Math.atan2(Math.sqrt(t),Math.sqrt(1-t))};
const state={place:saved('kr-location',null),radius:([10,25,50,100,0].includes(saved('kr-radius',50)) ? saved('kr-radius',50) : 50),favorites:saved('kr-favorites',{}),events:[],cat:'all',date:'7',sort:'date',query:'',view:'list',favoritesOnly:false,failed:false,loading:false,dataReady:false,map:null,layer:null,install:null};
const parse=x=>{if(typeof x==='number')return new Date(x<1e12?x*1000:x);return new Date(x)};
function saare(data){let all=[];for(const item of Array.isArray(data?.list)?data.list:[]){const cat=category(item.categories,item.title);if(/sport|võistlus/i.test(String(item.categories))&&cat==='other')continue;for(const [i,p] of (item.events||[]).entries()){if(!p)continue;const start=parse(p.start||p.start_string);if(!Number.isFinite(start.getTime()))continue;let lat=Number(p.coordinates?.lat),lng=Number(p.coordinates?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat===0||lng===0)continue;const end=parse(p.end||p.end_string||p.start);let approximate=false;if(Math.abs(lat-58.484972)<.00001&&Math.abs(lng-22.613641)<.00001&&(item.districts||[]).includes('Kuressaare')){lat=58.2528;lng=22.4865;approximate=true}all.push({id:'saare-'+item.id+'-'+i,title:String(item.title||'Kultuurisündmus'),description:clean(item.content),start:start.toISOString(),end:Number.isFinite(end.getTime())?end.toISOString():start.toISOString(),venue:String(p.place_string||item.districts?.[0]||'Saaremaa'),lat,lng,category:cat,approximate,url:url(p.link||item.additional_info_link?.uri),image:url(item.images?.[0]),source:'Saare sündmused'})}}return all}
const dateLabel=(value,withTime)=>new Date(value).toLocaleString('et-EE',{
  day:'numeric',month:'long',...(withTime?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'Europe/Tallinn'
});
const label=e=>e.dateOnly
  ? dateLabel(e.start,false)+(e.startDay===e.endDay?'':' – '+dateLabel(e.end,false))
  : dateLabel(e.start,true);
function dates(){
  const now=new Date();
  const today=tallinnDate.format(now);
  const at=delta=>tallinnMidnight(calendarDay(today,delta));
  if(state.date==='today')return[at(0),at(1)];
  if(state.date==='tomorrow')return[at(1),at(2)];
  if(state.date==='weekend'){
    const weekday=new Date(today+'T00:00:00Z').getUTCDay();
    const saturday=(6-weekday+7)%7;
    return weekday===0?[at(0),at(1)]:[at(saturday),at(saturday+2)];
  }
  return[now,state.date==='all'?Infinity:at(Number(state.date)||7)];
}
function filtered(){const[from,to]=dates();const q=state.query.toLocaleLowerCase('et-EE');return (state.favoritesOnly?Object.values(state.favorites):state.events).filter(e=>{const s=new Date(e.start),end=new Date(e.end||e.start);if(!Number.isFinite(s.getTime())||end<new Date()||s>=to||end<from)return false;if(state.cat!=='all'&&e.category!==state.cat)return false;if(q&&!String(e.title+' '+e.venue+' '+(e.description||'')).toLocaleLowerCase('et-EE').includes(q))return false;if(!state.favoritesOnly&&state.place&&state.radius){if(!Number.isFinite(e.lat)||!Number.isFinite(e.lng))return false;if(distance(state.place.lat,state.place.lng,e.lat,e.lng)>state.radius)return false}return true}).sort((a,b)=>state.sort==='distance'&&state.place?eventDistance(a)-eventDistance(b)||Date.parse(a.start)-Date.parse(b.start):Date.parse(a.start)-Date.parse(b.start))}
function card(e){const c=cats[e.category]||cats.other,d=Number.isFinite(eventDistance(e))?eventDistance(e):null;return '<article class="event-card"><div class="event-image">'+(url(e.image)?'<img src="'+esc(url(e.image))+'" loading="lazy" alt="">':'')+'<div class="category-art">'+c[1]+'</div><span class="event-badge">'+c[0]+'</span><button class="favorite '+(state.favorites[e.id]?'active':'')+'" data-fav="'+esc(e.id)+'" aria-label="Salvesta üritus">'+(state.favorites[e.id]?'♥':'♡')+'</button></div><div class="event-body"><div class="event-date">'+esc(label(e))+'</div><h3>'+esc(e.title)+'</h3><p class="event-description">'+esc(e.description||'Allikas: '+e.source)+'</p><div class="event-bottom"><div class="event-location">⌖ '+esc(e.venue)+'</div><div class="event-distance">'+(d===null?'':(e.approximate?'~':'')+(d<10?d.toFixed(1):Math.round(d))+' km')+'</div></div><div class="event-actions">'+(url(e.url)?'<a class="event-link" href="'+esc(url(e.url))+'" target="_blank" rel="noopener noreferrer">Vaata sündmust ↗</a>':'<span class="event-link">Allika link puudub</span>')+'<button class="calendar-btn" data-calendar="'+esc(e.id)+'" aria-label="Lisa kalendrisse">▦</button></div></div></article>'}
function render(){renderFeaturedCalendar();const es=filtered();$('eventCount').textContent=es.length;$('eventList').hidden=state.view==='map';$('mapPanel').hidden=state.view!=='map';$('eventList').innerHTML=state.view==='list'?es.map(card).join(''):'';$('resultSubtitle').textContent=state.favoritesOnly?'Salvestatud üritused':state.radius===0?'Kogu Eesti':state.place?state.place.name+' · '+state.radius+' km':'Vali asukoht või luba GPS';$('emptyState').hidden=state.loading||es.length>0;$('emptyDescription').textContent=!state.place&&state.radius!==0&&!state.favoritesOnly?'Vali asukoht.':state.failed?'Andmete laadimine ei õnnestunud. Kontrolli ühendust.':'Ühendatud allikatest ei leitud valitud piirkonnas sobivaid sündmusi.';const n=Object.keys(state.favorites).length;$('savedCount').textContent=n;$('savedCount').hidden=!n;$('savedToggle').setAttribute('aria-pressed',String(state.favoritesOnly));for(const [v,id] of [['list','listViewBtn'],['map','mapViewBtn']]){$(id).classList.toggle('active',state.view===v);$(id).setAttribute('aria-pressed',String(state.view===v))}if(state.view==='map')showMap(es)}
function showMap(es){if(!window.L){$('eventsMap').textContent='Kaardi laadimine ebaõnnestus. Ava nimekiri.';return}if(!state.map){state.map=L.map('eventsMap');L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(state.map);state.layer=L.layerGroup().addTo(state.map)}state.layer.clearLayers();const pts=[];if(state.place){L.circleMarker([state.place.lat,state.place.lng],{radius:9,color:'#dd83cd'}).addTo(state.layer).bindPopup('Sinu asukoht');pts.push([state.place.lat,state.place.lng])}for(const e of es){if(!Number.isFinite(e.lat)||!Number.isFinite(e.lng))continue;const a=L.marker([e.lat,e.lng]).addTo(state.layer);a.bindPopup('<strong>'+esc(e.title)+'</strong><p>'+esc(label(e))+'</p>'+(url(e.url)?'<a target="_blank" rel="noopener" href="'+esc(url(e.url))+'">Vaata üritust</a>':''));pts.push([e.lat,e.lng])}setTimeout(()=>{state.map.invalidateSize();if(pts.length>1)state.map.fitBounds(pts,{padding:[20,20],maxZoom:12});else if(pts.length)state.map.setView(pts[0],10);else state.map.setView([58.6,25],7)},60)}
function eventDistance(event) {
  if (!state.place || !Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return Infinity;
  return distance(state.place.lat, state.place.lng, event.lat, event.lng);
}

const tallinnDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Tallinn', year:'numeric', month:'2-digit', day:'2-digit'});
function calendarDay(day, delta) {
  return new Date(Date.parse(day+'T00:00:00Z') + delta*86400000).toISOString().slice(0,10);
}
function tallinnMidnight(day) {
  const utc = Date.parse(day+'T00:00:00Z');
  for (const hours of [2,3]) {
    const candidate = new Date(utc-hours*3600000);
    if (new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Tallinn',hour:'2-digit',hourCycle:'h23'}).format(candidate)==='00' && tallinnDate.format(candidate)===day) return +candidate;
  }
  return NaN;
}
function collectorEvent(item) {
  const link=url(item?.source_url);
  if (!link || typeof item.id!=='string' || typeof item.title!=='string' || !item.title.trim() || item.status!=='active') return null;
  const dayOnly=item.date_precision==='date';
  if (!dayOnly && item.date_precision!=='datetime') return null;
  if (![item.start_date,item.end_date].every(day=>typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && calendarDay(day,0)===day)) return null;
  const instant=value=>typeof value==='string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  const start=dayOnly?tallinnMidnight(item.start_date):instant(item.starts_at);
  const end=dayOnly?tallinnMidnight(calendarDay(item.end_date,1))-1:instant(item.ends_at??item.starts_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end<start ||
      tallinnDate.format(new Date(start))!==item.start_date || tallinnDate.format(new Date(end))!==item.end_date) return null;
  const coords=Number.isFinite(item.latitude) && Math.abs(item.latitude)<=90 &&
      Number.isFinite(item.longitude) && Math.abs(item.longitude)<=180;
  const placeName=value=>String(value||'').trim().toLocaleLowerCase('et-EE').replace(/ (linn|vald)$/,'');
  const approximate=coords?null:CITIES.find(city=>[item.venue,item.municipality].some(value=>placeName(value)===placeName(city[0])));
  return {id:'collector-'+item.id,title:item.title,start:new Date(start).toISOString(),
    end:new Date(end).toISOString(),dateOnly:dayOnly,startDay:item.start_date,endDay:item.end_date,
    venue:item.venue||item.municipality||item.county||'Asukoht täpsustamisel',
    municipality:item.municipality,county:item.county,lat:coords?item.latitude:approximate?.[1]??null,
    lng:coords?item.longitude:approximate?.[2]??null,approximate:Boolean(approximate),
    category:category(item.category,item.title),url:link,source:new URL(link).hostname,checkedAt:item.checked_at};
}
function uniqueEvents(events) {
  const ids=new Set(), keys=new Set(), facts=new Set();
  const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('et-EE').replace(/\s+/g,' ');
  return events.filter(event=>{
    const link=url(event.url);
    const canonical=link?new URL(link):null;
    if(canonical){canonical.hash='';canonical.search='';}
    const key=canonical?canonical.href.replace(/\/$/,'')+'|'+event.start:null;
    const fact=[normalize(event.title),event.start,normalize(event.venue)].join('|');
    if(ids.has(event.id)||keys.has(key)||facts.has(fact))return false;
    ids.add(event.id);if(key)keys.add(key);facts.add(fact);return true;
  });
}
async function getJSON(target) {
  const response=await fetch(target,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.json();
}
async function collectorSnapshot() {
  const base=window.KULTUURIRADAR_CONFIG.collectorBase;
  const from=tallinnDate.format(new Date());
  const query=new URLSearchParams({from,to:calendarDay(from,90),limit:'100'});
  const events=[];
  for(let offset=0;offset!==null;){
    query.set('offset',String(offset));
    const page=await getJSON(base+'/v1/events?'+query);
    if(!Array.isArray(page.events) || (page.next_offset!==null &&
       (!Number.isInteger(page.next_offset)||page.next_offset<=offset||page.next_offset>10000)))throw Error('Vigane API vastus');
    for(const row of page.events){const event=collectorEvent(row);if(event)events.push(event);}
    offset=page.next_offset;
  }
  const checked=events.map(e=>Date.parse(e.checkedAt)).filter(Number.isFinite);
  return {events:uniqueEvents(events),updated:checked.length?Math.max(...checked):null};
}
async function refresh(){
  if(state.loading)return;
  if(!state.place&&state.radius!==0){render();return}
  state.loading=true;state.dataReady=false;state.failed=false;
  renderFeaturedCalendar();$('loadingState').hidden=false;$('emptyState').hidden=true;
  $('findBtn').disabled=true;$('notice').hidden=true;
  try{
    let snapshot;
    let source='Kultuuriradar Collector';
    try{
      snapshot=await collectorSnapshot();
      store('kr-collector-snapshot-v1',snapshot);
    }catch{
      state.failed=true;
      snapshot=saved('kr-collector-snapshot-v1',null);
      $('notice').textContent='Collector pole praegu kättesaadav. Kuvame viimati laaditud andmeid.';
      if(!Array.isArray(snapshot?.events)){
        const legacy=await getJSON('./data/events.json');
        snapshot={events:uniqueEvents(saare(legacy)),updated:null};
        source='Saare sündmused';
        $('notice').textContent='Collector pole praegu kättesaadav. Kuvame Saaremaa varuandmeid.';
      }
      $('notice').hidden=false;
    }
    state.events=snapshot.events;
    $('sourceInfo').textContent='Andmeallikas: '+source;
    $('updatedInfo').textContent=snapshot.updated?
      'Andmed kontrollitud '+new Date(snapshot.updated).toLocaleString('et-EE',{timeZone:'Europe/Tallinn'}):
      'Andmete uuendamisaeg puudub';
  }catch{
    state.failed=true;
    $('notice').textContent='Sündmuste andmeid ei õnnestunud laadida.';
    $('notice').hidden=false;
  }finally{
    state.loading=false;state.dataReady=true;$('loadingState').hidden=true;$('findBtn').disabled=false;render();
  }
}
function setPlace(p){state.place=p;store('kr-location',p);$('locationName').textContent=p.name;$('locationDialog').close();state.favoritesOnly=false;state.dataReady=false;renderCalendars();renderFeaturedCalendar();refresh()}
function locate(){if(!navigator.geolocation){$('locationDialog').showModal();return}$('locationName').textContent='Tuvastan...';navigator.geolocation.getCurrentPosition(p=>{const lat=p.coords.latitude,lng=p.coords.longitude;const near=CITIES.map(c=>({name:c[0],d:distance(lat,lng,c[1],c[2])})).sort((a,b)=>a.d-b.d)[0];setPlace({name:near.d<15?near.name+' lähedal':'Minu asukoht',lat,lng});$('locationHint').textContent='GPS-asukoht tuvastatud'},()=>{$('locationName').textContent=state.place?.name||'Vali asukoht';$('locationHint').textContent='GPS ei ole saadaval. Vali linn käsitsi.';if(!$('locationDialog').open)$('locationDialog').showModal()},{timeout:11000,maximumAge:300000})}
function favorite(id){const e=[...state.events,...Object.values(state.favorites)].find(e=>e.id===id);if(!e)return;if(state.favorites[id])delete state.favorites[id];else state.favorites[id]=e;store('kr-favorites',state.favorites);render()}
function calendar(id){const e=[...state.events,...Object.values(state.favorites)].find(e=>e.id===id);if(!e)return;const dt=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const x=s=>String(s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;');const s=new Date(e.start),en=new Date(e.end||e.start);const end=en>s?en:new Date(+s+7200000);const txt=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Kultuuriradar//ET','BEGIN:VEVENT','UID:'+encodeURIComponent(e.id)+'@kultuuriradar.local','DTSTAMP:'+dt(new Date()),'DTSTART:'+dt(s),'DTEND:'+dt(end),'SUMMARY:'+x(e.title),'LOCATION:'+x(e.venue),'DESCRIPTION:'+x(e.description),'END:VEVENT','END:VCALENDAR'].join('\r\n');const a=document.createElement('a');const object=URL.createObjectURL(new Blob([txt],{type:'text/calendar'}));a.href=object;a.download='kultuuriradar.ics';a.click();setTimeout(()=>URL.revokeObjectURL(object),1000)}
const REGION_CALENDARS=[
{name:'Tõrva',region:'Tõrva vald',url:'https://visittorva.ee/sundmused-torva/',lat:58.0017,lng:25.9229},
{name:'Tartu',region:'Tartu ja Lõuna-Eesti',url:'https://kultuuriaken.tartu.ee/et/syndmused',lat:58.3776,lng:26.729},
{name:'Tallinn',region:'Tallinn ja Harjumaa',url:'https://www.visittallinn.ee/est/k%C3%BClastaja/mida-teha/s%C3%BCndmused/s%C3%BCndmused',lat:59.437,lng:24.7536},
{name:'Pärnu',region:'Pärnu ja Pärnumaa',url:'https://visitparnu.com/uritused/',lat:58.3859,lng:24.4971},
{name:'Narva',region:'Narva ja Ida-Virumaa',url:'https://visitnarva.ee/et/uritused/',lat:59.3791,lng:28.1903},
{name:'Haapsalu',region:'Haapsalu ja Läänemaa',url:'https://midateha.visithaapsalu.com/',lat:58.9431,lng:23.5414},
{name:'Hiiumaa',region:'Hiiumaa',url:'https://hiiumaa.ee/events/list/',lat:58.998,lng:22.747},
{name:'Vormsi',region:'Vormsi saar',url:'https://vormsi.ee/sundmused/',lat:58.999,lng:23.232},
{name:'Rakvere',region:'Rakvere ja Lääne-Virumaa',url:'https://visitrakvere.com/sundmused/',lat:59.3471,lng:26.3558},
{name:'Ukuaru',region:'Arvo Pärdile pühendatud muusikamaja · Rakvere',url:'https://ukuaru.ee/et/sundmused',lat:59.3471,lng:26.3558},
{name:'Eesti Kontsert',region:'Kontserdid üle Eesti',url:'https://concert.ee/',nationwide:true}
];
// Regional calendars represent distinct local areas. An event from another
// island/county must not hide the selected area's official calendar just
// because the configured search radius crosses a regional boundary.
const REGIONAL_ANCHORS=[
  ...REGION_CALENDARS.filter(x=>!x.nationwide&&x.name!=='Ukuaru').map(x=>({area:x.name,lat:x.lat,lng:x.lng})),
  {area:'Saaremaa',lat:58.2528,lng:22.4865},
  {area:'Saaremaa',lat:58.61,lng:23.23}, // Muhu
  {area:'Hiiumaa',lat:58.80,lng:22.69}, // southern Hiiumaa
];
function regionAt(lat,lng){
  let nearest=null,closest=Infinity;
  for(const x of REGIONAL_ANCHORS){
    const km=distance(lat,lng,x.lat,x.lng);
    if(km<closest){nearest=x.area;closest=km}
  }
  return nearest;
}
function eventRegion(e){
  const explicit=String(e.region||e.county||'').toLocaleLowerCase('et-EE');
  if(explicit.includes('saare'))return 'Saaremaa';
  if(explicit.includes('hii'))return 'Hiiumaa';
  const source=String(e.source||'').toLocaleLowerCase('et-EE');
  if(source.includes('saare'))return 'Saaremaa';
  return regionAt(Number(e.lat),Number(e.lng));
}
function hasLocalApiEvents(){
  if(!state.place)return false;
  const area=regionAt(state.place.lat,state.place.lng);
  const now=Date.now();
  return state.events.some(e=>{
    const lat=e.lat,lng=e.lng;
    const start=Date.parse(e.start),end=Date.parse(e.end||e.start);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(start))return false;
    if((Number.isFinite(end)?end:start)<now)return false;
    return eventRegion(e)===area
      &&(!state.radius || distance(state.place.lat,state.place.lng,lat,lng)<=state.radius);
  });
}
function renderFeaturedCalendar(){
  const host=$('featuredLocalResult');if(!host)return;
  const section=$('featuredLocal');
  section.hidden=false;
  if(!state.place){
    host.innerHTML='<div class="featured-local-card featured-local-empty"><div><div class="featured-local-kicker">ASUKOHT POLE VALITUD</div><p>Luba asukoht või vali linn, et näha lähimat ametlikku kultuurikalendrit.</p></div><button class="featured-local-button" id="featuredChooseLocation" type="button">Vali asukoht ↗</button></div>';
    $('featuredChooseLocation').onclick=()=>$('locationDialog').showModal();
    return;
  }
  // The prominent external calendar is a fallback only when there are no
  // upcoming API events FROM THE SAME REGION inside the search radius. Search/category/date
  // filters do not suppress the API-based local coverage check.
  if(state.loading||!state.dataReady||hasLocalApiEvents()){
    section.hidden=true;
    return;
  }
  const candidates=REGION_CALENDARS.filter(x=>!x.nationwide&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  const near=candidates.map(x=>({...x,km:distance(state.place.lat,state.place.lng,x.lat,x.lng)})).sort((a,b)=>a.km-b.km);
  const best=near[0];if(!best)return;
  const far=best.km>70;
  host.innerHTML='<div class="featured-local-card"><div class="featured-local-information"><div class="featured-local-kicker">'+(far?'LÄHIM SAADAVAL KALENDER':'SINU PIIRKONNA KALENDER')+'</div><h3>'+esc(best.name)+'</h3><p>'+esc(best.region)+' · '+(best.km<10?best.km.toFixed(1):Math.round(best.km))+' km valitud asukohast</p><span class="featured-local-disclaimer">Sündmused avanevad algses kalendris. Otseimport on veel arendamisel.</span></div><a class="featured-local-button" href="'+esc(best.url)+'" target="_blank" rel="noopener noreferrer">Ava ürituste kalender ↗</a></div>';
}
async function lookupManualPlace(){
  const input=$('citySearchInput');const phrase=input.value.trim();const help=$('citySearchHelp');
  if(!phrase){help.hidden=false;help.textContent='Sisesta asula nimi.';return}
  const known=CITIES.find(x=>x[0].toLocaleLowerCase('et-EE')===phrase.toLocaleLowerCase('et-EE'));
  if(known){setPlace({name:known[0],lat:known[1],lng:known[2]});return}
  const btn=$('lookupCityBtn');btn.disabled=true;help.hidden=false;help.textContent='Otsin asulat...';
  try{
    const q=new URL('https://nominatim.openstreetmap.org/search');
    q.searchParams.set('q',phrase+', Eesti');q.searchParams.set('format','jsonv2');
    q.searchParams.set('limit','5');q.searchParams.set('countrycodes','ee');
    const response=await fetch(q.toString(),{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Päringu viga');
    const rows=await response.json();const first=rows.find(x=>Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lon)));
    if(!first){help.textContent='Asulat ei leitud. Proovi teist nime või kasuta GPS-i.';return}
    setPlace({name:phrase,lat:Number(first.lat),lng:Number(first.lon)});
  }catch(err){help.textContent='Asukoha otsing ei õnnestunud. Vali mõni linn loendist.'}
  finally{btn.disabled=false}
}
function renderCalendars(){const el=$('regionalCalendarLinks');if(!el)return;const rows=[...REGION_CALENDARS].sort((a,b)=>{if(a.nationwide&&!b.nationwide)return 1;if(b.nationwide&&!a.nationwide)return -1;return state.place?distance(state.place.lat,state.place.lng,a.lat,a.lng)-distance(state.place.lat,state.place.lng,b.lat,b.lng):0});el.innerHTML=rows.map(x=>'<a class="regional-card" target="_blank" rel="noopener noreferrer" href="'+esc(x.url)+'"><span class="regional-card-place">'+esc(x.name)+'</span><span class="regional-card-area">'+esc(x.region)+'</span><span class="regional-card-action">Vaata ametlikku kalendrit ↗</span></a>').join('')}
function init(){renderCalendars();renderFeaturedCalendar();$('locationName').textContent=state.place?.name||'Vali asukoht';$('radiusSelect').value=String(state.radius);$('cityList').innerHTML=CITIES.map(c=>'<button data-city="'+esc(c[0])+'" type="button">'+esc(c[0])+'</button>').join('');$('cityList').onclick=e=>{const b=e.target.closest('[data-city]');if(!b)return;const c=CITIES.find(x=>x[0]===b.dataset.city);if(c)setPlace({name:c[0],lat:c[1],lng:c[2]})};
$('citySearchInput').oninput=e=>{
  const q=e.target.value.trim().toLocaleLowerCase('et-EE');
  const choices=CITIES.filter(c=>c[0].toLocaleLowerCase('et-EE').includes(q));
  $('cityList').innerHTML=choices.map(c=>'<button data-city="'+esc(c[0])+'" type="button">'+esc(c[0])+'</button>').join('');
  $('citySearchHelp').hidden=true;
};
$('citySearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();lookupManualPlace()}};
$('lookupCityBtn').onclick=lookupManualPlace;
$('geoBtn').onclick=()=>$('locationDialog').showModal();$('detectLocationBtn').onclick=locate;$('findBtn').onclick=refresh;$('radiusSelect').onchange=e=>{state.radius=+e.target.value;store('kr-radius',state.radius);refresh()};$('categoryFilters').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;state.cat=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});render()};$('dateSelect').onchange=e=>{state.date=e.target.value;render()};$('sortSelect').onchange=e=>{state.sort=e.target.value;render()};$('searchInput').oninput=e=>{state.query=e.target.value.trim();render()};$('listViewBtn').onclick=()=>{state.view='list';render()};$('mapViewBtn').onclick=()=>{state.view='map';render()};$('eventList').onclick=e=>{const fav=e.target.closest('[data-fav]'),cal=e.target.closest('[data-calendar]');if(fav)favorite(fav.dataset.fav);else if(cal)calendar(cal.dataset.calendar)};$('savedToggle').onclick=()=>{state.favoritesOnly=!state.favoritesOnly;render();document.querySelector('.content').scrollIntoView({behavior:'smooth'})};$('expandSearchBtn').onclick=()=>{if(!state.place){$('locationDialog').showModal();return}const nums=[10,25,50,100,0];state.radius=nums[Math.min(nums.length-1,Math.max(0,nums.indexOf(state.radius)+1))];$('radiusSelect').value=String(state.radius);store('kr-radius',state.radius);refresh()};$('clearFiltersBtn').onclick=()=>{state.cat='all';state.date='all';state.query='';state.favoritesOnly=false;$('dateSelect').value='all';$('searchInput').value='';document.querySelector('[data-category="all"]').click();render()};$('installBtn').onclick=()=>state.install?state.install.prompt():$('installDialog').showModal();$('aboutBtn').onclick=()=>$('aboutDialog').showModal();window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.install=e});if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(console.warn);render();if(state.place||!state.radius)refresh();else locate()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
