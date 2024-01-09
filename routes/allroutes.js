const app = require("express"); //import express
const router = app.Router();
const HomeModule = require("../controllers/HomeModule");
const ReportModule_1 = require("../controllers/HomecareRevenueDashboard/ReportModule");
const BranchModule = require("../controllers/HomecareRevenueDashboard/BranchModule");

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
router.post("/servicesdrilldown", HomeModule.getServicesDrillDown);

//router.post("/seq",HomeModule.Seq);



//______________________________Home_Revenue_Dasboard______________________________




router.post("/test", ReportModule_1.Reports);
router.post("/active_clients", ReportModule_1.ActiveClients);
router.get("/getbranches", BranchModule.branchlocation);
router.post("/getinvoicesbranches", ReportModule_1.getInvoicesPieChart);
router.post("/getinvoices", ReportModule_1.getInvoices);
router.post("/getinvoicesplitup", ReportModule_1.getInvoiceSplitUp);
router.post("/getserviceinvoice", ReportModule_1.getServiceInvoice);
router.post("/getserviceinvoicesplitup", ReportModule_1.getServiceInvoiceSplitup);
router.post("/getsummary", ReportModule_1.getSummary);
router.post("/getreceipts", ReportModule_1.getreceipts);
router.post("/getpendingreceipts", ReportModule_1.getpendingreceipts);
router.post("/getalldayinvoice", ReportModule_1.getalldayinvoice);
router.post("/getcompletedschedules", ReportModule_1.getcompletedschedules);
router.post("/getpendingschedules", ReportModule_1.getpendingschedules);
router.post("/getschedulerevenue", ReportModule_1.getschedulerevenue);
router.post("/getschedulecategoryrevenue", ReportModule_1.getschedulecategoryrevenue);
router.post("/getschedulesubcategoryrevenue", ReportModule_1.getschedulesubcategoryrevenue);
router.post("/getschedulesummary", ReportModule_1.getschedulesummary);
router.post("/getschedulesubcategoryrevenue", ReportModule_1.getschedulesubcategoryrevenue);


router.get("/getmasterservices", BranchModule.masterServices);
router.get("/getmastercategories", BranchModule.masterCategories);
router.post("/getservicecategorybranch", ReportModule_1.getServiceCategoryPieChart);
router.post("/getunapprovedfunds", ReportModule_1.getUnapprovedFunds);
router.post("/getb2bfunds", ReportModule_1.getb2bfunds);









module.exports = router; // export to use in server.js
