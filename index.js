const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const port = 3000;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: 'Content-Type, X-Requested-With',
};

app.use(cors(corsOptions));

// var token;
const key = "thisIsNotmySecret";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  mobile: Number,
  otpVerified: Boolean
});

const userModel = mongoose.model("User", userSchema);
mongoose.connect("mongodb+srv://m92064030:6PhuPPyQfYrDRwwZ@cluster0.0gelzu4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = "AC0d7457d10c2b1cd9f43b607296423561";
const authToken = "65948ac43a6824ff3f0e176cb5eb0d3e";
const verifySid = "VA9f62c22099eed2db8a265549bd2fdfbc";
const client = require("twilio")(accountSid, authToken);



app.get("/", (req, res) => {
  res.send("hello");
})

app.post("/signup", async (req, res) => {
  const { name,email,password,mobile } = req.body;

  // console.log(req.body);

  try {
    
    const userExists = await userModel.findOne({ mobile: mobile });
    // console.log(userExists);

    if (!userExists) {

      const verification = await client.verify.v2.services(verifySid).verifications.create({
        to: `+91${mobile}`,
        channel: 'sms',
      });
      console.log(verification.status);
    
      const hashedPassword = await bcrypt.hash(password,10);
      
      const user = new userModel({
        name: name,
        email: email,
        password: hashedPassword,
        mobile: mobile,
        otpVerified: false
      })
      user.save();

      res.status(200).json({ success: true });
    } else {
      res.status(409).json({ message: "User already exists, please login" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }

})

app.post('/verify', async (req, res) => {
  const { mobile, otp } = req.body;

  try {
    const verification_check = await client.verify.v2.services(verifySid).verificationChecks.create({
      to: `+91${mobile}`,
      code: otp
    });

    console.log(verification_check.status);

    if (verification_check.status === 'approved') {
      // OTP is valid
      await userModel.findOneAndUpdate({ mobile: mobile }, { $set: { otpVerified: true } });
      res.status(200).json({ success: true });
    } else {
      // Invalid OTP
      res.status(401).json({ error: 'Invalid OTP' });
    }
  } catch (error) {
    console.error(error);
    await userModel.findOneAndDelete({ mobile: mobile });
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

app.post("/login", async (req,res)=>{
  const {email , password} = req.body;

  try {
    const userExists = await userModel.findOne({email: email});

    if(!userExists){
      res.status(401).json({ error: 'Invalid credentials'});
    } 

    const passwordMatch = await bcrypt.compare(password , userExists.password);
    if(!passwordMatch){
      res.status(401).json({ message: 'Incorrect password' });
    }

    const token = jwt.sign({userId: userExists._id}, key);

    // jwt.verify(token, key, (err, decoded) => {
    //   if (err) {
    //     return res.status(401).json({ error: err });
    //   }
  
    //    verifiedToken= decoded.userId;
    // });

    // res.status(200).json({verifiedToken});
    res.status(200).json({token});


  
  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'User not found'});
  }
})

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  console.log(token);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - Token not provided' });
  }

  jwt.verify(token, key, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: err });
    }

    req.userId = decoded.userId;
    next();
  });
};

app.post("/profile" , verifyToken , async(req,res)=>{
  res.json({user: req.userId});
})

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});