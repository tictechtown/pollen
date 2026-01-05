export type FeverClientConfig = {
  baseUrl: string
  apiKey: string
}

type FeverParams = Record<string, string | number | boolean | null | undefined>

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '')

const buildBody = (params: FeverParams): string => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (value === true) {
      sp.append(key, '1')
      return
    }
    if (value === false) return
    sp.append(key, String(value))
  })
  return sp.toString()
}

export class FeverClient {
  private readonly endpoint: string
  private readonly apiKey: string

  constructor(config: FeverClientConfig) {
    this.endpoint = `${normalizeBaseUrl(config.baseUrl)}/api/fever.php`
    this.apiKey = config.apiKey
  }

  async request<T>(params: FeverParams): Promise<T> {
    const body = buildBody({
      api_key: this.apiKey,
      ...params,
    })

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!res.ok) {
      throw new Error(`FreshRSS request failed (${res.status})`)
    }

    const json = (await res.json()) as unknown
    return json as T
  }
}

