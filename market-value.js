// FinCity indicative digital market value layer.
// Demo-only: visualizes how a digital FinCity building price can develop after auction.
(function(){
  function readOffers(id){
    try{return JSON.parse(localStorage.getItem(`fincity-takeover-offers:${id}`)||'[]')}catch(e){return []}
  }
  function readListing(id){
    try{return JSON.parse(localStorage.getItem(`fincity-sale-listing:${id}`)||'null')}catch(e){return null}
  }
  function money(v){return typeof chf==='function'?chf(Math.round(v)):('CHF '+Math.round(v).toLocaleString('de-CH'))}

  window.finCityMarketValue=function(p){
    const auction=Math.max(1,Number(p.lastAuctionPrice)||1);
    const bids=Math.max(0,Number(p.bidCount)||0);
    const offers=readOffers(p.id);
    const listing=readListing(p.id);
    // City capacity is a compact demo proxy: fewer active digital buildings = tighter available supply.
    const citySupply=typeof investment!=='undefined'?investment.length:12;
    const capacityFactor=Math.max(.03,Math.min(.08,.11-citySupply*.004));
    const demandFactor=Math.min(.16,bids*.002);
    const inquiryFactor=Math.min(.08,offers.length*.02);
    let value=auction*(1+capacityFactor+demandFactor+inquiryFactor);
    const highestOffer=offers.reduce((m,o)=>Math.max(m,Number(o.amount)||0),0);
    if(highestOffer)value=Math.max(value,highestOffer);
    if(listing?.askingPrice)value=Math.max(value,Number(listing.askingPrice)*.96);
    value=Math.round(value/10)*10;
    const gain=Math.max(0,(value/auction-1)*100);
    return {auction,value,gain,bids,offers:offers.length,capacityFactor};
  };

  function chartSvg(p,m){
    const seed=(Number(p.id)||1)%5;
    const pts=[
      [16,116],[58,104-seed],[98,108-seed],[140,84+seed],[181,79-seed],[223,58+seed],[264,50-seed],[310,28]
    ];
    const poly=pts.map(x=>x.join(',')).join(' ');
    const area=`${poly} 310,132 16,132`;
    return `<svg viewBox="0 0 326 150" role="img" aria-label="Preisentwicklung vom Auktionspreis zum aktuellen digitalen Marktwert" style="width:100%;height:auto;display:block">
      <defs>
        <linearGradient id="fcMarketArea${p.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8057f5" stop-opacity=".48"/><stop offset="1" stop-color="#8057f5" stop-opacity=".03"/></linearGradient>
        <linearGradient id="fcMarketLine${p.id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9b83ff"/><stop offset="1" stop-color="#d4c9ff"/></linearGradient>
      </defs>
      <line x1="16" y1="132" x2="310" y2="132" stroke="#33405a" stroke-width="1"/>
      <line x1="16" y1="88" x2="310" y2="88" stroke="#27334b" stroke-width="1" stroke-dasharray="4 5"/>
      <line x1="16" y1="44" x2="310" y2="44" stroke="#27334b" stroke-width="1" stroke-dasharray="4 5"/>
      <polygon points="${area}" fill="url(#fcMarketArea${p.id})"/>
      <polyline points="${poly}" fill="none" stroke="url(#fcMarketLine${p.id})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="116" r="6" fill="#fff" stroke="#8057f5" stroke-width="4"/>
      <circle cx="310" cy="28" r="7" fill="#fff" stroke="#8057f5" stroke-width="5"/>
      <text x="16" y="146" fill="#8e9ab3" font-size="9">Auktion</text>
      <text x="282" y="146" fill="#8e9ab3" font-size="9">Heute</text>
    </svg>`;
  }

  function marketCard(p){
    const m=finCityMarketValue(p);
    return `<section class="fc-market-card" data-market-card="${p.id}">
      <div class="eyebrow">DIGITALER MARKTWERT · DEMO</div>
      <div class="fc-market-head">
        <div><span>AUKTIONSPREIS</span><strong>${money(m.auction)}</strong></div>
        <div class="fc-market-arrow">→</div>
        <div><span>AKTUELLER MARKTWERT</span><strong class="green">${money(m.value)}</strong></div>
      </div>
      <div class="fc-market-gain">↗ +${m.gain.toFixed(1)}% seit der Auktion</div>
      <div class="fc-market-chart">${chartSvg(p,m)}</div>
      <div class="fc-market-factors">
        <span>🔥 ${m.bids} Gebote</span><span>✉ ${m.offers} Übernahmeanfragen</span><span>◇ City-Angebot</span>
      </div>
      <p class="note"><strong>Wie entsteht der Wert?</strong> Der indikative digitale Marktwert ergibt sich in der Demo aus Verkaufs- und Übernahmeanfragen, Nachfrage sowie der verfügbaren Marktkapazität der jeweiligen Stadt. Nach der Erstauktion kann sich der Preis eines digitalen FinCity-Gebäudes im Sekundärmarkt weiterentwickeln.</p>
      <p class="note">Demo-Schätzwert der digitalen FinCity-Position – keine Bewertung oder Wertprognose der realen Immobilie.</p>
    </section>`;
  }

  function injectBuildingCard(id){
    if(typeof panel==='undefined'||!panel)return;
    const p=investment.find(x=>Number(x.id)===Number(id));if(!p||!p.lastAuctionPrice||panel.querySelector('[data-market-card]'))return;
    const wrap=document.createElement('div');wrap.innerHTML=marketCard(p);const card=wrap.firstElementChild;
    const firstAction=panel.querySelector('.action');
    if(firstAction)panel.insertBefore(card,firstAction);else panel.appendChild(card);
  }

  function decorateActiveRows(){
    if(typeof panel==='undefined'||!panel)return;
    panel.querySelectorAll('.active-row[data-building]').forEach(row=>{
      if(row.dataset.marketDecorated==='1')return;
      const p=investment.find(x=>Number(x.id)===Number(row.dataset.building));if(!p||!p.lastAuctionPrice)return;
      const m=finCityMarketValue(p);const right=row.lastElementChild;if(!right)return;
      const d=document.createElement('div');d.className='fc-market-mini';d.innerHTML=`<span>MARKTWERT</span><b>${money(m.value)}</b><em>↗ +${m.gain.toFixed(1)}%</em>`;
      right.insertBefore(d,right.firstChild);row.dataset.marketDecorated='1';
    });
  }

  const css=document.createElement('style');
  css.textContent=`
    .fc-market-card{margin-top:10px;padding:13px;border:1px solid #3a3265;border-radius:15px;background:linear-gradient(180deg,#11152a,#0b111d);overflow:hidden}
    .fc-market-head{display:grid;grid-template-columns:1fr 24px 1fr;gap:7px;align-items:center;margin-top:9px}.fc-market-head span{display:block;font-size:7px;color:#8e9ab3;letter-spacing:.08em}.fc-market-head strong{display:block;margin-top:4px;font-size:17px}.fc-market-arrow{text-align:center;color:#8d71f4;font-size:18px}.fc-market-gain{display:inline-block;margin-top:9px;padding:5px 8px;border-radius:999px;background:#2a2157;color:#bcaaff;font-size:9px;font-weight:900}.fc-market-chart{margin:7px -2px 2px}.fc-market-factors{display:flex;gap:5px;overflow-x:auto;margin:4px 0 8px}.fc-market-factors span{white-space:nowrap;border:1px solid #2c3850;background:#0a101c;border-radius:999px;padding:4px 6px;font-size:7px;color:#a9b4ca}.fc-market-mini{margin-bottom:4px}.fc-market-mini span{display:block;font-size:6.5px;color:#8f9bb3;letter-spacing:.07em}.fc-market-mini b{display:block;font-size:14px;color:#58d99b}.fc-market-mini em{display:block;font-size:7px;color:#9d87ff;font-style:normal;font-weight:800}.nav-btn .ico svg{width:25px;height:25px;display:block}.nav-btn.active .ico svg{filter:drop-shadow(0 0 7px rgba(141,103,255,.28))}
    @media(max-width:760px){.fc-market-head strong{font-size:14px}.fc-market-card{padding:11px}.fc-market-mini b{font-size:12px}}
  `;
  document.head.appendChild(css);

  const baseShowBuilding=window.showBuilding;
  if(typeof baseShowBuilding==='function')window.showBuilding=function(id){const r=baseShowBuilding(id);setTimeout(()=>injectBuildingCard(id),0);return r};

  const baseShowActive=window.showActive;
  if(typeof baseShowActive==='function')window.showActive=function(){const r=baseShowActive();setTimeout(decorateActiveRows,0);return r};
  const activeBtn=document.querySelector('.nav-btn[data-view="active"]');if(activeBtn)activeBtn.onclick=()=>showActive();

  if(typeof panel!=='undefined'&&panel){
    new MutationObserver(()=>{if(panel.querySelector('.active-row[data-building]'))decorateActiveRows()}).observe(panel,{childList:true,subtree:true});
  }
})();