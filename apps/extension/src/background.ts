export default defineBackground(() => {
  console.log('ApplyFlow background service worker started')

  // Open side panel when the extension icon is clicked
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(console.error)
    }
  })
})

// --- Auth helpers ---

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('applyflow_token')
  const token = result['applyflow_token'] as string | undefined
  if (!token) return null

  // Check expiry if stored as JWT
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
    const exp = payload.exp as number | undefined
    if (exp && Date.now() / 1000 > exp) {
      await chrome.storage.local.remove('applyflow_token')
      return null
    }
  } catch {
    // Not a valid JWT or no expiry — return as-is
  }
  return token
}

export async function callAPI<T>(
  endpoint: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const token = await getAuthToken()
  const baseUrl = 'http://localhost:3001'

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((error as { error?: string }).error ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}
