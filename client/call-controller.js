// Keep transport dependencies injectable so lifecycle and device failures can be tested.
export function createCallConnector({Room,RoomEvent,Track}){
 return async function connectCall({url,token,container,signal,onParticipants=()=>{},onDisconnected=()=>{},onState=()=>{}}){
 const room=new Room({adaptiveStream:true,dynacast:true,audioCaptureDefaults:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},videoCaptureDefaults:{resolution:{width:1280,height:720}}});
 let deafened=false,closed=false;
 const state=data=>{if(!closed)onState(data);};
 const update=()=>{if(closed)return;onParticipants([room.localParticipant,...room.remoteParticipants.values()].map(p=>({id:p.identity,name:p.name||p.identity,mic:p.isMicrophoneEnabled,camera:p.isCameraEnabled,screen:p.isScreenShareEnabled,speaking:p.isSpeaking,quality:p.connectionQuality,local:p===room.localParticipant})));};
 const attach=(track,local=false)=>{if(closed)return;const media=track.attach();media.classList.add('call-media');media.dataset.source=track.source;if(local){media.muted=true;media.dataset.local='true';}else media.muted=deafened;container.append(media);};
 const detach=track=>track.detach().forEach(el=>el.remove());
 const abort=()=>{room.disconnect().catch(()=>{});cleanup();};
 const cleanup=()=>{if(closed)return;closed=true;signal?.removeEventListener('abort',abort);container.replaceChildren();onState({status:'disconnected'});onDisconnected();};
 room.on(RoomEvent.TrackSubscribed,track=>attach(track));room.on(RoomEvent.TrackUnsubscribed,detach);
 room.on(RoomEvent.LocalTrackPublished,publication=>{if(publication.track&&publication.source!==Track.Source.Microphone)attach(publication.track,true);update();});
 room.on(RoomEvent.LocalTrackUnpublished,publication=>{if(publication.track)detach(publication.track);for(const media of container.querySelectorAll('[data-local]'))if(media.dataset.source===publication.source)media.remove();update();});
 for(const event of [RoomEvent.ParticipantConnected,RoomEvent.ParticipantDisconnected,RoomEvent.TrackMuted,RoomEvent.TrackUnmuted,RoomEvent.ActiveSpeakersChanged,RoomEvent.ConnectionQualityChanged])room.on(event,update);
 room.on(RoomEvent.Reconnecting,()=>state({status:'reconnecting'}));room.on(RoomEvent.SignalReconnecting,()=>state({status:'reconnecting'}));room.on(RoomEvent.Reconnected,()=>{state({status:'connected'});update();});
 room.on(RoomEvent.AudioPlaybackStatusChanged,()=>state({audioBlocked:!room.canPlaybackAudio}));room.on(RoomEvent.Disconnected,cleanup);
 if(signal?.aborted){await room.disconnect();cleanup();throw Error('Appel annulé.');}signal?.addEventListener('abort',abort,{once:true});
 try{state({status:'connecting'});await room.connect(url,token);if(closed||signal?.aborted)throw Error('Appel annulé.');await room.localParticipant.setMicrophoneEnabled(true);if(closed||signal?.aborted)throw Error('Appel annulé.');await room.startAudio().catch(()=>{});state({status:'connected',audioBlocked:!room.canPlaybackAudio});update();}catch(e){try{await room.disconnect();}finally{cleanup();}throw e;}
 const open=()=>{if(closed)throw Error('L’appel est terminé. Rejoins-le à nouveau.');};
 return {
 disconnect:async()=>{try{await room.disconnect();}finally{cleanup();}},
 mic:async()=>{open();if(deafened)throw Error('Réactive l’écoute avant le microphone.');await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);update();return room.localParticipant.isMicrophoneEnabled;},
 camera:async()=>{open();await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);update();return room.localParticipant.isCameraEnabled;},
 screen:async()=>{open();await room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled,{audio:true});update();return room.localParticipant.isScreenShareEnabled;},
 deafen:async()=>{open();const next=!deafened;if(next)await room.localParticipant.setMicrophoneEnabled(false);deafened=next;for(const media of container.querySelectorAll('.call-media:not([data-local])'))media.muted=deafened;update();return deafened;},
 startAudio:async()=>{open();await room.startAudio();state({audioBlocked:!room.canPlaybackAudio});},
 devices:async()=>{open();return Room.getLocalDevices(undefined,false);},
 device:async(kind,id)=>{open();if(!['audioinput','audiooutput','videoinput'].includes(kind))throw Error('Périphérique invalide.');const changed=await room.switchActiveDevice(kind,id);if(!changed)throw Error('Ce périphérique est indisponible dans ce navigateur.');},
 };
 };
}
