/* Pokémon Lab — enhanced single-page application */
/* Pokémon Lab — vanilla JS application layer */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, updateProfile } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAwKSCgw8oSxCFGELBP45CoUNI8DO3SmlA",
  authDomain: "pokemonlabproject.firebaseapp.com",
  projectId: "pokemonlabproject",
  storageBucket: "pokemonlabproject.firebasestorage.app",
  messagingSenderId: "782908120511",
  appId: "1:782908120511:web:0d9df724cf4270d75d550a",
  measurementId: "G-BKCS7MZSFG"
};
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// Keep the Firebase login session between page refreshes.
setPersistence(auth, browserLocalPersistence).catch(err => console.error('Firebase persistence error:', err));

const API='https://pokeapi.co/api/v2/';
const TYPE_COLORS={bug:'#79c842',dragon:'#6f5bd3',electric:'#f4c52e',fairy:'#e78bb9',fighting:'#c83d55',fire:'#f47b43',flying:'#7fa7e8',ghost:'#7158a8',grass:'#57ad63',ground:'#d5ad55',ice:'#65c9dc',normal:'#9da4ad',poison:'#9a5db1',psychic:'#e866a5',rock:'#9b8065',water:'#4f9ee8',dark:'#5d5367',steel:'#6f7e92'};
const TYPES=Object.keys(TYPE_COLORS);
const GEN_RANGES={1:[1,151],2:[152,251],3:[252,386],4:[387,493],5:[494,649],6:[650,721],7:[722,809],8:[810,905],9:[906,1025]};
const STARTERS=new Set(['bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard','squirtle','wartortle','blastoise','chikorita','bayleef','meganium','cyndaquil','quilava','typhlosion','totodile','croconaw','feraligatr','treecko','grovyle','sceptile','torchic','combusken','blaziken','mudkip','marshtomp','swampert','turtwig','grotle','torterra','chimchar','monferno','infernape','piplup','prinplup','empoleon','snivy','servine','serperior','tepig','pignite','emboar','oshawott','dewott','samurott','chespin','quilladin','chesnaught','fennekin','braixen','delphox','froakie','frogadier','greninja','rowlet','dartrix','decidueye','litten','torracat','incineroar','popplio','brionne','primarina','grookey','thwackey','rillaboom','scorbunny','raboot','cinderace','sobble','drizzile','inteleon','sprigatito','floragato','meowscarada','fuecoco','crocalor','skeledirge','quaxly','quaxwell','quaquaval']);
const LEGENDARIES=new Set(['articuno','zapdos','moltres','mewtwo','raikou','entei','suicune','lugia','ho-oh','regirock','regice','registeel','latias','latios','kyogre','groudon','rayquaza','uxie','mesprit','azelf','dialga','palkia','heatran','regigigas','giratina','cresselia','cobalion','terrakion','virizion','tornadus','thundurus','reshiram','zekrom','landorus','kyurem','xerneas','yveltal','zygarde','type-null','silvally','tapu-koko','tapu-lele','tapu-bulu','tapu-fini','cosmog','cosmoem','solgaleo','lunala','necrozma','zacian','zamazenta','eternatus','kubfu','urshifu','regieleki','regidrago','glastrier','spectrier','calyrex','enamorus','koraidon','miraidon','wo-chien','chien-pao','ting-lu','chi-yu']);
const MYTHICALS=new Set(['mew','celebi','jirachi','deoxys','phione','manaphy','darkrai','shaymin','arceus','victini','keldeo','meloetta','genesect','diancie','hoopa','volcanion','magearna','marshadow','zeraora','meltan','melmetal','zarude','pecharunt']);
const $=id=>document.getElementById(id); const qs=s=>document.querySelector(s); const qsa=s=>[...document.querySelectorAll(s)];
const defaultState={trainer:{name:'PokéTrainer',email:'',level:1,xp:0},collection:{},favorites:[],shiny:[],recent:[],teams:[],battleHistory:[],mysteryHistory:[],mysteryStreak:0,quiz:{score:0,streak:0,best:0},achievements:[],daily:{date:'',done:false},theme:'system',activity:[]};
let state=structuredClone(defaultState); let cache=new Map(); let currentPage='home'; let compareList=[]; let teamList=[]; let battleState=null; let quizState=null;
// Friend Battle state is separate from Quick Battle so the existing simulator remains untouched.
let mpRoomCode=null, mpRoomRole=null, mpRoomData=null, mpRoomUnsubscribe=null;
const mpRecordedRooms=new Set();
function loadState(){return structuredClone(defaultState)}
let saveTimer=null;
async function saveState(){
    updateGlobalUI();
    const user=auth.currentUser;
    if(!user)return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
        try{
            await setDoc(doc(db,'users',user.uid),{
                ...state,
                updatedAt:serverTimestamp()
            },{merge:true});
        }catch(err){
            console.error('Firestore save error:',err);
            toast('Could not save your lab data to Firebase.','error');
        }
    },250);
}
function addActivity(text){state.activity.unshift({text,time:new Date().toISOString()});state.activity=state.activity.slice(0,20)}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function cap(s){return String(s||'').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function imageOf(p){return p?.sprites?.other?.['official-artwork']?.front_default||p?.sprites?.other?.dream_world?.front_default||p?.sprites?.front_default||''}
function shinyImageOf(p){return p?.sprites?.other?.['official-artwork']?.front_shiny||p?.sprites?.front_shiny||imageOf(p)}
function typeBadge(t){return `<span class="type-badge" style="background:${TYPE_COLORS[t]||'#708090'}">${esc(t)}</span>`}
function loading(text='Fetching Pokémon data…'){return `<div class="loading-state"><div class="pokeball-loader"></div><h3>${esc(text)}</h3><p>Please wait while the lab contacts PokéAPI.</p></div>`}
function empty(icon='fa-box-open',title='Nothing here yet.',desc='Start exploring to populate this section.'){return `<div class="empty-state"><i class="fa-solid ${icon}"></i><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>`}
function errorState(title='Something went wrong.',desc='Please try again.'){return `<div class="error-state"><i class="fa-solid fa-triangle-exclamation"></i><h3>${esc(title)}</h3><p>${esc(desc)}</p><button class="btn ghost retry-btn" onclick="location.reload()">Retry</button></div>`}
function toast(message,type='success'){const el=document.createElement('div');el.className=`toast ${type}`;el.innerHTML=`<i class="fa-solid ${type==='error'?'fa-circle-exclamation':'fa-circle-check'}"></i><span>${esc(message)}</span>`;$('toastRoot').appendChild(el);setTimeout(()=>el.remove(),2800)}
async function api(path){if(cache.has(path))return cache.get(path);const p=fetch(API+path).then(r=>{if(!r.ok)throw new Error(`API ${r.status}`);return r.json()});cache.set(path,p);return p}
async function getPokemon(q){return api(`pokemon/${encodeURIComponent(String(q).trim().toLowerCase())}`)}
function setTheme(){const t=state.theme;if(t==='system'){document.body.classList.toggle('light',matchMedia('(prefers-color-scheme: light)').matches)}else document.body.classList.toggle('light',t==='light');const b=$('themeBtn');if(b)b.title=`Theme: ${t[0].toUpperCase()+t.slice(1)}`}
function cycleTheme(){state.theme=state.theme==='system'?'light':state.theme==='light'?'dark':'system';saveState();setTheme();toast(`Theme set to ${state.theme}`)}
function updateGlobalUI(){const n=state.trainer.name||'Trainer';['trainerName','homeTrainerName'].forEach(id=>{if($(id))$(id).textContent=n});if($('trainerAvatar'))$('trainerAvatar').textContent=(n.trim()[0]||'⚡').toUpperCase();const c=Object.keys(state.collection).length;const total=151;const pct=Math.min(100,Math.round(c/total*100));if($('sideProgressText'))$('sideProgressText').textContent=`${c} / ${total}`;if($('sideProgressBar'))$('sideProgressBar').style.width=pct+'%';if($('homeProgressPct'))$('homeProgressPct').textContent=pct+'%';if($('homeProgressCount'))$('homeProgressCount').textContent=`${c} / ${total}`;if($('homeProgressBar'))$('homeProgressBar').style.width=pct+'%';if($('homeProgressRing'))$('homeProgressRing').style.background=`conic-gradient(var(--blue) ${pct*3.6}deg,#253e60 0deg)`}
function showPage(page){currentPage=page;qsa('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${page}`));qsa('.nav-link[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));window.scrollTo({top:0,behavior:'smooth'});if(page==='home')loadHome();if(page==='battle')renderMultiplayerRoom();if(page==='collection')renderCollection();if(page==='favorites')renderFavorites();if(page==='shiny')renderShiny();if(page==='battleHistory')renderBattleHistory();if(page==='trainer')renderTrainer();if(page==='achievements')renderAchievements();if(page==='analytics')renderAnalytics();if(page==='daily')renderDaily();if(page==='regions')renderRegions();if(page==='typeLab')renderTypeLab();if(page==='quiz')startQuiz(quizState?.mode||'silhouette');if(page==='cryQuiz')renderCryQuiz();if(page==='pokedex')loadFeaturedPokedex();if(page==='advanced')renderAdvancedEmpty();if(page==='wiki')initWiki();if(page==='trainers')renderTrainerDirectory();if(page==='library')renderBookLibrary();$('sidebar').classList.remove('mobile-open');$('sidebarOverlay').classList.remove('show')}
function navigateFromEvent(e){const b=e.target.closest('[data-page]');if(b){e.preventDefault();showPage(b.dataset.page)}}
document.addEventListener('click',navigateFromEvent);
qsa('.nav-group-toggle').forEach(b=>b.addEventListener('click',()=>b.parentElement.classList.toggle('open')));
$('mobileMenu').addEventListener('click',()=>{$('sidebar').classList.add('mobile-open');$('sidebarOverlay').classList.add('show')});$('sidebarOverlay').addEventListener('click',()=>{$('sidebar').classList.remove('mobile-open');$('sidebarOverlay').classList.remove('show')});$('sidebarClose').addEventListener('click',()=>{$('sidebar').classList.remove('mobile-open');$('sidebarOverlay').classList.remove('show')});$('themeBtn').addEventListener('click',cycleTheme);$('quickProfile').addEventListener('click',()=>showPage('trainer'));$('trainerChip').addEventListener('click',()=>showPage('trainer'));$('logoutBtn').addEventListener('click',async()=>{try{await signOut(auth)}catch(err){console.error(err);toast('Logout failed.','error')}});
qsa('[data-toggle-password]').forEach(b=>b.addEventListener('click',()=>{const i=qs(b.dataset.togglePassword);i.type=i.type==='password'?'text':'password';b.innerHTML=`<i class="fa-solid ${i.type==='password'?'fa-eye':'fa-eye-slash'}"></i>`}));
qsa('.auth-tab').forEach(b=>b.addEventListener('click',()=>{qsa('.auth-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');const reg=b.dataset.auth==='register';$('loginForm').classList.toggle('hidden',reg);$('registerForm').classList.toggle('hidden',!reg)}));
async function loadUserState(user){
    const ref=doc(db,'users',user.uid);
    const snap=await getDoc(ref);
    const saved=snap.exists()?snap.data():{};
    state={...structuredClone(defaultState),...saved,trainer:{...structuredClone(defaultState.trainer),...(saved.trainer||{}),email:user.email||saved?.trainer?.email||'',name:saved?.trainer?.name||user.displayName||'PokéTrainer'}};
    delete state.updatedAt;
    updateGlobalUI();
    setTheme();
    if($('mysteryStreak'))$('mysteryStreak').textContent=state.mysteryStreak||0;
    renderMysteryHistory();
    renderDailyMini();
}

function firebaseErrorMessage(err, action='Firebase operation'){
    const messages={
      'auth/invalid-credential':'Incorrect email or password.',
      'auth/user-not-found':'No registered trainer was found with this email.',
      'auth/wrong-password':'Incorrect email or password.',
      'auth/invalid-email':'Please enter a valid email address.',
      'auth/email-already-in-use':'This email is already registered. Please log in instead.',
      'auth/weak-password':'Password must contain at least 6 characters.',
      'auth/too-many-requests':'Too many attempts. Please wait and try again.',
      'auth/operation-not-allowed':'Email/Password sign-in is not enabled in Firebase Authentication. Enable it in Firebase Console → Authentication → Sign-in method.',
      'auth/network-request-failed':'Firebase could not connect. Check your internet connection and make sure you are running the site from http://localhost or Firebase Hosting, not file://.',
      'permission-denied':'Firestore denied access. Check your Firestore Security Rules.',
      'failed-precondition':'Firestore is not configured correctly. Check that the Firestore database exists.',
      'unavailable':'Firestore is temporarily unavailable. Check your internet connection and try again.'
    };
    return messages[err?.code] || `${action} failed${err?.message ? ': '+err.message : '. Please try again.'}`;
}


function showAuthenticatedApp(){
    $('authView').classList.add('hidden');
    $('appShell').classList.remove('hidden');
}
function showLogin(){
    $('authView').classList.remove('hidden');
    $('appShell').classList.add('hidden');
}

$('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const email=$('loginEmail').value.trim().toLowerCase(),password=$('loginPassword').value;
    if(!email||!password)return;
    const btn=e.submitter; if(btn)btn.disabled=true;
    try{
        const credential=await signInWithEmailAndPassword(auth,email,password);
        await loadUserState(credential.user);
        showAuthenticatedApp();
        showPage('home');
        toast(`Welcome back, ${state.trainer.name||email}!`);
        e.target.reset();
    }catch(err){
        console.error('Firebase login error:',err);
        toast(firebaseErrorMessage(err,'Login'),'error');
    }finally{if(btn)btn.disabled=false;}
});

$('registerForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const name=$('registerName').value.trim(),email=$('registerEmail').value.trim().toLowerCase(),password=$('registerPassword').value;
    if(!name||!email||!password)return;
    if(password.length<6)return toast('Password must contain at least 6 characters.','error');
    const btn=e.submitter; if(btn)btn.disabled=true;
    try{
        const credential=await createUserWithEmailAndPassword(auth,email,password);
        const trainer={name,email,level:1,xp:0};
        try{ await updateProfile(credential.user,{displayName:name}); }catch(profileErr){ console.warn('Could not set Firebase display name:',profileErr); }
        state={...structuredClone(defaultState),trainer};
        await setDoc(doc(db,'users',credential.user.uid),{
            trainer,
            collection:{},favorites:[],shiny:[],recent:[],teams:[],battleHistory:[],mysteryHistory:[],mysteryStreak:0,
            quiz:{score:0,streak:0,best:0},achievements:[],daily:{date:'',done:false},theme:'system',activity:[],
            createdAt:serverTimestamp(),updatedAt:serverTimestamp()
        });
        updateGlobalUI();
        showAuthenticatedApp();
        showPage('home');
        toast(`Welcome, ${name}! Your trainer account and profile are saved in Firebase.`);
        e.target.reset();
    }catch(err){
        console.error('Firebase registration error:',err);
        toast(firebaseErrorMessage(err,'Registration'),'error');
    }finally{if(btn)btn.disabled=false;}
});

