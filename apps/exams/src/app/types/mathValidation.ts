// TypeScript types for Math Validation API matching FastAPI backend specification

export interface MathValidationRequest {
  latex_steps: string[];
}

export interface LineValidation {
  line_number: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  explanation: string;
  parsed_expressions: string[];
  original_latex: string[];
}

export interface MathValidationResponse {
  valid: boolean;
  line_validations: LineValidation[];
  error: string | null;
}

export interface APIError {
  error: string;
  detail?: string;
}
