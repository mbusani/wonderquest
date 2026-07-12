const KEY='wonderquest_state_v7';
const LEGACY_KEYS=['wonderquest_state_v6','wonderquest_state_v5','wonderquest_state_v4','wonderquest_state_v3'];
const defaultState={players:[],activePlayerId:null,screen:'players',selectedMissionId:null,selectedGameId:null,settings:{sound:true,music:false}};
let audioCtx=null,musicTimer=null,musicStep=0;
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
  ensureExtras(p);
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

const games=[
 {id:'balloon',title:'Balloon Pop',icon:'🎈',world:'Turtle Beach',skill:'Numbers, letters and colours',description:'Pop only the balloon with the right answer.'},
 {id:'memory',title:'Alien Memory Match',icon:'👾',world:'Space Lab',skill:'Memory and recognition',description:'Turn over cards and find all the matching pairs.'},
 {id:'pattern',title:'Pattern Rocket',icon:'🚀',world:'Space Lab',skill:'Patterns and sequencing',description:'Choose the missing piece to launch the rocket.'},
 {id:'sorting',title:'Sorting Safari',icon:'🦁',world:'Jungle Adventure',skill:'Sorting and classification',description:'Help Lilo sort island treasures into the right groups.'},
 {id:'fishing',title:'Fishing Challenge',icon:'🎣',world:'Ocean Quest',skill:'Maths and vocabulary',description:'Catch the fish carrying the correct answer.'},
 {id:'story',title:'Story Builder',icon:'📖',world:'Story Castle',skill:'Reading and creativity',description:'Tap word cards in order to build a story sentence.'},
 {id:'maze',title:'Monkey Maze',icon:'🐒',world:'Jungle Adventure',skill:'Directions, planning and coding',description:'Guide the monkey through a real maze using arrow controls.'}
];

function todayKey(){return new Date().toISOString().slice(0,10)}
function weekKey(){const d=new Date(),onejan=new Date(d.getFullYear(),0,1),week=Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7);return d.getFullYear()+'-W'+week}
function gameProgress(p,gid){p.gameProgress=p.gameProgress||{};if(!p.gameProgress[gid])p.gameProgress[gid]={unlocked:1,completed:[]};return p.gameProgress[gid]}
function totalGameLevels(p){return games.reduce((n,g)=>n+gameProgress(p,g.id).completed.length,0)}
function ensureExtras(p){
 p.rewards={coins:0,shells:0,gems:0,stickers:[],...(p.rewards||{})};
 p.book=p.book||[];p.gameProgress=p.gameProgress||{};
 for(const g of games)gameProgress(p,g.id);
 p.daily=p.daily||{date:'',completed:false};
 p.weekly=p.weekly||{week:weekKey(),clues:0,claimed:false};
 if(p.weekly.week!==weekKey())p.weekly={week:weekKey(),clues:0,claimed:false};
 return p;
}

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
function selectMission(mid){state.selectedMissionId=mid;state.screen='levels';save();render();playSound('whoosh')}
function startLevel(mid,level){const p=active(),pr=progressFor(p,mid);if(level>pr.unlocked||levelCompleted(p,mid,level))return;const m=missions.find(x=>x.id===mid);p.currentMission={missionId:mid,level,index:0,questions:questionsFor(m,p.age,level),correct:0,startedAt:Date.now()};state.screen='mission';save();playSound('rocket');render()}
function answer(i){const p=active(),cm=p.currentMission,q=cm.questions[cm.index];if(q.answered)return;q.answered=true;q.choice=i;q.wasCorrect=i===q.correct;if(q.wasCorrect){cm.correct++;p.stars+=10;playSound('correct')}else playSound('wrong');save();render()}
function nextQuestion(){const p=active(),cm=p.currentMission;if(cm.index<cm.questions.length-1){cm.index++;save();render()}else completeLevel()}
function completeLevel(){const p=active(),cm=p.currentMission,m=missions.find(x=>x.id===cm.missionId),pr=progressFor(p,cm.missionId);if(!pr.completed.includes(cm.level))pr.completed.push(cm.level);pr.completed.sort((a,b)=>a-b);if(cm.level<5)pr.unlocked=Math.max(pr.unlocked,cm.level+1);p.completed=(p.completed||0)+1;if(cm.level===5&&!p.badges.includes(m.title))p.badges.push(m.title);p.lastCompleted={missionId:cm.missionId,level:cm.level};p.currentMission=null;state.screen='complete';save();playSound(cm.level===5?'treasure':'celebrate');render();setTimeout(()=>{confetti();fireworks()},50)}

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
function selectPlayer(pid){state.activePlayerId=pid;const p=active();state.screen=p.currentGame?'game':p.currentMission?'resume':'map';save();playSound('tap');render()}
function resetPlayer(pid){if(!confirm('Reset this player’s stars, levels, badges and current adventure?'))return;const p=state.players.find(x=>x.id===pid);Object.assign(p,migratePlayer({...p,stars:0,badges:[],completed:0,currentMission:null,levels:{}}));save();render()}
function deletePlayer(pid){if(!confirm('Delete this player permanently?'))return;state.players=state.players.filter(x=>x.id!==pid);if(state.activePlayerId===pid)state.activePlayerId=null;state.screen='players';save();render()}

