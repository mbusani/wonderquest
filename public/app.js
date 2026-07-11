const KEY='wonderquest_state_v5';
const LEGACY_KEYS=['wonderquest_state_v4','wonderquest_state_v3'];
const defaultState={players:[],activePlayerId:null,screen:'players',selectedMissionId:null,settings:{sound:true}};
let state=load();
let pendingAvatar='';

function load(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw){for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw)break;}}
    const loaded=raw?JSON.parse(raw):{};
    const merged={...defaultState,...loaded,settings:{...defaultState.settings,...(loaded.settings||{})}};
    merged.players=(merged.players||[]).map(migratePlayer);
    return merged;
  }catch{return structuredClone(defaultState)}
}
function migratePlayer(p){
  p.levels=p.levels||{};
  p.badges=p.badges||[];
  p.stars=Number(p.stars||0);
  p.completed=Number(p.completed||0);
  for(const m of missions){
    if(!p.levels[m.id]) p.levels[m.id]={unlocked:1,completed:[]};
    if(p.badges.includes(m.title) && !p.levels[m.id].completed.length){p.levels[m.id]={unlocked:5,completed:[1,2,3,4,5]};}
  }
  return p;
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()}
function active(){return state.players.find(p=>p.id===state.activePlayerId)}
function setScreen(s){state.screen=s;save();render()}

const missions=[
 {id:'turtles',title:'Rescue the Baby Turtles',icon:'🐢',guide:'Lilo',subject:'Reading',intro:'Help Lilo guide the baby turtles home by solving word clues.'},
 {id:'crystals',title:'Find the Space Crystals',icon:'🚀',guide:'Stitch',subject:'Maths',intro:'Help Stitch recharge the spaceship with number power.'},
 {id:'jungle',title:'Secret Jungle Discovery',icon:'🌿',guide:'Lilo',subject:'Science',intro:'Explore plants and animals hidden in the jungle.'},
 {id:'rocket',title:'Build Stitch’s Rocket',icon:'🤖',guide:'Stitch',subject:'Coding',intro:'Put steps, patterns and logic in the right order.'},
 {id:'treasure',title:'Island Treasure Hunt',icon:'🗺️',guide:'Lilo',subject:'Geography',intro:'Follow map clues to find the hidden treasure.'},
 {id:'volcano',title:'The Volcano Mystery',icon:'🌋',guide:'Stitch',subject:'Writing',intro:'Choose words to complete the island story.'}
];

