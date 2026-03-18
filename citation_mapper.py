"""
Citation Network Mapper
=======================
Queries arXiv + Semantic Scholar for papers on a topic,
builds a citation/co-author network, exports for visualization,
and generates keyword trend data.

Usage:
    python citation_mapper.py --topic "renewable energy storage" --max 300
"""

import argparse
import csv
import json
import math
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta

import requests

# ── Configuration ────────────────────────────────────────────────────────────

ARXIV_BASE    = "https://export.arxiv.org/api/query"
S2_SEARCH     = "https://api.semanticscholar.org/graph/v1/paper/search"
S2_PAPER      = "https://api.semanticscholar.org/graph/v1/paper/{}"
S2_FIELDS     = "title,year,authors,citationCount,references,externalIds"
BATCH_SLEEP   = 1.2   # seconds between S2 requests (free-tier rate limit)
MAX_REF_EDGES = 5     # top-N cited papers per node kept as edges


# ── arXiv Fetcher ────────────────────────────────────────────────────────────

def fetch_arxiv(topic: str, max_results: int = 300) -> list[dict]:
    """Pull paper metadata from arXiv in batches of 100."""
    papers, start = [], 0
    print(f"[arXiv] Fetching up to {max_results} papers for: '{topic}'")

    while len(papers) < max_results:
        batch = min(100, max_results - len(papers))
        params = {
            "search_query": f"all:{topic}",
            "start": start,
            "max_results": batch,
            "sortBy": "relevance",
        }
        resp = requests.get(ARXIV_BASE, params=params, timeout=20)
        resp.raise_for_status()

        # Parse Atom XML manually (no lxml needed)
        xml = resp.text
        entries = xml.split("<entry>")[1:]
        if not entries:
            break

        for entry in entries:
            def tag(t):
                s = entry.find(f"<{t}>")
                e = entry.find(f"</{t}>")
                return entry[s + len(t) + 2:e].strip() if s != -1 else ""

            def tags(t):
                parts, pos = [], 0
                while True:
                    s = entry.find(f"<{t}", pos)
                    if s == -1:
                        break
                    e = entry.find(f"</{t}>", s)
                    chunk = entry[s:e]
                    inner_s = chunk.find(">") + 1
                    parts.append(chunk[inner_s:].strip())
                    pos = e + 1
                return parts

            arxiv_id_raw = tag("id").split("/abs/")[-1].replace("\n", "").strip()
            title        = tag("title").replace("\n", " ").strip()
            abstract     = tag("summary").replace("\n", " ").strip()
            published    = tag("published")[:10]
            year         = int(published[:4]) if published else 0

            authors = []
            for a in entry.split("<author>")[1:]:
                name_s = a.find("<name>")
                name_e = a.find("</name>")
                if name_s != -1:
                    authors.append(a[name_s + 6:name_e].strip())

            cats = [c.split('term="')[1].split('"')[0]
                    for c in entry.split("<category") if 'term="' in c]

            papers.append({
                "arxiv_id":   arxiv_id_raw,
                "title":      title,
                "abstract":   abstract,
                "year":       year,
                "authors":    authors,
                "categories": cats,
                "s2_id":      None,
                "citations":  0,
                "references": [],
            })

        start += batch
        print(f"  fetched {len(papers)} papers…")
        time.sleep(0.3)

    return papers[:max_results]


# ── Semantic Scholar Enrichment ───────────────────────────────────────────────

def enrich_with_s2(papers: list[dict], enrich_limit: int = 80) -> list[dict]:
    """
    Look up citation counts + top references from Semantic Scholar.
    We only enrich the first `enrich_limit` papers to stay inside
    the free-tier rate limit.
    """
    print(f"\n[S2] Enriching top {enrich_limit} papers with citation data…")

    for i, paper in enumerate(papers[:enrich_limit]):
        arxiv_id = paper["arxiv_id"].split("v")[0]  # strip version
        url = S2_PAPER.format(f"ARXIV:{arxiv_id}")
        try:
            resp = requests.get(
                url,
                params={"fields": S2_FIELDS},
                timeout=15
            )
            if resp.status_code == 200:
                d = resp.json()
                paper["s2_id"]    = d.get("paperId", "")
                paper["citations"] = d.get("citationCount", 0)
                refs = d.get("references", []) or []
                paper["references"] = [
                    r["paperId"] for r in refs if r.get("paperId")
                ][:MAX_REF_EDGES]
            elif resp.status_code == 429:
                print(f"  rate-limited at paper {i}, waiting 10s…")
                time.sleep(10)
        except Exception as e:
            pass  # skip gracefully

        if i % 10 == 0:
            print(f"  enriched {i+1}/{enrich_limit}…")
        time.sleep(BATCH_SLEEP)

    return papers


# ── Network Builder ───────────────────────────────────────────────────────────

