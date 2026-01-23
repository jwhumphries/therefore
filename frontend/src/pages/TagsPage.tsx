import { Spinner } from "@heroui/react";
import { useTags } from "../hooks/api";
import { TagWithCount } from "../components/TagLink";

export function TagsPage() {
  const { data: tags, isLoading, error } = useTags();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Failed to load tags. Please try again.</p>
      </div>
    );
  }

  if (!tags?.length) {
    return (
      <div className="text-center py-12">
        <h1 className="text-4xl font-display font-bold mb-4">Tags</h1>
        <p className="text-default-500">No tags yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-display font-bold mb-8">Tags</h1>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {tags.map((tag) => (
          <TagWithCount
            key={tag.tag}
            tag={tag.tag}
            count={tag.count}
            className="text-lg"
          />
        ))}
      </div>
    </div>
  );
}