function shuffleOptions(answer,wrong){const a=[answer,...wrong];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return {options:a,correct:a.indexOf(answer)}}
function makeQ(text,answer,wrong){const x=shuffleOptions(String(answer),wrong.map(String));return {text,options:x.options,correct:x.correct,answered:false};}
function questionsFor(mission,age,level){
  const young=age<=4, mid=age<=7;
  const qs=[];
  if(mission.id==='crystals'){
    for(let n=0;n<5;n++){
      if(level===1){const a=Math.max(1,Math.floor(Math.random()*(young?4:10))+1),b=Math.floor(Math.random()*(young?3:7));const ans=a+b;qs.push(makeQ(`${a} + ${b} = ?`,ans,[ans+1,Math.max(0,ans-1)]));}
      else if(level===2){const a=Math.floor(Math.random()*(young?8:20))+5,b=Math.floor(Math.random()*Math.max(2,a-1))+1,ans=a-b;qs.push(makeQ(`${a} − ${b} = ?`,ans,[ans+1,Math.max(0,ans-1)]));}
      else if(level===3){const a=Math.floor(Math.random()*(mid?5:9))+2,b=Math.floor(Math.random()*5)+2,ans=a*b;qs.push(makeQ(`${a} × ${b} = ?`,ans,[ans+a,Math.max(1,ans-b)]));}
      else if(level===4){const b=Math.floor(Math.random()*6)+2,ans=Math.floor(Math.random()*7)+2,a=b*ans;qs.push(makeQ(`${a} ÷ ${b} = ?`,ans,[ans+1,Math.max(1,ans-1)]));}
      else {const price=(Math.floor(Math.random()*8)+2)*5,paid=price+10,ans=paid-price;qs.push(makeQ(`An item costs ${price} coins. You pay ${paid}. What change?`,ans,[ans+5,Math.max(0,ans-5)]));}
    }
  } else {
    const banks={
      turtles:[
       [['Which word starts with B?','Ball',['Cat','Sun']],['Which word rhymes with cat?','Hat',['Dog','Fish']],['Pick the vowel.','A',['M','T']],['Which is a word?','Dog',['7','@']],['Finish: The sun is ___.','hot',['blueberry','jump']]],
       [['Choose the noun.','ocean',['quickly','bright']],['Choose the verb.','explore',['island','yellow']],['Which sentence begins correctly?','The turtle swims.',['the turtle swims.','Turtle the swims.']],['A synonym for happy is…','joyful',['angry','tiny']],['Complete: Lilo ___ the turtle.','helps',['purple','slow']]],
       [['Choose the adjective.','sparkling',['swim','island']],['Opposite of enormous?','tiny',['loud','quick']],['Which word has two syllables?','turtle',['cat','fish']],['Choose the correct plural.','babies',['babys','babyes']],['Which sentence is a question?','Where is the shell?',['The shell is here.','Find the shell.']]],
       [['What does “glance” mean?','look quickly',['shout loudly','sleep deeply']],['Choose the conjunction.','because',['turtle','gently']],['Which is punctuated correctly?','“Come here,” said Lilo.',['“Come here” said Lilo','Come here, said Lilo.']],['A prefix meaning “again” is…','re-',['un-','pre-']],['Best summary: A turtle gets lost, then finds home.','A lost turtle returns home.',['Turtles are green.','The beach is sunny.']]],
       [['Infer: Dark clouds gathered and everyone packed umbrellas. What is likely?','It may rain.',['It will snow.','It is midnight.']],['Choose the metaphor.','The ocean was a blanket.',['The ocean was blue.','The ocean moved slowly.']],['Which word is most precise?','sprinted',['went','moved']],['Author’s purpose in a safety guide?','to inform',['to entertain','to rhyme']],['Which sentence uses “their” correctly?','They found their shells.',['Their going home.','The shell is over their.']]]
      ],
      jungle:[
       [['Which animal has feathers?','Bird',['Dog','Fish']],['Plants need…','water',['plastic','shoes']],['Which lives in water?','Fish',['Lion','Bee']],['The sun gives us…','light',['books','chairs']],['A baby frog is a…','tadpole',['cub','calf']]],
       [['Which part absorbs water?','roots',['flowers','fruit']],['Animals that eat plants are…','herbivores',['carnivores','volcanoes']],['A habitat is an animal’s…','home',['colour','sound']],['Which is a mammal?','Dolphin',['Shark','Octopus']],['Water turns to vapour by…','evaporation',['freezing','melting']]],
       [['Plants make food using…','photosynthesis',['hibernation','migration']],['A food chain begins with…','a producer',['a predator','a decomposer']],['Which is renewable energy?','sunlight',['coal','oil']],['The force pulling objects down is…','gravity',['friction','magnetism']],['A solid changing to liquid is…','melting',['condensing','freezing']]],
       [['Which organ pumps blood?','heart',['lungs','stomach']],['An ecosystem includes…','living and non-living things',['only animals','only plants']],['Most oxygen enters blood in the…','lungs',['bones','skin']],['Adaptation helps an organism…','survive',['become a planet','stop growing']],['Earth rotates once in about…','24 hours',['7 days','365 hours']]],
       [['Biodiversity means…','variety of living things',['amount of rainfall','speed of wind']],['A controlled experiment changes…','one variable',['every variable','no variables']],['Carbon dioxide is used by plants during…','photosynthesis',['digestion','erosion']],['Which process forms sedimentary rock?','compaction and cementation',['melting only','evaporation only']],['An apex predator is…','at the top of a food chain',['a plant producer','a decomposer only']]]
      ],
      rocket:[
       [['What comes next: 🔴 🔵 🔴 🔵 ?','🔴',['🟢','🟡']],['First, then, finally describes a…','sequence',['colour','animal']],['Repeat a step is called a…','loop',['map','fraction']],['Which arrow means move right?','➡️',['⬅️','⬆️']],['A clear list of steps is an…','algorithm',['ocean','instrument']]],
       [['If a robot turns right twice, it faces…','backwards',['left only','the same way']],['A decision in code often uses…','if',['paint','sing']],['Finding and fixing errors is…','debugging',['drawing','mapping']],['A command repeated 4 times is a…','loop',['variable','pixel']],['Which is an input?','button press',['screen image','speaker sound']]],
       [['A variable stores…','a value',['a beach','a colour only']],['True or false values are…','Booleans',['fractions','loops']],['Which condition checks equality?','equals',['repeat','draw']],['A nested loop is…','a loop inside a loop',['a broken loop','no repetition']],['Breaking a problem into parts is…','decomposition',['decoration','evaporation']]],
       [['Which search is fastest on sorted data?','binary search',['random guessing','linear only always']],['An event handler responds to…','an action',['a colour','a noun']],['A function is…','reusable instructions',['a picture file','a mistake']],['Logical AND is true when…','both conditions are true',['either is false','neither is checked']],['A list holds…','multiple values',['only one letter','no data']]],
       [['Efficient code uses fewer…','steps and resources',['colours only','characters only']],['Recursion means a function…','calls itself',['deletes itself','has no name']],['An algorithm’s correctness means…','it gives the right result',['it looks colourful','it runs slowly']],['Encryption protects…','information',['screen brightness','font size']],['A test case checks…','expected behaviour',['wallpaper','music volume only']]]
      ],
      treasure:[
       [['Opposite of north?','South',['East','West']],['A map shows…','places',['sounds','tastes']],['Australia is a…','country',['planet','river']],['Largest ocean?','Pacific',['Indian','Arctic']],['A compass finds…','direction',['temperature','weight']]],
       [['A continent is…','a large landmass',['a small river','a road']],['The equator divides Earth into…','north and south',['east and west only','land and sea']],['A map key explains…','symbols',['weather only','time']],['Lines of latitude run…','east–west',['north–south','up–down']],['A capital city is…','a seat of government',['always the largest city','a mountain']]],
       [['Longitude measures position…','east or west',['height only','temperature']],['Climate describes…','long-term weather patterns',['today’s weather only','a road map']],['Population density means…','people per area',['number of oceans','height of hills']],['An archipelago is…','a group of islands',['one desert','a river valley']],['A scale on a map shows…','distance relationship',['language','population only']]],
       [['Urbanisation is growth of…','cities',['oceans','forests only']],['A watershed drains water into…','a common outlet',['the sky','a volcano']],['GDP is a measure of…','economic output',['rainfall','mountain height']],['A renewable resource can…','replenish naturally',['never return','only be mined']],['Migration is movement of…','people or animals',['rocks only','clouds only']]],
       [['Geopolitics studies…','geography and political power',['only weather','only spelling']],['A demographic transition concerns…','population change',['rock formation','ocean tides']],['Sustainable development balances…','people, planet and prosperity',['only profit','only roads']],['A trade route connects…','markets and regions',['only mountains','cloud types']],['Cultural diffusion is spread of…','ideas and customs',['rainfall','tectonic plates']]]
      ],
      volcano:[
       [['The volcano was very ___.','tall',['sing','quickly']],['Choose a describing word.','shiny',['jump','under']],['Complete: Lilo ___ to the cave.','walked',['blue','happy']],['Which ends a sentence?','.',['(','#']],['Best ending?','They found the treasure!',['Because blue.','Running quickly the.']]],
       [['Choose the adverb.','carefully',['cave','bright']],['Which sentence has a subject and verb?','Stitch laughed.',['The blue cave.','Very quickly.']],['A paragraph begins with a…','topic sentence',['random symbol','title only']],['Which word shows past tense?','jumped',['jump','jumping']],['Choose correct punctuation.','Watch out!',['Watch out','Watch out,']]],
       [['A simile uses…','like or as',['only numbers','a map']],['Best transition word?','However',['Purple','Turtle']],['Which sentence shows dialogue?','“Let’s go,” said Lilo.',['Lilo went home.','The cave was dark.']],['A strong verb for “went quickly” is…','rushed',['was','nice']],['A conclusion should…','wrap up the main idea',['start a new unrelated topic','list random words']]],
       [['Which creates suspense?','Footsteps echoed behind them.',['The chair was brown.','It was Tuesday.']],['Active voice?','Lilo opened the door.',['The door was opened by Lilo.','The door opening.']],['Best thesis statement?','Protecting oceans benefits wildlife and people.',['Oceans.','I like blue.']],['Parallel structure?','to swim, to surf, and to sail',['swimming, to surf, sailed','swim and sailing']],['Which detail supports a claim?','A measured fact from a reliable study',['an unrelated joke','a random colour']]],
       [['A motif is…','a recurring element',['a spelling error','a map scale']],['Unreliable narrator means…','their account may not be trustworthy',['they speak loudly','they use paragraphs']],['A counterargument…','addresses an opposing view',['repeats the title','removes all evidence']],['Foreshadowing…','hints at future events',['summarises the ending only','lists characters']],['Best revision improves…','clarity, evidence and flow',['word count only','font colour only']]]
      ]
    };
    const fallback=banks.jungle||[];
    const selected=(banks[mission.id]||fallback)[level-1]||fallback[0];
    for(const [t,a,w] of selected)qs.push(makeQ(t,a,w));
  }
  return qs;
}

