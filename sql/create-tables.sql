create table users (
  userId      integer       primary key,
  firstName   varchar(40)   not null,
  lastName    varchar(40)   not null,
  email       varchar(40)   unique not null,
  phone       varchar(40)   not null,
  address     text
);

create table refers (
  referrerId  integer       not null references users(userId),
  userId      integer       unique not null references users(userId),
  primary key(referrerId, userId)
);

create table workers (
  workerId    integer       primary key,
  firstName   varchar(40)   not null,
  lastName    varchar(40)   not null,
  email       varchar(40)   unique not null,
  phone       varchar(40)   not null
);

create table admins (
  adminId     integer       primary key
);

create table categories (
  catId       integer       primary key,
  name        varchar(40)   not null
);

create table cityregions (
  regionId    integer       primary key,
  name        varchar(40)   not null
);

create table services (
  serviceId   integer       primary key,
  name        varchar(40)   not null,
  description text          not null default 'N/A',
  price       numeric       not null,
  workerId    integer       not null references workers(workerId),
  catId       integer       not null references categories(catId),
  regionId    integer       not null references cityregions(regionId)
);

create table approves (
  workerId    integer       primary key references workers(workerId),
  approved    boolean       not null default FALSE,
  adminId     integer       references admins(adminId)
);

create table monitors (
  serviceId   integer       primary key references services(serviceId),
  active      boolean       not null default TRUE,
  adminId     integer       not null references admins(adminId)
);

create table availability (
  workerId    integer       not null references workers(workerId),
  startTime   timestamp     not null,
  endTime     timestamp     not null
);

create table discounts (
  discountId  integer       primary key,
  promoCode   varchar(10)   not null unique,
  amount      numeric, -- we need to add constraints so one of
  percent     numeric  -- these two must be null
);

create table billingdetails (
  billingId   integer       primary key,
  cardNumber  varchar(16)   not null,
  expDate     varchar(5)    not null,
  cvv         varchar(4)    not null,
  discountId  integer       references discounts(discountId)
);

create table bookingdetails (
  bookingId   integer       primary key,
  startTime   timestamp     not null,
  endTime     timestamp     not null,
  address     text          not null,
  comments    text          not null default 'N/A',
  billingId   integer       not null references billingdetails(billingId),
  userId      integer       not null references users(userId),
  workerId    integer       not null references workers(workerId),
  serviceId   integer       not null references services(serviceId)
);

create table reviews (
  userId      integer       not null references users(userId),
  workerId    integer       not null references workers(workerId),
  bookingId   integer       unique not null references bookingdetails(bookingId),
  rating      integer       not null,
  review      text
);