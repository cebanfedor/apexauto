const {sendJson, methodNotAllowed} = require("../_lib/http");
const {clearSessionCookie} = require("../_lib/auth");

module.exports = async function handler(request, response){
  if(request.method !== "POST"){
    methodNotAllowed(response, ["POST"]);
    return;
  }

  response.setHeader("set-cookie", clearSessionCookie());
  sendJson(response, 200, {ok:true});
};
