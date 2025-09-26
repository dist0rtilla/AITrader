export async function getJSON<T>(path: string): Promise<T> {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
    return res.json()
}
