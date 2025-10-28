from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import Optional, List
from datetime import datetime
from app import models, utils
import random
import os


def get_country_by_name(db: Session, name: str) -> Optional[models.Country]:
    return db.query(models.Country).filter(func.lower(models.Country.name) == name.lower()).first()


def list_countries(
    db: Session,
    region: Optional[str] = None,
    currency: Optional[str] = None,
    sort: Optional[str] = None
) -> List[models.Country]:
    q = db.query(models.Country)
    
    if region:
        q = q.filter(models.Country.region == region)
    if currency:
        q = q.filter(models.Country.currency_code == currency)
    
    if sort == "gdp_desc":
        q = q.order_by(desc(models.Country.estimated_gdp))
    elif sort == "gdp_asc":
        q = q.order_by(asc(models.Country.estimated_gdp))
    
    return q.all()


def delete_country(db: Session, name: str) -> bool:
    country = get_country_by_name(db, name)
    if not country:
        return False
    db.delete(country)
    db.commit()
    return True


def upsert_country(db: Session, data: dict, last_refreshed_at: datetime):
    existing = get_country_by_name(db, data["name"])
    
    exchange_rate = data.get("exchange_rate")
    estimated_gdp = utils.compute_estimated_gdp(data["population"], exchange_rate)

    if existing:
        existing.capital = data.get("capital")
        existing.region = data.get("region")
        existing.population = data.get("population")
        existing.currency_code = data.get("currency_code")
        existing.exchange_rate = exchange_rate
        existing.estimated_gdp = estimated_gdp
        existing.flag_url = data.get("flag_url")
        existing.last_refreshed_at = last_refreshed_at
        db.add(existing)
    else:
        new_country = models.Country(
            name=data["name"],
            capital=data.get("capital"),
            region=data.get("region"),
            population=data.get("population"),
            currency_code=data.get("currency_code"),
            exchange_rate=exchange_rate,
            estimated_gdp=estimated_gdp,
            flag_url=data.get("flag_url"),
            last_refreshed_at=last_refreshed_at
        )
        db.add(new_country)
    db.commit()

def refresh_countries(db: Session):
    """
    Fetches countries and exchange rates, updates DB in batch.
    """
    countries_data = utils.fetch_countries()
    exchange_rates = utils.fetch_exchange_rates()
    last_refreshed_at = datetime.utcnow()

    for country in countries_data:
        currency_code = None
        if country.get("currencies"):
            currency_code = country["currencies"][0].get("code")
        exchange_rate = exchange_rates.get(currency_code) if currency_code else None
        
        upsert_country(
            db,
            {
                "name": country["name"],
                "capital": country.get("capital"),
                "region": country.get("region"),
                "population": country.get("population"),
                "currency_code": currency_code,
                "exchange_rate": exchange_rate,
                "estimated_gdp": None,
                "flag_url": country.get("flag"),
            },
            last_refreshed_at
        )

    return last_refreshed_at


def generate_summary(db: Session, output_path: str = "cache/summary.png"):
    """
    Generates summary image using helper file.
    """
    last_refresh = db.query(func.max(models.Country.last_refreshed_at)).scalar() or datetime.utcnow()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    utils.generate_summary_image(db, output_path, last_refresh)
    return output_path
