# 🌾 Campos SIS

Software de gestión integral para productores agropecuarios argentinos.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth + Storage)
- Vercel (deployment)

## Multi-tenancy

Cada productor (cliente del SaaS) tiene su propio subdominio:

```
donluis.camposis.bbnetsystem.com  →  campo "Estancia Don Luis"
lalucia.camposis.bbnetsystem.com  →  campo "La Lucía"
camposis.bbnetsystem.com          →  super-admin (Bebe) + landing
```

Aislamiento de datos via Row Level Security (RLS) en Postgres.

## Roles

- **super_admin** — vos (Bebe): gestionás clientes y suscripciones
- **admin_productor** — dueño del campo: hace todo dentro de su productor
- **empleado** — operario / contador: permisos limitados

## Setup local

Ver `LEEME.txt` para instrucciones completas.

## Versión

v0.1.0 · Esqueleto inicial
