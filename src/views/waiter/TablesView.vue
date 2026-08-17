<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTablesStore } from '../../stores/tables'
import { useAuthStore } from '../../stores/auth'
import { useShiftsStore } from '../../stores/shifts'
import { useSettingsStore } from '../../stores/settings'
import { orderTotal } from '../../types'
import { formatClock, formatDateTime, formatMoney, timeAgoLabel } from '../../utils/format'
import { shiftSummary } from '../../utils/shifts'

const router = useRouter()
const tables = useTablesStore()
const auth = useAuthStore()
const shifts = useShiftsStore()
const settings = useSettingsStore()

tables.init()
auth.init()
shifts.init()
settings.init()

const shiftsEnabled = computed(() => settings.settings.shiftsEnabled)

const currentUser = computed(() => auth.currentUser)
const activeShift = computed(() => (currentUser.value ? shifts.activeShiftFor(currentUser.value.id) : null))
const shiftInfo = computed(() => (activeShift.value ? shiftSummary(activeShift.value, tables.paidOrders) : null))

const showSnack = ref(false)
const snackText = ref('')

function startShift() {
  if (!currentUser.value) return
  shifts.startShift(currentUser.value.id)
  snackText.value = 'Turno iniciado. Buen servicio! 👋'
  showSnack.value = true
}

function finishShift() {
  if (!activeShift.value) return
  shifts.endShift(activeShift.value.id)
  corteDialog.value = false
  snackText.value = 'Turno finalizado. ¡Gracias por tu trabajo!'
  showSnack.value = true
}

const now = ref(Date.now())
setInterval(() => (now.value = Date.now()), 30_000)

const tableCards = computed(() =>
  tables.tablesList.map((t) => {
    const order = tables.openOrderForTable(t.id)
    const itemCount = order ? order.items.reduce((s, i) => s + i.qty, 0) : 0
    const responsibleId = order?.responsibleId ?? order?.openedBy
    return {
      table: t,
      order,
      itemCount,
      total: order ? orderTotal(order) : 0,
      since: order ? timeAgoLabel(order.createdAt, now.value) : '',
      responsible: responsibleId ? auth.users.find((u) => u.id === responsibleId)?.name ?? '' : '',
    }
  }),
)

function openTable(id: string) {
  router.push(`/mesa/${id}`)
}