def build_network(papers: list[dict]) -> tuple[list, list]:
    """
    Nodes  = papers
    Edges  = (a) citation links from S2 references
             (b) co-authorship links (shared ≥1 author)
    Returns (nodes, edges) as plain dicts for JSON export.
    """
    # Index by s2_id and arxiv_id
    s2_map   = {p["s2_id"]: p["arxiv_id"] for p in papers if p["s2_id"]}
    ax_index = {p["arxiv_id"] for p in papers}

    nodes, edges = [], []
    seen_edges = set()

    # ── Citation edges ────────────────────────────────────────────────────
    for paper in papers:
        for ref_s2 in paper.get("references", []):
            target_ax = s2_map.get(ref_s2)
            if target_ax and target_ax != paper["arxiv_id"]:
                key = tuple(sorted([paper["arxiv_id"], target_ax]))
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append({
                        "source": paper["arxiv_id"],
                        "target": target_ax,
                        "type":   "citation",
                        "weight": 2,
                    })

    # ── Co-authorship edges ───────────────────────────────────────────────
    author_map = defaultdict(list)
    for paper in papers:
        for author in paper["authors"]:
            author_map[author].append(paper["arxiv_id"])

    for author, paper_ids in author_map.items():
        if len(paper_ids) < 2:
            continue
        for i in range(len(paper_ids)):
            for j in range(i + 1, len(paper_ids)):
                key = tuple(sorted([paper_ids[i], paper_ids[j]]))
                if key not in seen_edges:
                    seen_edges.add(key)
                    edges.append({
                        "source": paper_ids[i],
                        "target": paper_ids[j],
                        "type":   "coauthor",
                        "weight": 1,
                    })

    # ── Build node list ───────────────────────────────────────────────────
    # Degree = number of edges each node participates in
    degree = Counter()
    for e in edges:
        degree[e["source"]] += 1
        degree[e["target"]] += 1

    for paper in papers:
        aid = paper["arxiv_id"]
        nodes.append({
            "id":         aid,
            "title":      paper["title"],
            "year":       paper["year"],
            "authors":    paper["authors"][:5],
            "categories": paper["categories"],
            "citations":  paper["citations"],
            "degree":     degree[aid],
            "url":        f"https://arxiv.org/abs/{aid}",
        })

    return nodes, edges


# ── Keyword Trend Analysis ────────────────────────────────────────────────────

TREND_TERMS = [
    "lithium-ion", "battery", "grid storage", "hydrogen",
    "solar", "wind", "pumped hydro", "supercapacitor",
    "thermal storage", "flow battery",
]

def keyword_trends(papers: list[dict], start_year: int = 2015) -> dict:
    """
    Count how often each trend term appears in titles+abstracts per year.
    Returns {term: {year: count}} dict.
    """
    current_year = datetime.now().year
    years = list(range(start_year, current_year + 1))
    trends = {term: {y: 0 for y in years} for term in TREND_TERMS}

    for paper in papers:
        y = paper["year"]
        if y < start_year or y > current_year:
            continue
        text = (paper["title"] + " " + paper["abstract"]).lower()
        for term in TREND_TERMS:
            if term in text:
                trends[term][y] += 1

    return {"years": years, "series": trends}


# ── Export Functions ──────────────────────────────────────────────────────────

def export_csv(papers: list[dict], path: str = "papers.csv"):
    fieldnames = ["arxiv_id", "title", "year", "citations",
                  "authors", "categories", "url"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for p in papers:
            w.writerow({
                "arxiv_id":   p["arxiv_id"],
                "title":      p["title"],
                "year":       p["year"],
                "citations":  p["citations"],
                "authors":    "; ".join(p["authors"][:5]),
                "categories": "; ".join(p["categories"]),
                "url":        f"https://arxiv.org/abs/{p['arxiv_id']}",
            })
    print(f"[export] papers → {path}")


def export_network_json(nodes: list, edges: list,
                        trends: dict, path: str = "network.json"):
    """Single JSON blob consumed by the web UI."""
    data = {
        "meta": {
            "generated":   datetime.now().isoformat(),
            "node_count":  len(nodes),
            "edge_count":  len(edges),
        },
        "nodes":  nodes,
        "edges":  edges,
        "trends": trends,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"[export] network → {path}")


def print_top_papers(papers: list[dict], n: int = 10):
    print(f"\n{'─'*60}")
    print(f"  TOP {n} MOST-CITED PAPERS")
    print(f"{'─'*60}")
    sorted_p = sorted(papers, key=lambda p: p["citations"], reverse=True)
    for i, p in enumerate(sorted_p[:n], 1):
        print(f"{i:2}. [{p['year']}] {p['title'][:65]}")
        print(f"     Citations: {p['citations']}  |  "
              f"Authors: {', '.join(p['authors'][:3])}")
    print()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Citation Network Mapper — arXiv + Semantic Scholar")
    parser.add_argument("--topic",   default="renewable energy storage",
                        help="Search topic")
    parser.add_argument("--max",     type=int, default=300,
                        help="Max papers to fetch from arXiv (default 300)")
    parser.add_argument("--enrich",  type=int, default=80,
                        help="Papers to enrich via Semantic Scholar (default 80)")
    parser.add_argument("--out-csv", default="papers.csv")
    parser.add_argument("--out-json", default="network.json")
    args = parser.parse_args()

    # 1. Fetch from arXiv
    papers = fetch_arxiv(args.topic, max_results=args.max)
    print(f"\n✓ Fetched {len(papers)} papers from arXiv")

    # 2. Enrich with Semantic Scholar citation data
    papers = enrich_with_s2(papers, enrich_limit=args.enrich)
    enriched = sum(1 for p in papers if p["citations"] > 0)
    print(f"✓ Enriched {enriched} papers with S2 citation counts")

    # 3. Build network
    nodes, edges = build_network(papers)
    print(f"✓ Network: {len(nodes)} nodes, {len(edges)} edges")

    # 4. Keyword trends
    trends = keyword_trends(papers)
    print(f"✓ Trend data computed ({len(TREND_TERMS)} terms)")

    # 5. Export
    export_csv(papers, path=args.out_csv)
    export_network_json(nodes, edges, trends, path=args.out_json)

    # 6. Print summary
    print_top_papers(papers)
    print(f"Done! Open network.json with the web UI to explore the graph.")


if __name__ == "__main__":
    main()