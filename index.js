const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const mongoose = require("mongoose");

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

const userSchema = new mongoose.Schema({
  mobile: Number,
  otpVerified: Boolean
});

const userModel = mongoose.model("User", userSchema);
mongoose.connect("mongodb://localhost:27017/usersDB");

// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = "AC0d7457d10c2b1cd9f43b607296423561";
const authToken = "c24cbe065939dea1499646be6e1387d3";
const verifySid = "VA9f62c22099eed2db8a265549bd2fdfbc";
const client = require("twilio")(accountSid, authToken);


app.get("/", (req, res) => {
  res.send("hello");
})

app.post("/signup", async (req, res) => {
  const { mobile } = req.body;

  console.log(req.body);

  try {
    
    const userExists = await userModel.findOne({ mobile: mobile });
    // console.log(userExists);

    if (!userExists) {

      const verification = await client.verify.v2.services(verifySid).verifications.create({
        to: `+91${mobile}`,
        channel: 'sms',
      });
      console.log(verification.status);

      const user = new userModel({
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

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});