function selectGame(gid){state.selectedGameId=gid;state.screen='game-levels';save();render();playSound('whoosh')}
function startGameLevel(gid,level,daily=false){const p=active(),pr=gameProgress(p,gid);if(!daily&&(level>pr.unlocked||pr.completed.includes(level)))return;const g=games.find(x=>x.id===gid);p.currentGame={gameId:gid,level,round:0,score:0,daily,rounds:createGameRounds(gid,p.age,level)};state.screen='game';save();playSound('rocket');render()}
function createGameRounds(gid,age,level){
 const rounds=[];
 if(gid==='balloon'){
  const colours=['#ff6b8a','#5e9cff','#ffd34f','#55d68b','#b985ff','#ff914d'];
  for(let i=0;i<5;i++){
   const max=Math.max(5,age+level*4),target=Math.floor(Math.random()*max)+1;
   const values=shuffle([...new Set([target,target+1,Math.max(1,target-1),target+2,Math.max(1,target-2),target+3])]).slice(0,6);
   rounds.push({prompt:age<=4?`Pop number ${target}`:`Pop the answer to ${Math.max(0,target-level)} + ${level}`,answer:String(target),misses:0,balloons:values.map((v,n)=>({value:String(v),x:8+n*15,delay:(n*.18).toFixed(2),colour:colours[n%colours.length],popped:false}))});
  }
 }else if(gid==='memory'){
  const pools=[['🐢','🌺','🐠'],['🚀','⭐','👾','🪐'],['🦁','🦋','🐒','🦜','🌴'],['📚','✏️','🔤','💡','🎨','🎵'],['2+2','4','3+3','6','5+5','10']];
  const count=Math.min(3+level,6),pool=pools[Math.min(level-1,pools.length-1)].slice(0,count);
  rounds.push({cards:shuffle([...pool,...pool].map((v,i)=>({id:i,value:v,open:false,matched:false}))),moves:0});
 }else if(gid==='pattern'){
  const iconSets=[['🔴','🔵'],['⭐','🌙','☁️'],['🐢','🐠','🐢','🌺'],['▲','●','■'],['🚀','⭐','⭐','🪐']];
  for(let i=0;i<5;i++){
   let unit;
   if(level===1) unit=iconSets[i%2];
   else if(level===2) unit=iconSets[1+(i%2)];
   else if(level===3) unit=[String(i+1),String(i+3),String(i+5)];
   else if(level===4) unit=i%2?['▲','▲','●']:['1','2','4','1','2','4'];
   else unit=i%2?[String(i+2),String((i+2)*2),String((i+2)*4)]:['A','B','B','A','B','B'];
   const length=level>=4?7:6,seq=Array.from({length},(_,j)=>unit[j%unit.length]),answer=unit[length%unit.length];
   const distractors=shuffle(['🔴','🔵','⭐','🌙','☁️','🐢','🐠','🌺','▲','●','■','A','B','1','2','3','4','6','8','10'].filter(x=>x!==answer)).slice(0,3);
   rounds.push({prompt:'Complete the pattern',sequence:seq,answer:String(answer),tiles:shuffle([String(answer),...distractors]),placed:null,answered:false});
  }
 }else if(gid==='sorting'){
  const banks=[
   {bins:['Animals','Food'],items:[['🐶','Animals'],['🍎','Food'],['🐱','Animals'],['🍌','Food'],['🐟','Animals'],['🥕','Food']]},
   {bins:['Land','Water'],items:[['🦁','Land'],['🐬','Water'],['🐘','Land'],['🐳','Water'],['🐒','Land'],['🐙','Water']]},
   {bins:['Mammal','Fish'],items:[['Whale','Mammal'],['Shark','Fish'],['Dolphin','Mammal'],['Tuna','Fish'],['Seal','Mammal'],['Trout','Fish']]},
   {bins:['Even','Odd'],items:[['12','Even'],['15','Odd'],['24','Even'],['31','Odd'],['42','Even'],['53','Odd']]},
   {bins:['Renewable','Non-renewable'],items:[['Solar','Renewable'],['Coal','Non-renewable'],['Wind','Renewable'],['Oil','Non-renewable'],['Hydro','Renewable'],['Gas','Non-renewable']]}
  ];
  const b=banks[level-1];rounds.push({prompt:'Sort every card into the correct basket',bins:b.bins,items:shuffle(b.items.map((x,i)=>({id:i,label:x[0],target:x[1],placed:null}))),selected:null,mistakes:0});
 }else if(gid==='fishing'){
  for(let i=0;i<5;i++){
   let prompt,answer,values;
   if(age<=5&&level<=2){const set=['red','blue','green','yellow'];answer=set[(i+level)%set.length];prompt=`Catch the word “${answer}”`;values=shuffle(set);}
   else{const a=level+i+1,b=Math.max(1,(i%3)+level),op=level>=4&&a>b?'-':'+';answer=String(op==='+'?a+b:a-b);prompt=`Catch the answer: ${a} ${op} ${b}`;values=shuffle([answer,String(Number(answer)+1),String(Math.max(0,Number(answer)-1)),String(Number(answer)+2)]);}
   rounds.push({prompt,answer,fish:values.map((v,n)=>({value:String(v),lane:n%2,delay:n*.35,caught:false})),misses:0});
  }
 }else if(gid==='story'){
  const banks=[
   [['The','turtle','swims'],['Lilo','finds','a','shell'],['Stitch','is','very','happy']],
   [['The','blue','fish','jumps'],['We','build','a','sandcastle'],['The','rocket','flies','high']],
   [['A','tiny','turtle','crossed','the','warm','sand'],['The','silver','ocean','sparkled','at','night']],
   [['Stitch','sprinted','toward','the','glowing','rocket'],['Lilo','carefully','followed','the','hidden','map']],
   [['After','the','storm','the','friends','shared','their','treasure'],['Beneath','the','moonlight','a','silver','wave','curled','like','a','ribbon']]
  ];
  for(let i=0;i<3;i++){const words=banks[level-1][i%banks[level-1].length];rounds.push({prompt:'Build the sentence in the correct order',answer:words.join(' '),words:shuffle(words.map((w,n)=>({id:n,text:w,used:false}))),built:[],answered:false});}
 }else if(gid==='maze'){
  const sizes=[5,6,7,8,9],size=sizes[level-1];
  for(let i=0;i<3;i++)rounds.push(makeMaze(size,i+level));
 }
 return rounds;
}
function makeMaze(size,seed){
 const grid=Array.from({length:size},()=>Array(size).fill(1));let x=0,y=0;grid[y][x]=0;
 while(x<size-1||y<size-1){if(x===size-1)y++;else if(y===size-1)x++;else if(((x+y+seed)*7)%3===0)y++;else x++;grid[y][x]=0;}
 for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++)if(grid[yy][xx]===1&&((xx*11+yy*7+seed)%4===0))grid[yy][xx]=0;
 return {prompt:'Guide the monkey to the bananas',grid,pos:{x:0,y:0},goal:{x:size-1,y:size-1},moves:0,answered:false};
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function rewardCorrect(amount=12){const p=active(),cg=p.currentGame;cg.score++;p.stars+=amount;p.rewards.coins+=3;playSound('correct')}
function markRoundComplete(){const p=active(),cg=p.currentGame,r=cg.rounds[cg.round];r.answered=true;rewardCorrect();save();render()}
function gameAnswer(choice){const p=active(),cg=p.currentGame,r=cg.rounds[cg.round];if(r.answered)return;r.choice=String(choice);r.correct=String(choice)===String(r.answer);r.answered=true;if(r.correct)rewardCorrect();else playSound('wrong');save();render()}
function popBalloon(index){const p=active(),cg=p.currentGame,r=cg.rounds[cg.round],b=r.balloons[index];if(r.answered||b.popped)return;b.popped=true;if(b.value===r.answer){r.correct=true;r.choice=b.value;r.answered=true;rewardCorrect();confetti(18)}else{r.misses++;playSound('wrong')}save();render()}
function choosePattern(value){const p=active(),r=p.currentGame.rounds[p.currentGame.round];if(r.answered)return;r.placed=String(value);r.choice=String(value);r.correct=String(value)===String(r.answer);r.answered=true;if(r.correct)rewardCorrect();else playSound('wrong');save();render()}
let draggedSort=null;
function sortDragStart(index,e){draggedSort=index;if(e&&e.dataTransfer)e.dataTransfer.setData('text/plain',String(index))}
function selectSortItem(index){const r=active().currentGame.rounds[active().currentGame.round];if(r.answered||r.items[index].placed)return;r.selected=index;save();render()}
function dropSort(bin,e){if(e)e.preventDefault();const p=active(),cg=p.currentGame,r=cg.rounds[cg.round];let index=draggedSort;if(e&&e.dataTransfer){const raw=e.dataTransfer.getData('text/plain');if(raw!=='')index=Number(raw)}if(index==null&&r.selected!=null)index=r.selected;if(index==null)return;const item=r.items[index];if(!item||item.placed)return;if(item.target===bin){item.placed=bin;r.selected=null;playSound('correct');p.stars+=4;p.rewards.coins+=1;if(r.items.every(x=>x.placed)){r.answered=true;cg.score++;playSound('celebrate')}}else{r.mistakes++;playSound('wrong')}draggedSort=null;save();render()}
function catchFish(index){const p=active(),cg=p.currentGame,r=cg.rounds[cg.round],f=r.fish[index];if(r.answered||f.caught)return;f.caught=true;if(f.value===r.answer){r.choice=f.value;r.correct=true;r.answered=true;rewardCorrect();}else{r.misses++;playSound('wrong')}save();render()}
function storyWord(index){const p=active(),cg=p.currentGame,r=cg.rounds[cg.round],w=r.words[index];if(r.answered||w.used)return;w.used=true;r.built.push({index,text:w.text});playSound('tap');save();render()}
function storyUndo(){const r=active().currentGame.rounds[active().currentGame.round];if(r.answered||!r.built.length)return;const x=r.built.pop();r.words[x.index].used=false;save();render()}
function storyCheck(){const p=active(),cg=p.currentGame,r=cg.rounds[cg.round];if(r.answered)return;r.choice=r.built.map(x=>x.text).join(' ');r.correct=r.choice===r.answer;r.answered=true;if(r.correct)rewardCorrect(18);else playSound('wrong');save();render()}
function moveMaze(dx,dy){const p=active(),cg=p.currentGame,r=cg.rounds[cg.round];if(r.answered)return;const nx=r.pos.x+dx,ny=r.pos.y+dy;if(ny<0||nx<0||ny>=r.grid.length||nx>=r.grid.length||r.grid[ny][nx]===1){playSound('wrong');return}r.pos={x:nx,y:ny};r.moves++;playSound('tap');if(nx===r.goal.x&&ny===r.goal.y){r.answered=true;rewardCorrect(20)}save();render()}
function memoryFlip(index){const p=active(),cg=p.currentGame,r=cg.rounds[0],card=r.cards[index];if(card.open||card.matched||r.locked)return;card.open=true;const open=r.cards.filter(c=>c.open&&!c.matched);if(open.length===2){r.moves++;r.locked=true;if(open[0].value===open[1].value){open.forEach(c=>c.matched=true);r.locked=false;playSound('correct');if(r.cards.every(c=>c.matched)){cg.score=5;p.stars+=60;p.rewards.coins+=15;setTimeout(()=>finishGameLevel(),350)}}else{playSound('wrong');setTimeout(()=>{open.forEach(c=>c.open=false);r.locked=false;save();render()},700)}}save();render()}
function nextGameRound(){const p=active(),cg=p.currentGame;if(cg.round<cg.rounds.length-1){cg.round++;save();render()}else finishGameLevel()}
function finishGameLevel(){const p=active(),cg=p.currentGame,g=games.find(x=>x.id===cg.gameId),pr=gameProgress(p,g.id);if(!cg.daily){if(!pr.completed.includes(cg.level))pr.completed.push(cg.level);pr.completed.sort((a,b)=>a-b);if(cg.level<5)pr.unlocked=Math.max(pr.unlocked,cg.level+1)}else p.daily={date:todayKey(),completed:true};p.rewards.shells+=cg.level*2;if(cg.level===5)p.rewards.gems+=1;const entry={id:id(),date:new Date().toLocaleDateString(),icon:g.icon,title:g.title,level:cg.level,text:`${p.name} completed Level ${cg.level} of ${g.title} and earned ${cg.score||5} shining stars!`};p.book.unshift(entry);p.book=p.book.slice(0,50);if(p.weekly.week!==weekKey())p.weekly={week:weekKey(),clues:0,claimed:false};p.weekly.clues=Math.min(5,p.weekly.clues+1);p.lastGame={gameId:g.id,level:cg.level,daily:cg.daily};p.currentGame=null;state.screen='game-complete';save();playSound(cg.level===5?'treasure':'celebrate');render();setTimeout(()=>{confetti();fireworks()},60)}
function playDaily(){const p=active();if(p.daily.date===todayKey()&&p.daily.completed)return;const index=Math.abs([...todayKey()].reduce((n,c)=>n+c.charCodeAt(0),0))%games.length;startGameLevel(games[index].id,Math.min(5,Math.max(1,Math.ceil(p.age/3))),true)}
function claimWeekly(){const p=active();if(p.weekly.clues<5||p.weekly.claimed)return;p.weekly.claimed=true;p.rewards.gems+=3;p.rewards.coins+=50;p.rewards.stickers.push(['🌈','🏝️','🚀','🐢','🌺'][p.rewards.stickers.length%5]);save();playSound('treasure');render();setTimeout(confetti,50)}