// Diálogo de corte de caja al finalizar turno
const corteDialog = ref(false)
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
      <div>
        <h2 class="text-h5 font-weight-bold">Mesas</h2>
        <span class="text-body-2 text-grey-darken-1">
          {{ tables.occupiedCount }} de {{ tables.tablesList.length }} ocupadas
        </span>
      </div>
      <div class="d-flex align-center ga-2 flex-wrap">
        <template v-if="shiftsEnabled">
          <v-chip v-if="activeShift" variant="tonal" color="teal" size="large">
            <v-icon icon="mdi-timer-play" start />
            Turno desde {{ formatClock(activeShift.startedAt) }}
          </v-chip>
          <v-btn
            v-if="!activeShift"
            color="success"
            prepend-icon="mdi-timer-play"
            size="large"
            @click="startShift"
          >
            Iniciar turno
          </v-btn>
          <v-btn
            v-else
            color="error"
            prepend-icon="mdi-timer-off"
            size="large"
            @click="corteDialog = true"
          >
            Finalizar turno
          </v-btn>
        </template>
        <v-chip variant="tonal" color="primary" size="large">
          <v-icon icon="mdi-account-tie" start />
          {{ currentUser?.name ?? 'Mesero' }}
        </v-chip>
      </div>
    </div>

    <v-dialog v-model="corteDialog" max-width="460">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">Corte de caja</v-card-title>
        <v-card-text>
          <div v-if="activeShift && shiftInfo" class="text-body-1">
            <div class="d-flex justify-space-between mb-1">
              <span class="text-grey-darken-1">Mesero</span>
              <strong>{{ currentUser?.name }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-1">
              <span class="text-grey-darken-1">Inicio</span>
              <strong>{{ formatDateTime(activeShift.startedAt) }}</strong>
            </div>
            <v-divider class="my-3" />
            <div class="d-flex justify-space-between mb-1">
              <span class="text-grey-darken-1">Cuentas cobradas</span>
              <strong>{{ shiftInfo.count }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-1">
              <span class="text-grey-darken-1">Efectivo</span>
              <strong>{{ formatMoney(shiftInfo.byMethod.cash) }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-1">
              <span class="text-grey-darken-1">Tarjeta</span>
              <strong>{{ formatMoney(shiftInfo.byMethod.card) }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-1">
              <span class="text-grey-darken-1">Otro</span>
              <strong>{{ formatMoney(shiftInfo.byMethod.other) }}</strong>
            </div>
            <v-divider class="my-3" />
            <div class="d-flex justify-space-between align-center">
              <span class="text-h6">Total del turno</span>
              <span class="text-h5 font-weight-bold text-primary">{{ formatMoney(shiftInfo.total) }}</span>
            </div>
          </div>
        </v-card-text>
        <v-divider class="mx-4" />
        <v-card-actions class="pa-4 d-flex ga-3">
          <v-btn
            size="large"
            variant="tonal"
            prepend-icon="mdi-backup-restore"
            class="flex-grow-1"
            @click="corteDialog = false"
          >
            Seguir trabajando
          </v-btn>
          <v-btn
            size="large"
            color="error"
            prepend-icon="mdi-timer-off"
            class="flex-grow-1"
            @click="finishShift"
          >
            Finalizar turno
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showSnack" color="success" location="bottom">
      {{ snackText }}
    </v-snackbar>

    <v-row>
      <v-col
        v-for="card in tableCards"
        :key="card.table.id"
        cols="6"
        sm="4"
        md="3"
        lg="3"
        xl="2"
      >
        <v-card
          rounded="xl"
          :color="card.table.status === 'occupied' ? 'orange-lighten-4' : 'green-lighten-4'"
          class="table-card pa-2"
          @click="openTable(card.table.id)"
        >
          <v-card-text class="d-flex flex-column align-center text-center flex-grow-1">
            <v-icon
              :icon="card.table.status === 'occupied' ? 'mdi-table-chair' : 'mdi-table'"
              size="40"
              :color="card.table.status === 'occupied' ? 'deep-orange-darken-1' : 'green-darken-2'"
              class="mb-2"
            />
            <div class="text-h6 font-weight-bold text-grey-darken-2">{{ card.table.name }}</div>

            <v-chip
              size="small"
              :color="card.table.status === 'occupied' ? 'warning' : 'success'"
              variant="flat"
              class="mt-2"
            >
              {{ card.table.status === 'occupied' ? 'Ocupada' : 'Disponible' }}
            </v-chip>

            <div v-if="card.order" class="mt-auto pt-3 w-100 text-grey-darken-1">
              <div class="text-body-2 font-weight-bold text-grey-darken-2">
                {{ card.itemCount }} productos · {{ formatMoney(card.total) }}
              </div>
              <div class="text-caption">{{ card.since }}</div>
              <div v-if="card.responsible" class="text-caption mt-1">
                <v-icon icon="mdi-account-tie" size="13" /> Atendida por {{ card.responsible }}
              </div>
            </div>
          </v-card-text>

          <v-card-actions class="pt-0">
            <v-btn
              block
              size="x-large"
              :color="card.table.status === 'occupied' ? 'warning' : 'success'"
              class="mt-1"
            >
              <v-icon :icon="card.table.status === 'occupied' ? 'mdi-food' : 'mdi-plus-circle'" start />
              {{ card.table.status === 'occupied' ? 'Ver pedido' : 'Abrir mesa' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.table-card {
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  height: 300px;
}
.table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
</style>
