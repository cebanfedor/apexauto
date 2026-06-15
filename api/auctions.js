const {sendJson, methodNotAllowed, readBody, getQuery} = require("../server/http");
const supabase = require("../server/supabase");

const AUCTIONS_API_BASE = "https://auctionsapi.com/api";
const CACHE_TTL = 7 * 60 * 1000;
const cache = new Map();

function cacheKey(action, params){
  return `${action}:${Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}=${v}`).join("&")}`;
}

function getCached(key){
  const item = cache.get(key);
  if(!item || item.expires < Date.now()){
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCached(key, value){
  cache.set(key, {value, expires:Date.now() + CACHE_TTL});
}

function safeName(value){
  return value && typeof value === "object" ? value.name || value.title || value.value || "" : String(value || "");
}

function safeNumber(value){
  if(value && typeof value === "object"){
    return safeNumber(value.value || value.amount || value.usd || value.price || value.bid);
  }
  const number = Number(String(value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function normalizeAuction(value){
  const text = String(value || "").toLowerCase();
  if(text.includes("iaai")) return "iaai";
  return "copart";
}

function auctionsApiDomain(auction){
  return auction === "iaai" ? "iaai_com" : "copart_com";
}

function auctionUrl(auction, lot){
  if(!lot) return "";
  return auction === "iaai"
    ? `https://www.iaai.com/VehicleDetail/${encodeURIComponent(lot)}~US`
    : `https://www.copart.com/lot/${encodeURIComponent(lot)}`;
}

function imageList(value){
  const sources = [
    value?.images?.normal,
    value?.images?.big,
    value?.images,
    value?.photos,
    value?.photo,
    value?.image,
    value?.image_url,
    value?.thumbnail
  ];
  const list = [];
  for(const source of sources){
    if(Array.isArray(source)) list.push(...source);
    else if(source) list.push(source);
  }
  return list
    .map(item => typeof item === "string" ? item : item?.url || item?.src || "")
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index);
}

function saleStatusRaw(item, lot){
  return [
    item?.sale_status,
    item?.saleStatus,
    item?.bid_status,
    item?.bidStatus,
    item?.condition,
    item?.sale_type,
    lot?.sale_status,
    lot?.saleStatus,
    lot?.bid_status,
    lot?.bidStatus,
    lot?.condition,
    lot?.sale_type
  ].map(safeName).find(Boolean) || "";
}

function saleStatusLabel(value){
  const text = String(value || "").toLowerCase();
  if(/no\s*reserve|without\s*reserve/.test(text)) return "Без резерва";
  if(/on\s*approval|\bapproval\b/.test(text)) return "На утверждении";
  if(/minimum\s*bid|minimum\s*reserve|min\s*bid/.test(text)) return "Минимальный резерв";
  if(/timed\s*auction|\btimed\b/.test(text)) return "Аукцион timed";
  return value ? safeName(value) : "";
}

function lotStatus(item, lot){
  const text = [
    item?.status,
    item?.lot_status,
    item?.lotStatus,
    lot?.status,
    lot?.lot_status,
    lot?.lotStatus
  ].map(safeName).find(Boolean) || "";
  const lowered = text.toLowerCase();
  if(lowered.includes("sold")) return "sold";
  if(lowered.includes("buy")) return "buy now";
  if(lowered.includes("upcoming") || lowered.includes("future")) return "upcoming";
  if(lowered.includes("live") || lowered.includes("active")) return "live";
  return text || "live";
}

