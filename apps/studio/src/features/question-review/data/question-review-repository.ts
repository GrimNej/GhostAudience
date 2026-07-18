import type { AudienceQuestion, CreatorDisposition } from "@ghost-audience/domain";
import { nanoid } from "nanoid";

import type { GhostAudienceDatabase } from "../../../infrastructure/db/database";

export class QuestionReviewRepository {
  public constructor(private readonly database: GhostAudienceDatabase) {}

  public async setDisposition(
    runId: string,
    questionId: AudienceQuestion["id"],
    disposition: CreatorDisposition,
    now: string,
  ): Promise<void> {
    await this.database.transaction(
      "rw",
      [
        this.database.questions,
        this.database.creatorReviews,
        this.database.auditEvents,
      ],
      async () => {
        const changed = await this.database.questions.update(questionId, {
          creatorDisposition: disposition,
        });

        if (changed !== 1) {
          throw new Error(`Question ${questionId} does not exist.`);
        }

        await this.database.creatorReviews.put({
          id: `review_${nanoid(20)}`,
          runId,
          questionId,
          disposition,
          note: null,
          updatedAt: now,
        });

        await this.database.auditEvents.add({
          runId,
          type: "QUESTION_REVIEWED",
          metadata: {
            questionId,
            disposition,
          },
          createdAt: now,
        });
      },
    );
  }
}
