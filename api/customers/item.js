const {createItemHandler} = require("../_lib/crud");

module.exports = createItemHandler({
  table:"customers",
  allowedFields:[
    "name",
    "phone",
    "telegram",
    "whatsapp",
    "email",
    "source",
    "status",
    "notes"
  ]
});