function progressFor(p,mid){if(!p.levels[mid])p.levels[mid]={unlocked:1,completed:[]};return p.levels[mid]}
function levelCompleted(p,mid,l){return progressFor(p,mid).completed.includes(l)}
function selectMission(mid){state.selectedMissionId=mid;state.screen='levels';save();render();playSound('tap')}
function startLevel(mid,level){const p=active(),pr=progressFor(p,mid);if(level>pr.unlocked||levelCompleted(p,mid,level))return;const m=missions.find(x=>x.id===mid);p.currentMission={missionId:mid,level,index:0,questions:questionsFor(m,p.age,level),correct:0,startedAt:Date.now()};state.screen='mission';save();playSound('start');render()}
function answer(i){const p=active(),cm=p.currentMission,q=cm.questions[cm.index];if(q.answered)return;q.answered=true;q.choice=i;q.wasCorrect=i===q.correct;if(q.wasCorrect){cm.correct++;p.stars+=10;playSound('correct')}else playSound('wrong');save();render()}
function nextQuestion(){const p=active(),cm=p.currentMission;if(cm.index<cm.questions.length-1){cm.index++;save();render()}else completeLevel()}
function completeLevel(){const p=active(),cm=p.currentMission,m=missions.find(x=>x.id===cm.missionId),pr=progressFor(p,cm.missionId);if(!pr.completed.includes(cm.level))pr.completed.push(cm.level);pr.completed.sort((a,b)=>a-b);if(cm.level<5)pr.unlocked=Math.max(pr.unlocked,cm.level+1);p.completed=(p.completed||0)+1;if(cm.level===5&&!p.badges.includes(m.title))p.badges.push(m.title);p.lastCompleted={missionId:cm.missionId,level:cm.level};p.currentMission=null;state.screen='complete';save();playSound('celebrate');render();setTimeout(confetti,50)}

