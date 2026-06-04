
const SEA={nj:{label:"Elizabeth, NJ",price:2400},savannah:{label:"Savannah, GA",price:2400},houston:{label:"Houston, TX",price:2600},indianapolis:{label:"Indianapolis, IN",price:2600},la:{label:"Los Angeles, CA",price:3150}};
const YEAR_NOW=2026;
const GASOLINE_RATES={"0-2":[9.56,12.23,18.90,31.14,55.60],"3-4":[10,12.67,19.34,31.68,56.04],"5-6":[10.23,12.90,19.57,31.81,56.27],"7":[11.25,14.19,21.53,34.99,61.90],"8":[12.38,15.61,23.68,38.49,68.09],"9":[13.62,17.17,26.05,42.34,74.90],"10":[16.34,20.60,31.26,50.81,89.87],"11":[21.24,26.79,40.63,66.05,116.84],"12":[26.24,31.79,45.79,71.05,121.84],"13":[31.24,36.79,50.63,76.05,126.84],"14":[36.24,41.79,55.63,81.05,131.84],"15":[41.24,46.79,60.63,86.05,136.84],"16":[46.24,51.79,65.63,91.05,141.84],"17":[51.24,56.79,70.63,96.05,146.84],"18":[56.24,61.79,75.63,101.05,151.84],"19":[61.24,66.79,80.63,106.05,156.84],"20+":[66.24,71.79,85.63,111.05,161.84]};
const DIESEL_RATES={"0-2":[12.23,31.14,55.60],"3-4":[12.67,31.58,56.04],"5-6":[12.90,31.81,56.27],"7":[14.19,34.99,61.90],"8":[15.61,38.49,68.90],"9":[17.17,42.34,74.90],"10":[20.60,50.81,89.87],"11":[26.79,66.05,116.84],"12":[31.79,71.05,121.84],"13":[36.79,76.05,126.84],"14":[41.79,81.05,131.84],"15":[46.79,86.05,136.84],"16":[51.79,91.05,141.84],"17":[56.79,96.05,146.84],"18":[61.79,101.05,151.84],"19":[66.79,106.05,156.84],"20+":[71.79,111.05,161.84]};
const LUXURY_RATES=[{min:600000,max:700000,pct:2},{min:700001,max:800000,pct:3},{min:800001,max:900000,pct:4},{min:900001,max:1000000,pct:5},{min:1000001,max:1200000,pct:6},{min:1200001,max:1400000,pct:7},{min:1400001,max:1600000,pct:8},{min:1600001,max:1800000,pct:9},{min:1800001,max:Infinity,pct:10}];
const AUCTION_FEE_POINTS=[[0,300],[1000,450],[3000,700],[5000,925],[10000,1100],[15000,1250],[20000,1550],[30000,2150],[50000,3300],[75000,4700],[100000,6000]];
const $=id=>document.getElementById(id),num=id=>Number($(id)?.value||0);let currency="usd",selectedLocation=null,lastCalc=null;
function moneyUsd(v){return "$"+Math.round(v||0).toLocaleString("en-US")}function moneyMdl(v){return Math.round(v||0).toLocaleString("ru-RU")+" MDL"}function moneyEur(v){return "€"+Math.round(v||0).toLocaleString("en-US")}
function usdToMdl(v){return v*num("usdMdl")}function mdlToUsd(v){return v/num("usdMdl")}function mdlToEur(v){return v/num("eurMdl")}
function displayUsd(usd){if(currency==="mdl")return moneyMdl(usdToMdl(usd));if(currency==="eur")return moneyEur(usdToMdl(usd)/num("eurMdl"));return moneyUsd(usd)}
function displayMdl(mdl){if(currency==="mdl")return moneyMdl(mdl);if(currency==="eur")return moneyEur(mdlToEur(mdl));return moneyUsd(mdlToUsd(mdl))}
function interpolateFee(price){if(price<=0)return 0;for(let i=0;i<AUCTION_FEE_POINTS.length-1;i++){let [x1,y1]=AUCTION_FEE_POINTS[i],[x2,y2]=AUCTION_FEE_POINTS[i+1];if(price>=x1&&price<=x2){let fee=y1+(y2-y1)*((price-x1)/(x2-x1));return Math.ceil(fee/10)*10}}return Math.ceil(price*0.06/10)*10}
function calculateAuctionFee(){let auction=$("auction").value,price=num("lotPrice"),total=interpolateFee(price);if(auction==="iaai")total+=50;if(auction==="manheim"){if(price<=5000)total=820;else if(price<=15000)total=1070;else if(price<=30000)total=1570;else total=Math.max(1570,Math.ceil(price*.08/10)*10+370)}return{total,detail:""}}
function initYears(){const y=$("year");y.innerHTML="";for(let year=2027;year>=1980;year--){let o=document.createElement("option");o.value=year;o.textContent=year;if(year===2026)o.selected=true;y.appendChild(o)}}
function initLiters(){const e=$("engineLiters");e.innerHTML="";for(let i=1;i<=70;i++){let v=(i/10).toFixed(1),o=document.createElement("option");o.value=v;o.textContent=`${v} л`;if(v==="2.0")o.selected=true;e.appendChild(o)}}
function normalizeAuction(v){return String(v||"").toLowerCase().replace(/\s+/g,"")}function matchesAuction(item){let a=normalizeAuction(item.auction),s=$("auction").value;if(s==="copart")return a.includes("copart");if(s==="iaai")return a.includes("iaai");return a.includes("manheim")||a.includes("manhei")}
function getFilteredLocations(){return (window.LOCATIONS||[]).filter(matchesAuction)}
function initLocations(){let select=$("location");select.innerHTML='<option value="">Выбери локацию</option>';getFilteredLocations().forEach((item,i)=>{let o=document.createElement("option");o.value=String(i);o.textContent=item.displayName||"Локация";select.appendChild(o)})}
function updateLocation(){let idx=$("location").value;selectedLocation=idx===""?null:getFilteredLocations()[Number(idx)];if(!selectedLocation){$("portView").value="—";$("landView").value="0";return}$("portView").value=selectedLocation.portLabel||SEA[selectedLocation.autoPort]?.label||"—";$("landView").value=getLandShipping().toFixed(0)}
function getLandMultiplier(){let t=$("vehicleType").value;if(t==="moto"||t==="atv")return .8;if(t==="suv"||t==="pickup")return 1.5;return 1}
function getLandShipping(){if(!selectedLocation)return 0;const base=Number(selectedLocation.landPrice||selectedLocation.autoLand||0)*getLandMultiplier();const offsite=$("offsite")&&$("offsite").checked?100:0;return base+offsite}
function getSeaShipping(){let type=$("vehicleType").value,fuel=$("fuel").value;if(type==="moto")return 900;if(type==="atv")return 1200;let port=selectedLocation?.autoPort||"nj",price=SEA[port]?.price||2400,green=["hybrid","phev","electric"].includes(fuel);if(type==="crossover")price+=green?300:200;else if(type==="suv")price+=300;else if(type==="pickup")price+=500;else if(green)price+=100;return price}
function ageKey(){let age=Math.max(0,YEAR_NOW-num("year"));if(age<=2)return"0-2";if(age<=4)return"3-4";if(age<=6)return"5-6";if(age>=20)return"20+";return String(age)}
function gasolineColumn(cc){if(cc<=1000)return 0;if(cc<=1500)return 1;if(cc<=2000)return 2;if(cc<=3000)return 3;return 4}function dieselColumn(cc){if(cc<=1500)return 0;if(cc<=2500)return 1;return 2}
function fuelDiscount(){let f=$("fuel").value;if(f==="phev")return .5;if(f==="hybrid")return .75;return 1}function luxuryPct(mdl){let r=LUXURY_RATES.find(x=>mdl>=x.min&&mdl<=x.max);return r?r.pct:0}
function customsMdl(customsBaseMdl, luxuryBaseMdl){
  const type = $("vehicleType").value;
  const fuel = $("fuel").value;

  // Мото и пикапы:
  // НДС 20% считается от: стоимость лота + аукционный сбор + доставка морем.
  // Доставка по США, страховка и прочие расходы в базу не входят.
  // Для пикапа правило одинаковое, даже если он электрический.
  if(type === "moto" || type === "pickup"){
    const vat = customsBaseMdl * 0.20;
    return {
      total: vat,
      baseExcise: vat,
      luxury: 0,
      luxuryPct: 0,
      luxuryBase: luxuryBaseMdl,
      text: "НДС 20% от таможенной стоимости"
    };
  }

  const luxuryBase = Number(luxuryBaseMdl || 0);
  const pct = luxuryPct(luxuryBase);
  const luxury = luxuryBase >= 600000 ? luxuryBase * pct / 100 : 0;

  if(fuel === "electric"){
    return {
      total: luxury,
      baseExcise: 0,
      luxury,
      luxuryPct: pct,
      luxuryBase,
      text: luxury > 0
        ? `электро: акциз 0 · люкс ${pct}% от ${(Math.round(luxuryBase)).toLocaleString("ru-RU")} MDL`
        : `электро: акциз 0 · люкс 0%`
    };
  }

  const cc = Math.round(num("engineLiters") * 1000);
  const key = ageKey();
  const rate = fuel === "diesel"
    ? DIESEL_RATES[key][dieselColumn(cc)]
    : GASOLINE_RATES[key][gasolineColumn(cc)];

  const baseExcise = cc * rate * fuelDiscount();
  const discount = fuel === "hybrid" ? " · гибрид -25%" : fuel === "phev" ? " · plug-in -50%" : "";

  return {
    total: baseExcise + luxury,
    baseExcise,
    luxury,
    luxuryPct: pct,
    luxuryBase,
    text: luxury > 0
      ? `${cc} см³ × ${rate} MDL/см³${discount} · люкс ${pct}%`
      : `${cc} см³ × ${rate} MDL/см³${discount} · люкс 0%`
  };
}


