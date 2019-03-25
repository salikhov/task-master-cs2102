/* ===============================================
 * FUNCTIONs and TRIGGERs to enforce that
 * an account must be of at least one account type
 * =============================================== */

create or replace function check_others_exist()
returns trigger as $$
declare count_users integer; count_workers integer; count_admins integer; valid boolean := false;
begin
  select count(*) into count_users from users U where U.id = old.id;
  select count(*) into count_workers from workers W where W.id = old.id;
  select count(*) into count_admins from admins A where A.id = old.id;
  if TG_TABLE_NAME = 'users' and (count_workers=1 or count_admins=1) then
    valid := true;
  end if;
  if TG_TABLE_NAME = 'workers' and (count_users=1 or count_admins=1) then
    valid := true;
  end if;
  if TG_TABLE_NAME = 'admins' and (count_workers=1 or count_users=1) then
    valid := true;
  end if;
  if valid=true then
    if TG_OP = 'UPDATE' then
      return new;
    elsif TG_OP = 'DELETE' then
      return old;
    else
      return null;
    end if;
  else
    raise notice 'ACCOUNT must belong to at least one type';
    return null;
  end if;
end;
$$ language plpgsql;

create or replace function check_at_least_one_account_type()
returns trigger as $$
declare count_users integer; count_workers integer; count_admins integer;
begin
  select count(*) into count_users from users U where U.id = new.id;
  select count(*) into count_workers from workers W where W.id = new.id;
  select count(*) into count_admins from admins A where A.id = new.id;
  if count_users=1 or count_workers=1 or count_admins=1 then
    return null;
  else
    raise exception 'ACCOUNT must belong to at least one type';
  end if;
end;
$$ language plpgsql;

drop trigger if exists trig_check_others_exist on users;
drop trigger if exists trig_check_others_exist on workers;
drop trigger if exists trig_check_others_exist on admins;
drop trigger if exists trig_check_at_least_one_account_type on accounts;

create trigger trig_check_others_exist
before update or delete on users
for each row execute procedure check_others_exist();

create trigger trig_check_others_exist
before update or delete on workers
for each row execute procedure check_others_exist();

create trigger trig_check_others_exist
before update or delete on admins
for each row execute procedure check_others_exist();

create constraint trigger trig_check_at_least_one_account_type
after insert or update on accounts
deferrable
for each row execute procedure check_at_least_one_account_type();