function normalizeLot(source, fallbackAuction = "copart"){
  const item = source?.data && !Array.isArray(source.data) ? source.data : source;
  const lots = Array.isArray(item?.lots) ? item.lots : [];
  const lot = lots[0] || item?.lot || item;
  const auction = normalizeAuction(item?.auction || lot?.auction || fallbackAuction);
  const make = safeName(item?.manufacturer || item?.make || item?.brand);
  const model = safeName(item?.model);
  const year = safeNumber(item?.year);
  const lotNumber = String(lot?.lot || lot?.lot_number || lot?.lotNumber || lot?.external_id || item?.lot || item?.lot_number || item?.lotNumber || "").replace(/~.*/, "");
  const title = item?.title || [year, make, model].filter(Boolean).join(" ") || "Автомобиль";
  const location = safeName(lot?.location || lot?.branch || lot?.selling_branch || item?.location);
  const primaryDamage = safeName(lot?.damage?.main || lot?.primary_damage || lot?.primaryDamage || item?.primary_damage || item?.damage);
  const secondaryDamage = safeName(lot?.damage?.second || lot?.secondary_damage || lot?.secondaryDamage || item?.secondary_damage);
  const odometer = safeNumber(lot?.odometer?.mi || lot?.odometer || item?.odometer || item?.mileage);
  const currentBid = safeNumber(lot?.bid || lot?.current_bid || lot?.currentBid || item?.current_bid || item?.bid);
  const buyNow = safeNumber(lot?.buy_now || lot?.buyNow || item?.buy_now || item?.buyNow);
  const rawSaleStatus = saleStatusRaw(item, lot);
  const images = imageList(lot).length ? imageList(lot) : imageList(item);

  return {
    id:`${auction}-${lotNumber || item?.vin || Math.random().toString(36).slice(2)}`,
    auction,
    title,
    year,
    make,
    model,
    vin:item?.vin || lot?.vin || "",
    lot:lotNumber,
    url:auctionUrl(auction, lotNumber),
    location,
    auctionDate:lot?.sale_date || lot?.auction_date || lot?.saleDate || lot?.date || "",
    currentBid,
    buyNow,
    odometer,
    odometerText:odometer ? `${odometer.toLocaleString("en-US")} mi` : "",
    primaryDamage,
    secondaryDamage,
    damage:[primaryDamage, secondaryDamage].filter(Boolean).join(" / "),
    document:safeName(lot?.detailed_title || lot?.title || lot?.document || item?.document),
    fuel:safeName(item?.fuel || lot?.fuel),
    engine:safeName(item?.engine || lot?.engine),
    transmission:safeName(item?.transmission || lot?.transmission),
    drive:safeName(item?.drive || item?.drive_type || lot?.drive),
    body:safeName(item?.body_type || item?.vehicle_type || lot?.body_type),
    cylinders:safeName(item?.cylinders || lot?.cylinders),
    color:safeName(item?.color || lot?.color),
    keys:safeName(item?.keys || lot?.keys),
    estimatedRetailValue:safeNumber(lot?.actual_cash_value || lot?.estimated_retail_value || item?.estimated_retail_value || item?.acv),
    seller:safeName(lot?.seller || item?.seller),
    lotStatus:lotStatus(item, lot),
    saleStatus:saleStatusLabel(rawSaleStatus),
    saleStatusRaw:rawSaleStatus,
    images,
    image:images[0] || "",
    source:item
  };
}

function findItems(payload){
  if(Array.isArray(payload)) return payload;
  const candidates = [
    payload?.data?.items,
    payload?.data?.lots,
    payload?.data?.results,
    payload?.data?.cars,
    payload?.data,
    payload?.items,
    payload?.lots,
    payload?.results,
    payload?.cars
  ];
  for(const value of candidates){
    if(Array.isArray(value)) return value;
  }
  return [];
}

function buildSearchParams(query){
  const params = new URLSearchParams();
  const map = {
    q:"search_query",
    make:"make",
    model:"model",
    yearFrom:"year_from",
    yearTo:"year_to",
    bidFrom:"bid_from",
    bidTo:"bid_to",
    buyNowFrom:"buy_now_from",
    buyNowTo:"buy_now_to",
    mileageFrom:"odometer_from",
    mileageTo:"odometer_to",
    body:"body_type",
    fuel:"fuel",
    damage:"damage",
    document:"title",
    location:"location",
    auctionDate:"sale_date",
    lotStatus:"status",
    saleStatus:"sale_status"
  };
  for(const [from, to] of Object.entries(map)){
    const value = query.get(from);
    if(value) params.set(to, value);
  }
  params.set("page", query.get("page") || "1");
  params.set("per_page", query.get("limit") || "24");
  return params;
}

