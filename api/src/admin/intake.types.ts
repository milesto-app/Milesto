export interface AdminIntakeBatch {
  id: string;
  goalId: string;
  batchNumber: number;
  isAnswered: boolean;
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
