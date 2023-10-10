var db = require("../db/connection.js").mysql_pool;

const Branches=async (req,res)=>{
  
  const default_branches = await new Promise((resolve, reject) => {

    db.query("select distinct id,branch_name from master_branches", (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });

  });
  return res.status(200).json({success:true,data:default_branches});
}


const Services=async (req,res)=>{
  
  const default_services = await new Promise((resolve, reject) => {

    db.query("select distinct id,service_name from master_services", (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });

  });
  return res.status(200).json({success:true,data:default_services});
}

const Caregivers=async (req,res)=>{
  
  const default_caregivers = await new Promise((resolve, reject) => {

    db.query("select distinct id,concat(employee_id,' - ',first_name,middle_name,last_name) as full_name from caregivers", (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });

  });
  return res.status(200).json({success:true,data:default_caregivers});
}

const Patients=async (req,res)=>{
  
  const default_services = await new Promise((resolve, reject) => {

    db.query("select distinct id,concat(first_name,' ',last_name) as full_name from patients ", (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });

  });
  return res.status(200).json({success:true,data:default_services});
}


const Home = async (req, res) => {

  const query = "set @count=0;SELECT (@count:=@count+1) AS sno,case_schedules.lead_id as lead_id,master_branches.branch_name,concat(patients.first_name,' ',patients.last_name) as full_name,master_services.service_name,date_format(case_schedules.schedule_date,'%Y-%m-%d') as schedule_date,caregivers.first_name,concat(caregivers.middle_name,caregivers.last_name) as caregiver_name,case_schedules.case_status FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id join caregivers on case_schedules.caregiver_id=caregivers.id where schedule_date=CURRENT_DATE";
  
  const ans= await new Promise((resolve,reject)=>{
  
    db.query(query,(error, result) => {
        if (error) {
          console.error(error);
          reject(error);
          
        }else{
            resolve(result[1]);
           //res.status(200).json({success:result[1]});
        }
      }
    );

  });

  return res.status(200).json({ success: true, data: ans });


};

const FilterData = async (req, res) => {

    const {from_date,to_date,service_id,branch_id,case_status,caregiver}=req.query;
    
    if (!from_date || !to_date) {
      return res.status(400).json({ error: 'Please provide both start and end dates' });
    }

    const query = "set @count=0;SELECT (@count:=@count+1) AS sno,case_schedules.lead_id as lead_id,master_branches.branch_name,concat(patients.first_name,' ',patients.last_name) as full_name,master_services.service_name,date_format(case_schedules.schedule_date,'%Y-%m-%d') as schedule_date,caregivers.first_name,concat(caregivers.middle_name,caregivers.last_name) as caregiver_name,case_schedules.case_status FROM case_schedules join master_services on case_schedules.service_required=master_services.id join patients on case_schedules.patient_id=patients.id join master_branches on case_schedules.branch_id=master_branches.id join caregivers on case_schedules.caregiver_id=caregivers.id where schedule_date>=? and schedule_date<=? and case_schedules.branch_id in (?) and case_schedules.case_status in (?) and master_services.id in (?) and case_schedules.caregiver_id in (?)";
    const default_branches = await new Promise((resolve, reject) => {

        db.query("select distinct id from master_branches", (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
  
      });
      all_branches = default_branches.map(tt => tt.id);
      //console.log(branch_id);
      selected_branch=all_branches.includes(parseInt(branch_id))?branch_id:all_branches;
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
      all_services = default_services.map(tt => tt.id);
      //console.log(branch_id);
      selected_service=all_services.includes(parseInt(service_id))?service_id:all_services;
      console.log(selected_service);
      const default_case_status = await new Promise((resolve, reject) => {

        db.query("select distinct case_status from case_schedules", (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
  
      });
      //console.log(default_case_status);
      all_case_status = default_case_status.map(tt => tt.case_status);
      //console.log(all_case_status);
      selected_case_status=all_case_status.includes(case_status)?case_status:all_case_status;

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
      all_caregivers = default_caregivers.map(tt => tt.id);
      //console.log(all_case_status);
      selected_caregiver=all_caregivers.includes(caregiver)?caregiver:all_caregivers;
      console.log("Seleced values:- "+from_date+" "+to_date+" "+selected_case_status+" "+selected_branch+" "+selected_service+" "+selected_caregiver);
      const ans= await new Promise((resolve,reject)=>{
     
      db.query(query,[from_date,to_date,selected_branch,selected_case_status,selected_service,selected_caregiver],(error, result) => {
          if (error) {
            console.error(error);
            reject(error);
            
          }else{
              resolve(result[1]);
             //res.status(200).json({success:result[1]});
          }
        }
      );
  
    });
    console.log(ans);
    return res.status(200).json({ success: true, data: ans });
  
  
  };

module.exports = {
    Home,FilterData,Branches,Services,Caregivers,Patients}
