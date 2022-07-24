import { readFileSync } from "fs";
import { DateTime, Settings } from "luxon";
import fetch from "node-fetch";
import ical from "node-ical";
import { Feed } from "feed";
const pkg = JSON.parse(readFileSync("./package.json"));

Settings.defaultZone = "America/Los_Angeles";

const meta = {
  generator: `web-feeds/${pkg.name}/${pkg.version} (${pkg.homepage})`,
  id: "https://somewhat.flawed.science/everyday-rides-seattle",
  title: "Everyday Rides Seattle",
  link: "https://everydayrides.com/calendar",
};
const query = "https://everydayrides.com/cities/seattle-wa/calendar.ics";

const reuse = (response, key) => {
  const value = response.headers.get(key);
  return value && { [key]: value };
};

const simpleFormat = (text) =>
  `<p>${text.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;

export default async ({
  headers: { "if-modified-since": since, "if-none-match": etag },
}) => {
  console.info("Fetch: %j", { url: query, etag, since });
  const response = await fetch(query, {
    headers: {
      "User-Agent": meta.generator,
      ...(etag && { "If-None-Match": etag }),
      ...(since && { "If-Modified-Since": since }),
    },
  });
  if (response.status === 304) return { statusCode: 304 };
  const ics = await response.text();
  const recordsById = ical.sync.parseICS(ics);
  const events = Object.values(recordsById)
    .filter(({ type }) => type === "VEVENT")
    .sort((a, b) => b.start - a.start);

  console.info("Feed: %j", { id: meta.id });
  const feed = new Feed(meta);

  events.forEach((event) => {
    console.info("Event: %j", { id: event.url.val });
    const start = DateTime.fromJSDate(event.start);
    feed.addItem({
      title: `${start.toFormat("LLL d")}: ${event.summary}`,
      id: event.url.val,
      link: event.url.val,
      content: simpleFormat(event.description),
      published: event.dtstamp,
      date: event.dtstamp,
    });
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/atom+xml",
      ...reuse(response, "ETag"),
      ...reuse(response, "Last-Modified"),
    },
    body: feed.atom1(),
  };
};