function getAudio(){if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;audioCtx=new C()}if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function note(freq,start,dur,type='sine',gain=.11){const ctx=getAudio(),o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime+start);g.gain.setValueAtTime(.0001,ctx.currentTime+start);g.gain.exponentialRampToValueAtTime(gain,ctx.currentTime+start+.012);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+start+dur);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+start);o.stop(ctx.currentTime+start+dur+.03)}
function noise(start=.0,dur=.15,gain=.045){const ctx=getAudio(),len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();src.buffer=buf;f.type='highpass';f.frequency.value=900;g.gain.value=gain;src.connect(f);f.connect(g);g.connect(ctx.destination);src.start(ctx.currentTime+start)}
function toggleSound(){state.settings.sound=!state.settings.sound;save();if(state.settings.sound)playSound('sparkle');render()}
function toggleMusic(){state.settings.music=!state.settings.music;save();state.settings.music?startMusic():stopMusic();render()}
function startMusic(){if(!state.settings.music||musicTimer)return;const melody=[261.63,329.63,392,523.25,392,329.63,293.66,392];const tick=()=>{if(!state.settings.music)return stopMusic();const f=melody[musicStep++%melody.length];note(f,0,.32,'triangle',.025);note(f/2,0,.42,'sine',.012)};tick();musicTimer=setInterval(tick,430)}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function playSound(type){if(!state.settings.sound)return;try{const sounds={tap:()=>{note(520,0,.07,'sine',.07);note(690,.05,.08,'triangle',.05)},whoosh:()=>{noise(0,.24,.055);note(330,0,.18,'sine',.05);note(660,.1,.18,'sine',.05)},rocket:()=>{noise(0,.45,.06);[220,330,440,660].forEach((f,i)=>note(f,i*.08,.22,'sawtooth',.035))},correct:()=>{[523,659,784,1047].forEach((f,i)=>note(f,i*.075,.2,'triangle',.09));noise(.18,.12,.025)},wrong:()=>{note(330,0,.12,'triangle',.06);note(260,.12,.16,'sine',.05);note(390,.27,.12,'sine',.04)},sparkle:()=>{[880,1175,1568].forEach((f,i)=>note(f,i*.06,.18,'sine',.06))},celebrate:()=>{[523,659,784,1047,1319].forEach((f,i)=>note(f,i*.10,.28,'triangle',.11));setTimeout(()=>{noise(0,.35,.055);[784,988,1175].forEach((f,i)=>note(f,i*.08,.35,'sine',.06))},350)},treasure:()=>{[392,523,659,784,1047].forEach((f,i)=>note(f,i*.12,.3,'triangle',.09));noise(.45,.2,.04)}};(sounds[type]||sounds.tap)()}catch{}}
function confetti(){const c=document.createElement('div');c.className='confetti-layer';for(let i=0;i<70;i++){const s=document.createElement('i');s.style.left=Math.random()*100+'%';s.style.animationDelay=Math.random()*.7+'s';s.style.setProperty('--drift',(Math.random()*300-150)+'px');s.textContent=['⭐','🌺','✨','🎉','🐚','🌈','💫'][i%7];c.appendChild(s)}document.body.appendChild(c);setTimeout(()=>c.remove(),3200)}
function fireworks(){const f=document.createElement('div');f.className='fireworks';for(let i=0;i<6;i++){const b=document.createElement('span');b.style.left=(12+Math.random()*76)+'%';b.style.top=(10+Math.random()*55)+'%';b.style.animationDelay=(Math.random()*.8)+'s';f.appendChild(b)}document.body.appendChild(f);setTimeout(()=>f.remove(),2600)}

