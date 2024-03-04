const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors")

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

// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure
const accountSid = "AC0d7457d10c2b1cd9f43b607296423561";
const authToken = "ccf75a6fde909c89789fbc864215fce7";
const verifySid = "VA9f62c22099eed2db8a265549bd2fdfbc";
const client = require("twilio")(accountSid, authToken);


app.get("/",(req,res)=>{
  res.send("hello");
})

app.post("/signup", async (req,res)=>{
  const {mobile} = req.body;

  console.log(req.body);
  try {
    const verification = await client.verify.v2.services(verifySid).verifications.create({
      to: `+91${mobile}`,
      channel: 'sms',
    });

    console.log(verification.status);
    res.status(200).json({ success: true });
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
      code: otp,
    });

    console.log(verification_check.status);

    if (verification_check.status === 'approved') {
      // OTP is valid
      res.status(200).json({ success: true });
    } else {
      // Invalid OTP
      res.status(401).json({ error: 'Invalid OTP' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

app.listen(port,()=>{
    console.log(`server running on port ${port}`);
});