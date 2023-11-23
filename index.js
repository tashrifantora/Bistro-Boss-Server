const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
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
    const paymentsCollection = client.db('bistroBossDB').collection('payments');


/*====||====||====||====||====||
      JWT Releted API  
====||====||====||====||====||  
*/

   app.post('/jwt', async(req, res)=>{
     const user = req.body;
     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: "5h"});
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

/*<==================================
    Veryfi Token [Middle were]

    [here we get ALL Users token which is Send by ALLUser Components] [**Now Have to verify the Tohen**]
===================================>
*/
    const verifyToken = (req, res, next)=>{
      console.log('inside verify token:',req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message: "Forbidden access"})
      } 

      const token= req.headers.authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET ,(err, decoded)=>{
      if(err){
        return res.status(401).send({message: "Forbidden access"})
      }

      req.decoded= decoded
        next();
    })
    }

    // Admin verification [Should verifay admin after Token verification ]

    const verifyAdmin= async(req,res, next)=>{
      const email = req.decoded.email;
      const filter = {email: email}
      const user = await userCollection.findOne(filter);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        res.status(403).send({message: 'forbidden access'})
      }
      next();
    }



/*========================
    User Releted Start 
===========================
*/
    // User releted API (GET Operation)
    app.get('/user',verifyToken, verifyAdmin, async(req, res)=>{
      const result = await userCollection.find().toArray();
      console.log(result)
      res.send(result)
    })


    // Admin or not
    app.get('/user/admin/:email', verifyToken, async(req, res)=>{
       const email = req.params.email;
       if(email !== req.decoded.email){
        return res.status(403).send({message: "Unauthorized access"})
       }
       const query = {email: email}
       const user = await userCollection.findOne(query);
       let admin = false;
       if(user){
        admin = user?.role === 'admin'
       }
       res.send({admin, user})
    })


    // User Releted Delete operation
    app.delete('/user/:id', verifyToken, verifyAdmin, async(req, res)=>{
       const id = req.params.id;
       const query= {_id: new ObjectId (id)}
       const result= await userCollection.deleteOne(query);
       res.send(result)
    })

/*===================== 
    User Releted End 
=======================
*/

    // Admin making (Patch operation)
    app.patch('/user/admin/:id', verifyToken, verifyAdmin, async(req, res)=>{
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



/*++++++++++++++++++++++++++++++++
       All About Menu[Start]
+++++++++++++++++++++++++++++++++*/

   // Menu insurted Post

   app.post('/menu',verifyToken,verifyAdmin, async(req, res)=>{
    const menuItem = req.body;
    const result = await menuCollection.insertOne(menuItem);
    res.send(result);
   })


    // AL menu get operation 
    app.get('/menu', async(req,res)=>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })

    // Single id (Get operation for update)[***Something is wrong] 

     app.get('/menu/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: (id)}
      const result = await menuCollection.findOne(query);
      res.send(result);
     })


    //  Update [Patch operation]
    app.patch('/menu/:id', async(req,res)=>{
      const item = req.body;
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc= {
        $set:{
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updateDoc);
      res.send(result);

    })


    // Menu item delete
    app.delete('/menu/:id',verifyToken,verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      console.log(id)
      const query = {_id: id};
      const result = await menuCollection.deleteOne(query);
      console.log(result)
      res.send(result);
    })

/*++++++++++++++++++++++++++++++++
       All About Menu[End]
+++++++++++++++++++++++++++++++++*/



    // AL reviews get operation 
    app.get('/reviews', async(req,res)=>{
        const result = await reviewsCollection.find().toArray()
        res.send(result)
    })

    // Add to cart Post operation 
    app.post('/carts', async(req,res)=>{
      const cartItem = req.body;
      const result =  await cardsCollection.insertOne(cartItem);
      res.send(result);
    })


    // Add to cart Get Operation
    app.get('/carts',verifyToken, async(req,res)=>{
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

/*///===///===///===///===///===///
       Payment Things 
///===///===///===///===///===///*/
    app.post('/create-payment-intent', async(req,res)=>{
      const {price}= req.body;
      console.log(price)

      const amount= parseInt(price * 100);
      console.log('thgis ishowsds amount', amount)

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    // Payment History/Info store
    app.post('/payments', async (req, res)=>{
      const PaymentInfo = req.body;
      const PaymentResult= await paymentsCollection.insertOne(PaymentInfo);
      console.log('payment infoooo', PaymentInfo)
      
      // Now delete each item in the cart
      const query = {_id: {
        $in: PaymentInfo.cartIds.map(id=> new ObjectId(id))
      }}
      const deleteResult = await cardsCollection.deleteMany(query)
      

      res.send({PaymentResult,deleteResult})
    })

    // Get payment History
    app.get('/payment-history/:email', verifyToken, async (req,res)=>{
      const query = {email: req.params.email};
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: "Forbidden acces"})
      }
      const result = await paymentsCollection.find().toArray();
      res.send(result)
    })

    // stats or anyallitics
    // Customer [**find keno dilam na ??**]
    app.get('/admin-stats', verifyToken, verifyAdmin, async(req, res)=>{
      const users = await userCollection.estimatedDocumentCount(); //All user
      const menuItems = await menuCollection.estimatedDocumentCount() //All menu
      const orders = await paymentsCollection.estimatedDocumentCount() //Who paid money only them

      // not best way but easy
     /*  const payment = await paymentsCollection.find().toArray();
      console.log(payment)
      const revenue= payment.reduce((total, payment)=> total + payment.price,0) */

      const result = await paymentsCollection.aggregate([
        {
          $group:{
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray()
      const revenue= result.length > 0 ? result[0].totalRevenue : 0;


      res.send({
        users,
        menuItems,
        orders,
        revenue
      })
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