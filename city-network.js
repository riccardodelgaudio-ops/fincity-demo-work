// FinCity Switzerland city engine.
// Each city is an isolated market context: buildings, auctions, rankings and trophies never mix across cities.
(function(){
  const originalZurich={
    investment:JSON.parse(JSON.stringify(investment)),
    auctions:JSON.parse(JSON.stringify(auctions)),
    trophies:JSON.parse(JSON.stringify(trophies))
  };

  const cities=[
    {slug:'zurich',name:'Zürich',canton:'ZH',center:[8.5417,47.3769],landmarks:[]},
    {slug:'geneve',name:'Genève',canton:'GE',center:[6.1432,46.2044],landmarks:['Jet d’Eau','Place du Bourg-de-Four','Cathédrale Saint-Pierre','Palais des Nations','Horloge Fleurie','Monument Brunswick','Place Neuve']},
    {slug:'basel',name:'Basel',canton:'BS',center:[7.5886,47.5596],landmarks:['Basler Münster','Marktplatz Basel','Tinguely-Brunnen','Spalentor','Mittlere Brücke','Messeplatz Basel','Dreiländereck Basel']},
    {slug:'lausanne',name:'Lausanne',canton:'VD',center:[6.6323,46.5197],landmarks:['Cathédrale de Lausanne','Place de la Palud','Ouchy','Musée Olympique','Château Saint-Maire','Esplanade de Montbenon','Tour de Sauvabelin']},
    {slug:'bern',name:'Bern',canton:'BE',center:[7.4474,46.9480],landmarks:['Zytglogge','Bundeshaus','BärenPark','Berner Münster','Bundesplatz','Münsterplattform','Rosengarten Bern','Käfigturm']},
    {slug:'winterthur',name:'Winterthur',canton:'ZH',center:[8.7241,47.4988],landmarks:['Stadthaus Winterthur','Marktgasse Winterthur','Kunst Museum Winterthur','Technorama','Villa Flora Winterthur','Sulzerareal','Bäumli Winterthur']},
    {slug:'luzern',name:'Luzern',canton:'LU',center:[8.3093,47.0502],landmarks:['Kapellbrücke','Löwendenkmal','KKL Luzern','Jesuitenkirche Luzern','Museggmauer','Schwanenplatz','Hofkirche St. Leodegar']},
    {slug:'st-gallen',name:'St. Gallen',canton:'SG',center:[9.3767,47.4245],landmarks:['Stiftskirche St. Gallen','Stiftsbibliothek St. Gallen','Roter Platz St. Gallen','Marktplatz St. Gallen','Drei Weieren','Lokremise St. Gallen','Waaghaus St. Gallen']},
    {slug:'lugano',name:'Lugano',canton:'TI',center:[8.9511,46.0037],landmarks:['Piazza della Riforma','Parco Ciani','LAC Lugano Arte e Cultura','Cattedrale San Lorenzo Lugano','Monte Brè','Lungolago Lugano','Palazzo Civico Lugano']},
    {slug:'biel',name:'Biel/Bienne',canton:'BE',center:[7.2468,47.1368],landmarks:['Zentralplatz Biel','Ring Biel Altstadt','Stadtkirche Biel','Kongresshaus Biel','Strandboden Biel','Pasquart Biel','Bahnhofplatz Biel']},
    {slug:'neuchatel',name:'Neuchâtel',canton:'NE',center:[6.9293,46.9896],landmarks:['Château de Neuchâtel','Collégiale de Neuchâtel','Place des Halles Neuchâtel','Place Pury','Quai Ostervald','Jardin anglais Neuchâtel','Hôtel DuPeyrou']},
    {slug:'bellinzona',name:'Bellinzona',canton:'TI',center:[9.0222,46.1950],landmarks:['Castelgrande','Castello di Montebello','Castello di Sasso Corbaro','Piazza Nosetto','Piazza Collegiata','Murata di Bellinzona','Palazzo Civico Bellinzona']},
    {slug:'thun',name:'Thun',canton:'BE',center:[7.6280,46.7580],landmarks:['Schloss Thun','Rathausplatz Thun','Obere Schleuse Thun','Mühleplatz Thun','Schadaupark','Schloss Schadau','Aarequai Thun']},
    {slug:'koeniz',name:'Köniz',canton:'BE',center:[7.4153,46.9244],landmarks:['Schloss Köniz','Bläuackerplatz','Liebefeld Park','Gurten','Kulturhof Schloss Köniz','Könizbergwald','Vidmarhallen']},
    {slug:'chur',name:'Chur',canton:'GR',center:[9.5320,46.8508],landmarks:['Obertor Chur','Martinskirche Chur','Arcasplatz','Fontanapark','Kathedrale St. Mariä Himmelfahrt Chur','Rätisches Museum','Bahnhofplatz Chur']},
    {slug:'fribourg',name:'Fribourg',canton:'FR',center:[7.1513,46.8065],landmarks:['Cathédrale Saint-Nicolas Fribourg','Hôtel de Ville Fribourg','Pont de Berne Fribourg','Fontaine de la Samaritaine Fribourg','Place Georges-Python','Pont de Zähringen','Espace Jean Tinguely Niki de Saint Phalle']},
    {slug:'schaffhausen',name:'Schaffhausen',canton:'SH',center:[8.6349,47.6965],landmarks:['Munot','Vordergasse Schaffhausen','Fronwagplatz','Kloster Allerheiligen','Schwabentor Schaffhausen','Herrenacker','Mosergarten']},
    {slug:'vernier',name:'Vernier',canton:'GE',center:[6.0840,46.2170],landmarks:['Mairie de Vernier','Château de Vernier','Le Lignon','Place du Lignon','Parc des Libellules','Église Saint-Pie X Vernier','Parc de la Mairie Vernier']},
    {slug:'la-chaux-de-fonds',name:'La Chaux-de-Fonds',canton:'NE',center:[6.8259,47.1035],landmarks:['Place Espacité','Musée international d’horlogerie','Maison Blanche Le Corbusier','Villa Turque','Parc des Musées','Grand Temple La Chaux-de-Fonds','Avenue Léopold-Robert']},
    {slug:'lancy',name:'Lancy',canton:'GE',center:[6.1220,46.1890],landmarks:['Parc Navazza-Oltramare','Mairie de Lancy','Église Notre-Dame-des-Grâces Lancy','Pont-Rouge','Parc Bernasconi','Villa Bernasconi','Stade de Genève']}
  ];

  const allocationSet=[[45,30,15,10],[65,5,20,10],[55,25,10,10],[70,0,15,15],[40,45,5,10],[60,15,15,10],[50,25,15,10],[35,50,5,10]];
  const offsets=[[.0045,.0028],[-.004,.0036],[.0055,-.0028],[-.005,-.003],[.001,.006],[-.001,-.006],[.007,.0005],[-.007,-.0008]];
  const dates=['28.08.2026','21.08.2026','14.08.2026','07.08.2026','31.07.2026','24.07.2026','17.07.2026','10.07.2026'];
  const suffixes=['Zentrum','Nord','Süd','West','Ost','Park','Quartier','Terrasse'];
  let current=cities[0];

  function cleanHandle(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').slice(0,12)}
  function parseDate(s){const m=String(s).match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0}
  function cityUsers(){return users().sort((a,b)=>b.ret-a.ret)}

  function makeBuildings(city,index){
    const code=cleanHandle(city.name);const base=(index+1)*1000;
    const handles=[myPortfolio.user,`@${code}Alpha`,`@${code}Core`,`@${code}Value`,`@${code}Growth`,`@${code}Capital`,`@${code}Pilot`,`@${code}Prime`];
    const returns=[18.7,12.4+(index%5),22.8-(index%4),9.6+(index%6),16.5+(index%3),27.2-(index%5),14.1+(index%4),31.0-(index%6)];
    const ytd=[13.9,9.3+(index%4),17.1-(index%3),6.8+(index%5),11.7+(index%3),20.4-(index%4),10.2+(index%3),23.6-(index%5)];
    return offsets.map((o,i)=>({
      id:base+i+1,name:`${city.name} ${suffixes[i]}`,holder:handles[i],ret:+returns[i].toFixed(1),ytd:+ytd[i].toFixed(1),risk:[2,1,4,2,3,4,2,5][i],
      lng:city.center[0]+o[0],lat:city.center[1]+o[1],kind:i===0?'owned':'active',allocation:allocationSet[i],slots:[6,4,8,10,12,7,9,14][i],occupied:[4,3,6,7,8,6,5,11][i],
      lastAuctionPrice:460+i*105+(index%6)*35,lastAuctionDate:dates[(i+index)%dates.length],bidCount:14+((i*9+index*7)%55)
    }));
  }

  function makeAuctions(city,index){
    const base=(index+1)*1000+100;const os=[[.003,-.004],[-.0045,.0015],[.006,.004],[-.006,-.0045]];
    return os.map((o,i)=>({id:base+i+1,name:`${city.name} City Drop ${i+1}`,address:`${city.name} · Adresse wird verifiziert`,slots:[4,8,10,16][i],lng:city.center[0]+o[0],lat:city.center[1]+o[1],date:'Freitag · 20:00 Uhr'}));
  }

  function makeTrophies(city,index){
    const base=(index+1)*1000+200;const trophyOffsets=[[0,.004],[.004,.001],[-.004,.001],[.003,-.004],[-.003,-.004],[.006,.005],[-.006,.005],[-.006,-.005]];
    const handles=makeBuildings(city,index).map(x=>x.holder);
    return city.landmarks.map((name,i)=>({
      id:base+i+1,name,subtype:i%3===0?'Wahrzeichen':i%3===1?'Platz':'Stadt-Trophy',lng:city.center[0]+trophyOffsets[i%trophyOffsets.length][0],lat:city.center[1]+trophyOffsets[i%trophyOffsets.length][1],
      ...(i<5?{champion:{year:2026-i,user:handles[(i+1)%handles.length]}}:{})
    }));
  }

  function replaceArray(target,items){target.splice(0,target.length,...JSON.parse(JSON.stringify(items)))}
  function stats(){const s=document.querySelectorAll('.stats span b');if(s[0])s[0].textContent=users().length;if(s[1])s[1].textContent=investment.length;if(s[2])s[2].textContent=trophies.length;const small=document.querySelector('.brand small');if(small)small.textContent=`${current.name.toUpperCase()} · ANLEGEN · ERFOLG ZEIGEN · BESITZEN`;const tc=document.getElementById('trophyCount');if(tc)tc.textContent=trophies.length}

  async function geocodeTrophies(city){
    if(city.slug==='zurich')return;
    await Promise.all(trophies.map(async t=>{
      try{
        const q=encodeURIComponent(`${t.name}, ${city.name}, Schweiz`);const r=await fetch(`https://photon.komoot.io/api/?q=${q}&limit=1&lang=de&lat=${city.center[1]}&lon=${city.center[0]}`);if(!r.ok)return;
        const j=await r.json();const c=j.features?.[0]?.geometry?.coordinates;if(!c)return;
        if(Math.abs(c[0]-city.center[0])<.3&&Math.abs(c[1]-city.center[1])<.3){t.lng=c[0];t.lat=c[1]}
      }catch(e){}
    }));
    if(window.refreshFinCityMapData)refreshFinCityMapData();
  }

  async function hydrateAuctionAddresses(city){
    if(city.slug==='zurich')return;
    await Promise.all(auctions.map(async a=>{
      try{const r=await fetch(`https://photon.komoot.io/reverse?lon=${a.lng}&lat=${a.lat}&lang=de`);if(!r.ok)return;const j=await r.json();const p=j.features?.[0]?.properties||{};const street=[p.street,p.housenumber].filter(Boolean).join(' ');const town=[p.postcode,p.city||p.locality||city.name].filter(Boolean).join(' ');a.address=[street,town].filter(Boolean).join(', ')||a.address}catch(e){}
    }));
  }

  function latestAndHighest(){const latest=[...investment].sort((a,b)=>parseDate(b.lastAuctionDate)-parseDate(a.lastAuctionDate))[0];const high=[...investment].sort((a,b)=>b.lastAuctionPrice-a.lastAuctionPrice)[0];return {latest,high}}

  function renderCityOverview(){
    activeNav('city');const {latest,high}=latestAndHighest();const leaders=cityUsers();
    openPanel(`
      <div class="eyebrow">FINCITY SCHWEIZ · STADTMARKT</div><h2>${current.name}</h2>
      <label class="eyebrow" for="citySelector">STADT WECHSELN</label>
      <select id="citySelector" style="width:100%;margin:6px 0 12px;padding:12px;border-radius:10px;border:1px solid #2b3a56;background:#0b111d;color:#fff;font-weight:800">
        ${cities.map(c=>`<option value="${c.slug}" ${c.slug===current.slug?'selected':''}>${c.name} · ${c.canton}</option>`).join('')}
      </select>
      <div class="grid2"><div class="metric"><span>AKTIVE USER</span><strong>${users().length}</strong></div><div class="metric"><span>AKTIVE GEBÄUDE</span><strong>${investment.length}</strong></div></div>
      <div class="grid2" style="margin-top:8px"><div class="metric"><span>CITY TROPHIES</span><strong>${trophies.length}</strong></div><div class="metric"><span>YTD LEADER</span><strong style="font-size:14px">${leaders[0]?.holder||'–'}</strong></div></div>
      <div class="card"><div class="previewrow"><span>Letzte Versteigerung</span><b>${latest?`${latest.lastAuctionDate} · ${chf(latest.lastAuctionPrice)}`:'–'}</b></div><div class="rankmeta">${latest?.name||''}</div><div class="previewrow"><span>Teuerster letzter Zuschlag</span><b>${high?chf(high.lastAuctionPrice):'–'}</b></div><div class="rankmeta">${high?.name||''}</div></div>
      <div class="card"><strong>Stadtgrenzen bleiben getrennt</strong><div class="note">Gebäude, Auktionen, Rendite-Rangliste, Verkaufshistorie und Trophy-Hall-of-Fame beziehen sich ausschliesslich auf ${current.name}. Beim Wechsel in eine andere Stadt wird ein eigener Markt geladen.</div></div>
      <button class="action" id="cityActive">AKTIVE GEBÄUDE · ${current.name.toUpperCase()}</button>
      <button class="action secondary" id="cityRanking">RENDITERANGLISTE · ${current.name.toUpperCase()}</button>
      <button class="action secondary" id="cityTrophies">TROPHÄEN · ${current.name.toUpperCase()}</button>
      <button class="action secondary" id="cityAuctions">AUKTIONEN · ${current.name.toUpperCase()}</button>
      <p class="note">Die 20-Städte-Erweiterung ist Demo-Logik. Gebäude-, Rendite-, Auktions- und Historienwerte ausserhalb des bisherigen Zürich-Datensatzes sind Beispieldaten; reale Gebäudeadressen werden beim Kartenobjekt bzw. über offizielle Schweizer Datenquellen verifiziert.</p>
    `);
    document.getElementById('citySelector').onchange=e=>switchCity(e.target.value,true);
    document.getElementById('cityActive').onclick=showActive;document.getElementById('cityRanking').onclick=showRanking;document.getElementById('cityTrophies').onclick=()=>showTrophyRanking();document.getElementById('cityAuctions').onclick=showAuctions;
  }

  window.switchCity=function(slug,showOverview=false){
    const next=cities.find(c=>c.slug===slug)||cities[0];current=next;const idx=cities.indexOf(next);
    if(next.slug==='zurich'){
      replaceArray(investment,originalZurich.investment);replaceArray(auctions,originalZurich.auctions);replaceArray(trophies,originalZurich.trophies);
      // Keep historic trophy dates within the current demo timeline.
      trophies.forEach(t=>{if(t.champion&&t.champion.year>2026)t.champion.year=2026});
    }else{
      replaceArray(investment,makeBuildings(next,idx));replaceArray(auctions,makeAuctions(next,idx));replaceArray(trophies,makeTrophies(next,idx));
    }
    window.currentFinCityCity=next;stats();applyFilter('all');
    if(map)map.flyTo({center:next.center,zoom:13.7,pitch:60,bearing:-15,duration:1100});if(window.refreshFinCityMapData)refreshFinCityMapData();
    hydrateAuctionAddresses(next);geocodeTrophies(next);if(showOverview)setTimeout(renderCityOverview,80);
  };

  window.showCity=function(){renderCityOverview()};
  window.showAuctions=function(){
    activeNav('auctions');
    openPanel(`<div class="eyebrow">CITY DROPS · ${current.name.toUpperCase()}</div><h2>Auktionen · ${current.name}</h2><p class="note">Nur Auktionen dieses Stadtmarkts. Adressen werden für die Demo per Karten-/Gebäudedaten ergänzt und vor einer echten Freischaltung offiziell verifiziert.</p><div class="active-list">${auctions.map(a=>`<div class="active-row" data-auction="${a.id}"><div><strong>${a.name}</strong><div class="rankmeta">${a.address}</div><div class="rankmeta">${a.slots} Wohnungen / Slots · ${a.date}</div></div><div style="text-align:right"><div class="eyebrow">START</div><div class="price">${chf(startPrice(a.slots))}</div></div></div>`).join('')}</div>`);
    panel.querySelectorAll('[data-auction]').forEach(el=>el.onclick=()=>showAuction(+el.dataset.auction));
  };

  window.getFinCityCities=()=>cities.slice();
  window.getCurrentFinCityCity=()=>current;
  const cityBtn=document.querySelector('.nav-btn[data-view="city"]');if(cityBtn)cityBtn.onclick=showCity;
  const auctionBtn=document.querySelector('.nav-btn[data-view="auctions"]');if(auctionBtn)auctionBtn.onclick=showAuctions;
  window.currentFinCityCity=current;stats();
})();