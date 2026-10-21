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
  const dist=Math.round(Math.hypot(...p.pos)*3.2);
  const rows=[['Радиус',p.rk.toLocaleString('ru-RU')+' км'],['Размер к Земле','×'+(p.rk/6371).toFixed(2)],['Сутки',p.day+' ч'],['Год',p.year.toLocaleString('ru-RU')+' сут.'],['Спутники',p.moons],['Температура',p.temp],['Гравитация',p.g+' g'],['Атмосфера',p.atmo],['Вода на поверхности',p.water+' %'],['Ресурсы',p.res],['До ядра галактики',dist+' св. лет']];
  $('pFacts').innerHTML=rows.map(f=>`<li><span>${f[0]}</span><span>${f[1]}</span></li>`).join('');
  $('bars').innerHTML=[['Пригодность для жизни',p.hab],['Богатство недр',p.ore],['Красота вида',p.view]].map(b=>`<div class="bar"><span>${b[0]}</span><i><u style="width:${b[1]}%"></u></i><b>${b[1]}</b></div>`).join('');
  $('tGrid').classList.toggle('on',p.grid.visible); $('tAtm').classList.toggle('on',p.glow.visible);
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
$('close').onclick=()=>{ exitInspect(); $('panel').classList.remove('open'); document.querySelectorAll('#catalog button').forEach(b=>b.classList.remove('on')); };
let toastT; function toast(s){ const t=$('toast'); t.textContent=s; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2200); }

// --- Полёт к планете ---
let flight=null;
let inspect=null,spin=1,auto=true;
function startInspect(p){ const rel=camera.position.clone().sub(p.mesh.position),d=rel.length();
  inspect={p,d,th:Math.atan2(rel.x,rel.z),ph:Math.acos(rel.y/d)}; }
function exitInspect(){ if(!inspect)return; const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ'); yaw=e.y;pitch=e.x;inspect=null; }
$('tAuto').onclick=e=>{auto=!auto;e.currentTarget.classList.toggle('on',auto)};
$('tIn').onclick=()=>{if(inspect)inspect.d*=.75};
$('tOut').onclick=()=>{if(inspect)inspect.d*=1.33};
$('tGrid').onclick=e=>{if(current){current.grid.visible=!current.grid.visible;e.currentTarget.classList.toggle('on',current.grid.visible)}};
$('tAtm').onclick=e=>{if(current){current.glow.visible=!current.glow.visible;e.currentTarget.classList.toggle('on',current.glow.visible)}};
$('tSpin').oninput=e=>{spin=+e.target.value};
$('tExit').onclick=exitInspect;
function flyTo(p){
  exitInspect();
  const target=p.mesh.position.clone();
  const end=target.clone().add(camera.position.clone().sub(target).normalize().multiplyScalar(p.r*4.2+10));
  const tmp=new THREE.Object3D(); tmp.position.copy(end); tmp.lookAt(target);
  flight={t:0,from:camera.position.clone(),to:end,q0:camera.quaternion.clone(),q1:tmp.quaternion.clone()};
  openPanel(p);
}

// --- Управление ---
const keys={}; let drag=false,lx=0,ly=0,moved=0;
addEventListener('keydown',e=>{keys[e.code]=true; if(e.code==='Escape')exitInspect();});
addEventListener('keyup',e=>{keys[e.code]=false});
canvas.addEventListener('pointerdown',e=>{drag=true;moved=0;lx=e.clientX;ly=e.clientY;canvas.classList.add('drag');canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{
  if(!drag)return; const dx=e.clientX-lx,dy=e.clientY-ly; lx=e.clientX;ly=e.clientY; moved+=Math.abs(dx)+Math.abs(dy);
  if(moved>4) flight=null;
  if(inspect&&!flight){ inspect.th-=dx*.006; inspect.ph=Math.max(.15,Math.min(3,inspect.ph-dy*.006)); }
  else if(!flight){ yaw-=dx*.0035; pitch=Math.max(-1.5,Math.min(1.5,pitch-dy*.0035)); }
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
  if(inspect)inspect.d*=1+e.deltaY*.001; else camera.translateZ(e.deltaY*.35)},{passive:false});

function resize(){ renderer.setSize(innerWidth,innerHeight,false); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();

// --- Цикл ---
const clock=new THREE.Clock(), v=new THREE.Vector3();
function loop(){
  const dt=Math.min(clock.getDelta(),.05);
  if(flight){
    flight.t=Math.min(1,flight.t+dt/1.9); const k=flight.t<.5?4*flight.t**3:1-Math.pow(-2*flight.t+2,3)/2;
    camera.position.lerpVectors(flight.from,flight.to,k); camera.quaternion.copy(flight.q0).slerp(flight.q1,k);
    if(flight.t>=1){ flight=null; startInspect(current); }
  } else if(inspect){
    const I=inspect,sp=dt*1.2,c=I.p.mesh.position;
    if(auto&&!drag)I.th+=dt*.25;
    if(keys.ArrowLeft)I.th-=sp; if(keys.ArrowRight)I.th+=sp;
    if(keys.ArrowUp)I.ph=Math.max(.15,I.ph-sp); if(keys.ArrowDown)I.ph=Math.min(3,I.ph+sp);
    if(keys.KeyW)I.d*=1-dt*1.5; if(keys.KeyS)I.d*=1+dt*1.5;
    I.d=Math.max(I.p.r*1.8,Math.min(I.p.r*14,I.d));
    camera.position.set(c.x+I.d*Math.sin(I.ph)*Math.sin(I.th),c.y+I.d*Math.cos(I.ph),c.z+I.d*Math.sin(I.ph)*Math.cos(I.th));
    camera.lookAt(c);
  } else {
    camera.rotation.set(pitch,yaw,0);
    const sp=(keys.ShiftLeft?240:90)*dt;
    if(keys.KeyW||keys.ArrowUp)camera.translateZ(-sp); if(keys.KeyS||keys.ArrowDown)camera.translateZ(sp);
    if(keys.KeyA||keys.ArrowLeft)camera.translateX(-sp); if(keys.KeyD||keys.ArrowRight)camera.translateX(sp);
    if(keys.KeyE)camera.translateY(sp); if(keys.KeyQ)camera.translateY(-sp);
  }
  PLANETS.forEach(p=>{
    p.mesh.rotation.y+=dt*.12*spin;
    v.copy(p.mesh.position).project(camera);
    const vis=v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1;
    p.tag.style.display=vis?'block':'none';
    if(vis){p.tag.style.left=(v.x*.5+.5)*innerWidth+'px'; p.tag.style.top=(-v.y*.5+.5)*innerHeight+'px';}
  });
  renderer.render(scene,camera); requestAnimationFrame(loop);
}
loop();
