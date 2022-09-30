import { config } from "dotenv";
import { promises as fs } from "fs";
import fetch from "node-fetch";

config();

const getToken = async () => await fs.readFile(".env", "utf8");

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
      queryString: 'title:"Markets Wrap"',
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
    .then((data) => data.url)
    .catch((e) => e + "");

const toMarkdownTable = (data) => {
  const headers = ["Article", "Date"];
  const separator = headers.map(() => "---");

  const rows = data.map(({ title, source, publishedAt }) => [
    `[${title}](${source})`,
    publishedAt.split("T")[0],
  ]);

  return [headers, separator, ...rows].map((row) => row.join(" | ")).join("\n");
};

const articles = await fetchArticles();

const sources = await Promise.all(
  articles.articles.map(async (a) => ({
    ...a,
    source: await getSrcUrl(a.id),
  }))
);

const table = toMarkdownTable(sources);

const lastUpdate = new Date().toISOString().split("T")[0];

const readme = `# Bloomberg Market Wrap Articles

> Last updated: ${lastUpdate}

## Usage

1. Clone this repo
2. Run \`pnpm install\`
3. Rename \`.env.example\` to \`.env\`
4. Get a [Newsfilter API token](https://developers.newsfilter.io/docs/news-query-api-authentication.html) and add it to \`.env\`
5. Run \`pnpm run start\`

## Articles

${table}
`;

console.log(`Found ${articles.articles.length} articles`);
console.log(
  `Latest Article (${articles.articles[0].publishedAt.split("T")[0]})): ${
    articles.articles[0].title
  } `
);

await fs.writeFile(`data/${lastUpdate}.json`, JSON.stringify(sources));
await fs.writeFile("README.md", readme);

console.log("Wrote README.md");
