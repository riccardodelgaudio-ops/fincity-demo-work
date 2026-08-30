// FinCity city-scoped leaderboards. No cross-city mixing.
(function(){
  const zurichYtd={'@UrbanAlpha':21.8,'@ZurichCore':19.6,'@ZuriValue':17.9,'@NorthStarZH':15.7,'@SwissCompound':14.8,'@MyFinCity':13.9,'@CityBeta':12.6,'@HelveticGrowth':11.8,'@YieldPilot':10.5,'@LakeAlpha':9.7,'@BlueLake':8.6,'@PeakCapital':7.9,'@LimmatInvestor':6.8};
  const zurichHistory=[
    {year:2026,trophy:'Lindenhof',user:'@UrbanAlpha'},{year:2025,trophy:'Paradeplatz',user:'@ZurichCore'},{year:2024,trophy:'Fraumünster',user:'@LakeAlpha'},{year:2023,trophy:'ETH Hauptgebäude',user:'@ZuriValue'},{year:2022,trophy:'Uetliberg',user:'@NorthStarZH'}
  ];
  const cityName=()=>window.getCurrentFinCityCity?getCurrentFinCityCity().name:'Zürich';

  function currentUsers(){
    return users().map(u=>{const b=userBuildings(u.holder)[0];const ytd=b?.ytd??zurichYtd[u.holder]??u.ret;return {...u,ytd}}).sort((a,b)=>b.ytd-a.ytd);
  }

  window.showRanking=function(){
    activeNav('ranking');const r=currentUsers(),city=cityName();
    openPanel(`
      <div class="eyebrow">FINCITY PERFORMANCE · ${city.toUpperCase()} · LAUFENDES JAHR</div>
      <h2>🏆 Rendite-Rangliste · ${city}</h2>
      <p class="note">Diese Rangliste enthält ausschliesslich User und Gebäude aus ${city}. Beim Stadtwechsel wird eine getrennte Rangliste geladen.</p>
      <div class="card">${r.map((u,i)=>{const bs=userBuildings(u.holder);return `<div class="rankrow" data-ytd-user="${u.holder}"><b>#${i+1}</b><span><strong>${u.holder}</strong><div class="rankmeta">${u.buildings} Gebäude · ${u.slots} Slots · ${u.free} frei</div><div class="rankmeta">${bs.map(b=>b.name.replace('Mein Gebäude · ','')).join(' · ')}</div></span><span class="rankret">+${Number(u.ytd).toFixed(1)}%</span></div>`}).join('')}</div>
      <p class="note">YTD 2026 · Demo-Daten. Ein User = ein Depot = eine Performance; Gebäude bleiben die Besitz- und Slot-Ebene.</p>
    `);
    panel.querySelectorAll('[data-ytd-user]').forEach(el=>el.onclick=()=>showUser(el.dataset.ytdUser));
  };

  function trophyEntries(){
    const city=cityName();
    if(city==='Zürich')return zurichHistory.map(x=>({...x,city}));
    return trophies.filter(t=>t.champion).map(t=>({year:t.champion.year,trophy:t.name,user:t.champion.user,city})).sort((a,b)=>b.year-a.year);
  }
  function trophyUserRanking(entries){
    const m=new Map();entries.forEach(x=>{if(!m.has(x.user))m.set(x.user,{user:x.user,wins:0,lastYear:0,trophies:[]});const u=m.get(x.user);u.wins++;u.lastYear=Math.max(u.lastYear,x.year);u.trophies.push(x)});return [...m.values()].sort((a,b)=>b.wins-a.wins||b.lastYear-a.lastYear||a.user.localeCompare(b.user));
  }

  window.showTrophyRanking=function(){
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='trophies'));
    const city=cityName(),entries=trophyEntries(),ranking=trophyUserRanking(entries),openTrophies=trophies.filter(t=>!t.champion);
    openPanel(`
      <div class="eyebrow">FINCITY TROPHY HALL OF FAME · ${city.toUpperCase()}</div>
      <h2>🏅 Trophy-Rangliste · ${city}</h2>
      <p class="note">Nur Trophy-Erfolge aus ${city}. Zürich, Bern, Genève usw. werden nicht miteinander vermischt.</p>
      <div class="grid2"><div class="metric"><span>CITY TROPHIES</span><strong>${trophies.length}</strong></div><div class="metric"><span>NOCH OFFEN</span><strong>${openTrophies.length}</strong></div></div>
      <div class="card"><div class="eyebrow">RANGLISTE NACH GEWONNENEN TROPHÄEN</div>${ranking.length?ranking.map((u,i)=>`<div class="rankrow"><b>#${i+1}</b><span><strong>${u.user}</strong><div class="rankmeta">Letzter Gewinn ${u.lastYear} · ${u.trophies.map(t=>t.trophy).join(' · ')}</div></span><span class="rankret">${u.wins} 🏆</span></div>`).join(''):'<div class="note">In dieser Stadt gibt es noch keine historischen Trophy-Gewinner.</div>'}</div>
      <div class="card"><div class="eyebrow">GEWONNENE TROPHÄEN · LETZTE JAHRE</div>${entries.map(x=>`<div class="previewrow"><span><strong>${x.year} · ${x.trophy}</strong><div class="rankmeta">${city}</div></span><b>${x.user}</b></div>`).join('')||'<div class="note">Noch keine vergebenen Trophäen.</div>'}</div>
      <div class="card"><div class="eyebrow">TROPHY-NETZWERK · ${city.toUpperCase()}</div>${trophies.map(t=>`<div class="owned-row" data-city-trophy="${t.id}"><span><strong>★ ${t.name}</strong><div class="rankmeta">${t.subtype} · ${t.champion?`Gewonnen ${t.champion.year}`:'noch offen'}</div></span><b>→</b></div>`).join('')}</div>
      <div class="card"><strong>Stadtbezogene Historie</strong><div class="note">Jede Trophy kann genau einmal gewonnen werden. Die Hall of Fame bleibt dauerhaft in ihrer Stadt. Eine globale Rangliste ist bewusst noch nicht aktiviert.</div></div>
    `);
    panel.querySelectorAll('[data-city-trophy]').forEach(el=>el.onclick=()=>showTrophy(+el.dataset.cityTrophy));
  };

  const rankingBtn=document.querySelector('.nav-btn[data-view="ranking"]');if(rankingBtn)rankingBtn.onclick=showRanking;
  const trophyBtn=document.querySelector('.nav-btn[data-view="trophies"]');if(trophyBtn)trophyBtn.onclick=showTrophyRanking;
})();