const express = require("express")
const cors = require("cors")
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()

const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0253z.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




async function run() {
    try {
        await client.connect();
        const database = client.db("innovus");
        const reviewCollection = database.collection("reviews");
        const serviceCollection = database.collection("services");
        const productCollection = database.collection("products");




        //get all the reiviews
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find({}).toArray();
            res.send(result)
        })



        //get all the services
        app.get("/services", async (req, res) => {
            const result = await serviceCollection.find({}).toArray();
            res.send(result)
        })



        //get all the products
        app.get("/products", async (req, res) => {
            const result = await productCollection.find({}).toArray()
            res.send(result)
        })



    }
    finally { }
}
run().catch(console.dir)




app.get("/", (req, res) => {
    res.send("Running Innovus")
})

app.listen(port, () => {
    console.log("Manufacturer Listening")
})




