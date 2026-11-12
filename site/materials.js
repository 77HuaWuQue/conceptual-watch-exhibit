import * as THREE from 'three';
export function makeMaterials(){
  const out={};
  const defs={cast:[0x3c4348,.8,.37],cover:[0x182126,.78,.3],edge:[0x8c999e,.9,.26],steel:[0xbac4c8,.98,.22],dark:[0x11171a,.8,.35],brass:[0xbb9362,.86,.28],copper:[0x89533b,.82,.36],black:[0x080c0e,.55,.36],piston:[0x9babb1,.92,.26]};
  for(const [name,[color,metalness,roughness]] of Object.entries(defs)){
    const m=new THREE.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:1.05});
    // Fine isotropic cast grain and directional machining, evaluated in object space.
    m.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFinish;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFinish=position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFinish;\nfloat grain(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}').replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nfloat g=grain(floor(vFinish*480.));\nroughnessFactor=clamp(roughnessFactor + (g-.5)*${name==='cast'?'.13':'.045'} + sin(vFinish.z*720.)*.018,.08,.85);`);
    };
    m.customProgramCacheKey=()=>`finish-${name}`;
    out[name]=m;
  }
  out.mark=new THREE.MeshBasicMaterial({color:0xd5b78a});
  out.glass=new THREE.MeshStandardMaterial({color:0x77858a,metalness:.2,roughness:.15,transparent:true,opacity:.16,depthWrite:false});
  return out;
}
