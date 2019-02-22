const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.DATABASE_URL === undefined) {
  console.log("Unable to load DATABASE_URL from .env file");
  console.log("Make sure you have correctly setup the .env file!");
  process.exit();
}

pool.query("select 1 from cityregions limit 1", function(err, res) {
  if (err || res.rows === undefined) {
    console.log(
      "Test DB query failed! Make sure you have correctly setup the DB"
    );
    process.exit();
  }
});

module.exports = pool;
