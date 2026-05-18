"""
Custom HTTP exceptions with structured error bodies.
Keeps error handling consistent across all routes.
"""
from fastapi import HTTPException, status


class TraceNotFound(HTTPException):
    def __init__(self, trace_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trace '{trace_id}' not found.",
        )


class EvaluationNotFound(HTTPException):
    def __init__(self, trace_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No evaluation found for trace '{trace_id}'.",
        )


class ReviewNotFound(HTTPException):
    def __init__(self, trace_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No review found for trace '{trace_id}'.",
        )


class RegressionCaseNotFound(HTTPException):
    def __init__(self, case_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regression case '{case_id}' not found.",
        )


class PromptVersionNotFound(HTTPException):
    def __init__(self, version_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prompt version '{version_id}' not found.",
        )


class DuplicateReview(HTTPException):
    def __init__(self, trace_id: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A review already exists for trace '{trace_id}'. Use PUT to update.",
        )
