import { promises as fs } from "fs";
import fetch from "node-fetch";

const fetchArticle = async (url) =>
  await fetch(url, {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
      "cache-control": "max-age=0",
      "if-none-match": 'W/"7b730-HV93l4BEHrAazW2tme+FyMrEMTU"',
      "sec-ch-ua":
        '"Microsoft Edge";v="107", "Chromium";v="107", "Not=A?Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      Referer: "https://www.google.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      cookie:
        'seen_uk=1; exp_pref=AMER; agent_id=796ecbed-0a29-4b3e-9e8b-ac668bfae1d0; session_id=78b225b6-851d-4ed9-8fd4-3955565d0f06; session_key=faa80cf7840e4dd282e9d13f9d987a1bc789830f; gatehouse_id=77dcfe29-fcf5-4c90-8690-6b24ec9572bf; geo_info={"countryCode":"US","country":"US","cityId":"5128581","provinceId":"5128638","field_p":"19A63C","field_mi":-1,"field_n":"cp","trackingRegion":"US","cacheExpiredTime":1670862734111,"region":"US","fieldMI":-1,"fieldN":"cp","fieldP":"19A63C"}|1670862734111; _reg-csrf-token=EbTI60cS-6_Ud105cFIQm7WJtUioDCHf7dEs; _reg-csrf=s:mFOMH3xn_q5eXRI3WYnuAFGx.ckWynQM8DwfDcsvF4t24GB9XldGjeglcikbxTSM2w/g; _user-data={"status":"anonymous"}; _last-refresh=2022-12-5 16:32; ccpaUUID=c7e9d43f-c30f-49dc-a7c7-779592eb6ef9; dnsDisplayed=true; ccpaApplies=true; signedLspa=false; _sp_krux=false; _sp_v1_uid=1:338:3e803092-f42a-4439-a9e7-146f1f15f27d; _sp_v1_ss=1:H4sIAAAAAAAAAItWqo5RKimOUbLKK83J0YlRSkVil4AlqmtrlXRGldFSWSwAQNXmRIcBAAA=; sampledUser=false; bbgconsentstring=req1fun1pad1; pxcts=7ab42d0f-74bc-11ed-94de-69707552466a; _pxvid=7ab3c7af-74bc-11ed-94de-69707552466a; _pxff_rf=1; _pxff_fp=1; _pxff_tm=1; _px3=163554ac6dac05ed8f69f69d6665a80d10b56bacf62ea8b2fb68d6d3fa92b31c:9MK70MZtyGC68y5XJfPCWnHpWUiKy+2YM60mTuygvuE6zqsimMpC9btW+Acgw+xTKIBLG5n0eEYcRL2g4DyP8g==:1000:rNLm7IEOCrgtoQE6Q6jiXw1u+ypCOAmMRrHZBWP8P+hxuDOF7NrxyiVReElO6iu5Tnb/nlK9uvPDKp18PL9C8q+cvA9der876xh8Kh01FdTA7E57htzR1P+6Hx6jpk1mpW63z07JlLFjwZP2QZ0enEZ5B0LXTb9ADBz8WvPLtMEqwz05WK/eym0qbXWPuTC+f1mQiCUc7JZZWA/wx8f5vg==; _px2=eyJ1IjoiNzk3NmVhMzUtNzRiYy0xMWVkLWEwMTQtNzA3OTU0NTE2NjY4IiwidiI6IjdhYjNjN2FmLTc0YmMtMTFlZC05NGRlLTY5NzA3NTUyNDY2YSIsInQiOjE2NzAyNTkxNTkyODYsImgiOiIyOTgxODlkNDkwZGI0ODZiNGQyNWFlNTc3NGNkZDg2YjAwMWRjOGE3NmQxZWYxZGFhYWUxOTk5MmM2MmUwMzQ2In0=; _pxde=dc3ba3d62fdfb7bee5b0e286f8df711a5a8fec39b7048c98391fba6638433c81:eyJ0aW1lc3RhbXAiOjE2NzAyNTg4NTk3OTQsImZfa2IiOjAsImlwY19pZCI6W119; _sp_v1_data=2:517482:1670256918:0:2:0:2:0:0:_:-1',
    },
    body: null,
    method: "GET",
  })
    .then((res) => res.text())
    .then(async (html) => {
      if (html.includes("Are you a robot?")) return;
      const slug = url
        .replace("https://www.bloomberg.com/news/articles/", "")
        .replace(/\//g, "-");
      await fs.writeFile(`data/articles/${slug}.html`, html);
      return html;
    });

const articles = await fs.readFile("data/2022-12-02.json", "utf-8");

const main = async () => {
  const data = JSON.parse(articles);

  // const browser = await puppeteer.connect({
  //   browserWSEndpoint:
  //     "wss://b.erry.dev/?token=050b8fda-1f95-43f3-95d6-3cb4ac0e0e38&stealth",
  // });
  // const page = await browser.newPage();

  let fails = 0,
    success = 0;
  const out = [];

  for (const article of data) {
    if (article.content) {
      out.push(article);
      continue;
    } else {
      const html = await fetchArticle(article.url);
      if (!html) {
        console.log(`failure: ${article.url}`);
        fails++;
        continue;
      }
      success++;
      console.log(`success: ${article.url}`);
      out.push({
        ...article,
        rawHtml: html,
      });
    }
  }
  console.log(`fails: ${fails}; success: ${success}`);

  await fs.writeFile("data/2022-12-02_1.json", JSON.stringify(out), {
    encoding: "utf-8",
  });
};

main();
