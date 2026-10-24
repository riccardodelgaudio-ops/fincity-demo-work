// FinCity play-money market values for sold digital buildings.
(function(){
  "use strict";
  const GAME_KEY="fincity-auction-game-v1";
  const money=n=>new Intl.NumberFormat("de-CH",{style:"currency",currency:"CHF",maximumFractionDigits:0}).format(Math.round(Number(n)||0));
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const currentCity=()=>window.getCurrentFinCityCity?getCurrentFinCityCity():{slug:"zurich",name:"Zürich"};
  function game(){try{return JSON.parse(localStorage.getItem(GAME_KEY)||"null")}catch(e){return null}}
  function cityState(){const g=game(),c=currentCity();return g?.cities?.[c.slug]||null}
  function hash(v){let h=0;for(const ch of String(v))h=(h*31+ch.charCodeAt(0))>>>0;return h}
  function stats(){
    const c=cityState()||{buildings:[],sales:[],drops:[],userCount:1};
    const sold=(c.buildings||[]).length;
    const sales=(c.sales||[]);
    const bids=(c.drops||[]).reduce((n,a)=>n+(a.bids?.length||0),0);
    const supply=(c.drops||[]).filter(a=>a.status==="live"||a.status==="planned").length;
    const scarcity=clamp((6-supply)*0.06,0,0.30);
    const resaleRatios=sales.filter(x=>Number(x.previousPrice)>0&&Number(x.amount)>0).map(x=>Number(x.amount)/Number(x.previousPrice));
    const comparable=resaleRatios.length?resaleRatios.reduce((a,b)=>a+b,0)/resaleRatios.length:1;
    const activity=clamp(sold*0.035+sales.length*0.08+bids*0.018+(Number(c.userCount)||1)*0.002+scarcity,0.20,1.35);
    const cityMultiplier=clamp(Math.max(1+activity,comparable*1.05),1.20,2.35);
    return {sold,sales:sales.length,bids,supply,cityMultiplier};
  }
  function valueFor(p){
    const auction=Math.max(10,Number(p.lastAuctionPrice)||10);
    const st=stats();
    const objectDemand=1.08+(hash(p.id||p.name)%63)/100;
    const multiplier=clamp(st.cityMultiplier*objectDemand,1.18,3.05);
    const cityValue=Math.round((auction*st.cityMultiplier)/10)*10;
    const today=Math.round((auction*multiplier)/10)*10;
    const gain=(today/auction-1)*100;
    return {auction,cityValue,today,gain,...st};
  }
  window.finCityGameMarketValue=valueFor;

  function chart(p,m){
    const y1=116;
    const cityRise=clamp((m.cityValue/m.today),0.42,0.88);
    const y2=Math.round(25+(105*cityRise));
    const y3=28;
    const id=String(p.id||"x").replace(/[^a-z0-9_-]/gi,"");
    return '<svg class="gm-chart-svg" viewBox="0 0 320 150" role="img" aria-label="Spielwertentwicklung">'+
      '<defs><linearGradient id="gmA'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c55ec" stop-opacity=".45"/><stop offset="1" stop-color="#7c55ec" stop-opacity=".02"/></linearGradient></defs>'+
      '<line x1="20" y1="126" x2="302" y2="126" stroke="#33405a"/>'+
      '<line x1="20" y1="78" x2="302" y2="78" stroke="#26334a" stroke-dasharray="4 5"/>'+
      '<polygon points="20,'+y1+' 160,'+y2+' 300,'+y3+' 300,126 20,126" fill="url(#gmA'+id+')"/>'+
      '<polyline points="20,'+y1+' 160,'+y2+' 300,'+y3+'" fill="none" stroke="#9d82ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<circle cx="20" cy="'+y1+'" r="6" fill="#fff" stroke="#7550df" stroke-width="4"/>'+
      '<circle cx="160" cy="'+y2+'" r="6" fill="#fff" stroke="#7550df" stroke-width="4"/>'+
      '<circle cx="300" cy="'+y3+'" r="7" fill="#fff" stroke="#7550df" stroke-width="5"/>'+
      '<text x="20" y="144" fill="#8996ae" font-size="9">Auktion</text>'+
      '<text x="138" y="144" fill="#8996ae" font-size="9">Stadtmarkt</text>'+
      '<text x="276" y="144" fill="#8996ae" font-size="9">Heute</text>'+
      '</svg>';
  }
  function card(p){
    const m=valueFor(p),c=currentCity();
    return '<section class="gm-market-card" data-gm-market="'+String(p.id)+'">'+
      '<div class="eyebrow">DIGITALER MARKTWERT · SPIEL</div>'+
      '<div class="gm-market-numbers"><div><span>AUKTION</span><b>'+money(m.auction)+'</b></div><div class="gm-arrow">→</div><div><span>HEUTE</span><b>'+money(m.today)+'</b></div></div>'+
      '<div class="gm-up">↗ +'+m.gain.toFixed(0)+'%</div>'+
      chart(p,m)+
      '<div class="gm-tags"><span>'+m.sold+' Verkäufe</span><span>'+m.bids+' Gebote</span><span>'+Math.max(0,6-m.supply)+'× knapp</span></div>'+
      '<p class="gm-market-note">Spielwert aus Verkäufen, Geboten und verfügbarem Angebot in '+c.name+'. Kein Wert der realen Immobilie.</p>'+
      '</section>';
  }
  function findBuildingFromPanel(){
    if(typeof investment==="undefined"||!panel)return null;
    const heading=panel.querySelector("h2")?.textContent?.trim();
    if(!heading)return null;
    return investment.find(p=>String(p.name).trim()===heading)||null;
  }
  function injectDetail(){
    if(!panel||panel.querySelector("[data-gm-market]"))return;
    if(!panel.textContent.includes("DIGITALES SPIELGEBÄUDE"))return;
    const p=findBuildingFromPanel();if(!p||!p.lastAuctionPrice)return;
    const wrap=document.createElement("div");wrap.innerHTML=card(p);
    const market=wrap.firstElementChild;
    const firstAction=panel.querySelector(".action");
    if(firstAction)panel.insertBefore(market,firstAction);else panel.appendChild(market);
  }
  function decorateRows(){
    if(!panel||typeof investment==="undefined")return;
    panel.querySelectorAll(".active-row[data-building]").forEach(row=>{
      if(row.dataset.gmMarket==="1")return;
      const p=investment.find(x=>String(x.id)===String(row.dataset.building));if(!p)return;
      const m=valueFor(p),right=row.querySelector(".fc-pricecol")||row.lastElementChild;
      if(!right)return;
      right.innerHTML='<div class="eyebrow">HEUTE</div><div class="price gm-green">'+money(m.today)+'</div><div class="gm-mini">↗ +'+m.gain.toFixed(0)+'%</div>';
      row.dataset.gmMarket="1";
    });
  }
  function refresh(){requestAnimationFrame(()=>{decorateRows();injectDetail();});}
  const obs=new MutationObserver(refresh);
  if(typeof panel!=="undefined"&&panel)obs.observe(panel,{childList:true,subtree:true});
  refresh();
})();