export function validateStudyInput(input,views){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected an object.');
  const enums={view:views,mode:['solid','ghost','section'],focus:['all','barrel','train','escape','balance']};
  for(const [key,value] of Object.entries(input)){
    if(!['view','mode','focus','rpm','paused'].includes(key))throw new Error(`Unknown setting: ${key}`);
    if(enums[key]&&!enums[key].includes(value))throw new Error(`Invalid ${key}.`);
    if(key==='rpm'&&(!Number.isFinite(value)||value<.1||value>60))throw new Error('Time multiplier must be between 0.1 and 60.');
    if(key==='paused'&&typeof value!=='boolean')throw new Error('Paused must be a boolean.');
  }
  return input;
}
export function registerStudyTool({state,presets,chooseCamera,focus,syncUI}){
  const context=document.modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController(),views=presets.map(p=>p.id);
  const tool={name:'study_mechanical_watch',title:'Study the mechanical watch',description:'Configure the live mechanical watch exhibit camera, housing reveal, isolation, and simulation time multiplier. Changes local presentation state only.',annotations:{readOnlyHint:false,untrustedContentHint:false},inputSchema:{type:'object',properties:{view:{type:'string',enum:views},mode:{type:'string',enum:['solid','ghost','section']},focus:{type:'string',enum:['all','barrel','train','escape','balance']},rpm:{type:'number',minimum:.1,maximum:60},paused:{type:'boolean'}},additionalProperties:false},execute:async input=>{
    const args=validateStudyInput(input,views);
    if(args.view)chooseCamera(args.view);if(args.focus)focus(args.focus);if(args.mode)state.mode=args.mode;if(args.rpm!==undefined)state.rpm=args.rpm;if(args.paused!==undefined)state.paused=args.paused;syncUI();
    return {view:state.camera,mode:state.mode,focus:state.focus,rpm:state.rpm,paused:state.paused};
  }};
  try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch(e){/* Visible controls work without this optional enhancement. */}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
