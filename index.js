const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const port = process.env.port || 5000;


// Middle were
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.gsyh7hk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    const menuCollection = client.db('bistroBossDB').collection('menu')
    const userCollection = client.db('bistroBossDB').collection('user')
    const reviewsCollection = client.db('bistroBossDB').collection('reviews')
    const cardsCollection = client.db('bistroBossDB').collection('cards');

/*====||====||====||====||====||
      JWT Releted API  
====||====||====||====||====||  
*/

   app.post('/jwt', async(req, res)=>{
     const user = req.body;
     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "1h"});
     res.send({token})
   })



/*===================== 
     User Releted  
=======================
*/
    // User related API(POST Operation)
    app.post('/user', async(req,res)=>{
      const user = req.body;

      // Check user alrady exist or not
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'User email already exist'})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })


    // User releted API (GET Operation)
    app.get('/user', async(req, res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })


    // User Releted Delete operation
    app.delete('/user/:id', async(req, res)=>{
       const id = req.params.id;
       const query= {_id: new ObjectId (id)}
       const result= await userCollection.deleteOne(query);
       res.send(result)
    })


    // Admin making (Patch operation)
    app.patch('/user/admin/:id', async(req, res)=>{
      const id = req.params.id;
      const filter= {_id: new ObjectId(id)}
      const updatedDoc = {
        $set:{
          role: "admin"
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })







    // AL menu get operation 
    app.get('/menu', async(req,res)=>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })

    // AL reviews get operation 
    app.get('/reviews', async(req,res)=>{
        const result = await reviewsCollection.find().toArray()
        res.send(result)
    })

    // Add to cart Post operation 
    app.post('/carts', async(req,res)=>{
      const cartItem= req.body;
      const result=  await cardsCollection.insertOne(cartItem);
      res.send(result);
    })


    // Add to cart Get Operation
    app.get('/carts', async(req,res)=>{
      const email = req.query.email;
      const query = {email: email};
      const result = await cardsCollection.find(query).toArray()
      res.send(result);
    })


    // Add cart item delete
    app.delete('/carts/:id', async(req, res)=>{
      const id = req.params.id;
      const query= {_id: new ObjectId(id)};
      const result = await cardsCollection.deleteOne(query);
      res.send(result)
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res)=>{
    res.send('Boss is ready')
})

app.listen(port, ()=>{
    console.log(`Bistro boss is sitting on port ${port}`)
})