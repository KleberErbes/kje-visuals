-- Execute uma vez no SQL Editor do MESMO projeto do portfólio.
-- Não altera as tabelas nem as mídias existentes do portfólio.
begin;
create table if not exists public.shop_settings (
 id int primary key check(id=1), enabled boolean not null default false,
 pix_key text not null default '', beneficiary text not null default '',
 instructions text not null default 'Após o Pix, aguarde a conferência do pagamento. Guarde o link deste pedido para acompanhar a liberação.',
 contact text not null default '', updated_at timestamptz not null default now()
);
insert into public.shop_settings(id) values(1) on conflict do nothing;
create table if not exists public.shop_products (
 id uuid primary key default gen_random_uuid(), title text not null,
 description text not null default '', kind text not null check(kind in ('photo','video')),
 category text not null default '', specifications text not null default '',
 price_cents int not null check(price_cents between 100 and 10000000),
 license text not null check(length(license)>0), active boolean not null default false,
 preview_key text not null, cover_key text not null, original_key text not null,
 original_name text not null, original_size bigint not null check(original_size>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.shop_orders (
 id uuid primary key default gen_random_uuid(), token_hash text unique not null,
 customer_name text not null, customer_email text not null, customer_phone text not null default '',
 status text not null default 'pending' check(status in ('pending','paid','cancelled','revoked')),
 total_cents int not null check(total_cents>0), items jsonb not null,
 payment jsonb not null, rate_key text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '48 hours',
 paid_at timestamptz, updated_at timestamptz not null default now()
);
create index if not exists shop_orders_created_idx on public.shop_orders(created_at desc);
create index if not exists shop_orders_rate_idx on public.shop_orders(rate_key, created_at);
alter table public.shop_settings enable row level security;
alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;
revoke all on public.shop_settings, public.shop_products, public.shop_orders from anon, authenticated;
grant all on public.shop_settings, public.shop_products, public.shop_orders to service_role;

-- Transação única: preço, licença e arquivo são fotografados no momento da compra.
-- O navegador envia somente IDs; nunca decide o valor do pedido.
create or replace function public.shop_create_order(
 p_hash text, p_ids uuid[], p_name text, p_email text, p_phone text, p_rate text, p_total int
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare settings public.shop_settings; product public.shop_products; result_id uuid;
 snapshot jsonb := '[]'::jsonb; amount int := 0; count_items int := 0;
begin
 if p_hash !~ '^[a-f0-9]{64}$' or cardinality(p_ids) not between 1 and 20
    or length(p_name) not between 2 and 100 or length(p_email) not between 3 and 254
    or cardinality(p_ids) <> (select count(distinct value) from unnest(p_ids) value)
 then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_hash,0));
 select id into result_id from public.shop_orders where token_hash=p_hash;
 if found then return result_id; end if;
 -- Limite compartilhado por todas as instâncias da hospedagem.
 perform pg_advisory_xact_lock(hashtextextended(p_rate,1));
 if (select count(*) from public.shop_orders where rate_key=p_rate and created_at>now()-interval '1 hour')>=20
 then raise exception 'RATE_LIMIT'; end if;
 select * into settings from public.shop_settings where id=1 for share;
 if not found or not settings.enabled or settings.pix_key='' or settings.beneficiary='' then raise exception 'SHOP_CLOSED'; end if;
 for product in select * from public.shop_products where id=any(p_ids) and active order by id for share loop
  count_items := count_items+1;
  amount := amount+product.price_cents;
  snapshot := snapshot || jsonb_build_array(jsonb_build_object(
    'id',product.id,'title',product.title,'kind',product.kind,'price_cents',product.price_cents,
    'license',product.license,'specifications',product.specifications,
    'original_key',product.original_key,'original_name',product.original_name,'original_size',product.original_size));
 end loop;
 if count_items<>cardinality(p_ids) then raise exception 'UNAVAILABLE_PRODUCT'; end if;
 if amount<>p_total then raise exception 'PRICE_CHANGED'; end if;
 insert into public.shop_orders(token_hash,customer_name,customer_email,customer_phone,total_cents,items,payment,rate_key)
 values(p_hash,p_name,lower(p_email),p_phone,amount,snapshot,
   jsonb_build_object('pix_key',settings.pix_key,'beneficiary',settings.beneficiary,'instructions',settings.instructions),p_rate)
 returning id into result_id;
 return result_id;
end;
$$;
revoke all on function public.shop_create_order(text,uuid[],text,text,text,text,int) from public, anon, authenticated;
grant execute on function public.shop_create_order(text,uuid[],text,text,text,text,int) to service_role;

-- NUNCA torne shop-originals público e não adicione políticas de leitura pública.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('shop-originals','shop-originals',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4']),
 ('shop-previews','shop-previews',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict(id) do update set public=false;
commit;
