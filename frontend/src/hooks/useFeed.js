import { useState, useEffect, useCallback } from 'react'

export function useFeedLoader(api, limit = 20) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')

  const loadFeed = useCallback(
    async (off = 0, replace = false) => {
      try {
        if (replace) setLoading(true)
        setError('')

        const r = await api.get(`/posts/feed?limit=${limit}&offset=${off}`)
        const newPosts = r.data.posts || []
        const total = r.data.meta?.total ?? newPosts.length

        setPosts((prev) => (replace ? newPosts : [...prev, ...newPosts]))
        setHasMore(off + newPosts.length < total)
        setOffset(off + newPosts.length)
      } catch (err) {
        setError(err?.response?.data?.error || 'Не удалось загрузить ленту')
      } finally {
        setLoading(false)
      }
    },
    [api, limit]
  )

  const resetFeed = useCallback(() => {
    setPosts([])
    setOffset(0)
    setHasMore(false)
  }, [])

  return { posts, loading, hasMore, offset, error, loadFeed, resetFeed, setPosts, setError }
}

export function usePostLike(api, posts, setPosts) {
  const toggleLike = useCallback(
    async (postId) => {
      try {
        const r = await api.post(`/posts/${postId}/like`)
        setPosts((prev) => prev.map((p) => (p.id === postId ? r.data.post : p)))
      } catch (err) {
        const errorMsg = err?.response?.data?.error || 'Ошибка'
        setError(errorMsg)
        setTimeout(() => setError(''), 3000)
      }
    },
    [api, setPosts]
  )

  return toggleLike
}

export default { useFeedLoader, usePostLike }
