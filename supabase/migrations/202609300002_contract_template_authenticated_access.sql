drop policy if exists "Admins can manage contract templates"
  on public.contract_templates;

grant select, insert, update on public.contract_templates to authenticated;

create policy "Authenticated users can create contract templates"
  on public.contract_templates for insert to authenticated with check (true);

create policy "Authenticated users can update contract templates"
  on public.contract_templates for update to authenticated using (true) with check (true);

create or replace function public.save_contract_template(template_content text)
returns public.contract_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  saved_template public.contract_templates;
begin
  perform pg_advisory_xact_lock(hashtext('contract_templates_version'));
  select coalesce(max(version), 0) + 1 into next_version from public.contract_templates;
  update public.contract_templates set is_active = false where is_active;

  insert into public.contract_templates (version, content, is_active, created_by)
  values (next_version, template_content, true, auth.uid())
  returning * into saved_template;

  return saved_template;
end;
$$;

revoke all on function public.save_contract_template(text) from public;
grant execute on function public.save_contract_template(text) to authenticated;