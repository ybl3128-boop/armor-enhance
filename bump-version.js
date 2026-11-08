// 배포(빌드) 시마다 index.html의 app.js / style.css 쿼리스트링 버전을
// 현재 시각(YYYYMMDDHHmm)으로 자동 갱신해서 브라우저 캐시를 강제 무효화한다.
// 사용자가 재접속 시 수동으로 "캐시 지운 새로고침"을 하지 않아도 되도록 하는 장치.

const fs = require("fs");
const path = require("path");

const INDEX_PATH = path.join(__dirname, "index.html");

function buildVersionStamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function bumpVersion() {
  const version = buildVersionStamp();
  let html = fs.readFileSync(INDEX_PATH, "utf8");

  const before = html;

  html = html.replace(
    /(href="\.\/style\.css)(\?v=\d+)?(")/,
    `$1?v=${version}$3`
  );
  html = html.replace(
    /(src="\.\/app\.js)(\?v=\d+)?(")/,
    `$1?v=${version}$3`
  );

  if (html === before) {
    console.warn(
      "⚠️ bump-version: index.html에서 app.js/style.css 태그를 찾지 못했습니다. 패턴을 확인하세요."
    );
    process.exit(1);
  }

  fs.writeFileSync(INDEX_PATH, html, "utf8");
  console.log(`✅ 캐시 버전 갱신 완료: v=${version}`);
}

bumpVersion();
