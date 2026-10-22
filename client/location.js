import lookup from 'tz-lookup';
export async function locate({signal,isCurrent=()=>true,geolocation=globalThis.navigator?.geolocation,fetcher=(...args)=>fetch(...args)}={}){
 if(!geolocation)throw Error('La localisation n’est pas disponible sur cet appareil.');
 const position=await new Promise((resolve,reject)=>geolocation.getCurrentPosition(resolve,error=>reject(Error(error.code===1?'Localisation refusée. Autorise-la dans les réglages du navigateur pour trouver ta ville.':error.code===3?'Le GPS met trop de temps à répondre. Réessaie.':'Position indisponible. Vérifie les réglages de localisation de ton appareil.')),{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
 if(signal?.aborted||!isCurrent())throw new DOMException('Annulé','AbortError');
 const {latitude,longitude,accuracy}=position.coords;if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw Error('Position GPS invalide.');if(accuracy>25000)throw Error('Position trop imprécise. Active le GPS ou réessaie avec une meilleure réception.');
 const timezone=new Intl.DateTimeFormat('en',{timeZone:lookup(latitude,longitude)}).resolvedOptions().timeZone;
 const url=new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');url.searchParams.set('latitude',String(latitude));url.searchParams.set('longitude',String(longitude));url.searchParams.set('localityLanguage','fr');
 let response,data;try{response=await fetcher(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});data=await response.json();}catch(error){if(signal?.aborted)throw error;throw Error('La recherche de ville ne répond pas. Ta localisation n’a pas été modifiée.');}
 if(!response.ok||!data||typeof data!=='object'||/ipgeolocation/i.test(data.lookupSource||''))throw Error('Impossible de retrouver ta ville depuis le GPS. Réessaie plus tard.');
 const city=data.city||data.locality,country=String(data.countryCode||'').toUpperCase();if(typeof city!=='string'||!city.trim()||city.length>100||!/^[A-Z]{2}$/.test(country))throw Error('Aucune ville reconnue pour cette position.');
 if(signal?.aborted||!isCurrent())throw new DOMException('Annulé','AbortError');
 // Precise device coordinates exist only during this explicit reverse-geocoding request.
 return {location:{latitude:Math.round(latitude*10)/10,longitude:Math.round(longitude*10)/10,city:city.trim(),country},timezone};
}
