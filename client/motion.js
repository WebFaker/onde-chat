import lottie from 'lottie-web/build/player/lottie_light.js';
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const animations=[];
export function animateEmblems(){for(const el of document.querySelectorAll('[data-lottie]:not([data-ready])')){el.dataset.ready='true';el.setAttribute('aria-hidden','true');const a=lottie.loadAnimation({container:el,renderer:'svg',loop:true,autoplay:!reduce.matches,path:'/assets/orbit.json'});if(reduce.matches)a.goToAndStop(20,true);animations.push(a);}}
reduce.addEventListener('change',()=>{for(const a of animations)reduce.matches?a.goToAndStop(20,true):a.play();});
