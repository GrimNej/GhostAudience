import { useMemo } from "react";
import { useDatabase } from "../../../app/database-context";
import { QuestionReviewRepository } from "./question-review-repository";

export function useQuestionReviewRepository(): QuestionReviewRepository {
  const database = useDatabase();
  return useMemo(() => new QuestionReviewRepository(database), [database]);
}
