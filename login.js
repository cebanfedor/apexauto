const {readBody, sendJson, methodNotAllowed} = require("../_lib/http");
const {createSessionCookie, verifyPassword} = require("../_lib/auth");

module.exports = async function handler(request, response){
  if(request.method !== "POST"){
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try{
    const body = await readBody(request);
    if(!verifyPassword(body.password)){
      sendJson(response, 401, {ok:false,error:"Неверный пароль"});
      return;
    }
    response.setHeader("set-cookie", createSessionCookie());
    sendJson(response, 200, {ok:true});
  }catch(error){
    sendJson(response, 400, {ok:false,error:"Bad request"});
  }
};
