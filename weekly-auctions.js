// FinCity weekly auction timetable. Three fixed Swiss-local slots per city.
// Monday → Friday, Tuesday → Saturday, Wednesday → Sunday; all times 20:00 Europe/Zurich.
// Times are absolute epoch milliseconds so DST and users outside Switzerland do not shift auctions.
(function(global){
  "use strict";
  const ZONE="Europe/Zurich";
  const dateParts=new Intl.DateTimeFormat("en-GB",{
    timeZone:ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",
    hourCycle:"h23"
  });
  const human=new Intl.DateTimeFormat("de-CH",{
    timeZone:ZONE,weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",
    hourCycle:"h23"
  });
  const dayHuman=new Intl.DateTimeFormat("de-CH",{timeZone:ZONE,day:"2-digit",month:"2-digit",year:"numeric"});
  const DAY=86400000;
  const days=["Montag","Dienstag","Mittwoch"];
  const ends=["Freitag","Samstag","Sonntag"];

  function parts(epoch){
    const obj=Object.fromEntries(dateParts.formatToParts(epoch)
      .filter(p=>p.type!=="literal").map(p=>[p.type,Number(p.value)]));
    return {year:obj.year,month:obj.month,day:obj.day,hour:obj.hour,minute:obj.minute};
  }
  function isoAt(iso,shiftDays=0){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if(!m)throw new Error("Invalid Swiss week date");
    const year=+m[1],month=+m[2],day=+m[3];
    const ms=Date.UTC(year,month-1,day);
    const date=new Date(ms);
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)
      throw new Error("Invalid Swiss calendar date");
    return new Date(ms+shiftDays*DAY).toISOString().slice(0,10);
  }
  function weekKey(epoch=Date.now()){
    const p=parts(epoch);
    const current=isoAt([p.year,String(p.month).padStart(2,"0"),String(p.day).padStart(2,"0")].join("-"));
    const weekday=new Date(current+"T00:00:00Z").getUTCDay();
    return isoAt(current,-((weekday+6)%7));
  }
  function nextWeek(iso){return isoAt(iso,7)}
  function atSwissTime(iso,hour=20,minute=0){
    // The Swiss offset may change due to daylight saving. Iterate from a UTC guess.
    const wanted=Date.parse(iso+"T00:00:00Z")+hour*3600000+minute*60000;
    if(!Number.isFinite(wanted))throw new Error("Invalid date");
    let epoch=wanted;
    for(let i=0;i<3;i++){
      const p=parts(epoch);
      const actual=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);
      epoch+=wanted-actual;
    }
    return epoch;
  }
  function slots(weekIso){
    const week=isoAt(weekIso);
    return [0,1,2].map(i=>{
      const startAt=atSwissTime(isoAt(week,i));
      const endAt=atSwissTime(isoAt(week,i+4));
      return {index:i,week,startsAt:startAt,endsAt:endAt,startDay:days[i],endDay:ends[i]};
    });
  }
  function format(epoch){return human.format(new Date(epoch)).replace(/\s+/g," ")}
  function formatDay(epoch){return dayHuman.format(new Date(epoch))}
  function hoursText(slot){return slot.startDay+" 20:00 – "+slot.endDay+" 20:00"}
  function hash(str){
    let x=2166136261>>>0;
    for(const c of String(str)){x^=c.charCodeAt(0);x=Math.imul(x,16777619)>>>0}
    return x>>>0;
  }
  function shuffled(items,seed){
    const out=items.slice();
    let state=hash(seed)||1;
    for(let i=out.length-1;i>0;i--){
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      const j=state%(i+1);
      [out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }
  global.FinCityWeekly=Object.freeze({
    zone:ZONE,now:()=>Date.now(),weekKey,nextWeek,isoAt,parts,
    atSwissTime,slots,format,formatDay,hoursText,shuffled
  });
})(window);
