import { config } from "dotenv";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday.js";
import _ from "lodash";
const START_DATE = "2022-07-01";

config();
dayjs.extend(weekday);

const isSunday = (date) => date.weekday() === 0;

const addOneDay = (date) => date.add(1, "day").format("YYYY-MM-DD");

const addOneToSunday = (date) => {
  const d = dayjs(date);
  if (isSunday(d)) {
    return addOneDay(d);
  }
  return date;
};

const getStockData = async () => {
  console.log("Fetching stock data...");
  const FRED_KEY = "96dc2e6b866ebf08660f467211968758";
  const indices = ["DJIA", "SP500", "NASDAQCOM"];

  const fetchStockData = (idx) =>
    fetch(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${idx}&api_key=${FRED_KEY}&file_type=json`
    ).then((res) => res.json());

  const data = await Promise.all(indices.map(fetchStockData));

  const obj = data.reduce(
    (acc, { observations }, idx) => ({
      ...acc,
      [indices[idx]]: observations
        .map(({ date, value }) => ({ date, value: parseFloat(value) }))
        .filter(({ date }) => date >= START_DATE),
    }),
    {}
  );

  const stockDates = obj.SP500.map(({ date }) => date);

  const stockData = Object.fromEntries(
    stockDates.map((date) => [
      date,
      {
        DJIA: obj.DJIA.find((d) => d.date === date)?.value ?? "N/A",
        SP500: obj.SP500.find((d) => d.date === date)?.value ?? "N/A",
        NASDAQCOM: obj.NASDAQCOM.find((d) => d.date === date)?.value ?? "N/A",
      },
    ])
  );
  return stockData;
};

const getMarketWrapArticles = async (total = 100) => {
  console.log("Fetching Market Wrap articles...");

  const token = await fs.readFile(".env", "utf8").then((data) => data.trim());

  const fetchArticlesPaginated = async (from = 0) => {
    const res = await fetch("https://api.newsfilter.io/actions", {
      headers: {
        authorization: token,
        "content-type": "application/json;charset=UTF-8",
      },
      referrerPolicy: "no-referrer",
      body: JSON.stringify({
        type: "filterArticles",
        queryString: 'title:"Markets Wrap" OR description:"Markets Wrap"',
        from: from,
        size: 50,
      }),
      method: "POST",
    });

    const data = await res.json();

    return data;
  };

  const res = await Promise.all(
    _.range(0, total, 50).map(fetchArticlesPaginated)
  );

  const articlesWithDates = _.flatten(res.map((r) => r.articles))
    .filter((a) => a.sourceUrl.includes("www.bloomberg.com"))
    .map(({ title, publishedAt, url: newsFilterUrl, id, sourceUrl }) => ({
      title,
      id,
      url: sourceUrl.replace("com//", "com/"),
      publishedAt,
      date: addOneToSunday(sourceUrl.match(/(\d{4}-\d{2}-\d{2})/)?.[1]),
      newsFilterUrl,
    }))
    .filter(({ date }) => dayjs(date).isAfter(START_DATE));

  return articlesWithDates;
};

const toMarkdownTableAll = (data) => {
  const headers = ["Date", "Article", "Dow", "S&P500", "NASDAQ"];
  const separator = headers.map(() => "---");

  const rows = data.map(
    ({ title, date, url, publishedAt, DJIA, SP500, NASDAQCOM }) => [
      date,
      `[${title}](${url})`,
      DJIA,
      SP500,
      NASDAQCOM,
    ]
  );

  return [headers, separator, ...rows].map((row) => row.join(" | ")).join("\n");
};

const stocks = await getStockData();
const articles = await getMarketWrapArticles();

const articlesWithStocks = articles.map((src) => ({
  ...src,
  ...stocks[src.date],
}));

const table = toMarkdownTableAll(articlesWithStocks);

const latestArticle = articles[0];

const readmeContent = `# Bloomberg Market Wrap Articles

> Last updated: ${latestArticle.date}

## Usage

1. Clone this repo
2. Run \`pnpm install\`
3. Rename \`.env.example\` to \`.env\`
4. Get a [Newsfilter API token](https://developers.newsfilter.io/docs/news-query-api-authentication.html) and add it to \`.env\`
5. Run \`pnpm run start\`

## Articles

${table}
`;

console.log(`Found ${articles.length} articles`);
console.log(`Latest Article (${latestArticle.date}): ${latestArticle.title} `);

const filePath = `data/${latestArticle.date}.json`;

const latestJson = await fs.readFile(filePath, "utf8");
const latestData = JSON.parse(latestJson);

await fs.writeFile(filePath, JSON.stringify(articlesWithStocks));
await fs.writeFile("README.md", readmeContent);

console.log("✅ Updated README.md");