function companyFee(auctionFee = 0){
  const base = num("lotPrice") + Number(auctionFee || 0);
  if(base > 40000){
    return base * 0.01;
  }
  return 300;
}

function row(name,value,detail,type="usd"){
  let shown = type === "mdl" ? displayMdl(value) : displayUsd(value);
  return `<div class="row"><span>${name}${detail ? `<small>${detail}</small>` : ""}</span><b>${shown}</b></div>`;
}
function calculate(){
  updateLocation();

  const lot = num("lotPrice");
  const afd = calculateAuctionFee();
  const auctionFee = afd.total;

  $("auctionFeeView").value = Math.round(auctionFee).toString();

  const land = getLandShipping();
  const sea = getSeaShipping();
  const exportDocs = $("exportDocs").checked ? 400 : 0;
  const carfax = 0;
  const insurance = $("insurance").checked ? (lot + auctionFee) * 0.01 : 0;
  const company = companyFee(auctionFee);

  // Важно:
  // базовый акциз считаем по таблице двигателя;
  // налог на роскошь считаем только от: лот + аукционный сбор + море.
  // Суша по США и страховка в luxury base не входят.
  const luxuryBaseMdl = usdToMdl(lot + auctionFee + sea);
  const customsBaseMdl = usdToMdl(lot + auctionFee + sea);
  const customs = customsMdl(customsBaseMdl, luxuryBaseMdl);

  const totalUsdPart = lot + auctionFee + land + sea + exportDocs + carfax + insurance + company;
  const totalMdl = usdToMdl(totalUsdPart) + customs.total;
  const totalUsd = mdlToUsd(totalMdl);
  const route = selectedLocation ? selectedLocation.displayName : "Локация не выбрана";

  $("total").textContent = currency === "mdl" ? moneyMdl(totalMdl) : currency === "eur" ? moneyEur(mdlToEur(totalMdl)) : moneyUsd(totalUsd);
  $("subTotal").textContent = `${moneyUsd(totalUsd)} / ${moneyMdl(totalMdl)} / ${moneyEur(mdlToEur(totalMdl))}`;
  $("chosenRoute").textContent = route;
  if($("auctionBadge")) $("auctionBadge").textContent = $("auction").value.toUpperCase();
  $("insuranceWarning").classList.toggle("hidden", $("insurance").checked);

  const rows = [
    ["Стоимость лота", lot, "", "usd"],
    ["Аукционный сбор", auctionFee, afd.detail, "usd"],
    ["Доставка по США", land, selectedLocation ? route : "выбери локацию", "usd"],
    ["Доставка в Chișinău", sea, selectedLocation ? selectedLocation.portLabel : "", "usd"],
    ["Экспортные документы", exportDocs, exportDocs ? "включены" : "отключены", "usd"],
    ["Страховка", insurance, "", "usd"],
    ["Сопровождение APEX AUTO", company, "", "usd"],
    ["Таможенные платежи", customs.baseExcise, customs.text, "mdl"]
  ];

  if(customs.luxury > 0){
    rows.push([
      "Доп. акциз люкс",
      customs.luxury,
      `считается от лот + аукцион + море: ${Math.round(customs.luxuryBase).toLocaleString("ru-RU")} MDL · ${customs.luxuryPct}%`,
      "mdl"
    ]);
  }

  $("breakdown").innerHTML = rows.map(r => row(...r)).join("");
  lastCalc = { route, totalUsd, totalMdl, rows, lot, auction: $("auction").value };
  updateShare();
}

