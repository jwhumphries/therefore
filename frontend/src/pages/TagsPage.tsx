import { Link } from "react-router-dom";
import { Spinner } from "@heroui/react";
import { useTags } from "../hooks/api";

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
        <h1 className="text-4xl font-serif font-bold mb-4">Tags</h1>
        <p className="text-default-500">No tags yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif font-bold mb-8">Tags</h1>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <Link
            key={tag.tag}
            to={`/tags/${tag.tag}`}
            className="px-4 py-2 bg-default-100 rounded-lg hover:bg-default-200 transition-colors"
          >
            <span className="font-medium">{tag.tag}</span>
            <span className="text-default-500 ml-2">({tag.count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
