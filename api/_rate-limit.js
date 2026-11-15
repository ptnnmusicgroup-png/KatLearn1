"use strict";

// Bounded in-memory sliding-window limiter for a single Node.js process.
// It is a best-effort abuse guard, not a distributed quota system.
function createRateLimiter(options={}){
  const buckets=new Map();
  const maxBuckets=Math.max(100,Number(options.maxBuckets)||50000);
  const cleanupEvery=Math.max(1,Number(options.cleanupEvery)||128);
  let calls=0;

  function sweep(now){
    for(const[key,entry]of buckets){
      const fresh=entry.timestamps.filter(time=>now-time<entry.windowMs);
      if(fresh.length)buckets.set(key,{timestamps:fresh,windowMs:entry.windowMs});
      else buckets.delete(key);
    }
  }

  function check(key,limit,windowMs=60000,now=Date.now()){
    const id=String(key);
    const max=Math.max(1,Math.floor(Number(limit)||1));
    const window=Math.max(1,Number(windowMs)||60000);
    const current=Number(now)||Date.now();
    const entry=buckets.get(id)||{timestamps:[],windowMs:window};
    const timestamps=entry.timestamps.filter(time=>current-time<window);

    if(timestamps.length>=max){
      const retryAfter=Math.max(1,Math.ceil((window-(current-timestamps[0]))/1000));
      buckets.set(id,{timestamps,windowMs:window});
      calls++;
      if(calls%cleanupEvery===0)sweep(current);
      return retryAfter;
    }

    if(!buckets.has(id)&&buckets.size>=maxBuckets){
      sweep(current);
      if(buckets.size>=maxBuckets)return Math.max(1,Math.ceil(window/1000));
    }

    timestamps.push(current);
    buckets.set(id,{timestamps,windowMs:window});
    calls++;
    if(calls%cleanupEvery===0)sweep(current);
    return 0;
  }

  return{check,clear(){buckets.clear();calls=0},get size(){return buckets.size}};
}

module.exports={createRateLimiter};
