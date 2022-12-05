import TurndownService from "turndown";
import { readFileSync, writeFileSync } from "fs";
import { gfm } from "turndown-plugin-gfm";
import dayjs from "dayjs";

if (process.argv.length < 3) {
  console.log("Please provide a file path");
  process.exit(1);
}

const turndownService = new TurndownService();
turndownService.use(gfm);

const data = JSON.parse(readFileSync(process.argv[2], "utf8"));

data.forEach((article) => {
  const pathList = article.url.split("/");

  const slug = pathList.slice(-2).join("-");
  const title = `# ${article.headline}\n`;
  const info = `## Info\n`;
  const headline = `*   **Headline**: ${article.headline}`;

  const publishedAt =
    article.publishedAt &&
    `*   **Published**: ${dayjs(article.publishedAt).format("YYYY-MM-DD")}`;

  const updatedAt =
    article.updatedAt &&
    `*   **Updated**: ${dayjs(article.updatedAt).format("YYYY-MM-DD")}`;
  const author =
    article.authors && `*   **Author**: ${article.authors.join(", ")}`;

  const url = `*   **Source**: [${pathList.at(-1)}](${article.url})`;
  const content = `## Content\n`;

  const out =
    [title, info, headline, publishedAt, updatedAt, author, url, content]
      .filter(Boolean)
      .join("\n") +
    "\n\n\n\n" +
    turndownService.turndown(article.body || "");

  const filePath = `articles/${slug}.md`;
  writeFileSync(filePath, out, "utf8");
});
