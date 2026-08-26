import { NextResponse } from "next/server";

import { listSavedTemplates } from "~/lib/db/queries";
import { loadTemplates } from "~/lib/scenario/library";

/** The situation picker: curated templates first, then anything the learner made. */
export const GET = async (): Promise<NextResponse> => {
  const [curated, saved] = [loadTemplates(), await listSavedTemplates()];

  return NextResponse.json({
    templates: [...curated, ...saved].map((template) => ({
      slug: template.slug,
      title: template.title,
      summary: template.summary,
      source: template.source,
      suggestedLevel: template.suggestedLevel,
      beatCount: template.beats.length,
      userGoal: template.userRole.goal,
    })),
  });
};
