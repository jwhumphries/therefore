import { useSeriesPosts } from "../hooks/api";
import { TransitionLink } from "./TransitionLink";
import { Card } from "@heroui/react";
import { motion } from "motion/react";

interface SeriesTimelineProps {
  series: string;
}

export function SeriesTimeline({ series }: SeriesTimelineProps) {
  const { data, isLoading } = useSeriesPosts(series);

  if (isLoading) return <div className="p-6 text-muted">Loading...</div>;
  if (!data?.posts.length) return <div className="p-6 text-muted">No posts found.</div>;

  // Sort posts by date ascending (oldest first) for sequential reading
  const sortedPosts = [...data.posts].reverse();

  return (
    <div className="relative pl-6 py-6 space-y-4 border-l-2 border-accent/20 ml-6 mb-2">
      {sortedPosts.map((post, index) => (
        <motion.div
          key={post.slug}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
          className="relative"
        >
          {/* Timeline dot */}
          <div className="absolute -left-[31px] top-6 w-3 h-3 rounded-full bg-background border-2 border-accent" />

          <TransitionLink to={`/posts/${post.slug}`} className="block group">
            <Card className="p-4 hover:bg-surface transition-colors">
              <Card.Header className="p-0 pb-1">
                <Card.Title className="text-lg font-display font-semibold group-hover:text-accent transition-colors">
                  {post.title}
                </Card.Title>
              </Card.Header>
              <Card.Content className="p-0">
                <div className="text-sm text-muted flex items-center gap-2">
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
                  <p className="mt-2 text-foreground/80 leading-relaxed text-sm">
                    {post.summary}
                  </p>
                )}
              </Card.Content>
            </Card>
          </TransitionLink>
        </motion.div>
      ))}
    </div>
  );
}
