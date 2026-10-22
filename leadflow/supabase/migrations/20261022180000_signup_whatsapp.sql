begin;

-- Grava o WhatsApp informado no cadastro em profiles.phone (formato 55DDDNUMERO).
-- Roda depois de on_auth_user_created (ordem alfabética dos gatilhos), quando o
-- perfil já existe. Valores inválidos são ignorados para não bloquear o cadastro.
create or replace function public.handle_new_user_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  whatsapp_digits text;
begin
  whatsapp_digits := regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'whatsapp', ''),
    '\D',
    '',
    'g'
  );

  if length(whatsapp_digits) in (10, 11) then
    whatsapp_digits := '55' || whatsapp_digits;
  end if;

  if whatsapp_digits ~ '^55[1-9][1-9](9[0-9]{8}|[2-5][0-9]{7})$' then
    update public.profiles
    set phone = whatsapp_digits
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user_whatsapp() from public, anon, authenticated;

drop trigger if exists on_auth_user_whatsapp on auth.users;
create trigger on_auth_user_whatsapp
after insert on auth.users
for each row execute function public.handle_new_user_whatsapp();

notify pgrst, 'reload schema';

commit;
