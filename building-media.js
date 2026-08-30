// Building detail enhancement: per-building demo photos + reverse-geocoded map address.
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

  window.showBuilding=function(id){
    const p=investment.find(x=>x.id===id);if(!p)return;
    safeFly(p.lng,p.lat);
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
      </div>
      <div class="card"><div class="eyebrow">USER-ALLOKATION</div>${allocationHtml(p.allocation)}</div>
      <button class="action secondary" id="showOnMap">AUF GEBÄUDE ZENTRIEREN</button>
      ${p.holder===myPortfolio.user?'<button class="action" id="myPortfolioBtn">MEIN GESAMTPORTFOLIO →</button>':'<button class="action" id="copyBtn">SLOT MIETEN · USER-STRATEGIE KOPIEREN →</button>'}
      <p class="note">Das digitale FinCity-Gebäude repräsentiert keine Eigentumsrechte an der realen Immobilie.</p>
    `);
    reverseAddress(p);
    const center=document.getElementById('showOnMap');if(center)center.onclick=()=>{safeFly(p.lng,p.lat);closePanel()};
    const a=document.getElementById('myPortfolioBtn');if(a)a.onclick=showPortfolio;
    const c=document.getElementById('copyBtn');if(c)c.onclick=()=>copyStrategy(p.holder);
  };
})();
