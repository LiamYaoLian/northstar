import { z } from "zod";
import { WORK_TRACK_KEYS } from "@/lib/strategy/work-track";

export const updateNorthStarSchema = z.object({
  statement: z.string().trim().min(1),
  horizon: z.string().trim().min(1),
  hoursPerWeek: z.number().int().min(1).max(168),
  workTrack: z.enum(WORK_TRACK_KEYS),
});

export type UpdateNorthStarInput = z.infer<typeof updateNorthStarSchema>;
