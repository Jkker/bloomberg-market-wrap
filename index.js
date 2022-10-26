import { config } from "dotenv";
import { promises as fs } from "fs";
import fetch from "node-fetch";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday.js";

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
}

const getStockData = async () => {
  console.log("Fetching stock data...");
  const START_DATE = "2022-07-01";
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
        .map(({ date, value }) => ({ date, value }))
        .filter(({ date }) => date >= START_DATE),
    }),
    {}
  );

  const stockDates = obj.SP500.map(({ date }) => date);

  const stockData = Object.fromEntries(
    stockDates.map((date) => [
      date,
      {
        DJIA: obj.DJIA.find((d) => d.date === date).value,
        SP500: obj.SP500.find((d) => d.date === date).value,
        NASDAQCOM: obj.NASDAQCOM.find((d) => d.date === date).value,
      },
    ])
  );
  return stockData;
};

const getMarketWrapArticles = async () => {
  console.log("Fetching Market Wrap articles...");
  const getToken = async () =>
    await fs.readFile(".env", "utf8").then((data) => data.trim());

  const fetchArticles = async () => {
    const token = await getToken();

    const res = await fetch("https://api.newsfilter.io/actions", {
      headers: {
        authorization: token,
        "content-type": "application/json;charset=UTF-8",
      },
      referrerPolicy: "no-referrer",
      body: JSON.stringify({
        type: "filterArticles",
        queryString: 'title:"Markets Wrap" OR description:"Markets Wrap"',
        from: 0,
        size: 100,
      }),
      method: "POST",
    });

    const data = await res.json();

    return data;
  };

  const getSrcUrl = (id = "a1ff13551dee02128ee0b9330e17f811") =>
    fetch(`https://static.newsfilter.io/${id}.json`)
      .then((res) => res.json())
      .then((data) => data.url.replace("bloomberg.com//", "bloomberg.com/"))
      .catch((e) => console.warn(e));

  const getDateFromUrl = (url) => url.match(/(\d{4}-\d{2}-\d{2})/)?.[1];

  const res = await fetchArticles();

  const articles = await Promise.all(
    res.articles.map(async (a) => ({
      ...a,
      source: await getSrcUrl(a.id),
    }))
  );
  const articlesWithDates = articles.map((a) => ({
    ...a,
    date: addOneToSunday(getDateFromUrl(a.source)),
  }));

  return articlesWithDates;
};

const toMarkdownTableAll = (data) => {
  const headers = ["Date", "Article", "Dow", "S&P500", "NASDAQ"];
  const separator = headers.map(() => "---");

  const rows = data.map(
    ({ title, source, publishedAt, DJIA, SP500, NASDAQCOM }) => [
      source.match(/(\d{4}-\d{2}-\d{2})/)[1],
      `[${title}](${source})`,
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

await fs.writeFile(
  `data/${latestArticle.date}.json`,
  JSON.stringify(articlesWithStocks)
);
await fs.writeFile("README.md", readmeContent);

console.log("✅ Updated README.md");
