-- Permite que o proprietário atual transfira o lead para outro usuário.
-- A política existente continua limitando a atualização ao líder ou ao dono atual.
drop policy if exists leads_owner_transfer on public.leads;

create policy leads_owner_transfer
on public.leads
for update
to authenticated
using (
  public.is_leader(auth.uid())
  or owner_id = auth.uid()
)
with check (auth.uid() is not null);
