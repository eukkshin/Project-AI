"""Draft parsing API: does not create bookings, charge cards, or send push."""
from fastapi import APIRouter
from app.services.booking_agent import ParseRequest, ParseResult, parse_request

router = APIRouter(prefix='/api/booking-agent',tags=['booking-agent'])

@router.post('/parse',response_model=ParseResult)
def parse_booking(request: ParseRequest):
    return parse_request(request)
