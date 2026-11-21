<script setup lang="ts">
import { useNotificationsStore } from '@/stores/notifications'
import FenetreModale from './FenetreModale.vue'

const notif = useNotificationsStore()

async function action(id: number, executer: () => void | Promise<void>) {
  notif.retirer(id)
  await executer()
}
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in notif.toasts" :key="t.id" class="toast" :class="t.type" role="status">
        <span class="message">{{ t.message }}</span>
        <button v-if="t.action" class="action" @click="action(t.id, t.action.executer)">{{ t.action.libelle }}</button>
        <button class="fermer" aria-label="Fermer" @click="notif.retirer(t.id)">✕</button>
      </div>
    </TransitionGroup>
  </div>

  <FenetreModale v-if="notif.confirmation" :titre="notif.confirmation.titre" @fermer="notif.repondre(false)">
    <p>{{ notif.confirmation.message }}</p>
    <div class="rangee">
      <span class="espace" />
      <button class="btn secondaire" @click="notif.repondre(false)">Annuler</button>
      <button class="btn" :class="{ danger: notif.confirmation.danger }" @click="notif.repondre(true)">
        {{ notif.confirmation.confirmer ?? 'Confirmer' }}
      </button>
    </div>
  </FenetreModale>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: 4.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 60;
  width: min(480px, calc(100% - 1.5rem));
}
.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1rem;
  border-radius: 14px;
  background: #2b2640;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 10px 30px rgb(20 14 40 / 0.35);
}
.toast.succes {
  border-left: 4px solid #4cc29a;
}
.toast.erreur {
  background: #96322e;
}
.toast.info {
  border-left: 4px solid var(--c-accent);
}
.message {
  flex: 1;
}
.action {
  background: none;
  border: 1px solid rgb(255 255 255 / 0.5);
  color: #fff;
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.fermer {
  background: none;
  border: none;
  color: rgb(255 255 255 / 0.7);
  cursor: pointer;
  font-size: 1rem;
}
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
