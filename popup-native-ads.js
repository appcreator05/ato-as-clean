// popup-native-ads.js

function injectStyle() {
  const style = document.createElement("style");
  style.textContent = `
  #adPopupOverlay{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.7);
    display:none;
    justify-content:center;
    align-items:center;
    z-index:99999;
  }

  #adPopupBox{
    background:#fff;
    width:90%;
    max-width:450px;
    border-radius:14px;
    position:relative;
    animation:popIn .4s ease;
  }

  #adPopupClose{
    position:absolute;
    top:-12px;
    right:-12px;
    background:#ff2d2d;
    color:#fff;
    width:34px;
    height:34px;
    border-radius:50%;
    text-align:center;
    line-height:34px;
    font-size:18px;
    cursor:pointer;
  }

  @keyframes popIn{
    from{transform:scale(.7);opacity:0}
    to{transform:scale(1);opacity:1}
  }

  @media(max-width:768px){

    #adPopupOverlay{
      align-items:flex-end;
    }

    #adPopupBox{
      width:100%;
      max-width:95%;
      animation:slideUp .4s ease;
    }

    #adPopupClose{
      top:-45px;
      right:15px;
    }

  }

  @keyframes slideUp{
    from{transform:translateY(100%)}
    to{transform:translateY(0)}
  }
  `;
  document.head.appendChild(style);
}

function createPopup() {
  const overlay = document.createElement("div");
  overlay.id = "adPopupOverlay";

  overlay.innerHTML = `
    <div id="adPopupBox">
      <div id="adPopupClose">&#10006;</div>
      <div id="nativeAdContainer"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Load native ad script dynamically
  const adScript = document.createElement("script");
  adScript.async = true;
  adScript.src = "https://deridenightingalepartial.com/d8af83a0f7dcbd8a856dc764e334430f/invoke.js";
  document.getElementById("nativeAdContainer").appendChild(adScript);

  const adDiv = document.createElement("div");
  adDiv.id = "container-d8af83a0f7dcbd8a856dc764e334430f";
  document.getElementById("nativeAdContainer").appendChild(adDiv);

  return overlay;
}

function initPopup() {
  const overlay = createPopup();

  // Show after delay
  window.addEventListener("load", () => {
    setTimeout(() => {
      overlay.style.display = "flex";
    }, 1500);
  });

  // Close event
  document.addEventListener("click", (e) => {
    if (e.target.id === "adPopupClose") {
      overlay.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  injectStyle();
  initPopup();
});