var mysql = require("mysql");
var config;
config = {
  mysql_pool: mysql.createPool({
    host: "162.241.123.158",
    user: "theatgg6_shg",
    password: "r3pbWhs8psb5nitZjlpDvg",
    database: "theatgg6_shc_branch288",
    multipleStatements: true,
    connectionLimit: 100, // Adjust as needed
  }),
  // mysql_pool : mysql.createPool({
  //     host     : '162.241.85.121',
  //     user     : 'athulslv_muthukumar',
  //     password : 'Athulya@123',
  //     database : 'athulslv_sal_subscriber102',
  //     multipleStatements: true
  // })
  // mysql_pool : mysql.createPool({
  //     host     : 'localhost',
  //     user     : 'root',
  //     password : 'root123',
  //     database : 'theatgg6_sal_subscriber102'
  // })
};

module.exports = config;
