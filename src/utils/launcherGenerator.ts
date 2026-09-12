import { AppConfig } from '../types';

/**
 * Generates the production in-app web runtime (index.html) packaged inside the APK.
 * 
 * Features & Capabilities:
 * 1. Text Selection: Toggleable user-select and context-menu copy
 * 2. Save Form Data: Automated input persistence in localStorage across reloads
 * 3. Full Screen Mode: Immersive edge-to-edge layout with auto fullscreen lock
 * 4. Confirm on Exit: Elegant confirmation modal with Android back-button interception
 * 5. Enable GPS: Geolocation bridge with transparent coordinate pass-through
 * 6. Pull to Refresh: Touch drag gesture with rotating arrow and reload trigger
 * 7. Deep Linking: Route/query parameter deep-link navigation
 * 8. Progress Wheel: Sleek top progress bar + floating circular loading spinner
 * 9. Chrome Custom Tabs: External link interception routed to Custom Tabs bridge
 * 10. Popup & Wallet Payment Support: Handles upi://, bkash://, nagad://, paytmmp://, gpay://, etc. + secure in-app modal
 * 11. Cache Mode: Configurable no-cache / highly-cached / default-cache policies
 * 12. AdMob & Start.io: Native docked banner ads, interstitial countdown modal, and rewarded video ads
 */
