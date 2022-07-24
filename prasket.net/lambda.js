import { Feed } from "feed";
import { readFileSync } from "fs";
import { JSDOM } from "jsdom";
import { DateTime, Settings } from "luxon";
import fetch from "node-fetch";
import { URL } from "url";
const pkg = JSON.parse(readFileSync("./package.json"));

Settings.defaultZone = "America/Los_Angeles";

const meta = {
  generator: `web-feeds/${pkg.name}/${pkg.version} (${pkg.homepage})`,
  id: "https://somewhat.flawed.science/prasket.net",
  title: "prasket.net",
  link: "https://prasket.net/blog.html",
};
const indexUrl = "https://prasket.net/blog.html";

const build = async () => {
  console.info("Fetch: %j", { url: indexUrl });
  const response = await fetch(indexUrl, {
    headers: { "User-Agent": meta.generator },
  });
  const mtime = DateTime.fromHTTP(response.headers.get("last-modified"));
  const dom = new JSDOM(await response.text());

  console.info("Feed: %j", { id: meta.id });
  const feed = new Feed({ ...meta, updated: mtime.toJSDate() });

  dom.window.document.querySelectorAll(".post").forEach((post) => {
    const heading = post.querySelector("h2");
    if (!heading) return;

    const [dateString, title] = heading.textContent.split(" — ", 2);
    const date = DateTime.fromFormat(dateString, "yyyy/LL/dd");
    post.removeChild(heading);

    post.querySelectorAll("*[href]").forEach((e) => {
      e.href = new URL(e.href, indexUrl).toString();
    });

    const url = [...post.querySelectorAll("a[href]")]
      .reverse()
      .find((a) => a.textContent.includes("read more"))?.href;
    const id = url ?? `${indexUrl}#${encodeURIComponent(dateString)}`;

    console.info("Post: %j", { id });
    feed.addItem({
      title,
      id,
      link: url ?? indexUrl,
      content: post.innerHTML.trim(),
      date: date.toJSDate(),
    });
  });

  return feed.atom1();
};

export default async () => ({
  statusCode: 200,
  headers: { "Content-Type": "application/atom+xml" },
  body: await build(),
});
