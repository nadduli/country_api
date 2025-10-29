import httpx
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional
from PIL import Image, ImageDraw, ImageFont
import os

COUNTRIES_API = "https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies"
EXCHANGE_API = "https://open.er-api.com/v6/latest/USD"

DEFAULT_TIMEOUT = 30

def fetch_countries(timeout=DEFAULT_TIMEOUT) -> List[dict]:
    with httpx.Client(timeout=timeout) as client:
        r = client.get(COUNTRIES_API)
        r.raise_for_status()
        return r.json()

def fetch_exchange_rates(timeout=DEFAULT_TIMEOUT) -> Dict[str, float]:
    with httpx.Client(timeout=timeout) as client:
        r = client.get(EXCHANGE_API)
        r.raise_for_status()
        data = r.json()
        rates = data.get("rates", {})
        return rates

def compute_estimated_gdp(population: int, exchange_rate: Optional[float]) -> Optional[float]:
    """
    estimated_gdp = population * rand(1000-2000) / exchange_rate
    """
    if exchange_rate is None or exchange_rate == 0:
        return None
    
    if population is None or population < 0:
        return None
        
    try:
        multiplier = random.uniform(1000, 2000)
        return population * multiplier / float(exchange_rate)
    except (ValueError, ZeroDivisionError):
        return None

def generate_summary_image(stats: dict, output_path: str = "cache/summary.png"):
    """
    Generate summary image and save to cache/summary.png
    """
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        img = Image.new('RGB', (800, 400), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            font_large = ImageFont.truetype("arial.ttf", 24)
            font_medium = ImageFont.truetype("arial.ttf", 18)
            font_small = ImageFont.truetype("arial.ttf", 14)
        except:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        draw.text((20, 20), "Countries Summary", fill='black', font=font_large)
        
        draw.text((20, 60), f"Total Countries: {stats['total_countries']}", fill='black', font=font_medium)
        
        last_refresh = stats['last_refresh']
        if last_refresh:
            if last_refresh.tzinfo is None:
                last_refresh = last_refresh.replace(tzinfo=timezone.utc)
            refresh_str = last_refresh.strftime("%Y-%m-%d %H:%M:%S UTC")
        else:
            refresh_str = "Never"
        draw.text((20, 90), f"Last Refreshed: {refresh_str}", fill='black', font=font_medium)
        
        draw.text((20, 130), "Top 5 Countries by Estimated GDP:", fill='black', font=font_medium)
        
        y_pos = 160
        top5 = stats['top5_countries']
        if top5:
            for i, country in enumerate(top5, 1):
                gdp_str = f"${country.estimated_gdp:,.2f}" if country.estimated_gdp else "N/A"
                text = f"{i}. {country.name}: {gdp_str}"
                draw.text((30, y_pos), text, fill='black', font=font_small)
                y_pos += 25
        else:
            draw.text((30, y_pos), "No GDP data available", fill='black', font=font_small)
        
        img.save(output_path)
        return True
        
    except Exception as e:
        print(f"Error generating summary image: {e}")
        return False