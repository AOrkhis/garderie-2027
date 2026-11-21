<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ lien: string; courriel?: string }>()
const emit = defineEmits<{ fermer: [] }>()
const copie = ref(false)

async function copier() {
  try {
    await navigator.clipboard.writeText(props.lien)
  } catch {
    const zone = document.createElement('textarea')
    zone.value = props.lien
    document.body.appendChild(zone)
    zone.select()
    document.execCommand('copy')
    zone.remove()
  }
  copie.value = true
  setTimeout(() => (copie.value = false), 2000)
}
</script>

<template>
  <div class="lien-invitation">
    <div class="rangee">
      <strong>Lien d'invitation{{ courriel ? ` pour ${courriel}` : '' }}</strong>
      <span class="espace" />
      <button class="btn lien petit" aria-label="Fermer" @click="emit('fermer')">✕</button>
    </div>
    <p class="petit doux">
      Aucun service de courriel n'est configuré : le courriel n'a pas été envoyé. Copiez ce lien et transmettez-le à la
      personne (texto, courriel, etc.).
    </p>
    <div class="rangee" style="flex-wrap: nowrap">
      <input :value="lien" readonly @focus="($event.target as HTMLInputElement).select()" />
      <button class="btn petit" @click="copier">{{ copie ? 'Copié !' : 'Copier' }}</button>
    </div>
  </div>
</template>

<style scoped>
.lien-invitation {
  border: 1px dashed var(--c-primaire);
  background: var(--c-primaire-clair);
  border-radius: 10px;
  padding: 0.75rem;
  margin-bottom: 1rem;
}
.lien-invitation input {
  font-size: 0.85rem;
  background: #fff;
}
</style>
