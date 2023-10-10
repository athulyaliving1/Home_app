
// Include Sequelize module 
const Sequelize = require('sequelize') 
  
// Creating new Object of Sequelize 
const sequelize = new Sequelize( 
    'theatgg6_shc_branch288', 
    'theatgg6_shg', 
    'r3pbWhs8psb5nitZjlpDvg', { 
  
        // Explicitly specifying  
        // mysql database 
        dialect: 'mysql', 
  
        // By default host is 'localhost'            
        host: '162.241.123.158'
    } 
); 
  
// Exporting the sequelize object.  
// We can use it in another file 
// for creating models 
module.exports = sequelize 