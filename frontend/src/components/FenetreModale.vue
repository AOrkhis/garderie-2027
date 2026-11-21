<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{ titre: string; large?: boolean }>()
const emit = defineEmits<{ fermer: [] }>()

const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && emit('fermer')
onMounted(() => {
  document.addEventListener('keydown', surTouche)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  document.removeEventListener('keydown', surTouche)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modale" appear>
      <div class="fond" @mousedown.self="emit('fermer')">
        <div class="fenetre carte" :class="{ large }" role="dialog" aria-modal="true" :aria-label="titre">
          <div class="poignee" aria-hidden="true" />
          <div class="entete">
            <h2>{{ titre }}</h2>
            <button class="btn lien" aria-label="Fermer" @click="emit('fermer')">✕</button>
          </div>
          <div class="corps"><slot /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fond {
  position: fixed;
  inset: 0;
  background: rgb(15 23 42 / 0.45);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4vh 0.75rem;
  overflow-y: auto;
  z-index: 50;
}
.fenetre {
  width: 100%;
  max-width: 540px;
  border-radius: 14px;
}
.fenetre.large {
  max-width: 780px;
}
.poignee {
  display: none;
}
.entete {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.entete h2 {
  margin: 0;
}
.corps {
  min-width: 0;
}

/* Transition : fondu + léger zoom */
.modale-enter-active,
.modale-leave-active {
  transition: opacity 0.18s ease;
}
.modale-enter-active .fenetre,
.modale-leave-active .fenetre {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}
.modale-enter-from,
.modale-leave-to {
  opacity: 0;
}
.modale-enter-from .fenetre,
.modale-leave-to .fenetre {
  transform: translateY(12px) scale(0.97);
  opacity: 0;
}

/* Mobile : feuille qui glisse depuis le bas */
@media (max-width: 699px) {
  .fond {
    align-items: flex-end;
    padding: 0;
  }
  .fenetre,
  .fenetre.large {
    max-width: none;
    border-radius: 20px 20px 0 0;
    padding: 0.6rem 1rem calc(1.25rem + env(safe-area-inset-bottom));
    max-height: 92vh;
    overflow-y: auto;
  }
  .poignee {
    display: block;
    width: 40px;
    height: 5px;
    border-radius: 999px;
    background: var(--c-bord);
    margin: 0 auto 0.8rem;
  }
  .modale-enter-from .fenetre,
  .modale-leave-to .fenetre {
    transform: translateY(100%);
    opacity: 1;
  }
}
</style>
