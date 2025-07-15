const ticker = document.getElementById("ticker");
const wrapper = document.querySelector(".ticker-wrapper");
const clock = document.getElementById("clock");

//グローバル変数
let weatherHTMLs = [];
let newsTexts = [];
let combinedItems = [];
let currentIndex = 0;
let animationId = null;
let nextCombinedItems = null;
let pendingUpdate = false;

// 時計更新
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  clock.textContent = `│${hh}:${mm}:${ss}│`;
}
setInterval(updateClock, 1000);
updateClock();

// 天気情報取得＆HTML生成
async function fetchWeather() {
  try {
    const res = await fetch("https://weathernews.jp/forecast/xml/all.xml");
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const points = Array.from(xmlDoc.getElementsByTagName("point"));

    // 100/101はアイコンで表現
    // それ以外は説明テキストとして表示
    const uniquePoints = {};
    points.forEach(point => {
      const id = point.getAttribute("id");
      if (!uniquePoints[id]) {
        const name = point.getAttribute("name");
        const weatherRaw = point.getElementsByTagName("weather")[0]?.textContent || "";
        const firstWeatherValue = weatherRaw.split(",")[0];
    
        const iconUrl = `https://weathernews.jp/s/topics/img/wxicon/${firstWeatherValue}.png`;
    
        // 最高・最低気温の最初の整数だけを取得
        const maxtempRaw = point.getElementsByTagName("maxtemp")[0]?.textContent || "";
        const mintempRaw = point.getElementsByTagName("mintemp")[0]?.textContent || "";
    
        const maxtemp = maxtempRaw.match(/\d+/)?.[0] || "-";
        const mintemp = mintempRaw.match(/\d+/)?.[0] || "-";
    
        // HTML生成
        const html = `
        <img src="${iconUrl}" alt="weather icon">
        <span class="region-name">${name}</span>
        <span class="temp max-temp">${maxtemp}℃</span><span class="slash">  /</span><span class="temp min-temp">${mintemp}℃</span>
      `;
      
      
        uniquePoints[id] = html;
      }
    });
    
    
    

    weatherHTMLs = Object.values(uniquePoints);
  } catch (e) {
    console.error("天気取得失敗:", e);
    weatherHTMLs = [`<span>天気情報を取得できませんでした。</span>`];
  }
  console.log("weatherHTMLs:", weatherHTMLs);

}

// ニュース取得（RSS→テキスト配列）
async function fetchNews() {
  try {
    const rssUrls = [
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat0.xml",
      "https://api.rss2json.com/v1/api.json?rss_url=https://www.nhk.or.jp/rss/news/cat1.xml"
    ];

    let allItems = [];
    for (const url of rssUrls) {
      const res = await fetch(url);
      const json = await res.json();
      if (json.items) {
        allItems = allItems.concat(json.items.map(i => `＜${i.title}＞  ${i.description}`));
      }
    }
    newsTexts = allItems.length > 0 ? allItems : ["ニュース情報を取得できませんでした。"];
  } catch (e) {
    console.error("ニュース取得失敗:", e);
    newsTexts = ["ニュース情報を取得できませんでした。"];
  }
  console.log("newsTexts:", newsTexts);
}


// 天気HTMLを1つの連続HTML文字列に結合（区切り棒なし、スペースだけ）
function getCombinedWeatherHTML() {
  return weatherHTMLs.join('　'); // 全角スペース1つ
}


// combinedItems配列を作成
function updateCombinedItems() {
  const combinedWeather = getCombinedWeatherHTML();
  nextCombinedItems = [combinedWeather, ...newsTexts];
  pendingUpdate = true; // スクロールが切り替わったときに反映する
}


// テロップ開始
const speedWeather = 200; // 天気テロップの速度(px/秒)
const speedNews = 100;   // ニューステロップの速度(px/秒)

function startTicker() {
  if (combinedItems.length === 0) return;
  if (animationId) cancelAnimationFrame(animationId);

  ticker.innerHTML = combinedItems[currentIndex];
  ticker.style.left = wrapper.offsetWidth + "px";

  let posX = wrapper.offsetWidth;
  const fps = 60;

  function animate() {
    // 速度は天気とニュースで分ける
    const speed = (currentIndex === 0) ? speedWeather : speedNews;
    const step = speed / fps;

    posX -= step;
    ticker.style.left = posX + "px";

    // ★ テキストが完全に画面外へ出たら次の表示へ
    if (posX + ticker.offsetWidth < 0) {

      // 🔄 保留中の更新があればここで反映
      if (pendingUpdate && nextCombinedItems) {
        combinedItems = nextCombinedItems;
        pendingUpdate = false;
        nextCombinedItems = null;
        currentIndex = 0; // 必要なら0から始める（天気）
      } else {
        currentIndex = (currentIndex + 1) % combinedItems.length;
      }

      // 天気（index 0）はHTML、それ以外はテキスト
      if (currentIndex === 0) {
        ticker.innerHTML = combinedItems[currentIndex];
      } else {
        ticker.textContent = combinedItems[currentIndex];
      }

      posX = wrapper.offsetWidth;
    }

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}



// 全更新
async function updateAll() {
  await fetchWeather();
  await fetchNews();
  updateCombinedItems();
  currentIndex = 0;
  startTicker();
}

// 初回実行
updateAll();

// 5分毎に更新
setInterval(updateAll, 5 * 60 * 1000);
