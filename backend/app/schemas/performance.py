"""Schemas for the model-performance endpoint (values come from ml_artifacts/metrics.json)."""

from pydantic import BaseModel


class ClassMetrics(BaseModel):
    precision: float
    recall: float
    f1: float
    support: int


class MacroAverage(BaseModel):
    precision: float
    recall: float
    f1: float


class ConfusionMatrix(BaseModel):
    labels: list[str]
    rows_are: str
    columns_are: str
    matrix: list[list[int]]


class SplitMetrics(BaseModel):
    accuracy: float
    per_class: dict[str, ClassMetrics]
    macro_avg: MacroAverage
    confusion_matrix: ConfusionMatrix


class VariantPerformance(BaseModel):
    variant: str
    description: str
    selected_C: float
    vocabulary_size: int
    validation: SplitMetrics
    test: SplitMetrics
    top_features: dict[str, list[str]]


class SplitSize(BaseModel):
    rows: int
    fake: int
    real: int


class Limitation(BaseModel):
    title: str
    detail: str


class PerformanceResponse(BaseModel):
    dataset_name: str
    dataset_source: str
    dataset_license: str
    label_convention: str
    generated_at: str
    cleaning: dict
    split_strategy: str
    split_sizes: dict[str, SplitSize]
    leakage_check: str
    variants: list[VariantPerformance]
    limitations: list[Limitation]
    interpretation: str
