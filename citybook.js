// FinCity Citybook: global/city feed, likes, comments, images and direct chats.
(function(){
"use strict";
var KEY="fincity-citybook-v1", USER=localStorage.getItem("fincity-active-player")||"@Player1", tab="global", imageData=null;
var $=function(id){return document.getElementById(id);};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var money=function(n){return new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",maximumFractionDigits:0}).format(Number(n)||0);};
var city=function(){return window.getCurrentFinCityCity?getCurrentFinCityCity():{slug:"zurich",name:"Zürich"};};
var uid=function(){return "cb-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);};
var ago=function(iso){var m=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000));if(m<1)return"gerade eben";if(m<60)return"vor "+m+" Min.";var h=Math.floor(m/60);if(h<24)return"vor "+h+" Std.";var d=Math.floor(h/24);return d<7?"vor "+d+" Tag"+(d===1?"":"en"):new Date(iso).toLocaleDateString("de-CH");};
var initials=function(s){return String(s||"?").replace(/^@/,"").split(/[^A-Za-z0-9ÄÖÜäöü]+/).filter(Boolean).map(function(x){return x[0];}).join("").slice(0,2).toUpperCase()||"FC";};
var hue=function(s){var a=[252,210,175,330,24,145,195,282],h=0;String(s).split("").forEach(function(c){h=(h*31+c.charCodeAt(0))>>>0;});return a[h%a.length];};
var avatar=function(u){return '<span class="cb-av" style="--h:'+hue(u)+'">'+esc(initials(u))+'</span>';};
var state=null;try{state=JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){}
if(!state||state.version!==1)state={version:1,posts:[],likes:{},comments:{},messages:{},seeded:false};
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
function seed(){
 if(state.seeded)return;var t=Date.now();
 state.posts.push(
  {id:"cb-seed-1",scope:"global",citySlug:"zurich",cityName:"Zürich",user:"@UrbanAlpha",type:"community",text:"Willkommen im Citybook. Welche City Drops beobachtet ihr diese Woche?",createdAt:new Date(t-25*60000).toISOString()},
  {id:"cb-seed-2",scope:"global",citySlug:"bern",cityName:"Bern",user:"@SwissCompound",type:"purchase",text:"Neuer Kauf in Bern: Ein digitales Gebäude hat einen neuen Besitzer gefunden.",meta:"City Drop · Community-Meldung",createdAt:new Date(t-3*3600000).toISOString()},
  {id:"cb-seed-3",scope:"global",citySlug:"luzern",cityName:"Luzern",user:"@LakeAlpha",type:"community",text:"Luzern wird spannend. Ich schaue mir gerade die nächsten Auktionen rund ums Zentrum an.",createdAt:new Date(t-8*3600000).toISOString()}
 );
 state.comments["cb-seed-1"]=[{id:uid(),user:"@ZurichCore",text:"Für mich ist die Gebotszahl fast so interessant wie der Zuschlagspreis.",createdAt:new Date(t-10*60000).toISOString()}];
 state.seeded=true;save();
}
seed();
function syncSales(){
 var g=null;try{g=JSON.parse(localStorage.getItem("fincity-auction-game-v1")||"null");}catch(e){}
 if(!g||!g.cities)return;var cities=window.getFinCityCities?getFinCityCities():[];
 Object.keys(g.cities).forEach(function(slug){var c=g.cities[slug];(c.sales||[]).forEach(function(s){
  var id="sale-"+slug+"-"+s.id+"-"+(s.at||"");if(state.posts.some(function(p){return p.id===id;}))return;
  var cn=(cities.find(function(x){return x.slug===slug;})||{}).name||slug;
  state.posts.push({id:id,scope:"global",citySlug:slug,cityName:cn,user:s.buyer||"@FinCityUser",type:"purchase",text:(s.buyer||"Ein User")+" hat "+s.name+" für "+money(s.amount)+" gekauft.",meta:s.resale?"Sekundärmarkt · Wiederverkauf":"City Drop · Erstverkauf",createdAt:s.at||new Date().toISOString()});
 });});save();
}
function autoPosts(){
 var c=city(),rows=[],inv=typeof investment!=="undefined"?investment:[],auc=typeof auctions!=="undefined"?auctions:[];
 if(inv[0])rows.push({id:"auto-b-"+c.slug+"-"+inv[0].id,scope:"city",citySlug:c.slug,cityName:c.name,user:inv[0].holder||"@CityInvestor",type:"purchase",text:(inv[0].holder||"Ein User")+" besitzt "+inv[0].name+". Letzter Zuschlag: "+money(inv[0].lastAuctionPrice)+".",meta:"Digitale Immobilie",createdAt:new Date(Date.now()-80*60000).toISOString()});
 if(auc[0])rows.push({id:"auto-a-"+c.slug+"-"+auc[0].id,scope:"city",citySlug:c.slug,cityName:c.name,user:"@FinCity",type:"auction",text:"Neue Auktion in "+c.name+": "+auc[0].name+". Wer beobachtet dieses Objekt?",meta:auc[0].address||"City Drop",createdAt:new Date(Date.now()-32*60000).toISOString()});
 return rows;
}
function likeCount(id){return Number((state.likes[id]||{}).count||0);}
function liked(id){return Boolean((state.likes[id]||{}).mine);}
function comments(id){return state.comments[id]||[];}
function posts(){
 syncSales();var c=city(),base=state.posts.filter(function(p){return tab==="global"?(p.scope==="global"||p.scope==="city"):p.citySlug===c.slug;});
 var rows=tab==="city"?base.concat(autoPosts()):base,seen={};
 return rows.filter(function(p){if(seen[p.id])return false;seen[p.id]=1;return true;}).sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});
}
function tabsHtml(){
 var c=city();return '<div class="cb-tabs"><button class="'+(tab==="global"?"active":"")+'" data-tab="global">🌐 GLOBAL</button><button class="'+(tab==="city"?"active":"")+'" data-tab="city">◆ '+esc(c.name.toUpperCase())+'</button><button class="'+(tab==="chats"?"active":"")+'" data-tab="chats">💬 CHATS</button></div>';
}
function composer(){
 var c=city(),preview=imageData?'<div class="cb-preview"><img src="'+imageData+'" alt="Vorschau"><button id="cbRemove">×</button></div>':"";
 return '<div class="cb-compose"><div class="cb-compose-head">'+avatar(USER)+'<div><strong>'+USER+'</strong><small>'+(tab==="city"?esc(c.name):"Global · alle Städte")+'</small></div></div><textarea id="cbText" maxlength="500" placeholder="Was passiert gerade in FinCity?"></textarea>'+preview+'<div class="cb-compose-actions"><label>▧ BILD<input id="cbFile" type="file" accept="image/*" hidden></label><span>Feed: <b>'+(tab==="city"?esc(c.name):"GLOBAL")+'</b></span><button id="cbPost">POSTEN</button></div></div>';
}
function commentsHtml(p){
 var rows=comments(p.id).map(function(c){return '<div class="cb-comment">'+avatar(c.user)+'<div><strong>'+esc(c.user)+'</strong><p>'+esc(c.text)+'</p><small>'+ago(c.createdAt)+'</small></div></div>';}).join("");
 return '<div class="cb-comments" id="comments-'+esc(p.id)+'" hidden>'+rows+'<form class="cb-comment-form" data-comment="'+esc(p.id)+'"><input maxlength="240" placeholder="Kommentar schreiben …"><button>↗</button></form></div>';
}
function postCard(p){
 var cc=comments(p.id).length,icon=p.type==="purchase"?"🏠":p.type==="auction"?"🔨":"◆";
 return '<article class="cb-post"><header>'+avatar(p.user)+'<div class="cb-who"><button data-chat="'+esc(p.user)+'">'+esc(p.user)+'</button><small>'+icon+' '+esc(p.cityName||"Global")+' · '+ago(p.createdAt)+'</small></div><span>···</span></header><p>'+esc(p.text)+'</p>'+(p.meta?'<div class="cb-meta">'+esc(p.meta)+'</div>':"")+(p.image?'<img class="cb-img" src="'+p.image+'" alt="Citybook Bild">':"")+'<div class="cb-counts"><span>'+(likeCount(p.id)?"💜 "+likeCount(p.id):"")+'</span><span>'+(cc?cc+" Kommentar"+(cc===1?"":"e"):"")+'</span></div><div class="cb-actions"><button class="'+(liked(p.id)?"liked":"")+'" data-like="'+esc(p.id)+'">♡ '+(liked(p.id)?"GEFÄLLT MIR":"LIKE")+'</button><button data-comments="'+esc(p.id)+'">◯ KOMMENTIEREN</button>'+(p.user!==USER?'<button data-chat="'+esc(p.user)+'">✉ CHAT</button>':"")+'</div>'+commentsHtml(p)+'</article>';
}
function contactUsers(){
 var s=new Set(["@UrbanAlpha","@LakeAlpha","@ZurichCore","@SwissCompound"]);
 try{users().forEach(function(u){if(u.holder)s.add(u.holder);});}catch(e){}
 state.posts.forEach(function(p){if(p.user)s.add(p.user);});s.delete(USER);return Array.from(s).sort();
}
function threadKey(u){return [USER,u].sort().join("|");}
function thread(u){
 var k=threadKey(u);if(!state.messages[k]){state.messages[k]=[{id:uid(),from:u,to:USER,text:"Hallo 👋 Schön, dich im Citybook zu sehen.",createdAt:new Date(Date.now()-70*60000).toISOString()}];save();}return state.messages[k];
}
function chatList(){
 var html=contactUsers().map(function(u){var a=thread(u),m=a[a.length-1];return '<button class="cb-contact" data-openchat="'+esc(u)+'">'+avatar(u)+'<span><strong>'+esc(u)+'</strong><small>'+esc(m?m.text:"Chat starten")+'</small></span><em>›</em></button>';}).join("");
 return '<div class="cb-chat-list"><div class="cb-section">DIREKTNACHRICHTEN</div>'+html+'<p class="note">Demo: Nachrichten bleiben lokal in diesem Browser. Für die Produktversion braucht Citybook Benutzerkonten, Moderation, Meldefunktionen und einen sicheren Chat-Dienst.</p></div>';
}
function activate(){document.querySelectorAll(".nav-btn").forEach(function(b){b.classList.toggle("active",b.dataset.view==="citybook");});}
function show(name){
 USER=localStorage.getItem("fincity-active-player")||USER;
 if(name)tab=name;activate();var body=tab==="chats"?chatList():composer()+'<div class="cb-feed">'+(posts().map(postCard).join("")||'<div class="card"><div class="note">Noch keine Beiträge.</div></div>')+'</div>';
 openPanel('<div class="eyebrow">CITYBOOK · FINCITY COMMUNITY</div><div class="cb-title"><div><h2>Citybook</h2><p>Menschen, Käufe und Geschichten aus FinCity.</p></div><span>● LIVE DEMO</span></div>'+tabsHtml()+body);bind();
}
window.showCitybook=show;
function showChat(u){
 USER=localStorage.getItem("fincity-active-player")||USER;
 tab="chats";activate();var ms=thread(u),rows=ms.map(function(m){return '<div class="cb-bubble '+(m.from===USER?"mine":"")+'"><p>'+esc(m.text)+'</p><small>'+ago(m.createdAt)+'</small></div>';}).join("");
 openPanel('<div class="eyebrow">CITYBOOK · DIREKT-CHAT</div><div class="cb-chat-head"><button id="cbBack">‹</button>'+avatar(u)+'<div><h2>'+esc(u)+'</h2><small>FinCity User · Direktnachricht</small></div></div><div class="cb-thread" id="cbThread">'+rows+'</div><form class="cb-chat-form" id="cbChatForm"><input id="cbChatText" maxlength="500" placeholder="Nachricht an '+esc(u)+' …"><button>SENDEN</button></form><p class="note">Citybook-Chat · Demo lokal auf diesem Gerät.</p>');
 $("cbBack").onclick=function(){show("chats");};$("cbChatForm").onsubmit=function(e){e.preventDefault();var input=$("cbChatText"),txt=input.value.trim();if(!txt)return;thread(u).push({id:uid(),from:USER,to:u,text:txt,createdAt:new Date().toISOString()});save();showChat(u);};
 setTimeout(function(){var x=$("cbThread");if(x)x.scrollTop=x.scrollHeight;},20);
}
function resize(file){
 return new Promise(function(ok,no){if(!file||!file.type.startsWith("image/")||file.size>8*1024*1024)return no();var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var max=900,s=Math.min(1,max/Math.max(im.width,im.height)),w=Math.round(im.width*s),h=Math.round(im.height*s),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,0,0,w,h);ok(c.toDataURL("image/jpeg",.72));};im.onerror=no;im.src=r.result;};r.onerror=no;r.readAsDataURL(file);});
}
function bind(){
 panel.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){show(b.dataset.tab);};});
 panel.querySelectorAll("[data-like]").forEach(function(b){b.onclick=function(){var id=b.dataset.like,x=state.likes[id]||{count:0,mine:false};x.mine=!x.mine;x.count=Math.max(0,x.count+(x.mine?1:-1));state.likes[id]=x;save();show(tab);};});
 panel.querySelectorAll("[data-comments]").forEach(function(b){b.onclick=function(){var x=$("comments-"+b.dataset.comments);if(x){x.hidden=!x.hidden;if(!x.hidden)x.querySelector("input").focus();}};});
 panel.querySelectorAll(".cb-comment-form").forEach(function(f){f.onsubmit=function(e){e.preventDefault();var input=f.querySelector("input"),txt=input.value.trim();if(!txt)return;(state.comments[f.dataset.comment]||(state.comments[f.dataset.comment]=[])).push({id:uid(),user:USER,text:txt,createdAt:new Date().toISOString()});save();show(tab);};});
 panel.querySelectorAll("[data-chat]").forEach(function(b){b.onclick=function(){if(b.dataset.chat&&b.dataset.chat!==USER)showChat(b.dataset.chat);};});
 panel.querySelectorAll("[data-openchat]").forEach(function(b){b.onclick=function(){showChat(b.dataset.openchat);};});
 if($("cbPost"))$("cbPost").onclick=function(){var txt=$("cbText").value.trim();if(!txt&&!imageData)return;var c=city();state.posts.push({id:uid(),scope:tab==="city"?"city":"global",citySlug:c.slug,cityName:c.name,user:USER,type:"community",text:txt||"Neues Bild aus FinCity.",image:imageData||null,createdAt:new Date().toISOString()});imageData=null;save();show(tab);};
 if($("cbFile"))$("cbFile").onchange=async function(){try{imageData=await resize($("cbFile").files[0]);show(tab);}catch(e){alert("Bitte ein Bild bis 8 MB verwenden.");}};
 if($("cbRemove"))$("cbRemove").onclick=function(){imageData=null;show(tab);};
}
var css=document.createElement("style");css.textContent=
".cb-title{display:flex;justify-content:space-between;gap:10px}.cb-title h2{margin-bottom:2px}.cb-title p{margin:0;color:#8e9ab3;font-size:10px}.cb-title>span{font-size:7px;color:#65d89c;border:1px solid #24543c;background:#0c2118;border-radius:999px;padding:5px 7px;height:max-content}.cb-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:12px 0}.cb-tabs button{border:1px solid #293650;background:#0a101c;color:#8f9bb3;border-radius:10px;padding:9px 4px;font-size:8px;font-weight:900}.cb-tabs button.active{background:#2a2459;color:#fff;border-color:#55449c}.cb-compose,.cb-post{border:1px solid #26334b;background:#0b111d;border-radius:15px;padding:11px}.cb-compose{margin-bottom:10px}.cb-compose-head{display:flex;align-items:center;gap:8px}.cb-compose-head strong{display:block;font-size:11px}.cb-compose-head small{display:block;color:#7f8ba2;font-size:8px}.cb-compose textarea{width:100%;min-height:70px;border:0;border-top:1px solid #202c42;background:transparent;color:#fff;outline:0;margin-top:8px;padding:9px 2px;font-size:11px;resize:vertical}.cb-compose-actions{display:flex;align-items:center;gap:6px;border-top:1px solid #202c42;padding-top:8px}.cb-compose-actions label,.cb-compose-actions button{border:1px solid #33415e;background:#111a2c;color:#c3cbe0;border-radius:9px;padding:7px 9px;font-size:8px;font-weight:900}.cb-compose-actions span{flex:1;color:#78869f;font-size:7px}.cb-compose-actions button{background:#7045e8;color:#fff}.cb-preview{position:relative}.cb-preview img,.cb-img{width:100%;max-height:300px;object-fit:cover;border-radius:12px}.cb-preview button{position:absolute;right:6px;top:6px;border:0;border-radius:50%;width:28px;height:28px;background:#0a101ddd;color:#fff}.cb-feed{display:flex;flex-direction:column;gap:9px}.cb-post header{display:flex;align-items:center;gap:8px}.cb-av{width:34px;height:34px;flex:0 0 34px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,hsl(var(--h) 75% 58%),hsl(var(--h) 65% 35%));border:2px solid #ffffff40;color:#fff;font-size:9px;font-weight:950}.cb-who{flex:1}.cb-who button{border:0;background:transparent;color:#fff;padding:0;font-size:11px;font-weight:900}.cb-who small{display:block;color:#7f8ba2;font-size:7px}.cb-post header>span{color:#748199}.cb-post>p{font-size:11px;line-height:1.45;margin:10px 0 7px;white-space:pre-wrap}.cb-meta{font-size:8px;color:#b5a4ff;border-left:2px solid #7447ed;padding-left:7px;margin:7px 0}.cb-counts{display:flex;justify-content:space-between;color:#7f8ba2;font-size:7px;padding:7px 2px 4px}.cb-actions{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #202c42;border-bottom:1px solid #202c42}.cb-actions button{border:0;background:transparent;color:#8f9bb3;padding:8px 2px;font-size:7px;font-weight:850}.cb-actions .liked{color:#bdaaff}.cb-comments{padding-top:6px}.cb-comment{display:flex;gap:7px;margin:6px 0}.cb-comment .cb-av{width:27px;height:27px;flex-basis:27px;font-size:7px}.cb-comment>div{flex:1;background:#111a2a;border-radius:11px;padding:7px 9px}.cb-comment strong{font-size:8px}.cb-comment p{font-size:9px;margin:3px 0}.cb-comment small{font-size:6px;color:#748199}.cb-comment-form,.cb-chat-form{display:grid;grid-template-columns:1fr auto;gap:5px}.cb-comment-form input,.cb-chat-form input{border:1px solid #293650;background:#080e19;color:#fff;border-radius:10px;padding:9px;outline:0;font-size:9px}.cb-comment-form button,.cb-chat-form button{border:0;border-radius:10px;background:#7045e8;color:#fff;padding:0 11px;font-size:8px;font-weight:900}.cb-section{font-size:8px;color:#8491aa;letter-spacing:.1em;margin:4px 0 6px}.cb-contact{width:100%;display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:8px;border:0;border-bottom:1px solid #202c42;background:transparent;color:#fff;text-align:left;padding:9px 3px}.cb-contact strong{display:block;font-size:10px}.cb-contact small{display:block;color:#77849a;font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cb-contact em{font-size:22px;color:#6e7b93}.cb-chat-head{display:flex;align-items:center;gap:8px;border-bottom:1px solid #202c42;padding-bottom:9px}.cb-chat-head>button{border:0;background:#151e30;color:#fff;width:30px;height:30px;border-radius:50%;font-size:20px}.cb-chat-head h2{font-size:16px;margin:0}.cb-chat-head small{font-size:7px;color:#7d8aa2}.cb-thread{display:flex;flex-direction:column;gap:6px;max-height:340px;overflow:auto;padding:12px 2px}.cb-bubble{max-width:78%;align-self:flex-start;background:#172238;border:1px solid #2b3a56;border-radius:14px 14px 14px 4px;padding:8px 10px}.cb-bubble.mine{align-self:flex-end;background:#5f39d1;border-color:#7655df;border-radius:14px 14px 4px 14px}.cb-bubble p{margin:0;font-size:10px}.cb-bubble small{display:block;font-size:6px;opacity:.65;margin-top:3px}@media(max-width:760px){.cb-tabs button{font-size:7px}.cb-actions button{font-size:6.2px}.cb-compose,.cb-post{padding:9px}}";
document.head.appendChild(css);
var nav=document.querySelector('.nav-btn[data-view="citybook"]');if(nav)nav.onclick=function(){show(tab);};
var baseSwitch=window.switchCity;if(typeof baseSwitch==="function")window.switchCity=function(slug,showOverview){var r=baseSwitch(slug,showOverview);setTimeout(function(){if(document.querySelector('.nav-btn[data-view="citybook"].active')&&tab==="city")show("city");},500);return r;};
})();