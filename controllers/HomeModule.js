var db = require("../db/connection.js").mysql_pool;

const Branches = async (req, res) => {
  const default_branches = await new Promise((resolve, reject) => {
    db.query(
      "select distinct id,branch_name from master_branches",
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
  return res.status(200).json({ success: true, data: default_branches });
};

const Services = async (req, res) => {
  const default_services = await new Promise((resolve, reject) => {
    db.query(
      "select distinct id,service_name from master_services",
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
  return res.status(200).json({ success: true, data: default_services });
};

const Caregivers = async (req, res) => {
  const default_caregivers = await new Promise((resolve, reject) => {
    db.query(
      "select distinct id,concat(employee_id,' - ',first_name,middle_name,last_name) as full_name from caregivers",
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
  return res.status(200).json({ success: true, data: default_caregivers });
};

const Patients = async (req, res) => {
  const default_services = await new Promise((resolve, reject) => {
    db.query(
      "select distinct id,concat(first_name,' ',last_name) as full_name from patients ",
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
  return res.status(200).json({ success: true, data: default_services });
};

const Home = async (req, res) => {
  const query =
    "set @count=0;SELECT (@count:=@count+1) AS sno,case_schedules.lead_id as lead_id,master_branches.branch_name,concat(patients.first_name,' ',patients.last_name) as full_name,master_services.service_name,date_format(case_schedules.schedule_date,'%Y-%m-%d') as schedule_date,caregivers.first_name,concat(caregivers.middle_name,caregivers.last_name) as caregiver_name,case_schedules.case_status FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id join caregivers on case_schedules.caregiver_id=caregivers.id where schedule_date=CURRENT_DATE";

  const ans = await new Promise((resolve, reject) => {
    db.query(query, (error, result) => {
      if (error) {
        console.error(error);
        reject(error);
      } else {
        resolve(result[1]);
        //res.status(200).json({success:result[1]});
      }
    });
  });

  return res.status(200).json({ success: true, data: ans });
};

const FilterData = async (req, res) => {
  const { from_date, to_date, service_id, branch_id, case_status, caregiver } =
    req.query;

  if (!from_date || !to_date) {
    return res
      .status(400)
      .json({ error: "Please provide both start and end dates" });
  }

  const query =
    "set @count=0;SELECT (@count:=@count+1) AS sno,case_schedules.lead_id as lead_id,master_branches.branch_name,concat(patients.first_name,' ',patients.last_name) as full_name,master_services.service_name,date_format(case_schedules.schedule_date,'%Y-%m-%d') as schedule_date,caregivers.first_name,concat(caregivers.middle_name,caregivers.last_name) as caregiver_name,case_schedules.case_status FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id join caregivers on case_schedules.caregiver_id=caregivers.id where schedule_date>=? and schedule_date<=? and case_schedules.branch_id in (?) and case_schedules.case_status in (?) and master_services.id in (?) and case_schedules.caregiver_id in (?)";
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
  //console.log(branch_id);
  selected_branch = all_branches.includes(parseInt(branch_id))
    ? branch_id
    : all_branches;
  //console.log(selected_branch);

  const default_services = await new Promise((resolve, reject) => {
    db.query("select distinct id from master_services", (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
  all_services = default_services.map((tt) => tt.id);
  //console.log(branch_id);
  selected_service = all_services.includes(parseInt(service_id))
    ? service_id
    : all_services;
  console.log(selected_service);
  const default_case_status = await new Promise((resolve, reject) => {
    db.query(
      "select distinct case_status from case_schedules",
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });
  //console.log(default_case_status);
  all_case_status = default_case_status.map((tt) => tt.case_status);
  //console.log(all_case_status);
  selected_case_status = all_case_status.includes(case_status)
    ? case_status
    : all_case_status;

  const default_caregivers = await new Promise((resolve, reject) => {
    db.query("select distinct id from caregivers", (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
  //console.log(default_case_status);
  all_caregivers = default_caregivers.map((tt) => tt.id);
  //console.log(all_case_status);
  selected_caregiver = all_caregivers.includes(caregiver)
    ? caregiver
    : all_caregivers;
  console.log(
    "Seleced values:- " +
    from_date +
    " " +
    to_date +
    " " +
    selected_case_status +
    " " +
    selected_branch +
    " " +
    selected_service +
    " " +
    selected_caregiver
  );
  const ans = await new Promise((resolve, reject) => {
    db.query(
      query,
      [
        from_date,
        to_date,
        selected_branch,
        selected_case_status,
        selected_service,
        selected_caregiver,
      ],
      (error, result) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          resolve(result[1]);
          //res.status(200).json({success:result[1]});
        }
      }
    );
  });
  console.log(ans);
  return res.status(200).json({ success: true, data: ans });
};

//console.log(selected_branch);

const StatusColcharts = async (req, res) => {
  const { from_date, to_date, branch_id } = req.query;

  try {
    // Fetch default branches
    const defaultBranches = await new Promise((resolve, reject) => {
      db.query("SELECT distinct id FROM master_branches", (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const allBranches = defaultBranches.map((tt) => tt.id);
    console.log("All branches: " + allBranches);

    // Validate and select the branch
    const selectedBranch = allBranches.includes(parseInt(branch_id))
      ? branch_id
      : allBranches;

    console.log("Selected branch: " + selectedBranch);

    console.log(
      "Date range:",
      from_date,
      "to",
      to_date,
      "for branch ID:",
      selectedBranch
    );

    // SQL query
    const query = `
      SELECT
        master_branches.branch_name,
        case_schedules.case_status,
        COALESCE(COUNT(*), 0) AS status_count
      FROM
        case_schedules
      JOIN
        master_branches ON case_schedules.branch_id = master_branches.id
      WHERE
        schedule_date >= ? AND schedule_date <= ?
        AND case_status IN ('Unknown', 'Accepted', 'Rejected', 'Clocked_In', 'Clocked_Out')   
        AND master_branches.id IN (?)
      GROUP BY
        master_branches.branch_name, case_schedules.case_status;
    `;

    console.log("SQL Query:", query);

    // Execute the SQL query
    const ans = await new Promise((resolve, reject) => {
      db.query(query, [from_date, to_date, selectedBranch], (error, result) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    return res.status(200).json({ success: true, data: ans });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = StatusColcharts;

const PyramidCharts = async (req, res) => {
  const { from_date, to_date, branch_id } = req.query;

  try {
    const defaultBranches = await new Promise((resolve, reject) => {
      db.query("SELECT distinct id FROM master_branches", (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const allBranches = defaultBranches.map((tt) => tt.id);
    console.log("All branches: " + allBranches);

    const selectedBranch = allBranches.includes(parseInt(branch_id))
      ? branch_id
      : allBranches;
    console.log("Selected branch: " + selectedBranch);

    // SQL query
    const query = `
      SELECT
        master_branches.branch_name,
        case_schedules.case_status,
        COALESCE(COUNT(*), 0) AS status_count
      FROM
        case_schedules
      JOIN
        master_branches ON case_schedules.branch_id = master_branches.id
      WHERE
        schedule_date >= ? AND schedule_date <= ?
        AND case_status IN ('Unknown', 'Accepted', 'Rejected', 'Clocked_In', 'Clocked_Out')   
        AND master_branches.id IN (?)
      GROUP BY
       case_schedules.case_status;
    `;

    console.log("SQL Query:", query);

    // Execute the SQL query
    const ans = await new Promise((resolve, reject) => {
      db.query(query, [from_date, to_date, selectedBranch], (error, result) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    return res.status(200).json({ success: true, data: ans });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};

const getHoursCharts = async (req, res) => {
  const { from_date, to_date, branch_id } = req.query;

  try {
    const defaultBranches = await new Promise((resolve, reject) => {
      db.query("SELECT distinct id FROM master_branches", (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const allBranches = defaultBranches.map((tt) => tt.id);
    console.log("All branches: " + allBranches);

    const selectedBranch = allBranches.includes(parseInt(branch_id))
      ? branch_id
      : allBranches;
    console.log("Selected branch: " + selectedBranch);

    const query = `SELECT
    master_branches.branch_name,
    CASE
        WHEN TIMESTAMPDIFF(SECOND, case_clockin_at, case_clockout_at) < 7200 THEN 'less_than_2_hrs'
        WHEN TIMESTAMPDIFF(SECOND, case_clockin_at, case_clockout_at) < 14400 THEN 'less_than_4_hrs'
        WHEN TIMESTAMPDIFF(SECOND, case_clockin_at, case_clockout_at) < 21600 THEN 'less_than_6_hrs'
        WHEN TIMESTAMPDIFF(SECOND, case_clockin_at, case_clockout_at) < 28800 THEN 'less_than_8_hrs'
        WHEN TIMESTAMPDIFF(SECOND, case_clockin_at, case_clockout_at) < 43200 THEN 'less_than_12_hrs'
        ELSE 'no_record'
    END AS duration_range,
    COUNT(*) AS count
FROM case_schedules
JOIN master_branches ON case_schedules.branch_id = master_branches.id
WHERE case_schedules.schedule_date >= ? AND case_schedules.schedule_date <= ?
AND master_branches.id IN (?)
GROUP BY master_branches.branch_name, duration_range;`;

    const ans = await new Promise((resolve, reject) => {
      db.query(query, [from_date, to_date, selectedBranch], (error, result) => {
        if (error) {
          console.error(error);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    return res.status(200).json({ success: true, data: ans });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
};



const getCurrentDateSummary = async (req, res, next) => {
  try {
    const { from_date, to_date, branch_id } = req.query;

    console.log(req.query);

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

    const get_Accepted_Not_Clock_In_Query = `
    SELECT COUNT(*) as Accepted_Not_Clockin 
    FROM case_schedules
    WHERE schedule_date = CURRENT_DATE 
      AND case_status = 'Accepted'
      AND case_clockin_at IS NULL;
  `;

    const get_Accepted_Not_Clock_In = await new Promise((resolve, reject) => {
      db.query(get_Accepted_Not_Clock_In_Query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const get_Accepted_Clock_In_Query = `SELECT COUNT(*)
                                      as Accepted_And_Clockin 
   FROM case_schedules
   WHERE schedule_date = CURRENT_DATE 
     AND case_status = 'Clocked_In'
     AND case_clockin_at IS NOT NULL;`;

    const get_Accepted_Clock_In = await new Promise((resolve, reject) => {
      db.query(get_Accepted_Clock_In_Query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const get_Late_Clock_In_Query = `SELECT    
         SUM(CASE WHEN start_time > case_clockin_at THEN 1 ELSE 0 END) as Late_Count,
         COUNT(*)
         as Accepted_And_Clockin,
         TIMESTAMPDIFF(SECOND, start_time, case_clockin_at) AS time_difference_seconds
         FROM case_schedules
         WHERE schedule_date = CURRENT_DATE 
         AND case_status = 'Clocked_In';`;

    const get_Late_Clock_In = await new Promise((resolve, reject) => {
      db.query(get_Late_Clock_In_Query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const get_ClockIN_And_Not_Clockout_Query = `SELECT COUNT(*) as Clockin_And_NotClockout
    FROM case_schedules
    WHERE schedule_date = CURRENT_DATE 
     AND case_status = 'Clocked_In'
     AND clockout_loc IS  NULL;`;

    const get_ClockIN_And_Not_Clockout = await new Promise(
      (resolve, reject) => {
        db.query(get_ClockIN_And_Not_Clockout_Query, (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      }
    );

    const get_Unallocated_Query = `SELECT COUNT(*) as unallocated
    FROM case_schedules
    WHERE schedule_date = CURRENT_DATE 
      AND case_status = 'unknown'
      AND case_clockin_at IS NULL;`;

    const get_Unallocated = await new Promise((resolve, reject) => {
      db.query(get_Unallocated_Query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    const get_Active_Services = `SELECT COUNT(*) as Active_services
    FROM case_schedules
    WHERE schedule_date = CURRENT_DATE 
    AND status = 'Pending';`;

    const get_Active_Services_Count = await new Promise((resolve, reject) => {
      db.query(get_Active_Services, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });


    const get_Short_term_and_Long_term = `SELECT 
   master_services.service_category_type,
   COALESCE(COUNT(case_schedules.id), 0) AS service_count
FROM 
   master_services
LEFT JOIN 
   case_schedules ON master_services.id = case_schedules.service_required AND case_schedules.status = 'Pending' AND case_schedules.schedule_date = CURRENT_DATE
GROUP BY 
   master_services.service_category_type;`;

    const get_Short_term_and_Long_term_count = await new Promise((resolve, reject) => {
      db.query(get_Short_term_and_Long_term, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    })



    const get_Active_Client_Query = `select COUNT(*) AS COUNT from case_schedules where case_schedules.schedule_date = CURRENT_DATE AND case_schedules.status ='Pending';`


    const get_Active_Client = await new Promise((resolve, reject) => {
      db.query(get_Active_Client_Query, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
          console.table(results);
        }
      });

    });




    const result_json = {
      Accepted_Not_Clockin: get_Accepted_Not_Clock_In[0].Accepted_Not_Clockin,
      Accepted_And_Clockin: get_Accepted_Clock_In[0].Accepted_And_Clockin,
      Late_Count: get_Late_Clock_In[0].Late_Count,
      ClockIn_NotClockOut:
        get_ClockIN_And_Not_Clockout[0].Clockin_And_NotClockout,
      Unallocated: get_Unallocated[0].unallocated,
      Active_Services: get_Active_Services_Count[0].Active_services,
      Long_Term: get_Short_term_and_Long_term_count[1].service_count,
      Short_Term: get_Short_term_and_Long_term_count[2].service_count,
      Active_Client: get_Active_Client[0].COUNT
    };

    res.status(200).json({ success: true, data: result_json });
    console.table(result_json);
  } catch (error) {
    res.status(500).json({ success: false, data: error });
  }
};

getLocationWiseCount = async (req, res) => {
  console.log("getLocationWiseCount Api Request");
  try {
    const locationwisechart = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
        master_branches.branch_name, 
        DATE_FORMAT(schedule_date, '%Y-%m-%d') AS formatted_date, 
        COUNT(*) AS schedule_count
    FROM 
        case_schedules 
    JOIN 
        master_branches ON case_schedules.branch_id = master_branches.id
    WHERE 
        schedule_date >= CURDATE() - INTERVAL 30 DAY AND case_schedules.status = 'Pending'
    GROUP BY 
        master_branches.branch_name, 
        formatted_date 
    ORDER BY 
        formatted_date, 
        master_branches.branch_name;`,
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });

    return res.status(200).json({ success: true, data: locationwisechart });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

getStatusWiseStackCharts = async (req, res) => {
  console.log(req.query);
  console.log("getStatusWiseStackCharts Api Request");

  try {
    const statuswisechart = await new Promise((resolve, reject) => {
      db.query(
        `SELECT
        DATE_FORMAT(schedule_date, '%Y-%m-%d') AS schedule_date,
        COUNT(*) as Total_Cases,
        SUM(CASE WHEN case_status = 'Accepted' AND case_clockin_at IS NULL THEN 1 ELSE 0 END) as Accepted_Not_Clockin,
        SUM(CASE WHEN case_status = 'Clocked_In' THEN 1 ELSE 0 END) as Accepted_And_Clockin,
        SUM(CASE WHEN case_status = 'Clocked_In' AND case_clockin_at IS NOT NULL THEN 1 ELSE 0 END) as Clockin_And_NotClockout,
        SUM(CASE WHEN case_status = 'unknown' AND case_clockin_at IS NULL THEN 1 ELSE 0 END) as Unallocated,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as Active_Services
    FROM case_schedules
    WHERE schedule_date BETWEEN CURRENT_DATE - INTERVAL 6 DAY AND CURRENT_DATE
    GROUP BY schedule_date
    ORDER BY schedule_date DESC;`,
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });

    return res.status(200).json({ success: true, data: statuswisechart });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

getStausWiseLocationWiseCount = async (req, res) => {
  console.log(req.query);
  console.log("getStausWiseLocationWiseCount Api Request");

  try {
    const locationwisechart = await new Promise((resolve, reject) => {
      db.query(
        `SELECT
        master_branches.branch_name,
        DATE_FORMAT(schedule_date, '%Y-%m-%d') AS schedule_date,
       COUNT(*) as Total_Cases,
       SUM(CASE WHEN case_status = 'Accepted' AND case_clockin_at IS NULL THEN 1 ELSE 0 END) as Accepted_Not_Clockin,
       SUM(CASE WHEN case_status = 'Clocked_In' THEN 1 ELSE 0 END) as Accepted_And_Clockin,
       SUM(CASE WHEN case_status = 'Clocked_In' AND case_clockin_at IS NOT NULL THEN 1 ELSE 0 END) as Clockin_And_NotClockout,
       SUM(CASE WHEN case_status = 'unknown' AND case_clockin_at IS NULL THEN 1 ELSE 0 END) as Unallocated,
       SUM(CASE WHEN case_status = 'Pending' THEN 1 ELSE 0 END) as Active_Services
   FROM case_schedules
   JOIN master_branches ON case_schedules.branch_id = master_branches.id
   WHERE schedule_date  = CURRENT_DATE 
   GROUP BY schedule_date, master_branches.branch_name
   ORDER BY schedule_date DESC;`,
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });

    return res.status(200).json({ success: true, data: locationwisechart });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

getServiceType_Total = async (req, res) => {
  console.log(req.query);
  console.log("getServiceType Api Request");

  try {
    const serviceType = await new Promise((resolve, reject) => {
      db.query(
        `SELECT
        service_type,
        COUNT(patient_id) AS patient_count,
        SUM(total_services) AS total_services,
        SUM(CASE WHEN total_services > 1 THEN 1 ELSE 0 END) AS long_term_services,
        SUM(CASE WHEN total_services <= 1 THEN 1 ELSE 0 END) AS short_term_services
    FROM (
        SELECT
            patient_id,
            CASE
                WHEN COUNT(DISTINCT schedule_id) > 1 THEN 'Long Term Service'
                ELSE 'Short Term Service'
            END AS service_type,
            COUNT(DISTINCT schedule_id) AS total_services
        FROM
            case_schedules
        WHERE
            patient_id IS NOT NULL
            AND (
                (YEAR(schedule_date) = YEAR(CURDATE()) AND MONTH(schedule_date) = MONTH(CURDATE()))
               
            )
        GROUP BY
            patient_id
    ) AS subquery
    GROUP BY
        service_type
    ORDER BY
        service_type DESC;
        `,
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });

    return res.status(200).json({ success: true, data: serviceType });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};



getServicesDrillDown = async (req, res) => {

  console.log(req.query);
  console.log("getServicesDrill Api Request");

  try {
    const serviceTypeDrill = await new Promise((resolve, reject) => {
      db.query(
        `SELECT 
        master_services.service_category_type,
        master_service_category.category_name,
        case_schedules.schedule_date,
        case_schedules.service_required,
        master_services.display_name,
        patients.first_name,
        master_branches.branch_name
        
    FROM 
        master_service_category
    JOIN 
        master_services ON master_service_category.id = master_services.category_id
    JOIN 
        case_schedules ON master_services.id = case_schedules.service_required  
    JOIN 
    patients  ON case_schedules.patient_id = patients.id
    
    JOIN
      master_branches ON patients.branch_id = master_branches.id
    
    WHERE 
        case_schedules.status = 'Pending' AND case_schedules.schedule_date=CURRENT_DATE;`,
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
            console.table(results);
          }
        }
      );
    });
    return res.status(200).json({ success: true, data: serviceTypeDrill });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }


}










module.exports = {
  Home,
  FilterData,
  Branches,
  Services,
  Caregivers,
  Patients,
  StatusColcharts,
  PyramidCharts,
  getHoursCharts,
  getCurrentDateSummary,
  getLocationWiseCount,
  getStatusWiseStackCharts,
  getStausWiseLocationWiseCount,
  getServiceType_Total,
  getServicesDrillDown
};
