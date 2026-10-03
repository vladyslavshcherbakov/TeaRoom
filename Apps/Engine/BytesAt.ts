export async function bytesAt(url: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) return bytesOfADataUrl(url)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.arrayBuffer()
}

function bytesOfADataUrl(url: string): ArrayBuffer {
  const base64 = url.slice(url.indexOf(',') + 1)
  const text = atob(base64)
  const bytes = new Uint8Array(text.length)
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index)
  return bytes.buffer
}
