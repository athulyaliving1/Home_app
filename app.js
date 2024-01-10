var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var bodyParser = require("body-parser");
var cors = require("cors");
var db = require("./db/connection").mysql_pool;
var port = 4046;
const https = require("https");
const fs = require("fs");
var app = express();
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

const routes = require("./routes/allroutes");


app.use("/", routes)


app.use(function (req, res, next) {
  console.log("api running at port 4046");
})


app.get("/", (req, res) => {
  res.send("api running at port 4046");
})



app.listen(port, () => {

  console.log(`Server is running on port ${port}.`);
});