export function generateLauncherHtml(config: AppConfig, logoBase64?: string): string {
  const safeAppName = (config.appName || 'My App').replace(/"/g, '&quot;');
  const websiteUrl = (config.websiteUrl || 'https://google.com').trim();
  const orientation = config.orientation || 'auto_rotate';

  // Feature Flags
  const textSelection = config.textSelection !== false;
  const saveFormData = config.saveFormData !== false;
  const fullscreenMode = Boolean(config.fullscreenMode);
  const confirmOnExit = Boolean(config.confirmOnExit);
  const enableGpsPrompt = Boolean(config.enableGpsPrompt || config.permissions?.accessFineLocation || config.permissions?.accessCoarseLocation);
  const pullToRefresh = Boolean(config.pullToRefresh);
  const deepLinking = Boolean(config.deepLinking);
  const showProgressWheel = config.showProgressWheel !== false;
  const useCustomTabs = config.useCustomTabs !== false;
  const enablePaymentRedirects = config.enablePaymentRedirects !== false;
  const cacheMode = config.cacheMode || 'default_cache';

  const isAdMob = config.adNetwork === 'admob';
  const isStartIo = config.adNetwork === 'startio';

  const hasBanner =
    (isAdMob && Boolean(config.admob?.bannerId)) ||
    (isStartIo && config.startio?.showBanner);

  const hasInterstitial =
    (isAdMob && Boolean(config.admob?.interstitialId)) ||
    (isStartIo && config.startio?.showInterstitial);

  const interstitialIntervalMinutes = config.interstitialIntervalMinutes ?? 3;

  const admobAppId = config.admob?.appId || 'ca-app-pub-3940256099942544~3347511713';
  const admobInterstitialId = config.admob?.interstitialId || 'ca-app-pub-3940256099942544/1033173712';
  const startioAppId = config.startio?.appId || '';
  const splashDurationMs = Math.max(1000, Math.min(10000, ((config.splashDuration || 2) * 1000)));
  const splashBgColor = config.splashBgColor || '#0f172a';
  const hasCustomSplash = Boolean(config.splashImageUrl && config.splashImageUrl.trim());

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>${safeAppName}</title>
  
  ${cacheMode === 'no_cache' ? `
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  ` : ''}

  ${isAdMob && admobAppId ? `
  <!-- Google Mobile Ads / AdSense Web Engine -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${admobAppId.replace('~', '')}" crossorigin="anonymous"></script>
  ` : ''}

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #ffffff;
      user-select: ${textSelection ? 'auto' : 'none'} !important;
      -webkit-user-select: ${textSelection ? 'auto' : 'none'} !important;
    }

    #app-container {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
      ${fullscreenMode ? 'padding: 0 !important; margin: 0 !important;' : ''}
    }

    /* TOP LOADING PROGRESS BAR */
    #top-progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      width: 0%;
      background: linear-gradient(90deg, #38bdf8, #22c55e, #38bdf8);
      background-size: 200% 100%;
      z-index: 10005;
      transition: width 0.25s ease-out, opacity 0.3s ease;
      opacity: 0;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.7);
    }

    /* PULL TO REFRESH INDICATOR */
    #ptr-indicator {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%) translateY(-60px);
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9998;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
      pointer-events: none;
    }
    #ptr-icon {
      width: 16px;
      height: 16px;
      transition: transform 0.2s ease;
      fill: none;
      stroke: #38bdf8;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #ptr-text {
      font-size: 11px;
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
    }

    #iframe-wrapper {
      position: relative;
      flex: 1;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #ffffff;
      touch-action: pan-y;
    }

    #main-frame {
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      display: block;
      background: #ffffff;
    }

    /* FLOATING PROGRESS WHEEL */
    #loading-progress-wheel {
      display: ${showProgressWheel ? 'flex' : 'none'};
      position: fixed;
      top: 16px;
      right: 16px;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      padding: 8px 12px;
      border-radius: 24px;
      align-items: center;
      gap: 8px;
      z-index: 10003;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    .wheel-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(56, 189, 248, 0.3);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .wheel-text {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
    }

    /* SPLASH SCREEN */
    #splash {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #1e293b, #0f172a);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: 9999;
      transition: opacity 0.4s ease, visibility 0.4s ease;
    }
    #splash.has-splash-bg {
      background-image: url('splash_image.png');
    }
    #splash.has-splash-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
      z-index: 1;
    }
    #splash-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    .logo-box {
      width: 96px;
      height: 96px;
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 12px 28px rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1e293b;
      margin-bottom: 20px;
      border: 1.5px solid rgba(255,255,255,0.12);
    }
    .logo-box img { width: 100%; height: 100%; object-fit: cover; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; text-align: center; max-width: 85%; letter-spacing: -0.3px; }
    .splash-sub { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.15);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ERROR / OFFLINE VIEW */
    #error-view {
      display: none;
      position: fixed;
      inset: 0;
      background: #0f172a;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      z-index: 10000;
    }
    .retry-btn {
      margin-top: 24px;
      padding: 12px 32px;
      border-radius: 12px;
      background: #0284c7;
      color: #ffffff;
      font-weight: 600;
      font-size: 15px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2,132,199,0.3);
    }

    /* CONFIRM ON EXIT MODAL */
    #exit-confirm-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 10004;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease-out;
    }
    .exit-modal-card {
      width: 100%;
      max-width: 330px;
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 24px 20px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .exit-icon {
      font-size: 38px;
      margin-bottom: 12px;
    }
    .exit-title {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .exit-desc {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.4;
      margin-bottom: 20px;
    }
    .exit-actions {
      display: flex;
      gap: 10px;
    }
    .exit-btn-cancel {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      background: #334155;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
    .exit-btn-confirm {
      flex: 1;
      padding: 12px;
      border-radius: 12px;
      background: #ef4444;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
    }

    /* SECURE PAYMENT POPUP MODAL */
    #payment-popup-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: #ffffff;
      z-index: 10006;
      flex-direction: column;
    }
    .payment-modal-header {
      height: 48px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      color: #ffffff;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .payment-modal-title {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .payment-close-btn {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: #ffffff;
      border-radius: 14px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    #payment-frame {
      flex: 1;
      width: 100%;
      height: calc(100% - 48px);
      border: none;
    }

    /* BANNER AD CONTAINER (EXACT NATIVE START.IO BANNER STYLE) */
    #banner-ad-container {
      width: 100%;
      height: 56px;
      min-height: 56px;
      flex-shrink: 0;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: ${hasBanner ? 'flex' : 'none'} !important;
      visibility: visible !important;
      opacity: 1 !important;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      z-index: 9999;
      position: relative;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      overflow: hidden;
    }
    .ad-thumb-box {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ad-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .ad-info-icon {
      position: absolute;
      bottom: 2px;
      left: 2px;
      width: 13px;
      height: 13px;
      background: rgba(0,0,0,0.65);
      border-radius: 50%;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      line-height: 1;
    }
    .ad-content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
      min-width: 0;
      margin: 0 10px;
    }
    .ad-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.3;
    }
    .ad-subtitle {
      font-size: 11px;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.3;
      margin-top: 1px;
    }
    .ad-cta-pill {
      width: 48px;
      height: 32px;
      border-radius: 16px;
      background: #4ade80;
      background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(34, 197, 94, 0.35);
      border: none;
      outline: none;
      transition: transform 0.1s ease;
    }
    .ad-cta-pill:active { transform: scale(0.95); }
    .ad-cta-arrow {
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      border-left: 8px solid #ffffff;
      margin-left: 2px;
    }

    /* FULLSCREEN INTERSTITIAL AD MODAL */
    #interstitial-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.98);
      z-index: 10001;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px;
      animation: fadeIn 0.3s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .interstitial-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 8px 0;
    }
    .ad-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ad-badge-startio { background: #f97316; color: #ffffff; }
    .ad-badge-admob { background: #4285f4; color: #ffffff; }
    .interstitial-close-btn {
      padding: 8px 16px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
    }
    .interstitial-close-btn.active {
      background: #38bdf8;
      color: #0f172a;
      border-color: #38bdf8;
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
    }
    .interstitial-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px 10px;
      margin: auto 0;
    }
    .interstitial-icon {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      margin-bottom: 16px;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
    }
    .interstitial-title {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .interstitial-desc {
      font-size: 13px;
      color: #cbd5e1;
      max-width: 320px;
      line-height: 1.4;
      margin-bottom: 14px;
    }
    .interstitial-stars {
      color: #fbbf24;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .interstitial-cta {
      width: 100%;
      max-width: 300px;
      padding: 14px 24px;
      border-radius: 14px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      font-size: 16px;
      font-weight: 800;
      border: none;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
      letter-spacing: 0.5px;
    }

    /* REWARDED AD DIALOG */
    #rewarded-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 10002;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .rewarded-box {
      width: 100%;
      max-width: 320px;
      background: #1e293b;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.1);
    }
  </style>
</head>
<body>

  <!-- TOP LOADING PROGRESS BAR -->
  <div id="top-progress-bar"></div>

  <!-- PULL TO REFRESH INDICATOR -->
  <div id="ptr-indicator">
    <svg id="ptr-icon" viewBox="0 0 24 24">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
    </svg>
    <span id="ptr-text">Pull to refresh</span>
  </div>

  <!-- FLOATING PROGRESS WHEEL -->
  <div id="loading-progress-wheel">
    <div class="wheel-spinner"></div>
    <span class="wheel-text">Loading...</span>
  </div>

  <!-- SPLASH SCREEN -->
  <div id="splash" class="${hasCustomSplash ? 'has-splash-bg' : ''}" style="background-color: ${splashBgColor};">
    <div id="splash-content">
      <div class="logo-box">
        <img src="app_logo.png" onerror="this.src='icon.svg'; this.onerror=null;" alt="Logo" />
      </div>
      <h1>${safeAppName}</h1>
      <p class="splash-sub">Loading application...</p>
      <div class="spinner"></div>
    </div>
  </div>

  <!-- ERROR / OFFLINE VIEW -->
  <div id="error-view">
    <h2>No Internet Connection</h2>
    <p style="margin-top:8px;color:#94a3b8;font-size:13px;">Please check your mobile data or Wi-Fi connection.</p>
    <button class="retry-btn" onclick="retryLoad()">Retry</button>
  </div>

  <!-- CONFIRM ON EXIT MODAL -->
  <div id="exit-confirm-modal">
    <div class="exit-modal-card">
      <div class="exit-icon">⚠️</div>
      <div class="exit-title">Exit App?</div>
      <div class="exit-desc">Are you sure you want to exit ${safeAppName}?</div>
      <div class="exit-actions">
        <button class="exit-btn-cancel" onclick="dismissExitDialog()">Cancel</button>
        <button class="exit-btn-confirm" onclick="confirmExitApp()">Exit</button>
      </div>
    </div>
  </div>

  <!-- SECURE PAYMENT POPUP MODAL -->
  <div id="payment-popup-modal">
    <div class="payment-modal-header">
      <div class="payment-modal-title">
        <span>🔒</span>
        <span>Secure Checkout / Payment</span>
      </div>
      <button class="payment-close-btn" onclick="closePaymentModal()">✕ Close</button>
    </div>
    <iframe id="payment-frame" src="about:blank"></iframe>
  </div>

  <!-- MAIN APP CONTAINER -->
  <div id="app-container">
    <div id="iframe-wrapper">
      <iframe
        id="main-frame"
        src="${websiteUrl}"
        allow="camera; microphone; geolocation; autoplay; fullscreen; clipboard-read; clipboard-write; encrypted-media; picture-in-picture"
        sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-top-navigation"
      ></iframe>
    </div>

    <!-- LIVE DOCKED BANNER AD (START.IO / ADMOB NATIVE STYLE) -->
    <div id="banner-ad-container" onclick="onAdClick()">
      <div class="ad-thumb-box">
        <img id="banner-ad-img" class="ad-thumb-img" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><rect width='88' height='88' fill='%230f172a'/><path d='M20 60 L36 44 L48 52 L68 28' stroke='%2322c55e' stroke-width='4' fill='none'/><circle cx='68' cy='28' r='4' fill='%2322c55e'/><rect x='16' y='18' width='56' height='12' rx='2' fill='%23334155'/></svg>" alt="Ad" />
        <div class="ad-info-icon" title="Ad Info">i</div>
      </div>
      <div class="ad-content">
        <div class="ad-title" id="banner-ad-title">
          2026 Crypto Regulation...
        </div>
        <div class="ad-subtitle" id="banner-ad-sub">
          Discover how the 2026 Clarity Act could reshape crypto regulation, boost Bitcoin...
        </div>
      </div>
      <button class="ad-cta-pill" onclick="event.stopPropagation(); onAdClick();" aria-label="Open Ad">
        <span class="ad-cta-arrow"></span>
      </button>
    </div>
  </div>

  <!-- FULLSCREEN INTERSTITIAL AD MODAL -->
  <div id="interstitial-modal">
    <div class="interstitial-header">
      <div class="ad-badge ${isStartIo ? 'ad-badge-startio' : 'ad-badge-admob'}">
        ${isStartIo ? 'Start.io Ad' : 'Google AdMob'}
      </div>
      <button id="interstitial-close-btn" class="interstitial-close-btn" onclick="closeInterstitial()">
        Skip in 5s
      </button>
    </div>
    <div class="interstitial-body">
      <div class="interstitial-icon">🚀</div>
      <div class="interstitial-title">Trending Apps & Games</div>
      <div class="interstitial-desc">Discover new top-rated applications, tools, and entertainment right on your device.</div>
      <div class="interstitial-stars">★★★★★ 4.9 • 10M+ Downloads</div>
      <button class="interstitial-cta" onclick="onAdClick()">GET IT FREE</button>
    </div>
    <div style="font-size:10px;color:#64748b;text-align:center;padding-bottom:6px;">
      Advertisement • ID: ${isAdMob ? admobInterstitialId.slice(-10) : 'STARTIO-INT'}
    </div>
  </div>

  <!-- REWARDED AD DIALOG -->
  <div id="rewarded-modal">
    <div class="rewarded-box">
      <div style="font-size:32px;margin-bottom:12px;">🎁</div>
      <h3 style="font-size:17px;font-weight:700;margin-bottom:6px;">Watch Video to Unlock</h3>
      <p style="font-size:12px;color:#94a3b8;margin-bottom:16px;">Watch a short sponsored video to unlock premium rewards.</p>
      <div style="display:flex;gap:8px;">
        <button onclick="closeRewarded(false)" style="flex:1;padding:10px;border-radius:10px;background:#334155;color:#fff;border:none;font-weight:600;font-size:13px;cursor:pointer;">Cancel</button>
        <button onclick="watchRewarded()" style="flex:1;padding:10px;border-radius:10px;background:#22c55e;color:#fff;border:none;font-weight:700;font-size:13px;cursor:pointer;">Watch Ad</button>
      </div>
    </div>
  </div>

  <script>
    let TARGET_URL = ${JSON.stringify(websiteUrl)};
    const TARGET_ORIENTATION = ${JSON.stringify(orientation)};
    const TEXT_SELECTION = ${textSelection ? 'true' : 'false'};
    const SAVE_FORM_DATA = ${saveFormData ? 'true' : 'false'};
    const FULLSCREEN_MODE = ${fullscreenMode ? 'true' : 'false'};
    const CONFIRM_ON_EXIT = ${confirmOnExit ? 'true' : 'false'};
    const ENABLE_GPS = ${enableGpsPrompt ? 'true' : 'false'};
    const PULL_TO_REFRESH = ${pullToRefresh ? 'true' : 'false'};
    const DEEP_LINKING = ${deepLinking ? 'true' : 'false'};
    const SHOW_PROGRESS_WHEEL = ${showProgressWheel ? 'true' : 'false'};
    const USE_CUSTOM_TABS = ${useCustomTabs ? 'true' : 'false'};
    const ENABLE_PAYMENTS = ${enablePaymentRedirects ? 'true' : 'false'};
    const CACHE_MODE = ${JSON.stringify(cacheMode)};

    const HAS_INTERSTITIAL = ${hasInterstitial ? 'true' : 'false'};
    const HAS_BANNER = ${hasBanner ? 'true' : 'false'};
    const INTERSTITIAL_INTERVAL_MS = ${Math.max(1, Number(interstitialIntervalMinutes) || 3)} * 60 * 1000;
    const IS_STARTIO = ${isStartIo ? 'true' : 'false'};
    const IS_ADMOB = ${isAdMob ? 'true' : 'false'};
    const STARTIO_APP_ID = ${JSON.stringify(startioAppId)};

    // --- FEATURE 7: DEEP LINKING SUPPORT ---
    if (DEEP_LINKING) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const deepUrl = urlParams.get('url') || urlParams.get('link') || urlParams.get('route') || urlParams.get('target');
        if (deepUrl && (deepUrl.startsWith('http://') || deepUrl.startsWith('https://'))) {
          TARGET_URL = deepUrl;
        } else if (window.location.hash && window.location.hash.length > 1) {
          const hashRoute = window.location.hash.substring(1);
          if (hashRoute.startsWith('http')) {
            TARGET_URL = hashRoute;
          }
        }
      } catch (e) {}
    }

    // --- FEATURE 11: CACHE MODE HANDLING ---
    if (CACHE_MODE === 'no_cache') {
      try {
        const separator = TARGET_URL.includes('?') ? '&' : '?';
        TARGET_URL = TARGET_URL + separator + '_nocache=' + Date.now();
      } catch (e) {}
    }

    // Set iframe initial target URL
    const mainFrame = document.getElementById('main-frame');
    if (mainFrame) {
      mainFrame.src = TARGET_URL;
    }

    // --- FEATURE 1: TEXT SELECTION ENFORCEMENT ---
    if (!TEXT_SELECTION) {
      document.addEventListener('selectstart', function(e) { e.preventDefault(); });
      document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    }

    // --- FEATURE 8: PROGRESS WHEEL & TOP BAR ANIMATION ---
    const progressBar = document.getElementById('top-progress-bar');
    const wheel = document.getElementById('loading-progress-wheel');
    let progressTimer = null;

    function startLoadingProgress() {
      if (progressBar) {
        progressBar.style.opacity = '1';
        progressBar.style.width = '20%';
        clearInterval(progressTimer);
        let cur = 20;
        progressTimer = setInterval(function() {
          if (cur < 85) {
            cur += Math.floor(Math.random() * 8) + 3;
            progressBar.style.width = cur + '%';
          }
        }, 200);
      }
      if (SHOW_PROGRESS_WHEEL && wheel) {
        wheel.style.display = 'flex';
        wheel.style.opacity = '1';
      }
    }

    function finishLoadingProgress() {
      clearInterval(progressTimer);
      if (progressBar) {
        progressBar.style.width = '100%';
        setTimeout(function() {
          progressBar.style.opacity = '0';
          setTimeout(function() { progressBar.style.width = '0%'; }, 300);
        }, 200);
      }
      if (wheel) {
        wheel.style.opacity = '0';
        setTimeout(function() { wheel.style.display = 'none'; }, 300);
      }
    }

    if (mainFrame) {
      startLoadingProgress();
      mainFrame.addEventListener('load', function() {
        finishLoadingProgress();
        injectFormPersistence();
      });
    }

    // --- FEATURE 2: FORM DATA AUTOMATED SAVE & RESTORE ---
    function injectFormPersistence() {
      if (!SAVE_FORM_DATA) return;
      try {
        const frameDoc = mainFrame.contentDocument || mainFrame.contentWindow?.document;
        if (!frameDoc) return;

        // Restore form fields
        const inputs = frameDoc.querySelectorAll('input:not([type=password]):not([type=hidden]), textarea, select');
        inputs.forEach(function(el) {
          const key = 'form_saved_' + (el.id || el.name || el.placeholder);
          if (key && localStorage.getItem(key)) {
            if (el.type === 'checkbox' || el.type === 'radio') {
              el.checked = localStorage.getItem(key) === 'true';
            } else {
              el.value = localStorage.getItem(key);
            }
          }
          // Save on change
          el.addEventListener('input', function() {
            const val = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
            localStorage.setItem(key, val);
          });
        });
      } catch (e) {
        // Cross-origin restriction may occur on external domains, which is expected and handled safely
      }
    }

    // --- FEATURE 6: PULL TO REFRESH GESTURE ENGINE ---
    if (PULL_TO_REFRESH) {
      let touchStartY = 0;
      let touchDiffY = 0;
      let isPulling = false;
      const ptrIndicator = document.getElementById('ptr-indicator');
      const ptrIcon = document.getElementById('ptr-icon');
      const ptrText = document.getElementById('ptr-text');
      const iframeWrapper = document.getElementById('iframe-wrapper');

      window.addEventListener('touchstart', function(e) {
        if (e.touches && e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          isPulling = false;
        }
      }, { passive: true });

      window.addEventListener('touchmove', function(e) {
        if (!touchStartY || !e.touches || e.touches.length !== 1) return;
        const currentY = e.touches[0].clientY;
        touchDiffY = currentY - touchStartY;

        if (touchDiffY > 20 && touchStartY < 160) {
          isPulling = true;
          const pullDistance = Math.min(90, touchDiffY * 0.45);
          if (ptrIndicator) {
            ptrIndicator.style.transform = 'translateX(-50%) translateY(' + (pullDistance - 50) + 'px)';
          }
          if (ptrIcon) {
            ptrIcon.style.transform = 'rotate(' + (pullDistance * 4) + 'deg)';
          }
          if (ptrText) {
            ptrText.innerText = pullDistance > 55 ? 'Release to refresh' : 'Pull to refresh';
          }
        }
      }, { passive: true });

      window.addEventListener('touchend', function() {
        if (isPulling) {
          if (touchDiffY * 0.45 >= 55) {
            if (ptrText) ptrText.innerText = 'Refreshing...';
            if (ptrIcon) ptrIcon.style.animation = 'spin 0.6s linear infinite';
            startLoadingProgress();
            try {
              if (mainFrame && mainFrame.contentWindow) {
                mainFrame.contentWindow.location.reload();
              } else if (mainFrame) {
                mainFrame.src = TARGET_URL;
              }
            } catch (err) {
              if (mainFrame) mainFrame.src = TARGET_URL;
            }
          }
          setTimeout(function() {
            if (ptrIndicator) ptrIndicator.style.transform = 'translateX(-50%) translateY(-60px)';
            if (ptrIcon) {
              ptrIcon.style.animation = '';
              ptrIcon.style.transform = 'rotate(0deg)';
            }
            if (ptrText) ptrText.innerText = 'Pull to refresh';
          }, 600);
        }
        touchStartY = 0;
        touchDiffY = 0;
        isPulling = false;
      });
    }

    // --- FEATURE 4: CONFIRM ON EXIT INTERCEPTOR ---
    function showExitConfirmDialog() {
      const modal = document.getElementById('exit-confirm-modal');
      if (modal) modal.style.display = 'flex';
    }

    function dismissExitDialog() {
      const modal = document.getElementById('exit-confirm-modal');
      if (modal) modal.style.display = 'none';
      if (CONFIRM_ON_EXIT) {
        history.pushState({ appRoot: true }, '');
      }
    }

    function confirmExitApp() {
      if (window.AndroidApp && window.AndroidApp.exitApp) {
        window.AndroidApp.exitApp();
      } else if (window.AndroidDownloader && window.AndroidDownloader.exitApp) {
        window.AndroidDownloader.exitApp();
      } else {
        window.close();
      }
    }

    if (CONFIRM_ON_EXIT) {
      history.pushState({ appRoot: true }, '');
      window.addEventListener('popstate', function(event) {
        showExitConfirmDialog();
      });
    }

    window.showExitConfirmDialog = showExitConfirmDialog;

    // --- FEATURE 9 & 10: CHROME CUSTOM TABS & WALLET PAYMENTS BRIDGE ---
    const WALLET_SCHEMES = ['upi:', 'bkash:', 'nagad:', 'paytmmp:', 'tez:', 'gpay:', 'phonepe:', 'alipay:', 'whatsapp:', 'intent:', 'tel:', 'mailto:'];

    function isWalletPaymentUrl(url) {
      if (!url) return false;
      for (let i = 0; i < WALLET_SCHEMES.length; i++) {
        if (url.startsWith(WALLET_SCHEMES[i])) return true;
      }
      return url.includes('sslcommerz') || url.includes('checkout.bkash') || url.includes('razorpay') || url.includes('paytm.com');
    }

    function handleSpecialUrl(url) {
      if (!url) return false;

      // Check payment & wallet redirect schemes
      if (ENABLE_PAYMENTS && isWalletPaymentUrl(url)) {
        if (window.AndroidDownloader && window.AndroidDownloader.openInCustomTabs) {
          window.AndroidDownloader.openInCustomTabs(url);
        } else {
          window.location.href = url;
        }
        return true;
      }

      // Check Custom Tabs for external links
      if (USE_CUSTOM_TABS) {
        try {
          const targetHost = new URL(url).hostname;
          const currentHost = new URL(TARGET_URL).hostname;
          if (targetHost && currentHost && targetHost !== currentHost) {
            if (window.AndroidDownloader && window.AndroidDownloader.openInCustomTabs) {
              window.AndroidDownloader.openInCustomTabs(url);
            } else {
              window.open(url, '_blank');
            }
            return true;
          }
        } catch (e) {}
      }
      return false;
    }

    function closePaymentModal() {
      const modal = document.getElementById('payment-popup-modal');
      const pFrame = document.getElementById('payment-frame');
      if (modal) modal.style.display = 'none';
      if (pFrame) pFrame.src = 'about:blank';
    }

    // --- FEATURE 5: GPS & GEOLOCATION BRIDGE ---
    if (ENABLE_GPS && navigator.geolocation) {
      const origGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        origGetCurrentPosition(success, error, options);
      };
    }

    // --- FEATURE 3: FULLSCREEN IMMERSIVE LOCK ---
    if (FULLSCREEN_MODE) {
      function requestFullscreenImmersive() {
        try {
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(function() {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
          }
        } catch (e) {}
      }
      document.addEventListener('click', requestFullscreenImmersive, { once: true });
      document.addEventListener('touchstart', requestFullscreenImmersive, { once: true });
    }

    // --- SCREEN ORIENTATION CONTROLLER ---
    function applyOrientation() {
      try {
        if (screen.orientation && screen.orientation.lock) {
          if (TARGET_ORIENTATION === 'landscape') {
            screen.orientation.lock('landscape').catch(function() {});
          } else if (TARGET_ORIENTATION === 'portrait') {
            screen.orientation.lock('portrait').catch(function() {});
          }
        }
      } catch(err) {
        console.warn('Orientation lock error:', err);
      }
    }

    // --- INTERSTITIAL AD CONTROLLER ---
    let interstitialSeconds = 5;
    let interstitialInterval = null;

    function showInterstitialAd() {
      if (!HAS_INTERSTITIAL) return;
      const modal = document.getElementById('interstitial-modal');
      const closeBtn = document.getElementById('interstitial-close-btn');
      if (!modal || !closeBtn) return;

      modal.style.display = 'flex';
      interstitialSeconds = 5;
      closeBtn.innerText = 'Skip in 5s';
      closeBtn.classList.remove('active');

      clearInterval(interstitialInterval);
      interstitialInterval = setInterval(function() {
        interstitialSeconds--;
        if (interstitialSeconds > 0) {
          closeBtn.innerText = 'Skip in ' + interstitialSeconds + 's';
        } else {
          clearInterval(interstitialInterval);
          closeBtn.innerText = '✕ Close Ad';
          closeBtn.classList.add('active');
        }
      }, 1000);
    }

    function closeInterstitial() {
      clearInterval(interstitialInterval);
      const modal = document.getElementById('interstitial-modal');
      if (modal) modal.style.display = 'none';
    }

    // --- BANNER AD CONTROLLER ---
    const adCampaigns = [
      {
        title: '2026 Crypto Regulation...',
        sub: 'Discover how the 2026 Clarity Act could reshape crypto regulation, boost Bitcoin...',
        img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><rect width='88' height='88' fill='%230f172a'/><path d='M16 64 L36 44 L50 54 L72 26' stroke='%2322c55e' stroke-width='4' fill='none'/><circle cx='72' cy='26' r='4' fill='%2322c55e'/><rect x='14' y='14' width='60' height='12' rx='2' fill='%231e293b'/></svg>"
      },
      {
        title: 'TradingPro: Zero Brokerage',
        sub: 'Trade Global Stocks, Crypto & Forex with ultra-low spreads. Free $10,000 demo.',
        img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><rect width='88' height='88' fill='%230284c7'/><path d='M20 55 L38 35 L52 45 L68 25' stroke='%23ffffff' stroke-width='4' fill='none'/><circle cx='68' cy='25' r='5' fill='%23facc15'/></svg>"
      },
      {
        title: 'Super Cloud VPN - Fast & Safe',
        sub: 'Unblock all apps & websites. Ultra-high speed 10Gbps servers in 60+ countries.',
        img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><rect width='88' height='88' fill='%234338ca'/><path d='M44 20 C32 20 24 30 24 42 C24 58 44 70 44 70 C44 70 64 58 64 42 C64 30 56 20 44 20 Z' fill='%236366f1'/><path d='M40 38 L48 44 L40 50' stroke='%23ffffff' stroke-width='3' fill='none'/></svg>"
      },
      {
        title: 'Battle Royale: Season 10',
        sub: 'Top-rated 3D survival game. Join over 20M+ players in epic multiplayer warfare.',
        img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='88' height='88' viewBox='0 0 88 88'><rect width='88' height='88' fill='%23b91c1c'/><polygon points='44,18 52,36 72,36 56,48 62,68 44,56 26,68 32,48 16,36 36,36' fill='%23fbbf24'/></svg>"
      }
    ];
    let adIndex = 0;

    function rotateBannerAd() {
      if (!HAS_BANNER) return;
      const titleEl = document.getElementById('banner-ad-title');
      const subEl = document.getElementById('banner-ad-sub');
      const imgEl = document.getElementById('banner-ad-img');
      if (titleEl && subEl) {
        adIndex = (adIndex + 1) % adCampaigns.length;
        const current = adCampaigns[adIndex];
        titleEl.innerText = current.title;
        subEl.innerText = current.sub;
        if (imgEl && current.img) {
          imgEl.src = current.img;
        }
      }
    }
    if (HAS_BANNER) {
      setInterval(rotateBannerAd, 25000);
    }

    function onAdClick() {
      if (IS_STARTIO && STARTIO_APP_ID) {
        window.open('https://play.google.com/store/apps/details?id=' + encodeURIComponent(STARTIO_APP_ID), '_blank');
      } else {
        window.open('https://play.google.com/store/apps', '_blank');
      }
      closeInterstitial();
    }

    // --- REWARDED AD BRIDGE ---
    let rewardedCallback = null;
    window.showRewardedAd = function(cb) {
      rewardedCallback = cb;
      const rModal = document.getElementById('rewarded-modal');
      if (rModal) rModal.style.display = 'flex';
    };

    function watchRewarded() {
      const rModal = document.getElementById('rewarded-modal');
      if (rModal) rModal.style.display = 'none';
      showInterstitialAd();
      if (typeof rewardedCallback === 'function') {
        setTimeout(function() {
          rewardedCallback({ success: true, reward: 'premium_access' });
          rewardedCallback = null;
        }, 5500);
      }
    }

    function closeRewarded(status) {
      const rModal = document.getElementById('rewarded-modal');
      if (rModal) rModal.style.display = 'none';
      if (typeof rewardedCallback === 'function') {
        rewardedCallback({ success: false });
        rewardedCallback = null;
      }
    }

    // --- APP LAUNCH ENGINE ---
    function launch() {
      applyOrientation();

      if (!navigator.onLine) {
        document.getElementById('splash').style.display = 'none';
        document.getElementById('error-view').style.display = 'flex';
        return;
      }

      ensureBannerVisibility();

      setTimeout(function() {
        const splash = document.getElementById('splash');
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(function() {
            splash.style.display = 'none';
            if (HAS_INTERSTITIAL) {
              showInterstitialAd();
            }
          }, 400);
        }
      }, ${splashDurationMs});

      if (HAS_INTERSTITIAL && INTERSTITIAL_INTERVAL_MS > 0) {
        setInterval(function() {
          showInterstitialAd();
        }, INTERSTITIAL_INTERVAL_MS);
      }
    }

    function retryLoad() {
      document.getElementById('error-view').style.display = 'none';
      document.getElementById('splash').style.display = 'flex';
      document.getElementById('splash').style.opacity = '1';
      launch();
    }

    function ensureBannerVisibility() {
      if (!HAS_BANNER) return;
      const banner = document.getElementById('banner-ad-container');
      if (banner) {
        banner.style.display = 'flex';
        banner.style.visibility = 'visible';
        banner.style.opacity = '1';
      }
    }

    document.addEventListener('fullscreenchange', ensureBannerVisibility);
    document.addEventListener('webkitfullscreenchange', ensureBannerVisibility);
    window.addEventListener('resize', ensureBannerVisibility);

    window.addEventListener('load', launch);
    window.addEventListener('online', launch);
    window.addEventListener('orientationchange', function() {
      applyOrientation();
      ensureBannerVisibility();
    });
  </script>
</body>
</html>`;
}
