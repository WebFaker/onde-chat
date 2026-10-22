import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {JSDOM} from 'jsdom';
import {createCallConnector} from '../client/call-controller.js';
function setup({denyMic=false,connectPromise}={}){
 const dom=new JSDOM('<div id="media"></div>'),container=dom.window.document.getElementById('media');let room;
 const events=Object.fromEntries(['TrackSubscribed','TrackUnsubscribed','LocalTrackPublished','LocalTrackUnpublished','ParticipantConnected','ParticipantDisconnected','TrackMuted','TrackUnmuted','ActiveSpeakersChanged','ConnectionQualityChanged','Reconnecting','SignalReconnecting','Reconnected','AudioPlaybackStatusChanged','Disconnected'].map(x=>[x,x]));
 const track=source=>{const nodes=[];return {source,attach(){const n=dom.window.document.createElement(source==='microphone'?'audio':'video');nodes.push(n);return n;},detach(){return nodes.splice(0);}};};
 class Room extends EventEmitter{
  static async getLocalDevices(){return [{kind:'audioinput',deviceId:'test-mic',label:'Micro de test'}];}
  constructor(options){super();room=this;this.options=options;this.remoteParticipants=new Map();this.canPlaybackAudio=true;this.disconnected=false;this.micRequests=0;this.localParticipant={identity:'local',name:'Alice',isMicrophoneEnabled:false,isCameraEnabled:false,isScreenShareEnabled:false,setMicrophoneEnabled:async enabled=>{this.micRequests++;if(denyMic)throw Object.assign(Error('Permission refusée'),{name:'NotAllowedError'});this.localParticipant.isMicrophoneEnabled=enabled;},setCameraEnabled:async enabled=>{this.localParticipant.isCameraEnabled=enabled;this.emit(enabled?events.LocalTrackPublished:events.LocalTrackUnpublished,{source:'camera',...(enabled?{track:track('camera')}:{})});},setScreenShareEnabled:async enabled=>{this.localParticipant.isScreenShareEnabled=enabled;}};}
  async connect(){if(connectPromise)await connectPromise;}
  async disconnect(){this.disconnected=true;this.emit(events.Disconnected);}
  async startAudio(){this.canPlaybackAudio=true;}
  async switchActiveDevice(kind,id){this.selected=[kind,id];return id!=='missing';}
 }
 const participants=[],states=[];let disconnected=0;const connect=createCallConnector({Room,RoomEvent:events,Track:{Source:{Microphone:'microphone'}}});
 return {dom,container,track,events,participants,states,get room(){return room;},get disconnected(){return disconnected;},connect:signal=>connect({url:'wss://test.invalid',token:'isolated-test-token',container,signal,onParticipants:p=>participants.push(p),onState:s=>states.push(s),onDisconnected:()=>disconnected++})};
}
test('appel : participants, parole, reconnexion, caméra et coupure de l’écoute',async()=>{
 const t=setup();try{const call=await t.connect();assert.equal(t.room.options.audioCaptureDefaults.echoCancellation,true);assert.equal(t.room.localParticipant.isMicrophoneEnabled,true);
 const remote={identity:'remote',name:'Bob',isMicrophoneEnabled:true,isSpeaking:true,connectionQuality:'good'};t.room.remoteParticipants.set('remote',remote);t.room.emit(t.events.ActiveSpeakersChanged);assert.equal(t.participants.at(-1)[1].speaking,true);
 t.room.emit(t.events.TrackSubscribed,t.track('microphone'));assert.equal(t.container.querySelector('audio').muted,false);assert.equal(await call.deafen(),true);assert.equal(t.container.querySelector('audio').muted,true);assert.equal(t.room.localParticipant.isMicrophoneEnabled,false);await assert.rejects(()=>call.mic(),/Réactive/);
 t.room.emit(t.events.TrackSubscribed,t.track('microphone'));assert.ok([...t.container.querySelectorAll('audio')].every(n=>n.muted));assert.equal(await call.deafen(),false);assert.equal(t.room.localParticipant.isMicrophoneEnabled,false);assert.equal(await call.mic(),true);
 assert.equal(await call.camera(),true);assert.equal(t.container.querySelector('[data-local]').muted,true);assert.equal(await call.camera(),false);assert.equal(t.container.querySelector('[data-local]'),null);
 t.room.emit(t.events.Reconnecting);assert.equal(t.states.at(-1).status,'reconnecting');t.room.emit(t.events.Reconnected);assert.equal(t.states.at(-1).status,'connected');
 assert.equal((await call.devices())[0].deviceId,'test-mic');await call.device('audioinput','test-mic');assert.deepEqual(t.room.selected,['audioinput','test-mic']);await assert.rejects(()=>call.device('audioinput','missing'),/indisponible/);
 await call.disconnect();assert.equal(t.container.children.length,0);assert.equal(t.disconnected,1);t.room.emit(t.events.Reconnected);assert.equal(t.states.at(-1).status,'disconnected');await assert.rejects(()=>call.camera(),/terminé/);await call.disconnect();assert.equal(t.disconnected,1);
 }finally{t.dom.window.close();}
});
test('permission micro refusée : fermeture du transport et nettoyage',async()=>{const t=setup({denyMic:true});try{await assert.rejects(()=>t.connect(),{name:'NotAllowedError'});assert.equal(t.room.disconnected,true);assert.equal(t.disconnected,1);assert.equal(t.container.children.length,0);}finally{t.dom.window.close();}});
test('annulation pendant la connexion : aucun accès au micro après annulation',async()=>{let release;const pending=new Promise(resolve=>release=resolve),t=setup({connectPromise:pending}),abort=new AbortController();try{const call=t.connect(abort.signal);abort.abort();release();await assert.rejects(()=>call,/annulé/);assert.equal(t.room.micRequests,0);assert.equal(t.room.disconnected,true);assert.equal(t.disconnected,1);}finally{t.dom.window.close();}});

test('diagnostic LiveKit : disponibilité et erreurs sans divulguer les clés',async()=>{
 const {checkCallService}=await import('../lib/features/call-health.js');const previous={};for(const key of ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET']){previous[key]=process.env[key];delete process.env[key];}
 try{assert.equal((await checkCallService()).configured,false);process.env.LIVEKIT_URL='wss://test.invalid';process.env.LIVEKIT_API_KEY='private-test-key';process.env.LIVEKIT_API_SECRET='private-test-secret';assert.equal((await checkCallService(async()=>{})).reachable,true);const failure=await checkCallService(async()=>{throw Error('private-test-secret');});assert.equal(failure.reachable,false);assert.ok(!JSON.stringify(failure).includes('private-test-secret'));}
 finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
