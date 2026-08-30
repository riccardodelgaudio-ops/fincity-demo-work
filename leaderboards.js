// FinCity leaderboard enhancement: YTD performance + trophy history by city / Switzerland / worldwide.
(function(){
  const ytdReturns={
    '@UrbanAlpha':21.8,'@ZurichCore':19.6,'@ZuriValue':17.9,'@NorthStarZH':15.7,'@SwissCompound':14.8,
    '@MyFinCity':13.9,'@CityBeta':12.6,'@HelveticGrowth':11.8,'@YieldPilot':10.5,'@LakeAlpha':9.7,
    '@BlueLake':8.6,'@PeakCapital':7.9,'@LimmatInvestor':6.8
  };

  // Demo history only. Not real historical results.
  const trophyHistory=[
    {year:2026,trophy:'Lindenhof',city:'Zürich',country:'Schweiz',region:'city',user:'@UrbanAlpha'},
    {year:2025,trophy:'Paradeplatz',city:'Zürich',country:'Schweiz',region:'city',user:'@ZurichCore'},
    {year:2024,trophy:'Fraumünster',city:'Zürich',country:'Schweiz',region:'city',user:'@LakeAlpha'},
    {year:2023,trophy:'ETH Hauptgebäude',city:'Zürich',country:'Schweiz',region:'city',user:'@ZuriValue'},
    {year:2022,trophy:'Uetliberg',city:'Zürich',country:'Schweiz',region:'city',user:'@NorthStarZH'},
    {year:2026,trophy:'Kapellbrücke',city:'Luzern',country:'Schweiz',region:'swiss',user:'@SwissCompound'},
    {year:2025,trophy:'Jet d’Eau',city:'Genf',country:'Schweiz',region:'swiss',user:'@UrbanAlpha'},
    {year:2024,trophy:'Bundeshaus',city:'Bern',country:'Schweiz',region:'swiss',user:'@MyFinCity'},
    {year:2023,trophy:'Château de Chillon',city:'Veytaux',country:'Schweiz',region:'swiss',user:'@LakeAlpha'},
    {year:2022,trophy:'Rheinfall',city:'Neuhausen am Rheinfall',country:'Schweiz',region:'swiss',user:'@ZurichCore'},
    {year:2026,trophy:'Eiffelturm',city:'Paris',country:'Frankreich',region:'world',user:'@UrbanAlpha'},
    {year:2025,trophy:'Tower Bridge',city:'London',country:'UK',region:'world',user:'@ZurichCore'},
    {year:2024,trophy:'Empire State Building',city:'New York',country:'USA',region:'world',user:'@ZuriValue'},
    {year:2023,trophy:'Marina Bay Sands',city:'Singapur',country:'Singapur',region:'world',user:'@CityBeta'},
    {year:2022,trophy:'Sydney Opera House',city:'Sydney',country:'Australien',region:'world',user:'@LakeAlpha'}
  ];

  function currentUsers(){
    return users().map(u=>({...u,ytd:ytdReturns[u.holder]??u.ret})).sort((a,b)=>b.ytd-a.ytd);
  }

  window.showRanking=function(){
    activeNav('ranking');
    const r=currentUsers();
    openPanel(`
      <div class="eyebrow">FINCITY PERFORMANCE · LAUFENDES JAHR</div>
      <h2>🏆 Rendite-Rangliste · YTD 2026</h2>
      <p class="note">Demo-Ranking für das laufende Kalenderjahr. Ein User = ein Depot = eine YTD-Rendite. Ein User kann mehrere FinCity-Gebäude besitzen.</p>
      <div class="card">
        ${r.map((u,i)=>{const bs=userBuildings(u.holder);return `
          <div class="rankrow" data-ytd-user="${u.holder}">
            <b>#${i+1}</b>
            <span><strong>${u.holder}</strong>
              <div class="rankmeta">${u.buildings} Gebäude · ${u.slots} Slots · ${u.free} frei</div>
              <div class="rankmeta">${bs.map(b=>b.name.replace('Mein Gebäude · ','')).join(' · ')}</div>
            </span>
            <span class="rankret">+${u.ytd.toFixed(1)}%</span>
          </div>`}).join('')}
      </div>
      <p class="note">YTD-Werte sind Demo-Daten für die Investor-Demo. Die Slot-Gebühr bleibt weiterhin an die separat definierte Performanceklasse gekoppelt.</p>
    `);
    panel.querySelectorAll('[data-ytd-user]').forEach(el=>el.onclick=()=>showUser(el.dataset.ytdUser));
  };

  function entriesFor(scope){
    if(scope==='city')return trophyHistory.filter(x=>x.region==='city');
    if(scope==='swiss')return trophyHistory.filter(x=>x.region==='city'||x.region==='swiss');
    return trophyHistory;
  }

  function trophyUserRanking(entries){
    const m=new Map();
    entries.forEach(x=>{if(!m.has(x.user))m.set(x.user,{user:x.user,wins:0,lastYear:0,trophies:[]});const u=m.get(x.user);u.wins++;u.lastYear=Math.max(u.lastYear,x.year);u.trophies.push(x)});
    return [...m.values()].sort((a,b)=>b.wins-a.wins||b.lastYear-a.lastYear||a.user.localeCompare(b.user));
  }

  window.showTrophyRanking=function(scope='city'){
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='trophies'));
    const entries=entriesFor(scope).sort((a,b)=>b.year-a.year);
    const ranking=trophyUserRanking(entries);
    const title=scope==='city'?'Zürich':scope==='swiss'?'Schweiz':'Weltweit';
    openPanel(`
      <div class="eyebrow">FINCITY TROPHY HALL OF FAME · DEMO-HISTORIE</div>
      <h2>🏅 Trophy-Rangliste · ${title}</h2>
      <div style="display:flex;gap:7px;overflow-x:auto;margin-bottom:10px">
        <button class="filter ${scope==='city'?'active':''}" data-trophy-scope="city">ZÜRICH</button>
        <button class="filter ${scope==='swiss'?'active':''}" data-trophy-scope="swiss">SCHWEIZ</button>
        <button class="filter ${scope==='world'?'active':''}" data-trophy-scope="world">WELTWEIT</button>
      </div>
      <div class="card">
        <div class="eyebrow">RANGLISTE NACH GEWONNENEN TROPHÄEN</div>
        ${ranking.length?ranking.map((u,i)=>`<div class="rankrow"><b>#${i+1}</b><span><strong>${u.user}</strong><div class="rankmeta">Letzter Gewinn ${u.lastYear} · ${u.trophies.map(t=>t.trophy).join(' · ')}</div></span><span class="rankret">${u.wins} 🏆</span></div>`).join(''):'<div class="note">Noch keine Trophy-Gewinner in diesem Bereich.</div>'}
      </div>
      <div class="card">
        <div class="eyebrow">GEWONNENE TROPHÄEN · LETZTE JAHRE</div>
        ${entries.map(x=>`<div class="previewrow"><span><strong>${x.year} · ${x.trophy}</strong><div class="rankmeta">${x.city}, ${x.country}</div></span><b>${x.user}</b></div>`).join('')}
      </div>
      <div class="card"><strong>Einmalige Trophy-Regel</strong><div class="note">Jede einzelne Trophy kann in FinCity genau einmal gewonnen werden. Danach bleibt der Champion historisch gespeichert. Die hier gezeigte Hall of Fame ist Demo-Historie, keine reale Vergangenheit.</div></div>
    `);
    panel.querySelectorAll('[data-trophy-scope]').forEach(b=>b.onclick=()=>showTrophyRanking(b.dataset.trophyScope));
  };

  function bindLeaderboards(){
    const rankingBtn=document.querySelector('.nav-btn[data-view="ranking"]');
    if(rankingBtn)rankingBtn.onclick=showRanking;
    const trophyBtn=document.querySelector('.nav-btn[data-view="trophies"]');
    if(trophyBtn)trophyBtn.onclick=()=>showTrophyRanking('city');
  }

  bindLeaderboards();
})();
