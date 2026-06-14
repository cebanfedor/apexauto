const {sendJson, methodNotAllowed} = require("../_lib/http");
const {requireAdmin} = require("../_lib/auth");
const supabase = require("../_lib/supabase");

async function getLatestLeads(){
  const params = {
    select:"*,customers(name,phone),vehicles(make,model,year,lot)",
    order:"created_at.desc",
    limit:8
  };
  try{
    return await supabase.list("leads", params);
  }catch(error){
    return supabase.list("leads", {...params, select:"*"});
  }
}

module.exports = async function handler(request, response){
  if(!requireAdmin(request, response)) return;
  if(request.method !== "GET"){
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try{
    const [customersCount, leadsCount, vehiclesCount, latestLeads] = await Promise.all([
      supabase.count("customers"),
      supabase.count("leads"),
      supabase.count("vehicles"),
      getLatestLeads()
    ]);

    sendJson(response, 200, {
      ok:true,
      stats:{
        customers:customersCount,
        leads:leadsCount,
        vehicles:vehiclesCount
      },
      latestLeads
    });
  }catch(error){
    sendJson(response, error.status || 500, {ok:false,error:error.message,details:error.details || null});
  }
};
