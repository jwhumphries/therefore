import { useSeriesPosts } from "../hooks/api";
import { TransitionLink } from "./TransitionLink";
import { motion } from "motion/react";

interface SeriesTimelineProps {
  series: string;
}

export function SeriesTimeline({ series }: SeriesTimelineProps) {
  const { data, isLoading } = useSeriesPosts(series);

  if (isLoading) return <div className="p-8 text-muted">Loading syllabus...</div>;
  if (!data?.posts.length) return <div className="p-8 text-muted">No chapters found.</div>;

  // Sort posts by date ascending (oldest first) for sequential reading
  const sortedPosts = [...data.posts].reverse();

  return (
    <div className="relative pl-8 py-8 space-y-12 border-l-2 border-primary/20 ml-8 mb-4">
      {sortedPosts.map((post, index) => (
        <motion.div
          key={post.slug}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="relative"
        >
          {/* Timeline dot */}
          <div className="absolute -left-[39px] top-2 w-4 h-4 rounded-full bg-background border-2 border-primary" />

          <TransitionLink to={`/posts/${post.slug}`} className="block group">
            <h3 className="text-2xl font-display font-semibold group-hover:text-primary transition-colors">
              {post.title}
            </h3>
            <div className="text-sm text-muted mt-2 flex items-center gap-2">
               <time dateTime={post.publishDate}>
                 {new Date(post.publishDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
               </time>
               <span>&middot;</span>
               <span>{post.readingTime} min read</span>
            </div>
            {post.summary && (
              <p className="mt-3 text-lg text-foreground/80 leading-relaxed max-w-3xl">
                {post.summary}
              </p>
            )}
          </TransitionLink>
        </motion.div>
      ))}
    </div>
  );
}