function textCalc(){if(!lastCalc)calculate();let lines=lastCalc.rows.filter(x=>x[1]>0||x[0].includes("Carfax")).map(x=>`• ${x[0]} — ${x[3]==="mdl"?displayMdl(x[1]):displayUsd(x[1])}`);return["🚗 APEX AUTO | Расчет под ключ","",`Лот: ${moneyUsd(lastCalc.lot)}`,`Аукцион: ${lastCalc.auction.toUpperCase()}`,`Локация: ${lastCalc.route}`,"",...lines,"",`✅ Итого: ${moneyUsd(lastCalc.totalUsd)}`,`${moneyMdl(lastCalc.totalMdl)} | ${moneyEur(mdlToEur(lastCalc.totalMdl))}`,"","Расчет предварительный."].join("\n")}
function updateShare(){$("tgBtn").href=`https://t.me/share/url?url=&text=${encodeURIComponent(textCalc())}`}
async function copyCalc(){try{await navigator.clipboard.writeText(textCalc());$("copyBtn").textContent="Скопировано";setTimeout(()=>$("copyBtn").textContent="Скопировать расчет",1200)}catch(e){alert(textCalc())}}
function downloadPng(){alert("PNG добавим следующим этапом. Сейчас расчет можно скопировать или отправить в Telegram.")}
document.addEventListener("DOMContentLoaded",()=>{
initYears();initLiters();initLocations();calculate();
  if($("offsite")){
    $("offsite").addEventListener("input", calculate);
    $("offsite").addEventListener("change", calculate);
  }
$("calcForm").addEventListener("submit",e=>{e.preventDefault();calculate()});["location","vehicleType","fuel","lotPrice","engineLiters","year","insurance","exportDocs","offsite","usdMdl","eurMdl"].forEach(id=>{if($(id)){$(id).addEventListener("input",calculate);$(id).addEventListener("change",calculate)}});$("auction").addEventListener("change",()=>{initLocations();$("location").value="";calculate()});document.querySelectorAll(".currency").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".currency").forEach(i=>i.classList.remove("active"));b.classList.add("active");currency=b.dataset.currency;calculate()}));$("copyBtn").addEventListener("click",copyCalc);$("pngBtn").addEventListener("click",downloadPng)});