function header(){const p=active();return `<div class="topbar"><button class="brand brand-button" onclick="setScreen('${p?'map':'players'}')">🌈 WonderQuest</button><div class="header-actions"><button class="sound-btn" onclick="toggleMusic()" aria-label="${state.settings.music?'Turn music off':'Turn music on'}">${state.settings.music?'🎵':'🎶'}</button><button class="sound-btn" onclick="toggleSound()" aria-label="${state.settings.sound?'Mute sounds':'Turn sounds on'}">${state.settings.sound?'🔊':'🔇'}</button>${p?`<button class="nav-mini" onclick="setScreen('arcade')">🎮 Games</button><button class="nav-mini" onclick="setScreen('book')">📖 Book</button><button class="player-pill" onclick="setScreen('parent')">${p.avatar?`<img src="${p.avatar}" alt="">`:''}${escapeHtml(p.name)} · ⭐ ${p.stars}</button>`:''}</div></div>`}
function gameShell(g,cg,body,feedback=''){
 const r=cg.rounds[cg.round],progress=((cg.round+1)/cg.rounds.length)*100;
 return `<main class="panel center screen-enter"><div class="mission-title"><h2>${g.icon} ${g.title}</h2><span class="level-chip">Level ${cg.level}</span></div><div class="progress"><span style="width:${progress}%"></span></div><p class="small">Round ${cg.round+1} of ${cg.rounds.length}</p>${body}${feedback}</main>`;
}
function roundFeedback(r,cg,successText='Brilliant work!'){
 if(!r.answered)return '';
 const good=r.correct!==false;
 return `<div class="toast ${good?'good':'try'} pop-in">${good?successText:`Great try! The correct answer was ${escapeHtml(r.answer)}.`}</div><button class="btn" onclick="nextGameRound()">${cg.round===cg.rounds.length-1?'Finish Game':'Next Round'} →</button>`;
}
function renderRealGame(g,cg,r){
 if(g.id==='memory')return gameShell(g,cg,`<p>Turn over two cards and find every pair.</p><div class="memory-grid">${r.cards.map((c,i)=>`<button class="memory-card ${c.open||c.matched?'open':''} ${c.matched?'matched':''}" onclick="memoryFlip(${i})">${c.open||c.matched?c.value:'❓'}</button>`).join('')}</div><p class="small">Moves: ${r.moves}</p>`);
 if(g.id==='balloon')return gameShell(g,cg,`<div class="question">${r.prompt}</div><div class="balloon-sky">${r.balloons.map((b,i)=>`<button class="real-balloon ${b.popped?'popped':''}" style="--x:${b.x}%;--delay:${b.delay}s;--balloon:${b.colour}" onclick="popBalloon(${i})" ${b.popped||r.answered?'disabled':''}><span>${b.value}</span></button>`).join('')}</div><p class="small">Tap the balloon before it floats away · Misses: ${r.misses}</p>`,roundFeedback(r,cg,'Pop! Perfect balloon!'));
 if(g.id==='pattern')return gameShell(g,cg,`<div class="question">${r.prompt}</div><div class="pattern-track">${r.sequence.map(x=>`<span>${x}</span>`).join('')}<span class="pattern-gap ${r.placed?'filled':''}">${r.placed||'?'}</span></div><div class="tile-rack">${r.tiles.map(x=>`<button class="pattern-tile" onclick="choosePattern('${escapeHtml(x)}')" ${r.answered?'disabled':''}>${x}</button>`).join('')}</div>`,roundFeedback(r,cg,'Rocket pattern complete!'));
 if(g.id==='sorting')return gameShell(g,cg,`<div class="question">${r.prompt}</div><div class="sort-items">${r.items.map((it,i)=>it.placed?'':`<button draggable="true" ondragstart="sortDragStart(${i},event)" onclick="selectSortItem(${i})" class="sort-card ${r.selected===i?'selected':''}">${it.label}</button>`).join('')}</div><div class="sort-bins">${r.bins.map(bin=>`<button class="sort-bin" ondragover="event.preventDefault()" ondrop="dropSort('${escapeHtml(bin)}',event)" onclick="dropSort('${escapeHtml(bin)}')"><strong>${bin}</strong><span>${r.items.filter(x=>x.placed===bin).map(x=>x.label).join(' · ')||'Drop cards here'}</span></button>`).join('')}</div><p class="small">Drag a card, or tap a card then tap its basket · Mistakes: ${r.mistakes}</p>`,r.answered?`<div class="toast good pop-in">Everything is sorted!</div><button class="btn" onclick="nextGameRound()">Finish Game →</button>`:'');
 if(g.id==='fishing')return gameShell(g,cg,`<div class="question">${r.prompt}</div><div class="ocean-game">${r.fish.map((f,i)=>`<button class="swimming-fish ${f.caught?'caught':''}" style="--lane:${f.lane};--delay:${f.delay}s" onclick="catchFish(${i})" ${f.caught||r.answered?'disabled':''}><span>🐟</span><b>${f.value}</b></button>`).join('')}</div><p class="small">Catch the correct fish · Misses: ${r.misses}</p>`,roundFeedback(r,cg,'You caught the right fish!'));
 if(g.id==='story')return gameShell(g,cg,`<div class="question">${r.prompt}</div><div class="story-line">${r.built.length?r.built.map(x=>`<span>${x.text}</span>`).join(''):'<em>Tap words below…</em>'}</div><div class="word-bank">${r.words.map((w,i)=>`<button class="word-card" onclick="storyWord(${i})" ${w.used||r.answered?'disabled':''}>${w.text}</button>`).join('')}</div><div class="actions centered"><button class="btn secondary" onclick="storyUndo()" ${!r.built.length||r.answered?'disabled':''}>Undo</button><button class="btn" onclick="storyCheck()" ${!r.built.length||r.answered?'disabled':''}>Check Story</button></div>`,roundFeedback(r,cg,'Beautiful sentence!'));
 if(g.id==='maze'){const cells=r.grid.map((row,y)=>row.map((cell,x)=>{let v='';if(x===r.pos.x&&y===r.pos.y)v='🐒';else if(x===r.goal.x&&y===r.goal.y)v='🍌';return `<div class="maze-cell ${cell?'wall':'path'}">${v}</div>`}).join('')).join('');return gameShell(g,cg,`<div class="question">${r.prompt}</div><div class="maze-board" style="--maze-size:${r.grid.length}">${cells}</div><div class="maze-controls"><button onclick="moveMaze(0,-1)">⬆️</button><button onclick="moveMaze(-1,0)">⬅️</button><button onclick="moveMaze(0,1)">⬇️</button><button onclick="moveMaze(1,0)">➡️</button></div><p class="small">Moves: ${r.moves}</p>`,r.answered?`<div class="toast good pop-in">You found the bananas!</div><button class="btn" onclick="nextGameRound()">${cg.round===cg.rounds.length-1?'Finish Game':'Next Maze'} →</button>`:'');}
 return gameShell(g,cg,'<p>Game loading…</p>');
}

