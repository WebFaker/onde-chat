// Original two-note ringtone, synthesized locally. No media permission is needed.
export function createRingtone({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,onBlocked=()=>{}}={}){
 let context,timer,ringing=false,muted=false,oscillators=[];
 const stopNotes=()=>{for(const oscillator of oscillators){try{oscillator.stop();}catch{}}oscillators=[];};
 async function unlock(){if(!AudioContextClass)return false;try{context ||= new AudioContextClass();if(context.state==='suspended')await context.resume();return context.state==='running';}catch{return false;}}
 function pulse(){
  if(!ringing||muted)return;
  if(context?.state!=='running'){onBlocked();return;}
  stopNotes();const now=context.currentTime;
  for(const [offset,frequency] of [[0,523.25],[.22,659.25],[.44,523.25],[.66,659.25]]){
   const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,now+offset);gain.gain.linearRampToValueAtTime(.08,now+offset+.02);gain.gain.exponentialRampToValueAtTime(.001,now+offset+.18);oscillator.connect(gain);gain.connect(context.destination);oscillator.start(now+offset);oscillator.stop(now+offset+.2);oscillators.push(oscillator);
  }
 }
 return {unlock,start(){if(ringing)return;ringing=true;pulse();timer=setInterval(pulse,3000);},stop(){ringing=false;clearInterval(timer);stopNotes();},setMuted(value){muted=value;if(muted)stopNotes();else if(ringing)pulse();},async enable(){const allowed=await unlock();if(allowed&&ringing)pulse();return allowed;}};
}
