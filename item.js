const {createItemHandler} = require("../_lib/crud");

module.exports = createItemHandler({
  table:"vehicles",
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
