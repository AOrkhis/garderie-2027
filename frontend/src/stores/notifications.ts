import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'succes' | 'erreur' | 'info'
  action?: { libelle: string; executer: () => void | Promise<void> }
}

export interface DemandeConfirmation {
  titre: string
  message: string
  confirmer?: string
  danger?: boolean
  resoudre: (ok: boolean) => void
}

let suivant = 1

export const useNotificationsStore = defineStore('notifications', () => {
  const toasts = ref<Toast[]>([])
  const confirmation = ref<DemandeConfirmation | null>(null)

  function retirer(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function afficher(message: string, type: Toast['type'] = 'succes', action?: Toast['action'], duree = 5000) {
    const id = suivant++
    toasts.value = [...toasts.value.slice(-3), { id, message, type, action }]
    setTimeout(() => retirer(id), action ? Math.max(duree, 8000) : duree)
    return id
  }

  const succes = (message: string, action?: Toast['action']) => afficher(message, 'succes', action)
  const erreur = (e: unknown) => afficher(e instanceof Error ? e.message : String(e), 'erreur', undefined, 7000)
  const info = (message: string) => afficher(message, 'info')

  /** Remplace window.confirm par une fenêtre en français. */
  function confirmer(options: Omit<DemandeConfirmation, 'resoudre'>): Promise<boolean> {
    return new Promise((resoudre) => {
      confirmation.value = { ...options, resoudre }
    })
  }

  function repondre(ok: boolean) {
    confirmation.value?.resoudre(ok)
    confirmation.value = null
  }

  return { toasts, confirmation, afficher, succes, erreur, info, retirer, confirmer, repondre }
})
