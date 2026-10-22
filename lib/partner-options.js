export const OBJECTIVES={conversation:'Conversation',voyage:'Voyage',etudes:'Études',travail:'Travail',culture:'Culture',amitie:'Amitié'};
export const FORMATS={texte:'Texte',vocal:'Messages vocaux',appel:'Appels'};
export const AVAILABILITY={weekday_morning:'Semaine · matin',weekday_afternoon:'Semaine · après-midi',weekday_evening:'Semaine · soirée',weekend_morning:'Week-end · matin',weekend_afternoon:'Week-end · après-midi',weekend_evening:'Week-end · soirée'};
export const LEVELS={A1:'A1 · Découverte',A2:'A2 · Élémentaire',B1:'B1 · Intermédiaire',B2:'B2 · Avancé',C1:'C1 · Autonome',C2:'C2 · Maîtrise'};
export const TIMEZONES=[...new Set(['UTC',...Intl.supportedValuesOf('timeZone'),'Asia/Kolkata'])];
export const validTimezone=value=>{if(typeof value!=='string'||value.length>80)return false;try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}};
const names=new Intl.DisplayNames(['fr'],{type:'region'});
export const COUNTRIES=Object.fromEntries(Array.from({length:676},(_,n)=>String.fromCharCode(65+Math.floor(n/26),65+n%26)).map(code=>[code,names.of(code)]).filter(([code,label])=>label&&label!==code&&!['ZZ','XA','XB'].includes(code)).sort((a,b)=>a[1].localeCompare(b[1],'fr')));
export const publicOptions=()=>({objectives:OBJECTIVES,formats:FORMATS,availability:AVAILABILITY,levels:LEVELS,timezones:TIMEZONES,countries:COUNTRIES});
const offsets=new Map();
function offsetFor(timezone,now){const hour=Math.floor(now.getTime()/3600000),cached=offsets.get(timezone);if(cached?.hour===hour)return cached.value;const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'longOffset'}).formatToParts(now),name=parts.find(p=>p.type==='timeZoneName')?.value||'GMT',match=name.match(/GMT([+-])(\d{2}):(\d{2})/),value=match?(Number(match[2])*60+Number(match[3]))*(match[1]==='-'?-1:1):0;offsets.set(timezone,{hour,value});return value;}
export function slots(timezone,availability,now=new Date()){
 const offset=offsetFor(timezone,now),result=new Set();
 for(const value of availability){const [kind,period]=value.split('_'),hours={morning:[9,12],afternoon:[14,17],evening:[19,22]}[period];if(!hours)continue;for(const day of kind==='weekday'?[0,1,2,3,4]:[5,6])for(let minute=hours[0]*60;minute<hours[1]*60;minute+=15)result.add(((day*1440+minute-offset+10080)%10080)/15);}return result;
}
export function compatiblePairs(profile){if(!profile?.availability?.length)return [];const mine=slots(profile.timezone,profile.availability),result=[];for(const tz of TIMEZONES)for(const slot of Object.keys(AVAILABILITY))if([...slots(tz,[slot])].some(s=>mine.has(s)))result.push(tz+'|'+slot);return result;}
