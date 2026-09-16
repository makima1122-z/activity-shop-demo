const DESIGN_WIDTH = 3200;
const DESIGN_HEIGHT = 1440;

const categories = [
  {
    id: "limited",
    label: "限时福利",
    icon: "./assets/category-limited.png"
  },
  {
    id: "growth",
    label: "养成材料",
    icon: "./assets/category-growth.png"
  },
  {
    id: "basic",
    label: "基础物资",
    icon: "./assets/category-basic.png"
  },
  {
    id: "permanent",
    label: "建造材料",
    icon: "./assets/category-permanent.png"
  }
];

const baseProducts = [
  { id: "high-a", name: "高级体能药水", quality: "purple", rarity: "#9140b2", price: 8000, original: 10000, stock: 10, maxStock: 10, discount: true },
  { id: "high-b", name: "高级体能药水", quality: "purple", rarity: "#9140b2", price: 10000, stock: 10, maxStock: 10 },
  { id: "high-c", name: "高级体能药水", quality: "purple", rarity: "#9140b2", price: 10000, stock: 6, maxStock: 6, unlimited: true },
  { id: "mid-a", name: "中级体能药水", quality: "blue", rarity: "#4654c8", price: 8000, original: 10000, stock: 10, maxStock: 10, discount: true },
  { id: "mid-b", name: "中级体能药水", quality: "blue", rarity: "#4654c8", price: 10000, stock: 8, maxStock: 8, unlimited: true },
  { id: "low-a", name: "初级体能药水", quality: "green", rarity: "#37a476", price: 10000, stock: 12, maxStock: 12 },
  { id: "low-b", name: "初级体能药水", quality: "green", rarity: "#37a476", price: 10000, stock: 12, maxStock: 12 },
  { id: "low-c", name: "初级体能药水", quality: "green", rarity: "#37a476", price: 10000, stock: 12, maxStock: 12, unlimited: true },
  { id: "sold-a", name: "初级体能药水", quality: "purple", rarity: "#713184", price: 10000, stock: 0, maxStock: 10 },
  { id: "lock-a", name: "高级体能药水", quality: "purple", rarity: "#35123f", price: 10000, stock: 10, maxStock: 10, locked: true, mission: "物资搜集III" },
  { id: "lock-b", name: "中级体能药水", quality: "blue", rarity: "#151b54", price: 10000, stock: 10, maxStock: 10, locked: true, mission: "裂隙调查II" },
  { id: "lock-c", name: "初级体能药水", quality: "green", rarity: "#0e452d", price: 10000, stock: 10, maxStock: 10, locked: true, mission: "活动等级达到10级" }
];

// 各分类共用按品质定价的数据，折扣商品以品质原价计算八折价格。
const qualityPrices = { purple: 10000, blue: 8000, green: 6000 };
baseProducts.forEach(product => {
  const originalPrice = qualityPrices[product.quality];
  product.price = product.discount ? originalPrice * .8 : originalPrice;
  if (product.discount) product.original = originalPrice;
});

const productSets = {
  limited: baseProducts,
  growth: baseProducts.map((item, index) => ({ ...item, image: "./assets/potion2.png", id: `growth-${index}`, name: index < 3 ? "角色经验补剂" : index < 7 ? "技能培养液" : "突破催化剂" })),
  basic: baseProducts.map((item, index) => ({ ...item, image: "./assets/potion3.png", id: `basic-${index}`, name: index < 4 ? "基础补给药剂" : index < 7 ? "战备补给液" : "特殊补给剂" })),
  permanent: []
};

let balance = 800000;
let selectedCategory = "limited";
const limitedCountdown = document.getElementById("limitedCountdown");
// 演示活动从页面打开起持续 6 天 18 小时 59 分，可替换为真实活动结束时间。
const activityEndsAt = Date.now() + ((6 * 24 + 18) * 60 + 59) * 60 * 1000;

function updateCountdown() {
  const remainingMinutes = Math.max(0, Math.ceil((activityEndsAt - Date.now()) / 60000));
  const days = Math.floor(remainingMinutes / 1440);
  const hours = Math.floor(remainingMinutes % 1440 / 60);
  const minutes = remainingMinutes % 60;
  limitedCountdown.querySelector("span").textContent = remainingMinutes === 0
    ? "活动已结束"
    : `剩余 ${days}天 ${hours}时 ${String(minutes).padStart(2, "0")}分`;
}

function updateCountdownVisibility() {
  if (!limitedCountdown) return;

  limitedCountdown.hidden = selectedCategory !== "limited";
}
let selectedProduct = null;
let quantity = 1;
let basicFailedOnce = false;