async function imageToDataUrl(file){
 if(!file)return '';
 if(!file.type.startsWith('image/'))throw new Error('Please choose an image file.');
 const bitmap=await createImageBitmap(file);const size=256,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');const scale=Math.max(size/bitmap.width,size/bitmap.height),w=bitmap.width*scale,h=bitmap.height*scale;ctx.drawImage(bitmap,(size-w)/2,(size-h)/2,w,h);return canvas.toDataURL('image/jpeg',.82);
}
async function previewAvatar(e){try{pendingAvatar=await imageToDataUrl(e.target.files[0]);const img=document.getElementById('avatarPreview');if(img){img.src=pendingAvatar;img.hidden=false}}catch(err){alert(err.message)}}
async function updateAvatar(pid,e){try{const data=await imageToDataUrl(e.target.files[0]);const p=state.players.find(x=>x.id===pid);p.avatar=data;save();playSound('tap');render()}catch(err){alert(err.message)}}
function avatarHtml(p,cls='avatar'){return p&&p.avatar?`<img class="${cls}" src="${p.avatar}" alt="${escapeHtml(p.name)} profile photo">`:`<div class="${cls} avatar-placeholder">🌟</div>`}
function escapeHtml(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function addPlayer(e){e.preventDefault();const fd=new FormData(e.target),name=(fd.get('name')||'Adventurer').trim(),age=Number(fd.get('age'));const p=migratePlayer({id:id(),name,age,avatar:pendingAvatar,stars:0,badges:[],completed:0,currentMission:null,levels:{}});pendingAvatar='';state.players.push(p);state.activePlayerId=p.id;state.screen='map';save();playSound('celebrate');render();setTimeout(confetti,50)}
function selectPlayer(pid){state.activePlayerId=pid;const p=active();state.screen=p.currentMission?'resume':'map';save();playSound('tap');render()}
function resetPlayer(pid){if(!confirm('Reset this player’s stars, levels, badges and current adventure?'))return;const p=state.players.find(x=>x.id===pid);Object.assign(p,migratePlayer({...p,stars:0,badges:[],completed:0,currentMission:null,levels:{}}));save();render()}
function deletePlayer(pid){if(!confirm('Delete this player permanently?'))return;state.players=state.players.filter(x=>x.id!==pid);if(state.activePlayerId===pid)state.activePlayerId=null;state.screen='players';save();render()}
function toggleSound(){state.settings.sound=!state.settings.sound;save();if(state.settings.sound)playSound('tap');render()}
function playSound(type){if(!state.settings.sound)return;try{const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();const map={tap:[420,.08],start:[520,.16],correct:[740,.18],wrong:[220,.15],celebrate:[880,.32]};const [freq,dur]=map[type]||map.tap;o.frequency.value=freq;o.type=type==='wrong'?'sawtooth':'sine';g.gain.setValueAtTime(.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur+.02);setTimeout(()=>ctx.close(),500)}catch{}}
function confetti(){const c=document.createElement('div');c.className='confetti-layer';for(let i=0;i<45;i++){const s=document.createElement('i');s.style.left=Math.random()*100+'%';s.style.animationDelay=Math.random()*.5+'s';s.style.setProperty('--drift',(Math.random()*220-110)+'px');s.textContent=['⭐','🌺','✨','🎉','🐚'][i%5];c.appendChild(s)}document.body.appendChild(c);setTimeout(()=>c.remove(),2600)}

function header(){const p=active();return `<div class="topbar"><button class="brand brand-button" onclick="setScreen('${p?'map':'players'}')">🌈 WonderQuest</button><div class="header-actions"><button class="sound-btn" onclick="toggleSound()" aria-label="${state.settings.sound?'Mute sounds':'Turn sounds on'}">${state.settings.sound?'🔊':'🔇'}</button>${p?`<button class="player-pill" onclick="setScreen('parent')">${p.avatar?`<img src="${p.avatar}" alt="">`:''}${escapeHtml(p.name)} · ⭐ ${p.stars}</button>`:''}</div></div>`}
function render(){const app=document.getElementById('app');let html='<div class="shell">'+header();const p=active();
 if(state.screen==='players'){html+=`<main class="panel center screen-enter"><div class="hero"><img class="guide-float" src="/assets/lilo.webp"><div><h1>Who’s playing?</h1><p>Choose an adventurer and continue where you left off.</p></div><img class="guide-bounce" src="/assets/stitch.png"></div><div class="grid">${state.players.map(x=>`<button class="card player-card" onclick="selectPlayer('${x.id}')">${avatarHtml(x)}<h3>${escapeHtml(x.name)}</h3><div>Age ${x.age} · ⭐ ${x.stars}</div><div class="small">${x.currentMission?'Adventure in progress':totalLevelsDone(x)+' of 30 levels complete'}</div></button>`).join('')}<button class="card" onclick="setScreen('new')"><div class="emoji">➕</div><h3>New Adventurer</h3><div>Name, age and optional photo</div></button></div></main>`}
 else if(state.screen==='new'){html+=`<main class="panel screen-enter"><div class="form"><h1>New Adventurer</h1><p>These details are asked once and saved on this device.</p><form onsubmit="addPlayer(event)"><label>Profile picture <span class="small">(optional)</span></label><div class="avatar-upload"><img id="avatarPreview" class="avatar large" hidden alt="Photo preview"><input type="file" accept="image/*" onchange="previewAvatar(event)"></div><label>Name</label><input name="name" placeholder="First name (optional)" maxlength="30"><label>Age</label><select name="age">${Array.from({length:11},(_,i)=>i+2).map(a=>`<option>${a}</option>`).join('')}</select><div class="actions"><button class="btn">Start Adventure</button><button type="button" class="btn secondary" onclick="setScreen('players')">Back</button></div></form></div></main>`}
 else if(state.screen==='resume'){const m=missions.find(x=>x.id===p.currentMission.missionId);html+=`<main class="panel center screen-enter"><div class="guide-row"><img src="/assets/stitch.png"><div><h2>Welcome back, ${escapeHtml(p.name)}!</h2><p>You stopped during <strong>${m.title}, Level ${p.currentMission.level}</strong>. Continue at question ${p.currentMission.index+1}.</p></div></div><div class="actions centered"><button class="btn" onclick="setScreen('mission')">Continue Adventure ▶</button><button class="btn secondary" onclick="setScreen('map')">Choose another</button></div></main>`}
 else if(state.screen==='map'){html+=`<main class="panel screen-enter"><div class="hero"><img class="guide-float" src="/assets/lilo.webp"><div><h1>Aloha, ${escapeHtml(p.name)}!</h1><p>Each world has five levels. Finish a level to unlock the next.</p><div class="stats"><div class="stat">⭐ ${p.stars} Stars</div><div class="stat">🏅 ${p.badges.length} World Badges</div><div class="stat">🎯 ${totalLevelsDone(p)}/30 Levels</div></div></div><img class="guide-bounce" src="/assets/stitch.png"></div><div class="grid">${missions.map(m=>{const pr=progressFor(p,m.id),done=pr.completed.length;return `<button class="card world-card" onclick="selectMission('${m.id}')"><div class="emoji">${done===5?'✅':m.icon}</div><h3>${m.title}</h3><div>${m.intro}</div><div class="mini-progress"><span style="width:${done*20}%"></span></div><p class="small">${done}/5 levels complete · ${done===5?'World mastered!':'Level '+pr.unlocked+' unlocked'}</p></button>`}).join('')}</div></main>`}
 else if(state.screen==='levels'){const m=missions.find(x=>x.id===state.selectedMissionId),pr=progressFor(p,m.id);html+=`<main class="panel screen-enter"><div class="guide-row"><img src="${m.guide==='Lilo'?'/assets/lilo.webp':'/assets/stitch.png'}"><div><h1>${m.icon} ${m.title}</h1><p>${m.intro}</p></div></div><div class="level-grid">${[1,2,3,4,5].map(l=>{const done=pr.completed.includes(l),locked=l>pr.unlocked;return `<button class="level-card ${done?'level-done':''} ${locked?'level-locked':''}" ${done||locked?'disabled':''} onclick="startLevel('${m.id}',${l})"><span class="level-number">${done?'✓':locked?'🔒':l}</span><strong>Level ${l}</strong><small>${done?'Completed':locked?'Complete Level '+(l-1)+' first':difficultyLabel(l)}</small></button>`}).join('')}</div><div class="actions"><button class="btn secondary" onclick="setScreen('map')">← Back to worlds</button></div></main>`}
 else if(state.screen==='mission'){const cm=p.currentMission,m=missions.find(x=>x.id===cm.missionId),q=cm.questions[cm.index];html+=`<main class="panel screen-enter"><div class="guide-row"><img class="guide-pulse" src="${m.guide==='Lilo'?'/assets/lilo.webp':'/assets/stitch.png'}"><div><strong>${m.guide} says:</strong><p>${m.intro}</p></div></div><div class="mission-title"><h2>${m.icon} ${m.title}</h2><span class="level-chip">Level ${cm.level}</span></div><div class="progress"><span style="width:${((cm.index+1)/cm.questions.length)*100}%"></span></div><p class="small">Challenge ${cm.index+1} of ${cm.questions.length}</p><div class="question">${q.text}</div><div class="answers">${q.options.map((a,i)=>`<button class="answer ${q.answered&&i===q.correct?'answer-correct':''} ${q.answered&&i===q.choice&&!q.wasCorrect?'answer-wrong':''}" onclick="answer(${i})" ${q.answered?'disabled':''}>${a}</button>`).join('')}</div>${q.answered?`<div class="toast ${q.wasCorrect?'good':'try'} pop-in">${q.wasCorrect?'Fantastic! You earned 10 stars.':'Great try! The answer is '+q.options[q.correct]+'.'}</div><div class="center"><button class="btn" onclick="nextQuestion()">${cm.index===cm.questions.length-1?'Complete Level':'Next Challenge'} →</button></div>`:''}</main>`}
 else if(state.screen==='complete'){const last=p.lastCompleted,m=missions.find(x=>x.id===last.missionId),isMaster=last.level===5;html+=`<main class="panel center screen-enter celebration"><div class="trophy">${isMaster?'🏆':'⭐'}</div><h1>${isMaster?'World Mastered!':'Level Complete!'}</h1><p>${escapeHtml(p.name)} completed <strong>${m.title} — Level ${last.level}</strong>.</p><p>${isMaster?'You earned the world badge!':'Level '+(last.level+1)+' is now unlocked.'}</p><div class="actions centered"><button class="btn" onclick="selectMission('${m.id}')">${isMaster?'View Levels':'Play Next Level'} →</button><button class="btn secondary" onclick="setScreen('map')">Choose a World</button></div></main>`}
 else if(state.screen==='parent'){html+=`<main class="panel screen-enter"><h1>Parent Dashboard</h1><p>Manage players, photos and progress. Resetting progress is the only way completed levels become playable again.</p><div class="players-list">${state.players.map(x=>`<div class="player-row"><div class="player-summary">${avatarHtml(x)}<div><strong>${escapeHtml(x.name)}</strong><div class="small">Age ${x.age} · ⭐ ${x.stars} · 🎯 ${totalLevelsDone(x)}/30</div><label class="photo-link">Change photo<input type="file" accept="image/*" onchange="updateAvatar('${x.id}',event)"></label></div></div><div class="actions"><button class="btn secondary" onclick="selectPlayer('${x.id}')">Play</button><button class="btn secondary" onclick="resetPlayer('${x.id}')">Reset progress</button><button class="btn danger" onclick="deletePlayer('${x.id}')">Delete</button></div></div>`).join('')}</div><div class="actions"><button class="btn" onclick="setScreen('new')">Add new player</button><button class="btn secondary" onclick="setScreen('${p?'map':'players'}')">Back</button><a class="btn secondary" href="/logout">Log out</a></div></main>`}
 app.innerHTML=html+'</div>';
}
function totalLevelsDone(p){return missions.reduce((n,m)=>n+progressFor(p,m.id).completed.length,0)}
function difficultyLabel(l){return ['Warm-up','Explorer','Adventurer','Champion','Master Challenge'][l-1]}
render();
