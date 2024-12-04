require("dotenv").config();

const { MongoClient, ServerApiVersion } = require("mongodb");
const bcrypt = require("bcrypt");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const {authenticateToken} = require("./utilities");
const upload = require("./multer");
const fs = require("fs");
const path = require("path");

const uri = process.env.MONGO_URI || "mongodb+srv://ingsawani:Password123@travelstory.gkzwa.mongodb.net/?retryWrites=true&w=majority&appName=travelstory";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db; // To store the database connection

async function connectDB() {
  try {
    await client.connect();
    db = client.db("travelstory"); // Use your database name here
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
}
connectDB();

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

// POST /create-account
app.post("/create-account", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: true, message: "All fields are required" });
  }

  try {
    // Check if the user exists
    const isUser = await db.collection("users").findOne({ email });
    if (isUser) {
      return res.status(400).json({ error: true, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await db.collection("users").insertOne({
      fullName,
      email,
      password: hashedPassword,
      createdOn : new Date(),
    });

    // Generate JWT
    const accessToken = jwt.sign(
      { userId: result.insertedId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "72h" }
    );

    return res.status(201).json({
      error: false,
      user: { fullName, email },
      accessToken,
      message: "Registration Successful",
    });
  } catch (error) {
    console.error("Error during user registration:", error.message);
    return res.status(500).json({ error: true, message: "Internal server error" });
  }
});

// POST /login
app.post("/login", async(req,res)=>{
    const {email, password} = req.body;
    if (!email || !password){
        return res.status(400).json({error: true, message: "Email and Password are required"});
    }

    const isUser = await db.collection("users").findOne({ email });
    if(!isUser){
        return res.status(400).json({error: true, message: "User not found"});
    }

    const isPasswordValid = await bcrypt.compare(password, isUser.password);
    if(!isPasswordValid){
        return res.status(400).json({error: true, message:"Invalid Credentials"});
    }

    const accessToken = jwt.sign(
        {userId: isUser._id},
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "72h",
        }
    );

    return res.json({
        error: false,
        message: "Login successful",
        user: {fullName: isUser.fullName, email: isUser.email},
        accessToken,
    });
});

// GET /get-user
const { ObjectId } = require("mongodb");
app.get("/get-user", authenticateToken, async(req, res) => {
    const {userId} = req.user;
    try {
        const isUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
        if (!isUser) {
            return res.sendStatus(401);
        }
        return res.json({
            user: isUser,
            message: "",
        });
    } catch (error) {
        console.error("Error fetching user:", error.message);
        return res.status(500).json({ error: true, message: "Internal server error" });
    }

});

//Add travel story
app.post("/add-travel-story", authenticateToken, async(req, res) => {
    const { title, story, visitedLocation, imageUrl, visitedDate} = req.body;
    const {userId} = req.user

    if(!title || !story || !visitedLocation || !imageUrl || !visitedDate){
        return res.status(400).json({error: true, message: "All fields are required"});
    }

    const parsedVisitedDate = new Date(parseInt(visitedDate));
    try{
        const travelstory = await db.collection("travelstory").insertOne({
            title,
            story,
            visitedLocation: Array.isArray(visitedLocation) ? visitedLocation : [visitedLocation],
            isFavourite: false,
            userId,
            imageUrl,
            visitedDate : parsedVisitedDate,
            createdOn: new Date(),
        });
        // await travelstory.save();
        res.status(201).json({story: travelstory, message:"Added Successfully"});

    } catch(error){
        res.status(400).json({error: true, message:error.message});
    }
});

//Display All Travel Stories
app.get("/get-all-stories", authenticateToken, async(req,res) =>{
    const {userId} = req.user;

    try {
        // Fetch stories from the database
        const travelStories = await db.collection("travelstory").find({ userId }).sort({ isFavourite: -1 }).toArray();
        
        res.status(200).json({ stories: travelStories });
      } catch (error) {
        console.error("Error fetching travel stories:", error.message);
        res.status(500).json({ error: true, message: "Internal server error" });
      }

});

// Route to handle image upload
app.post("/image-upload", upload.single("image"), async(req, res) => {
    try{
        if(!req.file){
            return res
                .status(400)
                .json({error: true, message: "No image uploaded"});
        }
        const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`;
        res.status(200).json({ imageUrl });
    }catch (error){
        res.status(500).json({error: true, message: error.message});
    }
  
})

//delete an image
app.delete("/delete-image", async(req, res) => {
    const { imageUrl } = req.query;
    if(!imageUrl){
        return res
            .status(400).json({error: true, message: "imageUrl parameter required"});
    }

    try{
        const filename = path.basename(imageUrl);
        const filePath = path.join(__dirname, 'uploads', filename);

        if(fs.existsSync(filePath)){
            fs.unlinkSync(filePath);
            res.status(200).json({message: "Image deleted successfully"});
        } else {
            res.status(200).json({error: true, message:"Image not found"});
        }
    } catch (error) {
        res.status(500).json({error: true, message: error.message});
    }
});

// Edit Travel Story
app.post("/edit-story/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, story, visitedLocation, imageUrl, visitedDate } = req.body;
    const { userId } = req.user;
  
    // Validate input
    if (!title || !story || !visitedLocation || !visitedDate) {
      return res
        .status(400)
        .json({ error: true, message: "All fields are required" });
    }
  
    const parsedVisitedDate = new Date(parseInt(visitedDate));
  
    try {
      // Check if the travel story exists and belongs to the user
      const travelStory = await db.collection("travelstory").findOne({
        _id: new ObjectId(id),
        userId: userId,
      });
  
      if (!travelStory) {
        return res
          .status(404)
          .json({ error: true, message: "Travel story not found" });
      }
      const placeholderImgUrl = `http://localhost:8000/assests/placeholder1.jpeg`
  
      // Update the travel story
      const updatedStory = await db.collection("travelstory").updateOne(
        { _id: new ObjectId(id), userId: userId },
        {
          $set: {
            title: title,
            story: story,
            visitedLocation: visitedLocation,
            imageUrl: imageUrl || placeholderImgUrl,
            visitedDate: parsedVisitedDate,
          },
        }
      );
  
      // Return the updated story
      if (updatedStory.modifiedCount > 0) {
        const story = await db.collection("travelstory").findOne({
          _id: new ObjectId(id),
        });
        res.status(200).json({ story: story, message: "Updated successfully!" });
      } else {
        res.status(500).json({
          error: true,
          message: "Failed to update the travel story.",
        });
      }
    } catch (error) {
      console.error("Error updating travel story:", error.message);
      res.status(500).json({ error: true, message: "Internal server error" });
    }
});

