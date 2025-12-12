# Seongnam Child Voucher Project - AI Agent Guidelines

## Project Architecture

This is a **two-part system** for displaying Seongnam City child allowance merchant locations on a map:

1. **Data Pipeline** (`ai-agent/`): Python-based crawler → geocoder → JSON output
2. **Web Frontend** (`web/`): React + Vite app consuming the geocoded JSON via Kakao Maps

**Critical Flow**: Crawler scrapes merchants → Geocoder adds coordinates → Frontend displays on map with clustering

## Key Technical Decisions

### Why Two Separate Codebases?
- `ai-agent/`: Python tooling for web scraping (Playwright) and geolocation (Kakao API)
- `web/`: Standalone React SPA - no backend needed, loads static JSON from `/public`

### Data Consistency Pattern
- **Source of truth**: `ai-agent/data/merchants.json` (raw crawled data ~2,000 items)
- **Geocoded output**: `ai-agent/data/merchants_all_with_coords.json` (with lat/lng ~1,358 items)
- **Frontend copy**: `web/public/merchants_with_coords.json` (manually synced from geocoded output)

⚠️ **Important**: After geocoding, manually copy the output JSON to `web/public/` - no automated sync exists.

## Development Commands

### Python Environment (ai-agent/)
```bash
# Uses 'uv' package manager (NOT pip/poetry)
uv run python crawler/crawler.py --region "성남시 분당구" --business-type "음식점"
uv run python geocoder/geocoder.py --input data/merchants.json --output data/merchants_all_with_coords.json
uv run streamlit run app.py  # Interactive crawler UI
```

### Frontend (web/)
```bash
npm run dev      # Vite dev server on port 5173
npm run build    # Production build
npm run preview  # Preview production build
```

## Critical Patterns

### 1. Playwright Crawler (`ai-agent/crawler/crawler.py`)
- **Pagination**: Uses "더보기" (Load More) button clicks, tracks processed indices to avoid duplicates
- **Region mapping**: `REGION_MAP` dict converts user-friendly names to Shinhan Card form values
- **Logging**: Writes detailed `crawl_log.json` with per-page statistics, categories, timings

### 2. Kakao Geocoding (`ai-agent/geocoder/geocoder.py`)
- **Two-step lookup**: First tries `search_place()` (keyword + region), falls back to `geocode_address()`
- **Rate limiting**: `REQUEST_DELAY = 0.1` seconds between API calls
- **Resumability**: Loads existing output file and skips already-geocoded addresses
- **API key**: Requires `KAKAO_REST_API_KEY` in `.env` file

### 3. React Map Component (`web/src/App.jsx`)
- **External SDK**: Kakao Maps loaded via `<script>` tag in `index.html` (NOT npm package)
- **Clustering**: Uses `kakao.maps.MarkerClusterer` with `gridSize: 60`, `minLevel: 4`
- **Custom overlay**: Creates HTML overlays with close button + detail link (if `place_url` exists)
- **SDK initialization**: Polls `window.kakao.maps` until loaded (asynchronous script loading)

## Environment Setup

### Required API Keys
1. **Kakao REST API Key**: `ai-agent/.env` → `KAKAO_REST_API_KEY=your_key_here`
2. **Kakao JavaScript Key**: Hardcoded in `web/index.html` (line 13) - update for production

### Python Dependencies
- Python 3.13 required (`pyproject.toml`)
- First-time setup: `uv run playwright install chromium`
- Key packages: `playwright`, `streamlit`, `requests`, `python-dotenv`

## Testing & Debugging

### Test Data Files
- `ai-agent/data/merchants_test.json`: Small subset for development
- `web/public/merchants_test_with_coords.json`: 100-item test dataset

### Streamlit Debug UI
- `ai-agent/app.py`: Real-time crawler monitoring, start/stop controls, live statistics
- Shows per-page progress, category distribution, error logs

### Common Issues
1. **Map not loading**: Check browser console for Kakao SDK errors, verify API key in `index.html`
2. **No markers displayed**: Ensure `coords` field exists in JSON, check browser network tab for 404s
3. **Geocoding failures**: Verify `.env` file location, check Kakao API quota limits

## Code Conventions

### File Naming
- Python: `snake_case.py`
- React: `PascalCase.jsx` for components, `camelCase` for utilities
- Data: `merchants_<variant>_with_coords.json` pattern

### Korean Language Support
- All UI strings, comments, and console logs are in **Korean**
- Merchant data fields: `name`, `category`, `business_type`, `address`

### JSON Schema (Merchant Object)
```json
{
  "name": "string",           // 가맹점명
  "category": "string",       // 세부업종 (e.g., "일반대중음식")
  "business_type": "string",  // 상위업종 (e.g., "음식점")
  "address": "string",        // 전체주소
  "coords": {                 // Optional (added by geocoder)
    "lat": 37.38,
    "lng": 127.12
  },
  "place_id": "string",       // Optional (Kakao place ID)
  "place_url": "string"       // Optional (Kakao map link)
}
```

## Known Limitations

1. **No backend**: Frontend is purely static - all filtering happens client-side
2. **No automatic data sync**: Must manually copy geocoded JSON from `ai-agent/data/` to `web/public/`
3. **Single region support**: Currently only "성남시 분당구" fully tested
4. **Geocoding success rate**: ~98.5% (some addresses fail Kakao API lookup)

## Next Priority Features (from `.claude/CLAUDE.md`)

1. **P1**: Category filtering UI (음식점, 도서, 여행, 의료)
2. **P1**: GPS-based "현재 위치" button
3. **P2**: Search bar for merchant name/address
4. **P1**: Expand data to 수정구, 중원구 districts
5. **P2**: Migrate to cloud DB (Firebase/Supabase)

When implementing these, maintain the current data flow: crawler → geocoder → static JSON → frontend.
