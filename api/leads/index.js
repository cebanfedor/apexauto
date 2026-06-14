const {createCrudHandler} = require("../_lib/crud");
const supabase = require("../_lib/supabase");

module.exports = createCrudHandler({
  table:"leads",
  select:"*,customers(name,phone,telegram),vehicles(make,model,year,lot,vin)",
  fallbackList: async params => supabase.list("leads", {...params, select:"*"}),
  order:"created_at.desc",
  searchFields:["title","message","status","source"],
  filters:["status","customer_id","vehicle_id"],
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