function openTelegramMessage(text){
  const encoded = encodeURIComponent(text);
  window.open(`https://t.me/fedukusa?text=${encoded}`, "_blank");
}

document.addEventListener("DOMContentLoaded", () => {
  const selectionForm = document.getElementById("selectionForm");
  if(selectionForm){
    selectionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = [
        "Заявка на подбор авто | APEX AUTO",
        "",
        "Имя: " + (document.getElementById("leadName").value || "-"),
        "Телефон: " + (document.getElementById("leadPhone").value || "-"),
        "Telegram: " + (document.getElementById("leadTelegram").value || "-"),
        "Бюджет: " + (document.getElementById("leadBudget").value || "-"),
        "Авто: " + (document.getElementById("leadCar").value || "-")
      ].join("\\n");
      openTelegramMessage(msg);
    });
  }

  const checkForm = document.getElementById("checkForm");
  if(checkForm){
    checkForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = [
        "Бесплатная проверка автомобиля | APEX AUTO",
        "",
        "VIN / номер лота / ссылка:",
        document.getElementById("checkLot").value || "-"
      ].join("\\n");
      openTelegramMessage(msg);
    });
  }
});


// v57: clean VIN / lot check Telegram handler
document.addEventListener("DOMContentLoaded", () => {
  const checkForm = document.getElementById("checkForm");
  const checkInput = document.getElementById("checkLot");

  if (checkForm && checkInput && !checkForm.dataset.v57Bound) {
    checkForm.dataset.v57Bound = "true";

    checkForm.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const value = (checkInput.value || "").trim();

      if (!value) {
        checkInput.classList.add("inputErrorV57");
        checkInput.focus();
        checkInput.placeholder = "Введите VIN, номер лота или ссылку";
        return false;
      }

      checkInput.classList.remove("inputErrorV57");

      const message = [
        "Бесплатная проверка автомобиля | APEX AUTO",
        "",
        "Здравствуйте! Хочу бесплатно проверить автомобиль перед покупкой.",
        "",
        "VIN / номер лота / ссылка:",
        value,
        "",
        "Проверьте, пожалуйста:",
        "• историю автомобиля",
        "• документы",
        "• повреждения",
        "• возможные риски",
        "• ориентировочную стоимость под ключ до Кишинева"
      ].join("\n");

      const encoded = encodeURIComponent(message);
      window.open(`https://t.me/fedukusa?text=${encoded}`, "_blank", "noopener");
      return false;
    }, true);
  }
});





