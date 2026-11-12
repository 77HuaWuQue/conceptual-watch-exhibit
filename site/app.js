import * as THREE from 'three';
import {createStage} from './stage.js';
import {createEngine} from './engine.js';
let stage;
try{stage=createStage(document.querySelector('#viewport'));}catch(e){document.querySelector('#error').hidden=false;document.querySelector('#loading').hidden=true;throw e;}
const engine=createEngine();stage.scene.add(engine.root);
import {createExperience} from './experience.js';
createExperience(stage,engine);