const stage = document.querySelector("#stage");
const shopView = document.querySelector("#shopView");
const errorView = document.querySelector("#errorView");
const categoryNav = document.querySelector("#categoryNav");
const productGrid = document.querySelector("#productGrid");
const emptyState = document.querySelector("#emptyState");
const balanceText = document.querySelector("#balanceText");
const walletButton = document.querySelector("#walletButton");
const coinTip = document.querySelector("#coinTip");

function closeCoinTip() {
  coinTip.hidden = true;
  walletButton.setAttribute("aria-expanded", "false");
}
const unlockTip = document.querySelector("#unlockTip");
const missionName = document.querySelector("#missionName");
const modalLayer = document.querySelector("#modalLayer");
const successLayer = document.querySelector("#successLayer");
const exitLayer = document.querySelector("#exitLayer");
const toast = document.querySelector("#toast");

function fitStage() {
  const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function renderCategories() {
  categoryNav.innerHTML = categories.map(category => `
    <button 
    class="category-button ${category.id === selectedCategory ? "active" : ""}" data-category="${category.id}" type="button">
      <img
      class="nav-icon"
      src="${category.icon}"
      alt=""
      aria-hidden="true"
      >
      <span>${category.label}</span>
    </button>
  `).join("");
}

function renderProducts() {
  const qualityOrder = { purple: 0, blue: 1, green: 2 };
  const products = [...productSets[selectedCategory]].sort((a, b) => {
    const stateA = a.locked ? 2 : a.stock <= 0 ? 1 : 0;
    const stateB = b.locked ? 2 : b.stock <= 0 ? 1 : 0;
    if (stateA !== stateB) return stateA - stateB;
    if (stateA > 0) return (qualityOrder[a.quality] ?? 99) - (qualityOrder[b.quality] ?? 99);
    return 0;
  });
  emptyState.hidden = products.length !== 0;
  productGrid.hidden = products.length === 0;
  unlockTip.hidden = true;

  productGrid.innerHTML = products.map(product => {
    const sold = product.stock <= 0;
    const classes = ["product-card", sold ? "sold" : "", product.locked ? "locked" : ""].filter(Boolean).join(" ");
    const state = sold
      ? `<div class="state-band">已售罄</div>`
      : product.locked
        ? `<div class="state-band">未解锁 <span class="help-dot">?</span></div>`
        : "";
    return `
      <button class="${classes}" style="--rarity:${product.rarity}" data-product="${product.id}" type="button" aria-label="${product.name}${sold ? "，已售罄" : product.locked ? "，未解锁" : ""}">
        ${product.discount ? `<span class="discount">8折</span>` : ""}
        ${!product.unlimited && !product.locked ? `<span class="stock">${product.stock}/${product.maxStock}</span>` : ""}
        <span class="product-art"><img src="${product.image || './assets/potion.png'}" alt=""></span>
        <span class="product-name">${product.name}</span>
        <span class="price-row"><span class="coin">C</span><span class="price-values"><strong class="${balance < product.price ? 'insufficient' : ''}">${formatNumber(product.price)}</strong>${product.original ? `<span class="old-price">${formatNumber(product.original)}</span>` : ""}</span></span>
        ${state}
      </button>
    `;
  }).join("");
  if (products.length > 0) {
    productGrid.insertAdjacentHTML("beforeend", '<div class="product-placeholder" aria-hidden="true"></div>'.repeat(3));
  }
}

function renderAll() {
  balanceText.textContent = formatNumber(balance);
  renderCategories();
  renderProducts();
}

function selectCategory(categoryId) {
  closeCoinTip();
  productGrid.scrollTop = 0;
  selectedCategory = categoryId;

  // 只有“限时福利”显示倒计时
  const limitedCountdown = document.getElementById("limitedCountdown");

  if (limitedCountdown) {
    limitedCountdown.hidden = categoryId !== "limited";
  }

  if (categoryId === "basic" && !basicFailedOnce) {
    basicFailedOnce = true;
    shopView.hidden = true;
    errorView.hidden = false;
    return;
  }

  shopView.hidden = false;
  errorView.hidden = true;

  renderAll();
}

function findProduct(productId) {
  return productSets[selectedCategory].find(product => product.id === productId);
}

function openProduct(product) {
  selectedProduct = product;
  quantity = 1;
  const sold = product.stock <= 0;
  document.querySelector("#modalTitle").textContent = product.name;
  document.querySelector("#modalStock").textContent = product.unlimited ? "不限购" : sold ? "可购买：0/10" : `可购买：${product.stock}/${product.maxStock}`;
  document.querySelector("#modalStock").hidden = Boolean(product.unlimited);
  document.querySelector("#modalArt").style.backgroundColor = product.rarity;
  document.querySelector("#modalArt img").src = product.image || "./assets/potion.png";
  document.querySelector("#modalArt img").alt = product.name;
  document.querySelector("#modalSoldBadge").hidden = !sold;
  document.querySelector("#quantityArea").hidden = sold;
  document.querySelector("#soldArea").hidden = !sold;
  document.querySelector("#purchaseSummary").hidden = sold;
  document.querySelector("#purchaseButton").disabled = sold;
  document.querySelector("#purchaseButton").textContent = sold ? "购买" : "购买";
  modalLayer.hidden = false;
  document.querySelector(".description-scroll").scrollTop = 0;
  updateQuantityUI();
  document.querySelector("#modalClose").focus();
}

function maxPurchasable() {
  if (!selectedProduct) return 1;
  const affordable = Math.floor(balance / selectedProduct.price);
  return Math.max(1, selectedProduct.unlimited ? affordable : Math.min(selectedProduct.stock, affordable));
}

function updateQuantityUI() {
  if (!selectedProduct || selectedProduct.stock <= 0) return;
  const max = maxPurchasable();
  quantity = Math.max(1, Math.min(quantity, max));
  document.querySelector("#quantityLabel").textContent = quantity;
  document.querySelector("#quantitySlider").max = max;
  document.querySelector("#quantitySlider").value = quantity;
  document.querySelector("#quantitySlider").style.setProperty("--slider-progress", `${max > 1 ? (quantity - 1) / (max - 1) * 100 : 0}%`);
  document.querySelector("#maxLabel").textContent = max;
  document.querySelector("#totalPrice").textContent = formatNumber(selectedProduct.price * quantity);
  document.querySelector("#totalPrice").classList.toggle("insufficient", balance < selectedProduct.price * quantity);
  document.querySelector("#decreaseButton").disabled = quantity <= 1;
  document.querySelector("#increaseButton").disabled = quantity >= max;
  document.querySelector("#maxButton").disabled = quantity >= max;
  document.querySelector("#purchaseButton").disabled = balance < selectedProduct.price || selectedProduct.stock <= 0;
}

function showUnlockTip(card, product) {
  missionName.textContent = product.mission;
  unlockTip.hidden = false;
  const left = Math.min(card.offsetLeft + card.offsetWidth - 40, productGrid.clientWidth - 430);
  unlockTip.style.left = `${left}px`;
  unlockTip.style.top = `${productGrid.offsetTop + card.offsetTop - productGrid.scrollTop + 185}px`;
}

function closeModal() {
  modalLayer.hidden = true;
  selectedProduct = null;
}

function purchase() {
  if (!selectedProduct || selectedProduct.stock <= 0) return;
  const total = selectedProduct.price * quantity;
  if (total > balance) {
    showToast("活动货币不足");
    return;
  }
  balance -= total;
  if (!selectedProduct.unlimited) selectedProduct.stock -= quantity;
  balanceText.textContent = formatNumber(balance);
  document.querySelector("#rewardQuantity").textContent = quantity;
  document.querySelector("#rewardName").textContent = selectedProduct.name;
  document.querySelector(".reward-card").style.backgroundColor = selectedProduct.rarity;
  document.querySelector(".reward-card img").alt = selectedProduct.name;
  document.querySelector(".reward-card img").src = selectedProduct.image || "./assets/potion.png";
  renderProducts();
  modalLayer.hidden = true;
  successLayer.hidden = false;
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
}

categoryNav.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (button) selectCategory(button.dataset.category);
});

