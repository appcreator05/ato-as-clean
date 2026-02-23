// auto-ads-clean.js

function isMobile() {
  return window.innerWidth <= 768;
}

function isExcluded(widget) {
  if (widget.closest("header")) return true;
  if (widget.closest("#featured")) return true;
  if (widget.classList.contains("PopularPosts")) return true;
  if (widget.closest(".top-banner")) return true;
  return false;
}

function loadSidebarAd(container) {
  const s1 = document.createElement("script");
  s1.textContent = `
    atOptions = {
      'key': '92569caa29c97be0ba5ca5837131631c',
      'format': 'iframe',
      'height': 250,
      'width': 300,
      'params': {}
    };
  `;
  container.appendChild(s1);

  const s2 = document.createElement("script");
  s2.src =
    "https://deridenightingalepartial.com/92569caa29c97be0ba5ca5837131631c/invoke.js?rand=" +
    Math.random();
  container.appendChild(s2);
}

function loadOtherAd(container) {
  let key, src, h, w;

  if (isMobile()) {
    key = "92569caa29c97be0ba5ca5837131631c";
    src =
      "https://deridenightingalepartial.com/92569caa29c97be0ba5ca5837131631c/invoke.js";
    h = 250;
    w = 300;
  } else {
    key = "828c9ac8b1661d73bc82c3a8f4f71073";
    src =
      "https://deridenightingalepartial.com/828c9ac8b1661d73bc82c3a8f4f71073/invoke.js";
    h = 90;
    w = 728;
  }

  const s1 = document.createElement("script");
  s1.textContent = `
    atOptions = {
      'key': '${key}',
      'format': 'iframe',
      'height': ${h},
      'width': ${w},
      'params': {}
    };
  `;
  container.appendChild(s1);

  const s2 = document.createElement("script");
  s2.src = src + "?rand=" + Math.random();
  container.appendChild(s2);
}

function insertAds() {
  // Sidebar Ads
  document.querySelectorAll("#sidebar .widget-content").forEach((w, i) => {
    if (isExcluded(w) || w.classList.contains("sb-done")) return;

    w.classList.add("sb-done");

    const box = document.createElement("div");
    box.className = "ad-box";
    w.appendChild(box);

    setTimeout(() => {
      loadSidebarAd(box);
    }, i * 500);
  });

  // Other Widget Ads
  document.querySelectorAll(".widget-content").forEach((w, i) => {
    if (
      w.closest("#sidebar") ||
      isExcluded(w) ||
      w.classList.contains("oth-done")
    )
      return;

    w.classList.add("oth-done");

    const box = document.createElement("div");
    box.className = "ad-box";
    w.appendChild(box);

    setTimeout(() => {
      loadOtherAd(box);
    }, i * 600);
  });
}

function injectStyle() {
  const style = document.createElement("style");
  style.textContent = `
    .ad-box{
      margin:15px auto;
      text-align:center;
    }
  `;
  document.head.appendChild(style);
}

// Auto run
document.addEventListener("DOMContentLoaded", () => {
  injectStyle();
  insertAds();
});