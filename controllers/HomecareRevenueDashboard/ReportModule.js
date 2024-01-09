var db = require("../../db/connection").mysql_pool;
const { query } = require("express");
const util = require("util");
const dbQueryAsync = util.promisify(db.query);

const Reports = (req, res) => {
    var query1 =
        "SELECT CASE WHEN DAYOFMONTH(CURRENT_DATE) > 25 THEN DATEDIFF(DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-25'), CURRENT_DATE)+1 ELSE DATEDIFF(DATE_FORMAT(CURRENT_DATE, '%Y-%m-25'),CURRENT_DATE)+1 END AS days_until_adjusted_end_date";
    var query2 =
        "SELECT patients.id,patients.patient_id,patients.first_name,service_request_id,schedule_id,(amount * (SELECT CASE WHEN DAYOFMONTH(CURRENT_DATE) > 25 THEN DATEDIFF(DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-25'), CURRENT_DATE)+1 ELSE DATEDIFF(DATE_FORMAT(CURRENT_DATE, '%Y-%m-25'),CURRENT_DATE)+1 END AS days_until_adjusted_end_date)) as projected_amount,(SELECT CASE WHEN DAYOFMONTH(CURRENT_DATE) > 25 THEN DATEDIFF(DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-25'), CURRENT_DATE)+1 ELSE DATEDIFF(DATE_FORMAT(CURRENT_DATE, '%Y-%m-25'),CURRENT_DATE)+1 END AS days_until_adjusted_end_date) as remaning_days FROM `case_schedules` join patients on case_schedules.patient_id=patients.id where schedule_date=CURRENT_DATE and status!='Cancelled' and chargeable=1";
    db.query(query2, (err, result) => {
        return res.status(200).json({ success: result });
    });
    //return res.status(200).json({success:"Tested"});
};

