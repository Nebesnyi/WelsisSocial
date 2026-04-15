import { memo } from 'react'
import { PostCard } from '../PostCard/PostCard'

export const PostList = memo(function PostList({ posts, onLike, onNavigate, CommentsComponent }) {
  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={onLike}
          onNavigate={onNavigate}
          CommentsComponent={CommentsComponent}
        />
      ))}
    </div>
  )
})

export default PostList
