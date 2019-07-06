var express = require("express");
//var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
//app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
mongoose.connect("mongodb://localhost/newsItem", { useNewUrlParser: true });

// Routes

// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://news.google.com/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US%3Aen").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("article.MQsxIb.xTewfe.R7GTQ.keNKEd.j7vNaf.Cc0Z5d.EjqUne").each(function(i, element) {
      
      //Append original path to link
      let link = $(this).children("a").attr("href");
      link  = "news.google.com" + link.substring(1);

      let result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("h3")
        .text();
      result.link = link;
      result.outline = $(this)
        .children("div.Da10Tb.Rai5ob")
        .children("span")
        .text();
      
      //Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  db.Article.find({}).then((articles) => res.json(articles))
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  db.Article
    .findById(req.params.id) 
    .populate('note')
    .then((result) => res.json(result))
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  let newNote = req.body;
  console.log(newNote);
  db.Note.create(newNote)
    .then((dbNewNote)=>{
      console.log(dbNewNote);
      db.Article
       .findByIdAndUpdate(
         req.params.id,
         { $push: {note: dbNewNote._id}},
         {new: true}
       )
       .then(result=>console.log(result))
       .catch( err => console.log(err));
    })
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
