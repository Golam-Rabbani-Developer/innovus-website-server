const express = require("express")
const cors = require("cors")
require('dotenv').config()
const ObjectId = require("mongodb").ObjectId;
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
            const price = parseInt(newPrice || 1) * 100;
            console.log(price, typeof price)

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




