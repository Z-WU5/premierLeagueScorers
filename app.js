process.stdin.setEncoding("utf8");

//Check for right number of arguments
if (process.argv.length != 3) {
  console.log("Please enter <node app.js PORT_NUMBER_HERE>");
  process.exit(1);
}

//load port number
const PORT = process.argv[2];

//Defining and Processing Endpoints 
//and displaying template files
const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require("body-parser");

app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'templates'));
app.use(bodyParser.urlencoded({ extended: false }));

//set up MongoDB CONNECTION
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 
//connection string
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.qxv1f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
/* Our database and collection */
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
const { MongoClient, ServerApiVersion } = require('mongodb');
const { table } = require('console');
const client = new MongoClient(uri);
let db;
(async () => {
    try {
        //Connect to the MongoDB server
        await client.connect();
        console.log("Connected to MongoDB");

        //Access the database
        db = client.db("soccerPlayers"); //Use or create the `soccerPlayers` database
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    }
})();

//Command line interpreter
const prompt = "Type stop to shutdown the server: ";
process.stdout.write(prompt);
process.stdin.on("readable", async function () {
  const dataInput = process.stdin.read();
  if (dataInput !== null) {
    const command = dataInput.trim();
    if (command === "stop") {
        process.stdout.write("Shutting down the server");
        //clear db when we enter 'stop'
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).deleteMany({});
      process.exit(0);
    } else {
        console.log(`Invalid command: ${command.trim()}`);
    }
    process.stdout.write(prompt);
    process.stdin.resume();
  }
});

//index.ejs rendering
app.get("/", (request, response) => {
  response.render("index");
});

app.post('/filter-players', async (req, res) => {
    let goals = req.body.goalThreshold;
    
    //API that we pull from
    url = 'https://fantasy.premierleague.com/api/bootstrap-static/'
    const response = await fetch(url);
    const data = await response.json();
    const filteredPlayers = data.elements.filter(player => player.goals_scored >= goals);
    
    //store these players and important info into MongoDB
    for (player of filteredPlayers) {
        // Process the data, save it to a database (MONGODB)
        newPlayer = {first_name:player.first_name, last_name:player.second_name, goals:player.goals_scored};
        const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newPlayer);
    }
    
    //retrieve players from MongoDB (we used mongoDB here in order to only save certain information about players.)
    //(MongoDB helps simpifly the process since we can get the fields that we want)
    const cursor = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);
    const ans = await cursor.find().toArray(); //result is an array of objects
    
    //print all players with atleast "goals" number of goals in the Premier League in a table
    let table = "<table border = '1'><thead><tr><th>Last_Name</th><th>Goals</th></tr></thead>"
    ans.forEach(obj => table += `<tr><td>${obj.last_name}</td><td>${obj.goals}</td></tr>`);
    table += "</table>";

    res.render('players', { playerTable:table });
});

//Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});