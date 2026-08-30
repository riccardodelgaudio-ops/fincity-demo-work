// FinCity active-building auction sorting + bidding-interest indicator.
(function(){
  const bidCounts={1:18,2:24,3:37,4:31,5:16,6:42,7:14,8:63,9:27,10:35,11:58,12:21,13:44,14:29,15:12};
  investment.forEach(p=>p.bidCount=bidCounts[p.id]||0);

  function parseDateCH(s){
    const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);if(!m)return 0;
    return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
  }

  function sortedRows(mode){
    const rows=[...investment];
    if(mode==='amount')return rows.sort((a,b)=>b.lastAuctionPrice-a.lastAuctionPrice||parseDateCH(b.lastAuctionDate)-parseDateCH(a.lastAuctionDate));
    if(mode==='bids')return rows.sort((a,b)=>(b.bidCount||0)-(a.bidCount||0)||b.lastAuctionPrice-a.lastAuctionPrice);
    return rows.sort((a,b)=>parseDateCH(b.lastAuctionDate)-parseDateCH(a.lastAuctionDate)||b.lastAuctionPrice-a.lastAuctionPrice);
  }

  function renderActive(mode='date'){
    activeNav('active');
    const rows=sortedRows(mode);
    const latest=sortedRows('date')[0];
    const highest=sortedRows('amount')[0];
    const mostBids=sortedRows('bids')[0];
    openPanel(`
      <div class="eyebrow">AKTIVE GEBÄUDE · AUKTIONSHISTORIE</div>
      <h2>Gebäudeübersicht</h2>
      <p class="note">Sortiere nach Auktionsdatum, Zuschlagspreis oder Anzahl Gebote. Die Gebotszahl zeigt das Interesse an der jeweiligen Auktion.</p>

      <div class="grid2">
        <div class="metric" data-building="${latest.id}" style="cursor:pointer">
          <span>LETZTE VERSTEIGERUNG</span>
          <strong style="font-size:15px">${latest.name}</strong>
          <div class="rankmeta">${latest.lastAuctionDate} · ${chf(latest.lastAuctionPrice)} · ${latest.bidCount} Gebote</div>
        </div>
        <div class="metric" data-building="${highest.id}" style="cursor:pointer">
          <span>TEUERSTE VERSTEIGERUNG</span>
          <strong style="font-size:15px">${highest.name}</strong>
          <div class="rankmeta">${chf(highest.lastAuctionPrice)} · ${highest.lastAuctionDate} · ${highest.bidCount} Gebote</div>
        </div>
      </div>
      <div class="card" data-building="${mostBids.id}" style="cursor:pointer;margin-top:8px">
        <div class="previewrow"><span><strong>🔥 MEISTES INTERESSE</strong><div class="rankmeta">${mostBids.name} · ${chf(mostBids.lastAuctionPrice)} · ${mostBids.lastAuctionDate}</div></span><b>${mostBids.bidCount} GEBOTE</b></div>
      </div>

      <div style="display:flex;gap:7px;overflow-x:auto;margin:10px 0">
        <button class="filter ${mode==='date'?'active':''}" data-active-sort="date">NEUESTE AUKTION</button>
        <button class="filter ${mode==='amount'?'active':''}" data-active-sort="amount">HÖCHSTER BETRAG</button>
        <button class="filter ${mode==='bids'?'active':''}" data-active-sort="bids">MEISTE GEBOTE</button>
      </div>

      <div class="active-list">
        ${rows.map((p,i)=>`<div class="active-row" data-building="${p.id}">
          <div>
            <strong>${i+1}. ${p.name}</strong>
            <div class="rankmeta">${p.holder} · +${p.ret}% 12M · Risiko ${p.risk}/5</div>
            <div class="rankmeta">${p.occupied}/${p.slots} Slots belegt · ${free(p)} frei · <strong>${p.bidCount} Gebote</strong></div>
          </div>
          <div style="text-align:right">
            <div class="price">${chf(p.lastAuctionPrice)}</div>
            <div class="rankmeta">${p.lastAuctionDate}</div>
            <div class="rankmeta">🔥 ${p.bidCount} Gebote</div>
            <span class="rankfree ${free(p)===0?'full':''}">${free(p)?free(p)+' FREI':'AUSGEBUCHT'}</span>
          </div>
        </div>`).join('')}
      </div>
      <p class="note">Auktionspreise, Daten und Gebotszahlen sind Demo-Daten. In der späteren Live-Auktion wird die Gebotszahl direkt aus dem Auktionssystem übernommen.</p>
    `);

    panel.querySelectorAll('[data-active-sort]').forEach(b=>b.onclick=()=>renderActive(b.dataset.activeSort));
    panel.querySelectorAll('[data-building]').forEach(el=>el.onclick=()=>showBuilding(Number(el.dataset.building)));
  }

  window.showActive=function(){renderActive('date')};
  const btn=document.querySelector('.nav-btn[data-view="active"]');if(btn)btn.onclick=showActive;
})();