const getSummary = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;

        // console.log(req.query);

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                    // console.log("branches", results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        // console.log("allbranches", all_branches);

        const filter_branches = !branch_id ? all_branches : branch_id;

        // console.log("branchess..:;" + filter_branches);

        //     const query = `
        //     SELECT  COALESCE(SUM(case_invoices.total_amount), 0) as total_invoice_amount
        //     FROM case_invoices 
        //     WHERE case_invoices.invoice_date >= ? AND case_invoices.invoice_date <= ? and status!='Cancelled'
        //    and case_invoices.branch_id in (?)`;

        const query = `SELECT 
           COALESCE(SUM(amount), 0) as total_invoice_amount
       FROM 
           case_schedules 
       WHERE 
           case_schedules.schedule_date BETWEEN >= ?  AND <= ?  AND 
           branch_id =IN  (?) AND case_schedules.invoice_status = 'Raised';`



        const invoice_results = await new Promise((resolve, reject) => {
            db.query(query, [from_date, to_date, filter_branches], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        //console.log(results);

        const get_today_invoice_id_query =
            "select distinct id from case_invoices where invoice_date between ? and ? and branch_id in (?)";
        const today_invoice_ids = await new Promise((resolve, reject) => {
            db.query(
                get_today_invoice_id_query,
                [from_date, to_date, filter_branches],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // console.log(today_invoice_ids);

        const all_total_invoice_ids = today_invoice_ids.map((tt) => tt.id);

        if (Array.isArray(all_total_invoice_ids) && all_total_invoice_ids.length) {
            output = true;
        } else {
            output = false;
        }

        // console.log(output);
        //const receipt_query=`SELECT sum(case_receipts.receipt_amount) as total_receipt_amount FROM case_receipts WHERE case_receipts.receipt_date >= ? AND case_receipts.receipt_date <= ? and case_receipts.receipt_type='Payment Received' and case_receipts.branch_id in (?)`;

        const result_json = {};

        if (output == true) {
            const receipt_query = `select  COALESCE(SUM(receipt_amount), 0) as total_receipt_amount from case_receipts where date(created_at) between ? and ? and branch_id in (?) and item_id in (?)`;
            const receipt_results = await new Promise((resolve, reject) => {
                db.query(
                    receipt_query,
                    [from_date, to_date, filter_branches, all_total_invoice_ids],
                    (err, results) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(results);
                        }
                    }
                );
            });
            result_json["Invoice_Sum"] = invoice_results[0].total_invoice_amount;
            result_json["Receipt_Sum"] = receipt_results[0].total_receipt_amount;
        } else {
            result_json["Invoice_Sum"] = 0;
            result_json["Receipt_Sum"] = 0;
        }

        const get_completed_schedules_query =
            // "SELECT sum(case_schedules.amount) as total_completed_schedules_amount FROM `case_schedules` join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id where schedule_date>=? and schedule_date<=? and case_schedules.branch_id in (?) and case_schedules.membership_type='Daily' and case_schedules.status='Completed' and bill_type='Countable' and chargeable=1 and case_schedules.id not in (select distinct case_invoice_items.item_id from case_invoice_items where date(case_invoice_items.created_at)>=? and date(case_invoice_items.created_at)<=?)";
            "SELECT sum(case_schedules.amount) AS total_completed_schedules_amount,case_schedules.schedule_date,patients.patient_id,patients.id,concat(patients.first_name,patients.last_name) as full_name,master_services.service_name,case_schedules.schedule_date,case_schedules.amount, case_schedules.membership_type, case_schedules.status,case_schedules.invoice_status FROM `case_schedules` join patients on case_schedules.patient_id=patients.id join master_services on case_schedules.service_required=master_services.id and date(case_schedules.schedule_date)>= ?and date(case_schedules.schedule_date)<=? and case_schedules.branch_id IN (?) and case_schedules.status = 'Completed'  and bill_type='Countable'  and chargeable=1;;";
        const get_completed_schedules = await new Promise((resolve, reject) => {
            db.query(
                get_completed_schedules_query,
                [from_date, to_date, filter_branches],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        const pending_schedules_query =
            "SELECT sum(case_schedules.amount) AS total_pending_schedules_amount,case_schedules.schedule_date,patients.patient_id,patients.id,concat(patients.first_name,patients.last_name) as full_name,master_services.service_name,case_schedules.schedule_date,case_schedules.amount, case_schedules.membership_type, case_schedules.status,case_schedules.invoice_status FROM `case_schedules` join patients on case_schedules.patient_id=patients.id join master_services on case_schedules.service_required=master_services.id and date(case_schedules.schedule_date)>= ?and date(case_schedules.schedule_date)<=? and case_schedules.branch_id IN (?) and case_schedules.status = 'Pending'  and bill_type='Countable'  and chargeable=1;";
        // "SELECT sum(case_schedules.amount) as total_pending_schedules_amount FROM `case_schedules` join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id where schedule_date>=? and schedule_date<=? and case_schedules.branch_id in (?) and case_schedules.membership_type='Daily' and case_schedules.status='Pending' and bill_type='Countable'  and chargeable=1 and case_schedules.id not in (select distinct case_invoice_items.item_id from case_invoice_items where date(case_invoice_items.created_at)>=? and date(case_invoice_items.created_at)<=?)";

        const get_pending_schedules = await new Promise((resolve, reject) => {
            db.query(
                pending_schedules_query,
                [from_date, to_date, filter_branches],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        const unapprovedFundsQuery = `
    SELECT
    COALESCE(
        (SELECT SUM(case_receipts.receipt_amount)
         FROM case_receipts
         WHERE case_receipts.receipt_date >= ? AND case_receipts.receipt_date <= ?
         AND case_receipts.branch_id IN (?)
         AND case_receipts.status = 'Not_Acknowledged'), 0) AS unallocated_fund`;

        // console.log("check", req.query);

        const get_unapproved_funds = await new Promise((resolve, reject) => {
            // console.log(
            //   "parametercheck",
            //   unapprovedFundsQuery,
            //   from_date,
            //   to_date,
            //   branch_id
            // );
            db.query(
                unapprovedFundsQuery,
                [from_date, to_date, filter_branches, filter_branches],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        // console.log("unapprovedFundsresults", results);
                        resolve(results);
                    }
                }
            );
        });

        const b2b_query = `SELECT
    master_business_to_business_category.category_name,
    COALESCE(case_schedules.schedule_date, '2023-01-01') AS schedule_date,
    patients.first_name,
    COALESCE(case_schedules.amount, 0) AS amount,
    COALESCE(master_branches.branch_name, 'Unknown') AS branch_name
FROM leads
JOIN master_business_to_business_category ON leads.business_category = master_business_to_business_category.id
JOIN master_business_to_business_subcategories ON leads.business_category = master_business_to_business_subcategories.id
JOIN patients ON leads.patient_id = patients.id
LEFT JOIN case_schedules ON leads.id = case_schedules.lead_id
LEFT JOIN master_branches ON leads.branch_id = master_branches.id
WHERE 
    (case_schedules.schedule_date BETWEEN ? AND ? OR case_schedules.schedule_date IS NULL) AND
    (case_schedules.branch_id IN (?) OR case_schedules.branch_id IS NULL)
GROUP BY master_business_to_business_category.category_name;
`;

        const get_b2b_funds = await new Promise((resolve, reject) => {
            db.query(
                b2b_query,
                [from_date, to_date, filter_branches],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        result_json["Completed_Schedule_Sum"] =
            get_completed_schedules[0].total_completed_schedules_amount;
        result_json["Estimated_Sum"] =
            result_json["Invoice_Sum"] + result_json["Completed_Schedule_Sum"];
        result_json["Pending_Schedules_Sum"] =
            get_pending_schedules[0].total_pending_schedules_amount;
        result_json["Unapproved_Funds"] = get_unapproved_funds[0].unallocated_fund;
        // result_json["Inhouse_Funds"] = get_b2b_funds[0].totalsum;
        result_json["b2b_funds"] = get_b2b_funds[0].amount;


        // result_json['Unapproved_Funds'] = unapprovedFundstest()
        // console.log("value", get_b2b_funds);
        // console.log("amount", get_b2b_funds[0].totalsum);

        res.status(200).json({ success: true, data: result_json });

        // console.table(result_json['Unapproved_Funds']);
        // console.table(result_json);

        //console.log("Total Amount Sum: $" + totalAmountSum.toFixed(2)); // Rounded to 2 decimal places
    } catch (error) {
        res.status(200).json({ success: false, data: error });
    }
};

const getalldayinvoice = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !(branch_id == undefined)
            ? all_branches
            : branch_id;

        const query = `
        SELECT case_invoices.invoice_date as label,sum(case_invoices.total_amount) as y
        FROM case_invoices 
        WHERE case_invoices.invoice_date >= ? AND case_invoices.invoice_date <= ? and status!='Cancelled'
       and case_invoices.branch_id in (?) group by case_invoices.invoice_date;`;

        const invoice_results = await new Promise((resolve, reject) => {
            db.query(query, [from_date, to_date, filter_branches], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        // console.log("Daily Results:");
        // console.log(invoice_results);

        invoice_results.forEach(function (obj) {
            //const timestamp = "2023-09-12T18:30:00.000Z";
            const dateObject = new Date(obj.label);

            // Extract year, month, and day components
            const year = dateObject.getUTCFullYear() % 100; // Get the last two digits of the year
            const month = (dateObject.getUTCMonth() + 1).toString().padStart(2, "0"); // Months are zero-based, so add 1
            const day = dateObject.getUTCDate().toString().padStart(2, "0");

            // Create the formatted date string
            const formattedDate = `${day}-${month}-${year}`;

            // console.log(formattedDate); // Output: "12-09-23"
            obj.label = formattedDate;

            //console.log(obj.label);
        });

        //console.log(results);

        res.status(200).json({ success: true, data: invoice_results });

        //console.log("Total Amount Sum: $" + totalAmountSum.toFixed(2)); // Rounded to 2 decimal places
    } catch (error) { }
};
const getInvoices = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }
        // console.log("branchesssss:-" + branch_id);
        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !branch_id ? all_branches : branch_id;
        // console.log("branchess..:;" + filter_branches);
        const query1 = `
        SELECT case_invoices.id,master_branches.branch_name,patients.patient_id,patients.first_name,case_invoices.invoice_no,date_format(case_invoices.invoice_date,'%Y-%m-%d') as dates,case_invoices.total_amount,case_invoices.amount_paid,case_invoices.status 
        FROM case_invoices 
        join patients on case_invoices.patient_id=patients.id
        join master_branches on case_invoices.branch_id=master_branches.id
        WHERE case_invoices.invoice_date >= ? AND case_invoices.invoice_date <= ? and case_invoices.status!='Cancelled'
       and case_invoices.branch_id IN (?)`;
        //const branches=!(req.query.branch_id)?req.query.branch_id:[;
        const results = await new Promise((resolve, reject) => {
            // console.log(query1);
            // console.log(from_date, to_date, filter_branches);
            db.query(
                query1,
                [from_date, to_date, filter_branches],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // console.log(results);

        const totalAmountSum = results.reduce(
            (sum, invoice) => sum + invoice.total_amount,
            0
        );

        // console.log("Total Amount Sum: $" + totalAmountSum.toFixed(2)); // Rounded to 2 decimal places

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.log(error);
    }
};

const getInvoicesPieChart = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;
        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }
        // console.log("branchesssss:-" + branch_id);
        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);
        const filter_branches = !branch_id ? all_branches : branch_id;
        // console.log("branchess..:;" + filter_branches);
        const query2 = `SELECT
  branch_sums.branch_name,
  branch_sums.total_amount_sum,
  @row_number := @row_number + 1 AS branch_index
FROM (
  SELECT
      mb.branch_name,
      SUM(ci.total_amount) AS total_amount_sum
  FROM
      case_invoices ci
  JOIN
      master_branches mb
      ON ci.branch_id = mb.id
  WHERE
      ci.invoice_date BETWEEN ? AND ? AND
      ci.status != 'Cancelled' AND
      ci.branch_id IN (?)
  GROUP BY
      mb.branch_name
) AS branch_sums
CROSS JOIN (SELECT @row_number := 0) AS init
ORDER BY
  branch_sums.branch_name`;

        const query1 = `SELECT mb.id, mb.branch_name ,SUM(ci.total_amount) AS total_amount_sum FROM case_invoices ci JOIN master_branches mb ON ci.branch_id = mb.id WHERE ci.invoice_date BETWEEN ? AND ? AND ci.status != 'Cancelled' AND ci.branch_id IN (?) GROUP BY mb.branch_name order by mb.id`;

        const results = await new Promise((resolve, reject) => {
            // console.log(query1);
            // console.log(from_date, to_date, filter_branches);
            db.query(
                query1,
                [from_date, to_date, filter_branches],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // console.log(results);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.log(error);
    }
};

const getschedulerevenue = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id, category_required } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const default_categories = await new Promise((resolve, reject) => {
            db.query(
                "select distinct category_id from master_services",
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        all_branches = default_branches.map((tt) => tt.id);
        all_categories = default_categories.map((tt) => tt.category_id);
        const filter_branches = !branch_id ? all_branches : branch_id;
        const filter_categories = !category_required
            ? all_categories
            : category_required;
        //const query = `SELECT master_branches.branch_name,patient_id,sum(amount) as total_amount,service_required FROM case_schedules join master_branches on case_schedules.branch_id=master_branches.id where schedule_date BETWEEN (?) and (?) and case_schedules.id in (SELECT item_id FROM case_invoice_items) and case_schedules.branch_id in (?) group by service_required,patient_id `;
        //const branches=!(req.query.branch_id)?req.query.branch_id:[;
        // console.log(filter_categories);
        const query = `select concat(patients.first_name,"",patients.last_name) as full_name,master_branches.branch_name,patients.gender,patients.contact_number,master_service_category.category_name,master_services.service_name,case_schedules.schedule_date,case_schedules.amount from case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id join master_service_category on master_services.category_id=master_service_category.id where case_schedules.schedule_date BETWEEN ? and ? and case_schedules.status='Completed' and case_schedules.branch_id in (?) and master_services.category_id in (?)`;
        const results = await new Promise((resolve, reject) => {
            db.query(
                query,
                [from_date, to_date, filter_branches, filter_categories],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // console.log(results);

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.log(error);
    }
};

const getschedulecategoryrevenue = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id, category_required } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const default_categories = await new Promise((resolve, reject) => {
            db.query(
                "select distinct category_id from master_services",
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        all_branches = default_branches.map((tt) => tt.id);
        all_categories = default_categories.map((tt) => tt.category_id);
        const filter_branches = !branch_id ? all_branches : branch_id;
        // console.log(all_categories);
        const filter_categories = !category_required
            ? all_categories
            : category_required;
        //const query = `SELECT master_branches.branch_name,patient_id,sum(amount) as total_amount,service_required FROM case_schedules join master_branches on case_schedules.branch_id=master_branches.id where schedule_date BETWEEN (?) and (?) and case_schedules.id in (SELECT item_id FROM case_invoice_items) and case_schedules.branch_id in (?) group by service_required,patient_id `;
        //const branches=!(req.query.branch_id)?req.query.branch_id:[;
        // console.log(filter_categories);
        //const query=`SELECT master_branches.branch_name ,master_service_category.category_name,count(case_schedules.service_required) as service_required,sum(case_schedules.amount) as amount FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id  join master_service_category on master_services.category_id=master_service_category.id where case_schedules.schedule_date BETWEEN ? and ? and case_schedules.status='Completed' and case_schedules.branch_id in (?) and master_services.category_id in (?) group by master_services.category_id`;

        const query = `SELECT master_service_category.category_name as label,sum(case_schedules.amount) as y FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id  join master_service_category on master_services.category_id=master_service_category.id where case_schedules.schedule_date BETWEEN ? and ? and case_schedules.status='Completed' and case_schedules.branch_id in (?) and master_services.category_id in (?) group by master_services.category_id`;
        const results = await new Promise((resolve, reject) => {
            db.query(
                query,
                [from_date, to_date, filter_branches, filter_categories],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // console.log(results);

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.log(error);
    }
};

const getschedulesubcategoryrevenue = async (req, res, next) => {
    // <<<<<<< HEAD
    // try {
    //   const { from_date, to_date, branch_id, category_required } = req.query;

    //   if (!from_date || !to_date) {
    //     return res
    //       .status(400)
    //       .json({ error: "Please provide both start and end dates" });
    //   }

    //   const default_branches = await new Promise((resolve, reject) => {
    // =======

    try {
        const { from_date, to_date, branch_id, category_required } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            // >>>>>>> cb23a2f983cdb7db0e072814b1ce192b71203035
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        // all_branches = default_branches.map((tt) => tt.id);

        //Some Category will be selected default so no need of delfault category

        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !branch_id ? all_branches : branch_id;

        const query = `SELECT master_services.service_name as label,sum(case_schedules.amount) as y FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id  join master_service_category on master_services.category_id=master_service_category.id where case_schedules.schedule_date BETWEEN ? and ? and case_schedules.status='Completed' and case_schedules.branch_id in (?) and master_services.category_id in (?) group by master_services.id`;
        const results = await new Promise((resolve, reject) => {
            db.query(
                query,
                [from_date, to_date, filter_branches, category_required],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // console.log(results);

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.log(error);
    }
};

// =======

//     });
//     all_branches = default_branches.map(tt => tt.id);

//   //Some Category will be selected default so no need of delfault category

//     all_branches = default_branches.map(tt => tt.id);

//     const filter_branches = !(branch_id) ? all_branches : branch_id;

//     const query=`SELECT master_services.service_name as label,sum(case_schedules.amount) as y FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id  join master_service_category on master_services.category_id=master_service_category.id where case_schedules.schedule_date BETWEEN ? and ? and case_schedules.status='Completed' and case_schedules.branch_id in (?) and master_services.category_id in (?) group by master_services.id`;
//     const results = await new Promise((resolve, reject) => {
//       db.query(query, [from_date, to_date, filter_branches, category_required], (err, results) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(results);
//         }
//       });
//     });
//     console.log(results);

//     res.status(200).json({ success: true, data: results });

//   } catch (error) {
//     console.log(error);
//   }
// }

const getschedulesummary = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id, category_required } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const default_categories = await new Promise((resolve, reject) => {
            db.query(
                "select distinct category_id from master_services",
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        all_branches = default_branches.map((tt) => tt.id);
        all_categories = default_categories.map((tt) => tt.category_id);
        const filter_branches = !branch_id ? all_branches : branch_id;
        const filter_categories = !category_required
            ? all_categories
            : category_required;
        //const query = `SELECT master_branches.branch_name,patient_id,sum(amount) as total_amount,service_required FROM case_schedules join master_branches on case_schedules.branch_id=master_branches.id where schedule_date BETWEEN (?) and (?) and case_schedules.id in (SELECT item_id FROM case_invoice_items) and case_schedules.branch_id in (?) group by service_required,patient_id `;
        //const branches=!(req.query.branch_id)?req.query.branch_id:[;
        // console.log(filter_categories);
        const query = `select case_schedules.amount,case_schedules.status as status from case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id where case_schedules.schedule_date BETWEEN ? and ? and case_schedules.status in ('Completed','Pending') and case_schedules.branch_id in (?) and  master_services.category_id in (?);`;
        const results = await new Promise((resolve, reject) => {
            db.query(
                query,
                [from_date, to_date, filter_branches, filter_categories],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // console.log(results);
        var pending = 0;
        var completed = 0;
        results.map((data) => {
            if (data.status == "Pending") {
                pending = pending + data.amount;
            }
            if (data.status == "Completed") {
                completed = completed + data.amount;
            }
        });
        var remaining = pending - completed;
        var result = pending + " " + completed + " " + remaining;
        var summary = {};
        summary["Completed_Schedules"] = completed;
        summary["Pending_Schedules"] = pending;
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.log(error);
    }
};
const getreceipts = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !(branch_id == undefined)
            ? all_branches
            : branch_id;
        // console.log(from_date + " " + to_date + " " + filter_branches);
        const query =
            "select distinct id from case_invoices where invoice_date between ? and ? and branch_id in (?) and status!='Cancelled'";
        const today_invoice_ids = await new Promise((resolve, reject) => {
            db.query(query, [from_date, to_date, filter_branches], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        //console.log(today_invoice_ids);
        //  const receipts_query="select case_invoices.id,case_invoices.patient_id,sum(case_receipts.receipt_amount) from case_receipts join case_invoices on case_invoices.id=case_receipts.item_id where case_invoices.invoice_date between ? and ? and case_invoices.branch_id=? group by case_receipts.item_id";
        //  const gettodayreceiptsforinvoices=await new Promise((resolve,reject)=>{
        //   db.query(receipts_query,[from_date,to_date,branch_id],(err,results)=>{

        //     if(err)
        //     {
        //       reject(err);
        //     }else{
        //       resolve(results);
        //     }

        //   });
        // });
        const all_today_invoice_ids = today_invoice_ids.map((tt) => tt.id);
        //const receipts_created_query="select * from case_invoices join case_receipts on case_invoices.id=case_receipts.item_id where case_receipts.item_id in (?) and case_invoices.invoice_date >=? and case_invoices.invoice_date<=? and case_invoices.branch_id in (?)"
        const receipts_created_query =
            `SELECT
            master_branches.branch_name,
            patients.patient_id,
            patients.first_name,
            case_invoices.invoice_no,
            DATE_FORMAT(case_invoices.invoice_date, '%Y-%m-%d') AS dates,
            ROUND(case_invoices.total_amount * 0.09) AS gst_amount,
            ROUND(case_invoices.total_amount * 0.09) AS cgst_amount,
            case_invoices.total_amount,
            case_invoices.amount_paid,
            case_invoices.status
          FROM
            case_invoices
          JOIN
            master_branches ON case_invoices.branch_id = master_branches.id
          JOIN
            patients ON case_invoices.patient_id = patients.id
          WHERE
            case_invoices.id IN (
              SELECT DISTINCT item_id
              FROM case_receipts
              WHERE
                DATE(created_at) BETWEEN ? AND ?
                AND branch_id IN (?)
                AND item_id IN (?)
            )
            AND case_invoices.status != 'Cancelled';
          `;
        const today_receipts_created = await new Promise((resolve, reject) => {
            db.query(
                receipts_created_query,
                [from_date, to_date, filter_branches, all_today_invoice_ids],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        console.table(today_receipts_created);

        res.status(200).json({ success: true, data: today_receipts_created });
    } catch (error) {
        console.log(error);
    }
};

const getpendingreceipts = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !(branch_id == undefined)
            ? all_branches
            : branch_id;
        // console.log(from_date + " " + to_date + " " + filter_branches);
        const query =
            "select distinct id from case_invoices where invoice_date between ? and ? and branch_id in (?)";
        const today_invoice_ids = await new Promise((resolve, reject) => {
            db.query(query, [from_date, to_date, filter_branches], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        const all_today_invoice_ids = today_invoice_ids.map((tt) => tt.id);
        //const receipts_created_query="select * from case_invoices join case_receipts on case_invoices.id=case_receipts.item_id where case_receipts.item_id in (?) and case_invoices.invoice_date >=? and case_invoices.invoice_date<=? and case_invoices.branch_id in (?)"
        const receipts_created_query =
            "select master_branches.branch_name,patients.patient_id,patients.first_name,case_invoices.invoice_no,date_format(case_invoices.invoice_date,'%Y-%m-%d') as dates,case_invoices.total_amount,case_invoices.amount_paid,case_invoices.status from case_invoices join master_branches on case_invoices.branch_id=master_branches.id join patients on case_invoices.patient_id=patients.id where case_invoices.id  not in (select distinct item_id  from case_receipts where date(created_at) between ? and ? and branch_id in (?) and item_id  in (?)) and case_invoices.invoice_date BETWEEN ? and ? and case_invoices.status!='Cancelled'";
        const today_receipts_created = await new Promise((resolve, reject) => {
            db.query(
                receipts_created_query,
                [
                    from_date,
                    to_date,
                    filter_branches,
                    all_today_invoice_ids,
                    from_date,
                    to_date,
                ],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // console.log(today_receipts_created);

        res.status(200).json({ success: true, data: today_receipts_created });
    } catch (error) {
        console.log(error);
    }
};

const getcompletedschedules = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;
        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !branch_id ? all_branches : branch_id;

        const filter = from_date + " " + to_date + " " + filter_branches;

        const data_query =
            "SELECT patients.first_name,master_branches.branch_name,master_services.service_name,date_format(case_schedules.schedule_date,'%Y-%m-%d') as schedule_date,case_schedules.membership_type,case_schedules.assigned_tasks,case_schedules.amount,case_schedules.status FROM `case_schedules` join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id where schedule_date>=? and schedule_date<=? and case_schedules.branch_id in (?) and case_schedules.membership_type='Daily' and case_schedules.status='Completed' and bill_type='Countable'  and chargeable=1 and case_schedules.id not in (select distinct case_invoice_items.item_id from case_invoice_items where date(case_invoice_items.created_at)>=? and date(case_invoice_items.created_at)<=?)";

        const fetch_data = await new Promise((resolve, reject) => {
            db.query(
                data_query,
                [from_date, to_date, filter_branches, from_date, to_date],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        return res.status(200).json({ success: fetch_data });
    } catch (error) {
        return res
            .status(400)
            .json({ error: "Error in fetching completed schedules" });
    }
};

const getpendingschedules = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;
        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !branch_id ? all_branches : branch_id;

        const filter = from_date + " " + to_date + " " + filter_branches;

        const data_query =
            "SELECT patients.first_name,master_branches.branch_name,master_services.service_name,date_format(case_schedules.schedule_date,'%Y-%m-%d') as schedule_date,case_schedules.membership_type,case_schedules.assigned_tasks,case_schedules.amount,case_schedules.status FROM `case_schedules` join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id where schedule_date>=? and schedule_date<=? and case_schedules.branch_id in (?) and case_schedules.membership_type='Daily' and case_schedules.status='Pending' and bill_type='Countable'  and chargeable=1 and case_schedules.id not in (select distinct case_invoice_items.item_id from case_invoice_items where date(case_invoice_items.created_at)>=? and date(case_invoice_items.created_at)<=?)";

        const pending_schedules = await new Promise((resolve, reject) => {
            db.query(
                data_query,
                [from_date, to_date, filter_branches, from_date, to_date],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        return res.status(200).json({ success: pending_schedules });
    } catch (error) {
        return res
            .status(400)
            .json({ error: "Error in fetching completed schedules" });
    }
};

const getInvoiceSplitUp = async (req, res, next) => {
    try {
        //  const {invoice_no}=req.query;
        const { invoice_id } = req.query;

        //  const invoice_id_result=await new Promise((resolve,reject)=>{

        //         db.query("select distinct id from case_invoices where invoice_no=?",[invoice_no],(err,result)=>{
        //            if(err)
        //            {
        //             reject(err);
        //            }else{
        //             resolve(result);
        //            }
        //         })
        //  });
        //console.log(invoice_id_result[0].id);
        //const invoice_id=invoice_id_result[0].id;
        const query =
            "select master_branches.branch_name,case_schedules.schedule_date,master_services.service_name,case_schedules.amount from case_schedules join case_invoice_items on case_invoice_items.item_id=case_schedules.id join master_services on case_schedules.service_required=master_services.id join master_branches on case_schedules.branch_id=master_branches.id where case_invoice_items.invoice_id=?";
        const results = await new Promise((resolve, reject) => {
            db.query(query, [invoice_id], (err, query_result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(query_result);
                }
            });
        });

        res.status(200).json({ success: results });
    } catch (error) {
        console.log(error);
    }
};

const getServiceInvoiceSplitup = async (req, res, next) => {
    try {
        //  const {invoice_no}=req.query;
        const { from_date, to_date, branch_id, service_name } = req.query;
        //console.log(service_name);
        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !(branch_id == undefined)
            ? all_branches
            : branch_id;

        console.log(
            from_date + " " + to_date + " " + branch_id + " " + service_name
        );

        const service_id = await new Promise((resolve, reject) => {
            db.query(
                "select id from master_services where service_name=?",
                [service_name],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        // console.log(service_id[0].id);

        query =
            "SELECT master_branches.branch_name as branch_name,patients.patient_id as patient_id,patients.first_name as patient_name,master_services.service_name as service_name,case_invoices.invoice_no as invoice_no,case_schedules.schedule_date as service_date,case_schedules.amount as amount FROM `case_invoices` join case_invoice_items on case_invoice_items.invoice_id=case_invoices.id join case_schedules on case_invoice_items.item_id=case_schedules.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id join master_services on case_schedules.service_required=master_services.id where invoice_date BETWEEN ? and ? and case_invoices.branch_id in (?) and case_schedules.service_required=?";
        const result = await new Promise((resolve, reject) => {
            db.query(
                query,
                [from_date, to_date, filter_branches, service_id[0].id],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.log(error);
    }
};
const getServiceInvoice = async (req, res) => {
    const { from_date, to_date, branch_id } = req.query;

    if (!from_date || !to_date) {
        return res
            .status(400)
            .json({ error: "Please provide both start and end dates" });
    }

    const default_branches = await new Promise((resolve, reject) => {
        db.query("select distinct id from master_branches", (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
    all_branches = default_branches.map((tt) => tt.id);

    const filter_branches = !(branch_id == undefined) ? all_branches : branch_id;

    const query = `
     select master_services.service_name as label, sum(case_schedules.amount) as y 
     from case_schedules join master_services on case_schedules.service_required=master_services.id 
     where case_schedules.id in (SELECT item_id FROM case_invoice_items WHERE invoice_id in (select id from case_invoices where invoice_date>=? and invoice_date<=? and case_invoices.branch_id in (?) and status!='Cancelled') and status!='Cancelled') group by case_schedules.service_required`;

    //const branches=!(req.query.branch_id)?req.query.branch_id:[;
    const results = await new Promise((resolve, reject) => {
        db.query(query, [from_date, to_date, filter_branches], (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
    // console.log(results);
    res.status(200).json({ success: true, data: results });
};

const ActiveClients = async (req, res) => {
    try {
        const countQuery =
            "select master_branches.branch_name,master_services.id,patients.patient_id,concat(patients.first_name,' ',patients.last_name) as full_name,case_schedules.membership_type,patients.contact_number,case_schedules.schedule_date,master_services.service_name,case_schedules.status,case_schedules.created_at from case_schedules join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id join master_services on case_schedules.service_required=master_services.id where schedule_date>=? and schedule_date<=? and case_schedules.status=?  and case_schedules.service_required IN (?) and case_schedules.membership_type is not null and master_branches.id IN (?) ORDER BY `case_schedules`.`created_at` DESC";
        // const countResult = await db.query(countQuery,(error,result)=>{
        //   return res.status(200).json({success:result});
        // });
        const { filters, sort, page, pageSize, fields } = req.query;

        // console.log(req.body);
        const currentPage = parseInt(page) || 1;
        const itemsPerPage = parseInt(pageSize) || 100; // You can adjust the batch size as needed

        const offset = (currentPage - 1) * itemsPerPage;

        from_date = req.body.from_date;
        to_date = req.body.to_date;
        status = req.body.status;
        service_required = req.body.service_required;
        branch_id = req.body.branch_id;

        var today = new Date();
        var dd = String(today.getDate()).padStart(2, "0");
        var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
        var yyyy = today.getFullYear();
        today = yyyy + "-" + mm + "-" + dd;
        if (from_date == "" && to_date == "") {
            from_date = today;
            to_date = today;
            // console.log('sd');
        }
        if (branch_id == "") {
            branches = "select distinct id from master_branches";
            const exists = await new Promise((resolve, reject) => {
                db.query(branches, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                });
            });
            var branch_id = [];
            exists.forEach((v) => branch_id.push(v.id));
            //console.log(branches);
        }
        if (service_required == "") {
            service_required_query = "select distinct id from master_services";

            const services = await new Promise((resolve, reject) => {
                db.query(service_required_query, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            var service_required = [];
            services.forEach((v) => service_required.push(v.id));
            // console.log(service_required);
        }
        const countResult = await db.query(
            countQuery,
            [from_date, to_date, status, service_required, branch_id],
            (err, result) => {
                // Fetch the actual data in batches asynchronously
                // console.log(result);
                return res.status(200).json(result);
            }
        );
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error });
    }
};

const getServiceCategoryPieChart = async (req, res, next) => {
    // console.log(req.params);

    try {
        const { from_date, to_date, branch_id, service_category } = req.query;
        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }
        // console.log("branchesssss:-" + branch_id);
        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);
        const filter_branches = !branch_id ? all_branches : branch_id;
        // console.log("filter_branches:-" + filter_branches);
        // console.log("branchess..:;" + filter_branches);
        const query2 = `SELECT master_branches.branch_name, SUM(case_schedules.amount) AS total_amount_sum FROM case_schedules JOIN master_services ON case_schedules.service_required = master_services.id JOIN patients ON case_schedules.patient_id = patients.id JOIN master_branches ON case_schedules.branch_id = master_branches.id JOIN master_service_category ON master_services.category_id = master_service_category.id WHERE case_schedules.schedule_date BETWEEN ? AND ? AND case_schedules.status = 'Completed' AND case_schedules.branch_id IN (?) AND master_services.category_id = ? GROUP BY master_branches.branch_name;`;

        //const query1 = `SELECT mb.id, mb.branch_name ,SUM(ci.total_amount) AS total_amount_sum FROM case_invoices ci JOIN master_branches mb ON ci.branch_id = mb.id WHERE ci.invoice_date BETWEEN ? AND ? AND ci.status != 'Cancelled' AND ci.branch_id IN (?) GROUP BY mb.branch_name order by mb.id`;

        const results = await new Promise((resolve, reject) => {
            // console.log(query2);
            // console.log(from_date, to_date, filter_branches);
            // console.log("Query Parameters:", [
            //   from_date,
            //   to_date,
            //   filter_branches,
            //   service_category,
            // ]);

            db.query(
                query2,
                [from_date, to_date, filter_branches, service_category],
                (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // console.log("Executing SQL query:", query2);

        // console.log(results);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.log(error);
    }
};

const getUnapprovedFunds = async (req, res, next) => {
    try {
        const { from_date, to_date, branch_id } = req.query;

        if (!from_date || !to_date) {
            return res
                .status(400)
                .json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("select distinct id from master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
        all_branches = default_branches.map((tt) => tt.id);

        const filter_branches = !(branch_id == undefined)
            ? all_branches
            : branch_id;

        const query = `
      SELECT 
        master_branches.branch_name,
        patients.first_name,
        patients.patient_id,
        receipt_type,
        payment_mode,
        reference_no,
        receipt_no,
        receipt_date,
        receipt_amount
      FROM case_receipts
      JOIN master_branches ON master_branches.id = case_receipts.branch_id
      JOIN patients ON patients.id = case_receipts.id
      WHERE
        case_receipts.receipt_date BETWEEN ? AND ?
        AND case_receipts.branch_id IN (?)
        AND case_receipts.status = 'Not_Acknowledged'
    `;

        const results = await new Promise((resolve, reject) => {
            db.query(query, [from_date, to_date, filter_branches], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
};


const getb2bfunds = async (req, res) => {
    try {
        const { from_date, to_date, branch_id } = req.query;
        console.log(from_date, to_date, branch_id);

        if (!from_date || !to_date) {
            return res.status(400).json({ error: "Please provide both start and end dates" });
        }

        const default_branches = await new Promise((resolve, reject) => {
            db.query("SELECT DISTINCT id FROM master_branches", (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results.map(tt => tt.id));
                }
            });
        });

        const filter_branches = branch_id ?? default_branches;

        const data_query = `
      SELECT
        patients.first_name,
        COALESCE(master_branches.branch_name, 'Unknown') AS branch_name,
        master_business_to_business_category.category_name,
        master_service_category.category_name AS servicerequested,
        DATE_FORMAT(case_schedules.schedule_date, '%Y-%m-%d') AS schedule_date,
        case_schedules.assigned_tasks,
        case_schedules.membership_type,
        case_schedules.patient_id,
        COALESCE(case_schedules.amount, 0) AS amount
      FROM leads
        JOIN master_business_to_business_category ON leads.business_category = master_business_to_business_category.id
        JOIN master_business_to_business_subcategories ON leads.business_category = master_business_to_business_subcategories.id
        JOIN patients ON leads.patient_id = patients.id
        LEFT JOIN case_schedules ON leads.id = case_schedules.lead_id
        LEFT JOIN master_branches ON leads.branch_id = master_branches.id
        LEFT JOIN master_services ON leads.service_required = master_services.category_id
        LEFT JOIN master_service_category ON leads.service_required = master_service_category.id
      WHERE
        (case_schedules.schedule_date BETWEEN ? AND ? OR case_schedules.schedule_date IS NULL) AND
        (case_schedules.branch_id IN (?) OR case_schedules.branch_id IS NULL)
      GROUP BY master_business_to_business_category.category_name;`;

        const fetch_data = await new Promise((resolve, reject) => {
            db.query(data_query, [from_date, to_date, filter_branches], (err, results) => {
                if (err) {
                    console.error("Error in database query:", err);
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });

        // Move the response outside of the promise resolution block
        // console.log('check1', fetch_data);
        return res.status(200).json({ success: true, data: fetch_data });

    } catch (error) {
        console.error("Error in route handler:", error);
        return res.status(400).json({ error: "Error in fetching completed schedules" });
    }
};





















module.exports = {
    Reports,
    ActiveClients,
    getInvoices,
    getInvoiceSplitUp,
    getServiceInvoice,
    getSummary,
    getalldayinvoice,
    getServiceInvoiceSplitup,
    getreceipts,
    getpendingreceipts,
    getcompletedschedules,
    getpendingschedules,
    getschedulerevenue,
    getschedulecategoryrevenue,
    getschedulesubcategoryrevenue,
    getschedulesummary,
    getInvoicesPieChart,
    getServiceCategoryPieChart,
    getUnapprovedFunds,
    getb2bfunds
};
