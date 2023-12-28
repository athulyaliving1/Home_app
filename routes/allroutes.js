const app = require("express"); //import express
const router = app.Router();
const HomeModule = require("../controllers/HomeModule");

router.post("/reports", HomeModule.Home);
router.get("/branches", HomeModule.Branches);
router.get("/services", HomeModule.Services);
router.get("/caregivers", HomeModule.Caregivers);
router.get("/patients", HomeModule.Patients);
router.post("/filterreports", HomeModule.FilterData);
router.post("/statuscolumncharts", HomeModule.StatusColcharts);
router.post("/pyramidcharts", HomeModule.PyramidCharts);
router.post("/hourscharts", HomeModule.getHoursCharts);
router.post("/currentdatesummary", HomeModule.getCurrentDateSummary);
router.post("/locationsummary", HomeModule.getLocationWiseCount);
router.post("/statuswisecharts", HomeModule.getStatusWiseStackCharts);
router.post("/statuswiselocationwisecharts", HomeModule.getStausWiseLocationWiseCount);
router.post("/servicetypetotal", HomeModule.getServiceType_Total);

//router.post("/seq",HomeModule.Seq);



module.exports = router; // export to use in server.js
