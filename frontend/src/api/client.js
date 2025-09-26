// Copilot: small API client helper
const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default { getJSON }
