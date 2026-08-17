<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ROLES } from '../types'
import type { StaffUser } from '../types'
import { APP_NAME } from '../config'
import { homeForRole } from '../router'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

auth.init()

const users = computed(() => auth.activeUsers)

function selectUser(userId: string) {
  const user = auth.users.find((u) => u.id === userId)
  if (!user) return
  if (user.password) {
    pendingUser.value = user
    passwordInput.value = ''
    passwordError.value = ''
    passwordDialog.value = true
  } else {
    enter(user.id)
  }
}

function enter(userId: string) {
  auth.login(userId)
  const current = auth.currentUser
  if (!current) return
  const redirect = route.query.redirect
  router.push(typeof redirect === 'string' ? redirect : homeForRole(current.role))
}

// Diálogo de contraseña para perfiles protegidos
const passwordDialog = ref(false)
const pendingUser = ref<StaffUser | null>(null)
const passwordInput = ref('')
const passwordError = ref('')

function confirmPassword() {
  const user = pendingUser.value
  if (!user) return
  if (passwordInput.value === user.password) {
    passwordDialog.value = false
    enter(user.id)
  } else {
    passwordError.value = 'Contraseña incorrecta. Intenta de nuevo.'
    passwordInput.value = ''
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
</script>

<template>
  <div class="login-page d-flex align-center justify-center pa-4">
    <div style="max-width: 860px" class="w-100">
      <div class="text-center mb-6">
        <v-avatar color="primary" size="84" class="mb-3 elevation-4">
          <v-icon icon="mdi-silverware-fork-knife" size="44" color="white" />
        </v-avatar>
        <h1 class="text-h4 font-weight-bold">{{ APP_NAME }}</h1>
        <p class="text-subtitle-1 text-grey-darken-1 mt-1">Sistema de pedidos por mesa</p>
      </div>

      <v-card rounded="xl" elevation="3">
        <v-card-text class="pa-6">
          <div class="text-h6 font-weight-medium mb-4 text-center">Selecciona tu perfil para entrar</div>

          <v-row v-if="users.length">
            <v-col v-for="u in users" :key="u.id" cols="12" sm="6" md="4">
              <v-btn
                block
                variant="tonal"
                color="grey-lighten-3"
                class="user-card position-relative"
                @click="selectUser(u.id)"
              >
                <v-icon
                  v-if="u.password"
                  icon="mdi-lock"
                  size="14"
                  color="grey"
                  class="position-absolute"
                  title="Perfil protegido con contraseña"
                  style="top: 10px; right: 12px"
                />
                <div class="d-flex flex-column align-center">
                  <v-avatar :color="u.color" size="52" class="mb-2">
                    <span class="text-h6 font-weight-bold text-white">{{ initials(u.name) }}</span>
                  </v-avatar>
                  <span class="text-body-1 font-weight-bold text-grey-darken-1">{{ u.name }}</span>
                  <v-chip size="small" :color="ROLES[u.role].color" variant="flat" class="mt-1">
                    <v-icon :icon="ROLES[u.role].icon" size="14" start />
                    {{ ROLES[u.role].label }}
                  </v-chip>
                </div>
              </v-btn>
            </v-col>
          </v-row>

          <div v-else class="text-center text-grey-darken-1 py-8">
            No hay usuarios. Crea uno desde el panel de administración.
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-dialog v-model="passwordDialog" max-width="380">
      <v-card rounded="xl">
        <v-card-title class="text-h5 font-weight-bold">Contraseña del perfil</v-card-title>
        <v-card-text>
          <div class="d-flex align-center mb-4">
            <v-avatar :color="pendingUser?.color ?? 'grey'" size="44" class="mr-3">
              <span class="font-weight-bold text-white">{{ pendingUser ? initials(pendingUser.name) : '' }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-bold text-body-1">{{ pendingUser?.name }}</div>
              <div class="text-caption text-grey-darken-1">Escribe la contraseña para entrar a este perfil</div>
            </div>
          </div>
          <v-text-field
            v-model="passwordInput"
            type="password"
            label="Contraseña"
            :error-messages="passwordError"
            autofocus
            @keyup.enter="confirmPassword"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn size="large" variant="text" @click="passwordDialog = false">Cancelar</v-btn>
          <v-spacer />
          <v-btn size="large" color="primary" :disabled="!passwordInput" @click="confirmPassword">Entrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
}
.user-card {
  border: 2px solid rgba(0, 0, 0, 0.06);
  text-transform: none;
  height: auto;
  min-height: 104px;
}
</style>
