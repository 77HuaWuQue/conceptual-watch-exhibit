// One elapsed simulation time drives the whole watch. Geometry is educational.
export const TAU=Math.PI*2;
export const wrap=(v,m=TAU)=>((v%m)+m)%m;
export function solve(t){
  const beatTime=Math.floor(t*5+1e-7)/5,clock=10*3600+8*60+t;
  return {barrel:beatTime*TAU/(3600*8),center:-beatTime*TAU/3600,third:beatTime*TAU*8/3600,fourth:-beatTime*TAU/60,escape:beatTime*TAU/6,balance:Math.sin(t*TAU*2.5)*Math.PI*1.35,fork:Math.tanh(Math.sin(t*TAU*2.5)*7)*.16,hour:-clock*TAU/43200,minute:-clock*TAU/3600,second:-beatTime*TAU/60};
}
export function clockText(t){const n=Math.floor(10*3600+8*60+t);return [Math.floor(n/3600)%12||12,Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':');}
