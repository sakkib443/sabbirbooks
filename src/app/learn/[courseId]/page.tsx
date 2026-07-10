import LearnView from "@/components/learn/LearnView";

// The recorded-course player. LearnView reads the courseId via useParams inside
// the client component (no Suspense boundary needed here). The page is public:
// free (isFree) lessons preview without login, premium lessons show a lock.
export default function LearnPage() {
  return <LearnView />;
}
