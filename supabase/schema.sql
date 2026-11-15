-- Cole tudo no Supabase: SQL Editor > New query > Run.
create table if not exists portfolio_content (
  id int primary key,
  draft jsonb not null,
  published jsonb,
  revision int not null,
  published_revision int not null default 0
);
create table if not exists editor_sessions (
  token_hash text primary key,
  expires_at bigint not null
);
-- RLS ligado e sem políticas: só o servidor (chave secreta) acessa estas tabelas.
alter table portfolio_content enable row level security;
alter table editor_sessions enable row level security;

create or replace function publish_portfolio(rev int) returns int
language sql as $$
  update portfolio_content set published = draft, published_revision = revision
  where id = 1 and revision = rev returning revision;
$$;
revoke execute on function publish_portfolio(int) from public, anon, authenticated;

-- Bucket privado para as mídias enviadas pelo painel (50 MB por arquivo = limite do plano gratuito).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800, array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do nothing;
