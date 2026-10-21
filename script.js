const canvas=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x04050b,0.0005);
const camera=new THREE.PerspectiveCamera(65,1,0.1,4000);
camera.rotation.order='YXZ'; camera.position.set(0,90,430);
let yaw=0,pitch=-0.18;

createStars(scene); createGalaxy(scene); createPlanets(scene);

// --- Покупки (хранятся в браузере) ---
let owned=[]; try{owned=JSON.parse(localStorage.getItem('owned')||'[]')}catch(e){}
const fmt=n=>n.toLocaleString('ru-RU')+' кр.';
const $=id=>document.getElementById(id);
function refreshOwned(){ $('ownedCount').textContent=owned.length;
  document.querySelectorAll('#catalog button').forEach(b=>b.classList.toggle('sold',owned.includes(b.dataset.id))); }

// --- Каталог и метки над планетами ---
PLANETS.forEach(p=>{
  const li=document.createElement('li'), b=document.createElement('button');
  b.dataset.id=p.id; b.innerHTML=`<span>${p.name}</span><span>${fmt(p.price)}</span>`;
  b.onclick=()=>flyTo(p); li.appendChild(b); $('catalog').appendChild(li);
  const t=document.createElement('div'); t.className='tag'; t.textContent=p.name; t.onclick=()=>flyTo(p);
  $('tags').appendChild(t); p.tag=t;
});
refreshOwned();

let current=null;
function openPanel(p){
  current=p; $('pName').textContent=p.name; $('pType').textContent=p.type; $('pDesc').textContent=p.desc;
  $('pFacts').innerHTML=p.facts.map(f=>`<li><span>${f[0]}</span><span>${f[1]}</span></li>`).join('');
  $('pPrice').textContent=fmt(p.price); updateBuy();
  $('panel').classList.add('open');
  document.querySelectorAll('#catalog button').forEach(b=>b.classList.toggle('on',b.dataset.id===p.id));
}
function updateBuy(){ const has=owned.includes(current.id);
  $('buy').disabled=has; $('buy').textContent=has?'Планета ваша':'Купить планету'; }
$('buy').onclick=()=>{
  if(!current||owned.includes(current.id))return;
  owned.push(current.id); try{localStorage.setItem('owned',JSON.stringify(owned))}catch(e){}
  updateBuy(); refreshOwned(); toast(`${current.name} теперь ваша!`);
};
$('close').onclick=()=>{ $('panel').classList.remove('open'); document.querySelectorAll('#catalog button').forEach(b=>b.classList.remove('on')); };
let toastT; function toast(s){ const t=$('toast'); t.textContent=s; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2200); }

// --- Полёт к планете ---
let flight=null;
function flyTo(p){
  const target=p.mesh.position.clone();
  const end=target.clone().add(camera.position.clone().sub(target).normalize().multiplyScalar(p.r*4.2+10));
  const tmp=new THREE.Object3D(); tmp.position.copy(end); tmp.lookAt(target);
  flight={t:0,from:camera.position.clone(),to:end,q0:camera.quaternion.clone(),q1:tmp.quaternion.clone()};
  openPanel(p);
}

// --- Управление ---
const keys={}; let drag=false,lx=0,ly=0,moved=0;
addEventListener('keydown',e=>{keys[e.code]=true});
addEventListener('keyup',e=>{keys[e.code]=false});
canvas.addEventListener('pointerdown',e=>{drag=true;moved=0;lx=e.clientX;ly=e.clientY;canvas.classList.add('drag');canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{
  if(!drag)return; const dx=e.clientX-lx,dy=e.clientY-ly; lx=e.clientX;ly=e.clientY; moved+=Math.abs(dx)+Math.abs(dy);
  if(moved>4) flight=null;
  if(!flight){ yaw-=dx*.0035; pitch=Math.max(-1.5,Math.min(1.5,pitch-dy*.0035)); }
});
canvas.addEventListener('pointerup',e=>{
  drag=false; canvas.classList.remove('drag');
  if(moved<6){ // клик по планете
    const ray=new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1),camera);
    const hit=ray.intersectObjects(PLANETS.map(p=>p.mesh))[0];
    if(hit) flyTo(PLANETS.find(p=>p.mesh===hit.object));
  }
});
canvas.addEventListener('wheel',e=>{e.preventDefault();flight=null;
  camera.translateZ(e.deltaY*.35)},{passive:false});

function resize(){ renderer.setSize(innerWidth,innerHeight,false); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();

// --- Цикл ---
const clock=new THREE.Clock(), v=new THREE.Vector3();
function loop(){
  const dt=Math.min(clock.getDelta(),.05);
  if(flight){
    flight.t=Math.min(1,flight.t+dt/1.9); const k=flight.t<.5?4*flight.t**3:1-Math.pow(-2*flight.t+2,3)/2;
    camera.position.lerpVectors(flight.from,flight.to,k); camera.quaternion.copy(flight.q0).slerp(flight.q1,k);
    if(flight.t>=1){ const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ'); yaw=e.y;pitch=e.x;flight=null; }
  } else {
    camera.rotation.set(pitch,yaw,0);
    const sp=(keys.ShiftLeft?240:90)*dt;
    if(keys.KeyW||keys.ArrowUp)camera.translateZ(-sp); if(keys.KeyS||keys.ArrowDown)camera.translateZ(sp);
    if(keys.KeyA||keys.ArrowLeft)camera.translateX(-sp); if(keys.KeyD||keys.ArrowRight)camera.translateX(sp);
    if(keys.KeyE)camera.translateY(sp); if(keys.KeyQ)camera.translateY(-sp);
  }
  PLANETS.forEach(p=>{
    p.mesh.rotation.y+=dt*.12;
    v.copy(p.mesh.position).project(camera);
    const vis=v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1;
    p.tag.style.display=vis?'block':'none';
    if(vis){p.tag.style.left=(v.x*.5+.5)*innerWidth+'px'; p.tag.style.top=(-v.y*.5+.5)*innerHeight+'px';}
  });
  renderer.render(scene,camera); requestAnimationFrame(loop);
}
loop();
