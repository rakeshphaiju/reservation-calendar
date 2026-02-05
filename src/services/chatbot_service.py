import os
import json
import httpx
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from dotenv import load_dotenv

from src.models.reservation import Reservation
from src.models.chatbot import ChatSession, ChatMessage
from src.schemas.chatbot import ChatRequest, ChatResponse

load_dotenv()


class ReservationChatbot:
    def __init__(self):
        self.api_key = os.getenv("PERPLEXITY_API_KEY")
        self.api_host = os.getenv("PERPLEXITY_API_HOST", "https://api.perplexity.ai")
        self.model = os.getenv("CHATBOT_MODEL", "sonar")
        
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY not found in environment variables")
    
    async def find_available_slots(
        self, 
        db: AsyncSession, 
        date_filter: Optional[str] = None,
        food_type: Optional[str] = None,
        quantity: int = 1
    ) -> List[Dict[str, Any]]:
        """Find available time slots based on existing reservations"""
        
        # Build query for existing reservations
        query = select(Reservation)
        
        if date_filter:
            # Filter by specific date
            query = query.where(Reservation.day == date_filter)
        
        if food_type:
            # Optional: Consider food type constraints
            query = query.where(Reservation.food.ilike(f"%{food_type}%"))
        
        result = await db.execute(query)
        existing_reservations = result.scalars().all()
        
        # Define available time slots (restaurant hours)
       restaurant_hours = {
            "Monday":    ["18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00", "20:00-20:30", "20:30-21:00"],
            "Tuesday":   ["18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00", "20:00-20:30", "20:30-21:00"],
            "Wednesday": ["18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00", "20:00-20:30", "20:30-21:00"],
            "Thursday":  ["18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00", "20:00-20:30", "20:30-21:00"],
            "Friday":    ["17:00-17:30", "17:30-18:00", "18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00", "20:00-20:30", "20:30-21:00"],
            "Saturday":  ["12:00-12:30", "12:30-13:00", "17:00-17:30", "17:30-18:00", "18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00", "20:00-20:30", "20:30-21:00"],
            "Sunday":    ["12:00-12:30", "12:30-13:00", "17:00-17:30", "17:30-18:00", "18:00-18:30", "18:30-19:00"],
        }

        # Analyze availability
        available_slots = []
        
        # If no date filter, check next 7 days
        days_to_check = [date_filter] if date_filter else list(restaurant_hours.keys())
        
        for day in days_to_check:
            if day not in restaurant_hours:
                continue
                
            for time_slot in restaurant_hours[day]:
                # Check if slot is already booked
                conflicting_reservations = [
                    r for r in existing_reservations 
                    if r.day == day and r.time == time_slot
                ]
                
                # Calculate capacity (assuming max 4 reservations per time slot)
                max_capacity = 4
                current_bookings = len(conflicting_reservations)
                
                available = current_bookings < max_capacity
                
                # Check if quantity can be accommodated
                if available:
                    # Sum quantities of existing reservations
                    total_quantity = sum(r.quantity for r in conflicting_reservations)
                    available = (total_quantity + quantity) <= (max_capacity * 4)
                
                slot_info = {
                    "day": day,
                    "time": time_slot,
                    "available": available,
                    "conflicting_reservations": len(conflicting_reservations),
                    "capacity_used": sum(r.quantity for r in conflicting_reservations),
                    "max_capacity": max_capacity * 4
                }
                
                # Suggest alternative if slot is full
                if not available:
                    # Find nearest available slot
                    for alt_time in restaurant_hours[day]:
                        if alt_time != time_slot:
                            alt_conflicts = [
                                r for r in existing_reservations 
                                if r.day == day and r.time == alt_time
                            ]
                            if len(alt_conflicts) < max_capacity:
                                slot_info["suggested_alternative"] = alt_time
                                break
                
                available_slots.append(slot_info)
        
        return available_slots
    
    async def generate_chat_response(
        self,
        db: AsyncSession,
        user_message: str,
        session_token: Optional[str] = None,
        include_availability: bool = True,
        date_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate chatbot response with availability information"""
        
        # Extract intent from user message
        intent = self._analyze_intent(user_message)
        
        # Get availability if requested
        available_slots = []
        if include_availability and intent.get("needs_availability", False):
            quantity = intent.get("quantity", 1)
            food_type = intent.get("food_type")
            available_slots = await self.find_available_slots(
                db, date_filter, food_type, quantity
            )
        
        # Prepare system prompt
        system_prompt = self._build_system_prompt(available_slots, intent)
        
        # Call Perplexity API
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_host}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 500
                    }
                )
                
                response.raise_for_status()
                result = response.json()
                
                ai_response = result["choices"][0]["message"]["content"]
                
                # Extract suggestions
                suggestions = self._extract_suggestions(ai_response, intent)
                
                # Check if human assistance is needed
                needs_human_assistance = self._check_needs_human_assistance(ai_response)
                
                return {
                    "message": ai_response,
                    "suggestions": suggestions,
                    "available_slots": available_slots if available_slots else None,
                    "needs_human_assistance": needs_human_assistance,
                    "metadata": {
                        "intent": intent,
                        "token_usage": result.get("usage", {})
                    }
                }
                
        except Exception as e:
            raise Exception(f"Chatbot API error: {str(e)}")
    
    def _analyze_intent(self, message: str) -> Dict[str, Any]:
        """Analyze user intent from message"""
        message_lower = message.lower()
        
        intent = {
            "wants_reservation": any(word in message_lower for word in ["reserve", "book", "table", "booking"]),
            "needs_availability": any(word in message_lower for word in ["available", "free", "slot", "time", "when"]),
            "wants_cancel": any(word in message_lower for word in ["cancel", "delete", "remove"]),
            "wants_modify": any(word in message_lower for word in ["modify", "change", "update"]),
            "asks_about_food": any(word in message_lower for word in ["food", "menu", "dish", "cuisine"]),
            "asks_hours": any(word in message_lower for word in ["hour", "open", "close", "time"]),
        }
        
        # Extract quantity
        import re
        quantity_match = re.search(r'(\d+)\s*(people|persons|guests|seats)', message_lower)
        if quantity_match:
            intent["quantity"] = int(quantity_match.group(1))
        else:
            # Default to 2 people
            intent["quantity"] = 2
        
        # Extract date
        date_patterns = [
            r'(today|tonight)',
            r'(tomorrow)',
            r'(monday|tuesday|wednesday|thursday|friday|saturday|sunday)',
            r'(\d{1,2}/\d{1,2}/\d{4})',
            r'(\d{4}-\d{2}-\d{2})'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, message_lower)
            if match:
                intent["date"] = match.group(1)
                break
        
        # Extract food type
        food_types = ["pizza", "pasta", "burger", "sushi", "steak", "salad", "seafood"]
        for food in food_types:
            if food in message_lower:
                intent["food_type"] = food
                break
        
        return intent
    
    def _build_system_prompt(self, available_slots: List[Dict], intent: Dict) -> str:
        """Build system prompt for the chatbot"""
        
        prompt = """You are a helpful restaurant reservation assistant named "ReservaBot".
        You help customers with:
        1. Finding available time slots for reservations
        2. Making new reservations
        3. Modifying or canceling existing reservations
        4. Answering questions about the menu and food options
        5. Providing information about restaurant hours and policies
        
        Restaurant Information:
        - Name: "Gourmet Delight Restaurant"
        - Hours: 
          * Mon-Thu: 6 PM - 10 PM
          * Fri: 5 PM - 11 PM
          * Sat: 12 PM - 11 PM
          * Sun: 12 PM - 9 PM
        - Maximum party size per reservation: 16 people
        - Average dining time: 1.5-2 hours
        
        Guidelines:
        1. Be friendly, professional, and helpful
        2. Provide specific information when available
        3. Ask clarifying questions if needed
        4. Suggest alternatives when requested times are not available
        5. Keep responses concise but informative
        6. If you don't know something, admit it and suggest contacting the restaurant directly
        """
        
        # Add availability information if we have it
        if available_slots:
            prompt += "\n\nCurrent Availability Information:\n"
            
            # Group by day
            slots_by_day = {}
            for slot in available_slots:
                day = slot["day"]
                if day not in slots_by_day:
                    slots_by_day[day] = []
                slots_by_day[day].append(slot)
            
            for day, slots in slots_by_day.items():
                available_times = [s["time"] for s in slots if s["available"]]
                if available_times:
                    prompt += f"- {day}: {', '.join(available_times)}\n"
                else:
                    prompt += f"- {day}: Fully booked\n"
            
            prompt += "\nNote: Slots are subject to change. Real-time availability may vary."
        
        # Add intent-specific guidance
        if intent.get("wants_reservation"):
            prompt += "\n\nFocus on helping the customer make a reservation. Ask for necessary details."
        
        if intent.get("wants_cancel"):
            prompt += "\n\nFocus on cancellation procedures and policies."
        
        if intent.get("asks_about_food"):
            prompt += "\n\nFocus on menu items, food options, and dietary information."
        
        return prompt
    
    def _extract_suggestions(self, response: str, intent: Dict) -> List[str]:
        """Extract suggested actions from chatbot response"""
        suggestions = []
        response_lower = response.lower()
        
        if intent.get("wants_reservation", False):
            suggestions.append("Make a reservation")
            suggestions.append("Check available times")
        
        if intent.get("needs_availability", False):
            suggestions.append("View all available slots")
            suggestions.append("Check different date")
        
        if intent.get("asks_about_food", False):
            suggestions.append("View full menu")
            suggestions.append("Ask about dietary options")
        
        # Add general suggestions
        general_suggestions = [
            "Contact restaurant",
            "View opening hours",
            "Modify existing reservation",
            "Cancel reservation"
        ]
        
        suggestions.extend(general_suggestions)
        return list(set(suggestions))[:4]
    
    def _check_needs_human_assistance(self, response: str) -> bool:
        """Check if the conversation needs human intervention"""
        human_keywords = [
            "speak with someone", "talk to a person", "human agent",
            "manager", "supervisor", "call us", "phone number"
        ]
        
        response_lower = response.lower()
        return any(keyword in response_lower for keyword in human_keywords)


# Global chatbot instance
chatbot = ReservationChatbot()