// v80: VAT note fallback for moto/pickup if render uses customs.text
document.addEventListener("DOMContentLoaded", () => {
  function isMotoPickupV80(){
    const el = document.getElementById("vehicleType")
      || document.querySelector('select[name="vehicleType"], select[name="bodyType"], select[name="carType"], select[name="transportType"]');
    const value = (el && (el.value || el.options?.[el.selectedIndex]?.text) || "").toString().toLowerCase();
    return value.includes("moto") || value.includes("мото") || value.includes("pickup") || value.includes("пикап");
  }

  function applyVatNoteV80(){
    if(!isMotoPickupV80()) return;
    const rows = Array.from(document.querySelectorAll(".row, .resultRow, li, div"));
    const customsRow = rows.find(row => /Таможенные платежи/i.test(row.textContent || ""));
    if(!customsRow) return;

    let small = customsRow.querySelector("small");
    if(!small){
      small = document.createElement("small");
      customsRow.appendChild(small);
    }
    small.textContent = "НДС 20% от таможенной стоимости";
  }

  document.addEventListener("change", () => setTimeout(applyVatNoteV80, 80), true);
  const form = document.getElementById("calcForm") || document.querySelector("form");
  if(form) form.addEventListener("submit", () => setTimeout(applyVatNoteV80, 80), true);
  setTimeout(applyVatNoteV80, 300);
});
