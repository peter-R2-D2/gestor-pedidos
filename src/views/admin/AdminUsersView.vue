<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { ROLES } from '../../types'
import type { Role, StaffUser } from '../../types'

const auth = useAuthStore()
auth.init()

const COLOR_OPTIONS = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'orange', 'teal', 'accent']

const dialog = ref(false)
const form = ref({
  id: null as string | null,
  name: '',
  role: 'waiter' as Role,
  color: 'success',
  password: '',
  removePassword: false,
})
const showSnack = ref(false)
const snackText = ref('')

const users = computed(() => auth.users)

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const hasPassword = computed(() => {
  if (!form.value.id) return false
  return !!auth.users.find((u) => u.id === form.value.id)?.password
})

const passwordHint = computed(() => {
  if (form.value.id) {
    return hasPassword.value
      ? 'Deja vacío para mantener la contraseña actual.'
      : 'Opcional: si la dejas vacía, el perfil entra sin contraseña.'
  }
  return 'Opcional: se pedirá al entrar a este perfil.'
})

function openDialog(user?: StaffUser) {
  form.value = {
    id: user?.id ?? null,
    name: user?.name ?? '',
    role: user?.role ?? 'waiter',
    color: user?.color ?? 'success',
    password: '',
    removePassword: false,
  }
  dialog.value = true
}

function save() {
  const name = form.value.name.trim()
  if (!name) return
  if (form.value.id) {
    const patch: Partial<StaffUser> = { name, role: form.value.role, color: form.value.color }
    if (form.value.removePassword) patch.password = ''
    else if (form.value.password) patch.password = form.value.password
    auth.updateUser(form.value.id, patch)
  } else {
    auth.addUser({
      name,
      role: form.value.role,
      color: form.value.color,
      ...(form.value.password ? { password: form.value.password } : {}),
    })
  }
  dialog.value = false
}

function remove(id: string, name: string) {
  if (id === auth.currentUserId) {
    snackText.value = 'No puedes eliminar al usuario con la sesión actual.'
    showSnack.value = true
    return
  }
  if (window.confirm(`¿Eliminar a ${name}?`)) {
    auth.deleteUser(id)
  }
}

function roleLabel(role: Role): string {
  return ROLES[role].label
}
</script>

<template>
  <div class="pa-4">
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap">
      <div>
        <h2 class="text-h5 font-weight-bold">Usuarios y perfiles</h2>
        <span class="text-body-2 text-grey-darken-1">
          {{ auth.users.length }} usuarios · perfiles: admin, mesero y cocina
        </span>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus" size="x-large" @click="openDialog()">
        Agregar usuario
      </v-btn>
    </div>

    <v-card rounded="xl" elevation="1">
      <v-list density="comfortable">
        <v-list-item v-for="u in users" :key="u.id">
          <template #prepend>
            <v-avatar :color="u.color" size="44" class="mr-3">
              <span class="font-weight-bold text-white">{{ initials(u.name) }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-bold">
            {{ u.name }}
            <v-chip
              v-if="u.id === auth.currentUserId"
              size="x-small"
              color="primary"
              variant="flat"
              class="ml-2"
            >
              Tú
            </v-chip>
          </v-list-item-title>
          <v-list-item-subtitle class="d-flex align-center">
            <v-chip size="small" :color="ROLES[u.role].color" variant="tonal">
              <v-icon :icon="ROLES[u.role].icon" size="14" start />
              {{ roleLabel(u.role) }}
            </v-chip>
            <v-icon
              v-if="u.password"
              icon="mdi-lock"
              size="14"
              color="grey"
              class="ml-2"
              title="Perfil protegido con contraseña"
            />
          </v-list-item-subtitle>
          <template #append>
            <v-switch
              :model-value="u.active"
              color="success"
              hide-details
              label="Activo"
              @update:model-value="auth.updateUser(u.id, { active: !!$event })"
            />
            <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="openDialog(u)" />
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="error"
              @click.stop="remove(u.id, u.name)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-dialog v-model="dialog" max-width="460">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">
          {{ form.id ? 'Editar usuario' : 'Nuevo usuario' }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="Nombre" placeholder="Ej. Juan Pérez" class="mb-3" />

          <v-select
            v-model="form.role"
            label="Perfil"
            :items="Object.keys(ROLES) as Role[]"
            class="mb-3"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :title="roleLabel(item.value as Role)">
                <template #prepend>
                  <v-icon :icon="ROLES[item.value as Role].icon" :color="ROLES[item.value as Role].color" class="mr-2" />
                </template>
              </v-list-item>
            </template>
          </v-select>

          <div class="text-subtitle-2 font-weight-medium mb-1">Color del avatar</div>
          <v-btn-toggle v-model="form.color" mandatory divided variant="outlined" color="primary">
            <v-btn v-for="c in COLOR_OPTIONS" :key="c" :value="c" size="small" class="px-2">
              <v-avatar :color="c" size="20" />
            </v-btn>
          </v-btn-toggle>

          <v-divider class="my-4" />

          <v-text-field
            v-model="form.password"
            type="password"
            label="Contraseña del perfil"
            placeholder="Opcional"
            :hint="passwordHint"
            persistent-hint
            autocomplete="new-password"
          />
          <v-checkbox
            v-if="form.id && hasPassword"
            v-model="form.removePassword"
            label="Quitar contraseña actual"
            color="error"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="x-large" variant="text" @click="dialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn size="x-large" color="primary" :disabled="!form.name.trim()" @click="save">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showSnack" color="warning" location="bottom">
      {{ snackText }}
    </v-snackbar>
  </div>
</template>
