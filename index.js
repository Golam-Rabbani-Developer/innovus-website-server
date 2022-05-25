const express = require("express")
const cors = require("cors")
require('dotenv').config()
const ObjectId = require("mongodb").ObjectId;
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(`sk_test_51L0mirGh3CcvB5xEdCI8pIWwPt5HdL6rr2YCrSGb2ycw75tFkzXmfk5NVeLbIciAkWzFm82OtoKge9zi7p66StwR003iNIvzNQ`)
const { MongoClient, ServerApiVersion } = require('mongodb');
const { query } = require("express");
const app = express()

const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0253z.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).send({ message: "Unauthorized Access" })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: "Forbidden Access" })
        }
        else {
            req.decoded = decoded;
            next()
        }
    })
}



async function run() {
    try {
        await client.connect();
        const database = client.db("innovus");
        const reviewCollection = database.collection("reviews");
        const serviceCollection = database.collection("services");
        const productCollection = database.collection("products");
        const userCollection = database.collection("users");




        //get all the reiviews
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find({}).toArray();
            res.send(result)
        })



        //get all the services
        app.get("/services", verifyJWT, async (req, res) => {
            const result = await serviceCollection.find({}).toArray();
            res.send(result)
        })



        //get all the products
        app.get("/products", verifyJWT, async (req, res) => {
            const result = await productCollection.find({}).toArray()
            res.send(result)
        })



        // get the single product
        app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await productCollection.findOne(filter)
            res.send(result)
        })




        // change the productQuantity
        app.put("/product/:id", async (req, res) => {
            const id = req.params.id;
            const { product, newQuantity } = req.body;
            const remaining = parseInt(product.quantity) - parseInt(newQuantity || 0)
            const filter = { _id: (ObjectId(id)) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    quantity: remaining,
                    newQuantity: newQuantity,
                }
            }
            const result = await productCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })


        // change the pay option
        app.put("/products/:id", async (req, res) => {
            const id = req.params.id
            const { transactionId } = req.body
            const options = { upsert: true }
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    pay: transactionId,
                }
            }
            const result = await productCollection.updateOne(filter, updateDoc, options)

            res.send(result)
        })


        // handlepayment 
        app.post("/create-payment-intent", async (req, res) => {
            const { newPrice } = req.body;
            const price = parseInt(newPrice) * 100 || 1;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: price,
                currency: "usd",
                payment_method_types: [
                    "card"
                ]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        // send all the users
        app.put("/users/:email", async (req, res) => {
            const user = req.body;
            const options = { upsert: true }
            const email = req.params.email;
            const filter = { email: email }
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: "1d" })
            res.send({ result, token })

        })


        // update the user 
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await userCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })



        // send review 
        app.post("/review", async (req, res) => {
            const { review } = req.body;
            const result = await reviewCollection.insertOne(review)
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