function render(){const app=document.getElementById('app');let html='<div class="island-decor" aria-hidden="true"><span class="cloud c1">☁️</span><span class="cloud c2">☁️</span><span class="butterfly b1">🦋</span><span class="butterfly b2">🦋</span><span class="floating-star s1">✨</span><span class="floating-star s2">⭐</span><div class="wave w1"></div><div class="wave w2"></div><span class="fish f1">🐠</span><span class="fish f2">🐟</span></div><div class="shell">'+header();const p=active();
 if(state.screen==='players'){html+=`<main class="panel center screen-enter"><div class="hero"><img class="guide-float" src="/assets/lilo.webp"><div><h1>Who’s playing?</h1><p>Choose an adventurer and continue where you left off.</p></div><img class="guide-bounce" src="/assets/stitch.png"></div><div class="grid">${state.players.map(x=>`<button class="card player-card" onclick="selectPlayer('${x.id}')">${avatarHtml(x)}<h3>${escapeHtml(x.name)}</h3><div>Age ${x.age} · ⭐ ${x.stars}</div><div class="small">${x.currentMission?'Adventure in progress':totalLevelsDone(x)+' of 30 levels complete'}</div></button>`).join('')}<button class="card" onclick="setScreen('new')"><div class="emoji">➕</div><h3>New Adventurer</h3><div>Name, age and optional photo</div></button></div></main>`}
 else if(state.screen==='new'){html+=`<main class="panel screen-enter"><div class="form"><h1>New Adventurer</h1><p>These details are asked once and saved on this device.</p><form onsubmit="addPlayer(event)"><label>Profile picture <span class="small">(optional)</span></label><div class="avatar-upload"><img id="avatarPreview" class="avatar large" hidden alt="Photo preview"><input type="file" accept="image/*" onchange="previewAvatar(event)"></div><label>Name</label><input name="name" placeholder="First name (optional)" maxlength="30"><label>Age</label><select name="age">${Array.from({length:11},(_,i)=>i+2).map(a=>`<option>${a}</option>`).join('')}</select><div class="actions"><button class="btn">Start Adventure</button><button type="button" class="btn secondary" onclick="setScreen('players')">Back</button></div></form></div></main>`}
 else if(state.screen==='resume'){const m=missions.find(x=>x.id===p.currentMission.missionId);html+=`<main class="panel center screen-enter"><div class="guide-row"><img src="/assets/stitch.png"><div><h2>Welcome back, ${escapeHtml(p.name)}!</h2><p>You stopped during <strong>${m.title}, Level ${p.currentMission.level}</strong>. Continue at question ${p.currentMission.index+1}.</p></div></div><div class="actions centered"><button class="btn" onclick="setScreen('mission')">Continue Adventure ▶</button><button class="btn secondary" onclick="setScreen('map')">Choose another</button></div></main>`}
 else if(state.screen==='map'){html+=`<main class="panel screen-enter"><div class="hero"><img class="guide-float" src="/assets/lilo.webp"><div><h1>Aloha, ${escapeHtml(p.name)}!</h1><p>Each world has five levels. Finish a level to unlock the next.</p><div class="stats"><div class="stat">⭐ ${p.stars} Stars</div><div class="stat">🏅 ${p.badges.length} World Badges</div><div class="stat">🎯 ${totalLevelsDone(p)}/30 Levels</div></div></div><img class="guide-bounce" src="/assets/stitch.png"></div><div class="feature-strip"><button class="feature-card arcade-card" onclick="setScreen('arcade')"><span>🎮</span><div><strong>Learning Games Arcade</strong><small>Play six game styles across 30 levels</small></div></button><button class="feature-card daily-card" onclick="playDaily()"><span>🎁</span><div><strong>${p.daily.date===todayKey()&&p.daily.completed?'Daily Challenge Complete':'Today’s Challenge'}</strong><small>${p.daily.date===todayKey()&&p.daily.completed?'Come back tomorrow!':'Earn bonus shells and coins'}</small></div></button><button class="feature-card book-card" onclick="setScreen('book')"><span>📖</span><div><strong>Adventure Book</strong><small>${p.book.length} pages collected</small></div></button></div><div class="grid">${missions.map(m=>{const pr=progressFor(p,m.id),done=pr.completed.length;return `<button class="card world-card" onclick="selectMission('${m.id}')"><div class="emoji">${done===5?'✅':m.icon}</div><h3>${m.title}</h3><div>${m.intro}</div><div class="mini-progress"><span style="width:${done*20}%"></span></div><p class="small">${done}/5 levels complete · ${done===5?'World mastered!':'Level '+pr.unlocked+' unlocked'}</p></button>`}).join('')}</div></main>`}
 else if(state.screen==='levels'){const m=missions.find(x=>x.id===state.selectedMissionId),pr=progressFor(p,m.id);html+=`<main class="panel screen-enter"><div class="guide-row"><img src="${m.guide==='Lilo'?'/assets/lilo.webp':'/assets/stitch.png'}"><div><h1>${m.icon} ${m.title}</h1><p>${m.intro}</p></div></div><div class="level-grid">${[1,2,3,4,5].map(l=>{const done=pr.completed.includes(l),locked=l>pr.unlocked;return `<button class="level-card ${done?'level-done':''} ${locked?'level-locked':''}" ${done||locked?'disabled':''} onclick="startLevel('${m.id}',${l})"><span class="level-number">${done?'✓':locked?'🔒':l}</span><strong>Level ${l}</strong><small>${done?'Completed':locked?'Complete Level '+(l-1)+' first':difficultyLabel(l)}</small></button>`}).join('')}</div><div class="actions"><button class="btn secondary" onclick="setScreen('map')">← Back to worlds</button></div></main>`}
 else if(state.screen==='mission'){const cm=p.currentMission,m=missions.find(x=>x.id===cm.missionId),q=cm.questions[cm.index];html+=`<main class="panel screen-enter"><div class="guide-row"><img class="guide-pulse ${q.answered?(q.wasCorrect?'guide-celebrate':'guide-encourage'):''}" src="${m.guide==='Lilo'?'/assets/lilo.webp':'/assets/stitch.png'}"><div><strong>${m.guide} says:</strong><p>${m.intro}</p></div></div><div class="mission-title"><h2>${m.icon} ${m.title}</h2><span class="level-chip">Level ${cm.level}</span></div><div class="progress"><span style="width:${((cm.index+1)/cm.questions.length)*100}%"></span></div><p class="small">Challenge ${cm.index+1} of ${cm.questions.length}</p><div class="question">${q.text}</div><div class="answers">${q.options.map((a,i)=>`<button class="answer ${q.answered&&i===q.correct?'answer-correct':''} ${q.answered&&i===q.choice&&!q.wasCorrect?'answer-wrong':''}" onclick="answer(${i})" ${q.answered?'disabled':''}>${a}</button>`).join('')}</div>${q.answered?`<div class="toast ${q.wasCorrect?'good':'try'} pop-in">${q.wasCorrect?'Fantastic! You earned 10 stars.':'Great try! The answer is '+q.options[q.correct]+'.'}</div><div class="center"><button class="btn" onclick="nextQuestion()">${cm.index===cm.questions.length-1?'Complete Level':'Next Challenge'} →</button></div>`:''}</main>`}
 else if(state.screen==='complete'){const last=p.lastCompleted,m=missions.find(x=>x.id===last.missionId),isMaster=last.level===5;html+=`<main class="panel center screen-enter celebration"><div class="trophy">${isMaster?'🏆':'⭐'}</div><h1>${isMaster?'World Mastered!':'Level Complete!'}</h1><p>${escapeHtml(p.name)} completed <strong>${m.title} — Level ${last.level}</strong>.</p><p>${isMaster?'You earned the world badge!':'Level '+(last.level+1)+' is now unlocked.'}</p><div class="actions centered"><button class="btn" onclick="selectMission('${m.id}')">${isMaster?'View Levels':'Play Next Level'} →</button><button class="btn secondary" onclick="setScreen('map')">Choose a World</button></div></main>`}
 else if(state.screen==='arcade'){ensureExtras(p);html+=`<main class="panel screen-enter"><div class="hero"><img class="guide-float" src="/assets/lilo.webp"><div><h1>🎮 Learning Games Arcade</h1><p>Play, learn and unlock every level. Each game becomes harder as you progress.</p><div class="stats"><div class="stat">🪙 ${p.rewards.coins} Coins</div><div class="stat">🐚 ${p.rewards.shells} Shells</div><div class="stat">💎 ${p.rewards.gems} Gems</div></div></div><img class="guide-bounce" src="/assets/stitch.png"></div><section class="challenge-banner"><div><strong>Weekly Treasure Hunt</strong><p>Complete five game levels to open the treasure chest.</p><div class="clue-track">${[1,2,3,4,5].map(n=>`<span class="${n<=p.weekly.clues?'found':''}">${n<=p.weekly.clues?'🗝️':'❔'}</span>`).join('')}</div></div><button class="btn" ${p.weekly.clues<5||p.weekly.claimed?'disabled':''} onclick="claimWeekly()">${p.weekly.claimed?'Treasure Claimed ✓':'Open Treasure'}</button></section><div class="game-grid">${games.map(g=>{const pr=gameProgress(p,g.id);return `<button class="game-card" onclick="selectGame('${g.id}')"><div class="game-icon">${g.icon}</div><div class="game-world">${g.world}</div><h3>${g.title}</h3><p>${g.description}</p><div class="mini-progress"><span style="width:${pr.completed.length*20}%"></span></div><small>${pr.completed.length}/5 levels · ${pr.completed.length===5?'Mastered!':'Level '+pr.unlocked+' unlocked'}</small></button>`}).join('')}</div><div class="actions"><button class="btn secondary" onclick="setScreen('map')">← Adventure Map</button></div></main>`}
 else if(state.screen==='game-levels'){const g=games.find(x=>x.id===state.selectedGameId),pr=gameProgress(p,g.id);html+=`<main class="panel screen-enter"><div class="game-heading"><div class="game-icon giant">${g.icon}</div><div><h1>${g.title}</h1><p>${g.description}</p><strong>${g.skill}</strong></div></div><div class="level-grid">${[1,2,3,4,5].map(l=>{const done=pr.completed.includes(l),locked=l>pr.unlocked;return `<button class="level-card ${done?'level-done':''} ${locked?'level-locked':''}" ${done||locked?'disabled':''} onclick="startGameLevel('${g.id}',${l})"><span class="level-number">${done?'✓':locked?'🔒':l}</span><strong>Level ${l}</strong><small>${done?'Completed':locked?'Finish Level '+(l-1):difficultyLabel(l)}</small></button>`}).join('')}</div><div class="actions"><button class="btn secondary" onclick="setScreen('arcade')">← All Games</button></div></main>`}
 else if(state.screen==='game'){const cg=p.currentGame,g=games.find(x=>x.id===cg.gameId),r=cg.rounds[cg.round];html+=renderRealGame(g,cg,r)}
 else if(state.screen==='game-complete'){const x=p.lastGame,g=games.find(y=>y.id===x.gameId);html+=`<main class="panel center screen-enter celebration"><div class="trophy">${x.level===5?'🏆':'🎁'}</div><h1>${x.daily?'Daily Challenge Complete!':x.level===5?'Game Mastered!':'Game Level Complete!'}</h1><p>You added a new page to your Adventure Book.</p><div class="reward-row"><span>⭐ Stars</span><span>🪙 Coins</span><span>🐚 Shells</span>${x.level===5?'<span>💎 Gem</span>':''}</div><div class="actions centered"><button class="btn" onclick="setScreen('book')">Read Adventure Book</button><button class="btn secondary" onclick="${x.daily?"setScreen('arcade')":`selectGame('${g.id}')`}">${x.daily?'Games Arcade':'Next Level'}</button></div></main>`}
 else if(state.screen==='book'){ensureExtras(p);html+=`<main class="panel screen-enter"><div class="book-header"><div><h1>📖 ${escapeHtml(p.name)}’s Adventure Book</h1><p>Every finished game becomes a page in your story.</p></div><div class="reward-shelf"><span>🪙 ${p.rewards.coins}</span><span>🐚 ${p.rewards.shells}</span><span>💎 ${p.rewards.gems}</span><span>🎟️ ${p.rewards.stickers.length}</span></div></div>${p.book.length?`<div class="book-pages">${p.book.map((e,i)=>`<article class="book-page"><div class="page-number">Page ${p.book.length-i}</div><div class="page-icon">${e.icon}</div><h3>${e.title}</h3><p>${e.text}</p><small>${e.date}</small></article>`).join('')}</div>`:`<div class="empty-book"><div>📚</div><h2>Your book is waiting!</h2><p>Complete a game to create the first page.</p><button class="btn" onclick="setScreen('arcade')">Play a Game</button></div>`}<div class="actions"><button class="btn secondary" onclick="setScreen('map')">← Adventure Map</button></div></main>`}
 else if(state.screen==='parent'){html+=`<main class="panel screen-enter"><h1>Parent Dashboard</h1><p>Manage players, photos and progress. Resetting progress is the only way completed levels become playable again.</p><div class="players-list">${state.players.map(x=>`<div class="player-row"><div class="player-summary">${avatarHtml(x)}<div><strong>${escapeHtml(x.name)}</strong><div class="small">Age ${x.age} · ⭐ ${x.stars} · 🎯 ${totalLevelsDone(x)}/30</div><label class="photo-link">Change photo<input type="file" accept="image/*" onchange="updateAvatar('${x.id}',event)"></label></div></div><div class="actions"><button class="btn secondary" onclick="selectPlayer('${x.id}')">Play</button><button class="btn secondary" onclick="resetPlayer('${x.id}')">Reset progress</button><button class="btn danger" onclick="deletePlayer('${x.id}')">Delete</button></div></div>`).join('')}</div><div class="actions"><button class="btn" onclick="setScreen('new')">Add new player</button><button class="btn secondary" onclick="setScreen('${p?'map':'players'}')">Back</button><a class="btn secondary" href="/logout">Log out</a></div></main>`}
 app.innerHTML=html+'</div>';
}
function totalLevelsDone(p){return missions.reduce((n,m)=>n+progressFor(p,m.id).completed.length,0)}
function difficultyLabel(l){return ['Warm-up','Explorer','Adventurer','Champion','Master Challenge'][l-1]}
render();
if(state.settings.music)document.addEventListener('pointerdown',()=>startMusic(),{once:true});
