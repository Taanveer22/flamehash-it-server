// imports
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { Resend } = require("resend");

// definition
const app = express();

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://flamehash-it-client.vercel.app",
      "https://flamehash.com",
      "https://www.flamehash.com",
    ],
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

// resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const OWNER_EMAIL = process.env.OWNER_EMAIL;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
// Example: "Flame Hash Agency <hello@email.flamehash.com>"

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// HTML escaping
function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// db & collections
const database = client.db("flamehashItDB");
const servicesCollection = database.collection("servicesColl");
const contactsCollection = database.collection("contactsColl");

// basic route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "FlameHashit Server",
  });
});

// ============================================================
// POST /services
// When someone books a specific service
// ============================================================

app.post("/services", async (req, res) => {
  try {
    const { name, email, mobile, message, service } = req.body;

    // Required field validation
    if (!name || !email || !message || !service) {
      return res.status(400).json({
        error: "Please fill in all required fields.",
      });
    }

    // Email validation
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address.",
      });
    }

    const result = await servicesCollection.insertOne(req.body);

    console.log("Saved service request to database:", req.body);

    // --------------------------------------------------------
    // Escape user input before putting it inside HTML
    // --------------------------------------------------------

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMobile = escapeHtml(mobile || "N/A");
    const safeMessage = escapeHtml(message);
    const safeService = escapeHtml(service);

    // --------------------------------------------------------
    // Send emails
    // --------------------------------------------------------

    try {
      // ------------------------------------------------------
      // Send confirmation email to customer
      // ------------------------------------------------------

      await resend.emails.send({
        from: CLIENT_EMAIL,
        to: email,

        subject: "We received your service request!",

        html: `
          <h2>Hi ${safeName},</h2>

          <p>
            Thanks for booking
            <b>${safeService}</b>
            with FlameHashit!
          </p>

          <p>
            <b>Your message:</b>
            ${safeMessage}
          </p>

          <p>
            We'll get back to you soon.
          </p>
        `,
      });

      // ------------------------------------------------------
      // Send notification email to owner
      // ------------------------------------------------------

      await resend.emails.send({
        from: CLIENT_EMAIL,
        to: OWNER_EMAIL,

        // Important:
        // Clicking "Reply" in your email will reply
        // directly to the customer's email.
        replyTo: email,

        subject: `New Service Request: ${safeService}`,

        html: `
          <h2>New Service Booking</h2>

          <p>
            <b>Name:</b>
            ${safeName}
          </p>

          <p>
            <b>Email:</b>
            ${safeEmail}
          </p>

          <p>
            <b>Mobile:</b>
            ${safeMobile}
          </p>

          <p>
            <b>Service:</b>
            ${safeService}
          </p>

          <p>
            <b>Message:</b>
            ${safeMessage}
          </p>
        `,
      });
    } catch (emailError) {
      console.log("Email sending failed:", emailError.message);

      // We don't fail the whole request
      // just because email failed.
    }

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    res.status(201).json({
      message: "Service request created successfully.",
      data: result,
    });
  } catch (error) {
    console.log("Error in /services route:", error.message);

    res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
});

// ============================================================
// POST /contacts
// When someone sends a general contact form message
// ============================================================

app.post("/contacts", async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;

    // Required field validation
    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Please fill in all required fields.",
      });
    }

    // Email validation
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address.",
      });
    }

    const result = await contactsCollection.insertOne(req.body);

    console.log("Saved contact message to database:", req.body);

    // --------------------------------------------------------
    // Escape user input before putting it inside HTML
    // --------------------------------------------------------

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMobile = escapeHtml(mobile || "N/A");
    const safeMessage = escapeHtml(message);

    // --------------------------------------------------------
    // Send emails
    // --------------------------------------------------------

    try {
      // ------------------------------------------------------
      // Send confirmation email to customer
      // ------------------------------------------------------

      await resend.emails.send({
        from: CLIENT_EMAIL,
        to: email,

        subject: "We received your message!",

        html: `
          <h2>Hi ${safeName},</h2>

          <p>
            Thanks for reaching out to FlameHashit!
          </p>

          <p>
            <b>Your message:</b>
            ${safeMessage}
          </p>

          <p>
            We'll get back to you soon.
          </p>
        `,
      });

      // ------------------------------------------------------
      // Send notification email to owner
      // ------------------------------------------------------

      await resend.emails.send({
        from: CLIENT_EMAIL,
        to: OWNER_EMAIL,

        // Important:
        // Clicking "Reply" in your email will reply
        // directly to the customer's email.
        replyTo: email,

        subject: "New Contact Message",

        html: `
          <h2>New Contact Form Submission</h2>

          <p>
            <b>Name:</b>
            ${safeName}
          </p>

          <p>
            <b>Email:</b>
            ${safeEmail}
          </p>

          <p>
            <b>Mobile:</b>
            ${safeMobile}
          </p>

          <p>
            <b>Message:</b>
            ${safeMessage}
          </p>
        `,
      });
    } catch (emailError) {
      console.log("Email sending failed:", emailError.message);
    }

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    res.status(201).json({
      message: "Contact message sent successfully.",
      data: result,
    });
  } catch (error) {
    console.log("Error in /contacts route:", error.message);

    res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
});

// ============================================================
// SERVER
// ============================================================

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
