# RestoPOS 🍽️

Sistema de pedidos por mesa para restaurantes, hecho con **Vue 3 + TypeScript + Vuetify 3** y pensado para usarse en **tablets**.

## Perfiles

| Perfil | Vista | Funciones |
| --- | --- | --- |
| 🛡️ **Administrador** | `/admin` | Panel con estadísticas, gestión de menú (categorías y productos), mesas, usuarios, ventas y **ajustes** (responsable por mesa, propinas y descuentos). |
| 🍽️ **Mesero** | `/mesas` | Cuadrícula de mesas, **turnos con corte de caja**, tomar pedidos, agregar productos sobre la marcha, enviar a cocina, **cancelar/trasladar pedidos** y cerrar cuentas (efectivo/tarjeta/otro, con **propina y descuento** y **ticket imprimible**). |
| 👨‍🍳 **Cocina** | `/cocina` | Tablero de pedidos agrupados por mesa con estados: **Pendiente → En preparación → Listo → Entregado**. |

## Cómo correrlo

```bash
npm install
npm run dev
```

El servidor escucha en `0.0.0.0`, así que desde una tablet en la misma red puedes entrar a
`http://<ip-de-tu-computadora>:5173` (la IP aparece al arrancar Vite).

- **Build / typecheck:** `npm run build`
- **Vista previa del build:** `npm run preview`

## Datos

- Los datos se guardan en **localStorage** (base de datos completa) y la sesión del usuario en **sessionStorage**.
- Cada mesa ocupada muestra **quién la atiende** (el mesero que la abrió).
- **Cancelar/liberar mesa** solo está permitido si no hay productos **en preparación** (para no descartar lo que ya cocina el equipo).
- **Trasladar mesa**: mueve el pedido completo a otra mesa disponible (el cliente se cambió de lugar).
- **Turnos**: los meseros inician/finalizan su turno y ven su corte de caja (cuentas, efectivo/tarjeta, total). El admin ve todos los cortes en **Ventas**. Los turnos son opcionales: si el control se hace fuera de la app, se desactivan desde **Ajustes** y se ocultan los botones de turno y la sección de cortes.
- Al cerrar una cuenta se muestra un **ticket imprimible** con el desglose (subtotal, descuento, propina, total) y el nombre del mesero.
- En **Ajustes** (admin) puedes activar/desactivar: exigir responsable por mesa (solo ese mesero o un admin puede modificar la mesa), propinas, descuentos al cerrar cuenta y turnos de meseros.
- Cada perfil puede tener una **contraseña opcional** (Usuarios): si se asigna, se pide al entrar y evita que otra persona use ese perfil en la tablet. Sin contraseña, el perfil entra directo.
- Al primer arranque se crean datos de demostración (usuarios, menú, 8 mesas y pedidos de ejemplo).
- Desde el panel del admin (Panel → *Restablecer demo*) puedes volver a los datos de ejemplo.
- ⚠️ La información vive en el navegador de cada dispositivo: **no se comparte entre tablets**. Para eso está la migración a la nube (abajo).

## Estructura del proyecto

```
src/
├── data/          → Capa de persistencia (localStorage/sessionStorage) + datos demo
├── stores/        → Pinia: auth, catalog (menú), tables (mesas y pedidos)
├── types/         → Tipos de dominio (usuarios, mesas, pedidos, estados)
├── views/         → Login, waiter/, kitchen/, admin/
├── components/    → Componentes reutilizables (OrderPanel)
├── router/        → Rutas con guardas por perfil
└── plugins/       → Configuración de Vuetify (tema y componentes)
```

## Migrar a Firebase / Supabase (en mente desde el diseño)

Toda la persistencia pasa por **un solo archivo**: `src/data/storage.ts`. Los stores de Pinia
solo llaman a `loadDB()`, `mutateDB()` y `subscribeDB()`, así que el plan de migración es:

1. Crear las mismas colecciones en Firebase/Supabase: `users`, `categories`, `products`, `tables`, `orders`.
2. Reemplazar `loadDB()` / `mutateDB()` por operaciones contra la base (lecturas y escrituras).
3. Reemplazar `subscribeDB()` por una suscripción en tiempo real (`onSnapshot` en Firestore o
   `channel()` en Supabase Realtime) que re-dispare `store.load()` de cada store.
4. El login de perfiles se reemplaza por autenticación real (email o por dispositivo).

Como los stores ya escuchan cambios externos vía `subscribeDB()`, al conectar el tiempo real
la cocina y los meseros se actualizarán solos sin tocar las vistas.

## Configuración

En `src/config.ts` puedes cambiar el nombre de la app, la **moneda** (por defecto `MXN`) y el idioma.
