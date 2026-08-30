// Building detail enhancement: photos, auction interest and secondary-market actions.
(function(){
  const photos={
    1:'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=82',
    2:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82',
    3:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=82',
    4:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82',
    5:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82',
    6:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=82',
    7:'https://images.unsplash.com/photo-1600573472550-8090b5e0745d?auto=format&fit=crop&w=1200&q=82',
    8:'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=82',
    9:'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=82',
    10:'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=82',
    11:'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=82',
    12:'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=82',
    13:'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=82',
    14:'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=82',
    15:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=82'
  };

  const listingKey=id=>`fincity-sale-listing:${id}`;
  const offersKey=id=>`fincity-takeover-offers:${id}`;
  function getListing(id){try{return JSON.parse(localStorage.getItem(listingKey(id))||'null')}catch(e){return null}}
  function getOffers(id){try{return JSON.parse(localStorage.getItem(offersKey(id))||'[]')}catch(e){return []}}
  function saveOffers(id,offers){localStorage.setItem(offersKey(id),JSON.stringify(offers))}

  async function reverseAddress(p){
    const target=document.getElementById('buildingAddress');if(!target)return;
    try{
      const r=await fetch(`https://photon.komoot.io/reverse?lon=${encodeURIComponent(p.lng)}&lat=${encodeURIComponent(p.lat)}&lang=de`);
      if(!r.ok)throw new Error('reverse lookup failed');
      const j=await r.json();const x=j.features&&j.features[0]&&j.features[0].properties||{};
      const street=[x.street,x.housenumber].filter(Boolean).join(' ');
      const town=[x.postcode,x.city||x.locality||'Zürich'].filter(Boolean).join(' ');
      target.textContent=[street,town].filter(Boolean).join(', ')||'Standort Zürich';
    }catch(e){target.textContent=`Kartenpunkt ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}
  }

  function showTakeoverOffer(p){
    const listing=getListing(p.id);const offers=getOffers(p.id);
    const suggested=Math.round((listing?.askingPrice||p.lastAuctionPrice*1.15)/10)*10;
    openPanel(`
      <div class="eyebrow">SEKUNDÄRMARKT · ÜBERNAHMEANGEBOT</div>
      <h2>${p.name}</h2>
      <div class="card">
        <div class="previewrow"><span>Aktueller Besitzer</span><b>${p.holder}</b></div>
        <div class="previewrow"><span>Letzter Zuschlag</span><b>${chf(p.lastAuctionPrice)}</b></div>
        ${listing?`<div class="previewrow"><span>Verkauf freigegeben</span><b>${listing.askingPrice?chf(listing.askingPrice):'Preis offen'}</b></div>`:'<div class="previewrow"><span>Verkaufsstatus</span><b>Nicht aktiv ausgeschrieben</b></div>'}
        <div class="previewrow"><span>Bisherige Demo-Angebote</span><b>${offers.length}</b></div>
      </div>
      <label class="eyebrow" for="takeoverAmount">DEIN ÜBERNAHMEANGEBOT</label>
      <input id="takeoverAmount" inputmode="decimal" type="number" min="1" step="10" value="${suggested}" style="width:100%;margin:6px 0 10px;padding:12px;border-radius:10px;border:1px solid #2b3a56;background:#0b111d;color:#fff">
      <label class="eyebrow" for="takeoverNote">NACHRICHT AN DEN BESITZER</label>
      <textarea id="takeoverNote" rows="3" placeholder="Ich möchte das digitale FinCity-Gebäude übernehmen." style="width:100%;margin:6px 0 10px;padding:12px;border-radius:10px;border:1px solid #2b3a56;background:#0b111d;color:#fff"></textarea>
      <button class="action" id="submitTakeover">ÜBERNAHMEANGEBOT UNTERBREITEN</button>
      <button class="action secondary" id="cancelTakeover">ZURÜCK ZUM GEBÄUDE</button>
      <p class="note">Das Angebot betrifft nur die digitale FinCity-Gebäudeposition, nicht die reale Immobilie. Bei einem später erfolgreich abgeschlossenen Sekundärmarkt-Transfer gilt im Pricing-v1 eine FinCity-Marktplatzgebühr von 5 %. Für das reine Unterbreiten eines Angebots fällt keine Gebühr an.</p>
    `);
    document.getElementById('cancelTakeover').onclick=()=>showBuilding(p.id);
    document.getElementById('submitTakeover').onclick=()=>{
      const amount=Number(document.getElementById('takeoverAmount').value);if(!Number.isFinite(amount)||amount<=0)return;
      const note=document.getElementById('takeoverNote').value.trim();
      const all=getOffers(p.id);all.push({buyer:myPortfolio.user,amount,note,createdAt:new Date().toISOString(),status:'offen'});saveOffers(p.id,all);
      openPanel(`<div class="eyebrow">SEKUNDÄRMARKT</div><h2>✓ Angebot übermittelt · Demo</h2><div class="card"><div class="previewrow"><span>Gebäude</span><b>${p.name}</b></div><div class="previewrow"><span>An Besitzer</span><b>${p.holder}</b></div><div class="previewrow"><span>Dein Angebot</span><b>${chf(amount)}</b></div></div><p class="note">Aktuell wird das Angebot lokal auf diesem Gerät gespeichert. Mit Backend würde der Besitzer eine echte Angebotsbenachrichtigung erhalten und könnte annehmen, ablehnen oder ein Gegenangebot senden.</p><button class="action" id="backBuildingAfterOffer">ZURÜCK ZUM GEBÄUDE</button>`);
      document.getElementById('backBuildingAfterOffer').onclick=()=>showBuilding(p.id);
    };
  }

  function showSaleRelease(p){
    const listing=getListing(p.id);const offers=getOffers(p.id);const suggested=listing?.askingPrice||Math.round((p.lastAuctionPrice*1.15)/10)*10;
    openPanel(`
      <div class="eyebrow">MEIN GEBÄUDE · SEKUNDÄRMARKT</div>
      <h2>${listing?'Verkaufsfreigabe bearbeiten':'Gebäude zum Verkauf freigeben'}</h2>
      <div class="card"><div class="previewrow"><span>Gebäude</span><b>${p.name}</b></div><div class="previewrow"><span>Letzter Zuschlag</span><b>${chf(p.lastAuctionPrice)}</b></div><div class="previewrow"><span>Eingegangene Demo-Angebote</span><b>${offers.length}</b></div></div>
      <label class="eyebrow" for="askingPrice">WUNSCHPREIS</label>
      <input id="askingPrice" inputmode="decimal" type="number" min="1" step="10" value="${suggested}" style="width:100%;margin:6px 0 10px;padding:12px;border-radius:10px;border:1px solid #2b3a56;background:#0b111d;color:#fff">
      <button class="action" id="releaseSale">${listing?'VERKAUFSFREIGABE AKTUALISIEREN':'GEBÄUDE ZUM VERKAUF FREIGEBEN'}</button>
      ${listing?'<button class="action secondary" id="removeSale">VERKAUFSFREIGABE AUFHEBEN</button>':''}
      <button class="action secondary" id="backOwnBuilding">ZURÜCK ZUM GEBÄUDE</button>
      <p class="note">Die Freigabe macht das digitale FinCity-Gebäude für Übernahmeangebote sichtbar. Sie verkauft nichts automatisch. Ein Eigentumswechsel würde erst nach Annahme und finalem Transfer erfolgen; Pricing-v1: 5 % Sekundärmarktgebühr an FinCity.</p>
    `);
    document.getElementById('backOwnBuilding').onclick=()=>showBuilding(p.id);
    document.getElementById('releaseSale').onclick=()=>{
      const askingPrice=Number(document.getElementById('askingPrice').value);if(!Number.isFinite(askingPrice)||askingPrice<=0)return;
      localStorage.setItem(listingKey(p.id),JSON.stringify({askingPrice,owner:p.holder,listedAt:new Date().toISOString()}));
      openPanel(`<div class="eyebrow">SEKUNDÄRMARKT</div><h2>✓ Gebäude freigegeben · Demo</h2><div class="card"><div class="previewrow"><span>Gebäude</span><b>${p.name}</b></div><div class="previewrow"><span>Wunschpreis</span><b>${chf(askingPrice)}</b></div></div><p class="note">Das Gebäude ist auf diesem Gerät als zum Verkauf freigegeben markiert. Mit Backend wäre dieser Status für alle FinCity-User sichtbar.</p><button class="action" id="backAfterRelease">ZURÜCK ZUM GEBÄUDE</button>`);
      document.getElementById('backAfterRelease').onclick=()=>showBuilding(p.id);
    };
    const remove=document.getElementById('removeSale');if(remove)remove.onclick=()=>{localStorage.removeItem(listingKey(p.id));showBuilding(p.id)};
  }

  window.showBuilding=function(id){
    const p=investment.find(x=>x.id===id);if(!p)return;
    safeFly(p.lng,p.lat);
    const own=p.holder===myPortfolio.user;const listing=getListing(p.id);const offers=getOffers(p.id);
    const photo=photos[id]||'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=82';
    openPanel(`
      <div class="eyebrow">AKTIVES GEBÄUDE · USER-PERFORMANCE</div>
      <h2>${p.name}</h2>
      <div style="position:relative;height:180px;border-radius:14px;overflow:hidden;background:#111827">
        <img src="${photo}" alt="Demo-Gebäudefoto ${p.name}" style="width:100%;height:100%;object-fit:cover;display:block">
        <div style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.72);padding:5px 7px;border-radius:7px;font-size:7px;letter-spacing:.06em">DEMO-FOTO · NICHT OBJEKTGENAU</div>
      </div>
      <div class="card">
        <div class="eyebrow">KARTEN-STANDORT</div>
        <strong id="buildingAddress">Adresse wird geladen …</strong>
        <div class="note">Der Punkt wird auf die nächstgelegene im Kartenmaterial erkennbare Gebäudefläche gesetzt. Für Produktion: offizielle GWR/EGID-Verknüpfung.</div>
      </div>
      <div class="grid2">
        <div class="metric"><span>USER</span><strong style="font-size:16px">${p.holder}</strong></div>
        <div class="metric"><span>12M USER-RENDITE</span><strong class="green">+${p.ret}%</strong></div>
      </div>
      <div class="card">
        <div class="previewrow"><span>Risiko</span><b>${p.risk}/5 · ${riskLabel(p.risk)}</b></div>
        <div class="previewrow"><span>Slots</span><b>${p.occupied}/${p.slots} belegt · ${free(p)} frei</b></div>
        <div class="previewrow"><span>Slot-Gebühr</span><b>${slotFee(p.ret)}% p.a.</b></div>
        <div class="previewrow"><span>Letzte Auktion</span><b>${chf(p.lastAuctionPrice)} · ${p.lastAuctionDate}</b></div>
        ${Number.isFinite(p.bidCount)?`<div class="previewrow"><span>Interesse bei letzter Auktion</span><b>🔥 ${p.bidCount} Gebote</b></div>`:''}
        ${listing?`<div class="previewrow"><span>Sekundärmarkt</span><b>🟢 Verkauf freigegeben · ${chf(listing.askingPrice)}</b></div>`:''}
        ${own&&offers.length?`<div class="previewrow"><span>Übernahmeangebote</span><b>${offers.length} offen / gespeichert</b></div>`:''}
      </div>
      <div class="card"><div class="eyebrow">USER-ALLOKATION</div>${allocationHtml(p.allocation)}</div>
      ${own?'<button class="action" id="saleReleaseBtn">GEBÄUDE ZUM VERKAUF FREIGEBEN</button>':'<button class="action" id="takeoverOfferBtn">ÜBERNAHMEANGEBOT UNTERBREITEN</button>'}
      ${own?'<button class="action secondary" id="myPortfolioBtn">MEIN GESAMTPORTFOLIO →</button>':'<button class="action secondary" id="copyBtn">SLOT MIETEN · USER-STRATEGIE KOPIEREN →</button>'}
      <button class="action secondary" id="showOnMap">AUF GEBÄUDE ZENTRIEREN</button>
      <p class="note">Sekundärmarkt-Aktionen betreffen die digitale FinCity-Gebäudeposition. Sie übertragen kein Eigentum an der realen Immobilie.</p>
    `);
    reverseAddress(p);
    const center=document.getElementById('showOnMap');if(center)center.onclick=()=>{safeFly(p.lng,p.lat);closePanel()};
    const sale=document.getElementById('saleReleaseBtn');if(sale)sale.onclick=()=>showSaleRelease(p);
    const offer=document.getElementById('takeoverOfferBtn');if(offer)offer.onclick=()=>showTakeoverOffer(p);
    const a=document.getElementById('myPortfolioBtn');if(a)a.onclick=showPortfolio;
    const c=document.getElementById('copyBtn');if(c)c.onclick=()=>copyStrategy(p.holder);
  };
})();