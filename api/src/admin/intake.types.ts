export interface AdminIntakeBatch {
  id: string;
  goalId: string;
  batchNumber: number;
  isAnswered: boolean;
  isFallback: boolean;
  qualityScore: number | null;
  embedded: boolean;
  createdAt: string;
  questionCount: number;
  answeredCount: number;
}

export interface AdminIntakeBatchList {
  batches: AdminIntakeBatch[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminIntakeQualityFailures {
  batches: AdminIntakeBatch[];
  threshold: number;
}
