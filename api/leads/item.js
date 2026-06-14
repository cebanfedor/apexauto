const {createItemHandler} = require("../_lib/crud");

module.exports = createItemHandler({
  table:"leads",
  allowedFields:[
    "customer_id",
    "vehicle_id",
    "title",
    "message",
    "status",
    "source",
    "budget",
    "next_contact_at"
  ]
});
