-- =============================================================================
--  JurisGest Pro — Permissões do perfil OPERAÇÃO
--  Cole tudo no Supabase → SQL Editor → RUN. É SEGURO e IDEMPOTENTE
--  (pode rodar quantas vezes quiser; rodar de novo não causa dano).
--
--  O que faz: além de admin/advogado, permite que OPERAÇÃO GRAVE nas tabelas
--  necessárias para o trabalho dela:
--    • prazos        -> abrir/dar ciência e concluir ("Cumpri") as próprias tarefas
--    • processos     -> lançar andamentos e observações
--    • movimentacoes -> os andamentos em si
--    • documentos    -> anexar arquivos
--  EXCLUIR continua restrito (nada é deletado). Toda ação fica registrada
--  no log de atividades (rastreabilidade).
-- =============================================================================

-- 1) Função de papel "pode contribuir" = admin, advogado ou operação
create or replace function public.jg_pode_contribuir()
returns boolean
language sql stable security definer set search_path to 'public'
as $$ select public.jg_papel() in ('admin','advogado','operacao') $$;

-- 2) Relaxa as regras de GRAVAÇÃO (INSERT/UPDATE) que hoje só permitem
--    admin/advogado (jg_pode_editar), passando a permitir Operação também.
--    Não mexe em DELETE nem em tabelas de admin (ex.: usuários).
do $$
declare t text; r record;
begin
  foreach t in array array['prazos','processos','movimentacoes','documentos'] loop
    for r in
      select policyname, cmd from pg_policies
      where schemaname = 'public' and tablename = t
        and permissive = 'RESTRICTIVE' and cmd in ('INSERT','UPDATE')
        and coalesce(qual,'') || coalesce(with_check,'') ilike '%jg_pode_editar%'
    loop
      if r.cmd = 'INSERT' then
        execute format('alter policy %I on public.%I with check (public.jg_pode_contribuir())', r.policyname, t);
      else
        execute format('alter policy %I on public.%I using (public.jg_pode_contribuir()) with check (public.jg_pode_contribuir())', r.policyname, t);
      end if;
    end loop;
  end loop;
end $$;

-- 3) VERIFICAÇÃO — depois de rodar, esta consulta deve mostrar as regras de
--    gravação dessas tabelas apontando para jg_pode_contribuir().
select tablename, cmd, policyname, permissive, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('prazos','processos','movimentacoes','documentos')
  and cmd in ('INSERT','UPDATE')
order by tablename, cmd;
