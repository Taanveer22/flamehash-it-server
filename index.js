// imports
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

// Definition
const app = express();

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://flamehash-it-client.vercel.app"],
    credentials: true,
  }),
);

app.use(express.json());

app.use(async (req, res, next) => {
  console.log(
    `⚡ ${req.method} - ${req.path} from ${req.host} at ⌛ ${new Date().toLocaleString()}`,
  );
  next();
});

// ports & clients
const port = process.env.PORT || 5000;
const uri = process.env.URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// DB & collections
const database = client.db("flameHashItDB");
const servicesCollection = database.collection("servicesColl");
const contactsCollection = database.collection("contactsColl");

// Basic route
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "FlameHashit Server" });
});

// POST /services — when someone books a specific service
app.post("/services", async (req, res) => {
  try {
    const { name, email, mobile, message, service } = req.body;
    if (!name || !email || !message || !service) {
      return res
        .status(400)
        .json({ error: "Please fill in all required fields." });
    }
    const result = await servicesCollection.insertOne(req.body);
    console.log("Saved service request to database:", req.body);
    res.status(201).json({
      message: "Service request created successfully.",
      data: result,
    });
  } catch (error) {
    console.log("Error in /services route:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST /contacts — when someone sends a general contact form message
app.post("/contacts", async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ error: "Please fill in all required fields." });
    }
    const result = await contactsCollection.insertOne(req.body);
    console.log("Saved contact message to database:", req.body);
    res.status(201).json({
      message: "Contact message sent successfully.",
      data: result,
    });
  } catch (error) {
    console.log("Error in /contacts route:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// listeners
async function startServer() {
  try {
    await client.connect();
    console.log("FlameHashit Server Connected with DB");

    app.listen(port, () => {
      console.log(`FlameHashit Server listening on ${port}`);
    });
  } catch (err) {
    console.log("Server failed to start:", err.message);
    process.exit(1);
  }
}

startServer();
