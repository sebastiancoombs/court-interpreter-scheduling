-- RLS policies — per-court isolation + per-role access for the unified schema.

create or replace function app.has_role(p_role app.role_kind)
returns boolean language sql stable as $$
  select exists (select 1 from app.roles r where r.user_id = auth.uid() and r.role = p_role);
$$;

create or replace function app.has_role_at(p_role app.role_kind, p_court text)
returns boolean language sql stable as $$
  select exists (
    select 1 from app.roles r
    where r.user_id = auth.uid() and r.role = p_role
      and (r.court_id is null or r.court_id = p_court)
  );
$$;

alter table app.profiles         enable row level security;
alter table app.roles            enable row level security;
alter table app.bookings_mirror  enable row level security;
alter table app.documents        enable row level security;
alter table app.audit_log        enable row level security;

-- Profiles: own row + admins
create policy profile_self_read   on app.profiles for select using (user_id = auth.uid() or app.has_role('super_admin'));
create policy profile_self_update on app.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profile_admin_write on app.profiles for all using (app.has_role('super_admin')) with check (app.has_role('super_admin'));

-- Roles: admins write, users see their own
create policy role_self_read    on app.roles for select using (user_id = auth.uid() or app.has_role('super_admin'));
create policy role_admin_write  on app.roles for all using (app.has_role('super_admin')) with check (app.has_role('super_admin'));

-- Bookings mirror: per-court coordinators/staff + assigned interpreter
create policy booking_read on app.bookings_mirror for select using (
  app.has_role_at('court_coordinator', court_id)
  or app.has_role_at('court_staff', court_id)
  or app.has_role('super_admin')
  or interpreter_id in (select ea_user_id from app.profiles where user_id = auth.uid())
);

-- Documents: owner + admins; certifications visible to coordinators of any court
create policy document_owner_read on app.documents for select using (
  owner_user_id = auth.uid()
  or app.has_role('super_admin')
  or (bucket = 'interpreter-certifications' and app.has_role('court_coordinator'))
);
create policy document_owner_write on app.documents for all using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Audit log: super-admin only
create policy audit_admin_read on app.audit_log for select using (app.has_role('super_admin'));
