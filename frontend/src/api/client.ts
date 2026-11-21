import type { Jetons } from './types'

const CLE_JETONS = 'garderie2027.jetons'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export const jetons = {
  lire(): Jetons | null {
    const brut = localStorage.getItem(CLE_JETONS)
    return brut ? (JSON.parse(brut) as Jetons) : null
  },
  ecrire(j: Jetons | null) {
    if (j) localStorage.setItem(CLE_JETONS, JSON.stringify(j))
    else localStorage.removeItem(CLE_JETONS)
  },
}

let rafraichissement: Promise<boolean> | null = null
let surDeconnexion: () => void = () => {}
export const definirSurDeconnexion = (fn: () => void) => (surDeconnexion = fn)

async function rafraichir(): Promise<boolean> {
  const j = jetons.lire()
  if (!j) return false
  const res = await fetch('/api/auth/rafraichir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: j.refreshToken }),
  })
  if (!res.ok) return false
  jetons.ecrire(await res.json())
  return true
}

function messageErreur(data: unknown, status: number): string {
  const m = (data as { message?: string | string[] } | null)?.message
  if (Array.isArray(m)) return m.join(' ')
  if (typeof m === 'string') return m
  if (status >= 500) return 'Une erreur est survenue sur le serveur. Veuillez réessayer.'
  return 'Une erreur est survenue.'
}

export async function api<T = unknown>(
  chemin: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
  reessai = true,
): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const j = jetons.lire()
  const estFormData = body instanceof FormData
  let res: Response
  try {
    res = await fetch(`/api${chemin}`, {
      method,
      headers: {
        ...(body !== undefined && !estFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && j ? { Authorization: `Bearer ${j.accessToken}` } : {}),
      },
      body: body === undefined ? undefined : estFormData ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez votre connexion.', 0)
  }

  if (res.status === 401 && auth && j && reessai) {
    rafraichissement ??= rafraichir().finally(() => (rafraichissement = null))
    if (await rafraichissement) return api<T>(chemin, options, false)
    jetons.ecrire(null)
    surDeconnexion()
  }

  const texte = await res.text()
  const data = texte ? JSON.parse(texte) : null
  if (!res.ok) throw new ApiError(messageErreur(data, res.status), res.status)
  return data as T
}
