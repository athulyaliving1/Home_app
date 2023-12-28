var db = require("../../db/connection.js").mysql_pool;

const branchlocation = (req, res) => {
    const { branch_city_id } = req.query;

    const query = `SELECT DISTINCT id,branch_name FROM master_branches WHERE branch_city_id=${branch_city_id}`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching location:", err);
            res.status(500).send("An error occurred");
        } else {
            res.json(results);
            console.log(results);
        }
    });
};

const masterServices = (req, res) => {

    const query = `SELECT * FROM master_services`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching services:", err);
            res.status(500).send("An error occurred");
        } else {
            res.json(results);
            console.log(results);
        }
    })
}


const masterCategories = (req, res) => {

    const query = `SELECT * FROM master_service_category`;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching services:", err);
            res.status(500).send("An error occurred");
        } else {
            res.json(results);
            // console.log(results);
        }
    })
}


module.exports = {
    branchlocation,
    masterServices,
    masterCategories
};