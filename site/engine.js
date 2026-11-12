import * as THREE from 'three';
import {solve} from './mechanism.js';
import {makeMaterials} from './materials.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const Y=new THREE.Vector3(0,1,0),Z=new THREE.Vector3(0,0,1);
const roundedCache=new Map();
function rounded(w,h,d,r=.1){
  const key=[w,h,d,r].join();if(roundedCache.has(key))return roundedCache.get(key);
  const x=-w/2,y=-h/2,s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:d-.06,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.03,bevelThickness:.03,curveSegments:5});g.translate(0,0,-d/2+.03);roundedCache.set(key,g);return g;
}
export function createEngine(){
  const root=new THREE.Group(),mat=makeMaterials(),parts=[],pickables=[],moving=[];
  const geo={cyl:new THREE.CylinderGeometry(1,1,1,40),bolt:new THREE.CylinderGeometry(1,1,1,6),ring:new THREE.TorusGeometry(1,.045,8,40),sphere:new THREE.SphereGeometry(1,16,12)};
  function part(name,kind,bank=-1,cylinder=-1){
    const group=new THREE.Group();group.userData={name,kind,bank,cylinder};root.add(group);
    const p={group,name,kind,bank,cylinder,meshes:[],opacity:1};parts.push(p);return p;
  }
  function mesh(p,g,m,pos=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;o.userData.part=p;p.group.add(o);p.meshes.push(o);pickables.push(o);return o;}
  function box(p,w,h,d,pos,m=mat.cast,r=.1){return mesh(p,rounded(w,h,d,r),m,pos);}
  function cyl(p,r,h,pos,m=mat.steel,axis='y',segments=40){const o=mesh(p,segments===6?geo.bolt:geo.cyl,m,pos);o.scale.set(r,h,r);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o;}
  function torus(p,r,t,pos,m=mat.steel,axis='z',arc=Math.PI*2){const o=mesh(p,new THREE.TorusGeometry(r,t,8,40,arc),m,pos);if(axis==='y')o.rotation.x=Math.PI/2;return o;}
  function tube(p,points,r,m){const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));return mesh(p,new THREE.TubeGeometry(curve,32,r,10,false),m);}
  function bolt(p,pos,axis='y',r=.075){cyl(p,r,.065,pos,mat.steel,axis,6);}
  function engraving(p,text,pos,width,height){
    if(typeof document==='undefined')return;
    const canvas=document.createElement('canvas');canvas.height=128;const c=canvas.getContext('2d');c.font='80px Georgia';canvas.width=Math.ceil(c.measureText(text).width+24);c.fillStyle='#d5b78a';c.textAlign='center';c.textBaseline='middle';c.font='80px Georgia';c.fillText(text,canvas.width/2,64);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.15,color:0xffffff,depthWrite:false});mesh(p,new THREE.PlaneGeometry(width,height),m,pos);
  }

  // Watch geometry uses the same semantic part registry as the X-16 engine.
  const TAU=Math.PI*2;
  const jewelMaterial=new THREE.MeshStandardMaterial({color:0x9e234c,metalness:.25,roughness:.2});
  const blued=new THREE.MeshStandardMaterial({color:0x183c62,metalness:.85,roughness:.28});
  function ring(p,outer,inner,depth,pos,m=mat.steel){
    const s=new THREE.Shape();s.absarc(0,0,outer,0,TAU);const hole=new THREE.Path();hole.absarc(0,0,inner,0,TAU,true);s.holes.push(hole);
    const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:2,curveSegments:72});return mesh(p,g,m,pos);
  }
  function screw(p,x,y,z){cyl(p,.085,.045,[x,y,z],blued,'z');box(p,.12,.015,.012,[x,y,z+.029],mat.steel,.005);}
  function jewel(p,x,y,z){ring(p,.12,.066,.035,[x,y,z],mat.brass);cyl(p,.065,.04,[x,y,z+.02],jewelMaterial,'z');cyl(p,.022,.065,[x,y,z+.035],mat.steel,'z');}
  function spiral(p,r,turns,z,m){const pts=[];for(let i=0;i<=260;i++){const f=i/260,a=f*turns*TAU,rr=.1+(r-.1)*f;pts.push(new THREE.Vector3(rr*Math.cos(a),rr*Math.sin(a),z));}mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),520,.014,6,false),m);}
  function gear(name,kind,x,y,z,r,teeth,key,layer,pinion=0,pinionTeeth=10){
    const p=part(name,kind);p.origin=[x,y,z];p.layer=layer;p.motion=key;
    const s=new THREE.Shape();for(let i=0;i<teeth*4;i++){const a=i/(teeth*4)*TAU,rr=r+([1,2].includes(i%4)?.035:-.04);i?s.lineTo(rr*Math.cos(a),rr*Math.sin(a)):s.moveTo(rr*Math.cos(a),rr*Math.sin(a));}s.closePath();const hole=new THREE.Path();hole.absarc(0,0,r*.72,0,TAU,true);s.holes.push(hole);
    mesh(p,new THREE.ExtrudeGeometry(s,{depth:.065,bevelEnabled:false,curveSegments:48}),kind==='escape'?mat.steel:mat.brass);
    cyl(p,r*.18,.09,[0,0,.035],mat.brass,'z');
    for(let i=0;i<5;i++){const a=i*TAU/5,o=box(p,r*.8,r*.08,.065,[Math.cos(a)*r*.43,Math.sin(a)*r*.43,.033],mat.brass,.02);o.rotation.z=a;}
    cyl(p,.035,.5,[0,0,.06],mat.steel,'z');
    if(pinion){cyl(p,pinion,.22,[0,0,-.08],mat.steel,'z');for(let i=0;i<pinionTeeth;i++){const a=i*TAU/pinionTeeth;const o=box(p,.045,.055,.22,[pinion*Math.cos(a),pinion*Math.sin(a),-.08],mat.steel,.008);o.rotation.z=a;}}
    moving.push(p);return p;
  }
  const body=part('表壳与表冠','case');body.layer=0;
  ring(body,3.57,3.24,.58,[0,0,-.48],mat.cast);ring(body,3.64,3.44,.09,[0,0,.15],mat.steel);ring(body,3.5,3.37,.06,[0,0,.25],mat.brass);ring(body,3.58,3.35,.09,[0,0,-.57],mat.steel);
  cyl(body,.24,.5,[3.75,0,-.1],mat.steel,'x');cyl(body,.33,.26,[4.02,0,-.1],mat.brass,'x');
  for(let i=0;i<24;i++){const a=i*TAU/24;box(body,.28,.035,.035,[4.02,.33*Math.sin(a),-.1+.33*Math.cos(a)],mat.steel,.009);}
  const strap=part('皮质表带与表耳','strap');strap.layer=0;
  for(const sign of [-1,1]){
    box(strap,2.25,2.6,.22,[0,sign*4.65,-.12],mat.black,.3);
    for(const x of [-1.3,1.3])box(strap,.32,1.4,.45,[x,sign*3.43,-.12],mat.steel,.13);
    for(let i=0;i<16;i++)for(const x of [-.96,.96])box(strap,.015,.075,.012,[x,sign*(3.5+i*.15),.002],mat.brass,.005);
    for(let i=0;i<12;i++)box(strap,1.8,.012,.009,[0,sign*(3.6+i*.18),.002],mat.cover,.004);
  }
  const base=part('机芯底板','plate');base.layer=0;
  cyl(base,3.22,.12,[0,0,-.39],mat.cover,'z');
  for(let j=0;j<4;j++){const r=.8+j*.62;for(let i=0;i<12+j*7;i++){const a=i*TAU/(12+j*7);torus(base,.13,.006,[r*Math.cos(a),r*Math.sin(a),-.32],mat.edge);}}
  for(let i=0;i<8;i++){const a=i*TAU/8+.2;screw(body,3.5*Math.cos(a),3.5*Math.sin(a),.29);}
  const barrel=gear('发条盒 · 储能','barrel',-1.4175,0,-.12,1.26,80,'barrel',1);
  cyl(barrel,.98,.06,[0,0,.11],mat.dark,'z');ring(barrel,1.04,.98,.1,[0,0,.09],mat.brass);spiral(barrel,.94,6,.18,mat.brass);jewel(barrel,0,0,.24);
  const center=gear('中心轮 · 每小时一圈','train',0,0,.12,1.44,80,'center',2,.1575);
  const third=gear('三轮 · 传递动力','train',1.62,0,.36,1.08,60,'third',2,.18);
  const fourth=gear('四轮 · 每分钟一圈','train',1.62,-1.224,.6,.96,60,'fourth',2,.144,8);
  const escape=gear('擒纵轮 · 逐拍释放','escape',.66,-1.664,.84,.558,15,'escape',3,.096,6);
  const fork=part('擒纵叉 · 锁止与释放','escape');fork.origin=[-.08,-1.95,1];fork.layer=3;fork.motion='fork';moving.push(fork);
  const forkBar=box(fork,.86,.075,.06,[0,0,0],mat.steel,.015);forkBar.rotation.z=.3;
  for(const [x,y,a] of [[.31,.22,1.25],[.4,-.09,-.65]]){const o=box(fork,.4,.07,.06,[x,y,0],mat.steel,.015);o.rotation.z=a;cyl(fork,.05,.08,[x+.14,y+(y>0?.16:-.13),.01],jewelMaterial,'z');}jewel(fork,0,0,.07);
  const balance=part('摆轮 · 2.5 Hz','balance');balance.origin=[-1.23,-2.25,.94];balance.layer=3;balance.motion='balance';moving.push(balance);
  ring(balance,.81,.71,.07,[0,0,0],mat.brass);for(let i=0;i<3;i++){const a=i*TAU/3,o=box(balance,.72,.055,.065,[.36*Math.cos(a),.36*Math.sin(a),.035],mat.brass,.012);o.rotation.z=a;}
  for(let i=0;i<12;i++){const a=i*TAU/12;cyl(balance,.038,.055,[.79*Math.cos(a),.79*Math.sin(a),.085],mat.steel,'z');}cyl(balance,.05,.32,[0,0,.12],mat.steel,'z');
  const hairspring=part('游丝与摆轮轴承','balance');hairspring.origin=[-1.23,-2.25,1.08];hairspring.layer=3;spiral(hairspring,.61,5,0,blued);jewel(hairspring,0,0,.1);
  const bridges=part('镂空夹板与宝石轴承','bridge');bridges.layer=4;
  for(const [x,y,w,h,a] of [[-1.6,1.53,3.05,.36,.1],[1.5,1.15,1.9,.32,-.45],[2.35,-.8,1.45,.27,1.1],[-2.05,-1.6,1.3,.24,-.7]]){const o=box(bridges,w,h,.13,[x,y,1.25],mat.cast,.12);o.rotation.z=a;}
  for(const [x,y] of [[-2.95,1.38],[-.23,1.66],[2.3,.75],[2.1,-1.42],[-2.55,-1.2]])screw(bridges,x,y,1.34);
  for(const [x,y] of [[0,0],[1.62,0],[1.62,-1.224]]){cyl(bridges,.05,.6,[x,y,.9],mat.steel,'z');jewel(bridges,x,y,1.35);}
  engraving(bridges,'M E C A N I Q U E',[-1.1,1.55,1.33],1.6,.17);
  const winding=gear('上链棘轮','winding',-.75,2.25,.35,.53,32,null,1);
  const crownWheel=gear('上链传动轮','winding',.11,2.25,.35,.33,20,null,1);
  for(const p of [winding,crownWheel]){cyl(p,.25,.045,[0,0,.1],mat.cast,'z');screw(p,0,0,.15);}
  const chapter=part('分钟刻度圈','chapter');chapter.layer=5;
  ring(chapter,3.31,2.95,.09,[0,0,1.45],mat.cover);
  for(let i=0;i<60;i++){const a=i*TAU/60;const o=box(chapter,i%5===0?.045:.018,i%5===0?.22:.09,.025,[3.14*Math.sin(a),3.14*Math.cos(a),1.56],i%5===0?mat.brass:mat.edge,.006);o.rotation.z=-a;}
  const dial=part('表盘 · 时间显示','dial');dial.layer=5;cyl(dial,2.96,.045,[0,0,1.46],mat.cover,'z');
  const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  numerals.forEach((n,i)=>{const a=i*TAU/12;engraving(dial,n,[2.66*Math.sin(a),2.66*Math.cos(a),1.503],.1+n.length*.085,.32);});
  engraving(dial,'A T E L I E R',[0,1.42,1.494],1.1,.19);engraving(dial,'M E C A N I Q U E',[0,1.18,1.494],1.25,.13);
  function hand(name,key,len,width,z){const p=part(name,'hands');p.layer=6;p.origin=[0,0,z];p.motion=key;moving.push(p);const s=new THREE.Shape();s.moveTo(-width/2,-.35);s.lineTo(-width/2,len*.72);s.lineTo(0,len);s.lineTo(width/2,len*.72);s.lineTo(width/2,-.35);s.closePath();mesh(p,new THREE.ExtrudeGeometry(s,{depth:.045,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:2}),mat.brass);box(p,width*.2,len*.6,.01,[0,len*.37,.06],mat.steel,.005);return p;}
  const hour=hand('时针 · 十二小时一圈','hour',1.65,.13,1.63),minute=hand('分针 · 一小时一圈','minute',2.5,.08,1.73);
  const hub=part('指针轴帽','hands');hub.layer=6;cyl(hub,.14,.15,[0,0,1.8],mat.brass,'z');cyl(hub,.065,.16,[0,0,1.81],blued,'z');
  const secondsDial=part('小秒盘','dial');secondsDial.layer=5;ring(secondsDial,.59,.575,.012,[0,-1.5,1.5],mat.brass);for(let i=0;i<60;i++){const a=i*TAU/60,o=box(secondsDial,.01,i%5===0?.07:.03,.01,[.53*Math.sin(a),-1.5+.53*Math.cos(a),1.53],mat.edge,.003);o.rotation.z=-a;}
  const seconds=part('秒针 · 每分钟一圈','hands');seconds.layer=6;seconds.origin=[0,-1.5,1.63];seconds.motion='second';moving.push(seconds);box(seconds,.022,.62,.03,[0,.21,0],mat.brass,.007);cyl(seconds,.045,.06,[0,0,.01],mat.brass,'z');
  // Merge static detail within each semantic part and finish to bound draw-call cost.
  pickables.length=0;
  for(const p of parts){
    const buckets=new Map();for(const o of p.meshes){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);g.clearGroups();if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);p.group.remove(o);}
    p.meshes=[];for(const [m,geometries] of buckets){const g=mergeGeometries(geometries,false);mesh(p,g,m);geometries.forEach(g=>g.dispose());}
  }
  // Each part owns its finish variants. Opacity and selection never mutate shared materials.
  for(const p of parts){const map=new Map();for(const m of p.meshes){if(!map.has(m.material)){const copy=m.material.clone();copy.onBeforeCompile=m.material.onBeforeCompile;copy.customProgramCacheKey=m.material.customProgramCacheKey;copy.userData.baseColor=copy.color.clone();map.set(m.material,copy);}m.material=map.get(m.material);}p.materials=[...map.values()];}
  let poses=solve(0);
  function update(seconds,explode=0){
    poses=solve(seconds);
    for(const p of parts){const [x,y,z]=p.origin||[0,0,0];p.group.position.set(x,y,z+(p.layer||0)*explode*.9);if(p.motion)p.group.rotation.z=poses[p.motion];}
  }
  update(0);
  return {root,parts,pickables,update,get poses(){return poses;},anchors:[{name:'发条盒',part:barrel,position:[0,0,.2]},{name:'轮系',part:third,position:[0,0,.2]},{name:'擒纵',part:escape,position:[0,0,.2]},{name:'摆轮',part:balance,position:[0,0,.2]}]};
}
