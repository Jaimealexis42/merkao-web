-- Recordatorios por correo a vendedores: control de envío semanal y bajas.
-- Ejecutar en el proyecto de Merkao (mlpsewryuaoklvokhejd) → SQL Editor.
-- Se puede ejecutar más de una vez.

create table if not exists public.recordatorios_vendedor (
  vendedor_id     uuid        primary key references auth.users(id) on delete cascade,
  ultimo_envio_at timestamptz,
  ultimo_tipo     text        check (ultimo_tipo in ('sin_productos', 'productos')),
  envios          integer     not null default 0,
  baja_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- Sin policies: anon y authenticated no pueden leer ni escribir.
-- Solo el servidor (service_role) accede.
alter table public.recordatorios_vendedor enable row level security;
