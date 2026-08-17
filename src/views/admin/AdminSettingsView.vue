<script setup lang="ts">
import { useSettingsStore } from '../../stores/settings'
import { useAuthStore } from '../../stores/auth'

const settings = useSettingsStore()
const auth = useAuthStore()
settings.init()
auth.init()
</script>

<template>
  <div class="pa-4" style="max-width: 760px">
    <h2 class="text-h5 font-weight-bold mb-1">Ajustes</h2>
    <p class="text-body-2 text-grey-darken-1 mb-4">
      Opciones generales del restaurante. Los cambios aplican de inmediato para todos los perfiles.
    </p>

    <v-card rounded="xl" elevation="1" class="mb-4">
      <v-card-title class="font-weight-bold d-flex align-center">
        <v-icon icon="mdi-account-tie" class="mr-2" color="success" />
        Responsable por mesa
      </v-card-title>
      <v-card-text>
        <v-switch
          :model-value="settings.settings.responsiblePerTable"
          color="success"
          hide-details
          label="Exigir mesero responsable por mesa"
          @update:model-value="settings.update({ responsiblePerTable: !!$event })"
        />
        <p class="text-body-2 text-grey-darken-1 mt-3 mb-0">
          Al activarlo, cada mesa queda asignada al mesero que la abre y <strong>solo ese mesero</strong>
          (o un administrador) podrá agregar productos, modificar o cerrar esa cuenta. Los demás meseros
          podrán verla pero no modificarla. Al desactivarlo, cualquier mesero puede modificar todas las
          mesas. El responsable siempre se muestra en las mesas ocupadas.
        </p>
      </v-card-text>
    </v-card>

    <v-card rounded="xl" elevation="1" class="mb-4">
      <v-card-title class="font-weight-bold d-flex align-center">
        <v-icon icon="mdi-hand-coin" class="mr-2" color="teal" />
        Propinas
      </v-card-title>
      <v-card-text>
        <v-switch
          :model-value="settings.settings.tipsEnabled"
          color="success"
          hide-details
          label="Permitir propina al cerrar cuenta"
          @update:model-value="settings.update({ tipsEnabled: !!$event })"
        />
        <p class="text-body-2 text-grey-darken-1 mt-3 mb-0">
          Muestra la opción de propina (con botones rápidos de 10/15/20 %) en el diálogo de cobro.
        </p>
      </v-card-text>
    </v-card>

    <v-card rounded="xl" elevation="1">
      <v-card-title class="font-weight-bold d-flex align-center">
        <v-icon icon="mdi-percent" class="mr-2" color="warning" />
        Descuentos
      </v-card-title>
      <v-card-text>
        <v-switch
          :model-value="settings.settings.discountsEnabled"
          color="success"
          hide-details
          label="Permitir descuento al cerrar cuenta"
          @update:model-value="settings.update({ discountsEnabled: !!$event })"
        />
        <p class="text-body-2 text-grey-darken-1 mt-3 mb-0">
          Muestra el campo de descuento porcentual en el diálogo de cobro.
        </p>
      </v-card-text>
    </v-card>

    <v-alert type="info" variant="tonal" class="mt-4">
      Los ajustes se guardan junto con los datos del restaurante. Recuerda: <strong>{{
        auth.currentUser?.name ?? 'Administrador'
      }}</strong>, estos cambios aplican en este dispositivo (localStorage). Al migrar a la nube se compartirán entre todas las tablets.
    </v-alert>
  </div>
</template>
