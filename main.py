from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import os

from app.database import get_db, engine
from app import models, schemas, crud


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Countries API", version="1.0.0")

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "true",
            "message": exc.detail
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": "true",
            "message": "Validation error"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "true",
            "message": "Internal server error"
        }
    )

@app.post("/countries/refresh", status_code=200)
async def refresh_countries(db: Session = Depends(get_db)):
    """
    Refresh countries data from external APIs
    """
    try:
        last_refreshed_at = crud.refresh_countries(db)
        return {
            "message": "Countries data refreshed successfully",
            "last_refreshed_at": last_refreshed_at
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh countries data: {str(e)}"
        )

@app.get("/countries", response_model=List[schemas.CountryOut])
async def get_countries(
    region: Optional[str] = Query(None, description="Filter by region"),
    currency: Optional[str] = Query(None, description="Filter by currency code"),
    sort: Optional[str] = Query(None, description="Sort by: gdp_asc, gdp_desc, name_asc, name_desc, population_asc, population_desc"),
    db: Session = Depends(get_db)
):
    """
    Get all countries with optional filtering and sorting
    """
    try:
        countries = crud.list_countries(db, region=region, currency=currency, sort=sort)
        return countries
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve countries: {str(e)}"
        )

@app.get("/countries/{name}", response_model=schemas.CountryOut)
async def get_country(name: str, db: Session = Depends(get_db)):
    """
    Get a specific country by name
    """
    country = crud.get_country_by_name(db, name)
    if not country:
        raise HTTPException(
            status_code=404,
            detail="Country not found"
        )
    return country

@app.delete("/countries/{name}")
async def delete_country(name: str, db: Session = Depends(get_db)):
    """
    Delete a country by name
    """
    success = crud.delete_country(db, name)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Country not found"
        )
    return {"message": "Country deleted successfully"}

@app.get("/status", response_model=schemas.StatusOut)
async def get_status(db: Session = Depends(get_db)):
    """
    Get API status and statistics
    """
    total_countries = db.query(models.Country).count()
    last_refreshed_at = db.query(models.Country.last_refreshed_at).order_by(models.Country.last_refreshed_at.desc()).first()
    
    return {
        "total_countries": total_countries,
        "last_refreshed_at": last_refreshed_at[0] if last_refreshed_at else None
    }

@app.get("/countries/image", response_class=FileResponse)
async def get_countries_image(db: Session = Depends(get_db)):
    """
    Generate and return the countries summary image
    """
    try:
        os.makedirs("cache", exist_ok=True)
        
        image_path = crud.generate_summary(db, "cache/summary.png")
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image not found")
            
        return FileResponse(
            image_path,
            media_type="image/png",
            filename="countries_summary.png"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate image: {str(e)}"
        )

@app.get("/")
async def root():
    return {"message": "Countries API is running"}