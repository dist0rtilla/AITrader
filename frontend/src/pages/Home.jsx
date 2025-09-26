import React, { useEffect, useState } from 'react'

export default function Home(){
  const [snap, setSnap] = useState(null)
  useEffect(()=>{
    const ws = new WebSocket((window.location.origin.replace('http','ws')) + '/api/ws/monitor')
    ws.onmessage = (e)=>{
      try{ setSnap(JSON.parse(e.data)) }catch(err){}
    }
    ws.onclose = ()=>console.log('ws closed')
    return ()=>ws.close()
  },[])

  if(!snap) return <div>Connecting...</div>
  return (
    <div>
      <h1>System Monitor</h1>
      <div>ts: {new Date(snap.ts*1000).toLocaleString()}</div>
      <h2>System load</h2>
      <pre>{JSON.stringify(snap.system,null,2)}</pre>
      <h2>Components</h2>
      <ul>
        {Object.entries(snap.components).map(([k,v])=> (
          <li key={k}><b>{k}</b>: {JSON.stringify(v)}</li>
        ))}
      </ul>
      <h2>Jobs</h2>
      <pre>{JSON.stringify(snap.jobs,null,2)}</pre>
    </div>
  )
}
