const {createCrudHandler} = require("../_lib/crud");

module.exports = createCrudHandler({
  table:"customers",
  order:"created_at.desc",
  searchFields:["name","phone","telegram","whatsapp","email","source","status"],
  filters:["status","source"],
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
