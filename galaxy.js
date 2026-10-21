// Данные планет и построение 3D-галактики (Three.js r128)
const PLANETS = [
  {id:'kaira', name:'Кайра', type:'Океаническая', price:4200000, r:14, pos:[-180,10,120], color:'#2a7fff', bands:false,
   desc:'Мир сплошного океана с мягким климатом. Острова-архипелаги подходят для плавучих городов.',
   rk:7800, day:22, year:410, moons:2, temp:'+18 °C', g:0.92, atmo:'азот, кислород', water:94, res:'вода, водоросли, жемчуг', hab:88, ore:40, view:80},
  {id:'veras', name:'Верас', type:'Пустынная', price:2650000, r:11, pos:[120,-20,60], color:'#e0914a', bands:false,
   desc:'Тёплые дюны и редкие оазисы. Много солнца, мало воды — зато недорого.',
   rk:6100, day:31, year:290, moons:1, temp:'+47 °C', g:0.71, atmo:'углекислый газ, азот', water:6, res:'песок, редкие соли', hab:35, ore:55, view:60},
  {id:'nox', name:'Нокс', type:'Ледяной гигант с кольцами', price:8900000, r:26, pos:[260,40,-140], color:'#9fd8ff', bands:true, ring:true,
   desc:'Огромная планета в ледяных кольцах. Лучший вид в галактике, жить можно только на орбите.',
   rk:24000, day:17, year:5200, moons:9, temp:'−190 °C', g:1.1, atmo:'водород, метан', water:0, res:'лёд, гелий-3', hab:5, ore:78, view:100},
  {id:'ember', name:'Эмбер', type:'Вулканическая', price:1900000, r:9, pos:[-60,-30,-200], color:'#d4472a', bands:false,
   desc:'Реки лавы и богатые недра. Идеальна для добычи металлов.',
   rk:4900, day:14, year:160, moons:0, temp:'+310 °C', g:0.8, atmo:'сернистые газы', water:0, res:'железо, титан, золото', hab:8, ore:95, view:70},
  {id:'lira', name:'Лира', type:'Лесная', price:5300000, r:13, pos:[-300,25,-60], color:'#3fae6a', bands:false,
   desc:'Зелёные континенты, чистый воздух и сотни рек. Подходит для семьи.',
   rk:7200, day:26, year:380, moons:3, temp:'+22 °C', g:1.03, atmo:'азот, кислород', water:61, res:'древесина, плодородная почва', hab:96, ore:50, view:75},
  {id:'taur', name:'Тавр', type:'Газовый гигант', price:12500000, r:34, pos:[40,60,-420], color:'#c9a36a', bands:true,
   desc:'Самая большая планета каталога: бури размером с материк и полосы облаков.',
   rk:68000, day:10, year:11800, moons:27, temp:'−140 °C', g:2.4, atmo:'водород, гелий', water:0, res:'водород, гелий-3', hab:2, ore:85, view:95}
];

function glowTexture(color){
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d'), gr=g.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,color); gr.addColorStop(.35,color+'55'); gr.addColorStop(1,color+'00');
  g.fillStyle=gr; g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}

function surfaceTexture(hex, bands){
  const c=document.createElement('canvas'); c.width=512; c.height=256;
  const g=c.getContext('2d'); g.fillStyle=hex; g.fillRect(0,0,512,256);
  if(bands){
    for(let y=0;y<256;y+=6){ g.fillStyle=Math.random()<.5?'rgba(255,255,255,.12)':'rgba(0,0,0,.14)'; g.fillRect(0,y,512,2+Math.random()*7); }
  }
  for(let i=0;i<260;i++){
    const x=Math.random()*512, y=Math.random()*256, r=6+Math.random()*30;
    g.fillStyle=Math.random()<.5?'rgba(255,255,255,.08)':'rgba(0,0,0,.12)';
    g.beginPath(); g.ellipse(x,y,r*(bands?3:1),r,0,0,7); g.fill();
  }
  return new THREE.CanvasTexture(c);
}

function createStars(scene){
  // Далёкие звёзды
  const n=3500, p=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const u=Math.random()*2-1, t=Math.random()*6.283, s=Math.sqrt(1-u*u);
    p.set([2600*s*Math.cos(t),2600*u,2600*s*Math.sin(t)],i*3);
  }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({size:2.2,color:0xffffff,sizeAttenuation:false,fog:false})));
}

function createGalaxy(scene){
  const n=32000, arms=4, R=1000, pos=new Float32Array(n*3), col=new Float32Array(n*3);
  const inner=new THREE.Color('#ffc98a'), outer=new THREE.Color('#6aa8ff'), c=new THREE.Color();
  for(let i=0;i<n;i++){
    const d=Math.pow(Math.random(),.7)*R, a=(i%arms)/arms*6.283+d*0.0036;
    const sp=(Math.random()-.5)*(30+d*.14);
    pos.set([Math.cos(a)*d+sp*(Math.random()-.5)*2, (Math.random()-.5)*(26-d*.016), Math.sin(a)*d+sp*(Math.random()-.5)*2],i*3);
    c.copy(inner).lerp(outer,d/R); col.set([c.r,c.g,c.b],i*3);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({size:2.4,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending})));
  // Светящееся ядро
  const core=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture('#ffcf8a'),blending:THREE.AdditiveBlending,depthWrite:false}));
  core.scale.set(260,260,1); scene.add(core);
  scene.add(new THREE.PointLight(0xfff0d8,2.1));
  scene.add(new THREE.AmbientLight(0x404a80,.55));
}

function createPlanets(scene){
  PLANETS.forEach(p=>{
    const m=new THREE.Mesh(new THREE.SphereGeometry(p.r,48,32),
      new THREE.MeshStandardMaterial({map:surfaceTexture(p.color,p.bands),roughness:.92}));
    m.position.set(...p.pos);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(p.color),blending:THREE.AdditiveBlending,depthWrite:false,opacity:.7}));
    glow.scale.set(p.r*4.2,p.r*4.2,1); m.add(glow); p.glow=glow;
    if(p.ring){
      const ring=new THREE.Mesh(new THREE.RingGeometry(p.r*1.5,p.r*2.4,96),
        new THREE.MeshBasicMaterial({color:0xcfe9ff,transparent:true,opacity:.5,side:THREE.DoubleSide}));
      ring.rotation.x=Math.PI/2.3; m.add(ring);
    }
    const grid=new THREE.Mesh(new THREE.SphereGeometry(p.r*1.012,28,18),new THREE.MeshBasicMaterial({color:0x7fd4ff,wireframe:true,transparent:true,opacity:.35}));
    grid.visible=false; m.add(grid); p.grid=grid;
    m.userData.id=p.id; p.mesh=m; scene.add(m);
  });
}