onAuthStateChanged(auth,async user=>{
    try{
        if(user){
            await loadUserState(user);
            showAuthenticatedApp();
            showPage('home');
        }else{
            clearBattleRoomLocal();
            state=structuredClone(defaultState);
            showLogin();
        }
    }catch(err){
        console.error('Firebase account data error:',err);
        state=structuredClone(defaultState);
        showLogin();
        toast(firebaseErrorMessage(err,'Loading your Firebase profile'),'error');
    }
});

$('globalSearch').addEventListener('keydown',async e=>{if(e.key!=='Enter')return;const v=e.target.value.trim();if(!v)return;showPage('pokedex');$('pokemonSearch').value=v;await searchPokemon(v);e.target.value=''});
async function searchPokemon(q){const value=(q??$('pokemonSearch').value).trim().toLowerCase();if(!value){$('pokedexResult').innerHTML=empty('fa-magnifying-glass','Search the Pokédex','Type a Pokémon name or Pokédex number above.');return}$('pokedexResult').innerHTML=loading(`Researching ${cap(value)}…`);try{const p=await getPokemon(value);recordRecent(p);addActivity(`Viewed ${cap(p.name)}`);awardXP(3);$('pokedexResult').innerHTML=detailResult(p)}catch(e){$('pokedexResult').innerHTML=errorState('Pokémon not found','Try a valid name such as Pikachu or a Pokédex number such as 25.')}}
$('pokemonSearchBtn').addEventListener('click',()=>searchPokemon());$('pokemonSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchPokemon()});qsa('[data-search]').forEach(b=>b.addEventListener('click',()=>{showPage('pokedex');$('pokemonSearch').value=b.dataset.search;searchPokemon(b.dataset.search)}));
async function loadFeaturedPokedex(){if($('pokedexResult').dataset.loaded)return;$('pokedexResult').innerHTML=loading('Loading online Pokédex…');try{const ids=[1,4,7,25,39,52,54,133,150,151,155,196];const ps=await Promise.all(ids.map(getPokemon));$('pokedexResult').innerHTML=`<div class="section-head"><div><span class="eyebrow">ONLINE POKÉDEX</span><h3>Featured records</h3></div><span>${ps.length} records loaded</span></div><div class="pokemon-grid">${ps.map(p=>cardHTML(p)).join('')}</div>`;$('pokedexResult').dataset.loaded='1'}catch{$('pokedexResult').innerHTML=errorState('Online Pokédex unavailable','Check your internet connection and retry.')}}
function cardHTML(p,{collectionCard=false,shiny=false}={}){const fav=state.favorites.includes(p.name);const col=!!state.collection[p.name];const img=shiny?shinyImageOf(p):imageOf(p);return `<article class="pokemon-card" style="--accent:${TYPE_COLORS[p.types[0]?.type.name]||'#708090'}"><div class="card-top"><span class="hp"><i class="fa-solid fa-heart-pulse"></i> ${p.stats?.[0]?.base_stat??'—'} HP</span><span class="dex">#${String(p.id).padStart(3,'0')}</span></div><img src="${img}" alt="${esc(p.name)}" loading="lazy"><h3>${esc(p.name)}</h3><div class="card-types">${(p.types||[]).map(t=>typeBadge(t.type.name)).join('')}</div><div class="card-stats"><div><b>${p.stats?.[1]?.base_stat??'—'}</b><span>ATTACK</span></div><div><b>${p.stats?.[2]?.base_stat??'—'}</b><span>DEFENSE</span></div><div><b>${p.stats?.[5]?.base_stat??'—'}</b><span>SPEED</span></div></div><div class="card-actions"><button class="mini-btn" data-detail="${esc(p.name)}"><i class="fa-solid fa-circle-info"></i> Info</button><button class="mini-btn ${fav?'active':''}" data-favorite="${esc(p.name)}" title="Favorite"><i class="fa-${fav?'solid':'regular'} fa-heart"></i></button><button class="mini-btn ${state.shiny.includes(p.name)?'active':''}" data-shiny="${esc(p.name)}" title="Shiny collected"><i class="fa-solid fa-star"></i></button><button class="mini-btn ${col?'active':''}" data-collect="${esc(p.name)}" title="Collection"><i class="fa-solid fa-${col?'check':'plus'}"></i></button></div></article>`}
document.addEventListener('click',async e=>{const detail=e.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail);return}const info=e.target.closest('[data-info]');if(info){openInfo(info.dataset.info);return}const openInfoBtn=e.target.closest('[data-open-info]');if(openInfoBtn){openInfo(openInfoBtn.dataset.openInfo);return}const fav=e.target.closest('[data-favorite]');if(fav){e.stopPropagation();toggleFavorite(fav.dataset.favorite);return}const shiny=e.target.closest('[data-shiny]');if(shiny){toggleShiny(shiny.dataset.shiny);return}const col=e.target.closest('[data-collect]');if(col){toggleCollection(col.dataset.collect);return}const evo=e.target.closest('[data-evo]');if(evo){openInfo(evo.dataset.evo);return}});
async function openInfo(name){
  const value=String(name||'').trim().toLowerCase();
  showPage('info');
  if(!$('infoResult')) return;
  if($('infoSearch')) $('infoSearch').value=value;
  $('infoResult').innerHTML=loading('Building research profile…');
  if(!value){
    $('infoResult').innerHTML=errorState('Enter a Pokémon name','Try Pikachu, Charizard or a Pokédex number such as 25.');
    return;
  }
  try{
    console.log('Info API: fetching Pokémon',value);
    const p=await getPokemon(value);
    console.log('Info API: Pokémon loaded',p);
    recordRecent(p);

    let species=null;
    let chain=null;
    try{
      species=await api(`pokemon-species/${p.id}`);
      console.log('Info API: species loaded',species);
      if(species?.evolution_chain?.url){
        chain=await api(species.evolution_chain.url.replace(API,''));
        console.log('Info API: evolution chain loaded',chain);
      }
    }catch(optionalError){
      console.warn('Info API: optional species/evolution data failed',optionalError);
    }

    $('infoResult').innerHTML=await infoHTML(p,species,chain);
    console.log('Info UI: rendered into #infoResult');
    awardXP(5);
  }catch(e){
    console.error('Info API error:',e);
    $('infoResult').innerHTML=errorState('Pokémon data could not be loaded',String(e?.message||'Check your internet connection and Pokémon name.'));
  }
}
function detailResult(p){return `<div class="info-hero"><div class="info-art"><img src="${imageOf(p)}" alt="${esc(p.name)}"></div><div class="info-copy"><span class="dex">#${String(p.id).padStart(3,'0')}</span><h2>${esc(p.name)}</h2><div class="card-types" style="justify-content:flex-start">${p.types.map(t=>typeBadge(t.type.name)).join('')}</div><p>${esc(p.flavor_text||'Research record loaded from PokéAPI.')}</p><div class="info-actions"><button class="btn primary" data-collect="${esc(p.name)}"><i class="fa-solid fa-plus"></i> Add to Collection</button><button class="btn ghost" data-favorite="${esc(p.name)}"><i class="fa-regular fa-heart"></i> Favorite</button><button class="btn ghost" data-page="info" data-open-info="${esc(p.name)}"><i class="fa-solid fa-dna"></i> Full Info</button></div><div class="data-row"><span>Height</span><b>${p.height/10} m</b></div><div class="data-row"><span>Weight</span><b>${p.weight/10} kg</b></div></div></div><div class="info-grid" style="margin-top:14px"><div class="data-panel"><h3>Base Stats</h3>${statBars(p)}</div><div class="data-panel"><h3>Abilities</h3><div class="coverage-list">${p.abilities.map(a=>`<span>${cap(a.ability.name)}</span>`).join('')}</div></div></div>`}

