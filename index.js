const express = require("express");
const app = express();
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fjcqpfj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("throughTravelsDb").collection("users");
    const servicesCollection = client
      .db("throughTravelsDb")
      .collection("services");
    const bookedCollection = client.db("throughTravelsDb").collection("booked");
    const reviewsCollection = client
      .db("throughTravelsDb")
      .collection("reviews");
    const productsCollection = client
      .db("throughTravelsDb")
      .collection("products");
    const cartCollection = client.db("throughTravelsDb").collection("carts");
    const purchaseCollection = client
      .db("throughTravelsDb")
      .collection("purchaseOrders");

    // post or get user by email api
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // get user role by email api
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // .......................................................
    // Services api
    // Get all Services api
    app.get("/services", async (req, res) => {
      const services = await servicesCollection.find().toArray();
      res.send(services);
    });
    // Get all Single Services api
    app.get("/services/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const service = await servicesCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!service) {
          return res.status(404).json({ error: "Service not found" });
        }

        res.json(service);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Post Booked Service api
    app.post("/booked", async (req, res) => {
      const newService = req.body;
      const result = await bookedCollection.insertOne(newService);
      res.json(result);
    });

    // Get all Booked Services api
    app.get("/booked", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await bookedCollection.find(query).toArray();
      res.send(result);
    });

    // Add a new service api
    app.post("/services", async (req, res) => {
      const newService = req.body;
      const result = await servicesCollection.insertOne(newService);
      res.json(result);
    });

    // .......................................................
    // Reviews api
    // Get all Reviews api
    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollection.find().toArray();
      res.send(reviews);
    });
    // Post Reviews api
    app.post("/reviews", async (req, res) => {
      const newReview = req.body;
      const result = await reviewsCollection.insertOne(newReview);
      res.json(result);
    });

    // .......................................................
    // Products api
    // Get all Products api
    app.get("/products", async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });
    // Get cart by user api
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    // Add to cart api
    app.post("/carts", async (req, res) => {
      const product = req.body;
      const result = await cartCollection.insertOne(product);
      res.send(result);
    });
    // Remove from cart api
    app.delete("/carts/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const query = { _id: new ObjectId(id) };
        const result = await cartCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Product not found" });
        }
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    // purchase products by email api
    app.post("/purchase", async (req, res) => {
      try {
        const purchaseData = req.body;

        // Perform any necessary validation on purchaseData

        // Save the purchase details to the database
        const result = await purchaseCollection.insertOne(purchaseData);

        // Clear the user's cart after successful purchase
        const deleteCartResult = await cartCollection.deleteMany({
          email: purchaseData.userEmail,
        });

        res.json({ success: true, purchaseResult: result, deleteCartResult });
      } catch (error) {
        console.error("Error processing purchase:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // .......................................................
    // Admin api
    // Get all service Orders api
    app.get("/orders", async (req, res) => {
      const result = await bookedCollection.find().toArray();
      res.send(result);
    });

    // Update service Order Status api
    app.put("/orders/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: status },
      };
      const result = await bookedCollection.updateOne(query, updateDoc);
      res.json(result);
    });

    // Edit a Service (PUT)
    app.put("/services/:id", async (req, res) => {
      const { id } = req.params;
      const updatedService = req.body;

      try {
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: updatedService, // Use $set to update fields other than _id
        };

        const result = await servicesCollection.updateOne(query, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Service not found" });
        }

        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Delete a Service (DELETE)
    app.delete("/services/:id", async (req, res) => {
      const { id } = req.params;

      try {
        const query = { _id: new ObjectId(id) };
        const result = await servicesCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Service not found" });
        }

        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // .......
    // Make a user an admin
    app.put("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const query = { email: email };
        const updateDoc = {
          $set: { role: "admin" }, // Set the user role to "admin"
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Remove admin role from a user
    app.put("/users/remove-admin/:email", async (req, res) => {
      const email = req.params.email;
      try {
        const query = { email: email };
        const updateDoc = {
          $set: { role: "user" }, // Set the user role back to "user"
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Get all users api
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    // Delete from user list (USER)
    app.delete("/users/:email", async (req, res) => {
      const email = req.params.email;

      try {
        const query = { email: email };
        const result = await usersCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // .......................................................

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Travel app running");
});

app.listen(port, () => {
  console.log(`Travel server is running on port: ${port}`);
});
