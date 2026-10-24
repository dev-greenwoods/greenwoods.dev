# SEO generation

Install the build-only image dependency and regenerate canonical metadata, Open
Graph cards, `sitemap.xml`, and `robots.txt` after adding or changing pages:

```sh
python3 -m pip install -r scripts/requirements.txt
python3 scripts/generate-seo.py
```

Tool pages are discovered from their `.page-title` heading; generated files
should be committed with the page changes.
