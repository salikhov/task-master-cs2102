DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS refers CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS cityregions CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS approves CASCADE;
DROP TABLE IF EXISTS monitors CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS discounts CASCADE;
DROP TABLE IF EXISTS billingdetails CASCADE;
DROP TABLE IF EXISTS bookingdetails CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

create table accounts (
  id          serial        primary key,
  email       varchar(254)  unique not null,
  salt        varchar(32)   not null,
  hash        text          not null,
  firstName   varchar(40)   not null,
  lastName    varchar(40)   not null
);

create table users (
  id          serial        primary key references accounts(id) on delete cascade,
  phone       varchar(40),
  address     text
);

create table refers (
  referrerId  integer       not null references accounts(id),
  email       varchar(254)  unique not null,
  primary key(referrerId, email)
);

create table workers (
  id          serial        primary key references accounts(id) on delete cascade,
  phone       varchar(40)
);

create table admins (
  id          serial        primary key references accounts(id) on delete cascade
);

create table categories (
  catId       serial        primary key,
  name        varchar(40)   not null unique
);

create table cityregions (
  regionId    serial        primary key,
  name        varchar(40)   not null unique
);

create table services (
  serviceId   serial        primary key,
  name        varchar(40)   not null,
  description text          not null default 'N/A',
  price       numeric       not null check (price > 0),
  workerId    integer       not null references workers(id),
  catId       integer       not null references categories(catId),
  regionId    integer       not null references cityregions(regionId)
);

create table approves (
  workerId    integer       primary key references workers(id),
  approved    boolean       not null default FALSE,
  adminId     integer       references admins(id),
  check ((approved = true and adminId is not null) or (approved = false and adminId is null))
);

create table monitors (
  serviceId   integer       primary key references services(serviceId),
  active      boolean       not null default TRUE,
  adminId     integer       not null references admins(id)
);

create table availability (
  workerId    integer       not null references workers(id),
  startTime   timestamp     not null check (startTime > NOW()),
  endTime     timestamp     not null check (endTime > NOW()),
  primary key(workerId, startTime, endTime),
  check(endTime > startTime)
);

create table discounts (
  discountId  serial        primary key,
  promoCode   varchar(12)   not null unique,
  amount      numeric       check (amount > 0),
  percent     numeric       check (percent > 0 and percent < 100),
  check ((amount is null and percent is not null) or (amount is not null and percent is null))
);

create table billingdetails (
  billingId   serial        primary key,
  cardNumber  varchar(16)   not null,
  expDate     varchar(5)    not null,
  cvv         varchar(4)    not null,
  discountId  integer       unique references discounts(discountId)
);

create table reviews (
  reviewId    serial        primary key,
  rating      integer       not null check (rating >= 1 and rating <= 5),
  review      text
);

create table bookingdetails (
  bookingId   serial        primary key,
  startTime   timestamp     not null,
  endTime     timestamp     not null,
  address     text          not null,
  comments    text          not null default 'N/A',
  billingId   integer       unique not null references billingdetails(billingId) on delete cascade,
  userId      integer       not null references users(id),
  workerId    integer       not null references workers(id),
  serviceId   integer       not null references services(serviceId),
  reviewId    integer       unique references reviews(reviewId)
);