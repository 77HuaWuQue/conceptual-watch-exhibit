import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
export function createStage(container){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.localClippingEnabled=true;
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x090d10);scene.fog=new THREE.FogExp2(0x090d10,.018);
  const pmrem=new THREE.PMREMGenerator(renderer),studio=new THREE.Scene();studio.background=new THREE.Color(0x11171c);
  for(const [w,h,pos,color,power] of [[5,10,[-7,4,6],0xffead0,5],[3,12,[8,1,-4],0xc5e0f5,6],[10,3,[0,9,0],0xffffff,5],[2,7,[-4,-2,-6],0xd5a576,2],[8,2,[0,1,9],0xffffff,2]]){
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(power),side:THREE.DoubleSide}));panel.position.set(...pos);panel.lookAt(0,0,0);studio.add(panel);
  }
  scene.environment=pmrem.fromScene(studio,.035).texture;studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();scene.environmentIntensity=1;
  const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.1,100);camera.position.set(10,5.7,19.5);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,-.15,0);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=true;controls.minDistance=7;controls.maxDistance=90;controls.maxPolarAngle=Math.PI*.89;controls.autoRotate=true;controls.autoRotateSpeed=.2;
  scene.add(new THREE.HemisphereLight(0xc5d9ea,0x322419,.65));
  const key=new THREE.DirectionalLight(0xffecd6,3.1);key.position.set(-7,9,9);scene.add(key);
  const rim=new THREE.DirectionalLight(0xb1d5ed,4.2);rim.position.set(6,5,-8);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xd7e4e8,1.25);fill.position.set(1,-4,8);scene.add(fill);
  const spot=new THREE.SpotLight(0xf3dec1,210,40,.6,.8,1.5);spot.position.set(-1,10,6);spot.target.position.set(0,-3,0);spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.0015;spot.shadow.normalBias=.025;scene.add(spot,spot.target);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x090d10,roughness:.38,metalness:.25}));floor.rotation.x=-Math.PI/2;floor.position.y=-4.74;floor.receiveShadow=true;scene.add(floor);
  floor.material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFloorWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFloorWorld=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFloorWorld;').replace('#include <fog_fragment>','#include <fog_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.035294,.050980,.062745),smoothstep(15.,45.,length(vFloorWorld.xz)));');
  };
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(5.7,5.9,.15,128),new THREE.MeshStandardMaterial({color:0x10171c,metalness:.65,roughness:.31}));platform.position.y=-4.63;platform.receiveShadow=true;scene.add(platform);
  const edge=new THREE.Mesh(new THREE.TorusGeometry(5.74,.012,6,160),new THREE.MeshBasicMaterial({color:0x61605a,transparent:true,opacity:.43}));edge.rotation.x=Math.PI/2;edge.position.y=-4.546;scene.add(edge);
  // Baked analytic contact falloff, with real shadows from the moving engine above it.
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){vec2 q=(vUv-.5)*2.;float a=exp(-dot(q,q)*6.)*.8;gl_FragColor=vec4(.0,.0,.0,a);}' }));contact.rotation.x=-Math.PI/2;contact.position.y=-4.54;scene.add(contact);
  const stand=new THREE.Group();scene.add(stand);const standMat=new THREE.MeshStandardMaterial({color:0x1a2023,metalness:.8,roughness:.3});
  for(const z of [-2.8,2.8]){const stem=new THREE.Mesh(new THREE.BoxGeometry(.4,3,.4),standMat);stem.position.set(0,-3.0,z);stem.castShadow=true;stand.add(stem);const foot=new THREE.Mesh(new THREE.BoxGeometry(2.1,.14,1.05),standMat);foot.position.set(0,-4.44,z);stand.add(foot);}
  const particles=new THREE.BufferGeometry();const positions=[];let s=291;const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};for(let i=0;i<100;i++)positions.push((rand()-.5)*45,rand()*16-4,-rand()*24-2);particles.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const dust=new THREE.Points(particles,new THREE.PointsMaterial({color:0x8a999e,size:.017,transparent:true,opacity:.12,depthWrite:false}));scene.add(dust);
  const pedestal=new THREE.Group();scene.add(pedestal);pedestal.add(floor,platform,edge,contact);
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  window.addEventListener('resize',resize);
  return {scene,camera,renderer,controls,stand,dust,pedestal};
}
