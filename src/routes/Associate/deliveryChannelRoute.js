const express = require("express");
const {
  createDeliveryChannel,
  updateDeliveryChannel,
  getAllDeliveryChannels,
  softDeleteDeliveryChannel,
} = require("../../controllers/Associate/deliveryChannelController");

const router = express.Router();

router.post("/createDeliveryChannel", createDeliveryChannel);
router.put("/updateDeliveryChannel/:channelId", updateDeliveryChannel);
router.get("/getAllDeliveryChannels", getAllDeliveryChannels);
router.delete("/softDeleteDeliveryChannel/:channelId", softDeleteDeliveryChannel);

module.exports = router;