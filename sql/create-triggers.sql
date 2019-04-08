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
drop trigger if exists trig_check_others_exist_delete on users;
drop trigger if exists trig_check_others_exist_delete on workers;
drop trigger if exists trig_check_others_exist_delete on admins;
drop trigger if exists trig_check_at_least_one_account_type on accounts;

create trigger trig_check_others_exist
before update on users
for each row 
when (NEW.id <> OLD.id)
execute procedure check_others_exist();

create trigger trig_check_others_exist
before update on workers
for each row 
when (NEW.id <> OLD.id)
execute procedure check_others_exist();

create trigger trig_check_others_exist
before update on admins
for each row 
when (NEW.id <> OLD.id)
execute procedure check_others_exist();

create trigger trig_check_others_exist_delete
before delete on users
for each row 
execute procedure check_others_exist();

create trigger trig_check_others_exist_delete
before delete on workers
for each row 
execute procedure check_others_exist();

create trigger trig_check_others_exist_delete
before delete on admins
for each row 
execute procedure check_others_exist();

create constraint trigger trig_check_at_least_one_account_type
after insert or update on accounts
deferrable
for each row execute procedure check_at_least_one_account_type();

/* ===============================================
 * FUNCTIONs and TRIGGERs to enforce that worker
 * does not have overlapping availabilities
 * a.k.a. implementing malloc but with time ranges
 * instead of memory blocks and in SQL
 * =============================================== */
create or replace function check_overlaps()
returns trigger as $$
declare temprow record;
begin
  for temprow in select starttime, endtime from availability where workerid=new.workerid
	and (overlaps(starttime, endtime, new.starttime, new.endtime)
	or new.endtime=starttime or new.starttime=endtime)
	and (coalesce(old.starttime, new.starttime) <> starttime or coalesce(old.endtime, new.endtime) <> endtime)
  loop
  	raise notice 'OVERLAP S: %, E: %', temprow.starttime, temprow.endtime;
  	if temprow.starttime >= new.starttime and temprow.endtime <= new.endtime then
  		raise notice 'RESOLVING OVERLAP encompass strategy';
  		-- if the conflict is fully encompassed by the new range then delete the conflict
  		delete from availability where workerid=new.workerid and starttime=temprow.starttime and endtime=temprow.endtime;
  	elsif temprow.starttime < new.starttime and temprow.endtime > new.endtime then
  		raise notice 'RESOLVING OVERLAP conflict strategy';
  		-- if the conflict fully encompasses the new range then ignore the new range
  		-- can immediately return since there should be no other conflicts
  		return null;
  	elsif temprow.starttime <= new.starttime and temprow.endtime <= new.endtime then
  		raise notice 'RESOLVING OVERLAP merge left strategy';
  		delete from availability where workerid=new.workerid and starttime=temprow.starttime and endtime=temprow.endtime;
  		insert into availability (workerid, starttime, endtime) values (new.workerid, temprow.starttime, new.endtime);
		return null;
  	elsif temprow.endtime >= new.endtime and temprow.starttime <= new.endtime then
  		raise notice 'RESOLVING OVERLAP merge right strategy';
  		new.endtime := temprow.endtime;
  		delete from availability where workerid=new.workerid and starttime=temprow.starttime and endtime=temprow.endtime;
  	end if;
  end loop;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trig_check_availability_overlap on availability;
drop trigger if exists trig_check_availability_overlap_upd on availability;

create trigger trig_check_availability_overlap
before insert on availability
for each row
execute procedure check_overlaps();

create trigger trig_check_availability_overlap_upd
before update on availability
for each row
when (new.starttime < old.starttime or new.endtime > old.endtime)
execute procedure check_overlaps();

/* ===============================================
 * FUNCTIONs and TRIGGERs to enforce that worker
 * does not have overlapping bookings
 * =============================================== */
create or replace function check_booking_overlaps()
returns trigger as $$
declare temprow record;
begin
  for temprow in select starttime, endtime from bookingdetails where workerid=new.workerid
	and overlaps(starttime, endtime, new.starttime, new.endtime) and bookingid <> new.bookingid
  loop
  	raise notice 'OVERLAP S: %, E: %', temprow.starttime, temprow.endtime;
  	return null;
  end loop;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trig_check_booking_overlap on bookingdetails;

create trigger trig_check_booking_overlap
before insert or update on bookingdetails
for each row
execute procedure check_booking_overlaps();

/* ===============================================
 * FUNCTIONs and TRIGGERs to enforce that referrer
 cannot refer themselves
 * =============================================== */
create or replace function check_referrer()
returns trigger as $$
declare ref_email varchar(254);
begin
  ref_email := (select email from accounts where id=new.referrerid);
  if ref_email = new.email then
    raise notice 'Cannot refer yourself!';
    return null;
  else 
    return new; 
  end if;
end;
$$ language plpgsql;

drop trigger if exists check_referrer on refers;

create trigger check_referrer
before insert or update on refers
for each row
execute procedure check_referrer();