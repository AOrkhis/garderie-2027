<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { formaterHeure } from '@/utils/format'

const props = defineProps<{
  modelValue: string | undefined
  /** Permet la valeur vide (« dort encore », etc.). */
  facultatif?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const ouvert = ref(false)
const racine = ref<HTMLElement | null>(null)
const colH = ref<HTMLElement | null>(null)
const colM = ref<HTMLElement | null>(null)

const HEURES = Array.from({ length: 24 }, (_, i) => i)
const PAS_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

const heureSel = computed(() => (props.modelValue ? Number(props.modelValue.slice(0, 2)) : null))
const minuteSel = computed(() => (props.modelValue ? Number(props.modelValue.slice(3, 5)) : null))
// Inclut la minute exacte si une entrée existante n'est pas un multiple de 5
const minutes = computed(() => {
  const l = [...PAS_MINUTES]
  if (minuteSel.value != null && !l.includes(minuteSel.value)) l.push(minuteSel.value)
  return l.sort((a, b) => a - b)
})
const affichage = computed(() => (props.modelValue ? formaterHeure(props.modelValue) : ''))

function choisir(partie: 'h' | 'm', v: number) {
  const maintenant = new Date()
  const h = partie === 'h' ? v : (heureSel.value ?? maintenant.getHours())
  const m = partie === 'm' ? v : (minuteSel.value ?? 0)
  emit('update:modelValue', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
}

function choisirMaintenant() {
  emit('update:modelValue', new Date().toTimeString().slice(0, 5))
  fermer()
}
function effacer() {
  emit('update:modelValue', '')
  fermer()
}
const fermer = () => (ouvert.value = false)

async function basculer() {
  ouvert.value = !ouvert.value
  if (!ouvert.value) return
  await nextTick()
  const h = heureSel.value ?? new Date().getHours()
  colH.value?.children[h]?.scrollIntoView({ block: 'center' })
  const m = minuteSel.value ?? Math.min(55, Math.round(new Date().getMinutes() / 5) * 5)
  const i = minutes.value.indexOf(m)
  if (i >= 0) colM.value?.children[i]?.scrollIntoView({ block: 'center' })
}

function surClicGlobal(e: MouseEvent) {
  if (ouvert.value && racine.value && !racine.value.contains(e.target as Node)) fermer()
}
const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && fermer()
watch(ouvert, (o) => {
  if (o) {
    document.addEventListener('mousedown', surClicGlobal)
    document.addEventListener('keydown', surTouche)
  } else {
    document.removeEventListener('mousedown', surClicGlobal)
    document.removeEventListener('keydown', surTouche)
  }
})
onUnmounted(() => {
  document.removeEventListener('mousedown', surClicGlobal)
  document.removeEventListener('keydown', surTouche)
})
</script>

<template>
  <div ref="racine" class="champ-heure">
    <button type="button" class="affichage" :class="{ vide: !modelValue }" @click="basculer">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span class="valeur">{{ affichage || "Choisir l'heure" }}</span>
      <svg class="chevron" :class="{ haut: ouvert }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <div v-if="ouvert" class="panneau">
      <div class="colonnes">
        <div ref="colH" class="colonne" role="listbox" aria-label="Heures">
          <button
            v-for="h in HEURES"
            :key="h"
            type="button"
            :class="{ actif: h === heureSel }"
            @click="choisir('h', h)"
          >
            {{ String(h).padStart(2, '0') }}
          </button>
        </div>
        <span class="separateur">h</span>
        <div ref="colM" class="colonne" role="listbox" aria-label="Minutes">
          <button
            v-for="m in minutes"
            :key="m"
            type="button"
            :class="{ actif: m === minuteSel }"
            @click="choisir('m', m)"
          >
            {{ String(m).padStart(2, '0') }}
          </button>
        </div>
      </div>
      <div class="pied-panneau">
        <button type="button" class="btn lien petit" @click="choisirMaintenant">Maintenant</button>
        <button v-if="facultatif && modelValue" type="button" class="btn lien petit" style="color: var(--c-danger)" @click="effacer">
          Effacer
        </button>
        <span class="espace" />
        <button type="button" class="btn petit" @click="fermer">OK</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.champ-heure {
  position: relative;
  display: inline-block;
  max-width: 170px;
}
.affichage {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  font: inherit;
  font-weight: 800;
  font-size: 1rem;
  padding: 0.6rem 0.7rem;
  border: 1.5px solid var(--c-bord);
  border-radius: 12px;
  background: #fff;
  color: var(--c-texte);
  cursor: pointer;
  min-height: 46px;
}
.affichage:hover {
  border-color: var(--c-primaire);
}
.affichage svg:first-child {
  color: var(--c-primaire);
  flex-shrink: 0;
}
.affichage.vide .valeur {
  color: #aaa5c4;
  font-weight: 600;
}
.valeur {
  flex: 1;
  text-align: left;
  white-space: nowrap;
}
.chevron {
  color: var(--c-texte-doux);
  transition: transform 0.15s;
}
.chevron.haut {
  transform: rotate(180deg);
}
.panneau {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 35;
  background: #fff;
  border: 1px solid var(--c-bord);
  border-radius: 14px;
  box-shadow: var(--ombre-forte);
  padding: 0.6rem;
  min-width: 210px;
}
.colonnes {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.separateur {
  font-weight: 800;
  color: var(--c-texte-doux);
}
.colonne {
  height: 176px;
  overflow-y: auto;
  width: 62px;
  scroll-snap-type: y proximity;
  scrollbar-width: thin;
  mask-image: linear-gradient(transparent, #000 18% 82%, transparent);
  -webkit-mask-image: linear-gradient(transparent, #000 18% 82%, transparent);
}
.colonne button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  scroll-snap-align: center;
  border: none;
  border-radius: 10px;
  background: none;
  font: inherit;
  font-weight: 800;
  font-size: 1rem;
  color: var(--c-texte-doux);
  cursor: pointer;
}
.colonne button:hover {
  background: var(--c-primaire-clair);
  color: var(--c-primaire-fonce);
}
.colonne button.actif {
  background: var(--c-primaire);
  color: #fff;
}
.pied-panneau {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border-top: 1px solid var(--c-bord);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}
.pied-panneau .espace {
  flex: 1;
}
@media (max-width: 699px) {
  .champ-heure {
    max-width: 150px;
  }
}
</style>