function statBars(p){const max=180;return `<div class="stat-bars">${p.stats.map(s=>`<div class="stat-line"><span>${cap(s.stat.name)}</span><div><i style="width:${Math.min(100,s.base_stat/max*100)}%"></i></div><b>${s.base_stat}</b></div>`).join('')}</div>`}
function flattenChain(node,arr=[]){if(!node)return arr;arr.push({name:node.species.name,details:node.evolution_details?.[0]||null});node.evolves_to?.forEach(n=>flattenChain(n,arr));return arr}
async function infoHTML(p,species,chain){species=species||{};const nodes=flattenChain(chain||null);const ps=await Promise.all(nodes.map(n=>getPokemon(n.name).catch(()=>null)));const moves=p.moves.slice(0,12).map(m=>m.move.name);const flavor=species.flavor_text_entries?.find(x=>x.language?.name==='en')?.flavor_text?.replace(/\s+/g,' ')||'No English flavor text available.';return `<div class="info-hero"><div class="info-art"><img src="${imageOf(p)}" alt="${esc(p.name)}"></div><div class="info-copy"><span class="dex">#${String(p.id).padStart(3,'0')} · ${cap(species.generation?.name||'')}</span><h2>${esc(p.name)}</h2><div class="card-types" style="justify-content:flex-start">${p.types.map(t=>typeBadge(t.type.name)).join('')}</div><p>${esc(flavor)}</p><div class="info-actions"><button class="btn primary" data-collect="${esc(p.name)}"><i class="fa-solid fa-plus"></i> Add to Collection</button><button class="btn ghost" data-favorite="${esc(p.name)}"><i class="fa-regular fa-heart"></i> Favorite</button><button class="btn ghost" data-page="battle"><i class="fa-solid fa-bolt"></i> Battle</button>${p.cries?.latest?`<button class="btn ghost" data-cry="${esc(p.name)}"><i class="fa-solid fa-volume-high"></i> Play Cry</button>`:''}</div><div class="data-row"><span>Height / Weight</span><b>${p.height/10} m · ${p.weight/10} kg</b></div></div></div><div class="info-tabs"><button class="info-tab active">OVERVIEW</button><button class="info-tab">EVOLUTION</button><button class="info-tab">STATS</button><button class="info-tab">MOVES</button><button class="info-tab">ABILITIES</button></div><div class="info-grid"><div class="data-panel"><h3>Stats</h3>${statBars(p)}</div><div class="data-panel"><h3>Abilities</h3><div class="coverage-list">${p.abilities.map(a=>`<span>${cap(a.ability.name)}</span>`).join('')}</div><h3 style="margin-top:18px">Forms</h3><div class="data-list"><div class="data-row"><span>Default</span><b>${p.is_default?'Yes':'Alternate form'}</b></div><div class="data-row"><span>Base experience</span><b>${p.base_experience||'—'}</b></div></div></div><div class="data-panel" style="grid-column:1/-1"><h3>Evolution Chain</h3><div class="evolution-chain">${ps.filter(Boolean).map((x,i)=>`${i?'<span class="evo-arrow"><i class="fa-solid fa-arrow-right"></i></span>':''}<div class="evo-node" data-evo="${esc(x.name)}"><img src="${imageOf(x)}" alt="${esc(x.name)}"><b>${esc(x.name)}</b><small>#${x.id}</small></div>`).join('')}</div></div><div class="data-panel"><h3>Moves</h3><div class="coverage-list">${moves.map(m=>`<span>${cap(m)}</span>`).join('')}</div></div><div class="data-panel"><h3>Type Profile</h3><div class="card-types" style="justify-content:flex-start">${p.types.map(t=>typeBadge(t.type.name)).join('')}</div><p style="font-size:9px;color:var(--muted);line-height:1.6">Use the Type Lab for detailed offensive/defensive effectiveness.</p></div></div>`}
document.addEventListener('click',e=>{const c=e.target.closest('[data-cry]');if(c)playCry(c.dataset.cry)});async function playCry(name){try{const p=await getPokemon(name);if(!p.cries?.latest)return toast('No cry is available for this Pokémon.','error');new Audio(p.cries.latest).play();awardXP(2);toast('Pokémon cry played')}catch{toast('Cry could not be played in this browser.','error')}}
$('infoSearchBtn').addEventListener('click',()=>searchInfoDetail($('infoSearch').value));$('infoSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchInfoDetail(e.target.value)});
async function searchByType(type){qsa('.type-filter').forEach(b=>b.classList.toggle('active',b.dataset.type===type));$('selectedType').innerHTML=`<strong>${cap(type)}</strong> · Loading every Pokémon in this type…`;$('typeResult').innerHTML=loading(`Loading ${cap(type)} Pokémon…`);try{const d=await api(`type/${type}`);const urls=d.pokemon.map(x=>x.pokemon.url.replace(API,''));const out=[];for(let i=0;i<urls.length;i+=15){const chunk=await Promise.all(urls.slice(i,i+15).map(api));out.push(...chunk);$('selectedType').textContent=`${cap(type)} · ${out.length} of ${urls.length} records loaded`;$('typeResult').innerHTML=out.map(p=>cardHTML(p)).join('')}$('selectedType').textContent=`${cap(type)} · ${out.length} Pokémon`;addActivity(`Explored ${type} type`);awardXP(4)}catch{$('typeResult').innerHTML=errorState('Type data unavailable','Could not load this type from PokéAPI.')}}
function buildTypes(){const els=['advType','attackType','defType1','defType2','dmgType'];els.forEach(id=>{const el=$(id);if(!el)return;if(id==='defType2')el.innerHTML='<option value="">None</option>';TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=cap(t);el.appendChild(o)})});$('typeButtons').innerHTML=TYPES.map(t=>`<button class="type-filter" data-type="${t}"><i class="type-dot" style="background:${TYPE_COLORS[t]}"></i>${cap(t)}</button>`).join('');qsa('.type-filter').forEach(b=>b.addEventListener('click',()=>searchByType(b.dataset.type)))}
buildTypes();
async function loadPokemonRange(range){const [a,b]=range;const max=Math.min(b,a+79);const arr=[];for(let i=a;i<=max;i++)arr.push(getPokemon(i));return Promise.all(arr)}
function renderAdvancedEmpty(){if($('advancedResult').dataset.loaded)return;$('advancedResult').innerHTML=empty('fa-sliders','Set your filters','Choose a generation, type or minimum stat and apply filters.');}
$('advancedSearchBtn').addEventListener('click',async()=>{const gen=$('advGen').value,type=$('advType').value,speed=+$('advSpeed').value||0,attack=+$('advAttack').value||0,cat=$('advCategory').value;$('advancedResult').innerHTML=loading('Filtering research records…');try{let ps=gen?await loadPokemonRange(GEN_RANGES[gen]):await loadPokemonRange([1,80]);if(type)ps=ps.filter(p=>p.types.some(t=>t.type.name===type));if(speed)ps=ps.filter(p=>p.stats[5].base_stat>=speed);if(attack)ps=ps.filter(p=>p.stats[1].base_stat>=attack);if(cat==='starter')ps=ps.filter(p=>STARTERS.has(p.name));if(cat==='legendary')ps=ps.filter(p=>LEGENDARIES.has(p.name));if(cat==='mythical')ps=ps.filter(p=>MYTHICALS.has(p.name));$('advancedResult').dataset.loaded='1';$('advancedResult').innerHTML=ps.length?ps.map(p=>cardHTML(p)).join(''):empty('fa-filter-circle-xmark','No matches','Try relaxing one of your filters.')}catch{$('advancedResult').innerHTML=errorState('Advanced search failed','Try again or choose fewer filters.')}});
function toggleCollection(name){if(state.collection[name]){delete state.collection[name];addActivity(`Removed ${cap(name)} from collection`);toast(`${cap(name)} removed`)}else{state.collection[name]={addedAt:Date.now()};addActivity(`Added ${cap(name)} to collection`);awardXP(10);toast(`${cap(name)} added to collection`)}saveState();renderCollection();loadHome()}
function toggleFavorite(name){const i=state.favorites.indexOf(name);if(i>=0){state.favorites.splice(i,1);toast(`${cap(name)} removed from favorites`)}else{state.favorites.push(name);awardXP(3);toast(`${cap(name)} added to favorites`)}saveState();if(currentPage==='favorites')renderFavorites()}
async function toggleShiny(name){if(state.shiny.includes(name)){state.shiny=state.shiny.filter(x=>x!==name);toast(`${cap(name)} removed from shiny collection`)}else{state.shiny.push(name);awardXP(12);toast(`${cap(name)} marked shiny collected`)}saveState();if(currentPage==='shiny')renderShiny()}
async function recordRecent(p){state.recent=[p.name,...state.recent.filter(n=>n!==p.name)].slice(0,10);saveState()}
async function fetchNames(names){const ps=[];for(let i=0;i<names.length;i+=10)ps.push(...await Promise.all(names.slice(i,i+10).map(n=>getPokemon(n).catch(()=>null))));return ps.filter(Boolean)}
async function renderCollection(){const names=Object.keys(state.collection);const q=($('collectionSearch')?.value||'').trim().toLowerCase();const filter=$('collectionFilter')?.value||'all';const sort=$('collectionSort')?.value||'id';$('collectionStats').innerHTML=collectionStatsHTML();if(!names.length){$('collectionGrid').innerHTML=empty('fa-box-open','Your collection is empty','Search the Pokédex and use the + button to start collecting.');return}$('collectionGrid').innerHTML=loading('Loading your collection…');let ps=await fetchNames(names);if(q)ps=ps.filter(p=>p.name.includes(q)||String(p.id).includes(q));if(filter==='favorite')ps=ps.filter(p=>state.favorites.includes(p.name));if(filter==='shiny')ps=ps.filter(p=>state.shiny.includes(p.name));if(filter==='legendary')ps=ps.filter(p=>LEGENDARIES.has(p.name));if(sort==='name')ps.sort((a,b)=>a.name.localeCompare(b.name));if(sort==='recent')ps.sort((a,b)=>(state.collection[b.name]?.addedAt||0)-(state.collection[a.name]?.addedAt||0));else ps.sort((a,b)=>a.id-b.id);$('collectionGrid').innerHTML=ps.length?ps.map(p=>cardHTML(p)).join(''):empty('fa-filter','No Pokémon match','Change your collection filters.')}
function collectionStatsHTML(){const c=Object.keys(state.collection).length,f=state.favorites.length,s=state.shiny.length,l=Object.keys(state.collection).filter(n=>LEGENDARIES.has(n)).length,p=Math.round(c/151*100);return `<div class="stat-tile"><strong>${c}</strong><span>Collected · ${p}%</span></div><div class="stat-tile"><strong>${f}</strong><span>Favorites</span></div><div class="stat-tile"><strong>${s}</strong><span>Shiny collected</span></div><div class="stat-tile"><strong>${l}</strong><span>Legendary collected</span></div>`}
$('collectionSearch').addEventListener('input',()=>renderCollection());$('collectionFilter').addEventListener('change',()=>renderCollection());$('collectionSort').addEventListener('change',()=>renderCollection());$('collectionClear').addEventListener('click',()=>{if(!confirm('Clear your entire collection?'))return;state.collection={};saveState();renderCollection();loadHome();toast('Collection cleared')});
async function renderFavorites(){if(!state.favorites.length){$('favoriteGrid').innerHTML=empty('fa-heart','No favorites yet','Tap the heart on any Pokémon card.');return}$('favoriteGrid').innerHTML=loading('Loading favorites…');const ps=await fetchNames(state.favorites);$('favoriteGrid').innerHTML=ps.length?ps.map(p=>cardHTML(p)).join(''):empty('fa-heart','Favorites unavailable','Try again.')}
async function renderShiny(){const names=state.shiny;$('shinyStats').innerHTML=`<div class="stat-tile"><strong>${names.length}</strong><span>Shiny collected</span></div><div class="stat-tile"><strong>${Math.round(names.length/151*100)}%</strong><span>Kanto shiny progress</span></div><div class="stat-tile"><strong>${names.filter(n=>LEGENDARIES.has(n)).length}</strong><span>Shiny legendary</span></div><div class="stat-tile"><strong>${names.filter(n=>MYTHICALS.has(n)).length}</strong><span>Shiny mythical</span></div>`;if(!names.length){$('shinyGrid').innerHTML=empty('fa-star','No shiny Pokémon yet','Use the trainer collection tools to track your shiny finds.');return}$('shinyGrid').innerHTML=loading('Loading shiny collection…');const ps=await fetchNames(names);$('shinyGrid').innerHTML=ps.map(p=>cardHTML(p,{shiny:true})).join('')}
function loadHome(){updateGlobalUI();renderHomeTypes();renderRecentHome();renderDailyMini();loadPokemonOfDay()}
async function renderHomeTypes(){const names=Object.keys(state.collection);if(!names.length){$('homeTypeProgress').innerHTML='<div><span class="type-dot" style="background:#708090"></span> Start collecting <b>0</b></div><div><span class="type-dot" style="background:#2788ff"></span> Types explored <b>0</b></div>';return}const ps=await fetchNames(names);const counts={};ps.forEach(p=>p.types.forEach(t=>counts[t.type.name]=(counts[t.type.name]||0)+1));$('homeTypeProgress').innerHTML=TYPES.sort((a,b)=>(counts[b]||0)-(counts[a]||0)).slice(0,6).map(t=>`<div><span class="type-dot" style="background:${TYPE_COLORS[t]}"></span>${cap(t)} <b>${counts[t]||0}</b></div>`).join('')}
async function renderRecentHome(){const names=state.recent;if(!names.length){$('recentHome').innerHTML=empty('fa-clock','Nothing viewed yet','Search a Pokémon to start your research history.');return}const ps=await fetchNames(names.slice(0,5));$('recentHome').innerHTML=ps.map(p=>`<div class="recent-item" data-info="${p.name}"><img src="${imageOf(p)}" alt="${p.name}"><div><strong>${p.name}</strong><small>#${p.id} · ${p.types.map(t=>t.type.name).join(' / ')}</small></div><i class="fa-solid fa-chevron-right" style="margin-left:auto;color:#617795"></i></div>`).join('')}
async function loadPokemonOfDay(){const day=Math.floor(Date.now()/86400000);const id=day%151+1;const el=$('pokemonOfDay');el.innerHTML=loading('Loading today’s featured Pokémon…');try{const p=await getPokemon(id);el.innerHTML=`<div class="feature-inner"><img src="${imageOf(p)}" alt="${p.name}"><div><span class="eyebrow">#${String(p.id).padStart(3,'0')}</span><h2 style="text-transform:capitalize;font:700 24px Poppins;margin:4px 0">${p.name}</h2><div class="card-types" style="justify-content:flex-start">${p.types.map(t=>typeBadge(t.type.name)).join('')}</div><p style="font-size:10px;color:var(--muted);line-height:1.6">A rotating daily research specimen selected from the original 151 Pokémon.</p><div class="info-actions"><button class="btn primary" data-info="${p.name}">View Info</button><button class="btn ghost" data-collect="${p.name}">Add to Collection</button></div></div></div>`}catch{el.innerHTML=errorState('Featured Pokémon unavailable','Retry when you have an internet connection.')}}
$('dailyPokemonRefresh').addEventListener('click',loadPokemonOfDay);$('clearRecent').addEventListener('click',()=>{state.recent=[];saveState();renderRecentHome();toast('Recently viewed cleared')});
function featureStyle(){const s=document.createElement('style');s.textContent='.feature-inner{display:flex;align-items:center;gap:25px}.feature-inner>img{width:155px;height:155px;object-fit:contain;filter:drop-shadow(0 18px 15px rgba(0,0,0,.2))}@media(max-width:620px){.feature-inner{flex-direction:column;text-align:center}.feature-inner .card-types{justify-content:center!important}}';document.head.appendChild(s)}
featureStyle();
// TEAM
async function addToTeam(name){if(teamList.length>=6)return toast('A team can contain up to 6 Pokémon.','error');if(teamList.includes(name))return toast('That Pokémon is already on the team.','error');try{await getPokemon(name);teamList.push(name);renderTeam();awardXP(5)}catch{toast('Pokémon not found.','error')}}
async function renderTeam(){const slots=$('teamSlots');let ps=[];if(!teamList.length)slots.innerHTML=Array.from({length:6},(_,i)=>`<div class="team-slot"><i class="fa-solid fa-plus" style="font-size:22px;color:#365676"></i><small style="font-size:8px;color:#7187a1">Slot ${i+1}</small></div>`).join('');else{ps=await fetchNames(teamList);slots.innerHTML=Array.from({length:6},(_,i)=>{const p=ps[i];return p?`<div class="team-slot filled"><button data-team-remove="${p.name}"><i class="fa-solid fa-xmark"></i></button><img src="${imageOf(p)}" alt="${p.name}"><strong>${p.name}</strong>${p.types.map(t=>typeBadge(t.type.name)).join('')}</div>`:`<div class="team-slot"><i class="fa-solid fa-plus" style="font-size:22px;color:#365676"></i><small style="font-size:8px;color:#7187a1">Slot ${i+1}</small></div>`}).join('')}renderTeamAnalysis(ps)}
async function renderTeamAnalysis(ps=[]){if(!ps.length){$('teamAnalysis').innerHTML=empty('fa-users','Team analysis','Add Pokémon to see type coverage and weaknesses.');return}const weak={};ps.forEach(p=>p.types.forEach(t=>{weak[t.type.name]=(weak[t.type.name]||0)+1}));$('teamAnalysis').innerHTML=`<div class="section-head"><h3>Team Analysis</h3><span>${ps.length}/6</span></div><div class="data-panel" style="padding:12px"><h3>Types represented</h3><div class="coverage-list">${Object.keys(weak).map(t=>`<span style="border-left:3px solid ${TYPE_COLORS[t]}">${cap(t)} ×${weak[t]}</span>`).join('')}</div></div><div class="data-panel" style="padding:12px"><h3>Team notes</h3><p style="font-size:9px;color:var(--muted);line-height:1.7">This lightweight analysis highlights represented types. Use Type Lab for exact matchup calculations; it does not pretend to reproduce competitive team-building engines.</p></div>`}
$('teamAddBtn').addEventListener('click',()=>addToTeam($('teamSearch').value));$('teamSearch').addEventListener('keydown',e=>{if(e.key==='Enter')addToTeam($('teamSearch').value)});document.addEventListener('click',e=>{const b=e.target.closest('[data-team-remove]');if(b){teamList=teamList.filter(n=>n!==b.dataset.teamRemove);renderTeam()}});$('clearTeam').addEventListener('click',()=>{teamList=[];renderTeam()});$('saveTeam').addEventListener('click',()=>{if(!teamList.length)return toast('Add at least one Pokémon first.','error');state.teams.unshift({name:$('teamName').value.trim()||'Untitled Team',members:[...teamList],date:new Date().toISOString()});state.teams=state.teams.slice(0,10);saveState();renderSavedTeams();toast('Team saved')});function renderSavedTeams(){$('savedTeams').innerHTML=state.teams.length?state.teams.map((t,i)=>`<div class="saved-team"><span><b>${esc(t.name)}</b> · ${t.members.length} Pokémon</span><button class="btn ghost" data-load-team="${i}">Load</button></div>`).join(''):empty('fa-floppy-disk','No saved teams','Save a team to see it here.')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-load-team]');if(b){const t=state.teams[+b.dataset.loadTeam];teamList=[...t.members];$('teamName').value=t.name;renderTeam();toast('Team loaded')}});renderSavedTeams();renderTeam();
// COMPARE
$('compareAddBtn').addEventListener('click',async()=>{const n=$('compareSearch').value.trim().toLowerCase();if(!n)return;if(compareList.length>=4)return toast('Compare up to four Pokémon.','error');if(compareList.includes(n))return toast('Already added.','error');try{await getPokemon(n);compareList.push(n);$('compareSearch').value='';renderCompare()}catch{toast('Pokémon not found.','error')}});async function renderCompare(){if(!compareList.length){$('compareResult').innerHTML=empty('fa-code-compare','Nothing to compare','Add two to four Pokémon above.');return}const ps=await fetchNames(compareList);const rows=['HP','Attack','Defense','Sp. Attack','Sp. Defense','Speed'];$('compareResult').innerHTML=`<table class="compare-table"><thead><tr><th>Stat</th>${ps.map(p=>`<th><div class="compare-poke"><img src="${imageOf(p)}"><div style="text-transform:capitalize">${p.name}</div><div class="card-types">${p.types.map(t=>typeBadge(t.type.name)).join('')}</div></div><button class="mini-btn" data-compare-remove="${p.name}">Remove</button></th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr><th>${r}</th>${ps.map(p=>`<td><b>${p.stats[i].base_stat}</b></td>`).join('')}</tr>`).join('')}<tr><th>Total base stats</th>${ps.map(p=>`<td><b>${p.stats.reduce((a,s)=>a+s.base_stat,0)}</b></td>`).join('')}</tr></tbody></table>`}document.addEventListener('click',e=>{const b=e.target.closest('[data-compare-remove]');if(b){compareList=compareList.filter(n=>n!==b.dataset.compareRemove);renderCompare()}});renderCompare();
// TYPE LAB — calculate using PokéAPI damage relations
let typeRelations={};async function getTypeRelations(t){if(typeRelations[t])return typeRelations[t];const d=await api(`type/${t}`);typeRelations[t]={double:d.damage_relations.double_damage_to.map(x=>x.name),half:d.damage_relations.half_damage_to.map(x=>x.name),zero:d.damage_relations.no_damage_to.map(x=>x.name)};return typeRelations[t]}
async function typeMultiplier(att,defs){let m=1;const r=await getTypeRelations(att);defs.filter(Boolean).forEach(d=>{if(r.double.includes(d))m*=2;if(r.half.includes(d))m*=.5;if(r.zero.includes(d))m=0});return m}
async function renderTypeLab(){const a=$('attackType').value,d1=$('defType1').value,d2=$('defType2').value;if(!a||!d1)return;$('typeLabResult').innerHTML=loading('Calculating matchup…');try{const m=await typeMultiplier(a,[d1,d2]);let label=m===0?'IMMUNE':m>1?'SUPER EFFECTIVE':m<1?'RESISTED':'NEUTRAL';$('typeLabResult').innerHTML=`<div class="effect-label">${cap(a)} attacking ${cap(d1)}${d2?' / '+cap(d2):''}</div><div class="effect-big">×${m}</div><strong>${label}</strong><p style="font-size:9px;color:var(--muted);margin-top:8px">Multipliers are calculated from PokéAPI damage relations.</p>`}catch{$('typeLabResult').innerHTML=errorState('Type relation unavailable','Try again.')}}
['attackType','defType1','defType2'].forEach(id=>$(id).addEventListener('change',renderTypeLab));function buildMatrix(){const root=$('typeMatrix');root.innerHTML=`<div class="matrix-cell matrix-head">ATTACK ↓ / DEF →</div>${TYPES.map(t=>`<div class="matrix-cell matrix-head" style="color:${TYPE_COLORS[t]}">${t.slice(0,3).toUpperCase()}</div>`).join('')}`+TYPES.map(a=>`<div class="matrix-cell matrix-head" style="color:${TYPE_COLORS[a]}">${a.toUpperCase()}</div>${TYPES.map(d=>`<div class="matrix-cell" data-matrix="${a}|${d}">—</div>`).join('')}`).join('');TYPES.forEach(a=>TYPES.forEach(async d=>{try{const m=await typeMultiplier(a,[d]);const el=qs(`[data-matrix="${a}|${d}"]`);if(!el)return;el.textContent='×'+m;el.classList.add(m===0?'matrix-x0':m>1?'matrix-x2':m<1?'matrix-x05':'')}catch{}}))}buildMatrix();
// DAMAGE / STATS
$('damageCalc').addEventListener('click',async()=>{const a=$('dmgAttacker').value.trim(),d=$('dmgDefender').value.trim(),power=+$('dmgPower').value||1,level=+$('dmgLevel').value||50,type=$('dmgType').value;$('damageResult').innerHTML=loading('Running simplified damage model…');try{const [ap,dp]=await Promise.all([getPokemon(a),getPokemon(d)]);const atk=ap.stats[1].base_stat,def=dp.stats[2].base_stat,m=await typeMultiplier(type,dp.types.map(x=>x.type.name));const raw=Math.max(1,Math.floor((((2*level/5+2)*power*atk/Math.max(1,def))/50+2)*m));const pct=Math.min(100,raw/dp.stats[0].base_stat*100);$('damageResult').innerHTML=`<div class="calc-summary"><span class="eyebrow">ESTIMATED DAMAGE</span><strong>${raw}</strong><p style="font-size:10px;color:var(--muted)">${pct.toFixed(1)}% of ${cap(dp.name)} base HP · ${m===0?'immune':m>1?'super effective':m<1?'resisted':'neutral'}</p></div><div class="data-list"><div class="data-row"><span>Attacker</span><b>${cap(ap.name)} · ${atk} Attack</b></div><div class="data-row"><span>Defender</span><b>${cap(dp.name)} · ${def} Defense</b></div><div class="data-row"><span>Move power</span><b>${power}</b></div><div class="data-row"><span>Type multiplier</span><b>×${m}</b></div></div><p style="font-size:8px;color:var(--muted);line-height:1.6">Estimate only. This lab model omits the full game damage engine, EVs, IVs, weather, abilities and many modifiers.</p>`}catch{$('damageResult').innerHTML=errorState('Calculation failed','Check both Pokémon names.')}});
$('statCalc').addEventListener('click',async()=>{const n=$('statPokemon').value.trim(),level=+$('statLevel').value||50;$('statResult').innerHTML=loading('Calculating stats…');try{const p=await getPokemon(n);const rows=p.stats.map(s=>{const v=Math.floor(s.base_stat*level/100)+(s.stat.name==='hp'?level:5);return {name:s.stat.name,v}});$('statResult').innerHTML=`<div class="calc-summary"><span class="eyebrow">${cap(p.name)} · LEVEL ${level}</span><strong>${rows.reduce((a,x)=>a+x.v,0)}</strong><p style="font-size:10px;color:var(--muted)">Combined simplified level-scaled stat estimate.</p></div>${rows.map(x=>`<div class="stat-line"><span>${cap(x.name)}</span><div><i style="width:${Math.min(100,x.v/220*100)}%"></i></div><b>${x.v}</b></div>`).join('')}<p style="font-size:8px;color:var(--muted);line-height:1.6">This calculator uses a simple base-stat scaling model, not the official IV/EV/nature formula.</p>`}catch{$('statResult').innerHTML=errorState('Pokémon not found','Check the name and try again.')}});
// BATTLE
async function startBattle(){const a=$('battleOne').value.trim(),b=$('battleTwo').value.trim();$('battleArena').innerHTML=loading('Preparing battle arena…');try{const [p1,p2]=await Promise.all([getPokemon(a),getPokemon(b)]);battleState={p1,p2,hp1:p1.stats[0].base_stat,hp2:p2.stats[0].base_stat,log:[`Battle started: ${cap(p1.name)} vs ${cap(p2.name)}.`],turn:0};renderBattleArena()}catch{$('battleArena').innerHTML=errorState('Battle setup failed','Check both Pokémon names.')}}
function renderBattleArena(){const b=battleState,p1=b.p1,p2=b.p2;const max1=p1.stats[0].base_stat,max2=p2.stats[0].base_stat;const hpPct1=Math.max(0,b.hp1/max1*100),hpPct2=Math.max(0,b.hp2/max2*100);$('battleArena').innerHTML=`<div class="battle-fighters"><div class="fighter"><img src="${imageOf(p1)}" alt="${p1.name}"><h3>${p1.name}</h3><div class="card-types">${p1.types.map(t=>typeBadge(t.type.name)).join('')}</div><div class="hp-track"><i style="width:${hpPct1}%"></i></div><small>HP ${Math.max(0,b.hp1)} / ${max1}</small></div><div class="vs-badge">VS</div><div class="fighter"><img src="${imageOf(p2)}" alt="${p2.name}"><h3>${p2.name}</h3><div class="card-types">${p2.types.map(t=>typeBadge(t.type.name)).join('')}</div><div class="hp-track"><i style="width:${hpPct2}%"></i></div><small>HP ${Math.max(0,b.hp2)} / ${max2}</small></div></div><div class="battle-actions"><button class="battle-action" data-battle-attack="1"><i class="fa-solid fa-bolt"></i> Attack</button><button class="battle-action" data-battle-attack="2"><i class="fa-solid fa-shield"></i> Defend</button></div><div class="battle-log">${b.log.slice(-8).map(x=>`<div>• ${esc(x)}</div>`).join('')}</div>`}
async function battleTurn(choice){if(!battleState)return;const b=battleState;if(b.hp1<=0||b.hp2<=0)return;const atk=choice===1?b.p1:b.p2;const def=choice===1?b.p2:b.p1;const power=choice===1?55:45;const m=await typeMultiplier(atk.types[0].type.name,def.types.map(x=>x.type.name));const dmg=Math.max(1,Math.floor(power*atk.stats[1].base_stat/Math.max(1,def.stats[2].base_stat)*m/3));if(choice===1)b.hp2=Math.max(0,b.hp2-dmg);else b.hp1=Math.max(0,b.hp1-dmg);b.log.push(`${cap(atk.name)} dealt ${dmg} damage (${m===0?'immune':m>1?'super effective':m<1?'resisted':'neutral'}).`);if(b.hp1<=0||b.hp2<=0){const winner=b.hp1>0?b.p1.name:b.p2.name;b.log.push(`${cap(winner)} wins the battle.`);state.battleHistory.unshift({a:b.p1.name,b:b.p2.name,winner,date:new Date().toISOString()});state.battleHistory=state.battleHistory.slice(0,20);addActivity(`Battle completed: ${cap(winner)} won`);awardXP(20);saveState();toast(`${cap(winner)} wins!`)}else{const counter=choice===1?2:1;const ca=counter===1?b.p1:b.p2,cd=counter===1?b.p2:b.p1;const cm=await typeMultiplier(ca.types[0].type.name,cd.types.map(x=>x.type.name));const cdmg=Math.max(1,Math.floor(42*ca.stats[1].base_stat/Math.max(1,cd.stats[2].base_stat)*cm/3));if(counter===1)b.hp2=Math.max(0,b.hp2-cdmg);else b.hp1=Math.max(0,b.hp1-cdmg);b.log.push(`${cap(ca.name)} countered for ${cdmg} damage.`)}renderBattleArena()}
$('startBattle').addEventListener('click',startBattle);$('resetBattle').addEventListener('click',()=>{$('battleArena').innerHTML=empty('fa-crosshairs','Battle ready','Choose two Pokémon and press Start Battle.');battleState=null});document.addEventListener('click',e=>{const b=e.target.closest('[data-battle-attack]');if(b)battleTurn(+b.dataset.battleAttack)});

