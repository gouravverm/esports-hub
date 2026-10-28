"""Small Liquipedia MediaWiki API client that follows the API terms of use:
custom User-Agent, gzip, one shared connection, and a request rate limit."""
import gzip
import json
import time
import urllib.error
import urllib.parse
import urllib.request

import config

BATCH = 50  # MediaWiki allows up to 50 titles per query


class Liquipedia:
    def __init__(self, wiki):
        self.url = f"https://liquipedia.net/{wiki}/api.php"
        self._last = 0.0

    def _get(self, params, post=False, min_gap=None):
        gap = config.MIN_SECONDS_BETWEEN_REQUESTS if min_gap is None else min_gap
        wait = gap - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)
        params = {**params, "format": "json", "formatversion": "2"}
        headers = {"User-Agent": config.USER_AGENT, "Accept-Encoding": "gzip"}
        encoded = urllib.parse.urlencode(params)
        if post:
            req = urllib.request.Request(self.url, data=encoded.encode(), headers=headers)
        else:
            req = urllib.request.Request(self.url + "?" + encoded, headers=headers)
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    body = resp.read()
                    if resp.headers.get("Content-Encoding") == "gzip":
                        body = gzip.decompress(body)
                break
            except urllib.error.HTTPError as e:
                # rate limited (429) or briefly unavailable: wait as told, then try again
                if e.code not in (429, 503) or attempt == 3:
                    raise
                pause = int(e.headers.get("Retry-After") or 0) or 60 * (attempt + 1)
                print(f"Liquipedia said {e.code}; waiting {pause}s before retrying")
                time.sleep(pause)
        self._last = time.time()
        data = json.loads(body)
        if "error" in data:
            raise RuntimeError(f"Liquipedia API error: {data['error']}")
        return data

    def category_pages(self, category):
        """All article titles in a category (follows continuation)."""
        titles, cont = [], {}
        while True:
            data = self._get({"action": "query", "list": "categorymembers", "cmtitle": category,
                              "cmnamespace": 0, "cmlimit": 500, **cont})
            titles += [m["title"] for m in data["query"]["categorymembers"]]
            if "continue" not in data:
                return titles
            cont = data["continue"]

    def all_titles(self, prefix=""):
        """Every non-redirect article title (optionally only those under a prefix)."""
        titles, cont = [], {}
        while True:
            data = self._get({"action": "query", "list": "allpages", "apnamespace": 0, "aplimit": 500,
                              "apfilterredir": "nonredirects", "apprefix": prefix, **cont})
            titles += [p["title"] for p in data["query"]["allpages"]]
            if "continue" not in data:
                return titles
            cont = data["continue"]

    def expand(self, text):
        """Expand wikitext templates server-side. Heavy call, so it uses the
        slower action=parse rate limit."""
        data = self._get({"action": "expandtemplates", "prop": "wikitext", "text": text},
                         post=True, min_gap=config.MIN_SECONDS_BETWEEN_HEAVY_REQUESTS)
        return data["expandtemplates"]["wikitext"]

    def latest_revids(self, titles):
        """{title: latest revision id}, used to skip pages that have not changed."""
        out = {}
        for i in range(0, len(titles), BATCH):
            data = self._get({"action": "query", "prop": "info", "titles": "|".join(titles[i:i + BATCH])})
            for p in data["query"]["pages"]:
                if "lastrevid" in p:
                    out[p["title"]] = p["lastrevid"]
        return out

    def wikitext(self, titles):
        """{title: (revid, wikitext)} for the given pages."""
        out = {}
        for i in range(0, len(titles), BATCH):
            cont = {}
            while True:  # large batches come back in parts
                data = self._get({"action": "query", "prop": "revisions", "rvprop": "ids|content",
                                  "rvslots": "main", "titles": "|".join(titles[i:i + BATCH]), **cont})
                for p in data["query"]["pages"]:
                    revs = p.get("revisions")
                    if revs and "content" in revs[0]["slots"]["main"]:
                        out[p["title"]] = (revs[0]["revid"], revs[0]["slots"]["main"]["content"])
                if "continue" not in data:
                    break
                cont = data["continue"]
        return out