walletButton.addEventListener("click", () => {
  const opening = coinTip.hidden;
  coinTip.hidden = !opening;
  walletButton.setAttribute("aria-expanded", String(opening));
  if (opening) unlockTip.hidden = true;
});
document.querySelector("#goActivityButton").addEventListener("click", () => {
  closeCoinTip();
  showToast("前往活动：完成活动任务、通关活动关卡可获得金币");
});

productGrid.addEventListener("click", event => {
  const card = event.target.closest("[data-product]");
  if (!card) return;
  const product = findProduct(card.dataset.product);
  if (!product) return;
  if (product.locked) showUnlockTip(card, product);
  else openProduct(product);
});
productGrid.addEventListener("scroll", () => { unlockTip.hidden = true; });

document.querySelector("#retryButton").addEventListener("click", () => {
  errorView.hidden = true;
  shopView.hidden = false;
  renderAll();
});
document.querySelector("#modalClose").addEventListener("click", closeModal);
document.querySelector("#decreaseButton").addEventListener("click", () => { quantity -= 1; updateQuantityUI(); });
document.querySelector("#increaseButton").addEventListener("click", () => { quantity += 1; updateQuantityUI(); });
document.querySelector("#maxButton").addEventListener("click", () => { quantity = maxPurchasable(); updateQuantityUI(); });
document.querySelector("#quantitySlider").addEventListener("input", event => { quantity = Number(event.target.value); updateQuantityUI(); });
document.querySelector("#purchaseButton").addEventListener("click", purchase);
document.querySelector("#goMissionButton").addEventListener("click", () => {
  unlockTip.hidden = true;
  showToast(`前往任务：${missionName.textContent}`);
});
document.addEventListener("pointerdown", event => {
  if (!coinTip.hidden && !event.target.closest("#coinTip, #walletButton")) closeCoinTip();
  if (!unlockTip.hidden && !event.target.closest("#unlockTip") && !event.target.closest(".product-card.locked")) unlockTip.hidden = true;
  if (!toast.hidden && !event.target.closest("#toast")) toast.hidden = true;
});
successLayer.addEventListener("click", event => {
  if (event.target === successLayer || event.target.closest(".success-content")) {
    successLayer.hidden = true;
    selectedProduct = null;
    renderAll();
  }
});
document.querySelector("#exitButton").addEventListener("click", () => { exitLayer.hidden = false; });
document.querySelector("#reopenButton").addEventListener("click", () => { exitLayer.hidden = true; });
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!coinTip.hidden) {
      closeCoinTip();
      walletButton.focus();
      return;
    }
    if (!successLayer.hidden) successLayer.hidden = true;
    else if (!modalLayer.hidden) closeModal();
    else if (!unlockTip.hidden) unlockTip.hidden = true;
  }
});
window.addEventListener("resize", fitStage);

