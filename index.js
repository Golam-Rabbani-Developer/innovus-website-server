const express = require("express")
const cors = require("cors")
require('dotenv').config()
const ObjectId = require("mongodb").ObjectId;
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(`sk_test_51L0mirGh3CcvB5xEdCI8pIWwPt5HdL6rr2YCrSGb2ycw75tFkzXmfk5NVeLbIciAkWzFm82OtoKge9zi7p66StwR003iNIvzNQ`)
const { MongoClient, ServerApiVersion, Admin } = require('mongodb');
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
        const orderCollection = database.collection("orders");




        async function verifyAdmin(req, res, next) {
            const email = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email })
            if (requesterAccount.role === "admin") {
                next()
            } else {
                res.status(403).send({ message: "Forbidden Access" })
            }
        }




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



        // add new product 
        app.post("/product", async (req, res) => {
            const { product } = req.body;
            const result = await productCollection.insertOne(product)
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



        // send all orders
        app.post("/orders/:email", async (req, res) => {
            const { order } = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })



        // change the pay option from order collection
        app.put("/order/:id", async (req, res) => {
            const id = req.params.id
            const { transactionid } = req.body;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    pay: transactionid,
                }
            }
            const result = await orderCollection.updateOne(filter, updateDoc, options)

            res.send(result)
        })


        // handlepayment 
        app.post("/create-payment-intent", async (req, res) => {
            const { newPrice } = req.body;
            const price = parseInt(newPrice) * 100 || 100;

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




        //
        app.get("/user/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })



        //make admin
        app.put('/admin/user/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: { role: "admin" }
            }
            const result = await userCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })





        // get only admin 
        app.get("/admin/users/:email", verifyJWT, async (req, res) => {
            const email = req.params.email;
            const admin = await userCollection.findOne({ email })
            if (admin.role === "admin") {
                res.send({ admin: true })
            } else {
                res.send({ admin: false })
            }
        })







        // get all users
        app.get("/users", async (req, res) => {
            const result = await userCollection.find({}).toArray()
            res.send(result)
        })




        // send review 
        app.post("/review", async (req, res) => {
            const { review } = req.body;
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })


        // get all orders of individual user
        app.get("/userorders/:email", async (req, res) => {
            const userEmail = req.params.email;
            const result = await orderCollection.find({ userEmail }).toArray()
            res.send(result)
        })




        // get all orders
        app.get("/orders", async (req, res) => {
            const result = await orderCollection.find({}).toArray()
            res.send(result)
        })





        // change shift status of the order 
        app.put("/shift/orders/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    shift: true,
                }
            }
            const result = await orderCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })





        // delete the order from the server 
        app.delete("/order/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(filter)
            res.send(result)
        })






        // delete a single product
        app.delete("/product/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(filter)
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




