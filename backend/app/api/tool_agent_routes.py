"""Non-transactional AI concierge tool calling route."""
from fastapi import APIRouter
from app.services.tool_agent import AgentTurnRequest,AgentTurnResponse,agent_turn
router=APIRouter(prefix='/api/booking-agent',tags=['booking-agent'])
@router.post('/turn',response_model=AgentTurnResponse)
async def turn(body:AgentTurnRequest):
    return await agent_turn(body)
