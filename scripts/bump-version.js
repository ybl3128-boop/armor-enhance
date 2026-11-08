// index.html의 ?v= 쿼리스트링을 빌드 시점 타임스탬프로 자동 교체
const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const version =
  `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
  `${pad(now.getHours())}${pad(now.getMinutes())}`;

html = html.replace(/\?v=\d+/g, `?v=${version}`);

fs.writeFileSync(indexPath, html, "utf8");
console.log(`index.html 캐시 버전 갱신: ?v=${version}`);
