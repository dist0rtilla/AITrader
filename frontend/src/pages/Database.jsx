import React, {useEffect, useState} from 'react'
export default function Database(){
  const [tables, setTables] = useState(null)
  useEffect(()=>{(async ()=>{ const r=await fetch('/api/db/tables'); if(r.ok) setTables(await r.json()) })()},[])
  return (<div><h1>Database</h1><pre>{JSON.stringify(tables,null,2)}</pre></div>)
}
