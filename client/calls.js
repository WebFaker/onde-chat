import {Room,RoomEvent,Track} from 'livekit-client';
export async function connectCall({url,token,container,onParticipants,onDisconnected}){
 const room=new Room({adaptiveStream:true,dynacast:true});
 const update=()=>onParticipants([room.localParticipant,...room.remoteParticipants.values()].map(p=>({name:p.name||p.identity,mic:p.isMicrophoneEnabled,camera:p.isCameraEnabled})));
 room.on(RoomEvent.TrackSubscribed,(track)=>{const el=track.attach();el.classList.add('call-media');el.dataset.source=track.source;container.append(el);});
 room.on(RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(el=>el.remove()));
 for(const event of [RoomEvent.ParticipantConnected,RoomEvent.ParticipantDisconnected,RoomEvent.TrackMuted,RoomEvent.TrackUnmuted,RoomEvent.LocalTrackPublished,RoomEvent.LocalTrackUnpublished])room.on(event,update);
 room.on(RoomEvent.Disconnected,()=>{container.replaceChildren();onDisconnected();});
 try{await room.connect(url,token);await room.localParticipant.setMicrophoneEnabled(true);update();}catch(e){await room.disconnect();throw e;}
 return {disconnect:()=>room.disconnect(),mic:async()=>{await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);update();return room.localParticipant.isMicrophoneEnabled;},camera:async()=>{const enabled=!room.localParticipant.isCameraEnabled;await room.localParticipant.setCameraEnabled(enabled);container.querySelectorAll('[data-local-camera]').forEach(el=>el.remove());if(enabled){const track=room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;if(track){const el=track.attach();el.muted=true;el.dataset.localCamera='true';el.classList.add('call-media');container.append(el);}}update();return enabled;},screen:async()=>{const enabled=!room.localParticipant.isScreenShareEnabled;await room.localParticipant.setScreenShareEnabled(enabled);return enabled;}};
}
