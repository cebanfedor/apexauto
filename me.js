const {sendJson, methodNotAllowed} = require("../_lib/http");
const {isAuthenticated} = require("../_lib/auth");

module.exports = async function handler(request, response){
  if(request.method !== "GET"){
    methodNotAllowed(response, ["GET"]);
    return;
  }

  sendJson(response, 200, {ok:true,authenticated:isAuthenticated(request)});
};
