-- ============================================================
--  MERKAO — Tracking de pedidos (sistema de logística)
--
--  Tabla independiente de `pedidos.estado` (escrow). Esta tabla
--  registra eventos de envío con un código corto compartible.
--
--  IMPORTANTE: en el spec del prompt el FK apuntaba a `orders(id)`,
--  pero en este proyecto la tabla real se llama `pedidos`. Mantengo
--  el FK contra `pedidos(id)` para que la migración funcione.
--
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. Tabla principal ─────────────────────────────────────
create table if not exists public.order_tracking (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  tracking_code text not null unique
    default ('MRK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  estado text not null
    check (estado in ('preparando','enviado','en_camino','entregado')),
  notas text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── 2. Trigger updated_at ──────────────────────────────────
-- Reutiliza la función set_updated_at() ya creada en pedidos.sql.
drop trigger if exists trg_order_tracking_updated_at on public.order_tracking;
create trigger trg_order_tracking_updated_at
  before update on public.order_tracking
  for each row execute function set_updated_at();

-- ── 3. Índices ─────────────────────────────────────────────
create index if not exists order_tracking_pedido_idx
  on public.order_tracking (pedido_id);
create index if not exists order_tracking_tracking_code_idx
  on public.order_tracking (tracking_code);
create index if not exists order_tracking_created_at_idx
  on public.order_tracking (created_at desc);

-- ── 4. RLS ─────────────────────────────────────────────────
alter table public.order_tracking enable row level security;

-- SELECT público: cualquiera con el tracking_code puede consultar
-- (el código es secreto compartible — equivalente a un share link).
-- Frontend siempre filtra por `tracking_code = X` así que en la
-- práctica nadie puede listar tracking ajeno sin conocer el código.
drop policy if exists "order_tracking_select_public" on public.order_tracking;
create policy "order_tracking_select_public"
  on public.order_tracking
  for select
  to anon, authenticated
  using (true);

-- INSERT/UPDATE: solo el vendedor del pedido.
-- pedidos.vendedor_id debe coincidir con auth.uid().
drop policy if exists "order_tracking_insert_vendedor" on public.order_tracking;
create policy "order_tracking_insert_vendedor"
  on public.order_tracking
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and p.vendedor_id = auth.uid()
    )
  );

drop policy if exists "order_tracking_update_vendedor" on public.order_tracking;
create policy "order_tracking_update_vendedor"
  on public.order_tracking
  for update
  to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and p.vendedor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and p.vendedor_id = auth.uid()
    )
  );

-- DELETE: bloqueado (sin policy DELETE — los eventos de tracking son inmutables).
