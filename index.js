const {createCrudHandler} = require("../_lib/crud");

module.exports = createCrudHandler({
  table:"vehicles",
  order:"created_at.desc",
  searchFields:["vin","lot","make","model","status"],
  filters:["status"],
  allowedFields:[
    "vin",
    "lot",
    "year",
    "make",
    "model",
    "description",
    "price",
    "status",
    "photos",
    "auction",
    "auction_url",
    "mileage",
    "damage",
    "fuel",
    "engine"
  ]
});
