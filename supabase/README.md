# Supabase · Aural

## Cómo aplicar la migración inicial

1. Crea el proyecto en https://supabase.com → región `South America (São Paulo)`.
2. En el panel del proyecto: **SQL Editor** → **New query**.
3. Copia el contenido de `migrations/0001_init.sql` y ejecútalo.
4. Verifica en **Table Editor** que existan: `profiles`, `content`, `content_audiences`, `events`, `videos`, `documents`, `notifications`, `push_tokens`, `audit_logs`.

## Crear el primer admin

Después de que un usuario se registre desde la app:

```sql
update public.profiles
set is_admin = true, status = 'approved', approved_at = now()
where email = 'tu-correo@aural.com.co';
```

## Variables de entorno necesarias

`apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`apps/admin/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo server-side, nunca exponer al cliente
```