//Delete travel story
app.delete("/delete-story/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
  
    try {
      // Check if the travel story exists and belongs to the user
      const travelStory = await db.collection("travelstory").findOne({
        _id: new ObjectId(id),
        userId: userId,
      });
  
      if (!travelStory) {
        return res
          .status(404)
          .json({ error: true, message: "Travel story not found" });
      }
  
      // Delete the travel story from the database
      await db.collection("travelstory").deleteOne({
        _id: new ObjectId(id),
        userId: userId,
      });
  
      // Handle image deletion
      const imageUrl = travelStory.imageUrl;
      if (imageUrl) {
        const filename = path.basename(imageUrl);
        const filePath = path.join(__dirname, "uploads", filename);
  
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Failed to delete image:", err);
          } else {
            console.log("Image deleted successfully:", filename);
          }
        });
      }
  
      res.status(200).json({ message: "Deleted story successfully!" });
    } catch (error) {
      console.error("Error deleting story:", error.message);
      res.status(500).json({ error: true, message: "Internal server error" });
    }
  });

// Mark as favourite
app.put("/update-favourite/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { isFavourite } = req.body;
    const { userId } = req.user;
  
    if (typeof isFavourite !== "boolean") {
      return res
        .status(400)
        .json({ error: true, message: "isFavourite must be a boolean value" });
    }
  
    try {
      // Check if the travel story exists and belongs to the user
      const travelStory = await db.collection("travelstory").findOne({
        _id: new ObjectId(id),
        userId: userId,
      });
  
      if (!travelStory) {
        return res
          .status(404)
          .json({ error: true, message: "Travel story not found" });
      }
  
      // Update the isFavourite field
      await db.collection("travelstory").updateOne(
        { _id: new ObjectId(id), userId: userId },
        { $set: { isFavourite: isFavourite } }
      );
  
      // Fetch the updated document to send as a response
      const updatedStory = await db.collection("travelstory").findOne({
        _id: new ObjectId(id),
      });
  
      res
        .status(200)
        .json({ story: updatedStory, message: "Updated isFavourite successfully!" });
    } catch (error) {
      console.error("Error updating isFavourite:", error.message);
      res.status(500).json({ error: true, message: "Internal server error" });
    }
  });

//Search travel stories
app.get("/search-story", authenticateToken, async (req, res) => {
    const { query } = req.query;
    const { userId } = req.user;
  
    if (!query) {
      return res.status(400).json({ error: true, message: "Query is required!" });
    }
  
    try {
      const searchRes = await db.collection("travelstory").find({
        userId: userId,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { story: { $regex: query, $options: "i" } },
          { visitedLocation: { $regex: query, $options: "i" } },
        ],
      })
      .sort({ isFavourite: -1 })
      .toArray();
  
      if (searchRes.length === 0) {
        return res
          .status(200)
          .json({ stories: [], message: "No matching stories found." });
      }
  
      res.status(200).json({ stories: searchRes });
    } catch (error) {
      console.error("Error searching stories:", error.message);
      res.status(500).json({ error: true, message: "Internal server error" });
    }
  });

//Filter travel stories by date range
app.get("/filter-by-date", authenticateToken, async (req, res) => {
    const { startDate, endDate } = req.query;
    const { userId } = req.user;
  
    try {
      const start = new Date(parseInt(startDate));
      const end = new Date(parseInt(endDate));
  
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
          error: true,
          message: "Invalid startDate or endDate provided.",
        });
      }
  
      const filterDateStory = await db
        .collection("travelstory")
        .find({
          userId: userId,
          visitedDate: { $gte: start, $lte: end },
        })
        .sort({ isFavourite: -1 })
        .toArray();
  
      res.status(200).json({ stories: filterDateStory });
    } catch (error) {
      console.error("Error filtering stories by date:", error.message);
      res.status(500).json({ error: true, message: "Internal server error" });
    }
  });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assests", express.static(path.join(__dirname, "assests")));




app.listen(8000, () => console.log("Server is running on port 8000"));

module.exports = app;
