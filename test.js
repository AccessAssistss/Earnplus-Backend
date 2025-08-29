const axios = require("axios");

// ###############---------------Send OTP via SMS---------------###############
const sendOTP = async (mobile, otp) => {
  const url = "https://enterprise.smsgupshup.com/GatewayAPI/rest";

  const params = {
    method: "SendMessage",
    send_to: mobile,
    msg: `Dear Customer, ${otp} is the OTP for your login at jhatpatcash. In case you have not requested this, please contact us at info@jhatpatcash.com - L2G Fincap`,
    msg_type: "TEXT",
    userid: "2000254594",
    auth_scheme: "plain",
    password: "Gurgaon@2025",
    v: "1.1",
    format: "text",
  };

  try {
    const response = await axios.post(url, null, { params, timeout: 15000 });
    console.log(response)
    return true;
  } catch (error) {
    console.log(error)
    return false;
  }
};

sendOTP("9318472622", "123456")