async function fetchJson(url){
  const key = process.env.AUCTIONS_API_KEY;
  if(!key){
    const error = new Error("AUCTIONS_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
  const response = await fetch(url, {
    headers:{
      "x-api-key":key,
      "accept":"application/json"
    }
  });
  const payload = await response.json().catch(() => null);
  if(!response.ok || payload?.error){
    const error = new Error(payload?.message || payload?.error || "Auctions API request failed");
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function fetchSearch(query){
  const auction = normalizeAuction(query.get("auction"));
  const params = buildSearchParams(query);
  const domain = auctionsApiDomain(auction);
  params.set("domain", domain);
  const attempts = [
    `${AUCTIONS_API_BASE}/cars?${params}`,
    `${AUCTIONS_API_BASE}/search/${auction}?${params}`,
    `${AUCTIONS_API_BASE}/search-lots/${auction}?${params}`,
    `${AUCTIONS_API_BASE}/lots/${auction}?${params}`,
    `${AUCTIONS_API_BASE}/search?auction=${auction}&${params}`
  ];

  let lastError;
  for(const url of attempts){
    try{
      const payload = await fetchJson(url);
      const items = findItems(payload).map(item => normalizeLot(item, auction));
      return {
        items,
        total:safeNumber(payload?.total || payload?.count || payload?.data?.total || payload?.data?.count) || items.length,
        page:safeNumber(query.get("page")) || 1,
        hasMore:items.length >= safeNumber(query.get("limit") || 24)
      };
    }catch(error){
      lastError = error;
    }
  }
  throw lastError || new Error("Auctions search failed");
}

async function fetchDetail(query){
  const auction = normalizeAuction(query.get("auction"));
  const lot = String(query.get("lot") || "").replace(/[^\w-]/g, "");
  if(!lot){
    const error = new Error("Missing lot");
    error.status = 400;
    throw error;
  }

  const params = new URLSearchParams({prices_history:"1"});
  if(auction === "iaai") params.set("search_by_id", "1");
  const domains = [auctionsApiDomain(auction), auction];
  let lastError;
  for(const domain of domains){
    try{
      const payload = await fetchJson(`${AUCTIONS_API_BASE}/search-lot/${encodeURIComponent(lot)}/${domain}?${params}`);
      return normalizeLot(payload, auction);
    }catch(error){
      lastError = error;
    }
  }
  throw lastError || new Error("Lot detail failed");
}

function sortItems(items, sort){
  const list = [...items];
  if(sort === "price_asc") return list.sort((a, b) => (a.currentBid || a.buyNow || 0) - (b.currentBid || b.buyNow || 0));
  if(sort === "price_desc") return list.sort((a, b) => (b.currentBid || b.buyNow || 0) - (a.currentBid || a.buyNow || 0));
  if(sort === "year_desc") return list.sort((a, b) => (b.year || 0) - (a.year || 0));
  if(sort === "mileage_asc") return list.sort((a, b) => (a.odometer || 0) - (b.odometer || 0));
  return list.sort((a, b) => String(a.auctionDate || "").localeCompare(String(b.auctionDate || "")));
}

async function handleLead(request, response){
  if(request.method !== "POST"){
    methodNotAllowed(response, ["POST"]);
    return;
  }
  try{
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    if(!name || !phone){
      sendJson(response, 400, {ok:false,error:"Введите имя и телефон"});
      return;
    }

    const existing = await supabase.list("customers", {select:"*", phone:`eq.${phone}`, limit:1}).catch(() => []);
    const customer = existing[0] || await supabase.create("customers", {
      name,
      phone,
      status:"Новый",
      source:"Аукционы"
    });

    const lead = await supabase.create("leads", {
      customer_id:customer?.id || null,
      title:`Заявка по лоту ${body.auction || ""} ${body.lot || ""}`.trim(),
      message:[
        body.comment,
        body.vin ? `VIN: ${body.vin}` : "",
        body.lot ? `LOT: ${body.lot}` : "",
        body.auction ? `Аукцион: ${String(body.auction).toUpperCase()}` : ""
      ].filter(Boolean).join("\n"),
      status:"Новый",
      source:"Аукционы"
    });

    sendJson(response, 200, {ok:true,customer,lead});
  }catch(error){
    sendJson(response, error.status || 500, {ok:false,error:"Не удалось отправить заявку. Напишите нам в Telegram или попробуйте позже."});
  }
}

module.exports = async function handler(request, response){
  const query = getQuery(request);
  const action = query.get("action") || "search";

  if(action === "lead") return handleLead(request, response);
  if(request.method !== "GET"){
    methodNotAllowed(response, ["GET","POST"]);
    return;
  }

  const key = cacheKey(action, query);
  const cached = getCached(key);
  if(cached){
    sendJson(response, 200, {...cached, cached:true});
    return;
  }

  try{
    if(action === "detail"){
      const lot = await fetchDetail(query);
      const payload = {ok:true,lot};
      setCached(key, payload);
      sendJson(response, 200, payload);
      return;
    }

    if(action === "search"){
      const result = await fetchSearch(query);
      const payload = {ok:true,...result,items:sortItems(result.items, query.get("sort") || "soon")};
      setCached(key, payload);
      sendJson(response, 200, payload);
      return;
    }

    sendJson(response, 404, {ok:false,error:"Unknown auctions action"});
  }catch(error){
    sendJson(response, error.status || 502, {
      ok:false,
      error:error.status === 500 ? "Каталог временно недоступен: не настроен API ключ." : "Каталог аукционов временно недоступен. Попробуйте обновить страницу позже."
    });
  }
};
