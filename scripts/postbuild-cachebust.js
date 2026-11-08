// 빌드 산출물(dist/index.html)의 app.js, style.css 참조에
// 빌드 시각 기반 쿼리스트링(?v=TIMESTAMP)을 주입해 브라우저 캐시를 무효화한다.
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distIndexPath = path.join(__dirname, "..", "dist", "index.html");
const rootIndexPath = path.join(__dirname, "..", "index.html");

const version = Date.now().toString();

function injectVersion(filePath) {
  let html = readFileSync(filePath, "utf8");
  html = html.replace(
    /src="\.\/app\.js(\?v=\d+)?"/,
    `src="./app.js?v=${version}"`
  );
  html = html.replace(
    /href="\.\/style\.css(\?v=\d+)?"/,
    `href="./style.css?v=${version}"`
  );
  writeFileSync(filePath, html, "utf8");
  console.log(`✅ Cache-busting version ${version} injected into ${filePath}`);
}

injectVersion(distIndexPath);
// 루트의 index.html(Firebase Hosting이 public:"."로 직접 서빙하는 파일)도 함께 갱신
injectVersion(rootIndexPath);
