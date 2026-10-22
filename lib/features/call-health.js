import {RoomServiceClient} from 'livekit-server-sdk';
export async function checkCallService(probe){
 const {LIVEKIT_URL:url,LIVEKIT_API_KEY:key,LIVEKIT_API_SECRET:secret}=process.env;
 if(!url||!key||!secret)return {configured:false,reachable:false,message:'Les trois variables LiveKit doivent être enregistrées en Production, puis redéployées.'};
 try{
  const endpoint=new URL(url);if(endpoint.protocol!=='wss:'&&endpoint.protocol!=='https:')throw Error('Invalid protocol');endpoint.protocol='https:';
  if(probe)await probe();else await new RoomServiceClient(endpoint.origin,key,secret,{requestTimeout:5,failover:false}).listRooms();
  return {configured:true,reachable:true,message:'LiveKit répond et accepte les clés. Il reste à tester le son et la vidéo entre deux appareils.'};
 }catch{return {configured:true,reachable:false,message:'LiveKit ne répond pas ou refuse les clés. Vérifie l’URL, l’API Key et l’API Secret dans Vercel. Aucun appel audio n’a été testé.'};}
}
