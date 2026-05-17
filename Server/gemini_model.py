from __future__ import annotations

import logging

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import FewShotChatMessagePromptTemplate, ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from Server.config import get_gemini_api_key, get_groq_api_key
from typing import Literal, Optional

logger = logging.getLogger(__name__)


class ComplaintAnalysis(BaseModel):
    is_complaint: bool = Field(description="Whether the message is a complaint or not")
    message: str = Field(description="Reply message to send to user")
    complaint_type: Optional[Literal["billing", "website", "delivery"]] = Field(
        default=None, description="Type of complaint if is_complaint is True"
    )


def _get_groq_llm() -> ChatGroq:
    """Initialize and return the Groq LLM (primary)."""
    api_key = get_groq_api_key()
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        temperature=0,
    )


def _get_gemini_llm() -> ChatGoogleGenerativeAI:
    """Initialize and return the Gemini LLM (fallback)."""
    api_key = get_gemini_api_key()
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash-lite",
        api_key=api_key,
        temperature=0,
    )


def _run_chain_with_fallback(final_prompt, parser, input_data: dict):
    """Try Groq first, fall back to Gemini on failure."""
    try:
        groq_llm = _get_groq_llm()
        chain = final_prompt | groq_llm | parser
        logger.info("Using Groq (primary) for LLM call.")
        return chain.invoke(input_data)
    except Exception as e:
        logger.warning("Groq failed (%s), falling back to Gemini.", e)
        gemini_llm = _get_gemini_llm()
        chain = final_prompt | gemini_llm | parser
        return chain.invoke(input_data)


def analyze_message(message: str) -> ComplaintAnalysis:
    """
    Analyze if a message is a complaint and classify its type using few-shot prompting.
    Uses Groq as primary LLM, falls back to Gemini on failure.
    Returns ComplaintAnalysis with is_complaint, message, and complaint_type (if applicable).
    """
    examples = [
        {
            "input": "I was charged twice for my order!",
            "output": '{"is_complaint": true, "complaint_type": "billing", "message": "Your billing complaint has been registered. Our team will investigate and get back to you shortly."}',
        },
        {
            "input": "The website keeps crashing when I try to checkout.",
            "output": '{"is_complaint": true, "complaint_type": "website", "message": "Your website issue has been reported. Our technical team is working on a fix."}',
        },
        {
            "input": "My package hasn't arrived after 2 weeks!",
            "output": '{"is_complaint": true, "complaint_type": "delivery", "message": "Your delivery issue has been recorded. We will track your package and contact you soon."}',
        },
        {
            "input": "Hey, how are you doing?",
            "output": '{"is_complaint": false, "complaint_type": null, "message": "Hi! I am here to help. Do you have any complaints or issues I can assist with?"}',
        },
        {
            "input": "Can you tell me about your products?",
            "output": '{"is_complaint": false, "complaint_type": null, "message": "I am here to help with complaints. Do you have any issues with your order or our services?"}',
        },
    ]


    example_prompt = ChatPromptTemplate.from_messages([
        ("human", "{input}"),
        ("ai", "{output}"),
    ])

    few_shot_prompt = FewShotChatMessagePromptTemplate(
        examples=examples,
        example_prompt=example_prompt,
        input_variables=["input"],
    )

    final_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a complaint detection assistant. Analyze if the message is a complaint. If it's not a complaint, respond with a friendly message asking if they have any complaints. If it is, classify it as 'billing', 'website', or 'delivery'. Always respond in valid JSON format."),
        few_shot_prompt,
        ("human", "{input}"),
    ])

    parser = JsonOutputParser(pydantic_object=ComplaintAnalysis)
    result = _run_chain_with_fallback(final_prompt, parser, {"input": message})
    return ComplaintAnalysis(**result)


class MoodAnalysis(BaseModel):
    mood: str

def analyze_user_mood(message: str) -> str:
    """Analyze the user's mood. Uses Groq as primary, Gemini as fallback."""
    mood_examples = [
        {"input": "I am very upset with your service!", "output": '{"mood": "angry"}'},
        {"input": "The service was okay, nothing special.", "output": '{"mood": "neutral"}'},
        {"input": "I am happy with the support!", "output": '{"mood": "happy"}'},
    ]

    example_prompt = ChatPromptTemplate.from_messages([
        ("human", "{input}"),
        ("ai", "{output}"),
    ])

    few_shot_prompt = FewShotChatMessagePromptTemplate(
        examples=mood_examples,
        example_prompt=example_prompt,
        input_variables=["input"],
    )

    final_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a mood detection assistant. Analyze the user's mood as 'angry', 'neutral', or 'happy'. Always respond in valid JSON format, e.g., {'mood': 'angry'}."),
        few_shot_prompt,
        ("human", "{input}"),
    ])

    parser = JsonOutputParser(pydantic_object=MoodAnalysis)

    try:
        result = _run_chain_with_fallback(final_prompt, parser, {"input": message})
        return result["mood"]
    except Exception:
        return "Error: Unable to parse mood."
