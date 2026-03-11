// const Razorpay = require('razorpay');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// module.exports = razorpay; 

import Razorpay from 'razorpay';
import config from '../config/config.js';
const razorpay = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret
});
export default razorpay;
// This code initializes a Razorpay instance using the key ID and secret from the configuration file.