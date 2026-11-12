import * as THREE from 'three';
import {TAU,clockText} from './mechanism.js';
import {registerStudyTool} from './webmcp.js';
export function createExperience(stage,engine){
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const {scene,camera,controls,renderer}=stage;
const state={theta:0,rpm:1,speed:1,paused:reduced,mode:'ghost',focus:'all',selected:null,hovered:null,exploded:false,explode:0,reveal:1,section:0,camera:'hero',tour:-1,tourTime:0,auto:true};
const exterior=new Set(['case','dial','bridge']);
const highlight=new THREE.Color(0xd8b17a),sectionPlane=new THREE.Plane(new THREE.Vector3(-1,0,0),0);
let lastTime=performance.now(),transition=null,dragStart=null,lastReadout=0,frames=0,frameElapsed=0;
const presets=[
 {id:'hero',name:'立体全景',position:[6,3.5,23],target:[0,0,0],caption:'发条储存能量，摆轮划分时间。'},
 {id:'front',name:'正面表盘',position:[0,0,24],target:[0,0,0],caption:'将微小的机械运动，变成可读的时间。'},
 {id:'core',name:'传动轮系',position:[3,2,13],target:[.3,-.2,.6],caption:'中心轮、三轮、四轮：逐级传递发条的动力。'},
 {id:'bank',name:'摆轮特写',position:[-4,-3,10],target:[-1.2,-2,1],caption:'2.5 Hz 的往返振荡，每秒产生五个节拍。'},
 {id:'cutaway',name:'机芯半剖',position:[8,4,20],target:[0,0,0],caption:'剖开一半表壳，观察内部的层级。'},
 {id:'exploded',name:'爆炸拆解',position:[15,5,29],target:[0,0,2.5],caption:'底板、轮系、夹板、表盘和指针，沿轴向分离。'},
 {id:'technical',name:'机芯背面',position:[-5,3,-23],target:[0,0,0],caption:'从表底观察底板与表壳的结构。'}
];
function fitFactor(){return camera.aspect<.85?1.85:camera.aspect<1.05?1.56:camera.aspect<1.35?1.28:1;}
function cameraGoal(p){const t=new THREE.Vector3(...p.target),v=new THREE.Vector3(...p.position).sub(t).multiplyScalar(fitFactor()).add(t);if(camera.aspect<.85&&(state.tour>=0||!$('#info').hidden)){t.y+=2.7;v.y+=2.7;v.sub(t).multiplyScalar(1.12).add(t);}return {v,t};}
function setCamera(id,instant=false){
  const p=presets.find(p=>p.id===id)||presets[0],{v,t}=cameraGoal(p);state.camera=p.id;
  scene.fog.density=.012/fitFactor();
  $('#camera-name').textContent=p.name;$('#camera-number').textContent=String(presets.indexOf(p)+1).padStart(2,'0');$('#view-caption').textContent=p.caption;
  $$('#camera-menu button').forEach(b=>b.classList.toggle('active',b.dataset.camera===p.id));
  if(instant||reduced){camera.position.copy(v);controls.target.copy(t);camera.lookAt(t);controls.update();transition=null;}
  else transition={from:camera.position.clone(),to:v,targetFrom:controls.target.clone(),targetTo:t,t:0,duration:2};
  controls.autoRotate=false;closeMenus();
}
function chooseCamera(id){
  stopTour();clearSelection();state.focus='all';state.exploded=id==='exploded';
  if(id==='core'){state.mode='ghost';state.focus='train';}
  else if(id==='bank'){state.mode='ghost';state.focus='balance';}
  else if(id==='cutaway')state.mode='section';
  else if(id==='hero'||id==='front'||id==='exploded')state.mode='solid';
  setCamera(id);syncUI();
}
$('#camera-menu').innerHTML=presets.map((p,i)=>`<button data-camera="${p.id}">${p.name}<span>${String(i+1).padStart(2,'0')}</span></button>`).join('');
$$('#camera-menu button').forEach(b=>b.onclick=()=>chooseCamera(b.dataset.camera));
function closeMenus(){for(const name of ['camera','focus']){$(`#${name}-menu`).hidden=true;$(`#${name}-trigger`).setAttribute('aria-expanded','false');}}
for(const name of ['camera','focus'])$(`#${name}-trigger`).onclick=e=>{e.stopPropagation();const open=$(`#${name}-menu`).hidden;closeMenus();$(`#${name}-menu`).hidden=!open;$(`#${name}-trigger`).setAttribute('aria-expanded',String(open));};
document.addEventListener('click',e=>{if(!e.target.closest('.popover'))closeMenus();});
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){closeMenus();clearSelection();stopTour();}
  if(e.code==='Space'&&!['INPUT','BUTTON','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();togglePlay();}
  if(e.code==='ArrowRight'&&state.tour>=0&&!e.target.closest('input'))tourStep(Math.min(4,state.tour+1));
});
function syncUI(){
  $$('#camera-menu button').forEach(b=>b.classList.toggle('active',b.dataset.camera===state.camera));
  $$('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',b.dataset.mode===state.mode);});
  $('#explode').setAttribute('aria-pressed',state.exploded);$('#focus-trigger').classList.toggle('active',state.focus!=='all');
  $$('[data-focus]').forEach(b=>b.classList.toggle('active',b.dataset.focus===state.focus));
  $('#play').setAttribute('aria-label',state.exploded?'Reassemble and play':state.paused?'运转腕表':'暂停腕表');
  $('#play').innerHTML=state.paused||state.exploded?'<svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6Z" fill="currentColor" stroke="none"/></svg>':'<svg viewBox="0 0 20 20"><path d="M6 5v10M14 5v10"/></svg>';
  $('#rpm').value=state.rpm;$('#rpm-value').innerHTML=`${Number(state.rpm.toFixed(1))} <span>×</span>`;
  $('#phase-study').hidden=true;$('#section-key').hidden=state.mode!=='section';
  $('#guided').setAttribute('aria-label',state.tour>=0?'Restart guided discovery':'Discover the mechanism');
  const mode=state.exploded?'ASSEMBLY STUDY':state.paused?'PAUSED':state.rpm<1?'SLOW STUDY':'RUNNING';
  $('#running-status').innerHTML=`${mode} <i></i> REAL-TIME MECHANISM`;
}
function togglePlay(){if(state.exploded){state.exploded=false;state.paused=false;state.mode='ghost';setCamera('cutaway');}else state.paused=!state.paused;syncUI();}
$('#play').onclick=togglePlay;
$('#rpm').oninput=e=>{state.rpm=Number(e.target.value);syncUI();};
$$('[data-mode]').forEach(b=>b.onclick=()=>{stopTour();state.mode=b.dataset.mode;state.focus='all';clearSelection();syncUI();});
$('#explode').onclick=()=>{stopTour();state.exploded=!state.exploded;state.focus='all';state.mode='solid';clearSelection();setCamera(state.exploded?'exploded':'hero');syncUI();};
function focus(which){
 stopTour();clearSelection();state.focus=which;state.exploded=false;state.mode=which==='hands'?'solid':'ghost';
 setCamera(which==='balance'?'bank':which==='train'||which==='escape'?'core':'front');
 if(which!=='all'){state.selected=engine.parts.find(p=>p.kind===which);if(state.selected)showInfo(state.selected);}
 syncUI();closeMenus();
}
$$('[data-focus]').forEach(b=>b.onclick=()=>focus(b.dataset.focus));
$('#reset').onclick=()=>{stopTour();clearSelection();state.mode='solid';state.focus='all';state.exploded=false;state.paused=reduced;state.rpm=1;state.auto=!reduced;state.theta=0;setCamera('hero');syncUI();};
function clearSelection(){const hadInfo=!$('#info').hidden;if(state.focus==='selected')state.focus='all';state.selected=null;$('#info').hidden=true;if(hadInfo&&camera.aspect<.85)setCamera(state.camera);}
$('#close-info').onclick=()=>{clearSelection();syncUI();};
const descriptions={
 case:'金属表壳保护机芯。表冠是手动上链与校时的操作入口；本模型展示运转原理，不模拟上链操作。',
 strap:'表耳连接皮质表带与表壳。表带、缝线与表冠保留独立的部件选择。',
 plate:'底板支承各根轮轴；轴承需要保持精确的位置关系。表面圆纹是简化的打磨装饰。',
 barrel:'盘绕的发条储存上链时输入的能量。缓慢舒展时，它通过发条盒驱动后面的传动轮系。',
 train:'中心轮每小时一圈，经三轮传递到每分钟一圈的四轮。演示齿数比为 80/10 与 60/8，转速来自同一个模拟时间。',
 escape:'擒纵轮被叉瓦交替锁止与释放。本模型每秒推进五个半齿节拍，擒纵叉的接触轨迹作教学简化。',
 balance:'摆轮与游丝构成振荡系统。参考振频为 2.5 Hz，即每小时 18,000 次半振动；游丝形状为示意。',
 winding:'上链传动将表冠的输入送至发条。这里展示棘轮与上链轮的外形，它们不随走时轮系连续旋转。',
 bridge:'夹板固定轮轴上端；红色宝石轴承用于降低摩擦。本模型将夹板镂空，方便观察轮系。',
 dial:'表盘把旋转角度转化成小时和分钟刻度。透视模式会淡出表盘，保留机芯的空间位置。',
 chapter:'外圈共有六十个分钟刻度，每五格设置一个加长刻度。',
 hands:'时针十二小时一圈、分针一小时一圈，小秒针一分钟一圈。速度滑块改变演示倍率，不改变齿轮传动比。'
};
function showInfo(p){$('#tour').hidden=true;$('#info').hidden=false;$('#info-kicker').textContent='MECHANICAL WATCH · COMPONENT STUDY';$('#info-title').textContent=p.name;$('#info-description').textContent=descriptions[p.kind]||'机械腕表组件';$('#part-readout').textContent='';$('#study-part').hidden=false;if(camera.aspect<.85)setCamera(state.camera);}
$('#study-part').onclick=()=>{if(!state.selected)return;state.focus='selected';state.mode=['dial','hands'].includes(state.selected.kind)?'solid':'ghost';state.exploded=false;syncUI();};
$('#about').onclick=()=>{stopTour();state.selected=null;$('#info').hidden=false;$('#info-kicker').textContent='BASED ON CONCEPTUAL X-16';$('#info-title').textContent='时间的机械结构';$('#info-description').textContent='此版本直接改造 iamtechartist / Conceptual-X-16 开源项目，沿用原页面、材质、灯光和交互控制。腕表为教学示意模型，参考 2.5 Hz 机械机芯，不是可用于制造的精确机芯。轮齿、叉瓦与游丝作简化。';$('#part-readout').textContent='原项目 MIT · Three.js r185';$('#study-part').hidden=true;};
const tour=[
 {title:'一枚腕表的内部。',text:'从完整表盘开始。每一格刻度背后，都是缓慢释放的机械能。',camera:'front',mode:'solid',focus:'all',rpm:1,duration:10},
 {title:'能量，藏在发条中。',text:'表盘淡出，发条盒显露。上链将能量储存在卷紧的发条中，随后缓慢释放。',camera:'front',mode:'ghost',focus:'barrel',rpm:1,duration:12},
 {title:'沿着轮系前进。',text:'大轮推动下一根轴的小齿轮，逐级提高转速。中心轮每小时一圈，四轮每分钟一圈。',camera:'core',mode:'ghost',focus:'train',rpm:20,duration:13},
 {title:'时间的心跳。',text:'摆轮每秒往返 2.5 次。擒纵叉交替锁止与释放，把连续动力划分成节拍。慢动作下更容易观察。',camera:'bank',mode:'ghost',focus:'balance',rpm:.2,duration:15},
 {title:'再成为完整的一枚表。',text:'所有部件共同工作，驱动指针。拖动旋转，点击部件，或使用爆炸拆解观察装配顺序。',camera:'hero',mode:'solid',focus:'all',rpm:1,duration:12}
];
$('#tour-progress').innerHTML=tour.map((_,i)=>`<button aria-label="Go to discovery step ${i+1}" data-step="${i}"></button>`).join('');
$$('[data-step]').forEach(b=>b.onclick=()=>tourStep(Number(b.dataset.step)));
function tourStep(i){
  const step=tour[i];state.tour=i;state.tourTime=0;state.mode=step.mode;state.focus=step.focus;state.rpm=step.rpm;state.exploded=false;state.paused=false;clearSelection();document.body.classList.add('is-touring');$('#tour').hidden=false;
  $('#tour-step').textContent=`DISCOVERY ${String(i+1).padStart(2,'0')} / 05`;$('#tour-title').textContent=step.title;$('#tour-description').textContent=step.text;$('#tour-next').textContent=i===4?'Explore freely ↗':'Continue →';$('#tour-back').disabled=i===0;$$('[data-step]').forEach(b=>b.classList.toggle('active',Number(b.dataset.step)===i));setCamera(step.camera);syncUI();
}
function stopTour(){const hadTour=state.tour>=0;state.tour=-1;state.tourTime=0;$('#tour').hidden=true;document.body.classList.remove('is-touring');$('#phase-study').hidden=true;if(hadTour&&camera.aspect<.85)setCamera(state.camera);}
$('#guided').onclick=()=>tourStep(0);$('#close-tour').onclick=()=>{stopTour();syncUI();};
$('#tour-next').onclick=()=>state.tour===4?stopTour():tourStep(state.tour+1);$('#tour-back').onclick=()=>tourStep(Math.max(0,state.tour-1));
const labelElements=engine.anchors.map((a,i)=>{const el=document.createElement('div');el.className='bank-label';el.innerHTML=`<b>0${i+1}</b><span>${a.name}</span>`;$('#bank-labels').appendChild(el);return el;});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),world=new THREE.Vector3();
let lastPointer={x:0,y:0},pointerDirty=false,pointerInside=false;
const canvas=renderer.domElement;canvas.setAttribute('aria-label','拖动旋转机械腕表');canvas.tabIndex=0;
canvas.addEventListener('pointerdown',e=>{dragStart=[e.clientX,e.clientY];});
canvas.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY};pointerDirty=true;pointerInside=e.pointerType!=='touch';});
canvas.addEventListener('pointerleave',()=>{pointerInside=false;state.hovered=null;$('#hover-label').hidden=true;canvas.style.cursor='grab';});
function hit(x,y){
  pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
  return raycaster.intersectObjects(engine.pickables,false).find(h=>{const p=h.object.userData.part;if(p.kind==='fire'||p.opacity<.26||!p.group.visible)return false;if(state.section>.5&&exterior.has(p.kind)&&h.point.x>0)return false;return true;})?.object.userData.part;
}
canvas.addEventListener('pointerup',e=>{if(dragStart&&Math.hypot(e.clientX-dragStart[0],e.clientY-dragStart[1])<5){const p=hit(e.clientX,e.clientY);if(p){stopTour();state.selected=p;showInfo(p);}else clearSelection();}dragStart=null;});
controls.addEventListener('start',()=>{transition=null;controls.autoRotate=false;state.auto=false;});
function focusWeight(p){
 if(state.focus==='all')return 1;
 if(state.focus==='selected')return p===state.selected?1:0;
 if(state.focus==='balance'&&p.kind==='escape')return .6;
 return p.kind===state.focus?1:0;
}
function updateMaterials(dt){
  for(const p of engine.parts){
    let opacity=1;const w=focusWeight(p),isExterior=exterior.has(p.kind);
    if(isExterior){const ghost=p.kind==='case'?.5:p.kind==='bridge'?.15:.018;opacity=THREE.MathUtils.lerp(1,ghost,state.reveal);}
    if(state.focus!=='all'&&w<1)opacity*=THREE.MathUtils.lerp(.045,1,w);
    p.opacity=THREE.MathUtils.damp(p.opacity,opacity,7,dt);p.group.visible=p.opacity>.012;
    const emphasis=state.selected===p?.68:state.hovered===p?.45:state.focus==='train'&&p.kind==='train'?.38:state.focus!=='all'&&w===1&&!isExterior?.17:0;
    p.emphasis=THREE.MathUtils.damp(p.emphasis||0,emphasis,9,dt);
    for(const m of p.materials){
      const translucent=p.opacity<.995;if(m.transparent!==translucent){m.transparent=translucent;m.needsUpdate=true;}m.opacity=p.opacity;m.depthWrite=!translucent;
      if(m.userData.baseColor)m.color.copy(m.userData.baseColor).lerp(highlight,p.emphasis);
      if(m.emissive){m.emissive.copy(highlight);m.emissiveIntensity=p.emphasis*.085;}
      const clipped=state.section>.02&&isExterior&&state.explode<.02;
      if(Boolean(m.clippingPlanes?.length)!==clipped){m.clippingPlanes=clipped?[sectionPlane]:null;m.clipShadows=clipped;m.needsUpdate=true;}
    }
    p.meshes.forEach(m=>m.castShadow=p.opacity>.9);
  }
}
function updateLabels(){
 const visible=state.camera==='front'||state.explode>.1||state.mode==='ghost';
 engine.root.updateMatrixWorld(true);
 engine.anchors.forEach((a,i)=>{world.set(...a.position).applyMatrix4(a.part.group.matrixWorld).project(camera);const el=labelElements[i],x=(world.x*.5+.5)*innerWidth,y=(-world.y*.5+.5)*innerHeight;el.style.left=`${x+12}px`;el.style.top=`${y}px`;el.style.opacity=visible&&focusWeight(a.part)>.5&&x>20&&x<innerWidth-105&&y>135&&y<innerHeight-220?'1':'0';});
}
function updateReadouts(){if(state.selected)$('#part-readout').innerHTML=`<span>模拟时间 ${clockText(state.theta)}</span><span>${state.rpm}×</span>`;}
window.addEventListener('resize',()=>setCamera(state.camera,true));document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error h2').textContent='The graphics session was interrupted';$('#error p').textContent='Reload the exhibit to restore the mechanism.';$('#error').hidden=false;});
function frame(now){
  requestAnimationFrame(frame);const rawDt=Math.max((now-lastTime)/1000,0),dt=Math.min(rawDt,.05);lastTime=now;if(document.hidden)return;
  state.speed=THREE.MathUtils.damp(state.speed,state.paused?0:state.rpm,5,dt);
  const explodeTarget=state.exploded?1:state.tour>=0?(tour[state.tour].spread||0):0;
  state.explode=THREE.MathUtils.damp(state.explode,explodeTarget,2.5,dt);if(explodeTarget===0&&state.explode<.006)state.explode=0;
  const allowMotion=state.explode===0&&explodeTarget===0;if(state.paused&&state.speed<.02)state.speed=0;
  if(allowMotion&&!state.paused)state.theta+=state.speed*dt;
  state.reveal=THREE.MathUtils.damp(state.reveal,state.mode==='ghost'?1:0,3.2,dt);state.section=THREE.MathUtils.damp(state.section,state.mode==='section'?1:0,4,dt);sectionPlane.constant=THREE.MathUtils.lerp(5,0,state.section);
  engine.update(state.theta,state.explode);
  stage.stand.visible=false;stage.pedestal.position.y=-1.4-state.explode*1.5;stage.dust.rotation.y=now*.000001;updateMaterials(dt);
  if(transition){transition.t+=dt;const t=Math.min(transition.t/transition.duration,1),s=t*t*t*(t*(t*6-15)+10);camera.position.lerpVectors(transition.from,transition.to,s);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,s);if(t===1)transition=null;}
  controls.autoRotate=state.auto&&!reduced&&!transition&&state.tour<0&&state.camera==='hero';controls.autoRotateSpeed=.12;controls.update(dt);updateLabels();
  if(pointerDirty&&pointerInside&&!dragStart){state.hovered=hit(lastPointer.x,lastPointer.y);$('#hover-label').hidden=!state.hovered;if(state.hovered){$('#hover-label').textContent=state.hovered.name;$('#hover-label').style.left=`${Math.min(lastPointer.x+17,innerWidth-225)}px`;$('#hover-label').style.top=`${lastPointer.y-34}px`;}canvas.style.cursor=state.hovered?'pointer':'grab';pointerDirty=false;}
  if(state.tour>=0&&!reduced){state.tourTime+=dt;if(state.tourTime>tour[state.tour].duration){if(state.tour<4)tourStep(state.tour+1);else stopTour();}}
  if(now-lastReadout>65){updateReadouts();lastReadout=now;}
  renderer.render(scene,camera);frames++;frameElapsed+=rawDt;
  if(frameElapsed>1){$('#viewport').dataset.renderState=JSON.stringify({revision:THREE.REVISION,mode:state.mode,focus:state.focus,exploded:state.exploded,spread:Number(state.explode.toFixed(4)),paused:state.paused,rpm:state.rpm,theta:Number(state.theta.toFixed(5)),camera:state.camera,tour:state.tour,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fps:Math.round(frames/frameElapsed),parts:engine.parts.length});frames=0;frameElapsed=0;}
}
setCamera('hero',true);state.auto=!reduced;syncUI();renderer.render(scene,camera);$('#loading').style.opacity=0;setTimeout(()=>$('#loading').hidden=true,750);requestAnimationFrame(frame);
registerStudyTool({state,presets,chooseCamera,focus,syncUI});
window.watchStudy={state,engine,stage,chooseCamera,focus};
}
