import { readFileSync } from "fs";
import fetch from "node-fetch";
import { Feed } from "feed";
const pkg = JSON.parse(readFileSync("./package.json"));

const meta = {
  generator: `${pkg.name}/${pkg.version} (${pkg.homepage})`,
  id: "https://somewhat.flawed.science/minecraft-releases",
  title: "Minecraft Releases",
  link: "https://feedback.minecraft.net/hc/en-us/sections/360001186971-Release-Changelogs",
};
const query =
  "https://feedback.minecraft.net/api/v2/help_center/en-us/sections/360001186971/articles?sort_by=created_at&sort_order=desc";
const filter = /Java/;

const build = async () => {
  console.info("Fetch: %j", { url: query });
  const { articles } = await (
    await fetch(query, { headers: { "User-Agent": meta.generator } })
  ).json();

  console.info("Feed: %j", { id: meta.id });
  const feed = new Feed(meta);

  articles
    .filter(({ title }) => filter.test(title))
    .forEach((article) => {
      console.info("Article: %j", { id: article.html_url });
      feed.addItem({
        title: article.title,
        id: article.html_url,
        link: article.html_url,
        content: article.body,
        published: new Date(article.created_at),
        date: new Date(article.updated_at),
      });
    });

  return feed.atom1();
};

export default async () => ({
  statusCode: 200,
  headers: { "Content-Type": "application/atom+xml" },
  body: await build(),
});
