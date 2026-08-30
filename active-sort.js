// FinCity active-building auction sorting.
(function(){
  function parseDateCH(s){
    const m=String(s||'').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);if(!m)return 0;
    return new Date(Number(m[3]),Number(m[2])-1,Number(m[1])).getTime();
  }

  function sortedRows(mode){
    const rows=[...investment];
    if(mode==='amount')return rows.sort((a,b)=>b.lastAuctionPrice-a.lastAuctionPrice||parseDateCH(b.lastAuctionDate)-parseDateCH(a.lastAuctionDate));
    return rows.sort((a,b)=>parseDateCH(b.lastAuctionDate)-parseDateCH(a.lastAuctionDate)||b.lastAuctionPrice-a.lastAuctionPrice);
  }

  function renderActive(mode='date'){
    activeNav('active');
    const rows=sortedRows(mode);
    const latest=sortedRows('date')[0];
    const highest=sortedRows('amount')[0];
    openPanel(`
      <div class="eyebrow">AKTIVE GEBÄUDE · AUKTIONSHISTORIE</div>
      <h2>Gebäudeübersicht</h2>
      <p class="note">Sortiere die aktiven Gebäude nach letzter Auktion oder nach höchstem Auktionsbetrag.</p>

      <div class="grid2">
        <div class="metric" data-building="${latest.id}" style="cursor:pointer">
          <span>LETZTE VERSTEIGERUNG</span>
          <strong style="font-size:15px">${latest.name}</strong>
          <div class="rankmeta">${latest.lastAuctionDate} · ${chf(latest.lastAuctionPrice)}</div>
        </div>
        <div class="metric" data-building="${highest.id}" style="cursor:pointer">
          <span>TEUERSTE VERSTEIGERUNG</span>
          <strong style="font-size:15px">${highest.name}</strong>
          <div class="rankmeta">${chf(highest.lastAuctionPrice)} · ${highest.lastAuctionDate}</div>
        </div>
      </div>

      <div style="display:flex;gap:7px;overflow-x:auto;margin:10px 0">
        <button class="filter ${mode==='date'?'active':''}" data-active-sort="date">NEUESTE AUKTION</button>
        <button class="filter ${mode==='amount'?'active':''}" data-active-sort="amount">HÖCHSTER BETRAG</button>
      </div>

      <div class="active-list">
        ${rows.map((p,i)=>`<div class="active-row" data-building="${p.id}">
          <div>
            <strong>${i+1}. ${p.name}</strong>
            <div class="rankmeta">${p.holder} · +${p.ret}% 12M · Risiko ${p.risk}/5</div>
            <div class="rankmeta">${p.occupied}/${p.slots} Slots belegt · ${free(p)} frei</div>
          </div>
          <div style="text-align:right">
            <div class="price">${chf(p.lastAuctionPrice)}</div>
            <div class="rankmeta">${p.lastAuctionDate}</div>
            <span class="rankfree ${free(p)===0?'full':''}">${free(p)?free(p)+' FREI':'AUSGEBUCHT'}</span>
          </div>
        </div>`).join('')}
      </div>
      <p class="note">Die dargestellten Auktionsbeträge und -daten sind Demo-Daten. Neueste Auktion = jüngstes Auktionsdatum; höchster Betrag = höchster letzter Zuschlagspreis.</p>
    `);

    panel.querySelectorAll('[data-active-sort]').forEach(b=>b.onclick=()=>renderActive(b.dataset.activeSort));
    panel.querySelectorAll('[data-building]').forEach(el=>el.onclick=()=>showBuilding(Number(el.dataset.building)));
  }

  window.showActive=function(){renderActive('date')};
  const btn=document.querySelector('.nav-btn[data-view="active"]');if(btn)btn.onclick=showActive;
})();
