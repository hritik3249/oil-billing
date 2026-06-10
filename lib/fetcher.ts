// Shared SWR fetcher: throws on HTTP errors so SWR surfaces them as `error`
export const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}
