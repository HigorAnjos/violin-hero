(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(s){if(s.ep)return;s.ep=!0;const a=t(s);fetch(s.href,a)}})();let Gt=1;class Gn{constructor(){this.ctx=null,this.mixBus=null,this.pitchAnalyser=null,this.bridgeNode=null,this.inputs=new Map,this.outputs=new Map}async init(){return this.ctx=new AudioContext({latencyHint:"interactive"}),this.mixBus=this.ctx.createGain(),this.pitchAnalyser=this.ctx.createAnalyser(),this.pitchAnalyser.fftSize=4096,this.pitchAnalyser.smoothingTimeConstant=0,this.mixBus.connect(this.pitchAnalyser),this.bridgeNode=this.ctx.createMediaStreamDestination(),this.mixBus.connect(this.bridgeNode),this.ctx}createInput(){const e=Gt++,t=this.ctx.createGain(),n=this.ctx.createAnalyser();return n.fftSize=2048,n.smoothingTimeConstant=.8,t.connect(n),t.connect(this.mixBus),this.inputs.set(e,{id:e,stream:null,source:null,gain:t,analyser:n,muted:!1,gainValue:1}),e}connectInputStream(e,t){const n=this.inputs.get(e);if(!n)return;n.source&&n.source.disconnect(),n.stream&&n.stream.getTracks().forEach(a=>a.stop());const s=this.ctx.createMediaStreamSource(t);n.source=s,n.stream=t,this._routeSource(n,n.gain)}_routeSource(e,t){if(!e.source)return;try{e.source.disconnect()}catch{}if(e.splitter)try{e.splitter.disconnect()}catch{}e.splitter=null;const n=e.channelMode||"mix";if(n==="left"||n==="right"){const s=this.ctx.createChannelSplitter(2);e.source.connect(s),s.connect(t,n==="left"?0:1),e.splitter=s}else e.source.connect(t)}setInputChannelMode(e,t){const n=this.inputs.get(e);n&&(n.channelMode=t,this._routeSource(n,n.gain))}getInputChannelCount(e){var n,s,a,o;const t=(a=(s=(n=this.inputs.get(e))==null?void 0:n.stream)==null?void 0:s.getAudioTracks)==null?void 0:a.call(s)[0];return((o=t==null?void 0:t.getSettings)==null?void 0:o.call(t).channelCount)||1}removeInput(e){var n,s,a;const t=this.inputs.get(e);t&&((n=t.source)==null||n.disconnect(),(s=t.splitter)==null||s.disconnect(),t.gain.disconnect(),(a=t.stream)==null||a.getTracks().forEach(o=>o.stop()),this.inputs.delete(e))}switchInputDevice(e,t){this.connectInputStream(e,t)}setInputGain(e,t){const n=this.inputs.get(e);n&&(n.gainValue=t,n.muted||n.gain.gain.setTargetAtTime(t,this.ctx.currentTime,.01))}toggleInputMute(e){const t=this.inputs.get(e);if(!t)return!1;t.muted=!t.muted;const n=t.muted?0:t.gainValue;return t.gain.gain.setTargetAtTime(n,this.ctx.currentTime,.01),t.muted}getInputLevel(e){const t=this.inputs.get(e);return t?this._getLevel(t.analyser):{rms:0,peak:0,rmsDb:-100,peakDb:-100}}async addOutput(e){const t=Gt++;if(this.outputs.size===0){this.mixBus.connect(this.ctx.destination),this.ctx.setSinkId&&e&&await this.ctx.setSinkId(e);const s=this.ctx.createAnalyser();s.fftSize=2048,s.smoothingTimeConstant=.8,this.mixBus.connect(s),this.outputs.set(t,{id:t,deviceId:e,primary:!0,ctx:this.ctx,gain:null,analyser:s,outputGain:this.ctx.createGain(),muted:!1,gainValue:1}),this.mixBus.disconnect(this.ctx.destination);const a=this.outputs.get(t).outputGain;this.mixBus.connect(a),a.connect(this.ctx.destination),a.connect(s),this.mixBus.disconnect(s)}else{if(this.outputs.size>=4)return-1;const s=new AudioContext({latencyHint:"interactive"});s.setSinkId&&e&&await s.setSinkId(e);const a=s.createMediaStreamSource(this.bridgeNode.stream),o=s.createGain(),r=s.createAnalyser();r.fftSize=2048,r.smoothingTimeConstant=.8,a.connect(o),o.connect(r),o.connect(s.destination),this.outputs.set(t,{id:t,deviceId:e,primary:!1,ctx:s,bridgeSource:a,gain:o,analyser:r,outputGain:o,muted:!1,gainValue:1})}return t}removeOutput(e){const t=this.outputs.get(e);t&&(t.primary?(t.outputGain.disconnect(),this.mixBus.disconnect(t.outputGain),this.mixBus.disconnect(t.analyser)):(t.bridgeSource.disconnect(),t.outputGain.disconnect(),t.ctx.close()),this.outputs.delete(e))}async switchOutputDevice(e,t){const n=this.outputs.get(e);n&&(n.deviceId=t,n.ctx.setSinkId&&await n.ctx.setSinkId(t))}setOutputGain(e,t){const n=this.outputs.get(e);n&&(n.gainValue=t,n.muted||n.outputGain.gain.setTargetAtTime(t,this.ctx.currentTime,.01))}toggleOutputMute(e){const t=this.outputs.get(e);if(!t)return!1;t.muted=!t.muted;const n=t.muted?0:t.gainValue;return t.outputGain.gain.setTargetAtTime(n,this.ctx.currentTime,.01),t.muted}getOutputLevel(e){const t=this.outputs.get(e);return t?this._getLevel(t.analyser):{rms:0,peak:0,rmsDb:-100,peakDb:-100}}_getLevel(e){const t=new Float32Array(e.fftSize);e.getFloatTimeDomainData(t);let n=0,s=0;for(let c=0;c<t.length;c++){const h=Math.abs(t[c]);n+=t[c]*t[c],h>s&&(s=h)}const a=Math.sqrt(n/t.length),o=a>0?20*Math.log10(a):-100,r=s>0?20*Math.log10(s):-100;return{rms:a,peak:s,rmsDb:o,peakDb:r}}getPitchData(){const e=this.pitchAnalyser.fftSize,t=new Float32Array(e);return this.pitchAnalyser.getFloatTimeDomainData(t),{data:t,sampleRate:this.ctx.sampleRate}}getLatency(){const e=this.ctx.baseLatency||0,t=this.ctx.outputLatency||0;return(e+t)*1e3}getLatencyBreakdown(){const e=(this.ctx.baseLatency||0)*1e3,t=(this.ctx.outputLatency||0)*1e3;return{baseMs:e,outputMs:t}}getBridgeLatency(){var e;return 128/(((e=this.ctx)==null?void 0:e.sampleRate)||48e3)*1e3}async reinitWithBufferSize(e){if(this._reinitInProgress)return this.ctx;this._reinitInProgress=!0;try{return await this._doReinit(e)}finally{this._reinitInProgress=!1}}async _doReinit(e){var a,o,r,c,h;const t=e!=null?e/(((a=this.ctx)==null?void 0:a.sampleRate)||48e3):"interactive",n=[];for(const[l,d]of this.inputs)n.push({id:l,stream:d.stream,gainValue:d.gainValue,muted:d.muted}),d.source&&d.source.disconnect(),d.gain.disconnect(),d.analyser.disconnect();const s=[];for(const[l,d]of this.outputs)s.push({id:l,deviceId:d.deviceId,primary:d.primary,gainValue:d.gainValue,muted:d.muted}),!d.primary&&d.ctx?((o=d.bridgeSource)==null||o.disconnect(),(r=d.outputGain)==null||r.disconnect(),d.ctx.close()):d.primary&&((c=d.outputGain)==null||c.disconnect(),(h=this.mixBus)==null||h.disconnect(d.outputGain));this.outputs.clear(),this.mixBus&&this.mixBus.disconnect(),this.ctx&&await this.ctx.close(),this.ctx=new AudioContext({latencyHint:t}),this.mixBus=this.ctx.createGain(),this.pitchAnalyser=this.ctx.createAnalyser(),this.pitchAnalyser.fftSize=4096,this.pitchAnalyser.smoothingTimeConstant=0,this.mixBus.connect(this.pitchAnalyser),this.bridgeNode=this.ctx.createMediaStreamDestination(),this.mixBus.connect(this.bridgeNode);for(const l of n){const d=this.inputs.get(l.id);if(!d)continue;const u=this.ctx.createGain(),p=this.ctx.createAnalyser();if(p.fftSize=2048,p.smoothingTimeConstant=.8,u.connect(p),u.connect(this.mixBus),d.gain=u,d.analyser=p,d.gainValue=l.gainValue,d.muted=l.muted,l.muted?u.gain.value=0:u.gain.value=l.gainValue,d.stream=l.stream,l.stream&&l.stream.active)try{const f=this.ctx.createMediaStreamSource(l.stream);d.source=f,d.splitter=null,this._routeSource(d,u)}catch(f){console.warn("Failed to reconnect stream after reinit:",f),d.source=null}else d.source=null}for(const l of s)if(l.primary){const d=this.ctx.createGain(),u=this.ctx.createAnalyser();if(u.fftSize=2048,u.smoothingTimeConstant=.8,this.mixBus.connect(d),d.connect(this.ctx.destination),d.connect(u),l.muted?d.gain.value=0:d.gain.value=l.gainValue,this.ctx.setSinkId&&l.deviceId)try{await this.ctx.setSinkId(l.deviceId)}catch{}this.outputs.set(l.id,{id:l.id,deviceId:l.deviceId,primary:!0,ctx:this.ctx,gain:null,analyser:u,outputGain:d,muted:l.muted,gainValue:l.gainValue})}else{const d=new AudioContext({latencyHint:"interactive"});if(d.setSinkId&&l.deviceId)try{await d.setSinkId(l.deviceId)}catch{}const u=d.createMediaStreamSource(this.bridgeNode.stream),p=d.createGain(),f=d.createAnalyser();f.fftSize=2048,f.smoothingTimeConstant=.8,u.connect(p),p.connect(f),p.connect(d.destination),l.muted?p.gain.value=0:p.gain.value=l.gainValue,this.outputs.set(l.id,{id:l.id,deviceId:l.deviceId,primary:!1,ctx:d,bridgeSource:u,gain:p,analyser:f,outputGain:p,muted:l.muted,gainValue:l.gainValue})}return this.ctx}destroy(){for(const[e]of this.inputs)this.removeInput(e);for(const[e,t]of this.outputs)t.primary||t.ctx.close();this.outputs.clear(),this.ctx&&this.ctx.close()}}class bn{constructor(){this.devices={inputs:[],outputs:[]},this.onDevicesChanged=null}async enumerate(){const e=await navigator.mediaDevices.enumerateDevices();return this.devices.inputs=e.filter(t=>t.kind==="audioinput"),this.devices.outputs=e.filter(t=>t.kind==="audiooutput"),this.devices}listenForChanges(){navigator.mediaDevices.addEventListener("devicechange",async()=>{var e;await this.enumerate(),(e=this.onDevicesChanged)==null||e.call(this,this.devices)})}async requestPermission(){(await navigator.mediaDevices.getUserMedia({audio:!0})).getTracks().forEach(t=>t.stop())}async getInputStream(e){const t={echoCancellation:{ideal:!1},noiseSuppression:{ideal:!1},autoGainControl:{ideal:!1},channelCount:{ideal:2},latency:{ideal:0}};return e&&(t.deviceId={exact:e}),navigator.mediaDevices.getUserMedia({audio:t})}}const Fn=.15;class Cn{constructor(){this._yinBuffer=null}detect(e,t){const n=Math.min(Math.floor(e.length/2),Math.ceil(t/50)),s=Math.min(e.length-n,Math.max(1024,n)),a=e.length-s-n,o=n;(!this._yinBuffer||this._yinBuffer.length!==o)&&(this._yinBuffer=new Float32Array(o));const r=this._yinBuffer;let c=0;for(let A=a;A<a+s+n;A++)c+=e[A]*e[A];const h=Math.sqrt(c/(s+n));if(c/(s+n)<1e-7)return null;r[0]=0;for(let A=1;A<o;A++){let C=0;for(let M=0;M<s;M++){const k=e[a+M]-e[a+M+A];C+=k*k}r[A]=C}r[0]=1;let l=0;for(let A=1;A<o;A++)l+=r[A],r[A]*=A/l;let d=-1;for(let A=2;A<o;A++)if(r[A]<Fn){for(;A+1<o&&r[A+1]<r[A];)A++;d=A;break}if(d===-1)return null;const u=1-r[d],p=d;let f;if(p>0&&p<o-1){const A=r[p-1],C=r[p],M=r[p+1],k=(M-A)/(2*(2*C-M-A));f=p+(isFinite(k)?k:0)}else f=p;const B=t/f;return B<50||B>5e3?null:{freq:B,clarity:u,rms:h}}}const yn=.85,vn=180,_n=1500,Sn=-50,Mn=5,wn=1200,Tn=50,Ln=2,kn=6,xn=80,On=80,In=2,zn=-100;function Nn(i){return 69+12*Math.log2(i/440)}function Kn(i){return 440*Math.pow(2,(i-69)/12)}function bt(i){const e=[...i].sort((n,s)=>n-s),t=e.length>>1;return e.length%2?e[t]:(e[t-1]+e[t])/2}class Pn{constructor(){this._detector=new Cn,this._midiHistory=[],this._octaveJumpStreak=0,this._pitchJumpStreak=0,this._lastOutputMidi=null,this._rmsHistory=[],this._aboveOnset=!1,this._onsetId=0}update(e,t,n=performance.now()){const s=this._detector.detect(e,t),a=s?20*Math.log10(Math.max(s.rms,1e-10)):zn;if(this._trackOnset(a,n),!(s!=null&&s.clarity>=yn&&s.freq>=vn&&s.freq<=_n&&a>=Sn))return this._midiHistory.length=0,this._octaveJumpStreak=0,this._pitchJumpStreak=0,this._lastOutputMidi=null,{freq:null,clarity:(s==null?void 0:s.clarity)??0,rms:(s==null?void 0:s.rms)??0,onsetId:this._onsetId};const r=this._resolvePitch(s.freq);return{freq:Kn(r),clarity:s.clarity,rms:s.rms,onsetId:this._onsetId}}_trackOnset(e,t){for(this._rmsHistory.push({t,db:e});this._rmsHistory.length>1&&t-this._rmsHistory[0].t>xn;)this._rmsHistory.shift();const n=Math.min(...this._rmsHistory.map(a=>a.db)),s=e-n>=kn;s&&!this._aboveOnset?(this._onsetId++,this._aboveOnset=!0):s||(this._aboveOnset=!1)}_resolvePitch(e){const t=this._resolveOctave(Nn(e));this._lastOutputMidi!=null&&Math.abs((t-this._lastOutputMidi)*100)>=On?this._pitchJumpStreak++:this._pitchJumpStreak=0,this._pitchJumpStreak>=In&&(this._onsetId++,this._midiHistory.length=0,this._pitchJumpStreak=0),this._midiHistory.push(t),this._midiHistory.length>Mn&&this._midiHistory.shift();const n=bt(this._midiHistory);return this._lastOutputMidi=n,n}_resolveOctave(e){if(this._midiHistory.length===0)return e;const t=bt(this._midiHistory),n=(e-t)*100;if(!(Math.abs(Math.abs(n)-wn)<=Tn))return this._octaveJumpStreak=0,e;if(this._octaveJumpStreak++,this._octaveJumpStreak<=Ln){const a=Math.round((e-t)/12);return e-a*12}return this._midiHistory.length=0,this._octaveJumpStreak=0,e}}class en{constructor(e){this.ctx=e,this.bpm=120,this.beatsPerMeasure=4,this.volume=.5,this._playing=!1,this._currentBeat=0,this._nextNoteTime=0,this._timerId=null,this._scheduleAheadTime=.1,this._lookaheadMs=25,this._gainNode=this.ctx.createGain(),this._gainNode.gain.value=this.volume,this._gainNode.connect(this.ctx.destination),this.onBeat=null}get playing(){return this._playing}start(){this._playing||(this._playing=!0,this._currentBeat=0,this._nextNoteTime=this.ctx.currentTime,this._schedule(),this._timerId=setInterval(()=>this._schedule(),this._lookaheadMs))}stop(){this._playing&&(this._playing=!1,this._timerId!==null&&(clearInterval(this._timerId),this._timerId=null))}setVolume(e){this.volume=e,this._gainNode.gain.setTargetAtTime(e,this.ctx.currentTime,.01)}_schedule(){for(;this._nextNoteTime<this.ctx.currentTime+this._scheduleAheadTime;)this._scheduleBeat(this._currentBeat,this._nextNoteTime),this._advanceBeat()}_scheduleBeat(e,t){var c;const n=e===0,s=n?1e3:800,a=.06,o=this.ctx.createOscillator();o.type="sine",o.frequency.value=s;const r=this.ctx.createGain();r.gain.setValueAtTime(n?1:.7,t),r.gain.exponentialRampToValueAtTime(.001,t+a),o.connect(r),r.connect(this._gainNode),o.start(t),o.stop(t+a),(c=this.onBeat)==null||c.call(this,e,t)}_advanceBeat(){const e=60/this.bpm;this._nextNoteTime+=e,this._currentBeat=(this._currentBeat+1)%this.beatsPerMeasure}destroy(){this.stop(),this._gainNode.disconnect()}}class ${constructor(e,t={}){this.onChange=null,this._value="",this._items=[],this._groups=[],this._isGrouped=!1,this._open=!1,this.el=document.createElement("div"),this.el.className="dropdown",t.title&&(this.el.title=t.title),this._trigger=document.createElement("button"),this._trigger.type="button",this._trigger.className="dropdown-trigger",this._trigger.setAttribute("aria-haspopup","listbox"),this._trigger.setAttribute("aria-expanded","false"),this._triggerText=document.createElement("span"),this._triggerText.className="dropdown-trigger-text",this._triggerText.textContent=t.placeholder||"Select...",this._trigger.appendChild(this._triggerText);const n=document.createElement("span");n.className="dropdown-arrow",this._trigger.appendChild(n),this.el.appendChild(this._trigger),this._listbox=document.createElement("div"),this._listbox.className="dropdown-listbox",this._listbox.setAttribute("role","listbox"),this.el.appendChild(this._listbox),this._trigger.addEventListener("click",s=>{s.stopPropagation(),this._toggle()}),this._trigger.addEventListener("keydown",s=>this._onKeydown(s)),this._listbox.addEventListener("keydown",s=>this._onKeydown(s)),this._outsideClickHandler=s=>{this.el.contains(s.target)||this.close()},e.appendChild(this.el)}get value(){return this._value}set value(e){this._value=e,this._updateDisplay(),this._updateSelection()}setItems(e){this._items=e,this._groups=[],this._isGrouped=!1,this._renderItems(),this._updateDisplay()}setGroupedItems(e){this._groups=e,this._items=[],this._isGrouped=!0,this._renderGrouped(),this._updateDisplay()}_hasOptions(){return this._isGrouped?this._groups.some(e=>e.items.length>0):this._items.length>0}_renderEmpty(){const e=document.createElement("div");e.className="dropdown-empty",e.textContent="No options available",this._listbox.appendChild(e)}_renderItems(){if(this._listbox.replaceChildren(),!this._items.length){this._renderEmpty();return}for(const e of this._items)this._listbox.appendChild(this._createOption(e))}_renderGrouped(){if(this._listbox.replaceChildren(),!this._groups.some(e=>e.items.length>0)){this._renderEmpty();return}for(const e of this._groups){const t=document.createElement("div");t.className="dropdown-group";const n=document.createElement("div");n.className="dropdown-group-label",n.textContent=e.label,t.appendChild(n);for(const s of e.items)t.appendChild(this._createOption(s));this._listbox.appendChild(t)}}_createOption(e){const t=document.createElement("div");t.className="dropdown-option",t.setAttribute("role","option"),t.dataset.value=e.value,e.value===this._value&&t.classList.add("selected");const n=document.createElement("span");n.className="dropdown-check",n.textContent="✓",t.appendChild(n);const s=document.createElement("span");return s.className="dropdown-option-text",s.textContent=e.label,t.appendChild(s),t.addEventListener("click",a=>{a.stopPropagation(),this._select(e.value),this.close()}),t}_select(e){var t;e!==this._value&&(this._value=e,this._updateDisplay(),this._updateSelection(),(t=this.onChange)==null||t.call(this,e))}_updateDisplay(){const t=(this._isGrouped?this._groups.flatMap(n=>n.items):this._items).find(n=>n.value===this._value);this._triggerText.textContent=t?t.label:this._value||"Select..."}_updateSelection(){const e=this._listbox.querySelectorAll(".dropdown-option");for(const t of e)t.classList.toggle("selected",t.dataset.value===this._value)}_toggle(){this._open?this.close():this.open()}open(){if(this._open)return;this._open=!0,this.el.classList.add("open"),this._trigger.setAttribute("aria-expanded","true"),this._positionListbox(),document.addEventListener("click",this._outsideClickHandler,!0);const e=this._listbox.querySelector(".dropdown-option.selected");e&&e.scrollIntoView({block:"nearest"})}close(){this._open&&(this._open=!1,this.el.classList.remove("open"),this._trigger.setAttribute("aria-expanded","false"),document.removeEventListener("click",this._outsideClickHandler,!0))}_positionListbox(){this._listbox.classList.remove("dropdown-listbox--above");const e=this._trigger.getBoundingClientRect();window.innerHeight-e.bottom<200&&this._listbox.classList.add("dropdown-listbox--above")}_onKeydown(e){switch(e.key){case"Escape":this.close(),this._trigger.focus(),e.preventDefault();break;case"Enter":case" ":this._open||(this.open(),e.preventDefault());break;case"ArrowDown":if(e.preventDefault(),!this._open){this.open();return}this._moveFocus(1);break;case"ArrowUp":if(e.preventDefault(),!this._open){this.open();return}this._moveFocus(-1);break}}_moveFocus(e){const t=[...this._listbox.querySelectorAll(".dropdown-option")];if(!t.length)return;const n=this._listbox.querySelector(".dropdown-option.focused");let s=n?t.indexOf(n)+e:e>0?0:t.length-1;s=Math.max(0,Math.min(t.length-1,s)),n&&n.classList.remove("focused"),t[s].classList.add("focused"),t[s].scrollIntoView({block:"nearest"});const a=t[s].dataset.value;this._select(a)}destroy(){this.close(),this.el.remove()}}class Rn{constructor(e,t,n){this.kind=n,this.onChange=null,this.el=document.createElement("div"),this.el.className="strip-device",this.dropdown=new $(this.el,{title:`Select ${n} device`,placeholder:n==="input"?"Mic...":"Speaker..."}),this.dropdown.onChange=s=>{var a;(a=this.onChange)==null||a.call(this,s)},e.appendChild(this.el)}update(e){const t=this.kind==="input"?e.inputs:e.outputs,n=this.dropdown.value,s=t.map(a=>({value:a.deviceId,label:Xn(a.label,this.kind,a.deviceId)}));this.dropdown.setItems(s),s.some(a=>a.value===n)&&(this.dropdown.value=n)}get value(){return this.dropdown.value}set value(e){this.dropdown.value=e}}function Xn(i,e,t){if(!i)return`${e==="input"?"Mic":"Speaker"} ${t.slice(0,6)}`;let n=i;n=n.replace(/^Default\s*[-\u2013]\s*/i,""),n=n.replace(/^Communications\s*[-\u2013]\s*/i,"");const s=n.match(/^(.{6,}?)\s*\([^)]{15,}\)$/);return s&&(n=s[1].trim()),n||i}class $n{constructor(e){this.container=e,this.onAddInput=null,this.onRemoveInput=null,this.onAddOutput=null,this.onRemoveOutput=null,this.onInputDeviceChange=null,this.onOutputDeviceChange=null,this.onInputGainChange=null,this.onOutputGainChange=null,this.onInputMuteToggle=null,this.onOutputMuteToggle=null,this.onBufferSizeChange=null,this.inputStrips=new Map,this.outputStrips=new Map,this.devices={inputs:[],outputs:[]},this._build()}_build(){this.container.innerHTML="";const e=document.createElement("div");e.className="mixer-panel";const t=document.createElement("div");t.className="mixer-section";const n=document.createElement("div");n.className="section-header";const s=document.createElement("span");s.className="section-title section-title--input",s.textContent="Inputs",n.appendChild(s),this.addInputBtn=document.createElement("button"),this.addInputBtn.className="add-strip-btn",this.addInputBtn.textContent="+ Add Input",this.addInputBtn.addEventListener("click",()=>{var f;return(f=this.onAddInput)==null?void 0:f.call(this)}),n.appendChild(this.addInputBtn),this.inputStripContainer=document.createElement("div"),this.inputStripContainer.className="strip-group",t.appendChild(n),t.appendChild(this.inputStripContainer);const a=document.createElement("div");a.className="routing-visual";const o=document.createElement("div");o.className="routing-line",a.appendChild(o);const r=document.createElement("div");r.className="routing-info";const c=document.createElement("span");c.className="routing-arrow",c.textContent="→",r.appendChild(c),this._latencyWrap=document.createElement("div"),this._latencyWrap.className="latency-wrap",this.latencyEl=document.createElement("span"),this.latencyEl.className="routing-latency",this._latencyWrap.appendChild(this.latencyEl),this._latencyTooltip=document.createElement("div"),this._latencyTooltip.className="latency-tooltip",this._latencyWrap.appendChild(this._latencyTooltip),r.appendChild(this._latencyWrap);const h=document.createElement("span");h.className="routing-arrow",h.textContent="→",r.appendChild(h),a.appendChild(r);const l=document.createElement("div");l.className="routing-line",a.appendChild(l);const d=document.createElement("div");d.className="mixer-section";const u=document.createElement("div");u.className="section-header";const p=document.createElement("span");p.className="section-title section-title--output",p.textContent="Outputs",u.appendChild(p),this.addOutputBtn=document.createElement("button"),this.addOutputBtn.className="add-strip-btn",this.addOutputBtn.textContent="+ Add Output",this.addOutputBtn.addEventListener("click",()=>{var f;return(f=this.onAddOutput)==null?void 0:f.call(this)}),u.appendChild(this.addOutputBtn),this.outputStripContainer=document.createElement("div"),this.outputStripContainer.className="strip-group",d.appendChild(u),d.appendChild(this.outputStripContainer),e.appendChild(t),e.appendChild(a),e.appendChild(d),this.container.appendChild(e),this.container.appendChild(this._buildBufferSizeRow())}_buildBufferSizeRow(){const e=document.createElement("div");e.className="buffer-size-row";const t=document.createElement("span");t.className="buffer-size-label",t.textContent="Buffer Size",e.appendChild(t);const n=document.createElement("div");return n.className="buffer-size-dropdown-wrap",this._bufferDropdown=new $(n,{placeholder:"Auto"}),this._bufferDropdown.setItems([{value:"",label:"Auto (default)"},{value:"64",label:"64 samples"},{value:"128",label:"128 samples"},{value:"256",label:"256 samples"},{value:"512",label:"512 samples"},{value:"1024",label:"1024 samples"}]),this._bufferDropdown.value="",this._bufferDropdown.onChange=s=>{var o;const a=s?parseInt(s,10):null;this._updateBufferEstimate(a),(o=this.onBufferSizeChange)==null||o.call(this,a)},e.appendChild(n),this._bufferEstimate=document.createElement("span"),this._bufferEstimate.className="buffer-size-estimate",e.appendChild(this._bufferEstimate),e}_updateBufferEstimate(e){if(!e){this._bufferEstimate.textContent="";return}const t=e/48e3*1e3;this._bufferEstimate.textContent=`~${t.toFixed(1)} ms at 48kHz`}addInputStrip(e,t){const n=this._createStrip("IN","input",e);return n.deviceSelector.onChange=s=>{var a;return(a=this.onInputDeviceChange)==null?void 0:a.call(this,e,s)},n.slider.addEventListener("input",()=>{var a;const s=parseFloat(n.slider.value);n.gainLabel.textContent=`${Math.round(s*100)}%`,(a=this.onInputGainChange)==null||a.call(this,e,s)}),n.muteBtn.addEventListener("click",()=>{var s;return(s=this.onInputMuteToggle)==null?void 0:s.call(this,e)}),n.removeBtn.addEventListener("click",()=>{var s;return(s=this.onRemoveInput)==null?void 0:s.call(this,e)}),n.deviceSelector.update(this.devices),t&&(n.deviceSelector.value=t),this.inputStripContainer.appendChild(n.el),this.inputStrips.set(e,n),this._updateRemoveButtons(),n}removeInputStrip(e){const t=this.inputStrips.get(e);t&&(t.el.remove(),this.inputStrips.delete(e),this._updateRemoveButtons())}addOutputStrip(e,t){const n=this._createStrip("OUT","output",e);return n.deviceSelector.onChange=s=>{var a;return(a=this.onOutputDeviceChange)==null?void 0:a.call(this,e,s)},n.slider.addEventListener("input",()=>{var a;const s=parseFloat(n.slider.value);n.gainLabel.textContent=`${Math.round(s*100)}%`,(a=this.onOutputGainChange)==null||a.call(this,e,s)}),n.muteBtn.addEventListener("click",()=>{var s;return(s=this.onOutputMuteToggle)==null?void 0:s.call(this,e)}),n.removeBtn.addEventListener("click",()=>{var s;return(s=this.onRemoveOutput)==null?void 0:s.call(this,e)}),n.deviceSelector.update(this.devices),t&&(n.deviceSelector.value=t),this.outputStripContainer.appendChild(n.el),this.outputStrips.set(e,n),this._updateRemoveButtons(),n}removeOutputStrip(e){const t=this.outputStrips.get(e);t&&(t.el.remove(),this.outputStrips.delete(e),this._updateRemoveButtons())}_createStrip(e,t,n){const s=document.createElement("div");s.className="mixer-strip",s.dataset.channelId=n,s.dataset.kind=t;const a=document.createElement("div");a.className="strip-label",a.textContent=e,s.appendChild(a);const o=new Rn(s,e,t),r=document.createElement("canvas");r.className="meter-canvas",r.width=12,r.height=40,s.appendChild(r);const c=document.createElement("input");c.type="range",c.className="gain-slider",c.min="0",c.max="2",c.step="0.01",c.value="1",s.appendChild(c);const h=document.createElement("div");h.className="gain-value",h.textContent="100%",s.appendChild(h);const l=document.createElement("button");l.className="mute-btn",l.textContent="M",s.appendChild(l);const d=document.createElement("button");return d.className="remove-btn",d.textContent="×",d.title="Remove",s.appendChild(d),{el:s,deviceSelector:o,meterCanvas:r,slider:c,gainLabel:h,muteBtn:l,removeBtn:d}}_updateRemoveButtons(){const e=this.inputStrips.size<=1;for(const n of this.inputStrips.values())n.removeBtn.style.display=e?"none":"";const t=this.outputStrips.size<=1;for(const n of this.outputStrips.values())n.removeBtn.style.display=t?"none":""}setInputMuted(e,t){const n=this.inputStrips.get(e);n&&n.muteBtn.classList.toggle("muted",t)}setInputDevice(e,t){const n=this.inputStrips.get(e);n&&t&&(n.deviceSelector.value=t)}setOutputMuted(e,t){const n=this.outputStrips.get(e);n&&n.muteBtn.classList.toggle("muted",t)}updateDevices(e){this.devices=e;for(const t of this.inputStrips.values())t.deviceSelector.update(e);for(const t of this.outputStrips.values())t.deviceSelector.update(e)}updateLatency(e,t,n){let s=`${e.toFixed(1)} ms`;const a=t!==void 0&&this.outputStrips.size>1;if(a&&(s+=` (+${t.toFixed(1)} ms bridge)`),this.latencyEl.textContent=s,n){let o=`Base latency: ${n.baseMs.toFixed(1)} ms
`;o+=`Output latency: ${n.outputMs.toFixed(1)} ms
`,a&&(o+=`Bridge latency: ${t.toFixed(1)} ms
`);const r=n.baseMs+n.outputMs+(a?t:0);o+=`Total: ${r.toFixed(1)} ms`,this._latencyTooltip.textContent=o}}}const Ge=-60,Ft=0,Ct=1500,Qn=20;class tn{constructor(e){this.canvas=e,this.canvasCtx=e.getContext("2d"),this.peakHoldDb=Ge,this.peakHoldTime=0,this.lastPeakDb=Ge}draw(e,t){const n=performance.now(),s=this.canvasCtx,a=this.canvas.width,o=this.canvas.height;if(t>=this.peakHoldDb)this.peakHoldDb=t,this.peakHoldTime=n;else if(n-this.peakHoldTime>Ct){const p=(n-this.peakHoldTime-Ct)/1e3;this.peakHoldDb=Math.max(t,this.peakHoldDb-Qn*p)}s.fillStyle="#0f0f1a",s.fillRect(0,0,a,o);const c=this._dbToNorm(e)*o,h=o-c,l=s.createLinearGradient(0,o,0,0);l.addColorStop(0,"#00e676"),l.addColorStop(.6,"#00e676"),l.addColorStop(.8,"#ffea00"),l.addColorStop(.95,"#ff1744"),l.addColorStop(1,"#ff1744"),s.fillStyle=l,s.fillRect(2,h,a-4,c);const d=this._dbToNorm(this.peakHoldDb),u=o-d*o;s.fillStyle="#ffffff",s.fillRect(1,u-1,a-2,2),s.fillStyle="rgba(255,255,255,0.15)";for(const p of[-6,-12,-24,-48]){const f=this._dbToNorm(p),B=o-f*o;s.fillRect(0,B,a,1)}}_dbToNorm(e){return(Math.max(Ge,Math.min(Ft,e))-Ge)/(Ft-Ge)}}const Hn=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],ot=440,rt=69;function ze(i){return Math.round(12*Math.log2(i/ot)+rt)}function re(i){return ot*Math.pow(2,(i-rt)/12)}function Le(i){const e=Hn[i%12],t=Math.floor(i/12)-1;return{name:e,octave:t}}function nn(i){const e=12*Math.log2(i/ot)+rt,t=Math.round(e);return(e-t)*100}function qn(i){if(!i||i<20||i>1e4)return null;const e=ze(i),{name:t,octave:n}=Le(e),s=nn(i),a=re(e);return{name:t,octave:n,midi:e,cents:s,frequency:i,expectedFreq:a}}class Wn{constructor(e){this.container=e,this._build(),this._lastNote=null}_build(){this.container.innerHTML="";const e=document.createElement("div");e.className="pitch-display";const t=document.createElement("div");t.className="pitch-left",this.noteEl=document.createElement("div"),this.noteEl.className="pitch-note inactive",this.noteEl.innerHTML="&mdash;",t.appendChild(this.noteEl),this.freqEl=document.createElement("div"),this.freqEl.className="pitch-frequency",this.freqEl.textContent="--- Hz",t.appendChild(this.freqEl),e.appendChild(t);const n=document.createElement("div");n.className="cents-gauge";const s=document.createElement("div");s.className="cents-bar-bg";const a=document.createElement("div");a.className="cents-center-line",s.appendChild(a),this.indicator=document.createElement("div"),this.indicator.className="cents-indicator",s.appendChild(this.indicator),n.appendChild(s);const o=document.createElement("div");o.className="cents-labels",o.innerHTML="<span>-50</span><span>0</span><span>+50</span>",n.appendChild(o),this.centsValueEl=document.createElement("div"),this.centsValueEl.className="cents-value",this.centsValueEl.textContent="",n.appendChild(this.centsValueEl),e.appendChild(n),this.container.appendChild(e)}update(e){if(!e){this.noteEl.classList.add("inactive");return}const t=qn(e);if(!t){this.noteEl.classList.add("inactive");return}this.noteEl.classList.remove("inactive"),this.noteEl.innerHTML=`${t.name}<span class="octave">${t.octave}</span>`,this.freqEl.textContent=`${t.frequency.toFixed(1)} Hz`;const n=t.cents,a=50+Math.max(-50,Math.min(50,n))/50*50;this.indicator.style.left=`${a}%`;const o=Math.abs(n);let r;o<5?r="var(--green)":o<15?r="var(--yellow)":r="var(--red)",this.indicator.style.background=r;const c=n>=0?"+":"";this.centsValueEl.textContent=`${c}${n.toFixed(1)} cents`,this.centsValueEl.style.color=r}}const ae=440,L=i=>ae*Math.pow(2,i/12),te={"violin-standard":{label:"Violin (GDAE)",family:"Violin",strings:[{name:"G",note:"G",octave:3,frequency:L(-14)},{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"A",note:"A",octave:4,frequency:ae},{name:"E",note:"E",octave:5,frequency:L(7)}]},"violin-drop-g":{label:"Violin Drop G (GDGD)",family:"Violin",strings:[{name:"G",note:"G",octave:3,frequency:L(-14)},{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"G",note:"G",octave:4,frequency:L(-2)},{name:"D",note:"D",octave:5,frequency:L(5)}]},"violin-cross":{label:"Violin Cross (AEAE)",family:"Violin",strings:[{name:"A",note:"A",octave:3,frequency:L(-12)},{name:"E",note:"E",octave:4,frequency:L(-5)},{name:"A",note:"A",octave:4,frequency:ae},{name:"E",note:"E",octave:5,frequency:L(7)}]},"5string-violin":{label:"5-String Violin (CGDAE)",family:"Violin",strings:[{name:"C",note:"C",octave:3,frequency:L(-21)},{name:"G",note:"G",octave:3,frequency:L(-14)},{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"A",note:"A",octave:4,frequency:ae},{name:"E",note:"E",octave:5,frequency:L(7)}]},"viola-standard":{label:"Viola (CGDA)",family:"Viola",strings:[{name:"C",note:"C",octave:3,frequency:L(-21)},{name:"G",note:"G",octave:3,frequency:L(-14)},{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"A",note:"A",octave:4,frequency:ae}]},"cello-standard":{label:"Cello (CGDA)",family:"Cello",strings:[{name:"C",note:"C",octave:2,frequency:L(-33)},{name:"G",note:"G",octave:2,frequency:L(-26)},{name:"D",note:"D",octave:3,frequency:L(-19)},{name:"A",note:"A",octave:3,frequency:L(-12)}]},"bass-standard":{label:"Double Bass (EADG)",family:"Double Bass",strings:[{name:"E",note:"E",octave:1,frequency:L(-41)},{name:"A",note:"A",octave:1,frequency:L(-36)},{name:"D",note:"D",octave:2,frequency:L(-31)},{name:"G",note:"G",octave:2,frequency:L(-26)}]},"bass-5string":{label:"5-String Bass (BEADG)",family:"Double Bass",strings:[{name:"B",note:"B",octave:0,frequency:L(-46)},{name:"E",note:"E",octave:1,frequency:L(-41)},{name:"A",note:"A",octave:1,frequency:L(-36)},{name:"D",note:"D",octave:2,frequency:L(-31)},{name:"G",note:"G",octave:2,frequency:L(-26)}]},"fiddle-open-g":{label:"Fiddle Open G (GDGB)",family:"Fiddle",strings:[{name:"G",note:"G",octave:3,frequency:L(-14)},{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"G",note:"G",octave:4,frequency:L(-2)},{name:"B",note:"B",octave:4,frequency:L(2)}]},"fiddle-open-d":{label:"Fiddle Open D (DADF#)",family:"Fiddle",strings:[{name:"D",note:"D",octave:3,frequency:L(-19)},{name:"A",note:"A",octave:3,frequency:L(-12)},{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"F#",note:"F#",octave:4,frequency:L(-3)}]},"fiddle-calico":{label:"Fiddle Calico (AEAC#)",family:"Fiddle",strings:[{name:"A",note:"A",octave:3,frequency:L(-12)},{name:"E",note:"E",octave:4,frequency:L(-5)},{name:"A",note:"A",octave:4,frequency:ae},{name:"C#",note:"C#",octave:5,frequency:L(4)}]},hardingfele:{label:"Hardingfele (ADAE)",family:"Hardanger",strings:[{name:"A",note:"A",octave:3,frequency:L(-12)},{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"A",note:"A",octave:4,frequency:ae},{name:"E",note:"E",octave:5,frequency:L(7)}]},erhu:{label:"Erhu (DA)",family:"Erhu",strings:[{name:"D",note:"D",octave:4,frequency:L(-7)},{name:"A",note:"A",octave:4,frequency:ae}]}},Fe="violin-standard";class Vn{constructor(e){this.container=e,this.currentTuning=Fe,this.currentFrequency=null,this.onTuningChange=null,this._build()}_build(){this.container.innerHTML="";const e=document.createElement("div");e.className="tuning-panel";const t=document.createElement("div");t.className="tuning-header";const n=document.createElement("span");n.className="tuning-label",n.textContent="Tuning",t.appendChild(n);const s=document.createElement("div");s.className="tuning-select-wrap",this.presetDropdown=new $(s,{placeholder:"Select tuning..."});const a={};for(const[r,c]of Object.entries(te))a[c.family]||(a[c.family]=[]),a[c.family].push({key:r,preset:c});const o=[];for(const[r,c]of Object.entries(a))o.push({label:r,items:c.map(({key:h,preset:l})=>({value:h,label:l.label}))});this.presetDropdown.setGroupedItems(o),this.presetDropdown.value=Fe,this.presetDropdown.onChange=r=>{this.currentTuning=r,this._renderStrings(),this.onTuningChange&&this.onTuningChange(this.currentTuning)},t.appendChild(s),e.appendChild(t),this.stringsContainer=document.createElement("div"),this.stringsContainer.className="tuning-strings",e.appendChild(this.stringsContainer),this.container.appendChild(e),this._renderStrings()}_renderStrings(){const e=te[this.currentTuning];if(e){this.stringsContainer.innerHTML="",this.stringEls=[];for(const t of e.strings){const n=document.createElement("div");n.className="tuning-string";const s=document.createElement("div");s.className="tuning-string-note",s.textContent=t.name,n.appendChild(s);const a=document.createElement("div");a.className="tuning-string-octave",a.textContent=t.octave,n.appendChild(a);const o=document.createElement("div");o.className="tuning-string-freq",o.textContent=`${t.frequency.toFixed(1)} Hz`,n.appendChild(o);const r=document.createElement("div");r.className="tuning-string-indicator",n.appendChild(r),this.stringsContainer.appendChild(n),this.stringEls.push({el:n,indicator:r,frequency:t.frequency,note:t.name})}}}update(e){if(this.currentFrequency=e,!te[this.currentTuning]||!this.stringEls)return;for(const o of this.stringEls)o.el.classList.remove("active","in-tune","close","off"),o.indicator.textContent="";if(!e)return;let n=null,s=1/0;for(const o of this.stringEls){const r=1200*Math.log2(e/o.frequency);Math.abs(r)<Math.abs(s)&&(s=r,n=o)}if(!n||Math.abs(s)>100)return;n.el.classList.add("active");const a=Math.abs(s);a<5?(n.el.classList.add("in-tune"),n.indicator.textContent="✓"):a<15?(n.el.classList.add("close"),n.indicator.textContent=s>0?"↑":"↓"):(n.el.classList.add("off"),n.indicator.textContent=s>0?"↑↑":"↓↓")}}const jn=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],yt=13;function sn(i){const e=12*Math.log2(i/440);return(Math.round(e)%12+12+9)%12}function Jn(i){return jn[sn(i)]}class Un{constructor(e){this.container=e,this.currentTuning=Fe,this.rows=[],this._scaleData=null,this._build(),this.setTuning(Fe)}_build(){this.el=document.createElement("div"),this.el.className="fingerboard",this.container.appendChild(this.el)}setTuning(e){this.currentTuning=e;const t=te[e];if(t){this.el.innerHTML="",this.rows=[];for(const n of t.strings){const s=document.createElement("div");s.className="fb-string-row";const a=document.createElement("span");a.className="fb-string-label",a.textContent=n.name,s.appendChild(a);const o=[];for(let r=0;r<yt;r++){const c=document.createElement("span");c.className="fb-position",r===0&&c.classList.add("open");const h=n.frequency*Math.pow(2,r/12),l=Jn(h),d=sn(h);c.title=r===0?`${n.name} (open)`:l,c.setAttribute("data-note",r===0?n.name:l),c.dataset.pitchClass=d,s.appendChild(c),o.push(c)}this.el.appendChild(s),this.rows.push({el:s,positions:o,frequency:n.frequency})}this._applyScaleHighlights()}}setScale(e){this._scaleData=e,this._applyScaleHighlights()}_applyScaleHighlights(){for(const e of this.rows)for(const t of e.positions){if(t.classList.remove("scale-tone","scale-root"),!this._scaleData)continue;const n=parseInt(t.dataset.pitchClass,10);this._scaleData.pitchClasses.has(n)&&(t.classList.add("scale-tone"),n===this._scaleData.root&&t.classList.add("scale-root"))}}update(e){for(const a of this.rows){a.el.classList.remove("bowed");for(const o of a.positions)o.classList.remove("active")}if(!e)return;let t=null,n=-1,s=1/0;for(const a of this.rows){const o=12*Math.log2(e/a.frequency);if(o<-.5||o>12.5)continue;const r=Math.round(o);if(r<0||r>=yt)continue;const c=Math.abs(o-r);c<s&&(s=c,t=a,n=r)}t&&n>=0&&(t.el.classList.add("bowed"),t.positions[n].classList.add("active"))}setTrainerTarget(e,t){for(const n of this.rows)for(const s of n.positions)s.classList.remove("trainer-target");if(e>=0&&e<this.rows.length){const n=this.rows[e].positions[t];n&&n.classList.add("trainer-target")}}markTrainerHit(e,t){if(e<0||e>=this.rows.length)return;const n=this.rows[e].positions[t];n&&(n.classList.remove("trainer-target"),n.classList.add("trainer-hit"),setTimeout(()=>{n.classList.remove("trainer-hit"),n.classList.add("trainer-done")},300))}clearTrainerState(){for(const e of this.rows)for(const t of e.positions)t.classList.remove("trainer-target","trainer-hit","trainer-done")}}const Yn=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],Zn=["Violin","Viola","Cello","Double Bass","Fiddle","Hardanger","Erhu"],Ye={major:{label:"Major (Ionian)",intervals:[0,2,4,5,7,9,11],difficulty:1,instruments:["Violin","Viola","Cello","Double Bass","Fiddle","Hardanger","Erhu"]},"natural-minor":{label:"Natural Minor (Aeolian)",intervals:[0,2,3,5,7,8,10],difficulty:1,instruments:["Violin","Viola","Cello","Double Bass","Fiddle","Hardanger","Erhu"]},"major-pentatonic":{label:"Major Pentatonic",intervals:[0,2,4,7,9],difficulty:1,instruments:["Violin","Viola","Cello","Double Bass","Fiddle","Erhu"]},"minor-pentatonic":{label:"Minor Pentatonic",intervals:[0,3,5,7,10],difficulty:1,instruments:["Violin","Viola","Cello","Double Bass","Fiddle","Erhu"]},"harmonic-minor":{label:"Harmonic Minor",intervals:[0,2,3,5,7,8,11],difficulty:2,instruments:["Violin","Viola","Cello","Double Bass","Fiddle","Hardanger","Erhu"]},"melodic-minor":{label:"Melodic Minor",intervals:[0,2,3,5,7,9,11],difficulty:2,instruments:["Violin","Viola","Cello","Double Bass"]},dorian:{label:"Dorian",intervals:[0,2,3,5,7,9,10],difficulty:2,instruments:["Violin","Viola","Cello","Double Bass","Fiddle"]},mixolydian:{label:"Mixolydian",intervals:[0,2,4,5,7,9,10],difficulty:2,instruments:["Violin","Viola","Cello","Fiddle"]},blues:{label:"Blues",intervals:[0,3,5,6,7,10],difficulty:2,instruments:["Violin","Viola","Cello","Double Bass","Fiddle","Erhu"]},phrygian:{label:"Phrygian",intervals:[0,1,3,5,7,8,10],difficulty:3,instruments:["Violin","Viola","Cello","Double Bass","Fiddle"]},lydian:{label:"Lydian",intervals:[0,2,4,6,7,9,11],difficulty:3,instruments:["Violin","Viola","Cello","Double Bass"]},locrian:{label:"Locrian",intervals:[0,1,3,5,6,8,10],difficulty:4,instruments:["Violin","Viola","Cello","Double Bass"]},"whole-tone":{label:"Whole Tone",intervals:[0,2,4,6,8,10],difficulty:3,instruments:["Violin","Viola","Cello"]},"diminished-hw":{label:"Diminished (H-W)",intervals:[0,1,3,4,6,7,9,10],difficulty:4,instruments:["Violin","Viola","Cello"]},"diminished-wh":{label:"Diminished (W-H)",intervals:[0,2,3,5,6,8,9,11],difficulty:4,instruments:["Violin","Viola","Cello"]},chromatic:{label:"Chromatic",intervals:[0,1,2,3,4,5,6,7,8,9,10,11],difficulty:3,instruments:["Violin","Viola","Cello","Double Bass","Fiddle","Hardanger","Erhu"]}},es=Yn.map((i,e)=>({value:String(e),label:i}));function an(i,e){const t=Ye[e];return t?{pitchClasses:new Set(t.intervals.map(s=>(i+s)%12)),root:i}:null}const ts=["","Beginner","Easy","Intermediate","Advanced","Expert"];function ns(i){return ts[i]||""}const ss=["","●","●●","●●●","●●●●","●●●●●"];class is{constructor(e){this.container=e,this.onScaleChange=null,this._rootPitchClass=0,this._scaleKey="",this._instrumentFilter="",this._build()}get scaleKey(){return this._scaleKey}get rootPitchClass(){return this._rootPitchClass}_build(){this.container.replaceChildren();const e=document.createElement("div");e.className="scale-panel";const t=document.createElement("div");t.className="scale-header";const n=document.createElement("span");n.className="scale-label",n.textContent="Scale",t.appendChild(n);const s=document.createElement("div");s.className="scale-root-wrap",this._rootDropdown=new $(s,{placeholder:"Root"}),this._rootDropdown.setItems(es),this._rootDropdown.value="0",this._rootDropdown.onChange=c=>{this._rootPitchClass=parseInt(c,10),this._emitChange()},t.appendChild(s);const a=document.createElement("div");a.className="scale-inst-wrap",this._instDropdown=new $(a,{placeholder:"All instruments"}),this._instDropdown.setItems([{value:"",label:"All instruments"},...Zn.map(c=>({value:c,label:c}))]),this._instDropdown.value="",this._instDropdown.onChange=c=>{this._instrumentFilter=c,this._rebuildScaleDropdown()},t.appendChild(a),e.appendChild(t);const o=document.createElement("div");o.className="scale-row";const r=document.createElement("div");r.className="scale-type-wrap",this._scaleDropdown=new $(r,{placeholder:"Off"}),o.appendChild(r),this._diffBadge=document.createElement("span"),this._diffBadge.className="scale-difficulty",o.appendChild(this._diffBadge),this._scaleDropdown.onChange=c=>{this._scaleKey=c,this._updateDiffBadge(),this._emitChange()},e.appendChild(o),this.container.appendChild(e),this._rebuildScaleDropdown()}_rebuildScaleDropdown(){const e=this._scaleKey,t=[{value:"",label:"Off"}];for(const[n,s]of Object.entries(Ye)){if(this._instrumentFilter&&!s.instruments.includes(this._instrumentFilter))continue;const a=ss[s.difficulty]||"";t.push({value:n,label:`${s.label}  ${a}`})}this._scaleDropdown.setItems(t),t.some(n=>n.value===e)?(this._scaleDropdown.value=e,this._scaleKey=e):(this._scaleDropdown.value="",this._scaleKey=""),this._updateDiffBadge(),this._emitChange()}_updateDiffBadge(){const e=Ye[this._scaleKey];if(!e){this._diffBadge.textContent="",this._diffBadge.className="scale-difficulty";return}const t=ns(e.difficulty);this._diffBadge.textContent=t,this._diffBadge.className="scale-difficulty",this._diffBadge.classList.add(`diff-${e.difficulty}`)}_emitChange(){var t,n;if(!this._scaleKey){(t=this.onScaleChange)==null||t.call(this,null);return}const e=an(this._rootPitchClass,this._scaleKey);(n=this.onScaleChange)==null||n.call(this,e)}}class as{constructor(e){this.container=e,this.onStart=null,this.onTargetChange=null,this.onHit=null,this.onComplete=null,this.onStop=null,this._octaves=1,this._direction="asc",this._tolerance=20,this._state="idle",this._sequence=[],this._currentIndex=0,this._consecutiveHits=0,this._hits=0,this._misses=0,this._centsSum=0,this._centsCount=0,this._wrongNoteFrames=0,this._lastWrongMidi=-1,this._startTime=0,this._build()}get active(){return this._state==="playing"}get octaves(){return this._octaves}get direction(){return this._direction}get tolerance(){return this._tolerance}_build(){this.container.replaceChildren();const e=document.createElement("div");e.className="trainer-panel";const t=document.createElement("div");t.className="trainer-header";const n=document.createElement("span");n.className="trainer-label",n.textContent="Scale Trainer",t.appendChild(n),e.appendChild(t);const s=document.createElement("div");s.className="trainer-config";const a=document.createElement("div");a.className="trainer-config-item";const o=document.createElement("span");o.className="trainer-config-label",o.textContent="Octaves",a.appendChild(o);const r=document.createElement("div");r.className="trainer-config-wrap trainer-config-wrap--small",this._octavesDropdown=new $(r,{placeholder:"1"}),this._octavesDropdown.setItems([{value:"1",label:"1"},{value:"2",label:"2"},{value:"3",label:"3"}]),this._octavesDropdown.value="1",this._octavesDropdown.onChange=A=>{this._octaves=parseInt(A,10)},a.appendChild(r),s.appendChild(a);const c=document.createElement("div");c.className="trainer-config-item";const h=document.createElement("span");h.className="trainer-config-label",h.textContent="Direction",c.appendChild(h);const l=document.createElement("div");l.className="trainer-config-wrap",this._directionDropdown=new $(l,{placeholder:"Ascending"}),this._directionDropdown.setItems([{value:"asc",label:"Ascending"},{value:"desc",label:"Descending"},{value:"both",label:"Both"}]),this._directionDropdown.value="asc",this._directionDropdown.onChange=A=>{this._direction=A},c.appendChild(l),s.appendChild(c);const d=document.createElement("div");d.className="trainer-config-item";const u=document.createElement("span");u.className="trainer-config-label",u.textContent="Tolerance",d.appendChild(u);const p=document.createElement("div");p.className="trainer-config-wrap",this._toleranceDropdown=new $(p,{placeholder:"20 cents"}),this._toleranceDropdown.setItems([{value:"10",label:"10 cents"},{value:"20",label:"20 cents"},{value:"30",label:"30 cents"},{value:"50",label:"50 cents"}]),this._toleranceDropdown.value="20",this._toleranceDropdown.onChange=A=>{this._tolerance=parseInt(A,10)},d.appendChild(p),s.appendChild(d),e.appendChild(s);const f=document.createElement("div");f.className="trainer-btn-row",this._startBtn=document.createElement("button"),this._startBtn.className="trainer-start-btn",this._startBtn.textContent="Start Practice",this._startBtn.addEventListener("click",()=>this._handleStart()),f.appendChild(this._startBtn),this._stopBtn=document.createElement("button"),this._stopBtn.className="trainer-stop-btn trainer-hidden",this._stopBtn.textContent="Stop",this._stopBtn.addEventListener("click",()=>this._handleStop()),f.appendChild(this._stopBtn),e.appendChild(f),this._progressRow=document.createElement("div"),this._progressRow.className="trainer-progress trainer-hidden";const B=document.createElement("div");B.className="trainer-progress-bar",this._progressFill=document.createElement("div"),this._progressFill.className="trainer-progress-fill",B.appendChild(this._progressFill),this._progressRow.appendChild(B),this._progressText=document.createElement("span"),this._progressText.className="trainer-progress-text",this._progressRow.appendChild(this._progressText),e.appendChild(this._progressRow),this._targetDisplay=document.createElement("div"),this._targetDisplay.className="trainer-target-display trainer-hidden",this._targetNote=document.createElement("div"),this._targetNote.className="trainer-target-note",this._targetDisplay.appendChild(this._targetNote),this._targetInstruction=document.createElement("div"),this._targetInstruction.className="trainer-target-instruction",this._targetInstruction.textContent="Play this note",this._targetDisplay.appendChild(this._targetInstruction),e.appendChild(this._targetDisplay),this._statsRow=document.createElement("div"),this._statsRow.className="trainer-stats trainer-hidden",this._hitsStat=this._createStat("0","Hits","hits"),this._missesStat=this._createStat("0","Misses","misses"),this._accuracyStat=this._createStat("-","Accuracy",""),this._centsStat=this._createStat("-","Avg Cents",""),this._statsRow.appendChild(this._hitsStat.el),this._statsRow.appendChild(this._missesStat.el),this._statsRow.appendChild(this._accuracyStat.el),this._statsRow.appendChild(this._centsStat.el),e.appendChild(this._statsRow),this._summaryEl=document.createElement("div"),this._summaryEl.className="trainer-summary trainer-hidden",e.appendChild(this._summaryEl),this.container.appendChild(e)}_createStat(e,t,n){const s=document.createElement("div");s.className="trainer-stat";const a=document.createElement("div");a.className="trainer-stat-value"+(n?` ${n}`:""),a.textContent=e,s.appendChild(a);const o=document.createElement("div");return o.className="trainer-stat-label",o.textContent=t,s.appendChild(o),{el:s,valEl:a}}_handleStart(){var e;this._state==="complete"&&this._summaryEl.classList.add("trainer-hidden"),(e=this.onStart)==null||e.call(this)}_handleStop(){var e;this._state="idle",this._updateUI(),(e=this.onStop)==null||e.call(this)}beginSession(e){!e||e.length===0||(this._sequence=e,this._currentIndex=0,this._consecutiveHits=0,this._hits=0,this._misses=0,this._centsSum=0,this._centsCount=0,this._wrongNoteFrames=0,this._lastWrongMidi=-1,this._startTime=performance.now(),this._state="playing",this._updateUI(),this._emitTarget())}update(e){var a;if(this._state!=="playing")return;const t=this._sequence[this._currentIndex];if(!t)return;if(!e||e<20){this._consecutiveHits=0;return}const n=ze(e),s=nn(e);n===t.midi&&Math.abs(s)<=this._tolerance?(this._consecutiveHits++,this._consecutiveHits>=3&&(this._hits++,this._centsSum+=Math.abs(s),this._centsCount++,(a=this.onHit)==null||a.call(this,t),this._advance())):(this._consecutiveHits=0,n!==t.midi&&e>20&&(n===this._lastWrongMidi?(this._wrongNoteFrames++,this._wrongNoteFrames>=5&&(this._misses++,this._wrongNoteFrames=0,this._lastWrongMidi=-1,this._updateStats())):(this._lastWrongMidi=n,this._wrongNoteFrames=1)))}_advance(){var e,t;this._currentIndex++,this._consecutiveHits=0,this._wrongNoteFrames=0,this._lastWrongMidi=-1,this._currentIndex>=this._sequence.length?(this._state="complete",this._updateUI(),this._showSummary(),(e=this.onComplete)==null||e.call(this,{hits:this._hits,misses:this._misses,accuracy:this._getAccuracy(),avgCents:this._getAvgCents(),elapsed:performance.now()-this._startTime}),(t=this.onStop)==null||t.call(this)):(this._updateStats(),this._updateProgress(),this._emitTarget())}_emitTarget(){var t;if(this._currentIndex>=this._sequence.length)return;const e=this._sequence[this._currentIndex];if(e){this._targetNote.textContent="",this._targetNote.appendChild(document.createTextNode(e.noteName));const n=document.createElement("span");n.className="octave",n.textContent=e.octave,this._targetNote.appendChild(n),(t=this.onTargetChange)==null||t.call(this,e)}}_getAccuracy(){const e=this._hits+this._misses;return e===0?0:Math.round(this._hits/e*100)}_getAvgCents(){return this._centsCount===0?0:(this._centsSum/this._centsCount).toFixed(1)}_updateStats(){this._hitsStat.valEl.textContent=this._hits,this._missesStat.valEl.textContent=this._misses;const e=this._hits+this._misses;this._accuracyStat.valEl.textContent=e>0?`${this._getAccuracy()}%`:"-",this._centsStat.valEl.textContent=this._centsCount>0?`${this._getAvgCents()}c`:"-"}_updateProgress(){const e=this._sequence.length,t=this._currentIndex,n=e>0?t/e*100:0;this._progressFill.style.width=`${n}%`,this._progressText.textContent=`${t} / ${e}`}_updateUI(){const e=this._state==="idle",t=this._state==="playing",n=this._state==="complete";this._startBtn.textContent=n?"Restart":"Start Practice",this._startBtn.classList.toggle("trainer-hidden",t),this._stopBtn.classList.toggle("trainer-hidden",!t),this._progressRow.classList.toggle("trainer-hidden",e),t&&this._updateProgress(),n&&(this._progressFill.style.width="100%",this._progressText.textContent=`${this._sequence.length} / ${this._sequence.length}`),this._targetDisplay.classList.toggle("trainer-hidden",!t),this._statsRow.classList.toggle("trainer-hidden",e),(t||n)&&this._updateStats(),n||this._summaryEl.classList.add("trainer-hidden")}_showSummary(){const e=performance.now()-this._startTime,t=Math.round(e/1e3),n=Math.floor(t/60),s=t%60,a=n>0?`${n}m ${s}s`:`${s}s`;this._summaryEl.replaceChildren(),this._summaryEl.classList.remove("trainer-hidden");const o=document.createElement("div");o.className="trainer-summary-title",o.textContent="Practice Complete!",this._summaryEl.appendChild(o);const r=document.createElement("div");r.className="trainer-summary-stats";const c=[{value:`${this._getAccuracy()}%`,label:"Accuracy"},{value:`${this._getAvgCents()}c`,label:"Avg Deviation"},{value:`${this._hits}`,label:"Hits"},{value:`${this._misses}`,label:"Misses"},{value:a,label:"Time"}];for(const h of c){const l=document.createElement("div");l.className="trainer-summary-stat";const d=document.createElement("div");d.className="trainer-summary-stat-value",d.textContent=h.value,l.appendChild(d);const u=document.createElement("div");u.className="trainer-summary-stat-label",u.textContent=h.label,l.appendChild(u),r.appendChild(l)}this._summaryEl.appendChild(r)}}function os(i,e,t,n={}){const{octaves:s=1,direction:a="asc"}=n,o=te[i];if(!o)return[];const r=an(e,t);if(!r)return[];const{pitchClasses:c}=r,h=[];for(let A=0;A<o.strings.length;A++){const C=o.strings[A];for(let M=0;M<=12;M++){const k=C.frequency*Math.pow(2,M/12),z=ze(k),g=z%12;if(c.has(g)){const{name:G,octave:F}=Le(z);h.push({midi:z,freq:re(z),noteName:G,octave:F,pitchClass:g,stringIndex:A,positionIndex:M})}}}if(h.length===0)return[];h.sort((A,C)=>A.midi-C.midi);const l=[];let d=-1;for(const A of h)A.midi!==d&&(l.push(A),d=A.midi);const u=l.filter(A=>A.pitchClass===e);if(u.length===0)return l;const p=u[0].midi,f=p+s*12,B=l.filter(A=>A.midi>=p&&A.midi<=f);if(B.length===0)return[];if(a==="desc")return B.slice().reverse();if(a==="both"){const A=B.slice(),C=B.slice().reverse().slice(1);return A.concat(C)}return B.slice()}const vt=[{value:"2/4",label:"2/4",beats:2},{value:"3/4",label:"3/4",beats:3},{value:"4/4",label:"4/4",beats:4},{value:"5/4",label:"5/4",beats:5},{value:"6/8",label:"6/8",beats:6},{value:"7/8",label:"7/8",beats:7},{value:"9/8",label:"9/8",beats:9},{value:"12/8",label:"12/8",beats:12}];class rs{constructor(e){this.container=e,this.onStart=null,this.onStop=null,this.onBpmChange=null,this.onTimeSigChange=null,this.onVolumeChange=null,this._bpm=120,this._beats=4,this._playing=!1,this._beatDots=[],this._build()}get bpm(){return this._bpm}get beats(){return this._beats}_build(){this.container.replaceChildren();const e=document.createElement("div");e.className="metronome-panel";const t=document.createElement("div");t.className="metronome-header";const n=document.createElement("span");n.className="metronome-label",n.textContent="Metronome",t.appendChild(n),this._playBtn=document.createElement("button"),this._playBtn.className="metronome-play-btn",this._playBtn.textContent="▶",this._playBtn.title="Start / Stop",this._playBtn.addEventListener("click",()=>{var u,p;this._playing?(this._playing=!1,this._playBtn.textContent="▶",this._playBtn.classList.remove("active"),this._clearBeatDots(),(u=this.onStop)==null||u.call(this)):(this._playing=!0,this._playBtn.textContent="■",this._playBtn.classList.add("active"),(p=this.onStart)==null||p.call(this))}),t.appendChild(this._playBtn),e.appendChild(t);const s=document.createElement("div");s.className="metronome-controls";const a=document.createElement("div");a.className="metronome-bpm-group";const o=document.createElement("button");o.className="metronome-bpm-btn",o.textContent="−",o.addEventListener("click",()=>this._setBpm(this._bpm-1)),a.appendChild(o),this._bpmSlider=document.createElement("input"),this._bpmSlider.type="range",this._bpmSlider.className="metronome-bpm-slider",this._bpmSlider.min="40",this._bpmSlider.max="220",this._bpmSlider.value=String(this._bpm),this._bpmSlider.addEventListener("input",()=>{this._setBpm(parseInt(this._bpmSlider.value,10))}),a.appendChild(this._bpmSlider),this._bpmDisplay=document.createElement("input"),this._bpmDisplay.type="text",this._bpmDisplay.className="metronome-bpm-display",this._bpmDisplay.value=String(this._bpm),this._bpmDisplay.addEventListener("change",()=>{const u=parseInt(this._bpmDisplay.value,10);isNaN(u)?this._bpmDisplay.value=String(this._bpm):this._setBpm(u)}),this._bpmDisplay.addEventListener("keydown",u=>{u.key==="Enter"&&this._bpmDisplay.blur()}),a.appendChild(this._bpmDisplay);const r=document.createElement("span");r.className="metronome-bpm-unit",r.textContent="BPM",a.appendChild(r);const c=document.createElement("button");c.className="metronome-bpm-btn",c.textContent="+",c.addEventListener("click",()=>this._setBpm(this._bpm+1)),a.appendChild(c),s.appendChild(a);const h=document.createElement("div");h.className="metronome-timesig-wrap",this._timeSigDropdown=new $(h,{placeholder:"4/4"}),this._timeSigDropdown.setItems(vt.map(u=>({value:u.value,label:u.label}))),this._timeSigDropdown.value="4/4",this._timeSigDropdown.onChange=u=>{var f;const p=vt.find(B=>B.value===u);p&&(this._beats=p.beats,this._buildBeatDots(),(f=this.onTimeSigChange)==null||f.call(this,p.beats))},s.appendChild(h);const l=document.createElement("div");l.className="metronome-vol-group";const d=document.createElement("span");d.className="metronome-vol-icon",d.textContent="🔊",l.appendChild(d),this._volSlider=document.createElement("input"),this._volSlider.type="range",this._volSlider.className="metronome-vol-slider",this._volSlider.min="0",this._volSlider.max="1",this._volSlider.step="0.01",this._volSlider.value="0.5",this._volSlider.addEventListener("input",()=>{var u;(u=this.onVolumeChange)==null||u.call(this,parseFloat(this._volSlider.value))}),l.appendChild(this._volSlider),s.appendChild(l),e.appendChild(s),this._beatContainer=document.createElement("div"),this._beatContainer.className="metronome-beats",e.appendChild(this._beatContainer),this.container.appendChild(e),this._buildBeatDots()}_setBpm(e){var t;this._bpm=Math.max(40,Math.min(220,e)),this._bpmSlider.value=String(this._bpm),this._bpmDisplay.value=String(this._bpm),(t=this.onBpmChange)==null||t.call(this,this._bpm)}_buildBeatDots(){this._beatContainer.replaceChildren(),this._beatDots=[];for(let e=0;e<this._beats;e++){const t=document.createElement("span");t.className="metronome-beat-dot",e===0&&t.classList.add("accent"),this._beatContainer.appendChild(t),this._beatDots.push(t)}}_clearBeatDots(){for(const e of this._beatDots)e.classList.remove("lit")}flashBeat(e){this._clearBeatDots(),e>=0&&e<this._beatDots.length&&this._beatDots[e].classList.add("lit")}}const cs=[{id:"twinkle",genre:"Beginner",abc:`X:1
T:Twinkle, Twinkle, Little Star
C:Traditional (French)
M:4/4
L:1/4
Q:1/4=90
K:A
"A"A A e e|"D"f f "A"e2|"D"d d "A"c c|"E"B B "A"A2|
"A"e e "D"d d|"A"c c "E"B2|"A"e e "D"d d|"A"c c "E"B2|
"A"A A e e|"D"f f "A"e2|"D"d d "A"c c|"E"B B "A"A2|]`},{id:"mary-lamb",genre:"Beginner",abc:`X:1
T:Mary Had a Little Lamb
C:Traditional (American)
M:4/4
L:1/4
Q:1/4=100
K:D
"D"F E D E|F F F2|"A"E E E2|"D"F A A2|
F E D E|F F F F|"A"E E F E|"D"D4|]`},{id:"hot-cross-buns",genre:"Beginner",abc:`X:1
T:Hot Cross Buns
C:Traditional (English)
M:4/4
L:1/4
Q:1/4=96
K:D
"D"F E D2|F E D2|"A"D/D/D/D/ E/E/E/E/|"D"F E D2|]`},{id:"lightly-row",genre:"Beginner",abc:`X:1
T:Lightly Row
C:Traditional (German)
M:4/4
L:1/4
Q:1/4=100
K:A
"A"e c c2|"D"d B B2|"E"A B c d|"A"e e e2|
e c c2|"D"d B B2|"E"A c e e|"A"c4|
"E"B B B B|B c d2|"A"c c c c|c d e2|
e c c2|"D"d B B2|"E"A c e e|"A"A4|]`},{id:"go-tell-aunt-rhody",genre:"Beginner",abc:`X:1
T:Go Tell Aunt Rhody
C:Traditional (American)
M:4/4
L:1/4
Q:1/4=100
K:A
"A"c2 c B|A2 A2|"E"B B d c|"A"B2 A2|
e2 e d|c2 c2|"E"B A B c|"A"A4|]`},{id:"song-of-the-wind",genre:"Beginner",abc:`X:1
T:Song of the Wind
C:Traditional (German)
M:4/4
L:1/8
Q:1/4=110
K:A
"A"A2B2 c2d2|e4 e4|"D"f2d2 a2f2|"A"e8|
"D"f2d2 a2f2|"A"e8|"E"e2d2 d2d2|d2c2 c2c2|
"E"B2c2 B2A2|"A"c4 A4|"E"e2d2 d2d2|d2c2 c2c2|"E"B2c2 B2A2|"A"A8|]`},{id:"frere-jacques",genre:"Beginner",abc:`X:1
T:Frère Jacques
C:Traditional (French)
M:4/4
L:1/4
Q:1/4=110
K:D
"D"D E F D|D E F D|F G A2|F G A2|
A/B/A/G/ F D|A/B/A/G/ F D|D A, D2|D A, D2|]`},{id:"row-your-boat",genre:"Beginner",abc:`X:1
T:Row, Row, Row Your Boat
C:Traditional
M:6/8
L:1/8
Q:3/8=60
K:D
"D"D3 D3|D2E F3|F2E F2G|A6|
d d d A A A|F F F D D D|"A"A2G F2E|"D"D6|]`},{id:"london-bridge",genre:"Beginner",abc:`X:1
T:London Bridge Is Falling Down
C:Traditional (English)
M:4/4
L:1/8
Q:1/4=110
K:D
"D"A3B A2G2|F2G2 A4|"A"E2F2 G4|"D"F2G2 A4|
A3B A2G2|F2G2 A4|"A"E4 "D"A4|F2D6|]`},{id:"old-macdonald",genre:"Beginner",abc:`X:1
T:Old MacDonald Had a Farm
C:Traditional (American)
M:4/4
L:1/4
Q:1/4=120
K:G
"G"G G G D|"C"E E "G"D2|B B A A|G3 D|
G G G D|"C"E E "G"D2|B B A A|G3 D/D/|
G G G D/D/|G G G2|G/G/ G G/G/ G|G/G/ G/G/ G G|
G G G D|"C"E E "G"D2|B B A A|G4|]`},{id:"happy-birthday",genre:"Beginner",abc:`X:1
T:Happy Birthday to You
C:Mildred & Patty Hill
M:3/4
L:1/8
Q:1/4=100
K:D
A>A|"D"B2A2d2|"A"c4A>A|B2A2e2|"D"d4A>A|
"G"a2f2d2|"D"c2"G"B2g>g|"D"f2d2"A"e2|"D"d4|]`},{id:"skip-to-my-lou",genre:"Beginner",abc:`X:1
T:Skip to My Lou
C:Traditional (American)
M:2/4
L:1/8
Q:1/4=110
K:D
"D"F2F2|D2D2|F2F2|A4|"A"E2E2|C2C2|E2E2|G4|
"D"F2F2|D2D2|F2F2|A3A|"A"E2F2|G2E2|"D"D4|D4|]`},{id:"yankee-doodle",genre:"Beginner",abc:`X:1
T:Yankee Doodle
C:Traditional (American)
M:2/4
L:1/8
Q:1/4=110
K:G
"G"GGAB|GBA D|GGAB|"D"G2F2|
"G"GGAB|"C"cBAG|"D"FDEF|"G"G2G2|
"C"E>FED|E>FG2|"D"D>EDC|B,2D2|
"C"E>FED|E>FGE|"D"DGFA|"G"G2G2|]`},{id:"oh-susanna",genre:"Beginner",abc:`X:1
T:Oh! Susanna
C:Stephen Foster (1848)
M:2/4
L:1/8
Q:1/4=100
K:D
DE|"D"FAAB|AF D>E|FFEE|"A"E2DE|
"D"FAA>B|AF D>E|FF"A"EE|"D"D2DE|
"D"FAAB|AF D>E|FFEE|"A"E2DE|
"D"FAA>B|AF D>E|FF"A"EE|"D"D4|
"G"G2G2|B2B2|"D"BAA F|A3 D/E/|
"D"FAA>B|AF D>E|FF"A"EE|"D"D4|]`},{id:"when-the-saints",genre:"Beginner",abc:`X:1
T:When the Saints Go Marching In
C:Traditional (American)
M:4/4
L:1/4
Q:1/4=120
K:D
z D F G|"D"A4-|A D F G|A4-|A D F G|"D"A2 F2|"A"D2 F2|E4-|
E F F E|"D"D3 D|F2 A2|"G"A G3-|G F G2|"D"A2 F2|"A"D2 E2|"D"D4|]`},{id:"aunt-rhody-g",genre:"Beginner",abc:`X:1
T:Long, Long Ago
C:Thomas Haynes Bayly (1833)
M:4/4
L:1/4
Q:1/4=100
K:D
"D"D D E F|F G A2|"G"B c d B|"D"A4|
A F D E|F E D2|"A"E F G E|"A"A4|
"D"D D E F|F G A2|"G"B c d B|"D"A4|
A F D E|F E D2|"A"E F E D|"D"D4|]`},{id:"may-song",genre:"Beginner",abc:`X:1
T:May Song (Alle Vögel sind schon da)
C:Traditional (German)
M:4/4
L:1/4
Q:1/4=110
K:A
"A"A c e a|"D"f a "A"e2|"D"d f "A"c e|"E"B A B2|
"A"c B c d|"E"e d c B|"A"c B c d|"E"e d c B|
"A"A c e a|"D"f a "A"e2|"D"d f "A"c e|"E"B c "A"A2|]`},{id:"o-come-little-children",genre:"Beginner",abc:`X:1
T:O Come, Little Children
C:J.A.P. Schulz (1794)
M:4/4
L:1/4
Q:1/4=96
K:A
"A"e2 c e|e2 c e|"D"d2 B d|"A"c3 c|
"E"B2 B B|"A"c2 A c|"E"B2 A2|E3 E|
"A"A2 A A|"D"B d c B|"A"A2 c e|e3 e|
"D"f2 f f|"A"e c A c|"E"B2 A B|"A"A4|]`},{id:"hush-little-baby",genre:"Beginner",abc:`X:1
T:Hush, Little Baby
C:Traditional (American)
M:4/4
L:1/8
Q:1/4=90
K:D
A,|"D"D2F2 F2FE|F2A2 "A"E3E|E2E2 E2ED|"A"E2F2 "D"D3|]`},{id:"this-old-man",genre:"Beginner",abc:`X:1
T:This Old Man
C:Traditional (English)
M:4/4
L:1/8
Q:1/4=110
K:D
"D"A2F2 A4|A2F2 A4|B2A2 G2F2|"A"E2F2 G4|
F2G2 A2D2|D2DD D2EF|G2A2 "A"A2E2|E2G2 F2E2|"D"D8|]`},{id:"baa-baa",genre:"Beginner",abc:`X:1
T:Baa, Baa, Black Sheep (ABC Song)
C:Traditional
M:4/4
L:1/4
Q:1/4=100
K:A
"A"A A e e|"D"f/f/f/f/ "A"e2|"D"d d "A"c c|"E"B B "A"A2|
"A"e e/e/ "D"d d|"A"c c/c/ "E"B2|"A"e e/e/ "D"d d/d/|"A"c c "E"B2|
"A"A A e e|"D"f/f/f/f/ "A"e2|"D"d d "A"c c|"E"B B "A"A2|]`},{id:"jingle-bells-easy",genre:"Beginner",abc:`X:1
T:Ode to Joy (Easy)
C:Ludwig van Beethoven (1824)
M:4/4
L:1/4
Q:1/4=100
K:D
"D"F F G A|A G F E|D D E F|"A"F>E E2|
"D"F F G A|A G F E|D D E F|"A"E>D "D"D2|]`},{id:"au-clair",genre:"Beginner",abc:`X:1
T:Au Clair de la Lune
C:Traditional (French)
M:4/4
L:1/4
Q:1/4=96
K:D
"D"D D D E|F2 "A"E2|"D"D F E E|D4|
D D D E|F2 "A"E2|"D"D F E E|D4|
"A"E E E E|B,2 B,2|E D C B,|A,4|
"D"D D D E|F2 "A"E2|"D"D F E E|D4|]`},{id:"pop-goes-the-weasel",genre:"Beginner",abc:`X:1
T:Pop Goes the Weasel
C:Traditional (English)
M:6/8
L:1/8
Q:3/8=80
K:D
"D"D2D E2E|F A F D3|D2D E2E|"A"F3 D3|
"D"D2D E2E|F A F D3|"G"B3 "A"E2G|"D"F3 D3|
"D"d3 B2d|"A"c3 A3|"D"d3 B2d|"A"c3 A2A|
"D"A2A E2G|F A F D3|"G"B3 "A"E2G|"D"F3 D3|]`}],ls=[{id:"greensleeves",genre:"Folk",abc:`X:1
T:Greensleeves
O:English (16th c.)
M:6/8
L:1/8
Q:3/8=60
K:Em
E|"Em"G2A B>cB|"D"A2F D>EF|"Em"G2E E>^DE|"B7"F2^D B,2E|
"Em"G2A B>cB|"D"A2F D>EF|"Em"G>FE "B7"^D>^CD|"Em"E3 E2z|
"G"d3 d>^cB|"D"A2F D>EF|"Em"G2E E>^DE|"B7"F2^D B,3|
"G"d3 d>^cB|"D"A2F D>EF|"Em"G>FE "B7"^D>^CD|"Em"E3 E2|]`},{id:"danny-boy",genre:"Folk",abc:`X:1
T:Danny Boy (Londonderry Air)
O:Irish
M:4/4
L:1/8
Q:1/4=70
K:D
ABc|"D"d3 c d2 fe|"G"d2 B2 "D"A2 FD|"G"G2 B2 d3 e|"D"f6 ed|
"D"d3 c d2 fe|"G"d2 B2 "D"A2 FD|"A"E2 F2 G2 FE|"D"D6 ABc|
"D"d3 c d2 fe|"G"d2 B2 "D"A2 FD|"G"G2 B2 d3 e|"D"f6 ef|
"D"a3 f f2 ed|"G"d2 B2 "D"A2 FD|"A"E2 F2 G2 FE|"D"D6|]`},{id:"scarborough-fair",genre:"Folk",abc:`X:1
T:Scarborough Fair
O:English
M:3/4
L:1/4
Q:1/4=100
K:Edor
"Em"E2 E|B2 B|"D"F>G F|"Em"E3|z B d|"G"e2 d|"Em"B ^c A|B3|
z2 e|e2 e|"D"d2 B|B A G|"C"F D2-|D2 E|"D"B2 A|"Em"G F E|"D"D E F|"Em"E3|]`},{id:"shenandoah",genre:"Folk",abc:`X:1
T:Shenandoah
O:American
M:4/4
L:1/8
Q:1/4=70
K:D
A,2|"D"D2 DD D3 E|F G A d B4|"G"e3 d "D"d3 B|"Bm"d B A2 "G"B2 A2|
"D"F2 A2 A4|"A"A3 F A3 B|"D"d4 "A"A2 F2|"D"E D4|]`},{id:"amazing-grace",genre:"Hymns",abc:`X:1
T:Amazing Grace
C:Tune: New Britain (American, 1829)
M:3/4
L:1/4
Q:1/4=80
K:D
A,|"D"D2 F/D/|F2 E|D2 B,|A,2 A,|D2 F/D/|F2 E/F/|"A"A3-|A2 F/A/|
"D"A2 F/D/|F2 E|D2 B,|A,2 A,|D2 F/D/|"A"F2 E|"D"D3-|D2|]`},{id:"auld-lang-syne",genre:"Folk",abc:`X:1
T:Auld Lang Syne
O:Scottish
M:4/4
L:1/8
Q:1/4=80
K:D
A,2|"D"D3 D D2 F2|"A"E3 D E2 F2|"D"D3 D F2 A2|"G"B6 B2|
"D"A3 F F2 D2|"A"E3 D E2 F2|"D"D3 B, B,2 A,2|D6 B2|
"D"A3 F F2 D2|"A"E3 D E2 B2|"D"A3 F F2 A2|"G"B6 d2|
"D"A3 F F2 D2|"A"E3 D E2 F/E/|"D"D3 B, B,2 A,2|D6|]`},{id:"simple-gifts",genre:"Folk",abc:`X:1
T:Simple Gifts
C:Joseph Brackett (1848)
M:2/4
L:1/8
Q:1/4=90
K:F
C|"F"CF FG|AF AB|c2 cB|AG FG|A2 AG|FF FG|"C"A2 G2|
"F"CF FG|AF AB|c2 cB|AG FG|"C"A2 G2|"F"FF F2|z2 z2|
"F"c2 A>G|AB AF|"C"G2 G>A|GF C2|"F"F2 G>A|AB c2|"Bb"BA "C"G2|
"F"c2 A>G|AB AF|"C"G2 G>A|GF C2|"F"F2 GA|"Bb"BA "C"GF|"F"F4|]`},{id:"home-on-the-range",genre:"Folk",abc:`X:1
T:Home on the Range
C:Daniel E. Kelley (1872)
M:3/4
L:1/4
Q:1/4=120
K:G
D|D G A|"C"B2 G|F E c|"G"c3|z A B|c2 B|"D"A G A|"D"A3|
D G A|"C"B2 G|F E c|"G"c3|z c c|"D"c B A|"G"B G A|G3|
d3|"D"c B A|"G"B2 G|D3|D G A|"C"B2 G|F E c|"G"c3|
z c c|"D"c B A|"G"B G A|"G"G3|]`},{id:"red-river-valley",genre:"Folk",abc:`X:1
T:Red River Valley
O:Canadian / American
M:4/4
L:1/8
Q:1/4=100
K:D
A,D|"D"F2 F2 F2 EF|E2 D6|z2 A,D F2 DF|"A"A2 F2 E4|
z2 AG F2 EF|"G"A2 G2 F2 E2|"A"z2 A,B, C2 DE|"D"F2 E2 D4|]`},{id:"clementine",genre:"Folk",abc:`X:1
T:Oh My Darling, Clementine
O:American
M:3/4
L:1/8
Q:1/4=120
K:D
D>D|"D"D2 A,2 F>F|F2 D2 D>F|A3 G F2|"A"E4 E>F|
G2 G2 F>E|F2 D2 D>F|E3 A, C>E|"D"D4|]`},{id:"down-in-the-valley",genre:"Folk",abc:`X:1
T:Down in the Valley
O:American
M:3/4
L:1/4
Q:1/4=120
K:D
A,|"D"D F A|F3-|F2 E|"A"F E D|E3-|E2 A,|C E G|"A"F2 E|E D C|"D"D3-|D2|]`},{id:"swing-low",genre:"Folk",abc:`X:1
T:Swing Low, Sweet Chariot
O:African American spiritual
M:4/4
L:1/8
Q:1/4=80
K:D
"D"F4 D3 F|F4- F2 D2|"G"B,4 "D"A,3 D|D6 z2|
"D"F4 F2 A2|d3 B A2 F2|"A"A4 F2 E2|E6 z2|
"D"F4 D3 F|F4- F2 D2|"G"B,4 "D"A,3 D|D6 z2|
"D"F4 FG A2|F2 D2 "A"E3 D|"D"D8|]`},{id:"loch-lomond",genre:"Folk",abc:`X:1
T:Loch Lomond
O:Scottish
M:4/4
L:1/8
Q:1/4=80
K:D
A,>B,|"D"D2 D>E F2 E>D|"G"E2 E>F "D"A2 F>E|"D"D2 D>E F2 E>D|"A"E2 B,>A, "D"D2 A,>B,|
"D"D2 D>E F2 E>D|"G"E2 E>F A2 d>e|"D"f2 e>d "A"e2 B>A|"D"F2 E>D D2|]`},{id:"skye-boat-song",genre:"Folk",abc:`X:1
T:Skye Boat Song
O:Scottish
M:6/8
L:1/8
Q:3/8=50
K:D
"D"A>BA "G"D2E|"D"F3 "Bm"A3|"G"B>cB "Em"E2F|"A"A3 z3|
"D"A>BA "G"D2E|"D"F3 "Bm"A3|"G"B>AF "A"E>DE|"D"D3 z3|
"Bm"F>EF "Em"B2A|"Bm"F3 "G"D3|"Bm"F>EF "G"B2A|"F#m"F3 "Bm"B3|
"Bm"F>EF "Em"B2A|"Bm"F3 "G"D3|"Em"E>DE "A"F2E|"A"A3 z3|]`},{id:"water-is-wide",genre:"Folk",abc:`X:1
T:The Water Is Wide
O:Scottish / English
M:4/4
L:1/8
Q:1/4=70
K:D
A,|"D"D2 F2 A3 B|A2 F2 "A"E3 D|"D"D2 F2 "G"G3 F|"A"E6 E2|
"D"F2 A2 d3 c|"G"B2 A2 "D"F3 A|"A"E2 D2 E3 F|"D"D6|]`},{id:"molly-malone",genre:"Folk",abc:`X:1
T:Molly Malone (Cockles and Mussels)
O:Irish
M:3/4
L:1/8
Q:1/4=110
K:D
A,2|"D"D2 D2 D2|D4 F2|"Em"E2 E2 E2|"A"E4 G2|"D"F2 F2 F2|F4 A2|"A"G2 F2 E2|"D"F4 A,2|
"D"D2 D2 D2|D4 F2|"Em"E2 E2 E2|"A"E4 G2|"D"F2 A2 d2|"G"B4 G2|"A"F2 E2 E2|"D"D4|]`},{id:"drunken-sailor",genre:"Folk",abc:`X:1
T:What Shall We Do with the Drunken Sailor
O:Sea shanty
M:2/4
L:1/8
Q:1/4=110
K:Ddor
"Dm"A2 AA|A2 AA|A2 D2|F2 A2|"C"G2 GG|G2 GG|G2 C2|E2 G2|
"Dm"A2 AA|A2 AA|A2 B2|c2 d2|"C"c2 A2|G2 E2|"Dm"D2 D2|D4|]`},{id:"wellerman",genre:"Folk",abc:`X:1
T:Soon May the Wellerman Come
O:New Zealand sea shanty (19th c.)
M:4/4
L:1/8
Q:1/4=100
K:Dm
A,2|"Dm"D2 D2 D2 F2|A2 A2 A4|"Gm"B2 G2 G2 B2|"Dm"A2 F2 D2 D2|
"Dm"D2 D2 D2 F2|A2 A2 A2 A2|"A"G2 E2 ^C2 E2|"Dm"D6 z2|
"Bb"B4 B4|"F"A2 F2 F4|"Gm"G2 G2 G2 A2|"Dm"F2 D2 D4|
"Bb"B4 B4|"F"A2 F2 F2 F2|"A"E2 ^C2 E2 G2|"Dm"F2 D2 D4|]`},{id:"sakura",genre:"World",abc:`X:1
T:Sakura Sakura
O:Japanese folk song
M:4/4
L:1/4
Q:1/4=72
K:Am
"Am"A A B2|A A B2|A B c B|A B/A/ F2|
E C E F|E E/C/ B,2|A B c B|A B/A/ F2|
E C E F|E E/C/ B,2|A A B2|A A B2|"E"E F B/A/ F|"Am"E4|]`},{id:"arirang",genre:"World",abc:`X:1
T:Arirang
O:Korean folk song
M:3/4
L:1/8
Q:1/4=110
K:D
"D"D3 E D2|E2 F3 E|F2 A3 B|A2 F2 E2|D3 E D2|E2 F3 E|D2 B,2 A,2|B,4 A,2|
"D"A4 A2|A3 B A2|F2 E2 D2|E3 F E2|D3 E D2|E2 F3 E|F2 E2 D2|D6|]`},{id:"kalinka",genre:"World",abc:`X:1
T:Kalinka
C:Ivan Larionov (1860)
M:2/4
L:1/8
Q:1/4=110
K:Am
"E"e2 d2|c2 B2|"Am"A4|A2 z2|"E"e2 d2|c2 B2|"Am"A4|A2 z2|
"Am"c2 B2|A2 G2|"G"G2 B2|D2 z2|"Am"c2 B2|A2 G2|"E"B2 A2|E2 z2|]`},{id:"dark-eyes",genre:"World",abc:`X:1
T:Dark Eyes (Ochi Chernye)
O:Russian romance (1884)
M:3/4
L:1/8
Q:1/4=110
K:Dm
A,2|"Dm"D2 E2 F2|G4 A2|"A"^C6-|C4 E2|"A"E2 F2 G2|A4 B2|"Dm"F6-|F4 A2|
"Gm"d2 c2 B2|B4 A2|"Dm"A2 G2 F2|F4 D2|"A"E2 F2 G2|^C4 E2|"Dm"D6-|D4|]`},{id:"la-cucaracha",genre:"World",abc:`X:1
T:La Cucaracha
O:Mexican folk song
M:4/4
L:1/8
Q:1/4=140
K:D
"D"z AAA d2 f2|z AAA d2 f2|"A"d2 d2 c2 c2|B2 B2 A4|
"A"z AAA c2 e2|z AAA c2 e2|"D"a2 b2 a2 g2|f2 e2 d4|]`},{id:"cielito-lindo",genre:"World",abc:`X:1
T:Cielito Lindo
C:Quirino Mendoza y Cortés (1882)
M:3/4
L:1/8
Q:1/4=140
K:D
A,|"D"D3 F E D|"A"C3 E D C|"A"B,6-|B,4 z C|"A"C3 E D C|"D"D3 F E D|"D"A6-|A4 z|
"D"a2 a2 a2|"A"g2 g2 g2|f2 e2 d2|e4 z2|"A"g2 g2 g2|"D"f2 f2 f2|e2 d2 c2|"D"d4 z2|]`},{id:"santa-lucia",genre:"World",abc:`X:1
T:Santa Lucia
C:Teodoro Cottrau (1849)
M:3/8
L:1/8
Q:3/8=50
K:D
"D"A>A d|d c/B/c|"A"c B/A/G|"D"G F2|F>G A|"A"A G/F/E|"D"E d c|d3|]`},{id:"funiculi",genre:"World",abc:`X:1
T:Funiculì, Funiculà
C:Luigi Denza (1880)
M:6/8
L:1/8
Q:3/8=100
K:D
"D"A,|D2D DFE|D2D DFE|"A"E2E EGF|E3 z2E|"D"F2F FAG|F2F FAG|"A"GFE DCB,|A,3 z2|
"D"A2A A2A|A3 F3|"A"G2G G2G|G3 E3|"D"A2A A2A|"G"B2c d2B|"A"A3 E3|"D"D3 z2|]`},{id:"o-sole-mio",genre:"World",abc:`X:1
T:'O Sole Mio
C:Eduardo di Capua (1898)
M:4/4
L:1/8
Q:1/4=70
K:G
"G"D2|B3 A A2 G2|"D"A6 B,C|D2 C2 C2 B,2|"G"B,6 D2|
"G"B3 A A2 G2|"Am"G2 A2 "D"A2 D2|"G"B2 A2 "D"G2 F2|"G"G6|]`},{id:"bella-ciao",genre:"World",abc:`X:1
T:Bella Ciao
O:Italian folk song
M:4/4
L:1/8
Q:1/4=120
K:Am
"Am"E2 A2 B2 c2|A6 z2|E2 A2 B2 c2|A6 z2|E2 A2 B2 c4|B2 A2 c4|B2 A2 e4|e2 e2 e2 de|
"Dm"f2 f4 z2|f2 ed f2 e2|"Am"d2 c4 z2|"E"e2 d2 c2 B2|"Am"A8|]`},{id:"tum-balalaika",genre:"World",abc:`X:1
T:Tumbalalaika
O:Yiddish folk song
M:3/4
L:1/4
Q:1/4=130
K:Am
"Am"E E E|E D C|"E"B, B, B,|B,3|"E"B, B, B,|B, C D|"Am"C C C|C3|
"Am"E E E|E D C|"E"B, B, B,|B, C D|"E"E E ^G|B A ^G|"Am"A3|A3|]`},{id:"cherry-blossom-sakura-2",genre:"World",abc:`X:1
T:Mo Li Hua (Jasmine Flower)
O:Chinese folk song
M:2/4
L:1/16
Q:1/4=60
K:G
"G"E4 E2G2|A2c2 c2A2|G4 G2A2|G8|E4 E2G2|A2c2 c2A2|G4 G2A2|G8|
"G"G4 G4|G4 E2G2|A4 A4|G8|E4 D2E2|G4 E2D2|C4 C2D2|C8|]`},{id:"house-rising-sun",genre:"Rock & Metal",abc:`X:1
T:House of the Rising Sun
O:American folk song (traditional)
M:6/8
L:1/8
Q:3/8=70
K:Am
E|"Am"A3 "C"B3|"D"c3 "F"A3|"Am"z3 "C"c2 c|"D"B3 "F"A3|"Am"E6-|"C"E3 "D"z2 E|"Am"A3 "C"c3|"D"e3 "F"d2 c|
"Am"A3 "C"c3|"E"B6-|B3 z2 E|"Am"A3 "C"B3|"D"c3 "F"A3|"Am"A3 "C"c3|"E"B3 A2 ^G|"Am"A6|]`},{id:"john-henry",genre:"Blues & Jazz",abc:`X:1
T:John Henry
O:American folk ballad
M:4/4
L:1/8
Q:1/4=110
K:D
"D"A,2 D2 D2 D2|D2 E2 F2 D2|F2 F2 F2 E2|D2 F2 A4|
"G"B2 B2 B2 A2|G2 B2 "D"A4|"A"z2 A2 G2 E2|"D"D8|]`},{id:"st-james-infirmary",genre:"Blues & Jazz",abc:`X:1
T:St. James Infirmary
O:American (traditional)
M:4/4
L:1/8
Q:1/4=70
K:Dm
"Dm"A,2 D2 D2 D2|"A"E2 ^C2 D4|"Dm"z2 D2 F2 A2|"Gm"_B2 A2 G4|
"Dm"z2 D2 D2 F2|"A"E2 ^C2 A,4|"Dm"z2 D2 F2 E2|"Dm"D8|]`},{id:"midnight-special",genre:"Blues & Jazz",abc:`X:1
T:Midnight Special
O:American (traditional)
M:4/4
L:1/8
Q:1/4=110
K:G
"C"z2 E2 G2 G2|G2 E2 G4|"G"z2 D2 G2 G2|G2 E2 D4|
"D"z2 D2 F2 A2|A2 F2 A2 B2|"G"G2 E2 D2 B,2|G,8|]`},{id:"wade-in-the-water",genre:"Blues & Jazz",abc:`X:1
T:Wade in the Water
O:African American spiritual
M:4/4
L:1/8
Q:1/4=90
K:Em
"Em"B4 B2 A2|G2 E4 z2|"Am"A4 A2 G2|"Em"E8|
"Em"B4 B2 A2|G2 E4 z2|"B7"^D2 E2 F2 ^D2|"Em"E8|]`},{id:"kumbaya",genre:"Folk",abc:`X:1
T:Kum Ba Yah
O:African American spiritual
M:4/4
L:1/4
Q:1/4=80
K:D
"D"D F A2|A2 "G"B B|"D"A4|z D F A|A2 "A"G F|E4|
z D F A|A2 "G"B B|"D"A2 G F|"A"F E D E|"D"D4|]`},{id:"oh-shenandoah-2",genre:"Folk",abc:`X:1
T:She'll Be Coming Round the Mountain
O:American
M:4/4
L:1/8
Q:1/4=120
K:D
DE|"D"F2 F2 F2 DE|F2 A2 F2 E2|D2 D2 D2 F2|A6 AB|
"G"d2 d2 d2 B2|"D"A2 A2 A2 F2|"A"E2 E2 E2 FE|E6 DE|
"D"F2 F2 F2 DE|F2 A2 d2 c2|"G"B2 B2 "D"A2 F2|"A"E2 E2 "D"D2|]`},{id:"polly-wolly",genre:"Folk",abc:`X:1
T:Polly Wolly Doodle
O:American
M:2/4
L:1/8
Q:1/4=120
K:D
"D"F F F F|F2 D2|F F F F|F2 D2|"A"E E E E|E2 C2|E E E E|E2 A,2|
"D"F F F F|F2 D2|F F F F|F2 D2|"A"E2 E2|F2 E2|"D"D4|D4|]`},{id:"camptown-races",genre:"Folk",abc:`X:1
T:Camptown Races
C:Stephen Foster (1850)
M:2/4
L:1/8
Q:1/4=110
K:D
"D"AA FA|BA F2|FE2 z|FE2 z|AA FA|BA F2|"A"E2 FE|"D"D2 z2|
"D"D>D FA|d4|B>B dB|A3 F|AA F/F/F|E F/G/ F2|"A"E2 FE|"D"D4|]`},{id:"beautiful-dreamer",genre:"Folk",abc:`X:1
T:Beautiful Dreamer
C:Stephen Foster (1864)
M:9/8
L:1/8
Q:3/8=50
K:D
"D"d3 c2 B A3|"D"F3 E2 D "A"E3|"A"G3 F2 E G3|"D"F6 z3|
"D"d3 c2 B A3|"D"F3 E2 D "A"E3|"A"G3 F2 E C3|"D"D6 z3|]`},{id:"oh-shenandoah-3",genre:"Folk",abc:`X:1
T:My Old Kentucky Home
C:Stephen Foster (1853)
M:4/4
L:1/8
Q:1/4=80
K:D
A,2|"D"D3 E F2 A2|"G"B2 d2 "D"A4|F2 D2 "A"E2 E2|"D"D6 A,2|
"D"D3 E F2 A2|"G"B2 d2 "D"A4|F2 D2 "A"E2 F2|"A"E6 A,2|
"D"D3 E F2 A2|"G"B2 d2 "D"A4|F2 D2 "A"E2 E2|"D"D6|]`}],ds=[{id:"soldiers-joy",genre:"Old-Time",abc:`X:1
T:Soldier's Joy
O:American / Scottish
R:reel
M:2/4
L:1/16
Q:1/4=90
K:D
(3ABc|:"D"d2cd BdAF|D2FA dfed|"A"cdec ABcA|"D"d2cd BdAF|
"D"d2cd BdAF|D2FA d2fd|"A"cdec ABcA|"D"d2f2 d2 (3ABc:|
|:"D"d2fg agfg|"A"a2A2 c2e2|"D"d2fg agfg|"A"a2A2 ce2c|
"D"d2fg agfg|"G"bgfe "D"d2fd|"A"cdec ABcA|"D"d2f2 d4:|`},{id:"arkansas-traveler",genre:"Old-Time",abc:`X:1
T:Arkansas Traveler
O:American
R:reel
M:2/4
L:1/16
Q:1/4=90
K:D
|:"D"fe|d2d2 dcde|f2f2 fefg|a2f2 "G"g2e2|"D"fdec d2fe|
d2d2 dcde|f2f2 fefg|a2f2 "A"g2e2|"D"d4 d2:|
|:"D"fg|a2f2 "A"g2e2|"D"fdec d2fg|a2f2 "A"g2e2|"D"fdec d2fg|
afdf "G"gebg|"D"afdf "A"gece|"D"d2d2 "A"cdec|"D"d4 d2:|`},{id:"turkey-in-the-straw",genre:"Old-Time",abc:`X:1
T:Turkey in the Straw
O:American
R:reel
M:2/4
L:1/16
Q:1/4=90
K:G
|:"G"dc|BAGA BGEF|G2G2 GFGA|BcdB "C"cBcd|"D"e2d2 d2dc|
"G"BAGA BGEF|G2G2 GFGA|BcdB "D"A2GA|"G"B2G2 G2:|
|:"G"g2|g2B2 B2AB|g2B2 B2AB|"C"cBcd e2d2|"D"edcB A2g2|
"G"g2B2 B2AB|g2B2 B2AB|"C"c2e2 "D"d2F2|"G"G6:|`},{id:"old-joe-clark",genre:"Old-Time",abc:`X:1
T:Old Joe Clark
O:American
R:reel
M:4/4
L:1/8
Q:1/4=110
K:Amix
|:"A"e2 e2 e2 fg|a2 a2 "G"g2 ed|"A"e2 e2 e2 fg|"G"a2 g2 "A"a4|
"A"e2 e2 e2 fg|a2 a2 "G"g2 ed|"A"c2 "E"B2 "A"A2 Bc|"E"d2 B2 "A"A4:|
|:"A"c2 c2 c2 B2|A2 A2 A2 Bc|"G"d2 B2 B2 cd|e2 d2 d4|
"A"c2 c2 c2 B2|A2 A2 A2 Bc|"E"d2 B2 B2 cB|"A"A6 z2:|`},{id:"bile-em-cabbage",genre:"Old-Time",abc:`X:1
T:Bile 'Em Cabbage Down
O:American
R:reel
M:4/4
L:1/8
Q:1/4=100
K:A
"A"c2c2 B2A2|"D"d2d2 "A"c4|c2c2 B2A2|"E"B2c2 "A"A4|
"A"c2c2 B2A2|"D"d2d2 "A"c4|c2c2 B2A2|"E"B2c2 "A"A4|
"A"e2e2 c2e2|"D"f2f2 "A"e4|e2e2 c2A2|"E"B2c2 "A"A4|
"A"e2e2 c2e2|"D"f2f2 "A"e4|e2e2 c2A2|"E"B2c2 "A"A4|]`},{id:"cripple-creek",genre:"Old-Time",abc:`X:1
T:Cripple Creek
O:American
R:reel
M:4/4
L:1/8
Q:1/4=110
K:A
|:"A"e2 ef e2 cB|A2 Bc "E"B2 A2|"A"e2 ef e2 cB|"E"A2 B2 "A"A4:|
|:"A"c2 cB A2 AB|cB A2 "E"B2 A2|"A"c2 cB A2 AB|"E"cB A2 "A"A4:|`},{id:"liberty",genre:"Old-Time",abc:`X:1
T:Liberty
O:American
R:reel
M:4/4
L:1/8
Q:1/4=110
K:D
|:"D"FG|ABAF A2 dB|ABAF E2 FG|ABAF A2 de|fdeB "A"A2 FG|
"D"ABAF A2 dB|ABAF E2 FG|"G"ABde f2 ed|"A"BAFE "D"D2:|
|:"D"fg|a2 af a2 fd|"G"g2 ge g2 fg|"D"a2 af a2 de|fdeB "A"A2 fg|
"D"a2 af a2 fd|"G"g2 ge g2 fg|"D"afge fde"A"c|"D"d2 d2 d2:|`},{id:"red-wing",genre:"Old-Time",abc:`X:1
T:Red Wing
C:Kerry Mills (1907)
R:polka
M:2/4
L:1/8
Q:1/4=100
K:G
"G"D>E GG|G2 GA|B>c dB|G4|"C"E>F GE|"G"D>E GB|"D"A4-|A4|
"G"D>E GG|G2 GA|B>c dB|G2 Bd|"C"e>e "G"dB|"D"A>B AF|"G"G4-|G4|
"C"c>c cc|e2 dc|"G"B>B BB|d2 BG|"D"A>B AF|D>E FA|"G"G>A BG|"D"A4|
"C"c>c cc|e2 dc|"G"B>B BB|d2 BG|"D"A>B AF|D>E FA|"G"G4-|G4|]`},{id:"whiskey-before-breakfast",genre:"Old-Time",abc:`X:1
T:Whiskey Before Breakfast
O:Canadian / American
R:reel
M:4/4
L:1/8
Q:1/4=110
K:D
|:"D"DEFG A2 FA|"G"BAGB "D"A2 FA|"G"G2 BG "D"F2 AF|"A"EDEF E2 FE|
"D"DEFG A2 FA|"G"BAGB "D"A2 FA|"G"G2 BG "D"F2 AF|"A"EDEF "D"D4:|
|:"D"d2 dc d2 AF|"G"G2 BG "D"F2 AF|"G"G2 BG "D"F2 AF|"A"EDEF E2 FE|
"D"d2 dc d2 AF|"G"G2 BG "D"F2 AF|"G"G2 BG "D"F2 AF|"A"EDEF "D"D4:|`},{id:"angeline-the-baker",genre:"Old-Time",abc:`X:1
T:Angeline the Baker
O:American
R:reel
M:4/4
L:1/8
Q:1/4=110
K:D
|:"D"FA|B2 A2 F2 AF|E2 D2 D2 EF|"G"G2 B2 "D"A2 FA|"A"E4 E2 FA|
"D"B2 A2 F2 AF|E2 D2 D2 EF|"G"G2 B2 "D"A2 F2|"A"E2 D2 "D"D2:|
|:"D"de|f3 e f2 ed|"G"B2 A2 "D"A2 de|f3 e f2 ed|"A"e4 e2 de|
"D"f3 e f2 ed|"G"B2 A2 "D"F2 AF|"G"G2 B2 "D"A2 F2|"A"E2 D2 "D"D2:|`},{id:"ragtime-annie",genre:"Old-Time",abc:`X:1
T:Ragtime Annie
O:American
R:reel
M:2/4
L:1/16
Q:1/4=90
K:D
|:"D"f2e2|d2f2 a2f2|d2f2 a2f2|"A"g2e2 c2e2|g2e2 c2e2|
"D"d2f2 a2f2|d2f2 a2f2|"A"g2e2 cdec|"D"d4 :|
|:"G"g2f2|e2B2 B2c2|d2B2 B2c2|"D"d2A2 A2B2|d2A2 A2d2|
"G"e2B2 B2c2|d2B2 B2c2|"A"d2c2 B2c2|"D"d4 :|`},{id:"st-annes-reel",genre:"Celtic",abc:`X:1
T:St. Anne's Reel
O:French Canadian
R:reel
M:4/4
L:1/8
Q:1/4=110
K:D
|:"D"fe|dcdA FAdA|"G"BcdB "D"A2 fe|"Em"dcdA FAdA|"A"Bcde fdfe|
"D"dcdA FAdA|"G"BcdB "D"A2 a2|"G"bagf "A"gfed|"A"cdec "D"d2:|
|:"D"fg|afdf afdf|"G"gbag "D"f2 fg|"D"afdf afdf|"A"gbag f2 ef|
"G"g2 gf gfed|"D"Bcdf afdf|"G"bagf "A"gfed|"A"cdec "D"d2:|`},{id:"devils-dream",genre:"Old-Time",abc:`X:1
T:Devil's Dream
O:Scottish / American
R:reel
M:4/4
L:1/8
Q:1/4=110
K:A
|:"A"ag|aAeA fAeA|aAeA fAeA|"D"dfed fedc|"E"dcBA GFED|
"A"aAeA fAeA|aAeA fAeA|"D"dfed fedc|"E"dcBc "A"A2:|
|:"A"ce|aece fece|aece fece|"D"dfed fedc|"E"dcBA GFED|
"A"aece fece|aece fece|"D"dfed fedc|"E"dcBc "A"A2:|`},{id:"fishers-hornpipe",genre:"Celtic",abc:`X:1
T:Fisher's Hornpipe
O:English / American
R:hornpipe
M:4/4
L:1/8
Q:1/4=100
K:F
|:"F"AG|FAcf ag f2|"C"egfe dc B2|"F"AGFA "Bb"dcBA|"C"G2 B2 B2 AG|
"F"FAcf ag f2|"C"egfe dc B2|"F"AFAc "Bb"dfed|"C"cAGB "F"A2:|
|:"F"ag|"C"fe e2 e2 ga|"Bb"bg e2 e2 ga|"F"bagf "C"g2 c2|"F"agfe "C"f2 ag|
"F"fe e2 e2 ga|"Bb"bg e2 e2 ga|"F"bagf "C"edcB|"F"AFGE F2:|`},{id:"sailors-hornpipe",genre:"Celtic",abc:`X:1
T:Sailor's Hornpipe (College Hornpipe)
O:English
R:hornpipe
M:4/4
L:1/8
Q:1/4=100
K:D
|:"D"ag|fdAF DFAd|fdAF Ddfa|"A"gecA EAce|gecA "A7"Aceg|
"D"fdAF DFAd|fdAF Ddfa|"G"gbag "A"fgec|"D"d2 f2 d2:|
|:"D"cd|"A7"e2 A2 A2 cd|e2 A2 A2 cd|"D"fdAF DFAd|fdAF DF (3ABc|
"D"d2 f2 "A"e2 g2|"D"f2 a2 "G"g2 b2|"D"afge "A"fdec|"D"d2 f2 d2:|`},{id:"irish-washerwoman",genre:"Celtic",abc:`X:1
T:The Irish Washerwoman
O:Irish
R:jig
M:6/8
L:1/8
Q:3/8=100
K:G
|:"G"dc|BGG DGG|BGB dcB|"D"cAA EAA|cBc edc|
"G"BGG DGG|BGB dcB|"C"cBc "D"Adc|"G"BGG G:|
|:"G"Bc|dGG BGG|dGG BGG|"D"dAA cAA|dAA cAA|
"G"BGG DGG|BGB dcB|"C"cBc "D"Adc|"G"BGG G:|`},{id:"kesh-jig",genre:"Celtic",abc:`X:1
T:The Kesh
O:Irish
R:jig
M:6/8
L:1/8
Q:3/8=100
K:G
|:"G"GAG GAB|"D"ABA ABd|"C"edd gdd|"D"edB dBA|
"G"GAG GAB|"D"ABA ABd|"C"edd gdB|"D"AGF "G"G3:|
|:"G"BAB dBd|ege dBG|BAB dBG|"D"ABA AGA|
"G"BAB dBd|ege dBd|"C"gfg aga|"D"bgf "G"g3:|`},{id:"swallowtail-jig",genre:"Celtic",abc:`X:1
T:Swallowtail Jig
O:Irish
R:jig
M:6/8
L:1/8
Q:3/8=100
K:Edor
|:"Em"GEE BEE|GEE BAG|"D"FDD ADD|dcd AGF|
"Em"GEE BEE|GEE B2c|"D"dcd AGF|"Em"GEE E3:|
|:"Em"B2B d2B|e2e g2e|"D"f2d d2c|dcd AGF|
"Em"B2B d2B|e2e g2e|"D"dcd AGF|"Em"GEE E3:|`},{id:"rakes-of-mallow",genre:"Celtic",abc:`X:1
T:The Rakes of Mallow
O:Irish
R:polka
M:2/4
L:1/8
Q:1/4=110
K:G
|:"G"GB GB|GB d2|"D"FA FA|FA c2|"G"GB GB|GB dg|"D"fe dc|"G"B2 G2:|
|:"G"g>f ed|g>f ed|"D"e>f ed|cB AF|"G"g>f ed|g>f ed|"D"fe dc|"G"B2 G2:|`},{id:"kerry-polka",genre:"Celtic",abc:`X:1
T:Kerry Polka
O:Irish
R:polka
M:2/4
L:1/8
Q:1/4=110
K:D
|:"D"FE DF|AF AB|AF AB|"A"AF ED|"D"FE DF|AF AB|"G"dc BA|"D"FD D2:|
|:"D"d>e fd|"A"ec AB|"D"d>e fd|"A"e2 cA|"D"d>e fd|"A"ec AB|"G"dc BA|"D"FD D2:|`},{id:"britches-full-of-stitches",genre:"Celtic",abc:`X:1
T:Britches Full of Stitches
O:Irish
R:polka
M:2/4
L:1/8
Q:1/4=110
K:A
|:"A"A>B AF|ED EF|"A"A>B AF|"E"E2 E2|"A"A>B AF|ED EF|"D"AB dB|"A"A2 A2:|
|:"D"d>e dB|AB AF|"D"d>e dB|"A"A2 A2|"D"d>e dB|AB AF|"E"ED EF|"A"A2 A2:|`},{id:"harvest-home",genre:"Celtic",abc:`X:1
T:Harvest Home
O:Irish
R:hornpipe
M:4/4
L:1/8
Q:1/4=100
K:D
|:"D"AF|DAFA DAFA|"G"dcde "D"fdAF|"A"EAcA EAcA|egfe dcBA|
"D"DAFA DAFA|"G"dcde "D"fdAF|"A"GBAG FAEc|"D"d2 f2 d2:|
|:"D"fg|afdf a2 gf|"A"gece g2 fe|"D"fdAd fdAd|"G"gfge "D"fdAF|
"D"DAFA DAFA|"G"dcde "D"fdAF|"A"GBAG FAEc|"D"d2 f2 d2:|`},{id:"drowsy-maggie",genre:"Celtic",abc:`X:1
T:Drowsy Maggie
O:Irish
R:reel
M:4/4
L:1/8
Q:1/4=110
K:Edor
|:"Em"E2BE dEBE|E2BE "D"AFDF|"Em"E2BE dEBE|"D"BABc dAFD:|
|:"D"d2fd c2ec|defg afge|"D"d2fd c2ec|"Em"BABc dAFD:|`},{id:"silver-spear",genre:"Celtic",abc:`X:1
T:The Silver Spear
O:Irish
R:reel
M:4/4
L:1/8
Q:1/4=110
K:D
|:"D"FA|BAFA D2FA|BAFA "G"B2AB|"D"d2fd "A"edBd|"D"ABde fdAB|
"D"BAFA D2FA|BAFA "G"B2AB|"D"d2fd "A"edBe|"D"fdeB d2:|
|:"D"fg|afdf afdf|"A"gefd edBd|"D"afdf a2fa|"A"gefd e2fg|
"D"afdf afdf|"A"gefd edBd|"D"d2fd "A"edBe|"D"fdeB d2:|`},{id:"cooleys-reel",genre:"Celtic",abc:`X:1
T:Cooley's Reel
O:Irish
R:reel
M:4/4
L:1/8
Q:1/4=110
K:Edor
|:"Em"EBBA B2EB|B2AB dBAG|"D"FDAD BDAD|FDAD dAFD|
"Em"EBBA B2EB|B2AB defg|"D"afge dBAF|DEFD "Em"E4:|
|:"Em"gfef gfef|g2fg edBd|"Em"gfef gfef|"D"afge d2Bd|
"Em"gfef gfef|g2fg edBd|"D"afge dBAF|DEFD "Em"E4:|`},{id:"mason-apron",genre:"Celtic",abc:`X:1
T:The Mason's Apron
O:Irish / Scottish
R:reel
M:4/4
L:1/8
Q:1/4=100
K:A
|:"A"ed|cAAA EAAA|cAec dBGB|cAAA EAAA|"E"Bcde "A"cAAe|
"A"cAAA EAAA|cAec dBGB|cAAA EAAA|"E"Bcde "A"cA:|
|:"A"ef|aeef aeef|aecA ecAc|"D"dfed fedf|"E"edcB GABe|
"A"aeef aeef|aecA ecAc|"D"dfed fedc|"E"Bcde "A"cA:|`},{id:"star-of-munster",genre:"Celtic",abc:`X:1
T:The Star of Munster
O:Irish
R:reel
M:4/4
L:1/8
Q:1/4=100
K:Ador
|:"Am"cBAG EAAG|ABcd e2dc|"G"BGGF G2AB|cBAG FGEG|
"Am"cBAG EAAG|ABcd e2dc|"G"BGdB "Am"cAAG|"Em"EG"G"GF "Am"A2A2:|
|:"Am"a2ag eaag|a2ag edcB|"G"g2gf g2ga|gfga gedB|
"Am"a2ag eaag|abag edcB|"G"BGdB "Am"cAAG|"Em"EG"G"GF "Am"A2A2:|`},{id:"morrisons-jig",genre:"Celtic",abc:`X:1
T:Morrison's Jig
O:Irish
R:jig
M:6/8
L:1/8
Q:3/8=100
K:Edor
|:"Em"E3 B3|EBE AFD|E3 B3|"D"ABA FED|
"Em"E3 B3|EBE AFD|"G"G3 FGA|"D"dAG FED:|
|:"Em"Bee fee|aee fee|Bee fee|"D"a2g fed|
"Em"Bee fee|aee fee|"G"gfe "D"d2A|BAG FED:|`},{id:"rights-of-man",genre:"Celtic",abc:`X:1
T:The Rights of Man
O:Irish
R:hornpipe
M:4/4
L:1/8
Q:1/4=90
K:Em
|:"Em"GA|BAGF E2 (3FED|EFGA B2 ef|"D"gfed edBd|cBAG "B7"A2 GA|
"Em"BAGF E2 (3FED|EFGA B2 ef|"D"gfed BcdF|"Em"A2 G2 G2:|
|:"G"Bc|d2 Bd "D"f2 df|"Em"g2 fe "B7"^d2 ef|"Em"gfed "C"e2 dc|"D"BAGF "B7"E2 GA|
"Em"BAGF E2 (3FED|EFGA B2 ef|"D"gfed BcdF|"Em"A2 G2 G2:|`},{id:"haste-to-the-wedding",genre:"Celtic",abc:`X:1
T:Haste to the Wedding
O:Irish
R:jig
M:6/8
L:1/8
Q:3/8=100
K:D
|:"D"AFA Agf|edB cdB|AFA Agf|"A"efe e2g|
"D"fdf "G"gfg|"D"afd "G"B2B|"D"AFA "A"fge|"D"fdd d2:|
|:"D"fga a2f|"G"gab b2g|"D"fga afd|"A"edB c2A|
"D"fga a2f|"G"gab b2g|"D"fed "A"edc|"D"dfd d2:|`},{id:"flowers-of-edinburgh",genre:"Celtic",abc:`X:1
T:Flowers of Edinburgh
O:Scottish
R:reel
M:4/4
L:1/8
Q:1/4=100
K:G
|:"G"GE|D2 DE GFGA|BGBd cBAG|"D"FGAB cBAG|FGAF DEFD|
"G"GABG "C"E2 cE|"G"D2 dB "C"cBAG|"D"FGAF DEFA|"G"G2 G2 G2:|
|:"G"Bc|d2 dg edef|g2 gf gdBG|"C"c2 ce dcBA|"G"B2 Bd "D"cBAG|
"G"FGAB cBAG|DGBd "C"cBAG|"D"FGAF DEFA|"G"G2 G2 G2:|`},{id:"speed-the-plough",genre:"Celtic",abc:`X:1
T:Speed the Plough
O:English
R:reel
M:4/4
L:1/8
Q:1/4=110
K:G
|:"G"BGBG BGBG|"D"AFAF AFAF|"G"GABc dedc|"D"BcAB "G"G2 G2:|
|:"G"Bdgd Bdgd|"C"cege cege|"G"Bdgd Bdgd|"D"cBAG "G"GABc|
"G"dedB "C"cdec|"G"BcdB "D"A2 A2|"G"GABc "D"dedc|"D"BcAB "G"G2 G2:|`},{id:"planxty-irwin",genre:"Celtic",abc:`X:1
T:Planxty Irwin
C:Turlough O'Carolan (1670–1738)
R:waltz
M:3/4
L:1/8
Q:1/4=110
K:G
|:"G"D2|G2 G2 AB|"C"c2 B2 A2|"G"B2 G2 GA|"D"B2 A2 D2|
"G"G2 G2 AB|"C"c2 B2 A2|"D"BA G2 F2|"G"G4:|
|:"G"Bc|d2 d2 ef|g2 d2 B2|"C"c2 e2 dc|"G"B2 G2 Bc|
"G"d2 d2 ef|g2 d2 B2|"C"c2 B2 A2|"G"B2 G2 Bc|
"G"d2 g2 d2|"C"e2 c2 A2|"G"B2 G2 GA|"D"B2 A2 D2|
"G"G2 G2 AB|"C"c2 B2 A2|"D"BA G2 F2|"G"G4:|`},{id:"si-bheag",genre:"Celtic",abc:`X:1
T:Sí Bheag, Sí Mhór
C:Turlough O'Carolan (1670–1738)
R:waltz
M:3/4
L:1/8
Q:1/4=100
K:D
|:"D"de|f2 e2 d2|"G"B4 dB|"D"A2 F2 A2|"G"B4 AB|"D"d2 e2 f2|"G"e2 d2 B2|"A"A6-|A4:|
|:"D"de|f4 g2|a4 g2|"D"f2 d2 f2|"A"e4 de|"D"f2 e2 d2|"G"B4 dB|"D"A2 F2 "A"E2|"D"D6-|D4:|`},{id:"fanny-power",genre:"Celtic",abc:`X:1
T:Fanny Power
C:Turlough O'Carolan (1670–1738)
R:waltz
M:3/4
L:1/8
Q:1/4=110
K:G
|:"G"D2|G2 G2 AB|"C"c2 B2 A2|"G"B2 G2 B2|"D"d4 cB|
"C"A2 G2 FG|"D"A2 D2 GF|"C"E2 G2 "D"F2|"G"G4:|
|:"G"Bc|d2 g2 g2|"C"g4 fe|"G"d2 B2 G2|"D"A4 Bc|
"G"d2 g2 g2|"C"g4 fe|"G"d2 B2 "D"A2|"G"G4:|`},{id:"scotland-the-brave",genre:"Celtic",abc:`X:1
T:Scotland the Brave
O:Scottish
R:march
M:4/4
L:1/8
Q:1/4=100
K:D
"D"D2 D>E F>D F>A|d2 d>c d2 A2|"G"B>B A>G "D"F>G A>F|"A"E4 E4|
"D"D2 D>E F>D F>A|d2 d>c d2 A2|"G"B>B A>G "A"F>G A>E|"D"D4 D4|
"D"f4 f>e d>e|f>e d>B A4|"G"B>B A>G "D"F>G A>F|"A"E4 E4|
"D"D2 D>E F>D F>A|d2 d>c d2 A2|"G"B>B A>G "A"F>G A>E|"D"D4 D4|]`},{id:"bonnie-dundee",genre:"Celtic",abc:`X:1
T:Bonnie Dundee
O:Scottish
R:jig
M:6/8
L:1/8
Q:3/8=90
K:D
|:"D"A|AFD D2E|F2G A2B|"G"B2G "D"F2D|"A"E3 E2A|
"D"AFD D2E|F2G A2d|"G"BAG "A"FGE|"D"D3 D2:|
|:"D"d|dcd f2e|d2c d2A|"G"B2G "D"F2D|"A"E3 E2A|
"D"AFD D2E|F2G A2d|"G"BAG "A"FGE|"D"D3 D2:|`},{id:"mairis-wedding",genre:"Celtic",abc:`X:1
T:Mairi's Wedding (Lewis Bridal Song)
O:Scottish (trad.)
R:reel
M:4/4
L:1/8
Q:1/4=110
K:G
"G"G2 G2 G2 AB|"C"c4 B4|"D"A2 A2 A2 Bc|"G"d4 B4|
"G"G2 G2 G2 AB|"C"c4 B2 G2|"D"A2 B2 c2 A2|"G"G8|
"G"g4 d4|"C"e2 d2 c2 B2|"D"A2 A2 A2 Bc|"G"d4 B4|
"G"G2 G2 G2 AB|"C"c4 B2 G2|"D"A2 B2 c2 A2|"G"G8|]`},{id:"blackberry-blossom",genre:"Bluegrass",abc:`X:1
T:Blackberry Blossom
O:American
R:reel
M:4/4
L:1/8
Q:1/4=100
K:G
|:"G"BAGB "D"AGFA|"Em"G2 E2 "C"E3 D|"G"B,DGB "D"AGFA|"Em"GAGF E2 FG|
"G"BAGB "D"AGFA|"Em"G2 E2 "C"E3 D|"G"B,DGB "D"AGFA|"G"G2 G2 G4:|
|:"Em"B2 GB e2 Be|g2 eg b3 a|"Em"gfe^d e2 Bc|d2 dc BAGF|
"Em"E2 G2 B2 e2|g2 eg b3 a|"G"gfga "D"bgaf|"G"g2 g2 g4:|`},{id:"salt-creek",genre:"Bluegrass",abc:`X:1
T:Salt Creek
O:American
R:reel
M:4/4
L:1/8
Q:1/4=100
K:A
|:"A"e2 ec BcAB|cBAc e2 ef|"G"g2 gf gfed|"G"BAGB d2 ef|
"A"e2 ec BcAB|cBAc e2 ef|"G"gfed BAGB|"E"ABcB "A"A4:|
|:"A"A2 cB A2 AB|cBAc e2 ef|"G"g2 gf gfed|BAGB d2 ef|
"A"A2 cB A2 AB|cBAc e2 ef|"G"gfed BAGB|"E"ABcB "A"A4:|`},{id:"forked-deer",genre:"Old-Time",abc:`X:1
T:Forked Deer
O:American
R:reel
M:4/4
L:1/8
Q:1/4=100
K:D
|:"D"fe|dcdB A2FA|dcdB A2fe|dcdB AFED|"A"EFGF E2fe|
"D"dcdB A2FA|dcdB A2fe|dcdB AFEF|"D"D2 F2 D2:|
|:"D"FG|ABAF ABAF|ABAF E2FG|ABAF ABde|"A"fdec d2FG|
"D"ABAF ABAF|dcdB A2fe|dcdB AFEF|"D"D2F2 D2:|`},{id:"over-the-waterfall",genre:"Old-Time",abc:`X:1
T:Over the Waterfall
O:American
R:reel
M:4/4
L:1/8
Q:1/4=100
K:D
|:"D"de|f2 ef d2 Bd|"G"A2 FA B2 dB|"D"A2 FA DEFA|"A"G2 E2 E2 de|
"D"f2 ef d2 Bd|"G"A2 FA B2 dB|"D"A2 FA "A"EFGE|"D"D2 F2 D2:|
|:"G"g2 fg ed B2|"D"d2 df a2 fa|"G"g2 fg edBd|"A"e4 e2 de|
"G"g2 fg ed B2|"D"d2 df a3 f|"A"edcB A2 c2|"D"d6:|`},{id:"golden-slippers",genre:"Old-Time",abc:`X:1
T:Golden Slippers
C:James A. Bland (1879)
R:reel
M:4/4
L:1/8
Q:1/4=110
K:G
"G"B2 Bc d2 B2|G2 Bd g4|"D"A2 AB c2 A2|F2 Ac f4|
"G"B2 Bc d2 B2|G2 Bd g2 fe|"D"d2 c2 A2 F2|"G"G6 z2|
"C"e2 e2 e2 ed|"G"d4 B4|"D"A2 AB c2 A2|"G"B2 Bc d4|
"C"e2 e2 e2 ed|"G"d2 B2 G2 B2|"D"A2 A2 c2 F2|"G"G6 z2|]`},{id:"westphalia-waltz",genre:"Old-Time",abc:`X:1
T:Westphalia Waltz
O:American (Polish origin)
R:waltz
M:3/4
L:1/8
Q:1/4=120
K:G
"G"D2|G4 AB|d4 B2|"C"c2 B2 A2|"G"B4 G2|"D"A4 FA|d4 c2|"D"A2 F2 D2|"G"G4 D2|
"G"G4 AB|d4 B2|"C"e4 dc|"G"B4 G2|"D"A2 B2 c2|"D"d2 c2 A2|"D"F2 A2 F2|"G"G4|]`},{id:"the-parting-glass",genre:"Celtic",abc:`X:1
T:The Parting Glass
O:Irish / Scottish
R:air
M:3/4
L:1/8
Q:1/4=80
K:Em
"Em"E2|"Em"G4 A2|"G"B4 d2|"D"A4 G2|"Em"E4 D2|"Em"E4 G2|"D"A4 B2|"Em"G6-|G4 E2|
"Em"G4 A2|"G"B4 d2|"D"A4 G2|"Em"E4 D2|"Em"E4 G2|"D"A2 G2 F2|"Em"E6-|E4 B2|
"G"d4 e2|"Em"g4 e2|"D"d4 B2|"Em"G4 B2|"G"d4 e2|"D"d4 B2|"D"A6-|A4 B2|
"G"d4 e2|"Em"g4 e2|"D"d4 B2|"Em"G4 E2|"Em"E4 G2|"D"A2 G2 F2|"Em"E6-|E4|]`},{id:"star-county-down",genre:"Celtic",abc:`X:1
T:Star of the County Down
O:Irish
R:waltz
M:3/4
L:1/8
Q:1/4=120
K:Em
B,2|"Em"E2 E2 D2|E2 G2 A2|"G"B2 B2 A2|B4 d2|"D"e2 d2 B2|"Em"A2 G2 E2|"D"D2 E2 D2|"Em"B,4 B,2|
"Em"E2 E2 D2|E2 G2 A2|"G"B2 B2 A2|B4 d2|"D"e2 d2 B2|"Em"A2 G2 E2|"D"F2 D2 D2|"Em"E4 B2|
"G"d2 e2 d2|"G"B2 A2 G2|"D"A2 B2 A2|"Em"E4 G2|"G"d2 e2 d2|"Em"B2 A2 G2|"D"A2 B2 A2|"B7"B4 B,2|
"Em"E2 E2 D2|E2 G2 A2|"G"B2 B2 A2|B4 d2|"D"e2 d2 B2|"Em"A2 G2 E2|"D"F2 D2 D2|"Em"E4|]`},{id:"sally-gardens",genre:"Celtic",abc:`X:1
T:Down by the Sally Gardens
O:Irish
R:air
M:3/4
L:1/8
Q:1/4=90
K:D
"D"FE|D2 E2 F2|"G"B4 AF|"D"A4 "A"FE|"D"F4 FE|
"D"D2 E2 F2|"G"B4 AF|"D"A4 "A"E2|"D"D4 FE|
"D"D2 E2 F2|"G"B4 AF|"D"A4 "A"FE|"D"F4 FE|
"D"D2 E2 F2|"G"B4 AF|"D"A4 "A"E2|"D"D4|]`},{id:"whiskey-in-the-jar",genre:"Celtic",abc:`X:1
T:Whiskey in the Jar
O:Irish
R:march
M:4/4
L:1/8
Q:1/4=110
K:D
"D"A2|A2 A2 A2 FA|"Bm"B2 B2 B2 Bc|"G"d2 c2 B2 A2|"D"F4 A4|
"D"A2 A2 A2 FA|"Bm"B2 B2 B2 Bc|"G"d2 c2 B2 A2|"D"F6 z2|
"A"E2 E2 E2 FG|"D"A2 F2 D4|"A"E2 E2 E2 FG|"D"A2 F2 D2 D2|
"D"d4 d4|"A"c4 c4|"G"B2 B2 "A"A2 G2|"D"F2 E2 D2|]`}],hs=[{id:"ode-to-joy",genre:"Classical",abc:`X:1
T:Ode to Joy (Symphony No. 9)
C:Ludwig van Beethoven (1824)
M:4/4
L:1/4
Q:1/4=110
K:D
"D"F F G A|A G F E|D D E F|"A"F>E E2|
"D"F F G A|A G F E|D D E F|"A"E>D "D"D2|
"A"E E F D|E F/G/ F D|E F/G/ F E|D E A,2|
"D"F F G A|A G F E|D D E F|"A"E>D "D"D2|]`},{id:"minuet-g-petzold",genre:"Classical",abc:`X:1
T:Minuet in G (BWV Anh. 114)
C:Christian Petzold (attr. J.S. Bach)
M:3/4
L:1/8
Q:1/4=120
K:G
|:"G"d2 GA Bc|d2 G2 G2|"C"e2 cd ef|"G"g2 G2 G2|
"C"c2 dc BA|"G"B2 cB AG|"D"F2 GA BG|A6|
"G"d2 GA Bc|d2 G2 G2|"C"e2 cd ef|"G"g2 G2 G2|
"C"c2 dc BA|"G"B2 cB AG|"D"A2 BA GF|"G"G6:|
|:"G"b2 ga bg|"D"a2 de fd|g2 ef ge|f2 AB cA|
"G"G2 AB cd|"D"e2 ef ga|"D"f2 e2 d2|^c6|
"D"d2 AB cd|"G"B2 cB AG|"D"F2 GA BG|"D"A2 DE FG|
"C"A2 cB AG|"G"B2 cB AG|"D"A2 BA GF|"G"G6:|`},{id:"musette-d",genre:"Classical",abc:`X:1
T:Musette in D (BWV Anh. 126)
C:J.S. Bach (attr.)
M:2/4
L:1/8
Q:1/4=110
K:D
|:"D"a2 af|d2 df|a2 af|d2 df|"A"ef ge|fa ge|fd ec|"D"d2 d2:|
|:"A"e2 ec|A2 Ac|e2 ec|A2 Ac|"D"fa ge|fa ge|fd ec|"D"d2 d2:|`},{id:"gavotte-gossec",genre:"Classical",abc:`X:1
T:Gavotte
C:François-Joseph Gossec (1786)
M:4/4
L:1/8
Q:1/4=110
K:D
|:"D"FA dc dc|BA GF G2 F2|"A"EG cB cB|AG FE F2 E2|
"D"FA dc dc|BA GF G2 F2|"A"EF GA Bc dB|"A"A2 c2 "D"d4:|
|:"A"ec Ac ec Ac|"D"fd Ad fd Ad|"A"ec Ac ec Ac|"E"BA ^GF "A"A4|
"D"FA dc dc|BA GF G2 F2|"A"EF GA Bc dB|"A"A2 c2 "D"d4:|`},{id:"eine-kleine",genre:"Classical",abc:`X:1
T:Eine kleine Nachtmusik (1st mvt.)
C:Wolfgang Amadeus Mozart (1787)
M:4/4
L:1/8
Q:1/4=120
K:G
"G"G2 z D G2 z D|GDGB d2 z2|"C"c2 z A c2 z A|"D"cAFA D2 z2|
"G"G4 B>A G2|G2 FF F4|"D"A>c FA G2 G2|G2 BB B4|
"D"d>c BA BA AG|AG GF ^FG GA|"G"Bc dc BA GF|G2 z2 z4|]`},{id:"spring-vivaldi",genre:"Classical",abc:`X:1
T:Spring (The Four Seasons, 1st mvt.)
C:Antonio Vivaldi (1725)
M:4/4
L:1/8
Q:1/4=100
K:E
"E"e2|g2 gg f/e/b2 b|g2 gg f/e/b2 b|g a/b/ a2 g2 f2|e4 z2 e2|
g2 gg f/e/b2 b|g2 gg f/e/b2 b|g a/b/ a2 g2 f2|e4 z2|]`},{id:"brahms-lullaby",genre:"Classical",abc:`X:1
T:Lullaby (Wiegenlied, Op. 49 No. 4)
C:Johannes Brahms (1868)
M:3/4
L:1/4
Q:1/4=90
K:D
F/F/|"D"A2 F/F/|A2 F/A/|d c3/2 B/|"A"B A E/F/|G E E/F/|G2 E/G/|c/B/ A c|"D"d2 D/D/|
d2 B/G/|A2 F/D/|"G"G A B|"D"A2 D/D/|d2 B/G/|A2 F/D/|"A"G F/E/ D|"D"D2|]`},{id:"hungarian-dance-5",genre:"Classical",abc:`X:1
T:Hungarian Dance No. 5
C:Johannes Brahms (1869)
M:2/4
L:1/8
Q:1/4=88
K:Gm
"Gm"D4-|D2 G2|_B4-|B2 A>G|"D"^F4-|F2 A2|"Gm"G4-|G2 z2|
"Cm"C4-|C2 F2|_E4-|E2 D>C|"Gm"B,4-|B,2 D2|"D"^C4-|C2 z2|
"Gm"D4-|D2 G2|_B4-|B2 A>G|"D"^F4-|F2 A2|"Gm"G2 ^F2|G2 A2|
"Cm"_B2 c2|d2 _e2|"Gm"d2 c2|_B2 A2|"D"G2 ^F2|A2 D2|"Gm"G4|z4|]`},{id:"new-world-largo",genre:"Classical",abc:`X:1
T:Largo (New World Symphony) — "Goin' Home"
C:Antonín Dvořák (1893)
M:4/4
L:1/8
Q:1/4=60
K:D
"D"F3 A A4|F3 E D4|"G"E3 F A3 F|"A"E8|
"D"F3 A A4|F3 E D4|"A"E3 F E3 D|"D"D8|]`},{id:"morning-mood",genre:"Classical",abc:`X:1
T:Morning Mood (Peer Gynt)
C:Edvard Grieg (1875)
M:6/8
L:1/8
Q:3/8=60
K:E
"E"BGF EFG|BGF EFG|BGB cGc|BGF E3|
BGF EFG|BGF EFG|BGB cGc|e3 c3|]`},{id:"mountain-king",genre:"Rock & Metal",abc:`X:1
T:In the Hall of the Mountain King
C:Edvard Grieg (1875)
M:4/4
L:1/8
Q:1/4=120
K:Bm
"Bm"B,^CDE F2D2|"F#"^E2^C2 =E2C2|"Bm"D2B,2 D4|
"Bm"B,^CDE F2D2|"F#"^E2^C2 =E2C2|"Bm"D2B,2 D4|
"F#"F^GAB c2A2|^e2c2 =e2c2|"F#"d2B2 d4|
"F#"F^GAB c2A2|^e2c2 =e2c2|"F#"F8|
"Bm"B,^CDE F2D2|"F#"^E2^C2 =E2C2|"Bm"D2B,2 D4|
"Bm"B,^CDE F2D2|"F#"^E2^C2 =E2C2|"Bm"D2B,2 D4|
"F#"F^GAB c2A2|^e2c2 =e2c2|"F#"d2B2 d4|
"F#"F^GAB c2A2|^e2c2 =e2c2|"Bm"B8|]`},{id:"pachelbel-canon",genre:"Classical",abc:`X:1
T:Canon in D (melody)
C:Johann Pachelbel (c. 1680)
M:4/4
L:1/4
Q:1/4=70
K:D
"D"f2 "A"e2|"Bm"d2 "F#m"c2|"G"B2 "D"A2|"G"B2 "A"c2|
"D"d2 "A"c2|"Bm"B2 "F#m"A2|"G"G2 "D"F2|"G"G2 "A"E2|
"D"D/F/A/G/ "A"F/D/F/E/|"Bm"D/B,/D/A/ "F#m"G/B/A/G/|"G"F/D/E/c/ "D"d/f/a/a,/|"G"b,/g/f/e/ "A"f/e/d/c/|
"D"d/c/d/D/ "A"C/A/E/F/|"Bm"D/d/c/B/ "F#m"c/f/a/b/|"G"g/f/e/g/ "D"f/e/d/c/|"G"B/A/G/F/ "A"E/G/F/E/|"D"D4|]`},{id:"jesu-joy",genre:"Classical",abc:`X:1
T:Jesu, Joy of Man's Desiring
C:J.S. Bach (1723)
M:3/4
L:1/8
Q:1/4=90
K:G
"G"GAB dcc|edd gfg|"D"dBG ABc|"G"dedcBA|
"G"BcdAGF|GDG BAB|"Em"GAB dcc|edd gfg|
"D"dBG ABc|DGF EDC|"D"B,DG FA,F|"G"G6|]`},{id:"air-g-string",genre:"Classical",abc:`X:1
T:Air on the G String
C:J.S. Bach (c. 1730)
M:4/4
L:1/8
Q:1/4=50
K:D
"D"f8-|f2 "F#m"(3bge "Bm"d/c/d/e/ "D"d/c/B/A/|"G"G2 B4 e2|"A"e/c/d/B/ A>G F2 E2|"D"D8|]`},{id:"surprise-symphony",genre:"Classical",abc:`X:1
T:Surprise Symphony (2nd mvt.)
C:Joseph Haydn (1791)
M:2/4
L:1/8
Q:1/4=90
K:C
"C"CC EE|GG E2|FF DD|"G"B,B, G,2|
"C"CC EE|GG E2|"G"F/E/D/E/ "C"FE|"G"D2 z2|
"G"DD FF|"C"EE G2|"G"DD FF|"C"E E G2|
"C"CC EE|GG E2|"G"F/E/D/E/ "C"FE|"C"C2 z2|]`},{id:"rondo-alla-turca",genre:"Classical",abc:`X:1
T:Rondo alla Turca (theme)
C:Wolfgang Amadeus Mozart (1783)
M:2/4
L:1/16
Q:1/4=110
K:Am
"Am"BA^GA c4|dc^Bc e4|fe^de bagf|"E"e4 "Am"c'4|
"Am"a2 c'2 "E"b2 a2|"Am"g2 a2 "E"b2 a2|"Am"g2 a2 "E"b2 a2|"Am"g2 f2 e4|]`},{id:"the-swan",genre:"Classical",abc:`X:1
T:The Swan (Carnival of the Animals)
C:Camille Saint-Saëns (1886)
M:6/4
L:1/8
Q:1/4=80
K:G
"G"g6- g2 f2 b2|e2 d2 g4 B4|"C"c4 d2 e2 g2 c'2|"G"b6- b4 B2|
"Am"c4 d2 e2 c2 e2|"D"a6 g2 f2 e2|"G"d6- d4|]`},{id:"swan-lake",genre:"Classical",abc:`X:1
T:Swan Lake (Scene theme)
C:Pyotr Ilyich Tchaikovsky (1876)
M:4/4
L:1/8
Q:1/4=72
K:Bm
"Bm"F8|B,C DE F4|D2 F2 D2 F2|B,2 D2 B,4|
"G"G8|"Em"E2 G2 E2 B,2|"F#"^A,4 C4|"Bm"B,8|]`},{id:"sugar-plum",genre:"Classical",abc:`X:1
T:Dance of the Sugar Plum Fairy
C:Pyotr Ilyich Tchaikovsky (1892)
M:2/4
L:1/16
Q:1/4=72
K:Em
"Em"g2e2 g2^f2|e2^d2 e2 z2|"B7"^d2^d2 ^d2^c2|"Em"e2e2 e2 z2|
"Em"g2e2 g2^f2|e2^d2 e2 z2|"Am"c2c2 B2A2|"B7"B4 z4|]`},{id:"can-can",genre:"Classical",abc:`X:1
T:Can-Can (Galop Infernal)
C:Jacques Offenbach (1858)
M:2/4
L:1/8
Q:1/4=140
K:D
"D"D2 EG|FE Ac|BA AE|"A"GF E2|
"A"E2 EG|FE Ac|BA AE|"D"FE D2|
"D"D2 EG|FE Ac|BA AE|"A"GF E2|
"A"E2 EG|FE Ac|BA EF|"D"D2 z2|]`},{id:"william-tell",genre:"Rock & Metal",abc:`X:1
T:William Tell Overture (Finale)
C:Gioachino Rossini (1829)
M:2/4
L:1/16
Q:1/4=120
K:E
"E"BBB2 BBB2|BBBe e2f2|"B"g2BB BBB2|BBBe "E"g2e2|
"E"BBB2 BBB2|BBBe e2f2|"B"g2fe dBdf|"E"e4 z4|
"E"BBB2 BBB2|BBBe e2f2|"B"g2BB BBB2|BBBe "E"g2e2|
"E"BBB2 BBB2|BBBe e2f2|"B"g2fe dBdf|"E"e4 z4|]`},{id:"habanera",genre:"Classical",abc:`X:1
T:Habanera (Carmen)
C:Georges Bizet (1875)
M:2/4
L:1/16
Q:1/4=70
K:Dm
"Dm"d4 ^c2c2|=c4 B2B2|"A7"_B2 A2 A2 _A2|G4 F4|
"Dm"F2 E2 E2 _E2|D4 ^C4|"A7"E2 D2 ^C2 B,2|"Dm"A,4 z4|]`},{id:"toreador",genre:"Classical",abc:`X:1
T:Toreador Song (Carmen)
C:Georges Bizet (1875)
M:4/4
L:1/8
Q:1/4=100
K:F
"F"c2 d>c A2 A2|A>G A>B A4|"Bb"B>G "F"c>A B>G "C"E2|"F"F8|
"Dm"d2 c>B A2 G2|"C"A>G A>B G4|"F"c3 B A2 G2|"C"G6 z2|]`},{id:"blue-danube",genre:"Classical",abc:`X:1
T:The Blue Danube
C:Johann Strauss II (1867)
M:3/4
L:1/4
Q:1/4=150
K:D
"D"D D F|A3|A z a|a z f|f z D|D F A|A3|A z a|a z g|g z C|
"A"C E B|B3|B z b|b z g|g z C|C E B|B3|B z b|b z f|f z D|
"D"D F A|d3|d z d'|d' z a|a z D|D F A|d3|d z d'|d' z b|b z e|
"A"g3|^g2 a|"D"f'3|f'2 d'|"G"f2 e2|"A"b2 a2|"D"d3|]`},{id:"radetzky",genre:"Classical",abc:`X:1
T:Radetzky March (trio theme)
C:Johann Strauss I (1848)
M:2/4
L:1/8
Q:1/4=110
K:D
"D"A>A AA|A2 f2|"A"e>d cd|e2 c2|"A"e>e ee|e2 g2|"D"f>e de|f2 d2|
"D"A>A AA|A2 f2|"A"e>d cd|e2 c2|"A"e>e ef|"G"g>f "A"ec|"D"d2 z2|]`},{id:"la-donna",genre:"Classical",abc:`X:1
T:La donna è mobile (Rigoletto)
C:Giuseppe Verdi (1851)
M:3/8
L:1/8
Q:3/8=60
K:A
"A"c2c|c>e d|"E"B3|B2 z|"E"d2d|d>f e|"A"c3|c2 z|
"A"c2c|c>e d|"E"B3|B2 z|"E"d2 d|d>f e|"A"c3-|c2 z|]`},{id:"brindisi",genre:"Classical",abc:`X:1
T:Brindisi (La Traviata)
C:Giuseppe Verdi (1853)
M:3/8
L:1/8
Q:3/8=60
K:Bb
F|"Bb"f2 f|f2 e|"Bb"d2 d|d2 c|"Bb"B2 c|d2 e|"F"f2 g|f2 F|
"Bb"f2 f|f2 e|"Bb"d2 d|d2 c|"F"c2 d|e2 c|"Bb"B3-|B2|]`},{id:"o-mio-babbino",genre:"Classical",abc:`X:1
T:O mio babbino caro (Gianni Schicchi)
C:Giacomo Puccini (1918)
M:6/8
L:1/8
Q:3/8=50
K:Ab
"Ab"E|c3 B>A B|"Db"F3- F2 B|"Ab"E3 A>c e|"Eb"e3 d2 E|
"Ab"c3 B>A B|"Db"F3- F2 B|"Ab"E2 A c2 e|"Eb"e3 d2|]`},{id:"humoresque",genre:"Classical",abc:`X:1
T:Humoresque (Op. 101 No. 7)
C:Antonín Dvořák (1894)
M:2/4
L:1/16
Q:1/4=70
K:G
"G"G3A G3A|B3d e3d|"D"g3e d3B|"G"A3B A3G|
"G"G3A G3A|B3d e3d|"D"g3e d3B|"G"G8|]`},{id:"liebestraum",genre:"Classical",abc:`X:1
T:Liebestraum No. 3 (theme)
C:Franz Liszt (1850)
M:6/4
L:1/8
Q:1/4=90
K:Ab
"Ab"c6 c4 B2|c6 "Db"d4 c2|"Ab"c6 B4 A2|"Eb"B6- B6|
"Ab"c6 c4 B2|c6 "Db"f4 e2|"Ab"e6 "Eb"d4 c2|"Ab"c12|]`},{id:"wedding-march",genre:"Classical",abc:`X:1
T:Wedding March (A Midsummer Night's Dream)
C:Felix Mendelssohn (1842)
M:4/4
L:1/8
Q:1/4=100
K:C
"C"G>GGG G4|"F"G>GGG A4|"G7"F>FFF F2 G2|"C"E>FGc e4|
"Am"d>ccB c2 A2|"Dm"A>GFE "G"D4|"C"G>Gcc e2 d2|"G"c2 B2 "C"c4|]`},{id:"bridal-chorus",genre:"Classical",abc:`X:1
T:Bridal Chorus (Here Comes the Bride)
C:Richard Wagner (1850)
M:4/4
L:1/8
Q:1/4=80
K:G
"G"D4 G3G|G6 z2|"D"D4 A3F|"G"G6 z2|
"G"D4 G3c|"C"c4 B3A|"D"G3F G3A|"G"B6 z2|]`},{id:"ave-maria-schubert",genre:"Classical",abc:`X:1
T:Ave Maria
C:Franz Schubert (1825)
M:4/4
L:1/8
Q:1/4=50
K:Bb
"Bb"B4 A>B dc|"F"B6 z2|"Bb"d3 d e>dcB|"F"c6 z2|
"Gm"d3 d g>f e>d|"Cm"c4 =B>c ed|"F"c2 B2 "F7"c>BAG|"Bb"B6 z2|]`},{id:"schubert-serenade",genre:"Classical",abc:`X:1
T:Serenade (Ständchen)
C:Franz Schubert (1828)
M:3/4
L:1/8
Q:1/4=80
K:Dm
"Dm"A>^G A2 F2|D4 A,2|"A"A>^G A2 ^C2|"Dm"D4 z2|
"Dm"d>^c d2 A2|F4 D2|"Gm"_B>A G2 E2|"A"^C4 z2|]`},{id:"pomp-circumstance",genre:"Classical",abc:`X:1
T:Pomp and Circumstance March No. 1 (Trio)
C:Edward Elgar (1901)
M:4/4
L:1/4
Q:1/4=72
K:G
"G"B3 A|G A B c|"D"A4|z D E F|"C"G2 E F|"G"G A B c|"D"A4|z4|
"G"B3 A|G A B c|"C"e d c B|"Am"B2 A2|"D"d2 A B|"G"c B A G|"D"A4|"G"G4|]`},{id:"trumpet-voluntary",genre:"Classical",abc:`X:1
T:Prince of Denmark's March (Trumpet Voluntary)
C:Jeremiah Clarke (c. 1700)
M:4/4
L:1/8
Q:1/4=90
K:D
"D"A2|d4 A2 d2|"A"c2 B2 A2 e2|"D"f3 e d2 c2|"A"d4 A2 A2|
"D"d4 A2 d2|"G"B2 A2 G2 B2|"A"A2 G2 F2 E2|"D"D6|]`},{id:"water-music-hornpipe",genre:"Classical",abc:`X:1
T:Hornpipe (Water Music)
C:George Frideric Handel (1717)
M:3/2
L:1/8
Q:1/2=60
K:D
"D"d2 A2 F2 A2 d2 f2|"A"e2 c2 A2 c2 e2 a2|"D"f2 d2 "G"g2 B2 "A"e2 c2|"D"d4 A4 D4|
"D"F2 A2 d4 A4|"A"E2 A2 c4 A4|"D"f2 e2 "A"d2 c2 B2 A2|"D"d4 D4 z4|]`},{id:"largo-xerxes",genre:"Classical",abc:`X:1
T:Largo (Ombra mai fù, Xerxes)
C:George Frideric Handel (1738)
M:3/4
L:1/8
Q:1/4=50
K:G
"G"G6-|G2 A2 B2|"C"c3 B A2|"G"B4 G2|"D"A4 d2-|d2 c2 B2|"Em"B4 A2|"D"A6|
"G"G6-|G2 A2 B2|"C"c3 d e2|"G"d4 B2|"D"A2 B2 c2|"G"B2 A2 G2|"D"A4 F2|"G"G6|]`},{id:"bach-minuet-2",genre:"Classical",abc:`X:1
T:Minuet in G minor (BWV Anh. 115)
C:Christian Petzold (attr. J.S. Bach)
M:3/4
L:1/8
Q:1/4=110
K:Gm
|:"Gm"d4 Bc|d2 G2 G2|"Cm"e4 cd|"Gm"e2 G2 G2|
"Cm"c2 B2 A2|"Gm"B2 A2 G2|"D"^F2 G2 A2|"Gm"D4 B2|
"Gm"d4 Bc|d2 G2 G2|"Cm"e4 cd|"Gm"e2 G2 G2|
"Cm"c2 B2 A2|"Gm"B2 A2 G2|"D"A2 G2 ^F2|"Gm"G6:|`},{id:"bourree-handel",genre:"Classical",abc:`X:1
T:Bourrée
C:George Frideric Handel
M:2/2
L:1/8
Q:1/2=70
K:G
|:"G"G2|B2 G2 d2 B2|"C"c2 B2 A2 G2|"D"F2 G2 A2 F2|"G"G6 B2|
"G"d2 B2 g2 d2|"C"e2 d2 c2 B2|"D"A2 B2 c2 A2|"G"B6:|`},{id:"boccherini-minuet",genre:"Classical",abc:`X:1
T:Minuet (String Quintet Op. 11 No. 5)
C:Luigi Boccherini (1771)
M:3/4
L:1/16
Q:1/4=100
K:A
"A"c2B2 A4 A4|e2d2 c4 c4|"E"B2c2 d2e2 f2g2|"A"a4 c4 z4|
"A"c2B2 A4 A4|e2d2 c4 c4|"E"Bcde fgab "E"g4|"A"a4 A4 z4|]`},{id:"moonlight-sonata",genre:"Classical",abc:`X:1
T:Moonlight Sonata (1st mvt. melody)
C:Ludwig van Beethoven (1801)
M:4/4
L:1/8
Q:1/4=50
K:C#m
"C#m"z4 z2 G>G|G6 G>G|"A"G4 A4|"F#m"G4 "G#"^F4|"C#m"E6 G>G|G6 G>G|"G#"G4 A4|"C#m"G8|]`},{id:"fur-elise",genre:"Classical",abc:`X:1
T:Für Elise (theme)
C:Ludwig van Beethoven (1810)
M:3/8
L:1/16
Q:3/8=50
K:Am
e^d|"Am"e^deB=dc|"Am"A2 z CEA|"E"B2 z E^GB|"Am"c2 z Ee^d|
"Am"e^deB=dc|"Am"A2 z CEA|"E"B2 z EcB|"Am"A4|]`},{id:"turkish-march-beethoven",genre:"Classical",abc:`X:1
T:Turkish March (The Ruins of Athens)
C:Ludwig van Beethoven (1811)
M:2/4
L:1/16
Q:1/4=100
K:Bb
"Bb"d2c2 d4|c2B2 c4|"F"c2=B2 c2d2|"Bb"e4 d4|
"Bb"d2c2 d4|c2B2 c4|"F"c2B2 A2c2|"Bb"B4 z4|]`},{id:"spring-song",genre:"Classical",abc:`X:1
T:Spring Song (Op. 62 No. 6)
C:Felix Mendelssohn (1842)
M:2/4
L:1/16
Q:1/4=80
K:A
"A"e4 e3c|e4 a4|"D"f4 d3f|"A"e4 c4|"E"B4 B3c|d4 B4|"A"c4 A4|"E"B8|]`},{id:"nocturne-chopin",genre:"Classical",abc:`X:1
T:Nocturne Op. 9 No. 2 (theme)
C:Frédéric Chopin (1832)
M:12/8
L:1/8
Q:3/8=50
K:Eb
B,|"Eb"G4 F2 G4 E2|"Bb"E6 B,4 B,2|"Eb"G3 F2 G2 F2 E2 G2|"Ab"F6- F4 B,2|"Eb"G4 F2 G4 E2|"Bb"E6 B,4|]`},{id:"salut-damour",genre:"Classical",abc:`X:1
T:Salut d'Amour
C:Edward Elgar (1888)
M:2/4
L:1/8
Q:1/4=60
K:E
"E"B,|E2 ^D>E|G2 B,2|"A"c3 B|"E"G2 z B,|"F#m"F2 ^E>F|"B7"A2 B,2|"E"B3 A|G2 z|]`},{id:"meditation-thais",genre:"Classical",abc:`X:1
T:Méditation (Thaïs)
C:Jules Massenet (1894)
M:4/4
L:1/8
Q:1/4=50
K:D
"D"F2 A2 d2 f2|"A"e4 "D"d4|"G"B2 d2 g2 b2|"D"a6 f2|"G"g2 e2 "D"d2 A2|"Em"B2 G2 "A7"E2 C2|"D"D8|]`},{id:"csardas",genre:"Classical",abc:`X:1
T:Csárdás (Largo theme)
C:Vittorio Monti (1904)
M:4/4
L:1/8
Q:1/4=60
K:Dm
"Dm"A,8-|A,2 D2 F2 A2|d6 ^c2|"Gm"d2 =c2 _B2 A2|"Dm"A6 F2|"A7"E2 ^C2 E2 G2|"Dm"F2 D2 A,2 D2|F8|]`},{id:"paganini-24",genre:"Rock & Metal",abc:`X:1
T:Caprice No. 24 (theme)
C:Niccolò Paganini (1817)
M:2/4
L:1/16
Q:1/4=90
K:Am
|:"Am"a4 a2c'2|b2a2 e'4|a4 a2c'2|b2a2 e'4|
"Am"a4 a2c'2|b2a2 e'4|"E"e'4 e'2^g'2|"Am"a'4 z4:|
|:"Dm"d'4 d'2f'2|"G"e'2d'2 g'4|"C"c'4 c'2e'2|"F"d'2c'2 f'4|
"Bdim"b4 b2d'2|"E"c'2b2 e'4|"Am"a4 "E"^g2e2|"Am"a4 z4:|`},{id:"bumblebee",genre:"Rock & Metal",abc:`X:1
T:Flight of the Bumblebee
C:Nikolai Rimsky-Korsakov (1900)
M:2/4
L:1/16
Q:1/4=72
K:Am
"Am"e'^d'=d'^c' =c'b_b=b|=c'^c'=d'^d' e'^d'=d'^c'|=c'b_b=b c'^c'd'^d'|e'^d'=d'^c' =c'b_b=b|
"Am"e'^d'=d'^c' =c'b_b=b|=c'^c'=d'^d' e'^d'=d'^c'|"E"^g'^f'=f'e' =e'^d'=d'^c'|"Am"a'4 z4|]`},{id:"toccata-d-minor",genre:"Rock & Metal",abc:`X:1
T:Toccata in D minor (opening)
C:J.S. Bach (attr.)
M:4/4
L:1/16
Q:1/4=60
K:Dm
"Dm"a'2g'2 a'8 z4|g'f'e'd' ^c'4 d'8|"A"a2g2 a8 z4|e2f2 ^c2d2 z8|
"Dm"A2G2 A8 z4|G F E D ^C4 D8|]`},{id:"ride-valkyries",genre:"Rock & Metal",abc:`X:1
T:Ride of the Valkyries
C:Richard Wagner (1856)
M:9/8
L:1/16
Q:3/8=60
K:Bm
"Bm"F B5 d6 B d5|f6 d f5 b6|"D"A d5 f6 d f5|a6 f a5 d'6|
"F#"c f5 a6 f a5|c'6 a c'5 f'6|"Bm"B d5 f6 d f5|"F#"f6 F B5 "Bm"B6|]`},{id:"danse-macabre",genre:"Rock & Metal",abc:`X:1
T:Danse Macabre (waltz theme)
C:Camille Saint-Saëns (1874)
M:3/4
L:1/8
Q:1/4=150
K:Gm
"Gm"D2 G2 G2|G2 ^F2 G2|"Cm"A2 G2 _B2|"D"A4 ^F2|
"Gm"D2 G2 G2|G2 ^F2 G2|"D"A2 G2 ^F2|"Gm"G4 z2|
"Gm"g2 d2 d2|_e2 d2 c2|"D"d2 c2 _B2|A4 ^F2|
"Gm"g2 d2 d2|_e2 d2 c2|"D"_B2 A2 ^F2|"Gm"G4 z2|]`},{id:"night-bald-mountain",genre:"Rock & Metal",abc:`X:1
T:Night on Bald Mountain (theme)
C:Modest Mussorgsky (1867)
M:4/4
L:1/8
Q:1/4=110
K:Dm
"Dm"D2 A2 _B2 A2|^G2 A2 F2 D2|"Gm"G2 _B2 d2 B2|"A"A6 z2|
"Dm"D2 A2 _B2 A2|^G2 A2 F2 D2|"A"E2 ^C2 E2 G2|"Dm"F6 z2|]`},{id:"funeral-march",genre:"Rock & Metal",abc:`X:1
T:Funeral March (Sonata No. 2)
C:Frédéric Chopin (1839)
M:4/4
L:1/8
Q:1/4=50
K:Bbm
"Bbm"F4 F3 F|F4 _A3 G|"Bbm"G3 F F3 =E|"Bbm"F8|
"Bbm"F4 F3 F|F4 _A3 G|"Bbm"G3 F F3 =E|"Bbm"F8|]`},{id:"dies-irae",genre:"Rock & Metal",abc:`X:1
T:Dies Irae (plainchant)
C:Gregorian chant (13th c.)
M:4/4
L:1/4
Q:1/4=80
K:Dm
"Dm"F E F D|E C D2|F F G F|E D E2|
"Dm"F E F D|E C D2|F F G F|E D D2|]`},{id:"bolero",genre:"Rock & Metal",abc:`X:1
T:Bolero (theme)
C:Maurice Ravel (1928)
M:3/4
L:1/16
Q:1/4=72
K:C
"C"c4 Bcdc BAc2|c2Ac c4 BcAG|E2EF A4 G4|"C"F4 E2D2 C4|]`},{id:"korobeiniki",genre:"Rock & Metal",abc:`X:1
T:Korobeiniki (Tetris theme)
O:Russian folk song (1861)
M:4/4
L:1/8
Q:1/4=140
K:Am
"Am"e2 Bc d2 cB|A2 Ac e2 dc|"E"B3 c d2 e2|"Am"c2 A2 A4|
"Dm"z d2 f a2 gf|"C"e3 c e2 dc|"E"B2 Bc d2 e2|"Am"c2 A2 A4|
"Am"e2 Bc d2 cB|A2 Ac e2 dc|"E"B3 c d2 e2|"Am"c2 A2 A4|
"Dm"z d2 f a2 gf|"C"e3 c e2 dc|"E"B2 Bc d2 e2|"Am"c2 A2 A4|]`},{id:"hava-nagila",genre:"Rock & Metal",abc:`X:1
T:Hava Nagila
O:Jewish folk (1918)
M:4/4
L:1/8
Q:1/4=120
K:Dphr
"D"A3 A c2 B2|A4 ^F4|^F3 ^F B2 A2|G4 E4|
"Gm"E3 E G2 F2|E4 D4|"A"^C2 D2 E2 F2|"D"D8|]`}],us=[{id:"jingle-bells",genre:"Holiday",abc:`X:1
T:Jingle Bells
C:James Lord Pierpont (1857)
M:4/4
L:1/8
Q:1/4=120
K:D
"D"F2F2 F4|F2F2 F4|F2A2 D3E|F8|"G"G2G2 G3G|"D"G2F2 F2FF|"A"F2E2 E2F2|E4 A4|
"D"F2F2 F4|F2F2 F4|F2A2 D3E|F8|"G"G2G2 G3G|"D"G2F2 F2FF|"A"A2A2 G2E2|"D"D8|]`},{id:"silent-night",genre:"Holiday",abc:`X:1
T:Silent Night
C:Franz Xaver Gruber (1818)
M:6/8
L:1/8
Q:3/8=50
K:D
"D"A3 BA2|F6|A3 BA2|F6|"A"e3 e2c|c6|"D"d3 d2A|A6|
"G"B3 B2d|"D"d>cB A2B|A3 BA2|F6|"G"B3 B2d|"D"d>cB A2B|A3 BA2|F6|
"A"e3 e2g|e>cA c3|"D"d6|f6|d>AF A>GE|"D"D6-|D6|]`},{id:"joy-to-the-world",genre:"Holiday",abc:`X:1
T:Joy to the World
C:Lowell Mason / G.F. Handel (1839)
M:2/4
L:1/8
Q:1/4=90
K:D
"D"d2 c>B|"A"A3 G|"D"F2 E2|"A"D3 A|B3 B|c3 c|"D"d3 d|d c B A|
"D"A>G FD|d c B A|A>G FF|F F F F/G/|A3 G/F/|E E E E/F/|G3 F/E/|"D"D2 d2|B>A G F|"A"G2 F2|"D"D4|]`},{id:"deck-the-halls",genre:"Holiday",abc:`X:1
T:Deck the Halls
O:Welsh
M:4/4
L:1/8
Q:1/4=110
K:D
"D"A3G F2E2|D2E2 F2D2|"A"EFGE "D"F3E|D2C2 D4|
"D"A3G F2E2|D2E2 F2D2|"A"EFGE "D"F3E|D2C2 D4|
"A"E3F G2E2|"D"F3G A2E2|"A"FG A2 Bc d2|c2B2 A4|
"D"A3G F2E2|D2E2 F2D2|"G"BBBB "D"A3G|F2E2 D4|]`},{id:"o-christmas-tree",genre:"Holiday",abc:`X:1
T:O Christmas Tree (O Tannenbaum)
O:German
M:3/4
L:1/8
Q:1/4=90
K:D
A,2|"D"D3 D D2|E4 F2|F3 F F2|"A"F4 E2|"A"F2 G2 C2|E4 D2|"D"D4|]`},{id:"we-wish-merry-christmas",genre:"Holiday",abc:`X:1
T:We Wish You a Merry Christmas
O:English
M:3/4
L:1/8
Q:1/4=140
K:D
A,2|"D"D2 DE DC|"G"B,2 B,2 B,2|"E"E2 EF ED|"A"C2 A,2 A,2|"F#"F2 FG FE|"Bm"D2 B,2 A,A,|"G"B,2 E2 "A"C2|"D"D4|]`},{id:"hark-herald",genre:"Holiday",abc:`X:1
T:Hark! The Herald Angels Sing
C:Felix Mendelssohn (1840)
M:4/4
L:1/4
Q:1/4=100
K:D
"D"A, D D>C|D F F E|"A"A A A>G|"D"F E F2|
"D"A, D D>C|D F F E|"A"A E E>C|"A"C B, A,2|]`},{id:"o-come-all-ye",genre:"Holiday",abc:`X:1
T:O Come, All Ye Faithful (Adeste Fideles)
C:John Francis Wade (1751)
M:4/4
L:1/4
Q:1/4=100
K:D
"D"D2 D A,|D2 E2|"A"A, A, A,2|"D"D2 F2|
"D"E D C B,|"A"A,3 z|]`},{id:"god-rest-ye",genre:"Holiday",abc:`X:1
T:God Rest Ye Merry, Gentlemen
O:English
M:4/4
L:1/4
Q:1/4=110
K:Em
"Em"E|E B B A|G F E D|E F G A|"B7"B3 E|
"Em"E B B A|G F E D|E F G A|"B7"B3 B|
"C"c A B c|"G"d e B A|G E F G|"Am"A2 G A|
"Em"B c B A|G F E D|"Am"G2 F G|"B7"A2 B c|"Em"B4|]`},{id:"away-in-a-manger",genre:"Holiday",abc:`X:1
T:Away in a Manger
C:William J. Kirkpatrick (1895)
M:3/4
L:1/4
Q:1/4=100
K:D
A|"D"A G F|F E D|D C B,|"A"A,2 A,|A, B, A,|A, E C|"A"B, A, D|"D"F2 A|
"D"A G F|F E D|"G"D C B,|"D"A,2 A,|"D"A, B, A,|A, E C|B, A, D|"D"D2|]`},{id:"first-noel",genre:"Holiday",abc:`X:1
T:The First Noel
O:English (traditional)
M:3/4
L:1/4
Q:1/4=110
K:D
F/E/|"D"D3/2 E/ F/G/|A2 B/c/|"G"d c B|"D"A2 B/c/|d c B|A B c|d A G|"D"F2 F/E/|
"D"D3/2 E/ F/G/|A2 B/c/|"G"d c B|"D"A2 B/c/|d c B|A B c|d A G|"D"F2 F/E/|
"D"D3/2 E/ F/G/|A2 d/c/|"G"B2 B|"D"A3|d c B|A B c|d A G|"D"F2|]`},{id:"good-king-wenceslas",genre:"Holiday",abc:`X:1
T:Good King Wenceslas
O:Piae Cantiones (1582)
M:4/4
L:1/4
Q:1/4=110
K:D
"D"D D D E|D D A,2|B, A, B, C|D2 D2|
"D"D D D E|D D A,2|B, A, B, C|D2 D2|
"D"A G F E|F E D2|B, A, B, C|D2 D2|
"G"A, A, B, C|D D E2|"D"A G F E|"A"D2 "D"G2|"D"D4|]`},{id:"angels-we-have-heard",genre:"Holiday",abc:`X:1
T:Angels We Have Heard on High
O:French carol
M:4/4
L:1/4
Q:1/4=100
K:D
"D"F F F A|A G/F/ F2|F E F A|F E/D/ D2|
"D"F F F A|A G/F/ F2|F E F A|F E/D/ D2|
"D"A2- A/B/A/G/|"G"B2- B/c/B/A/|"A"c2- c/d/c/B/|"D"A3 A|
"G"B2- B/c/B/A/|"A"c2- c/d/c/B/|"D"A3 A|"G"B2 "A"c2|"D"d4|]`},{id:"carol-of-bells",genre:"Holiday",abc:`X:1
T:Carol of the Bells (Shchedryk)
C:Mykola Leontovych (1916)
M:3/4
L:1/8
Q:1/4=140
K:Gm
"Gm"B2 AB G2|B2 AB G2|B2 AB G2|B2 AB G2|
"Gm"d2 cd B2|d2 cd B2|d2 cd B2|d2 cd B2|
"Gm"g2 gg fe|d2 dd cB|c2 cc dc|G2 GG G2|
"D"D2 EF GA|B2 c2 B2|"D"A2 G2 ^F2|"Gm"G6|]`},{id:"o-little-town",genre:"Holiday",abc:`X:1
T:O Little Town of Bethlehem
C:Lewis Redner (1868)
M:4/4
L:1/4
Q:1/4=90
K:D
"D"F|F F E F|B A G F|"G"G B A G|"A"F2 E F|
"D"F F E F|"Bm"B A G F|"E"G B A G|"A"E2 D|]`},{id:"up-on-the-housetop",genre:"Holiday",abc:`X:1
T:Up on the Housetop
C:Benjamin Hanby (1864)
M:4/4
L:1/4
Q:1/4=120
K:D
"D"A A B A|F D F2|"G"G G B G|"D"A3 z|"A"E E F E|"D"D F A2|"A"E E F E|"A"E3 z|
"G"G G B2|"D"A A F2|"A"E E F E|"D"D3 z|]`},{id:"jolly-old-st-nick",genre:"Holiday",abc:`X:1
T:Jolly Old St. Nicholas
O:American (19th c.)
M:4/4
L:1/4
Q:1/4=110
K:D
"D"A A A A|G G G2|F F F F|"A"A3 z|E E F E|"D"D F A2|"A"E E F E|"A"E3 z|
"D"A A A A|G G G2|F F F F|"A"A3 z|"A"A G F E|"D"D F A2|"A"E E F E|"D"D4|]`},{id:"go-tell-it",genre:"Holiday",abc:`X:1
T:Go Tell It on the Mountain
O:African American spiritual
M:4/4
L:1/8
Q:1/4=100
K:D
"D"F2 F2 E2 D2|B,2 A,2 D4|"G"G2 G2 F2 E2|"D"D2 F2 A4|
"D"F2 F2 E2 D2|"G"B,2 A,2 D2 B2|"D"A2 F2 "A"E2 E2|"D"D8|]`},{id:"be-thou-my-vision",genre:"Hymns",abc:`X:1
T:Be Thou My Vision
C:Tune: Slane (Irish traditional)
M:3/4
L:1/4
Q:1/4=110
K:D
"D"D D E|F E D|E F A|B2 A|"G"B d e|f e d|"A"B A B|"D"A3|
"D"d d e|f e d|"A"B A B|"D"A3|"G"B d e|f e d|"A"B A B|"D"A3|]`},{id:"morning-has-broken",genre:"Hymns",abc:`X:1
T:Morning Has Broken (Bunessan)
O:Scottish Gaelic melody
M:3/4
L:1/4
Q:1/4=120
K:D
"D"D F A|d3|"G"e d c|"A"B2 A|"D"F A d|"G"B3|"A"A F E|"D"D3|
"D"F A F|"A"E2 F|"Bm"D B, A,|"A"A,3|"D"D E F|"G"B3|"A"A F E|"D"D3|]`},{id:"old-hundredth",genre:"Hymns",abc:`X:1
T:Old Hundredth (Doxology)
C:Louis Bourgeois (1551)
M:4/4
L:1/4
Q:1/4=80
K:G
"G"G2 G F|E D G A|B2 B B|"D"A G "C"c B|"G"A2 G2|
"G"B2 B B|A G c B|"D"A2 G A|"G"B G A F|"G"G4|]`},{id:"holy-holy-holy",genre:"Hymns",abc:`X:1
T:Holy, Holy, Holy (Nicaea)
C:John Bacchus Dykes (1861)
M:4/4
L:1/4
Q:1/4=80
K:D
"D"D D F F|"G"A2 A2|"D"B B B B|A2 F2|"A"A A A A|"D"d2 B2|"A"E E E E|"A"E3 z|
"D"D D F F|"G"A2 A2|"D"B2 B B|A2 F2|"G"d A G F|"D"A2 "A"E2|"D"D4|]`},{id:"come-thou-fount",genre:"Hymns",abc:`X:1
T:Come, Thou Fount of Every Blessing (Nettleton)
C:John Wyeth (1813)
M:3/4
L:1/4
Q:1/4=110
K:D
"D"A F D|F E D|"G"B A B|"D"A2 F|"A"A F E|E F A|"D"F D E|D3|
"D"A F D|F E D|"G"B A B|"D"A2 F|"A"A F E|E F A|"D"F D E|D3|
"D"d c B|A F A|"G"B A B|"D"A2 F|d c B|A F A|"A"F E D|"A"E3|
"D"A F D|F E D|"G"B A B|"D"A2 F|"A"A F E|E F A|"D"F D E|D3|]`},{id:"it-is-well",genre:"Hymns",abc:`X:1
T:It Is Well with My Soul (Ville du Havre)
C:Philip Bliss (1876)
M:4/4
L:1/8
Q:1/4=70
K:D
"D"F3 E D3 F|"G"B3 A G3 E|"D"A3 G F3 A|"A"E8|
"D"F3 E D3 F|"G"B3 A G3 E|"D"A3 G F3 E|"D"D8|]`},{id:"nearer-my-god",genre:"Hymns",abc:`X:1
T:Nearer, My God, to Thee (Bethany)
C:Lowell Mason (1856)
M:6/4
L:1/4
Q:1/4=110
K:D
"D"F2 E D2 B,|"D"A,4 A,2|D2 F E2 D|"A"E6|
"D"F2 E D2 B,|"D"A,4 A,2|"D"D2 E "A"E2 C|"D"D6|]`},{id:"shall-we-gather",genre:"Hymns",abc:`X:1
T:Shall We Gather at the River
C:Robert Lowry (1864)
M:4/4
L:1/8
Q:1/4=100
K:D
"D"F>F F>E D2 F2|A>A A>G F4|"G"G>G B>G "D"F2 A2|"A"E6 z2|
"D"F>F F>E D2 F2|A>A A>G F4|"G"B>B A>F "A"E2 G2|"D"D6 z2|]`},{id:"jerusalem",genre:"Hymns",abc:`X:1
T:Jerusalem
C:Hubert Parry (1916)
M:4/4
L:1/8
Q:1/4=80
K:D
"D"A,2|D3 E F3 D|"G"G4 B2 A2|"D"F3 E D2 F2|"A"E6 A,2|
"D"D3 E F3 D|"G"G4 B2 A2|"D"A3 F "A"E2 F2|"D"D6|]`},{id:"thaxted",genre:"Hymns",abc:`X:1
T:I Vow to Thee, My Country (Thaxted)
C:Gustav Holst (1921)
M:3/4
L:1/8
Q:1/4=90
K:C
"C"E2G2|A3 c B>G|c2 d2 c2|B2 A2 B2|A2 G2 E2|G2 A2 G2|E2 D2 C2|D4|]`},{id:"abide-with-me",genre:"Hymns",abc:`X:1
T:Abide with Me (Eventide)
C:William Henry Monk (1861)
M:4/4
L:1/2
Q:1/2=50
K:D
"D"F F/E/|D A|B A|A G|F G|A B|"A"A G|"A"F2|
"D"F F/E/|D A|"Bm"A G/F/|"E"E2|"D"F G|A F|"A"E E|"D"D2|]`},{id:"rock-of-ages",genre:"Hymns",abc:`X:1
T:Rock of Ages (Toplady)
C:Thomas Hastings (1830)
M:3/4
L:1/8
Q:1/4=90
K:D
"D"F4 E2|D4 B,2|A,6|"A"C2 D2 E2|"D"F4 G2|F6|
"D"F4 E2|D4 B,2|A,6|"A"C2 D2 E2|"D"D4 F2|"A"E6|
"D"F4 E2|D4 B,2|A,6|"A"C2 D2 E2|"D"F4 E2|D6|]`},{id:"what-a-friend",genre:"Hymns",abc:`X:1
T:What a Friend We Have in Jesus (Converse)
C:Charles Converse (1868)
M:4/4
L:1/8
Q:1/4=90
K:D
"D"A3 B A2 F2|"G"D3 B, "D"A,4|"D"D3 E F2 A2|"A"E8|
"D"A3 B A2 F2|"G"D3 B, "D"A,4|"A"D3 E F2 E2|"D"D8|]`},{id:"holy-night",genre:"Holiday",abc:`X:1
T:O Holy Night (Cantique de Noël)
C:Adolphe Adam (1847)
M:12/8
L:1/8
Q:3/8=50
K:D
"D"F6 F3 A3|A2 G2 B2 G6|F3 A3 "A"E3 E2 E|"D"D6 z6|
"D"F6 F3 A3|A2 G2 B2 G6|F3 A3 "A"E3 F2 E|"D"D12|]`}],ps=[{id:"riff-power-e",genre:"Rock & Metal",abc:`X:1
T:Power Drive in E minor
C:Original riff (VAW)
M:4/4
L:1/8
Q:1/4=120
K:Em
|:"Em"E E G E A E B A|G E G A B2 A G|"C"E E G E A E B d|"D"e d B A "B7"B4:|
|:"Em"e2 B2 d2 B2|e B d B A G E2|"C"e2 B2 d2 B2|"B7"^d c B A "Em"B4:|`},{id:"riff-gallop",genre:"Rock & Metal",abc:`X:1
T:Gallop of the Iron Horse
C:Original riff (VAW)
M:4/4
L:1/16
Q:1/4=110
K:Em
|:"Em"E2EE E2EE G2GG E2EE|"D"F2FF F2FF A2AA F2FF|"C"G2GG G2GG B2BB G2GG|"B"^F2FF F2FF B4 z4:|
|:"Em"e2BB e2BB g2BB e2BB|"D"d2AA d2AA f2AA d2AA|"C"c2GG c2GG e2GG c2GG|"B"B2^dd f2dd b4 z4:|`},{id:"riff-blues-a",genre:"Rock & Metal",abc:`X:1
T:Twelve-Bar Boogie in A
C:Original riff (VAW)
M:4/4
L:1/8
Q:1/4=120
K:A
"A7"A,2 C2 E2 F2|^F2 F2 E2 C2|A,2 C2 E2 F2|^F2 F2 E2 C2|
"D7"D2 ^F2 A2 B2|c2 B2 A2 F2|"A7"A,2 C2 E2 F2|^F2 F2 E2 C2|
"E7"E2 ^G2 B2 c2|"D7"D2 ^F2 A2 B2|"A7"A2 =G2 E2 C2|"E7"E2 ^D2 =D2 B,2|"A7"A,8|]`},{id:"riff-pentatonic",genre:"Rock & Metal",abc:`X:1
T:Pentatonic Lightning
C:Original lick study (VAW)
M:4/4
L:1/16
Q:1/4=90
K:Am
|:"Am"ABcA BcdB cdec deg=e|"G"gedc dcAG "Am"A4 z4|
"F"cdec dege gaba "G"g4|"E"edcB cBAG "Am"A8:|`},{id:"riff-surf",genre:"Rock & Metal",abc:`X:1
T:Surf's Up Tremolo
C:Original riff (VAW)
M:4/4
L:1/16
Q:1/4=120
K:Dphr
"D"DDDD DDDD ^FFFF GGGG|AAAA AAAA GGGG ^FFFF|"Gm"GGGG GGGG ^FFFF _EEEE|"D"DDDD DDDD D4 z4|
"D"dddd dddd cccc _BBBB|AAAA AAAA GGGG ^FFFF|"Gm"GGGG ^FFFF _EEEE ^FFFF|"D"D8 z8|]`},{id:"riff-anthem",genre:"Rock & Metal",abc:`X:1
T:Stadium Anthem in D
C:Original melody (VAW)
M:4/4
L:1/8
Q:1/4=100
K:D
"D"A2 A2 B2 A2|d4 A4|"Bm"F2 F2 G2 F2|B4 F4|
"G"G2 G2 A2 B2|d2 c2 B2 A2|"A"E2 F2 G2 A2|c4 A4|
"D"a4 f4|e2 d2 c2 A2|"G"g4 e4|d2 c2 B2 G2|
"D"F2 A2 d2 f2|"A"e2 d2 c2 e2|"D"d8|z8|]`},{id:"riff-metal-shred",genre:"Rock & Metal",abc:`X:1
T:Harmonic Minor Shred
C:Original étude (VAW)
M:4/4
L:1/16
Q:1/4=80
K:Am
|:"Am"ABcd e^fga a^gfe dcBA|"E"^GABc defe dcB^G "Am"A4|
"Dm"defg abc'a gfed cBA^G|"E"Bc de ^fgab "Am"a4 z4:|`},{id:"riff-grunge",genre:"Rock & Metal",abc:`X:1
T:Drop-D Grind
C:Original riff (VAW)
M:4/4
L:1/8
Q:1/4=100
K:Dm
|:"Dm"D2 D F G2 ^G A|z A G F D2 C D|"F"F2 F A c2 ^c d|z d c A "C"G2 E C:|`},{id:"riff-ballad",genre:"Rock & Metal",abc:`X:1
T:Power Ballad in G
C:Original melody (VAW)
M:4/4
L:1/8
Q:1/4=70
K:G
"G"B4 A2 G2|"D"A6 F2|"Em"G4 F2 E2|"C"E6 z2|
"G"B4 A2 G2|"D"A2 B2 c2 d2|"C"e4 d2 c2|"D"d6 z2|
"Em"e4 d2 B2|"C"c4 B2 G2|"G"B4 A2 G2|"D"A6 B2|
"C"c4 B2 A2|"G"B4 A2 G2|"D"A2 G2 F2 A2|"G"G8|]`},{id:"riff-punk",genre:"Rock & Metal",abc:`X:1
T:Three-Chord Rebellion
C:Original riff (VAW)
M:4/4
L:1/8
Q:1/4=160
K:A
|:"A"A A A A A A A A|"D"d d d d d d d d|"E"e e e e e e e e|"A"A A c c e e a2:|
|:"D"f2 f2 e2 d2|"A"c2 c2 B2 A2|"D"f2 f2 e2 d2|"E"e2 ^d2 e4:|`},{id:"the-entertainer",genre:"Blues & Jazz",abc:`X:1
T:The Entertainer
C:Scott Joplin (1902)
M:2/4
L:1/16
Q:1/4=80
K:C
d^d|"C"e2c'2 e2c'2|e2c'4 c'd'|"C"^d'e'c'd' e'2bd'|"G"c'4 z2 d^d|
"C"e2c'2 e2c'2|e2c'4 z2|"F"a2g2 ^f2a2|"G"c'e'2d' c'a2d'|
"C"e2c'2 e2c'2|e2c'4 c'd'|"C"^d'e'c'd' e'2bd'|"G"c'4 z2 c'd'|
"C"e'c'd'e' e'c'd'c'|e'c'd'e' e'c'd'c'|"G"e'c'd'e' e'2bd'|"C"c'4 z4|]`},{id:"maple-leaf-rag",genre:"Blues & Jazz",abc:`X:1
T:Maple Leaf Rag (opening)
C:Scott Joplin (1899)
M:2/4
L:1/16
Q:1/4=70
K:Ab
"Ab"z _A,C_E _AE=G_e-|e2_A,CE_A=G_e-|"Eb"e_A,C_E AEge-|e8|
"Ab"z _A,C_E _AE=G_e-|e2_A,CE_A=G_e-|"Eb"e_B,=D_E =G_Be_b-|"Ab"b8|]`},{id:"tiger-rag",genre:"Blues & Jazz",abc:`X:1
T:Tiger Rag (trio)
C:Original Dixieland Jass Band (1917)
M:2/4
L:1/8
Q:1/4=120
K:Ab
"Ab"c2 B2|_A2 F2|E2 C2|_A,4|"Eb"B2 A2|G2 E2|B,2 E2|G4|
"Eb"B2 A2|G2 E2|"Bb"F2 G2|A4|"Eb"G2 F2|E2 D2|"Ab"C4|z4|]`},{id:"st-louis-blues",genre:"Blues & Jazz",abc:`X:1
T:St. Louis Blues
C:W.C. Handy (1914)
M:4/4
L:1/8
Q:1/4=90
K:G
"G"z2 B2 d2 B2|_B4 G4|"C"z2 c2 e2 c2|"G"_B4 G4|
"C"z2 c2 e2 c2|"G"_B2 G2 B2 G2|"D7"z2 A2 c2 A2|"G"G8|]`},{id:"take-me-out",genre:"Blues & Jazz",abc:`X:1
T:Take Me Out to the Ball Game
C:Albert Von Tilzer (1908)
M:3/4
L:1/4
Q:1/4=160
K:D
"D"D2 d|B A F|"A"E3|B,3|"D"D2 d|B A F|"A"A3-|A2 z|
"A"G F G|E F G|"D"A2 F|D2 z|"G"B2 B|B c d|"A"c3-|c2 z|
"D"D2 d|B A F|"A"E3|B,3|"D"D2 d|B A F|"A"A3-|A2 z|
"A"G F G|"D"E F G|"D"A2 B|c3|"D"d2 d|d c B|"A"A G F|"D"D3|]`},{id:"five-foot-two",genre:"Blues & Jazz",abc:`X:1
T:Five Foot Two, Eyes of Blue
C:Ray Henderson (1925)
M:4/4
L:1/8
Q:1/4=150
K:C
"C"E2 G2 c2 z2|"E7"B2 ^G2 E4|"A7"^C2 E2 A2 z2|G2 E2 ^C4|
"D7"D2 ^F2 A2 c2|B2 A2 ^F2 D2|"G7"G2 F2 E2 D2|"C"C8|]`},{id:"bye-bye-blackbird",genre:"Blues & Jazz",abc:`X:1
T:Bye Bye Blackbird
C:Ray Henderson (1926)
M:4/4
L:1/8
Q:1/4=120
K:F
"F"z2 A2 A2 A2|A4 c2 A2|"F"G4 F4|z8|
"F"z2 A2 A2 A2|"Cdim"_A4 c2 A2|"Gm7"G8|"C7"z8|]`},{id:"sweet-georgia-brown",genre:"Blues & Jazz",abc:`X:1
T:Sweet Georgia Brown
C:Ben Bernie, Maceo Pinkard (1925)
M:4/4
L:1/8
Q:1/4=150
K:F
"D7"z D E ^F A2 ^F E|D4 z4|z D E ^F A2 ^F E|D4 z4|
"G7"z D =F G B2 G F|D4 z4|z D F G B2 G F|D4 z4|
"C7"z C D E G2 E D|C4 z4|"F"A4 A2 G2|F8|]`},{id:"aint-we-got-fun",genre:"Blues & Jazz",abc:`X:1
T:Ain't We Got Fun
C:Richard Whiting (1921)
M:4/4
L:1/8
Q:1/4=140
K:G
"G"D2 D2 E2 D2|G4 D4|"D7"D2 D2 E2 D2|A4 F4|
"D7"F2 F2 G2 F2|A4 c4|"G"B2 A2 G2 E2|D8|]`},{id:"yes-we-have-no-bananas",genre:"Blues & Jazz",abc:`X:1
T:Yes! We Have No Bananas
C:Frank Silver & Irving Cohn (1923)
M:4/4
L:1/8
Q:1/4=150
K:C
"C"G4 A2 G2|E4 C4|"G7"D2 E2 F2 E2|D8|
"G7"F4 G2 F2|D4 B,4|"C"C2 D2 E2 G2|C8|]`},{id:"charleston",genre:"Blues & Jazz",abc:`X:1
T:Charleston
C:James P. Johnson (1923)
M:4/4
L:1/8
Q:1/4=160
K:F
"A7"z A3 A2 z A|z A3 ^G2 A2|"D7"z A3 A2 z A|z A3 ^G2 A2|
"G7"z G3 G2 z G|z G3 ^F2 G2|"C7"A2 G2 F2 E2|"F"F8|]`},{id:"singin-rain",genre:"Blues & Jazz",abc:`X:1
T:Singin' in the Rain
C:Nacio Herb Brown (1929)
M:4/4
L:1/8
Q:1/4=120
K:C
"C"E2 G2 c4-|c2 z2 z4|E2 G2 c4-|c2 z2 z4|
"Dm7"F2 A2 d4-|d2 c2 B2 A2|"G7"G8-|G4 z4|
"C"E2 G2 c4-|c2 z2 z4|E2 G2 c4-|c2 z2 z4|
"Dm7"F2 A2 d4-|d2 c2 "G7"B2 A2|"C"c8-|c4 z4|]`},{id:"aint-misbehavin",genre:"Blues & Jazz",abc:`X:1
T:Ain't Misbehavin'
C:Fats Waller (1929)
M:4/4
L:1/8
Q:1/4=100
K:Eb
"Eb"z2 G2 B2 G2|"Cm"F2 E2 G4|"Fm7"z2 F2 _A2 F2|"Bb7"E2 D2 F4|
"Eb"z2 G2 B2 G2|"Eb7"F2 E2 G2 B2|"Ab"c2 B2 G2 E2|"Eb"E8|]`},{id:"happy-days",genre:"Blues & Jazz",abc:`X:1
T:Happy Days Are Here Again
C:Milton Ager (1929)
M:4/4
L:1/8
Q:1/4=140
K:C
"C"G4 G4|G2 A2 G2 E2|"F"F4 A4|"C"G8|
"C"G4 G4|"Am"G2 A2 G2 E2|"Dm"F4 E2 D2|"G7"D8|
"G7"F4 F4|F2 G2 F2 D2|"C"E4 G4|"Am"c8|
"Dm"d4 d2 c2|"G7"B2 A2 G2 F2|"C"E4 D2 E2|"C"C8|]`},{id:"blue-skies",genre:"Blues & Jazz",abc:`X:1
T:Blue Skies
C:Irving Berlin (1926)
M:4/4
L:1/8
Q:1/4=130
K:Em
"Em"E2 B2 B4-|B2 A2 G2 E2|"Em/D#"^D2 A2 A4-|A2 G2 ^F2 D2|
"G"B,2 G2 G4-|G2 ^F2 E2 D2|"C"C2 E2 G2 E2|"B7"^F8|]`},{id:"puttin-on-the-ritz",genre:"Blues & Jazz",abc:`X:1
T:Puttin' On the Ritz
C:Irving Berlin (1929)
M:4/4
L:1/8
Q:1/4=130
K:Dm
"Dm"z D F A ^G3 G|z ^C E G ^F3 F|"Gm"z _B, D F E3 E|"A"z A, ^C E D4|
"Dm"z D F A ^G3 G|z ^C E G ^F3 F|"Gm"_B2 A2 G2 E2|"A"^C2 E2 "Dm"D4|]`},{id:"mack-the-knife",genre:"Blues & Jazz",abc:`X:1
T:Mack the Knife (Moritat)
C:Kurt Weill (1928)
M:4/4
L:1/8
Q:1/4=110
K:C
"C"z2 E2 F2 A2|G6 z2|"Dm"z2 D2 E2 G2|F6 z2|
"G7"z2 D2 E2 G2|F6 z2|"C"z2 C2 D2 E2|E6 z2|]`},{id:"rhapsody-in-blue",genre:"Blues & Jazz",abc:`X:1
T:Rhapsody in Blue (Andante theme)
C:George Gershwin (1924)
M:4/4
L:1/8
Q:1/4=60
K:E
"E"B2 B4 c2|e2 B6|"A"c2 c4 e2|"E"g2 f6|
"E"B2 B4 c2|e2 B6|"F#m"f2 e2 c2 B2|"B7"B8|]`},{id:"i-got-rhythm",genre:"Blues & Jazz",abc:`X:1
T:I Got Rhythm
C:George Gershwin (1930)
M:4/4
L:1/8
Q:1/4=150
K:Bb
"Bb"z B, C3 E F2|"Gm"z F E3 C B,2|"Cm"z B, C3 E F2|"F7"z G F4 z2|
"Bb"z B, C3 E F2|"Gm"z F E3 C B,2|"Cm"z B, C2 "F7"E2 C2|"Bb"B,6 z2|]`},{id:"georgia",genre:"Blues & Jazz",abc:`X:1
T:Georgia on My Mind
C:Hoagy Carmichael (1930)
M:4/4
L:1/8
Q:1/4=70
K:F
"F"z2 A,2 C4-|C2 D2 C4|"E7"z2 B,2 D4-|D2 E2 D4|
"Dm"z2 A,2 D2 F2|"Bbm"F2 _D2 F4|"F"A4 "D7"F4|"Gm7"G2 F2 "C7"E2 D2|]`},{id:"bill-bailey",genre:"Blues & Jazz",abc:`X:1
T:Bill Bailey, Won't You Please Come Home
C:Hughie Cannon (1902)
M:4/4
L:1/8
Q:1/4=140
K:F
"F"z2 C2 F2 A2|c4 A4|"F"z2 A2 G2 A2|"C7"G8|
"C7"z2 C2 E2 G2|B4 G4|"C7"z2 G2 F2 G2|"F"A8|]`}],As=[{id:"tech-open-strings",genre:"Technique",abc:`X:1
T:Open String Warm-Up
C:Exercise
M:4/4
L:1/4
Q:1/4=80
K:C
G,4|G, G, G, G,|D4|D D D D|A4|A A A A|e4|e e e e|
e e A A|D D G, G,|G, D A e|e A D G,|]`},{id:"tech-d-major-scale",genre:"Technique",abc:`X:1
T:D Major Scale (1 octave)
C:Exercise
M:4/4
L:1/4
Q:1/4=80
K:D
D E F G|A B c d|d c B A|G F E D|
D/D/ E/E/ F/F/ G/G/|A/A/ B/B/ c/c/ d/d/|d/d/ c/c/ B/B/ A/A/|G/G/ F/F/ E/E/ D2|]`},{id:"tech-a-major-scale",genre:"Technique",abc:`X:1
T:A Major Scale (1 octave)
C:Exercise
M:4/4
L:1/4
Q:1/4=80
K:A
A B c d|e f g a|a g f e|d c B A|]`},{id:"tech-g-major-2oct",genre:"Technique",abc:`X:1
T:G Major Scale (2 octaves)
C:Exercise
M:4/4
L:1/8
Q:1/4=70
K:G
G,A,B,C DEFG|ABcd efga|g2 fe dcBA|GFED CB,A,G,|G,8|]`},{id:"tech-c-major-scale",genre:"Technique",abc:`X:1
T:C Major Scale (low 2s)
C:Exercise
M:4/4
L:1/4
Q:1/4=80
K:C
C D E F|G A B c|c B A G|F E D C|]`},{id:"tech-a-minor-melodic",genre:"Technique",abc:`X:1
T:A Melodic Minor Scale
C:Exercise
M:4/4
L:1/8
Q:1/4=70
K:Am
A,B,CD E^F^GA|Bcde ^f^ga2|a=g=fe dcBA|=G=FED CB,A,2|]`},{id:"tech-chromatic",genre:"Technique",abc:`X:1
T:Chromatic Scale on D & A Strings
C:Exercise
M:4/4
L:1/8
Q:1/4=70
K:C
D^D E F ^F G ^G A|^A B c ^c d ^d e2|e _e d _d c B _B A|_A G _G F E _E D2|]`},{id:"tech-arpeggios",genre:"Technique",abc:`X:1
T:Arpeggios in G, D and A
C:Exercise
M:3/4
L:1/8
Q:1/4=90
K:D
"G"G,B,D GBd|g6|dBG DB,G,|G,6|
"D"DFA dfa|d'6|afd AFD|D6|
"A"A,CE Ace|a6|ecA EC A,|A,6|]`},{id:"tech-wohlfahrt-1",genre:"Technique",abc:`X:1
T:Étude Op. 45 No. 1 (opening)
C:Franz Wohlfahrt (1850s)
M:4/4
L:1/8
Q:1/4=80
K:C
"C"CEGc CEGc|"G"B,DGB B,DGB|"C"CEGc CEGc|"G"DGBd DGBd|
"F"FAcf FAcf|"C"EGce EGce|"G"DGBd "G7"DFBd|"C"cGEC C4|]`},{id:"tech-string-crossing",genre:"Technique",abc:`X:1
T:String Crossing Study
C:Exercise
M:4/4
L:1/8
Q:1/4=80
K:D
"D"DADA DADA|FAFA FAFA|"G"GBGB GBGB|"D"FAFA DADA|
"A"EAEA EAEA|"D"FAFA "G"GBGB|"A"EAEA ^GBGB|"D"FADA D4|]`},{id:"tech-third-position",genre:"Technique",abc:`X:1
T:Third Position Shifting
C:Exercise
M:4/4
L:1/4
Q:1/4=70
K:D
d e f g|a g f e|d e f g|a2 a2|
a b c' d'|d' c' b a|g f e d|d4|]`},{id:"tech-e-string-high",genre:"Technique",abc:`X:1
T:High E-String Ladder
C:Exercise
M:4/4
L:1/8
Q:1/4=70
K:A
e f g a b c' d' e'|e' d' c' b a g f e|a b c' d' e' f' g' a'|a'8|]`},{id:"tech-rhythm-dots",genre:"Technique",abc:`X:1
T:Dotted Rhythm Drill
C:Exercise
M:4/4
L:1/8
Q:1/4=80
K:G
G>A B>c d>e f>g|g>f e>d c>B A>G|G>B d>B G>B d>B|g2 d2 B2 G2|]`},{id:"tech-triplets",genre:"Technique",abc:`X:1
T:Triplet Study
C:Exercise
M:4/4
L:1/8
Q:1/4=70
K:D
(3DEF (3GAB (3cde (3fga|(3agf (3edc (3BAG (3FED|(3DFA (3dAF (3DFA d2|(3AFD (3AFD A,4|]`},{id:"tech-double-dutch",genre:"Technique",abc:`X:1
T:Sixteenth-Note Detaché
C:Exercise
M:4/4
L:1/16
Q:1/4=70
K:A
AAAA BBBB cccc dddd|eeee dddd cccc BBBB|AcBd ceBd cAeA a4|]`}],ms=[...cs,...ls,...ds,...hs,...us,...ps,...As].map(i=>({...i,source:"builtin"})),fs=["Beginner","Folk","World","Celtic","Old-Time","Bluegrass","Classical","Rock & Metal","Blues & Jazz","Hymns","Holiday","Technique"],on={C:0,D:2,E:4,F:5,G:7,A:9,B:11},_t=["F","C","G","D","A","E","B"],St=["B","E","A","D","G","C","F"],gs={C:0,G:1,D:2,A:3,E:4,B:5,"F#":6,"C#":7,F:-1,Bb:-2,Eb:-3,Ab:-4,Db:-5,Gb:-6,Cb:-7,"G#":8,"D#":9,"A#":10,"E#":11,"B#":12,Fb:-8},Mt={maj:0,ion:0,mix:-1,dor:-2,min:-3,aeo:-3,m:-3,phr:-4,loc:-5,lyd:1};function Ze(i){const e=(i||"").trim(),t={tonic:"C",mode:"maj",accidentals:{},tonicPc:0,label:"C"};if(/^(HP|Hp)\b/.test(e))return t.tonic="A",t.mode="mix",t.tonicPc=9,t.accidentals={F:1,C:1},t.label="A Mix",t;if(/^none\b/i.test(e)||e==="")return t;const n=e.match(/^([A-Ga-g])([#b]?)\s*([A-Za-z]*)\s*(.*)$/);if(!n)return t;const s=n[1].toUpperCase()+n[2],a=n[3].toLowerCase();let o="maj";if(a==="m")o="min";else if(a.length>=3){const B=a.slice(0,3);B in Mt&&(o=B==="aeo"?"min":B==="ion"?"maj":B)}const c=(gs[s]??0)+Mt[o],h={};if(c>0){for(let B=0;B<Math.min(c,7);B++)h[_t[B]]=1;for(let B=7;B<c;B++)h[_t[B-7]]=2}else if(c<0){for(let B=0;B<Math.min(-c,7);B++)h[St[B]]=-1;for(let B=7;B<-c;B++)h[St[B-7]]=-2}const l=n[4]||"",d=/(\^\^|\^|__|_|=)([A-Ga-g])/g;let u;for(;u=d.exec(l);){const B={"^^":2,"^":1,__:-2,_:-1,"=":0}[u[1]];h[u[2].toUpperCase()]=B}const p=(on[s[0]]+(s[1]==="#"?1:s[1]==="b"?-1:0)+12)%12,f={maj:"",min:"m",mix:" Mix",dor:" Dor",phr:" Phr",lyd:" Lyd",loc:" Loc"}[o];return t.tonic=s,t.mode=o,t.accidentals=h,t.tonicPc=p,t.label=s+f,t}function rn(i){const e=(i||"").trim();if(e==="C")return{num:4,den:4,text:"4/4"};if(e==="C|")return{num:2,den:2,text:"2/2"};const t=e.match(/^(\d+)(?:\+\d+)*\s*\/\s*(\d+)/);if(t){const s=e.split("/")[0].split("+").map(Number).reduce((a,o)=>a+o,0);return{num:s,den:Number(t[2]),text:`${s}/${t[2]}`}}return null}function ct(i){const e=(i||"").trim().match(/^(\d+)\s*\/\s*(\d+)/);if(e)return Number(e[1])/Number(e[2]);const t=parseFloat(i);return isFinite(t)?t:null}function Ds(i){const e=(i||"").replace(/"[^"]*"/g,"").trim(),t=e.match(/((?:\d+\/\d+\s*)+)=\s*(\d+)/);if(t){const s=t[1].trim().split(/\s+/).reduce((a,o)=>a+(ct(o)||0),0);return Number(t[2])*s*4}const n=e.match(/^(\d+)/);return n?Number(n[1]):null}const Bs={reel:150,jig:165,"slip jig":165,hornpipe:130,polka:140,waltz:120,march:110,strathspey:100,slide:180,mazurka:120,barndance:130,"three-two":120,air:80,hymn:90};function Es(i){const e=i.replace(/\r\n?/g,`
`).split(`
`),t=[];let n=null;for(const s of e)/^X:/.test(s)?(n&&t.push(n.join(`
`)),n=[s]):n?n.push(s):/^[TKM]:/.test(s)&&(n=["X:1",s]);return n&&t.push(n.join(`
`)),t}function et(i){const e=i.replace(/\r\n?/g,`
`).split(`
`),t={title:"",titles:[],composer:"",origin:"",rhythm:""};let n={num:4,den:4,text:"4/4"},s=!1,a=null,o=null,r=Ze("C"),c=!1;const h=[];for(const p of e){const f=p.replace(/(^|[^\\])%.*$/,"$1");if(c)h.push(f);else{const B=f.match(/^([A-Za-z]):\s?(.*)$/);if(!B){if(f.trim()==="")continue;c=!0,h.push(f);continue}const[,A,C]=B;switch(A){case"T":t.titles.push(C.trim());break;case"C":t.composer=t.composer||C.trim();break;case"O":t.origin=t.origin||C.trim();break;case"R":t.rhythm=C.trim().toLowerCase();break;case"M":{const M=rn(C);M&&(n=M,s=!0);break}case"L":a=ct(C);break;case"Q":o=Ds(C);break;case"K":r=Ze(C),c=!0;break}}}if(t.title=t.titles[0]||"Untitled",!a){const p=n.num/n.den;a=s&&p<.75?1/16:1/8}o||(o=Bs[t.rhythm]||120);const l={meter:n,unitLen:a,tempo:o,key:r},{bars:d}=Gs(h,l),u=bs(d);return Fs(t,l,u)}function Gs(i,e){let{unitLen:t,key:n}=e,s=e.meter;const a=[];let o=A(),r={},c=null,h=null,l="",d=null,u=!1,p=0,f=1,B=1;function A(){return{events:[],startRepeat:!1,endRepeat:!1,ending:null,part:"",doubleBar:!1,meter:null}}function C(g={}){(o.events.length>0||g.force)&&(o.ending=c,o.part=l,o.meter=s,a.push(o)),o=A(),r={}}function M(){for(let g=o.events.length-1;g>=0;g--)if(o.events[g].type!=="marker")return o.events[g];for(let g=a.length-1;g>=0;g--){const G=a[g].events;for(let F=G.length-1;F>=0;F--)if(G[F].type!=="marker")return G[F]}return null}function k(g,G){switch(g){case"K":n=Ze(G);break;case"L":{const F=ct(G);F&&(t=F);break}case"M":{const F=rn(G);F&&(s=F);break}case"P":l=G.trim();break}}for(const g of i){let G=g;const F=G.match(/^([A-Za-z]):\s?(.*)$/);if(F){const[,v,b]=F;if(v==="V"){const T=b.trim().split(/\s+/)[0];d===null&&(d=T),u=T!==d}else v==="w"||v==="W"||u||k(v,b);continue}if(u)continue;G=G.replace(/\\\s*$/,"");let E=0;const S=G.length;for(;E<S;){const v=G[E];if(v===" "||v==="	"||v==="y"||v==="`"){E++;continue}if(v==="["&&/[A-Za-z]/.test(G[E+1]||"")&&G[E+2]===":"){const m=G.indexOf("]",E);if(m>E){const _=G[E+1],w=G.slice(E+3,m);if(_==="V"){const N=w.trim().split(/\s+/)[0];d===null&&(d=N),u=N!==d}else k(_,w);if(E=m+1,u)break;continue}}if(v==='"'){const m=G.indexOf('"',E+1),_=m>E?G.slice(E+1,m):"";/^[A-G]/.test(_)&&(h=_.split(/[\s(/]/)[0]),E=m>E?m+1:S;continue}if(v==="!"||v==="+"){const m=G.indexOf(v,E+1);E=m>E?m+1:E+1;continue}if(v==="{"){const m=G.indexOf("}",E);E=m>E?m+1:S;continue}if(".~HLMOPSTuvJR".includes(v)){E++;continue}if(v===")"){E++;continue}if(v==="("){const m=G.slice(E).match(/^\((\d)(?::(\d)?)?(?::(\d)?)?/);if(m){const _=Number(m[1]);let w=m[2]?Number(m[2]):null;const N=m[3]?Number(m[3]):_;if(!w){const X=s.num%3===0&&s.num>3;w={2:3,3:2,4:3,6:2,8:3}[_]??(X?3:2)}f=w/_,p=N,E+=m[0].length;continue}E++;continue}if(v==="|"||v===":"||v==="["&&(G[E+1]==="|"||/\d/.test(G[E+1]||""))){const m=G.slice(E).match(/^(:*)(\|\]|\[\||\|\||\||\[(?=\d))?(:*)(\[?\d+(?:[-,]\d+)*)?/);if(m&&m[0].length>0){const _=m[1],w=m[2]||"";let N=m[3],X=m[4]||"";const Q=_.length>0;!w&&_.length>=2&&(N=":");const j=N.length>0,ne=w==="||"||w==="|]"||w==="[|";if(w||Q||j){if(o.events.length===0){const H=a[a.length-1];H&&(Q&&(H.endRepeat=!0),ne&&(H.doubleBar=!0))}else Q&&(o.endRepeat=!0),ne&&(o.doubleBar=!0),C();(Q||ne)&&(c=null)}if(j&&(o.startRepeat=!0,c=null),X){X=X.replace("[","");const H=[];for(const _e of X.split(",")){const[Be,Ee]=_e.split("-").map(Number);if(Ee)for(let ue=Be;ue<=Ee;ue++)H.push(ue);else H.push(Be)}c=H}E+=m[0].length;continue}E++;continue}if(v===">"||v==="<"){let m=0;const _=v;for(;G[E]===_;)m++,E++;const w=1-Math.pow(.5,m),N=M();N&&(_===">"?(N.dur*=1+w,B=1-w):(N.dur*=1-w,B=1+w));continue}if(v==="-"){const m=M();m&&m.type==="note"&&(m.tie=!0),E++;continue}if(v==="["){const m=G.indexOf("]",E);if(m>E){const _=G.slice(E+1,m);let w=null,N=null;const X=/(\^\^|\^|__|_|=)?([A-Ga-g])([,']*)(\d*\/*\d*)/g;let Q;for(;Q=X.exec(_);){const H=wt(Q[1],Q[2],Q[3],n,r);N===null&&(N=Se(Q[4])),(w===null||H>w)&&(w=H)}E=m+1;const j=G.slice(E).match(/^(\d*\/*\d*)/);let ne=N??1;j&&j[1]&&(ne=Se(j[1]),E+=j[1].length),w!==null&&z({type:"note",midi:w},ne);continue}E++;continue}const b=G.slice(E).match(/^(\^\^|\^|__|_|=)?([A-Ga-g])([,']*)(\d*\/*\d*)/);if(b){const m=wt(b[1],b[2],b[3],n,r);z({type:"note",midi:m},Se(b[4])),E+=b[0].length;continue}const T=G.slice(E).match(/^([zx])(\d*\/*\d*)/);if(T){z({type:"rest"},Se(T[2])),E+=T[0].length;continue}const O=G.slice(E).match(/^Z(\d*)/);if(O){const m=O[1]?Number(O[1]):1,_=s.num*(4/s.den);for(let w=0;w<m;w++)o.events.push({type:"rest",dur:_}),w<m-1&&C();E+=O[0].length;continue}E++}}C();function z(g,G){let F=G*t*4;p>0&&(F*=f,p--),B!==1&&(F*=B,B=1),g.dur=F,h&&(g.chord=h,h=null),o.events.push(g)}return{bars:a}}function Se(i){if(!i)return 1;const e=i.match(/^(\d*)(\/*)(\d*)$/);if(!e)return 1;const t=e[1]?Number(e[1]):1;let n=1;return e[2].length>0&&(n=e[3]?Number(e[3]):Math.pow(2,e[2].length),e[3]&&e[2].length>1&&(n=Number(e[3])*Math.pow(2,e[2].length-1))),t/n}function wt(i,e,t,n,s){const a=e.toUpperCase();let o=e===a?4:5;for(const h of t||"")h==="'"?o++:h===","&&o--;const r=a+o;let c;return i?(c={"^^":2,"^":1,__:-2,_:-1,"=":0}[i],s[r]=c):r in s?c=s[r]:c=n.accidentals[a]||0,(o+1)*12+on[a]+c}function bs(i){const e=[];let t=0,n=1,s=-1,a=0,o=0,r=0;for(;o<i.length&&a++<1e4;){const l=i[o];if(l.startRepeat&&s!==o&&(t=o,n=1),s=-1,l.ending&&!l.ending.includes(n)){o++;continue}if(e.push({...l,pass:n,blockStart:t}),l.endRepeat){if(n<2){n++,o=t,s=t;continue}n=1,t=o+1}else l.doubleBar&&(t=o+1,n=1);o++}const c="ABCDEFGHIJKLMNOPQRSTUVWXYZ",h=new Map;for(const l of e){const d=l.part||l.blockStart;h.has(d)||h.set(d,l.part||c[r++%26]);const u=h.get(d),p=`${d}|${l.pass}`;l.section=l.pass>1?`${u} (repeat)`:u,l.sectionKey=p}return e}function Fs(i,e,t){const n=[],s=[],a=[];let o=0;for(const c of t){const h=o;for(const d of c.events){if(d.chord&&s.push({start:o,symbol:d.chord}),d.type==="note"){const u=n[n.length-1];u&&u.tie&&u.midi===d.midi&&Math.abs(u.start+u.dur-o)<1e-6?(u.dur+=d.dur,u.tie=!!d.tie):n.push({midi:d.midi,start:o,dur:d.dur,tie:!!d.tie,bar:a.length})}o+=d.dur}const l=c.meter||e.meter;a.push({start:h,dur:o-h,section:c.section,sectionKey:c.sectionKey,meter:l})}for(const c of n)delete c.tie;const r=[];for(let c=0;c<a.length;c++){const h=a[c],l=r[r.length-1];l&&l.key===h.sectionKey?(l.end=h.start+h.dur,l.barEnd=c+1):r.push({key:h.sectionKey,name:h.section,start:h.start,end:h.start+h.dur,barStart:c,barEnd:c+1})}return{title:i.title,composer:i.composer,origin:i.origin,rhythm:i.rhythm,meter:e.meter,key:e.key,tempo:e.tempo,notes:n,bars:a,sections:r,chords:s,totalBeats:o}}const q=5,Cs=[.3,.45,.6,.75,.88,1],ys=17,vs=12,_s={1:1,2:1,3:2,4:2,5:3,6:3,7:4,8:4},Me=[1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10];function Ss(i){const e=["th","st","nd","rd"],t=i%100;return i+(e[(t-20)%10]||e[t]||e[0])}function Ms(i){return te[i].strings.map(t=>ze(t.frequency))}function ws(i,e){if(i.length===0)return 0;const t=Math.min(...i.map(c=>c.midi)),n=Math.max(...i.map(c=>c.midi)),s=e[0],a=e[e.length-1]+12;let o=0,r=1/0;for(let c=-36;c<=36;c+=12){const h=t+c,l=n+c;let d=0;h<s&&(d+=(s-h)*10),l>a&&(d+=l-a),d+=Math.abs(c)*.01,d<r&&(r=d,o=c)}return o}function Ts(i,e){var r;const t=e.length,n=i.map(c=>{const h=[];for(let l=0;l<t;l++){const d=c.midi-e[l],u=l===t-1?ys:vs;if(d>=0&&d<=u){let p=d<=6?0:d===7?1:4+d;p+=d*.01,h.push({s:l,off:d,cost:p})}}if(h.length===0){const l=c.midi<e[0]?0:t-1;h.push({s:l,off:Math.max(0,c.midi-e[l]),cost:50})}return h}),s=n.map(c=>c.map(()=>({cost:1/0,prev:-1})));(r=n[0])==null||r.forEach((c,h)=>{s[0][h].cost=c.cost});for(let c=1;c<n.length;c++)for(let h=0;h<n[c].length;h++){const l=n[c][h];for(let d=0;d<n[c-1].length;d++){const u=n[c-1][d];let p=Math.abs(l.s-u.s)*.25;u.off>7&&l.off>7?p+=Math.abs(l.off-u.off)*.1:u.off>7!=l.off>7&&l.off!==0&&(p+=.5);const f=s[c-1][d].cost+l.cost+p;f<s[c][h].cost&&(s[c][h]={cost:f,prev:d})}}const a=s.length-1;if(a<0)return;let o=s[a].reduce((c,h,l,d)=>h.cost<d[c].cost?l:c,0);for(let c=a;c>=0;c--){const h=n[c][o];i[c].string=h.s,i[c].offset=h.off,o=s[c][o].prev}}function Ls(i){let e=0;for(let t=0;t<i.length;t++){const n=i[t],s=n.offset;if(s===0){n.finger=0,n.base=e,n.position=Me[Math.min(e,Me.length-1)];continue}const a=s-e;if(a<1||a>8){let o=Math.max(0,s-7),r=-1;for(let c=Math.max(0,s-8);c<=s-1;c++){let h=0;for(let l=t;l<Math.min(i.length,t+8);l++){const d=i[l].offset;if(d===0)continue;const u=d-c;if(u>=1&&u<=8)h++;else break}h+=[0,2,4,5,7,9,10,12].includes(c)?.3:0,h-=c*.01,h>r&&(r=h,o=c)}e=o}n.base=e,n.finger=_s[s-e]??4,n.position=Me[Math.min(e,Me.length-1)]}}function ks(i){return i.num%3===0&&i.num>3?4/i.den*3:4/i.den}function xs(i,e){return Math.abs(i-e)<.001}function $e(i,e){const t=i/e;return Math.abs(t-Math.round(t))<.001}function Os(i){const e=[];for(const t of i.sections){const n=t.barEnd-t.barStart,s=n>8?Math.ceil(n/4):n>4?2:1,a=Math.ceil(n/s);for(let o=0;o<s;o++){const r=t.barStart+o*a,c=Math.min(t.barEnd,r+a);if(r>=c)continue;const h=i.bars[r],l=i.bars[c-1];e.push({name:s>1?`${t.name} · ${o+1}`:t.name,section:t.name,start:h.start,end:l.start+l.dur,barStart:r,barEnd:c})}}return e.length===0&&e.push({name:"A",section:"A",start:0,end:i.totalBeats,barStart:0,barEnd:i.bars.length}),e}function Is(i,e,t){for(let n=0;n<e.length;n++){const s=e[n],a=[];if(i.forEach((r,c)=>{r.phrase===n&&a.push(c)}),a.length===0)continue;const o=a.map((r,c)=>{const h=i[r],l=t.bars[h.bar]||{start:0,meter:t.meter},d=l.meter||t.meter,u=ks(d),p=h.start-l.start;let f=0;return xs(p,0)?f=4:$e(p,u*2)?f=3:$e(p,u)?f=2:$e(p,u/2)&&(f=1),h.dur>=u-.001&&(f+=1.5),c===0&&(f+=10),f-=c*1e-4,{i:r,w:f}});o.sort((r,c)=>c.w-r.w),o.forEach((r,c)=>{let h=q;for(let l=0;l<=q;l++)if(c<Math.ceil(a.length*Cs[l])){h=l;break}i[r.i].minLevel=h}),s.noteCount=a.length}}function zs(i){const e=i.notes;if(e.length===0)return{score:1,label:"Beginner"};const t=i.totalBeats*60/i.tempo,n=e.length/Math.max(1,t),s=Math.max(...e.map(p=>p.position||1)),a=Math.max(...e.map(p=>p.midi))-Math.min(...e.map(p=>p.midi));new Set([0,2,4,5,7,9,11].map(p=>(p+i.key.tonicPc)%12));const o=new Set,r={C:0,D:2,E:4,F:5,G:7,A:9,B:11};for(const[p,f]of Object.entries(r))o.add((f+(i.key.accidentals[p]||0)+12)%12);const c=e.filter(p=>!o.has(p.midi%12)).length/e.length,h=e.reduce((p,f,B)=>p+(B>0&&f.offset!==0&&e[B-1].offset!==0&&f.base!==e[B-1].base?1:0),0),l=Math.min(...e.map(p=>p.dur))*60/i.tempo;let d=1+Math.min(4,n*.75)+(s-1)*.7+c*5+Math.min(1.5,h/Math.max(1,e.length)*15)+(a>19?.8:a>12?.4:0)+(l<.15?1:l<.25?.5:0)+(Object.keys(i.key.accidentals).length>=4?.5:0);d=Math.max(1,Math.min(10,d));const u=d<=2.5?"Beginner":d<=4.5?"Easy":d<=6.5?"Intermediate":d<=8?"Advanced":"Expert";return{score:Math.round(d*10)/10,label:u}}function Ns(i,e){const t=Ms(e),n=ws(i.notes,t),s=i.notes.map(c=>({...c,midi:c.midi+n}));Ts(s,t),Ls(s);const a=Os(i);let o=0;for(const c of s){for(;o<a.length-1&&c.start>=a[o].end-1e-6;)o++;c.phrase=o}Is(s,a,i);const r={title:i.title,tempo:i.tempo,meter:i.meter,key:i.key,totalBeats:i.totalBeats,bars:i.bars,chords:i.chords.map(c=>({...c})),transpose:n,tuningKey:e,openMidis:t,notes:s,phrases:a};return r.difficulty=zs(r),r.maxPosition=Math.max(1,...s.map(c=>c.position||1)),r.range=s.length?{lo:Math.min(...s.map(c=>c.midi)),hi:Math.max(...s.map(c=>c.midi))}:{lo:0,hi:0},r}const lt="vaw.songplay.progress.v1",cn="vaw.songplay.usersongs.v1",ln="vaw.songplay.settings.v1";function dt(i,e){try{const t=localStorage.getItem(i);return t?JSON.parse(t):e}catch{return e}}function Ne(i,e){try{localStorage.setItem(i,JSON.stringify(e))}catch{}}let Ce=dt(lt,{});function tt(i){return Ce[i]||{plays:0,lastPlayed:0,phraseLevels:{},phraseMastered:{},mastery:0,bestScore:{},bestAccuracy:0,bestStreak:0,medal:{}}}function Tt(i,e){Ce[i]=e,Ne(lt,Ce)}function Ks(i){delete Ce[i],Ne(lt,Ce)}function ht(){return dt(cn,[])}function dn(i){Ne(cn,i)}function Lt(){const i={tolerance:35,latencyMs:80,guideVolume:.35,clickVolume:.5,backingVolume:.4,guide:!0,click:!0,backing:!0,showNoteNames:!0,tuningCheck:!0,masterMode:!0,...dt(ln,{})};return i.guide=!0,i.click=!0,i.backing=!0,i.showNoteNames=!0,i}function Qe(i){Ne(ln,i)}const nt=new Map;let Ps=0;const ke=new Map;function kt(){return[...ms,...ht().map(i=>({...i,source:"user"}))]}function ut(i){if(i.parsed)return i.parsed;let e=nt.get(i.id);return e||(e=et(i.abc),nt.set(i.id,e)),e}function we(i,e){const t=`${i.id}|${e}`;let n=ke.get(t);return n||(n=Ns(ut(i),e),ke.set(t,n)),n}function Rs(i,e){const t=ut(i),n=we(i,e);return{title:t.title,composer:t.composer||t.origin||"",key:t.key.label,meter:t.meter.text,tempo:Math.round(t.tempo),notes:n.notes.length,duration:t.totalBeats*60/t.tempo,difficulty:n.difficulty,maxPosition:n.maxPosition,phrases:n.phrases.length,rhythm:t.rhythm}}function Xs(i){return i.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)}function He({title:i,abc:e,parsed:t,genre:n="My Songs",origin:s=""}){const a=ht(),r={id:`user-${Xs(i||"song")}-${Date.now().toString(36)}${(Ps++).toString(36)}`,title:i,genre:n,origin:s};return e&&(r.abc=e),t&&(r.parsed=t),a.push(r),dn(a),{...r,source:"user"}}function $s(i){dn(ht().filter(e=>e.id!==i)),nt.delete(i);for(const e of[...ke.keys()])e.startsWith(i+"|")&&ke.delete(e)}const st="https://thesession.org",hn={reel:"4/4",jig:"6/8","slip jig":"9/8",hornpipe:"4/4",polka:"2/4",slide:"12/8",waltz:"3/4",barndance:"4/4",strathspey:"4/4","three-two":"3/2",mazurka:"3/4",march:"4/4"},Qs={reel:"1/4=140",jig:"3/8=110","slip jig":"3/8=110",hornpipe:"1/4=120",polka:"1/4=140",slide:"3/8=120",waltz:"1/4=120",barndance:"1/4=130",strathspey:"1/4=100","three-two":"1/2=80",mazurka:"1/4=120",march:"1/4=110"},Hs=Object.keys(hn);async function un(i){const e=await fetch(i,{headers:{Accept:"application/json"}});if(!e.ok)throw new Error(`The Session returned ${e.status}`);return e.json()}async function qs(i,{type:e="",page:t=1}={}){const n=new URLSearchParams({format:"json",perpage:"50",page:String(t)});let s="/tunes/popular";i&&(s="/tunes/search",n.set("q",i)),e&&n.set("type",e);const a=await un(`${st}${s}?${n}`);return{tunes:(a.tunes||[]).map(o=>({id:o.id,name:o.name,type:o.type,url:o.url})),page:a.page||1,pages:a.pages||1,total:a.total||0}}function Ws(i){const e=(i||"").match(/^([A-G][b#]?)(major|minor|dorian|mixolydian|lydian|phrygian|locrian)?/i);if(!e)return"C";const t=(e[2]||"major").toLowerCase(),n={major:"",minor:"m",dorian:"dor",mixolydian:"mix",lydian:"lyd",phrygian:"phr",locrian:"loc"}[t];return e[1]+n}async function Vs(i){const e=await un(`${st}/tunes/${encodeURIComponent(i)}?format=json`),t=(e.type||"").toLowerCase(),n=hn[t]||"4/4",s=Qs[t]||"1/4=110",a=(e.settings||[]).map((o,r)=>{const c=String(o.abc||"").replace(/\\r\\n|\\n/g,`
`),h=[`X:${r+1}`,`T:${e.name}`,`R:${t}`,`M:${n}`,"L:1/8",`Q:${s}`,`O:The Session #${e.id} (setting ${r+1})`,`K:${Ws(o.key)}`,c].join(`
`);return{settingId:o.id,key:o.key,abc:h}});return{id:e.id,name:e.name,type:t,url:e.url||`${st}/tunes/${e.id}`,settings:a}}function qe(i,e){let t=0,n;do n=i.getUint8(e.i++),t=t<<7|n&127;while(n&128);return t}function We(i,e,t){let n="";for(let s=0;s<t;s++)n+=String.fromCharCode(i.getUint8(e+s));return n}function js(i){const e=new DataView(i);if(We(e,0,4)!=="MThd")throw new Error("Not a MIDI file");const t=e.getUint32(4),n=e.getUint16(10),s=e.getUint16(12);if(s&32768)throw new Error("SMPTE-timed MIDI files are not supported");let a=8+t;const o=[],r={tempo:null,timeSig:null,keySig:null,title:""};for(let c=0;c<n&&a<e.byteLength;c++){const h=We(e,a,4),l=e.getUint32(a+4),d=a+8,u=d+l;if(a=u,h!=="MTrk")continue;const p={i:d};let f=0,B=0;const A=new Map,C=[];let M="",k=null;const z=new Set;for(;p.i<u;){f+=qe(e,p);let g=e.getUint8(p.i);if(g&128)B=g,p.i++;else if(!B)break;const G=B&240,F=B&15;if(B===255){const E=e.getUint8(p.i++),S=qe(e,p);if(E===81&&r.tempo==null){const v=e.getUint8(p.i)<<16|e.getUint8(p.i+1)<<8|e.getUint8(p.i+2);r.tempo=6e7/v}else E===88&&!r.timeSig?r.timeSig={num:e.getUint8(p.i),den:Math.pow(2,e.getUint8(p.i+1))}:E===89&&!r.keySig?r.keySig={sf:e.getInt8(p.i),minor:e.getUint8(p.i+1)===1}:E===3&&(M=We(e,p.i,S),c===0&&!r.title&&(r.title=M));p.i+=S,B=0;continue}if(B===240||B===247){const E=qe(e,p);p.i+=E,B=0;continue}if(G===144||G===128){const E=e.getUint8(p.i++),S=e.getUint8(p.i++),v=F*128+E;if(G===144&&S>0)A.has(v)||A.set(v,{start:f,vel:S});else{const b=A.get(v);b&&(C.push({midi:E,start:b.start,end:f,ch:F,vel:b.vel}),A.delete(v))}z.add(F)}else if(G===160||G===176||G===224)p.i+=2;else if(G===192)k=e.getUint8(p.i++);else if(G===208)p.i+=1;else break}if(C.length>0){C.sort((G,F)=>G.start-F.start||F.midi-G.midi);const g=z.has(9)&&z.size===1;o.push({index:c,name:M||`Track ${c+1}`,notes:C,program:k,isDrums:g})}}return{division:s,tracks:o,meta:r}}const Js=["Piano","Chromatic Perc.","Organ","Guitar","Bass","Strings","Ensemble","Brass","Reed","Pipe","Synth Lead","Synth Pad","Synth FX","Ethnic","Percussive","SFX"];function Us(i){const e=i.tracks.filter(s=>!s.isDrums).map(s=>{const a=s.notes.reduce((r,c)=>r+c.midi,0)/s.notes.length,o=s.program!=null?Js[Math.floor(s.program/8)]:"";return{index:s.index,name:s.name,family:o,count:s.notes.length,avgPitch:a}});let t=null,n=-1/0;for(const s of e){let a=Math.log(s.count+1)*2-Math.abs(s.avgPitch-72)*.15;/lead|melody|vocal|voice|violin|fiddle|solo/i.test(s.name)&&(a+=4),["Synth Lead","Strings","Reed","Pipe","Brass"].includes(s.family)&&(a+=1.5),s.family==="Bass"&&(a-=4),a>n&&(n=a,t=s.index)}return{tracks:e,suggested:t}}function Ys(i,e,t){const n=i.tracks.find(b=>b.index===e);if(!n)throw new Error("Track not found");const s=i.division,a=s/8,o=[];for(const b of n.notes){if(b.end-b.start<a)continue;const T=o[o.length-1];if(T&&Math.abs(T.start-b.start)<s/16){b.midi>T.midi&&Object.assign(T,b);continue}o.push({...b})}for(let b=0;b<o.length-1;b++)o[b].end>o[b+1].start&&(o[b].end=o[b+1].start);const r=s/4,c=b=>Math.round(b/r)*r,h=[];for(const b of o){const T=c(b.start),O=Math.max(T+r,c(b.end)),m=h[h.length-1];m&&m.startTick===T||(m&&m.endTick>T&&(m.endTick=T),h.push({midi:b.midi,startTick:T,endTick:O}))}const l=i.meta.timeSig||{num:4,den:4},d=s*l.num*(4/l.den),p=(h.length?Math.floor(h[0].startTick/d):0)*d,f=h.map((b,T)=>({midi:b.midi,start:(b.startTick-p)/s,dur:Math.max(.0625,(b.endTick-b.startTick)/s),i:T})),B=f.length?Math.ceil((f[f.length-1].start+f[f.length-1].dur)/(d/s))*(d/s):d/s,A=d/s,C={num:l.num,den:l.den,text:`${l.num}/${l.den}`},M=[],k=[],z=Math.round(B/A);for(let b=0;b<z;b++){const O=`Part ${Math.floor(b/8)+1}`;M.push({start:b*A,dur:A,section:O,sectionKey:O,meter:C})}for(let b=0;b*8<z;b++){const T=b*8,O=Math.min(z,T+8);k.push({key:`Part ${b+1}`,name:`Part ${b+1}`,start:T*A,end:O*A,barStart:T,barEnd:O})}for(const b of f)b.bar=Math.min(z-1,Math.floor(b.start/A+1e-6));const g=i.meta.keySig,G=["Cb","Gb","Db","Ab","Eb","Bb","F","C","G","D","A","E","B","F#","C#"],F={C:0,"C#":1,Db:1,D:2,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,Ab:8,A:9,Bb:10,B:11,Cb:11},E=["F","C","G","D","A","E","B"],S=["B","E","A","D","G","C","F"];let v={tonic:"C",mode:"maj",accidentals:{},tonicPc:0,label:"C"};if(g){const b=G[g.sf+7]||"C",T={};g.sf>0&&E.slice(0,g.sf).forEach(_=>{T[_]=1}),g.sf<0&&S.slice(0,-g.sf).forEach(_=>{T[_]=-1});const O=g.minor?(F[b]+9)%12:F[b],m=["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];v={tonic:m[O],mode:g.minor?"min":"maj",accidentals:T,tonicPc:O,label:m[O]+(g.minor?"m":"")}}return{title:t||i.meta.title||n.name||"Imported MIDI",composer:"",origin:"Imported MIDI",rhythm:"",meter:C,key:v,tempo:Math.round(i.meta.tempo||120),notes:f,bars:M,sections:k,chords:[],totalBeats:B}}function D(i,e,t){const n=document.createElement(i);return e&&(n.className=e),t!=null&&(n.textContent=t),n}function xt(i){const e=Math.floor(i/60),t=Math.round(i%60);return`${e}:${String(t).padStart(2,"0")}`}const Zs=["Beginner","Easy","Intermediate","Advanced","Expert"];class ei{constructor(e){this.container=e,this.onPlay=null,this.tuningKey=Fe,this._view="library",this._query="",this._genre="All",this._difficulty="All",this._sort="recommended",this._selected=null,this._metaCache=new Map,this._build(),this.refresh()}setTuning(e){!te[e]||e===this.tuningKey||(this.tuningKey=e,this._metaCache.clear(),this.tuningDropdown&&(this.tuningDropdown.value=e),this.refresh())}_meta(e){const t=`${e.id}|${this.tuningKey}`;let n=this._metaCache.get(t);if(!n){try{n=Rs(e,this.tuningKey)}catch(s){console.warn("Bad song",e.id,s),n=null}this._metaCache.set(t,n)}return n}_build(){const e=D("div","sb-root");this.root=e;const t=D("div","sb-top"),n=D("div","sb-brand");n.append(D("div","sb-brand-title","Song Play")),t.appendChild(n);const s=D("div","sb-tabs");this._tabBtns={};for(const[h,l]of[["library","Library"],["mine","My Songs"],["online","Find Online"],["import","Import"]]){const d=D("button","sb-tab",l);d.addEventListener("click",()=>this.showView(h)),s.appendChild(d),this._tabBtns[h]=d}t.appendChild(s);const a=D("div","sb-tuning");a.append(D("span","sb-label","Instrument"));const o=D("div","sb-dd");this.tuningDropdown=new $(o,{placeholder:"Tuning"});const r={};for(const[h,l]of Object.entries(te))(r[l.family]=r[l.family]||[]).push({value:h,label:l.label});this.tuningDropdown.setGroupedItems(Object.entries(r).map(([h,l])=>({label:h,items:l}))),this.tuningDropdown.value=this.tuningKey,this.tuningDropdown.onChange=h=>this.setTuning(h),a.appendChild(o),t.appendChild(a),e.appendChild(t),this.inputSlot=D("div","sb-input-slot"),e.appendChild(this.inputSlot);const c=D("div","sb-body");this.listPane=D("div","sb-list-pane"),this.detailPane=D("div","sb-detail-pane"),c.append(this.listPane,this.detailPane),e.appendChild(c),this.container.appendChild(e)}showView(e){var t,n;this._view=e,this._query="",this._selected=null,this._onlineAutoRun=!0,this._onlineQuery="",this._onlineType="",this.root.classList.remove("detail-open"),this.refresh(),(n=(t=this.root).scrollIntoView)==null||n.call(t,{block:"start"})}refresh(){for(const[e,t]of Object.entries(this._tabBtns))t.classList.toggle("active",e===this._view);this.listPane.replaceChildren(),this._view==="library"||this._view==="mine"?this._renderList():this._view==="online"?this._renderOnline():this._renderImport(),this._renderDetail()}_renderList(){const e=this.listPane,t=this._view==="mine",n=D("div","sb-filters"),s=D("input","sb-search");s.type="search",s.placeholder=t?"Search my songs…":"Search songs, composers, origins…",s.value=this._query,s.addEventListener("input",()=>{this._query=s.value,this._renderCards(l,t)}),n.appendChild(s);const a=D("div","sb-filter-row"),o=D("div","sb-dd sb-dd--small"),r=new $(o,{placeholder:"Difficulty"});r.setItems([{value:"All",label:"All levels"},...Zs.map(d=>({value:d,label:d}))]),r.value=this._difficulty,r.onChange=d=>{this._difficulty=d,this._renderCards(l,t)};const c=D("div","sb-dd sb-dd--small"),h=new $(c,{placeholder:"Sort"});if(h.setItems([{value:"recommended",label:"Recommended"},{value:"title",label:"Title A–Z"},{value:"easy",label:"Easiest first"},{value:"hard",label:"Hardest first"},{value:"mastery",label:"Mastery"},{value:"recent",label:"Recently played"},{value:"short",label:"Shortest"}]),h.value=this._sort,h.onChange=d=>{this._sort=d,this._renderCards(l,t)},a.append(o,c),n.appendChild(a),!t){const d=D("div","sb-chips");for(const u of["All",...fs]){const p=D("button","sb-chip",u);p.classList.toggle("active",this._genre===u),p.addEventListener("click",()=>{this._genre=u,d.querySelectorAll(".sb-chip").forEach(f=>f.classList.toggle("active",f===p)),this._renderCards(l,t)}),d.appendChild(p)}n.appendChild(d)}e.appendChild(n),this._countEl=D("div","sb-count"),e.appendChild(this._countEl);const l=D("div","sb-cards");e.appendChild(l),this._renderCards(l,t)}_filteredSongs(e){const t=this._query.trim().toLowerCase();let n=kt().filter(o=>e?o.source==="user":o.source==="builtin");const s=[];for(const o of n){const r=this._meta(o);if(r&&!(!e&&this._genre!=="All"&&o.genre!==this._genre)&&!(this._difficulty!=="All"&&r.difficulty.label!==this._difficulty)){if(t){const c=`${r.title} ${r.composer} ${o.genre} ${r.key} ${r.rhythm}`.toLowerCase();if(!t.split(/\s+/).every(h=>c.includes(h)))continue}s.push({song:o,meta:r,progress:tt(o.id)})}}const a={recommended:(o,r)=>(r.progress.lastPlayed?1:0)-(o.progress.lastPlayed?1:0)||o.meta.difficulty.score-r.meta.difficulty.score,title:(o,r)=>o.meta.title.localeCompare(r.meta.title),easy:(o,r)=>o.meta.difficulty.score-r.meta.difficulty.score,hard:(o,r)=>r.meta.difficulty.score-o.meta.difficulty.score,mastery:(o,r)=>(r.progress.mastery||0)-(o.progress.mastery||0),recent:(o,r)=>(r.progress.lastPlayed||0)-(o.progress.lastPlayed||0),short:(o,r)=>o.meta.duration-r.meta.duration}[this._sort];return s.sort(a),s}_renderCards(e,t){var a;e.replaceChildren();const n=this._filteredSongs(t);if(this._countEl.textContent=`${n.length} song${n.length===1?"":"s"}`,n.length===0){e.appendChild(D("div","sb-empty",t?'No songs yet. Use "Find Online" or "Import" to add tunes, or load a MIDI file of any song you own.':"No songs match these filters."));return}const s=document.createDocumentFragment();for(const{song:o,meta:r,progress:c}of n){const h=D("button","sb-card");((a=this._selected)==null?void 0:a.id)===o.id&&h.classList.add("selected"),h.addEventListener("click",()=>{this._selected=o,e.querySelectorAll(".sb-card").forEach(M=>M.classList.toggle("selected",M===h)),this._renderDetail(),this.root.classList.add("detail-open")});const l=D("div","sb-ring"),d=Math.min(110,c.mastery||0);l.style.setProperty("--pct",String(Math.min(100,d))),l.appendChild(D("span",null,`${d}%`)),d>=100&&l.classList.add("mastered");const u=D("div","sb-card-info");u.append(D("div","sb-card-title",r.title)),u.append(D("div","sb-card-sub",r.composer||o.genre));const p=D("div","sb-card-tags");p.append(D("span","sb-pill sb-pill--genre",o.genre)),p.append(D("span","sb-pill",`${r.key} · ${r.meter}`)),p.append(D("span","sb-pill",xt(r.duration))),u.appendChild(p);const f=D("div","sb-diff"),B=D("div","sb-diff-bars"),A=Math.ceil(r.difficulty.score/2);for(let M=1;M<=5;M++)B.appendChild(D("span",M<=A?"on":""));f.append(B,D("div","sb-diff-label",r.difficulty.label));const C=Object.values(c.medal||{});if(C.length){const M=["platinum","gold","silver","bronze"].find(k=>C.includes(k));f.appendChild(D("div",`sb-medal-dot sb-medal-dot--${M}`,"●"))}h.append(l,u,f),s.appendChild(h)}e.appendChild(s)}_renderDetail(){var Be,Ee,ue,Et;const e=this.detailPane;e.replaceChildren();const t=this._selected;if(!t){const I=D("div","sb-detail-empty");I.append(D("div","sb-detail-empty-title","Choose a song")),e.appendChild(I);return}let n,s;try{n=we(t,this.tuningKey),s=this._meta(t)}catch(I){e.appendChild(D("div","sb-error",`This song could not be loaded: ${I.message}`));return}const a=tt(t.id),o=D("button","sb-detail-close","←  Songs");o.addEventListener("click",()=>this.root.classList.remove("detail-open")),e.appendChild(o),e.append(D("h2","sb-detail-title",s.title)),e.append(D("div","sb-detail-sub",[s.composer,t.genre].filter(Boolean).join(" · ")));const r=D("div","sb-stats"),c=(I,P)=>{const W=D("div","sb-stat");W.append(D("div","sb-stat-v",P),D("div","sb-stat-l",I)),r.appendChild(W)};c("Difficulty",`${s.difficulty.score}/10`),c("Notes",String(s.notes)),c("Length",xt(s.duration)),c("Tempo (bpm)",String(s.tempo)),c("Key",s.key),c("Positions",s.maxPosition>1?`1st–${s.maxPosition}${["","st","nd","rd"][s.maxPosition]||"th"}`:"1st"),e.appendChild(r),n.transpose&&e.appendChild(D("div","sb-note",`Transposed ${n.transpose>0?"up":"down"} ${Math.abs(n.transpose/12)} octave${Math.abs(n.transpose)>12?"s":""} to fit ${te[this.tuningKey].label}.`));const h=D("div","sb-progress"),l=D("div","sb-mastery");l.append(D("div","sb-mastery-label","Mastery"));const d=D("div","sb-mastery-bar"),u=D("div","sb-mastery-fill");u.style.width=`${Math.min(100,a.mastery||0)/1.1}%`,(a.mastery||0)>100&&u.classList.add("over"),d.appendChild(u),l.append(d,D("div","sb-mastery-val",`${a.mastery||0}%`)),h.appendChild(l);const p=D("div","sb-levels");for(const I of n.phrases){const P=I.name.replace(" (repeat)",""),W=((Be=a.phraseLevels)==null?void 0:Be[P])??0,ie=(Ee=a.phraseMastered)==null?void 0:Ee[P],Re=D("div","sb-level");Re.title=`${I.name}: level ${W}/${q}${ie?" (mastered)":""}`;const Xe=D("div","sb-level-fill");Xe.style.height=`${20+W/q*80}%`,ie&&Xe.classList.add("mastered"),Re.appendChild(Xe),p.appendChild(Re)}h.appendChild(p);const f=D("div","sb-best"),B=a.bestScore||{},A=["easy","medium","hard","master"].filter(I=>B[I]).map(I=>{var P;return`${I[0].toUpperCase()+I.slice(1)} ${B[I].toLocaleString()}${(P=a.medal)!=null&&P[I]?` (${a.medal[I]})`:""}`}).join(" · ");f.textContent=`Plays: ${a.plays||0} · Best accuracy: ${a.bestAccuracy||0}% · Best streak: ${a.bestStreak||0}${A?` · ${A}`:""}`,h.appendChild(f),e.appendChild(h);const C=D("div","sb-modes"),M=D("div","sb-mode");M.append(D("div","sb-mode-title","Learn a Song"));const k=D("button","sb-btn sb-btn-primary","Play");k.addEventListener("click",()=>{var I;return(I=this.onPlay)==null?void 0:I.call(this,t,n,{mode:"learn"})}),M.appendChild(k),C.appendChild(M);const z=D("div","sb-mode");z.append(D("div","sb-mode-title","Score Attack"));const g=D("div","sb-btn-row");for(const[I,P]of[["easy","Easy"],["medium","Medium"],["hard","Hard"],["master","Master"]]){const W=D("button","sb-btn",P);I==="master"&&!(((ue=a.medal)==null?void 0:ue.hard)==="gold"||((Et=a.medal)==null?void 0:Et.hard)==="platinum")&&(W.title="Tip: earn Gold on Hard first. Master hides the notes as they approach."),W.addEventListener("click",()=>{var ie;return(ie=this.onPlay)==null?void 0:ie.call(this,t,n,{mode:"score",difficulty:I})}),g.appendChild(W)}z.appendChild(g),C.appendChild(z);const G=D("div","sb-mode");G.append(D("div","sb-mode-title","Riff Repeater"));const F=D("div","sb-riff-grid"),E=n.phrases.map((I,P)=>({value:String(P),label:`${P+1}. ${I.name}`})),S=D("div","sb-dd sb-dd--small"),v=new $(S,{placeholder:"From"});v.setItems(E),v.value="0";const b=D("div","sb-dd sb-dd--small"),T=new $(b,{placeholder:"To"});T.setItems(E),T.value=String(Math.min(n.phrases.length-1,1));const O=D("div","sb-dd sb-dd--small"),m=new $(O,{placeholder:"Level"});m.setItems([{value:"dynamic",label:"Dynamic"},...Array.from({length:q+1},(I,P)=>({value:String(P),label:P===q?`Level ${P} (all notes)`:`Level ${P}`}))]),m.value=String(q);const _=(I,P)=>{const W=D("label","sb-field");return W.append(D("span","sb-label",I),P),W};F.append(_("From",S),_("To",b),_("Level",O));const w=D("label","sb-field sb-field--wide");w.append(D("span","sb-label","Speed"));const N=D("input");N.type="range",N.min="25",N.max="125",N.step="5",N.value="70";const X=D("span","sb-speed-val","70%");N.addEventListener("input",()=>{X.textContent=`${N.value}%`}),w.append(N,X),F.appendChild(w);const Q=D("label","sb-check"),j=D("input");j.type="checkbox",j.checked=!0,Q.append(j,D("span",null,"Speed Trainer")),F.appendChild(Q),G.appendChild(F);const ne=D("button","sb-btn sb-btn-primary","Start loop");ne.addEventListener("click",()=>{var ie;let I=Number(v.value||0),P=Number(T.value||0);P<I&&([I,P]=[P,I]);const W=m.value==="dynamic"?"dynamic":Number(m.value);(ie=this.onPlay)==null||ie.call(this,t,n,{mode:"riff",riff:{from:I,to:P,level:W,speed:Number(N.value),trainer:j.checked}})}),G.appendChild(ne),C.appendChild(G),e.appendChild(C);const H=D("div","sb-detail-foot"),_e=D("button","sb-link","Reset progress");if(_e.addEventListener("click",()=>{confirm(`Reset all progress for "${s.title}"?`)&&(Ks(t.id),this.refresh())}),H.appendChild(_e),t.source==="user"){const I=D("button","sb-link sb-link--danger","Remove from My Songs");I.addEventListener("click",()=>{confirm(`Remove "${s.title}"?`)&&($s(t.id),this._selected=null,this.refresh())}),H.appendChild(I)}if(t.abc){const I=D("button","sb-link","View ABC");I.addEventListener("click",()=>{const P=D("pre","sb-abc",t.abc);I.replaceWith(P)}),H.appendChild(I)}e.appendChild(H)}openRiff(e,t,n){var a;const s=we(e,this.tuningKey);(a=this.onPlay)==null||a.call(this,e,s,{mode:"riff",riff:{from:t,to:n,level:q,speed:70,trainer:!0}})}_renderOnline(){const e=this.listPane,t=D("div","sb-online");t.append(D("div","sb-online-title","Search The Session")),t.append(D("p","sb-muted","Tens of thousands of traditional Irish, Scottish and other folk tunes, transcribed by the community at thesession.org. Search by name, or leave the box empty to browse the most popular tunes."));const n=D("div","sb-online-row"),s=D("input","sb-search");s.type="search",s.placeholder="e.g. Drowsy Maggie, Kesh, Butterfly…",s.value=this._onlineQuery||"";const a=D("div","sb-dd sb-dd--small"),o=new $(a,{placeholder:"Any type"});o.setItems([{value:"",label:"Any type"},...Hs.map(d=>({value:d,label:d[0].toUpperCase()+d.slice(1)}))]),o.value=this._onlineType||"";const r=D("button","sb-btn sb-btn-primary","Search");n.append(s,a,r),t.appendChild(n);const c=D("div","sb-online-results");t.appendChild(c);const h=D("div","sb-credit");h.innerHTML='Contains information from <a href="https://thesession.org" target="_blank" rel="noopener">The Session</a>, made available under the <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener">Open Database License (ODbL)</a>.',t.appendChild(h),e.appendChild(t);const l=async(d=1)=>{this._onlineQuery=s.value.trim(),this._onlineType=o.value,c.replaceChildren(D("div","sb-muted","Searching…"));try{const u=await qs(this._onlineQuery,{type:this._onlineType,page:d});c.replaceChildren(),c.appendChild(D("div","sb-count",`${u.total.toLocaleString()} tunes · page ${u.page} of ${u.pages}`));for(const f of u.tunes){const B=D("div","sb-online-item");B.append(D("div","sb-online-name",f.name),D("span","sb-pill",f.type));const A=D("button","sb-btn","Open");A.addEventListener("click",()=>this._openSessionTune(f.id,B)),B.appendChild(A),c.appendChild(B)}const p=D("div","sb-btn-row");if(u.page>1){const f=D("button","sb-btn","← Prev");f.addEventListener("click",()=>l(u.page-1)),p.appendChild(f)}if(u.page<u.pages){const f=D("button","sb-btn","Next →");f.addEventListener("click",()=>l(u.page+1)),p.appendChild(f)}c.appendChild(p)}catch(u){c.replaceChildren(D("div","sb-error",`Could not reach The Session (${u.message}). Check your internet connection.`))}};r.addEventListener("click",()=>l(1)),s.addEventListener("keydown",d=>{d.key==="Enter"&&l(1)}),this._onlineAutoRun!==!1&&(this._onlineAutoRun=!1,l(1))}async _openSessionTune(e,t){const n=D("div","sb-online-settings");n.textContent="Loading…",t.after(n);try{const s=await Vs(e);n.replaceChildren(),n.appendChild(D("div","sb-muted",`${s.settings.length} setting${s.settings.length===1?"":"s"}. Each one is a different transcription:`)),s.settings.slice(0,12).forEach((o,r)=>{const c=D("div","sb-online-setting");let h="";try{const d=et(o.abc),u=we({id:`session-${e}-${o.settingId}`,abc:o.abc},this.tuningKey);h=`${d.key.label} · ${u.notes.length} notes · ${u.difficulty.label}`}catch{h="unparseable"}c.append(D("span",null,`Setting ${r+1}`),D("span","sb-muted",h));const l=D("button","sb-btn sb-btn-primary","Add to My Songs");l.addEventListener("click",()=>{const d=He({title:s.name,abc:o.abc,origin:`The Session #${s.id}`});this._selected=d,this._view="mine",this.refresh(),this.root.classList.add("detail-open")}),c.appendChild(l),n.appendChild(c)});const a=D("a","sb-link","View on thesession.org ↗");a.href=s.url,a.target="_blank",a.rel="noopener",n.appendChild(a)}catch(s){n.textContent=`Failed to load tune: ${s.message}`}}_renderImport(){const e=this.listPane,t=D("div","sb-import");t.append(D("div","sb-online-title","Import songs")),t.append(D("p","sb-muted","Bring your own music. Load a MIDI file (any song you own: rock, pop, film, games…) and pick the melody track. Or paste or load ABC notation from sites like abcnotation.com. Imported songs stay in this browser under My Songs."));const n=D("div","sb-file-row"),s=D("input");s.type="file",s.accept=".mid,.midi,.abc,.txt,audio/midi,audio/x-midi",s.id="sb-file-input";const a=D("label","sb-btn sb-btn-primary","Choose MIDI / ABC file…");a.htmlFor="sb-file-input",n.append(a,s),t.appendChild(n);const o=D("div","sb-import-out");t.appendChild(o),s.addEventListener("change",async()=>{var d;const l=(d=s.files)==null?void 0:d[0];if(l){o.replaceChildren();try{if(/\.(mid|midi)$/i.test(l.name)){const u=await l.arrayBuffer(),p=js(u),{tracks:f,suggested:B}=Us(p);if(f.length===0)throw new Error("No melodic tracks found");o.appendChild(D("div","sb-muted","Pick the track to play (the likely melody is highlighted):"));const A=l.name.replace(/\.(mid|midi)$/i,"");for(const C of f){const M=D("div","sb-online-setting");C.index===B&&M.classList.add("suggested"),M.append(D("span",null,C.name),D("span","sb-muted",`${C.family||"Instrument"} · ${C.count} notes`));const k=D("button","sb-btn sb-btn-primary","Add");k.addEventListener("click",()=>{const z=Ys(p,C.index,`${A}${f.length>1?` (${C.name})`:""}`),g=He({title:z.title,parsed:z,origin:"MIDI import"});this._selected=g,this._view="mine",this.refresh(),this.root.classList.add("detail-open")}),M.appendChild(k),o.appendChild(M)}}else{const u=await l.text();this._importAbcText(u,o)}}catch(u){o.appendChild(D("div","sb-error",`Import failed: ${u.message}`))}s.value=""}}),t.appendChild(D("div","sb-label sb-label--block","Paste ABC notation"));const r=D("textarea","sb-abc-input");r.placeholder=`X:1
T:My Tune
M:4/4
L:1/8
Q:1/4=100
K:D
|:DEFG A2 FA|...`,r.rows=9,t.appendChild(r);const c=D("div","sb-import-out"),h=D("button","sb-btn sb-btn-primary","Add tune(s)");h.addEventListener("click",()=>this._importAbcText(r.value,c)),t.append(h,c),e.appendChild(t)}_importAbcText(e,t){t.replaceChildren();const n=Es(e);if(n.length===0){t.appendChild(D("div","sb-error","No ABC tunes found. A tune needs at least a K: (key) line."));return}let s=0,a=null;for(const o of n)try{const r=et(o);if(r.notes.length<2)throw new Error("no notes");a=He({title:r.title,abc:o,origin:"ABC import"}),s++}catch(r){t.appendChild(D("div","sb-error",`Skipped a tune: ${r.message}`))}s&&(t.appendChild(D("div","sb-ok",`Added ${s} tune${s===1?"":"s"} to My Songs.`)),this._selected=a,this._view="mine",this.refresh(),this.root.classList.add("detail-open"))}findSong(e){return kt().find(t=>t.id===e)||null}updateProgress(){this._view==="library"||this._view==="mine"?this.refresh():this._renderDetail()}static parsedFor(e){return ut(e)}}const ti=[[/^(maj7|M7)/,[0,4,7,11]],[/^(m7|min7|-7)/,[0,3,7,10]],[/^(dim|°)/,[0,3,6]],[/^(aug|\+)/,[0,4,8]],[/^(sus4|sus)/,[0,5,7]],[/^sus2/,[0,2,7]],[/^(m|min|-)/,[0,3,7]],[/^7/,[0,4,7,10]],[/^6/,[0,4,7,9]],[/^/,[0,4,7]]],ni={C:0,D:2,E:4,F:5,G:7,A:9,B:11};function si(i){const e=(i||"").match(/^([A-G])([#b]?)(.*)$/);if(!e)return null;const t=(ni[e[1]]+(e[2]==="#"?1:e[2]==="b"?-1:0)+12)%12,n=e[3];for(const[s,a]of ti)if(s.test(n))return{root:t,intervals:a};return{root:t,intervals:[0,4,7]}}class Ot{constructor(e){this.ctx=e,this.master=e.createGain(),this.master.gain.value=.8,this.master.connect(e.destination),this.guideBus=e.createGain(),this.backingBus=e.createGain(),this.clickBus=e.createGain();for(const t of[this.guideBus,this.backingBus,this.clickBus])t.connect(this.master);this._active=new Set}setVolumes({guide:e,backing:t,click:n}){const s=this.ctx.currentTime;e!=null&&this.guideBus.gain.setTargetAtTime(e,s,.02),t!=null&&this.backingBus.gain.setTargetAtTime(t,s,.02),n!=null&&this.clickBus.gain.setTargetAtTime(n,s,.02)}_track(e,t){this._active.add(e),e.onended=()=>this._active.delete(e),e.stop(t)}note(e,t,n,s=.25){const a=this.ctx,o=re(e),r=a.createOscillator();r.type="sawtooth",r.frequency.value=o;const c=a.createOscillator(),h=a.createGain();c.frequency.value=5.5,h.gain.setValueAtTime(0,t),h.gain.linearRampToValueAtTime(o*.006,t+Math.min(.35,n)),c.connect(h).connect(r.frequency);const l=a.createBiquadFilter();l.type="lowpass",l.frequency.value=Math.min(5e3,o*5),l.Q.value=.8;const d=a.createGain(),u=Math.max(.06,n*.95);d.gain.setValueAtTime(1e-4,t),d.gain.linearRampToValueAtTime(s,t+.04),d.gain.setTargetAtTime(s*.75,t+.05,.1),d.gain.setTargetAtTime(1e-4,t+u,.04),r.connect(l).connect(d).connect(this.guideBus),r.start(t),c.start(t),this._track(r,t+u+.3),this._track(c,t+u+.3)}chord(e,t,n){const s=si(e);if(!s)return;const a=this.ctx,o=Math.max(.2,n);for(const h of s.intervals){const l=55+(s.root+h-7+12)%12+0,d=a.createOscillator();d.type="triangle",d.frequency.value=re(l);const u=a.createGain();u.gain.setValueAtTime(1e-4,t),u.gain.linearRampToValueAtTime(.07,t+.08),u.gain.setTargetAtTime(1e-4,t+o-.05,.08),d.connect(u).connect(this.backingBus),d.start(t),this._track(d,t+o+.4)}const r=a.createOscillator();r.type="sine",r.frequency.value=re(36+s.root);const c=a.createGain();c.gain.setValueAtTime(1e-4,t),c.gain.linearRampToValueAtTime(.35,t+.01),c.gain.setTargetAtTime(1e-4,t+.05,Math.min(.5,o/2)),r.connect(c).connect(this.backingBus),r.start(t),this._track(r,t+o+.4)}drone(e,t,n){const s=this.ctx;for(const a of[43+(e-7+12)%12,50+(e-2+12)%12]){const o=s.createOscillator();o.type="triangle",o.frequency.value=re(a);const r=s.createGain();r.gain.setValueAtTime(1e-4,t),r.gain.linearRampToValueAtTime(.06,t+.3),r.gain.setTargetAtTime(1e-4,t+n,.2),o.connect(r).connect(this.backingBus),o.start(t),this._track(o,t+n+1)}}click(e,t=!1,n=null){const s=this.ctx,a=s.createOscillator();a.type="square",a.frequency.value=t?1600:1100;const o=s.createGain();if(o.gain.setValueAtTime(t?.35:.2,e),o.gain.exponentialRampToValueAtTime(1e-4,e+.04),n!=null){const r=s.createGain();r.gain.value=n,a.connect(o).connect(r).connect(this.master)}else a.connect(o).connect(this.clickBus);a.start(e),this._track(a,e+.05)}stopAll(){for(const e of this._active)try{e.stop()}catch{}this._active.clear()}dispose(){this.stopAll(),this.master.disconnect()}}const ii={C:"#5fae6a",G:"#d9894a",D:"#5b93d6",A:"#d8b04a",E:"#cf5c5c",B:"#9b7fcf","F#":"#c97aa8","C#":"#5fb0a8",F:"#c97aa8"},It=["#d9894a","#5b93d6","#d8b04a","#cf5c5c","#9b7fcf","#5fae6a"],J="Georgia, 'Palatino Linotype', Palatino, serif",Ve=2.6,ai=.16,zt=.14,be={easy:{label:"Easy",level:1,strikes:5},medium:{label:"Medium",level:3,strikes:4},hard:{label:"Hard",level:q,strikes:3},master:{label:"Master",level:q,strikes:3,fade:!0}};function oi(i,e){return ii[i==null?void 0:i.name]||It[e%It.length]}function y(i,e,t){const n=document.createElement(i);return e&&(n.className=e),t!=null&&(n.textContent=t),n}function Nt(i){i=Math.max(0,i);const e=Math.floor(i/60),t=Math.floor(i%60);return`${e}:${String(t).padStart(2,"0")}`}function pe(i){return i.name.replace(" (repeat)","")}class ri{constructor(e,t){this.container=e,this.deps=t,this.onExit=null,this.onRiffRequest=null,this.settings=Lt(),this._state="idle",this._freq=null,this._freqTime=0,this._raf=null,this._particles=[],this._popups=[],this._synth=null,this._cam=0,this._build(),this._onKey=n=>this._handleKey(n),this._onVisibility=()=>{document.hidden&&this._state==="playing"&&this.pause()},document.addEventListener("visibilitychange",this._onVisibility)}get active(){return this._state==="playing"||this._state==="tuning"||this._state==="paused"}_build(){const e=y("div","sp-root");this.root=e;const t=y("div","sp-hud"),n=y("div","sp-hud-left");this.hudTitle=y("div","sp-title"),this.hudSub=y("div","sp-sub"),n.append(this.hudTitle,this.hudSub);const s=y("div","sp-hud-stats"),a=h=>{const l=y("div","sp-stat"),d=y("div","sp-stat-value","0");return l.append(d,y("div","sp-stat-label",h)),s.appendChild(l),{box:l,v:d}};this.stScore=a("Score"),this.stMult=a("Multiplier"),this.stStreak=a("Streak"),this.stAcc=a("Accuracy"),this.stStrikes=a("Strikes"),t.append(n,s),this.timeline=y("canvas","sp-timeline");const o=y("div","sp-stage");this.canvas=y("canvas","sp-canvas"),o.appendChild(this.canvas),this.stage=o,this.overlay=y("div","sp-overlay hidden"),o.appendChild(this.overlay);const r=y("div","sp-controls");this.btnPause=y("button","sp-btn sp-btn-primary","Pause"),this.btnPause.addEventListener("click",()=>this._state==="paused"?this.resume():this.pause()),this.btnRestart=y("button","sp-btn","Restart"),this.btnRestart.addEventListener("click",()=>this.restart()),this.btnExit=y("button","sp-btn sp-exit","Library"),this.btnExit.addEventListener("click",()=>this.exit());const c=y("label","sp-speed");c.append(y("span",null,"Speed")),this.speedInput=y("input"),this.speedInput.type="range",this.speedInput.min="25",this.speedInput.max="125",this.speedInput.step="5",this.speedInput.value="100",this.speedVal=y("span","sp-speed-val","100%"),this.speedInput.addEventListener("input",()=>this._setSpeed(Number(this.speedInput.value)/100)),c.append(this.speedInput,this.speedVal),r.append(this.btnPause,this.btnRestart,c,this.btnExit),e.append(t,this.timeline,o,r),this.container.appendChild(e),this._ro=new ResizeObserver(()=>this._resize()),this._ro.observe(o),this._ro.observe(this.timeline)}_resize(){const e=window.devicePixelRatio||1,t=this.stage.getBoundingClientRect();this._w=Math.max(200,t.width),this._h=Math.max(160,t.height),this.canvas.width=Math.round(this._w*e),this.canvas.height=Math.round(this._h*e),this.canvas.style.width=this._w+"px",this.canvas.style.height=this._h+"px",this._dpr=e;const n=this.timeline.getBoundingClientRect();this.timeline.width=Math.round(Math.max(100,n.width)*e),this.timeline.height=Math.round(Math.max(10,n.height)*e)}start(e,t,n){var c,h;this.song=e,this.chart=t,this.opts={mode:"learn",difficulty:"hard",...n},this.settings=Lt(),this.progress=tt(e.id),this.preset=te[t.tuningKey],this.beatSec=60/t.tempo,this.notes=t.notes.map((l,d)=>({...l,i:d,sec:l.start*this.beatSec,durSec:l.dur*this.beatSec})),this.phrases=t.phrases.map(l=>({...l,sec:l.start*this.beatSec,endSec:l.end*this.beatSec})),this.endSec=t.totalBeats*this.beatSec;{const l=t.meter,d=l.num%3===0&&l.num>3;this._clickSec=(d?3*(4/l.den):4/l.den)*this.beatSec;const u=l.num*(4/l.den)*this.beatSec,p=Math.round(u/this._clickSec);this._countInSec=p>=3?u:u*2}this._barStartSecs=new Set(t.bars.map(l=>Math.round(l.start*this.beatSec*1e3)));const s=this.opts.mode;let a=1;s==="riff"&&(a=(((c=this.opts.riff)==null?void 0:c.speed)??100)/100),this.speedInput.value=String(Math.round(a*100)),this.speedVal.textContent=`${Math.round(a*100)}%`,this.speed=a,this.title=e.title||t.title,this.hudTitle.textContent=this.title;const o=s==="learn"?"Learn a Song":s==="score"?`Score Attack · ${be[this.opts.difficulty].label}`:"Riff Repeater";this.hudSub.textContent=`${o} · ${t.key.label} · ${t.meter.text} · ${Math.round(t.tempo)} bpm`,this.stMult.box.style.display=s==="score"?"":"none",this.stStrikes.box.style.display=s==="score"?"":"none",this.stScore.box.style.display=s==="learn"?"none":"",document.addEventListener("keydown",this._onKey),this._resize();const r=this.deps.getCtx();(h=r==null?void 0:r.resume)==null||h.call(r),this._resetRun(),this._pausedAt=null,this._anchorSong=0,this.settings.tuningCheck&&s!=="riff"?this._showTuningCheck():this._beginPlay(),this._loop()}_resetRun(){const e=this.opts.mode;this.score=0,this.streak=0,this.bestStreak=0,this.multiplier=1,this.hits=0,this.misses=0,this.perfects=0,this.strikes=0,this.consecMiss=0,this.failed=!1,this._particles=[],this._popups=[];for(const t of this.notes)t.state="pending",t.frames=0,t.firstMatch=null,t.cents=null,t.holdFrames=0;for(const t of this.phrases)t.level=null,t.evaluated=!1,t.hits=0,t.total=0,t.faded=!1;if(e==="riff"){const t=this.opts.riff;this.rangeStart=this.phrases[t.from].sec,this.rangeEnd=this.phrases[t.to].endSec,this.loopCount=0,this.loopStats=[]}else this.rangeStart=0,this.rangeEnd=this.endSec;this._levelByKey={};for(let t=0;t<this.phrases.length;t++){const n=pe(this.phrases[t]);n in this._levelByKey||(this._levelByKey[n]=this.progress.phraseLevels[n]??0)}}_levelFor(e){const t=this.opts.mode;if(t==="score")return be[this.opts.difficulty].level;if(t==="riff"){const n=this.opts.riff.level;return n==="dynamic"?this._levelByKey[pe(this.phrases[e])]:n}return this._levelByKey[pe(this.phrases[e])]}_isMasterFade(e){const t=this.opts.mode;return t==="score"?!!be[this.opts.difficulty].fade:t==="learn"&&this.settings.masterMode?!!this.progress.phraseMastered[pe(this.phrases[e])]:!1}_beginPlay(){this._hideOverlay(),this._resetRun();const e=this.deps.getCtx();e&&!this._synth?this._synth=new Ot(e):e&&this._synth&&this._synth.ctx!==e&&(this._synth.dispose(),this._synth=new Ot(e)),this._applyVolumes(),this._seek(this.rangeStart-this._countInSec),this._state="playing",this.btnPause.textContent="Pause",this.btnPause.disabled=!1}_applyVolumes(){if(!this._synth)return;const e=this.settings;this._synth.setVolumes({guide:e.guide?e.guideVolume:0,backing:e.backing?e.backingVolume:0,click:e.click?e.clickVolume:0})}_now(){const e=this.deps.getCtx();return e&&e.state==="running"?e.currentTime:performance.now()/1e3}_clockIsCtx(){const e=this.deps.getCtx();return!!(e&&e.state==="running")}_seek(e){var t;this._anchorSong=e,this._anchorClock=this._now(),this._anchorIsCtx=this._clockIsCtx(),this._scheduledUntil=e,(t=this._synth)==null||t.stopAll(),this._nextBeat=Math.ceil(e/this._clickSec-1e-6)}get songSec(){if(this._state==="paused"||this._state!=="playing")return this._pausedAt??this._anchorSong??0;if(this._anchorIsCtx!==this._clockIsCtx()){const e=this._anchorSong;this._seek(e)}return this._anchorSong+(this._now()-this._anchorClock)*this.speed}_setSpeed(e){const t=this.songSec;this.speed=e,this.speedVal.textContent=`${Math.round(e*100)}%`,this._state==="playing"&&this._seek(t)}pause(){var e;this._state==="playing"&&(this._pausedAt=this.songSec,this._state="paused",(e=this._synth)==null||e.stopAll(),this.btnPause.textContent="Resume",this._showPauseMenu())}resume(){if(this._state!=="paused")return;this._hideOverlay();const e=this._pausedAt-2*this.beatSec;this._state="playing",this._pausedAt=null,this._seek(Math.max(this.rangeStart-this._countInSec,e)),this.btnPause.textContent="Pause"}restart(){this.chart&&(this._pausedAt=null,this._beginPlay())}exit(){var e;this.stop(),(e=this.onExit)==null||e.call(this)}stop(){var e;this._state="idle",(e=this._synth)==null||e.stopAll(),this._hideOverlay(),document.removeEventListener("keydown",this._onKey),this._raf&&cancelAnimationFrame(this._raf),this._raf=null}_handleKey(e){e.target&&(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")||(e.code==="Space"?(e.preventDefault(),this._state==="playing"?this.pause():this._state==="paused"&&this.resume()):e.key==="Escape"?this._state==="playing"?this.pause():this.exit():(e.key==="r"||e.key==="R")&&this.restart())}update(e){this._freq=e,this._freqTime=performance.now(),this._state==="tuning"?this._updateTuning(e):this._state==="playing"&&this._judge(e)}_evalSec(){return this.songSec-this.settings.latencyMs/1e3*this.speed}_visible(e){const n=this.phrases[e.phrase].level??this._levelFor(e.phrase);return e.minLevel<=n}_judge(e){const t=this._evalSec(),n=ai*this.speed,s=zt*this.speed,a=this.settings.tolerance;let o=null;e&&(o=69+12*Math.log2(e/440));for(const r of this.notes){if(r.state!=="pending"||r.sec<this.rangeStart-1e-6||r.sec>=this.rangeEnd-1e-6)continue;if(r.sec-n>t)break;if(!this._visible(r))continue;const c=r.sec+Math.max(Math.min(r.durSec,.6*this.speed),.12*this.speed)+s;if(t>c){this._registerMiss(r);continue}if(o==null)continue;const h=(o-r.midi)*100;if(Math.abs(h)<=a){r.firstMatch==null&&(r.firstMatch=t),r.frames++,r.cents=r.cents==null?h:r.cents*.6+h*.4;const l=r.durSec/this.speed<.18?1:2;r.frames>=l&&this._registerHit(r);break}}for(const r of this.notes)if(r.state==="hit"&&!(r.sec+r.durSec<t)){if(r.sec-n>t)break;r.holding=o!=null&&Math.abs((o-r.midi)*100)<=a}this._evaluatePhrases(t)}_registerHit(e){e.state="hit";const t=(e.firstMatch-e.sec)/this.speed,n=Math.abs(t)<.08&&Math.abs(e.cents??0)<20;e.grade=n?"perfect":"good",this.hits++,n&&this.perfects++,this.streak++,this.consecMiss=0,this.bestStreak=Math.max(this.bestStreak,this.streak),this.multiplier=Math.min(4,1+Math.floor(this.streak/10)),this.score+=(n?150:100)*this.multiplier;const s=this.phrases[e.phrase];s.hits++,s.total++;const a=this._notePos(e,0);this._burst(a.x,a.y,this._colorOf(e.string),n?22:12);let o=n?"Perfect":t<0?"Early":"Late";!n&&Math.abs(e.cents??0)>=20&&Math.abs(t)<.08&&(o=e.cents>0?"Sharp":"Flat"),this._popup(a.x,a.y-30,o,n?"#9fd8a4":"#f0d58a"),this.streak>0&&this.streak%25===0&&this._popup(this._w/2,this._h*.3,`${this.streak} note streak!`,"#f5f0e8",1.6)}_registerMiss(e){e.state="miss",this.misses++,this.streak=0,this.multiplier=1,this.consecMiss++;const t=this.phrases[e.phrase];t.total++;const n=this._notePos(e,0);this._popup(n.x,n.y-30,"Miss","#e48a8a"),this.opts.mode==="score"&&this.consecMiss>=3&&(this.consecMiss=0,this.strikes++,this._popup(this._w/2,this._h*.35,`STRIKE ${this.strikes}`,"#e06b6b",2),this.strikes>=be[this.opts.difficulty].strikes&&(this.failed=!0,this._finish()))}_evaluatePhrases(e){const t=this.opts.mode;for(let n=0;n<this.phrases.length;n++){const s=this.phrases[n];if(s.level==null&&s.sec-Ve*this.speed<=this.songSec&&(s.level=this._levelFor(n),s.faded=this._isMasterFade(n)),s.evaluated||e<s.endSec+zt*this.speed+.05)continue;if(s.sec<this.rangeStart-1e-6||s.endSec>this.rangeEnd+1e-6){s.evaluated=!0;continue}if(s.evaluated=!0,s.total===0)continue;const a=s.hits/s.total;if(s.acc=a,t==="learn"||t==="riff"&&this.opts.riff.level==="dynamic"){const o=pe(s),r=this._levelByKey[o];a>=.85&&r<q?(this._levelByKey[o]=r+1,this._popup(this._w/2,this._h*.22,"LEVEL UP","#a9c8ee",1.8)):a>=.9&&r===q?this.progress.phraseMastered[o]?s.faded&&(this.progress.phraseMasterCleared=this.progress.phraseMasterCleared||{},this.progress.phraseMasterCleared[o]=!0):(this.progress.phraseMastered[o]=!0,this._popup(this._w/2,this._h*.22,"PHRASE MASTERED","#c9b6ec",2)):a<.4&&r>0&&(this._levelByKey[o]=r-1,this._popup(this._w/2,this._h*.22,"Level down","#e8b98a",1.4))}}}_schedule(){var c;if(!this._synth||!this._clockIsCtx()||this._state!=="playing")return;const e=.3*this.speed,t=this._scheduledUntil,n=this.songSec+e;if(n<=t)return;const s=h=>this._anchorClock+(h-this._anchorSong)/this.speed,a=this._now(),o=this._clickSec;for(;this._nextBeat*o<n;){const h=this._nextBeat*o;if(h>=t-1e-6&&h<=this.rangeEnd+1e-6){const l=h<this.rangeStart-1e-6;if(this.settings.click||l){const d=l?!1:this._barStartSecs.has(Math.round(h*1e3)),u=s(h);u>=a-.01&&this._synth.click(u,d,l&&!this.settings.click?this.settings.clickVolume:null)}}this._nextBeat++}for(const h of this.notes){if(h.sec<t||h.sec>=n||h.sec<this.rangeStart-1e-6||h.sec>=this.rangeEnd-1e-6||!this._visible(h))continue;const l=s(h.sec);l>=a-.01&&this._synth.note(h.midi,l,h.durSec/this.speed)}const r=this.chart.chords;if(r.length>0)for(let h=0;h<r.length;h++){const l=r[h],d=l.start*this.beatSec;if(d<t||d>=n||d<this.rangeStart-1e-6||d>=this.rangeEnd-1e-6)continue;const u=(((c=r[h+1])==null?void 0:c.start)??this.chart.totalBeats)*this.beatSec,p=s(d);p>=a-.01&&this._synth.chord(l.symbol,p,Math.min(u,this.rangeEnd)/this.speed-d/this.speed)}else for(const h of this.chart.bars){const l=h.start*this.beatSec;if(l<t||l>=n||l<this.rangeStart-1e-6||l>=this.rangeEnd-1e-6)continue;const d=s(l);d>=a-.01&&this._synth.drone(this.chart.key.tonicPc,d,h.dur*this.beatSec/this.speed)}this._scheduledUntil=n}_loop(){this._raf&&cancelAnimationFrame(this._raf);const e=()=>{this._raf=requestAnimationFrame(e),this._state==="playing"&&(performance.now()-this._freqTime>100&&this._judge(null),this._schedule(),this._checkEnd()),this._render(),this._renderTimeline(),this._updateHud()};e()}_checkEnd(){const e=this.songSec;if(this.opts.mode==="riff"){e>=this.rangeEnd+.4*this.speed&&this._riffLoop();return}e>=this.endSec+1.2*this.speed&&this._finish()}_riffLoop(){const e=this.opts.riff;let t=0,n=0;for(const a of this.notes)a.sec<this.rangeStart-1e-6||a.sec>=this.rangeEnd-1e-6||(a.state==="hit"&&n++,(a.state==="hit"||a.state==="miss")&&t++);const s=t?n/t:0;if(this.loopCount++,this.loopStats.push({acc:s,speed:this.speed}),e.trainer&&s>=.9&&this.speed<1){const a=Math.min(1,Math.round((this.speed+.05)*100)/100);this.speed=a,this.speedInput.value=String(Math.round(a*100)),this.speedVal.textContent=`${Math.round(a*100)}%`,this._popup(this._w/2,this._h*.25,`Speed up → ${Math.round(a*100)}%`,"#a9c8ee",1.8)}this._popup(this._w/2,this._h*.4,`Loop ${this.loopCount}: ${Math.round(s*100)}%`,"#f5f0e8",1.6);for(const a of this.notes)a.sec<this.rangeStart-1e-6||a.sec>=this.rangeEnd-1e-6||(a.state="pending",a.frames=0,a.firstMatch=null,a.cents=null);for(const a of this.phrases)a.evaluated=!1,a.hits=0,a.total=0,a.level=null;this._saveDynamicLevels(),this._seek(this.rangeStart-2*this.beatSec)}_saveDynamicLevels(){(this.opts.mode==="learn"||this.opts.mode==="riff"&&this.opts.riff.level==="dynamic")&&(this.progress.phraseLevels={...this.progress.phraseLevels,...this._levelByKey},this._recomputeMastery(),Tt(this.song.id,this.progress))}_recomputeMastery(){var n;const e=Object.keys(this._levelByKey);if(e.length===0)return;let t=0;for(const s of e){let o=(this._levelByKey[s]??0)/q*100;this.progress.phraseMastered[s]&&(o=100),(n=this.progress.phraseMasterCleared)!=null&&n[s]&&(o=110),t+=o}this.progress.mastery=Math.round(t/e.length)}_finish(){var o;if(this._state==="results")return;this._pausedAt=this.songSec,this._state="results",this.btnPause.disabled=!0,(o=this._synth)==null||o.stopAll();const e=this.hits+this.misses,t=e?this.hits/e:0,n=this.progress;n.plays=(n.plays||0)+1,n.lastPlayed=Date.now(),n.bestAccuracy=Math.max(n.bestAccuracy||0,Math.round(t*100)),n.bestStreak=Math.max(n.bestStreak||0,this.bestStreak);let s=null,a=!1;if(this.opts.mode==="score"){const r=this.opts.difficulty;this.failed||(s=t>=.98?"platinum":t>=.9?"gold":t>=.75?"silver":t>=.5?"bronze":null),(n.bestScore[r]||0)<this.score&&(n.bestScore[r]=this.score,a=!0);const c={bronze:1,silver:2,gold:3,platinum:4};s&&c[s]>(c[n.medal[r]]||0)&&(n.medal[r]=s)}this.opts.mode==="learn"&&(this.progress.phraseLevels={...this.progress.phraseLevels,...this._levelByKey},this._recomputeMastery()),Tt(this.song.id,n),this._showResults({acc:t,medal:s,newBest:a})}_colorOf(e){var t;return oi((t=this.preset)==null?void 0:t.strings[e],e)}_geometry(){const e=this._w,t=this._h,n=this.preset?this.preset.strings.length:4,s=t<360,a=t*(s?.56:.6),o=t*.86,r=(o-a)/Math.max(1,n-1||1),c=o+r*.55,h={x:e/2,y:t*.04},l=e<520?7:9,d=Math.max(26,e*.08),u=(e-d-Math.max(12,e*.08))/l,p=(1/.1-1)/(Ve*this.speed);return{W:e,H:t,nStr:n,nearTop:a,nearBottom:o,rowH:r,floorY:c,vp:h,span:l,left:d,colW:u,k:p}}_project(e,t,n,s){const a=1/(1+Math.max(-.4/s.k,n)*s.k);return{x:s.vp.x+(e-s.vp.x)*a,y:s.vp.y+(t-s.vp.y)*a,f:a}}_rowY(e,t){return t.nearTop+e*t.rowH}_colX(e,t){return t.left+(e-this._cam+.5)*t.colW}_notePos(e,t){const n=this._geometry();return this._project(this._colX(e.offset,n),this._rowY(e.string,n),t,n)}_render(){const e=this.canvas.getContext("2d");if(!e||!this._w)return;const t=this._dpr||1;e.setTransform(t,0,0,t,0,0);const n=this._geometry(),{W:s,H:a}=n,o=e.createLinearGradient(0,0,0,a);if(o.addColorStop(0,"#111a2e"),o.addColorStop(.6,"#1a2744"),o.addColorStop(1,"#1e3a6e"),e.fillStyle=o,e.fillRect(0,0,s,a),!this.chart)return;const r=this.songSec,c=this._state==="playing"?this._evalSec():r,h=Ve*this.speed;let l=1/0,d=-1/0,u=null;for(const m of this.notes)if(!(m.sec+m.durSec<r-.2)){if(m.sec>r+h*.8)break;this._visible(m)&&(u===null&&m.offset>0&&(u=m.base),m.offset>0&&(l=Math.min(l,m.offset),d=Math.max(d,m.offset)))}let p=this._cam;l!==1/0&&(l-1<this._cam&&(p=Math.max(0,l-1)),d+1>this._cam+n.span&&(p=Math.max(0,d+1-n.span)),d<=n.span-1&&(p=0)),this._cam+=(p-this._cam)*.08,this._anchorBase=u??this._anchorBase??0;const f=m=>m-r,B=Math.floor(this._cam),A=Math.ceil(this._cam+n.span),C=this._project(this._colX(B-.5,n),n.floorY,0,n),M=this._project(this._colX(A+.5,n),n.floorY,0,n),k=this._project(this._colX(B-.5,n),n.floorY,h,n),z=this._project(this._colX(A+.5,n),n.floorY,h,n),g=e.createLinearGradient(0,k.y,0,C.y);g.addColorStop(0,"rgba(236,229,216,0)"),g.addColorStop(1,"rgba(236,229,216,0.07)"),e.fillStyle=g,e.beginPath(),e.moveTo(C.x,C.y),e.lineTo(M.x,M.y),e.lineTo(z.x,z.y),e.lineTo(k.x,k.y),e.closePath(),e.fill();const G=this._anchorBase;{const m=this._project(this._colX(G+.5,n),n.floorY,0,n),_=this._project(this._colX(G+8.5,n),n.floorY,0,n),w=this._project(this._colX(G+8.5,n),n.floorY,h*.6,n),N=this._project(this._colX(G+.5,n),n.floorY,h*.6,n),X=e.createLinearGradient(0,N.y,0,m.y);X.addColorStop(0,"rgba(196,154,42,0)"),X.addColorStop(1,"rgba(196,154,42,0.14)"),e.fillStyle=X,e.beginPath(),e.moveTo(m.x,m.y),e.lineTo(_.x,_.y),e.lineTo(w.x,w.y),e.lineTo(N.x,N.y),e.closePath(),e.fill()}for(let m=B;m<=A+1;m++){const _=this._project(this._colX(m-.5,n),n.floorY,0,n),w=this._project(this._colX(m-.5,n),n.floorY,h,n),N=m-G===2||m-G===4||m-G===5||m-G===7;e.strokeStyle=N?"rgba(236,229,216,0.25)":"rgba(236,229,216,0.1)",e.lineWidth=1,e.beginPath(),e.moveTo(_.x,_.y),e.lineTo(w.x,w.y),e.stroke()}const F=Math.floor(r/this.beatSec),E=Math.ceil((r+h)/this.beatSec),S=this.chart.bars,v=new Set(S.map(m=>Math.round(m.start*1e3)));for(let m=F;m<=E;m++){const _=m*this.beatSec,w=f(_);if(w<-.05||w>h)continue;const N=v.has(Math.round(m*1e3)),X=this._project(this._colX(B-.5,n),n.floorY,w,n),Q=this._project(this._colX(A+.5,n),n.floorY,w,n);e.strokeStyle=N?"rgba(236,229,216,0.38)":"rgba(236,229,216,0.12)",e.lineWidth=N?2*X.f+.5:1,e.beginPath(),e.moveTo(X.x,X.y),e.lineTo(Q.x,Q.y),e.stroke()}e.textAlign="left";for(const m of this.phrases){const _=f(m.sec);if(_<0||_>h)continue;const w=this._project(this._colX(A+.6,n),n.floorY,_,n);e.fillStyle="rgba(236,229,216,0.65)",e.font=`600 ${Math.max(9,14*w.f)}px ${J}`,e.fillText(m.name,Math.min(s-60,w.x+4),w.y-4)}const b=n.nStr;for(let m=0;m<b;m++){const _=this._rowY(m,n),w=this._project(this._colX(B-.5,n),_,0,n),N=this._project(this._colX(A+.5,n),_,0,n);e.strokeStyle=this._colorOf(m),e.globalAlpha=.85,e.lineWidth=2.5+(b-m)*.5,e.beginPath(),e.moveTo(w.x,_),e.lineTo(N.x,_),e.stroke(),e.globalAlpha=1,e.fillStyle=this._colorOf(m),e.font=`700 13px ${J}`,e.textAlign="left",e.fillText(this.preset.strings[m].name,6,_+4)}e.textAlign="center",e.font=`600 11px ${J}`;for(let m=Math.max(0,B);m<=A;m++){const _=this._colX(m,n),w=m-G;e.fillStyle=w>=1&&w<=8?"rgba(232,206,140,0.9)":"rgba(236,229,216,0.4)",e.fillText(String(m),_,n.floorY+14)}e.fillStyle="rgba(232,206,140,0.9)",e.font=`600 11px ${J}`,e.textAlign="left",e.fillText(`${Ss(this._positionOfBase(G))} position`,10,38);const T=[];for(const m of this.notes)if(!(m.sec+m.durSec<r-.4*this.speed)){if(m.sec>r+h)break;m.sec<this.rangeStart-1e-6||m.sec>=this.rangeEnd-1e-6||this._visible(m)&&T.push(m)}for(let m=T.length-1;m>=0;m--)this._drawNote(e,T[m],r,n,h);if(this._drawPitchCursor(e,n,c),this._drawFx(e),this._state==="playing"&&r<this.rangeStart){const m=Math.ceil((this.rangeStart-r)/this._clickSec-1e-6);m>0&&(e.fillStyle="rgba(245,240,232,0.92)",e.font=`700 ${Math.min(96,a*.22)}px ${J}`,e.textAlign="center",e.fillText(String(m),s/2,a*.4))}const O=this.phrases.find(m=>r>=m.sec&&r<m.endSec);if(e.textAlign="left",e.fillStyle="rgba(236,229,216,0.85)",e.font=`600 13px ${J}`,O){const m=O.level??this._levelFor(this.phrases.indexOf(O)),_=this.opts.mode==="learn"||this.opts.mode==="riff"&&this.opts.riff.level==="dynamic"?` · Level ${m}/${q}`:"";e.fillText(`${O.name}${_}${O.faded?" · MASTER MODE":""}`,10,20)}e.textAlign="right",e.fillText(`${Nt(Math.max(0,r)/this.speed)} / ${Nt(this.endSec/this.speed)}`,s-10,20)}_positionOfBase(e){const t=[1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10];return t[Math.max(0,Math.min(t.length-1,Math.round(e)))]}_drawNote(e,t,n,s,a){const o=t.sec-n,r=t.sec+t.durSec-n,c=this._colorOf(t.string),h=this._rowY(t.string,s),l=t.offset===0,d=Math.floor(this._cam),u=Math.ceil(this._cam+s.span);let p=1;if(this.phrases[t.phrase].faded&&(p=Math.max(0,Math.min(1,(o/a-.35)/.25))),t.state==="miss"&&(p*=.35),p<=.01&&t.state!=="hit")return;if(e.save(),e.globalAlpha=p,t.durSec>.3*this.beatSec*2||t.durSec/this.speed>.35){const g=Math.max(0,o),G=Math.min(a,r);if(G>g){const F=l?null:this._colX(t.offset,s),E=l?null:s.colW*.22,S=l?null:this._project(F-E,h,g,s),v=l?null:this._project(F+E,h,g,s),b=l?null:this._project(F+E,h,G,s),T=l?null:this._project(F-E,h,G,s);if(e.fillStyle=c,e.globalAlpha=p*(t.state==="hit"?t.holding?.85:.45:.4),!l)e.beginPath(),e.moveTo(S.x,S.y),e.lineTo(v.x,v.y),e.lineTo(b.x,b.y),e.lineTo(T.x,T.y),e.closePath(),e.fill();else{const O=this._project(this._colX(d,s),h,g,s),m=this._project(this._colX(u,s),h,g,s),_=this._project(this._colX(d,s),h,G,s),w=this._project(this._colX(u,s),h,G,s);e.globalAlpha=p*.18,e.beginPath(),e.moveTo(O.x,O.y),e.lineTo(m.x,m.y),e.lineTo(w.x,w.y),e.lineTo(_.x,_.y),e.closePath(),e.fill()}e.globalAlpha=p}}if(t.state==="hit"){e.restore();return}o<-.02&&t.state;const B=Math.max(0,o);if(l){const g=this._project(this._colX(d+.1,s),h,B,s),G=this._project(this._colX(u-.1,s),h,B,s),F=s.rowH*.32*g.f+3;if(e.fillStyle=c,e.globalAlpha=p*.85,this._roundRect(e,g.x,g.y-F/2,G.x-g.x,F,F/2),e.fill(),e.globalAlpha=p,e.fillStyle="#1a2744",e.font=`700 ${Math.max(9,18*g.f)}px ${J}`,e.textAlign="center",e.fillText("0",(g.x+G.x)/2,g.y+6*g.f),this.settings.showNoteNames&&g.f>.35){const E=Le(t.midi);e.fillStyle="rgba(255,255,255,0.85)",e.font=`600 ${Math.max(8,12*g.f)}px ${J}`,e.fillText(`${E.name}${E.octave}`,(g.x+G.x)/2+40*g.f,g.y-F)}e.restore();return}const A=this._project(this._colX(t.offset,s),h,B,s),C=this._project(this._colX(t.offset,s),s.floorY,B,s),M=s.colW*.78*A.f,k=Math.min(s.rowH*.8,s.colW*.6)*A.f+4;e.strokeStyle=c,e.globalAlpha=p*.35,e.lineWidth=Math.max(1,3*A.f),e.beginPath(),e.moveTo(A.x,A.y),e.lineTo(C.x,C.y),e.stroke(),e.fillStyle=c,e.globalAlpha=p*.25,e.beginPath(),e.ellipse(C.x,C.y,M*.45,3*A.f+1,0,0,Math.PI*2),e.fill(),e.globalAlpha=p;const z=e.createLinearGradient(0,A.y-k/2,0,A.y+k/2);if(z.addColorStop(0,"#f5f0e8"),z.addColorStop(.25,c),z.addColorStop(1,c),e.fillStyle=z,this._roundRect(e,A.x-M/2,A.y-k/2,M,k,Math.min(8,k/3)),e.fill(),e.strokeStyle=t.state==="miss"?"#e06b6b":"rgba(245,240,232,0.9)",e.lineWidth=Math.max(1,2*A.f),e.stroke(),e.fillStyle="#1a2744",e.font=`700 ${Math.max(9,k*.62)}px ${J}`,e.textAlign="center",e.fillText(String(t.finger),A.x,A.y+k*.22),this.settings.showNoteNames&&A.f>.3){const g=Le(t.midi);e.fillStyle="rgba(255,255,255,0.9)",e.font=`600 ${Math.max(8,12*A.f)}px ${J}`,e.fillText(`${g.name}${g.octave}`,A.x,A.y-k/2-4*A.f)}e.restore()}_drawPitchCursor(e,t,n){if(!(this._freq&&performance.now()-this._freqTime<150))return;const a=69+12*Math.log2(this._freq/440);let o=null;for(const p of this.notes)if(!(p.state!=="pending"||!this._visible(p))&&!(p.sec+p.durSec<n-.2)){o=p;break}let r;if(o&&Math.abs(o.sec-n)<1.2*this.speed)r=o.string;else{r=0;const p=this.chart.openMidis;for(let f=p.length-1;f>=0;f--)if(a>=p[f]-.5){r=f;break}}const c=a-this.chart.openMidis[r];if(c<-1||c>20)return;const h=this._colX(c,t),l=this._rowY(r,t);let d="#c9d3e6",u="";if(o&&o.string===r){const p=(a-o.midi)*100;Math.abs(p)<=this.settings.tolerance?d="#8fd19a":d="#e8b25f",Math.abs(p)<150&&(u=`${p>0?"+":""}${Math.round(p)}¢`)}e.save(),e.shadowColor=d,e.shadowBlur=16,e.strokeStyle=d,e.lineWidth=3,e.beginPath(),e.arc(h,l,11,0,Math.PI*2),e.stroke(),e.restore(),u&&(e.fillStyle=d,e.font=`700 11px ${J}`,e.textAlign="center",e.fillText(u,h,l+26))}_roundRect(e,t,n,s,a,o){e.beginPath(),e.moveTo(t+o,n),e.arcTo(t+s,n,t+s,n+a,o),e.arcTo(t+s,n+a,t,n+a,o),e.arcTo(t,n+a,t,n,o),e.arcTo(t,n,t+s,n,o),e.closePath()}_burst(e,t,n,s){for(let a=0;a<s;a++){const o=Math.random()*Math.PI*2,r=1.5+Math.random()*4;this._particles.push({x:e,y:t,vx:Math.cos(o)*r,vy:Math.sin(o)*r-2,life:1,color:n})}}_popup(e,t,n,s,a=1){this._popups.push({x:e,y:t,text:n,color:s,life:1,scale:a})}_drawFx(e){for(const t of this._particles)t.x+=t.vx,t.y+=t.vy,t.vy+=.15,t.life-=.03,e.globalAlpha=Math.max(0,t.life),e.fillStyle=t.color,e.fillRect(t.x-2,t.y-2,4,4);this._particles=this._particles.filter(t=>t.life>0),e.textAlign="center";for(const t of this._popups)t.y-=.6,t.life-=.018,e.globalAlpha=Math.max(0,Math.min(1,t.life*1.5)),e.fillStyle=t.color,e.font=`800 ${Math.round(15*t.scale)}px ${J}`,e.fillText(t.text,t.x,t.y);this._popups=this._popups.filter(t=>t.life>0).slice(-14),e.globalAlpha=1}_renderTimeline(){const e=this.timeline,t=e.getContext("2d");if(!t||!this.chart)return;const n=this._dpr||1,s=e.width/n,a=e.height/n;t.setTransform(n,0,0,n,0,0),t.clearRect(0,0,s,a),t.fillStyle="#e2dace",t.fillRect(0,0,s,a);const o=this.endSec||1;for(let c=0;c<this.phrases.length;c++){const h=this.phrases[c],l=h.sec/o*s,d=h.endSec/o*s,u=h.level??this._levelFor(c),p=pe(h),f=this.opts.mode==="learn"&&this.progress.phraseMastered[p],B=h.sec>=this.rangeStart-1e-6&&h.endSec<=this.rangeEnd+1e-6,A=.25+.75*(u/q);t.fillStyle=B?f?"#6b4c9a":h.evaluated&&h.acc!=null?h.acc>=.85?"#228b22":h.acc>=.5?"#c49a2a":"#b83a3a":"#5a6a88":"rgba(90,106,136,0.25)",t.fillRect(l+1,a-a*A,Math.max(1,d-l-2),a*A)}const r=Math.max(0,this.songSec)/o*s;t.fillStyle="#1a2744",t.fillRect(r-1,0,2,a)}_updateHud(){if(!this.chart||this._state==="idle")return;const e=(this.hits||0)+(this.misses||0);this.stScore.v.textContent=(this.score||0).toLocaleString(),this.stMult.v.textContent=`×${this.multiplier||1}`,this.stStreak.v.textContent=String(this.streak||0),this.stAcc.v.textContent=e?`${Math.round(this.hits/e*100)}%`:"—";const t=this.opts.mode==="score"?be[this.opts.difficulty].strikes:0;this.stStrikes.v.textContent=t?`${"✕".repeat(this.strikes||0)}${"·".repeat(Math.max(0,t-(this.strikes||0)))}`:""}_hideOverlay(){this.overlay.classList.add("hidden"),this.overlay.replaceChildren()}_showOverlay(...e){this.overlay.replaceChildren(...e),this.overlay.classList.remove("hidden")}_showTuningCheck(){this._state="tuning";const e=y("div","sp-card");e.append(y("h3",null,"Tune Up")),e.append(y("p","sp-muted",`Play each open string. This song is arranged for ${this.preset.label}.`));const t=y("div","sp-tune-list");this._tuneRows=this.preset.strings.map((o,r)=>{const c=y("div","sp-tune-row"),h=y("span","sp-tune-name",`${o.name}${o.octave}`);h.style.color=this._colorOf(r);const l=y("div","sp-tune-meter"),d=y("div","sp-tune-needle");l.appendChild(d);const u=y("span","sp-tune-val","—");return c.append(h,l,u),t.appendChild(c),{row:c,needle:d,val:u,freq:o.frequency,okFrames:0,done:!1}}),e.appendChild(t);const n=y("div","sp-card-btns"),s=y("button","sp-btn sp-btn-primary","Start song");s.addEventListener("click",()=>this._beginPlay());const a=y("button","sp-btn","Always skip tuning");a.addEventListener("click",()=>{this.settings.tuningCheck=!1,Qe(this.settings),this._beginPlay()}),n.append(s,a),e.appendChild(n),this._showOverlay(e)}_updateTuning(e){if(this._tuneRows){for(const t of this._tuneRows){if(!e)continue;const n=1200*Math.log2(e/t.freq);if(Math.abs(n)>80)continue;const s=Math.max(-50,Math.min(50,n));t.needle.style.left=`${50+s}%`,t.val.textContent=`${n>0?"+":""}${Math.round(n)}¢`,Math.abs(n)<8?t.okFrames++:t.okFrames=Math.max(0,t.okFrames-1),t.okFrames>12&&!t.done&&(t.done=!0,t.row.classList.add("ok"),t.val.textContent="✓ in tune")}this._tuneRows.every(t=>t.done)&&(this._tuneRows=null,setTimeout(()=>{this._state==="tuning"&&this._beginPlay()},600))}}_showPauseMenu(){const e=y("div","sp-card");e.append(y("h3",null,"Paused"));const t=y("div","sp-card-btns sp-card-btns--col"),n=y("button","sp-btn sp-btn-primary","Resume");n.addEventListener("click",()=>this.resume());const s=y("button","sp-btn","Restart");s.addEventListener("click",()=>this.restart());const a=y("button","sp-btn","Riff Repeater this phrase");a.addEventListener("click",()=>{var B;const p=this._pausedAt??0;let f=this.phrases.findIndex(A=>p>=A.sec&&p<A.endSec);f<0&&(f=0),this.stop(),(B=this.onRiffRequest)==null||B.call(this,this.song,f,f)});const o=y("button","sp-btn","Back to library");o.addEventListener("click",()=>this.exit()),t.append(n,s,a,o),e.appendChild(t);const r=y("label","sp-setting");r.append(y("span",null,"Latency offset"));const c=y("input");c.type="range",c.min="0",c.max="300",c.step="10",c.value=String(this.settings.latencyMs);const h=y("span",null,`${this.settings.latencyMs} ms`);c.addEventListener("input",()=>{this.settings.latencyMs=Number(c.value),h.textContent=`${c.value} ms`,Qe(this.settings)}),r.append(c,h);const l=y("label","sp-setting");l.append(y("span",null,"Pitch tolerance"));const d=y("input");d.type="range",d.min="10",d.max="60",d.step="5",d.value=String(this.settings.tolerance);const u=y("span",null,`±${this.settings.tolerance}¢`);d.addEventListener("input",()=>{this.settings.tolerance=Number(d.value),u.textContent=`±${d.value}¢`,Qe(this.settings)}),l.append(d,u),e.append(r,l),this._showOverlay(e)}_showResults({acc:e,medal:t,newBest:n}){const s=y("div","sp-card sp-results"),a=this.failed?"Song Failed":"Song Complete";s.append(y("h3",null,a)),s.append(y("div","sp-muted",this.title));const o=y("div","sp-res-grid"),r=(p,f)=>{const B=y("div","sp-res-item");B.append(y("div","sp-res-value",f),y("div","sp-res-label",p)),o.appendChild(B)};if(r("Accuracy",`${Math.round(e*100)}%`),r("Notes hit",`${this.hits}/${this.hits+this.misses}`),r("Best streak",String(this.bestStreak)),r("Perfect",String(this.perfects)),this.opts.mode==="score"&&r("Score",this.score.toLocaleString()),this.opts.mode==="learn"&&r("Mastery",`${this.progress.mastery}%`),s.appendChild(o),t){const p=y("div",`sp-medal sp-medal--${t}`,`${t.toUpperCase()} MEDAL`);s.appendChild(p)}n&&s.appendChild(y("div","sp-newbest","New high score!"));const c=y("div","sp-res-phrases");let h=null;this.phrases.forEach((p,f)=>{if(p.total===0)return;const B=p.hits/p.total;(!h||B<h.a)&&(h={i:f,a:B});const A=y("div","sp-res-phrase");A.title=`${p.name}: ${Math.round(B*100)}%`;const C=y("div","sp-res-phrase-fill");C.style.height=`${Math.max(6,B*100)}%`,C.style.background=B>=.85?"var(--green)":B>=.5?"var(--yellow)":"var(--red)",A.appendChild(C),c.appendChild(A)}),s.appendChild(c);const l=y("div","sp-card-btns"),d=y("button","sp-btn sp-btn-primary","Play again");if(d.addEventListener("click",()=>this.restart()),l.appendChild(d),h&&h.a<.9){const p=y("button","sp-btn",`Practice "${this.phrases[h.i].name}"`);p.addEventListener("click",()=>{var f;this.stop(),(f=this.onRiffRequest)==null||f.call(this,this.song,h.i,h.i)}),l.appendChild(p)}const u=y("button","sp-btn","Library");u.addEventListener("click",()=>this.exit()),l.appendChild(u),s.appendChild(l),this._showOverlay(s)}static noteFreq(e){return re(e)}}function xe(i){const e=((i==null?void 0:i.label)||"").toLowerCase();return/bluetooth|airpods|buds|hands-?free|\bbt\b|hfp|sco/.test(e)?"bluetooth":/usb|interface|scarlett|focusrite|irig|behringer|presonus|audient|motu|zoom|tascam|roland|boss|steinberg|line in|line-in|instrument|guitar|xlr|ux1|um2|evo|ssl/.test(e)?"usb":/headset|wired|headphone|earphone|earpiece|jack|3\.5|trrs|external/.test(e)?"wired":"builtin"}const ci={usb:"USB audio",wired:"Wired headset",bluetooth:"Bluetooth (adds latency)",builtin:"Built-in mic"};function li(i,e){let t=i.label||`Input ${e+1}`;return t=t.replace(/^Default\s*[-–]\s*/i,"").replace(/^Communications\s*[-–]\s*/i,""),t}class di{constructor(e){this.onDeviceChange=null,this.onChannelMode=null,this.onGainChange=null,this.el=document.createElement("div"),this.el.className="ip-root";const t=document.createElement("span");t.className="sb-label",t.textContent="Input",this.el.appendChild(t);const n=document.createElement("div");n.className="sb-dd ip-dd",this.dd=new $(n,{placeholder:"Microphone…",title:"Audio input"}),this.dd.onChange=c=>{var h;return(h=this.onDeviceChange)==null?void 0:h.call(this,c)},this.el.appendChild(n);const s=document.createElement("div");s.className="sb-dd ip-ch",this.ch=new $(s,{placeholder:"Channel",title:"Input channel"}),this.ch.setItems([{value:"mix",label:"Mix (L+R)"},{value:"left",label:"Left / In 1"},{value:"right",label:"Right / In 2"}]),this.ch.value="mix",this.ch.onChange=c=>{var h;return(h=this.onChannelMode)==null?void 0:h.call(this,c)},this.chWrap=s,this.el.appendChild(s);const a=document.createElement("label");a.className="ip-gain",a.title="Input boost (useful for quiet line/USB inputs)";const o=document.createElement("input");o.type="range",o.min="0.25",o.max="4",o.step="0.05",o.value="1",this.gainInput=o;const r=document.createElement("span");r.textContent="×1.0",o.addEventListener("input",()=>{var c;r.textContent=`×${Number(o.value).toFixed(1)}`,(c=this.onGainChange)==null||c.call(this,Number(o.value))}),a.append(o,r),this.el.appendChild(a),this.meter=document.createElement("div"),this.meter.className="ip-meter",this.meterFill=document.createElement("div"),this.meterFill.className="ip-meter-fill",this.meter.appendChild(this.meterFill),this.el.appendChild(this.meter),this.hint=document.createElement("div"),this.hint.className="ip-hint",this.el.appendChild(this.hint),e.appendChild(this.el)}setDevices(e,t){this._inputs=e;const n=e.map((s,a)=>({value:s.deviceId,label:`${li(s,a)}  ·  ${ci[xe(s)]}`}));this.dd.setItems(n),t&&n.some(s=>s.value===t)&&(this.dd.value=t),this._updateHint(t)}setCurrent(e){this.dd.value=e,this._updateHint(e)}setChannelCount(e){this.chWrap.classList.toggle("hidden",e<2)}setGain(e){this.gainInput.value=String(e),this.gainInput.dispatchEvent(new Event("input"))}_updateHint(e){var s;const t=(s=this._inputs)==null?void 0:s.find(a=>a.deviceId===e),n=t?xe(t):null;this.hint.textContent=n==="bluetooth"?"Bluetooth mics add a lot of delay. Use a wired or USB input for play-along.":n==="usb"?"USB input: pick the channel your instrument is plugged into.":""}updateLevel(e){const t=Math.max(0,Math.min(1,(e+60)/60));this.meterFill.style.width=`${t*100}%`,this.meterFill.classList.toggle("hot",e>-6)}}/*! Capacitor: https://capacitorjs.com/ - MIT License */var ge;(function(i){i.Unimplemented="UNIMPLEMENTED",i.Unavailable="UNAVAILABLE"})(ge||(ge={}));class je extends Error{constructor(e,t,n){super(e),this.message=e,this.code=t,this.data=n}}const hi=i=>{var e,t;return i!=null&&i.androidBridge?"android":!((t=(e=i==null?void 0:i.webkit)===null||e===void 0?void 0:e.messageHandlers)===null||t===void 0)&&t.bridge?"ios":"web"},ui=i=>{const e=i.CapacitorCustomPlatform||null,t=i.Capacitor||{},n=t.Plugins=t.Plugins||{},s=()=>e!==null?e.name:hi(i),a=()=>s()!=="web",o=d=>{const u=h.get(d);return!!(u!=null&&u.platforms.has(s())||r(d))},r=d=>{var u;return(u=t.PluginHeaders)===null||u===void 0?void 0:u.find(p=>p.name===d)},c=d=>i.console.error(d),h=new Map,l=(d,u={})=>{const p=h.get(d);if(p)return console.warn(`Capacitor plugin "${d}" already registered. Cannot register plugins twice.`),p.proxy;const f=s(),B=r(d);let A;const C=async()=>(!A&&f in u?A=typeof u[f]=="function"?A=await u[f]():A=u[f]:e!==null&&!A&&"web"in u&&(A=typeof u.web=="function"?A=await u.web():A=u.web),A),M=(E,S)=>{var v,b;if(B){const T=B==null?void 0:B.methods.find(O=>S===O.name);if(T)return T.rtype==="promise"?O=>t.nativePromise(d,S.toString(),O):(O,m)=>t.nativeCallback(d,S.toString(),O,m);if(E)return(v=E[S])===null||v===void 0?void 0:v.bind(E)}else{if(E)return(b=E[S])===null||b===void 0?void 0:b.bind(E);throw new je(`"${d}" plugin is not implemented on ${f}`,ge.Unimplemented)}},k=E=>{let S;const v=(...b)=>{const T=C().then(O=>{const m=M(O,E);if(m){const _=m(...b);return S=_==null?void 0:_.remove,_}else throw new je(`"${d}.${E}()" is not implemented on ${f}`,ge.Unimplemented)});return E==="addListener"&&(T.remove=async()=>S()),T};return v.toString=()=>`${E.toString()}() { [capacitor code] }`,Object.defineProperty(v,"name",{value:E,writable:!1,configurable:!1}),v},z=k("addListener"),g=k("removeListener"),G=(E,S)=>{const v=z({eventName:E},S),b=async()=>{const O=await v;g({eventName:E,callbackId:O},S)},T=new Promise(O=>v.then(()=>O({remove:b})));return T.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await b()},T},F=new Proxy({},{get(E,S){switch(S){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return B?G:z;case"removeListener":return g;default:return k(S)}}});return n[d]=F,h.set(d,{name:d,proxy:F,platforms:new Set([...Object.keys(u),...B?[f]:[]])}),F};return t.convertFileSrc||(t.convertFileSrc=d=>d),t.getPlatform=s,t.handleError=c,t.isNativePlatform=a,t.isPluginAvailable=o,t.registerPlugin=l,t.Exception=je,t.DEBUG=!!t.DEBUG,t.isLoggingEnabled=!!t.isLoggingEnabled,t},pi=i=>i.Capacitor=ui(i),De=pi(typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{}),Ke=De.registerPlugin;class pt{constructor(){this.listeners={},this.retainedEventArguments={},this.windowListeners={}}addListener(e,t){let n=!1;this.listeners[e]||(this.listeners[e]=[],n=!0),this.listeners[e].push(t);const a=this.windowListeners[e];a&&!a.registered&&this.addWindowListener(a),n&&this.sendRetainedArgumentsForEvent(e);const o=async()=>this.removeListener(e,t);return Promise.resolve({remove:o})}async removeAllListeners(){this.listeners={};for(const e in this.windowListeners)this.removeWindowListener(this.windowListeners[e]);this.windowListeners={}}notifyListeners(e,t,n){const s=this.listeners[e];if(!s){if(n){let a=this.retainedEventArguments[e];a||(a=[]),a.push(t),this.retainedEventArguments[e]=a}return}s.forEach(a=>a(t))}hasListeners(e){var t;return!!(!((t=this.listeners[e])===null||t===void 0)&&t.length)}registerWindowListener(e,t){this.windowListeners[t]={registered:!1,windowEventName:e,pluginEventName:t,handler:n=>{this.notifyListeners(t,n)}}}unimplemented(e="not implemented"){return new De.Exception(e,ge.Unimplemented)}unavailable(e="not available"){return new De.Exception(e,ge.Unavailable)}async removeListener(e,t){const n=this.listeners[e];if(!n)return;const s=n.indexOf(t);s!==-1&&this.listeners[e].splice(s,1),this.listeners[e].length||this.removeWindowListener(this.windowListeners[e])}addWindowListener(e){window.addEventListener(e.windowEventName,e.handler),e.registered=!0}removeWindowListener(e){e&&(window.removeEventListener(e.windowEventName,e.handler),e.registered=!1)}sendRetainedArgumentsForEvent(e){const t=this.retainedEventArguments[e];t&&(delete this.retainedEventArguments[e],t.forEach(n=>{this.notifyListeners(e,n)}))}}const Kt=i=>encodeURIComponent(i).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape),Pt=i=>i.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent);class Ai extends pt{async getCookies(){const e=document.cookie,t={};return e.split(";").forEach(n=>{if(n.length<=0)return;let[s,a]=n.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");s=Pt(s).trim(),a=Pt(a).trim(),t[s]=a}),t}async setCookie(e){try{const t=Kt(e.key),n=Kt(e.value),s=e.expires?`; expires=${e.expires.replace("expires=","")}`:"",a=(e.path||"/").replace("path=",""),o=e.url!=null&&e.url.length>0?`domain=${e.url}`:"";document.cookie=`${t}=${n||""}${s}; path=${a}; ${o};`}catch(t){return Promise.reject(t)}}async deleteCookie(e){try{document.cookie=`${e.key}=; Max-Age=0`}catch(t){return Promise.reject(t)}}async clearCookies(){try{const e=document.cookie.split(";")||[];for(const t of e)document.cookie=t.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(e){return Promise.reject(e)}}async clearAllCookies(){try{await this.clearCookies()}catch(e){return Promise.reject(e)}}}Ke("CapacitorCookies",{web:()=>new Ai});const mi=async i=>new Promise((e,t)=>{const n=new FileReader;n.onload=()=>{const s=n.result;e(s.indexOf(",")>=0?s.split(",")[1]:s)},n.onerror=s=>t(s),n.readAsDataURL(i)}),fi=(i={})=>{const e=Object.keys(i);return Object.keys(i).map(s=>s.toLocaleLowerCase()).reduce((s,a,o)=>(s[a]=i[e[o]],s),{})},gi=(i,e=!0)=>i?Object.entries(i).reduce((n,s)=>{const[a,o]=s;let r,c;return Array.isArray(o)?(c="",o.forEach(h=>{r=e?encodeURIComponent(h):h,c+=`${a}=${r}&`}),c.slice(0,-1)):(r=e?encodeURIComponent(o):o,c=`${a}=${r}`),`${n}&${c}`},"").substr(1):null,Di=(i,e={})=>{const t=Object.assign({method:i.method||"GET",headers:i.headers},e),s=fi(i.headers)["content-type"]||"";if(typeof i.data=="string")t.body=i.data;else if(s.includes("application/x-www-form-urlencoded")){const a=new URLSearchParams;for(const[o,r]of Object.entries(i.data||{}))a.set(o,r);t.body=a.toString()}else if(s.includes("multipart/form-data")||i.data instanceof FormData){const a=new FormData;if(i.data instanceof FormData)i.data.forEach((r,c)=>{a.append(c,r)});else for(const r of Object.keys(i.data))a.append(r,i.data[r]);t.body=a;const o=new Headers(t.headers);o.delete("content-type"),t.headers=o}else(s.includes("application/json")||typeof i.data=="object")&&(t.body=JSON.stringify(i.data));return t};class Bi extends pt{async request(e){const t=Di(e,e.webFetchExtra),n=gi(e.params,e.shouldEncodeUrlParams),s=n?`${e.url}?${n}`:e.url,a=await fetch(s,t),o=a.headers.get("content-type")||"";let{responseType:r="text"}=a.ok?e:{};o.includes("application/json")&&(r="json");let c,h;switch(r){case"arraybuffer":case"blob":h=await a.blob(),c=await mi(h);break;case"json":c=await a.json();break;case"document":case"text":default:c=await a.text()}const l={};return a.headers.forEach((d,u)=>{l[u]=d}),{data:c,headers:l,status:a.status,url:a.url}}async get(e){return this.request(Object.assign(Object.assign({},e),{method:"GET"}))}async post(e){return this.request(Object.assign(Object.assign({},e),{method:"POST"}))}async put(e){return this.request(Object.assign(Object.assign({},e),{method:"PUT"}))}async patch(e){return this.request(Object.assign(Object.assign({},e),{method:"PATCH"}))}async delete(e){return this.request(Object.assign(Object.assign({},e),{method:"DELETE"}))}}const Ei=Ke("CapacitorHttp",{web:()=>new Bi});var Rt;(function(i){i.Dark="DARK",i.Light="LIGHT",i.Default="DEFAULT"})(Rt||(Rt={}));var Xt;(function(i){i.StatusBar="StatusBar",i.NavigationBar="NavigationBar"})(Xt||(Xt={}));class Gi extends pt{async setStyle(){this.unavailable("not available for web")}async setAnimation(){this.unavailable("not available for web")}async show(){this.unavailable("not available for web")}async hide(){this.unavailable("not available for web")}}Ke("SystemBars",{web:()=>new Gi});const bi="modulepreload",Fi=function(i,e){return new URL(i,e).href},$t={},Ci=function(e,t,n){let s=Promise.resolve();if(t&&t.length>0){let o=function(l){return Promise.all(l.map(d=>Promise.resolve(d).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};const r=document.getElementsByTagName("link"),c=document.querySelector("meta[property=csp-nonce]"),h=(c==null?void 0:c.nonce)||(c==null?void 0:c.getAttribute("nonce"));s=o(t.map(l=>{if(l=Fi(l,n),l in $t)return;$t[l]=!0;const d=l.endsWith(".css"),u=d?'[rel="stylesheet"]':"";if(!!n)for(let B=r.length-1;B>=0;B--){const A=r[B];if(A.href===l&&(!d||A.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${l}"]${u}`))return;const f=document.createElement("link");if(f.rel=d?"stylesheet":bi,d||(f.as="script"),f.crossOrigin="",f.href=l,h&&f.setAttribute("nonce",h),document.head.appendChild(f),d)return new Promise((B,A)=>{f.addEventListener("load",B),f.addEventListener("error",()=>A(new Error(`Unable to preload CSS for ${l}`)))})}))}function a(o){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=o,window.dispatchEvent(r),!r.defaultPrevented)throw o}return s.then(o=>{for(const r of o||[])r.status==="rejected"&&a(r.reason);return e().catch(a)})},yi="__capgo_keep_url_path_after_reload",Je="__capgo_history_stack__",Qt=100,vi=typeof window<"u"&&typeof document<"u"&&typeof history<"u";if(vi){const i=window;if(!i.__capgoHistoryPatched){i.__capgoHistoryPatched=!0;const e=()=>{try{if(i.__capgoKeepUrlPathAfterReload)return!0}catch{}try{return window.localStorage.getItem(yi)==="1"}catch{return!1}},t=()=>{try{const g=window.sessionStorage.getItem(Je);if(!g)return{stack:[],index:-1};const G=JSON.parse(g);return!G||!Array.isArray(G.stack)||typeof G.index!="number"?{stack:[],index:-1}:G}catch{return{stack:[],index:-1}}},n=(g,G)=>{try{window.sessionStorage.setItem(Je,JSON.stringify({stack:g,index:G}))}catch{}},s=()=>{try{window.sessionStorage.removeItem(Je)}catch{}},a=g=>{try{const G=g??window.location.href,F=new URL(G instanceof URL?G.toString():G,window.location.href);return`${F.pathname}${F.search}${F.hash}`}catch{return null}},o=(g,G)=>{if(g.length<=Qt)return{stack:g,index:G};const F=g.length-Qt,E=g.slice(F),S=Math.max(0,G-F);return{stack:E,index:S}},r=g=>{document.readyState==="complete"||document.readyState==="interactive"?g():window.addEventListener("DOMContentLoaded",g,{once:!0})};let c=!1,h=!1,l=!1;const d=()=>{if(!c)return;const g=t(),G=a();if(G){if(g.stack.length===0){g.stack.push(G),g.index=0,n(g.stack,g.index);return}(g.index<0||g.index>=g.stack.length)&&(g.index=g.stack.length-1),g.stack[g.index]!==G&&(g.stack[g.index]=G,n(g.stack,g.index))}},u=(g,G)=>{if(!c||h)return;const F=a(g);if(!F)return;let{stack:E,index:S}=t();E.length===0?(E.push(F),S=E.length-1):G?((S<0||S>=E.length)&&(S=E.length-1),E[S]=F):S>=E.length-1?(E.push(F),S=E.length-1):(E=E.slice(0,S+1),E.push(F),S=E.length-1),{stack:E,index:S}=o(E,S),n(E,S)},p=()=>{if(!c||h)return;const g=t();if(g.stack.length===0){d();return}const G=g.index>=0&&g.index<g.stack.length?g.index:g.stack.length-1,F=a();if(g.stack.length===1&&F===g.stack[0])return;const E=g.stack[0];if(!E)return;h=!0;try{history.replaceState(history.state,document.title,E);for(let b=1;b<g.stack.length;b+=1)history.pushState(history.state,document.title,g.stack[b])}catch{h=!1;return}h=!1;const S=g.stack.length-1,v=G-S;v!==0?history.go(v):(history.replaceState(history.state,document.title,g.stack[G]),window.dispatchEvent(new PopStateEvent("popstate")))},f=()=>{!c||l||(l=!0,r(()=>{l=!1,p()}))};let B=null,A=null;const C=()=>{if(!c||h)return;const g=a();if(!g)return;const G=t(),F=G.stack.lastIndexOf(g);F>=0?G.index=F:(G.stack.push(g),G.index=G.stack.length-1);const E=o(G.stack,G.index);n(E.stack,E.index)},M=()=>{B&&A||(B=history.pushState,A=history.replaceState,history.pushState=function(G,F,E){const S=B==null?void 0:B.call(history,G,F,E);return u(E,!1),S},history.replaceState=function(G,F,E){const S=A==null?void 0:A.call(history,G,F,E);return u(E,!0),S},window.addEventListener("popstate",C))},k=()=>{B&&(history.pushState=B,B=null),A&&(history.replaceState=A,A=null),window.removeEventListener("popstate",C)},z=g=>{if(c===g){c&&(d(),f());return}c=g,c?(M(),d(),f()):(k(),s())};window.addEventListener("CapacitorUpdaterKeepUrlPathAfterReload",g=>{var G;const F=g,E=(G=F==null?void 0:F.detail)===null||G===void 0?void 0:G.enabled;typeof E=="boolean"?(i.__capgoKeepUrlPathAfterReload=E,z(E)):(i.__capgoKeepUrlPathAfterReload=!0,z(!0))}),z(e())}}var Ht;(function(i){i[i.UNKNOWN=0]="UNKNOWN",i[i.UPDATE_NOT_AVAILABLE=1]="UPDATE_NOT_AVAILABLE",i[i.UPDATE_AVAILABLE=2]="UPDATE_AVAILABLE",i[i.UPDATE_IN_PROGRESS=3]="UPDATE_IN_PROGRESS"})(Ht||(Ht={}));var qt;(function(i){i[i.UNKNOWN=0]="UNKNOWN",i[i.PENDING=1]="PENDING",i[i.DOWNLOADING=2]="DOWNLOADING",i[i.INSTALLING=3]="INSTALLING",i[i.INSTALLED=4]="INSTALLED",i[i.FAILED=5]="FAILED",i[i.CANCELED=6]="CANCELED",i[i.DOWNLOADED=11]="DOWNLOADED"})(qt||(qt={}));var Wt;(function(i){i[i.OK=0]="OK",i[i.CANCELED=1]="CANCELED",i[i.FAILED=2]="FAILED",i[i.NOT_AVAILABLE=3]="NOT_AVAILABLE",i[i.NOT_ALLOWED=4]="NOT_ALLOWED",i[i.INFO_MISSING=5]="INFO_MISSING"})(Wt||(Wt={}));const oe=Ke("CapacitorUpdater",{web:()=>Ci(()=>import("./web-dDffqe3m.js"),[],import.meta.url).then(i=>new i.CapacitorUpdaterWeb)}),_i="https://github.com/lgkeroack/violin/releases/download/web-latest/update.json",Si=1800*1e3,Te="1.2.0";let Ue=!1,pn=0,Vt=null;function jt(i,e){const t=String(i).split(/[.-]/).map(s=>parseInt(s,10)||0),n=String(e).split(/[.-]/).map(s=>parseInt(s,10)||0);for(let s=0;s<Math.max(t.length,n.length);s++){const a=(t[s]||0)-(n[s]||0);if(a)return a}return 0}async function Mi(){const i=await Ei.get({url:`${_i}?t=${Date.now()}`,headers:{Accept:"application/json","Cache-Control":"no-cache"},responseType:"json"});if(i.status<200||i.status>=300)throw new Error(`manifest HTTP ${i.status}`);return typeof i.data=="string"?JSON.parse(i.data):i.data}async function Jt(i){var e,t;if(!(Ue||Vt)){Ue=!0,pn=Date.now();try{const n=await Mi();if(!(n!=null&&n.version)||!(n!=null&&n.url))return;const s=await oe.current(),a=((e=s.bundle)==null?void 0:e.version)==="builtin"?Te:(t=s.bundle)==null?void 0:t.version;if(jt(n.version,a)<=0)return;if(n.minNative&&jt(s.native,n.minNative)<0){i==null||i({needsApk:!0,version:n.version});return}const{bundles:o}=await oe.list();let r=o.find(c=>c.version===n.version&&c.status!=="error");r||(r=await oe.download({url:n.url,version:n.version,checksum:n.checksum||void 0})),await oe.next({id:r.id}),Vt=r,i==null||i({version:n.version,notes:n.notes||"",apply:()=>oe.set({id:r.id})})}catch(n){console.warn("Live update check failed:",(n==null?void 0:n.message)||n)}finally{Ue=!1}}}async function wi({onReady:i}={}){if(De.isNativePlatform()){try{await oe.notifyAppReady()}catch(e){console.warn("notifyAppReady failed:",(e==null?void 0:e.message)||e)}Jt(i),document.addEventListener("visibilitychange",()=>{!document.hidden&&Date.now()-pn>Si&&Jt(i)})}}async function Ti(){var i,e;if(!De.isNativePlatform())return{bundle:Te,native:"web"};try{const t=await oe.current();return{bundle:((i=t.bundle)==null?void 0:i.version)==="builtin"?Te:(e=t.bundle)==null?void 0:e.version,native:t.native}}catch{return{bundle:Te,native:"?"}}}function Li({notify:i}={}){if(De.isNativePlatform())return;const e=document.getElementById("install-btn");let t=null;if(window.addEventListener("beforeinstallprompt",o=>{o.preventDefault(),t=o,e==null||e.classList.remove("hidden")}),e==null||e.addEventListener("click",async()=>{t&&(t.prompt(),await t.userChoice.catch(()=>{}),t=null,e.classList.add("hidden"))}),window.addEventListener("appinstalled",()=>e==null?void 0:e.classList.add("hidden")),!("serviceWorker"in navigator))return;const n=!!navigator.serviceWorker.controller;let s=!1;navigator.serviceWorker.addEventListener("controllerchange",()=>{s||!n||(s=!0,window.location.reload())});const a=o=>{i==null||i({text:"A new version is ready.",action:"Reload",onAction:()=>o.postMessage("SKIP_WAITING")})};navigator.serviceWorker.register("./sw.js").then(o=>{o.waiting&&navigator.serviceWorker.controller&&a(o.waiting),o.addEventListener("updatefound",()=>{const r=o.installing;r==null||r.addEventListener("statechange",()=>{r.state==="installed"&&navigator.serviceWorker.controller&&a(r)})}),document.addEventListener("visibilitychange",()=>{document.hidden||o.update().catch(()=>{})})}).catch(o=>console.warn("Service worker registration failed:",o))}function An(i){var s;(s=document.querySelector(".app-update"))==null||s.remove();const e=document.createElement("div");e.className="app-update";const t=document.createElement("span");if(i.needsApk)t.textContent=`Version ${i.version} needs a newer app install. Download the latest APK from GitHub.`,e.appendChild(t);else{t.textContent=i.customText||`Update ${i.version} downloaded.`;const a=document.createElement("button");a.textContent=i.actionLabel||"Restart now",a.addEventListener("click",()=>{var o;return(o=i.apply)==null?void 0:o.call(i)}),e.append(t,a)}const n=document.createElement("button");n.className="secondary",n.textContent=i.needsApk?"OK":"Later",n.addEventListener("click",()=>e.remove()),e.appendChild(n),document.body.appendChild(e)}wi({onReady:An});Li({notify:({text:i,action:e,onAction:t})=>An({version:"",customText:i,actionLabel:e,apply:t})});Ti().then(({bundle:i,native:e})=>{const t=document.getElementById("app-version");t&&(t.textContent=e==="web"?`v${i}`:`v${i} · app ${e}`)});const x=new Gn,ee=new bn,ki=new Pn,xi=document.getElementById("pitch-section"),Oi=document.getElementById("tuning-section"),Ii=document.getElementById("scale-section"),zi=document.getElementById("trainer-section"),Ni=document.getElementById("metronome-section"),Ki=document.getElementById("fingerboard-section"),Pi=document.getElementById("mixer-section"),Ri=new Wn(xi),At=new Vn(Oi),it=new is(Ii),se=new as(zi),Y=new rs(Ni),he=new Un(Ki),R=new $n(Pi);At.onTuningChange=i=>{he.setTuning(i),ve.setTuning(i)};const mn=document.getElementById("song-browser-section"),fn=document.getElementById("song-player-section"),ve=new ei(mn),ce=new ri(fn,{getCtx:()=>x.ctx});let fe="workstation",Z=null;async function Xi(){try{"wakeLock"in navigator&&!Z&&(Z=await navigator.wakeLock.request("screen"),Z.addEventListener("release",()=>{Z=null}))}catch{}}function $i(){var i;(i=Z==null?void 0:Z.release)==null||i.call(Z),Z=null}function gn(i){mn.classList.toggle("hidden",i),fn.classList.toggle("hidden",!i),document.body.classList.toggle("playing-song",i)}const U=new di(ve.inputSlot);let V=null,me=new Set;function le(){return x.inputs.keys().next().value}function at(i){const e=document.createElement("div");e.className="app-toast",e.textContent=i,document.body.appendChild(e),setTimeout(()=>e.classList.add("show"),10),setTimeout(()=>{e.classList.remove("show"),setTimeout(()=>e.remove(),400)},3200)}function mt(i){var e,t,n;return((n=(t=(e=i==null?void 0:i.getAudioTracks)==null?void 0:e.call(i)[0])==null?void 0:t.getSettings)==null?void 0:n.call(t).deviceId)||null}async function Oe(i){const e=le();if(e==null)return!1;try{const t=await ee.getInputStream(i);return x.connectInputStream(e,t),de=!0,V=i||mt(t),R.setInputDevice(e,V),U.setCurrent(V),U.setChannelCount(x.getInputChannelCount(e)),ye(),!0}catch(t){return console.warn("Failed to open input:",t.message),at("Could not open that input"),!1}}U.onDeviceChange=i=>{Pe(),Oe(i)};U.onChannelMode=i=>{const e=le();e!=null&&x.setInputChannelMode(e,i)};U.onGainChange=i=>{const e=le();e!=null&&x.setInputGain(e,i)};async function Qi(i){R.updateDevices(i);const e=i.inputs.filter(a=>a.deviceId),t=e.filter(a=>!me.has(a.deviceId)&&a.deviceId!=="default"),n=me.size>0;me=new Set(e.map(a=>a.deviceId)),U.setDevices(e,V);const s=t.find(a=>["usb","wired"].includes(xe(a)));if(n&&s){await Oe(s.deviceId)&&at(`Switched input to ${s.label||"external device"}`);return}V&&!me.has(V)&&await Oe(void 0)&&at("Input unplugged, using the default microphone")}ve.onPlay=(i,e,t)=>{Pe(),gn(!0),Xi(),requestAnimationFrame(()=>ce.start(i,e,t))};ce.onExit=()=>{gn(!1),$i(),ve.updateProgress()};ce.onRiffRequest=(i,e,t)=>{ve.openRiff(i,e,t)};function Dn(i){if(i!==fe){fe==="songplay"&&ce.active&&ce.pause(),fe=i;for(const e of document.querySelectorAll(".app-tab")){const t=e.dataset.tab===i;e.classList.toggle("active",t),e.setAttribute("aria-selected",String(t))}for(const e of document.querySelectorAll("[data-tab-panel]"))e.classList.toggle("hidden",e.dataset.tabPanel!==i);document.body.classList.toggle("tab-songplay",i==="songplay");try{localStorage.setItem("vaw.activeTab",i)}catch{}}}for(const i of document.querySelectorAll(".app-tab"))i.addEventListener("click",()=>Dn(i.dataset.tab));try{localStorage.getItem("vaw.activeTab")==="songplay"&&Dn("songplay")}catch{}it.onScaleChange=i=>he.setScale(i);se.onStart=()=>{const i=it.scaleKey,e=it.rootPitchClass,t=At.currentTuning;if(!i)return;const n=os(t,e,i,{octaves:se.octaves,direction:se.direction});n.length!==0&&(he.clearTrainerState(),se.beginSession(n))};se.onTargetChange=i=>{he.setTrainerTarget(i.stringIndex,i.positionIndex)};se.onHit=i=>{he.markTrainerHit(i.stringIndex,i.positionIndex)};se.onStop=()=>{he.clearTrainerState()};let K=null;Y.onStart=()=>{!K&&x.ctx&&(K=new en(x.ctx),K.onBeat=i=>{Y.flashBeat(i)}),K&&(K.bpm=Y.bpm,K.beatsPerMeasure=Y.beats,K.start())};Y.onStop=()=>{K==null||K.stop()};Y.onBpmChange=i=>{K&&(K.bpm=i)};Y.onTimeSigChange=i=>{K&&(K.beatsPerMeasure=i)};Y.onVolumeChange=i=>{K&&K.setVolume(i)};const ft=new Map,gt=new Map;let Ut=null,Yt=!1;async function Dt(){Yt||(await x.init(),Yt=!0,Ui())}async function Bt(i){await Dt();const e=x.createInput(),t=R.addInputStrip(e,i);if(ft.set(e,new tn(t.meterCanvas)),i)try{const n=await ee.getInputStream(i);x.connectInputStream(e,n)}catch(n){console.warn("Input stream unavailable:",n.message)}return e}function Hi(i){x.inputs.size<=1||(x.removeInput(i),R.removeInputStrip(i),ft.delete(i))}async function qi(i,e){try{const t=await ee.getInputStream(e);x.switchInputDevice(i,t),i===le()&&(V=e,U.setCurrent(e),U.setChannelCount(x.getInputChannelCount(i)))}catch(t){console.error("Failed to switch input device:",t)}}async function Bn(i){try{await Dt();const e=await x.addOutput(i);if(e===-1)return;const t=R.addOutputStrip(e,i);return gt.set(e,new tn(t.meterCanvas)),e}catch(e){console.error("Failed to add output:",e)}}function Wi(i){x.outputs.size<=1||(x.removeOutput(i),R.removeOutputStrip(i),gt.delete(i))}async function Vi(i,e){try{await x.switchOutputDevice(i,e)}catch(t){console.error("Failed to switch output device:",t)}}const ji=new URLSearchParams(location.search).get("debug")==="pitch";let Ae=null;function Ji(i){if(!ji)return;Ae||(Ae=document.createElement("div"),Ae.id="pitch-debug",Ae.style.cssText="position:fixed;bottom:8px;left:8px;z-index:9999;background:rgba(0,0,0,0.75);color:#9fe8a4;font:12px/1.4 monospace;padding:6px 10px;border-radius:4px;white-space:pre;pointer-events:none;",document.body.appendChild(Ae));const e=i.rms>0?20*Math.log10(i.rms):-100;Ae.textContent=`freq:   ${i.freq!=null?i.freq.toFixed(1)+" Hz":"—"}
clarity: ${i.clarity.toFixed(3)}
rms:    ${e.toFixed(1)} dBFS
onsetId: ${i.onsetId}`}function Ui(){if(Ut)return;let i=0;function e(){const t=fe==="workstation",n=fe==="songplay"&&ce.active;if(t){for(const[s,a]of ft){const o=x.getInputLevel(s);a.draw(o.rmsDb,o.peakDb)}for(const[s,a]of gt){const o=x.getOutputLevel(s);a.draw(o.rmsDb,o.peakDb)}}if(fe==="songplay"&&!n&&i%3===0){const s=le();s!=null&&U.updateLevel(x.getInputLevel(s).rmsDb)}if(i++,n||t&&i%2===0){const{data:s,sampleRate:a}=x.getPitchData(),o=ki.update(s,a);t&&(Ri.update(o.freq),At.update(o.freq),he.update(o.freq),se.active&&se.update(o.freq)),n&&ce.update(o.freq),Ji(o)}t&&R.updateLatency(x.getLatency(),x.getBridgeLatency(),x.getLatencyBreakdown()),Ut=requestAnimationFrame(e)}e()}R.onAddInput=()=>Bt();R.onRemoveInput=i=>Hi(i);R.onAddOutput=()=>Bn();R.onRemoveOutput=i=>Wi(i);R.onInputDeviceChange=(i,e)=>qi(i,e);R.onOutputDeviceChange=(i,e)=>Vi(i,e);R.onInputGainChange=(i,e)=>x.setInputGain(i,e);R.onOutputGainChange=(i,e)=>x.setOutputGain(i,e);R.onInputMuteToggle=i=>{const e=x.toggleInputMute(i);R.setInputMuted(i,e)};R.onOutputMuteToggle=i=>{const e=x.toggleOutputMute(i);R.setOutputMuted(i,e)};R.onBufferSizeChange=async i=>{const e=K==null?void 0:K._playing;K&&(K.stop(),K=null);const t=await x.reinitWithBufferSize(i);t&&(K=new en(t),K.onBeat=n=>{Y.flashBeat(n)},e&&(K.bpm=Y.bpm,K.beatsPerMeasure=Y.beats,K.start()))};var Zt;const Yi=((Zt=window.matchMedia)==null?void 0:Zt.call(window,"(pointer: coarse)").matches)??!1,Ie=document.getElementById("mic-btn");let de=!1;function Pe(){x.ctx&&x.ctx.state!=="running"&&x.ctx.resume().catch(()=>{}),ye()}for(const i of["pointerdown","touchend","keydown"])window.addEventListener(i,Pe,{passive:!0});function ye(){const i=x.ctx&&x.ctx.state!=="running",e=!de||i;Ie.classList.toggle("hidden",!e),Ie.textContent=de?"Tap to start audio":"Enable microphone"}Ie.addEventListener("click",async()=>{Pe(),de||await En(),ye()});async function En(){try{const i=await ee.getInputStream();let e=x.inputs.keys().next().value;e==null&&(e=await Bt()),x.connectInputStream(e,i),de=!0,V=mt(i);try{const t=await ee.enumerate();R.updateDevices(t),me=new Set(t.inputs.map(n=>n.deviceId).filter(Boolean)),U.setDevices(t.inputs.filter(n=>n.deviceId),V),R.setInputDevice(e,V)}catch{}}catch(i){console.warn("Microphone unavailable:",i.message),Ie.textContent="Microphone blocked: check permissions"}}async function Zi(){var o,r;await Dt();let i={inputs:[],outputs:[]};try{await ee.requestPermission(),i=await ee.enumerate()}catch(c){console.warn("Mic permission denied or unavailable:",c.message);try{i=await ee.enumerate()}catch{}}R.updateDevices(i),ee.listenForChanges(),ee.onDevicesChanged=c=>Qi(c),me=new Set(i.inputs.map(c=>c.deviceId).filter(Boolean));const e=i.inputs.length>0?i.inputs[0].deviceId:void 0,t=i.outputs.length>0?i.outputs[0].deviceId:void 0;await Bt(e),de=[...x.inputs.values()].some(c=>c.stream),!de&&i.inputs.length>0&&await En();const n=x.inputs.get(le());V=mt(n==null?void 0:n.stream)||e||null;const s=i.inputs.find(c=>["usb","wired"].includes(xe(c)));s&&s.deviceId!==V&&await Oe(s.deviceId),U.setDevices(i.inputs.filter(c=>c.deviceId),V),U.setChannelCount(x.getInputChannelCount(le()));const a=await Bn(t);if(Yi&&a!=null&&a!==-1){const c=x.toggleOutputMute(a);R.setOutputMuted(a,c)}ye(),(r=(o=x.ctx)==null?void 0:o.addEventListener)==null||r.call(o,"statechange",ye)}Zi();export{Ht as A,pt as W};