function enableDragScroll(element) {
  let drag = null;
  let suppressClick = false;
  element.addEventListener("dragstart", event => event.preventDefault());
  element.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch" || event.button !== 0) return;
    suppressClick = false;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      top: element.scrollTop,
      left: element.scrollLeft,
      scale: element.getBoundingClientRect().width / element.offsetWidth,
      moved: false
    };
  });
  element.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      element.setPointerCapture(event.pointerId);
      element.classList.add("is-dragging");
    }
    event.preventDefault();
    element.scrollTop = drag.top - dy / drag.scale;
    element.scrollLeft = drag.left - dx / drag.scale;
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved;
    drag = null;
    element.classList.remove("is-dragging");
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  }
  element.addEventListener("pointerup", finishDrag);
  element.addEventListener("pointercancel", finishDrag);
  element.addEventListener("lostpointercapture", finishDrag);
  element.addEventListener("pointerleave", event => {
    if (drag && !drag.moved) finishDrag(event);
  });
  element.addEventListener("click", event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);
}

document.querySelectorAll(".product-grid, .description-scroll").forEach(enableDragScroll);

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const categoryIds = categories.map(category => category.id);

  Promise.resolve(context.registerTool({
    name: "select_shop_category",
    title: "切换商店分类",
    description: "切换活动商店当前显示的商品分类。",
    inputSchema: {
      type: "object",
      properties: { category: { type: "string", enum: categoryIds } },
      required: ["category"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || !categoryIds.includes(input.category)) throw new Error("无效的商品分类");
      basicFailedOnce = true;
      selectCategory(input.category);
      return { category: input.category, itemCount: productSets[input.category].length };
    }
  })).catch(() => {});

  Promise.resolve(context.registerTool({
    name: "purchase_shop_item",
    title: "购买商店商品",
    description: "按商品编号和数量完成一次活动商店购买，并更新余额与库存。",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string" },
        quantity: { type: "integer", minimum: 1 }
      },
      required: ["productId", "quantity"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || typeof input.productId !== "string" || !Number.isInteger(input.quantity) || input.quantity < 1) throw new Error("购买参数无效");
      const product = Object.values(productSets).flat().find(item => item.id === input.productId);
      if (!product) throw new Error("商品不存在");
      if (product.locked) throw new Error("商品尚未解锁");
      if (product.stock < input.quantity) throw new Error("商品库存不足");
      const total = product.price * input.quantity;
      if (total > balance) throw new Error("活动货币不足");
      balance -= total;
      product.stock -= input.quantity;
      balanceText.textContent = formatNumber(balance);
      renderProducts();
      return { productId: product.id, quantity: input.quantity, total, balance, remainingStock: product.stock };
    }
  })).catch(() => {});
}

fitStage();
updateCountdown();
setInterval(updateCountdown, 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateCountdown();
});
renderAll();
registerWebMcpTools();
