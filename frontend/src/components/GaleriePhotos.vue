<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Photo } from '@/api/types'
import { formaterDate } from '@/utils/format'
import FenetreModale from './FenetreModale.vue'

const props = defineProps<{ photos: Photo[]; supprimable?: (p: Photo) => boolean; compacte?: boolean }>()
const emit = defineEmits<{ supprimer: [photo: Photo] }>()

const index = ref<number | null>(null)
const courante = computed(() => (index.value === null ? null : props.photos[index.value]))
const deplacer = (d: number) => {
  if (index.value !== null) index.value = (index.value + d + props.photos.length) % props.photos.length
}
</script>

<template>
  <div class="galerie" :class="{ compacte }">
    <button v-for="(p, i) in photos" :key="p.id" class="vignette" :aria-label="p.legende ?? 'Photo'" @click="index = i">
      <img :src="p.vignetteUrl" :alt="p.legende ?? ''" loading="lazy" />
    </button>
  </div>

  <FenetreModale v-if="courante" :titre="courante.legende || 'Photo'" large @fermer="index = null">
    <img :src="courante.url" :alt="courante.legende ?? ''" class="grande" />
    <div class="rangee" style="margin-top: 0.75rem">
      <button v-if="photos.length > 1" class="btn secondaire petit" @click="deplacer(-1)">‹ Précédente</button>
      <button v-if="photos.length > 1" class="btn secondaire petit" @click="deplacer(1)">Suivante ›</button>
      <span class="espace" />
      <span class="doux petit">
        {{ formaterDate(courante.date) }}
        <template v-if="courante.enfants?.length"> · {{ courante.enfants.map((e) => e.prenom).join(', ') }}</template>
      </span>
      <a class="btn secondaire petit" :href="courante.url" download>Télécharger</a>
      <button
        v-if="supprimable?.(courante)"
        class="btn danger petit"
        @click="emit('supprimer', courante); index = null"
      >
        Supprimer
      </button>
    </div>
  </FenetreModale>
</template>

<style scoped>
.galerie {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}
.galerie.compacte {
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
}
.vignette {
  padding: 0;
  border: none;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1;
  background: var(--c-fond);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.vignette:hover {
  transform: scale(1.03);
  box-shadow: var(--ombre-forte);
}
.vignette img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.grande {
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 10px;
  background: #111;
}
</style>
