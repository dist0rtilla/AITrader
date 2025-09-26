import React, {useEffect, useState} from 'react'
export default function Strategies(){
  const [lb, setLb] = useState(null)
  useEffect(()=>{(async ()=>{ const r=await fetch('/api/leaderboard'); if(r.ok) setLb(await r.json()) })()},[])
  return (<div><h1>Strategies</h1><pre>{JSON.stringify(lb,null,2)}</pre></div>)
}
