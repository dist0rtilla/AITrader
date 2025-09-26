import React, { useEffect, useState } from 'react'

export default function Execution(){
  const [jobs, setJobs] = useState({})
  const [out, setOut] = useState('data/training_export.csv')

  async function startExport(){
    const res = await fetch('/api/export_training', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({out})})
    const j = await res.json()
    console.log('started', j)
  }

  useEffect(()=>{
    let t = setInterval(async ()=>{
      const res = await fetch('/api/jobs');
      const j = await res.json();
      setJobs(j)
    }, 1000)
    return ()=>clearInterval(t)
  },[])

  return (
    <div>
      <h1>Execution Window</h1>
      <div>
        <label>Output path: <input value={out} onChange={e=>setOut(e.target.value)} /></label>
        <button onClick={startExport}>Export Training Data</button>
      </div>
      <h2>Jobs</h2>
      <pre>{JSON.stringify(jobs,null,2)}</pre>
    </div>
  )
}
