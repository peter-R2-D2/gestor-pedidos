<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '../types'
import { PAYMENT_METHODS, orderTotal } from '../types'
import { formatDateTime, formatMoney } from '../utils/format'
import { APP_NAME } from '../config'

const props = defineProps<{
  show: boolean
  order: Order | null
  waiterName?: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const items = computed(() => props.order?.items ?? [])
const subtotal = computed(() => props.order?.subtotal ?? orderTotal({ items: items.value }))
const discount = computed(() => props.order?.discount ?? 0)
const tip = computed(() => props.order?.tip ?? 0)
const total = computed(() => props.order?.total ?? subtotal.value - discount.value + tip.value)
const paymentLabel = computed(() =>
  props.order?.paymentMethod ? PAYMENT_METHODS[props.order.paymentMethod].label : '',
)

function printTicket() {
  window.print()
}
</script>

<template>
  <v-dialog
    :model-value="show"
    max-width="420"
    persistent
    @update:model-value="emit('update:show', $event)"
  >
    <v-card rounded="xl">
      <!-- Contenido imprimible -->
      <div class="ticket-print pa-5">
        <div class="text-center mb-2">
          <div class="text-h6 font-weight-bold">{{ APP_NAME }}</div>
          <div class="text-caption text-grey-darken-1">Ticket de venta</div>
        </div>

        <div class="text-body-2 mb-2">
          <div class="d-flex justify-space-between">
            <span>Mesa: <strong>{{ order?.tableName ?? '—' }}</strong></span>
            <span>{{ order ? formatDateTime(order.closedAt ?? order.createdAt) : '' }}</span>
          </div>
          <div v-if="waiterName">Atendió: <strong>{{ waiterName }}</strong></div>
        </div>

        <v-divider class="my-2" />

        <div v-for="item in items" :key="item.id" class="d-flex justify-space-between text-body-2 py-1">
          <span class="flex-grow-1 pr-2">{{ item.qty }} × {{ item.name }}</span>
          <span class="font-weight-medium">{{ formatMoney(item.price * item.qty) }}</span>
        </div>

        <v-divider class="my-2" />

        <div class="text-body-2">
          <div class="d-flex justify-space-between py-1">
            <span>Subtotal</span>
            <span>{{ formatMoney(subtotal) }}</span>
          </div>
          <div v-if="discount > 0" class="d-flex justify-space-between py-1">
            <span>Descuento</span>
            <span class="text-error">−{{ formatMoney(discount) }}</span>
          </div>
          <div v-if="tip > 0" class="d-flex justify-space-between py-1">
            <span>Propina</span>
            <span class="text-success">+{{ formatMoney(tip) }}</span>
          </div>
          <div class="d-flex justify-space-between align-center py-1 mt-1">
            <span class="text-h6 font-weight-bold">TOTAL</span>
            <span class="text-h6 font-weight-bold">{{ formatMoney(total) }}</span>
          </div>
        </div>

        <v-divider class="my-2" />

        <div class="text-body-2 text-center">
          <div v-if="paymentLabel">Pago: <strong>{{ paymentLabel }}</strong></div>
          <div class="mt-1 text-grey-darken-1">¡Gracias por su visita!</div>
        </div>
      </div>

      <!-- Acciones (no se imprimen) -->
      <v-card-actions class="pa-4 print-hide">
        <v-btn size="x-large" variant="text" @click="emit('update:show', false)">Cerrar</v-btn>
        <v-spacer />
        <v-btn size="x-large" color="primary" prepend-icon="mdi-printer" @click="printTicket">
          Imprimir ticket
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style>
/* Al imprimir, solo se muestra el ticket */
@media print {
  body * {
    visibility: hidden;
  }
  .ticket-print,
  .ticket-print * {
    visibility: visible;
  }
  .ticket-print {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
  }
  .print-hide {
    display: none !important;
  }
}
</style>