// FRIEND BATTLE — integrated Firestore multiplayer feature.
// Uses the existing Firebase app/auth/db, Pokémon helpers, state, toast, and HTML IDs.
const MP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MP_INITIAL_PLAYER = () => ({ uid: '', name: '', pokemon: null, hp: 0, ready: false, defending: false });

function mpUser() { return auth.currentUser; }
function mpTrainerName() {
  const user = mpUser();
  return String(state?.trainer?.name || user?.displayName || user?.email?.split('@')[0] || 'Trainer').trim().slice(0, 30) || 'Trainer';
}
function mpSetStatus(message, isError = false) {
  const el = $('mpStatus');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', isError);
}
function mpRoomRef(code = mpRoomCode) { return doc(db, 'battleRooms', code); }
function mpFriendlyError(err, fallback) {
  console.error('[Friend Battle]', err);
  if (err?.code === 'permission-denied') {
    return 'Firestore denied this action. Check the battleRooms rules in FIRESTORE_SETUP.md, then publish them.';
  }
  if (err?.code === 'unavailable' || err?.code === 'network-request-failed') {
    return 'Firebase is temporarily unreachable. Check your internet connection and try again.';
  }
  return err?.message || fallback;
}
function mpInitialRoom(code, user, name) {
  const host = { ...MP_INITIAL_PLAYER(), uid: user.uid, name };
  return {
    code,
    hostUid: user.uid,
    guestUid: null,
    hostName: name,
    guestName: '',
    status: 'waiting',
    players: { host, guest: MP_INITIAL_PLAYER() },
    turnUid: null,
    log: [`${name} created the room. Share the code to invite a friend.`],
    winnerUid: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}
function clearBattleRoomLocal(message = 'Sign in with your trainer account, then create a room or enter a friend\'s code.') {
  if (mpRoomUnsubscribe) {
    mpRoomUnsubscribe();
    mpRoomUnsubscribe = null;
  }
  mpRoomCode = null;
  mpRoomRole = null;
  mpRoomData = null;
  const view = $('mpRoomView');
  if (view) view.innerHTML = '<div class="mp-empty"><i class="fa-solid fa-gamepad"></i><strong>Your next battle starts here</strong><span>Two trainers · One room code · One winner</span></div>';
  const actions = $('mpRoomActions');
  if (actions) actions.classList.remove('hidden');
  mpSetStatus(message);
}
function mpAttachRoom(code, role) {
  if (mpRoomUnsubscribe) mpRoomUnsubscribe();
  mpRoomCode = code;
  mpRoomRole = role;
  mpRoomData = null;
  mpSetStatus(`Connecting to room ${code}…`);
  mpRoomUnsubscribe = onSnapshot(mpRoomRef(code), snap => {
    if (!snap.exists()) {
      mpSetStatus('This room no longer exists. It may have been deleted.', true);
      return;
    }
    const room = snap.data();
    const user = mpUser();
    if (!user || (room.hostUid !== user.uid && room.guestUid !== user.uid)) {
      clearBattleRoomLocal('You are no longer a member of this room. Create or join another room.');
      return;
    }
    mpRoomData = room;
    renderMultiplayerRoom();
    mpRecordFinishedBattle();
  }, err => {
    mpSetStatus(mpFriendlyError(err, 'Could not sync this room.'), true);
    toast('Friend Battle could not sync. Check the Console and Firestore rules.', 'error');
  });
}
function mpGenerateCode() {
  return Array.from({ length: 6 }, () => MP_CODE_CHARS[Math.floor(Math.random() * MP_CODE_CHARS.length)]).join('');
}
async function createFriendBattleRoom() {
  const user = mpUser();
  if (!user) return toast('Sign in before creating an online room.', 'error');
  const btn = $('createBattleRoom');
  if (btn) btn.disabled = true;
  try {
    // Use a transaction to reserve a code without ever overwriting an existing room.
    // Firestore rules must permit signed-in users to GET a non-existent candidate room.
    let createdCode = null;
    for (let attempt = 0; attempt < 10 && !createdCode; attempt++) {
      const code = mpGenerateCode();
      const ref = mpRoomRef(code);
      const name = mpTrainerName();
      const roomData = mpInitialRoom(code, user, name);
      const reserved = await runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        if (snap.exists()) return false;
        tx.set(ref, roomData);
        return true;
      });
      if (reserved) createdCode = code;
    }
    if (!createdCode) throw new Error('Could not reserve a unique room code. Please try again.');
    $('joinBattleCode').value = '';
    mpRecordedRooms.delete(createdCode);
    mpAttachRoom(createdCode, 'host');
    toast(`Room ${createdCode} created. Share the code with your friend.`);
  } catch (err) {
    toast(mpFriendlyError(err, 'Could not create the room.'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
async function joinFriendBattleRoom() {
  const user = mpUser();
  if (!user) return toast('Sign in before joining an online room.', 'error');
  const code = String($('joinBattleCode')?.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 6) return toast('Enter the six-character room code.', 'error');
  if (mpRoomCode === code) return toast('You are already in this room.');
  const btn = $('joinBattleRoom');
  if (btn) btn.disabled = true;
  try {
    const ref = mpRoomRef(code);
    const name = mpTrainerName();
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Room not found. Check the code with your friend.');
      const room = snap.data();
      if (room.hostUid === user.uid) throw new Error('You cannot join your own room with the same account. Use a second trainer account.');
      if (room.status !== 'waiting' || room.guestUid) throw new Error('This room is already occupied or the battle has started.');
      const log = [...(room.log || []), `${name} joined the room.`].slice(-20);
      tx.update(ref, {
        guestUid: user.uid,
        guestName: name,
        'players.guest.uid': user.uid,
        'players.guest.name': name,
        status: 'lobby',
        updatedAt: serverTimestamp(),
        log
      });
    });
    mpAttachRoom(code, 'guest');
    toast(`Joined room ${code}. Choose your Pokémon!`);
  } catch (err) {
    toast(mpFriendlyError(err, 'Could not join the room.'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
async function mpChoosePokemon() {
  if (!mpRoomCode || !mpRoomRole || !mpRoomData) return toast('Connect to a room first.', 'error');
  const name = String($('mpPokemonInput')?.value || '').trim().toLowerCase();
  if (!name) return toast('Enter a Pokémon name.', 'error');
  const btn = $('mpChoosePokemon');
  if (btn) btn.disabled = true;
  try {
    const [p, user] = await Promise.all([getPokemon(name), Promise.resolve(mpUser())]);
    if (!user) throw new Error('Please sign in again.');
    const pokemon = {
      id: p.id,
      name: p.name,
      sprite: imageOf(p),
      types: p.types.map(t => t.type.name),
      hpMax: p.stats[0].base_stat,
      attack: p.stats[1].base_stat,
      defense: p.stats[2].base_stat
    };
    const ref = mpRoomRef();
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('The room is no longer available.');
      const room = snap.data();
      if (room[mpRoomRole === 'host' ? 'hostUid' : 'guestUid'] !== user.uid) throw new Error('You are no longer a member of this room.');
      if (room.status !== 'lobby') throw new Error('Pokémon selection is closed because the battle has started.');
      const own = room.players?.[mpRoomRole] || MP_INITIAL_PLAYER();
      const otherRole = mpRoomRole === 'host' ? 'guest' : 'host';
      const other = room.players?.[otherRole] || MP_INITIAL_PLAYER();
      const log = [...(room.log || []), `${own.name || mpTrainerName()} chose ${cap(pokemon.name)}.`].slice(-20);
      const update = {
        [`players.${mpRoomRole}.pokemon`]: pokemon,
        [`players.${mpRoomRole}.hp`]: pokemon.hpMax,
        [`players.${mpRoomRole}.ready`]: true,
        [`players.${mpRoomRole}.defending`]: false,
        log,
        updatedAt: serverTimestamp()
      };
      if (other.ready && other.pokemon) {
        update.status = 'battle';
        update.turnUid = room.hostUid;
        update.log = [...log, 'Both Pokémon are ready! The battle begins.'].slice(-20);
      }
      tx.update(ref, update);
    });
    toast(`${cap(pokemon.name)} is ready for battle!`);
  } catch (err) {
    toast(mpFriendlyError(err, 'Could not select that Pokémon.'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
async function mpTakeTurn(action) {
  const user = mpUser();
  const code = mpRoomCode;
  const role = mpRoomRole;
  if (!user || !code || !role || !mpRoomData) return;
  if (!['attack', 'defend'].includes(action)) return;
  if (mpRoomData.status !== 'battle') return;
  if (mpRoomData.turnUid !== user.uid) return toast('It is not your turn yet.', 'error');
  try {
    await runTransaction(db, async tx => {
      const ref = mpRoomRef(code);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Room not found.');
      const room = snap.data();
      if (room[role === 'host' ? 'hostUid' : 'guestUid'] !== user.uid) throw new Error('You are no longer a member of this room.');
      if (room.status !== 'battle' || room.turnUid !== user.uid) throw new Error('The turn changed. Wait for the latest room update.');
      const otherRole = role === 'host' ? 'guest' : 'host';
      const actor = { ...room.players[role] };
      const target = { ...room.players[otherRole] };
      if (!actor.pokemon || !target.pokemon) throw new Error('Both trainers must choose Pokémon first.');
      let log = [...(room.log || [])];
      let status = 'battle';
      let turnUid = target.uid;
      let winnerUid = null;
      if (action === 'defend') {
        actor.defending = true;
        log.push(`${actor.name}'s ${cap(actor.pokemon.name)} is bracing for the next hit.`);
      } else {
        let multiplier = 1;
        try { multiplier = await typeMultiplier(actor.pokemon.types?.[0], target.pokemon.types || []); } catch (err) { console.warn('Type matchup lookup failed; using neutral damage.', err); }
        let damage = Math.max(1, Math.floor(55 * actor.pokemon.attack / Math.max(1, target.pokemon.defense) * multiplier / 3));
        if (target.defending) {
          damage = Math.max(1, Math.floor(damage / 2));
          target.defending = false;
          log.push(`${target.name}'s defense reduced the damage!`);
        }
        target.hp = Math.max(0, target.hp - damage);
        const effect = multiplier === 0 ? 'no effect' : multiplier > 1 ? 'super effective' : multiplier < 1 ? 'not very effective' : 'neutral';
        log.push(`${actor.name}'s ${cap(actor.pokemon.name)} dealt ${damage} damage (${effect}).`);
        if (target.hp <= 0) {
          status = 'finished';
          winnerUid = user.uid;
          turnUid = null;
          log.push(`${actor.name} wins the Friend Battle!`);
        }
      }
      tx.update(ref, {
        [`players.${role}.defending`]: actor.defending,
        [`players.${otherRole}.hp`]: target.hp,
        [`players.${otherRole}.defending`]: target.defending,
        log: log.slice(-20),
        status,
        turnUid,
        winnerUid,
        updatedAt: serverTimestamp()
      });
    });
  } catch (err) {
    toast(mpFriendlyError(err, 'Move failed. Please try again.'), 'error');
  }
}
async function leaveFriendBattle() {
  if (!mpRoomCode || !mpRoomRole) return clearBattleRoomLocal();
  const code = mpRoomCode;
  const role = mpRoomRole;
  const room = mpRoomData;
  try {
    if (room && !['finished', 'closed'].includes(room.status)) {
      const ref = mpRoomRef(code);
      if (role === 'host') {
        await updateDoc(ref, {
          status: 'closed',
          turnUid: null,
          log: [...(room.log || []), 'The room host left the battle.'].slice(-20),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(ref, {
          guestUid: null,
          guestName: '',
          'players.host.pokemon': null,
          'players.host.hp': 0,
          'players.host.ready': false,
          'players.host.defending': false,
          'players.guest.uid': '',
          'players.guest.name': '',
          'players.guest.pokemon': null,
          'players.guest.hp': 0,
          'players.guest.ready': false,
          'players.guest.defending': false,
          status: 'waiting',
          turnUid: null,
          winnerUid: null,
          log: [...(room.log || []), 'The guest left. The room is open for another trainer.'].slice(-20),
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (err) {
    console.warn('Friend Battle leave update failed:', err);
    toast(mpFriendlyError(err, 'Could not update the room while leaving.'), 'error');
  } finally {
    clearBattleRoomLocal();
  }
}
function mpRecordFinishedBattle() {
  const room = mpRoomData;
  const user = mpUser();
  if (!room || room.status !== 'finished' || !room.winnerUid || !user || mpRecordedRooms.has(room.code)) return;
  mpRecordedRooms.add(room.code);
  const winnerRole = room.winnerUid === room.hostUid ? 'host' : 'guest';
  const winner = room.players?.[winnerRole];
  const a = room.players?.host?.pokemon?.name || 'Unknown';
  const b = room.players?.guest?.pokemon?.name || 'Unknown';
  state.battleHistory.unshift({ a, b, winner: winner?.pokemon?.name || winner?.name || 'Winner', date: new Date().toISOString(), mode: 'friend' });
  state.battleHistory = state.battleHistory.slice(0, 20);
  addActivity(`Friend Battle finished: ${winner?.name || 'A trainer'} won`);
  if (room.winnerUid === user.uid) awardXP(20); else saveState();
  toast(room.winnerUid === user.uid ? 'Victory! +20 XP added to your trainer profile.' : `${winner?.name || 'Your opponent'} won the Friend Battle.`);
}
function mpPlayerCard(role, player, room) {
  const selected = player?.pokemon;
  const isMe = role === mpRoomRole;
  const hp = Math.max(0, player?.hp || 0);
  const max = selected?.hpMax || 1;
  const canChoose = isMe && room.status === 'lobby' && !!player?.uid;
  return `<div class="mp-player-card ${isMe ? 'is-you' : ''} ${player?.ready ? 'is-ready' : ''}">
    <div class="mp-player-top"><span class="mp-player-avatar"><i class="fa-solid fa-user-ninja"></i></span><div class="mp-player-name"><strong>${esc(player?.name || 'Waiting for trainer…')}</strong><small>${isMe ? 'YOU' : player?.uid ? 'OPPONENT' : 'OPEN SLOT'}</small></div><span class="mp-ready-tag">${selected ? 'READY' : player?.uid ? 'CHOOSING' : 'WAITING'}</span></div>
    ${selected ? `<div class="mp-pokemon-preview"><img src="${esc(selected.sprite || '')}" alt="${esc(selected.name)}"><div><strong>${esc(cap(selected.name))}</strong><div class="card-types">${(selected.types || []).map(typeBadge).join('')}</div>${['battle', 'finished'].includes(room.status) ? `<div class="mp-hp-line"><div class="hp-track"><i style="width:${Math.max(0, Math.min(100, hp / max * 100))}%"></i></div><small>HP ${hp} / ${max}</small></div>` : '<small class="mp-select-caption">Pokémon selected</small>'}</div></div>` : `<div class="mp-pokemon-placeholder"><i class="fa-solid fa-question"></i><span>${player?.uid ? 'Choose a Pokémon below' : 'Waiting for a trainer to join'}</span></div>`}
    ${canChoose ? `<div class="mp-select-row"><input id="mpPokemonInput" value="${esc(selected?.name || 'Pikachu')}" placeholder="Pokémon name (e.g. Pikachu)" autocomplete="off"><button class="btn primary" id="mpChoosePokemon"><i class="fa-solid fa-check"></i> ${selected ? 'Change' : 'Choose'} Pokémon</button></div>` : ''}
  </div>`;
}
function renderMultiplayerRoom() {
  const view = $('mpRoomView');
  const actions = $('mpRoomActions');
  if (!view || !actions) return;
  const user = mpUser();
  if (!user) {
    actions.classList.remove('hidden');
    mpSetStatus('Sign in with your trainer account to play online with a friend.');
    view.innerHTML = '<div class="mp-empty"><i class="fa-solid fa-lock"></i><strong>Trainer sign-in required</strong><span>Online rooms use your Firebase trainer account.</span></div>';
    return;
  }
  if (!mpRoomCode || !mpRoomData) {
    actions.classList.remove('hidden');
    view.innerHTML = '<div class="mp-empty"><i class="fa-solid fa-gamepad"></i><strong>Your next battle starts here</strong><span>Create a room and share its code, or join a friend.</span></div>';
    return;
  }
  actions.classList.add('hidden');
  const r = mpRoomData;
  const code = esc(r.code || mpRoomCode);
  if (r.status === 'closed') {
    mpSetStatus(`Room ${code} was closed by its host.`, true);
    view.innerHTML = '<div class="mp-ended"><i class="fa-solid fa-door-closed"></i><strong>Room closed</strong><button class="btn ghost" id="mpLeaveRoom">Back to room lobby</button></div>';
    return;
  }
  const host = r.players?.host || MP_INITIAL_PLAYER();
  const guest = r.players?.guest || MP_INITIAL_PLAYER();
  let status = '';
  if (r.status === 'waiting') status = `Room ${code} is ready. Share this code with a friend.`;
  else if (r.status === 'lobby') status = 'Both trainers are connected. Choose your Pokémon to begin.';
  else if (r.status === 'battle') status = r.turnUid === user.uid ? 'Your turn — choose Attack or Defend.' : `${r.players?.[mpRoomRole === 'host' ? 'guest' : 'host']?.name || 'Your opponent'} is choosing a move…`;
  else if (r.status === 'finished') {
    const wr = r.winnerUid === r.hostUid ? 'host' : 'guest';
    status = `${r.players?.[wr]?.name || 'A trainer'} won the battle!`;
  }
  mpSetStatus(status);
  let battleControls = '';
  if (r.status === 'battle') {
    battleControls = r.turnUid === user.uid
      ? '<div class="mp-turn-actions"><button class="btn primary" id="mpAttack"><i class="fa-solid fa-bolt"></i> Attack</button><button class="btn ghost" id="mpDefend"><i class="fa-solid fa-shield-halved"></i> Defend</button></div>'
      : '<div class="mp-waiting-turn"><span class="mp-pulse"></span> Waiting for opponent’s move…</div>';
  } else if (r.status === 'finished') {
    const winnerRole = r.winnerUid === r.hostUid ? 'host' : 'guest';
    battleControls = `<div class="mp-winner-banner"><i class="fa-solid fa-trophy"></i><div><strong>${esc(r.players?.[winnerRole]?.name || 'Winner')} wins!</strong><span>${esc(cap(r.players?.[winnerRole]?.pokemon?.name || 'Pokémon'))} takes the victory.</span></div></div>`;
  } else if (r.status === 'waiting') {
    battleControls = '<div class="mp-waiting-turn"><span class="mp-pulse"></span> Waiting for a friend to join…</div>';
  } else {
    battleControls = '<div class="mp-waiting-turn">Both trainers must choose a Pokémon to start.</div>';
  }
  view.innerHTML = `<div class="mp-room-top"><div><span class="eyebrow">PRIVATE BATTLE ROOM</span><div class="mp-room-code">${code}</div><small>Share this code with your opponent</small></div><button class="btn ghost" id="mpCopyCode"><i class="fa-regular fa-copy"></i> Copy code</button></div>
    <div class="mp-duel-grid">${mpPlayerCard('host', host, r)}<div class="mp-vs">VS</div>${mpPlayerCard('guest', guest, r)}</div>
    ${battleControls}
    <div class="mp-battle-log"><div class="mp-log-title"><strong><i class="fa-solid fa-list-ul"></i> Battle Log</strong><span>${(r.log || []).length} events</span></div><div class="mp-log-lines">${(r.log || []).slice(-8).map(line => `<div>${esc(line)}</div>`).join('') || '<div>Waiting for the first move…</div>'}</div></div>
    <div class="mp-room-footer"><span><i class="fa-solid fa-shield-halved"></i> ${r.status === 'battle' ? 'Turn-based live battle' : r.status === 'finished' ? 'Battle complete' : 'Private room'}</span><button class="btn ghost" id="mpLeaveRoom"><i class="fa-solid fa-arrow-right-from-bracket"></i> Leave room</button></div>`;
}

// Keep listeners delegated because the room controls are re-rendered on every snapshot.
$('createBattleRoom')?.addEventListener('click', createFriendBattleRoom);
$('joinBattleRoom')?.addEventListener('click', joinFriendBattleRoom);
$('joinBattleCode')?.addEventListener('keydown', e => { if (e.key === 'Enter') joinFriendBattleRoom(); });
$('joinBattleCode')?.addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
document.addEventListener('click', e => {
  if (e.target.closest('#mpChoosePokemon')) mpChoosePokemon();
  if (e.target.closest('#mpAttack')) mpTakeTurn('attack');
  if (e.target.closest('#mpDefend')) mpTakeTurn('defend');
  if (e.target.closest('#mpLeaveRoom')) leaveFriendBattle();
  if (e.target.closest('#mpCopyCode') && mpRoomCode) {
    const code = mpRoomCode;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(() => toast('Room code copied!')).catch(() => toast(`Room code: ${code}`));
    else toast(`Room code: ${code}`);
  }
});

function renderBattleHistory(){const h=state.battleHistory;if(!h.length){$('battleHistoryList').innerHTML=empty('fa-clock-rotate-left','No battles yet','Finish a quick battle to create history.');return}$('battleHistoryList').innerHTML=h.map(x=>`<div class="history-card"><span><b style="text-transform:capitalize">${x.a}</b> vs <b style="text-transform:capitalize">${x.b}</b></span><strong style="text-transform:capitalize;color:#56dfa2">${x.winner} won</strong><small>${new Date(x.date).toLocaleString()}</small></div>`).join('')}$('clearBattleHistory').addEventListener('click',()=>{state.battleHistory=[];saveState();renderBattleHistory()});
// MYSTERY
function rarityFor(p){if(MYTHICALS.has(p.name))return['Mythical','#d96bff'];if(LEGENDARIES.has(p.name))return['Legendary','#ffbd42'];if(Math.random()<.06)return['Shiny','#ffd43b'];if(p.base_experience>180)return['Rare','#6eb4ff'];return['Common','#92a1b5']}
async function revealMystery(){const btn=$('mysteryBtn');btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Drawing…';const id=Math.floor(Math.random()*151)+1;try{const p=await getPokemon(id);const [rarity,color]=rarityFor(p);$('mysteryFront').innerHTML=`<span class="rarity" style="color:${color}">${rarity}</span><img src="${imageOf(p)}" alt="${p.name}"><h3>${p.name}</h3><div class="card-types">${p.types.map(t=>typeBadge(t.type.name)).join('')}</div><small>#${p.id} · ${p.stats[0].base_stat} HP</small><div class="card-actions" style="width:100%"><button class="mini-btn" data-collect="${p.name}">Add</button><button class="mini-btn" data-info="${p.name}">Info</button><button class="mini-btn" data-favorite="${p.name}">♡</button></div>`;$('mysteryCard').classList.add('revealed');state.mysteryHistory.unshift({name:p.name,image:imageOf(p),rarity,date:new Date().toISOString()});state.mysteryHistory=state.mysteryHistory.slice(0,8);state.mysteryStreak++;addActivity(`Mystery reveal: ${cap(p.name)}`);awardXP(8);saveState();renderMysteryHistory();$('mysteryStreak').textContent=state.mysteryStreak;btn.innerHTML='<i class="fa-solid fa-rotate"></i> Draw Another Card'}catch{toast('Mystery draw failed.','error');btn.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i> Reveal Mystery Card'}finally{btn.disabled=false}}
function renderMysteryHistory(){const h=state.mysteryHistory;if(!h.length){$('mysteryHistory').innerHTML=empty('fa-gift','No reveals yet','Your recent discoveries will appear here.');return}$('mysteryHistory').innerHTML=h.map(x=>`<div class="reveal-item"><img src="${x.image}" alt="${x.name}"><div><b>${x.name}</b><small style="display:block;color:#8496ae;margin-top:3px">${x.rarity} · ${new Date(x.date).toLocaleDateString()}</small></div></div>`).join('')}$('mysteryBtn').addEventListener('click',revealMystery);$('mysteryCard').addEventListener('click',()=>{if(!$('mysteryCard').classList.contains('revealed'))revealMystery()});$('clearMystery').addEventListener('click',()=>{state.mysteryHistory=[];saveState();renderMysteryHistory();toast('Mystery history cleared')});
// QUIZ
function randomId(){return Math.floor(Math.random()*151)+1}async function startQuiz(mode='silhouette'){quizState={mode,answer:null,options:[],p:null,answered:false};$('quizShell').innerHTML=loading('Preparing quiz…');try{const p=await getPokemon(randomId());quizState.p=p;let opts=[];while(opts.length<3){const x=await getPokemon(randomId());if(x.name!==p.name&&!opts.some(o=>o.name===x.name))opts.push(x)}quizState.options=[p,...opts].sort(()=>Math.random()-.5);renderQuiz()}catch{$('quizShell').innerHTML=errorState('Quiz unavailable','Try again when PokéAPI is reachable.')}}function renderQuiz(){const q=quizState,p=q.p;let visual=`<img class="${q.mode==='silhouette'?'silhouette':''}" src="${imageOf(p)}" alt="Mystery Pokémon">`;let question='Who is this Pokémon?';if(q.mode==='type'){visual=`<div style="font-size:50px;margin:30px">❔</div>`;question=`Which Pokémon matches this type? ${p.types.map(t=>typeBadge(t.type.name)).join(' ')}`}if(q.mode==='stats'){visual=`<div class="data-panel" style="margin:20px auto;text-align:left;max-width:360px">${statBars(p)}</div>`;question='Which Pokémon has these base stats?'}if(q.mode==='evolution'){visual=`<div style="font-size:40px;margin:35px">🧬</div>`;question='Which Pokémon are you researching?'}$('quizShell').innerHTML=`<div class="quiz-card"><div class="quiz-score"><span>Score ${state.quiz.score}</span><span>Streak ${state.quiz.streak}</span><span>Best ${state.quiz.best}</span></div>${visual}<h2 class="quiz-question">${question}</h2><div class="quiz-options">${q.options.map(x=>`<button class="quiz-option" data-answer="${x.name}">${x.name}</button>`).join('')}</div><div class="quiz-feedback" id="quizFeedback"></div><button class="btn primary" id="nextQuiz" style="margin-top:15px;display:none">Next Question</button></div>`;qsa('[data-quizmode]').forEach(b=>b.classList.toggle('active',b.dataset.quizmode===q.mode))}qsa('[data-quizmode]').forEach(b=>b.addEventListener('click',()=>startQuiz(b.dataset.quizmode)));document.addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(!b||!quizState||quizState.answered)return;quizState.answered=true;const ok=b.dataset.answer===quizState.p.name;const f=$('quizFeedback');if(ok){state.quiz.score++;state.quiz.streak++;state.quiz.best=Math.max(state.quiz.best,state.quiz.streak);awardXP(12);f.textContent='Correct! Great research instincts.';f.style.color='#49dfa1'}else{state.quiz.streak=0;f.textContent=`Not quite — it was ${cap(quizState.p.name)}.`;f.style.color='#ff7589'}saveState();$('nextQuiz').style.display='inline-flex';$('nextQuiz').onclick=()=>startQuiz(quizState.mode)});
// CRY QUIZ
async function renderCryQuiz(){const id=randomId();try{const p=await getPokemon(id);let opts=[p];while(opts.length<4){const x=await getPokemon(randomId());if(!opts.some(o=>o.name===x.name))opts.push(x)}opts.sort(()=>Math.random()-.5);$('cryShell').innerHTML=`<div class="quiz-card"><div class="quiz-score"><span>Identify the cry</span></div><div style="font-size:60px;margin:25px">🔊</div><h2 class="quiz-question">Who made this sound?</h2><button class="btn primary" id="playCryQuiz"><i class="fa-solid fa-volume-high"></i> Play Cry</button><div class="quiz-options">${opts.map(x=>`<button class="quiz-option" data-cry-answer="${x.name}">${x.name}</button>`).join('')}</div><div id="cryFeedback" class="quiz-feedback"></div></div>`;$('playCryQuiz').onclick=()=>playCry(p.name);qsa('[data-cry-answer]').forEach(b=>b.onclick=()=>{const ok=b.dataset.cryAnswer===p.name;$('cryFeedback').textContent=ok?'Correct!':'Not quite — it was '+cap(p.name);$('cryFeedback').style.color=ok?'#49dfa1':'#ff7589';if(ok)awardXP(12)})}catch{$('cryShell').innerHTML=errorState('Cry quiz unavailable','This Pokémon may not expose a cry in the current data source.')}}
// DAILY
function todayKey(){return new Date().toISOString().slice(0,10)}function dailyData(){const missions=['Add a Fire-type Pokémon to your collection.','View 5 Pokémon today.','Discover a Pokémon evolution chain.','Find a Legendary Pokémon.','Explore a Pokémon type.'];const idx=Math.floor(new Date().getTime()/86400000)%missions.length;return {text:missions[idx],idx}}
function renderDaily(){const d=dailyData(),done=state.daily.date===todayKey()&&state.daily.done;$('dailyChallenge').innerHTML=`<div class="challenge-card"><span class="eyebrow">TODAY'S CHALLENGE</span><h2>${esc(d.text)}</h2><p>Complete the mission through normal Lab activity. Progress is stored locally by date.</p><button class="btn ${done?'ghost':'white'}" id="completeDaily" ${done?'disabled':''}>${done?'✓ Completed':'Mark Complete'}</button></div><div class="panel"><div class="section-head"><h3>Daily streak</h3><i class="fa-solid fa-fire" style="color:#ff9e3d"></i></div><div class="calc-summary"><strong>${state.mysteryStreak}</strong><p>Discovery streak</p></div><p style="font-size:9px;color:var(--muted);line-height:1.6;margin-top:12px">Daily missions rotate by local calendar date. They do not claim to be official Pokémon events.</p></div>`;$('completeDaily')?.addEventListener('click',()=>{state.daily={date:todayKey(),done:true};awardXP(20);addActivity('Completed daily challenge');saveState();renderDaily();toast('Daily challenge completed!')})}function renderDailyMini(){const d=dailyData(),done=state.daily.date===todayKey()&&state.daily.done;$('homeDaily').innerHTML=`<b>${done?'Challenge complete ✓':d.text}</b><p>${done?'Nice work. Come back tomorrow for another mission.':'Complete it to earn XP and keep your research habit going.'}</p><button class="btn ghost" data-page="daily">Open Challenge</button>`}
// REGIONS
async function renderRegions(){const names=['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea'];const grid=$('regionsGrid');if(!grid)return;grid.innerHTML=loading('Loading regions…');try{const regions=await Promise.all(names.map((_,i)=>api(`region/${i+1}`)));grid.innerHTML=regions.map((r,i)=>{const n=r.names?.find(x=>x.language?.name==='en')?.name||names[i];const [a,b]=GEN_RANGES[i+1];const c=Object.keys(state.collection).filter(name=>{const p=cache.get(`pokemon/${name}`);return p&&p.id>=a&&p.id<=b}).length;const total=b-a+1;const generation=r.main_generation?.name?.replace('generation-','Generation ')||`Generation ${i+1}`;const pokedexCount=r.pokedexes?.length||0;return `<article class="region-card"><span class="eyebrow">${esc(generation)}</span><h3>${esc(n)}</h3><p>Pokémon ${a}–${b} · ${total} entries</p><div class="region-progress"><i style="width:${Math.min(100,c/total*100)}%"></i></div><small style="display:block;color:var(--muted);font-size:8px;margin-top:7px">${c} cached/collected · ${pokedexCount} Pokédex${pokedexCount===1?'':'es'}</small><button class="btn ghost" style="margin-top:12px" data-page="pokedex">Open Pokédex</button></article>`}).join('')}catch(err){console.error('Regions API error:',err);grid.innerHTML=errorState('Regions unavailable','PokéAPI could not load the region data. Please try again.')}}
// TRAINER / XP
function awardXP(n){state.trainer.xp=(state.trainer.xp||0)+n;state.trainer.level=1+Math.floor(state.trainer.xp/100);saveState();if($('trainerPageContent'))renderTrainer();if($('homeDaily'))renderDailyMini()}
function renderTrainer(){const t=state.trainer,xp=t.xp%100,collection=Object.keys(state.collection).length;$('trainerPageContent').innerHTML=`<div class="profile-card"><div class="avatar-large">${(t.name||'T')[0].toUpperCase()}</div><h2>${esc(t.name)}</h2><p style="font-size:9px;color:#c5d5e9">${esc(t.email||'Local trainer')}</p><div style="margin-top:18px;text-align:left"><div style="display:flex;justify-content:space-between;font-size:9px"><span>Level ${t.level}</span><b>${xp}/100 XP</b></div><div class="xp-bar"><i style="width:${xp}%"></i></div></div><button class="btn white wide" id="editTrainer" style="margin-top:12px">Edit Trainer Name</button><button class="btn glass wide" id="resetProgress" style="margin-top:8px">Reset Local Progress</button></div><div class="panel"><div class="section-head"><div><span class="eyebrow">TRAINER STATS</span><h3>Research activity</h3></div></div><div class="profile-stats"><div class="profile-stat"><strong>${collection}</strong><span>Collected</span></div><div class="profile-stat"><strong>${state.favorites.length}</strong><span>Favorites</span></div><div class="profile-stat"><strong>${state.shiny.length}</strong><span>Shiny</span></div><div class="profile-stat"><strong>${state.battleHistory.length}</strong><span>Battles</span></div><div class="profile-stat"><strong>${state.quiz.score}</strong><span>Quiz score</span></div><div class="profile-stat"><strong>${state.trainer.level}</strong><span>Lab level</span></div></div><h3 style="font:700 14px Poppins;margin:20px 0 10px">Recent activity</h3><div class="activity-list">${state.activity.slice(0,8).map(a=>`<div class="activity"><i class="fa-solid fa-circle-check" style="color:#42dfa0"></i> ${esc(a.text)} <small style="color:#687c98;float:right">${new Date(a.time).toLocaleDateString()}</small></div>`).join('')||'<div class="activity">No activity yet.</div>'}</div></div>`;$('editTrainer').onclick=()=>{const root=$('modalRoot');if(!root)return;root.innerHTML=`<div class="modal-backdrop" id="editTrainerModal"><div class="modal trainer-edit-modal" role="dialog" aria-modal="true" aria-labelledby="editTrainerTitle"><button class="modal-close" id="closeTrainerModal" aria-label="Close">×</button><span class="eyebrow">TRAINER PROFILE</span><h2 id="editTrainerTitle" style="font:700 22px Poppins;margin:7px 0 5px">Edit Trainer Name</h2><p style="font-size:10px;color:var(--muted);margin-bottom:18px">Update the name shown across your Pokémon Lab profile.</p><label style="display:block;font-size:9px;color:#a9bad0;font-weight:700">TRAINER NAME<input id="trainerNameInput" type="text" maxlength=30 value="${esc(t.name)}" autocomplete="off" style="width:100%;margin-top:7px"></label><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><button class="btn ghost" id="cancelTrainerEdit">Cancel</button><button class="btn primary" id="saveTrainerEdit">Save Changes</button></div></div></div>`;const modal=$('editTrainerModal'),input=$('trainerNameInput');const close=()=>{modal?.remove();document.body.classList.remove('modal-open')};$('closeTrainerModal').onclick=close;$('cancelTrainerEdit').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};$('saveTrainerEdit').onclick=()=>{const n=input.value.trim();if(!n){input.focus();toast('Please enter a trainer name.','error');return}state.trainer.name=n;saveState();renderTrainer();close();toast('Trainer name updated')};input.focus();input.select()};$('resetProgress').onclick=()=>{if(!confirm('Reset collection, XP, favorites and game history?'))return;state={...structuredClone(defaultState),trainer:{...state.trainer,name:state.trainer.name,email:state.trainer.email}};saveState();renderTrainer();loadHome();toast('Local progress reset')}}
const ACH=[['FIRST DISCOVERY','Discover your first Pokémon.','fa-compass',()=>Object.keys(state.collection).length>=1],['COLLECTOR','Collect 25 Pokémon.','fa-box-open',()=>Object.keys(state.collection).length>=25],['SUPER COLLECTOR','Collect 100 Pokémon.','fa-crown',()=>Object.keys(state.collection).length>=100],['SHINY HUNTER','Track 5 shiny Pokémon.','fa-star',()=>state.shiny.length>=5],['LEGENDARY TRAINER','Collect a Legendary Pokémon.','fa-bolt',()=>Object.keys(state.collection).some(n=>LEGENDARIES.has(n))],['BATTLE READY','Complete your first battle.','fa-shield-halved',()=>state.battleHistory.length>=1],['QUIZ MASTER','Score 10 correct answers.','fa-circle-question',()=>state.quiz.score>=10],['EVOLUTION MASTER','Research 10 Pokémon info records.','fa-dna',()=>state.recent.length>=10]];
function renderAchievements(){$('achievementGrid').innerHTML=ACH.map(a=>{const ok=a[3]();return `<article class="achievement ${ok?'unlocked':'locked'}"><i class="fa-solid ${a[2]}"></i><h3>${a[0]} ${ok?'✓':''}</h3><p>${a[1]}</p></article>`}).join('')}
function renderAnalytics(){const c=Object.keys(state.collection).length;const byType={};Object.keys(state.collection).forEach(n=>{const p=cache.get(`pokemon/${n}`);if(p)p.types.forEach(t=>byType[t.type.name]=(byType[t.type.name]||0)+1)});const vals=TYPES.map(t=>byType[t]||0);const max=Math.max(1,...vals);$('analyticsContent').innerHTML=`<div class="analytics-grid"><div class="stat-tile panel"><strong>${c}</strong><span>Total collected</span></div><div class="stat-tile panel"><strong>${state.favorites.length}</strong><span>Favorites</span></div><div class="stat-tile panel"><strong>${state.battleHistory.length}</strong><span>Battles</span></div><div class="stat-tile panel"><strong>${state.quiz.score}</strong><span>Quiz correct</span></div></div><div class="analytics-panels"><div class="panel"><div class="section-head"><h3>Collected by type</h3></div><div class="bar-chart">${TYPES.map((t,i)=>`<div class="bar" style="height:${Math.max(4,(vals[i]/max)*100)}% ;background:${TYPE_COLORS[t]}"><span>${t.slice(0,4)}</span></div>`).join('')}</div></div><div class="panel"><div class="section-head"><h3>Progress</h3></div><div class="progress-main"><div class="progress-ring" style="background:conic-gradient(var(--blue) ${Math.min(100,c/151*100)*3.6}deg,#253e60 0deg)"><span>${Math.round(c/151*100)}%</span></div><div><strong>${c} / 151</strong><p>Kanto collection progress</p></div></div></div></div>`}
// Collection UI event handlers and boot
$('collectionView').addEventListener('click',()=>{$('collectionGrid').classList.toggle('list-view');toast('View toggled')});
setTheme();updateGlobalUI();$('mysteryStreak').textContent=state.mysteryStreak;renderMysteryHistory();renderDailyMini();
(async()=>{$('appLoader').classList.add('hide');setTimeout(()=>$('appLoader').remove(),400);try{await api('pokemon/25')}catch{} })();

/* Detail + evolution profile */
const detailOverlay=document.getElementById('detailOverlay');
const detailBody=document.getElementById('detailBody');
const detailClose=document.getElementById('detailClose');

if(detailClose) detailClose.onclick=closeDetail;
if(detailOverlay){
    detailOverlay.onclick=e=>{if(e.target===detailOverlay)closeDetail()};
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail()});

function closeDetail(){
    if(!detailOverlay)return;
    detailOverlay.classList.remove('open');
    detailOverlay.setAttribute('aria-hidden','true');
}

function detailBar(label,value){
    const v=Number(value)||0;
    return `<div class="stat-bar"><span>${esc(label)}</span><div><i style="width:${Math.min(100,v/255*100)}%"></i></div><b>${v}</b></div>`;
}

function pokemonIdFromUrl(url){
    const match=String(url||'').match(/\/pokemon-species\/(\d+)\/?$/);
    return match?Number(match[1]):null;
}

function detailOfficial(p){return imageOf(p)}
function detailTypePills(p){return (p.types||[]).map(t=>typeBadge(t.type.name)).join('')}
function detailPretty(s){return cap(s)}

async function loadDetailProfile(value){
    const p=await getPokemon(value);
    await recordRecent(p);

    const sp=await api(`pokemon-species/${p.id}`);
    const evo=sp.evolution_chain?.url
        ? await api(sp.evolution_chain.url.replace(API,''))
        : null;

    const levels=[];
    if(evo?.chain){
        const walk=(node,depth=0)=>{
            if(!levels[depth])levels[depth]=[];
            levels[depth].push(node.species.name);
            (node.evolves_to||[]).forEach(child=>walk(child,depth+1));
        };
        walk(evo.chain);
    }

    const ids=[...new Set(levels.flat().filter(Boolean))];
    const evos=await Promise.all(ids.map(name=>getPokemon(name).catch(()=>null)));
    const em=new Map(evos.filter(Boolean).map(x=>[x.name,x]));

    const desc=sp.flavor_text_entries?.find(x=>x.language?.name==='en')?.flavor_text
        ?.replace(/[\n\f]/g,' ')
        ||'No English Pokédex description is available.';

    const weaknesses=await weaknessesForPokemon(p);
    const forms=[p,...(p.forms||[]).filter(f=>f.name!==p.name)];

    const detailMarkup=`
            <div class="detail-wrap">
                <div class="detail-visual">
                    <img src="${detailOfficial(p)}" alt="${esc(p.name)}">
                </div>

                <div class="detail-content">
                    <span class="number">
                        #${String(p.id).padStart(4,'0')} • ${esc(detailPretty(sp.generation?.name||''))}
                    </span>
                    <h2>${esc(cap(p.name))}</h2>

                    <div class="result-types">
                        ${detailTypePills(p)}
                    </div>

                    <div class="detail-actions">
                        <button class="primary-btn" data-collect="${esc(p.name)}">
                            ＋ Add to Collection
                        </button>
                        <button class="secondary-btn" data-favorite="${esc(p.name)}">
                            ${state.favorites.includes(p.name)?'♥ Favorited':'♡ Favorite'}
                        </button>
                    </div>

                    <div class="detail-section">
                        <h3>Overview</h3>
                        <p class="description">${esc(desc)}</p>
                        <div class="bio-grid">
                            <div><span>Height</span><b>${(p.height/10).toFixed(1)} m</b></div>
                            <div><span>Weight</span><b>${(p.weight/10).toFixed(1)} kg</b></div>
                            <div><span>Abilities</span><b>${p.abilities?.length||0}</b></div>
                            <div><span>Forms</span><b>${forms.length}</b></div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Base Stats</h3>
                        <div class="bar-list">
                            ${detailBar('HP',p.stats?.find(s=>s.stat.name==='hp')?.base_stat)}
                            ${detailBar('Attack',p.stats?.find(s=>s.stat.name==='attack')?.base_stat)}
                            ${detailBar('Defense',p.stats?.find(s=>s.stat.name==='defense')?.base_stat)}
                            ${detailBar('Sp. Atk',p.stats?.find(s=>s.stat.name==='special-attack')?.base_stat)}
                            ${detailBar('Sp. Def',p.stats?.find(s=>s.stat.name==='special-defense')?.base_stat)}
                            ${detailBar('Speed',p.stats?.find(s=>s.stat.name==='speed')?.base_stat)}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Weaknesses & Resistances</h3>
                        <div class="weakness-grid">
                            ${weaknesses.map(x=>`<span style="background:${x.mult>1?'#5a2738':x.mult===0?'#3b3b4e':'#164b3c'}">${cap(x.type)} ×${x.mult}</span>`).join('')}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Evolution Chain</h3>
                        <div class="evolution-tree">
                            ${levels.flatMap((level,i)=>[
                                ...level.map(name=>{
                                    const q=em.get(name);
                                    if(!q)return '';
                                    return `<button class="evo-node" data-detail="${esc(q.name)}">
                                        <img src="${detailOfficial(q)}" alt="${esc(q.name)}">
                                        <b>${esc(cap(q.name))}</b>
                                    </button>`;
                                }),
                                i<levels.length-1?'<span class="evo-arrow">→</span>':''
                            ]).join('')}
                        </div>
                    </div>
                </div>

                <aside class="info-side full">
                    <h3>Abilities</h3>
                    <div class="ability-list">
                        ${(p.abilities||[]).map(a=>`<div>
                            ${esc(cap(a.ability.name))}${a.is_hidden?' <small>Hidden</small>':''}
                        </div>`).join('')}
                    </div>

                    <h3 style="margin-top:18px">Moves</h3>
                    <div class="move-list">
                        ${(p.moves||[]).slice(0,16).map(m=>`<div>${esc(cap(m.move.name))}</div>`).join('')}
                    </div>

                    <h3 style="margin-top:18px">Forms</h3>
                    <div class="form-grid">
                        ${forms.map(f=>`<div>
                            <img src="${detailOfficial(p)}" alt="${esc(f.name)}">
                           
                        </div>`).join('')}
                    </div>
                </aside>
            </div>`;

    return {p, detailMarkup};
}

async function openDetail(value){
    if(!detailOverlay||!detailBody)return;

    detailOverlay.classList.add('open');
    detailOverlay.setAttribute('aria-hidden','false');
    detailBody.innerHTML='<div class="loading-panel">Loading research profile…</div>';

    try{
        const {p,detailMarkup}=await loadDetailProfile(value);
        detailBody.innerHTML=detailMarkup;
        const infoResult=$('infoResult');
        if(infoResult)infoResult.innerHTML=detailMarkup;
    }catch(err){
        console.error('Detail overlay API error:',err);
        const detailError='<div class="error-panel"><h2>Research profile unavailable</h2><p>Some Pokémon data could not be loaded. Please retry.</p></div>';
        detailBody.innerHTML=detailError;
        const infoResult=$('infoResult');
        if(infoResult)infoResult.innerHTML=detailError;
    }
}

async function searchInfoDetail(value){
    const name=String(value||'').trim();
    const infoResult=$('infoResult');
    if(!infoResult)return;
    if(!name){
        infoResult.innerHTML=empty('fa-dna','Search a Pokémon','Enter a Pokémon name or Pokédex number.');
        return;
    }

    $('infoSearch').value=name;
    infoResult.innerHTML=loading(`Building research profile for ${cap(name)}…`);

    try{
        const {detailMarkup}=await loadDetailProfile(name);
        infoResult.innerHTML=detailMarkup;
        console.log('Info search API: rendered detailed profile into #infoResult');
        awardXP(5);
    }catch(err){
        console.error('Info search API error:',err);
        infoResult.innerHTML=errorState(
            'Pokémon data could not be loaded',
            String(err?.message||'Check the Pokémon name/number and your internet connection.')
        );
    }
}

async function weaknessesForPokemon(p){
    const rel=await Promise.all(
        (p.types||[]).map(t=>api(`type/${encodeURIComponent(t.type.name)}`))
    );

    return TYPES.map(t=>{
        let mult=1;
        for(const d of rel){
            if(d.damage_relations.double_damage_from.some(x=>x.name===t))mult*=2;
            if(d.damage_relations.half_damage_from.some(x=>x.name===t))mult*=.5;
            if(d.damage_relations.no_damage_from.some(x=>x.name===t))mult=0;
        }
        return {type:t,mult};
    }).filter(x=>x.mult!==1).sort((a,b)=>b.mult-a.mult);
}


// --- Additive Discover features. Kept separate from existing page logic. ---
let wikiCatalog=null, wikiShown=0, wikiFiltered=[];
const TRAINER_RECORDS=[
 {name:'Ash Ketchum',region:'Kanto',role:'Pokémon Trainer',tag:'Anime hero',color:'#e84e4e',emoji:'⚡',image:'https://img.pokemondb.net/trainers/ash.png',team:['pikachu','charizard','greninja','sceptile','infernape','snorlax'],about:'A determined trainer whose journey spans many regions. Pikachu is his best-known partner.'},
 {name:'Misty',region:'Kanto',role:'Water-type specialist',tag:'Cerulean Gym',color:'#48a7d9',emoji:'💧',image:'https://img.pokemondb.net/trainers/misty.png',team:['starmie','psyduck','togekiss','gyarados','corsola'],about:'The Cerulean Gym Leader known for her Water-type Pokémon and spirited personality.'},
 {name:'Brock',region:'Kanto',role:'Rock-type specialist',tag:'Pewter Gym',color:'#c58b54',emoji:'🪨',image:'https://img.pokemondb.net/trainers/brock.png',team:['onix','geodude','crobat','steelix','ludicolo'],about:'A former Pewter City Gym Leader with a strong understanding of Pokémon care.'},
 {name:'Gary Oak',region:'Kanto',role:'Researcher & Trainer',tag:'Ash’s rival',color:'#8a83e6',emoji:'🔬',image:'https://img.pokemondb.net/trainers/gary.png',team:['blastoise','arcanine','electivire','umbreon','nidoking'],about:'A talented rival who later follows his interest in Pokémon research.'},
 {name:'Cynthia',region:'Sinnoh',role:'Champion',tag:'Sinnoh League',color:'#b18ae8',emoji:'👑',image:'https://img.pokemondb.net/trainers/cynthia.png',team:['garchomp','spiritomb','lucario','milotic','roserade','togekiss'],about:'The Sinnoh Champion and a respected researcher of ancient Pokémon history.'},
 {name:'Leon',region:'Galar',role:'Champion',tag:'Unbeatable Champion',color:'#eaa34d',emoji:'🏆',image:'https://img.pokemondb.net/trainers/leon.png',team:['charizard','dragapult','aegislash','haxorus','rillaboom'],about:'Galar’s celebrated Champion, famous for his Charizard and spectacular battles.'},
 {name:'Lance',region:'Kanto',role:'Dragon specialist',tag:'Elite Four / Champion',color:'#d95b5b',emoji:'🐉',image:'https://img.pokemondb.net/trainers/lance.png',team:['dragonite','gyarados','aerodactyl','charizard'],about:'A powerful Dragon-type trainer known for his Dragonite.'},
 {name:'Serena',region:'Kalos',role:'Pokémon Performer',tag:'Kalos journey',color:'#d86fa5',emoji:'🎀',image:'https://img.pokemondb.net/trainers/serena.png',team:['delphox','pancham','sylveon'],about:'A performer and trainer who develops her own path through the Kalos region.'},
 {name:'Red',region:'Kanto',role:'Silent protagonist',tag:'Pokémon Trainer',color:'#e65b58',emoji:'🔥',image:'https://img.pokemondb.net/trainers/red.png',team:['pikachu','charizard','venusaur','blastoise','snorlax','lapras'],about:'An iconic game protagonist, often depicted as an exceptionally skilled trainer.'},
 {name:'Iris',region:'Unova',role:'Dragon-type specialist',tag:'Champion',color:'#6e9d55',emoji:'🐲',image:'https://img.pokemondb.net/trainers/iris.png',team:['haxorus','excadrill','emolga','dragonite'],about:'A lively Dragon-type trainer who becomes a Champion in the animated series.'},
 {name:'May',region:'Hoenn',role:'Pokémon Coordinator',tag:'Hoenn journey',color:'#e7a0a7',emoji:'🌺',image:'https://img.pokemondb.net/trainers/may.png',team:['blaziken','skitty','bulbasaur','munchlax'],about:'A Hoenn traveler who discovers her passion for Pokémon Contests.'},
 {name:'Dawn',region:'Sinnoh',role:'Pokémon Coordinator',tag:'Sinnoh journey',color:'#65a8df',emoji:'💙',image:'https://img.pokemondb.net/trainers/dawn.png',team:['piplup','ambipom','mamoswine','togekiss'],about:'A confident coordinator whose partner Pokémon is Piplup.'}
];
const BOOK_RECORDS=[
 {title:'Pokécology: An Illustrated Guide to Pokémon Ecology',category:'ecology',type:'Field guide',desc:'An illustrated, nature-focused look at Pokémon habitats and behavior.',emoji:'🌿',tone:'green',query:'Pokecology An Illustrated Guide to Pokemon Ecology'},
 {title:'Pokémon Deluxe Essential Handbook',category:'guide',type:'Pokédex guide',desc:'A reference-style guide to Pokémon species, details and trivia.',emoji:'📘',tone:'blue',query:'Pokemon Deluxe Essential Handbook'},
 {title:'Pokémon: The Official Pokémon Encyclopedia',category:'guide',type:'Encyclopedia',desc:'A broad reference shelf for fans who enjoy collecting Pokémon facts.',emoji:'📚',tone:'purple',query:'Pokemon official encyclopedia book'},
 {title:'Pokémon Adventures',category:'manga',type:'Manga series',desc:'A long-running manga adventure following trainers through different regions.',emoji:'⚔️',tone:'red',query:'Pokemon Adventures manga'},
 {title:'Pokémon: How to Draw',category:'activity',type:'Drawing activity',desc:'A creative activity-book search for drawing favorite Pokémon.',emoji:'✏️',tone:'yellow',query:'Pokemon how to draw activity book'},
 {title:'Pokémon Super Extra Deluxe Essential Handbook',category:'guide',type:'Reference guide',desc:'A compact reference-book option for browsing species and characters.',emoji:'🔎',tone:'teal',query:'Pokemon Super Extra Deluxe Essential Handbook'},
 {title:'Pokémon Journeys: The Series',category:'manga',type:'Manga / story',desc:'Story-focused reading inspired by Pokémon journeys and adventures.',emoji:'🗺️',tone:'orange',query:'Pokemon Journeys manga'},
 {title:'Pokémon Activity Book',category:'activity',type:'Puzzles & activities',desc:'Look for official puzzles, coloring books and activity editions.',emoji:'🎨',tone:'pink',query:'official Pokemon activity book'}
];
function initWiki(){
 const type=$('wikiType');if(type&&type.options.length===1)TYPES.forEach(t=>type.add(new Option(cap(t),t)));
 if(!wikiCatalog){$('wikiGrid').innerHTML=loading('Preparing the Pokémon Wiki…');api('pokemon?limit=1025&offset=0').then(d=>{wikiCatalog=d.results.map((p,i)=>({name:p.name,id:i+1}));applyWikiFilters(true)}).catch(()=>{$('wikiGrid').innerHTML=errorState('Wiki records unavailable','Check your internet connection and retry.');});}
 else applyWikiFilters(true);
}
let wikiFilterToken=0;
async function applyWikiFilters(reset=false){
 if(!wikiCatalog)return;
 const token=++wikiFilterToken;
 const q=($('wikiSearch')?.value||'').trim().toLowerCase(),gen=$('wikiGeneration')?.value||'all',type=$('wikiType')?.value||'all';
 let source=wikiCatalog;
 if(type!=='all'){
   try{
     const d=await api(`type/${encodeURIComponent(type)}`);
     source=d.pokemon.map(x=>{const url=x.pokemon.url;const id=Number(url.match(/\/pokemon\/(\d+)\//)?.[1]||0);return {name:x.pokemon.name,id}}).filter(x=>x.id);
   }catch(err){console.warn('Wiki type filter failed',err);}
 }
 if(token!==wikiFilterToken)return;
 wikiFiltered=source.filter(p=>(!q||p.name.includes(q)||String(p.id)===q)&&(gen==='all'||(p.id>=GEN_RANGES[+gen][0]&&p.id<=GEN_RANGES[+gen][1])));
 if(reset)wikiShown=0;
 $('wikiResultCount').textContent=`${wikiFiltered.length.toLocaleString()} Pokémon records`;
 $('wikiLoadMore').style.display=wikiShown>=wikiFiltered.length?'none':'inline-flex';
 if(!wikiFiltered.length){$('wikiGrid').innerHTML=empty('fa-magnifying-glass','No Pokémon found','Try another name, number, type or generation.');return}
 if(reset){$('wikiGrid').innerHTML='';loadWikiBatch('all');}
}
async function loadWikiBatch(typeOverride){
 const start=wikiShown,end=Math.min(start+18,wikiFiltered.length);
 if(start===0)$('wikiGrid').innerHTML=loading('Loading research records…');
 const batch=wikiFiltered.slice(start,end);
 const records=await Promise.all(batch.map(x=>getPokemon(x.name).catch(()=>null)));
 const filtered=records.filter(Boolean).filter(p=>!typeOverride||typeOverride==='all'||p.types.some(t=>t.type.name===typeOverride));
 if(start===0)$('wikiGrid').innerHTML='';
 if(!filtered.length&&start===0)$('wikiGrid').innerHTML=empty('fa-filter','No matching type','Try a different type or clear the filters.');
 else $('wikiGrid').insertAdjacentHTML('beforeend',filtered.map(p=>`<article class="plx-wiki-card"><button class="plx-wiki-art" data-wiki-open="${esc(p.name)}" aria-label="Open ${esc(p.name)} research profile"><img loading="lazy" src="${imageOf(p)}" alt="${esc(p.name)}"><span>#${String(p.id).padStart(4,'0')}</span></button><div class="plx-wiki-card-body"><div class="plx-card-title"><h3>${esc(cap(p.name))}</h3><span>${p.base_experience??'—'} XP</span></div><div class="card-types">${p.types.map(t=>typeBadge(t.type.name)).join('')}</div><div class="plx-mini-facts"><span><small>HEIGHT</small><b>${(p.height/10).toFixed(1)} m</b></span><span><small>WEIGHT</small><b>${(p.weight/10).toFixed(1)} kg</b></span></div><button class="btn ghost plx-open-profile" data-wiki-open="${esc(p.name)}">Open Wiki Profile <i class="fa-solid fa-arrow-right"></i></button></div></article>`).join(''));
 wikiShown=end;$('wikiLoadMore').style.display=wikiShown>=wikiFiltered.length?'none':'inline-flex';
}
function renderTrainerDirectory(){
 const q=($('trainerSearch')?.value||'').trim().toLowerCase(),region=$('trainerRegion')?.value||'all';
 const records=TRAINER_RECORDS.filter(t=>(region==='all'||t.region===region)&&(!q||`${t.name} ${t.region} ${t.role} ${t.tag}`.toLowerCase().includes(q)));
 $('trainerDirectory').innerHTML=records.map(t=>`<article class="plx-trainer-card" style="--trainer-accent:${t.color}"><div class="plx-trainer-banner"><span>${t.emoji} ${esc(t.region)}</span><span>${esc(t.tag)}</span></div><div class="plx-trainer-main"><div class="plx-trainer-portrait"><img src="${t.image}" alt="${esc(t.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('plx-no-portrait');this.parentElement.setAttribute('data-initials','${esc(t.name.split(' ').map(x=>x[0]).join(''))}')"></div><div class="plx-trainer-copy"><h3>${esc(t.name)}</h3><span>${esc(t.role)}</span></div></div><p>${esc(t.about)}</p><div class="plx-team-preview">${t.team.slice(0,4).map(n=>`<img loading="lazy" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonIdGuess(n)}.png" alt="${esc(n)}" title="${esc(cap(n))}" onerror="this.style.display='none'">`).join('')}<span>+${Math.max(0,t.team.length-4)} team</span></div><button class="btn primary plx-trainer-open" data-trainer-open="${esc(t.name)}">Explore team <i class="fa-solid fa-arrow-right"></i></button></article>`).join('')||empty('fa-user-group','No trainers found','Try another name or region.');
 $('trainerTeamDetail').hidden=true;
}
function pokemonIdGuess(name){const ids={pikachu:25,charizard:6,greninja:658,sceptile:254,infernape:392,snorlax:143,starmie:121,psyduck:54,togekiss:468,gyarados:130,corsola:222,onix:95,geodude:74,crobat:169,steelix:208,ludicolo:272,blastoise:9,arcanine:59,electivire:466,umbreon:197,nidoking:34,garchomp:445,spiritomb:442,lucario:448,milotic:350,roserade:407,dragapult:887,aegislash:681,haxorus:612,rillaboom:812,dragonite:149,aerodactyl:142,delphox:655,pancham:674,sylveon:700,venusaur:3,lapras:131,excadrill:530,emolga:587,blaziken:257,skitty:300,bulbasaur:1,munchlax:446,piplup:393,ambipom:424,mamoswine:473};return ids[name]||25}
async function openTrainerTeam(name){
 const t=TRAINER_RECORDS.find(x=>x.name===name);if(!t)return;
 const detail=$('trainerTeamDetail');detail.hidden=false;detail.innerHTML=`<div class="plx-team-detail-head"><div><span class="eyebrow">TRAINER TEAM</span><h2>${esc(t.name)}</h2><p>${esc(t.about)}</p></div><button class="btn ghost" id="closeTrainerTeam"><i class="fa-solid fa-xmark"></i> Close</button></div><div class="plx-team-pokemon">${t.team.map(n=>`<button class="plx-team-pokemon-card" data-wiki-open="${esc(n)}"><img loading="lazy" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonIdGuess(n)}.png" alt="${esc(n)}" onerror="this.src='https://img.pokemondb.net/sprites/home/normal/${esc(n)}.png'"><b>${esc(cap(n))}</b><span>Open Pokémon profile <i class="fa-solid fa-arrow-up-right-from-square"></i></span></button>`).join('')}</div>`;
 detail.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderBookLibrary(){
 const q=($('bookSearch')?.value||'').trim().toLowerCase(),cat=$('bookCategory')?.value||'all';
 const list=BOOK_RECORDS.filter(b=>(cat==='all'||b.category===cat)&&(!q||`${b.title} ${b.type} ${b.desc}`.toLowerCase().includes(q)));
 $('bookGrid').innerHTML=list.map((b,i)=>`<article class="plx-book-card"><div class="plx-book-cover tone-${b.tone}"><span class="plx-book-mark">${b.emoji}</span><small>POKÉMON READING ROOM</small><strong>${esc(b.title)}</strong><span class="plx-cover-lines"></span><em>${esc(b.type)}</em></div><div class="plx-book-copy"><span class="plx-book-category">${esc(b.type)}</span><h3>${esc(b.title)}</h3><p>${esc(b.desc)}</p><a class="btn ghost" href="https://www.google.com/search?q=${encodeURIComponent(b.query+' official book')}" target="_blank" rel="noopener noreferrer">Find book <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div></article>`).join('')||empty('fa-book-open','No books match','Try another search or category.');
}
document.addEventListener('click',e=>{
 const wiki=e.target.closest('[data-wiki-open]');if(wiki){openDetail(wiki.dataset.wikiOpen);return}
 const trainer=e.target.closest('[data-trainer-open]');if(trainer){openTrainerTeam(trainer.dataset.trainerOpen);return}
 if(e.target.closest('#closeTrainerTeam')){$('trainerTeamDetail').hidden=true;return}
});
$('wikiSearchBtn')?.addEventListener('click',()=>applyWikiFilters(true));
$('wikiSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')applyWikiFilters(true)});
$('wikiType')?.addEventListener('change',()=>applyWikiFilters(true));
$('wikiGeneration')?.addEventListener('change',()=>applyWikiFilters(true));
$('wikiLoadMore')?.addEventListener('click',()=>loadWikiBatch('all'));
$('trainerSearch')?.addEventListener('input',renderTrainerDirectory);
$('trainerRegion')?.addEventListener('change',renderTrainerDirectory);
$('bookSearch')?.addEventListener('input',renderBookLibrary);
$('bookCategory')?.addEventListener('change',renderBookLibrary);
