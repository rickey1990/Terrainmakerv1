const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Worker}=require('node:worker_threads');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ids=['generator-source','flight-source','terrain-source','feature-pack-source','tile-mixer-source'];
const source=ids.map(id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1]).join('\n');
const {F,M}=new Function(source+'\nreturn {F:FlightCore,M:TerrainMixer};')();

test('all embedded scripts parse without a build step',()=>{
 for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new Function(match[1]));
});

test('normalisation is bounded, handles flat maps, and removes source elevation and scale',()=>{
 assert.deepEqual(Array.from(M.normalise([4,8,12])),[-1,0,1]);
 assert.deepEqual(Array.from(M.normalise([104,108,112])),[-1,0,1]);
 assert.deepEqual(Array.from(M.normalise([8,16,24])),[-1,0,1]);
 assert.deepEqual(Array.from(M.normalise([7,7,7])),[0,0,0]);
 assert.throws(()=>M.normalise([1,NaN]));
});

test('subtraction cancels matching maps; interference changes the resulting shape',()=>{
 const a=new Float32Array([-1,-.5,0,.5,1]);
 assert.deepEqual(Array.from(M.combine([a,a],[1,-1],0)),[0,0,0,0,0]);
 const b=new Float32Array([.4,-.5,.8,1,-.9]);
 assert.notDeepEqual(Array.from(M.combine([a,b],[.6,.4],0)),Array.from(M.combine([a,b],[.6,.4],.7)));
 assert.throws(()=>M.combine([a,new Float32Array(3)],[1,1],0));
});

test('every active family and all six tile designs produce finite, non-flat local data',()=>{
 assert.equal(M.families().length,27);let designs=0;
 for(const kind of M.families()){
  const variants=F.tileVariants(kind);assert.equal(variants.length,6);
  for(const variant of variants){
   const tile=F.makeHeightTile({kind,variant:variant.id,seed:'MIXER-TEST',n:65});
   assert.equal(tile.height.length,65*65);assert(tile.height.every(Number.isFinite));
   assert(Math.max(...tile.height)-Math.min(...tile.height)>1e-5,kind+'/'+variant.id);designs++;
  }
 }
 assert.equal(designs,162);
});

test('ten recipes are deterministic, diverse and contain the requested number of distinct sources',()=>{
 for(const count of[0,2,3]){
  const fingerprints=new Set();
  for(let i=0;i<10;i++){
   const recipe=M.recipe('BATCH-TEST',i,count);
   assert.deepEqual(recipe,M.recipe('BATCH-TEST',i,count));
   assert([2,3].includes(recipe.sources.length));if(count)assert.equal(recipe.sources.length,count);
   assert.equal(new Set(recipe.sources.map(s=>s.kind)).size,recipe.sources.length);
   const tile=M.generate(recipe);assert.equal(tile.height.length,65*65);
   assert.equal(Math.min(...tile.height),-1);assert.equal(Math.max(...tile.height),1);
   assert(tile.height.every(Number.isFinite));fingerprints.add(Buffer.from(tile.height.buffer).toString('base64'));
  }
  assert.equal(fingerprints.size,10);
 }
 assert.notDeepEqual(M.recipe('ONE',0),M.recipe('TWO',0));
});

test('JSON recipes reproduce exactly and the donor cache stays bounded',()=>{
 const recipe=M.recipe('ROUND-TRIP',4,3),first=M.generate(recipe),restored=M.generate(JSON.parse(JSON.stringify(recipe)));
 assert.deepEqual(Array.from(first.height),Array.from(restored.height));
 const cache=new Map();for(let i=0;i<25;i++)M.generate(M.recipe('CACHE',i,3),cache);
 assert(cache.size<=48);
 for(const value of cache.values()){assert.equal(Math.min(...value),-1);assert.equal(Math.max(...value),1);}
});

test('invalid or unsupported saved recipes are rejected before generation',()=>{
 const valid=M.recipe('VALIDATION',0,2);
 assert.throws(()=>M.validate({...valid,version:99}));
 assert.throws(()=>M.validate({...valid,sources:[valid.sources[0]]}));
 assert.throws(()=>M.validate({...valid,interference:Infinity}));
 assert.throws(()=>M.validate({...valid,weights:[0,0]}));
 assert.throws(()=>M.validate({...valid,sources:[{...valid.sources[0],kind:'missing'},valid.sources[1]]}));
 assert.throws(()=>M.validate({...valid,sources:[{...valid.sources[0],zoom:0},valid.sources[1]]}));
});

test('selected 3D mesh uses the same heights and exports a valid GLB with its recipe',()=>{
 const tile=M.generate(M.recipe('MESH',0,2)),mesh=M.mesh(tile,4,16);
 assert.equal(mesh.triangles,64*64*2+64*4*2); // 8192 surface + 512 skirt triangles
 assert(mesh.data.every(Number.isFinite));
 for(let i=0;i<64*64*6;i++){assert(mesh.data[i*13+4]>0);assert(mesh.data[i*13+1]>=-2&&mesh.data[i*13+1]<=2);}
 assert.equal(mesh.data[1],tile.height[0]*2);
 const bytes=F.makeGLB(mesh,{radius:0,heightMix:tile.recipe}),view=new DataView(bytes);
 assert.equal(view.getUint32(0,true),0x46546c67);assert.equal(view.getUint32(4,true),2);assert.equal(view.getUint32(8,true),bytes.byteLength);
 const length=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
 assert.deepEqual(json.nodes[0].extras.recipe.heightMix,tile.recipe);
 assert.equal(json.accessors[0].count,mesh.vertices);
});

test('the browser worker streams all ten transferable maps and completes',async()=>{
 const workerHandler=html.match(/const source=\['generator-source'[\s\S]*?\.join\('\\n'\)\+`([\s\S]*?)`;/)[1].replace(/\\n/g,'\n');
 const workerSource=`const {parentPort}=require('node:worker_threads');global.self={postMessage:(m,t)=>parentPort.postMessage(m,t)};\n${source}\n${workerHandler}\nparentPort.on('message',data=>self.onmessage({data}));`;
 const recipes=Array.from({length:10},(_,i)=>M.recipe('WORKER',i));
 const worker=new Worker(workerSource,{eval:true});let seen=0;
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Worker did not finish')),15000);
   worker.on('error',error=>{clearTimeout(timer);reject(error);});
   worker.on('message',m=>{try{assert.equal(m.token,7);if(m.error)throw Error(m.error);if(m.done){assert.equal(seen,10);clearTimeout(timer);resolve();}else{assert.equal(m.index,seen++);assert.equal(m.tile.height.length,65*65);assert(m.tile.height.every(Number.isFinite));}}catch(error){clearTimeout(timer);reject(error);}});
   worker.postMessage({token:7,recipes});
  });
 }finally{await worker.terminate();}
});
