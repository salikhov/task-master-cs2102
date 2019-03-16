create or replace view accountTypes (id, isUser, isWorker, isAdmin) as
select
id,
coalesce((select true from users U where U.id = A.id), false),
coalesce((select true from workers W where W.id = A.id), false),
coalesce((select true from admins D where D.id = A.id), false)
from accounts A
;