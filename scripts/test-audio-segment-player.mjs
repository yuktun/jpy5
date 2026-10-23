import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile('assets/audio-segment-player.js','utf8');
const window=new EventTarget(),document=new EventTarget();
window.JPY5PlaybackSpeed={attach(){}};
vm.runInNewContext(source,{window,document,setTimeout,clearTimeout});
class Media extends EventTarget {
  constructor(){super();this.time=100;this.paused=false;this.seeking=false;this.readyState=4;this.playbackRate=1;this.pauses=0;this.defer=false}
  get currentTime(){return this.time}
  set currentTime(value){this.destination=value;this.seeking=true}
  finishSeek(){this.time=this.destination;this.seeking=false;this.dispatchEvent(new Event('seeked'))}
  play(){this.paused=false;if(this.defer){this.defer=false;return new Promise((resolve,reject)=>{this.rejectOld=reject})}return Promise.resolve()}
  pause(){this.paused=true;this.pauses++;this.dispatchEvent(new Event('pause'))}
}
const audio=new Media(),player=window.JPY5SegmentPlayer.attach(audio);
try{
 player.play({start:10,end:12});audio.dispatchEvent(new Event('timeupdate'));
 assert.equal(audio.paused,false);assert.equal(audio.pauses,0,'old position stopped a pending replacement seek');
 player.play({start:20,end:24}); // Coalesce while the first native seek remains pending.
 audio.finishSeek();assert.equal(audio.destination,20);assert.equal(audio.paused,false);
 audio.finishSeek();assert.equal(audio.currentTime,20);
 audio.time=12.1;audio.dispatchEvent(new Event('timeupdate'));assert.equal(audio.paused,false,'earlier segment stop survived switching');
 audio.time=24.01;audio.dispatchEvent(new Event('timeupdate'));assert.equal(audio.pauses,1);assert.equal(audio.destination,24);
 audio.finishSeek();audio.defer=true;player.play({start:10,end:12});audio.finishSeek();
 player.play({start:20,end:24});audio.finishSeek();audio.rejectOld(Error('old rejected request'));await Promise.resolve();
 assert.equal(audio.paused,false,'late rejection stopped replacement playback');
 audio.playbackRate=2;audio.dispatchEvent(new Event('ratechange'));assert.equal(audio.paused,false);
 audio.time=24.001;audio.dispatchEvent(new Event('timeupdate'));assert.equal(audio.destination,24);assert.equal(audio.paused,true);
 audio.finishSeek();player.play({start:10,end:12});audio.finishSeek();player.full();audio.finishSeek();audio.time=13;audio.dispatchEvent(new Event('timeupdate'));assert.equal(audio.paused,false);
 console.log('PASS delayed/coalesced seeks, stale boundaries/rejections, rate changes and full-track cancellation');
}finally{player.cancel()}
