"""Shared, strictly validated API contracts."""
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

District = Literal["노원구", "도봉구", "강북구", "중랑구", "성북구", "강남구", "마포구", "성동구", "송파구", "종로구", "중구", "용산구", "영등포구", "서초구", "광진구", "관악구", "동작구", "강서구", "양천구", "은평구", "서대문구", "구로구", "금천구", "동대문구", "강동구"]
Category = Literal["all", "restaurant", "cafe"]

class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1500)

class ChatRequest(BaseModel):
    message: str | None = None
    messages: str | None = None  # legacy frontend API compatibility
    district: str = Field(default="", max_length=30)
    history: list[HistoryItem] = Field(default_factory=list, max_length=20)

    @model_validator(mode="after")
    def check_message(self):
        text = self.message if self.message is not None else self.messages
        if not text or not text.strip() or len(text) > 1500:
            raise ValueError("message는 공백이 아닌 1~1,500자여야 합니다.")
        return self

    @property
    def question(self) -> str:
        return (self.message if self.message is not None else self.messages or "").strip()

class Place(BaseModel):
    id: str
    name: str
    category: str = "음식점"
    address: str
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    phone: str = ""
    place_url: str = ""
    source: str = "kakao"
    distance_m: int | None = None
    description: str = ""  # Only provider category; no unverifiable marketing copy
    is_registered: bool = False
    booking_url: str = ""  # Only when verified independently
    waitlist_url: str = ""

class RestaurantResult(BaseModel):
    query: str
    district: str
    places: list[Place] = Field(default_factory=list)
    source: str = "kakao"

class ChatResponse(BaseModel):
    reply: str
    show_map: bool = False
    places: list[Place] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)

class Intent(BaseModel):
    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, value):
        # AI may return an empty category for general conversation or searches.
        if value is None or (isinstance(value, str) and not value.strip()):
            return "all"
        return value.strip().lower() if isinstance(value, str) else value

    needs_search: bool = False
    query: str = Field(default="", max_length=80)
    category: Category = "all"
    district: str = Field(default="", max_length=30)
    reply: str = Field(default="", max_length=1800)
    suggested_questions: list[str] = Field(default_factory=list, max_length=4)

class Summary(BaseModel):
    reply: str = Field(min_length=1, max_length=3500)
