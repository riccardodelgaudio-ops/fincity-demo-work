// Corrections applied before the multi-city engine snapshots Zürich.
(function(){
  const seefeld=investment.find(p=>p.id===2);
  if(seefeld){
    // Land-side Seefeld position; final production link will use verified GWR/EGID geometry.
    seefeld.lng=8.5529;
    seefeld.lat=47.3599;
  }
})();
