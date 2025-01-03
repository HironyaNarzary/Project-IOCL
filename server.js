const express = require("express"); //BinE
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config(); // Use .env file for sensitive credentials

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Serve HTML files directly from the root directory
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Login.html"));
});

app.get("/Register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Register.html"));
});

app.get("/Home.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Home.html"));
});

app.get("/showAllApprentice.html", (req, res) => {
  res.sendFile(path.join(__dirname, "showAllApprentice.html"));
});

app.get("/apprentices.html", (req, res) => {
  res.sendFile(path.join(__dirname, "apprentices.html"));
});

app.get("/Attendance.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Attendance.html"));
});

app.get("/showAllApprenticeAttendance.html", (req, res) => {
  res.sendFile(path.join(__dirname, "showAllApprenticeAttendance.html"));
});
app.get("/Login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "Login.html"));
});

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "7896553821",
  database: process.env.DB_NAME || "registrationDB",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
    return;
  }
  console.log("Connected to MySQL");
});

// Create Table (Run only once)
const createTableQuery = `
CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    apprenticeId VARCHAR(255),
    gender VARCHAR(10),
    dob DATE,
    email VARCHAR(255),
    phoneNumber VARCHAR(15),
    state VARCHAR(100),
    nationality VARCHAR(100),
    pinCode VARCHAR(6),
    address TEXT
);
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error("Error creating table:", err.message);
    return;
  }
  console.log("Table `registrations` ensured.");
});

// Routes
app.post("/register", (req, res) => {
  const {
    name,
    apprenticeId,
    gender,
    dob,
    email,
    phoneNumber,
    state,
    nationality,
    pinCode,
    address,
  } = req.body;

  const checkQuery = "SELECT * FROM registrations WHERE apprenticeId = ?";

  db.query(checkQuery, [apprenticeId], (err, results) => {
    if (err) {
      console.error("Error checking apprenticeId:", err.message);
      res.status(500).send("Server error");
      return;
    }

    if (results.length > 0) {
      res.status(409).send("Apprentice ID already exists");
    } else {
      const insertQuery = `
        INSERT INTO registrations (name, apprenticeId, gender, dob, email, phoneNumber, state, nationality, pinCode, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [
          name,
          apprenticeId,
          gender,
          dob,
          email,
          phoneNumber,
          state,
          nationality,
          pinCode,
          address,
        ],
        (err, result) => {
          if (err) {
            console.error("Error inserting data:", err.message);
            res.status(500).send("Error saving data");
            return;
          }
          res.status(201).send("Registration Successful");
        }
      );
    }
  });
});

// Fetching apprentice data
app.post("/fetchApprentice", (req, res) => {
  const { apprenticeId, name } = req.body;

  const query = `
    SELECT * FROM registrations
    WHERE apprenticeId = ? AND BINARY name = ?
  `;

  db.query(query, [apprenticeId, name], (err, results) => {
    if (err) {
      console.error("Error fetching apprentice data:", err.message);
      res.status(500).send({ message: "Internal Server Error" });
      return;
    }
    if (results.length > 0) {
      res.status(200).send({ valid: true, data: results[0] });
    } else {
      res.status(404).send({ valid: false, message: "Invalid ID or Name" });
    }
  });
});

// Fetch all apprentices
app.get("/getAllApprentices", (req, res) => {
  const query = "SELECT * FROM registrations";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching all apprentices:", err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    const formattedResults = results.map((row) => {
      if (row.dob) {
        row.dob = row.dob.toISOString().split("T")[0];
      }
      return row;
    });

    res.status(200).json(formattedResults);
  });
});

// Fetch attendance
app.post("/fetchAttendance", (req, res) => {
  const { apprenticeNo, date, startDate, endDate } = req.body;
  let query = `
    SELECT 
      a.department, COALESCE(r.name, 'Unknown') AS apprenticeName, a.apprenticeId AS apprenticeNo, 
      a.date, a.inTime, a.outTime, a.present, a.absent, a.remarks
    FROM attendance a
    LEFT JOIN registrations r ON a.apprenticeId = r.apprenticeId
    WHERE 1 = 1
  `;
  const params = [];
  if (apprenticeNo) {
    query += " AND a.apprenticeId = ?";
    params.push(apprenticeNo);
  }
  if (date) {
    query += " AND a.date = ?";
    params.push(date);
  }
  if (startDate && endDate) {
    query += " AND a.date BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Error fetching attendance:", err.message);
      return res.status(500).send("Failed to fetch attendance records.");
    }
    res.status(200).json(results);
  });
});
// API to fetch all attendance data
app.get("/fetchAllAttendance", (req, res) => {
  const query = `
    SELECT 
    a.apprenticeId AS apprenticeId,
    r.name AS apprenticeName,
    a.department AS department,
    a.present AS present,
    a.absent AS absent
FROM attendance a
LEFT JOIN registrations r
    ON TRIM(a.apprenticeId) = TRIM(r.apprenticeId);
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching attendance data:", err.message);
      return res.status(500).send("Internal Server Error");
    }
    if (results.length === 0) {
      return res.status(404).send("No attendance data found");
    }
    console.log("Fetched Results:", results); // Log the results to check if the name field exists
    res.status(200).json(results);
  });
});

// Utility to format time
const formatTime = (time) => {
  if (!time) return null;
  const [hour, minute] = time.split(":");
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${period}`;
};
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
