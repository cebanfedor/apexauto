(function(){
  const $ = selector => document.querySelector(selector);
  const state = {
    auction:"copart",
    page:1,
    hasMore:false,
    loading:false,
    items:[],
    selectedLot:null
  };

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  function money(value){
    const number = Number(value || 0);
    return number ? `$${Math.round(number).toLocaleString("en-US")}` : "—";
  }

  function dateText(value){
    if(!value) return "—";
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    return date.toLocaleDateString("ru-RU");
  }

  function saleClass(value){
    const text = String(value || "").toLowerCase();
    if(text.includes("без")) return "noReserve";
    if(text.includes("утверж")) return "approval";
    if(text.includes("миним")) return "minimum";
    if(text.includes("timed")) return "timed";
    return "";
  }

  function lotTitle(lot){
    return [lot.year, lot.make, lot.model].filter(Boolean).join(" ") || lot.title || "Автомобиль";
  }

  function detailHref(lot){
    return `/auctions/${encodeURIComponent(lot.auction)}-${encodeURIComponent(lot.lot)}`;
  }

  function calcHref(lot){
    const url = lot.url || (lot.auction === "iaai"
      ? `https://www.iaai.com/VehicleDetail/${lot.lot}~US`
      : `https://www.copart.com/lot/${lot.lot}`);
    return `/index.html?lot=${encodeURIComponent(url)}`;
  }

  async function api(path, options = {}){
    const response = await fetch(path, {
      credentials:"same-origin",
      headers: options.body ? {"content-type":"application/json"} : undefined,
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if(!response.ok || payload.ok === false) throw new Error(payload.error || "Запрос не выполнен");
    return payload;
  }

  function formParams(){
    const form = $("#auctionFiltersForm");
    const params = new URLSearchParams(new FormData(form));
    const quick = $("#auctionQuickSearch").value.trim();
    if(quick) params.set("q", quick);
    params.set("auction", state.auction);
    params.set("sort", $("#auctionSort").value);
    params.set("page", state.page);
    params.set("limit", "24");
    Array.from(params.entries()).forEach(([key, value]) => {
      if(!value) params.delete(key);
    });
    return params;
  }

  function setMessage(text){
    const box = $("#auctionMessage");
    box.hidden = !text;
    box.textContent = text || "";
  }

  function renderCard(lot){
    const title = lotTitle(lot);
    return `<article class="auctionCardV1">
      <a class="auctionCardImageV1" href="${detailHref(lot)}">
        ${lot.image ? `<img src="${escapeHtml(lot.image)}" alt="${escapeHtml(title)}" loading="lazy">` : ""}
        <span class="auctionChipV1">${escapeHtml(lot.auction.toUpperCase())}</span>
      </a>
      <div class="auctionCardBodyV1">
        <h3>${escapeHtml(title)}</h3>
        <div class="auctionBadgesV1">
          <span class="lotStatusV1">${escapeHtml(lot.lotStatus || "Live")}</span>
          ${lot.saleStatus ? `<span class="saleBadgeV1 ${saleClass(lot.saleStatus)}">${escapeHtml(lot.saleStatus)}</span>` : ""}
        </div>
        <div class="auctionPriceRowV1">
          <strong>Ставка<br>${money(lot.currentBid)}</strong>
          <strong>Buy Now<br>${money(lot.buyNow)}</strong>
        </div>
        <div class="auctionMetaGridV1">
          <div><span>VIN</span><b>${escapeHtml(lot.vin || "—")}</b></div>
          <div><span>LOT</span><b>${escapeHtml(lot.lot || "—")}</b></div>
          <div><span>Локация</span><b>${escapeHtml(lot.location || "—")}</b></div>
          <div><span>Дата торгов</span><b>${escapeHtml(dateText(lot.auctionDate))}</b></div>
          <div><span>Пробег</span><b>${escapeHtml(lot.odometerText || "—")}</b></div>
          <div><span>Повреждение</span><b>${escapeHtml(lot.damage || "—")}</b></div>
          <div><span>Документ</span><b>${escapeHtml(lot.document || "—")}</b></div>
          <div><span>Топливо</span><b>${escapeHtml(lot.fuel || "—")}</b></div>
          <div><span>Двигатель</span><b>${escapeHtml(lot.engine || "—")}</b></div>
          <div><span>КПП / привод</span><b>${escapeHtml([lot.transmission, lot.drive].filter(Boolean).join(" / ") || "—")}</b></div>
        </div>
        <div class="auctionCardActionsV1">
          <a class="auctionBtnGhostV1" href="${detailHref(lot)}">Подробнее</a>
          <a class="auctionBtnGhostV1" href="${calcHref(lot)}">Рассчитать доставку</a>
          <button class="auctionBtnPrimaryV1 fullV1" type="button" data-lead="${escapeHtml(lot.id)}">Оставить заявку</button>
        </div>
      </div>
    </article>`;
  }

  function renderCards(append = false){
    const box = $("#auctionCards");
    const html = state.items.map(renderCard).join("");
    box.innerHTML = append ? box.innerHTML + html : html;
    $("#loadMoreLots").hidden = !state.hasMore;
  }

  async function loadLots({append = false} = {}){
    if(state.loading) return;
    state.loading = true;
    setMessage("");
    if(!append) $("#auctionCards").innerHTML = "";
    try{
      const payload = await api(`/api/auctions?action=search&${formParams()}`);
      state.hasMore = Boolean(payload.hasMore);
      const nextItems = payload.items || [];
      state.items = append ? state.items.concat(nextItems) : nextItems;
      $("#auctionResultCount").textContent = payload.total || state.items.length || 0;
      $("#auctionResultLabel").textContent = payload.cached ? "лотов найдено · кэш" : "лотов найдено";
      renderCards(false);
      if(!state.items.length) setMessage("По этим фильтрам лоты не найдены. Попробуйте изменить параметры поиска.");
    }catch(error){
      state.hasMore = false;
      $("#loadMoreLots").hidden = true;
      $("#auctionResultCount").textContent = "0";
      setMessage(error.message || "Каталог временно недоступен. Попробуйте позже.");
    }finally{
      state.loading = false;
    }
  }

  function currentSlug(){
    const match = location.pathname.match(/^\/auctions\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : new URLSearchParams(location.search).get("slug");
  }

  function parseSlug(slug){
    const match = String(slug || "").match(/^(copart|iaai)-(.+)$/i);
    return match ? {auction:match[1].toLowerCase(), lot:match[2]} : null;
  }

  function setSeo(lot){
    const title = `${lotTitle(lot)} — ${lot.auction.toUpperCase()} Lot ${lot.lot} | ApexAuto`;
    const description = `Лот ${lot.auction.toUpperCase()} ${lot.lot}: ${lotTitle(lot)}, VIN ${lot.vin || "не указан"}, пробег ${lot.odometerText || "не указан"}, повреждение ${lot.damage || "не указано"}, дата торгов ${dateText(lot.auctionDate)}.`;
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    if(lot.image) setMeta("property", "og:image", lot.image);
  }

  function setMeta(type, key, value){
    const selector = type === "property" ? `meta[property="${key}"]` : `meta[name="${key}"]`;
    let meta = document.querySelector(selector);
    if(!meta){
      meta = document.createElement("meta");
      if(type === "property") meta.setAttribute("property", key);
      else meta.setAttribute("name", key);
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", value);
  }

  function spec(label, value){
    return `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value || "—")}</b></div>`;
  }

  function renderDetail(lot){
    const images = lot.images?.length ? lot.images : [lot.image].filter(Boolean);
    const title = lotTitle(lot);
    $("#auctionCatalog").hidden = true;
    const detail = $("#auctionDetail");
    detail.hidden = false;
    detail.innerHTML = `
      <a class="detailBackV1" href="/auctions">← Вернуться к каталогу</a>
      <section class="auctionDetailPanelV1">
        <div class="detailHeroV1">
          <div class="detailGalleryV1">
            <img id="detailMainImage" class="detailMainImageV1" src="${escapeHtml(images[0] || "")}" alt="${escapeHtml(title)}">
            <div class="detailThumbsV1">
              ${images.map(src => `<img src="${escapeHtml(src)}" alt="${escapeHtml(title)}" data-detail-image="${escapeHtml(src)}">`).join("")}
            </div>
          </div>
          <div class="detailInfoV1">
            <span class="auctionsKickerV1">${escapeHtml(lot.auction.toUpperCase())} LOT ${escapeHtml(lot.lot || "")}</span>
            <h1>${escapeHtml(title)}</h1>
            <div class="auctionBadgesV1">
              <span class="lotStatusV1">${escapeHtml(lot.lotStatus || "Live")}</span>
              ${lot.saleStatus ? `<span class="saleBadgeV1 ${saleClass(lot.saleStatus)}">${escapeHtml(lot.saleStatus)}</span>` : ""}
            </div>
            <div class="auctionPriceRowV1">
              <strong>Текущая ставка<br>${money(lot.currentBid)}</strong>
              <strong>Buy Now<br>${money(lot.buyNow)}</strong>
            </div>
            <div class="detailActionsV1">
              <a class="auctionBtnGhostV1" href="${calcHref(lot)}">Рассчитать доставку</a>
              <button class="auctionBtnPrimaryV1" type="button" data-lead="${escapeHtml(lot.id)}">Оставить заявку</button>
            </div>
          </div>
        </div>
        <div class="detailSpecGridV1">
          ${spec("VIN", lot.vin)}
          ${spec("LOT", lot.lot)}
          ${spec("Аукцион", lot.auction?.toUpperCase())}
          ${spec("Локация", lot.location)}
          ${spec("Дата торгов", dateText(lot.auctionDate))}
          ${spec("Пробег", lot.odometerText)}
          ${spec("Primary damage", lot.primaryDamage)}
          ${spec("Secondary damage", lot.secondaryDamage)}
          ${spec("Документ / Title", lot.document)}
          ${spec("Двигатель", lot.engine)}
          ${spec("КПП", lot.transmission)}
          ${spec("Привод", lot.drive)}
          ${spec("Цилиндры", lot.cylinders)}
          ${spec("Топливо", lot.fuel)}
          ${spec("Цвет", lot.color)}
          ${spec("Ключи", lot.keys)}
          ${spec("Estimated retail value", money(lot.estimatedRetailValue))}
          ${spec("Seller", lot.seller)}
        </div>
      </section>
      <section class="detailTextBlocksV1">
        <article>
          <h2>Почему стоит проверить этот лот перед покупкой</h2>
          <p>Перед ставкой важно сверить историю, документы, реальные повреждения, статус запуска и итоговую стоимость доставки. Это помогает не переплатить и заранее понимать бюджет восстановления.</p>
        </article>
        <article>
          <h2>ApexAuto assistance</h2>
          <p>Мы помогаем с проверкой лота, расчетом под ключ, участием в торгах, документами, логистикой и сопровождением автомобиля до выдачи в Молдове.</p>
        </article>
      </section>
    `;
    state.selectedLot = lot;
    setSeo(lot);
  }

  async function loadDetailFromUrl(){
    const slug = parseSlug(currentSlug());
    if(!slug) return false;
    $("#auctionCatalog").hidden = true;
    $("#auctionDetail").hidden = false;
    $("#auctionDetail").innerHTML = '<div class="auctionMessageV1">Загружаем данные лота...</div>';
    try{
      const payload = await api(`/api/auctions?action=detail&auction=${encodeURIComponent(slug.auction)}&lot=${encodeURIComponent(slug.lot)}`);
      renderDetail(payload.lot);
    }catch(error){
      $("#auctionDetail").innerHTML = `<a class="detailBackV1" href="/auctions">← Вернуться к каталогу</a><div class="auctionMessageV1">${escapeHtml(error.message || "Лот временно недоступен.")}</div>`;
    }
    return true;
  }

  function openLead(lot){
    state.selectedLot = lot;
    const modal = $("#leadModal");
    const form = $("#auctionLeadForm");
    form.vin.value = lot.vin || "";
    form.lot.value = lot.lot || "";
    form.auction.value = lot.auction?.toUpperCase() || "";
    $("#leadFormStatus").textContent = "";
    modal.hidden = false;
    document.body.classList.add("leadModalOpenV1");
  }

  function closeLead(){
    const modal = $("#leadModal");
    if(modal) modal.hidden = true;
    document.body.classList.remove("leadModalOpenV1");
  }

  async function submitLead(event){
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    $("#leadFormStatus").textContent = "Отправляем заявку...";
    try{
      await api("/api/auctions?action=lead", {method:"POST", body:data});
      $("#leadFormStatus").textContent = "Заявка отправлена. Мы свяжемся с вами.";
      form.name.value = "";
      form.phone.value = "";
      form.comment.value = "";
    }catch(error){
      $("#leadFormStatus").textContent = error.message;
    }
  }

  function bindEvents(){
    $("#auctionSearchBtn").addEventListener("click", () => { state.page = 1; loadLots(); });
    $("#auctionQuickSearch").addEventListener("keydown", event => {
      if(event.key === "Enter"){ event.preventDefault(); state.page = 1; loadLots(); }
    });
    $("#auctionSort").addEventListener("change", () => { state.page = 1; loadLots(); });
    document.querySelectorAll("[data-auction-switch]").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-auction-switch]").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        state.auction = button.dataset.auctionSwitch;
        state.page = 1;
        loadLots();
      });
    });
    $("#auctionFiltersForm").addEventListener("submit", event => {
      event.preventDefault();
      state.page = 1;
      document.body.classList.remove("filtersOpenV1");
      loadLots();
    });
    $("#resetFiltersBtn").addEventListener("click", () => {
      $("#auctionFiltersForm").reset();
      $("#auctionQuickSearch").value = "";
      state.page = 1;
      loadLots();
    });
    $("#loadMoreLots").addEventListener("click", () => {
      state.page += 1;
      loadLots({append:true});
    });
    $("#openFiltersBtn").addEventListener("click", () => document.body.classList.add("filtersOpenV1"));
    $("#closeFiltersBtn").addEventListener("click", () => document.body.classList.remove("filtersOpenV1"));
    document.addEventListener("click", event => {
      if(event.target.closest("#openFiltersBtn")) document.body.classList.add("filtersOpenV1");
      if(event.target.closest("#closeFiltersBtn")) document.body.classList.remove("filtersOpenV1");
      const leadButton = event.target.closest("[data-lead]");
      if(leadButton){
        const lot = state.items.find(item => item.id === leadButton.dataset.lead) || state.selectedLot;
        if(lot) openLead(lot);
      }
      const thumb = event.target.closest("[data-detail-image]");
      if(thumb && $("#detailMainImage")) $("#detailMainImage").src = thumb.dataset.detailImage;
      if(event.target.closest("[data-close-lead]") || event.target.id === "leadModal") closeLead();
    });
    document.addEventListener("keydown", event => {
      if(event.key === "Escape") closeLead();
    });
    $("#auctionLeadForm").addEventListener("submit", submitLead);
  }

  async function initAuctions(){
    closeLead();
    bindEvents();
    const isDetail = await loadDetailFromUrl();
    if(!isDetail) loadLots();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initAuctions);
  }else{
    initAuctions();
  }
})();
