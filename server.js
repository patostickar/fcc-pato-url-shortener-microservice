"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
const dns = require("dns");
var cors = require("cors");
var app = express();

// For testing purposes
app.use(cors());

// Basic Configuration
var port = process.env.PORT || 3000;

/** project db **/
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

/** this project needs to parse POST bodies **/
var bodyParser = require("body-parser");
var urlencodedParser = bodyParser.urlencoded({ extended: false });

// Serve the HTMl + CSS
app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Create a Model
var urlSchema = new mongoose.Schema({
  url: { type: String, require: true },
  shortUrl: { type: String, require: true }
});
var urlShortener = mongoose.model("urlShortener", urlSchema);

// API endpoint...
// Save to db the URl to shorten
// create random string => check if it exists in db => assign to new URL
const generateRandomString = function(length = 6) {
  return Math.random()
    .toString(20)
    .substr(2, length);
};

const findExistingRandomString = function(string, done) {
  urlShortener.findOne({ shortUrl: string }, function(err, data) {
    if (err) return done(err);
    done(null, data);
  });
};

app.post("/api/shorturl/new", urlencodedParser, function(req, res) {
  let url = req.body.url;
  let webAddress = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
  
  function generateAndSaveUrl() {
    let shortUrl = generateRandomString();

    let urlToDb = new urlShortener({
      url: req.body.url,
      shortUrl: shortUrl
    });

    urlToDb.save(function(err, data) {
      if (err) res.send("Couldn't save short URL, please try again");
      console.log(`${url} saved to database as ${shortUrl}`);
      res.json({ original_url: req.body.url, short_url: shortUrl });
    });
  }
  
  dns.lookup(webAddress, err => {
    console.log(err)
    if (err && err.code === "ENOTFOUND") {
      return res.send("The URL doesn't exist");
    } else {
      generateAndSaveUrl();
    }
  });
});

// Retrieve from db the shortened URl
app.get("/api/shorturl/:url", function(req, res) {
  function findShortUrl(string) {
    urlShortener.findOne({ shortUrl: string }, function(err, data) {
      if (err) res.send("The shortened URL doesn't exist");
      console.log(`Found ${data.shortUrl} in database for ${data.url}`);
      res.redirect(data.url);
    });
  }

  let retrievedUrl = findShortUrl(req.params.url);
});

// Set up listen PORT
app.listen(port, function() {
  // console.log("Your app is listening on port " + port);
});
