import { notFound } from "next/navigation";

import { PracticeClient } from "~/app/practice/[scenarioId]/practice-client";
import { getScenario } from "~/lib/db/queries";

type Props = { params: Promise<{ scenarioId: string }> };

const PracticePage = async ({ params }: Props) => {
  const { scenarioId } = await params;
  const scenario = await getScenario(scenarioId);
  if (!scenario) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <PracticeClient scenario={scenario} />
    </main>
  );
};

export default PracticePage;
