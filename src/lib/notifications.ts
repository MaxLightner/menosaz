let audio:AudioContext|null=null;
export function notificationSound(){
 if(!audio||audio.state!=='running')return;
 for(let i=0;i<2;i++){const osc=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+i*.22;osc.connect(gain);gain.connect(audio.destination);osc.frequency.value=i?784:587;gain.gain.setValueAtTime(.12,start);gain.gain.exponentialRampToValueAtTime(.001,start+.18);osc.start(start);osc.stop(start+.19);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
}
export async function enableAppNotifications(){
 const AudioCtor=window.AudioContext||(window as any).webkitAudioContext;if(!AudioCtor)throw Error('این مرورگر پخش صدا را پشتیبانی نمی‌کند');
 audio??=new AudioCtor();await audio!.resume();notificationSound();
 if('Notification'in window&&Notification.permission==='default'){try{await Notification.requestPermission();}catch{}}
 return audio!.state==='running';
}
export function incomingNotice(id:string,message:string){
 notificationSound();window.dispatchEvent(new CustomEvent('menosaz-alert',{detail:{id,message}}));
 if(document.hidden&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('منوساز',{body:message,tag:id});}catch{}}
}
