import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachNotebookDropTarget } from '../src/notebookDropTarget.js';
function setup() {
  const handlers = new Map(), classes = new Set();
  let dropped = 0;
  const host = { addEventListener: (type, fn, capture) => { assert.equal(capture,true); handlers.set(type,fn); }, removeEventListener: type => handlers.delete(type), setTimeout, clearTimeout };
  const pages = { getBoundingClientRect: () => ({left:0,top:0,right:500,bottom:600}), closest: () => ({classList:{add: c=>classes.add(c),remove:c=>classes.delete(c)}}) };
  const dispose=attachNotebookDropTarget({host,getPages:()=>pages,onDrop:()=>dropped++});
  const event=(x=100)=>({clientX:x,clientY:100,dataTransfer:{types:['text/html']},preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
  return {handlers,classes,dispose,event,count:()=>dropped};
}
test('notebook claims frame-to-page drop before other listeners and inserts only once',()=>{
 const t=setup(), enter=t.event();t.handlers.get('dragenter')(enter);
 assert.ok(enter.prevented);assert.ok(t.classes.has('nb-image-drop-active'));
 const drop=t.event();t.handlers.get('drop')(drop);
 assert.ok(drop.prevented);assert.ok(drop.stopped);assert.equal(t.count(),1);assert.equal(t.classes.size,0);t.dispose();
});
test('a drop inside the research panel is not inserted into the notebook',()=>{
 const t=setup(), drop=t.event(700);t.handlers.get('drop')(drop);
 assert.equal(t.count(),0);assert.equal(drop.prevented,undefined);t.dispose();
});
test('cancel and unmount restore frame interaction and remove listeners',()=>{
 const t=setup();t.handlers.get('dragenter')(t.event());t.handlers.get('keydown')({key:'Escape'});
 assert.equal(t.classes.size,0);t.dispose();assert.equal(t.handlers.size,0);
});
